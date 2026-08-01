import type * as THREE from "three";
import type { SkyboxManifestNode, SkyboxMoonParams } from "../../../manifest";
export type MoonBakeTarget = {
    height: number;
    kind: "equirect";
} | {
    kind: "viewport";
    renderHeight: number;
    verticalFovRadians: number;
};
export declare function resolveMoonBakeResolution(params: SkyboxMoonParams, target: MoonBakeTarget): number;
export declare function createMoonBakeKey(params: SkyboxMoonParams, resolution: number): string;
export declare class MoonGpuBakeService {
    #private;
    constructor(renderer: unknown);
    canBake(): boolean;
    bakeLayer(layerId: string, params: SkyboxMoonParams, target: MoonBakeTarget): Promise<THREE.Texture>;
    bakeManifest(nodes: SkyboxManifestNode[], target: MoonBakeTarget): Promise<Map<string, THREE.Texture>>;
    disposeLayer(layerId: string): void;
    dispose(): void;
}
export declare function createMoonGpuBakeService(renderer: unknown): MoonGpuBakeService | null;
