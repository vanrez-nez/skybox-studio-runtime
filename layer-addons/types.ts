import type * as THREE from "three";

import type {
  SkyboxManifestLayer,
  SkyboxManifestNode,
} from "../manifest";

export type WebGpuLayerSampleNodes = {
  editorProjectionByLayerId?: Map<string, { uv: unknown; valid: unknown }>;
  sampleNodesByLayerId?: Record<string, unknown>;
  textureSlots?: Record<string, unknown>;
};

export type WebGpuLayerSampleContext<TBinding, TUniforms> = {
  bindings: TBinding[];
  direction: unknown;
  imageTextures: Map<string, THREE.Texture>;
  uniforms: TUniforms[];
};

export type WebGpuLayerExpressionContext<TBinding> = {
  bindingsByLayerId: Map<string, TBinding>;
};

export type WebGpuLayerAdapter<
  TLayer extends SkyboxManifestLayer = SkyboxManifestLayer,
  TBinding = unknown,
  TUniforms = unknown,
> = {
  collect(nodes: SkyboxManifestNode[]): TBinding[];
  createParameterDeclarations(bindings: TBinding[]): string;
  createSampleExpression(
    layer: TLayer,
    language: "wgsl",
    context: WebGpuLayerExpressionContext<TBinding>
  ): string;
  createSampleNodes?(
    context: WebGpuLayerSampleContext<TBinding, TUniforms>
  ): WebGpuLayerSampleNodes;
  createSampleParameters?(
    bindings: TBinding[],
    uniforms: TUniforms[],
    samples?: WebGpuLayerSampleNodes
  ): Record<string, unknown>;
  createUniforms(bindings: TBinding[]): TUniforms[];
  getTopologyKey(layer: TLayer): unknown;
  type: TLayer["type"];
  updateUniforms(uniforms: TUniforms[], layer: TLayer): void;
};

export type WebGpuLayerAdapterRuntime<
  TLayer extends SkyboxManifestLayer = SkyboxManifestLayer,
  TBinding = unknown,
  TUniforms = unknown,
> = {
  adapter: WebGpuLayerAdapter<TLayer, TBinding, TUniforms>;
  bindings: TBinding[];
  bindingsByLayerId: Map<string, TBinding>;
  samples?: WebGpuLayerSampleNodes;
  uniforms: TUniforms[];
};

export type WebGpuCompositionRuntime = {
  adapters: Map<string, WebGpuLayerAdapterRuntime>;
  editorProjectionByLayerId: Map<string, { uv: unknown; valid: unknown }>;
  sampleParameters: Record<string, unknown>;
  textureSlotsByLayerId: Record<string, unknown>;
};
