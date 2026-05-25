import * as THREE from "three";
import { NodeMaterial } from "three/webgpu";
import type { SkyboxBakeOptions, SkyboxManifest, SkyboxRenderMode } from "./manifest";
type SupportedRenderer = THREE.WebGLRenderer | {
    isWebGPURenderer?: boolean;
};
type RuntimeMaterial = THREE.ShaderMaterial | THREE.MeshBasicMaterial | NodeMaterial;
export declare function createBakedSkyboxTexture(manifest: SkyboxManifest, options?: SkyboxBakeOptions): THREE.CanvasTexture<HTMLCanvasElement>;
export declare class Skybox extends THREE.Mesh<THREE.BoxGeometry, RuntimeMaterial> {
    #private;
    constructor();
    fromManifest(manifest: SkyboxManifest): this;
    setBakeOptions(options: SkyboxBakeOptions): this;
    setRenderer(renderer: SupportedRenderer | null): this;
    setRenderMode(mode: SkyboxRenderMode): this;
    otherOverridingSetup(): this;
    load(renderer?: SupportedRenderer): this;
    setManifest(manifest: SkyboxManifest): this;
    invalidateBakeCache(): this;
    dispose(): void;
}
export {};
