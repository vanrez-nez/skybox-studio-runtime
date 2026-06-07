import type { Rgb, Rgba } from "../math";
import type { SkyboxManifestLayer, SkyboxManifestNode } from "../manifest";
import type { StarfieldBakeData } from "../starfield-static";
import type { ShaderLanguage } from "./shader-codegen";
import type { WebGpuLayerAdapter } from "./types";
/**
 * GLSL (live-webgl) half of a layer adapter. `sampleExpression` returns the GLSL
 * statement that assigns this layer's contribution to `effectColor`, looking its
 * binding up from the per-type binding map. (Binding/uniform/declaration assembly
 * remains in the material builder for now and is genericized incrementally.)
 */
export type LayerGlslBuildContext = {
    editorPresentationEnabled: boolean;
    editorLayerState: unknown;
    imageTextures: Map<string, unknown>;
    starfieldTextures: Map<string, unknown>;
};
export type LayerGlslAdapter = {
    /** Collect this layer type's GLSL bindings from the manifest nodes. */
    collectBindings: (nodes: SkyboxManifestNode[]) => unknown[];
    /** Index the bindings by layer id (used for sample-expression lookup). */
    createBindingMap: (bindings: unknown[]) => Map<string, unknown>;
    /** GLSL `uniform` declarations for the fragment shader header. */
    uniformDeclarations: (bindings: unknown[], context: LayerGlslBuildContext) => string;
    /** Optional GLSL helper-function declarations (e.g. image sampling). */
    fragmentHelpers?: (bindings: unknown[]) => string;
    /** three.js uniform objects for this type (incl. textures/editor). */
    shaderUniforms: (bindings: unknown[], context: LayerGlslBuildContext) => Record<string, unknown>;
    /** Optional editor-overlay GLSL appended to `main()` (editor mode only). */
    editorOverlayExpression?: (bindings: unknown[], context: LayerGlslBuildContext) => string;
    /** Push a layer's params into the live material's uniforms (Direct update). */
    applyParams?: (material: unknown, layer: SkyboxManifestLayer, bindings: unknown[]) => void;
    /** GLSL statement assigning this layer's contribution to `effectColor`. */
    sampleExpression: (layer: SkyboxManifestLayer, bindingMap: Map<string, unknown>, language: ShaderLanguage) => string;
};
/**
 * Context handed to a layer's CPU sampler (`evaluator.ts` + `bake.ts`).
 * Defined here (not imported from the evaluator) so the registry has no
 * dependency on the evaluator and stays cycle-free.
 */
export type LayerCpuSampleContext = {
    layerId: string;
    sampleHeight?: number;
    starfieldBakes?: Map<string, StarfieldBakeData>;
};
/**
 * Capabilities the runtime exposes to a layer's Direct-pipeline live update.
 * Lets `Skybox.updateLayer` stay layer-agnostic while each adapter decides what
 * a live param change means (uniform push, image placement, resource rebake).
 */
export type LayerLiveUpdateContext = {
    /** Push the layer's params into the live material's uniforms (no rebuild). */
    applyLayerParams: (layer: SkyboxManifestLayer) => void;
    /** Apply an image-layer placement to the live material + override map. */
    applyImagePlacement: (layerId: string, placement: unknown) => void;
    /** Schedule an async resource (e.g. starfield bake) refresh for the layer. */
    scheduleResourceBake: (layerId: string, params: unknown) => void;
};
/**
 * Single source of truth for everything the runtime needs to know about a
 * layer type. Built-in layers register one of these; external layers register
 * their own. The runtime composition core looks layers up here instead of
 * branching on `layer.type`, so adding a layer never touches the core.
 *
 * Members are filled incrementally during the decoupling migration; the goal
 * end-state is a single fully-populated adapter per type assembled in
 * `layer-addons/builtins/<type>.ts`.
 */
export type LayerRuntimeAdapter<TParams = unknown> = {
    type: string;
    /** CPU evaluation (preview/baking). */
    sampleCpu?: (direction: Rgb, params: TParams, context: LayerCpuSampleContext) => Rgba;
    /** Live WebGPU node-material adapter (existing contract). */
    wgsl?: WebGpuLayerAdapter;
    /**
     * Whether this layer draws an editor selection-rect overlay (WebGPU). The
     * overlay itself is generic; this just opts the layer in. Requires the wgsl
     * adapter's sample nodes to publish an editor projection per layer.
     */
    wgslEditorOverlay?: boolean;
    /** Live WebGL (GLSL) sample-expression adapter. */
    glsl?: LayerGlslAdapter;
    /**
     * Direct-pipeline live update for a single layer (editor tweaks). Runs the
     * per-type live update via the provided context. No `setManifest`.
     */
    updateLive?: (context: LayerLiveUpdateContext, layer: SkyboxManifestLayer) => void;
    /**
     * Structural topology key — MUST depend only on structural facts (counts,
     * geometry), never on a continuously-tweaked value, or live tweaking falls
     * back to the Manifest rebuild path. See the Direct/Manifest invariant.
     */
    getTopologyKey?: (layer: SkyboxManifestLayer) => unknown;
};
/**
 * Register (or extend) the adapter for a layer type. Calls merge shallowly so
 * the CPU and GPU halves of a built-in adapter can be registered from their
 * respective modules during the migration; the converged end-state registers a
 * single complete adapter per type.
 */
export declare function registerLayerRuntimeAdapter(adapter: Partial<LayerRuntimeAdapter> & {
    type: string;
}): void;
export declare function getLayerRuntimeAdapter(type: string): LayerRuntimeAdapter | undefined;
export declare function getLayerRuntimeAdapters(): LayerRuntimeAdapter[];
export declare function isRegisteredLayerType(type: string): boolean;
export type { SkyboxManifestLayer, SkyboxManifestNode };
