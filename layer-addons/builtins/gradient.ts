import type { Rgb, Rgba } from "../../math";
import type { SkyboxGradientParams } from "../../manifest";
import { prepareStops, sampleGradient } from "../cpu-sampling";
import { registerLayerRuntimeAdapter } from "../registry";

function getLinearGradientAxis(rotation: number): Rgb {
  const radians = (rotation * Math.PI) / 180;

  return [Math.sin(radians), Math.cos(radians), 0];
}

export function sampleGradientLayer(direction: Rgb, params: SkyboxGradientParams): Rgba {
  const axis = getLinearGradientAxis(params.rotation);
  const dot = direction[0] * axis[0] + direction[1] * axis[1] + direction[2] * axis[2];

  return sampleGradient(prepareStops(params.stops), dot * 0.5 + 0.5);
}

registerLayerRuntimeAdapter({
  type: "gradient",
  sampleCpu: (direction, params) => sampleGradientLayer(direction, params as SkyboxGradientParams),
  updateLive: (context, layer) => context.applyLayerParams(layer),
});
