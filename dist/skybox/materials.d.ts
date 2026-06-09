import * as THREE from "three";
import { NodeMaterial } from "three/webgpu";
import type { SkyboxBakeOptions, SkyboxManifest, SkyboxManifestLayer, SkyboxManifestNode, SkyboxManifestV2, SkyboxRenderMode } from "../manifest";
import type { StarfieldGpuPatchTextureSet } from "../starfield-gpu-bake";
import type { SkyboxEditorLayerState } from "./types";
export declare function forEachRenderableLayer(nodes: SkyboxManifestNode[], callback: (layer: SkyboxManifestLayer) => void): void;
export declare function createWebGpuMaterial(manifest: SkyboxManifestV2, editorLayerState: SkyboxEditorLayerState, imageTextures: Map<string, THREE.Texture>, starfieldTextures: Map<string, THREE.Texture>, starfieldPatchTextures: Map<string, StarfieldGpuPatchTextureSet>, editorPresentationEnabled: boolean): NodeMaterial;
export declare function createWebGpuEquirectBakeMaterial(manifest: SkyboxManifestV2, imageTextures: Map<string, THREE.Texture>, starfieldTextures: Map<string, THREE.Texture>, options?: {
    flipY?: boolean;
}): NodeMaterial;
export declare function createBakedSkyboxTexture(manifest: SkyboxManifest, options?: SkyboxBakeOptions): THREE.CanvasTexture<HTMLCanvasElement>;
export declare function createBakedMaterialFromTexture(texture: THREE.Texture): NodeMaterial;
export declare function resolveRenderMode(mode: SkyboxRenderMode): Exclude<SkyboxRenderMode, "auto">;
export declare function createMaterialTopologyKey(manifest: SkyboxManifestV2, renderMode: Exclude<SkyboxRenderMode, "auto">, editorPresentationEnabled: boolean): string;
export declare function findManifestNodeById(nodes: SkyboxManifestNode[], nodeId: string): SkyboxManifestNode | null;
