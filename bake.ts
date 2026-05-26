import {
  hashString,
  linearRgbToSrgbBytes,
  type Rgb,
} from "./math";
import { evaluateSkyboxDirection, equirectUvToDirection } from "./evaluator";
import type { SkyboxBakeOptions, SkyboxManifest } from "./manifest";

export const DEFAULT_BAKE_WIDTH = 1024;
export const RUNTIME_VERSION = "0.1.0";

export type BakedSkyboxImageData = {
  data: Uint8ClampedArray<ArrayBuffer>;
  height: number;
  width: number;
};

export type BakeCacheKeyOptions = Required<Pick<SkyboxBakeOptions, "width" | "height" | "dpr">> & {
  targetGroupId?: string;
};

const imageDataCache = new Map<string, BakedSkyboxImageData>();

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
}

export function bakeSkyboxImageData(
  manifest: SkyboxManifest,
  options: SkyboxBakeOptions = {}
): BakedSkyboxImageData {
  const resolvedOptions = resolveBakeOptions(options);
  const cacheKey = resolvedOptions.cache ? createBakeCacheKey(manifest, resolvedOptions) : null;

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
  const data = new Uint8ClampedArray(width * height * 4) as Uint8ClampedArray<ArrayBuffer>;

  for (let y = 0; y < height; y += 1) {
    const uvY = (y + 0.5) / height;

    for (let x = 0; x < width; x += 1) {
      const uvX = (x + 0.5) / width;
      const direction = equirectUvToDirection(uvX, uvY);
      const color: Rgb = evaluateSkyboxDirection(manifest, direction, { targetGroupId });
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
