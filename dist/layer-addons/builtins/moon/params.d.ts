import type { SkyboxMoonParams, SkyboxMoonStyle } from "../../../manifest";
export declare const MOON_RESOLUTION_MIN = 128;
export declare const MOON_RESOLUTION_MAX = 2048;
export declare const DEFAULT_MOON_SPRITE_ANGULAR_SIZE: number;
export declare const STYLE_EXPOSURE: Record<SkyboxMoonStyle, number>;
type LegacyMoonParams = Partial<SkyboxMoonParams> & {
    ambient?: number;
    earthshine?: number;
    lightIntensity?: number;
};
export declare function createDefaultSkyboxMoonParams(centerDirection?: [number, number, number]): SkyboxMoonParams;
export declare function cloneSkyboxMoonParams(params: SkyboxMoonParams): SkyboxMoonParams;
export declare function normalizeSkyboxMoonParams(value: LegacyMoonParams | null | undefined): SkyboxMoonParams;
export type MoonBakeParams = SkyboxMoonParams & {
    resolution: number;
};
export {};
