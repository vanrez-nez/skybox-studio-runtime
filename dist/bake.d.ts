import type { SkyboxBakeOptions, SkyboxManifest } from "./manifest";
export declare const DEFAULT_BAKE_WIDTH = 1024;
export declare const RUNTIME_VERSION = "0.1.0";
export type BakedSkyboxImageData = {
    data: Uint8ClampedArray<ArrayBuffer>;
    height: number;
    width: number;
};
export type BakeCacheKeyOptions = Required<Pick<SkyboxBakeOptions, "width" | "height" | "dpr">> & {
    targetGroupId?: string;
};
export declare function resolveBakeOptions(options?: SkyboxBakeOptions): {
    cache: boolean;
    dpr: number;
    height: number;
    targetGroupId: string | undefined;
    width: number;
};
export declare function createBakeCacheKey(manifest: SkyboxManifest, options: BakeCacheKeyOptions): string;
export declare function invalidateBakeCache(): void;
export declare function bakeSkyboxImageData(manifest: SkyboxManifest, options?: SkyboxBakeOptions): BakedSkyboxImageData;
