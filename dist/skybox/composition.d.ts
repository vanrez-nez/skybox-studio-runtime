import type { SkyboxManifestLayer, SkyboxManifestNode } from "../manifest";
import type { WebGpuCompositionRuntime } from "../layer-addons";
export type CompositionNodeShaderBinding = {
    index: number;
    node: SkyboxManifestNode;
    parameterPrefix: string;
};
export declare function getRenderableNodes(nodes: SkyboxManifestNode[]): SkyboxManifestNode[];
export declare function compositionNodeValues(node: SkyboxManifestNode): {
    blendMode: number;
    opacity: number;
};
export declare function composeNodesExpression(nodes: SkyboxManifestNode[], compositionBindings: Map<string, CompositionNodeShaderBinding>, webGpuRuntime: WebGpuCompositionRuntime, depth?: number): string;
export declare function createBindingMapFromLayers<TBinding extends {
    layer: SkyboxManifestLayer;
}>(bindings: TBinding[]): Map<string, TBinding>;
export declare function manifestHasLayerAboveStarfield(nodes: SkyboxManifestNode[]): boolean;
export declare function composeCoverageExpression(nodes: SkyboxManifestNode[], compositionBindings: Map<string, CompositionNodeShaderBinding>, webGpuRuntime: WebGpuCompositionRuntime): string;
