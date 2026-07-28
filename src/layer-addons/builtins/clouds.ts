// Self-contained procedural clouds layer adapter: CPU sampling (bake/preview) + WebGPU (TSL) shader
// codegen, uniform builders, binding collection, and topology key.
//
// Ported from three's `examples/jsm/objects/SkyMesh.js` cloud term (r184): a 2D fBm evaluated on an
// infinite plane projected through the view direction, upper hemisphere only. Two deliberate changes:
//
//  1. SkyMesh advances the clouds with the TSL `time` node. Here the shader takes a precomputed
//     `offset` (= phase * speed) so the result is deterministic — the viewport, the image export and
//     the runtime bundle all agree, and a host can still animate `phase` itself.
//  2. SkyMesh hashes with `fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123)`. That is
//     precision-dependent: JS float64 and GPU f32 diverge, and the 1000x/2000x scales amplify it into
//     a completely different cloud field on the CPU bake path. This uses an integer (PCG-style) hash
//     instead, which is bit-stable across both — `Math.imul` mirrors WGSL's wrapping u32 multiply.
//
// SkyMesh's cloud colour depends on its Preetham internals (`Lin`, `vSunE`, `vSunDirection`), which
// don't exist outside that shader, so the colour model here is a shadow->lit mix driven by the layer's
// own sun direction.
import * as THREE from "three";
import { uniform } from "three/tsl";

import { clamp, type Rgb, type Rgba } from "../../math";
import type {
  SkyboxCloudsParams,
  SkyboxManifestLayer,
  SkyboxManifestNode,
} from "../../manifest";
import { colorVectorFromHex } from "../../skybox/colors";
import type {
  BuiltInWebGpuLayerAdapter,
  CloudsLayerShaderBinding,
  CloudsUniformNodes,
} from "../../skybox/types";
import { normalizeDirection, smoothstep } from "../cpu-sampling";
import { registerLayerRuntimeAdapter } from "../registry";
import { zeroEffectExpression } from "../shader-codegen";
import type { WebGpuLayerAdapter } from "../types";

const OCTAVES = 5;
// SkyMesh evaluates the fBm twice, at 1000x and 2000x (+3.7), the second at half weight.
const FBM_PASSES = [
  { offset: 0, scale: 1000, weight: 1 },
  { offset: 3.7, scale: 2000, weight: 0.5 },
] as const;

// --- Shared normalizer (feeds the CPU sampler, createUniforms AND updateUniforms) ---

function cloudsShaderValues(params: SkyboxCloudsParams) {
  const sunDirection = new THREE.Vector3(...params.sunDirection);

  if (sunDirection.lengthSq() === 0) {
    sunDirection.set(0, 1, 0);
  }

  return {
    color: colorVectorFromHex(params.color),
    coverage: clamp(params.coverage),
    density: clamp(params.density),
    elevation: clamp(params.elevation),
    // Folded here so the shader stays a pure function of direction + uniforms.
    offset: params.phase * params.speed,
    scale: Math.max(params.scale, 0),
    shadowColor: colorVectorFromHex(params.shadowColor),
    sunDirection: sunDirection.normalize(),
  };
}

// --- CPU sampling (mirrors the WGSL below statement for statement) ---

// PCG-style integer hash on the 2D lattice. Math.imul is a true 32-bit multiply, matching WGSL's
// wrapping u32 arithmetic, so CPU and GPU agree bit for bit.
function cloudsHash(x: number, y: number): number {
  let state = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) >>> 0;

  state = Math.imul(state ^ (state >>> 13), 1274126177) >>> 0;

  return ((state ^ (state >>> 16)) >>> 0) * 2.3283064365386963e-10;
}

function cloudsValueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const wx = fx * fx * (3 - 2 * fx);
  const wy = fy * fy * (3 - 2 * fy);
  const a = cloudsHash(ix, iy);
  const b = cloudsHash(ix + 1, iy);
  const c = cloudsHash(ix, iy + 1);
  const d = cloudsHash(ix + 1, iy + 1);
  const top = a + (b - a) * wx;
  const bottom = c + (d - c) * wx;

  return top + (bottom - top) * wy;
}

function cloudsFbm(x: number, y: number): number {
  let px = x;
  let py = y;
  let amplitude = 0.5;
  let sum = 0;

  for (let octave = 0; octave < OCTAVES; octave += 1) {
    sum += amplitude * cloudsValueNoise(px, py);
    px *= 2;
    py *= 2;
    amplitude *= 0.5;
  }

  return sum;
}

export function sampleCloudsLayer(direction: Rgb, params: SkyboxCloudsParams): Rgba {
  const values = cloudsShaderValues(params);
  const [dx, dy, dz] = normalizeDirection(direction);

  if (dy <= 0 || values.coverage <= 0) {
    return [0, 0, 0, 0];
  }

  // Higher elevation => smaller divisor => clouds sit lower/closer.
  const elevation = 1 + (0.1 - 1) * values.elevation;
  const uvX = (dx / (dy * elevation)) * values.scale + values.offset;
  const uvY = (dz / (dy * elevation)) * values.scale + values.offset;
  const noise =
    FBM_PASSES.reduce(
      (total, pass) =>
        total +
        cloudsFbm(uvX * pass.scale + pass.offset, uvY * pass.scale + pass.offset) * pass.weight,
      0
    ) *
      0.5 +
    0.5;
  const coverageEdge = 1 - values.coverage;
  const mask =
    smoothstep(coverageEdge, coverageEdge + 0.3, noise) *
    smoothstep(0, 0.1 + 0.2 * values.elevation, dy);
  const alpha = clamp(mask * values.density);

  if (alpha <= 0.00001) {
    return [0, 0, 0, 0];
  }

  const sunInfluence =
    (dx * values.sunDirection.x + dy * values.sunDirection.y + dz * values.sunDirection.z) * 0.5 +
    0.5;
  const shadow = values.shadowColor;
  const lit = values.color;

  return [
    shadow.x + (lit.x - shadow.x) * sunInfluence,
    shadow.y + (lit.y - shadow.y) * sunInfluence,
    shadow.z + (lit.z - shadow.z) * sunInfluence,
    alpha,
  ];
}

// --- WebGPU (TSL) uniform nodes ---

function createCloudsUniformNodes(bindings: CloudsLayerShaderBinding[]) {
  return bindings.map((binding): CloudsUniformNodes => {
    const values = cloudsShaderValues(binding.layer.params);

    return {
      color: uniform(values.color),
      coverage: uniform(values.coverage),
      density: uniform(values.density),
      elevation: uniform(values.elevation),
      layerId: binding.layer.id,
      offset: uniform(values.offset),
      scale: uniform(values.scale),
      shadowColor: uniform(values.shadowColor),
      sunDirection: uniform(values.sunDirection),
    };
  });
}

function applyCloudsLayerParamsToUniformNodes(
  uniforms: CloudsUniformNodes[],
  layer: Extract<SkyboxManifestLayer, { type: "clouds" }>
) {
  const cloudsUniforms = uniforms.find((nextUniforms) => nextUniforms.layerId === layer.id);

  if (!cloudsUniforms) {
    return;
  }

  const values = cloudsShaderValues(layer.params);

  (cloudsUniforms.color as any).value.copy(values.color);
  (cloudsUniforms.coverage as any).value = values.coverage;
  (cloudsUniforms.density as any).value = values.density;
  (cloudsUniforms.elevation as any).value = values.elevation;
  (cloudsUniforms.offset as any).value = values.offset;
  (cloudsUniforms.scale as any).value = values.scale;
  (cloudsUniforms.shadowColor as any).value.copy(values.shadowColor);
  (cloudsUniforms.sunDirection as any).value.copy(values.sunDirection);
}

// --- Binding collection ---

function collectCloudsLayerBindings(nodes: SkyboxManifestNode[]) {
  const bindings: CloudsLayerShaderBinding[] = [];

  function collect(nextNodes: SkyboxManifestNode[]) {
    nextNodes.forEach((node) => {
      if (!node.enabled) {
        return;
      }

      if (node.type === "group") {
        collect(node.children);
        return;
      }

      if (node.type === "clouds") {
        const index = bindings.length;

        bindings.push({
          index,
          layer: node,
          parameterPrefix: `cloudsLayer${index}`,
        });
      }
    });
  }

  collect(nodes);

  return bindings;
}

// --- Sample expression (WGSL) ---

// WGSL forbids nested function declarations and the sample expression is pasted inline, so the hash
// is emitted as three `let` statements per lattice corner instead of a callable.
function cloudsHashStatements(name: string, xExpression: string, yExpression: string) {
  return `
        let ${name}Seed: u32 = u32(i32(${xExpression})) * 374761393u + u32(i32(${yExpression})) * 668265263u;
        let ${name}Mix: u32 = (${name}Seed ^ (${name}Seed >> 13u)) * 1274126177u;
        let ${name}: f32 = f32(${name}Mix ^ (${name}Mix >> 16u)) * 2.3283064365386963e-10;`;
}

function cloudsSampleExpression(binding: CloudsLayerShaderBinding) {
  const prefix = binding.parameterPrefix;
  // One unrolled fBm per pass; the octaves stay a loop so the emitted shader stays small.
  const passes = FBM_PASSES.map(
    (pass, passIndex) => `
      {
        var p${passIndex}: vec2<f32> = cloudUv * ${pass.scale.toFixed(1)} + ${pass.offset.toFixed(8)};
        var amplitude${passIndex}: f32 = 0.5;
        var sum${passIndex}: f32 = 0.0;
        for (var octave${passIndex}: i32 = 0; octave${passIndex} < ${OCTAVES}; octave${passIndex} = octave${passIndex} + 1) {
          let cell${passIndex} = floor(p${passIndex});
          let frac${passIndex} = p${passIndex} - cell${passIndex};
          let weight${passIndex} = frac${passIndex} * frac${passIndex} * (3.0 - 2.0 * frac${passIndex});
          ${cloudsHashStatements(`h00_${passIndex}`, `cell${passIndex}.x`, `cell${passIndex}.y`)}
          ${cloudsHashStatements(`h10_${passIndex}`, `cell${passIndex}.x + 1.0`, `cell${passIndex}.y`)}
          ${cloudsHashStatements(`h01_${passIndex}`, `cell${passIndex}.x`, `cell${passIndex}.y + 1.0`)}
          ${cloudsHashStatements(`h11_${passIndex}`, `cell${passIndex}.x + 1.0`, `cell${passIndex}.y + 1.0`)}
          let top${passIndex} = mix(h00_${passIndex}, h10_${passIndex}, weight${passIndex}.x);
          let bottom${passIndex} = mix(h01_${passIndex}, h11_${passIndex}, weight${passIndex}.x);
          sum${passIndex} = sum${passIndex} + amplitude${passIndex} * mix(top${passIndex}, bottom${passIndex}, weight${passIndex}.y);
          p${passIndex} = p${passIndex} * 2.0;
          amplitude${passIndex} = amplitude${passIndex} * 0.5;
        }
        cloudNoise = cloudNoise + sum${passIndex} * ${pass.weight.toFixed(8)};
      }`
  ).join("");

  return `{
    let cloudDirection = normalize(direction);
    var cloudColor: vec3<f32> = vec3<f32>(0.0);
    var cloudAlpha: f32 = 0.0;
    if (cloudDirection.y > 0.0 && ${prefix}Coverage > 0.0) {
      let cloudElevation = mix(1.0, 0.1, ${prefix}Elevation);
      let cloudUv = cloudDirection.xz / (cloudDirection.y * cloudElevation) * ${prefix}Scale + ${prefix}Offset;
      var cloudNoise: f32 = 0.0;
      ${passes}
      cloudNoise = cloudNoise * 0.5 + 0.5;
      let cloudCoverageEdge = 1.0 - ${prefix}Coverage;
      var cloudMask: f32 = smoothstep(cloudCoverageEdge, cloudCoverageEdge + 0.3, cloudNoise);
      cloudMask = cloudMask * smoothstep(0.0, 0.1 + 0.2 * ${prefix}Elevation, cloudDirection.y);
      let cloudSunInfluence = dot(cloudDirection, normalize(${prefix}SunDirection)) * 0.5 + 0.5;
      cloudColor = mix(${prefix}ShadowColor, ${prefix}Color, cloudSunInfluence);
      cloudAlpha = clamp(cloudMask * ${prefix}Density, 0.0, 1.0);
    }
    effectColor = vec4<f32>(cloudColor, cloudAlpha);
  }`;
}

// --- WebGPU adapter (TSL) ---

const cloudsWebGpuAdapter: BuiltInWebGpuLayerAdapter<
  "clouds",
  CloudsLayerShaderBinding,
  CloudsUniformNodes
> = {
  collect: collectCloudsLayerBindings,
  createParameterDeclarations: (bindings) =>
    bindings
      .flatMap((binding) => [
        `,
      ${binding.parameterPrefix}Color: vec3<f32>`,
        `,
      ${binding.parameterPrefix}Coverage: f32`,
        `,
      ${binding.parameterPrefix}Density: f32`,
        `,
      ${binding.parameterPrefix}Elevation: f32`,
        `,
      ${binding.parameterPrefix}Offset: f32`,
        `,
      ${binding.parameterPrefix}Scale: f32`,
        `,
      ${binding.parameterPrefix}ShadowColor: vec3<f32>`,
        `,
      ${binding.parameterPrefix}SunDirection: vec3<f32>`,
      ])
      .join(""),
  createSampleExpression: (layer, _language, context) => {
    const binding = context.bindingsByLayerId.get(layer.id);

    return binding ? cloudsSampleExpression(binding) : zeroEffectExpression();
  },
  createSampleParameters: (bindings, uniforms) =>
    Object.fromEntries(
      bindings.flatMap((binding) => {
        const cloudsUniform = uniforms[binding.index];

        return [
          [`${binding.parameterPrefix}Color`, cloudsUniform.color],
          [`${binding.parameterPrefix}Coverage`, cloudsUniform.coverage],
          [`${binding.parameterPrefix}Density`, cloudsUniform.density],
          [`${binding.parameterPrefix}Elevation`, cloudsUniform.elevation],
          [`${binding.parameterPrefix}Offset`, cloudsUniform.offset],
          [`${binding.parameterPrefix}Scale`, cloudsUniform.scale],
          [`${binding.parameterPrefix}ShadowColor`, cloudsUniform.shadowColor],
          [`${binding.parameterPrefix}SunDirection`, cloudsUniform.sunDirection],
        ];
      })
    ),
  createUniforms: createCloudsUniformNodes,
  // Purely structural: clouds have no stop/anchor counts and every param is a continuously-tweaked
  // scalar, so the key is constant and every edit takes the Direct (uniform-push) path.
  getTopologyKey: () => ({}),
  type: "clouds",
  updateUniforms: applyCloudsLayerParamsToUniformNodes,
};

registerLayerRuntimeAdapter({
  type: "clouds",
  sampleCpu: (direction, params) => sampleCloudsLayer(direction, params as SkyboxCloudsParams),
  updateLive: (context, layer) => context.applyLayerParams(layer),
  wgsl: cloudsWebGpuAdapter as WebGpuLayerAdapter,
  getTopologyKey: (layer) => cloudsWebGpuAdapter.getTopologyKey(layer as never),
});
