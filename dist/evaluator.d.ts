import { type Rgb } from "./math";
import type { SkyboxManifest, SkyboxManifestNode } from "./manifest";
import type { StarfieldBakeData } from "./starfield-static";
import "./layer-addons/builtins";
export { equirectPointToDirection, equirectUvToDirection, } from "./layer-addons/cpu-sampling";
type EvaluateOptions = {
    sampleHeight?: number;
    starfieldBakes?: Map<string, StarfieldBakeData>;
    targetGroupId?: string;
};
export declare function composeNodes(direction: Rgb, nodes: SkyboxManifestNode[], options?: EvaluateOptions): Rgb;
export declare function evaluateSkyboxDirection(manifest: SkyboxManifest, direction: Rgb, options?: EvaluateOptions): Rgb;
