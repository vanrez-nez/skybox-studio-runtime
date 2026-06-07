import { clamp, type Rgb, type Rgba } from "../../math";
import type { SkyboxStarfieldParams } from "../../manifest";
import { sampleStarfieldLayer, sourceUvFromDirection, type StarfieldBakeData } from "../../starfield-static";
import { mixRgba, sampleStarfieldBakedPixel } from "../cpu-sampling";
import { registerLayerRuntimeAdapter } from "../registry";

export function sampleStarfield(
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

registerLayerRuntimeAdapter({
  type: "starfield",
  sampleCpu: (direction, params, context) =>
    sampleStarfield(context.layerId, direction, params as SkyboxStarfieldParams, {
      sampleHeight: context.sampleHeight,
      starfieldBakes: context.starfieldBakes,
    }),
  updateLive: (context, layer) => {
    context.applyLayerParams(layer);
    context.scheduleResourceBake(layer.id, layer.params);
  },
});
