import { describe, expect, it } from "vitest";
import * as THREE from "three";

import {
  bakeSkyboxImageData,
  blendChannel,
  createAngularDecalPlacement,
  evaluateSkyboxDirection,
  migrateManifestToV2,
  normalizeImagePlacement,
  placementFromPosition,
  placementFromScale,
  positionFromPlacement,
  projectDirectionToImageUv,
  scaleFromPlacement,
  Skybox,
  type SkyboxManifestV1,
  type SkyboxManifestV2,
} from "../index";

describe("runtime evaluator", () => {
  it("migrates v1 manifests into v2 nodes", () => {
    const manifest: SkyboxManifestV1 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      layers: [
        {
          blendMode: "normal",
          enabled: true,
          id: "gradient",
          name: "Gradient",
          opacity: 100,
          params: {
            mode: "linear",
            rotation: 0,
            stops: [{ color: "#ffffff", location: 0, opacity: 100 }],
          },
          type: "gradient",
        },
      ],
      version: 1,
    };

    const migratedManifest = migrateManifestToV2(manifest);

    expect(migratedManifest.geometry).toEqual({ type: "box" });
    expect(migratedManifest.nodes).toHaveLength(1);
  });

  it("preserves v2 spherical geometry", () => {
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "sphere" },
      nodes: [],
      version: 2,
    };

    expect(migrateManifestToV2(manifest).geometry).toEqual({ type: "sphere" });
  });

  it("evaluates nested group opacity and partial group baking", () => {
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "box" },
      nodes: [
        {
          blendMode: "normal",
          children: [
            {
              blendMode: "normal",
              enabled: true,
              id: "red",
              name: "Red",
              opacity: 100,
              params: {
                amplitude: 0,
                anchors: [{ color: "#ff0000", x: 0.5, y: 0.5 }],
                frequency: 1,
                mode: "inverse-distance",
                power: 2,
              },
              type: "field-gradient",
            },
          ],
          enabled: true,
          id: "group",
          name: "Group",
          opacity: 50,
          type: "group",
        },
      ],
      version: 2,
    };

    const full = evaluateSkyboxDirection(manifest, [0, 1, 0]);
    const partial = bakeSkyboxImageData(manifest, { cache: false, targetGroupId: "group", width: 2 });

    expect(full[0]).toBeGreaterThan(0);
    expect(full[0]).toBeLessThan(1);
    expect(partial.width).toBe(2);
  });

  it("keeps overlay equivalent to hard-light with swapped values", () => {
    expect(blendChannel("overlay", 0.2, 0.8)).toBeCloseTo(blendChannel("hard-light", 0.8, 0.2));
  });

  it("round-trips image placement position as yaw and elevation", () => {
    const placement = createAngularDecalPlacement({
      angularHeight: 0.25,
      angularWidth: 0.5,
      centerDirection: [0, 0, -1],
    });
    const movedPlacement = placementFromPosition(placement, { x: 42, y: 23 });
    const position = positionFromPlacement(movedPlacement);

    expect(position.x).toBeCloseTo(42);
    expect(position.y).toBeCloseTo(23);
  });

  it("changes image placement elevation without resetting yaw", () => {
    const placement = placementFromPosition(
      createAngularDecalPlacement({
        angularHeight: 0.25,
        angularWidth: 0.5,
        centerDirection: [0, 0, -1],
      }),
      { x: 35, y: 10 }
    );
    const movedPlacement = placementFromPosition(placement, { x: 35, y: -18 });
    const position = positionFromPlacement(movedPlacement);

    expect(position.x).toBeCloseTo(35);
    expect(position.y).toBeCloseTo(-18);
  });

  it("projects image placement center and rejects the back hemisphere", () => {
    const placement = createAngularDecalPlacement({
      angularHeight: 0.5,
      angularWidth: 0.5,
      centerDirection: [0, 0, -1],
    });

    expect(projectDirectionToImageUv([0, 0, -1], placement)).toEqual({ u: 0.5, v: 0.5 });
    expect(projectDirectionToImageUv([0, 0, 1], placement)).toBeNull();
  });

  it("represents inserted image scale as normalized one-to-one values", () => {
    const placement = createAngularDecalPlacement({
      angularHeight: 18,
      angularWidth: 32,
      centerDirection: [0, 0, -1],
    });

    expect(scaleFromPlacement(placement)).toEqual({ x: 1, y: 1 });
  });

  it("writes normalized image scale against the base angular size", () => {
    const placement = createAngularDecalPlacement({
      angularHeight: 18,
      angularWidth: 32,
      centerDirection: [0, 0, -1],
    });
    const scaledPlacement = placementFromScale(placement, { x: 0.5, y: 0.5 });

    expect(scaledPlacement.angularWidth).toBeCloseTo(16);
    expect(scaledPlacement.angularHeight).toBeCloseTo(9);
    expect(scaleFromPlacement(scaledPlacement)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("treats legacy image placement size as normalized scale one", () => {
    const placement = normalizeImagePlacement({
      angularHeight: 18,
      angularWidth: 32,
      centerDirection: [0, 0, -1],
      tangentX: [1, 0, 0],
      tangentY: [0, 1, 0],
    });

    expect(scaleFromPlacement(placement)).toEqual({ x: 1, y: 1 });
  });

  it("normalizes legacy image placement tangents from the shared world-up convention", () => {
    const placement = normalizeImagePlacement({
      angularHeight: 0.5,
      angularWidth: 0.5,
      centerDirection: [0, 0, -1],
      tangentX: [0, 0, 1],
      tangentY: [1, 0, 0],
    });

    expect(placement.tangentX[0]).toBeCloseTo(1);
    expect(placement.tangentX[1]).toBeCloseTo(0);
    expect(placement.tangentX[2]).toBeCloseTo(0);
    expect(placement.tangentY[0]).toBeCloseTo(0);
    expect(placement.tangentY[1]).toBeCloseTo(1);
    expect(placement.tangentY[2]).toBeCloseTo(0);
  });

  it("keeps image shader placement live-updatable when initial manifest placement is missing", () => {
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest({
        composition: { mode: "alpha-over", order: "bottom-to-top" },
        geometry: { type: "box" },
        nodes: [
          {
            blendMode: "normal",
            enabled: true,
            id: "image",
            name: "Image",
            opacity: 100,
            params: {
              height: 16,
              pixels: null,
              placement: null,
              src: "data:image/png;base64,",
              width: 16,
            },
            type: "image",
          },
        ],
        version: 2,
      })
      .load();

    const material = skybox.material as THREE.ShaderMaterial;

    expect(material.fragmentShader).toContain("imageCenterDirection0");
    expect(material.fragmentShader).not.toContain("return vec4(0.0, 0.0, 0.0, 0.0);");

    skybox.dispose();
  });
});
