import {
  BackSide,
  BoxGeometry,
  Mesh,
  NodeMaterial,
  type Material,
} from "three/webgpu";
import {
  cameraPosition,
  Fn,
  modelViewProjection,
  normalize,
  positionWorld,
  wgslFn,
} from "three/tsl";

import type {
  SkyboxFieldGradientParams,
  SkyboxGradientParams,
  SkyboxManifestLayer,
  SkyboxManifestV1,
} from "./manifest";

const DEFAULT_MANIFEST: SkyboxManifestV1 = {
  composition: { mode: "alpha-over", order: "bottom-to-top" },
  layers: [],
  version: 1,
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function numberLiteral(value: number) {
  return Number.isFinite(value) ? value.toFixed(8) : "0.0";
}

function srgbChannelToLinear(channel: number) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function parseHexColor(color: string): [number, number, number] {
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
  ) as [number, number, number];
}

function colorLiteral(color: string) {
  const [red, green, blue] = parseHexColor(color);

  return `vec3<f32>(${numberLiteral(red)}, ${numberLiteral(green)}, ${numberLiteral(blue)})`;
}

function directionLiteralFromPoint(x: number, y: number) {
  const lambda = (clamp(x) - 0.5) * Math.PI * 2;
  const phi = (0.5 - clamp(y)) * Math.PI;
  const cosPhi = Math.cos(phi);

  return `vec3<f32>(${numberLiteral(cosPhi * Math.cos(lambda))}, ${numberLiteral(
    Math.sin(phi)
  )}, ${numberLiteral(cosPhi * Math.sin(lambda))})`;
}

function vec4Literal(color: string, alpha: number) {
  return `vec4<f32>(${colorLiteral(color)}, ${numberLiteral(clamp(alpha))})`;
}

function getRenderableLayers(manifest: SkyboxManifestV1) {
  return manifest.layers.filter((layer) => layer.enabled).reverse();
}

function gradientSampleExpression(params: SkyboxGradientParams) {
  const stops = [...params.stops]
    .map((stop) => ({
      color: stop.color,
      opacity: clamp(stop.opacity / 100),
      t: clamp(stop.location / 100),
    }))
    .sort((firstStop, secondStop) => firstStop.t - secondStop.t);

  if (stops.length === 0) {
    return "effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);";
  }

  const rotationRadians = (params.rotation * Math.PI) / 180;
  const axis = `vec3<f32>(${numberLiteral(Math.sin(rotationRadians))}, ${numberLiteral(
    Math.cos(rotationRadians)
  )}, 0.0)`;
  const branches = stops.slice(0, -1).map((currentStop, index) => {
    const nextStop = stops[index + 1];
    const span = Math.max(0.00001, nextStop.t - currentStop.t);
    const localT = `clamp((gradientT - ${numberLiteral(currentStop.t)}) / ${numberLiteral(
      span
    )}, 0.0, 1.0)`;
    const keyword = index === 0 ? "if" : "else if";

    return `${keyword} (gradientT <= ${numberLiteral(nextStop.t)}) {
      effectColor = mix(${vec4Literal(
      currentStop.color,
      currentStop.opacity
    )}, ${vec4Literal(nextStop.color, nextStop.opacity)}, ${localT});
    }`;
  });
  const lastStop = stops[stops.length - 1];

  return `{
    let gradientAxis = normalize(${axis});
    let gradientT = dot(direction, gradientAxis) * 0.5 + 0.5;
    ${branches.join("\n")}
    ${branches.length > 0 ? "else" : ""} {
      effectColor = ${vec4Literal(lastStop.color, lastStop.opacity)};
    }
  }`;
}

function fieldGradientSampleExpression(params: SkyboxFieldGradientParams) {
  if (params.anchors.length === 0) {
    return "effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);";
  }

  const warpAmplitude = clamp(params.amplitude, 0, 0.6);
  const frequency = Math.max(0.0001, params.frequency);
  const power = Math.max(0.0001, params.power);
  const sigma = 0.46 / power;
  const anchorLines = params.anchors
    .map(
      (anchor) => `{
        let anchorDirection = normalize(${directionLiteralFromPoint(anchor.x, anchor.y)});
        let anchorDistance = 1.0 - clamp(dot(fieldDirection, anchorDirection), -1.0, 1.0);
        let weight = ${
          params.mode === "gaussian"
            ? `exp(-(anchorDistance * anchorDistance) / ${numberLiteral(2 * sigma * sigma)})`
            : `1.0 / pow(anchorDistance + 0.0005, ${numberLiteral(power)})`
        };
        weightedColor += ${colorLiteral(anchor.color)} * weight;
        weightSum += weight;
      }`
    )
    .join("\n");

  return `{
    let warpAmplitude = ${numberLiteral(warpAmplitude)};
    let warpFrequency = ${numberLiteral(frequency)};
    var fieldDirection = direction;
    let warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      let warpX = sin((direction.y * warpFrequency + 0.23) * ${numberLiteral(
        Math.PI * 2
      )}) * cos((direction.z * warpFrequency + 0.41) * ${numberLiteral(
        Math.PI * 2
      )});
      let warpY = cos((direction.z * warpFrequency + 0.17) * ${numberLiteral(
        Math.PI * 2
      )}) * sin((direction.x * warpFrequency + 0.37) * ${numberLiteral(
        Math.PI * 2
      )});
      let warpZ = sin((direction.x * warpFrequency - 0.31) * ${numberLiteral(
        Math.PI * 2
      )}) * cos((direction.y * warpFrequency + 0.29) * ${numberLiteral(
        Math.PI * 2
      )});
      fieldDirection = normalize(direction + vec3<f32>(warpX, warpY, warpZ) * warpScale);
    }
    var weightedColor = vec3<f32>(0.0);
    var weightSum = 0.0;
    ${anchorLines}
    if (weightSum > 0.0) {
      effectColor = vec4<f32>(weightedColor / weightSum, 1.0);
    } else {
      effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}

function effectExpression(layer: SkyboxManifestLayer) {
  return layer.type === "gradient"
    ? gradientSampleExpression(layer.params)
    : fieldGradientSampleExpression(layer.params);
}

function blendExpression(layer: SkyboxManifestLayer) {
  switch (layer.blendMode) {
    case "darken":
      return "min(composedColor, effectColor.rgb)";
    case "multiply":
      return "composedColor * effectColor.rgb";
    case "color-burn":
      return `select(
        select(
          vec3<f32>(1.0) - min(vec3<f32>(1.0), (vec3<f32>(1.0) - composedColor) / effectColor.rgb),
          vec3<f32>(0.0),
          effectColor.rgb == vec3<f32>(0.0)
        ),
        vec3<f32>(1.0),
        composedColor == vec3<f32>(1.0)
      )`;
    case "lighten":
      return "max(composedColor, effectColor.rgb)";
    case "screen":
      return "composedColor + effectColor.rgb - composedColor * effectColor.rgb";
    case "color-dodge":
      return `select(
        select(
          min(vec3<f32>(1.0), composedColor / (vec3<f32>(1.0) - effectColor.rgb)),
          vec3<f32>(1.0),
          effectColor.rgb == vec3<f32>(1.0)
        ),
        vec3<f32>(0.0),
        composedColor == vec3<f32>(0.0)
      )`;
    case "overlay":
      return `select(
        vec3<f32>(1.0) - 2.0 * (vec3<f32>(1.0) - composedColor) * (vec3<f32>(1.0) - effectColor.rgb),
        2.0 * composedColor * effectColor.rgb,
        composedColor <= vec3<f32>(0.5)
      )`;
    case "soft-light":
      return `select(
        composedColor + (2.0 * effectColor.rgb - vec3<f32>(1.0)) * (softLightD - composedColor),
        composedColor - (vec3<f32>(1.0) - 2.0 * effectColor.rgb) * composedColor * (vec3<f32>(1.0) - composedColor),
        effectColor.rgb <= vec3<f32>(0.5)
      )`;
    case "hard-light":
      return `select(
        composedColor + (2.0 * effectColor.rgb - vec3<f32>(1.0)) - composedColor * (2.0 * effectColor.rgb - vec3<f32>(1.0)),
        2.0 * composedColor * effectColor.rgb,
        effectColor.rgb <= vec3<f32>(0.5)
      )`;
    case "difference":
      return "abs(composedColor - effectColor.rgb)";
    case "exclusion":
      return "composedColor + effectColor.rgb - 2.0 * composedColor * effectColor.rgb";
    case "normal":
    default:
      return "effectColor.rgb";
  }
}

function blendSetupExpression(layer: SkyboxManifestLayer) {
  if (layer.blendMode !== "soft-light") {
    return "";
  }

  return `let softLightD = select(
    sqrt(composedColor),
    ((16.0 * composedColor - vec3<f32>(12.0)) * composedColor + vec3<f32>(4.0)) * composedColor,
    composedColor <= vec3<f32>(0.25)
  );`;
}

function createSkyboxFunction(manifest: SkyboxManifestV1) {
  const layerBlocks = getRenderableLayers(manifest)
    .map(
      (layer) => `{
        var effectColor = vec4<f32>(0.0);
        ${effectExpression(layer)}
        let sourceAlpha = clamp(effectColor.a * ${numberLiteral(layer.opacity / 100)}, 0.0, 1.0);
        ${blendSetupExpression(layer)}
        let blendedColor = clamp(${blendExpression(
          layer
        )}, vec3<f32>(0.0), vec3<f32>(1.0));
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          vec3<f32>(0.0),
          vec3<f32>(1.0)
        );
      }`
    )
    .join("\n");

  return wgslFn(`
    fn skyboxStudioSample(direction: vec3<f32>) -> vec4<f32> {
      var composedColor = vec3<f32>(0.0);
      ${layerBlocks}
      return vec4<f32>(composedColor, 1.0);
    }
  `);
}

function createSkyboxMaterial(manifest: SkyboxManifestV1) {
  const material = new NodeMaterial();
  const skyboxSample = createSkyboxFunction(manifest);
  const vertexNode = Fn(() => {
    const position = modelViewProjection as any;

    position.z.assign(position.w);

    return position;
  })();

  material.side = BackSide;
  material.depthTest = false;
  material.depthWrite = false;
  material.vertexNode = vertexNode as any;
  material.colorNode = skyboxSample({
    direction: normalize(positionWorld.sub(cameraPosition)),
  }) as any;

  return material;
}

export class Skybox extends Mesh<BoxGeometry, NodeMaterial> {
  #manifest: SkyboxManifestV1 = DEFAULT_MANIFEST;

  constructor() {
    super(new BoxGeometry(1, 1, 1), createSkyboxMaterial(DEFAULT_MANIFEST));
    this.frustumCulled = false;
    this.renderOrder = -1;
  }

  fromManifest(manifest: SkyboxManifestV1) {
    this.#manifest = manifest;
    return this;
  }

  otherOverridingSetup() {
    return this;
  }

  load() {
    this.setManifest(this.#manifest);
    return this;
  }

  setManifest(manifest: SkyboxManifestV1) {
    this.#manifest = manifest;
    const previousMaterial = this.material;
    this.material = createSkyboxMaterial(manifest);
    previousMaterial.dispose();
    return this;
  }

  dispose() {
    this.geometry.dispose();
    (this.material as Material).dispose();
  }
}
