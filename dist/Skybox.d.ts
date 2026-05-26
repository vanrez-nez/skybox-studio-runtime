import * as THREE from "three";
import { NodeMaterial } from "three/webgpu";
import type { SkyboxGeometryOptions, SkyboxImagePlacement, SkyboxBakeOptions, SkyboxManifest, SkyboxRenderMode } from "./manifest";
type SupportedRenderer = THREE.WebGLRenderer | {
    isWebGPURenderer?: boolean;
};
type RuntimeMaterial = THREE.ShaderMaterial | NodeMaterial;
type ImageTextureMap = Record<string, THREE.Texture | null | undefined>;
export type SkyboxEditorImageState = {
    hoveredImageLayerId: string | null;
    selectedImageLayerId: string | null;
};
export declare function createSkyboxGeometry(options?: SkyboxGeometryOptions): THREE.SphereGeometry | THREE.BoxGeometry;
export declare function createSkyboxWireGeometry(options?: SkyboxGeometryOptions): THREE.BufferGeometry<THREE.NormalBufferAttributes, THREE.BufferGeometryEventMap>;
export declare function createBakedSkyboxTexture(manifest: SkyboxManifest, options?: SkyboxBakeOptions): THREE.CanvasTexture<HTMLCanvasElement>;
export declare class Skybox extends THREE.Mesh<THREE.BufferGeometry, RuntimeMaterial> {
    #private;
    constructor();
    fromManifest(manifest: SkyboxManifest): this;
    setGeometry(options: SkyboxGeometryOptions): this;
    setBakeOptions(options: SkyboxBakeOptions): this;
    setRenderer(renderer: SupportedRenderer | null): this;
    setRenderMode(mode: SkyboxRenderMode): this;
    setImageTexture(layerId: string, texture: THREE.Texture | null): this;
    setImageTextures(textures: ImageTextureMap): this;
    otherOverridingSetup(): this;
    load(renderer?: SupportedRenderer): this;
    private applyGeometry;
    private disposeOwnedTexture;
    private replaceMaterial;
    private applyLiveManifestUniformUpdates;
    setEditorPresentationEnabled(enabled: boolean): this;
    setEditorImageState(state: Partial<SkyboxEditorImageState>): this;
    setHoveredImageLayerId(layerId: string | null): this;
    setImageLayerPlacement(layerId: string, placement: SkyboxImagePlacement | null): this;
    setManifest(manifest: SkyboxManifest): this;
    setBakedTexture(texture: THREE.Texture): this;
    invalidateBakeCache(): this;
    dispose(): void;
}
export {};
