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

  const createSpotManifest = (): SkyboxManifestV2 => ({
    composition: { mode: "alpha-over", order: "bottom-to-top" },
    geometry: { type: "box" },
    nodes: [
      {
        blendMode: "normal",
        enabled: true,
        id: "spot",
        name: "Spot",
        opacity: 100,
        params: createDefaultSpotParams(),
        type: "spot",
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

  it("updates layer composition directly without replacing the live material", () => {
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

    skybox.updateLayerComposition("gradient", { blendMode: "screen", opacity: 40 });

    expect(skybox.material).toBe(material);
    expect(material.uniforms.compositionNode0BlendMode.value).toBe(5);
    expect(material.uniforms.compositionNode0Opacity.value).toBeCloseTo(0.4);
    skybox.dispose();
  });

  it("updates field gradient params directly without replacing the live material", () => {
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "box" },
      nodes: [
        {
          blendMode: "normal",
          enabled: true,
          id: "field",
          name: "Field Gradient",
          opacity: 100,
          params: {
            amplitude: 0.1,
            anchors: [{ color: "#ff0000", x: 0.5, y: 0.5 }],
            frequency: 1,
            mode: "inverse-distance",
            power: 2,
          },
          type: "field-gradient",
        },
      ],
      version: 2,
    };
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest(manifest)
      .load();
    const material = skybox.material as THREE.ShaderMaterial;

    skybox.updateFieldGradientLayer("field", {
      amplitude: 0.3,
      anchors: [{ color: "#00ff00", x: 0.5, y: 0.5 }],
      frequency: 2,
      mode: "gaussian",
      power: 4,
    });

    expect(skybox.material).toBe(material);
    expect(material.uniforms.fieldGradientLayer0Amplitude.value).toBeCloseTo(0.3);
    expect(material.uniforms.fieldGradientLayer0Frequency.value).toBeCloseTo(2);
    expect(material.uniforms.fieldGradientLayer0Mode.value).toBe(1);
    expect(material.uniforms.fieldGradientLayer0Power.value).toBeCloseTo(4);
    skybox.dispose();
  });

  it("updates spot params directly without replacing the live material", () => {
    const spot = createDefaultSpotParams();
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
          params: spot,
          type: "spot",
        },
      ],
      version: 2,
    };
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest(manifest)
      .load();
    const material = skybox.material as THREE.ShaderMaterial;

    skybox.updateSpotLayer("spot", {
      ...spot,
      brightness: 2.5,
      glareStrength: 0.75,
      haloStrength: 0.45,
    });

    expect(skybox.material).toBe(material);
    expect(material.uniforms.spotLayer0Brightness.value).toBeCloseTo(2.5);
    expect(material.uniforms.spotLayer0GlareStrength.value).toBeCloseTo(0.75);
    expect(material.uniforms.spotLayer0HaloStrength.value).toBeCloseTo(0.45);
    skybox.dispose();
  });

  it("updates WebGPU image textures directly without replacing the live material", () => {
    const skybox = new Skybox()
      .setRenderer({ isWebGPURenderer: true })
      .fromManifest(createImageManifest())
      .load();
    const material = skybox.material;
    const texture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1,
      1,
      THREE.RGBAFormat
    );

    texture.needsUpdate = true;

    expect(material.userData.applyImageTextures).toBeTypeOf("function");

    skybox.setImageTexture("image", texture);

    expect(skybox.material).toBe(material);
    texture.dispose();
    skybox.dispose();
  });

  it("keeps WebGPU image texture slots distinct when images start unloaded", () => {
    const imageA = createImageManifest().nodes[0] as Extract<
      SkyboxManifestV2["nodes"][number],
      { type: "image" }
    >;
    const imageB: typeof imageA = {
      ...imageA,
      id: "image-b",
      name: "Image B",
      params: {
        ...imageA.params,
        src: "data:image/png;base64,b",
      },
    };
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "box" },
      nodes: [
        {
          ...imageA,
          params: {
            ...imageA.params,
            src: "data:image/png;base64,a",
          },
        },
        imageB,
      ],
      version: 2,
    };
    const skybox = new Skybox()
      .setRenderer({ isWebGPURenderer: true })
      .fromManifest(manifest)
      .load();
    const material = skybox.material;
    const textureA = new THREE.DataTexture(
      new Uint8Array([255, 0, 0, 255]),
      1,
      1,
      THREE.RGBAFormat
    );
    const textureB = new THREE.DataTexture(
      new Uint8Array([0, 255, 0, 255]),
      1,
      1,
      THREE.RGBAFormat
    );

    textureA.needsUpdate = true;
    textureB.needsUpdate = true;

    expect(material.userData.applyImageTextures).toBeTypeOf("function");
    expect(material.userData.debugImageTextureSlots?.image).not.toBe(
      material.userData.debugImageTextureSlots?.["image-b"]
    );
    expect(material.userData.debugImageTextureSlots?.image.getUniformHash()).not.toBe(
      material.userData.debugImageTextureSlots?.["image-b"].getUniformHash()
    );

    skybox.setImageTexture("image-b", textureB);
    skybox.setImageTexture("image", textureA);

    expect(skybox.material).toBe(material);
    expect(material.userData.debugImageTextureSlots?.image.value).toBe(textureA);
    expect(material.userData.debugImageTextureSlots?.["image-b"].value).toBe(textureB);
    textureA.dispose();
    textureB.dispose();
    skybox.dispose();
  });

  it("builds WebGPU live materials through layer adapter runtimes", () => {
    const image = createImageManifest().nodes[0] as Extract<
      SkyboxManifestV2["nodes"][number],
      { type: "image" }
    >;
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
        {
          blendMode: "normal",
          enabled: true,
          id: "field",
          name: "Field",
          opacity: 100,
          params: {
            amplitude: 0.1,
            anchors: [
              { color: "#ff0000", x: 0.25, y: 0.25 },
              { color: "#0000ff", x: 0.75, y: 0.75 },
            ],
            frequency: 1,
            mode: "inverse-distance",
            power: 2,
          },
          type: "field-gradient",
        },
        image,
        {
          blendMode: "normal",
          enabled: true,
          id: "spot",
          name: "Spot",
          opacity: 100,
          params: createDefaultSpotParams(),
          type: "spot",
        },
      ],
      version: 2,
    };
    const skybox = new Skybox()
      .setRenderer({ isWebGPURenderer: true })
      .fromManifest(manifest)
      .load();
    const runtime = skybox.material.userData.webGpuLayerRuntime;

    expect(runtime).toBeTruthy();
    expect(runtime.adapters.get("gradient")?.bindings).toHaveLength(1);
    expect(runtime.adapters.get("field-gradient")?.bindings).toHaveLength(1);
    expect(runtime.adapters.get("image")?.bindings).toHaveLength(1);
    expect(runtime.adapters.get("spot")?.bindings).toHaveLength(1);
    expect(skybox.material.userData.applyLayerParams).toBeTypeOf("function");
    expect(runtime.sampleParameters.gradientLayer0Axis).toBeTruthy();
    expect(runtime.sampleParameters.fieldGradientLayer0Amplitude).toBeTruthy();
    expect(runtime.sampleParameters.imageLayer0).toBeTruthy();
    expect(runtime.sampleParameters.spotLayer0Radius).toBeTruthy();
    skybox.dispose();
  });

  it("refreshes WebGPU image texture bindings after concrete textures load", () => {
    const imageA = createImageManifest().nodes[0] as Extract<
      SkyboxManifestV2["nodes"][number],
      { type: "image" }
    >;
    const imageB: typeof imageA = {
      ...imageA,
      id: "image-b",
      name: "Image B",
      params: {
        ...imageA.params,
        src: "data:image/png;base64,b",
      },
    };
    const manifest: SkyboxManifestV2 = {
      composition: { mode: "alpha-over", order: "bottom-to-top" },
      geometry: { type: "box" },
      nodes: [
        {
          ...imageA,
          params: {
            ...imageA.params,
            src: "data:image/png;base64,a",
          },
        },
        imageB,
      ],
      version: 2,
    };
    const skybox = new Skybox()
      .setRenderer({ isWebGPURenderer: true })
      .fromManifest(manifest)
      .load();
    const initialMaterial = skybox.material;
    const textureA = new THREE.DataTexture(
      new Uint8Array(8 * 4 * 4).fill(255),
      8,
      4,
      THREE.RGBAFormat
    );
    const textureB = new THREE.DataTexture(
      new Uint8Array(4 * 8 * 4).fill(128),
      4,
      8,
      THREE.RGBAFormat
    );

    textureA.needsUpdate = true;
    textureB.needsUpdate = true;

    skybox.setImageTexture("image", textureA);
    skybox.setImageTexture("image-b", textureB);
    skybox.refreshImageTextureBindings();

    expect(skybox.material).not.toBe(initialMaterial);
    expect(skybox.material.userData.debugImageTextureSlots?.image.value).toBe(textureA);
    expect(skybox.material.userData.debugImageTextureSlots?.["image-b"].value).toBe(textureB);
    expect(skybox.material.userData.debugImageTextureSlots?.image).not.toBe(
      skybox.material.userData.debugImageTextureSlots?.["image-b"]
    );
    textureA.dispose();
    textureB.dispose();
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
      .fromManifest({
        ...createImageManifest(),
        nodes: [...createImageManifest().nodes, ...createSpotManifest().nodes],
      })
      .load();
    const material = skybox.material as THREE.ShaderMaterial;

    expect(material.fragmentShader).not.toContain("imageActive0");
    expect(material.fragmentShader).not.toContain("spotActive0");
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
    expect(material.fragmentShader).not.toContain("spotActive0");
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

  it("includes editor spot presentation shader code only when enabled", () => {
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest(createSpotManifest())
      .setEditorPresentationEnabled(true)
      .load();
    const material = skybox.material as THREE.ShaderMaterial;

    expect(material.fragmentShader).toContain("spotActive0");
    expect(material.fragmentShader).toContain("spotEditorUv");
    expect(material.fragmentShader).toContain("rectCoverage");

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

  it("updates editor layer state for spots without rebuilding the material", () => {
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest(createSpotManifest())
      .setEditorPresentationEnabled(true)
      .load();
    const material = skybox.material as THREE.ShaderMaterial;

    skybox.setEditorLayerState({
      selectedLayerId: "spot",
    });

    expect(skybox.material).toBe(material);
    expect(material.uniforms.spotActive0.value).toBe(1);

    skybox.dispose();
  });
});
