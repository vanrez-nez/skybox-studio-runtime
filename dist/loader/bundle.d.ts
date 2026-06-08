import { type SkyboxManifestLayer, type SkyboxManifestV2 } from "../manifest";
export type ImageManifestLayer = Extract<SkyboxManifestLayer, {
    type: "image";
}>;
export type ProjectBundleManifest = SkyboxManifestV2 & {
    assets?: Record<string, {
        mimeType: string;
        sourceAssetId: string | null;
    }>;
};
export type Bundle = {
    manifest: SkyboxManifestV2;
    resolveAssetUrl: (src: string) => string;
    dispose: () => void;
};
export type ZipSource = ArrayBuffer | Blob | Uint8Array | string;
export type LoadBundleFromZipOptions = {
    toAssetUrl?: (bytes: Uint8Array, mimeType: string, path: string) => string;
};
export declare function collectImageLayers(manifest: SkyboxManifestV2): ImageManifestLayer[];
export declare function loadBundleFromZip(source: ZipSource, options?: LoadBundleFromZipOptions): Promise<Bundle>;
export declare function loadBundleFromUrl(baseUrl: string): Promise<Bundle>;
type DirectoryHandle = {
    getFileHandle: (name: string) => Promise<{
        getFile: () => Promise<File>;
    }>;
    getDirectoryHandle: (name: string) => Promise<DirectoryHandle>;
};
export declare function loadBundleFromDirectory(dir: DirectoryHandle): Promise<Bundle>;
export declare function rehydrateImagePixels(bundle: Bundle): Promise<SkyboxManifestV2>;
export {};
