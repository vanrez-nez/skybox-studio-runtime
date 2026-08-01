import * as THREE from "three";

import { invalidateBakeCache as invalidateGlobalBakeCache } from "./baking/bake";
import {
  createSkyboxGeometry,
  resolveGeometryOptions,
} from "./skybox/geometry";
import { DEFAULT_EDITOR_LAYER_STATE } from "./skybox/editor-presentation";
import { disposeStarfieldTexture } from "./layer-addons/builtins/starfield";
import {
  disposeCloudFieldTextures,
  syncCloudFieldTextures,
} from "./layer-addons/builtins/clouds";
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
import {
  DEFAULT_SKYBOX_GEOMETRY,
  migrateManifestToV2,
  resolveCloudLightReferences,
} from "./manifest";
import { createStarfieldBakeService } from "./baking/starfield-bake-registry";
import type {
  StarfieldGlintHandle,
  StarfieldGpuBakeService,
  StarGlintViewport,
} from "./baking/starfield-gpu-bake";
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
  createWebGpuCoverageMaterial,
  createWebGpuMaterial,
  forEachRenderableLayer,
  findManifestNodeById,
  manifestHasLayerAboveStarfield,
  resolveRenderMode,
} from "./skybox/materials";

// Live starfield equirect bakes carry nebula only; star cores render via the screen-space glint
// pass. (Export bakes — a different service instance, no viewport — keep full fixed-angular stars.)
const NEBULA_ONLY_BAKE = { starsOmitted: true } as const;

const DEFAULT_MANIFEST: SkyboxManifestV2 = {
  composition: { mode: "alpha-over", order: "bottom-to-top" },
  geometry: DEFAULT_SKYBOX_GEOMETRY,
  nodes: [],
  version: 2,
};



export class Skybox extends THREE.Mesh<THREE.BufferGeometry, RuntimeMaterial> {
  #bakeOptions: SkyboxBakeOptions = {};
  #cloudFieldTextures = new Map<string, THREE.Texture>();
  #editorLayerState: SkyboxEditorLayerState = { ...DEFAULT_EDITOR_LAYER_STATE };
  #editorPresentationEnabled = false;
  #geometryOptions: SkyboxGeometryOptions = DEFAULT_SKYBOX_GEOMETRY;
  #imagePlacementOverrides = new Map<string, SkyboxImagePlacement | null>();
  #imageTextures = new Map<string, THREE.Texture>();
  #liveUpdateContext: LayerLiveUpdateContext = {
    applyLayerParams: (layer) => {
      this.material.userData.applyLayerParams?.(layer);
      this.#coverageMaterial?.userData.applyLayerParams?.(layer);
    },
    applyImagePlacement: (layerId, placement) => {
      this.#imagePlacementOverrides.set(layerId, placement as SkyboxImagePlacement | null);
      this.material.userData.applyImageLayerPlacement?.(layerId, placement);
      this.#coverageMaterial?.userData.applyImageLayerPlacement?.(layerId, placement);
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
  #starGlintViewport: StarGlintViewport | null = null;
  #starfieldBakeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  #starfieldTextureKeys = new Map<string, string>();
  #starfieldTextures = new Map<string, THREE.Texture>();
  #time = 0;
  // Live screen-space star glints (constant-pixel stars), one child mesh per starfield layer. The
  // equirect texture above carries nebula only on the live path; the glints render the star cores.
  #starfieldGlints = new Map<string, { handle: StarfieldGlintHandle; geometryKey: string }>();
  // Phase B: per-frame transmittance pre-pass so opaque layers above a starfield occlude its glints.
  // The coverage material renders into #coverageTarget (offscreen) before the composite each frame;
  // the glints sample it. Only built when live + glints exist + a layer sits above a starfield.
  #coverageScene = new THREE.Scene();
  #coverageGeometry: THREE.BufferGeometry | null = null;
  #coverageMesh: THREE.Mesh | null = null;
  #coverageMaterial: RuntimeMaterial | null = null;
  #coverageTarget: THREE.RenderTarget | null = null;
  #coverageTopologyKey: string | null = null;
  #coverageSize = new THREE.Vector2();

  constructor() {
    super(
      createSkyboxGeometry(DEFAULT_SKYBOX_GEOMETRY),
      createWebGpuMaterial(
        DEFAULT_MANIFEST,
        DEFAULT_EDITOR_LAYER_STATE,
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        false,
      )
    );
    this.frustumCulled = false;
    this.renderOrder = -1;
    // The composite mesh draws first (renderOrder -1); render the glint occlusion coverage just
    // before it so the offscreen transmittance target is ready when the glints sample it later.
    this.onBeforeRender = ((renderer: unknown, _scene: unknown, camera: unknown) => {
      this.renderCoveragePrepass(renderer, camera as THREE.Camera);
    }) as THREE.Mesh["onBeforeRender"];
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

  /**
   * Supplies deterministic host time to Dynamic Clouds layers. This is a
   * uniform-only update: it never rebuilds the material or regenerates the
   * baked cloud-field texture. The host remains responsible for rendering.
   */
  setTime(timeSeconds: number) {
    if (!Number.isFinite(timeSeconds) || this.#time === timeSeconds) {
      return this;
    }

    this.#time = timeSeconds;
    this.material.userData.applyTime?.(timeSeconds);
    this.#coverageMaterial?.userData.applyTime?.(timeSeconds);

    return this;
  }

  // Tell the runtime which viewport the starfield will be VIEWED through so stars hold a fixed
  // logical-pixel size regardless of FOV/resolution (displayPixelAngle = verticalFovRadians /
  // renderHeight). `renderHeight` must be logical/CSS pixels (e.g. canvas client height), not the
  // device drawing-buffer height, so apparent size stays constant across device-pixel ratios.
  // Pass null to fall back to the legacy fixed-angular star size. Changing it re-bakes starfields.
  setStarGlintViewport(viewport: StarGlintViewport | null) {
    const next =
      viewport && viewport.renderHeight > 0 && viewport.verticalFovRadians > 0
        ? { renderHeight: viewport.renderHeight, verticalFovRadians: viewport.verticalFovRadians }
        : null;
    // Only renderHeight reaches the glint shader (logical→device px conversion); FOV is intentionally
    // ignored now — the screen-space pass is FOV-independent, which is what removes the wide-FOV
    // streaks. The nebula equirect bake no longer depends on the viewport, so this never re-bakes.
    const changed = this.#starGlintViewport?.renderHeight !== next?.renderHeight;

    this.#starGlintViewport = next;

    if (changed) {
      this.#starfieldGlints.forEach(({ handle }) => handle.setViewport(next));
    }

    return this;
  }

  setImageTexture(layerId: string, texture: THREE.Texture | null) {
    if (texture) {
      this.#imageTextures.set(layerId, texture);
    } else {
      this.#imageTextures.delete(layerId);
    }

    this.material.userData.applyImageTextures?.(this.#imageTextures);
    this.#coverageMaterial?.userData.applyImageTextures?.(this.#imageTextures);

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
    this.#coverageMaterial?.userData.applyImageTextures?.(this.#imageTextures);

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

  private disposeStarfieldGlints() {
    this.#starfieldGlints.forEach(({ handle }) => {
      this.remove(handle.object);
      handle.dispose();
    });
    this.#starfieldGlints.clear();
  }

  private disposeStarfieldGlint(layerId: string) {
    const entry = this.#starfieldGlints.get(layerId);

    if (!entry) {
      return;
    }

    this.remove(entry.handle.object);
    entry.handle.dispose();
    this.#starfieldGlints.delete(layerId);
  }

  // Keep a starfield layer's screen-space glint child in sync. Glints exist only on the live WebGPU
  // path (the baked path samples a full CPU/GPU equirect, stars included). Geometry rebuilds only
  // when the distribution key changes; otherwise it's a uniform-only update for live slider tweaks.
  private syncStarfieldGlint(layerId: string, params: SkyboxStarfieldParams) {
    const service = this.#starfieldGpuBakeService;

    if (!service?.createGlints || resolveRenderMode(this.#renderMode) !== "live-webgpu") {
      this.disposeStarfieldGlint(layerId);
      return;
    }

    const geometryKey = service.glintGeometryKey(params);
    const existing = this.#starfieldGlints.get(layerId);

    if (existing) {
      if (existing.geometryKey === geometryKey) {
        existing.handle.setParams(params);
        return;
      }

      this.remove(existing.handle.object);
      existing.handle.dispose();
    }

    const handle = service.createGlints(params);

    handle.setViewport(this.#starGlintViewport);
    handle.setCoverageTexture(this.#coverageTarget?.texture ?? null);
    this.add(handle.object);
    this.#starfieldGlints.set(layerId, { handle, geometryKey });
  }

  // Coverage is worth running only when glints render live AND some layer sits above a starfield to
  // occlude them. Otherwise glints stay fully visible (no pre-pass cost).
  private coverageActive() {
    return (
      resolveRenderMode(this.#renderMode) === "live-webgpu" &&
      this.#starfieldGlints.size > 0 &&
      manifestHasLayerAboveStarfield(this.#manifest.nodes)
    );
  }

  private disposeCoverage() {
    if (this.#coverageMesh) {
      this.#coverageScene.remove(this.#coverageMesh);
      this.#coverageMesh = null;
    }
    this.#coverageMaterial?.dispose();
    this.#coverageMaterial = null;
    this.#coverageTopologyKey = null;
    this.#starfieldGlints.forEach(({ handle }) => handle.setCoverageTexture(null));
  }

  // Build/teardown the coverage material when the layer topology changes; bind its target to glints.
  private syncCoverage(topologyKey: string) {
    if (!this.coverageActive()) {
      this.disposeCoverage();
      return;
    }

    if (!this.#coverageMaterial || this.#coverageTopologyKey !== topologyKey) {
      this.#coverageMaterial?.dispose();
      if (this.#coverageMesh) {
        this.#coverageScene.remove(this.#coverageMesh);
      }

      this.#coverageMaterial = createWebGpuCoverageMaterial(
        this.#manifest,
        this.#imageTextures,
        this.#starfieldTextures,
        new Map(),
        this.#cloudFieldTextures,
      );
      this.#coverageMaterial.userData.applyTime?.(this.#time);
      this.#coverageMaterial.userData.applyImageTextures?.(this.#imageTextures);
      this.#imagePlacementOverrides.forEach((placement, layerId) => {
        this.#coverageMaterial?.userData.applyImageLayerPlacement?.(layerId, placement);
      });

      if (!this.#coverageGeometry) {
        // screenUV-derived direction + z=w vertex → any enclosing geometry fills the screen, so a
        // fixed sphere works regardless of the actual sky geometry type.
        this.#coverageGeometry = createSkyboxGeometry(DEFAULT_SKYBOX_GEOMETRY);
      }

      this.#coverageMesh = new THREE.Mesh(this.#coverageGeometry, this.#coverageMaterial);
      this.#coverageMesh.frustumCulled = false;
      this.#coverageScene.add(this.#coverageMesh);

      if (!this.#coverageTarget) {
        this.#coverageTarget = new THREE.RenderTarget(1, 1, { depthBuffer: false });
      }

      this.#coverageTopologyKey = topologyKey;
    }

    const coverageTexture = this.#coverageTarget?.texture ?? null;
    this.#starfieldGlints.forEach(({ handle }) => handle.setCoverageTexture(coverageTexture));
  }

  private renderCoveragePrepass(renderer: unknown, camera: THREE.Camera) {
    const gpu = renderer as {
      autoClear: boolean;
      getDrawingBufferSize?: (target: THREE.Vector2) => THREE.Vector2;
      getRenderTarget: () => THREE.RenderTarget | null;
      render: (scene: THREE.Scene, camera: THREE.Camera) => void;
      setRenderTarget: (target: THREE.RenderTarget | null) => void;
    };

    if (!this.#coverageMesh || !this.#coverageTarget || typeof gpu.setRenderTarget !== "function") {
      return;
    }

    gpu.getDrawingBufferSize?.(this.#coverageSize);
    const width = Math.max(1, Math.floor(this.#coverageSize.x || this.#coverageTarget.width));
    const height = Math.max(1, Math.floor(this.#coverageSize.y || this.#coverageTarget.height));

    if (this.#coverageTarget.width !== width || this.#coverageTarget.height !== height) {
      this.#coverageTarget.setSize(width, height);
    }

    const previousTarget = gpu.getRenderTarget();
    const previousAutoClear = gpu.autoClear;

    gpu.autoClear = true;
    gpu.setRenderTarget(this.#coverageTarget);
    gpu.render(this.#coverageScene, camera);
    gpu.setRenderTarget(previousTarget);
    gpu.autoClear = previousAutoClear;
  }

  private syncStarfieldTextures() {
    const activeLayerIds = new Set<string>();

    forEachRenderableLayer(this.#manifest.nodes, (layer) => {
      if (layer.type !== "starfield") {
        return;
      }

      activeLayerIds.add(layer.id);
      // Stars render via the screen-space glint child; keep it in sync every pass (cheap when
      // unchanged). The equirect texture is baked nebula-only.
      this.syncStarfieldGlint(layer.id, layer.params);
      // No bake service (starfield-generation entry not imported) → key is "" and nothing bakes.
      const textureKey =
        this.#starfieldGpuBakeService?.createBakeKey(layer.params, undefined, null, NEBULA_ONLY_BAKE) ?? "";

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

    Array.from(this.#starfieldGlints.keys()).forEach((layerId) => {
      if (!activeLayerIds.has(layerId)) {
        this.disposeStarfieldGlint(layerId);
      }
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
    // Apply star appearance to the glint child immediately (live slider response); only the
    // nebula equirect re-bake below is debounced.
    this.syncStarfieldGlint(layerId, params);

    const textureKey =
      this.#starfieldGpuBakeService?.createBakeKey(params, undefined, null, NEBULA_ONLY_BAKE) ?? "";

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

      const currentTextureKey =
        this.#starfieldGpuBakeService?.createBakeKey(node.params, undefined, null, NEBULA_ONLY_BAKE) ?? "";

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
        currentTextureKey,
        undefined,
        null,
        NEBULA_ONLY_BAKE
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
    nextMaterial.userData.applyCloudFieldTextures?.(this.#cloudFieldTextures);
    nextMaterial.userData.applyTime?.(this.#time);
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
    this.material.userData.applyCloudFieldTextures?.(this.#cloudFieldTextures);
    this.material.userData.applyTime?.(this.#time);
    this.material.userData.applyEditorLayerState?.(this.#editorLayerState);
    this.#imagePlacementOverrides.forEach((placement, layerId) => {
      this.material.userData.applyImageLayerPlacement?.(layerId, placement);
    });
    // Mirror the occlusion-relevant updates (image alpha/placement, layer params) to the coverage
    // material so glint occlusion tracks live image edits without a topology rebuild.
    if (this.#coverageMaterial) {
      this.#coverageMaterial.userData.applyCompositionParams?.(this.#manifest);
      if (this.#coverageMaterial.userData.applyLayerParams) {
        forEachRenderableLayer(this.#manifest.nodes, this.#coverageMaterial.userData.applyLayerParams);
      }
      this.#coverageMaterial.userData.applyImageTextures?.(this.#imageTextures);
      this.#coverageMaterial.userData.applyCloudFieldTextures?.(
        this.#cloudFieldTextures,
      );
      this.#coverageMaterial.userData.applyTime?.(this.#time);
      this.#imagePlacementOverrides.forEach((placement, layerId) => {
        this.#coverageMaterial?.userData.applyImageLayerPlacement?.(layerId, placement);
      });
    }
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
    this.#coverageMaterial?.userData.applyImageLayerPlacement?.(layerId, placement);
    this.#manifest = resolveCloudLightReferences(this.#manifest);
    forEachRenderableLayer(this.#manifest.nodes, (layer) => {
      if (layer.type === "clouds") {
        this.#liveUpdateContext.applyLayerParams(layer);
      }
    });

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
    this.#coverageMaterial?.userData.applyLayerComposition?.(node);

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
    this.#manifest = resolveCloudLightReferences(this.#manifest);
    const resolvedNode = findManifestNodeById(this.#manifest.nodes, layerId);

    if (!resolvedNode || resolvedNode.type === "group") {
      return this;
    }

    const cloudFieldChanged = syncCloudFieldTextures(
      this.#manifest,
      this.#cloudFieldTextures,
    );
    if (cloudFieldChanged) {
      this.material.userData.applyCloudFieldTextures?.(this.#cloudFieldTextures);
      this.#coverageMaterial?.userData.applyCloudFieldTextures?.(
        this.#cloudFieldTextures,
      );
    }

    getLayerRuntimeAdapter(resolvedNode.type)?.updateLive?.(
      this.#liveUpdateContext,
      resolvedNode,
    );

    // Image/Spot movement can drive either Clouds light. Re-resolve and push
    // only those dependent sky uniforms; the field texture and material stay put.
    if (resolvedNode.type === "image" || resolvedNode.type === "spot") {
      forEachRenderableLayer(this.#manifest.nodes, (layer) => {
        if (layer.type === "clouds") {
          this.#liveUpdateContext.applyLayerParams(layer);
        }
      });
    }
    this.material.userData.applyTime?.(this.#time);
    this.#coverageMaterial?.userData.applyTime?.(this.#time);

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
    syncCloudFieldTextures(this.#manifest, this.#cloudFieldTextures);
    this.syncStarfieldTextures();
    const renderMode = resolveRenderMode(this.#renderMode);
    const nextTopologyKey = createMaterialTopologyKey(
      this.#manifest,
      renderMode,
      this.#editorPresentationEnabled
    );

    if (this.#materialTopologyKey === nextTopologyKey && renderMode === "live-webgpu") {
      this.applyLiveManifestUniformUpdates();
      this.syncCoverage(nextTopologyKey);
      return this;
    }

    if (renderMode === "live-webgpu") {
      this.replaceMaterial(createWebGpuMaterial(
        this.#manifest,
        this.#editorLayerState,
        this.#imageTextures,
        this.#starfieldTextures,
        new Map(),
        this.#cloudFieldTextures,
        this.#editorPresentationEnabled
      ));
    } else {
      const texture = createBakedSkyboxTexture(this.#manifest, this.#bakeOptions);
      this.replaceMaterial(createBakedMaterialFromTexture(texture), texture);
    }

    this.#materialTopologyKey = nextTopologyKey;
    this.material.userData.applyTime?.(this.#time);
    this.syncCoverage(nextTopologyKey);

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
    disposeCloudFieldTextures(this.#cloudFieldTextures);
    this.disposeStarfieldTextures();
    this.disposeStarfieldGlints();
    this.disposeCoverage();
    this.#coverageGeometry?.dispose();
    this.#coverageGeometry = null;
    this.#coverageTarget?.dispose();
    this.#coverageTarget = null;
  }
}
