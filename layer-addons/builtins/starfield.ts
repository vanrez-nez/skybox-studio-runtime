// Self-contained starfield layer adapter: CPU sampling (baked or procedural) + WebGPU (TSL) +
// WebGL (GLSL). The starfield is rendered as an equirect texture baked elsewhere
// (starfield-static / starfield-gpu-bake); this adapter samples that texture per-direction.
import * as THREE from "three";
import { texture as textureNode, wgslFn } from "three/tsl";

import { clamp, type Rgb, type Rgba } from "../../math";
import type {
  SkyboxManifestLayer,
  SkyboxManifestNode,
  SkyboxStarfieldParams,
} from "../../manifest";
import { sampleStarfieldLayer, sourceUvFromDirection, type StarfieldBakeData } from "../../starfield-static";
import { EMPTY_IMAGE_TEXTURE } from "../../skybox/empty-texture";
import type {
  BuiltInWebGpuLayerAdapter,
  StarfieldLayerShaderBinding,
  WebGpuStarfieldLayerSampleNodes,
  WebGpuStarfieldSampleNodeData,
} from "../../skybox/types";
import { mixRgba, sampleStarfieldBakedPixel } from "../cpu-sampling";
import { registerLayerRuntimeAdapter } from "../registry";
import { zeroEffectExpression, type ShaderLanguage } from "../shader-codegen";
import type { WebGpuLayerAdapter } from "../types";

// --- CPU sampling ---

export function sampleStarfield(
  layerId: string,
  direction: Rgb,
  params: SkyboxStarfieldParams,
  options: { sampleHeight?: number; starfieldBakes?: Map<string, StarfieldBakeData> } = {}
): Rgba {
  const bakedImage = options.starfieldBakes?.get(layerId);

  if (bakedImage) {
    const uv = sourceUvFromDirection(direction);
    const imageX = (((uv.u % 1) + 1) % 1) * bakedImage.width - 0.5;
    const imageY = clamp(uv.v, 0, 1) * bakedImage.height - 0.5;
    const x0 = Math.floor(imageX);
    const y0 = Math.floor(imageY);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const tx = imageX - x0;
    const ty = imageY - y0;
    const top = mixRgba(
      sampleStarfieldBakedPixel(bakedImage, x0, y0),
      sampleStarfieldBakedPixel(bakedImage, x1, y0),
      tx
    );
    const bottom = mixRgba(
      sampleStarfieldBakedPixel(bakedImage, x0, y1),
      sampleStarfieldBakedPixel(bakedImage, x1, y1),
      tx
    );

    return mixRgba(top, bottom, ty);
  }

  return sampleStarfieldLayer(direction, params, { sampleHeight: options.sampleHeight });
}

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

function createStarfieldBindingMap(bindings: StarfieldLayerShaderBinding[]) {
  return new Map(bindings.map((binding) => [binding.layer.id, binding]));
}

// --- Sample expression (GLSL; WGSL samples via the texture node) ---

function starfieldSampleExpression(
  layer: Extract<SkyboxManifestLayer, { type: "starfield" }>,
  starfieldBindings: Map<string, StarfieldLayerShaderBinding>,
  language: ShaderLanguage
) {
  const binding = starfieldBindings.get(layer.id);
  const vec4Type = language === "wgsl" ? "vec4<f32>" : "vec4";

  if (!binding) {
    return `effectColor = ${vec4Type}(0.0, 0.0, 0.0, 0.0);`;
  }

  if (language === "wgsl") {
    return `effectColor = ${binding.parameterName};`;
  }

  return `effectColor = texture2D(starfieldTexture${binding.index}, directionToSourceStarfieldUv(direction));`;
}

function glslStarfieldUniformDeclarations(bindings: StarfieldLayerShaderBinding[]) {
  return bindings
    .map((binding) => `uniform sampler2D starfieldTexture${binding.index};`)
    .join("\n");
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

function starfieldTextureUniforms(
  bindings: StarfieldLayerShaderBinding[],
  starfieldTextures: Map<string, THREE.Texture>
) {
  return Object.fromEntries(
    bindings.map((binding) => [
      `starfieldTexture${binding.index}`,
      { value: getStarfieldTexture(starfieldTextures, binding.layer) },
    ])
  );
}

export function updateStarfieldTextureUniforms(
  material: THREE.ShaderMaterial,
  bindings: StarfieldLayerShaderBinding[],
  starfieldTextures: Map<string, THREE.Texture>
) {
  bindings.forEach((binding) => {
    const uniformName = `starfieldTexture${binding.index}`;

    if (material.uniforms[uniformName]) {
      material.uniforms[uniformName].value = getStarfieldTexture(starfieldTextures, binding.layer);
    }
  });
}

export function updateStarfieldTextureNodes(
  sampleData: Map<string, WebGpuStarfieldSampleNodeData>,
  starfieldTextures: Map<string, THREE.Texture>
) {
  sampleData.forEach((sample, layerId) => {
    sample.textureNode.value = starfieldTextures.get(layerId) ?? EMPTY_IMAGE_TEXTURE;
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

// --- WebGPU adapter (TSL) ---

const starfieldWebGpuAdapter: BuiltInWebGpuLayerAdapter<"starfield", StarfieldLayerShaderBinding, never> = {
  collect: collectStarfieldLayerBindings,
  createParameterDeclarations: (bindings) =>
    bindings
      .map((binding) => `,
      ${binding.parameterName}: vec4<f32>`)
      .join(""),
  createSampleExpression: (layer, language, context) => {
    const binding = context.bindingsByLayerId.get(layer.id);

    return binding ? `effectColor = ${binding.parameterName};` : zeroEffectExpression(language);
  },
  createSampleNodes: ({ bindings, direction, imageTextures }) => {
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

        sampleData.set(binding.layer.id, {
          sampleNode: sampleTextureNode,
          textureNode: sampleTextureNode,
        });

        return [binding.parameterName, sampleTextureNode];
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
  sampleCpu: (direction, params, context) =>
    sampleStarfield(context.layerId, direction, params as SkyboxStarfieldParams, {
      sampleHeight: context.sampleHeight,
      starfieldBakes: context.starfieldBakes,
    }),
  updateLive: (context, layer) => {
    context.applyLayerParams(layer);
    context.scheduleResourceBake(layer.id, layer.params);
  },
  wgsl: starfieldWebGpuAdapter as WebGpuLayerAdapter,
  getTopologyKey: () => ({}),
  glsl: {
    collectBindings: (nodes) => collectStarfieldLayerBindings(nodes),
    createBindingMap: (bindings) =>
      createStarfieldBindingMap(bindings as StarfieldLayerShaderBinding[]),
    uniformDeclarations: (bindings) =>
      glslStarfieldUniformDeclarations(bindings as StarfieldLayerShaderBinding[]),
    shaderUniforms: (bindings, context) =>
      starfieldTextureUniforms(
        bindings as StarfieldLayerShaderBinding[],
        context.starfieldTextures as Map<string, THREE.Texture>
      ),
    sampleExpression: (layer, bindingMap, language) =>
      starfieldSampleExpression(
        layer as Extract<SkyboxManifestLayer, { type: "starfield" }>,
        bindingMap as Map<string, StarfieldLayerShaderBinding>,
        language
      ),
  },
});
