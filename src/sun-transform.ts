import type { SkyboxSunParams } from "./manifest";
import {
  directionFromPosition,
  IMAGE_PLACEMENT_ELEVATION_LIMIT,
  normalizeVector,
  type Point2,
  type VectorTuple,
} from "./image-placement-transform";

export const DEFAULT_SUN_BASE_ANGULAR_RADIUS = Math.PI / 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

function normalizeAngleDegrees(degrees: number) {
  return ((degrees + 180) % 360 + 360) % 360 - 180;
}

// Defaults are the reference implementation's slider defaults; only the
// photosphere radius is stylized (the real sun is 0.2665 degrees) and the
// aureole reach is re-expressed in photosphere radii so it scales with it.
export function createDefaultSunParams(): SkyboxSunParams {
  return {
    angularRadius: DEFAULT_SUN_BASE_ANGULAR_RADIUS,
    aureoleReach: 15,
    aureoleStrength: 1.2,
    baseAngularRadius: DEFAULT_SUN_BASE_ANGULAR_RADIUS,
    centerDirection: [0, 0, -1],
    coronaAxis: 1.1,
    coronaGain: 20,
    coronaSeed: 37,
    coronaStructure: 0.85,
    exposure: 0,
    occluderLayerId: null,
  };
}

export function normalizeSunParams(rawParams: unknown): SkyboxSunParams {
  const raw = rawParams as Partial<SkyboxSunParams> | null;
  const defaults = createDefaultSunParams();
  const baseAngularRadius = Math.max(
    0.0001,
    typeof raw?.baseAngularRadius === "number" ? raw.baseAngularRadius : defaults.baseAngularRadius,
  );

  return {
    angularRadius: Math.max(
      0.0001,
      typeof raw?.angularRadius === "number" ? raw.angularRadius : baseAngularRadius,
    ),
    aureoleReach: clamp(
      typeof raw?.aureoleReach === "number" ? raw.aureoleReach : defaults.aureoleReach,
      1.2,
      30,
    ),
    aureoleStrength: clamp(
      typeof raw?.aureoleStrength === "number" ? raw.aureoleStrength : defaults.aureoleStrength,
      0,
      6,
    ),
    baseAngularRadius,
    centerDirection: normalizeVector(raw?.centerDirection, defaults.centerDirection),
    coronaAxis: clamp(
      typeof raw?.coronaAxis === "number" ? raw.coronaAxis : defaults.coronaAxis,
      0,
      Math.PI,
    ),
    coronaGain: clamp(
      typeof raw?.coronaGain === "number" ? raw.coronaGain : defaults.coronaGain,
      0,
      26,
    ),
    coronaSeed: clamp(
      typeof raw?.coronaSeed === "number" ? raw.coronaSeed : defaults.coronaSeed,
      0,
      100,
    ),
    coronaStructure: clamp(
      typeof raw?.coronaStructure === "number" ? raw.coronaStructure : defaults.coronaStructure,
      0,
      1,
    ),
    exposure: clamp(typeof raw?.exposure === "number" ? raw.exposure : defaults.exposure, -2, 24),
    occluderLayerId: typeof raw?.occluderLayerId === "string" ? raw.occluderLayerId : null,
    // Resolution outputs pass through only when present (resolver lifecycle).
    ...(typeof raw?.resolvedOccluderAngularRadius === "number"
      ? { resolvedOccluderAngularRadius: raw.resolvedOccluderAngularRadius }
      : {}),
    ...(raw?.resolvedOccluderDirection
      ? { resolvedOccluderDirection: normalizeVector(raw.resolvedOccluderDirection) }
      : {}),
  };
}

export function positionFromSun(params: SkyboxSunParams): Point2 {
  const centerDirection = normalizeVector(params.centerDirection);

  return {
    x: normalizeAngleDegrees(radiansToDegrees(Math.atan2(centerDirection[0], -centerDirection[2]))),
    y: radiansToDegrees(Math.asin(clamp(centerDirection[1], -1, 1))),
  };
}

export function sunFromPosition(params: SkyboxSunParams, position: Point2): SkyboxSunParams {
  return {
    ...normalizeSunParams(params),
    centerDirection: directionFromPosition({
      x: position.x,
      y: clamp(position.y, -IMAGE_PLACEMENT_ELEVATION_LIMIT, IMAGE_PLACEMENT_ELEVATION_LIMIT),
    }),
  };
}

export function radiusScaleFromSun(params: SkyboxSunParams) {
  const normalizedParams = normalizeSunParams(params);

  return normalizedParams.angularRadius / normalizedParams.baseAngularRadius;
}

export function sunFromRadiusScale(params: SkyboxSunParams, radiusScale: number): SkyboxSunParams {
  const normalizedParams = normalizeSunParams(params);

  return {
    ...normalizedParams,
    angularRadius: Math.max(0.0001, normalizedParams.baseAngularRadius * Math.max(0.0001, radiusScale)),
  };
}

export function sunContainsDirection(direction: VectorTuple, params: SkyboxSunParams) {
  const normalizedParams = normalizeSunParams(params);
  const normalizedDirection = normalizeVector(direction);
  const centerDirection = normalizeVector(normalizedParams.centerDirection);
  const dot =
    normalizedDirection[0] * centerDirection[0] +
    normalizedDirection[1] * centerDirection[1] +
    normalizedDirection[2] * centerDirection[2];
  const angle = Math.acos(clamp(dot, -1, 1));

  return angle <= normalizedParams.angularRadius;
}
