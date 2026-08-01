// Layer composition + blend-mode shader codegen, shared by the live (WebGPU/WebGL) and bake
// material builders. Pure string/node codegen — it dispatches per-layer sampling through the layer
// adapter registry, so it has no per-layer-type branches.
import { clamp } from "../math";
import type {
  SkyboxLayerBlendMode,
  SkyboxManifestLayer,
  SkyboxManifestNode,
} from "../manifest";
import type { WebGpuCompositionRuntime, WebGpuLayerAdapter } from "../layer-addons";
import {
  mutableDeclaration,
  numberLiteral,
  selectExpression,
  vectorLiteral,
  zeroEffectExpression,
} from "../layer-addons/shader-codegen";

export type CompositionNodeShaderBinding = {
  index: number;
  node: SkyboxManifestNode;
  parameterPrefix: string;
};

export function getRenderableNodes(nodes: SkyboxManifestNode[]) {
  return nodes.filter((node) => node.enabled).reverse();
}

function blendModeValue(mode: SkyboxLayerBlendMode) {
  switch (mode) {
    case "darken":
      return 1;
    case "multiply":
      return 2;
    case "color-burn":
      return 3;
    case "lighten":
      return 4;
    case "screen":
      return 5;
    case "color-dodge":
      return 6;
    case "overlay":
      return 7;
    case "soft-light":
      return 8;
    case "hard-light":
      return 9;
    case "difference":
      return 10;
    case "exclusion":
      return 11;
    case "normal":
    default:
      return 0;
  }
}

export function compositionNodeValues(node: SkyboxManifestNode) {
  return {
    blendMode: blendModeValue(node.blendMode),
    opacity: clamp(node.opacity / 100),
  };
}

// Encode/decode emitted inline: the composition body is pasted into one generated function and WGSL
// forbids nested function declarations, so these are expressions. Each references its argument three
// times — only ever pass a `let` name, never an expression.
function srgbEncodeExpression(value: string) {
  return `select(1.055 * pow(${value}, ${vectorLiteral(1 / 2.4)}) - ${vectorLiteral(0.055)}, ${value} * 12.92, ${value} <= ${vectorLiteral(0.0031308)})`;
}

function srgbDecodeExpression(value: string) {
  return `select(pow((${value} + ${vectorLiteral(0.055)}) / ${vectorLiteral(1.055)}, ${vectorLiteral(2.4)}), ${value} / 12.92, ${value} <= ${vectorLiteral(0.04045)})`;
}

function blendColorExpression(mode: SkyboxLayerBlendMode) {
  const one = vectorLiteral(1);
  const half = vectorLiteral(0.5);
  const zero = vectorLiteral(0);
  // Both operands are sRGB-encoded here — see `compositeOver` in math.ts for why.
  const source = "blendSource";
  const backdrop = "blendBackdrop";

  switch (mode) {
    case "darken":
      return `min(${backdrop}, ${source})`;
    case "multiply":
      return `${backdrop} * ${source}`;
    case "color-burn":
      return selectExpression(
        `${backdrop} == ${one}`,
        one,
        selectExpression(
          `${source} == ${zero}`,
          zero,
          `${one} - min(${one}, (${one} - ${backdrop}) / ${source})`
        )
      );
    case "lighten":
      return `max(${backdrop}, ${source})`;
    case "screen":
      return `${backdrop} + ${source} - ${backdrop} * ${source}`;
    case "color-dodge":
      return selectExpression(
        `${backdrop} == ${zero}`,
        zero,
        selectExpression(
          `${source} == ${one}`,
          one,
          `min(${one}, ${backdrop} / (${one} - ${source}))`
        )
      );
    case "overlay":
      return selectExpression(
        `${backdrop} <= ${half}`,
        `2.0 * ${backdrop} * ${source}`,
        `${one} - 2.0 * (${one} - ${backdrop}) * (${one} - ${source})`
      );
    case "soft-light":
      return selectExpression(
        `${source} <= ${half}`,
        `${backdrop} - (${one} - 2.0 * ${source}) * ${backdrop} * (${one} - ${backdrop})`,
        `${backdrop} + (2.0 * ${source} - ${one}) * (softLightD - ${backdrop})`
      );
    case "hard-light":
      return selectExpression(
        `${source} <= ${half}`,
        `2.0 * ${backdrop} * ${source}`,
        `${backdrop} + (2.0 * ${source} - ${one}) - ${backdrop} * (2.0 * ${source} - ${one})`
      );
    case "difference":
      return `abs(${backdrop} - ${source})`;
    case "exclusion":
      return `${backdrop} + ${source} - 2.0 * ${backdrop} * ${source}`;
    case "normal":
    default:
      return source;
  }
}

function blendSoftLightSetupExpression() {
  return `let softLightD = ${selectExpression(
    `blendBackdrop <= vec3<f32>(0.25)`,
    `((16.0 * blendBackdrop - vec3<f32>(12.0)) * blendBackdrop + vec3<f32>(4.0)) * blendBackdrop`,
    "sqrt(blendBackdrop)"
  )};`;
}

function blendModeCondition(blendModeRef: string, mode: SkyboxLayerBlendMode) {
  const value = blendModeValue(mode);

  return `${blendModeRef} >= ${numberLiteral(value - 0.5)} && ${blendModeRef} < ${numberLiteral(value + 0.5)}`;
}

function blendAssignmentBlock(blendModeRef: string) {
  const blendModes: SkyboxLayerBlendMode[] = [
    "darken",
    "multiply",
    "color-burn",
    "lighten",
    "screen",
    "color-dodge",
    "overlay",
    "soft-light",
    "hard-light",
    "difference",
    "exclusion",
  ];
  const branches = blendModes
    .map((mode, index) => `${index === 0 ? "if" : "else if"} (${blendModeCondition(blendModeRef, mode)}) {
            blendedSrgb = ${blendColorExpression(mode)};
          }`)
    .join("\n");

  // `normal` (blend mode 0) keeps the untouched linear source, so the common path stays bit-exact and
  // skips the encode/decode round trip entirely. Every other mode blends sRGB-encoded operands and
  // decodes back to linear before the caller's alpha-over. Mirrors `compositeOver` in math.ts.
  return `let blendSourceLinear = clamp(effectColor.rgb, vec3<f32>(0.0), vec3<f32>(1.0));
        ${mutableDeclaration("blendedColor", "vec3<f32>", "blendSourceLinear")}
        if (${blendModeRef} >= ${numberLiteral(0.5)}) {
          let blendBackdropLinear = clamp(composedColor, vec3<f32>(0.0), vec3<f32>(1.0));
          let blendBackdrop = ${srgbEncodeExpression("blendBackdropLinear")};
          let blendSource = ${srgbEncodeExpression("blendSourceLinear")};
          ${blendSoftLightSetupExpression()}
          ${mutableDeclaration("blendedSrgb", "vec3<f32>", "blendSource")}
          ${branches}
          let blendedSrgbClamped = clamp(blendedSrgb, vec3<f32>(0.0), vec3<f32>(1.0));
          blendedColor = ${srgbDecodeExpression("blendedSrgbClamped")};
        }`;
}

export function composeNodesExpression(
  nodes: SkyboxManifestNode[],
  compositionBindings: Map<string, CompositionNodeShaderBinding>,
  webGpuRuntime: WebGpuCompositionRuntime,
  depth = 0
): string {
  return getRenderableNodes(nodes)
    .map((node, index) => {
      const sourceExpression =
        node.type === "group"
          ? `effectColor = vec4<f32>(groupColor${depth}_${index}, 1.0);`
          : webGpuEffectExpression(node, webGpuRuntime);
      const groupColorName = `groupColor${depth}_${index}`;
      const compositionBinding = compositionBindings.get(node.id);
      const opacityRef = compositionBinding
        ? `${compositionBinding.parameterPrefix}Opacity`
        : numberLiteral(node.opacity / 100);
      const blendModeRef = compositionBinding
        ? `${compositionBinding.parameterPrefix}BlendMode`
        : numberLiteral(blendModeValue(node.blendMode));
      const groupBlock =
        node.type === "group"
          ? `${mutableDeclaration(groupColorName, "vec3<f32>", "vec3<f32>(0.0)")}
        {
          ${mutableDeclaration("previousComposedColor", "vec3<f32>", "composedColor")}
          composedColor = vec3<f32>(0.0);
          ${composeNodesExpression(node.children, compositionBindings, webGpuRuntime, depth + 1)}
          ${groupColorName} = composedColor;
          composedColor = previousComposedColor;
        }`
          : "";

      return `{
        ${groupBlock}
        ${mutableDeclaration("effectColor", "vec4<f32>", "vec4<f32>(0.0)")}
        ${sourceExpression}
        let sourceAlpha = clamp(effectColor.a * ${opacityRef}, 0.0, 1.0);
        ${blendAssignmentBlock(blendModeRef)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          vec3<f32>(0.0),
          vec3<f32>(1.0)
        );
      }`;
    })
    .join("\n");
}

export function createBindingMapFromLayers<TBinding extends { layer: SkyboxManifestLayer }>(
  bindings: TBinding[]
) {
  return new Map(bindings.map((binding) => [binding.layer.id, binding]));
}

function webGpuEffectExpression(
  layer: SkyboxManifestLayer,
  runtime: WebGpuCompositionRuntime
) {
  const adapterRuntime = runtime.adapters.get(layer.type);

  if (!adapterRuntime) {
    return zeroEffectExpression();
  }

  return (adapterRuntime.adapter as WebGpuLayerAdapter<SkyboxManifestLayer, unknown, unknown>)
    .createSampleExpression(layer, "wgsl", {
      bindingsByLayerId: adapterRuntime.bindingsByLayerId,
    });
}
