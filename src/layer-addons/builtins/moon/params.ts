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
  realistic: 2.6,
  cartoon: 1,
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
    phase: 0.5,
    sunTilt: 0.12,
    bodyRotation: 0,
    bodyTilt: 0,
    craterFreq: 7,
    craterDepth: 0.012,
    maria: 0.42,
    mariaDarkness: 0.5,
    mariaDepth: 0.004,
    regolith: 0.5,
    rays: 1,
    albedo: 0.13,
    bumpStrength: 1,
    ao: 0.8,
    shadowStrength: 0.9,
    shadowReach: 0.055,
    backscatter: 0.75,
    earthshine: 0.05,
    exposure: STYLE_EXPOSURE.realistic,
    lightIntensity: 1,
    ambient: 0,
    rimStrength: 0.35,
    rimPower: 3,
    rimColor: "#ffffff",
    glowStrength: 0.5,
    glowWidth: 0.22,
    glowWrap: 0.25,
    glowColor: "#cfe2ff",
    style: "realistic",
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
  value: Partial<SkyboxMoonParams> | null | undefined,
): SkyboxMoonParams {
  const defaults = createDefaultSkyboxMoonParams(
    value?.placement?.centerDirection,
  );
  const params = { ...defaults, ...(value ?? {}) };

  return cloneSkyboxMoonParams({
    ...params,
    placement: normalizeImagePlacement(params.placement),
  });
}

export type MoonBakeParams = SkyboxMoonParams & { resolution: number };
