// Public entry: `skybox-studio-runtime/starfield`.
//
// Importing this enables starfield *generation*. It (1) registers the GPU bake-service factory so the
// live `Skybox` can bake starfield textures, (2) registers the CPU starfield sampler used by
// `evaluateSkyboxDirection` / CPU baking, and (3) re-exports the procedural catalog + param helpers.
//
// Consumers that render or bake starfields import this once (e.g. the editor). Consumers that never
// use starfields never pull the ~44 KB of generation code (`starfield-static` + `starfield-gpu-bake`)
// into their core bundle — it lives only in this entry's chunk.
import { clamp, type Rgb, type Rgba } from "./math";
import type { SkyboxStarfieldParams } from "./manifest";
import { mixRgba, sampleStarfieldBakedPixel } from "./layer-addons/cpu-sampling";
import { registerLayerRuntimeAdapter } from "./layer-addons/registry";
import { registerStarfieldBakeServiceFactory } from "./baking/starfield-bake-registry";
import { createStarfieldGpuBakeService } from "./baking/starfield-gpu-bake";
import {
  sampleStarfieldLayer,
  sourceUvFromDirection,
  type StarfieldBakeData,
} from "./starfield-static";

function sampleStarfield(
  layerId: string,
  direction: Rgb,
  params: SkyboxStarfieldParams,
  options: { sampleHeight?: number; starfieldBakes?: Map<string, StarfieldBakeData> } = {}
): Rgba {
  const bakedImage = options.starfieldBakes?.get(layerId);

  if (bakedImage) {
    const uv = sourceUvFromDirection(direction);
    const imageX = (((uv.u % 1) + 1) % 1) * bakedImage.width - 0.5;
    const imageY = clamp(uv.v, 0, 1) * bakedImage.height - 0.5;
    const x0 = Math.floor(imageX);
    const y0 = Math.floor(imageY);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const tx = imageX - x0;
    const ty = imageY - y0;
    const top = mixRgba(
      sampleStarfieldBakedPixel(bakedImage, x0, y0),
      sampleStarfieldBakedPixel(bakedImage, x1, y0),
      tx
    );
    const bottom = mixRgba(
      sampleStarfieldBakedPixel(bakedImage, x0, y1),
      sampleStarfieldBakedPixel(bakedImage, x1, y1),
      tx
    );

    return mixRgba(top, bottom, ty);
  }

  return sampleStarfieldLayer(direction, params, { sampleHeight: options.sampleHeight });
}

// Enable live GPU baking (the core `Skybox` reads this factory through `starfield-bake-registry`).
registerStarfieldBakeServiceFactory(createStarfieldGpuBakeService);

// Merge the CPU sampler into the starfield adapter (the core registered its WGSL/live half).
registerLayerRuntimeAdapter({
  type: "starfield",
  sampleCpu: (direction, params, context) =>
    sampleStarfield(context.layerId, direction, params as SkyboxStarfieldParams, {
      sampleHeight: context.sampleHeight,
      starfieldBakes: context.starfieldBakes,
    }),
});

export { createStarfieldGpuBakeService, StarfieldGpuBakeService } from "./baking/starfield-gpu-bake";
export {
  bakeStarfieldImageData,
  createStarCatalogForCoverage,
  createStarCatalogForDescriptor,
  createStarfieldBakeCacheKey,
  createStarfieldPatchLayout,
  DEFAULT_STARFIELD_CLIP,
  DEFAULT_STARFIELD_NEBULA,
  DEFAULT_STARFIELD_NEBULA_FIELD,
  DEFAULT_STARFIELD_PARAMS,
  DEFAULT_STARFIELD_QUALITY,
  DEFAULT_STARFIELD_STARS,
  getStarfieldQualityPreset,
  normalizeStarfieldCoverage,
  normalizeStarfieldQuality,
  qFromV,
  normalizeStarfieldParams,
  sampleStarfieldLayer,
  sourceDirectionFromUv,
  sourceFoldEquirectUv,
  sourceUvFromDirection,
  STARFIELD_PREVIEW_BAKE_WIDTH,
  STARFIELD_QUALITY_PRESETS,
  starfieldFieldGradientToSourceField,
  starfieldClipContainsDirection,
  type StarfieldBakeData,
  type StarfieldCoverage,
  type StarfieldPatchDescriptor,
  type StarfieldPatchLayout,
} from "./starfield-static";
