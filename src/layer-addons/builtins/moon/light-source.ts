import { normalizeImagePlacement } from "../../../image-placement-transform";
import type { SkyboxMoonParams } from "../../../manifest";
import type { LayerLightSourceDescriptor } from "../../registry";
import { DISC_FILL } from "./disc";
import { DEFAULT_MOON_SPRITE_ANGULAR_SIZE } from "./params";

/**
 * Disc-integrated lunar phase curve, Allen (1976) / Astronomical Almanac:
 * magnitude drop dm(g) = 0.026·g + 4e-9·g⁴ with g the phase angle in DEGREES;
 * brightness relative to full moon = 10^(-0.4·dm). Full : quarter ≈ 11 : 1 —
 * the observed "full moon is ~10× a quarter moon". The Lambert sphere
 * (photometry.ts lambertSpherePhase) gives only ~3× and is too flat here.
 */
export function moonPhaseBrightness(phaseAngleRadians: number): number {
  const g = Math.min(Math.max(phaseAngleRadians, 0), Math.PI) * (180 / Math.PI);
  return 10 ** (-0.4 * (0.026 * g + 4e-9 * g ** 4));
}

/**
 * Phase angle from the manifest phase parameter: 0.5 = full (g = 0),
 * 0/1 = new (g = π). `sunTilt` is deliberately excluded — it is a terminator
 * aesthetics control, and folding it in would break the scale = 1
 * normalization at the default configuration (sunTilt 0.12 → g ≈ 6.8°).
 */
export function moonPhaseAngle(phase: number): number {
  return Math.min(Math.abs(phase - 0.5) * 2 * Math.PI, Math.PI);
}

/**
 * Dynamic lighting: the sun direction in the moon sprite's frame, derived
 * from the actual geometry between the moon and its linked light layer.
 * Frame axes are the placement tangents with +z toward the viewer, matching
 * the baker's view frame (V = (0, 0, 1)) — a moon transiting in front of its
 * light source gets z ≈ -1 and shows its night side; a moon opposite the
 * source gets z ≈ +1 and is full. Null when the moon is not linked.
 */
export function deriveMoonFrameLight(
  params: SkyboxMoonParams,
): [number, number, number] | null {
  const lightDirection = params.resolvedLightDirection;

  if (!params.lightLayerId || !lightDirection) {
    return null;
  }

  const placement = normalizeImagePlacement(params.placement);
  const center = placement.centerDirection;
  const x =
    lightDirection[0] * placement.tangentX[0] +
    lightDirection[1] * placement.tangentX[1] +
    lightDirection[2] * placement.tangentX[2];
  const y =
    lightDirection[0] * placement.tangentY[0] +
    lightDirection[1] * placement.tangentY[1] +
    lightDirection[2] * placement.tangentY[2];
  const z = -(
    lightDirection[0] * center[0] +
    lightDirection[1] * center[1] +
    lightDirection[2] * center[2]
  );
  const length = Math.hypot(x, y, z);

  if (!(length > 1e-6)) {
    return null;
  }

  return [x / length, y / length, z / length];
}

const REF_TAN_HALF = Math.tan(DEFAULT_MOON_SPRITE_ANGULAR_SIZE / 2);

/** Trim-friendliness bound: ~4× the default linear diameter at full phase. */
export const MOON_LIGHT_INTENSITY_SCALE_MAX = 16;

/**
 * Light-source descriptor for a moon layer. `intensityScale` multiplies the
 * linked Clouds light's user intensity (the slider stays a trim) and is
 * normalized to 1 at the reference configuration — phase 0.5, default sprite
 * size, exposure 1 — so linking a default full moon never changes an
 * already-tuned slider. Style is ignored: cartoon controls are appearance,
 * not photometry.
 */
export function computeMoonLightSource(
  params: SkyboxMoonParams,
): LayerLightSourceDescriptor {
  const placement = normalizeImagePlacement(params.placement);
  // Flat-sprite solid angle ratio: Ω ≈ π·tan(w/2)·tan(h/2) for the angular
  // decal, taken relative to the reference sprite. DISC_FILL cancels out (the
  // baked disc scales with the sprite).
  const sizeScale =
    (Math.tan(Math.min(placement.angularWidth, Math.PI * 0.9) / 2) *
      Math.tan(Math.min(placement.angularHeight, Math.PI * 0.9) / 2)) /
    (REF_TAN_HALF * REF_TAN_HALF);

  // With dynamic lighting the photometric phase angle comes from the derived
  // geometry (acos of the frame light's z), not the manual phase slider.
  const frameLight = deriveMoonFrameLight(params);
  const phaseAngle = frameLight
    ? Math.acos(Math.min(Math.max(frameLight[2], -1), 1))
    : moonPhaseAngle(params.phase);
  const raw =
    moonPhaseBrightness(phaseAngle) *
    sizeScale *
    Math.max(params.exposure, 0);

  return {
    direction: [...placement.centerDirection],
    intensityScale: Number.isFinite(raw)
      ? Math.min(Math.max(raw, 0), MOON_LIGHT_INTENSITY_SCALE_MAX)
      : 1,
    // The baked disc is inscribed at DISC_FILL of the sprite; half the minor
    // angular dimension, scaled, is the disc's apparent angular radius.
    angularRadius:
      0.5 * DISC_FILL * Math.min(placement.angularWidth, placement.angularHeight),
    rendersOwnDisc: true,
  };
}
