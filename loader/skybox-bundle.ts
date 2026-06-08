// High-level helpers that turn a project bundle into render-ready inputs for `Skybox`, with
// progress reporting via the runtime `Loader`.
import type * as THREE from "three";

import type { SkyboxManifestV2 } from "../manifest";
import {
  collectImageLayers,
  loadBundleFromZip,
  type Bundle,
  type LoadBundleFromZipOptions,
  type ZipSource,
} from "./bundle";
import { Loader, type LoaderEventData, type LoaderListener } from "./loader";
import { TextureLoaderExtension } from "./extensions/texture";

export type LoadProgress = LoaderEventData;

export type LoadSkyboxImageTexturesOptions = {
  loader?: Loader;
  onProgress?: LoaderListener;
};

function createTextureLoader(): Loader {
  const loader = new Loader();
  loader.register(TextureLoaderExtension.type, TextureLoaderExtension);
  return loader;
}

/**
 * Loads a `layerId -> THREE.Texture` map for every enabled image layer in the bundle, reusing
 * THREE.js `TextureLoader` under the runtime `Loader` so progress/start/complete events fire.
 */
export async function loadSkyboxImageTextures(
  bundle: Bundle,
  options: LoadSkyboxImageTexturesOptions = {}
): Promise<Map<string, THREE.Texture>> {
  const loader = options.loader ?? createTextureLoader();
  const layers = collectImageLayers(bundle.manifest).filter(
    (layer) => layer.enabled && layer.params.src
  );
  const entries = layers.map((layer) => ({
    id: layer.id,
    src: bundle.resolveAssetUrl(layer.params.src as string),
    type: TextureLoaderExtension.type,
  }));
  const unsubscribe = options.onProgress ? loader.onProgress(options.onProgress) : null;

  try {
    await loader.load(entries);
  } finally {
    unsubscribe?.();
  }

  const textures = new Map<string, THREE.Texture>();

  await Promise.all(
    layers.map(async (layer) => {
      try {
        textures.set(
          layer.id,
          await loader.loadAsset<THREE.Texture>(TextureLoaderExtension.type, layer.id)
        );
      } catch {
        // Already surfaced via the `error` event during `load`; skip the failed layer.
      }
    })
  );

  return textures;
}

export type LoadSkyboxBundleSource = Bundle | ZipSource;

export type LoadSkyboxBundleOptions = LoadBundleFromZipOptions & {
  onProgress?: LoaderListener;
};

export type LoadedSkyboxBundle = {
  bundle: Bundle;
  dispose: () => void;
  imageTextures: Map<string, THREE.Texture>;
  loader: Loader;
  manifest: SkyboxManifestV2;
};

function isBundle(source: LoadSkyboxBundleSource): source is Bundle {
  return (
    typeof source === "object" &&
    source !== null &&
    "manifest" in source &&
    typeof (source as Bundle).resolveAssetUrl === "function"
  );
}

/**
 * Resolves a project bundle from a zip (File/Blob/ArrayBuffer/Uint8Array/URL) — or an
 * already-resolved `Bundle` — and loads its image textures, reporting progress. Returns everything
 * needed to render: `new Skybox().fromManifest(manifest).setImageTextures(imageTextures)`.
 */
export async function loadSkyboxBundle(
  source: LoadSkyboxBundleSource,
  options: LoadSkyboxBundleOptions = {}
): Promise<LoadedSkyboxBundle> {
  const { onProgress, ...zipOptions } = options;
  const ownsBundle = !isBundle(source);
  const bundle = isBundle(source) ? source : await loadBundleFromZip(source, zipOptions);
  const loader = createTextureLoader();
  const imageTextures = await loadSkyboxImageTextures(bundle, { loader, onProgress });

  return {
    bundle,
    imageTextures,
    loader,
    manifest: bundle.manifest,
    dispose: () => {
      imageTextures.forEach((texture) => texture.dispose());
      imageTextures.clear();

      if (ownsBundle) {
        bundle.dispose();
      }
    },
  };
}
