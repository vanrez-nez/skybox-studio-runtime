import { describe, expect, it } from "vitest";

import { bakeSkyboxImageData } from "../baking/bake";
import {
  createMoonBakeKey,
  resolveMoonBakeResolution,
} from "../layer-addons/builtins/moon/service";
import { createDefaultSkyboxMoonParams } from "../layer-addons/builtins/moon/params";
import type { SkyboxManifestV2 } from "../manifest";

function moonManifest(): SkyboxManifestV2 {
  return {
    composition: { mode: "alpha-over", order: "bottom-to-top" },
    nodes: [{
      blendMode: "normal",
      enabled: true,
      id: "moon",
      name: "Moon",
      opacity: 100,
      params: createDefaultSkyboxMoonParams(),
      type: "moon",
    }],
    version: 2,
  };
}

describe("moon layer resources", () => {
  it("resolves automatic texture resolution from the final projection target", () => {
    const params = createDefaultSkyboxMoonParams();

    expect(resolveMoonBakeResolution(params, {
      kind: "viewport",
      renderHeight: 1080,
      verticalFovRadians: Math.PI / 3,
    })).toBe(1024);
    expect(resolveMoonBakeResolution(params, { height: 1024, kind: "equirect" })).toBe(256);
    expect(resolveMoonBakeResolution(
      { ...params, resolutionMode: "2048" },
      { height: 128, kind: "equirect" },
    )).toBe(2048);
  });

  it("does not rebake appearance when only angular placement changes", () => {
    const params = createDefaultSkyboxMoonParams();
    const moved = createDefaultSkyboxMoonParams([1, 0, 0]);

    expect(createMoonBakeKey(params, 512)).toBe(createMoonBakeKey(moved, 512));
    expect(createMoonBakeKey({ ...params, phase: 0.75 }, 512))
      .not.toBe(createMoonBakeKey(params, 512));
  });

  it("reports the CPU fallback as unsupported", () => {
    expect(() => bakeSkyboxImageData(moonManifest(), { height: 8, width: 16 }))
      .toThrow(/Moon layers require WebGPU compute/);
  });
});
