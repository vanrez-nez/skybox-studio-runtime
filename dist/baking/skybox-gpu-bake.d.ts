import * as THREE from "three";
import type { BakedSkyboxImageData } from "./bake";
import { type SkyboxManifest } from "../manifest";
export type SkyboxGpuBakeOptions = {
    /** When true (and `hdr`), bake into a full 32-bit float target instead of 16-bit half-float. */
    float?: boolean;
    /** When true, vertically pre-flip the bake (the EXR exporter flips scanlines unconditionally). */
    flipY?: boolean;
    /** When true, bake into a linear float target (for HDR/EXR export). */
    hdr?: boolean;
    height: number;
    imageTextures?: Map<string, THREE.Texture>;
    cloudFieldTextures?: Map<string, THREE.Texture>;
    starfieldTextures?: Map<string, THREE.Texture>;
    width: number;
};
export type SkyboxGpuBakeTarget = {
    /** Dispose the render target + bake material. Call once done reading the target. */
    dispose: () => void;
    height: number;
    target: THREE.RenderTarget;
    width: number;
};
type SkyboxGpuBakeRenderer = {
    autoClear: boolean;
    clear: () => void;
    getClearAlpha: () => number;
    getClearColor: (target: THREE.Color) => THREE.Color;
    getRenderTarget: () => THREE.RenderTarget | null;
    readRenderTargetPixels?: (renderTarget: THREE.RenderTarget, x: number, y: number, width: number, height: number, buffer: ArrayBufferView) => void;
    readRenderTargetPixelsAsync?: (renderTarget: THREE.RenderTarget, x: number, y: number, width: number, height: number) => Promise<ArrayBufferView>;
    render: (scene: THREE.Scene, camera: THREE.Camera) => void;
    setClearColor: (color: THREE.ColorRepresentation, alpha?: number) => void;
    setRenderTarget: (target: THREE.RenderTarget | null) => void;
};
/**
 * Renders the full layer composition once into an equirectangular render target on the GPU and
 * reads the pixels back. This replaces the CPU per-pixel/per-layer bake for the editor export,
 * reusing the same composition shader the live viewport uses (`createWebGpuEquirectBakeMaterial`).
 */
export declare class SkyboxGpuBakeService {
    #private;
    constructor(renderer: SkyboxGpuBakeRenderer);
    canBake(): boolean;
    /**
     * Renders the composition into an equirect render target and returns it WITHOUT disposing, so a
     * caller (e.g. the EXR exporter) can read the texture. The caller MUST call `dispose()`.
     * Pass `hdr: true` for a linear half-float target; otherwise an 8-bit sRGB target.
     */
    bakeRenderTarget(manifest: SkyboxManifest, options: SkyboxGpuBakeOptions): SkyboxGpuBakeTarget;
    bakeImageData(manifest: SkyboxManifest, options: SkyboxGpuBakeOptions): Promise<BakedSkyboxImageData>;
    dispose(): void;
}
export declare function createSkyboxGpuBakeService(renderer: unknown): SkyboxGpuBakeService | null;
export {};
