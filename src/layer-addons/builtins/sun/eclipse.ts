import type { SkyboxSunParams } from "../../../manifest";
import { normalizeSunParams } from "../../../sun-transform";
import type { LayerLightSourceDescriptor } from "../../registry";
import {
  dotDirection,
  normalizeDirection,
  projectDirectionToSpotLocal,
} from "../../cpu-sampling";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Trim-friendliness bound, mirroring the moon's light-source clamp. */
export const SUN_LIGHT_INTENSITY_SCALE_MAX = 16;

/**
 * Covered-area fraction of the sun disc for an occluder of radius ratio
 * `rho` (= occluder/sun angular radii) whose center sits `s` sun-radii away.
 * Standard circle–circle lens area; continuous across every branch seam.
 * (The complement is the reference implementation's `visibleFraction`.)
 */
export function computeSunEclipseCoverage(s: number, rho: number): number {
  if (!(Number.isFinite(s) && Number.isFinite(rho)) || rho <= 0) {
    return 0;
  }

  const offset = Math.max(s, 0);
  if (offset >= 1 + rho) {
    return 0;
  }
  if (rho >= 1 && offset <= rho - 1) {
    return 1;
  }
  if (rho < 1 && offset <= 1 - rho) {
    return rho * rho;
  }

  const sunHalfAngle = Math.acos(clamp((offset * offset + 1 - rho * rho) / (2 * offset), -1, 1));
  const occluderHalfAngle = Math.acos(
    clamp((offset * offset + rho * rho - 1) / (2 * offset * rho), -1, 1),
  );
  const kite =
    0.5 *
    Math.sqrt(
      Math.max(
        (1 + rho - offset) * (offset + 1 - rho) * (offset - 1 + rho) * (offset + 1 + rho),
        0,
      ),
    );
  const lens = sunHalfAngle + rho * rho * occluderHalfAngle - kite;

  return clamp(lens / Math.PI, 0, 1);
}

export type SunEclipseGeometry = {
  /** 1 when a valid occluder is in front of the viewer near the sun; else 0. */
  active: number;
  /** Covered fraction of the sun disc, 0..1 — feeds the light source only. */
  coverage: number;
  /** Occluder center in the sun's gnomonic d-units. */
  occLocalX: number;
  occLocalY: number;
  /** Occluder radius in d-units (same tan-plane as the local frame). */
  occRadiusD: number;
};

const INACTIVE_GEOMETRY: SunEclipseGeometry = {
  active: 0,
  coverage: 0,
  occLocalX: 0,
  occLocalY: 0,
  occRadiusD: 0,
};

/**
 * Occluder placement + coverage, computed once per param push (never per
 * pixel). The renderer needs only the occluder's position/radius in the
 * sun's local frame — everything visual (crescent, aureole concentration,
 * diamond ring, corona reveal) emerges per-pixel from the reference model.
 * Coverage exists solely so `computeSunLightSource` can dim linked clouds.
 */
export function computeSunEclipseGeometry(rawParams: SkyboxSunParams): SunEclipseGeometry {
  const params = normalizeSunParams(rawParams);
  const occDirection = params.resolvedOccluderDirection;
  const occAngRadius = params.resolvedOccluderAngularRadius ?? 0;

  if (!occDirection || !(occAngRadius > 0)) {
    return INACTIVE_GEOMETRY;
  }

  const center = normalizeDirection(params.centerDirection);
  const occluder = normalizeDirection(occDirection);
  const frontDot = dotDirection(center, occluder);

  const sunAngRadius = Math.max(params.angularRadius, 1e-6);
  const separation = Math.acos(clamp(frontDot, -1, 1));
  const s = separation / sunAngRadius;
  const rho = occAngRadius / sunAngRadius;

  // Occluder behind the viewer or far from the sun: the gnomonic projection
  // below would emit clamped-denominator garbage, so bail before it runs.
  if (frontDot <= 0.05 || s >= 1 + rho + 4) {
    return INACTIVE_GEOMETRY;
  }

  const coverage = computeSunEclipseCoverage(s, rho);
  const occLocal = projectDirectionToSpotLocal(occluder, center, params.angularRadius);
  const occRadiusD = Math.tan(occAngRadius) / params.angularRadius;

  return {
    active: 1,
    coverage,
    occLocalX: occLocal.x,
    occLocalY: occLocal.y,
    occRadiusD,
  };
}

const REF_TAN_HALF_SUN = Math.tan(Math.PI / 24); // default photosphere radius / 2

/**
 * Light-source descriptor for a sun layer, expressed in the terms the clouds
 * model consumes: total flux is surface brightness (exp2 exposure) × solid
 * angle (photosphere area, normalized to the default size) × the exposed
 * fraction of the disc (eclipse coverage — light is linear in exposed area).
 * Normalized to 1 at defaults (exposure 0, default radius, no occluder).
 */
export function computeSunLightSource(
  rawParams: SkyboxSunParams,
): LayerLightSourceDescriptor {
  const params = normalizeSunParams(rawParams);
  const geometry = computeSunEclipseGeometry(params);
  const tanHalf = Math.tan(Math.min(params.angularRadius, Math.PI * 0.9) / 2);
  const sizeScale = (tanHalf * tanHalf) / (REF_TAN_HALF_SUN * REF_TAN_HALF_SUN);
  const raw = Math.pow(2, params.exposure) * sizeScale * (1 - geometry.coverage);

  return {
    direction: [...normalizeDirection(params.centerDirection)] as [number, number, number],
    intensityScale: Number.isFinite(raw)
      ? clamp(raw, 0, SUN_LIGHT_INTENSITY_SCALE_MAX)
      : 1,
    angularRadius: params.angularRadius,
    rendersOwnDisc: true,
  };
}
