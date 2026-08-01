// ─────────────────────────────────────────────────────────────────────────────
//  The light rig, shared by both pipelines.
//
//  Two terms sit on top of whatever each pipeline computes for its surface:
//
//    · **rim** — a fresnel-style brightening toward the limb, on the surface.
//    · **halo** — a glow *outside* the disc, in the texture's margin.
//
//  Both are gated by how lit that piece of the limb actually is, so they follow the
//  phase instead of ringing the whole disc. That is the difference between a rim
//  light and a sticker outline: on a crescent the glow has to hug the crescent.
//
//  They are deliberately allowed to overshoot. `lightIntensity` above 1 drives the
//  lit side past white, which is what sells the classic blown-out rim — the output
//  texture is half-float and linear, so values above 1 survive the bake intact
//  rather than clipping at write time.
// ─────────────────────────────────────────────────────────────────────────────
import * as TSL from "three/tsl";

const { float, vec3, dot, max, mix, pow, smoothstep, clamp } = TSL as any;

import { DISC_MARGIN } from "../disc";

/**
 * How strongly the limb in this direction faces the sun. At the limb the surface
 * normal is the radial direction, so this is a plain dot product — and it is what
 * makes the rim and halo wrap only the lit edge.
 *
 * `glowWrap` is the overshoot. At 0 this is the honest answer, which means the halo
 * all but vanishes at full moon: at zero phase the terminator *coincides* with the
 * limb, so the entire edge is grazing-lit. Correct, and not the look anyone means by
 * "full moon glow" — that is atmospheric bloom around a bright object, not rim
 * lighting. At 1 the gate opens to an even ring regardless of phase.
 */
export function limbFacing(pc: any, sunView: any, U: any) {
  const lit = max(dot(vec3(pc.x, pc.y, 0.0), sunView), 0.0);
  return mix(lit, float(1.0), U.glowWrap);
}

/**
 * Fresnel rim on the surface. Under an orthographic view N·V is just z, so the limb
 * is exactly where z → 0 and no view vector is needed.
 *
 * @param z      the sphere normal's z, i.e. N·V
 * @param facing 0..1 gate — how lit this part of the surface is
 */
export function rimTerm(z: any, facing: any, U: any) {
  // Same overshoot as the halo, for the same reason — otherwise the rim disappears
  // at exactly the phase most people picture when they ask for one.
  const gate = mix(facing, float(1.0), U.glowWrap);
  return pow(clamp(z.oneMinus(), 0.0, 1.0), U.rimPower).mul(U.rimStrength).mul(gate);
}

/**
 * Glow beyond the limb, baked into the disc's margin rather than added as a
 * post-process — the whole point of this project is that nothing runs per frame.
 *
 * Two things keep it from being clipped at the texture edge:
 *
 *   · `glowWidth` is a fraction of `DISC_MARGIN`, not an absolute distance, so the
 *     glow physically cannot reach past the texture however far it is pushed.
 *   · the falloff hits *exactly* zero at that reach. An exponential never does, and
 *     the leftover few percent is what gets sliced off square where the margin runs
 *     out — a straight vertical cut through the halo.
 *
 * @param r  unclamped disc radius, 1.0 at the limb
 */
export function haloTerm(r: any, pc: any, sunView: any, U: any) {
  const reach = max(U.glowWidth, 1e-3).mul(DISC_MARGIN);
  const t = clamp(max(r.sub(1.0), 0.0).div(reach), 0.0, 1.0);
  const outer = pow(t.oneMinus(), float(2.2));
  // Ramp in just inside the limb so the glow reads as light escaping the edge
  // rather than as a ring pasted onto the surface.
  const inner = smoothstep(float(1.0).sub(reach.mul(0.35)).sub(0.02), 1.0, r);
  return inner.mul(outer).mul(U.glowStrength).mul(limbFacing(pc, sunView, U));
}

