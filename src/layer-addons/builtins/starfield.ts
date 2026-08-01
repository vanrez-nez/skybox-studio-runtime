// Core starfield layer adapter — the WebGPU (TSL) half only: it samples a pre-baked equirect
// starfield texture per-direction. The heavy procedural CPU sampler + generation live in the
// `skybox-studio-runtime/starfield` entry (see `starfield.ts`), so the core never pulls them in.
import * as THREE from "three";
import { screenUV, texture as textureNode, wgslFn } from "three/tsl";

import type {
  SkyboxManifestLayer,
  SkyboxManifestNode,
} from "../../manifest";
import { EMPTY_IMAGE_TEXTURE } from "../../skybox/empty-texture";
import type {
  BuiltInWebGpuLayerAdapter,
  StarfieldLayerShaderBinding,
  WebGpuStarfieldLayerSampleNodes,
  WebGpuStarfieldSampleNodeData,
} from "../../skybox/types";
import { registerLayerRuntimeAdapter } from "../registry";
import { zeroEffectExpression } from "../shader-codegen";
import type { WebGpuLayerAdapter } from "../types";

// --- Binding collection ---

function collectStarfieldLayerBindings(nodes: SkyboxManifestNode[]) {
  const bindings: StarfieldLayerShaderBinding[] = [];

  function collect(nextNodes: SkyboxManifestNode[]) {
    nextNodes.forEach((node) => {
      if (!node.enabled) {
        return;
      }

      if (node.type === "group") {
        collect(node.children);
        return;
      }

      if (node.type === "starfield") {
        const index = bindings.length;

        bindings.push({
          index,
          layer: node,
          parameterName: `starfieldLayer${index}`,
        });
      }
    });
  }

  collect(nodes);

  return bindings;
}

// --- Texture binding ---

export function disposeStarfieldTexture(texture: THREE.Texture) {
  if (texture.userData.starfieldRenderTarget) {
    return;
  }

  texture.dispose();
}

function getStarfieldTexture(
  starfieldTextures: Map<string, THREE.Texture>,
  layer: Extract<SkyboxManifestLayer, { type: "starfield" }>
) {
  return starfieldTextures.get(layer.id) ?? EMPTY_IMAGE_TEXTURE;
}

export function updateStarfieldTextureNodes(
  sampleData: Map<string, WebGpuStarfieldSampleNodeData>,
  starfieldTextures: Map<string, THREE.Texture>
) {
  sampleData.forEach((sample, layerId) => {
    sample.textureNode.value = starfieldTextures.get(layerId) ?? EMPTY_IMAGE_TEXTURE;
  });
}

export function updateStarfieldScreenTextureNodes(
  sampleData: Map<string, WebGpuStarfieldSampleNodeData>,
  screenTextures: Map<string, THREE.Texture>
) {
  sampleData.forEach((sample, layerId) => {
    sample.screenTextureNode.value = screenTextures.get(layerId) ?? EMPTY_IMAGE_TEXTURE;
  });
}

// --- WGSL equirect-UV helper (starfield source) ---

const directionToSourceStarfieldUv = wgslFn(`
  fn skyboxStudioDirectionToSourceStarfieldUv(direction: vec3<f32>) -> vec2<f32> {
    let normalizedDirection = normalize(direction);
    let theta = atan2(normalizedDirection.x, normalizedDirection.z);
    let u = fract(theta / 6.283185307179586 + 0.5);
    let v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / 3.141592653589793;

    return vec2<f32>(u, v);
  }
`);

// The equirect texture carries the direction-space nebula while the cached viewport target carries
// the constant-pixel star cores. Combining them here makes both one Starfield layer sample before
// normal layer composition; Clouds above it therefore attenuate both with the same transmission.
const combineStarfieldSample = wgslFn(`
  fn skyboxStudioCombineStarfieldSample(
    backdrop: vec4<f32>,
    screenStars: vec4<f32>
  ) -> vec4<f32> {
    return vec4<f32>(backdrop.rgb + screenStars.rgb, max(backdrop.a, screenStars.a));
  }
`);

// --- WebGPU adapter (TSL) ---

const starfieldWebGpuAdapter: BuiltInWebGpuLayerAdapter<"starfield", StarfieldLayerShaderBinding, never> = {
  collect: collectStarfieldLayerBindings,
  createParameterDeclarations: (bindings) =>
    bindings
      .map((binding) => `,
      ${binding.parameterName}: vec4<f32>`)
      .join(""),
  createSampleExpression: (layer, _language, context) => {
    const binding = context.bindingsByLayerId.get(layer.id);

    return binding ? `effectColor = ${binding.parameterName};` : zeroEffectExpression();
  },
  createSampleNodes: ({ bindings, direction, imageTextures, resourceTextures }) => {
    const starfieldTextures = imageTextures;
    const sampleData = new Map<string, WebGpuStarfieldSampleNodeData>();
    const sampleNodesByParameterName = Object.fromEntries(
      bindings.map((binding) => {
        const sampleUv = (directionToSourceStarfieldUv as any)({ direction });
        const sampleTextureNode = textureNode(
          getStarfieldTexture(starfieldTextures, binding.layer),
          sampleUv
        ).setName(`starfieldTexture${binding.index}`);

        (sampleTextureNode as any).getUniformHash = () =>
          `skybox-starfield-texture:${binding.layer.id}`;

        const screenTextureNode = textureNode(
          resourceTextures.get(binding.layer.id) ?? EMPTY_IMAGE_TEXTURE,
          screenUV as any
        ).setName(`starfieldScreenTexture${binding.index}`);

        (screenTextureNode as any).getUniformHash = () =>
          `skybox-starfield-screen-texture:${binding.layer.id}`;

        const combinedSampleNode = (combineStarfieldSample as any)({
          backdrop: sampleTextureNode,
          screenStars: screenTextureNode,
        });

        sampleData.set(binding.layer.id, {
          sampleNode: combinedSampleNode,
          screenTextureNode,
          textureNode: sampleTextureNode,
        });

        return [binding.parameterName, combinedSampleNode];
      })
    );

    return {
      sampleData,
      sampleNodesByLayerId: Object.fromEntries(
        bindings.map((binding) => [
          binding.layer.id,
          sampleNodesByParameterName[binding.parameterName],
        ])
      ),
      sampleNodesByParameterName,
      textureSlots: Object.fromEntries(
        Array.from(sampleData.entries()).map(([layerId, sample]) => [
          layerId,
          sample.textureNode,
        ])
      ),
    } satisfies WebGpuStarfieldLayerSampleNodes;
  },
  createSampleParameters: (_bindings, _uniforms, samples) =>
    (samples as WebGpuStarfieldLayerSampleNodes | undefined)?.sampleNodesByParameterName ?? {},
  createUniforms: () => [],
  getTopologyKey: () => ({}),
  type: "starfield",
  updateUniforms: () => {},
};

registerLayerRuntimeAdapter({
  type: "starfield",
  updateLive: (context, layer) => {
    context.applyLayerParams(layer);
    context.scheduleResourceBake(layer.id, layer.params);
  },
  wgsl: starfieldWebGpuAdapter as WebGpuLayerAdapter,
  getTopologyKey: () => ({}),
});
