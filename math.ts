import type { SkyboxLayerBlendMode } from "./manifest";

export type Rgb = [number, number, number];
export type Rgba = [number, number, number, number];

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function srgbChannelToLinear(channel: number) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function linearChannelToSrgb(channel: number) {
  const clampedChannel = clamp(channel);

  return clampedChannel <= 0.0031308
    ? clampedChannel * 12.92
    : 1.055 * clampedChannel ** (1 / 2.4) - 0.055;
}

export function parseHexColor(color: string): Rgb {
  const hexColor = color.trim().replace(/^#/, "");
  const normalizedColor =
    hexColor.length === 3
      ? hexColor
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : hexColor;

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedColor)) {
    return [1, 1, 1];
  }

  return [0, 2, 4].map((offset) =>
    srgbChannelToLinear(Number.parseInt(normalizedColor.slice(offset, offset + 2), 16) / 255)
  ) as Rgb;
}

export function linearRgbToSrgbBytes(color: Rgb): [number, number, number] {
  return color.map((channel) => Math.round(linearChannelToSrgb(channel) * 255)) as [
    number,
    number,
    number,
  ];
}

function softLightD(backdrop: number) {
  return backdrop <= 0.25
    ? ((16 * backdrop - 12) * backdrop + 4) * backdrop
    : Math.sqrt(backdrop);
}

export function blendChannel(
  mode: SkyboxLayerBlendMode,
  backdropValue: number,
  sourceValue: number
) {
  const backdrop = clamp(backdropValue);
  const source = clamp(sourceValue);

  switch (mode) {
    case "multiply":
      return backdrop * source;
    case "screen":
      return backdrop + source - backdrop * source;
    case "overlay":
      return backdrop <= 0.5
        ? 2 * backdrop * source
        : 1 - 2 * (1 - backdrop) * (1 - source);
    case "darken":
      return Math.min(backdrop, source);
    case "lighten":
      return Math.max(backdrop, source);
    case "color-dodge":
      return backdrop === 0 ? 0 : source === 1 ? 1 : Math.min(1, backdrop / (1 - source));
    case "color-burn":
      return backdrop === 1 ? 1 : source === 0 ? 0 : 1 - Math.min(1, (1 - backdrop) / source);
    case "hard-light":
      return source <= 0.5
        ? 2 * backdrop * source
        : backdrop + (2 * source - 1) - backdrop * (2 * source - 1);
    case "soft-light":
      return source <= 0.5
        ? backdrop - (1 - 2 * source) * backdrop * (1 - backdrop)
        : backdrop + (2 * source - 1) * (softLightD(backdrop) - backdrop);
    case "difference":
      return Math.abs(backdrop - source);
    case "exclusion":
      return backdrop + source - 2 * backdrop * source;
    case "normal":
    default:
      return source;
  }
}

export function compositeBlendChannel(
  mode: SkyboxLayerBlendMode,
  backdrop: number,
  source: number,
  alpha: number
) {
  const clampedBackdrop = clamp(backdrop);
  const clampedAlpha = clamp(alpha);
  const blended = clamp(blendChannel(mode, clampedBackdrop, source));

  return clamp(blended * clampedAlpha + clampedBackdrop * (1 - clampedAlpha));
}

export function compositeOver(
  backdrop: Rgb,
  source: Rgb,
  alpha: number,
  blendMode: SkyboxLayerBlendMode
): Rgb {
  return [
    compositeBlendChannel(blendMode, backdrop[0], source[0], alpha),
    compositeBlendChannel(blendMode, backdrop[1], source[1], alpha),
    compositeBlendChannel(blendMode, backdrop[2], source[2], alpha),
  ];
}

export function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}
