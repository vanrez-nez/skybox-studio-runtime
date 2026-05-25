import { type Rgb } from "./math";
import type { SkyboxManifest, SkyboxManifestNode } from "./manifest";
export declare function equirectPointToDirection(x: number, y: number): Rgb;
export declare function equirectUvToDirection(x: number, y: number): Rgb;
export declare function composeNodes(direction: Rgb, nodes: SkyboxManifestNode[]): Rgb;
export declare function evaluateSkyboxDirection(manifest: SkyboxManifest, direction: Rgb, options?: {
    targetGroupId?: string;
}): Rgb;
