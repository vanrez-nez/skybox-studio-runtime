import type * as THREE from "three";
import type { WebGPURenderer } from "three/webgpu";

import type {
  SkyboxManifestNode,
  SkyboxMoonParams,
} from "../../../manifest";
import { DISC_FILL } from "./disc";
import { MoonBaker } from "./baker";
import {
  MOON_RESOLUTION_MAX,
  MOON_RESOLUTION_MIN,
  normalizeSkyboxMoonParams,
  type MoonBakeParams,
} from "./params";

export type MoonBakeTarget =
  | { height: number; kind: "equirect" }
  | { kind: "viewport"; renderHeight: number; verticalFovRadians: number };

type MoonBakeRequest = {
  key: string;
  params: MoonBakeParams;
  resolution: number;
};

type MoonBakeRecord = {
  baker: MoonBaker | null;
  bakerResolution: number;
  completedKey: string;
  disposeRequested: boolean;
  request: MoonBakeRequest;
  running: Promise<void> | null;
};

type ComputeRenderer = WebGPURenderer & {
  computeAsync: (node: unknown) => Promise<unknown>;
};

function isComputeRenderer(renderer: unknown): renderer is ComputeRenderer {
  return Boolean(
    renderer &&
      typeof (renderer as { computeAsync?: unknown }).computeAsync === "function",
  );
}

function nextPowerOfTwo(value: number) {
  return 2 ** Math.ceil(Math.log2(Math.max(1, value)));
}

export function resolveMoonBakeResolution(
  params: SkyboxMoonParams,
  target: MoonBakeTarget,
) {
  if (params.resolutionMode !== "auto") {
    return Number(params.resolutionMode);
  }

  const angularSize = Math.max(
    params.placement.angularHeight,
    params.placement.angularWidth,
  );
  const spritePixels =
    target.kind === "equirect"
      ? (angularSize / Math.PI) * Math.max(1, target.height)
      : (Math.tan(angularSize / 2) /
          Math.max(Math.tan(target.verticalFovRadians / 2), 1e-6)) *
        Math.max(1, target.renderHeight);
  const requested = nextPowerOfTwo(spritePixels / DISC_FILL);

  return Math.min(
    MOON_RESOLUTION_MAX,
    Math.max(MOON_RESOLUTION_MIN, requested),
  );
}

export function createMoonBakeKey(params: SkyboxMoonParams, resolution: number) {
  const normalized = normalizeSkyboxMoonParams(params);
  const { placement: _placement, resolutionMode: _resolutionMode, ...appearance } = normalized;

  return JSON.stringify({ appearance, resolution });
}

function collectMoonLayers(
  nodes: SkyboxManifestNode[],
  layers: Array<Extract<SkyboxManifestNode, { type: "moon" }>> = [],
) {
  nodes.forEach((node) => {
    if (!node.enabled) {
      return;
    }

    if (node.type === "group") {
      collectMoonLayers(node.children, layers);
    } else if (node.type === "moon") {
      layers.push(node);
    }
  });

  return layers;
}

export class MoonGpuBakeService {
  readonly #renderer: ComputeRenderer;
  readonly #records = new Map<string, MoonBakeRecord>();
  #disposed = false;

  constructor(renderer: unknown) {
    if (!isComputeRenderer(renderer)) {
      throw new Error("Moon layers require a WebGPU renderer with compute support.");
    }

    this.#renderer = renderer;
  }

  canBake() {
    return !this.#disposed;
  }

  async bakeLayer(
    layerId: string,
    params: SkyboxMoonParams,
    target: MoonBakeTarget,
  ): Promise<THREE.Texture> {
    if (this.#disposed) {
      throw new Error("Moon bake service has been disposed.");
    }

    const normalized = normalizeSkyboxMoonParams(params);
    const resolution = resolveMoonBakeResolution(normalized, target);
    const request: MoonBakeRequest = {
      key: createMoonBakeKey(normalized, resolution),
      params: { ...normalized, resolution },
      resolution,
    };
    let record = this.#records.get(layerId);

    if (!record) {
      record = {
        baker: null,
        bakerResolution: 0,
        completedKey: "",
        disposeRequested: false,
        request,
        running: null,
      };
      this.#records.set(layerId, record);
    } else {
      record.request = request;
      record.disposeRequested = false;
    }

    if (!record.running && record.completedKey !== request.key) {
      record.running = this.#runRecord(layerId, record);
    }

    await record.running;

    if (!record.baker || record.disposeRequested) {
      throw new Error("Moon layer was disposed before its bake completed.");
    }

    return record.baker.outputTex;
  }

  async bakeManifest(
    nodes: SkyboxManifestNode[],
    target: MoonBakeTarget,
  ): Promise<Map<string, THREE.Texture>> {
    const layers = collectMoonLayers(nodes);
    const activeIds = new Set(layers.map((layer) => layer.id));

    this.#records.forEach((_record, layerId) => {
      if (!activeIds.has(layerId)) {
        this.disposeLayer(layerId);
      }
    });

    const textures = new Map<string, THREE.Texture>();
    for (const layer of layers) {
      textures.set(layer.id, await this.bakeLayer(layer.id, layer.params, target));
    }

    return textures;
  }

  disposeLayer(layerId: string) {
    const record = this.#records.get(layerId);

    if (!record) {
      return;
    }

    record.disposeRequested = true;
    if (!record.running) {
      record.baker?.dispose();
      this.#records.delete(layerId);
    }
  }

  dispose() {
    this.#disposed = true;
    this.#records.forEach((record, layerId) => {
      record.disposeRequested = true;
      if (!record.running) {
        record.baker?.dispose();
        this.#records.delete(layerId);
      }
    });
  }

  async #runRecord(layerId: string, record: MoonBakeRecord) {
    try {
      while (!record.disposeRequested && record.completedKey !== record.request.key) {
        const request = record.request;
        let baker = record.baker;
        let replacement: MoonBaker | null = null;

        if (!baker || record.bakerResolution !== request.resolution) {
          replacement = new MoonBaker(this.#renderer, request.params);
          baker = replacement;
        }

        await baker.bake(request.params);

        if (record.disposeRequested) {
          replacement?.dispose();
          break;
        }

        if (replacement) {
          record.baker?.dispose();
          record.baker = replacement;
          record.bakerResolution = request.resolution;
        }
        record.completedKey = request.key;
      }
    } finally {
      record.running = null;
      if (record.disposeRequested) {
        record.baker?.dispose();
        this.#records.delete(layerId);
      }
    }
  }
}

export function createMoonGpuBakeService(renderer: unknown) {
  return isComputeRenderer(renderer) ? new MoonGpuBakeService(renderer) : null;
}
