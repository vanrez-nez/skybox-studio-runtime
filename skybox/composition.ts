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
import { getLayerRuntimeAdapter } from "../layer-addons/registry";
import {
  mutableDeclaration,
  numberLiteral,
  selectExpression,
  vectorLiteral,
  zeroEffectExpression,
  type ShaderLanguage,
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

const EMPTY_BINDING_MAP: Map<string, unknown> = new Map();

function effectExpression(
  layer: SkyboxManifestLayer,
  language: ShaderLanguage,
  bindingMapsByType: Map<string, Map<string, unknown>>
) {
  const adapter = getLayerRuntimeAdapter(layer.type);

  if (!adapter?.glsl) {
    return zeroEffectExpression(language);
  }

  return adapter.glsl.sampleExpression(
    layer,
    bindingMapsByType.get(layer.type) ?? EMPTY_BINDING_MAP,
    language
  );
}

function blendColorExpression(mode: SkyboxLayerBlendMode, language: ShaderLanguage) {
  if (language === "glsl") {
    switch (mode) {
      case "darken":
        return "min(composedColor, effectColor.rgb)";
      case "multiply":
        return "composedColor * effectColor.rgb";
      case "color-burn":
        return "blendColorBurn(composedColor, effectColor.rgb)";
      case "lighten":
        return "max(composedColor, effectColor.rgb)";
      case "screen":
        return "composedColor + effectColor.rgb - composedColor * effectColor.rgb";
      case "color-dodge":
        return "blendColorDodge(composedColor, effectColor.rgb)";
      case "overlay":
        return "blendOverlay(composedColor, effectColor.rgb)";
      case "soft-light":
        return "blendSoftLight(composedColor, effectColor.rgb)";
      case "hard-light":
        return "blendHardLight(composedColor, effectColor.rgb)";
      case "difference":
        return "abs(composedColor - effectColor.rgb)";
      case "exclusion":
        return "composedColor + effectColor.rgb - 2.0 * composedColor * effectColor.rgb";
      case "normal":
      default:
        return "effectColor.rgb";
    }
  }

  const one = vectorLiteral(1, language);
  const half = vectorLiteral(0.5, language);
  const zero = vectorLiteral(0, language);
  const source = "effectColor.rgb";
  const backdrop = "composedColor";

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
          `${one} - min(${one}, (${one} - ${backdrop}) / ${source})`,
          language
        ),
        language
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
          `min(${one}, ${backdrop} / (${one} - ${source}))`,
          language
        ),
        language
      );
    case "overlay":
      return selectExpression(
        `${backdrop} <= ${half}`,
        `2.0 * ${backdrop} * ${source}`,
        `${one} - 2.0 * (${one} - ${backdrop}) * (${one} - ${source})`,
        language
      );
    case "soft-light":
      return selectExpression(
        `${source} <= ${half}`,
        `${backdrop} - (${one} - 2.0 * ${source}) * ${backdrop} * (${one} - ${backdrop})`,
        `${backdrop} + (2.0 * ${source} - ${one}) * (softLightD - ${backdrop})`,
        language
      );
    case "hard-light":
      return selectExpression(
        `${source} <= ${half}`,
        `2.0 * ${backdrop} * ${source}`,
        `${backdrop} + (2.0 * ${source} - ${one}) - ${backdrop} * (2.0 * ${source} - ${one})`,
        language
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

function blendSoftLightSetupExpression(language: ShaderLanguage) {
  if (language === "glsl") {
    return "";
  }

  const vec3Type = language === "wgsl" ? "vec3<f32>" : "vec3";
  const declaration = language === "wgsl" ? "let" : "vec3";

  return `${declaration} softLightD = ${selectExpression(
    `composedColor <= ${vec3Type}(0.25)`,
    `((16.0 * composedColor - ${vec3Type}(12.0)) * composedColor + ${vec3Type}(4.0)) * composedColor`,
    "sqrt(composedColor)",
    language
  )};`;
}

function blendModeCondition(blendModeRef: string, mode: SkyboxLayerBlendMode) {
  const value = blendModeValue(mode);

  return `${blendModeRef} >= ${numberLiteral(value - 0.5)} && ${blendModeRef} < ${numberLiteral(value + 0.5)}`;
}

function blendAssignmentBlock(blendModeRef: string, language: ShaderLanguage) {
  const vec3Type = language === "wgsl" ? "vec3<f32>" : "vec3";
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
          blendedColor = ${blendColorExpression(mode, language)};
        }`)
    .join("\n");

  return `${blendSoftLightSetupExpression(language)}
        ${mutableDeclaration("blendedColor", vec3Type, "effectColor.rgb", language)}
        ${branches}
        blendedColor = clamp(blendedColor, ${vec3Type}(0.0), ${vec3Type}(1.0));`;
}

export function composeNodesExpression(
  nodes: SkyboxManifestNode[],
  language: ShaderLanguage,
  bindingMapsByType: Map<string, Map<string, unknown>>,
  compositionBindings: Map<string, CompositionNodeShaderBinding>,
  webGpuRuntime?: WebGpuCompositionRuntime,
  depth = 0
): string {
  const vec3Type = language === "wgsl" ? "vec3<f32>" : "vec3";
  const vec4Type = language === "wgsl" ? "vec4<f32>" : "vec4";

  return getRenderableNodes(nodes)
    .map((node, index) => {
      const sourceExpression =
        node.type === "group"
          ? `effectColor = ${vec4Type}(${(() => {
              const variableName = `groupColor${depth}_${index}`;
              return variableName;
            })()}, 1.0);`
          : language === "wgsl" && webGpuRuntime
            ? webGpuEffectExpression(node, webGpuRuntime)
          : effectExpression(node, language, bindingMapsByType);
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
          ? `${mutableDeclaration(groupColorName, vec3Type, `${vec3Type}(0.0)`, language)}
        {
          ${mutableDeclaration("previousComposedColor", vec3Type, "composedColor", language)}
          composedColor = ${vec3Type}(0.0);
          ${composeNodesExpression(
            node.children,
            language,
            bindingMapsByType,
            compositionBindings,
            webGpuRuntime,
            depth + 1
          )}
          ${groupColorName} = composedColor;
          composedColor = previousComposedColor;
        }`
          : "";

      return `{
        ${groupBlock}
        ${mutableDeclaration("effectColor", vec4Type, `${vec4Type}(0.0)`, language)}
        ${sourceExpression}
        ${language === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${opacityRef}, 0.0, 1.0);
        ${blendAssignmentBlock(blendModeRef, language)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          ${vec3Type}(0.0),
          ${vec3Type}(1.0)
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
    return zeroEffectExpression("wgsl");
  }

  return (adapterRuntime.adapter as WebGpuLayerAdapter<SkyboxManifestLayer, unknown, unknown>)
    .createSampleExpression(layer, "wgsl", {
      bindingsByLayerId: adapterRuntime.bindingsByLayerId,
    });
}
