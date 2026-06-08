export type AssetSource = string | readonly string[];
export type ManifestEntry<TType extends string = string> = {
    id: string;
    lazy?: boolean;
    src: AssetSource;
    type: TType;
};
export type ManifestInput = ManifestEntry | readonly ManifestEntry[] | {
    assets: readonly ManifestEntry[];
};
export type LoaderCallback<T> = (error: Error | null, data?: T) => void;
export type BatchStats = {
    failed: number;
    loaded: number;
    pending: number;
    total: number;
};
export type LifetimeStats = {
    failed: number;
    loaded: number;
};
export type LoaderEventData<T = unknown> = BatchStats & {
    data?: T;
    entry?: ManifestEntry | null;
    error?: Error;
    lifetime?: LifetimeStats;
};
export type LoaderEvent = "complete" | "error" | "progress" | "start";
export type LoaderListener<T = unknown> = (data: LoaderEventData<T>) => void;
export type LoaderExtension<T = unknown> = {
    load: (src: AssetSource, entry: ManifestEntry | null) => Promise<T> | T;
};
export type LoaderExtensionConstructor<T = unknown> = {
    install?: (loaderInstance: Loader) => void;
    new (loaderInstance: Loader): LoaderExtension<T>;
};
export declare class LoaderAssetError extends Error {
    entry: ManifestEntry | null;
    event?: unknown;
    id?: string;
    phase: string;
    src?: AssetSource;
    constructor(message: string, options: {
        entry?: ManifestEntry | null;
        event?: unknown;
        id?: string;
        phase: string;
        src?: AssetSource;
    });
}
export declare class Loader {
    #private;
    register<T>(type: string, ExtensionClass: LoaderExtensionConstructor<T>): void;
    setManifest(entries: readonly ManifestEntry[]): void;
    load(manifest: ManifestInput): Promise<void>;
    loadAsset<T = unknown>(type: string, srcOrId: string, callback?: LoaderCallback<T>): Promise<T>;
    loadTexture<T = unknown>(srcOrId: string, callback?: LoaderCallback<T>): Promise<T>;
    onProgress(fn: LoaderListener): () => void;
    onError(fn: LoaderListener): () => void;
    onStart(fn: LoaderListener): () => void;
    onComplete(fn: LoaderListener): () => void;
}
