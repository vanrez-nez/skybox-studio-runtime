import type * as THREE from "three";
import type { SkyboxManifestV2 } from "../manifest";
import { type Bundle, type LoadBundleFromZipOptions, type ZipSource } from "./bundle";
import { Loader, type LoaderEventData, type LoaderListener } from "./loader";
export type LoadProgress = LoaderEventData;
export type LoadSkyboxImageTexturesOptions = {
    loader?: Loader;
    onProgress?: LoaderListener;
};
/**
 * Loads a `layerId -> THREE.Texture` map for every enabled image layer in the bundle, reusing
 * THREE.js `TextureLoader` under the runtime `Loader` so progress/start/complete events fire.
 */
export declare function loadSkyboxImageTextures(bundle: Bundle, options?: LoadSkyboxImageTexturesOptions): Promise<Map<string, THREE.Texture>>;
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
/**
 * Resolves a project bundle from a zip (File/Blob/ArrayBuffer/Uint8Array/URL) — or an
 * already-resolved `Bundle` — and loads its image textures, reporting progress. Returns everything
 * needed to render: `new Skybox().fromManifest(manifest).setImageTextures(imageTextures)`.
 */
export declare function loadSkyboxBundle(source: LoadSkyboxBundleSource, options?: LoadSkyboxBundleOptions): Promise<LoadedSkyboxBundle>;
