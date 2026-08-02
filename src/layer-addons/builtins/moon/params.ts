import {
  createAngularDecalPlacement,
  normalizeImagePlacement,
  normalizeVector,
} from "../../../image-placement-transform";
import type {
  SkyboxMoonParams,
  SkyboxMoonStyle,
} from "../../../manifest";

export const MOON_RESOLUTION_MIN = 128;
export const MOON_RESOLUTION_MAX = 2048;
export const DEFAULT_MOON_SPRITE_ANGULAR_SIZE = 2 * Math.atan(1 / 4);

export const STYLE_EXPOSURE: Record<SkyboxMoonStyle, number> = {
  realistic: 1,
  cartoon: 1,
};

type LegacyMoonParams = Partial<SkyboxMoonParams> & {
  ambient?: number;
  earthshine?: number;
  lightIntensity?: number;
};

export function createDefaultSkyboxMoonParams(
  centerDirection: [number, number, number] = [0, 0, -1],
): SkyboxMoonParams {
  return {
    placement: createAngularDecalPlacement({
      angularHeight: DEFAULT_MOON_SPRITE_ANGULAR_SIZE,
      angularWidth: DEFAULT_MOON_SPRITE_ANGULAR_SIZE,
      centerDirection: normalizeVector(centerDirection),
    }),
    resolutionMode: "auto",
    photometryModel: "hapke-wac-643",
    lightLayerId: null,
    phase: 0.5,
    sunTilt: 0.12,
    bodyRotation: 0,
    bodyTilt: 0,
    craterFreq: 7,
    craterDepth: 0.012,
    maria: 0.42,
    mariaDepth: 0.004,
    regolith: 0.5,
    rays: 1,
    exposure: STYLE_EXPOSURE.realistic,
    shadowSoftness: 0,
    style: "realistic",
    cartoonLightIntensity: 1,
    cartoonFill: 0,
    cartoonNightStrength: 0.3,
    cartoonCraters: 44,
    cartoonCraterSize: 0.13,
    cartoonWobble: 0.34,
    cartoonRelief: 0.42,
    cartoonForm: 0.5,
    cartoonSunLean: 0.35,
    cartoonOutline: 0.12,
    cartoonSoftness: 0.1,
    cartoonShadowSize: 0,
    cartoonEdgeGlow: 0,
    cartoonCrop: false,
    baseColor: "#d3dde3",
    mareColor: "#a6b8c2",
    nightColor: "#1b2740",
  };
}

export function cloneSkyboxMoonParams(params: SkyboxMoonParams): SkyboxMoonParams {
  return {
    ...params,
    placement: normalizeImagePlacement(params.placement),
  };
}

export function normalizeSkyboxMoonParams(
  value: LegacyMoonParams | null | undefined,
): SkyboxMoonParams {
  const defaults = createDefaultSkyboxMoonParams(
    value?.placement?.centerDirection,
  );
  const legacy = value ?? {};
  const params = { ...defaults, ...legacy };

  return cloneSkyboxMoonParams({
    placement: normalizeImagePlacement(params.placement),
    resolutionMode: params.resolutionMode,
    photometryModel: "hapke-wac-643",
    lightLayerId: typeof params.lightLayerId === "string" ? params.lightLayerId : null,
    // Resolution output — passes through only when present (resolver lifecycle).
    ...(params.resolvedLightDirection
      ? { resolvedLightDirection: normalizeVector(params.resolvedLightDirection) }
      : {}),
    phase: params.phase,
    sunTilt: params.sunTilt,
    bodyRotation: params.bodyRotation,
    bodyTilt: params.bodyTilt,
    craterFreq: params.craterFreq,
    craterDepth: params.craterDepth,
    maria: params.maria,
    mariaDepth: params.mariaDepth,
    regolith: params.regolith,
    rays: params.rays,
    exposure: params.exposure,
    shadowSoftness: Math.min(Math.max(params.shadowSoftness, 0), 1),
    style: params.style,
    cartoonLightIntensity:
      legacy.cartoonLightIntensity ?? legacy.lightIntensity ?? defaults.cartoonLightIntensity,
    cartoonFill: legacy.cartoonFill ?? legacy.ambient ?? defaults.cartoonFill,
    cartoonNightStrength:
      legacy.cartoonNightStrength ??
      (typeof legacy.earthshine === "number" ? legacy.earthshine * 6 : defaults.cartoonNightStrength),
    cartoonCraters: params.cartoonCraters,
    cartoonCraterSize: params.cartoonCraterSize,
    cartoonWobble: params.cartoonWobble,
    cartoonRelief: params.cartoonRelief,
    cartoonForm: params.cartoonForm,
    cartoonSunLean: params.cartoonSunLean,
    cartoonOutline: params.cartoonOutline,
    cartoonSoftness: params.cartoonSoftness,
    cartoonShadowSize: params.cartoonShadowSize,
    cartoonEdgeGlow: params.cartoonEdgeGlow,
    cartoonCrop: params.cartoonCrop,
    baseColor: params.baseColor,
    mareColor: params.mareColor,
    nightColor: params.nightColor,
  });
}

export type MoonBakeParams = SkyboxMoonParams & { resolution: number };
