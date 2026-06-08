import * as THREE from "three";
import { type AssetSource, type ManifestEntry } from "../loader";
/**
 * Shared texture configuration for skybox image layers — mirrors the editor's
 * `configureSkyboxImageTexture` so the runtime samples loaded images identically to the live
 * viewport and the export bake.
 */
export declare function configureSkyboxImageTexture(texture: THREE.Texture): THREE.Texture;
/**
 * Loader extension (type `"texture"`) that wraps THREE.js `TextureLoader`, trying each source in a
 * fallback chain and applying the skybox texture configuration to the result.
 */
export declare class TextureLoaderExtension {
    #private;
    static type: string;
    load(src: AssetSource, entry: ManifestEntry | null): Promise<THREE.Texture>;
}
