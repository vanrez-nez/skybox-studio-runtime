// Resolves an editor-produced project bundle (`manifest.json` + `assets/<hash>.png`) from a zip
// file, a served URL, or an unzipped directory into a `Bundle` (manifest + asset-URL resolver).
import { unzip } from "fflate";

import {
  migrateManifestToV2,
  type SkyboxManifestLayer,
  type SkyboxManifestNode,
  type SkyboxManifestV2,
} from "../manifest";

export type ImageManifestLayer = Extract<SkyboxManifestLayer, { type: "image" }>;

// The editor bundle manifest is a V2 manifest plus an asset index (path -> metadata) that preserves
// mime types. Mirrors `ProjectBundleManifest` on the editor side (`src/lib/project-export.ts`).
export type ProjectBundleManifest = SkyboxManifestV2 & {
  assets?: Record<string, { mimeType: string; sourceAssetId: string | null }>;
};

export type Bundle = {
  manifest: SkyboxManifestV2;
  resolveAssetUrl: (src: string) => string;
  dispose: () => void;
};

const MANIFEST_FILE = "manifest.json";

export type ZipSource = ArrayBuffer | Blob | Uint8Array | string;

export type LoadBundleFromZipOptions = {
  // Override how asset bytes become a URL. Defaults to a Blob object URL. Injectable so non-DOM
  // environments (tests, Node) can resolve assets without `Blob`/`URL.createObjectURL`.
  toAssetUrl?: (bytes: Uint8Array, mimeType: string, path: string) => string;
};

export function collectImageLayers(manifest: SkyboxManifestV2): ImageManifestLayer[] {
  const layers: ImageManifestLayer[] = [];

  const walk = (nodes: SkyboxManifestNode[]) => {
    for (const node of nodes) {
      if (node.type === "group") {
        walk(node.children);
      } else if (node.type === "image") {
        layers.push(node);
      }
    }
  };

  walk(manifest.nodes);

  return layers;
}

function inferMimeType(path: string): string {
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "png":
    default:
      return "image/png";
  }
}

function defaultToAssetUrl(bytes: Uint8Array, mimeType: string): string {
  // Copy into a fresh ArrayBuffer so the Blob owns its bytes (fflate may hand back subarray views).
  const copy = bytes.slice();
  return URL.createObjectURL(new Blob([copy], { type: mimeType }));
}

async function toBytes(source: ZipSource): Promise<Uint8Array> {
  if (typeof source === "string") {
    const response = await fetch(source);

    if (!response.ok) {
      throw new Error(`Could not fetch zip bundle (${response.status} ${response.statusText}).`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  if (source instanceof Uint8Array) {
    return source;
  }

  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source);
  }

  // Blob / File.
  return new Uint8Array(await source.arrayBuffer());
}

function unzipAsync(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(bytes, (error, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(files);
    });
  });
}

export async function loadBundleFromZip(
  source: ZipSource,
  options: LoadBundleFromZipOptions = {}
): Promise<Bundle> {
  const toAssetUrl = options.toAssetUrl ?? defaultToAssetUrl;
  const bytes = await toBytes(source);
  const files = await unzipAsync(bytes);
  const manifestBytes = files[MANIFEST_FILE];

  if (!manifestBytes) {
    throw new Error(`Zip bundle is missing ${MANIFEST_FILE}.`);
  }

  const rawManifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as ProjectBundleManifest;
  const manifest = migrateManifestToV2(rawManifest);
  const assetIndex = rawManifest.assets ?? {};
  const urls = new Map<string, string>();
  const createdUrls: string[] = [];

  for (const [path, entryBytes] of Object.entries(files)) {
    if (path === MANIFEST_FILE) {
      continue;
    }

    const mimeType = assetIndex[path]?.mimeType ?? inferMimeType(path);
    const url = toAssetUrl(entryBytes, mimeType, path);

    urls.set(path, url);
    createdUrls.push(url);
  }

  return {
    manifest,
    resolveAssetUrl: (src) => urls.get(src) ?? src,
    dispose: () => {
      for (const url of createdUrls) {
        if (url.startsWith("blob:") && typeof URL !== "undefined" && URL.revokeObjectURL) {
          URL.revokeObjectURL(url);
        }
      }

      urls.clear();
      createdUrls.length = 0;
    },
  };
}

export async function loadBundleFromUrl(baseUrl: string): Promise<Bundle> {
  const response = await fetch(new URL(MANIFEST_FILE, baseUrl).href);

  if (!response.ok) {
    throw new Error(`Could not load ${MANIFEST_FILE} (${response.status}).`);
  }

  const manifest = migrateManifestToV2(await response.json());

  return {
    manifest,
    resolveAssetUrl: (src) => new URL(src, baseUrl).href,
    dispose: () => {},
  };
}

type DirectoryHandle = {
  getFileHandle: (name: string) => Promise<{ getFile: () => Promise<File> }>;
  getDirectoryHandle: (name: string) => Promise<DirectoryHandle>;
};

async function readDirectoryFileUrl(dir: DirectoryHandle, path: string): Promise<string> {
  const segments = path.split("/").filter(Boolean);
  let handle: DirectoryHandle = dir;

  for (let index = 0; index < segments.length - 1; index += 1) {
    handle = await handle.getDirectoryHandle(segments[index]);
  }

  const fileHandle = await handle.getFileHandle(segments[segments.length - 1]);

  return URL.createObjectURL(await fileHandle.getFile());
}

export async function loadBundleFromDirectory(dir: DirectoryHandle): Promise<Bundle> {
  const manifestFile = await (await dir.getFileHandle(MANIFEST_FILE)).getFile();
  const manifest = migrateManifestToV2(JSON.parse(await manifestFile.text()));
  const urls = new Map<string, string>();

  for (const layer of collectImageLayers(manifest)) {
    if (layer.params.src) {
      urls.set(layer.params.src, await readDirectoryFileUrl(dir, layer.params.src));
    }
  }

  return {
    manifest,
    resolveAssetUrl: (src) => urls.get(src) ?? src,
    dispose: () => {
      for (const url of urls.values()) {
        if (typeof URL !== "undefined" && URL.revokeObjectURL) {
          URL.revokeObjectURL(url);
        }
      }

      urls.clear();
    },
  };
}

// CPU baking samples image layers from `pixels`, so decode each referenced asset back into the
// manifest before baking with `createBakedSkyboxTexture`.
export async function rehydrateImagePixels(bundle: Bundle): Promise<SkyboxManifestV2> {
  const manifest = structuredClone(bundle.manifest);

  for (const layer of collectImageLayers(manifest)) {
    if (!layer.params.src) {
      continue;
    }

    const blob = await (await fetch(bundle.resolveAssetUrl(layer.params.src))).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");

    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext("2d");

    if (!context) {
      bitmap.close();
      continue;
    }

    context.drawImage(bitmap, 0, 0);
    bitmap.close();

    layer.params.pixels = Array.from(
      context.getImageData(0, 0, canvas.width, canvas.height).data
    );
    layer.params.width = canvas.width;
    layer.params.height = canvas.height;
  }

  return manifest;
}
