import * as THREE from "three/webgpu";
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
export declare const DEFAULT_CLOUD_FIELD: CloudFieldParams;
/**
 * Highest octave count that still resolves.
 *
 * The finest octave has a lattice period of `tiles * 2^(octaves-1)` cells across
 * the texture. Below about four texels per cell the bake is sampling its own
 * noise faster than it can represent it, which bakes aliasing permanently into
 * the texture — mips cannot undo it. This is the resolution half of the texel
 * budget; the shader's mip selection is the other half.
 */
export declare function maxUsefulOctaves(size: number, tiles: number): number;
/**
 * Bakes the tiling field. Normalised against its own measured range so that
 * `coverage` in the shader keeps the same meaning whatever the octave count and
 * persistence are — otherwise every field change would need coverage retuned.
 */
export declare function createCloudFieldTexture(params: CloudFieldParams): THREE.DataTexture;
