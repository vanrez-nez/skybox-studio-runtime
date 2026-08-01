import * as THREE from "three";
import type { SkyboxStarfieldParams } from "../manifest";
import { type StarfieldBakeData, type StarfieldPatchDescriptor } from "../starfield-static";
type StarfieldGpuRenderer = {
    autoClear: boolean;
    clear: () => void;
    getClearAlpha: () => number;
    getClearColor: (target: THREE.Color) => THREE.Color;
    getRenderTarget: () => THREE.RenderTarget | null;
    readRenderTargetPixels?: (renderTarget: THREE.RenderTarget, x: number, y: number, width: number, height: number, buffer: Uint8Array) => void;
    readRenderTargetPixelsAsync?: (renderTarget: THREE.RenderTarget, x: number, y: number, width: number, height: number) => Promise<ArrayBufferView>;
    render: (scene: THREE.Scene, camera: THREE.Camera) => void;
    setClearColor: (color: THREE.ColorRepresentation, alpha?: number) => void;
    setRenderTarget: (target: THREE.RenderTarget | null) => void;
};
export type StarGlintViewport = {
    renderHeight: number;
    verticalFovRadians: number;
};
export declare function starGlintScalesFor(viewport: StarGlintViewport | null | undefined, outputHeight: number): {
    displayPixelAngle: number;
    screenPixelScale: number;
};
export type StarfieldGpuPatchTexture = {
    descriptor: StarfieldPatchDescriptor;
    nebulaTexture: THREE.Texture;
    starTexture: THREE.Texture;
};
export type StarfieldGpuPatchTextureSet = {
    key: string;
    patches: StarfieldGpuPatchTexture[];
};
export type StarfieldGlintHandle = {
    object: THREE.Object3D;
    /** Push the live viewport so glints stay a fixed logical-pixel size across FOV/DPR/resize. */
    setViewport: (viewport: StarGlintViewport | null) => void;
    /** Update per-star appearance uniforms in place (no geometry rebuild) for live slider tweaks. */
    setParams: (params: SkyboxStarfieldParams) => void;
    /** @deprecated Star cores now compose inside their Starfield layer. Kept for API compatibility. */
    setCoverageTexture: (texture: THREE.Texture | null) => void;
    dispose: () => void;
};
export declare function starfieldGlintGeometryKey(params: SkyboxStarfieldParams): string;
export declare function createStarfieldGlints(params: SkyboxStarfieldParams): StarfieldGlintHandle;
export declare function createStarfieldPatchMeshGroup(patchSet: StarfieldGpuPatchTextureSet, params: SkyboxStarfieldParams): THREE.Group<THREE.Object3DEventMap>;
export declare function disposeStarfieldPatchMeshGroup(group: THREE.Group): void;
export declare function createStarfieldFinalPatchGeometryRanges(descriptor: StarfieldPatchDescriptor): {
    skyV0: number;
    skyV1: number;
    end: number;
    offset: number;
    start: number;
}[];
export declare function starfieldDisplayPixelAngleForHeight(height: number): number;
export declare class StarfieldGpuBakeService {
    #private;
    constructor(renderer: StarfieldGpuRenderer);
    createBakeKey(paramsInput: SkyboxStarfieldParams, width?: number, viewport?: StarGlintViewport | null, options?: {
        starsOmitted?: boolean;
    }): string;
    previewWidthFor(_paramsInput: SkyboxStarfieldParams): number;
    bakeTexture(paramsInput: SkyboxStarfieldParams, key?: string, width?: number, viewport?: StarGlintViewport | null, options?: {
        starsOmitted?: boolean;
    }): THREE.Texture<unknown, THREE.TextureEventMap>;
    createGlints(paramsInput: SkyboxStarfieldParams): StarfieldGlintHandle;
    glintGeometryKey(paramsInput: SkyboxStarfieldParams): string;
    bakePatchTextures(paramsInput: SkyboxStarfieldParams, key?: string, width?: number, viewport?: StarGlintViewport | null): StarfieldGpuPatchTextureSet;
    bakeImageData(paramsInput: SkyboxStarfieldParams, key?: string, width?: number, viewport?: StarGlintViewport | null): Promise<StarfieldBakeData>;
    canBake(): boolean;
    dispose(): void;
}
export declare function createStarfieldGpuBakeService(renderer: unknown): StarfieldGpuBakeService | null;
export {};
