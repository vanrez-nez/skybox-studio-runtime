import { type Rgb, type Rgba } from "../../math";
import type { SkyboxStarfieldParams } from "../../manifest";
import { type StarfieldBakeData } from "../../starfield-static";
export declare function sampleStarfield(layerId: string, direction: Rgb, params: SkyboxStarfieldParams, options?: {
    sampleHeight?: number;
    starfieldBakes?: Map<string, StarfieldBakeData>;
}): Rgba;
