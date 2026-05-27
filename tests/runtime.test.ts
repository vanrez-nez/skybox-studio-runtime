import { describe, expect, it } from "vitest";
import * as THREE from "three";

import {
  bakeSkyboxImageData,
  blendChannel,
  createAngularDecalPlacement,
  createDefaultSpotParams,
  evaluateSkyboxDirection,
  migrateManifestToV2,
  normalizeImagePlacement,
  placementFromPosition,
  placementFromRotation,
  placementFromScale,
  positionFromPlacement,
  projectDirectionToImageUv,
  rotationFromPlacement,
  scaleFromPlacement,
  Skybox,
  spotFromRadiusScale,
  type SkyboxManifestV1,
  type SkyboxManifestV2,
} from "../index";

describe("runtime evaluator", () => {
  const createImageManifest = (): SkyboxManifestV2 => ({
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
          placement: createAngularDecalPlacement({
            angularHeight: 0.25,
            angularWidth: 0.25,
            centerDirection: [0, 0, -1],
          }),
          src: "data:image/png;base64,",
          width: 16,
        },
        type: "image",
      },
    ],
    version: 2,
  });

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

  it("evaluates linear gradient midpoint interpolation", () => {
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "box" },
      nodes: [
        {
          blendMode: "normal",
          enabled: true,
          id: "gradient",
          name: "Gradient",
          opacity: 100,
          params: {
            mode: "linear",
            rotation: 0,
            stops: [
              { color: "#000000", location: 0, midpoint: 25, opacity: 100 },
              { color: "#ffffff", location: 100, opacity: 100 },
            ],
          },
          type: "gradient",
        },
      ],
      version: 2,
    };
    const color = evaluateSkyboxDirection(manifest, [0, -0.5, -Math.sqrt(0.75)]);

    expect(color[0]).toBeCloseTo(0.5);
    expect(color[1]).toBeCloseTo(0.5);
    expect(color[2]).toBeCloseTo(0.5);
  });

  it("evaluates spot light color at the center and fades outside radius", () => {
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "box" },
      nodes: [
        {
          blendMode: "normal",
          enabled: true,
          id: "spot",
          name: "Spot",
          opacity: 100,
          params: {
            ...createDefaultSpotParams(),
            brightness: 1.5,
            centerDirection: [0, 0, -1],
            glow: 1,
            halo: 0,
            lightColor: "#ffffff",
          },
          type: "spot",
        },
      ],
      version: 2,
    };
    const center = evaluateSkyboxDirection(manifest, [0, 0, -1]);
    const outside = evaluateSkyboxDirection(manifest, [1, 0, 0]);

    expect(center[0]).toBeGreaterThan(0.9);
    expect(center[1]).toBeGreaterThan(0.9);
    expect(center[2]).toBeGreaterThan(0.9);
    expect(outside[0]).toBeCloseTo(0);
    expect(outside[1]).toBeCloseTo(0);
    expect(outside[2]).toBeCloseTo(0);
  });

  it("uses normalized spot radius scale against base radius", () => {
    const spot = createDefaultSpotParams();
    const scaledSpot = spotFromRadiusScale(spot, 0.5);

    expect(scaledSpot.angularRadius).toBeCloseTo(spot.baseAngularRadius * 0.5);
    expect(scaledSpot.baseAngularRadius).toBeCloseTo(spot.baseAngularRadius);
  });

  it("keeps gradient midpoint uniform updates on the live material path", () => {
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "box" },
      nodes: [
        {
          blendMode: "normal",
          enabled: true,
          id: "gradient",
          name: "Gradient",
          opacity: 100,
          params: {
            mode: "linear",
            rotation: 0,
            stops: [
              { color: "#000000", location: 0, midpoint: 25, opacity: 100 },
              { color: "#ffffff", location: 100, opacity: 100 },
            ],
          },
          type: "gradient",
        },
      ],
      version: 2,
    };
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest(manifest)
      .load();
    const material = skybox.material as THREE.ShaderMaterial;

    expect(material.fragmentShader).toContain("StopMidpoint0");
    expect(material.uniforms.gradientLayer0StopMidpoint0.value).toBeCloseTo(0.25);

    skybox.setManifest({
      ...manifest,
      nodes: [
        {
          ...manifest.nodes[0],
          params: {
            ...(manifest.nodes[0] as Extract<SkyboxManifestV2["nodes"][number], { type: "gradient" }>).params,
            stops: [
              { color: "#000000", location: 0, midpoint: 75, opacity: 100 },
              { color: "#ffffff", location: 100, opacity: 100 },
            ],
          },
        } as Extract<SkyboxManifestV2["nodes"][number], { type: "gradient" }>,
      ],
    });

    expect(skybox.material).toBe(material);
    expect(material.uniforms.gradientLayer0StopMidpoint0.value).toBeCloseTo(0.75);
    skybox.dispose();
  });

  it("defaults legacy gradient midpoint uniforms to center", () => {
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest({
        composition: { mode: "alpha-over", order: "bottom-to-top" },
        geometry: { type: "box" },
        nodes: [
          {
            blendMode: "normal",
            enabled: true,
            id: "gradient",
            name: "Gradient",
            opacity: 100,
            params: {
              mode: "linear",
              rotation: 0,
              stops: [
                { color: "#000000", location: 0, opacity: 100 },
                { color: "#ffffff", location: 100, opacity: 100 },
              ],
            },
            type: "gradient",
          },
        ],
        version: 2,
      })
      .load();
    const material = skybox.material as THREE.ShaderMaterial;

    expect(material.uniforms.gradientLayer0StopMidpoint0.value).toBeCloseTo(0.5);
    skybox.dispose();
  });

  it("keeps opacity changes on the live material uniform path", () => {
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "box" },
      nodes: [
        {
          blendMode: "normal",
          enabled: true,
          id: "gradient",
          name: "Gradient",
          opacity: 100,
          params: {
            mode: "linear",
            rotation: 0,
            stops: [
              { color: "#000000", location: 0, opacity: 100 },
              { color: "#ffffff", location: 100, opacity: 100 },
            ],
          },
          type: "gradient",
        },
      ],
      version: 2,
    };
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest(manifest)
      .load();
    const material = skybox.material as THREE.ShaderMaterial;

    expect(material.fragmentShader).toContain("compositionNode0Opacity");
    expect(material.uniforms.compositionNode0Opacity.value).toBeCloseTo(1);

    skybox.setManifest({
      ...manifest,
      nodes: [{ ...manifest.nodes[0], opacity: 25 }],
    });

    expect(skybox.material).toBe(material);
    expect(material.uniforms.compositionNode0Opacity.value).toBeCloseTo(0.25);
    skybox.dispose();
  });

  it("keeps blend mode changes on the live material uniform path", () => {
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "box" },
      nodes: [
        {
          blendMode: "normal",
          enabled: true,
          id: "gradient",
          name: "Gradient",
          opacity: 100,
          params: {
            mode: "linear",
            rotation: 0,
            stops: [
              { color: "#000000", location: 0, opacity: 100 },
              { color: "#ffffff", location: 100, opacity: 100 },
            ],
          },
          type: "gradient",
        },
      ],
      version: 2,
    };
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest(manifest)
      .load();
    const material = skybox.material as THREE.ShaderMaterial;

    expect(material.fragmentShader).toContain("compositionNode0BlendMode");
    expect(material.uniforms.compositionNode0BlendMode.value).toBe(0);

    skybox.setManifest({
      ...manifest,
      nodes: [{ ...manifest.nodes[0], blendMode: "screen" }],
    });

    expect(skybox.material).toBe(material);
    expect(material.uniforms.compositionNode0BlendMode.value).toBe(5);
    skybox.dispose();
  });

  it("still rebuilds live material topology when gradient stop count changes", () => {
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "box" },
      nodes: [
        {
          blendMode: "normal",
          enabled: true,
          id: "gradient",
          name: "Gradient",
          opacity: 100,
          params: {
            mode: "linear",
            rotation: 0,
            stops: [
              { color: "#000000", location: 0, opacity: 100 },
              { color: "#ffffff", location: 100, opacity: 100 },
            ],
          },
          type: "gradient",
        },
      ],
      version: 2,
    };
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest(manifest)
      .load();
    const material = skybox.material;

    skybox.setManifest({
      ...manifest,
      nodes: [
        {
          ...manifest.nodes[0],
          params: {
            ...(manifest.nodes[0] as Extract<SkyboxManifestV2["nodes"][number], { type: "gradient" }>).params,
            stops: [
              { color: "#000000", location: 0, opacity: 100 },
              { color: "#888888", location: 50, opacity: 100 },
              { color: "#ffffff", location: 100, opacity: 100 },
            ],
          },
        } as Extract<SkyboxManifestV2["nodes"][number], { type: "gradient" }>,
      ],
    });

    expect(skybox.material).not.toBe(material);
    skybox.dispose();
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

  it("round-trips image placement rotation", () => {
    const placement = createAngularDecalPlacement({
      angularHeight: 0.25,
      angularWidth: 0.5,
      centerDirection: [0, 0, -1],
    });
    const rotatedPlacement = placementFromRotation(placement, 90);

    expect(rotationFromPlacement(rotatedPlacement)).toBe(90);
  });

  it("rotates image placement UV orientation around the center direction", () => {
    const unrotatedPlacement = createAngularDecalPlacement({
      angularHeight: 0.5,
      angularWidth: 0.5,
      centerDirection: [0, 0, -1],
    });
    const rotatedPlacement = placementFromRotation(unrotatedPlacement, 90);
    const rightDirection: [number, number, number] = [0.1, 0, -1];
    const unrotatedUv = projectDirectionToImageUv(rightDirection, unrotatedPlacement);
    const rotatedUv = projectDirectionToImageUv(rightDirection, rotatedPlacement);

    expect(unrotatedUv).not.toBeNull();
    expect(rotatedUv).not.toBeNull();
    expect(unrotatedUv!.u).toBeGreaterThan(0.5);
    expect(unrotatedUv!.v).toBeCloseTo(0.5);
    expect(rotatedUv!.u).toBeCloseTo(0.5);
    expect(rotatedUv!.v).toBeLessThan(0.5);
  });

  it("preserves image placement rotation through position and scale changes", () => {
    const placement = placementFromRotation(
      createAngularDecalPlacement({
        angularHeight: 0.25,
        angularWidth: 0.5,
        centerDirection: [0, 0, -1],
      }),
      37
    );
    const movedPlacement = placementFromPosition(placement, { x: 20, y: 12 });
    const scaledPlacement = placementFromScale(movedPlacement, { x: 0.75, y: 0.5 });

    expect(rotationFromPlacement(movedPlacement)).toBe(37);
    expect(rotationFromPlacement(scaledPlacement)).toBe(37);
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
    expect(rotationFromPlacement(placement)).toBe(0);
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

  it("omits editor image presentation shader code by default", () => {
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest(createImageManifest())
      .load();
    const material = skybox.material as THREE.ShaderMaterial;

    expect(material.fragmentShader).not.toContain("imageActive0");
    expect(material.fragmentShader).not.toContain("rectCoverage");

    skybox.dispose();
  });

  it("includes editor image presentation shader code only when enabled", () => {
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest(createImageManifest())
      .setEditorPresentationEnabled(true)
      .load();
    const material = skybox.material as THREE.ShaderMaterial;

    expect(material.fragmentShader).toContain("imageActive0");
    expect(material.fragmentShader).toContain("rectCoverage");
    expect(material.fragmentShader).toContain("rectAlpha");
    expect(material.fragmentShader).toContain("bounds");
    expect(material.fragmentShader).toContain("clamp(fwidth(imageEdgeDistance)");
    expect(material.fragmentShader).toContain("imageHardInside");
    expect(material.fragmentShader).toContain("imageNearRect");
    expect(material.fragmentShader).toContain(
      "effectColor = vec4(imageSampleColor.rgb, imageSampleColor.a * imageSampleInfo.z);"
    );
    expect(material.fragmentShader).not.toContain("imageSampleColor = skyboxStudioApplyImageEditorOverlay");
    expect(material.fragmentShader).not.toContain("selectionFill");

    skybox.dispose();
  });

  it("updates editor image state without rebuilding the material", () => {
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest(createImageManifest())
      .setEditorPresentationEnabled(true)
      .load();
    const material = skybox.material as THREE.ShaderMaterial;

    skybox.setEditorImageState({
      selectedImageLayerId: "image",
    });

    expect(skybox.material).toBe(material);
    expect(material.uniforms.imageActive0.value).toBe(1);

    skybox.dispose();
  });
});
