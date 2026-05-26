import {
  clamp,
  compositeOver,
  parseHexColor,
  srgbChannelToLinear,
  type Rgb,
  type Rgba,
} from "./math";
import type {
  SkyboxFieldGradientParams,
  SkyboxGradientParams,
  SkyboxGradientStop,
  SkyboxImageParams,
  SkyboxManifest,
  SkyboxManifestLayer,
  SkyboxManifestNode,
  SkyboxSpotParams,
} from "./manifest";
import { migrateManifestToV2 } from "./manifest";
import { projectDirectionToImageUv } from "./image-placement-transform";
import { normalizeSpotParams } from "./spot-transform";

const TWO_PI = Math.PI * 2;

type LinearStop = {
  alpha: number;
  color: Rgb;
  midpoint: number;
  t: number;
};

function mix(firstValue: number, secondValue: number, amount: number) {
  return firstValue + (secondValue - firstValue) * amount;
}

function prepareStops(stops: SkyboxGradientStop[]): LinearStop[] {
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

function sampleGradient(stops: LinearStop[], t: number): Rgba {
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

function getLinearGradientAxis(rotation: number): Rgb {
  const radians = (rotation * Math.PI) / 180;

  return [Math.sin(radians), Math.cos(radians), 0];
}

function sampleGradientLayer(direction: Rgb, params: SkyboxGradientParams): Rgba {
  const axis = getLinearGradientAxis(params.rotation);
  const dot = direction[0] * axis[0] + direction[1] * axis[1] + direction[2] * axis[2];

  return sampleGradient(prepareStops(params.stops), dot * 0.5 + 0.5);
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / Math.max(edge1 - edge0, 0.00001));

  return t * t * (3 - 2 * t);
}

function sq(value: number) {
  return value * value;
}

function spectrum(t: number): Rgb {
  const clampedT = clamp(t);
  let color: Rgb = [1, 0.12, 0.05];

  color = mixRgb(color, [1, 0.55, 0.1], smoothstep(0, 0.28, clampedT));
  color = mixRgb(color, [1, 0.93, 0.6], smoothstep(0.22, 0.45, clampedT));
  color = mixRgb(color, [1, 1, 1], smoothstep(0.42, 0.6, clampedT));
  color = mixRgb(color, [0.55, 0.8, 1], smoothstep(0.62, 0.85, clampedT));
  color = mixRgb(color, [0.35, 0.5, 1], smoothstep(0.85, 1, clampedT));

  return color;
}

function mixRgb(first: Rgb, second: Rgb, amount: number): Rgb {
  return [
    mix(first[0], second[0], amount),
    mix(first[1], second[1], amount),
    mix(first[2], second[2], amount),
  ];
}

function multiplyRgb(first: Rgb, second: Rgb): Rgb {
  return [first[0] * second[0], first[1] * second[1], first[2] * second[2]];
}

function scaleRgb(color: Rgb, amount: number): Rgb {
  return [color[0] * amount, color[1] * amount, color[2] * amount];
}

function addRgb(first: Rgb, second: Rgb): Rgb {
  return [first[0] + second[0], first[1] + second[1], first[2] + second[2]];
}

function colorizeLight(layerColor: Rgb, lightColor: Rgb): Rgb {
  const tinted = multiplyRgb(layerColor, mixRgb([1, 1, 1], lightColor, 0.82));

  return mixRgb(lightColor, tinted, 0.82);
}

export function equirectPointToDirection(x: number, y: number): Rgb {
  const lambda = (x - 0.5) * TWO_PI;
  const phi = (0.5 - y) * Math.PI;
  const cosPhi = Math.cos(phi);

  return [cosPhi * Math.cos(lambda), Math.sin(phi), cosPhi * Math.sin(lambda)];
}

export function equirectUvToDirection(x: number, y: number): Rgb {
  const lambda = (x - 0.5) * TWO_PI;
  const phi = (y - 0.5) * Math.PI;
  const cosPhi = Math.cos(phi);

  return [cosPhi * Math.cos(lambda), Math.sin(phi), cosPhi * Math.sin(lambda)];
}

function normalizeDirection(direction: Rgb): Rgb {
  const length = Math.hypot(direction[0], direction[1], direction[2]);

  if (length <= 0) {
    return [0, 1, 0];
  }

  return [direction[0] / length, direction[1] / length, direction[2] / length];
}

function dotDirection(firstDirection: Rgb, secondDirection: Rgb) {
  return (
    firstDirection[0] * secondDirection[0] +
    firstDirection[1] * secondDirection[1] +
    firstDirection[2] * secondDirection[2]
  );
}

function crossDirection(firstDirection: Rgb, secondDirection: Rgb): Rgb {
  return [
    firstDirection[1] * secondDirection[2] - firstDirection[2] * secondDirection[1],
    firstDirection[2] * secondDirection[0] - firstDirection[0] * secondDirection[2],
    firstDirection[0] * secondDirection[1] - firstDirection[1] * secondDirection[0],
  ];
}

function projectDirectionToSpotLocal(direction: Rgb, centerDirection: Rgb, radius: number) {
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

function warpDirection(direction: Rgb, amplitude: number, frequency: number): Rgb {
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

function angularFieldDistance(firstDirection: Rgb, secondDirection: Rgb) {
  const dot =
    firstDirection[0] * secondDirection[0] +
    firstDirection[1] * secondDirection[1] +
    firstDirection[2] * secondDirection[2];

  return 1 - clamp(dot, -1, 1);
}

function sampleFieldGradientLayer(direction: Rgb, params: SkyboxFieldGradientParams): Rgba {
  if (params.anchors.length === 0) {
    return [0, 0, 0, 0];
  }

  const fieldDirection = warpDirection(
    direction,
    clamp(params.amplitude, 0, 0.6),
    Math.max(0.0001, params.frequency)
  );
  let red = 0;
  let green = 0;
  let blue = 0;
  let weightSum = 0;

  params.anchors.forEach((anchor) => {
    const distance = angularFieldDistance(
      fieldDirection,
      equirectPointToDirection(anchor.x, anchor.y)
    );
    const weight =
      params.mode === "gaussian"
        ? Math.exp(-(distance * distance) / (2 * (0.46 / params.power) ** 2))
        : 1 / (distance + 0.0005) ** params.power;
    const color = parseHexColor(anchor.color);

    red += color[0] * weight;
    green += color[1] * weight;
    blue += color[2] * weight;
    weightSum += weight;
  });

  if (weightSum <= 0) {
    return [0, 0, 0, 0];
  }

  return [red / weightSum, green / weightSum, blue / weightSum, 1];
}

function mixRgba(first: Rgba, second: Rgba, amount: number): Rgba {
  return [
    mix(first[0], second[0], amount),
    mix(first[1], second[1], amount),
    mix(first[2], second[2], amount),
    mix(first[3], second[3], amount),
  ];
}

function sampleImagePixel(params: SkyboxImageParams, x: number, y: number): Rgba {
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

function sampleImageLayer(direction: Rgb, params: SkyboxImageParams): Rgba {
  const placement = params.placement;

  if (
    !placement ||
    !params.pixels ||
    params.width <= 0 ||
    params.height <= 0
  ) {
    return [0, 0, 0, 0];
  }

  const uv = projectDirectionToImageUv(direction, placement);

  if (!uv) {
    return [0, 0, 0, 0];
  }

  const { u, v } = uv;

  if (u < 0 || u > 1 || v < 0 || v > 1) {
    return [0, 0, 0, 0];
  }

  const imageX = u * (params.width - 1);
  const imageY = v * (params.height - 1);
  const x0 = Math.floor(imageX);
  const y0 = Math.floor(imageY);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = imageX - x0;
  const ty = imageY - y0;
  const top = mixRgba(sampleImagePixel(params, x0, y0), sampleImagePixel(params, x1, y0), tx);
  const bottom = mixRgba(sampleImagePixel(params, x0, y1), sampleImagePixel(params, x1, y1), tx);

  return mixRgba(top, bottom, ty);
}

function sampleSpotLayer(direction: Rgb, params: SkyboxSpotParams): Rgba {
  const spot = normalizeSpotParams(params);
  const sampleDirection = normalizeDirection(direction);
  const centerDirection = normalizeDirection(spot.centerDirection);
  const dot = dotDirection(sampleDirection, centerDirection);
  const angularDistance = Math.acos(clamp(dot, -1, 1));
  const radius = Math.max(spot.angularRadius, 0.0001);
  const t = angularDistance / radius;

  if (spot.colorMode === "gradient") {
    if (t > 1) {
      return [0, 0, 0, 0];
    }

    return sampleGradient(prepareStops(spot.stops), t);
  }

  const spotLocal = projectDirectionToSpotLocal(direction, centerDirection, radius);
  const spotD = spotLocal.d;
  const lightColor = parseHexColor(spot.lightColor);
  const globalIntensity = spot.brightness;
  const core = Math.pow(clamp(1 - spotD / spot.coreRadius), spot.coreSoftness);
  const glow = Math.pow(clamp(1 - spotD / spot.glowSize), 2) * spot.glowStrength;
  const glare = Math.pow(clamp(1 - spotD / spot.glareSize), 1.15) * spot.glareStrength;
  const monoLight = (core + glow + glare) * globalIntensity;
  let color = scaleRgb(lightColor, monoLight);
  color = addRgb(color, [Math.max(monoLight - 1, 0), Math.max(monoLight - 1, 0), Math.max(monoLight - 1, 0)]);

  const haloInner = Math.max(spot.haloInnerWidth, 0.0001);
  const haloOuter = Math.max(spot.haloOuterWidth, 0.0001);
  const haloDelta = spotD - spot.haloRadius;
  const haloEnvelope = Math.exp(-sq(haloDelta / (haloDelta < 0 ? haloInner : haloOuter)));
  const haloT = clamp((spotD - (spot.haloRadius - haloInner)) / (haloInner + haloOuter));
  const haloColor = colorizeLight(mixRgb([1, 1, 1], spectrum(haloT), spot.dispersion), lightColor);
  const haloLight = haloEnvelope * spot.haloStrength * globalIntensity;
  color = addRgb(color, scaleRgb(haloColor, haloLight));
  color = addRgb(color, scaleRgb([1, 1, 1], Math.max(haloLight - 1.2, 0) * 0.22));

  const axisDistance = Math.abs(spotLocal.y);
  const dogX = Math.abs(spotLocal.x);
  const dogBody =
    Math.exp(-sq((dogX - spot.haloRadius) / Math.max(spot.dogSpread, 0.0001))) *
    Math.exp(-sq(axisDistance / Math.max(spot.dogSpread * 0.72, 0.0001)));
  const dogTail =
    smoothstep(spot.haloRadius, spot.haloRadius + Math.max(spot.dogStretch, 0.0001), dogX) *
    (1 -
      smoothstep(
        spot.haloRadius + Math.max(spot.dogStretch, 0.0001),
        spot.haloRadius + Math.max(spot.dogStretch * 2.2, 0.0001),
        dogX
      )) *
    Math.exp(-sq(axisDistance / Math.max(spot.dogSpread * 0.9, 0.0001)));
  const dogT = clamp((dogX - (spot.haloRadius - spot.dogSpread * 1.4)) / Math.max(spot.dogSpread * 3.5, 0.0001));
  const dogColor = colorizeLight(mixRgb([1, 1, 1], spectrum(dogT), spot.dispersion), lightColor);
  const dogLight = (dogBody + dogTail * 0.28) * spot.dogStrength * globalIntensity;
  color = addRgb(color, scaleRgb(dogColor, dogLight));
  color = addRgb(color, scaleRgb([1, 1, 1], Math.max(dogLight - 1.1, 0) * 0.18));

  const alpha = clamp(Math.max(color[0], color[1], color[2]));

  if (alpha <= 0.00001) {
    return [0, 0, 0, 0];
  }

  return [color[0] / alpha, color[1] / alpha, color[2] / alpha, alpha];
}

function sampleLayer(direction: Rgb, layer: SkyboxManifestLayer): Rgba {
  if (layer.type === "gradient") {
    return sampleGradientLayer(direction, layer.params);
  }

  if (layer.type === "field-gradient") {
    return sampleFieldGradientLayer(direction, layer.params);
  }

  if (layer.type === "spot") {
    return sampleSpotLayer(direction, layer.params);
  }

  return sampleImageLayer(direction, layer.params);
}

export function composeNodes(direction: Rgb, nodes: SkyboxManifestNode[]): Rgb {
  return nodes
    .filter((node) => node.enabled)
    .reverse()
    .reduce<Rgb>((backdrop, node) => {
      const source =
        node.type === "group"
          ? ([...composeNodes(direction, node.children), 1] as Rgba)
          : sampleLayer(direction, node);
      const alpha = clamp(source[3] * (node.opacity / 100));

      return compositeOver(backdrop, [source[0], source[1], source[2]], alpha, node.blendMode);
    }, [0, 0, 0]);
}

function findGroup(nodes: SkyboxManifestNode[], id: string): SkyboxManifestNode | null {
  for (const node of nodes) {
    if (node.type === "group") {
      if (node.id === id) {
        return node;
      }

      const match = findGroup(node.children, id);

      if (match) {
        return match;
      }
    }
  }

  return null;
}

export function evaluateSkyboxDirection(
  manifest: SkyboxManifest,
  direction: Rgb,
  options: { targetGroupId?: string } = {}
) {
  const migratedManifest = migrateManifestToV2(manifest);
  const targetGroup = options.targetGroupId
    ? findGroup(migratedManifest.nodes, options.targetGroupId)
    : null;
  const nodes = options.targetGroupId
    ? targetGroup
      ? [targetGroup]
      : []
    : migratedManifest.nodes;

  return composeNodes(direction, nodes);
}
