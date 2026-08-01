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
export declare function limbFacing(pc: any, sunView: any, U: any): any;
/**
 * Fresnel rim on the surface. Under an orthographic view N·V is just z, so the limb
 * is exactly where z → 0 and no view vector is needed.
 *
 * @param z      the sphere normal's z, i.e. N·V
 * @param facing 0..1 gate — how lit this part of the surface is
 */
export declare function rimTerm(z: any, facing: any, U: any): any;
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
export declare function haloTerm(r: any, pc: any, sunView: any, U: any): any;
