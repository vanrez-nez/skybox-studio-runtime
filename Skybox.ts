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
    Number.parseInt(normalizedColor.slice(offset, offset + 2), 16) / 255
  ) as [number, number, number];
}

function colorLiteral(color: string) {
  const [red, green, blue] = parseHexColor(color);

  return `vec3<f32>(${numberLiteral(red)}, ${numberLiteral(green)}, ${numberLiteral(blue)})`;
}

function directionLiteralFromPoint(x: number, y: number) {
  const lambda = (clamp(x) - 0.5) * Math.PI * 2;
  const phi = (clamp(y) - 0.5) * Math.PI;
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
    let lambda = atan2(direction.z, direction.x);
    let phi = asin(clamp(direction.y, -1.0, 1.0));
    var fieldPoint = vec2<f32>(lambda / ${numberLiteral(Math.PI * 2)} + 0.5, phi / ${numberLiteral(
      Math.PI
    )} + 0.5);
    let warpScale = ${numberLiteral(warpAmplitude * 0.16)};
    if (warpScale > 0.0) {
      let warpX = sin((fieldPoint.y * ${numberLiteral(frequency)} + 0.23) * ${numberLiteral(
        Math.PI * 2
      )}) * cos((fieldPoint.x * ${numberLiteral(frequency)} + 0.41) * ${numberLiteral(
        Math.PI * 2
      )});
      let warpY = cos((fieldPoint.x * ${numberLiteral(frequency)} + 0.17) * ${numberLiteral(
        Math.PI * 2
      )}) * sin((fieldPoint.y * ${numberLiteral(frequency)} + 0.37) * ${numberLiteral(
        Math.PI * 2
      )});
      let warpedPoint = fieldPoint + vec2<f32>(warpX, warpY) * warpScale;
      fieldPoint = vec2<f32>(fract(warpedPoint.x), clamp(warpedPoint.y, 0.0, 1.0));
    }
    let fieldLambda = (fieldPoint.x - 0.5) * ${numberLiteral(Math.PI * 2)};
    let fieldPhi = (fieldPoint.y - 0.5) * ${numberLiteral(Math.PI)};
    let fieldCosPhi = cos(fieldPhi);
    let fieldDirection = normalize(vec3<f32>(
      fieldCosPhi * cos(fieldLambda),
      sin(fieldPhi),
      fieldCosPhi * sin(fieldLambda)
    ));
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

function createSkyboxFunction(manifest: SkyboxManifestV1) {
  const layerBlocks = getRenderableLayers(manifest)
    .map(
      (layer) => `{
        var effectColor = vec4<f32>(0.0);
        ${effectExpression(layer)}
        let sourceAlpha = clamp(effectColor.a * ${numberLiteral(layer.opacity / 100)}, 0.0, 1.0);
        composedColor = effectColor.rgb * sourceAlpha + composedColor * (1.0 - sourceAlpha);
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
