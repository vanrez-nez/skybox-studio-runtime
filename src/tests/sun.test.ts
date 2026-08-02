import { describe, expect, it } from "vitest";

import {
  computeSunEclipseCoverage,
  computeSunEclipseGeometry,
  computeSunLightSource,
  SUN_LIGHT_INTENSITY_SCALE_MAX,
} from "../layer-addons/builtins/sun/eclipse";
import type { SkyboxSunParams } from "../manifest";
import { createDefaultSunParams, normalizeSunParams } from "../sun-transform";

/** Sun at -Z with an occluder separated by `s` sun radii at radius ratio `rho`. */
function eclipsedSun(s: number, rho: number): SkyboxSunParams {
  const params = createDefaultSunParams();
  const separation = s * params.angularRadius;

  return {
    ...params,
    resolvedOccluderAngularRadius: rho * params.angularRadius,
    resolvedOccluderDirection: [Math.sin(separation), 0, -Math.cos(separation)],
  };
}

describe("sun eclipse coverage", () => {
  it("is zero when discs are disjoint and at external tangency", () => {
    expect(computeSunEclipseCoverage(2.5, 1)).toBe(0);
    expect(computeSunEclipseCoverage(1 + 0.8, 0.8)).toBe(0);
    expect(computeSunEclipseCoverage(1 + 1.3, 1.3)).toBe(0);
  });

  it("is one at and inside internal tangency for a larger occluder", () => {
    expect(computeSunEclipseCoverage(1.3 - 1, 1.3)).toBe(1);
    expect(computeSunEclipseCoverage(0, 1.2)).toBe(1);
  });

  it("plateaus at rho^2 for a concentric smaller occluder (annular)", () => {
    expect(computeSunEclipseCoverage(0, 0.5)).toBeCloseTo(0.25, 12);
    expect(computeSunEclipseCoverage(0.2, 0.5)).toBeCloseTo(0.25, 12);
  });

  it("matches the known two-unit-circle lens value", () => {
    const expected = (2 * (Math.PI / 3) - Math.sqrt(3) / 2) / Math.PI;
    expect(computeSunEclipseCoverage(1, 1)).toBeCloseTo(expected, 12);
  });

  it("is monotone non-increasing in separation", () => {
    for (const rho of [0.5, 1, 1.3]) {
      let previous = Number.POSITIVE_INFINITY;
      for (let i = 0; i <= 60; i += 1) {
        const s = (i / 60) * (1 + rho + 0.5);
        const coverage = computeSunEclipseCoverage(s, rho);
        expect(coverage).toBeLessThanOrEqual(previous + 1e-12);
        previous = coverage;
      }
    }
  });

  it("is continuous across every branch seam", () => {
    const epsilon = 1e-7;
    const seams: Array<[number, number]> = [
      [1 + 0.5, 0.5],
      [1 - 0.5, 0.5],
      [1 + 1.3, 1.3],
      [1.3 - 1, 1.3],
    ];
    for (const [s, rho] of seams) {
      const below = computeSunEclipseCoverage(s - epsilon, rho);
      const above = computeSunEclipseCoverage(s + epsilon, rho);
      expect(Math.abs(above - below)).toBeLessThan(1e-6);
    }
  });

  it("returns zero for degenerate inputs", () => {
    expect(computeSunEclipseCoverage(Number.NaN, 1)).toBe(0);
    expect(computeSunEclipseCoverage(1, 0)).toBe(0);
    expect(computeSunEclipseCoverage(1, -2)).toBe(0);
  });
});

describe("sun eclipse geometry", () => {
  it("is inactive without a resolved occluder", () => {
    const geometry = computeSunEclipseGeometry(createDefaultSunParams());
    expect(geometry.active).toBe(0);
    expect(geometry.coverage).toBe(0);
    expect(geometry.occRadiusD).toBe(0);
  });

  it("is inactive when the occluder is behind the viewer", () => {
    const geometry = computeSunEclipseGeometry({
      ...createDefaultSunParams(),
      resolvedOccluderAngularRadius: 0.1,
      resolvedOccluderDirection: [0, 0, 1],
    });
    expect(geometry.active).toBe(0);
  });

  it("reports totality for a concentric larger occluder", () => {
    const geometry = computeSunEclipseGeometry(eclipsedSun(0, 1.2));
    expect(geometry.active).toBe(1);
    expect(geometry.coverage).toBe(1);
    expect(geometry.occLocalX).toBeCloseTo(0, 6);
    expect(geometry.occLocalY).toBeCloseTo(0, 6);
  });

  it("reports the annular plateau for a smaller occluder", () => {
    const geometry = computeSunEclipseGeometry(eclipsedSun(0.1, 0.6));
    expect(geometry.active).toBe(1);
    expect(geometry.coverage).toBeCloseTo(0.36, 6);
    expect(geometry.occRadiusD).toBeGreaterThan(0);
  });
});

describe("sun light source", () => {
  it("is normalized to 1 at defaults", () => {
    const source = computeSunLightSource(createDefaultSunParams());
    expect(source.intensityScale).toBeCloseTo(1, 9);
    expect(source.rendersOwnDisc).toBe(true);
    expect(source.angularRadius).toBeCloseTo(createDefaultSunParams().angularRadius, 9);
  });

  it("dims linearly with coverage and reaches zero at totality", () => {
    expect(computeSunLightSource(eclipsedSun(0, 1.2)).intensityScale).toBeCloseTo(0, 9);
    const annular = computeSunLightSource(eclipsedSun(0, 0.5));
    expect(annular.intensityScale).toBeCloseTo(1 - 0.25, 6);
  });

  it("scales flux with the photosphere's solid angle (~4x for a doubled radius)", () => {
    const params = createDefaultSunParams();
    const doubled = computeSunLightSource({
      ...params,
      angularRadius: params.angularRadius * 2,
      baseAngularRadius: params.baseAngularRadius * 2,
    });
    // tan() grows superlinearly, so a doubled radius lands slightly past 4x.
    expect(doubled.intensityScale).toBeGreaterThan(4);
    expect(doubled.intensityScale).toBeLessThan(5);
  });

  it("scales exp2 with exposure and clamps at the trim bound", () => {
    const params = createDefaultSunParams();
    expect(
      computeSunLightSource({ ...params, exposure: 1 }).intensityScale,
    ).toBeCloseTo(2, 9);
    expect(computeSunLightSource({ ...params, exposure: 24 }).intensityScale).toBe(
      SUN_LIGHT_INTENSITY_SCALE_MAX,
    );
  });
});

describe("normalizeSunParams", () => {
  it("fills defaults and strips unknown keys", () => {
    const normalized = normalizeSunParams({ rayCount: 12, rimStrength: 1 });
    expect(normalized).toEqual(createDefaultSunParams());
    expect(normalized).not.toHaveProperty("rayCount");
    expect(normalized).not.toHaveProperty("rimStrength");
  });

  it("passes resolution outputs through only when present", () => {
    expect(normalizeSunParams({})).not.toHaveProperty("resolvedOccluderDirection");
    const withOccluder = normalizeSunParams({
      resolvedOccluderAngularRadius: 0.1,
      resolvedOccluderDirection: [0, 0, -1],
    });
    expect(withOccluder.resolvedOccluderAngularRadius).toBe(0.1);
    expect(withOccluder.resolvedOccluderDirection).toEqual([0, 0, -1]);
  });
});
