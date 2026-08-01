import * as THREE from "three";

import type { BakedSkyboxImageData } from "./bake";
import { migrateManifestToV2, type SkyboxManifest } from "../manifest";
import { createWebGpuEquirectBakeMaterial } from "../skybox/materials";
import {
  disposeCloudFieldTextures,
  syncCloudFieldTextures,
} from "../layer-addons/builtins/clouds";
import {
  createMoonGpuBakeService,
  type MoonGpuBakeService,
} from "../layer-addons/builtins/moon/service";

export type SkyboxGpuBakeOptions = {
  /** When true (and `hdr`), bake into a full 32-bit float target instead of 16-bit half-float. */
  float?: boolean;
  /** When true, vertically pre-flip the bake (the EXR exporter flips scanlines unconditionally). */
  flipY?: boolean;
  /** When true, bake into a linear float target (for HDR/EXR export). */
  hdr?: boolean;
  height: number;
  imageTextures?: Map<string, THREE.Texture>;
  moonTextures?: Map<string, THREE.Texture>;
  cloudFieldTextures?: Map<string, THREE.Texture>;
  starfieldTextures?: Map<string, THREE.Texture>;
  width: number;
};

export type SkyboxGpuBakeTarget = {
  /** Dispose the render target + bake material. Call once done reading the target. */
  dispose: () => void;
  height: number;
  target: THREE.RenderTarget;
  width: number;
};

type SkyboxGpuBakeRenderer = {
  autoClear: boolean;
  clear: () => void;
  getClearAlpha: () => number;
  getClearColor: (target: THREE.Color) => THREE.Color;
  getRenderTarget: () => THREE.RenderTarget | null;
  readRenderTargetPixels?: (
    renderTarget: THREE.RenderTarget,
    x: number,
    y: number,
    width: number,
    height: number,
    buffer: ArrayBufferView
  ) => void;
  readRenderTargetPixelsAsync?: (
    renderTarget: THREE.RenderTarget,
    x: number,
    y: number,
    width: number,
    height: number
  ) => Promise<ArrayBufferView>;
  render: (scene: THREE.Scene, camera: THREE.Camera) => void;
  setClearColor: (color: THREE.ColorRepresentation, alpha?: number) => void;
  setRenderTarget: (target: THREE.RenderTarget | null) => void;
};

function hasRenderTargetApi(renderer: unknown): renderer is SkyboxGpuBakeRenderer {
  const value = renderer as Partial<SkyboxGpuBakeRenderer> | null;

  return Boolean(
    value &&
      typeof value.render === "function" &&
      typeof value.setRenderTarget === "function" &&
      typeof value.getRenderTarget === "function"
  );
}

function hasEnabledMoon(nodes: ReturnType<typeof migrateManifestToV2>["nodes"]): boolean {
  return nodes.some((node) =>
    node.enabled &&
      (node.type === "moon" ||
        (node.type === "group" && hasEnabledMoon(node.children))),
  );
}

function createEquirectRenderTarget(
  width: number,
  height: number,
  hdr: boolean,
  float: boolean
) {
  const target = new THREE.RenderTarget(width, height, {
    depthBuffer: false,
    format: THREE.RGBAFormat,
    generateMipmaps: false,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    stencilBuffer: false,
    // HDR (EXR): linear float, no sRGB encode so values >1 survive (32-bit when `float`, else
    // 16-bit half). LDR: 8-bit sRGB.
    type: hdr ? (float ? THREE.FloatType : THREE.HalfFloatType) : THREE.UnsignedByteType,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });

  target.texture.name = "GPU baked skybox composition";
  target.texture.colorSpace = hdr ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace;
  target.texture.generateMipmaps = false;

  return target;
}

/**
 * Renders the full layer composition once into an equirectangular render target on the GPU and
 * reads the pixels back. This replaces the CPU per-pixel/per-layer bake for the editor export,
 * reusing the same composition shader the live viewport uses (`createWebGpuEquirectBakeMaterial`).
 */
export class SkyboxGpuBakeService {
  #renderer: SkyboxGpuBakeRenderer;
  #scene = new THREE.Scene();
  #camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  #quadGeometry = new THREE.PlaneGeometry(2, 2);
  #moonBakeService: MoonGpuBakeService | null;

  constructor(renderer: SkyboxGpuBakeRenderer & object) {
    this.#renderer = renderer;
    this.#moonBakeService = createMoonGpuBakeService(renderer);
  }

  canBake() {
    return hasRenderTargetApi(this.#renderer);
  }

  async prepareMoonTextures(manifest: SkyboxManifest, height: number) {
    const migratedManifest = migrateManifestToV2(manifest);
    const hasMoon = hasEnabledMoon(migratedManifest.nodes);

    if (!hasMoon) {
      return new Map<string, THREE.Texture>();
    }

    if (!this.#moonBakeService) {
      throw new Error("Moon layers require WebGPU compute support for GPU export.");
    }

    return this.#moonBakeService.bakeManifest(migratedManifest.nodes, {
      height: Math.max(1, Math.floor(height)),
      kind: "equirect",
    });
  }

  /**
   * Renders the composition into an equirect render target and returns it WITHOUT disposing, so a
   * caller (e.g. the EXR exporter) can read the texture. The caller MUST call `dispose()`.
   * Pass `hdr: true` for a linear half-float target; otherwise an 8-bit sRGB target.
   */
  bakeRenderTarget(manifest: SkyboxManifest, options: SkyboxGpuBakeOptions): SkyboxGpuBakeTarget {
    const width = Math.max(1, Math.floor(options.width));
    const height = Math.max(1, Math.floor(options.height));
    const migratedManifest = migrateManifestToV2(manifest);
    const hasMoon = hasEnabledMoon(migratedManifest.nodes);
    if (hasMoon && !options.moonTextures) {
      throw new Error(
        "Moon textures are not prepared. Await prepareMoonTextures() before bakeRenderTarget().",
      );
    }
    const ownedCloudFieldTextures = options.cloudFieldTextures
      ? null
      : new Map<string, THREE.Texture>();
    const cloudFieldTextures =
      options.cloudFieldTextures ?? ownedCloudFieldTextures ?? new Map();
    if (ownedCloudFieldTextures) {
      syncCloudFieldTextures(migratedManifest, ownedCloudFieldTextures);
    }
    const material = createWebGpuEquirectBakeMaterial(
      migratedManifest,
      options.imageTextures ?? new Map(),
      options.starfieldTextures ?? new Map(),
      cloudFieldTextures,
      options.moonTextures ?? new Map(),
      { flipY: options.flipY }
    );
    const target = createEquirectRenderTarget(
      width,
      height,
      Boolean(options.hdr),
      Boolean(options.float)
    );
    const mesh = new THREE.Mesh(this.#quadGeometry, material);

    mesh.frustumCulled = false;

    const previousTarget = this.#renderer.getRenderTarget();
    const previousAutoClear = this.#renderer.autoClear;
    const previousClearColor = new THREE.Color();
    const previousClearAlpha = this.#renderer.getClearAlpha();

    this.#renderer.getClearColor(previousClearColor);

    try {
      this.#scene.clear();
      this.#scene.add(mesh);
      this.#renderer.autoClear = true;
      this.#renderer.setClearColor(0x000000, 0);
      this.#renderer.setRenderTarget(target);
      this.#renderer.clear();
      this.#renderer.render(this.#scene, this.#camera);
      this.#scene.remove(mesh);
    } finally {
      this.#renderer.setRenderTarget(previousTarget);
      this.#renderer.autoClear = previousAutoClear;
      this.#renderer.setClearColor(previousClearColor, previousClearAlpha);
    }

    return {
      height,
      target,
      width,
      dispose: () => {
        material.dispose();
        target.dispose();
        if (ownedCloudFieldTextures) {
          disposeCloudFieldTextures(ownedCloudFieldTextures);
        }
      },
    };
  }

  async bakeImageData(
    manifest: SkyboxManifest,
    options: SkyboxGpuBakeOptions
  ): Promise<BakedSkyboxImageData> {
    const moonTextures =
      options.moonTextures ?? await this.prepareMoonTextures(manifest, options.height);
    const { dispose, height, target, width } = this.bakeRenderTarget(manifest, {
      ...options,
      hdr: false,
      moonTextures,
    });

    try {
      const data = await this.#readPixels(target, width, height);

      return { data, height, width };
    } finally {
      dispose();
    }
  }

  dispose() {
    this.#quadGeometry.dispose();
    this.#moonBakeService?.dispose();
    this.#moonBakeService = null;
  }

  async #readPixels(
    target: THREE.RenderTarget,
    width: number,
    height: number
  ): Promise<Uint8ClampedArray<ArrayBuffer>> {
    const bytes = new Uint8Array(width * height * 4);

    if (this.#renderer.readRenderTargetPixelsAsync) {
      const result = await this.#renderer.readRenderTargetPixelsAsync(target, 0, 0, width, height);

      bytes.set(new Uint8Array(result.buffer, result.byteOffset, result.byteLength));
    } else if (this.#renderer.readRenderTargetPixels) {
      this.#renderer.readRenderTargetPixels(target, 0, 0, width, height, bytes);
    } else {
      throw new Error("GPU skybox bake readback is not available.");
    }

    return new Uint8ClampedArray(bytes.buffer) as Uint8ClampedArray<ArrayBuffer>;
  }
}

export function createSkyboxGpuBakeService(renderer: unknown) {
  if (!hasRenderTargetApi(renderer)) {
    return null;
  }

  return new SkyboxGpuBakeService(renderer);
}
