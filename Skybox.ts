import * as THREE from "three";

import { invalidateBakeCache as invalidateGlobalBakeCache } from "./bake";
import {
  createSkyboxGeometry,
  resolveGeometryOptions,
} from "./skybox/geometry";
import { DEFAULT_EDITOR_LAYER_STATE } from "./skybox/editor-presentation";
import { disposeStarfieldTexture } from "./layer-addons/builtins/starfield";
// Side-effect: register every built-in layer adapter (CPU + GPU halves) before materials build.
import "./layer-addons/builtins";
import type {
  SkyboxGeometryOptions,
  SkyboxImagePlacement,
  SkyboxBakeOptions,
  SkyboxFieldGradientParams,
  SkyboxGradientParams,
  SkyboxManifest,
  SkyboxManifestV2,
  SkyboxRenderMode,
  SkyboxSpotParams,
  SkyboxStarfieldParams,
} from "./manifest";
import { DEFAULT_SKYBOX_GEOMETRY, migrateManifestToV2 } from "./manifest";
import { createStarfieldBakeService } from "./starfield-bake-registry";
import type { StarfieldGpuBakeService } from "./starfield-gpu-bake";
import {
  getLayerRuntimeAdapter,
  type LayerLiveUpdateContext,
} from "./layer-addons/registry";
import type {
  ImageTextureMap,
  LayerCompositionUpdate,
  RuntimeMaterial,
  SkyboxEditorImageState,
  SkyboxEditorLayerState,
  SupportedRenderer,
} from "./skybox/types";
import {
  createBakedMaterialFromTexture,
  createBakedSkyboxTexture,
  createMaterialTopologyKey,
  createWebGpuMaterial,
  forEachRenderableLayer,
  findManifestNodeById,
  resolveRenderMode,
} from "./skybox/materials";

const DEFAULT_MANIFEST: SkyboxManifestV2 = {
  composition: { mode: "alpha-over", order: "bottom-to-top" },
  geometry: DEFAULT_SKYBOX_GEOMETRY,
  nodes: [],
  version: 2,
};



export class Skybox extends THREE.Mesh<THREE.BufferGeometry, RuntimeMaterial> {
  #bakeOptions: SkyboxBakeOptions = {};
  #editorLayerState: SkyboxEditorLayerState = { ...DEFAULT_EDITOR_LAYER_STATE };
  #editorPresentationEnabled = false;
  #geometryOptions: SkyboxGeometryOptions = DEFAULT_SKYBOX_GEOMETRY;
  #imagePlacementOverrides = new Map<string, SkyboxImagePlacement | null>();
  #imageTextures = new Map<string, THREE.Texture>();
  #liveUpdateContext: LayerLiveUpdateContext = {
    applyLayerParams: (layer) => {
      this.material.userData.applyLayerParams?.(layer);
    },
    applyImagePlacement: (layerId, placement) => {
      this.#imagePlacementOverrides.set(layerId, placement as SkyboxImagePlacement | null);
      this.material.userData.applyImageLayerPlacement?.(layerId, placement);
    },
    scheduleResourceBake: (layerId, params) => {
      this.scheduleStarfieldTextureBake(layerId, params as SkyboxStarfieldParams);
    },
  };
  #manifest: SkyboxManifestV2 = DEFAULT_MANIFEST;
  #materialTopologyKey: string | null = null;
  #ownedTexture: THREE.Texture | null = null;
  #renderMode: SkyboxRenderMode = "auto";
  #renderer: SupportedRenderer | null = null;
  #starfieldGpuBakeService: StarfieldGpuBakeService | null = null;
  #starfieldBakeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  #starfieldTextureKeys = new Map<string, string>();
  #starfieldTextures = new Map<string, THREE.Texture>();

  constructor() {
    super(
      createSkyboxGeometry(DEFAULT_SKYBOX_GEOMETRY),
      createWebGpuMaterial(DEFAULT_MANIFEST, DEFAULT_EDITOR_LAYER_STATE, new Map(), new Map(), new Map(), false)
    );
    this.frustumCulled = false;
    this.renderOrder = -1;
  }

  fromManifest(manifest: SkyboxManifest) {
    this.#manifest = migrateManifestToV2(manifest);
    this.applyGeometry(this.#manifest.geometry ?? DEFAULT_SKYBOX_GEOMETRY);
    return this;
  }

  setGeometry(options: SkyboxGeometryOptions) {
    this.applyGeometry(options);

    return this;
  }

  setBakeOptions(options: SkyboxBakeOptions) {
    this.#bakeOptions = { ...this.#bakeOptions, ...options };
    return this;
  }

  setRenderer(renderer: SupportedRenderer | null) {
    this.#renderer = renderer;
    this.#starfieldGpuBakeService?.dispose();
    this.#starfieldGpuBakeService = createStarfieldBakeService(renderer);
    return this;
  }

  setRenderMode(mode: SkyboxRenderMode) {
    this.#renderMode = mode;
    return this;
  }

  setImageTexture(layerId: string, texture: THREE.Texture | null) {
    if (texture) {
      this.#imageTextures.set(layerId, texture);
    } else {
      this.#imageTextures.delete(layerId);
    }

    this.material.userData.applyImageTextures?.(this.#imageTextures);

    return this;
  }

  setImageTextures(textures: ImageTextureMap) {
    this.#imageTextures.clear();

    Object.entries(textures).forEach(([layerId, texture]) => {
      if (texture) {
        this.#imageTextures.set(layerId, texture);
      }
    });

    this.material.userData.applyImageTextures?.(this.#imageTextures);

    return this;
  }

  refreshImageTextureBindings() {
    this.#materialTopologyKey = null;
    this.setManifest(this.#manifest);

    return this;
  }

  private refreshStarfieldTextureBindings() {
    this.material.userData.applyStarfieldTextures?.(this.#starfieldTextures);
  }

  otherOverridingSetup() {
    return this;
  }

  load(renderer?: SupportedRenderer) {
    if (renderer) {
      this.#renderer = renderer;
    }

    this.setManifest(this.#manifest);
    return this;
  }

  private applyGeometry(options: SkyboxGeometryOptions) {
    const nextOptions = resolveGeometryOptions(options);

    if (this.#geometryOptions.type === nextOptions.type && this.geometry) {
      return;
    }

    const previousGeometry = this.geometry;
    this.#geometryOptions = nextOptions;
    this.geometry = createSkyboxGeometry(nextOptions);
    previousGeometry.dispose();
  }

  private disposeOwnedTexture() {
    this.#ownedTexture?.dispose();
    this.#ownedTexture = null;
  }

  private disposeStarfieldTextures() {
    this.#starfieldBakeTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.#starfieldBakeTimeouts.clear();
    this.#starfieldTextures.forEach((texture) => disposeStarfieldTexture(texture));
    this.#starfieldTextures.clear();
    this.#starfieldTextureKeys.clear();
    this.#starfieldGpuBakeService?.dispose();
    this.#starfieldGpuBakeService = null;
  }

  private syncStarfieldTextures() {
    const activeLayerIds = new Set<string>();

    forEachRenderableLayer(this.#manifest.nodes, (layer) => {
      if (layer.type !== "starfield") {
        return;
      }

      activeLayerIds.add(layer.id);
      // No bake service (starfield-generation entry not imported) → key is "" and nothing bakes.
      const textureKey = this.#starfieldGpuBakeService?.createBakeKey(layer.params) ?? "";

      if (this.#starfieldTextureKeys.get(layer.id) === textureKey) {
        return;
      }

      this.scheduleStarfieldTextureBake(layer.id, layer.params);
    });

    Array.from(this.#starfieldTextures.keys()).forEach((layerId) => {
      if (activeLayerIds.has(layerId)) {
        return;
      }

      const previousTexture = this.#starfieldTextures.get(layerId);
      if (previousTexture) {
        disposeStarfieldTexture(previousTexture);
      }
      this.#starfieldTextures.delete(layerId);
      this.#starfieldTextureKeys.delete(layerId);
    });

    Array.from(this.#starfieldBakeTimeouts.entries()).forEach(([layerId, timeoutId]) => {
      if (activeLayerIds.has(layerId)) {
        return;
      }

      clearTimeout(timeoutId);
      this.#starfieldBakeTimeouts.delete(layerId);
    });
  }

  private scheduleStarfieldTextureBake(layerId: string, params: SkyboxStarfieldParams) {
    const textureKey = this.#starfieldGpuBakeService?.createBakeKey(params) ?? "";

    if (this.#starfieldTextureKeys.get(layerId) === textureKey) {
      return;
    }

    const pendingTimeout = this.#starfieldBakeTimeouts.get(layerId);

    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
    }

    const timeoutId = setTimeout(() => {
      this.#starfieldBakeTimeouts.delete(layerId);

      const node = findManifestNodeById(this.#manifest.nodes, layerId);

      if (node?.type !== "starfield") {
        return;
      }

      const currentTextureKey = this.#starfieldGpuBakeService?.createBakeKey(node.params) ?? "";

      if (currentTextureKey !== textureKey) {
        this.scheduleStarfieldTextureBake(layerId, node.params);
        return;
      }

      // Defensive: the starfield-generation entry may have registered its bake factory after
      // setRenderer ran, so (re)create the service here if it's still missing.
      if (!this.#starfieldGpuBakeService && this.#renderer) {
        this.#starfieldGpuBakeService = createStarfieldBakeService(this.#renderer);
      }

      if (!this.#starfieldGpuBakeService?.canBake()) {
        return;
      }

      const nextTexture = this.#starfieldGpuBakeService.bakeTexture(
        node.params,
        currentTextureKey
      );
      const previousTexture = this.#starfieldTextures.get(layerId);
      if (previousTexture && previousTexture !== nextTexture) {
        disposeStarfieldTexture(previousTexture);
      }
      this.#starfieldTextures.set(layerId, nextTexture);
      this.#starfieldTextureKeys.set(layerId, currentTextureKey);

      // The material is first compiled while this layer's starfield texture is still the 1x1
      // EMPTY_IMAGE_TEXTURE placeholder (the bake is debounced). Swapping textureNode.value does NOT
      // recompile the program, so the real baked texture renders under the stale placeholder
      // compile, producing the radial artifact until any manual rebuild (layer reorder/toggle).
      // When the placeholder is first replaced, force one material rebuild — the same path a reorder
      // takes — so the texture is bound under a program compiled against the real texture.
      if (!previousTexture) {
        this.#materialTopologyKey = null;
        this.setManifest(this.#manifest);
      } else {
        this.refreshStarfieldTextureBindings();
      }

      // Dispatch AFTER the rebuild: this event drives the editor's on-demand render, so emitting it
      // before the rebuild would draw the stale material and leave it on screen until the next
      // interaction (a drag). Emitting it last renders the freshly-compiled material immediately.
      this.dispatchEvent({ type: "starfieldtexturechange" } as never);
    }, 150);

    this.#starfieldBakeTimeouts.set(layerId, timeoutId);
  }

  private replaceMaterial(nextMaterial: RuntimeMaterial, ownedTexture: THREE.Texture | null = null) {
    const previousMaterial = this.material;

    this.material = nextMaterial;
    nextMaterial.userData.applyEditorLayerState?.(this.#editorLayerState);
    this.#imagePlacementOverrides.forEach((placement, layerId) => {
      nextMaterial.userData.applyImageLayerPlacement?.(layerId, placement);
    });
    nextMaterial.userData.applyStarfieldTextures?.(this.#starfieldTextures);
    previousMaterial.dispose();
    this.disposeOwnedTexture();
    this.#ownedTexture = ownedTexture;
  }

  private applyLiveManifestUniformUpdates() {
    this.material.userData.applyCompositionParams?.(this.#manifest);
    if (this.material.userData.applyLayerParams) {
      forEachRenderableLayer(this.#manifest.nodes, this.material.userData.applyLayerParams);
    }
    this.material.userData.applyImageTextures?.(this.#imageTextures);
    this.material.userData.applyStarfieldTextures?.(this.#starfieldTextures);
    this.material.userData.applyEditorLayerState?.(this.#editorLayerState);
    this.#imagePlacementOverrides.forEach((placement, layerId) => {
      this.material.userData.applyImageLayerPlacement?.(layerId, placement);
    });
  }

  setEditorPresentationEnabled(enabled: boolean) {
    if (this.#editorPresentationEnabled === enabled) {
      return this;
    }

    this.#editorPresentationEnabled = enabled;
    this.#materialTopologyKey = null;
    this.setManifest(this.#manifest);

    return this;
  }

  setEditorLayerState(state: Partial<SkyboxEditorLayerState>) {
    const nextEditorLayerState = {
      ...this.#editorLayerState,
      ...state,
    };

    if (
      nextEditorLayerState.hoveredLayerId === this.#editorLayerState.hoveredLayerId &&
      nextEditorLayerState.selectedLayerId === this.#editorLayerState.selectedLayerId
    ) {
      return this;
    }

    this.#editorLayerState = nextEditorLayerState;
    this.material.userData.applyEditorLayerState?.(this.#editorLayerState);

    return this;
  }

  setEditorImageState(state: Partial<SkyboxEditorImageState>) {
    const nextState: Partial<SkyboxEditorLayerState> = {};

    if (Object.prototype.hasOwnProperty.call(state, "hoveredImageLayerId")) {
      nextState.hoveredLayerId = state.hoveredImageLayerId ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(state, "selectedImageLayerId")) {
      nextState.selectedLayerId = state.selectedImageLayerId ?? null;
    }

    return this.setEditorLayerState(nextState);
  }

  setHoveredImageLayerId(layerId: string | null) {
    this.setEditorLayerState({ hoveredLayerId: layerId });

    return this;
  }

  setImageLayerPlacement(layerId: string, placement: SkyboxImagePlacement | null) {
    return this.updateImageLayerPlacement(layerId, placement);
  }

  updateImageLayerPlacement(layerId: string, placement: SkyboxImagePlacement | null) {
    const node = findManifestNodeById(this.#manifest.nodes, layerId);

    if (node?.type === "image") {
      node.params = {
        ...node.params,
        placement,
      };
    }

    this.#imagePlacementOverrides.set(layerId, placement);
    this.material.userData.applyImageLayerPlacement?.(layerId, placement);

    return this;
  }

  updateLayerComposition(layerId: string, composition: LayerCompositionUpdate) {
    const node = findManifestNodeById(this.#manifest.nodes, layerId);

    if (!node) {
      return this;
    }

    if (composition.blendMode !== undefined) {
      node.blendMode = composition.blendMode;
    }

    if (composition.opacity !== undefined) {
      node.opacity = composition.opacity;
    }

    this.material.userData.applyLayerComposition?.(node);

    return this;
  }

  /**
   * Direct-pipeline live update for one layer's params (editor tweaks). Layer-
   * agnostic: delegates the per-type live behavior to the registered adapter's
   * `updateLive`. Never rebuilds the material (no setManifest).
   */
  updateLayer(layerId: string, params: unknown) {
    const node = findManifestNodeById(this.#manifest.nodes, layerId);

    if (!node || node.type === "group") {
      return this;
    }

    (node as { params: unknown }).params = params;
    getLayerRuntimeAdapter(node.type)?.updateLive?.(this.#liveUpdateContext, node);

    return this;
  }

  updateGradientLayer(layerId: string, params: SkyboxGradientParams) {
    return this.updateLayer(layerId, params);
  }

  updateFieldGradientLayer(layerId: string, params: SkyboxFieldGradientParams) {
    return this.updateLayer(layerId, params);
  }

  updateSpotLayer(layerId: string, params: SkyboxSpotParams) {
    return this.updateLayer(layerId, params);
  }

  updateStarfieldLayer(layerId: string, params: SkyboxStarfieldParams) {
    return this.updateLayer(layerId, params);
  }

  setManifest(manifest: SkyboxManifest) {
    const nextManifest = migrateManifestToV2(manifest);
    this.#manifest = nextManifest;
    this.applyGeometry(this.#manifest.geometry ?? this.#geometryOptions);
    this.syncStarfieldTextures();
    const renderMode = resolveRenderMode(this.#renderMode);
    const nextTopologyKey = createMaterialTopologyKey(
      this.#manifest,
      renderMode,
      this.#editorPresentationEnabled
    );

    if (this.#materialTopologyKey === nextTopologyKey && renderMode === "live-webgpu") {
      this.applyLiveManifestUniformUpdates();
      return this;
    }

    if (renderMode === "live-webgpu") {
      this.replaceMaterial(createWebGpuMaterial(
        this.#manifest,
        this.#editorLayerState,
        this.#imageTextures,
        this.#starfieldTextures,
        new Map(),
        this.#editorPresentationEnabled
      ));
    } else {
      const texture = createBakedSkyboxTexture(this.#manifest, this.#bakeOptions);
      this.replaceMaterial(createBakedMaterialFromTexture(texture), texture);
    }

    this.#materialTopologyKey = nextTopologyKey;

    return this;
  }

  setBakedTexture(texture: THREE.Texture) {
    this.replaceMaterial(createBakedMaterialFromTexture(texture));
    this.#materialTopologyKey = null;

    return this;
  }

  invalidateBakeCache() {
    invalidateGlobalBakeCache();
    return this;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.disposeOwnedTexture();
    this.disposeStarfieldTextures();
  }
}
