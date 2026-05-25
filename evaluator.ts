import {
  clamp,
  compositeOver,
  parseHexColor,
  type Rgb,
  type Rgba,
} from "./math";
import type {
  SkyboxFieldGradientParams,
  SkyboxGradientParams,
  SkyboxGradientStop,
  SkyboxManifest,
  SkyboxManifestLayer,
  SkyboxManifestNode,
} from "./manifest";
import { migrateManifestToV2 } from "./manifest";

const TWO_PI = Math.PI * 2;

type LinearStop = {
  alpha: number;
  color: Rgb;
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
      t: clamp(stop.location / 100),
    }))
    .sort((firstStop, secondStop) => firstStop.t - secondStop.t);
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

    return [
      mix(currentStop.color[0], nextStop.color[0], localT),
      mix(currentStop.color[1], nextStop.color[1], localT),
      mix(currentStop.color[2], nextStop.color[2], localT),
      mix(currentStop.alpha, nextStop.alpha, localT),
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

function sampleLayer(direction: Rgb, layer: SkyboxManifestLayer): Rgba {
  return layer.type === "gradient"
    ? sampleGradientLayer(direction, layer.params)
    : sampleFieldGradientLayer(direction, layer.params);
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
