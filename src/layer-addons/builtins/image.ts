// Self-contained image layer adapter: CPU sampling + WebGPU (TSL, with texture nodes) + WebGL
// (GLSL) shader codegen, angular-decal placement uniforms, texture binding, and topology. Editor
// selection-rect overlay shaders are imported from `skybox/editor-presentation`.
import * as THREE from "three";
import { texture as textureNode, uniform, vec2, wgslFn } from "three/tsl";

import { projectDirectionToImageUv } from "../../image-placement-transform";
import type { Rgb, Rgba } from "../../math";
import { normalizeImagePlacement } from "../../image-placement-transform";
import type {
  SkyboxImageParams,
  SkyboxImagePlacement,
  SkyboxManifestLayer,
  SkyboxManifestNode,
} from "../../manifest";
import { EMPTY_IMAGE_TEXTURE } from "../../skybox/empty-texture";
import {
  IMAGE_PROJECTION_DENOM_EPSILON,
  IMAGE_PROJECTION_MAX_EDGE_WIDTH,
} from "../../skybox/overlay";
import type {
  BuiltInWebGpuLayerAdapter,
  ImageLayerShaderBinding,
  ImagePlacementUniformNodes,
  RuntimeMaterial,
  WebGpuImageLayerSampleNodes,
  WebGpuImageSampleNodeData,
} from "../../skybox/types";
import { mixRgba, sampleImagePixel } from "../cpu-sampling";
import { registerLayerRuntimeAdapter } from "../registry";
import { numberLiteral, zeroEffectExpression } from "../shader-codegen";
import type { WebGpuLayerAdapter } from "../types";

// --- CPU sampling ---

export function sampleImageLayer(direction: Rgb, params: SkyboxImageParams): Rgba {
  const placement = params.placement;

  if (!placement || !params.pixels || params.width <= 0 || params.height <= 0) {
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

// --- Placement uniforms (angular decal projection) ---

function imagePlacementShaderValues(
  placement: Extract<SkyboxManifestLayer, { type: "image" }>["params"]["placement"]
) {
  if (!placement) {
    return {
      centerDirection: new THREE.Vector3(0, 0, -1),
      halfSize: new THREE.Vector2(0, 0),
      tangentX: new THREE.Vector3(1, 0, 0),
      tangentY: new THREE.Vector3(0, 1, 0),
    };
  }

  const resolvedPlacement = normalizeImagePlacement(placement);

  return {
    centerDirection: new THREE.Vector3(...resolvedPlacement.centerDirection),
    halfSize: new THREE.Vector2(
      Math.max(0, Math.tan(resolvedPlacement.angularWidth / 2)),
      Math.max(0, Math.tan(resolvedPlacement.angularHeight / 2))
    ),
    tangentX: new THREE.Vector3(...resolvedPlacement.tangentX),
    tangentY: new THREE.Vector3(...resolvedPlacement.tangentY),
  };
}

function createImagePlacementUniformNodes(bindings: ImageLayerShaderBinding[]) {
  return bindings.map((binding): ImagePlacementUniformNodes => {
    const placement = imagePlacementShaderValues(binding.layer.params.placement);

    return {
      centerDirection: uniform(placement.centerDirection),
      halfSize: uniform(placement.halfSize),
      layerId: binding.layer.id,
      tangentX: uniform(placement.tangentX),
      tangentY: uniform(placement.tangentY),
    };
  });
}

export function applyImageLayerPlacementToUniformNodes(
  uniforms: ImagePlacementUniformNodes[],
  layerId: string,
  placement: SkyboxImagePlacement | null
) {
  const placementUniforms = uniforms.find((nextUniforms) => nextUniforms.layerId === layerId);

  if (!placementUniforms) {
    return;
  }

  const placementValues = imagePlacementShaderValues(placement);

  (placementUniforms.centerDirection as any).value.copy(placementValues.centerDirection);
  (placementUniforms.tangentX as any).value.copy(placementValues.tangentX);
  (placementUniforms.tangentY as any).value.copy(placementValues.tangentY);
  (placementUniforms.halfSize as any).value.copy(placementValues.halfSize);
}

export function attachImagePlacementUpdater(
  material: RuntimeMaterial,
  updater: (layerId: string, placement: SkyboxImagePlacement | null) => void
) {
  material.userData.applyImageLayerPlacement = updater;
}

// --- Binding collection ---

function collectImageLayerBindings(nodes: SkyboxManifestNode[]) {
  const bindings: ImageLayerShaderBinding[] = [];

  function collect(nextNodes: SkyboxManifestNode[]) {
    nextNodes.forEach((node) => {
      if (!node.enabled) {
        return;
      }

      if (node.type === "group") {
        collect(node.children);
        return;
      }

      if (node.type === "image") {
        const index = bindings.length;

        bindings.push({
          index,
          layer: node,
          parameterName: `imageLayer${index}`,
        });
      }
    });
  }

  collect(nodes);

  return bindings;
}

// --- Sample-info projection (shared GLSL + WGSL) ---

function imageSampleInfoExpression(
  binding: ImageLayerShaderBinding,
  refs: {
    centerDirection: string;
    halfSize: string;
    tangentX: string;
    tangentY: string;
  }
) {
  const { width, height } = binding.layer.params;

  if (width <= 0 || height <= 0) {
    return `return vec4<f32>(0.0, 0.0, 0.0, 0.0);`;
  }

  return `
      let imageDirection = normalize(direction);
      let imageDenom = dot(imageDirection, ${refs.centerDirection});
      let safeImageDenom = max(imageDenom, 0.000001);
      let projectedX = dot(imageDirection, ${refs.tangentX}) / safeImageDenom;
      let projectedY = dot(imageDirection, ${refs.tangentY}) / safeImageDenom;
      let imageU = projectedX / max(${refs.halfSize}.x * 2.0, 0.000001) + 0.5;
      let imageV = 0.5 - projectedY / max(${refs.halfSize}.y * 2.0, 0.000001);
      let imageEdgeDistance = min(min(imageU, 1.0 - imageU), min(imageV, 1.0 - imageV));
      let imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${numberLiteral(IMAGE_PROJECTION_MAX_EDGE_WIDTH)});
      let imageHardInside = step(${numberLiteral(IMAGE_PROJECTION_DENOM_EPSILON)}, imageDenom) *
        step(0.0, ${refs.halfSize}.x) *
        step(0.0, ${refs.halfSize}.y);
      let imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      let imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return vec4<f32>(imageU, imageV, imageValid, 0.0);
    `;
}

// --- WGSL helpers ---

function webGpuImageSampleInfoFunction(binding: ImageLayerShaderBinding) {
  return wgslFn(`
    fn skyboxStudioImageSampleInfo${binding.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${imageSampleInfoExpression(binding, {
        centerDirection: "imageCenterDirection",
        halfSize: "imageHalfSize",
        tangentX: "imageTangentX",
        tangentY: "imageTangentY",
      })}
    }
  `);
}

const webGpuImageMaskFunction = wgslFn(`
  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {
    return vec4<f32>(color.rgb, color.a * valid);
  }
`);

// --- Texture binding ---

function getImageTexture(
  imageTextures: Map<string, THREE.Texture>,
  layer: Extract<SkyboxManifestLayer, { type: "image" }>
) {
  return imageTextures.get(layer.id) ?? EMPTY_IMAGE_TEXTURE;
}

export function updateImageTextureNodes(
  sampleData: Map<string, WebGpuImageSampleNodeData>,
  imageTextures: Map<string, THREE.Texture>
) {
  sampleData.forEach((sample, layerId) => {
    sample.textureNode.value = imageTextures.get(layerId) ?? EMPTY_IMAGE_TEXTURE;
  });
}

// --- WebGPU texture sample nodes ---

function createWebGpuImageSampleNodes(
  bindings: ImageLayerShaderBinding[],
  direction: unknown,
  imageTextures: Map<string, THREE.Texture>,
  placementUniforms: ImagePlacementUniformNodes[]
) {
  const sampleData = new Map<string, WebGpuImageSampleNodeData>();
  const sampleNodes = Object.fromEntries(
    bindings.map((binding) => {
      const placement = placementUniforms[binding.index];
      const sampleInfo = webGpuImageSampleInfoFunction(binding)({
        direction,
        imageCenterDirection: placement.centerDirection,
        imageHalfSize: placement.halfSize,
        imageTangentX: placement.tangentX,
        imageTangentY: placement.tangentY,
      } as any) as any;
      const sampleUv = vec2(sampleInfo.x, sampleInfo.y);
      const sampleTextureNode = textureNode(
        getImageTexture(imageTextures, binding.layer),
        sampleUv
      ).setName(`imageTexture${binding.index}`);

      (sampleTextureNode as any).getUniformHash = () =>
        `skybox-image-texture:${binding.layer.id}`;

      const sampleColor = sampleTextureNode;
      const maskedColor = webGpuImageMaskFunction({
        color: sampleColor,
        valid: sampleInfo.z,
      });

      sampleData.set(binding.layer.id, {
        sampleInfo,
        sampleNode: maskedColor,
        textureNode: sampleTextureNode,
      });

      return [binding.parameterName, maskedColor];
    })
  );

  return { sampleData, sampleNodes };
}

// --- WebGPU adapter (TSL) ---

const imageWebGpuAdapter: BuiltInWebGpuLayerAdapter<"image", ImageLayerShaderBinding, ImagePlacementUniformNodes> = {
  collect: collectImageLayerBindings,
  createParameterDeclarations: (bindings) =>
    bindings
      .map((binding) => `,
      ${binding.parameterName}: vec4<f32>`)
      .join(""),
  createSampleExpression: (layer, _language, context) => {
    const binding = context.bindingsByLayerId.get(layer.id);

    return binding ? `effectColor = ${binding.parameterName};` : zeroEffectExpression();
  },
  createSampleNodes: ({ bindings, direction, imageTextures, uniforms }) => {
    const imageSamples = createWebGpuImageSampleNodes(
      bindings,
      direction,
      imageTextures,
      uniforms
    );

    return {
      editorProjectionByLayerId: new Map(
        Array.from(imageSamples.sampleData.entries()).map(([layerId, sample]) => [
          layerId,
          {
            uv: vec2(sample.sampleInfo.x, sample.sampleInfo.y),
            valid: sample.sampleInfo.z,
          },
        ])
      ),
      sampleData: imageSamples.sampleData,
      sampleNodesByLayerId: Object.fromEntries(
        bindings.map((binding) => [
          binding.layer.id,
          imageSamples.sampleNodes[binding.parameterName],
        ])
      ),
      sampleNodesByParameterName: imageSamples.sampleNodes,
      textureSlots: Object.fromEntries(
        Array.from(imageSamples.sampleData.entries()).map(([layerId, sample]) => [
          layerId,
          sample.textureNode,
        ])
      ),
    } satisfies WebGpuImageLayerSampleNodes;
  },
  createSampleParameters: (_bindings, _uniforms, samples) =>
    (samples as WebGpuImageLayerSampleNodes | undefined)?.sampleNodesByParameterName ?? {},
  createUniforms: createImagePlacementUniformNodes,
  getTopologyKey: (layer) => ({
    hasPlacement: Boolean(layer.params.placement),
    hasSrc: Boolean(layer.params.src),
    height: layer.params.height,
    width: layer.params.width,
  }),
  type: "image",
  updateUniforms: (uniforms, layer) =>
    applyImageLayerPlacementToUniformNodes(uniforms, layer.id, layer.params.placement),
};

registerLayerRuntimeAdapter({
  type: "image",
  sampleCpu: (direction, params) => sampleImageLayer(direction, params as SkyboxImageParams),
  updateLive: (context, layer) =>
    context.applyImagePlacement(layer.id, (layer.params as SkyboxImageParams).placement),
  wgsl: imageWebGpuAdapter as WebGpuLayerAdapter,
  wgslEditorOverlay: true,
  getTopologyKey: (layer) => imageWebGpuAdapter.getTopologyKey(layer as never),
});
