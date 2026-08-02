import { describe, expect, it } from "vitest";

import { createDefaultSkyboxCloudsParams } from "../layer-addons/builtins/clouds";
import { createDefaultSkyboxMoonParams } from "../layer-addons/builtins/moon/params";
import { sampleSunLayer } from "../layer-addons/builtins/sun";
import { computeSunEclipseGeometry } from "../layer-addons/builtins/sun/eclipse";
import {
  resolveCloudLightReferences,
  type SkyboxManifestNode,
  type SkyboxManifestV2,
  type SkyboxSunParams,
} from "../manifest";
import { Skybox } from "../skybox";
import { createDefaultSunParams } from "../sun-transform";

// Small enough that the default moon descriptor (~0.23 rad) fully covers it.
const TEST_SUN_RADIUS = 0.1;

function manifestWith(...nodes: SkyboxManifestNode[]): SkyboxManifestV2 {
  return {
    composition: { mode: "alpha-over", order: "bottom-to-top" },
    nodes,
    version: 2,
  };
}

function sunNode(params: Partial<SkyboxSunParams> = {}): SkyboxManifestNode {
  return {
    blendMode: "normal",
    enabled: true,
    id: "sun-layer",
    name: "Sun",
    opacity: 100,
    params: { ...createDefaultSunParams(), angularRadius: TEST_SUN_RADIUS, ...params },
    type: "sun",
  };
}

function moonNode(
  centerDirection: [number, number, number] = [0, 0, -1],
): SkyboxManifestNode {
  return {
    blendMode: "normal",
    enabled: true,
    id: "moon-layer",
    name: "Moon",
    opacity: 100,
    params: createDefaultSkyboxMoonParams(centerDirection),
    type: "moon",
  };
}

function cloudsNode(): SkyboxManifestNode {
  const params = createDefaultSkyboxCloudsParams();
  params.sun.directionLayerId = "sun-layer";

  return {
    blendMode: "normal",
    enabled: true,
    id: "clouds-layer",
    name: "Clouds",
    opacity: 100,
    params,
    type: "clouds",
  };
}

function resolvedSun(manifest: SkyboxManifestV2): SkyboxSunParams {
  const node = resolveCloudLightReferences(manifest).nodes.find(
    (candidate) => candidate.type === "sun",
  );
  if (!node || node.type !== "sun") throw new Error("Expected Sun");
  return node.params;
}

/** Direction at gnomonic local (x, y) d-units for a sun at -Z. */
function directionAt(
  x: number,
  y: number,
  radius = TEST_SUN_RADIUS,
): [number, number, number] {
  const direction: [number, number, number] = [-x * radius, y * radius, -1];
  const length = Math.hypot(...direction);
  return [direction[0] / length, direction[1] / length, direction[2] / length];
}

describe("sun occluder resolution", () => {
  it("writes occluder geometry from the moon's light-source descriptor", () => {
    const manifest = manifestWith(sunNode({ occluderLayerId: "moon-layer" }), moonNode());
    const params = resolvedSun(manifest);
    expect(params.occluderLayerId).toBe("moon-layer");
    expect(params.resolvedOccluderDirection).toEqual([0, 0, -1]);
    // 0.5 · DISC_FILL · default moon angular size.
    expect(params.resolvedOccluderAngularRadius).toBeCloseTo(
      0.5 * 0.94 * 2 * Math.atan(1 / 4),
      6,
    );
  });

  it("clears dangling and self references, stripping stale fields", () => {
    const dangling = resolvedSun(
      manifestWith(
        sunNode({
          occluderLayerId: "gone",
          resolvedOccluderAngularRadius: 0.2,
          resolvedOccluderDirection: [1, 0, 0],
        }),
      ),
    );
    expect(dangling.occluderLayerId).toBeNull();
    expect("resolvedOccluderDirection" in dangling).toBe(false);

    const self = resolvedSun(manifestWith(sunNode({ occluderLayerId: "sun-layer" })));
    expect(self.occluderLayerId).toBeNull();
  });

  it("keeps a radius-less occluder link inert (spot source)", () => {
    const manifest = manifestWith(
      sunNode({ occluderLayerId: "spot-layer" }),
      {
        blendMode: "normal",
        enabled: true,
        id: "spot-layer",
        name: "Spot",
        opacity: 100,
        params: { centerDirection: [1, 0, 0], stops: [] },
        type: "spot",
      } as unknown as SkyboxManifestNode,
    );
    const params = resolvedSun(manifest);
    expect(params.occluderLayerId).toBe("spot-layer");
    expect(params.resolvedOccluderAngularRadius).toBe(0);
    expect(computeSunEclipseGeometry(params).active).toBe(0);
  });

  it("fails soft on an unregistered occluder type", () => {
    const manifest = manifestWith(
      sunNode({
        occluderLayerId: "lamp",
        resolvedOccluderAngularRadius: 0.3,
        resolvedOccluderDirection: [0, 1, 0],
      }),
      {
        blendMode: "normal",
        enabled: true,
        id: "lamp",
        name: "Lamp",
        opacity: 100,
        params: {},
        type: "external-lamp",
      } as unknown as SkyboxManifestNode,
    );
    const params = resolvedSun(manifest);
    expect(params.occluderLayerId).toBe("lamp");
    expect(params.resolvedOccluderAngularRadius).toBe(0.3);
  });

  it("cascades moon -> sun -> clouds in a single resolve", () => {
    const manifest = manifestWith(
      cloudsNode(),
      sunNode({ occluderLayerId: "moon-layer" }),
      moonNode(),
    );
    const resolved = resolveCloudLightReferences(manifest);
    const clouds = resolved.nodes.find((node) => node.type === "clouds");
    if (!clouds || clouds.type !== "clouds") throw new Error("Expected Clouds");

    expect(clouds.params.sun.directionLayerId).toBe("sun-layer");
    expect(clouds.params.sun.direction).toEqual([0, 0, -1]);
    expect(clouds.params.sun.resolvedIntensityScale).toBeCloseTo(0, 9);
    expect(clouds.params.sun.resolvedSourceDisc).toBe(true);
  });
});

describe("sun CPU sampler (occluded solar disk model)", () => {
  const openSun = { ...createDefaultSunParams(), angularRadius: TEST_SUN_RADIUS };
  const sunRD = Math.tan(TEST_SUN_RADIUS) / TEST_SUN_RADIUS;
  const totalitySun: SkyboxSunParams = {
    ...openSun,
    resolvedOccluderAngularRadius: 0.5 * 0.94 * 2 * Math.atan(1 / 4),
    resolvedOccluderDirection: [0, 0, -1],
  };

  it("renders an opaque limb-darkened disk with an aureole falloff", () => {
    const center = sampleSunLayer([0, 0, -1], openSun);
    expect(center[3]).toBe(1);

    // Limb darkening: blue drops fastest toward the rim (LIMB.b = 0.82).
    const nearRim = sampleSunLayer(directionAt(0.9 * sunRD, 0), openSun);
    expect(nearRim[3]).toBe(1);
    expect(nearRim[2]).toBeLessThan(nearRim[0]);

    // Outside the disk the aureole carries smoothly decreasing light.
    const nearAureole = sampleSunLayer(directionAt(1.5 * sunRD, 0), openSun);
    const farAureole = sampleSunLayer(directionAt(6 * sunRD, 0), openSun);
    expect(nearAureole[3]).toBeGreaterThan(0);
    expect(nearAureole[3] * nearAureole[0]).toBeGreaterThan(farAureole[3] * farAureole[0]);

    // Antipode stays empty (hemisphere gate on the gnomonic projection).
    expect(sampleSunLayer([0, 0, 1], openSun)).toEqual([0, 0, 0, 0]);
  });

  it("goes fully dark under the occluder at totality, corona survives outside it", () => {
    const geometry = computeSunEclipseGeometry(totalitySun);
    expect(geometry.coverage).toBe(1);

    // Under the occluder: no disk, no aureole (nothing is lit), no corona.
    const center = sampleSunLayer([0, 0, -1], totalitySun);
    expect(center[3]).toBeLessThan(0.02);
  });

  it("reveals the corona at a realistic near-total geometry", () => {
    // Moon barely larger than the photosphere (rho ~ 1.05): the corona is
    // sampled just past the limb where the Baumbach profile is still strong.
    const nearTotalSun: SkyboxSunParams = {
      ...createDefaultSunParams(),
      angularRadius: 0.22,
      resolvedOccluderAngularRadius: 0.5 * 0.94 * 2 * Math.atan(1 / 4),
      resolvedOccluderDirection: [0, 0, -1],
    };
    const geometry = computeSunEclipseGeometry(nearTotalSun);
    expect(geometry.coverage).toBe(1);

    // The streamer field is azimuthal noise (with genuine coronal holes), so
    // probe several azimuths and require the brightest to be clearly visible.
    const probeRadius = geometry.occRadiusD + 0.12;
    let brightest = 0;
    for (let i = 0; i < 8; i += 1) {
      const azimuth = (i / 8) * Math.PI * 2;
      const sample = sampleSunLayer(
        directionAt(
          probeRadius * Math.cos(azimuth),
          probeRadius * Math.sin(azimuth),
          0.22,
        ),
        nearTotalSun,
      );
      brightest = Math.max(brightest, sample[3] * sample[0]);
    }
    expect(brightest).toBeGreaterThan(0.05);
  });

  it("concentrates the aureole on the exposed side of a partial eclipse", () => {
    const partialSun: SkyboxSunParams = {
      ...openSun,
      resolvedOccluderAngularRadius: TEST_SUN_RADIUS,
      resolvedOccluderDirection: directionAt(1.0, 0),
    };
    const geometry = computeSunEclipseGeometry(partialSun);
    expect(geometry.coverage).toBeGreaterThan(0.2);
    expect(geometry.coverage).toBeLessThan(0.8);

    // Symmetric probes outside both disks: the side away from the occluder
    // sees more scattered light than the covered side — the crescent glare
    // emerges from the lit-measure integral, not from a stylized gate.
    const exposed = sampleSunLayer(directionAt(-2.5 * sunRD, 0), partialSun);
    const covered = sampleSunLayer(directionAt(2.5 * sunRD, 0), partialSun);
    expect(exposed[3] * exposed[0]).toBeGreaterThan(covered[3] * covered[0]);
  });
});

describe("sun live pipeline", () => {
  it("pushes eclipse uniforms and refolds them when the moon moves", () => {
    const manifest = manifestWith(
      cloudsNode(),
      sunNode({ occluderLayerId: "moon-layer" }),
      moonNode(),
    );

    const skybox = new Skybox()
      .setRenderMode("live-webgpu")
      .fromManifest(manifest)
      .load();
    const adapters = skybox.material.userData.webGpuLayerRuntime.adapters;
    const sunUniforms = adapters.get("sun").uniforms[0];
    const cloudsSun = adapters.get("clouds").uniforms[0].model.uniforms.sun;

    // Totality at load: the moon covers the small test sun concentrically.
    expect(sunUniforms.eclipseActive.value).toBe(1);
    expect(sunUniforms.occRadiusD.value).toBeGreaterThan(1);
    expect(cloudsSun.intensity.value).toBeCloseTo(0, 9);

    // Move the moon far away: eclipse deactivates, clouds light returns at
    // the sun's solid-angle-scaled flux (the test sun is smaller than the
    // default photosphere).
    const sizeScale =
      Math.tan(TEST_SUN_RADIUS / 2) ** 2 / Math.tan(Math.PI / 24) ** 2;
    skybox.updateMoonLayer("moon-layer", createDefaultSkyboxMoonParams([1, 0, 0]));
    expect(sunUniforms.eclipseActive.value).toBe(0);
    expect(sunUniforms.occRadiusD.value).toBe(0);
    expect(cloudsSun.intensity.value).toBeCloseTo(20 * sizeScale, 6);

    skybox.dispose();
  });
});
