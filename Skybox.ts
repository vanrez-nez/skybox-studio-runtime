import {
  BackSide,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  type Material,
} from "three/webgpu";

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

const SKYBOX_RADIUS = 1000;

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

  return `vec3(${numberLiteral(red)}, ${numberLiteral(green)}, ${numberLiteral(blue)})`;
}

function vec4Literal(color: string, alpha: number) {
  return `vec4(${colorLiteral(color)}, ${numberLiteral(clamp(alpha))})`;
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
    return "vec4(0.0, 0.0, 0.0, 0.0)";
  }

  const rotationRadians = (params.rotation * Math.PI) / 180;
  const axis = `vec3(${numberLiteral(Math.sin(rotationRadians))}, ${numberLiteral(
    Math.cos(rotationRadians)
  )}, 0.0)`;
  let expression = vec4Literal(stops[stops.length - 1].color, stops[stops.length - 1].opacity);

  for (let index = stops.length - 2; index >= 0; index -= 1) {
    const currentStop = stops[index];
    const nextStop = stops[index + 1];
    const span = Math.max(0.00001, nextStop.t - currentStop.t);
    const localT = `clamp((gradientT - ${numberLiteral(currentStop.t)}) / ${numberLiteral(
      span
    )}, 0.0, 1.0)`;

    expression = `gradientT <= ${numberLiteral(nextStop.t)} ? mix(${vec4Literal(
      currentStop.color,
      currentStop.opacity
    )}, ${vec4Literal(nextStop.color, nextStop.opacity)}, ${localT}) : (${expression})`;
  }

  return `{
    vec3 gradientAxis = normalize(${axis});
    float gradientT = dot(direction, gradientAxis) * 0.5 + 0.5;
    effectColor = ${expression};
  }`;
}

function fieldGradientSampleExpression(params: SkyboxFieldGradientParams) {
  if (params.anchors.length === 0) {
    return "effectColor = vec4(0.0, 0.0, 0.0, 0.0);";
  }

  const warpAmplitude = clamp(params.amplitude, 0, 0.6);
  const frequency = Math.max(0.0001, params.frequency);
  const power = Math.max(0.0001, params.power);
  const sigma = 0.46 / power;
  const anchorLines = params.anchors
    .map(
      (anchor) => `{
        vec2 anchorPoint = vec2(${numberLiteral(clamp(anchor.x))}, ${numberLiteral(
          clamp(anchor.y)
        )});
        float anchorDistance = length(fieldPoint - anchorPoint);
        float weight = ${
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
    float lambda = atan(direction.z, direction.x);
    float phi = asin(clamp(direction.y, -1.0, 1.0));
    vec2 fieldPoint = vec2(lambda / ${numberLiteral(Math.PI * 2)} + 0.5, phi / ${numberLiteral(
      Math.PI
    )} + 0.5);
    float warpScale = ${numberLiteral(warpAmplitude * 0.16)};
    if (warpScale > 0.0) {
      float warpX = sin((fieldPoint.y * ${numberLiteral(frequency)} + 0.23) * ${numberLiteral(
        Math.PI * 2
      )}) * cos((fieldPoint.x * ${numberLiteral(frequency)} + 0.41) * ${numberLiteral(
        Math.PI * 2
      )});
      float warpY = cos((fieldPoint.x * ${numberLiteral(frequency)} + 0.17) * ${numberLiteral(
        Math.PI * 2
      )}) * sin((fieldPoint.y * ${numberLiteral(frequency)} + 0.37) * ${numberLiteral(
        Math.PI * 2
      )});
      fieldPoint = clamp(fieldPoint + vec2(warpX, warpY) * warpScale, 0.0, 1.0);
    }
    vec3 weightedColor = vec3(0.0);
    float weightSum = 0.0;
    ${anchorLines}
    effectColor = vec4(weightSum > 0.0 ? weightedColor / weightSum : vec3(0.0), 1.0);
  }`;
}

function effectExpression(layer: SkyboxManifestLayer) {
  return layer.type === "gradient"
    ? gradientSampleExpression(layer.params)
    : fieldGradientSampleExpression(layer.params);
}

function createFragmentShader(manifest: SkyboxManifestV1) {
  const layerBlocks = getRenderableLayers(manifest)
    .map(
      (layer) => `{
        vec4 effectColor = vec4(0.0);
        ${effectExpression(layer)}
        float sourceAlpha = clamp(effectColor.a * ${numberLiteral(layer.opacity / 100)}, 0.0, 1.0);
        composedColor = effectColor.rgb * sourceAlpha + composedColor * (1.0 - sourceAlpha);
      }`
    )
    .join("\n");

  return `
    varying vec3 vWorldDirection;

    void main() {
      vec3 direction = normalize(vWorldDirection);
      vec3 composedColor = vec3(0.0);
      ${layerBlocks}
      gl_FragColor = vec4(composedColor, 1.0);
    }
  `;
}

function createVertexShader() {
  return `
    varying vec3 vWorldDirection;

    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldDirection = normalize(worldPosition.xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
}

function createSkyboxMaterial(manifest: SkyboxManifestV1) {
  return new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: createFragmentShader(manifest),
    side: BackSide,
    vertexShader: createVertexShader(),
  });
}

export class Skybox extends Mesh<SphereGeometry, ShaderMaterial> {
  #manifest: SkyboxManifestV1 = DEFAULT_MANIFEST;

  constructor() {
    super(new SphereGeometry(SKYBOX_RADIUS, 64, 32), createSkyboxMaterial(DEFAULT_MANIFEST));
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

