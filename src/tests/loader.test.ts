import { describe, expect, it, vi } from "vitest";
import { strToU8, zipSync } from "fflate";

import {
  Loader,
  loadBundleFromZip,
  type LoaderEventData,
  type LoaderExtension,
  type SkyboxManifestV2,
} from "../index";

function makeBundleZip(): Uint8Array {
  const manifest: SkyboxManifestV2 & { assets: Record<string, { mimeType: string; sourceAssetId: string | null }> } = {
    assets: { "assets/x.png": { mimeType: "image/png", sourceAssetId: null } },
    composition: { mode: "alpha-over", order: "bottom-to-top" },
    geometry: { type: "sphere" },
    nodes: [
      {
        blendMode: "normal",
        enabled: true,
        id: "image-1",
        name: "Image",
        opacity: 100,
        params: { height: 1, pixels: null, placement: null, src: "assets/x.png", width: 1 },
        type: "image",
      },
    ],
    version: 2,
  };

  return zipSync({
    "assets/x.png": new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    "manifest.json": strToU8(JSON.stringify(manifest)),
  });
}

describe("loadBundleFromZip", () => {
  it("unzips a bundle, migrates the manifest, and resolves asset urls", async () => {
    const zip = makeBundleZip();

    const bundle = await loadBundleFromZip(zip, {
      toAssetUrl: (_bytes, _mime, path) => `asset://${path}`,
    });

    expect(bundle.manifest.version).toBe(2);
    expect(bundle.manifest.geometry?.type).toBe("sphere");
    expect(bundle.manifest.nodes).toHaveLength(1);
    expect(bundle.resolveAssetUrl("assets/x.png")).toBe("asset://assets/x.png");
    // Unknown paths fall through to the original src.
    expect(bundle.resolveAssetUrl("assets/missing.png")).toBe("assets/missing.png");

    bundle.dispose();
  });

  it("throws when manifest.json is missing", async () => {
    const zip = zipSync({ "assets/x.png": new Uint8Array([1, 2, 3]) });

    await expect(loadBundleFromZip(zip)).rejects.toThrow(/manifest\.json/);
  });
});

class StubExtension implements LoaderExtension<string> {
  static calls = 0;

  async load(src: string | readonly string[]): Promise<string> {
    StubExtension.calls += 1;
    return `loaded:${String(src)}`;
  }
}

describe("Loader reporting", () => {
  it("emits start/progress/complete with batch stats", async () => {
    StubExtension.calls = 0;
    const loader = new Loader();
    loader.register("stub", StubExtension);

    const events: Record<string, LoaderEventData[]> = { start: [], progress: [], complete: [] };
    loader.onStart((data) => events.start.push(data));
    loader.onProgress((data) => events.progress.push(data));
    loader.onComplete((data) => events.complete.push(data));

    await loader.load([
      { id: "a", src: "/a.bin", type: "stub" },
      { id: "b", src: "/b.bin", type: "stub" },
    ]);

    expect(events.start).toHaveLength(1);
    expect(events.start[0].total).toBe(2);
    expect(events.progress).toHaveLength(2);
    expect(events.complete[0].loaded).toBe(2);
    expect(events.complete[0].pending).toBe(0);
  });

  it("de-duplicates concurrent loads of the same source", async () => {
    StubExtension.calls = 0;
    const loader = new Loader();
    loader.register("stub", StubExtension);

    await loader.load([
      { id: "a", src: "/same.bin", type: "stub" },
      { id: "b", src: "/same.bin", type: "stub" },
    ]);

    expect(StubExtension.calls).toBe(1);
  });
});
