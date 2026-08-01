import type { Rgb, Rgba } from "../math";
import type { SkyboxManifestLayer, SkyboxManifestNode } from "../manifest";
import type { StarfieldBakeData } from "../starfield-static";
import type { WebGpuLayerAdapter } from "./types";

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
 * What a layer offers when a Clouds light links to it via `directionLayerId`.
 * Direction is the only mandatory member; everything else defaults to the
 * point-light passthrough that Spot/Image links have today. Appearance (color)
 * deliberately has no channel here — tint never leaks between layers.
 */
export type LayerLightSourceDescriptor = {
  /** Unit vector toward the light. */
  direction: [number, number, number];
  /**
   * Multiplier applied to the clouds light's user intensity (the slider stays
   * a trim). Omitted = 1. Sources normalize this to 1 at their reference
   * configuration so linking never changes an already-tuned slider.
   */
  intensityScale?: number;
  /** Apparent angular radius of the source in radians. Omitted = 0 = point. */
  angularRadius?: number;
  /**
   * True when the source layer draws its own disc; the resolver then forces
   * the clouds light's disc off to avoid a double disc.
   */
  rendersOwnDisc?: boolean;
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
  /**
   * Light-source capability: lets a Clouds light link to this layer type via
   * `directionLayerId`. Absent = this type is not a light source. Must be pure
   * (params in, descriptor out) — called from the manifest resolver.
   */
  getLightSource?: (params: TParams) => LayerLightSourceDescriptor | null;
};

const registry = new Map<string, LayerRuntimeAdapter>();

/**
 * Register (or extend) the adapter for a layer type. Calls merge shallowly so
 * the CPU and GPU halves of a built-in adapter can be registered from their
 * respective modules during the migration; the converged end-state registers a
 * single complete adapter per type.
 */
export function registerLayerRuntimeAdapter(
  adapter: Partial<LayerRuntimeAdapter> & { type: string }
) {
  const existing = registry.get(adapter.type);

  registry.set(adapter.type, { ...(existing ?? { type: adapter.type }), ...adapter });
}

export function getLayerRuntimeAdapter(type: string): LayerRuntimeAdapter | undefined {
  return registry.get(type);
}

export function getLayerRuntimeAdapters(): LayerRuntimeAdapter[] {
  return Array.from(registry.values());
}

export function isRegisteredLayerType(type: string): boolean {
  return registry.has(type);
}

export type { SkyboxManifestLayer, SkyboxManifestNode };
