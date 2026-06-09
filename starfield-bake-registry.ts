// Injection point that keeps the heavy starfield-generation code out of the core bundle.
//
// The live `Skybox` (core) needs to bake starfield textures on the GPU, but the procedural
// star/nebula catalog + WGSL render (`starfield-static` + `starfield-gpu-bake`, ~44 KB) is large.
// Instead of the core statically importing it, the `skybox-studio-runtime/starfield` entry registers
// a factory here on import. A consumer that renders starfields imports that entry once; a consumer
// that never uses starfields never pulls the generation code.
import type { SupportedRenderer } from "./skybox/types";
import type { StarfieldGpuBakeService } from "./starfield-gpu-bake";

type StarfieldBakeServiceFactory = (
  renderer: SupportedRenderer | null
) => StarfieldGpuBakeService | null;

let starfieldBakeServiceFactory: StarfieldBakeServiceFactory | null = null;

/** Called (once) by the `skybox-studio-runtime/starfield` entry to enable starfield baking. */
export function registerStarfieldBakeServiceFactory(factory: StarfieldBakeServiceFactory) {
  starfieldBakeServiceFactory = factory;
}

/**
 * Create a starfield bake service for `renderer`, or `null` when the starfield-generation entry has
 * not been imported (in which case starfield layers simply don't bake — a graceful no-op).
 */
export function createStarfieldBakeService(
  renderer: SupportedRenderer | null
): StarfieldGpuBakeService | null {
  return starfieldBakeServiceFactory ? starfieldBakeServiceFactory(renderer) : null;
}
