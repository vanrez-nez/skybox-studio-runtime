import * as THREE from "three";

import { LoaderAssetError, type AssetSource, type ManifestEntry } from "../loader";

/**
 * Shared texture configuration for skybox image layers — mirrors the editor's
 * `configureSkyboxImageTexture` so the runtime samples loaded images identically to the live
 * viewport and the export bake.
 */
export function configureSkyboxImageTexture(texture: THREE.Texture): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.flipY = false;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Loader extension (type `"texture"`) that wraps THREE.js `TextureLoader`, trying each source in a
 * fallback chain and applying the skybox texture configuration to the result.
 */
export class TextureLoaderExtension {
  static type = "texture";

  #loader = new THREE.TextureLoader();

  async load(src: AssetSource, entry: ManifestEntry | null): Promise<THREE.Texture> {
    const sources = Array.isArray(src) ? src : [src];
    let lastError: Error | null = null;

    for (const source of sources) {
      try {
        const texture = await this.#loader.loadAsync(source);
        return configureSkyboxImageTexture(texture);
      } catch (error) {
        lastError = new LoaderAssetError(`Failed to load texture: ${source}`, {
          entry,
          event: error,
          phase: "network-error",
          src: source,
        });
      }
    }

    throw (
      lastError ??
      new LoaderAssetError(`No texture sources for entry ${entry?.id ?? "?"}`, {
        entry,
        phase: "network-error",
        src,
      })
    );
  }
}
