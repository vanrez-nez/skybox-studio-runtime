import * as THREE from "three";
import {
  texture as textureNode,
  uniform,
  vec2,
  wgslFn,
} from "three/tsl";

import { normalizeImagePlacement } from "../../image-placement-transform";
import type {
  SkyboxImagePlacement,
  SkyboxManifestLayer,
  SkyboxManifestNode,
} from "../../manifest";
import { EMPTY_IMAGE_TEXTURE } from "../../skybox/empty-texture";
import { registerLayerRuntimeAdapter } from "../registry";
import { computeMoonLightSource } from "./moon/light-source";
import { numberLiteral, zeroEffectExpression } from "../shader-codegen";
import type { WebGpuLayerAdapter } from "../types";

type MoonLayer = Extract<SkyboxManifestLayer, { type: "moon" }>;

type MoonLayerBinding = {
  index: number;
  layer: MoonLayer;
  parameterName: string;
};

type MoonPlacementUniforms = {
  centerDirection: ReturnType<typeof uniform>;
  halfSize: ReturnType<typeof uniform>;
  layerId: string;
  tangentX: ReturnType<typeof uniform>;
  tangentY: ReturnType<typeof uniform>;
};

type MoonSampleData = {
  sampleInfo: unknown;
  sampleNode: unknown;
  textureNode: { value: THREE.Texture };
};

export type MoonLayerSampleNodes = {
  editorProjectionByLayerId: Map<string, { uv: unknown; valid: unknown }>;
  sampleData: Map<string, MoonSampleData>;
  sampleNodesByParameterName: Record<string, unknown>;
  textureSlots: Record<string, unknown>;
};

function placementValues(placement: SkyboxImagePlacement) {
  const resolved = normalizeImagePlacement(placement);

  return {
    centerDirection: new THREE.Vector3(...resolved.centerDirection),
    halfSize: new THREE.Vector2(
      Math.max(0, Math.tan(resolved.angularWidth / 2)),
      Math.max(0, Math.tan(resolved.angularHeight / 2)),
    ),
    tangentX: new THREE.Vector3(...resolved.tangentX),
    tangentY: new THREE.Vector3(...resolved.tangentY),
  };
}

function createPlacementUniforms(bindings: MoonLayerBinding[]) {
  return bindings.map((binding): MoonPlacementUniforms => {
    const placement = placementValues(binding.layer.params.placement);

    return {
      centerDirection: uniform(placement.centerDirection),
      halfSize: uniform(placement.halfSize),
      layerId: binding.layer.id,
      tangentX: uniform(placement.tangentX),
      tangentY: uniform(placement.tangentY),
    };
  });
}

function applyPlacement(
  uniforms: MoonPlacementUniforms[],
  layerId: string,
  placement: SkyboxImagePlacement,
) {
  const target = uniforms.find((uniformNodes) => uniformNodes.layerId === layerId);
  if (!target) return;

  const values = placementValues(placement);
  (target.centerDirection as any).value.copy(values.centerDirection);
  (target.halfSize as any).value.copy(values.halfSize);
  (target.tangentX as any).value.copy(values.tangentX);
  (target.tangentY as any).value.copy(values.tangentY);
}

function collectBindings(nodes: SkyboxManifestNode[]) {
  const bindings: MoonLayerBinding[] = [];

  const collect = (nextNodes: SkyboxManifestNode[]) => {
    nextNodes.forEach((node) => {
      if (!node.enabled) return;
      if (node.type === "group") {
        collect(node.children);
      } else if (node.type === "moon") {
        const index = bindings.length;
        bindings.push({
          index,
          layer: node,
          parameterName: `moonLayer${index}`,
        });
      }
    });
  };

  collect(nodes);
  return bindings;
}

const moonSampleInfo = wgslFn(`
  fn skyboxStudioMoonSampleInfo(
    direction: vec3<f32>,
    centerDirection: vec3<f32>,
    tangentX: vec3<f32>,
    tangentY: vec3<f32>,
    halfSize: vec2<f32>
  ) -> vec4<f32> {
    let sampleDirection = normalize(direction);
    let denom = dot(sampleDirection, centerDirection);
    let safeDenom = max(denom, 0.000001);
    let projectedX = dot(sampleDirection, tangentX) / safeDenom;
    let projectedY = dot(sampleDirection, tangentY) / safeDenom;
    let u = projectedX / max(halfSize.x * 2.0, 0.000001) + 0.5;
    let v = projectedY / max(halfSize.y * 2.0, 0.000001) + 0.5;
    let edgeDistance = min(min(u, 1.0 - u), min(v, 1.0 - v));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${numberLiteral(0.05)});
    let valid = step(0.000001, denom) *
      step(0.0, halfSize.x) *
      step(0.0, halfSize.y) *
      step(-edgeWidth, edgeDistance) *
      smoothstep(-edgeWidth, edgeWidth, edgeDistance);
    return vec4<f32>(u, v, valid, 0.0);
  }
`);

const applyMoonMask = wgslFn(`
  fn skyboxStudioApplyMoonMask(color: vec4<f32>, valid: f32) -> vec4<f32> {
    return vec4<f32>(color.rgb, color.a * valid);
  }
`);

export function updateMoonTextureNodes(
  samples: MoonLayerSampleNodes | undefined,
  textures: Map<string, THREE.Texture>,
) {
  samples?.sampleData.forEach((sample, layerId) => {
    sample.textureNode.value = textures.get(layerId) ?? EMPTY_IMAGE_TEXTURE;
  });
}

const moonWebGpuAdapter: WebGpuLayerAdapter<
  MoonLayer,
  MoonLayerBinding,
  MoonPlacementUniforms
> = {
  collect: collectBindings,
  createParameterDeclarations: (bindings) =>
    bindings.map((binding) => `,\n      ${binding.parameterName}: vec4<f32>`).join(""),
  createSampleExpression: (layer, _language, context) => {
    const binding = context.bindingsByLayerId.get(layer.id);
    return binding ? `effectColor = ${binding.parameterName};` : zeroEffectExpression();
  },
  createSampleNodes: ({ bindings, direction, resourceTextures, uniforms }) => {
    const sampleData = new Map<string, MoonSampleData>();
    const sampleNodesByParameterName = Object.fromEntries(
      bindings.map((binding) => {
        const placement = uniforms[binding.index];
        const sampleInfo = (moonSampleInfo as any)({
          centerDirection: placement.centerDirection,
          direction,
          halfSize: placement.halfSize,
          tangentX: placement.tangentX,
          tangentY: placement.tangentY,
        });
        const texture = textureNode(
          resourceTextures.get(binding.layer.id) ?? EMPTY_IMAGE_TEXTURE,
          vec2(sampleInfo.x, sampleInfo.y),
        ).setName(`moonTexture${binding.index}`);

        (texture as any).getUniformHash = () => `skybox-moon-texture:${binding.layer.id}`;
        const sampleNode = (applyMoonMask as any)({ color: texture, valid: sampleInfo.z });

        sampleData.set(binding.layer.id, {
          sampleInfo,
          sampleNode,
          textureNode: texture as unknown as { value: THREE.Texture },
        });
        return [binding.parameterName, sampleNode];
      }),
    );

    return {
      editorProjectionByLayerId: new Map(
        Array.from(sampleData.entries()).map(([layerId, sample]) => [
          layerId,
          {
            uv: vec2((sample.sampleInfo as any).x, (sample.sampleInfo as any).y),
            valid: (sample.sampleInfo as any).z,
          },
        ]),
      ),
      sampleData,
      sampleNodesByParameterName,
      textureSlots: Object.fromEntries(
        Array.from(sampleData.entries()).map(([layerId, sample]) => [
          layerId,
          sample.textureNode,
        ]),
      ),
    } satisfies MoonLayerSampleNodes;
  },
  createSampleParameters: (_bindings, _uniforms, samples) =>
    (samples as MoonLayerSampleNodes | undefined)?.sampleNodesByParameterName ?? {},
  createUniforms: createPlacementUniforms,
  getTopologyKey: () => ({}),
  type: "moon",
  updateUniforms: (uniforms, layer) =>
    applyPlacement(uniforms, layer.id, layer.params.placement),
};

registerLayerRuntimeAdapter({
  type: "moon",
  getTopologyKey: () => ({}),
  updateLive: (context, layer) => {
    context.applyLayerParams(layer);
    context.scheduleResourceBake(layer.id, layer.params);
  },
  wgsl: moonWebGpuAdapter as WebGpuLayerAdapter,
  wgslEditorOverlay: true,
  getLightSource: (params) =>
    computeMoonLightSource(params as MoonLayer["params"]),
});
