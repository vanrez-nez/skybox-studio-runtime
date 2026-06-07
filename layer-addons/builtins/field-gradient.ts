import { clamp, parseHexColor, type Rgb, type Rgba } from "../../math";
import type { SkyboxFieldGradientParams } from "../../manifest";
import { angularFieldDistance, equirectPointToDirection, warpDirection } from "../cpu-sampling";
import { registerLayerRuntimeAdapter } from "../registry";

export function sampleFieldGradientLayer(
  direction: Rgb,
  params: SkyboxFieldGradientParams
): Rgba {
  if (params.anchors.length === 0) {
    return [0, 0, 0, 0];
  }

  const fieldDirection = warpDirection(
    direction,
    clamp(params.amplitude, 0, 0.6),
    Math.max(0.0001, params.frequency)
  );
  let red = 0;
  let green = 0;
  let blue = 0;
  let weightSum = 0;

  params.anchors.forEach((anchor) => {
    const distance = angularFieldDistance(
      fieldDirection,
      equirectPointToDirection(anchor.x, anchor.y)
    );
    const weight =
      params.mode === "gaussian"
        ? Math.exp(-(distance * distance) / (2 * (0.46 / params.power) ** 2))
        : 1 / (distance + 0.0005) ** params.power;
    const color = parseHexColor(anchor.color);

    red += color[0] * weight;
    green += color[1] * weight;
    blue += color[2] * weight;
    weightSum += weight;
  });

  if (weightSum <= 0) {
    return [0, 0, 0, 0];
  }

  return [red / weightSum, green / weightSum, blue / weightSum, 1];
}

registerLayerRuntimeAdapter({
  type: "field-gradient",
  sampleCpu: (direction, params) =>
    sampleFieldGradientLayer(direction, params as SkyboxFieldGradientParams),
  updateLive: (context, layer) => context.applyLayerParams(layer),
});
