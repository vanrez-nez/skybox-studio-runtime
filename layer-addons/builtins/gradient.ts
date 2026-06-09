// Self-contained gradient layer adapter: CPU sampling (bake/preview), WebGPU (TSL) + WebGL (GLSL)
// shader codegen, uniform builders, binding collection, and topology key — all registered into the
// runtime layer registry. Adding/removing a layer type touches only its own builtins file.
import * as THREE from "three";
import { uniform } from "three/tsl";

import type { Rgb, Rgba } from "../../math";
import type {
  SkyboxGradientParams,
  SkyboxManifestLayer,
  SkyboxManifestNode,
} from "../../manifest";
import { colorVectorFromStop, sortedGradientStops } from "../../skybox/stops";
import type {
  BuiltInWebGpuLayerAdapter,
  GradientLayerShaderBinding,
  GradientUniformNodes,
} from "../../skybox/types";
import { prepareStops, sampleGradient } from "../cpu-sampling";
import { registerLayerRuntimeAdapter } from "../registry";
import { zeroEffectExpression, type ShaderLanguage } from "../shader-codegen";
import type { WebGpuLayerAdapter } from "../types";

// --- CPU sampling (used by the evaluator/bake path) ---

function getLinearGradientAxis(rotation: number): Rgb {
  const radians = (rotation * Math.PI) / 180;

  return [Math.sin(radians), Math.cos(radians), 0];
}

export function sampleGradientLayer(direction: Rgb, params: SkyboxGradientParams): Rgba {
  const axis = getLinearGradientAxis(params.rotation);
  const dot = direction[0] * axis[0] + direction[1] * axis[1] + direction[2] * axis[2];

  return sampleGradient(prepareStops(params.stops), dot * 0.5 + 0.5);
}

// --- Shared GPU helpers ---

function gradientAxisFromRotation(rotation: number) {
  const radians = (rotation * Math.PI) / 180;

  return new THREE.Vector3(Math.sin(radians), Math.cos(radians), 0).normalize();
}

// --- WebGPU (TSL) uniform nodes ---

function createGradientUniformNodes(bindings: GradientLayerShaderBinding[]) {
  return bindings.map((binding): GradientUniformNodes => {
    const stops = sortedGradientStops(binding.layer.params);

    return {
      axis: uniform(gradientAxisFromRotation(binding.layer.params.rotation)),
      layerId: binding.layer.id,
      stops: Array.from({ length: binding.stopCount }, (_, stopIndex) => {
        const stop = stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

        return {
          color: uniform(colorVectorFromStop(stop)),
          midpoint: uniform(stop.midpoint),
          t: uniform(stop.t),
        };
      }),
    };
  });
}

function applyGradientLayerParamsToUniformNodes(
  uniforms: GradientUniformNodes[],
  layer: Extract<SkyboxManifestLayer, { type: "gradient" }>
) {
  const gradientUniforms = uniforms.find((nextUniforms) => nextUniforms.layerId === layer.id);

  if (!gradientUniforms) {
    return;
  }

  const stops = sortedGradientStops(layer.params);

  (gradientUniforms.axis as any).value.copy(gradientAxisFromRotation(layer.params.rotation));
  gradientUniforms.stops.forEach((stopUniforms, stopIndex) => {
    const stop = stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

    (stopUniforms.color as any).value.copy(colorVectorFromStop(stop));
    (stopUniforms.midpoint as any).value = stop.midpoint;
    (stopUniforms.t as any).value = stop.t;
  });
}

// --- WebGL (GLSL) uniforms ---

function gradientShaderUniforms(bindings: GradientLayerShaderBinding[]) {
  return Object.fromEntries(
    bindings.flatMap((binding) => {
      const stops = sortedGradientStops(binding.layer.params);

      return [
        [`${binding.parameterPrefix}Axis`, { value: gradientAxisFromRotation(binding.layer.params.rotation) }],
        ...Array.from({ length: binding.stopCount }, (_, stopIndex) => {
          const stop = stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

          return [
            [`${binding.parameterPrefix}StopColor${stopIndex}`, { value: colorVectorFromStop(stop) }],
            [`${binding.parameterPrefix}StopMidpoint${stopIndex}`, { value: stop.midpoint }],
            [`${binding.parameterPrefix}StopT${stopIndex}`, { value: stop.t }],
          ];
        }).flat(),
      ];
    })
  );
}

function applyGradientLayerParamsToShaderUniforms(
  material: THREE.ShaderMaterial,
  layer: Extract<SkyboxManifestLayer, { type: "gradient" }>,
  bindings: GradientLayerShaderBinding[]
) {
  const binding = bindings.find((nextBinding) => nextBinding.layer.id === layer.id);

  if (!binding) {
    return;
  }

  const stops = sortedGradientStops(layer.params);

  material.uniforms[`${binding.parameterPrefix}Axis`]?.value.copy(
    gradientAxisFromRotation(layer.params.rotation)
  );
  Array.from({ length: binding.stopCount }, (_, stopIndex) => {
    const stop = stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

    material.uniforms[`${binding.parameterPrefix}StopColor${stopIndex}`]?.value.copy(
      colorVectorFromStop(stop)
    );

    if (material.uniforms[`${binding.parameterPrefix}StopT${stopIndex}`]) {
      material.uniforms[`${binding.parameterPrefix}StopT${stopIndex}`].value = stop.t;
    }

    if (material.uniforms[`${binding.parameterPrefix}StopMidpoint${stopIndex}`]) {
      material.uniforms[`${binding.parameterPrefix}StopMidpoint${stopIndex}`].value = stop.midpoint;
    }
  });
}

function glslGradientUniformDeclarations(bindings: GradientLayerShaderBinding[]) {
  return bindings
    .map((binding) => `uniform vec3 ${binding.parameterPrefix}Axis;
      ${Array.from({ length: binding.stopCount }, (_, stopIndex) => `uniform vec4 ${binding.parameterPrefix}StopColor${stopIndex};
      uniform float ${binding.parameterPrefix}StopMidpoint${stopIndex};
      uniform float ${binding.parameterPrefix}StopT${stopIndex};`).join("\n")}`)
    .join("\n");
}

// --- Binding collection ---

function collectGradientLayerBindings(nodes: SkyboxManifestNode[]) {
  const bindings: GradientLayerShaderBinding[] = [];

  function collect(nextNodes: SkyboxManifestNode[]) {
    nextNodes.forEach((node) => {
      if (!node.enabled) {
        return;
      }

      if (node.type === "group") {
        collect(node.children);
        return;
      }

      if (node.type === "gradient") {
        const index = bindings.length;

        bindings.push({
          index,
          layer: node,
          parameterPrefix: `gradientLayer${index}`,
          stopCount: node.params.stops.length,
        });
      }
    });
  }

  collect(nodes);

  return bindings;
}

function createGradientBindingMap(bindings: GradientLayerShaderBinding[]) {
  return new Map(bindings.map((binding) => [binding.layer.id, binding]));
}

// --- Sample expression (shared GLSL + WGSL codegen) ---

function gradientSampleExpression(binding: GradientLayerShaderBinding, language: ShaderLanguage) {
  const vec4Type = language === "wgsl" ? "vec4<f32>" : "vec4";
  const declare = language === "wgsl" ? "let" : "float";

  if (binding.stopCount === 0) {
    return `effectColor = ${vec4Type}(0.0, 0.0, 0.0, 0.0);`;
  }

  const branches = Array.from({ length: Math.max(0, binding.stopCount - 1) }, (_, index) => {
    const currentStopT = `${binding.parameterPrefix}StopT${index}`;
    const nextStopT = `${binding.parameterPrefix}StopT${index + 1}`;
    const localT = `localT${index}`;
    const segmentMidpoint = `segmentMidpoint${index}`;
    const midpointT = `midpointT${index}`;
    const midpointUniform = `${binding.parameterPrefix}StopMidpoint${index}`;
    const lowerMidpoint = `${localT} / max(${segmentMidpoint} * 2.0, 0.00001)`;
    const upperMidpoint = `0.5 + (${localT} - ${segmentMidpoint}) / max((1.0 - ${segmentMidpoint}) * 2.0, 0.00001)`;
    const midpointExpression = language === "wgsl"
      ? `select(${upperMidpoint}, ${lowerMidpoint}, ${localT} <= ${segmentMidpoint})`
      : `(${localT} <= ${segmentMidpoint} ? ${lowerMidpoint} : ${upperMidpoint})`;
    const declarationSuffix = language === "wgsl" ? ": f32" : "";
    const keyword = index === 0 ? "if" : "else if";

    return `${keyword} (gradientT <= ${nextStopT}) {
      ${declare} ${localT}${declarationSuffix} = clamp((gradientT - ${currentStopT}) / max(${nextStopT} - ${currentStopT}, 0.00001), 0.0, 1.0);
      ${declare} ${segmentMidpoint}${declarationSuffix} = clamp(${midpointUniform}, 0.01, 0.99);
      ${declare} ${midpointT}${declarationSuffix} = ${midpointExpression};
      effectColor = mix(${binding.parameterPrefix}StopColor${index}, ${binding.parameterPrefix}StopColor${index + 1}, ${midpointT});
    }`;
  });
  const lastStopIndex = binding.stopCount - 1;

  return `{
    ${language === "wgsl" ? "let" : "vec3"} gradientAxis = normalize(${binding.parameterPrefix}Axis);
    ${language === "wgsl" ? "let" : "float"} gradientT = dot(direction, gradientAxis) * 0.5 + 0.5;
    ${branches.join("\n")}
    ${branches.length > 0 ? "else" : ""} {
      effectColor = ${binding.parameterPrefix}StopColor${lastStopIndex};
    }
  }`;
}

// --- WebGPU adapter (TSL) ---

const gradientWebGpuAdapter: BuiltInWebGpuLayerAdapter<"gradient", GradientLayerShaderBinding, GradientUniformNodes> = {
  collect: collectGradientLayerBindings,
  createParameterDeclarations: (bindings) =>
    bindings
      .flatMap((binding) => [
        `,
      ${binding.parameterPrefix}Axis: vec3<f32>`,
        ...Array.from({ length: binding.stopCount }, (_, stopIndex) => [
          `,
      ${binding.parameterPrefix}StopColor${stopIndex}: vec4<f32>`,
          `,
      ${binding.parameterPrefix}StopMidpoint${stopIndex}: f32`,
          `,
      ${binding.parameterPrefix}StopT${stopIndex}: f32`,
        ]).flat(),
      ])
      .join(""),
  createSampleExpression: (layer, language, context) => {
    const binding = context.bindingsByLayerId.get(layer.id);

    return binding ? gradientSampleExpression(binding, language) : zeroEffectExpression(language);
  },
  createSampleParameters: (bindings, uniforms) =>
    Object.fromEntries(
      bindings.flatMap((binding) => {
        const gradientUniform = uniforms[binding.index];

        return [
          [`${binding.parameterPrefix}Axis`, gradientUniform.axis],
          ...Array.from({ length: binding.stopCount }, (_, stopIndex) => [
            [`${binding.parameterPrefix}StopColor${stopIndex}`, gradientUniform.stops[stopIndex].color],
            [`${binding.parameterPrefix}StopMidpoint${stopIndex}`, gradientUniform.stops[stopIndex].midpoint],
            [`${binding.parameterPrefix}StopT${stopIndex}`, gradientUniform.stops[stopIndex].t],
          ]).flat(),
        ];
      })
    ),
  createUniforms: createGradientUniformNodes,
  getTopologyKey: (layer) => ({
    mode: layer.params.mode,
    stopCount: layer.params.stops.length,
  }),
  type: "gradient",
  updateUniforms: applyGradientLayerParamsToUniformNodes,
};

registerLayerRuntimeAdapter({
  type: "gradient",
  sampleCpu: (direction, params) => sampleGradientLayer(direction, params as SkyboxGradientParams),
  updateLive: (context, layer) => context.applyLayerParams(layer),
  wgsl: gradientWebGpuAdapter as WebGpuLayerAdapter,
  getTopologyKey: (layer) => gradientWebGpuAdapter.getTopologyKey(layer as never),
  glsl: {
    collectBindings: (nodes) => collectGradientLayerBindings(nodes),
    createBindingMap: (bindings) =>
      createGradientBindingMap(bindings as GradientLayerShaderBinding[]),
    uniformDeclarations: (bindings) =>
      glslGradientUniformDeclarations(bindings as GradientLayerShaderBinding[]),
    shaderUniforms: (bindings) => gradientShaderUniforms(bindings as GradientLayerShaderBinding[]),
    applyParams: (material, layer, bindings) =>
      applyGradientLayerParamsToShaderUniforms(
        material as THREE.ShaderMaterial,
        layer as Extract<SkyboxManifestLayer, { type: "gradient" }>,
        bindings as GradientLayerShaderBinding[]
      ),
    sampleExpression: (layer, bindingMap, language) => {
      const binding = bindingMap.get(layer.id) as GradientLayerShaderBinding | undefined;

      return binding ? gradientSampleExpression(binding, language) : zeroEffectExpression(language);
    },
  },
});
