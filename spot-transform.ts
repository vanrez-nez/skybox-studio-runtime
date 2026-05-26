import type { SkyboxSpotParams } from "./manifest";
import {
  directionFromPosition,
  IMAGE_PLACEMENT_ELEVATION_LIMIT,
  normalizeVector,
  type Point2,
  type VectorTuple,
} from "./image-placement-transform";

export const DEFAULT_SPOT_BASE_ANGULAR_RADIUS = Math.PI / 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

function normalizeAngleDegrees(degrees: number) {
  return ((degrees + 180) % 360 + 360) % 360 - 180;
}

export function createDefaultSpotParams(): SkyboxSpotParams {
  return {
    angularRadius: DEFAULT_SPOT_BASE_ANGULAR_RADIUS,
    baseAngularRadius: DEFAULT_SPOT_BASE_ANGULAR_RADIUS,
    brightness: 1,
    centerDirection: [0, 0, -1],
    colorMode: "light",
    coreRadius: 0.16,
    coreSoftness: 2.25,
    dispersion: 0.88,
    dogSpread: 0.055,
    dogStrength: 0.64,
    dogStretch: 0.18,
    glareSize: 0.34,
    glareStrength: 0.48,
    glow: 0.5,
    glowSize: 0.55,
    glowStrength: 0.35,
    halo: 0.25,
    haloInnerWidth: 0.014,
    haloOuterWidth: 0.07,
    haloRadius: 0.42,
    haloStrength: 0.58,
    lightColor: "#ffffff",
    stops: [
      { color: "#ffffff", location: 0, midpoint: 50, opacity: 100 },
      { color: "#ffffff", location: 100, midpoint: 50, opacity: 0 },
    ],
  };
}

export function normalizeSpotParams(rawParams: unknown): SkyboxSpotParams {
  const raw = rawParams as Partial<SkyboxSpotParams> | null;
  const defaults = createDefaultSpotParams();
  const baseAngularRadius = Math.max(
    0.0001,
    typeof raw?.baseAngularRadius === "number" ? raw.baseAngularRadius : defaults.baseAngularRadius
  );

  return {
    angularRadius: Math.max(
      0.0001,
      typeof raw?.angularRadius === "number" ? raw.angularRadius : baseAngularRadius
    ),
    baseAngularRadius,
    brightness: Math.max(0, typeof raw?.brightness === "number" ? raw.brightness : defaults.brightness),
    centerDirection: normalizeVector(raw?.centerDirection, defaults.centerDirection),
    colorMode: raw?.colorMode === "gradient" ? "gradient" : "light",
    coreRadius: clamp(typeof raw?.coreRadius === "number" ? raw.coreRadius : defaults.coreRadius, 0.01, 0.7),
    coreSoftness: clamp(typeof raw?.coreSoftness === "number" ? raw.coreSoftness : defaults.coreSoftness, 0.4, 6),
    dispersion: clamp(typeof raw?.dispersion === "number" ? raw.dispersion : defaults.dispersion, 0, 1),
    dogSpread: clamp(typeof raw?.dogSpread === "number" ? raw.dogSpread : defaults.dogSpread, 0.015, 0.18),
    dogStrength: clamp(typeof raw?.dogStrength === "number" ? raw.dogStrength : defaults.dogStrength, 0, 1.8),
    dogStretch: clamp(typeof raw?.dogStretch === "number" ? raw.dogStretch : defaults.dogStretch, 0, 0.55),
    glareSize: clamp(typeof raw?.glareSize === "number" ? raw.glareSize : defaults.glareSize, 0.03, 1.1),
    glareStrength: clamp(typeof raw?.glareStrength === "number" ? raw.glareStrength : defaults.glareStrength, 0, 1.4),
    glow: clamp(typeof raw?.glow === "number" ? raw.glow : defaults.glow, 0, 1),
    glowSize: clamp(typeof raw?.glowSize === "number" ? raw.glowSize : defaults.glowSize, 0.05, 1.4),
    glowStrength: clamp(
      typeof raw?.glowStrength === "number" ? raw.glowStrength : defaults.glowStrength,
      0,
      1
    ),
    halo: clamp(typeof raw?.halo === "number" ? raw.halo : defaults.halo, 0, 1),
    haloInnerWidth: clamp(
      typeof raw?.haloInnerWidth === "number" ? raw.haloInnerWidth : defaults.haloInnerWidth,
      0.003,
      0.09
    ),
    haloOuterWidth: clamp(
      typeof raw?.haloOuterWidth === "number" ? raw.haloOuterWidth : defaults.haloOuterWidth,
      0.01,
      0.24
    ),
    haloRadius: clamp(typeof raw?.haloRadius === "number" ? raw.haloRadius : defaults.haloRadius, 0.04, 1),
    haloStrength: clamp(
      typeof raw?.haloStrength === "number" ? raw.haloStrength : defaults.haloStrength,
      0,
      1.4
    ),
    lightColor: typeof raw?.lightColor === "string" ? raw.lightColor : defaults.lightColor,
    stops: (raw?.stops?.length ? raw.stops : defaults.stops).map((stop) => ({
      color: stop.color,
      location: clamp(stop.location, 0, 100),
      midpoint: clamp(stop.midpoint ?? 50, 1, 99),
      opacity: clamp(stop.opacity, 0, 100),
    })),
  };
}

export function positionFromSpot(params: SkyboxSpotParams): Point2 {
  const centerDirection = normalizeVector(params.centerDirection);

  return {
    x: normalizeAngleDegrees(radiansToDegrees(Math.atan2(centerDirection[0], -centerDirection[2]))),
    y: radiansToDegrees(
      Math.asin(clamp(centerDirection[1], -1, 1))
    ),
  };
}

export function spotFromPosition(params: SkyboxSpotParams, position: Point2): SkyboxSpotParams {
  return {
    ...normalizeSpotParams(params),
    centerDirection: directionFromPosition({
      x: position.x,
      y: clamp(position.y, -IMAGE_PLACEMENT_ELEVATION_LIMIT, IMAGE_PLACEMENT_ELEVATION_LIMIT),
    }),
  };
}

export function radiusScaleFromSpot(params: SkyboxSpotParams) {
  const normalizedParams = normalizeSpotParams(params);

  return normalizedParams.angularRadius / normalizedParams.baseAngularRadius;
}

export function spotFromRadiusScale(params: SkyboxSpotParams, radiusScale: number): SkyboxSpotParams {
  const normalizedParams = normalizeSpotParams(params);

  return {
    ...normalizedParams,
    angularRadius: Math.max(0.0001, normalizedParams.baseAngularRadius * Math.max(0.0001, radiusScale)),
  };
}

export function spotContainsDirection(direction: VectorTuple, params: SkyboxSpotParams) {
  const normalizedParams = normalizeSpotParams(params);
  const normalizedDirection = normalizeVector(direction);
  const centerDirection = normalizeVector(normalizedParams.centerDirection);
  const dot =
    normalizedDirection[0] * centerDirection[0] +
    normalizedDirection[1] * centerDirection[1] +
    normalizedDirection[2] * centerDirection[2];
  const angle = Math.acos(clamp(dot, -1, 1));

  return angle <= normalizedParams.angularRadius;
}
