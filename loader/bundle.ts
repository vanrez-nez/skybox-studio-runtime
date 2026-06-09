// Resolves an editor-produced project bundle (`manifest.json` + `assets/<hash>.png`) from a zip
// file, a served URL, or an unzipped directory into a `Bundle` (manifest + asset-URL resolver).
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
  // Copy into a fresh ArrayBuffer so the Blob owns its bytes (the zip reader hands back subarray
  // views into the source buffer for stored entries).
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

// Inflate a raw DEFLATE stream (ZIP method 8) using the browser-native DecompressionStream — no
// third-party inflate dependency. Supported in modern browsers (Chrome 80+, Safari 16.4+,
// Firefox 113+) and Node 18+.
async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = bytes.slice();
  const stream = new Blob([copy])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff;

function findEndOfCentralDirectory(view: DataView): number {
  const start = Math.max(0, view.byteLength - EOCD_MIN_SIZE - MAX_COMMENT_SIZE);

  for (let offset = view.byteLength - EOCD_MIN_SIZE; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) {
      return offset;
    }
  }

  return -1;
}

// Minimal single-disk ZIP reader: walks the central directory, then inflates each entry's data from
// its local header. Handles store (method 0) and deflate (method 8). No ZIP64 / encryption (project
// bundles are small, single-disk, unencrypted).
async function readZipEntries(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view);

  if (eocd < 0) {
    throw new Error("Invalid zip bundle: end-of-central-directory record not found.");
  }

  const entryCount = view.getUint16(eocd + 10, true);
  let pointer = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const tasks: Promise<[string, Uint8Array]>[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(pointer, true) !== CENTRAL_FILE_SIGNATURE) {
      throw new Error("Invalid zip bundle: malformed central directory.");
    }

    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const name = decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength));

    if (view.getUint32(localOffset, true) !== LOCAL_FILE_SIGNATURE) {
      throw new Error(`Invalid zip bundle: bad local header for "${name}".`);
    }

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);

    if (method === 0) {
      tasks.push(Promise.resolve([name, compressed]));
    } else if (method === 8) {
      tasks.push(inflateRaw(compressed).then((data) => [name, data]));
    } else {
      throw new Error(`Unsupported zip compression method ${method} for "${name}".`);
    }

    pointer += 46 + nameLength + extraLength + commentLength;
  }

  return Object.fromEntries(await Promise.all(tasks));
}

export async function loadBundleFromZip(
  source: ZipSource,
  options: LoadBundleFromZipOptions = {}
): Promise<Bundle> {
  const toAssetUrl = options.toAssetUrl ?? defaultToAssetUrl;
  const bytes = await toBytes(source);
  const files = await readZipEntries(bytes);
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
