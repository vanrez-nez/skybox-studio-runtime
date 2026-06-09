import * as THREE from "three";
import type { Rgb, Rgba } from "../../math";
import type { SkyboxImageParams, SkyboxImagePlacement } from "../../manifest";
import type { ImagePlacementUniformNodes, RuntimeMaterial, WebGpuImageSampleNodeData } from "../../skybox/types";
export declare function sampleImageLayer(direction: Rgb, params: SkyboxImageParams): Rgba;
export declare function applyImageLayerPlacementToUniformNodes(uniforms: ImagePlacementUniformNodes[], layerId: string, placement: SkyboxImagePlacement | null): void;
export declare function attachImagePlacementUpdater(material: RuntimeMaterial, updater: (layerId: string, placement: SkyboxImagePlacement | null) => void): void;
export declare function updateImageTextureNodes(sampleData: Map<string, WebGpuImageSampleNodeData>, imageTextures: Map<string, THREE.Texture>): void;
