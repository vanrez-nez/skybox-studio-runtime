import * as THREE from "three/webgpu";

import { makeMippedDataTexture } from "./mipped-texture";

/**
 * The baked cloud field — the cache that replaces the per-pixel analytic fbm.
 *
 * The shader previously evaluated roughly 440 hash functions per cloud pixel and
 * still aliased, because an analytic field has no mip chain and therefore no way
 * to match its detail to a pixel's screen footprint. Baking the field once into
 * a mipmapped, repeat-wrapped texture fixes both at once: a sample becomes one
 * filtered fetch, and hardware trilinear picks the level from the screen
 * derivatives.
 *
 * Gradient (Perlin) noise, not the value noise this replaces. Value noise is
 * axis-aligned by construction — its lattice is what produced the rectangular
 * blocks once the frequency rose enough to make individual cells visible.
 *
 * Written here rather than reusing `chalice-unity/noise-gen.ts`: that port
 * wraps the sample coordinate but deliberately not the lattice corner indices
 * ("source wraps only the input", its §3), so its output does **not** tile. A
 * repeat-sampled sky shows those seams as hard straight lines. Tiling is the
 * whole requirement here, so the corner wrap below is the point of the file.
 */
export interface CloudFieldParams {
  /** Texture resolution. Bake cost is O(size^2 * octaves) on the main thread. */
  size: number;
  /** Base-octave cells across one tile. Sets how many clouds a tile holds. */
  tiles: number;
  octaves: number;
  persistence: number;
  seed: number;
}

export const DEFAULT_CLOUD_FIELD: CloudFieldParams = {
  size: 512,
  tiles: 6,
  octaves: 5,
  persistence: 0.5,
  seed: 11,
};

/**
 * Highest octave count that still resolves.
 *
 * The finest octave has a lattice period of `tiles * 2^(octaves-1)` cells across
 * the texture. Below about four texels per cell the bake is sampling its own
 * noise faster than it can represent it, which bakes aliasing permanently into
 * the texture — mips cannot undo it. This is the resolution half of the texel
 * budget; the shader's mip selection is the other half.
 */
export function maxUsefulOctaves(size: number, tiles: number): number {
  return Math.max(1, Math.floor(Math.log2(size / (4 * tiles))) + 1);
}

function makePermutation(seed: number): Uint8Array {
  const perm = new Uint8Array(512);
  const source = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) source[i] = i;

  // mulberry32, so a given seed always bakes the same field.
  let a = seed | 0;
  const rand = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = source[i];
    source[i] = source[j];
    source[j] = tmp;
  }
  for (let i = 0; i < 512; i += 1) perm[i] = source[i & 255];
  return perm;
}

const GRAD_X = [1, -1, 1, -1, 1, -1, 0, 0];
const GRAD_Y = [1, 1, -1, -1, 0, 0, 1, -1];

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * 2D gradient noise on a lattice that repeats every `period` cells.
 *
 * The corner indices are wrapped, not just the input — that is what makes the
 * result tile. `period` must be an integer for the wrap to land on a lattice
 * boundary, which is why octave periods are `tiles * 2^n`.
 */
function tilingPerlin2D(
  perm: Uint8Array,
  x: number,
  y: number,
  period: number,
): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;

  const wrap = (v: number): number => ((v % period) + period) % period;
  const x0 = wrap(xi);
  const x1 = wrap(xi + 1);
  const y0 = wrap(yi);
  const y1 = wrap(yi + 1);

  const dot = (cx: number, cy: number, dx: number, dy: number): number => {
    const h = perm[(perm[cx & 255] + cy) & 255] & 7;
    return GRAD_X[h] * dx + GRAD_Y[h] * dy;
  };

  const u = fade(fx);
  const v = fade(fy);

  return lerp(
    lerp(dot(x0, y0, fx, fy), dot(x1, y0, fx - 1, fy), u),
    lerp(dot(x0, y1, fx, fy - 1), dot(x1, y1, fx - 1, fy - 1), u),
    v,
  );
}

/**
 * Bakes the tiling field. Normalised against its own measured range so that
 * `coverage` in the shader keeps the same meaning whatever the octave count and
 * persistence are — otherwise every field change would need coverage retuned.
 */
export function createCloudFieldTexture(
  params: CloudFieldParams,
): THREE.DataTexture {
  const { size, tiles, persistence, seed } = params;
  const octaves = Math.min(
    params.octaves,
    maxUsefulOctaves(size, tiles),
  );
  const perm = makePermutation(seed);
  const raw = new Float32Array(size * size);

  let min = Infinity;
  let max = -Infinity;
  let index = 0;

  for (let j = 0; j < size; j += 1) {
    const v = j / size;
    for (let i = 0; i < size; i += 1) {
      const u = i / size;
      let frequency = tiles;
      let amplitude = 1;
      let total = 0;
      let norm = 0;

      for (let octave = 0; octave < octaves; octave += 1) {
        total +=
          tilingPerlin2D(perm, u * frequency, v * frequency, frequency) *
          amplitude;
        norm += amplitude;
        frequency *= 2;
        amplitude *= persistence;
      }

      const value = total / norm;
      if (value < min) min = value;
      if (value > max) max = value;
      raw[index] = value;
      index += 1;
    }
  }

  const span = max - min || 1;
  const data = new Uint8Array(size * size);
  for (let k = 0; k < raw.length; k += 1) {
    data[k] = Math.round(((raw[k] - min) / span) * 255);
  }

  return makeMippedDataTexture(data, size, size, THREE.RepeatWrapping);
}
