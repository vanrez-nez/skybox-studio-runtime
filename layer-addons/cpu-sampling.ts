import { clamp, parseHexColor, srgbChannelToLinear, type Rgb, type Rgba } from "../math";
import type { SkyboxGradientStop, SkyboxImageParams } from "../manifest";
import type { StarfieldBakeData } from "../starfield-static";

export const TWO_PI = Math.PI * 2;

export type LinearStop = {
  alpha: number;
  color: Rgb;
  midpoint: number;
  t: number;
};

export function mix(firstValue: number, secondValue: number, amount: number) {
  return firstValue + (secondValue - firstValue) * amount;
}

export function prepareStops(stops: SkyboxGradientStop[]): LinearStop[] {
  return stops
    .map((stop) => ({
      alpha: clamp(stop.opacity / 100),
      color: parseHexColor(stop.color),
      midpoint: clamp((stop.midpoint ?? 50) / 100, 0.01, 0.99),
      t: clamp(stop.location / 100),
    }))
    .sort((firstStop, secondStop) => firstStop.t - secondStop.t);
}

function remapMidpoint(localT: number, midpoint: number) {
  if (localT <= midpoint) {
    return localT / Math.max(midpoint * 2, 0.00001);
  }

  return 0.5 + (localT - midpoint) / Math.max((1 - midpoint) * 2, 0.00001);
}

export function sampleGradient(stops: LinearStop[], t: number): Rgba {
  if (stops.length === 0) {
    return [0, 0, 0, 0];
  }

  const clampedT = clamp(t);
  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];

  if (clampedT <= firstStop.t) {
    return [...firstStop.color, firstStop.alpha];
  }

  if (clampedT >= lastStop.t) {
    return [...lastStop.color, lastStop.alpha];
  }

  for (let stopIndex = 0; stopIndex < stops.length - 1; stopIndex += 1) {
    const currentStop = stops[stopIndex];
    const nextStop = stops[stopIndex + 1];

    if (clampedT < currentStop.t || clampedT > nextStop.t) {
      continue;
    }

    const span = nextStop.t - currentStop.t;
    const localT = span <= 0 ? 0 : (clampedT - currentStop.t) / span;
    const midpointT = remapMidpoint(localT, currentStop.midpoint);

    return [
      mix(currentStop.color[0], nextStop.color[0], midpointT),
      mix(currentStop.color[1], nextStop.color[1], midpointT),
      mix(currentStop.color[2], nextStop.color[2], midpointT),
      mix(currentStop.alpha, nextStop.alpha, midpointT),
    ];
  }

  return [...lastStop.color, lastStop.alpha];
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / Math.max(edge1 - edge0, 0.00001));

  return t * t * (3 - 2 * t);
}

export function sq(value: number) {
  return value * value;
}

export function mixRgb(first: Rgb, second: Rgb, amount: number): Rgb {
  return [
    mix(first[0], second[0], amount),
    mix(first[1], second[1], amount),
    mix(first[2], second[2], amount),
  ];
}

export function spectrum(t: number): Rgb {
  const clampedT = clamp(t);
  let color: Rgb = [1, 0.12, 0.05];

  color = mixRgb(color, [1, 0.55, 0.1], smoothstep(0, 0.28, clampedT));
  color = mixRgb(color, [1, 0.93, 0.6], smoothstep(0.22, 0.45, clampedT));
  color = mixRgb(color, [1, 1, 1], smoothstep(0.42, 0.6, clampedT));
  color = mixRgb(color, [0.55, 0.8, 1], smoothstep(0.62, 0.85, clampedT));
  color = mixRgb(color, [0.35, 0.5, 1], smoothstep(0.85, 1, clampedT));

  return color;
}

export function multiplyRgb(first: Rgb, second: Rgb): Rgb {
  return [first[0] * second[0], first[1] * second[1], first[2] * second[2]];
}

export function scaleRgb(color: Rgb, amount: number): Rgb {
  return [color[0] * amount, color[1] * amount, color[2] * amount];
}

export function addRgb(first: Rgb, second: Rgb): Rgb {
  return [first[0] + second[0], first[1] + second[1], first[2] + second[2]];
}

export function colorizeLight(layerColor: Rgb, lightColor: Rgb): Rgb {
  const tinted = multiplyRgb(layerColor, mixRgb([1, 1, 1], lightColor, 0.82));

  return mixRgb(lightColor, tinted, 0.82);
}

export function equirectPointToDirection(x: number, y: number): Rgb {
  const lambda = (x - 0.5) * TWO_PI;
  const phi = (0.5 - y) * Math.PI;
  const cosPhi = Math.cos(phi);

  return [cosPhi * Math.cos(lambda), Math.sin(phi), cosPhi * Math.sin(lambda)];
}

// Equirect centered on -Z (camera default forward), +X to the right of center — matches the GPU
// `skyboxStudioEquirectUvToDirection` so the CPU bake fallback produces the same orientation.
export function equirectUvToDirection(x: number, y: number): Rgb {
  const lambda = (x - 0.5) * TWO_PI;
  const phi = (y - 0.5) * Math.PI;
  const cosPhi = Math.cos(phi);

  return [cosPhi * Math.sin(lambda), Math.sin(phi), -cosPhi * Math.cos(lambda)];
}

export function normalizeDirection(direction: Rgb): Rgb {
  const length = Math.hypot(direction[0], direction[1], direction[2]);

  if (length <= 0) {
    return [0, 1, 0];
  }

  return [direction[0] / length, direction[1] / length, direction[2] / length];
}

export function dotDirection(firstDirection: Rgb, secondDirection: Rgb) {
  return (
    firstDirection[0] * secondDirection[0] +
    firstDirection[1] * secondDirection[1] +
    firstDirection[2] * secondDirection[2]
  );
}

export function crossDirection(firstDirection: Rgb, secondDirection: Rgb): Rgb {
  return [
    firstDirection[1] * secondDirection[2] - firstDirection[2] * secondDirection[1],
    firstDirection[2] * secondDirection[0] - firstDirection[0] * secondDirection[2],
    firstDirection[0] * secondDirection[1] - firstDirection[1] * secondDirection[0],
  ];
}

export function projectDirectionToSpotLocal(direction: Rgb, centerDirection: Rgb, radius: number) {
  const sampleDirection = normalizeDirection(direction);
  const center = normalizeDirection(centerDirection);
  const tangentX = normalizeDirection(crossDirection([0, 1, 0], center));
  const tangentY = normalizeDirection(crossDirection(center, tangentX));
  const denom = Math.max(dotDirection(sampleDirection, center), 0.000001);
  const localX = dotDirection(sampleDirection, tangentX) / denom / Math.max(radius, 0.0001);
  const localY = dotDirection(sampleDirection, tangentY) / denom / Math.max(radius, 0.0001);

  return {
    x: localX,
    y: localY,
    d: Math.hypot(localX, localY),
  };
}

export function warpDirection(direction: Rgb, amplitude: number, frequency: number): Rgb {
  if (amplitude <= 0) {
    return direction;
  }

  const safeFrequency = Math.max(0.0001, frequency);
  const offset: Rgb = [
    Math.sin((direction[1] * safeFrequency + 0.23) * TWO_PI) *
      Math.cos((direction[2] * safeFrequency + 0.41) * TWO_PI),
    Math.cos((direction[2] * safeFrequency + 0.17) * TWO_PI) *
      Math.sin((direction[0] * safeFrequency + 0.37) * TWO_PI),
    Math.sin((direction[0] * safeFrequency - 0.31) * TWO_PI) *
      Math.cos((direction[1] * safeFrequency + 0.29) * TWO_PI),
  ];

  return normalizeDirection([
    direction[0] + offset[0] * amplitude,
    direction[1] + offset[1] * amplitude,
    direction[2] + offset[2] * amplitude,
  ]);
}

export function angularFieldDistance(firstDirection: Rgb, secondDirection: Rgb) {
  const dot =
    firstDirection[0] * secondDirection[0] +
    firstDirection[1] * secondDirection[1] +
    firstDirection[2] * secondDirection[2];

  return 1 - clamp(dot, -1, 1);
}

export function mixRgba(first: Rgba, second: Rgba, amount: number): Rgba {
  return [
    mix(first[0], second[0], amount),
    mix(first[1], second[1], amount),
    mix(first[2], second[2], amount),
    mix(first[3], second[3], amount),
  ];
}

export function sampleStarfieldBakedPixel(bakedImage: StarfieldBakeData, x: number, y: number): Rgba {
  const pixelX = ((x % bakedImage.width) + bakedImage.width) % bakedImage.width;
  const pixelY = Math.min(bakedImage.height - 1, Math.max(0, y));
  const index = (pixelY * bakedImage.width + pixelX) * 4;

  return [
    srgbChannelToLinear((bakedImage.data[index] ?? 0) / 255),
    srgbChannelToLinear((bakedImage.data[index + 1] ?? 0) / 255),
    srgbChannelToLinear((bakedImage.data[index + 2] ?? 0) / 255),
    (bakedImage.data[index + 3] ?? 0) / 255,
  ];
}

export function sampleImagePixel(params: SkyboxImageParams, x: number, y: number): Rgba {
  const pixelX = Math.min(params.width - 1, Math.max(0, x));
  const pixelY = Math.min(params.height - 1, Math.max(0, y));
  const index = (pixelY * params.width + pixelX) * 4;
  const red = params.pixels?.[index] ?? 0;
  const green = params.pixels?.[index + 1] ?? 0;
  const blue = params.pixels?.[index + 2] ?? 0;
  const alpha = params.pixels?.[index + 3] ?? 255;

  return [
    srgbChannelToLinear(red / 255),
    srgbChannelToLinear(green / 255),
    srgbChannelToLinear(blue / 255),
    alpha / 255,
  ];
}
