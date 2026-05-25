import * as THREE from "three";
import { NodeMaterial } from "three/webgpu";
import type { SkyboxGeometryOptions, SkyboxBakeOptions, SkyboxManifest, SkyboxRenderMode } from "./manifest";
type SupportedRenderer = THREE.WebGLRenderer | {
    isWebGPURenderer?: boolean;
};
type RuntimeMaterial = THREE.ShaderMaterial | NodeMaterial;
export declare function createSkyboxGeometry(options?: SkyboxGeometryOptions): THREE.SphereGeometry | THREE.BoxGeometry;
export declare function createSkyboxWireGeometry(options?: SkyboxGeometryOptions): THREE.WireframeGeometry<THREE.SphereGeometry> | THREE.EdgesGeometry<THREE.BoxGeometry>;
export declare function createBakedSkyboxTexture(manifest: SkyboxManifest, options?: SkyboxBakeOptions): THREE.CanvasTexture<HTMLCanvasElement>;
export declare class Skybox extends THREE.Mesh<THREE.BufferGeometry, RuntimeMaterial> {
    #private;
    constructor();
    fromManifest(manifest: SkyboxManifest): this;
    setGeometry(options: SkyboxGeometryOptions): this;
    setBakeOptions(options: SkyboxBakeOptions): this;
    setRenderer(renderer: SupportedRenderer | null): this;
    setRenderMode(mode: SkyboxRenderMode): this;
    otherOverridingSetup(): this;
    load(renderer?: SupportedRenderer): this;
    private applyGeometry;
    private disposeOwnedTexture;
    private replaceMaterial;
    setManifest(manifest: SkyboxManifest): this;
    setBakedTexture(texture: THREE.Texture): this;
    invalidateBakeCache(): this;
    dispose(): void;
}
export {};
