import { clamp, compositeOver, type Rgb, type Rgba } from "./math";
import type {
  SkyboxManifest,
  SkyboxManifestLayer,
  SkyboxManifestNode,
} from "./manifest";
import { migrateManifestToV2 } from "./manifest";
import type { StarfieldBakeData } from "./starfield-static";
import { getLayerRuntimeAdapter } from "./layer-addons/registry";
// Side-effect import: registers every built-in layer adapter (incl. CPU samplers).
import "./layer-addons/builtins";

export {
  equirectPointToDirection,
  equirectUvToDirection,
} from "./layer-addons/cpu-sampling";

type EvaluateOptions = {
  sampleHeight?: number;
  starfieldBakes?: Map<string, StarfieldBakeData>;
  targetGroupId?: string;
};

function sampleLayer(direction: Rgb, layer: SkyboxManifestLayer, options: EvaluateOptions = {}): Rgba {
  const adapter = getLayerRuntimeAdapter(layer.type);

  if (!adapter?.sampleCpu) {
    return [0, 0, 0, 0];
  }

  return adapter.sampleCpu(direction, layer.params, {
    layerId: layer.id,
    sampleHeight: options.sampleHeight,
    starfieldBakes: options.starfieldBakes,
  });
}

export function composeNodes(direction: Rgb, nodes: SkyboxManifestNode[], options: EvaluateOptions = {}): Rgb {
  return nodes
    .filter((node) => node.enabled)
    .reverse()
    .reduce<Rgb>((backdrop, node) => {
      const source =
        node.type === "group"
          ? ([...composeNodes(direction, node.children, options), 1] as Rgba)
          : sampleLayer(direction, node, options);
      const alpha = clamp(source[3] * (node.opacity / 100));

      return compositeOver(backdrop, [source[0], source[1], source[2]], alpha, node.blendMode);
    }, [0, 0, 0]);
}

function findGroup(nodes: SkyboxManifestNode[], id: string): SkyboxManifestNode | null {
  for (const node of nodes) {
    if (node.type === "group") {
      if (node.id === id) {
        return node;
      }

      const match = findGroup(node.children, id);

      if (match) {
        return match;
      }
    }
  }

  return null;
}

export function evaluateSkyboxDirection(
  manifest: SkyboxManifest,
  direction: Rgb,
  options: EvaluateOptions = {}
) {
  const migratedManifest = migrateManifestToV2(manifest);
  const targetGroup = options.targetGroupId
    ? findGroup(migratedManifest.nodes, options.targetGroupId)
    : null;
  const nodes = options.targetGroupId
    ? targetGroup
      ? [targetGroup]
      : []
    : migratedManifest.nodes;

  return composeNodes(direction, nodes, options);
}
