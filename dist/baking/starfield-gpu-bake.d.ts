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
export type StarfieldGpuPatchTexture = {
    descriptor: StarfieldPatchDescriptor;
    nebulaTexture: THREE.Texture;
    starTexture: THREE.Texture;
};
export type StarfieldGpuPatchTextureSet = {
    key: string;
    patches: StarfieldGpuPatchTexture[];
};
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
    createBakeKey(paramsInput: SkyboxStarfieldParams, width?: number): string;
    previewWidthFor(_paramsInput: SkyboxStarfieldParams): number;
    bakeTexture(paramsInput: SkyboxStarfieldParams, key?: string, width?: number): THREE.Texture<unknown, THREE.TextureEventMap>;
    bakePatchTextures(paramsInput: SkyboxStarfieldParams, key?: string, width?: number): StarfieldGpuPatchTextureSet;
    bakeImageData(paramsInput: SkyboxStarfieldParams, key?: string, width?: number): Promise<StarfieldBakeData>;
    canBake(): boolean;
    dispose(): void;
}
export declare function createStarfieldGpuBakeService(renderer: unknown): StarfieldGpuBakeService | null;
export {};
