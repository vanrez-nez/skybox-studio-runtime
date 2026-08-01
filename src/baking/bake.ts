import {
  hashString,
  linearRgbToSrgbBytes,
  type Rgb,
} from "../math";
import { evaluateSkyboxDirection, equirectUvToDirection } from "../evaluator";
import type {
  SkyboxBakeOptions,
  SkyboxManifest,
  SkyboxManifestGroup,
  SkyboxManifestNode,
} from "../manifest";
import { migrateManifestToV2 } from "../manifest";
import {
  bakeStarfieldImageData,
  createStarfieldBakeCacheKey,
  type StarfieldBakeData,
} from "../starfield-static";

export const DEFAULT_BAKE_WIDTH = 1024;
export const RUNTIME_VERSION = "0.1.1";

export type BakedSkyboxImageData = {
  data: Uint8ClampedArray<ArrayBuffer>;
  height: number;
  width: number;
};

export type SkyboxImageBakeOptions = SkyboxBakeOptions & {
  starfieldBakes?: Map<string, StarfieldBakeData>;
};

export type BakeCacheKeyOptions = Required<Pick<SkyboxBakeOptions, "width" | "height" | "dpr">> & {
  targetGroupId?: string;
};

const imageDataCache = new Map<string, BakedSkyboxImageData>();
const starfieldBakeCache = new Map<string, StarfieldBakeData>();

export function resolveBakeOptions(options: SkyboxBakeOptions = {}) {
  const dpr = Math.max(0.1, options.dpr ?? 1);
  const width = Math.max(1, Math.floor((options.width ?? DEFAULT_BAKE_WIDTH) * dpr));
  const height = Math.max(1, Math.floor((options.height ?? width / 2) * dpr));

  return {
    cache: options.cache ?? true,
    dpr,
    height,
    targetGroupId: options.targetGroupId,
    width,
  };
}

export function createBakeCacheKey(manifest: SkyboxManifest, options: BakeCacheKeyOptions) {
  return hashString(
    JSON.stringify({
      manifest,
      options,
      runtimeVersion: RUNTIME_VERSION,
    })
  );
}

export function invalidateBakeCache() {
  imageDataCache.clear();
  starfieldBakeCache.clear();
}

function collectStarfieldBakeLayers(nodes: SkyboxManifestNode[], layers: Extract<SkyboxManifestNode, { type: "starfield" }>[] = []) {
  nodes.forEach((node) => {
    if (!node.enabled) {
      return;
    }

    if (node.type === "group") {
      collectStarfieldBakeLayers(node.children, layers);
      return;
    }

    if (node.type === "starfield") {
      layers.push(node);
    }
  });

  return layers;
}

function findBakeGroup(nodes: SkyboxManifestNode[], id: string): SkyboxManifestGroup | null {
  for (const node of nodes) {
    if (node.type !== "group") {
      continue;
    }

    if (node.id === id) {
      return node;
    }

    const match = findBakeGroup(node.children, id);

    if (match) {
      return match;
    }
  }

  return null;
}

function resolveStarfieldBakes(
  manifest: ReturnType<typeof migrateManifestToV2>,
  width: number,
  height: number,
  targetGroupId?: string,
  suppliedBakes?: Map<string, StarfieldBakeData>
) {
  const targetNodes = targetGroupId
    ? findBakeGroup(manifest.nodes, targetGroupId)?.children ?? []
    : manifest.nodes;
  const starfieldLayers = collectStarfieldBakeLayers(targetNodes);

  if (starfieldLayers.length === 0) {
    return undefined;
  }

  const bakes = new Map<string, StarfieldBakeData>();

  starfieldLayers.forEach((layer) => {
    const suppliedBake = suppliedBakes?.get(layer.id);

    if (suppliedBake) {
      bakes.set(layer.id, suppliedBake);
      return;
    }

    // Legacy fallback for headless/runtime CPU bake callers. The editor and export dialog pass
    // GPU-rendered Starfield bakes so viewport/export generation does not rasterize Starfield on CPU.
    const cacheKey = createStarfieldBakeCacheKey(layer.params, width, height);
    const cachedBake = starfieldBakeCache.get(cacheKey);
    const bake = cachedBake ?? bakeStarfieldImageData(layer.params, width, height);

    if (!cachedBake) {
      starfieldBakeCache.set(cacheKey, bake);
    }

    bakes.set(layer.id, bake);
  });

  return bakes;
}

export function bakeSkyboxImageData(
  manifest: SkyboxManifest,
  options: SkyboxImageBakeOptions = {}
): BakedSkyboxImageData {
  const migratedManifest = migrateManifestToV2(manifest);
  const resolvedOptions = resolveBakeOptions(options);
  const cacheKey = resolvedOptions.cache ? createBakeCacheKey(migratedManifest, resolvedOptions) : null;

  if (cacheKey) {
    const cachedImage = imageDataCache.get(cacheKey);

    if (cachedImage) {
      return {
        ...cachedImage,
        data: new Uint8ClampedArray(cachedImage.data) as Uint8ClampedArray<ArrayBuffer>,
      };
    }
  }

  const { height, targetGroupId, width } = resolvedOptions;
  const starfieldBakes = resolveStarfieldBakes(
    migratedManifest,
    width,
    height,
    targetGroupId,
    options.starfieldBakes
  );
  const data = new Uint8ClampedArray(width * height * 4) as Uint8ClampedArray<ArrayBuffer>;

  for (let y = 0; y < height; y += 1) {
    const uvY = (y + 0.5) / height;

    for (let x = 0; x < width; x += 1) {
      const uvX = (x + 0.5) / width;
      const direction = equirectUvToDirection(uvX, uvY);
      const color: Rgb = evaluateSkyboxDirection(migratedManifest, direction, {
        sampleHeight: height,
        starfieldBakes,
        targetGroupId,
      });
      const [red, green, blue] = linearRgbToSrgbBytes(color);
      const imageIndex = (y * width + x) * 4;

      data[imageIndex] = red;
      data[imageIndex + 1] = green;
      data[imageIndex + 2] = blue;
      data[imageIndex + 3] = 255;
    }
  }

  const bakedImage = { data, height, width };

  if (cacheKey) {
    imageDataCache.set(cacheKey, {
      ...bakedImage,
      data: new Uint8ClampedArray(data) as Uint8ClampedArray<ArrayBuffer>,
    });
  }

  return bakedImage;
}
