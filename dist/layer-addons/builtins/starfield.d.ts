import * as THREE from "three";
import type { WebGpuStarfieldSampleNodeData } from "../../skybox/types";
export declare function disposeStarfieldTexture(texture: THREE.Texture): void;
export declare function updateStarfieldTextureNodes(sampleData: Map<string, WebGpuStarfieldSampleNodeData>, starfieldTextures: Map<string, THREE.Texture>): void;
