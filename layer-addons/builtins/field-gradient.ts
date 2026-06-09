// Self-contained field-gradient layer adapter: CPU + WebGPU (TSL) + WebGL (GLSL).
import * as THREE from "three";
import { uniform } from "three/tsl";

import { clamp, parseHexColor, type Rgb, type Rgba } from "../../math";
import type {
  SkyboxFieldGradientParams,
  SkyboxManifestLayer,
  SkyboxManifestNode,
} from "../../manifest";
import { colorVectorFromHex } from "../../skybox/colors";
import type {
  BuiltInWebGpuLayerAdapter,
  FieldGradientLayerShaderBinding,
  FieldGradientUniformNodes,
} from "../../skybox/types";
import { angularFieldDistance, equirectPointToDirection, warpDirection } from "../cpu-sampling";
import { registerLayerRuntimeAdapter } from "../registry";
import {
  mutableDeclaration,
  numberLiteral,
  zeroEffectExpression,
  type ShaderLanguage,
} from "../shader-codegen";
import type { WebGpuLayerAdapter } from "../types";

// --- CPU sampling ---

export function sampleFieldGradientLayer(
  direction: Rgb,
  params: SkyboxFieldGradientParams
): Rgba {
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

// --- Shared GPU helpers ---

function fieldGradientModeValue(mode: SkyboxFieldGradientParams["mode"]) {
  return mode === "gaussian" ? 1 : 0;
}

function directionVectorFromPoint(x: number, y: number) {
  const lambda = (clamp(x) - 0.5) * Math.PI * 2;
  const phi = (0.5 - clamp(y)) * Math.PI;
  const cosPhi = Math.cos(phi);

  return new THREE.Vector3(
    cosPhi * Math.cos(lambda),
    Math.sin(phi),
    cosPhi * Math.sin(lambda)
  ).normalize();
}

// --- WebGPU (TSL) uniform nodes ---

function createFieldGradientUniformNodes(bindings: FieldGradientLayerShaderBinding[]) {
  return bindings.map((binding): FieldGradientUniformNodes => ({
    amplitude: uniform(clamp(binding.layer.params.amplitude, 0, 0.6)),
    anchors: Array.from({ length: binding.anchorCount }, (_, anchorIndex) => {
      const anchor = binding.layer.params.anchors[anchorIndex] ?? {
        color: "#000000",
        x: 0.5,
        y: 0.5,
      };

      return {
        color: uniform(colorVectorFromHex(anchor.color)),
        direction: uniform(directionVectorFromPoint(anchor.x, anchor.y)),
      };
    }),
    frequency: uniform(Math.max(0.0001, binding.layer.params.frequency)),
    layerId: binding.layer.id,
    mode: uniform(fieldGradientModeValue(binding.layer.params.mode)),
    power: uniform(Math.max(0.0001, binding.layer.params.power)),
  }));
}

function applyFieldGradientLayerParamsToUniformNodes(
  uniforms: FieldGradientUniformNodes[],
  layer: Extract<SkyboxManifestLayer, { type: "field-gradient" }>
) {
  const fieldUniforms = uniforms.find((nextUniforms) => nextUniforms.layerId === layer.id);

  if (!fieldUniforms) {
    return;
  }

  (fieldUniforms.amplitude as any).value = clamp(layer.params.amplitude, 0, 0.6);
  (fieldUniforms.frequency as any).value = Math.max(0.0001, layer.params.frequency);
  (fieldUniforms.mode as any).value = fieldGradientModeValue(layer.params.mode);
  (fieldUniforms.power as any).value = Math.max(0.0001, layer.params.power);
  fieldUniforms.anchors.forEach((anchorUniforms, anchorIndex) => {
    const anchor = layer.params.anchors[anchorIndex] ?? {
      color: "#000000",
      x: 0.5,
      y: 0.5,
    };

    (anchorUniforms.color as any).value.copy(colorVectorFromHex(anchor.color));
    (anchorUniforms.direction as any).value.copy(directionVectorFromPoint(anchor.x, anchor.y));
  });
}

// --- WebGL (GLSL) uniforms ---

function fieldGradientShaderUniforms(bindings: FieldGradientLayerShaderBinding[]) {
  return Object.fromEntries(
    bindings.flatMap((binding) => [
      [`${binding.parameterPrefix}Amplitude`, { value: clamp(binding.layer.params.amplitude, 0, 0.6) }],
      [`${binding.parameterPrefix}Frequency`, { value: Math.max(0.0001, binding.layer.params.frequency) }],
      [`${binding.parameterPrefix}Mode`, { value: fieldGradientModeValue(binding.layer.params.mode) }],
      [`${binding.parameterPrefix}Power`, { value: Math.max(0.0001, binding.layer.params.power) }],
      ...Array.from({ length: binding.anchorCount }, (_, anchorIndex) => {
        const anchor = binding.layer.params.anchors[anchorIndex] ?? {
          color: "#000000",
          x: 0.5,
          y: 0.5,
        };

        return [
          [`${binding.parameterPrefix}AnchorDirection${anchorIndex}`, { value: directionVectorFromPoint(anchor.x, anchor.y) }],
          [`${binding.parameterPrefix}AnchorColor${anchorIndex}`, { value: colorVectorFromHex(anchor.color) }],
        ];
      }).flat(),
    ])
  );
}

function applyFieldGradientLayerParamsToShaderUniforms(
  material: THREE.ShaderMaterial,
  layer: Extract<SkyboxManifestLayer, { type: "field-gradient" }>,
  bindings: FieldGradientLayerShaderBinding[]
) {
  const binding = bindings.find((nextBinding) => nextBinding.layer.id === layer.id);

  if (!binding) {
    return;
  }

  if (material.uniforms[`${binding.parameterPrefix}Amplitude`]) {
    material.uniforms[`${binding.parameterPrefix}Amplitude`].value = clamp(layer.params.amplitude, 0, 0.6);
  }

  if (material.uniforms[`${binding.parameterPrefix}Frequency`]) {
    material.uniforms[`${binding.parameterPrefix}Frequency`].value = Math.max(0.0001, layer.params.frequency);
  }

  if (material.uniforms[`${binding.parameterPrefix}Mode`]) {
    material.uniforms[`${binding.parameterPrefix}Mode`].value = fieldGradientModeValue(layer.params.mode);
  }

  if (material.uniforms[`${binding.parameterPrefix}Power`]) {
    material.uniforms[`${binding.parameterPrefix}Power`].value = Math.max(0.0001, layer.params.power);
  }

  Array.from({ length: binding.anchorCount }, (_, anchorIndex) => {
    const anchor = layer.params.anchors[anchorIndex] ?? {
      color: "#000000",
      x: 0.5,
      y: 0.5,
    };

    material.uniforms[`${binding.parameterPrefix}AnchorDirection${anchorIndex}`]?.value.copy(
      directionVectorFromPoint(anchor.x, anchor.y)
    );
    material.uniforms[`${binding.parameterPrefix}AnchorColor${anchorIndex}`]?.value.copy(
      colorVectorFromHex(anchor.color)
    );
  });
}

function glslFieldGradientUniformDeclarations(bindings: FieldGradientLayerShaderBinding[]) {
  return bindings
    .map((binding) => `uniform float ${binding.parameterPrefix}Amplitude;
      uniform float ${binding.parameterPrefix}Frequency;
      uniform float ${binding.parameterPrefix}Mode;
      uniform float ${binding.parameterPrefix}Power;
      ${Array.from({ length: binding.anchorCount }, (_, anchorIndex) => `uniform vec3 ${binding.parameterPrefix}AnchorDirection${anchorIndex};
      uniform vec3 ${binding.parameterPrefix}AnchorColor${anchorIndex};`).join("\n")}`)
    .join("\n");
}

// --- Binding collection ---

function collectFieldGradientLayerBindings(nodes: SkyboxManifestNode[]) {
  const bindings: FieldGradientLayerShaderBinding[] = [];

  function collect(nextNodes: SkyboxManifestNode[]) {
    nextNodes.forEach((node) => {
      if (!node.enabled) {
        return;
      }

      if (node.type === "group") {
        collect(node.children);
        return;
      }

      if (node.type === "field-gradient") {
        const index = bindings.length;

        bindings.push({
          anchorCount: node.params.anchors.length,
          index,
          layer: node,
          parameterPrefix: `fieldGradientLayer${index}`,
        });
      }
    });
  }

  collect(nodes);

  return bindings;
}

function createFieldGradientBindingMap(bindings: FieldGradientLayerShaderBinding[]) {
  return new Map(bindings.map((binding) => [binding.layer.id, binding]));
}

// --- Sample expression (shared GLSL + WGSL codegen) ---

function fieldGradientSampleExpression(binding: FieldGradientLayerShaderBinding, language: ShaderLanguage) {
  const vec4Type = language === "wgsl" ? "vec4<f32>" : "vec4";
  const vec3Type = language === "wgsl" ? "vec3<f32>" : "vec3";
  const declare = language === "wgsl" ? "let" : "float";

  if (binding.anchorCount === 0) {
    return `effectColor = ${vec4Type}(0.0, 0.0, 0.0, 0.0);`;
  }

  const anchorLines = Array.from({ length: binding.anchorCount }, (_, anchorIndex) => `{
        ${declare} anchorDirection = normalize(${binding.parameterPrefix}AnchorDirection${anchorIndex});
        ${declare} anchorDistance = 1.0 - clamp(dot(fieldDirection, anchorDirection), -1.0, 1.0);
        ${declare} fieldSigma = 0.46 / max(${binding.parameterPrefix}Power, 0.0001);
        ${declare} inverseDistanceWeight = 1.0 / pow(anchorDistance + 0.0005, max(${binding.parameterPrefix}Power, 0.0001));
        ${declare} gaussianWeight = exp(-(anchorDistance * anchorDistance) / max(2.0 * fieldSigma * fieldSigma, 0.000001));
        ${declare} weight = ${
          language === "wgsl"
            ? `select(inverseDistanceWeight, gaussianWeight, ${binding.parameterPrefix}Mode > 0.5)`
            : `(${binding.parameterPrefix}Mode > 0.5 ? gaussianWeight : inverseDistanceWeight)`
        };
        weightedColor += ${binding.parameterPrefix}AnchorColor${anchorIndex} * weight;
        weightSum += weight;
      }`
  ).join("\n");

  return `{
    ${declare} warpAmplitude = clamp(${binding.parameterPrefix}Amplitude, 0.0, 0.6);
    ${declare} warpFrequency = max(${binding.parameterPrefix}Frequency, 0.0001);
    ${mutableDeclaration("fieldDirection", vec3Type, "direction", language)}
    ${declare} warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      ${declare} warpX = sin((direction.y * warpFrequency + 0.23) * ${numberLiteral(
        Math.PI * 2
      )}) * cos((direction.z * warpFrequency + 0.41) * ${numberLiteral(Math.PI * 2)});
      ${declare} warpY = cos((direction.z * warpFrequency + 0.17) * ${numberLiteral(
        Math.PI * 2
      )}) * sin((direction.x * warpFrequency + 0.37) * ${numberLiteral(Math.PI * 2)});
      ${declare} warpZ = sin((direction.x * warpFrequency - 0.31) * ${numberLiteral(
        Math.PI * 2
      )}) * cos((direction.y * warpFrequency + 0.29) * ${numberLiteral(Math.PI * 2)});
      fieldDirection = normalize(direction + ${vec3Type}(warpX, warpY, warpZ) * warpScale);
    }
    ${mutableDeclaration("weightedColor", vec3Type, `${vec3Type}(0.0)`, language)}
    ${mutableDeclaration("weightSum", language === "wgsl" ? "f32" : "float", "0.0", language)}
    ${anchorLines}
    if (weightSum > 0.0) {
      effectColor = ${vec4Type}(weightedColor / weightSum, 1.0);
    } else {
      effectColor = ${vec4Type}(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}

// --- WebGPU adapter (TSL) ---

const fieldGradientWebGpuAdapter: BuiltInWebGpuLayerAdapter<
  "field-gradient",
  FieldGradientLayerShaderBinding,
  FieldGradientUniformNodes
> = {
  collect: collectFieldGradientLayerBindings,
  createParameterDeclarations: (bindings) =>
    bindings
      .flatMap((binding) => [
        `,
      ${binding.parameterPrefix}Amplitude: f32`,
        `,
      ${binding.parameterPrefix}Frequency: f32`,
        `,
      ${binding.parameterPrefix}Mode: f32`,
        `,
      ${binding.parameterPrefix}Power: f32`,
        ...Array.from({ length: binding.anchorCount }, (_, anchorIndex) => [
          `,
      ${binding.parameterPrefix}AnchorDirection${anchorIndex}: vec3<f32>`,
          `,
      ${binding.parameterPrefix}AnchorColor${anchorIndex}: vec3<f32>`,
        ]).flat(),
      ])
      .join(""),
  createSampleExpression: (layer, language, context) => {
    const binding = context.bindingsByLayerId.get(layer.id);

    return binding ? fieldGradientSampleExpression(binding, language) : zeroEffectExpression(language);
  },
  createSampleParameters: (bindings, uniforms) =>
    Object.fromEntries(
      bindings.flatMap((binding) => {
        const fieldGradientUniform = uniforms[binding.index];

        return [
          [`${binding.parameterPrefix}Amplitude`, fieldGradientUniform.amplitude],
          [`${binding.parameterPrefix}Frequency`, fieldGradientUniform.frequency],
          [`${binding.parameterPrefix}Mode`, fieldGradientUniform.mode],
          [`${binding.parameterPrefix}Power`, fieldGradientUniform.power],
          ...Array.from({ length: binding.anchorCount }, (_, anchorIndex) => [
            [`${binding.parameterPrefix}AnchorDirection${anchorIndex}`, fieldGradientUniform.anchors[anchorIndex].direction],
            [`${binding.parameterPrefix}AnchorColor${anchorIndex}`, fieldGradientUniform.anchors[anchorIndex].color],
          ]).flat(),
        ];
      })
    ),
  createUniforms: createFieldGradientUniformNodes,
  getTopologyKey: (layer) => ({
    anchorCount: layer.params.anchors.length,
  }),
  type: "field-gradient",
  updateUniforms: applyFieldGradientLayerParamsToUniformNodes,
};

registerLayerRuntimeAdapter({
  type: "field-gradient",
  sampleCpu: (direction, params) =>
    sampleFieldGradientLayer(direction, params as SkyboxFieldGradientParams),
  updateLive: (context, layer) => context.applyLayerParams(layer),
  wgsl: fieldGradientWebGpuAdapter as WebGpuLayerAdapter,
  getTopologyKey: (layer) => fieldGradientWebGpuAdapter.getTopologyKey(layer as never),
  glsl: {
    collectBindings: (nodes) => collectFieldGradientLayerBindings(nodes),
    createBindingMap: (bindings) =>
      createFieldGradientBindingMap(bindings as FieldGradientLayerShaderBinding[]),
    uniformDeclarations: (bindings) =>
      glslFieldGradientUniformDeclarations(bindings as FieldGradientLayerShaderBinding[]),
    shaderUniforms: (bindings) =>
      fieldGradientShaderUniforms(bindings as FieldGradientLayerShaderBinding[]),
    applyParams: (material, layer, bindings) =>
      applyFieldGradientLayerParamsToShaderUniforms(
        material as THREE.ShaderMaterial,
        layer as Extract<SkyboxManifestLayer, { type: "field-gradient" }>,
        bindings as FieldGradientLayerShaderBinding[]
      ),
    sampleExpression: (layer, bindingMap, language) => {
      const binding = bindingMap.get(layer.id) as FieldGradientLayerShaderBinding | undefined;

      return binding
        ? fieldGradientSampleExpression(binding, language)
        : zeroEffectExpression(language);
    },
  },
});
