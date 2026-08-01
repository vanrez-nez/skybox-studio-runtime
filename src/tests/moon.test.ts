import { describe, expect, it } from "vitest";

import { bakeSkyboxImageData } from "../baking/bake";
import { MoonBaker } from "../layer-addons/builtins/moon/baker";
import {
  createMoonBakeKey,
  resolveMoonBakeResolution,
} from "../layer-addons/builtins/moon/service";
import {
  createDefaultSkyboxMoonParams,
  normalizeSkyboxMoonParams,
} from "../layer-addons/builtins/moon/params";
import {
  EARTHSHINE_MAX_IRRADIANCE,
  HAPKE_ALL_AREA_643,
  HAPKE_ALL_AREA_FULL_MOON_REFERENCE,
  HAPKE_HIGHLANDS_643,
  HAPKE_MARIA_643,
  evaluateHapkeReflectance,
  lambertSpherePhase,
} from "../layer-addons/builtins/moon/photometry";
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
  it("uses the calibrated WAC photometry model by default", () => {
    const params = createDefaultSkyboxMoonParams();

    expect(params.photometryModel).toBe("hapke-wac-643");
    expect(params.exposure).toBe(1);
    expect(HAPKE_HIGHLANDS_643).toMatchObject({
      b: 0.23,
      c: 0.37,
      oppositionAmplitude: 1.7,
      oppositionWidth: 0.08,
      singleScatteringAlbedo: 0.42,
    });
    expect(HAPKE_MARIA_643).toMatchObject({
      b: 0.26,
      c: 0.08,
      oppositionAmplitude: 2,
      oppositionWidth: 0.05,
      singleScatteringAlbedo: 0.24,
    });
    expect(HAPKE_ALL_AREA_FULL_MOON_REFERENCE).toBeCloseTo(0.2185863416, 9);
  });

  it("produces finite physical phase and illumination responses", () => {
    const full = evaluateHapkeReflectance({
      cosPhase: 1,
      material: HAPKE_ALL_AREA_643,
      mu: 0.8,
      mu0: 0.8,
    });
    const fiveDegrees = evaluateHapkeReflectance({
      cosPhase: Math.cos(5 * Math.PI / 180),
      material: HAPKE_ALL_AREA_643,
      mu: 0.8,
      mu0: 0.8,
    });
    const quarter = evaluateHapkeReflectance({
      cosPhase: 0,
      material: HAPKE_ALL_AREA_643,
      mu: 1,
      mu0: 0.5,
    });

    expect(full).toBeGreaterThan(fiveDegrees);
    expect(fiveDegrees).toBeGreaterThan(quarter);
    expect(quarter).toBeCloseTo(0.0363155285, 9);
    expect(evaluateHapkeReflectance({
      cosPhase: 0,
      material: HAPKE_ALL_AREA_643,
      mu: 1,
      mu0: 0,
    })).toBe(0);
  });

  it("derives earthshine from the complementary Earth phase", () => {
    expect(EARTHSHINE_MAX_IRRADIANCE).toBeCloseTo(0.000119217, 9);
    expect(lambertSpherePhase(0)).toBe(1);
    expect(lambertSpherePhase(Math.PI / 2)).toBeCloseTo(1 / Math.PI, 9);
    expect(lambertSpherePhase(Math.PI)).toBeCloseTo(0, 12);
  });

  it("migrates legacy artistic light controls only into the cartoon pipeline", () => {
    const normalized = normalizeSkyboxMoonParams({
      ...createDefaultSkyboxMoonParams(),
      ambient: 0.2,
      earthshine: 0.08,
      lightIntensity: 1.7,
      photometryModel: undefined,
      cartoonLightIntensity: undefined,
      cartoonFill: undefined,
      cartoonNightStrength: undefined,
      rimStrength: 2,
    } as any);

    expect(normalized.photometryModel).toBe("hapke-wac-643");
    expect(normalized.cartoonLightIntensity).toBe(1.7);
    expect(normalized.cartoonFill).toBe(0.2);
    expect(normalized.cartoonNightStrength).toBeCloseTo(0.48);
    expect(normalized).not.toHaveProperty("ambient");
    expect(normalized).not.toHaveProperty("earthshine");
    expect(normalized).not.toHaveProperty("rimStrength");
  });

  it("resolves automatic texture resolution from the final projection target", () => {
    const params = createDefaultSkyboxMoonParams();

    expect(resolveMoonBakeResolution(params, {
      kind: "viewport",
      renderHeight: 1080,
      verticalFovRadians: Math.PI / 3,
    })).toBe(512);
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
    expect(createMoonBakeKey({ ...params, rimStrength: 4 } as any, 512))
      .toBe(createMoonBakeKey(params, 512));
  });

  it("reports the CPU fallback as unsupported", () => {
    expect(() => bakeSkyboxImageData(moonManifest(), { height: 8, width: 16 }))
      .toThrow(/Moon layers require WebGPU compute/);
  });

  it("constructs both TSL compute pipelines", () => {
    const params = createDefaultSkyboxMoonParams();
    const baker = new MoonBaker({} as never, { ...params, resolution: 128 });

    expect(baker.outputTex.image).toMatchObject({ height: 128, width: 128 });
    baker.dispose();
  });
});
