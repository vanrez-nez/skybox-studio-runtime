import { describe, expect, it } from "vitest";

import { evaluateSkyboxDirection, type SkyboxManifestV2 } from "../index";
import { sampleCloudsLayer } from "../layer-addons/builtins/clouds";
import type { SkyboxCloudsParams } from "../manifest";

function createParams(overrides: Partial<SkyboxCloudsParams> = {}): SkyboxCloudsParams {
  return {
    color: "#ffffff",
    coverage: 0.5,
    density: 1,
    elevation: 0.5,
    phase: 0,
    scale: 0.0002,
    shadowColor: "#000000",
    speed: 0.0001,
    sunDirection: [0, 1, 0],
    ...overrides,
  };
}

describe("clouds layer", () => {
  it("is fully transparent below the horizon", () => {
    expect(sampleCloudsLayer([0, -1, 0], createParams())).toEqual([0, 0, 0, 0]);
    expect(sampleCloudsLayer([0.5, -0.5, 0.5], createParams())).toEqual([0, 0, 0, 0]);
  });

  it("is fully transparent with zero coverage", () => {
    expect(sampleCloudsLayer([0, 1, 0], createParams({ coverage: 0 }))).toEqual([0, 0, 0, 0]);
  });

  it("is fully opaque straight up at full coverage", () => {
    const [, , , alpha] = sampleCloudsLayer([0, 1, 0], createParams({ coverage: 1 }));

    expect(alpha).toBeCloseTo(1);
  });

  it("fades out toward the horizon", () => {
    const params = createParams({ coverage: 1 });
    const overhead = sampleCloudsLayer([0, 1, 0], params)[3];
    // Just above the horizon: inside the horizonFade ramp (0 .. 0.1 + 0.2 * elevation = 0.2).
    const nearHorizon = sampleCloudsLayer([0.9999, 0.01, 0], params)[3];

    expect(nearHorizon).toBeLessThan(overhead);
    expect(nearHorizon).toBeGreaterThanOrEqual(0);
  });

  it("scales alpha by density", () => {
    const full = sampleCloudsLayer([0, 1, 0], createParams({ coverage: 1, density: 1 }))[3];
    const half = sampleCloudsLayer([0, 1, 0], createParams({ coverage: 1, density: 0.5 }))[3];

    expect(half).toBeCloseTo(full * 0.5);
  });

  it("is deterministic for a given phase and shifts with it", () => {
    // A spread of upward directions: a single one can sit at a saturated end of the coverage
    // smoothstep and look unchanged even when the field has moved.
    const directions: Array<[number, number, number]> = [
      [0.3, 0.8, 0.2],
      [-0.4, 0.6, 0.5],
      [0.1, 0.95, -0.3],
      [0.6, 0.5, 0.1],
    ];
    const params = createParams({ coverage: 0.5, scale: 0.002, speed: 1 });
    const alphasAt = (phase: number) =>
      directions.map((direction) => sampleCloudsLayer(direction, { ...params, phase })[3]);

    // Same phase in, same field out — this is what makes the bake match the viewport.
    expect(alphasAt(0)).toEqual(alphasAt(0));
    expect(alphasAt(0)).not.toEqual(alphasAt(500));
  });

  it("mixes shadow to lit colour by sun influence", () => {
    const params = createParams({ color: "#ffffff", coverage: 1, shadowColor: "#000000" });
    // Sun straight up: a direction facing it is fully lit, one facing away is fully shadowed.
    const lit = sampleCloudsLayer([0, 1, 0], { ...params, sunDirection: [0, 1, 0] });
    const shadowed = sampleCloudsLayer([0, 1, 0], { ...params, sunDirection: [0, -1, 0] });

    expect(lit[0]).toBeGreaterThan(shadowed[0]);
    expect(lit[0]).toBeCloseTo(1);
    expect(shadowed[0]).toBeCloseTo(0);
  });

  it("composes through evaluateSkyboxDirection over a lower layer", () => {
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "sphere" },
      nodes: [
        {
          blendMode: "normal",
          enabled: true,
          id: "clouds",
          name: "Clouds",
          opacity: 100,
          params: createParams({ color: "#ffffff", coverage: 1, shadowColor: "#ffffff" }),
          type: "clouds",
        },
        {
          blendMode: "normal",
          enabled: true,
          id: "base",
          name: "Base",
          opacity: 100,
          params: {
            mode: "linear",
            rotation: 0,
            stops: [
              { color: "#000000", location: 0, midpoint: 50, opacity: 100 },
              { color: "#000000", location: 100, midpoint: 50, opacity: 100 },
            ],
          },
          type: "gradient",
        },
      ],
      version: 2,
    };
    // Straight up the clouds are opaque white, so they must fully cover the black gradient.
    const up = evaluateSkyboxDirection(manifest, [0, 1, 0]);
    // Straight down they are transparent, leaving the gradient.
    const down = evaluateSkyboxDirection(manifest, [0, -1, 0]);

    expect(up[0]).toBeCloseTo(1);
    expect(down[0]).toBeCloseTo(0);
  });
});
