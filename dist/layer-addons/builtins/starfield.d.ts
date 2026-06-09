import * as THREE from "three";
import { type Rgb, type Rgba } from "../../math";
import type { SkyboxStarfieldParams } from "../../manifest";
import { type StarfieldBakeData } from "../../starfield-static";
import type { StarfieldLayerShaderBinding, WebGpuStarfieldSampleNodeData } from "../../skybox/types";
export declare function sampleStarfield(layerId: string, direction: Rgb, params: SkyboxStarfieldParams, options?: {
    sampleHeight?: number;
    starfieldBakes?: Map<string, StarfieldBakeData>;
}): Rgba;
export declare function disposeStarfieldTexture(texture: THREE.Texture): void;
export declare function updateStarfieldTextureUniforms(material: THREE.ShaderMaterial, bindings: StarfieldLayerShaderBinding[], starfieldTextures: Map<string, THREE.Texture>): void;
export declare function updateStarfieldTextureNodes(sampleData: Map<string, WebGpuStarfieldSampleNodeData>, starfieldTextures: Map<string, THREE.Texture>): void;
