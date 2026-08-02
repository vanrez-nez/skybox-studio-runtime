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
import {
  createMoonGpuBakeService,
  type MoonBakeTarget,
  type MoonGpuBakeService,
} from "./layer-addons/builtins/moon/service";
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
  SkyboxMoonParams,
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
  createWebGpuMaterial,
  forEachRenderableLayer,
  findManifestNodeById,
  resolveRenderMode,
} from "./skybox/materials";

// Live starfield equirect bakes carry nebula only; star cores render via the screen-space glint
// pass. (Export bakes — a different service instance, no viewport — keep full fixed-angular stars.)
const NEBULA_ONLY_BAKE = { starsOmitted: true } as const;
const DEFAULT_VIEWPORT_FOV_RADIANS = THREE.MathUtils.degToRad(50);
const DEFAULT_VIEWPORT_HEIGHT = 1024;

const DEFAULT_MANIFEST: SkyboxManifestV2 = {
  composition: { mode: "alpha-over", order: "bottom-to-top" },
  geometry: DEFAULT_SKYBOX_GEOMETRY,
  nodes: [],
  version: 2,
};

type StarfieldGlintTargetEntry = {
  cameraQuaternion: THREE.Quaternion;
  dirty: boolean;
  geometryKey: string;
  handle: StarfieldGlintHandle;
  hasCameraState: boolean;
  projectionMatrix: THREE.Matrix4;
  scene: THREE.Scene;
  target: THREE.RenderTarget;
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
    },
    applyImagePlacement: (layerId, placement) => {
      this.#imagePlacementOverrides.set(layerId, placement as SkyboxImagePlacement | null);
      this.material.userData.applyImageLayerPlacement?.(layerId, placement);
    },
    scheduleResourceBake: (layerId, params) => {
      const node = findManifestNodeById(this.#manifest.nodes, layerId);

      if (node?.type === "starfield") {
        this.scheduleStarfieldTextureBake(layerId, params as SkyboxStarfieldParams);
      } else if (node?.type === "moon") {
        this.scheduleMoonTextureBake(layerId, params as SkyboxMoonParams);
      }
    },
  };
  #manifest: SkyboxManifestV2 = DEFAULT_MANIFEST;
  #materialTopologyKey: string | null = null;
  #moonBakeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  #moonGpuBakeService: MoonGpuBakeService | null = null;
  #moonTextures = new Map<string, THREE.Texture>();
  #ownedTexture: THREE.Texture | null = null;
  #renderMode: SkyboxRenderMode = "auto";
  #renderer: SupportedRenderer | null = null;
  #starfieldGpuBakeService: StarfieldGpuBakeService | null = null;
  #starGlintViewport: StarGlintViewport | null = null;
  #starfieldBakeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  #starfieldTextureKeys = new Map<string, string>();
  #starfieldTextures = new Map<string, THREE.Texture>();
  #starfieldScreenTextures = new Map<string, THREE.Texture>();
  #time = 0;
  // Constant-pixel star cores are cached per Starfield in viewport-space render targets, then
  // sampled by that layer before normal composition. A target is refreshed only when its own star
  // data, the viewport, or the camera projection/orientation changes.
  #starfieldGlints = new Map<string, StarfieldGlintTargetEntry>();
  #starfieldGlintTargetSize = new THREE.Vector2();
  #starfieldGlintCameraQuaternion = new THREE.Quaternion();
  #starfieldGlintClearColor = new THREE.Color();

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
        new Map(),
        new Map(),
        false,
      )
    );
    this.frustumCulled = false;
    this.renderOrder = -1;
    // Refresh invalidated Starfield targets immediately before the sky composition samples them.
    this.onBeforeRender = ((renderer: unknown, _scene: unknown, camera: unknown) => {
      this.renderStarfieldGlintTargets(renderer, camera as THREE.Camera);
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
    this.disposeMoonTextures();
    this.#moonGpuBakeService = createMoonGpuBakeService(renderer);
    this.syncMoonTextures();
    this.#starfieldGlints.forEach((entry) => {
      entry.dirty = true;
    });
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

    return this;
  }

  // Tell viewport-aware resources how the sky is being viewed. `renderHeight` is logical/CSS
  // pixels, not drawing-buffer pixels: Starfield uses it for fixed-pixel cores, while Moon uses it
  // together with FOV to choose an automatic texture resolution. Pass null for their defaults.
  setViewport(viewport: StarGlintViewport | null) {
    const next =
      viewport && viewport.renderHeight > 0 && viewport.verticalFovRadians > 0
        ? { renderHeight: viewport.renderHeight, verticalFovRadians: viewport.verticalFovRadians }
        : null;
    // Only renderHeight reaches the glint shader; FOV remains relevant to Moon's projected size.
    const changed =
      this.#starGlintViewport?.renderHeight !== next?.renderHeight ||
      this.#starGlintViewport?.verticalFovRadians !== next?.verticalFovRadians;

    this.#starGlintViewport = next;

    if (changed) {
      this.#starfieldGlints.forEach((entry) => {
        entry.handle.setViewport(next);
        entry.dirty = true;
      });
      this.syncMoonTextures();
    }

    return this;
  }

  setStarGlintViewport(viewport: StarGlintViewport | null) {
    return this.setViewport(viewport);
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

  private disposeMoonTextures() {
    this.#moonBakeTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.#moonBakeTimeouts.clear();
    this.#moonTextures.clear();
    this.#moonGpuBakeService?.dispose();
    this.#moonGpuBakeService = null;
  }

  private getMoonBakeTarget(): MoonBakeTarget {
    return {
      kind: "viewport",
      renderHeight: this.#starGlintViewport?.renderHeight ?? DEFAULT_VIEWPORT_HEIGHT,
      verticalFovRadians:
        this.#starGlintViewport?.verticalFovRadians ?? DEFAULT_VIEWPORT_FOV_RADIANS,
    };
  }

  private syncMoonTextures() {
    const activeLayerIds = new Set<string>();

    forEachRenderableLayer(this.#manifest.nodes, (layer) => {
      if (layer.type !== "moon") {
        return;
      }

      activeLayerIds.add(layer.id);
      this.scheduleMoonTextureBake(layer.id, layer.params);
    });

    Array.from(this.#moonTextures.keys()).forEach((layerId) => {
      if (!activeLayerIds.has(layerId)) {
        this.#moonGpuBakeService?.disposeLayer(layerId);
        this.#moonTextures.delete(layerId);
      }
    });

    Array.from(this.#moonBakeTimeouts.entries()).forEach(([layerId, timeoutId]) => {
      if (!activeLayerIds.has(layerId)) {
        clearTimeout(timeoutId);
        this.#moonBakeTimeouts.delete(layerId);
      }
    });

    this.material.userData.applyMoonTextures?.(this.#moonTextures);
  }

  private scheduleMoonTextureBake(layerId: string, _params: SkyboxMoonParams) {
    const pendingTimeout = this.#moonBakeTimeouts.get(layerId);
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
    }

    const timeoutId = setTimeout(async () => {
      this.#moonBakeTimeouts.delete(layerId);
      const node = findManifestNodeById(this.#manifest.nodes, layerId);

      if (node?.type !== "moon") {
        return;
      }

      if (!this.#moonGpuBakeService && this.#renderer) {
        this.#moonGpuBakeService = createMoonGpuBakeService(this.#renderer);
      }

      const service = this.#moonGpuBakeService;
      if (!service?.canBake()) {
        return;
      }

      try {
        const previousTexture = this.#moonTextures.get(layerId);
        const nextTexture = await service.bakeLayer(
          layerId,
          node.params,
          this.getMoonBakeTarget(),
        );

        if (service !== this.#moonGpuBakeService) {
          return;
        }

        const currentNode = findManifestNodeById(this.#manifest.nodes, layerId);

        if (currentNode?.type !== "moon") {
          service.disposeLayer(layerId);
          return;
        }

        this.#moonTextures.set(layerId, nextTexture);

        if (!previousTexture) {
          this.#materialTopologyKey = null;
          this.setManifest(this.#manifest);
        } else {
          this.material.userData.applyMoonTextures?.(this.#moonTextures);
        }

        this.dispatchEvent({ type: "moontexturechange" } as never);
      } catch (error) {
        if (service === this.#moonGpuBakeService) {
          console.error(`Failed to bake Moon layer ${layerId}.`, error);
        }
      }
    }, 150);

    this.#moonBakeTimeouts.set(layerId, timeoutId);
  }

  private disposeStarfieldGlints() {
    this.#starfieldGlints.forEach((entry) => {
      entry.scene.remove(entry.handle.object);
      entry.handle.dispose();
      entry.target.dispose();
    });
    this.#starfieldGlints.clear();
    this.#starfieldScreenTextures.clear();
  }

  private disposeStarfieldGlint(layerId: string) {
    const entry = this.#starfieldGlints.get(layerId);

    if (!entry) {
      return;
    }

    entry.scene.remove(entry.handle.object);
    entry.handle.dispose();
    entry.target.dispose();
    this.#starfieldGlints.delete(layerId);
    this.#starfieldScreenTextures.delete(layerId);
    this.material.userData.applyStarfieldScreenTextures?.(this.#starfieldScreenTextures);
  }

  private createStarfieldGlintTarget(layerId: string) {
    const target = new THREE.RenderTarget(1, 1, {
      depthBuffer: false,
      format: THREE.RGBAFormat,
      generateMipmaps: false,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      stencilBuffer: false,
      type: THREE.UnsignedByteType,
    });

    target.texture.colorSpace = THREE.SRGBColorSpace;
    target.texture.generateMipmaps = false;
    target.texture.name = `Starfield screen target ${layerId}`;

    return target;
  }

  // Keep one Starfield layer's cached screen-space core target in sync. Geometry rebuilds only when
  // the distribution changes; appearance changes update uniforms and invalidate only this target.
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
        existing.handle.setCoverageTexture(null);
        existing.dirty = true;
        return;
      }

      existing.scene.remove(existing.handle.object);
      existing.handle.dispose();
      const handle = service.createGlints(params);

      handle.setViewport(this.#starGlintViewport);
      handle.setCoverageTexture(null);
      existing.scene.add(handle.object);
      existing.handle = handle;
      existing.geometryKey = geometryKey;
      existing.dirty = true;
      return;
    }

    const handle = service.createGlints(params);
    const scene = new THREE.Scene();
    const target = this.createStarfieldGlintTarget(layerId);

    handle.setViewport(this.#starGlintViewport);
    handle.setCoverageTexture(null);
    scene.add(handle.object);
    this.#starfieldGlints.set(layerId, {
      cameraQuaternion: new THREE.Quaternion(),
      dirty: true,
      geometryKey,
      handle,
      hasCameraState: false,
      projectionMatrix: new THREE.Matrix4(),
      scene,
      target,
    });
    this.#starfieldScreenTextures.set(layerId, target.texture);
    this.material.userData.applyStarfieldScreenTextures?.(this.#starfieldScreenTextures);
  }

  private renderStarfieldGlintTargets(renderer: unknown, camera: THREE.Camera) {
    const gpu = renderer as {
      autoClear: boolean;
      getClearAlpha?: () => number;
      getClearColor?: (target: THREE.Color) => THREE.Color;
      getDrawingBufferSize?: (target: THREE.Vector2) => THREE.Vector2;
      getRenderTarget: () => THREE.RenderTarget | null;
      render: (scene: THREE.Scene, camera: THREE.Camera) => void;
      setClearColor?: (color: THREE.ColorRepresentation, alpha?: number) => void;
      setRenderTarget: (target: THREE.RenderTarget | null) => void;
    };

    if (this.#starfieldGlints.size === 0 || typeof gpu.setRenderTarget !== "function") {
      return;
    }

    gpu.getDrawingBufferSize?.(this.#starfieldGlintTargetSize);
    const firstTarget = this.#starfieldGlints.values().next().value?.target as
      | THREE.RenderTarget
      | undefined;
    const width = Math.max(1, Math.floor(this.#starfieldGlintTargetSize.x || firstTarget?.width || 1));
    const height = Math.max(1, Math.floor(this.#starfieldGlintTargetSize.y || firstTarget?.height || 1));
    camera.getWorldQuaternion(this.#starfieldGlintCameraQuaternion);

    const invalidatedEntries = Array.from(this.#starfieldGlints.values()).filter((entry) => {
      if (entry.target.width !== width || entry.target.height !== height) {
        entry.target.setSize(width, height);
        entry.dirty = true;
      }

      if (
        !entry.hasCameraState ||
        !entry.cameraQuaternion.equals(this.#starfieldGlintCameraQuaternion) ||
        !entry.projectionMatrix.equals(camera.projectionMatrix)
      ) {
        entry.dirty = true;
      }

      return entry.dirty;
    });

    if (invalidatedEntries.length === 0) {
      return;
    }

    const previousTarget = gpu.getRenderTarget();
    const previousAutoClear = gpu.autoClear;
    const previousClearAlpha = gpu.getClearAlpha?.() ?? 1;
    const previousClearColor = gpu.getClearColor?.(this.#starfieldGlintClearColor)?.clone();

    gpu.autoClear = true;
    gpu.setClearColor?.(0x000000, 0);
    invalidatedEntries.forEach((entry) => {
      gpu.setRenderTarget(entry.target);
      gpu.render(entry.scene, camera);
      entry.cameraQuaternion.copy(this.#starfieldGlintCameraQuaternion);
      entry.projectionMatrix.copy(camera.projectionMatrix);
      entry.hasCameraState = true;
      entry.dirty = false;
    });
    gpu.setRenderTarget(previousTarget);
    if (previousClearColor) {
      gpu.setClearColor?.(previousClearColor, previousClearAlpha);
    }
    gpu.autoClear = previousAutoClear;
  }

  private syncStarfieldTextures() {
    const activeLayerIds = new Set<string>();

    forEachRenderableLayer(this.#manifest.nodes, (layer) => {
      if (layer.type !== "starfield") {
        return;
      }

      activeLayerIds.add(layer.id);
      // Stars render into the layer's cached screen-space target; the equirect texture is
      // baked nebula-only.
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
    // Apply star appearance to the cached screen target immediately; only the nebula equirect
    // re-bake below is debounced.
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
    nextMaterial.userData.applyStarfieldScreenTextures?.(this.#starfieldScreenTextures);
    nextMaterial.userData.applyCloudFieldTextures?.(this.#cloudFieldTextures);
    nextMaterial.userData.applyMoonTextures?.(this.#moonTextures);
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
    this.material.userData.applyStarfieldScreenTextures?.(this.#starfieldScreenTextures);
    this.material.userData.applyCloudFieldTextures?.(this.#cloudFieldTextures);
    this.material.userData.applyMoonTextures?.(this.#moonTextures);
    this.material.userData.applyTime?.(this.#time);
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
    this.#manifest = resolveCloudLightReferences(this.#manifest);
    forEachRenderableLayer(this.#manifest.nodes, (layer) => {
      if (layer.id === layerId) {
        return;
      }
      const adapter = getLayerRuntimeAdapter(layer.type);
      if (adapter?.consumesLightSources) {
        adapter.updateLive?.(this.#liveUpdateContext, layer);
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
    }

    getLayerRuntimeAdapter(resolvedNode.type)?.updateLive?.(
      this.#liveUpdateContext,
      resolvedNode,
    );

    // Any light-source layer (spot, image, moon, sun, ...) can drive a
    // consumer's resolved light state (Clouds lights, Sun occluders, Moon
    // dynamic lighting). Re-run each consumer's live update so uniforms are
    // re-pushed and resource bakes (the moon's sprite) are re-scheduled; the
    // material stays put. The edited layer itself already ran updateLive.
    if (getLayerRuntimeAdapter(resolvedNode.type)?.getLightSource) {
      forEachRenderableLayer(this.#manifest.nodes, (layer) => {
        if (layer.id === layerId) {
          return;
        }
        const adapter = getLayerRuntimeAdapter(layer.type);
        if (adapter?.consumesLightSources) {
          adapter.updateLive?.(this.#liveUpdateContext, layer);
        }
      });
    }
    this.material.userData.applyTime?.(this.#time);

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

  updateMoonLayer(layerId: string, params: SkyboxMoonParams) {
    return this.updateLayer(layerId, params);
  }

  setManifest(manifest: SkyboxManifest) {
    const nextManifest = migrateManifestToV2(manifest);
    this.#manifest = nextManifest;
    this.applyGeometry(this.#manifest.geometry ?? this.#geometryOptions);
    syncCloudFieldTextures(this.#manifest, this.#cloudFieldTextures);
    this.syncStarfieldTextures();
    this.syncMoonTextures();
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
        this.#starfieldScreenTextures,
        new Map(),
        this.#cloudFieldTextures,
        this.#moonTextures,
        this.#editorPresentationEnabled
      ));
    } else {
      const texture = createBakedSkyboxTexture(this.#manifest, this.#bakeOptions);
      this.replaceMaterial(createBakedMaterialFromTexture(texture), texture);
    }

    this.#materialTopologyKey = nextTopologyKey;
    this.material.userData.applyTime?.(this.#time);

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
    this.disposeMoonTextures();
    this.disposeStarfieldTextures();
    this.disposeStarfieldGlints();
  }
}
