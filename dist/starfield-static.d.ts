import { type Rgb, type Rgba } from "./math";
import type { SkyboxFieldGradientParams, SkyboxStarfieldClipParams, SkyboxStarfieldNebulaParams, SkyboxStarfieldParams, SkyboxStarfieldQuality, SkyboxStarfieldStarsParams } from "./manifest";
export declare const STARFIELD_PREVIEW_BAKE_WIDTH = 8192;
export declare const DEFAULT_STARFIELD_QUALITY: SkyboxStarfieldQuality;
export declare const STARFIELD_QUALITY_PRESETS: Record<SkyboxStarfieldQuality, {
    budgetBytes: number;
}>;
export declare const DEFAULT_STARFIELD_STARS: SkyboxStarfieldStarsParams;
export declare const DEFAULT_STARFIELD_NEBULA: SkyboxStarfieldNebulaParams;
export declare const DEFAULT_STARFIELD_NEBULA_FIELD: SkyboxFieldGradientParams;
export declare const DEFAULT_STARFIELD_CLIP: SkyboxStarfieldClipParams;
export declare const DEFAULT_STARFIELD_PARAMS: SkyboxStarfieldParams;
export type StarfieldBakeData = {
    data: Uint8ClampedArray<ArrayBuffer>;
    height: number;
    width: number;
};
export type StarfieldCoverage = {
    altitudeSpanRad: number;
    azimuthSpanRad: number;
    config: SkyboxStarfieldClipParams;
    fraction: number;
    uvMin: {
        x: number;
        y: number;
    };
    uvSize: {
        x: number;
        y: number;
    };
    wrapsHorizontally: boolean;
};
export type StarfieldPatchDescriptor = {
    hasBottomNeighbor: boolean;
    hasLeftNeighbor: boolean;
    hasRightNeighbor: boolean;
    hasTopNeighbor: boolean;
    id: string;
    innerOffset: {
        x: number;
        y: number;
    };
    innerScale: {
        x: number;
        y: number;
    };
    storageGuard: {
        x: number;
        y: number;
    };
    storageSize: {
        height: number;
        width: number;
    };
    storageUvMin: {
        x: number;
        y: number;
    };
    storageUvSize: {
        x: number;
        y: number;
    };
    uvMin: {
        x: number;
        y: number;
    };
    uvSize: {
        x: number;
        y: number;
    };
    wrapS: "clamp" | "repeat";
    wrapT: "clamp" | "repeat";
    x: number;
    y: number;
};
export type StarfieldPatchAllocation = {
    budgetBytes: number;
    budgetExceeded: boolean;
    peakBudgetRatio: number;
    peakBytes: number;
    residentBytes: number;
    scratchBytes: number;
};
export type StarfieldPatchDemand = {
    budgetBytes: number;
    budgetExceeded: boolean;
    effectiveVirtualHeight: number;
    effectiveVirtualWidth: number;
    idealVirtualHeight: number;
    idealVirtualWidth: number;
    peakBytes: number;
    qualityScale: number;
    residentBytes: number;
    scratchBytes: number;
};
export type StarfieldPatchLayout = {
    allocation: StarfieldPatchAllocation | null;
    autoLayout: boolean;
    autoLayoutDemand: StarfieldPatchDemand | null;
    autoLayoutReason: string;
    columns: number;
    contentHeight: number;
    contentWidth: number;
    coverage: SkyboxStarfieldClipParams;
    coverageFraction: number;
    coverageUvMin: {
        x: number;
        y: number;
    };
    coverageUvSize: {
        x: number;
        y: number;
    };
    demand: StarfieldPatchDemand | null;
    descriptors: StarfieldPatchDescriptor[];
    effectiveVirtualHeight: number;
    effectiveVirtualWidth: number;
    guard: number;
    idealPatchHeight: number;
    idealPatchWidth: number;
    idealVirtualHeight: number;
    idealVirtualWidth: number;
    patchCount: number;
    qualityScale: number;
    rows: number;
    storageHeight: number;
    storageWidth: number;
    supersample: number;
    targetTexelsPerPixel: number;
    virtualHeight: number;
    virtualWidth: number;
    wrapsHorizontally: boolean;
};
export type SourceNebulaAnchor = {
    color: Rgb;
    dir: Rgb;
};
export type SourceNebulaField = {
    anchors: SourceNebulaAnchor[];
    blend: "gaussian" | "idw";
    power: number;
    sigma: number;
    warp: {
        amp: number;
        freq: number;
    };
};
type CatalogStar = {
    classId: number;
    column: number;
    rBright: number;
    rColor: number;
    rGlare: number;
    rSize: number;
    rSizeGate: number;
    row: number;
    u: number;
    v: number;
    x: number;
    y: number;
    z: number;
};
export declare function normalizeStarfieldQuality(value: unknown): SkyboxStarfieldQuality;
export declare function getStarfieldQualityPreset(quality: unknown): {
    budgetBytes: number;
};
export declare function sourceDirectionFromUv(u: number, v: number): Rgb;
export declare function sourceFoldEquirectUv(u: number, v: number): {
    u: number;
    v: number;
    x: number;
    y: number;
};
export declare function sourceUvFromDirection(direction: Rgb): {
    u: number;
    v: number;
    x: number;
    y: number;
};
export declare function normalizeStarfieldCoverage(raw?: Partial<SkyboxStarfieldClipParams>): StarfieldCoverage;
export declare function createStarfieldPatchLayout({ accumulationBytes, budgetBytes, clip, height, maxTextureSize, residentBytesPerPixel, width, }: {
    accumulationBytes?: number;
    budgetBytes?: number;
    clip?: Partial<SkyboxStarfieldClipParams>;
    height: number;
    maxTextureSize?: number;
    residentBytesPerPixel?: number;
    width: number;
}): StarfieldPatchLayout;
export declare function normalizeStarfieldNebulaField(raw: unknown): SkyboxFieldGradientParams;
export declare function normalizeStarfieldParams(raw?: Partial<SkyboxStarfieldParams>): SkyboxStarfieldParams;
export declare function starfieldClipContainsDirection(direction: Rgb, clip: SkyboxStarfieldClipParams): boolean;
export declare function qFromV(v: number): number;
export declare function createStarCatalogForCoverage(stars: SkyboxStarfieldStarsParams, coverage: StarfieldCoverage, height: number, options?: {
    includeSeamCopies?: boolean;
}): CatalogStar[];
export declare function createStarCatalogForDescriptor(stars: SkyboxStarfieldStarsParams, descriptor: Pick<StarfieldPatchDescriptor, "storageUvMin" | "storageUvSize">, height: number, options?: {
    includeSeamCopies?: boolean;
}): CatalogStar[];
export declare function starfieldFieldGradientToSourceField(field: SkyboxFieldGradientParams): SourceNebulaField;
export declare function sampleStarfieldLayer(direction: Rgb, rawParams: SkyboxStarfieldParams, options?: {
    sampleHeight?: number;
}): Rgba;
export declare function createStarfieldBakeCacheKey(params: SkyboxStarfieldParams, width: number, height: number, options?: {
    accumulationBytes?: number;
    budgetBytes?: number;
    maxTextureSize?: number;
    residentBytesPerPixel?: number;
    viewport?: {
        verticalFovRadians: number;
        renderHeight: number;
    } | null;
}): string;
export declare function bakeStarfieldImageData(rawParams: SkyboxStarfieldParams, width?: number, height?: number): StarfieldBakeData;
export {};
