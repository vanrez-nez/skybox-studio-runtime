import * as THREE from "three";
import { uniform } from "three/tsl";

import type {
  SkyboxCloudFieldParams,
  SkyboxCloudLayerParams,
  SkyboxCloudLightParams,
  SkyboxCloudsParams,
  SkyboxManifestLayer,
  SkyboxManifestNode,
  SkyboxManifestV2,
} from "../../manifest";
import type { BuiltInWebGpuLayerAdapter } from "../../skybox/types";
import { registerLayerRuntimeAdapter } from "../registry";
import { zeroEffectExpression } from "../shader-codegen";
import type { WebGpuLayerAdapter } from "../types";
import {
  DEFAULT_CLOUD_FIELD,
  createCloudFieldTexture,
  type CloudFieldParams,
} from "./clouds/cloud-field";
import { createCustomSkyModel } from "./clouds/custom-sky-model";

export type CloudsLayerShaderBinding = {
  index: number;
  layer: Extract<SkyboxManifestLayer, { type: "clouds" }>;
  parameterPrefix: string;
};

type CustomSkyModel = ReturnType<typeof createCustomSkyModel>;

export type CloudsUniformNodes = {
  layerId: string;
  model: CustomSkyModel | null;
  motionMode: SkyboxCloudsParams["motionMode"];
  time: ReturnType<typeof uniform> | null;
};

export type CloudsSampleNodeData = {
  model: CustomSkyModel;
  sampleNode: any;
  time: ReturnType<typeof uniform>;
};

export type CloudsLayerSampleNodes = {
  sampleData: Map<string, CloudsSampleNodeData>;
  sampleNodesByLayerId: Record<string, unknown>;
  textureSlots: Record<string, unknown>;
};

function directionFromElevationAzimuth(
  elevation: number,
  azimuth: number,
): [number, number, number] {
  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);
  const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

  return [direction.x, direction.y, direction.z];
}

const DAY_SUN: SkyboxCloudLightParams = {
  direction: directionFromElevationAzimuth(18, 180),
  directionLayerId: null,
  disc: true,
  intensity: 20,
  tint: "#ffffff",
};

const DAY_MOON: SkyboxCloudLightParams = {
  direction: directionFromElevationAzimuth(-30, 0),
  directionLayerId: null,
  disc: true,
  intensity: 0.2,
  tint: "#fff2e0",
};

const DAY_LOW: SkyboxCloudLayerParams = {
  altitude: 0.015,
  coverage: 0.55,
  density: 0.7,
  enabled: true,
  featureSize: 0.05,
  morphBlend: 0.45,
  morphScale: 1.7,
  morphSpeed: -0.00012,
  phaseG: 0.7,
  speed: 0.0001,
};

const DAY_HIGH: SkyboxCloudLayerParams = {
  altitude: 0.045,
  coverage: 0.5,
  density: 0.45,
  enabled: true,
  featureSize: 0.09,
  morphBlend: 0.35,
  morphScale: 1.6,
  morphSpeed: -0.00006,
  phaseG: 0.7,
  speed: 0.00009,
};

export const DEFAULT_SKYBOX_CLOUDS_PARAMS: SkyboxCloudsParams = {
  cloudHigh: DAY_HIGH,
  cloudLow: DAY_LOW,
  debugLayers: false,
  exposure: 2,
  eyeHeight: 0.001,
  field: DEFAULT_CLOUD_FIELD,
  km: 0.001,
  kr: 0.0025,
  mieDirectionalG: -0.99,
  mistDensity: 0.04,
  mistHeight: 0.003,
  moon: DAY_MOON,
  motionMode: "static",
  samples: 5,
  sun: DAY_SUN,
  time: 0,
};

export const FULL_MOON_SKYBOX_CLOUDS_PARAMS: SkyboxCloudsParams = {
  cloudHigh: {
    altitude: 0.045,
    coverage: 0.48,
    density: 0.2,
    enabled: true,
    featureSize: 0.09,
    morphBlend: 0.3,
    morphScale: 1.6,
    morphSpeed: -0.00005,
    phaseG: 0.44,
    speed: 0.00009,
  },
  cloudLow: {
    altitude: 0.015,
    coverage: 0.66,
    density: 0.74,
    enabled: true,
    featureSize: 0.225,
    morphBlend: 0.4,
    morphScale: 2,
    morphSpeed: -0.00015,
    phaseG: 0.83,
    speed: 0.00022,
  },
  debugLayers: false,
  exposure: 1,
  eyeHeight: 0.001,
  field: DEFAULT_CLOUD_FIELD,
  km: 0.0104,
  kr: 0.0007,
  mieDirectionalG: -0.956,
  mistDensity: 0.12,
  mistHeight: 0.004,
  moon: {
    direction: directionFromElevationAzimuth(11.1, 180),
    directionLayerId: null,
    disc: false,
    intensity: 1.1,
    tint: "#bbdafb",
  },
  motionMode: "static",
  samples: 9,
  sun: {
    direction: directionFromElevationAzimuth(-12.8, 180),
    directionLayerId: null,
    disc: false,
    intensity: 0,
    tint: "#ffffff",
  },
  time: 0,
};

export function cloneSkyboxCloudsParams(
  params: SkyboxCloudsParams,
): SkyboxCloudsParams {
  return {
    ...params,
    cloudHigh: { ...params.cloudHigh },
    cloudLow: { ...params.cloudLow },
    field: { ...params.field },
    moon: { ...params.moon, direction: [...params.moon.direction] },
    sun: { ...params.sun, direction: [...params.sun.direction] },
  };
}

export function createDefaultSkyboxCloudsParams(): SkyboxCloudsParams {
  return cloneSkyboxCloudsParams(DEFAULT_SKYBOX_CLOUDS_PARAMS);
}

function cloudFieldKey(field: SkyboxCloudFieldParams): string {
  return [field.size, field.tiles, field.octaves, field.persistence, field.seed].join(":");
}

function fieldParams(field: SkyboxCloudFieldParams): CloudFieldParams {
  return {
    octaves: field.octaves,
    persistence: field.persistence,
    seed: field.seed,
    size: field.size,
    tiles: field.tiles,
  };
}

export function syncCloudFieldTextures(
  manifest: SkyboxManifestV2,
  textures: Map<string, THREE.Texture>,
): boolean {
  const activeIds = new Set<string>();
  let changed = false;

  const visit = (nodes: SkyboxManifestNode[]) => {
    nodes.forEach((node) => {
      if (node.type === "group") {
        visit(node.children);
        return;
      }

      if (node.type !== "clouds") {
        return;
      }

      activeIds.add(node.id);
      const key = cloudFieldKey(node.params.field);
      const current = textures.get(node.id);

      if (current?.userData.cloudFieldKey === key) {
        return;
      }

      // Disabled layers stay cached. Toggling visibility or switching motion
      // mode must never turn into a field bake; a stale field changed while
      // disabled is replaced only if/when the layer becomes renderable again.
      if (!node.enabled) {
        return;
      }

      const next = createCloudFieldTexture(fieldParams(node.params.field));
      next.name = `Cloud field ${node.id}`;
      next.userData.cloudFieldKey = key;
      textures.set(node.id, next);
      current?.dispose();
      changed = true;
    });
  };

  visit(manifest.nodes);

  Array.from(textures.entries()).forEach(([layerId, texture]) => {
    if (activeIds.has(layerId)) {
      return;
    }

    texture.dispose();
    textures.delete(layerId);
    changed = true;
  });

  return changed;
}

export function disposeCloudFieldTextures(textures: Map<string, THREE.Texture>) {
  textures.forEach((texture) => texture.dispose());
  textures.clear();
}

export function updateCloudFieldTextureNodes(
  samples: CloudsLayerSampleNodes | undefined,
  textures: Map<string, THREE.Texture>,
) {
  samples?.sampleData.forEach((sample, layerId) => {
    const texture = textures.get(layerId);

    if (texture) {
      sample.model.setFieldTexture(texture);
    }
  });
}

function applyLight(
  source: SkyboxCloudLightParams,
  target: CustomSkyModel["uniforms"]["sun"],
) {
  target.direction.value.set(...source.direction).normalize();
  target.intensity.value = source.intensity;
  target.tint.value.set(source.tint);
  target.showDisc.value = source.disc ? 1 : 0;
}

function applyCloudLayer(
  source: SkyboxCloudLayerParams,
  target: CustomSkyModel["uniforms"]["cloudLow"],
) {
  target.enabled.value = source.enabled ? 1 : 0;
  target.altitude.value = source.altitude;
  target.featureSize.value = source.featureSize;
  target.speed.value = source.speed;
  target.morphBlend.value = source.morphBlend;
  target.morphScale.value = source.morphScale;
  target.morphSpeed.value = source.morphSpeed;
  target.coverage.value = source.coverage;
  target.density.value = source.density;
  target.phaseG.value = source.phaseG;
}

function applyModelParams(model: CustomSkyModel, params: SkyboxCloudsParams) {
  model.uniforms.kr.value = params.kr;
  model.uniforms.km.value = params.km;
  model.uniforms.mieDirectionalG.value = params.mieDirectionalG;
  model.uniforms.samples.value = Math.round(params.samples);
  model.uniforms.eyeHeight.value = params.eyeHeight;
  model.uniforms.mistDensity.value = params.mistDensity;
  model.uniforms.mistHeight.value = params.mistHeight;
  model.uniforms.exposure.value = params.exposure;
  model.uniforms.fieldSize.value = params.field.size;
  model.uniforms.debugLayers.value = params.debugLayers ? 1 : 0;
  applyLight(params.sun, model.uniforms.sun);
  applyLight(params.moon, model.uniforms.moon);
  applyCloudLayer(params.cloudLow, model.uniforms.cloudLow);
  applyCloudLayer(params.cloudHigh, model.uniforms.cloudHigh);
}

function collectCloudsLayerBindings(nodes: SkyboxManifestNode[]) {
  const bindings: CloudsLayerShaderBinding[] = [];

  const collect = (nextNodes: SkyboxManifestNode[]) => {
    nextNodes.forEach((node) => {
      if (!node.enabled) {
        return;
      }

      if (node.type === "group") {
        collect(node.children);
      } else if (node.type === "clouds") {
        const index = bindings.length;
        bindings.push({
          index,
          layer: node,
          parameterPrefix: `cloudsLayer${index}`,
        });
      }
    });
  };

  collect(nodes);
  return bindings;
}

function createCloudsUniformNodes(bindings: CloudsLayerShaderBinding[]) {
  return bindings.map(
    (binding): CloudsUniformNodes => ({
      layerId: binding.layer.id,
      model: null,
      motionMode: binding.layer.params.motionMode,
      time: null,
    }),
  );
}

function createCloudsSampleNodes({
  bindings,
  direction,
  resourceTextures,
  uniforms,
}: Parameters<NonNullable<typeof cloudsWebGpuAdapter.createSampleNodes>>[0]): CloudsLayerSampleNodes {
  const sampleData = new Map<string, CloudsSampleNodeData>();
  const sampleNodesByLayerId: Record<string, unknown> = {};
  const textureSlots: Record<string, unknown> = {};

  bindings.forEach((binding, index) => {
    const params = binding.layer.params;
    const fieldTexture = resourceTextures.get(binding.layer.id);

    if (!fieldTexture) {
      return;
    }

    const timeNode = uniform(params.time);
    const model = createCustomSkyModel(fieldTexture, {
      direction,
      time: timeNode,
    });
    applyModelParams(model, params);
    uniforms[index].model = model;
    uniforms[index].time = timeNode;
    const data = { model, sampleNode: model.sampleNode, time: timeNode };
    sampleData.set(binding.layer.id, data);
    sampleNodesByLayerId[binding.layer.id] = model.sampleNode;
    textureSlots[binding.layer.id] = fieldTexture;
  });

  return { sampleData, sampleNodesByLayerId, textureSlots };
}

function applyCloudsLayerParamsToUniformNodes(
  uniforms: CloudsUniformNodes[],
  layer: Extract<SkyboxManifestLayer, { type: "clouds" }>,
) {
  const target = uniforms.find((candidate) => candidate.layerId === layer.id);

  if (!target?.model) {
    return;
  }

  applyModelParams(target.model, layer.params);
  target.motionMode = layer.params.motionMode;
  if (layer.params.motionMode === "static" && target.time) {
    target.time.value = layer.params.time;
  }
}

function updateCloudsTime(uniforms: CloudsUniformNodes[], time: number) {
  uniforms.forEach((target) => {
    if (target.time && target.motionMode === "dynamic") {
      target.time.value = time;
    }
  });
}

function cloudsSampleExpression(binding: CloudsLayerShaderBinding) {
  const prefix = binding.parameterPrefix;

  return `{
    let cloudsRadiance = ${prefix}Radiance;
    let cloudsTransmission = ${prefix}Transmission;
    let cloudsPhysical = vec3<f32>(1.0) - exp(
      -${prefix}Exposure * (cloudsRadiance + composedColor * cloudsTransmission)
    );
    let cloudsMapped = mix(cloudsPhysical, ${prefix}DebugColor, ${prefix}DebugLayers);
    // The source model deliberately writes its HDR curve straight to a
    // Linear-sRGB canvas. Skybox Studio writes through an sRGB output
    // transform, so decode that exact display value here to avoid applying
    // an extra gamma curve in the host renderer.
    let cloudsMappedClamped = clamp(cloudsMapped, vec3<f32>(0.0), vec3<f32>(1.0));
    let cloudsSceneLinear = select(
      pow(
        (cloudsMappedClamped + vec3<f32>(0.055)) / vec3<f32>(1.055),
        vec3<f32>(2.4)
      ),
      cloudsMappedClamped / vec3<f32>(12.92),
      cloudsMappedClamped <= vec3<f32>(0.04045)
    );
    effectColor = vec4<f32>(cloudsSceneLinear, 1.0);
  }`;
}

const cloudsWebGpuAdapter: BuiltInWebGpuLayerAdapter<
  "clouds",
  CloudsLayerShaderBinding,
  CloudsUniformNodes
> = {
  collect: collectCloudsLayerBindings,
  createCoverageExpression: (layer, _language, context) => {
    const binding = context.bindingsByLayerId.get(layer.id);
    return binding
      ? `transmissionAbove = transmissionAbove * mix(
          vec3<f32>(1.0),
          ${binding.parameterPrefix}Transmission,
          vec3<f32>(${(layer.opacity / 100).toFixed(8)})
        );`
      : "";
  },
  createParameterDeclarations: (bindings) =>
    bindings
      .flatMap((binding) => [
        `,\n      ${binding.parameterPrefix}DebugColor: vec3<f32>`,
        `,\n      ${binding.parameterPrefix}DebugLayers: f32`,
        `,\n      ${binding.parameterPrefix}Exposure: f32`,
        `,\n      ${binding.parameterPrefix}Radiance: vec3<f32>`,
        `,\n      ${binding.parameterPrefix}Transmission: vec3<f32>`,
      ])
      .join(""),
  createSampleExpression: (layer, _language, context) => {
    const binding = context.bindingsByLayerId.get(layer.id);
    return binding ? cloudsSampleExpression(binding) : zeroEffectExpression();
  },
  createSampleNodes: createCloudsSampleNodes as never,
  createSampleParameters: (bindings, uniforms, samples) => {
    const cloudSamples = samples as CloudsLayerSampleNodes | undefined;

    return Object.fromEntries(
      bindings.flatMap((binding) => {
        const model = uniforms[binding.index].model;
        const sample = cloudSamples?.sampleData.get(binding.layer.id)?.sampleNode as any;

        if (!model || !sample) {
          return [];
        }

        return [
          [`${binding.parameterPrefix}DebugColor`, sample.get("debugColor")],
          [`${binding.parameterPrefix}DebugLayers`, model.uniforms.debugLayers],
          [`${binding.parameterPrefix}Exposure`, model.uniforms.exposure],
          [`${binding.parameterPrefix}Radiance`, sample.get("radiance")],
          [`${binding.parameterPrefix}Transmission`, sample.get("transmission")],
        ];
      }),
    );
  },
  createUniforms: createCloudsUniformNodes,
  getTopologyKey: () => ({}),
  type: "clouds",
  updateTime: updateCloudsTime,
  updateUniforms: applyCloudsLayerParamsToUniformNodes,
};

registerLayerRuntimeAdapter({
  type: "clouds",
  updateLive: (context, layer) => context.applyLayerParams(layer),
  wgsl: cloudsWebGpuAdapter as WebGpuLayerAdapter,
  getTopologyKey: (layer) => cloudsWebGpuAdapter.getTopologyKey(layer as never),
});
