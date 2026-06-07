import { clamp, parseHexColor, type Rgb, type Rgba } from "../../math";
import type { SkyboxSpotParams } from "../../manifest";
import { normalizeSpotParams } from "../../spot-transform";
import {
  addRgb,
  colorizeLight,
  dotDirection,
  mixRgb,
  normalizeDirection,
  prepareStops,
  projectDirectionToSpotLocal,
  sampleGradient,
  scaleRgb,
  smoothstep,
  spectrum,
  sq,
} from "../cpu-sampling";
import { registerLayerRuntimeAdapter } from "../registry";

export function sampleSpotLayer(direction: Rgb, params: SkyboxSpotParams): Rgba {
  const spot = normalizeSpotParams(params);
  const sampleDirection = normalizeDirection(direction);
  const centerDirection = normalizeDirection(spot.centerDirection);
  const dot = dotDirection(sampleDirection, centerDirection);
  const angularDistance = Math.acos(clamp(dot, -1, 1));
  const radius = Math.max(spot.angularRadius, 0.0001);
  const t = angularDistance / radius;

  if (spot.colorMode === "gradient") {
    if (t > 1) {
      return [0, 0, 0, 0];
    }

    return sampleGradient(prepareStops(spot.stops), t);
  }

  const spotLocal = projectDirectionToSpotLocal(direction, centerDirection, radius);
  const spotD = spotLocal.d;
  const lightColor = parseHexColor(spot.lightColor);
  const globalIntensity = spot.brightness;
  const core = Math.pow(clamp(1 - spotD / spot.coreRadius), spot.coreSoftness);
  const glow = Math.pow(clamp(1 - spotD / spot.glowSize), 2) * spot.glowStrength;
  const glare = Math.pow(clamp(1 - spotD / spot.glareSize), 1.15) * spot.glareStrength;
  const monoLight = (core + glow + glare) * globalIntensity;
  let color = scaleRgb(lightColor, monoLight);
  color = addRgb(color, [Math.max(monoLight - 1, 0), Math.max(monoLight - 1, 0), Math.max(monoLight - 1, 0)]);

  const haloInner = Math.max(spot.haloInnerWidth, 0.0001);
  const haloOuter = Math.max(spot.haloOuterWidth, 0.0001);
  const haloDelta = spotD - spot.haloRadius;
  const haloEnvelope = Math.exp(-sq(haloDelta / (haloDelta < 0 ? haloInner : haloOuter)));
  const haloT = clamp((spotD - (spot.haloRadius - haloInner)) / (haloInner + haloOuter));
  const haloColor = colorizeLight(mixRgb([1, 1, 1], spectrum(haloT), spot.dispersion), lightColor);
  const haloLight = haloEnvelope * spot.haloStrength * globalIntensity;
  color = addRgb(color, scaleRgb(haloColor, haloLight));
  color = addRgb(color, scaleRgb([1, 1, 1], Math.max(haloLight - 1.2, 0) * 0.22));

  const axisDistance = Math.abs(spotLocal.y);
  const dogX = Math.abs(spotLocal.x);
  const dogBody =
    Math.exp(-sq((dogX - spot.haloRadius) / Math.max(spot.dogSpread, 0.0001))) *
    Math.exp(-sq(axisDistance / Math.max(spot.dogSpread * 0.72, 0.0001)));
  const dogTail =
    smoothstep(spot.haloRadius, spot.haloRadius + Math.max(spot.dogStretch, 0.0001), dogX) *
    (1 -
      smoothstep(
        spot.haloRadius + Math.max(spot.dogStretch, 0.0001),
        spot.haloRadius + Math.max(spot.dogStretch * 2.2, 0.0001),
        dogX
      )) *
    Math.exp(-sq(axisDistance / Math.max(spot.dogSpread * 0.9, 0.0001)));
  const dogT = clamp((dogX - (spot.haloRadius - spot.dogSpread * 1.4)) / Math.max(spot.dogSpread * 3.5, 0.0001));
  const dogColor = colorizeLight(mixRgb([1, 1, 1], spectrum(dogT), spot.dispersion), lightColor);
  const dogLight = (dogBody + dogTail * 0.28) * spot.dogStrength * globalIntensity;
  color = addRgb(color, scaleRgb(dogColor, dogLight));
  color = addRgb(color, scaleRgb([1, 1, 1], Math.max(dogLight - 1.1, 0) * 0.18));

  const alpha = clamp(Math.max(color[0], color[1], color[2]));

  if (alpha <= 0.00001) {
    return [0, 0, 0, 0];
  }

  return [color[0] / alpha, color[1] / alpha, color[2] / alpha, alpha];
}

registerLayerRuntimeAdapter({
  type: "spot",
  sampleCpu: (direction, params) => sampleSpotLayer(direction, params as SkyboxSpotParams),
  updateLive: (context, layer) => context.applyLayerParams(layer),
});
