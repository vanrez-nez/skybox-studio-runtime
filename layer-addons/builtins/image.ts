import type { Rgb, Rgba } from "../../math";
import type { SkyboxImageParams } from "../../manifest";
import { projectDirectionToImageUv } from "../../image-placement-transform";
import { mixRgba, sampleImagePixel } from "../cpu-sampling";
import { registerLayerRuntimeAdapter } from "../registry";

export function sampleImageLayer(direction: Rgb, params: SkyboxImageParams): Rgba {
  const placement = params.placement;

  if (!placement || !params.pixels || params.width <= 0 || params.height <= 0) {
    return [0, 0, 0, 0];
  }

  const uv = projectDirectionToImageUv(direction, placement);

  if (!uv) {
    return [0, 0, 0, 0];
  }

  const { u, v } = uv;

  if (u < 0 || u > 1 || v < 0 || v > 1) {
    return [0, 0, 0, 0];
  }

  const imageX = u * (params.width - 1);
  const imageY = v * (params.height - 1);
  const x0 = Math.floor(imageX);
  const y0 = Math.floor(imageY);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = imageX - x0;
  const ty = imageY - y0;
  const top = mixRgba(sampleImagePixel(params, x0, y0), sampleImagePixel(params, x1, y0), tx);
  const bottom = mixRgba(sampleImagePixel(params, x0, y1), sampleImagePixel(params, x1, y1), tx);

  return mixRgba(top, bottom, ty);
}

registerLayerRuntimeAdapter({
  type: "image",
  sampleCpu: (direction, params) => sampleImageLayer(direction, params as SkyboxImageParams),
  updateLive: (context, layer) =>
    context.applyImagePlacement(layer.id, (layer.params as SkyboxImageParams).placement),
});
