import { describe, expect, it } from "vitest";

import {
  DEFAULT_SKYBOX_CLOUDS_PARAMS,
  cloneSkyboxCloudsParams,
  createDefaultSkyboxCloudsParams,
  syncCloudFieldTextures,
} from "../layer-addons/builtins/clouds";
import { resolveCloudLightReferences, type SkyboxManifestV2 } from "../manifest";
import { Skybox } from "../skybox";

function manifest(): SkyboxManifestV2 {
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
    ],
    version: 2,
  };
}

describe("custom SkyMesh clouds", () => {
  it("defaults to static motion and clones nested state", () => {
    const params = createDefaultSkyboxCloudsParams();
    const clone = cloneSkyboxCloudsParams(params);

    expect(params.motionMode).toBe("static");
    expect(params).toEqual(DEFAULT_SKYBOX_CLOUDS_PARAMS);
    expect(clone).not.toBe(params);
    expect(clone.field).not.toBe(params.field);
    expect(clone.cloudLow).not.toBe(params.cloudLow);
  });

  it("keeps the baked field texture for non-field changes", () => {
    const textures = new Map();
    const first = manifest();
    expect(syncCloudFieldTextures(first, textures)).toBe(true);
    const texture = textures.get("clouds");

    const changed = manifest();
    const clouds = changed.nodes[0];
    if (clouds.type !== "clouds") throw new Error("Expected Clouds");
    clouds.params.exposure = 4;
    clouds.params.motionMode = "dynamic";

    expect(syncCloudFieldTextures(changed, textures)).toBe(false);
    expect(textures.get("clouds")).toBe(texture);
    texture.dispose();
  });

  it("keeps the baked field texture while a layer is disabled", () => {
    const textures = new Map();
    const next = manifest();
    syncCloudFieldTextures(next, textures);
    const texture = textures.get("clouds");
    next.nodes[0].enabled = false;

    expect(syncCloudFieldTextures(next, textures)).toBe(false);
    expect(textures.get("clouds")).toBe(texture);

    next.nodes[0].enabled = true;
    expect(syncCloudFieldTextures(next, textures)).toBe(false);
    expect(textures.get("clouds")).toBe(texture);
    texture.dispose();
  });

  it("replaces the baked field texture only when field generation changes", () => {
    const textures = new Map();
    const first = manifest();
    syncCloudFieldTextures(first, textures);
    const texture = textures.get("clouds");

    const changed = manifest();
    const clouds = changed.nodes[0];
    if (clouds.type !== "clouds") throw new Error("Expected Clouds");
    clouds.params.field.seed += 1;

    expect(syncCloudFieldTextures(changed, textures)).toBe(true);
    expect(textures.get("clouds")).not.toBe(texture);
    textures.get("clouds")?.dispose();
  });

  it("updates Dynamic time as a uniform without rebuilding material or field", () => {
    const next = manifest();
    const clouds = next.nodes[0];
    if (clouds.type !== "clouds") throw new Error("Expected Clouds");
    clouds.params.motionMode = "dynamic";

    const skybox = new Skybox()
      .setRenderMode("live-webgpu")
      .fromManifest(next)
      .load();
    const material = skybox.material;
    const field = material.userData.debugImageTextureSlots.clouds;
    const runtime = material.userData.webGpuLayerRuntime.adapters.get("clouds");
    const time = runtime.uniforms[0].time;

    expect(time.value).toBe(0);
    skybox.setTime(12.5);
    expect(time.value).toBe(12.5);
    expect(skybox.material).toBe(material);
    expect(skybox.material.userData.debugImageTextureSlots.clouds).toBe(field);

    skybox.dispose();
  });

  it("resolves Spot and Image positions without borrowing their light properties", () => {
    const input = manifest();
    const clouds = input.nodes[0];
    if (clouds.type !== "clouds") throw new Error("Expected Clouds");
    clouds.params.sun.directionLayerId = "spot";
    input.nodes.push({
      blendMode: "normal",
      enabled: false,
      id: "spot",
      name: "Reference",
      opacity: 100,
      params: {
        angularRadius: 1,
        baseAngularRadius: 1,
        brightness: 99,
        centerDirection: [1, 0, 0],
        colorMode: "light",
        coreRadius: 0,
        coreSoftness: 0,
        dispersion: 0,
        dogSpread: 0,
        dogStrength: 0,
        dogStretch: 0,
        glareSize: 0,
        glareStrength: 0,
        glow: 0,
        glowSize: 0,
        glowStrength: 0,
        halo: 0,
        haloInnerWidth: 0,
        haloOuterWidth: 0,
        haloRadius: 0,
        haloStrength: 0,
        lightColor: "#ff0000",
        stops: [],
      },
      type: "spot",
    });

    const resolved = resolveCloudLightReferences(input);
    const result = resolved.nodes[0];
    if (result.type !== "clouds") throw new Error("Expected Clouds");

    expect(result.params.sun.direction).toEqual([1, 0, 0]);
    expect(result.params.sun.intensity).toBe(20);
    expect(result.params.sun.tint).toBe("#ffffff");
  });
});
