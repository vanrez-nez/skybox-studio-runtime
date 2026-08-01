// Shared shader-binding / uniform-node types used across the skybox material, composition, and
// editor-presentation modules. Pure types — no runtime.
import type * as THREE from "three";
import type { NodeMaterial } from "three/webgpu";
import type { uniform } from "three/tsl";

import type { SkyboxLayerBlendMode, SkyboxManifestLayer } from "../manifest";
import type { WebGpuLayerAdapter, WebGpuLayerSampleNodes } from "../layer-addons";

export type SupportedRenderer = THREE.WebGLRenderer | { isWebGPURenderer?: boolean };
export type RuntimeMaterial = THREE.ShaderMaterial | NodeMaterial;

export type ImageLayerShaderBinding = {
  index: number;
  layer: Extract<SkyboxManifestLayer, { type: "image" }>;
  parameterName: string;
};
export type CloudsLayerShaderBinding = {
  index: number;
  layer: Extract<SkyboxManifestLayer, { type: "clouds" }>;
  parameterPrefix: string;
};
export type GradientLayerShaderBinding = {
  index: number;
  layer: Extract<SkyboxManifestLayer, { type: "gradient" }>;
  parameterPrefix: string;
  stopCount: number;
};
export type FieldGradientLayerShaderBinding = {
  anchorCount: number;
  index: number;
  layer: Extract<SkyboxManifestLayer, { type: "field-gradient" }>;
  parameterPrefix: string;
};
export type SpotLayerShaderBinding = {
  index: number;
  layer: Extract<SkyboxManifestLayer, { type: "spot" }>;
  parameterPrefix: string;
  stopCount: number;
};
export type StarfieldLayerShaderBinding = {
  index: number;
  layer: Extract<SkyboxManifestLayer, { type: "starfield" }>;
  parameterName: string;
};

export type CloudsUniformNodes = {
  color: ReturnType<typeof uniform>;
  coverage: ReturnType<typeof uniform>;
  density: ReturnType<typeof uniform>;
  elevation: ReturnType<typeof uniform>;
  layerId: string;
  offset: ReturnType<typeof uniform>;
  scale: ReturnType<typeof uniform>;
  shadowColor: ReturnType<typeof uniform>;
  sunDirection: ReturnType<typeof uniform>;
};
export type GradientUniformNodes = {
  axis: ReturnType<typeof uniform>;
  layerId: string;
  stops: Array<{
    color: ReturnType<typeof uniform>;
    midpoint: ReturnType<typeof uniform>;
    t: ReturnType<typeof uniform>;
  }>;
};
export type FieldGradientUniformNodes = {
  amplitude: ReturnType<typeof uniform>;
  anchors: Array<{
    color: ReturnType<typeof uniform>;
    direction: ReturnType<typeof uniform>;
  }>;
  frequency: ReturnType<typeof uniform>;
  layerId: string;
  mode: ReturnType<typeof uniform>;
  power: ReturnType<typeof uniform>;
};
export type ImagePlacementUniformNodes = {
  centerDirection: ReturnType<typeof uniform>;
  halfSize: ReturnType<typeof uniform>;
  layerId: string;
  tangentX: ReturnType<typeof uniform>;
  tangentY: ReturnType<typeof uniform>;
};
export type SpotUniformNodes = {
  brightness: ReturnType<typeof uniform>;
  centerDirection: ReturnType<typeof uniform>;
  coreRadius: ReturnType<typeof uniform>;
  coreSoftness: ReturnType<typeof uniform>;
  dispersion: ReturnType<typeof uniform>;
  dogSpread: ReturnType<typeof uniform>;
  dogStrength: ReturnType<typeof uniform>;
  dogStretch: ReturnType<typeof uniform>;
  glareSize: ReturnType<typeof uniform>;
  glareStrength: ReturnType<typeof uniform>;
  glowSize: ReturnType<typeof uniform>;
  glowStrength: ReturnType<typeof uniform>;
  haloInnerWidth: ReturnType<typeof uniform>;
  haloOuterWidth: ReturnType<typeof uniform>;
  haloRadius: ReturnType<typeof uniform>;
  haloStrength: ReturnType<typeof uniform>;
  layerId: string;
  lightColor: ReturnType<typeof uniform>;
  mode: ReturnType<typeof uniform>;
  radius: ReturnType<typeof uniform>;
  stops: Array<{
    color: ReturnType<typeof uniform>;
    midpoint: ReturnType<typeof uniform>;
    t: ReturnType<typeof uniform>;
  }>;
};
export type CompositionUniformNodes = {
  blendMode: ReturnType<typeof uniform>;
  nodeId: string;
  opacity: ReturnType<typeof uniform>;
};
export type ImageEditorUniformNodes = {
  active: ReturnType<typeof uniform>;
  layerId: string;
};
export type SpotEditorUniformNodes = {
  active: ReturnType<typeof uniform>;
  layerId: string;
};

export type ImageTextureMap = Record<string, THREE.Texture | null | undefined>;
export type HoveredImageLayerId = string | null;
export type LayerCompositionUpdate = {
  blendMode?: SkyboxLayerBlendMode;
  opacity?: number;
};
export type WebGpuImageSampleNodeData = {
  sampleInfo: any;
  sampleNode: any;
  textureNode: any;
};
export type WebGpuImageLayerSampleNodes = WebGpuLayerSampleNodes & {
  sampleData: Map<string, WebGpuImageSampleNodeData>;
  sampleNodesByParameterName: Record<string, unknown>;
};
export type WebGpuStarfieldSampleNodeData = {
  sampleNode: any;
  screenTextureNode: any;
  textureNode: any;
};
export type WebGpuStarfieldLayerSampleNodes = WebGpuLayerSampleNodes & {
  sampleData: Map<string, WebGpuStarfieldSampleNodeData>;
  sampleNodesByParameterName: Record<string, unknown>;
};
export type BuiltInWebGpuLayerAdapter<
  TType extends SkyboxManifestLayer["type"],
  TBinding,
  TUniforms,
> = WebGpuLayerAdapter<Extract<SkyboxManifestLayer, { type: TType }>, TBinding, TUniforms>;
export type SkyboxEditorImageState = {
  hoveredImageLayerId: string | null;
  selectedImageLayerId: string | null;
};
export type SkyboxEditorLayerState = {
  hoveredLayerId: string | null;
  selectedLayerId: string | null;
};
