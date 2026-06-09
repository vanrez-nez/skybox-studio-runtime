import { describe, expect, it } from "vitest";

import {
  evaluateSkyboxDirection,
  getLayerRuntimeAdapter,
  isRegisteredLayerType,
  registerLayerRuntimeAdapter,
  type SkyboxManifestV2,
} from "../index";

// Proves the runtime is fully registry-driven: a brand-new layer type can be registered, merged
// from partial registrations, and composed by the CPU evaluator with zero edits to core runtime
// code. Mirrors the editor-level acceptance test (`src/effects/add-layer-acceptance.test.ts`).
describe("layer runtime adapter registry", () => {
  it("registers a custom adapter and looks it up", () => {
    expect(isRegisteredLayerType("test-solid")).toBe(false);

    registerLayerRuntimeAdapter({
      type: "test-solid",
      sampleCpu: (_direction, params) => {
        const { color } = params as { color: [number, number, number] };

        return [color[0], color[1], color[2], 1];
      },
      updateLive: () => {},
    });

    expect(isRegisteredLayerType("test-solid")).toBe(true);

    const adapter = getLayerRuntimeAdapter("test-solid");

    expect(adapter?.type).toBe("test-solid");
    expect(typeof adapter?.sampleCpu).toBe("function");
  });

  it("merges partial adapters instead of replacing", () => {
    registerLayerRuntimeAdapter({
      type: "test-solid",
      getTopologyKey: () => ({ solid: true }),
    });

    const merged = getLayerRuntimeAdapter("test-solid");

    expect(typeof merged?.sampleCpu).toBe("function"); // preserved from the first registration
    expect(typeof merged?.getTopologyKey).toBe("function"); // added by the second registration
    expect(merged?.getTopologyKey?.({} as never)).toEqual({ solid: true });
  });

  it("composes a custom layer through evaluateSkyboxDirection with zero core edits", () => {
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "sphere" },
      nodes: [
        {
          blendMode: "normal",
          enabled: true,
          id: "solid-red",
          name: "Solid Red",
          opacity: 100,
          params: { color: [1, 0, 0] },
          type: "test-solid",
        } as never,
      ],
      version: 2,
    };

    const color = evaluateSkyboxDirection(manifest, [0, 0, -1]);

    expect(color[0]).toBeCloseTo(1);
    expect(color[1]).toBeCloseTo(0);
    expect(color[2]).toBeCloseTo(0);
  });
});
