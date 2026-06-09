import type { SupportedRenderer } from "../skybox/types";
import type { StarfieldGpuBakeService } from "./starfield-gpu-bake";
type StarfieldBakeServiceFactory = (renderer: SupportedRenderer | null) => StarfieldGpuBakeService | null;
/** Called (once) by the `skybox-studio-runtime/starfield` entry to enable starfield baking. */
export declare function registerStarfieldBakeServiceFactory(factory: StarfieldBakeServiceFactory): void;
/**
 * Create a starfield bake service for `renderer`, or `null` when the starfield-generation entry has
 * not been imported (in which case starfield layers simply don't bake — a graceful no-op).
 */
export declare function createStarfieldBakeService(renderer: SupportedRenderer | null): StarfieldGpuBakeService | null;
export {};
