// Self-contained spot (light) layer adapter: CPU sampling + WebGPU (TSL) + WebGL (GLSL) optical
// shader (core/glow/glare/halo/sun-dogs/gradient modes). Editor selection-rect overlay shaders are
// imported from `skybox/editor-presentation`; gradient-stop + color helpers from `skybox/{stops,colors}`.
import * as THREE from "three";
import { uniform, vec2 } from "three/tsl";

import { clamp, parseHexColor, type Rgb, type Rgba } from "../../math";
import type {
  SkyboxManifestLayer,
  SkyboxManifestNode,
  SkyboxSpotParams,
} from "../../manifest";
import { normalizeSpotParams } from "../../spot-transform";
import { colorVectorFromHex } from "../../skybox/colors";
import { webGpuSpotEditorRectInfoFunction } from "../../skybox/editor-presentation";
import { colorVectorFromStop, sortedGradientStops } from "../../skybox/stops";
import type {
  BuiltInWebGpuLayerAdapter,
  SpotLayerShaderBinding,
  SpotUniformNodes,
} from "../../skybox/types";
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
import { mutableDeclaration, zeroEffectExpression } from "../shader-codegen";
import type { WebGpuLayerAdapter } from "../types";

// --- CPU sampling ---

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

// --- Shared GPU helpers ---

function spotColorModeValue(mode: SkyboxSpotParams["colorMode"]) {
  return mode === "gradient" ? 1 : 0;
}

function spotShaderValues(params: SkyboxSpotParams) {
  const spot = normalizeSpotParams(params);

  return {
    brightness: Math.max(0, spot.brightness),
    centerDirection: new THREE.Vector3(...spot.centerDirection).normalize(),
    coreRadius: spot.coreRadius,
    coreSoftness: spot.coreSoftness,
    dispersion: spot.dispersion,
    dogSpread: spot.dogSpread,
    dogStrength: spot.dogStrength,
    dogStretch: spot.dogStretch,
    glareSize: spot.glareSize,
    glareStrength: spot.glareStrength,
    glowSize: spot.glowSize,
    glowStrength: spot.glowStrength,
    haloInnerWidth: spot.haloInnerWidth,
    haloOuterWidth: spot.haloOuterWidth,
    haloRadius: spot.haloRadius,
    haloStrength: spot.haloStrength,
    lightColor: colorVectorFromHex(spot.lightColor),
    mode: spotColorModeValue(spot.colorMode),
    radius: Math.max(0.0001, spot.angularRadius),
    stops: sortedGradientStops(spot),
  };
}

// --- WebGPU (TSL) uniform nodes ---

function createSpotUniformNodes(bindings: SpotLayerShaderBinding[]) {
  return bindings.map((binding): SpotUniformNodes => {
    const values = spotShaderValues(binding.layer.params);

    return {
      brightness: uniform(values.brightness),
      centerDirection: uniform(values.centerDirection),
      coreRadius: uniform(values.coreRadius),
      coreSoftness: uniform(values.coreSoftness),
      dispersion: uniform(values.dispersion),
      dogSpread: uniform(values.dogSpread),
      dogStrength: uniform(values.dogStrength),
      dogStretch: uniform(values.dogStretch),
      glareSize: uniform(values.glareSize),
      glareStrength: uniform(values.glareStrength),
      glowSize: uniform(values.glowSize),
      glowStrength: uniform(values.glowStrength),
      haloInnerWidth: uniform(values.haloInnerWidth),
      haloOuterWidth: uniform(values.haloOuterWidth),
      haloRadius: uniform(values.haloRadius),
      haloStrength: uniform(values.haloStrength),
      layerId: binding.layer.id,
      lightColor: uniform(values.lightColor),
      mode: uniform(values.mode),
      radius: uniform(values.radius),
      stops: Array.from({ length: binding.stopCount }, (_, stopIndex) => {
        const stop = values.stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

        return {
          color: uniform(colorVectorFromStop(stop)),
          midpoint: uniform(stop.midpoint),
          t: uniform(stop.t),
        };
      }),
    };
  });
}

function applySpotLayerParamsToUniformNodes(
  uniforms: SpotUniformNodes[],
  layer: Extract<SkyboxManifestLayer, { type: "spot" }>
) {
  const spotUniforms = uniforms.find((nextUniforms) => nextUniforms.layerId === layer.id);

  if (!spotUniforms) {
    return;
  }

  const values = spotShaderValues(layer.params);

  (spotUniforms.brightness as any).value = values.brightness;
  (spotUniforms.centerDirection as any).value.copy(values.centerDirection);
  (spotUniforms.coreRadius as any).value = values.coreRadius;
  (spotUniforms.coreSoftness as any).value = values.coreSoftness;
  (spotUniforms.dispersion as any).value = values.dispersion;
  (spotUniforms.dogSpread as any).value = values.dogSpread;
  (spotUniforms.dogStrength as any).value = values.dogStrength;
  (spotUniforms.dogStretch as any).value = values.dogStretch;
  (spotUniforms.glareSize as any).value = values.glareSize;
  (spotUniforms.glareStrength as any).value = values.glareStrength;
  (spotUniforms.glowSize as any).value = values.glowSize;
  (spotUniforms.glowStrength as any).value = values.glowStrength;
  (spotUniforms.haloInnerWidth as any).value = values.haloInnerWidth;
  (spotUniforms.haloOuterWidth as any).value = values.haloOuterWidth;
  (spotUniforms.haloRadius as any).value = values.haloRadius;
  (spotUniforms.haloStrength as any).value = values.haloStrength;
  (spotUniforms.lightColor as any).value.copy(values.lightColor);
  (spotUniforms.mode as any).value = values.mode;
  (spotUniforms.radius as any).value = values.radius;
  spotUniforms.stops.forEach((stopUniforms, stopIndex) => {
    const stop = values.stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

    (stopUniforms.color as any).value.copy(colorVectorFromStop(stop));
    (stopUniforms.midpoint as any).value = stop.midpoint;
    (stopUniforms.t as any).value = stop.t;
  });
}

// --- Binding collection ---

function collectSpotLayerBindings(nodes: SkyboxManifestNode[]) {
  const bindings: SpotLayerShaderBinding[] = [];

  function collect(nextNodes: SkyboxManifestNode[]) {
    nextNodes.forEach((node) => {
      if (!node.enabled) {
        return;
      }

      if (node.type === "group") {
        collect(node.children);
        return;
      }

      if (node.type === "spot") {
        const index = bindings.length;

        bindings.push({
          index,
          layer: node,
          parameterPrefix: `spotLayer${index}`,
          stopCount: node.params.stops.length,
        });
      }
    });
  }

  collect(nodes);

  return bindings;
}

// --- Sample expression (shared GLSL + WGSL codegen) ---

function spotGradientSampleExpression(binding: SpotLayerShaderBinding) {
  const branches = Array.from({ length: Math.max(0, binding.stopCount - 1) }, (_, index) => {
    const currentStopT = `${binding.parameterPrefix}StopT${index}`;
    const nextStopT = `${binding.parameterPrefix}StopT${index + 1}`;
    const localT = `spotLocalT${index}`;
    const segmentMidpoint = `spotSegmentMidpoint${index}`;
    const midpointT = `spotMidpointT${index}`;
    const midpointUniform = `${binding.parameterPrefix}StopMidpoint${index}`;
    const lowerMidpoint = `${localT} / max(${segmentMidpoint} * 2.0, 0.00001)`;
    const upperMidpoint = `0.5 + (${localT} - ${segmentMidpoint}) / max((1.0 - ${segmentMidpoint}) * 2.0, 0.00001)`;
    const midpointExpression = `select(${upperMidpoint}, ${lowerMidpoint}, ${localT} <= ${segmentMidpoint})`;
    const keyword = index === 0 ? "if" : "else if";

    return `${keyword} (spotT <= ${nextStopT}) {
        let ${localT}: f32 = clamp((spotT - ${currentStopT}) / max(${nextStopT} - ${currentStopT}, 0.00001), 0.0, 1.0);
        let ${segmentMidpoint}: f32 = clamp(${midpointUniform}, 0.01, 0.99);
        let ${midpointT}: f32 = ${midpointExpression};
        effectColor = mix(${binding.parameterPrefix}StopColor${index}, ${binding.parameterPrefix}StopColor${index + 1}, ${midpointT});
      }`;
  });
  const lastStopIndex = Math.max(0, binding.stopCount - 1);

  if (binding.stopCount === 0) {
    return "";
  }

  return `if (spotT <= 1.0) {
      ${branches.join("\n")}
      ${branches.length > 0 ? "else" : ""} {
        effectColor = ${binding.parameterPrefix}StopColor${lastStopIndex};
      }
    }`;
}

function spotSampleExpression(binding: SpotLayerShaderBinding) {
  const colorModeCondition = `${binding.parameterPrefix}Mode > 0.5`;
  const gradientBranch = spotGradientSampleExpression(binding);

  return `{
    let spotCenter = normalize(${binding.parameterPrefix}CenterDirection);
    let spotDot = clamp(dot(normalize(direction), spotCenter), -1.0, 1.0);
    let spotT = acos(spotDot) / max(${binding.parameterPrefix}Radius, 0.0001);
    if (${colorModeCondition}) {
      ${gradientBranch || `effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);`}
    } else {
      let spotTangentX = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), spotCenter));
      let spotTangentY = normalize(cross(spotCenter, spotTangentX));
      let spotDenom = max(dot(normalize(direction), spotCenter), 0.000001);
      let spotLocalX = dot(normalize(direction), spotTangentX) / spotDenom / max(${binding.parameterPrefix}Radius, 0.0001);
      let spotLocalY = dot(normalize(direction), spotTangentY) / spotDenom / max(${binding.parameterPrefix}Radius, 0.0001);
      let spotD = length(vec2<f32>(spotLocalX, spotLocalY));

      let spotCore = pow(clamp(1.0 - spotD / ${binding.parameterPrefix}CoreRadius, 0.0, 1.0), ${binding.parameterPrefix}CoreSoftness);
      let spotGlow = pow(clamp(1.0 - spotD / ${binding.parameterPrefix}GlowSize, 0.0, 1.0), 2.0) * ${binding.parameterPrefix}GlowStrength;
      let spotGlare = pow(clamp(1.0 - spotD / ${binding.parameterPrefix}GlareSize, 0.0, 1.0), 1.15) * ${binding.parameterPrefix}GlareStrength;
      let spotMonoLight = (spotCore + spotGlow + spotGlare) * ${binding.parameterPrefix}Brightness;
      ${mutableDeclaration("spotColor", "vec3<f32>", `${binding.parameterPrefix}LightColor * spotMonoLight + vec3<f32>(max(spotMonoLight - 1.0, 0.0))`)}

      let spotHaloInner = max(${binding.parameterPrefix}HaloInnerWidth, 0.0001);
      let spotHaloOuter = max(${binding.parameterPrefix}HaloOuterWidth, 0.0001);
      let spotHaloDelta = spotD - ${binding.parameterPrefix}HaloRadius;
      let spotHaloWidth = select(spotHaloOuter, spotHaloInner, spotHaloDelta < 0.0);
      let spotHaloEnvelope = exp(-pow(spotHaloDelta / spotHaloWidth, 2.0));
      let spotHaloT = clamp((spotD - (${binding.parameterPrefix}HaloRadius - spotHaloInner)) / (spotHaloInner + spotHaloOuter), 0.0, 1.0);
      ${mutableDeclaration("spotSpectrum", "vec3<f32>", `vec3<f32>(1.0, 0.12, 0.05)`)}
      spotSpectrum = mix(spotSpectrum, vec3<f32>(1.0, 0.55, 0.10), smoothstep(0.00, 0.28, spotHaloT));
      spotSpectrum = mix(spotSpectrum, vec3<f32>(1.0, 0.93, 0.60), smoothstep(0.22, 0.45, spotHaloT));
      spotSpectrum = mix(spotSpectrum, vec3<f32>(1.0), smoothstep(0.42, 0.60, spotHaloT));
      spotSpectrum = mix(spotSpectrum, vec3<f32>(0.55, 0.80, 1.0), smoothstep(0.62, 0.85, spotHaloT));
      spotSpectrum = mix(spotSpectrum, vec3<f32>(0.35, 0.50, 1.0), smoothstep(0.85, 1.00, spotHaloT));
      let spotHaloLayerColor = mix(vec3<f32>(1.0), spotSpectrum, ${binding.parameterPrefix}Dispersion);
      let spotHaloTinted = spotHaloLayerColor * mix(vec3<f32>(1.0), ${binding.parameterPrefix}LightColor, 0.82);
      let spotHaloColor = mix(${binding.parameterPrefix}LightColor, spotHaloTinted, 0.82);
      let spotHaloLight = spotHaloEnvelope * ${binding.parameterPrefix}HaloStrength * ${binding.parameterPrefix}Brightness;
      spotColor += spotHaloColor * spotHaloLight + vec3<f32>(max(spotHaloLight - 1.2, 0.0) * 0.22);

      let spotAxisDistance = abs(spotLocalY);
      let spotDogX = abs(spotLocalX);
      let spotDogBody = exp(-pow((spotDogX - ${binding.parameterPrefix}HaloRadius) / max(${binding.parameterPrefix}DogSpread, 0.0001), 2.0)) *
        exp(-pow(spotAxisDistance / max(${binding.parameterPrefix}DogSpread * 0.72, 0.0001), 2.0));
      let spotDogTail = smoothstep(${binding.parameterPrefix}HaloRadius, ${binding.parameterPrefix}HaloRadius + max(${binding.parameterPrefix}DogStretch, 0.0001), spotDogX) *
        (1.0 - smoothstep(${binding.parameterPrefix}HaloRadius + max(${binding.parameterPrefix}DogStretch, 0.0001), ${binding.parameterPrefix}HaloRadius + max(${binding.parameterPrefix}DogStretch * 2.2, 0.0001), spotDogX)) *
        exp(-pow(spotAxisDistance / max(${binding.parameterPrefix}DogSpread * 0.9, 0.0001), 2.0));
      let spotDogT = clamp((spotDogX - (${binding.parameterPrefix}HaloRadius - ${binding.parameterPrefix}DogSpread * 1.4)) / max(${binding.parameterPrefix}DogSpread * 3.5, 0.0001), 0.0, 1.0);
      ${mutableDeclaration("spotDogSpectrum", "vec3<f32>", `vec3<f32>(1.0, 0.12, 0.05)`)}
      spotDogSpectrum = mix(spotDogSpectrum, vec3<f32>(1.0, 0.55, 0.10), smoothstep(0.00, 0.28, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, vec3<f32>(1.0, 0.93, 0.60), smoothstep(0.22, 0.45, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, vec3<f32>(1.0), smoothstep(0.42, 0.60, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, vec3<f32>(0.55, 0.80, 1.0), smoothstep(0.62, 0.85, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, vec3<f32>(0.35, 0.50, 1.0), smoothstep(0.85, 1.00, spotDogT));
      let spotDogLayerColor = mix(vec3<f32>(1.0), spotDogSpectrum, ${binding.parameterPrefix}Dispersion);
      let spotDogTinted = spotDogLayerColor * mix(vec3<f32>(1.0), ${binding.parameterPrefix}LightColor, 0.82);
      let spotDogColor = mix(${binding.parameterPrefix}LightColor, spotDogTinted, 0.82);
      let spotDogLight = (spotDogBody + spotDogTail * 0.28) * ${binding.parameterPrefix}DogStrength * ${binding.parameterPrefix}Brightness;
      spotColor += spotDogColor * spotDogLight + vec3<f32>(max(spotDogLight - 1.1, 0.0) * 0.18);

      let spotAlpha = clamp(max(max(spotColor.r, spotColor.g), spotColor.b), 0.0, 1.0);
      effectColor = vec4<f32>(spotColor / max(spotAlpha, 0.00001), spotAlpha);
    }
  }`;
}

// --- WebGPU adapter (TSL) ---

const spotWebGpuAdapter: BuiltInWebGpuLayerAdapter<"spot", SpotLayerShaderBinding, SpotUniformNodes> = {
  collect: collectSpotLayerBindings,
  createParameterDeclarations: (bindings) =>
    bindings
      .flatMap((binding) => [
        `,
      ${binding.parameterPrefix}CenterDirection: vec3<f32>`,
        `,
      ${binding.parameterPrefix}Radius: f32`,
        `,
      ${binding.parameterPrefix}Mode: f32`,
        `,
      ${binding.parameterPrefix}LightColor: vec3<f32>`,
        `,
      ${binding.parameterPrefix}Brightness: f32`,
        `,
      ${binding.parameterPrefix}CoreRadius: f32`,
        `,
      ${binding.parameterPrefix}CoreSoftness: f32`,
        `,
      ${binding.parameterPrefix}Dispersion: f32`,
        `,
      ${binding.parameterPrefix}DogSpread: f32`,
        `,
      ${binding.parameterPrefix}DogStrength: f32`,
        `,
      ${binding.parameterPrefix}DogStretch: f32`,
        `,
      ${binding.parameterPrefix}GlareSize: f32`,
        `,
      ${binding.parameterPrefix}GlareStrength: f32`,
        `,
      ${binding.parameterPrefix}GlowSize: f32`,
        `,
      ${binding.parameterPrefix}GlowStrength: f32`,
        `,
      ${binding.parameterPrefix}HaloInnerWidth: f32`,
        `,
      ${binding.parameterPrefix}HaloOuterWidth: f32`,
        `,
      ${binding.parameterPrefix}HaloRadius: f32`,
        `,
      ${binding.parameterPrefix}HaloStrength: f32`,
        ...Array.from({ length: binding.stopCount }, (_, stopIndex) => [
          `,
      ${binding.parameterPrefix}StopColor${stopIndex}: vec4<f32>`,
          `,
      ${binding.parameterPrefix}StopMidpoint${stopIndex}: f32`,
          `,
      ${binding.parameterPrefix}StopT${stopIndex}: f32`,
        ]).flat(),
      ])
      .join(""),
  createSampleExpression: (layer, _language, context) => {
    const binding = context.bindingsByLayerId.get(layer.id);

    return binding ? spotSampleExpression(binding) : zeroEffectExpression();
  },
  createSampleNodes: ({ bindings, direction, uniforms }) => ({
    editorProjectionByLayerId: new Map(
      bindings.map((binding) => {
        const spotUniform = uniforms[binding.index];
        const spotInfo = (webGpuSpotEditorRectInfoFunction as any)({
          direction,
          spotCenterDirection: spotUniform.centerDirection,
          spotRadius: spotUniform.radius,
        }) as any;

        return [
          binding.layer.id,
          {
            uv: vec2(spotInfo.x, spotInfo.y),
            valid: spotInfo.z,
          },
        ];
      })
    ),
  }),
  createSampleParameters: (bindings, uniforms) =>
    Object.fromEntries(
      bindings.flatMap((binding) => {
        const spotUniform = uniforms[binding.index];

        return [
          [`${binding.parameterPrefix}CenterDirection`, spotUniform.centerDirection],
          [`${binding.parameterPrefix}Radius`, spotUniform.radius],
          [`${binding.parameterPrefix}Mode`, spotUniform.mode],
          [`${binding.parameterPrefix}LightColor`, spotUniform.lightColor],
          [`${binding.parameterPrefix}Brightness`, spotUniform.brightness],
          [`${binding.parameterPrefix}CoreRadius`, spotUniform.coreRadius],
          [`${binding.parameterPrefix}CoreSoftness`, spotUniform.coreSoftness],
          [`${binding.parameterPrefix}Dispersion`, spotUniform.dispersion],
          [`${binding.parameterPrefix}DogSpread`, spotUniform.dogSpread],
          [`${binding.parameterPrefix}DogStrength`, spotUniform.dogStrength],
          [`${binding.parameterPrefix}DogStretch`, spotUniform.dogStretch],
          [`${binding.parameterPrefix}GlareSize`, spotUniform.glareSize],
          [`${binding.parameterPrefix}GlareStrength`, spotUniform.glareStrength],
          [`${binding.parameterPrefix}GlowSize`, spotUniform.glowSize],
          [`${binding.parameterPrefix}GlowStrength`, spotUniform.glowStrength],
          [`${binding.parameterPrefix}HaloInnerWidth`, spotUniform.haloInnerWidth],
          [`${binding.parameterPrefix}HaloOuterWidth`, spotUniform.haloOuterWidth],
          [`${binding.parameterPrefix}HaloRadius`, spotUniform.haloRadius],
          [`${binding.parameterPrefix}HaloStrength`, spotUniform.haloStrength],
          ...Array.from({ length: binding.stopCount }, (_, stopIndex) => [
            [`${binding.parameterPrefix}StopColor${stopIndex}`, spotUniform.stops[stopIndex].color],
            [`${binding.parameterPrefix}StopMidpoint${stopIndex}`, spotUniform.stops[stopIndex].midpoint],
            [`${binding.parameterPrefix}StopT${stopIndex}`, spotUniform.stops[stopIndex].t],
          ]).flat(),
        ];
      })
    ),
  createUniforms: createSpotUniformNodes,
  getTopologyKey: (layer) => ({
    stopCount: layer.params.stops.length,
  }),
  type: "spot",
  updateUniforms: applySpotLayerParamsToUniformNodes,
};

registerLayerRuntimeAdapter({
  type: "spot",
  sampleCpu: (direction, params) => sampleSpotLayer(direction, params as SkyboxSpotParams),
  updateLive: (context, layer) => context.applyLayerParams(layer),
  wgsl: spotWebGpuAdapter as WebGpuLayerAdapter,
  wgslEditorOverlay: true,
  getTopologyKey: (layer) => spotWebGpuAdapter.getTopologyKey(layer as never),
});
