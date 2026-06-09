// Gradient-stop helpers shared by the gradient and spot layers (both interpolate color stops).
import * as THREE from "three";

import { clamp, parseHexColor } from "../math";
import type { SkyboxGradientParams } from "../manifest";

export function sortedGradientStops(params: { stops: SkyboxGradientParams["stops"] }) {
  return [...params.stops]
    .map((stop) => ({
      color: stop.color,
      midpoint: clamp((stop.midpoint ?? 50) / 100, 0.01, 0.99),
      opacity: clamp(stop.opacity / 100),
      t: clamp(stop.location / 100),
    }))
    .sort((firstStop, secondStop) => firstStop.t - secondStop.t);
}

export function colorVectorFromStop(stop: ReturnType<typeof sortedGradientStops>[number]) {
  const [red, green, blue] = parseHexColor(stop.color);

  return new THREE.Vector4(red, green, blue, stop.opacity);
}
