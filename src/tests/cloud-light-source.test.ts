import { describe, expect, it } from "vitest";

import { createDefaultSkyboxCloudsParams } from "../layer-addons/builtins/clouds";
import { DISC_FILL } from "../layer-addons/builtins/moon/disc";
import {
  MOON_LIGHT_INTENSITY_SCALE_MAX,
  computeMoonLightSource,
  moonPhaseAngle,
  moonPhaseBrightness,
} from "../layer-addons/builtins/moon/light-source";
import {
  DEFAULT_MOON_SPRITE_ANGULAR_SIZE,
  createDefaultSkyboxMoonParams,
} from "../layer-addons/builtins/moon/params";
import {
  resolveCloudLightReferences,
  type SkyboxManifestNode,
  type SkyboxManifestV2,
} from "../manifest";
import { Skybox } from "../skybox";

function cloudsManifest(...extraNodes: SkyboxManifestNode[]): SkyboxManifestV2 {
  return {
    composition: { mode: "alpha-over", order: "bottom-to-top" },
    nodes: [
      {
        blendMode: "normal",
        enabled: true,
        id: "clouds",
        name: "Clouds",
        opacity: 100,
        params: createDefaultSkyboxCloudsParams(),
        type: "clouds",
      },
      ...extraNodes,
    ],
    version: 2,
  };
}

function moonNode(
  params = createDefaultSkyboxMoonParams(),
): SkyboxManifestNode {
  return {
    blendMode: "normal",
    enabled: true,
    id: "moon-layer",
    name: "Moon",
    opacity: 100,
    params,
    type: "moon",
  };
}

function resolvedClouds(manifest: SkyboxManifestV2) {
  const node = resolveCloudLightReferences(manifest).nodes[0];
  if (node.type !== "clouds") throw new Error("Expected Clouds");
  return node.params;
}

describe("moon light-source modulation", () => {
  it("is 1 at the reference configuration (full phase, default size, exposure 1)", () => {
    const source = computeMoonLightSource(createDefaultSkyboxMoonParams());
    expect(source.intensityScale).toBeCloseTo(1, 6);
    expect(source.rendersOwnDisc).toBe(true);
  });

  it("matches the observed ~10x full-vs-quarter brightness ratio", () => {
    const quarter = computeMoonLightSource({
      ...createDefaultSkyboxMoonParams(),
      phase: 0.25,
    });
    expect(quarter.intensityScale).toBeGreaterThan(0.08);
    expect(quarter.intensityScale).toBeLessThan(0.11);
  });

  it("extinguishes near new moon", () => {
    const newMoon = computeMoonLightSource({
      ...createDefaultSkyboxMoonParams(),
      phase: 0,
    });
    expect(newMoon.intensityScale).toBeLessThan(1e-3);
    expect(moonPhaseBrightness(moonPhaseAngle(1))).toBeLessThan(1e-3);
  });

  it("scales with the sprite solid angle (~4x for a doubled diameter)", () => {
    const params = createDefaultSkyboxMoonParams();
    const doubled = computeMoonLightSource({
      ...params,
      placement: {
        ...params.placement,
        angularWidth: params.placement.angularWidth * 2,
        angularHeight: params.placement.angularHeight * 2,
        baseAngularWidth: params.placement.baseAngularWidth * 2,
        baseAngularHeight: params.placement.baseAngularHeight * 2,
      },
    });
    // tan() grows superlinearly, so a doubled diameter lands slightly past 4x.
    expect(doubled.intensityScale).toBeGreaterThan(4);
    expect(doubled.intensityScale).toBeLessThan(5);
  });

  it("is linear in exposure and clamps at the trim-friendliness bound", () => {
    const params = createDefaultSkyboxMoonParams();
    expect(
      computeMoonLightSource({ ...params, exposure: 2 }).intensityScale,
    ).toBeCloseTo(2, 6);
    expect(
      computeMoonLightSource({ ...params, exposure: 1e6 }).intensityScale,
    ).toBe(MOON_LIGHT_INTENSITY_SCALE_MAX);
    expect(
      computeMoonLightSource({ ...params, exposure: -3 }).intensityScale,
    ).toBe(0);
  });

  it("falls back to a neutral scale on degenerate inputs", () => {
    const source = computeMoonLightSource({
      ...createDefaultSkyboxMoonParams(),
      phase: Number.NaN,
    });
    expect(source.intensityScale).toBe(1);
  });

  it("reports the baked disc's angular radius", () => {
    const source = computeMoonLightSource(createDefaultSkyboxMoonParams());
    expect(source.angularRadius).toBeCloseTo(
      0.5 * DISC_FILL * DEFAULT_MOON_SPRITE_ANGULAR_SIZE,
      6,
    );
  });
});

describe("cloud light reference resolution", () => {
  it("resolves a Moon link into direction + resolution outputs, without borrowing tint", () => {
    const manifest = cloudsManifest(moonNode());
    const clouds = manifest.nodes[0];
    if (clouds.type !== "clouds") throw new Error("Expected Clouds");
    clouds.params.sun.directionLayerId = "moon-layer";

    const params = resolvedClouds(manifest);
    expect(params.sun.directionLayerId).toBe("moon-layer");
    expect(params.sun.direction).toEqual([0, 0, -1]);
    expect(params.sun.resolvedIntensityScale).toBeCloseTo(1, 6);
    expect(params.sun.resolvedAngularRadius).toBeCloseTo(
      0.5 * DISC_FILL * DEFAULT_MOON_SPRITE_ANGULAR_SIZE,
      6,
    );
    expect(params.sun.resolvedSourceDisc).toBe(true);
    // Appearance never leaks: the user's slider and tint stay untouched.
    expect(params.sun.intensity).toBe(20);
    expect(params.sun.tint).toBe("#ffffff");
  });

  it("keeps Spot/Image links free of resolution outputs", () => {
    const manifest = cloudsManifest();
    const clouds = manifest.nodes[0];
    if (clouds.type !== "clouds") throw new Error("Expected Clouds");
    clouds.params.sun.directionLayerId = "moon-layer";
    manifest.nodes.push(moonNode());
    clouds.params.moon.directionLayerId = null;

    const params = resolvedClouds(manifest);
    expect("resolvedIntensityScale" in params.moon).toBe(false);
    expect("resolvedAngularRadius" in params.moon).toBe(false);
    expect("resolvedSourceDisc" in params.moon).toBe(false);
  });

  it("clears a dangling link and strips stale resolution outputs", () => {
    const manifest = cloudsManifest();
    const clouds = manifest.nodes[0];
    if (clouds.type !== "clouds") throw new Error("Expected Clouds");
    clouds.params.sun.directionLayerId = "gone";
    clouds.params.sun.direction = [0, 1, 0];
    clouds.params.sun.resolvedIntensityScale = 4;
    clouds.params.sun.resolvedSourceDisc = true;

    const params = resolvedClouds(manifest);
    expect(params.sun.directionLayerId).toBeNull();
    expect(params.sun.direction).toEqual([0, 1, 0]);
    expect("resolvedIntensityScale" in params.sun).toBe(false);
    expect("resolvedSourceDisc" in params.sun).toBe(false);
  });

  it("clears a link to a registered type without the light-source capability", () => {
    const manifest = cloudsManifest({
      blendMode: "normal",
      enabled: true,
      id: "gradient-layer",
      name: "Gradient",
      opacity: 100,
      params: { mode: "linear", rotation: 0, stops: [] },
      type: "gradient",
    } as unknown as SkyboxManifestNode);
    const clouds = manifest.nodes[0];
    if (clouds.type !== "clouds") throw new Error("Expected Clouds");
    clouds.params.sun.directionLayerId = "gradient-layer";

    const params = resolvedClouds(manifest);
    expect(params.sun.directionLayerId).toBeNull();
  });

  it("fails soft on a link to an unregistered layer type", () => {
    const manifest = cloudsManifest({
      blendMode: "normal",
      enabled: true,
      id: "lamp",
      name: "External Lamp",
      opacity: 100,
      params: {},
      type: "external-lamp",
    } as unknown as SkyboxManifestNode);
    const clouds = manifest.nodes[0];
    if (clouds.type !== "clouds") throw new Error("Expected Clouds");
    clouds.params.sun.directionLayerId = "lamp";
    clouds.params.sun.direction = [1, 0, 0];
    clouds.params.sun.resolvedIntensityScale = 2;

    const params = resolvedClouds(manifest);
    expect(params.sun.directionLayerId).toBe("lamp");
    expect(params.sun.direction).toEqual([1, 0, 0]);
    expect(params.sun.resolvedIntensityScale).toBe(2);
  });
});

describe("moon-linked clouds light in the live pipeline", () => {
  it("folds the modulation into the intensity uniform and follows moon edits", () => {
    const moonParams = { ...createDefaultSkyboxMoonParams(), phase: 0.25 };
    const manifest = cloudsManifest(moonNode(moonParams));
    const clouds = manifest.nodes[0];
    if (clouds.type !== "clouds") throw new Error("Expected Clouds");
    clouds.params.sun.directionLayerId = "moon-layer";

    const skybox = new Skybox()
      .setRenderMode("live-webgpu")
      .fromManifest(manifest)
      .load();
    const runtime =
      skybox.material.userData.webGpuLayerRuntime.adapters.get("clouds");
    const sun = runtime.uniforms[0].model.uniforms.sun;

    const quarterScale = computeMoonLightSource(moonParams).intensityScale ?? 1;
    expect(sun.intensity.value).toBeCloseTo(20 * quarterScale, 6);
    expect(sun.showDisc.value).toBe(0);
    expect(sun.angularRadius.value).toBeCloseTo(
      0.5 * DISC_FILL * DEFAULT_MOON_SPRITE_ANGULAR_SIZE,
      6,
    );

    // A moon edit must re-resolve and re-push the clouds uniforms live.
    skybox.updateMoonLayer("moon-layer", {
      ...moonParams,
      phase: 0.5,
    });
    expect(sun.intensity.value).toBeCloseTo(20, 6);

    skybox.dispose();
  });
});
