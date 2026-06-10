import { describe, expect, it, vi } from "vitest";
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
  srgbChannelToLinear,
  spotFromRadiusScale,
  type SkyboxManifestV1,
  type SkyboxManifestV2,
} from "../index";
import {
  bakeStarfieldImageData,
  createStarCatalogForCoverage,
  createStarCatalogForDescriptor,
  createStarfieldBakeCacheKey,
  createStarfieldGlints,
  createStarfieldPatchLayout,
  DEFAULT_STARFIELD_CLIP,
  DEFAULT_STARFIELD_PARAMS,
  getStarfieldQualityPreset,
  normalizeStarfieldCoverage,
  normalizeStarfieldParams,
  sourceDirectionFromUv,
  sourceUvFromDirection,
  starfieldFieldGradientToSourceField,
  starfieldClipContainsDirection,
  starfieldGlintGeometryKey,
  sampleStarfieldLayer,
  sourceFoldEquirectUv,
  STARFIELD_PREVIEW_BAKE_WIDTH,
  StarfieldGpuBakeService,
} from "../starfield";
import {
  createStarfieldFinalPatchGeometryRanges,
  starfieldDisplayPixelAngleForHeight,
  starGlintScalesFor,
} from "../baking/starfield-gpu-bake";

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

  const createStarfieldManifest = (): SkyboxManifestV2 => ({
    composition: { mode: "alpha-over", order: "bottom-to-top" },
    geometry: { type: "box" },
    nodes: [
      {
        blendMode: "screen",
        enabled: true,
        id: "starfield",
        name: "Starfield",
        opacity: 100,
        params: DEFAULT_STARFIELD_PARAMS,
        type: "starfield",
      },
    ],
    version: 2,
  });

  const createFakeWebGpuBakeRenderer = (maxTextureSize = 64) => {
    let renderTarget: THREE.RenderTarget | null = null;
    let clearAlpha = 0;
    const clearColor = new THREE.Color(0);

    return {
      autoClear: true,
      backend: {
        device: {
          limits: {
            maxTextureDimension2D: maxTextureSize,
          },
        },
      },
      clear: vi.fn(),
      getClearAlpha: () => clearAlpha,
      getClearColor: (target: THREE.Color) => target.copy(clearColor),
      getRenderTarget: () => renderTarget,
      isWebGPURenderer: true,
      render: vi.fn(),
      setClearColor: (color: THREE.ColorRepresentation, alpha = 1) => {
        clearColor.set(color);
        clearAlpha = alpha;
      },
      setRenderTarget: (target: THREE.RenderTarget | null) => {
        renderTarget = target;
      },
    };
  };

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

  it("normalizes starfield clip params and samples transparent outside clip", () => {
    const params = normalizeStarfieldParams({
      clip: {
        altitudeCenterDeg: 0,
        altitudeSpanDeg: 10_000,
        azimuthCenterDeg: 500,
        azimuthSpanDeg: -20,
      },
    });

    expect(params.clip.altitudeSpanDeg).toBe(180);
    expect(params.clip.azimuthCenterDeg).toBe(500);
    expect(params.clip.azimuthSpanDeg).toBe(1);
    expect(starfieldClipContainsDirection([0, 0, -1], params.clip)).toBe(false);
  });

  it("uses source starfield equirect uv mapping and coverage layout", () => {
    const forward = sourceDirectionFromUv(0.5, 0.5);
    const up = sourceDirectionFromUv(0.5, 0);
    const roundTrip = sourceUvFromDirection(sourceDirectionFromUv(0.25, 0.65));
    const coverage = normalizeStarfieldCoverage({
      altitudeCenterDeg: 0,
      altitudeSpanDeg: 90,
      azimuthCenterDeg: 170,
      azimuthSpanDeg: 60,
    });
    const layout = createStarfieldPatchLayout({
      clip: coverage.config,
      height: 4096,
      width: 8192,
    });

    expect(forward[0]).toBeCloseTo(0);
    expect(forward[1]).toBeCloseTo(0);
    expect(forward[2]).toBeCloseTo(1);
    expect(up[1]).toBeCloseTo(1);
    expect(roundTrip.u).toBeCloseTo(0.25);
    expect(roundTrip.v).toBeCloseTo(0.65);
    expect(coverage.wrapsHorizontally).toBe(false);
    expect(coverage.uvSize.x).toBeCloseTo(60 / 360);
    expect(layout.descriptors.length).toBe(layout.columns * layout.rows);
    expect(layout.descriptors[0].storageUvSize.x).toBeGreaterThanOrEqual(layout.descriptors[0].uvSize.x);
    expect(layout.descriptors[0].innerScale.x).toBeGreaterThan(0);
  });

  it("converts starfield field gradient state to source field uniforms", () => {
    const sourceField = starfieldFieldGradientToSourceField({
      amplitude: 0.2,
      anchors: [
        { color: "#ff0000", x: 0.5, y: 0.5 },
        { color: "#0000ff", x: 0.25, y: 0.25 },
      ],
      frequency: 3,
      mode: "gaussian",
      power: 4,
    });

    expect(sourceField.blend).toBe("gaussian");
    expect(sourceField.power).toBe(4);
    expect(sourceField.sigma).toBeCloseTo(0.46 / 4);
    expect(sourceField.warp.amp).toBe(0.2);
    expect(sourceField.warp.freq).toBe(3);
    expect(sourceField.anchors[0].dir[2]).toBeCloseTo(1);
    expect(sourceField.anchors[0].color).toEqual([1, 0, 0]);
  });

  it("uses source catalog hashing and q row mapping deterministically", () => {
    const coverage = normalizeStarfieldCoverage(DEFAULT_STARFIELD_PARAMS.clip);
    const firstCatalog = createStarCatalogForCoverage(DEFAULT_STARFIELD_PARAMS.stars, coverage, 64);
    const secondCatalog = createStarCatalogForCoverage(DEFAULT_STARFIELD_PARAMS.stars, coverage, 64);
    const changedCatalog = createStarCatalogForCoverage(
      {
        ...DEFAULT_STARFIELD_PARAMS.stars,
        uSeed: DEFAULT_STARFIELD_PARAMS.stars.uSeed + 1,
      },
      coverage,
      64
    );

    expect(firstCatalog.length).toBeGreaterThan(0);
    expect(secondCatalog.slice(0, 10)).toEqual(firstCatalog.slice(0, 10));
    expect(changedCatalog.slice(0, 10)).not.toEqual(firstCatalog.slice(0, 10));
    expect(firstCatalog[0].v).toBeGreaterThanOrEqual(0);
    expect(firstCatalog[0].v).toBeLessThanOrEqual(1);
  });

  it("reuses cached source star catalogs for repeated bakes", () => {
    const coverage = normalizeStarfieldCoverage(DEFAULT_STARFIELD_PARAMS.clip);
    const firstStart = performance.now();
    const firstCatalog = createStarCatalogForCoverage(
      {
        ...DEFAULT_STARFIELD_PARAMS.stars,
        uSeed: DEFAULT_STARFIELD_PARAMS.stars.uSeed + 123,
      },
      coverage,
      128,
      { includeSeamCopies: false }
    );
    const firstDuration = performance.now() - firstStart;
    const secondStart = performance.now();
    const secondCatalog = createStarCatalogForCoverage(
      {
        ...DEFAULT_STARFIELD_PARAMS.stars,
        uSeed: DEFAULT_STARFIELD_PARAMS.stars.uSeed + 123,
      },
      coverage,
      128,
      { includeSeamCopies: false }
    );
    const secondDuration = performance.now() - secondStart;

    expect(secondCatalog).toEqual(firstCatalog);
    expect(secondCatalog).not.toBe(firstCatalog);
    expect(secondDuration).toBeLessThan(firstDuration);
  });

  it("bakes starfield deterministically and reacts to star params", () => {
    const nebulaOnlyParams = {
      ...DEFAULT_STARFIELD_PARAMS,
      stars: {
        ...DEFAULT_STARFIELD_PARAMS.stars,
        uDensity: 0,
      },
    };
    const firstBake = bakeStarfieldImageData(nebulaOnlyParams, 16, 8);
    const secondBake = bakeStarfieldImageData(nebulaOnlyParams, 16, 8);
    const changedParams = {
      ...nebulaOnlyParams,
      nebula: {
        ...nebulaOnlyParams.nebula,
        uSeed: nebulaOnlyParams.nebula.uSeed + 1,
      },
    };

    expect(Array.from(secondBake.data)).toEqual(Array.from(firstBake.data));
    expect(createStarfieldBakeCacheKey(changedParams, 16, 8)).not.toBe(
      createStarfieldBakeCacheKey(nebulaOnlyParams, 16, 8)
    );
  });

  it("normalizes legacy starfield params to medium quality", () => {
    expect(normalizeStarfieldParams({}).quality).toBe("medium");
    expect(normalizeStarfieldParams({ ...DEFAULT_STARFIELD_PARAMS, quality: "high" }).quality).toBe("high");
    expect(normalizeStarfieldParams({ ...DEFAULT_STARFIELD_PARAMS, quality: "invalid" as never }).quality).toBe("medium");
  });

  it("includes starfield quality budget and layout metadata in bake cache keys", () => {
    const mediumParams = normalizeStarfieldParams({
      ...DEFAULT_STARFIELD_PARAMS,
      quality: "medium",
    });
    const highParams = normalizeStarfieldParams({
      ...DEFAULT_STARFIELD_PARAMS,
      quality: "high",
    });

    expect(createStarfieldBakeCacheKey(mediumParams, 64, 32)).not.toBe(
      createStarfieldBakeCacheKey(highParams, 64, 32)
    );
    expect(createStarfieldBakeCacheKey(highParams, 64, 32, { budgetBytes: 512 * 1024 * 1024 })).not.toBe(
      createStarfieldBakeCacheKey(highParams, 64, 32, { budgetBytes: 2048 * 1024 * 1024 })
    );
  });

  it("maps starfield quality presets to memory budgets", () => {
    expect(getStarfieldQualityPreset("medium")).toEqual({
      budgetBytes: 512 * 1024 * 1024,
    });
    expect(getStarfieldQualityPreset("high")).toEqual({
      budgetBytes: 2048 * 1024 * 1024,
    });
  });

  it("uses memory budget for adaptive starfield layout and hardware clamp only for storage", () => {
    const medium = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("medium").budgetBytes,
      height: 8192,
      maxTextureSize: 4096,
      width: 16384,
    });
    const high = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("high").budgetBytes,
      height: 8192,
      maxTextureSize: 4096,
      width: 16384,
    });
    const clampedHigh = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("high").budgetBytes,
      height: 8192,
      maxTextureSize: 1024,
      width: 16384,
    });

    expect(medium.allocation?.budgetBytes).toBe(512 * 1024 * 1024);
    expect(high.allocation?.budgetBytes).toBe(2048 * 1024 * 1024);
    expect(high.qualityScale).toBeGreaterThanOrEqual(medium.qualityScale);
    expect(high.effectiveVirtualWidth).toBeGreaterThanOrEqual(medium.effectiveVirtualWidth);
    expect(high.effectiveVirtualHeight).toBeGreaterThanOrEqual(medium.effectiveVirtualHeight);
    expect(clampedHigh.storageWidth).toBeLessThanOrEqual(1024);
    expect(clampedHigh.storageHeight).toBeLessThanOrEqual(1024);
    expect(getStarfieldQualityPreset("high").budgetBytes).toBe(2048 * 1024 * 1024);
  });

  it("adds source-equivalent descriptor wrap and neighbor metadata", () => {
    const fullSingle = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("medium").budgetBytes,
      clip: DEFAULT_STARFIELD_CLIP,
      height: 32,
      maxTextureSize: 4096,
      width: 64,
    });
    const fullMulti = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("medium").budgetBytes,
      clip: DEFAULT_STARFIELD_CLIP,
      height: 4096,
      maxTextureSize: 4096,
      width: 8192,
    });
    const topLeft = fullMulti.descriptors[0];
    const topRight = fullMulti.descriptors[fullMulti.columns - 1];

    expect(fullSingle.columns).toBe(1);
    expect(fullSingle.descriptors[0].hasLeftNeighbor).toBe(true);
    expect(fullSingle.descriptors[0].hasRightNeighbor).toBe(true);
    expect(fullSingle.descriptors[0].wrapS).toBe("repeat");
    expect(fullSingle.descriptors[0].wrapT).toBe("clamp");
    expect(fullMulti.columns).toBeGreaterThan(1);
    expect(topLeft.hasLeftNeighbor).toBe(true);
    expect(topLeft.hasTopNeighbor).toBe(false);
    expect(topLeft.wrapS).toBe("clamp");
    expect(topRight.hasRightNeighbor).toBe(true);
  });

  it("uses source descriptor geometry ranges for final equirect patch draws", () => {
    const upperLayout = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("medium").budgetBytes,
      clip: { azimuthCenterDeg: 0, altitudeCenterDeg: 45, azimuthSpanDeg: 360, altitudeSpanDeg: 90 },
      height: 4096,
      maxTextureSize: 4096,
      width: 8192,
    });
    const bottomLayout = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("medium").budgetBytes,
      clip: { azimuthCenterDeg: 0, altitudeCenterDeg: -45, azimuthSpanDeg: 360, altitudeSpanDeg: 90 },
      height: 4096,
      maxTextureSize: 4096,
      width: 8192,
    });
    const upperDescriptor = upperLayout.descriptors[0];
    const bottomDescriptor = bottomLayout.descriptors[bottomLayout.descriptors.length - 1];
    const upperRanges = createStarfieldFinalPatchGeometryRanges(upperDescriptor);
    const bottomRanges = createStarfieldFinalPatchGeometryRanges(bottomDescriptor);
    const upperTotalWidth = upperRanges.reduce((sum, range) => sum + range.end - range.start, 0);
    const bottomTotalWidth = bottomRanges.reduce((sum, range) => sum + range.end - range.start, 0);

    expect(upperDescriptor.storageUvMin.y).toBeLessThan(upperDescriptor.uvMin.y);
    expect(upperRanges[0].skyV0).toBe(0);
    expect(upperRanges[0].skyV1).toBeCloseTo(
      upperDescriptor.hasBottomNeighbor
        ? upperDescriptor.storageUvMin.y + upperDescriptor.storageUvSize.y
        : upperDescriptor.uvMin.y + upperDescriptor.uvSize.y
    );
    expect(upperTotalWidth).toBeCloseTo(
      upperDescriptor.hasLeftNeighbor || upperDescriptor.hasRightNeighbor
        ? upperDescriptor.storageUvSize.x
        : upperDescriptor.uvSize.x
    );
    expect(bottomDescriptor.storageUvMin.y + bottomDescriptor.storageUvSize.y).toBeGreaterThan(
      bottomDescriptor.uvMin.y + bottomDescriptor.uvSize.y
    );
    expect(bottomRanges[0].skyV0).toBeCloseTo(
      bottomDescriptor.hasTopNeighbor
        ? bottomDescriptor.storageUvMin.y
        : bottomDescriptor.uvMin.y
    );
    expect(bottomRanges[0].skyV1).toBe(1);
    expect(bottomTotalWidth).toBeCloseTo(
      bottomDescriptor.hasLeftNeighbor || bottomDescriptor.hasRightNeighbor
        ? bottomDescriptor.storageUvSize.x
        : bottomDescriptor.uvSize.x
    );
  });

  it("keeps all starfield clipping preset layouts finite and drawable", () => {
    const presets = [
      { azimuthCenterDeg: 0, altitudeCenterDeg: 0, azimuthSpanDeg: 360, altitudeSpanDeg: 180 },
      { azimuthCenterDeg: 0, altitudeCenterDeg: 45, azimuthSpanDeg: 360, altitudeSpanDeg: 90 },
      { azimuthCenterDeg: 0, altitudeCenterDeg: -45, azimuthSpanDeg: 360, altitudeSpanDeg: 90 },
      { azimuthCenterDeg: 0, altitudeCenterDeg: 0, azimuthSpanDeg: 180, altitudeSpanDeg: 180 },
      { azimuthCenterDeg: 180, altitudeCenterDeg: 0, azimuthSpanDeg: 180, altitudeSpanDeg: 180 },
    ];

    presets.forEach((clip) => {
      const layout = createStarfieldPatchLayout({
        budgetBytes: getStarfieldQualityPreset("medium").budgetBytes,
        clip,
        height: 4096,
        maxTextureSize: 4096,
        width: 8192,
      });
      const totalRanges = layout.descriptors.flatMap((descriptor) =>
        createStarfieldFinalPatchGeometryRanges(descriptor)
      );

      expect(layout.descriptors.length).toBeGreaterThan(0);
      expect(totalRanges.length).toBeGreaterThanOrEqual(layout.descriptors.length);
      totalRanges.forEach((range) => {
        expect(range.start).toBeGreaterThanOrEqual(0);
        expect(range.end).toBeLessThanOrEqual(1);
        expect(range.end).toBeGreaterThan(range.start);
        expect(range.skyV0).toBeGreaterThanOrEqual(0);
        expect(range.skyV1).toBeLessThanOrEqual(1);
        expect(range.skyV1).toBeGreaterThan(range.skyV0);
      });
    });
  });

  it("queries upper-half pole descriptors from raw storage UVs", () => {
    const layout = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("medium").budgetBytes,
      clip: { azimuthCenterDeg: 0, altitudeCenterDeg: 45, azimuthSpanDeg: 360, altitudeSpanDeg: 90 },
      height: 4096,
      maxTextureSize: 4096,
      width: 8192,
    });
    const descriptor = layout.descriptors[0];
    const reconstructedCoverage = normalizeStarfieldCoverage({
      altitudeCenterDeg: 90 - (descriptor.storageUvMin.y + descriptor.storageUvSize.y * 0.5) * 180,
      altitudeSpanDeg: descriptor.storageUvSize.y * 180,
      azimuthCenterDeg: (descriptor.storageUvMin.x + descriptor.storageUvSize.x * 0.5 - 0.5) * 360,
      azimuthSpanDeg: Math.min(360, descriptor.storageUvSize.x * 360),
    });
    const descriptorCatalog = createStarCatalogForDescriptor(
      DEFAULT_STARFIELD_PARAMS.stars,
      descriptor,
      4096,
      { includeSeamCopies: true }
    );
    const reconstructedCatalog = createStarCatalogForCoverage(
      DEFAULT_STARFIELD_PARAMS.stars,
      reconstructedCoverage,
      4096,
      { includeSeamCopies: true }
    );

    expect(descriptor.storageUvMin.y).toBeLessThan(0);
    expect(descriptorCatalog.length).toBeGreaterThan(reconstructedCatalog.length);
    expect(descriptorCatalog.some((star) => star.u < descriptor.storageUvMin.x)).toBe(true);
  });

  it("queries bottom-half pole descriptors from raw storage UVs", () => {
    const layout = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("medium").budgetBytes,
      clip: { azimuthCenterDeg: 0, altitudeCenterDeg: -45, azimuthSpanDeg: 360, altitudeSpanDeg: 90 },
      height: 4096,
      maxTextureSize: 4096,
      width: 8192,
    });
    const descriptor = layout.descriptors[layout.descriptors.length - 1];
    const reconstructedCoverage = normalizeStarfieldCoverage({
      altitudeCenterDeg: 90 - (descriptor.storageUvMin.y + descriptor.storageUvSize.y * 0.5) * 180,
      altitudeSpanDeg: descriptor.storageUvSize.y * 180,
      azimuthCenterDeg: (descriptor.storageUvMin.x + descriptor.storageUvSize.x * 0.5 - 0.5) * 360,
      azimuthSpanDeg: Math.min(360, descriptor.storageUvSize.x * 360),
    });
    const descriptorCatalog = createStarCatalogForDescriptor(
      DEFAULT_STARFIELD_PARAMS.stars,
      descriptor,
      4096,
      { includeSeamCopies: true }
    );
    const reconstructedCatalog = createStarCatalogForCoverage(
      DEFAULT_STARFIELD_PARAMS.stars,
      reconstructedCoverage,
      4096,
      { includeSeamCopies: true }
    );

    expect(descriptor.storageUvMin.y + descriptor.storageUvSize.y).toBeGreaterThan(1);
    expect(descriptorCatalog.length).toBeGreaterThan(reconstructedCatalog.length);
    expect(descriptorCatalog.some((star) => star.u > descriptor.storageUvMin.x + descriptor.storageUvSize.x)).toBe(true);
  });

  it("makes medium and high starfield editor preview layouts resolve differently", () => {
    const medium = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("medium").budgetBytes,
      height: STARFIELD_PREVIEW_BAKE_WIDTH / 2,
      maxTextureSize: STARFIELD_PREVIEW_BAKE_WIDTH,
      width: STARFIELD_PREVIEW_BAKE_WIDTH,
    });
    const high = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("high").budgetBytes,
      height: STARFIELD_PREVIEW_BAKE_WIDTH / 2,
      maxTextureSize: STARFIELD_PREVIEW_BAKE_WIDTH,
      width: STARFIELD_PREVIEW_BAKE_WIDTH,
    });

    expect(high.contentWidth).toBeGreaterThan(medium.contentWidth);
    expect(high.contentHeight).toBeGreaterThan(medium.contentHeight);
    expect(high.allocation?.peakBytes).toBeGreaterThan(medium.allocation?.peakBytes ?? 0);
  });

  it("keeps starfield quality cache keys distinct when hardware clamps target texture size", () => {
    const service = new StarfieldGpuBakeService(createFakeWebGpuBakeRenderer(4096) as never);
    const mediumKey = service.createBakeKey({
      ...DEFAULT_STARFIELD_PARAMS,
      quality: "medium",
    });
    const highKey = service.createBakeKey({
      ...DEFAULT_STARFIELD_PARAMS,
      quality: "high",
    });

    try {
      expect(mediumKey).not.toBe(highKey);
    } finally {
      service.dispose();
    }
  });

  it("keeps starfield display pixel angle stable across quality budgets", () => {
    const outputHeight = STARFIELD_PREVIEW_BAKE_WIDTH / 2;
    const medium = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("medium").budgetBytes,
      height: outputHeight,
      maxTextureSize: STARFIELD_PREVIEW_BAKE_WIDTH,
      width: STARFIELD_PREVIEW_BAKE_WIDTH,
    });
    const high = createStarfieldPatchLayout({
      budgetBytes: getStarfieldQualityPreset("high").budgetBytes,
      height: outputHeight,
      maxTextureSize: STARFIELD_PREVIEW_BAKE_WIDTH,
      width: STARFIELD_PREVIEW_BAKE_WIDTH,
    });

    const displayPixelAngle = starfieldDisplayPixelAngleForHeight(outputHeight);
    const mediumBakeTexelAngle =
      Math.PI * medium.descriptors[0].storageUvSize.y / (medium.storageHeight * medium.supersample);
    const highBakeTexelAngle =
      Math.PI * high.descriptors[0].storageUvSize.y / (high.storageHeight * high.supersample);

    expect(displayPixelAngle).toBeCloseTo(Math.PI / outputHeight);
    expect(Math.abs(mediumBakeTexelAngle - highBakeTexelAngle)).toBeGreaterThan(0.00001);
    expect(high.storageHeight).toBeGreaterThan(medium.storageHeight);
    expect(high.storageWidth).toBeGreaterThan(medium.storageWidth);
  });

  it("sizes stars by viewport pixel angle when a glint viewport is given", () => {
    const outputHeight = STARFIELD_PREVIEW_BAKE_WIDTH / 2;
    const viewport = { renderHeight: 1080, verticalFovRadians: Math.PI / 3 };
    const withViewport = starGlintScalesFor(viewport, outputHeight);

    // displayPixelAngle is the exact center pixel-angle of a perspective projection,
    // 2·tan(vFov/2)/renderHeight (not the small-angle vFov/renderHeight). On-screen center radius
    // then equals uStarSize·scale, so the AA-threshold scale (screenPixelScale) is exactly 1.
    expect(withViewport.displayPixelAngle).toBeCloseTo(
      (2 * Math.tan(viewport.verticalFovRadians / 2)) / viewport.renderHeight
    );
    expect(withViewport.screenPixelScale).toBe(1);
  });

  it("falls back to the fixed-angular star size when no viewport is given", () => {
    const outputHeight = STARFIELD_PREVIEW_BAKE_WIDTH / 2;
    const fallback = starGlintScalesFor(null, outputHeight);

    expect(fallback.displayPixelAngle).toBeCloseTo(Math.PI / (STARFIELD_PREVIEW_BAKE_WIDTH / 2));
    expect(fallback.screenPixelScale).toBeCloseTo(outputHeight / (STARFIELD_PREVIEW_BAKE_WIDTH / 2));
  });

  it("changes the starfield bake cache key when the glint viewport changes", () => {
    const service = new StarfieldGpuBakeService(createFakeWebGpuBakeRenderer(4096) as never);

    try {
      const noViewport = service.createBakeKey(DEFAULT_STARFIELD_PARAMS);
      const fov50 = service.createBakeKey(DEFAULT_STARFIELD_PARAMS, undefined, {
        renderHeight: 1080,
        verticalFovRadians: (50 * Math.PI) / 180,
      });
      const fov90 = service.createBakeKey(DEFAULT_STARFIELD_PARAMS, undefined, {
        renderHeight: 1080,
        verticalFovRadians: (90 * Math.PI) / 180,
      });
      const fov50TallerViewer = service.createBakeKey(DEFAULT_STARFIELD_PARAMS, undefined, {
        renderHeight: 1440,
        verticalFovRadians: (50 * Math.PI) / 180,
      });

      expect(fov50).not.toBe(noViewport);
      expect(fov50).not.toBe(fov90);
      expect(fov50).not.toBe(fov50TallerViewer);
    } finally {
      service.dispose();
    }
  });

  it("builds screen-space glint geometry from the clip-filtered full-sphere catalog", () => {
    const params = DEFAULT_STARFIELD_PARAMS;
    const coverage = normalizeStarfieldCoverage(params.clip);
    const catalog = createStarCatalogForCoverage(
      params.stars,
      coverage,
      STARFIELD_PREVIEW_BAKE_WIDTH / 2,
      { includeSeamCopies: false }
    );
    const expectedCount = catalog.filter((star) =>
      starfieldClipContainsDirection([star.x, star.y, star.z], params.clip)
    ).length;
    const glints = createStarfieldGlints(params);

    try {
      const mesh = glints.object as THREE.Mesh;
      const geometry = mesh.geometry as THREE.InstancedBufferGeometry;

      // One instanced quad per (clip-passing) star — no equirect seam duplicates in screen space.
      expect(expectedCount).toBeGreaterThan(0);
      expect(geometry.instanceCount).toBe(expectedCount);
      expect(geometry.getAttribute("iDirection").count).toBe(expectedCount);
      // Glints draw over the composited sky.
      expect(mesh.renderOrder).toBeGreaterThan(0);
      // Live updates must not throw (viewport + appearance uniforms apply in place).
      expect(() =>
        glints.setViewport({ renderHeight: 1080, verticalFovRadians: Math.PI / 3 })
      ).not.toThrow();
      expect(() =>
        glints.setParams({ ...params, stars: { ...params.stars, uStarSize: 4, uBright: 5 } })
      ).not.toThrow();
    } finally {
      glints.dispose();
    }
  });

  it("keys glint geometry on the distribution only (appearance is a uniform update)", () => {
    const baseKey = starfieldGlintGeometryKey(DEFAULT_STARFIELD_PARAMS);

    // Size/brightness/glare/color are uniforms — the same stars exist, so no geometry rebuild.
    expect(
      starfieldGlintGeometryKey({
        ...DEFAULT_STARFIELD_PARAMS,
        stars: { ...DEFAULT_STARFIELD_PARAMS.stars, uStarSize: 4, uBright: 5, uGlareSize: 3, uColorVar: 1 },
      })
    ).toBe(baseKey);

    // Seed / density / large-star rarity change which stars exist → geometry must rebuild.
    expect(
      starfieldGlintGeometryKey({
        ...DEFAULT_STARFIELD_PARAMS,
        stars: { ...DEFAULT_STARFIELD_PARAMS.stars, uSeed: DEFAULT_STARFIELD_PARAMS.stars.uSeed + 1 },
      })
    ).not.toBe(baseKey);
    expect(
      starfieldGlintGeometryKey({
        ...DEFAULT_STARFIELD_PARAMS,
        stars: { ...DEFAULT_STARFIELD_PARAMS.stars, uDensity: DEFAULT_STARFIELD_PARAMS.stars.uDensity + 50 },
      })
    ).not.toBe(baseKey);
  });

  it("folds starfield equirect UVs across pole guard regions like the source shader", () => {
    expect(sourceFoldEquirectUv(0.2, -0.25)).toEqual({
      u: 0.7,
      v: 0.25,
      x: 0.7,
      y: 0.25,
    });
    expect(sourceFoldEquirectUv(0.2, 1.25)).toEqual({
      u: 0.7,
      v: 0.75,
      x: 0.7,
      y: 0.75,
    });
    expect(sourceFoldEquirectUv(0.2, 0.25)).toEqual({
      u: 0.2,
      v: 0.25,
      x: 0.2,
      y: 0.25,
    });
  });

  it("bakes visible nebula without stars", () => {
    const nebulaOnlyParams = {
      ...DEFAULT_STARFIELD_PARAMS,
      stars: {
        ...DEFAULT_STARFIELD_PARAMS.stars,
        uDensity: 0,
      },
    };
    const bake = bakeStarfieldImageData(nebulaOnlyParams, 32, 16);
    let maxRgb = 0;
    let minRgb = 255;
    let averageRgb = 0;
    let litPixels = 0;

    for (let index = 0; index < bake.data.length; index += 4) {
      const pixelMax = Math.max(bake.data[index], bake.data[index + 1], bake.data[index + 2]);

      maxRgb = Math.max(maxRgb, pixelMax);
      minRgb = Math.min(minRgb, pixelMax);
      averageRgb += pixelMax;

      if (pixelMax > 0 && bake.data[index + 3] > 0) {
        litPixels += 1;
      }
    }

    averageRgb /= bake.width * bake.height;

    expect(maxRgb).toBeGreaterThan(0);
    expect(maxRgb).toBeGreaterThan(minRgb);
    expect(averageRgb).toBeLessThan(80);
    expect(litPixels).toBeGreaterThan(bake.width * bake.height * 0.5);
  });

  it("evaluates starfield layers through pre-baked texture data when available", () => {
    const width = 16;
    const height = 8;
    const params = {
      ...DEFAULT_STARFIELD_PARAMS,
      stars: {
        ...DEFAULT_STARFIELD_PARAMS.stars,
        uDensity: 0,
      },
    };
    const manifest: SkyboxManifestV2 = {
      ...createStarfieldManifest(),
      nodes: [
        {
          ...createStarfieldManifest().nodes[0],
          blendMode: "normal",
          params,
        } as Extract<SkyboxManifestV2["nodes"][number], { type: "starfield" }>,
      ],
    };
    const bake = bakeStarfieldImageData(params, width, height);
    const x = 7;
    const y = 4;
    const pixelIndex = (y * width + x) * 4;
    const color = evaluateSkyboxDirection(
      manifest,
      sourceDirectionFromUv((x + 0.5) / width, (y + 0.5) / height),
      { starfieldBakes: new Map([["starfield", bake]]) }
    );

    expect(color[0]).toBeCloseTo(srgbChannelToLinear(bake.data[pixelIndex] / 255), 4);
    expect(color[1]).toBeCloseTo(srgbChannelToLinear(bake.data[pixelIndex + 1] / 255), 4);
    expect(color[2]).toBeCloseTo(srgbChannelToLinear(bake.data[pixelIndex + 2] / 255), 4);
  });

  it("bakes horizontal wrapped clip coverage across the equirect seam", () => {
    const wrappedClipParams = {
      ...DEFAULT_STARFIELD_PARAMS,
      clip: {
        altitudeCenterDeg: 0,
        altitudeSpanDeg: 180,
        azimuthCenterDeg: 170,
        azimuthSpanDeg: 60,
      },
      stars: {
        ...DEFAULT_STARFIELD_PARAMS.stars,
        uDensity: 0,
      },
    };
    const bake = bakeStarfieldImageData(wrappedClipParams, 64, 32);
    const y = 16;
    const leftAlpha = bake.data[(y * bake.width) * 4 + 3];
    const centerAlpha = bake.data[(y * bake.width + Math.floor(bake.width * 0.5)) * 4 + 3];
    const rightAlpha = bake.data[(y * bake.width + bake.width - 1) * 4 + 3];

    expect(leftAlpha).toBe(255);
    expect(rightAlpha).toBe(255);
    expect(centerAlpha).toBe(0);
  });

  it("evaluates starfield stars through the CPU export sampler", () => {
    const starOnlyParams = {
      ...DEFAULT_STARFIELD_PARAMS,
      nebula: {
        ...DEFAULT_STARFIELD_PARAMS.nebula,
        uNebulaStrength: 0,
      },
      stars: {
        ...DEFAULT_STARFIELD_PARAMS.stars,
        uBright: 8,
        uDensity: 2000,
        uGlareSize: 8,
        uStarSize: 3,
      },
    };
    const catalog = createStarCatalogForCoverage(
      starOnlyParams.stars,
      normalizeStarfieldCoverage({
        altitudeCenterDeg: 0,
        altitudeSpanDeg: 4,
        azimuthCenterDeg: 0,
        azimuthSpanDeg: 4,
      }),
      64
    );
    const star = catalog[0];
    const color = sampleStarfieldLayer(
      [star.x, star.y, star.z],
      starOnlyParams,
      { sampleHeight: 64 }
    );

    expect(color[3]).toBe(1);
    expect(Math.max(color[0], color[1], color[2])).toBeGreaterThan(0.1);
  });

  it("keeps baked star brightness independent from nebula exposure", () => {
    const starOnlyParams = {
      ...DEFAULT_STARFIELD_PARAMS,
      nebula: {
        ...DEFAULT_STARFIELD_PARAMS.nebula,
        uNebulaExposure: 0.001,
        uNebulaStrength: 0,
        uOpacity: 0,
      },
      stars: {
        ...DEFAULT_STARFIELD_PARAMS.stars,
        uBright: 8,
        uDensity: 2000,
        uGlareSize: 8,
        uStarSize: 3,
      },
    };
    const catalog = createStarCatalogForCoverage(
      starOnlyParams.stars,
      normalizeStarfieldCoverage({
        altitudeCenterDeg: 0,
        altitudeSpanDeg: 4,
        azimuthCenterDeg: 0,
        azimuthSpanDeg: 4,
      }),
      64
    );
    const star = catalog[0];
    const lowExposureColor = sampleStarfieldLayer(
      [star.x, star.y, star.z],
      starOnlyParams,
      { sampleHeight: 64 }
    );

    expect(Math.max(lowExposureColor[0], lowExposureColor[1], lowExposureColor[2])).toBeGreaterThan(0.5);
  });

  it("evaluates starfield layers and respects clipping", () => {
    const manifest = createStarfieldManifest();
    const inside = evaluateSkyboxDirection(manifest, [1, 0, 0]);
    const clipped = evaluateSkyboxDirection(
      {
        ...manifest,
        nodes: [
          {
            ...manifest.nodes[0],
            params: {
              ...DEFAULT_STARFIELD_PARAMS,
              clip: {
                altitudeCenterDeg: 0,
                altitudeSpanDeg: 1,
                azimuthCenterDeg: 180,
                azimuthSpanDeg: 1,
              },
            },
          } as Extract<SkyboxManifestV2["nodes"][number], { type: "starfield" }>,
        ],
      },
      [1, 0, 0]
    );

    expect(inside[0] + inside[1] + inside[2]).toBeGreaterThan(0);
    expect(clipped[0]).toBeCloseTo(0);
    expect(clipped[1]).toBeCloseTo(0);
    expect(clipped[2]).toBeCloseTo(0);
  });

  it("uses normalized spot radius scale against base radius", () => {
    const spot = createDefaultSpotParams();
    const scaledSpot = spotFromRadiusScale(spot, 0.5);

    expect(scaledSpot.angularRadius).toBeCloseTo(spot.baseAngularRadius * 0.5);
    expect(scaledSpot.baseAngularRadius).toBeCloseTo(spot.baseAngularRadius);
  });

  it("keeps material stable when only starfield quality changes", () => {
    const skybox = new Skybox()
      .setRenderer({} as THREE.WebGLRenderer)
      .fromManifest(createStarfieldManifest())
      .load();
    const material = skybox.material;

    skybox.updateStarfieldLayer("starfield", {
      ...DEFAULT_STARFIELD_PARAMS,
      quality: "high",
    });

    expect(skybox.material).toBe(material);
    skybox.dispose();
  });

  it("promotes cached medium starfield texture after switching back from high", () => {
    vi.useFakeTimers();
    const renderer = createFakeWebGpuBakeRenderer(64);
    const mediumParams = normalizeStarfieldParams({
      ...DEFAULT_STARFIELD_PARAMS,
      clip: {
        altitudeCenterDeg: 0,
        altitudeSpanDeg: 2,
        azimuthCenterDeg: 0,
        azimuthSpanDeg: 2,
      },
      quality: "medium",
      stars: {
        ...DEFAULT_STARFIELD_PARAMS.stars,
        uDensity: 1,
      },
    });
    const highParams = normalizeStarfieldParams({
      ...mediumParams,
      quality: "high",
    });
    const manifest = {
      ...createStarfieldManifest(),
      nodes: [
        {
          ...createStarfieldManifest().nodes[0],
          params: mediumParams,
        } as Extract<SkyboxManifestV2["nodes"][number], { type: "starfield" }>,
      ],
    };
    const skybox = new Skybox()
      .setRenderer(renderer as never)
      .fromManifest(manifest)
      .load();
    const textureSlot = () =>
      (skybox.material.userData.debugImageTextureSlots as Record<string, { value?: THREE.Texture }>).starfield
        ?.value;

    try {
      vi.advanceTimersByTime(200);
      const mediumTexture = textureSlot();

      skybox.updateStarfieldLayer("starfield", highParams);
      vi.advanceTimersByTime(200);
      const highTexture = textureSlot();

      skybox.updateStarfieldLayer("starfield", mediumParams);
      vi.advanceTimersByTime(200);
      const restoredMediumTexture = textureSlot();

      expect(mediumTexture).toBeTruthy();
      expect(highTexture).toBeTruthy();
      expect(restoredMediumTexture).toBe(mediumTexture);
      expect(highTexture).not.toBe(mediumTexture);
    } finally {
      skybox.dispose();
      vi.useRealTimers();
    }
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
        {
          blendMode: "screen",
          enabled: true,
          id: "starfield",
          name: "Starfield",
          opacity: 100,
          params: DEFAULT_STARFIELD_PARAMS,
          type: "starfield",
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
    expect(runtime.adapters.get("starfield")?.bindings).toHaveLength(1);
    expect(skybox.material.userData.applyLayerParams).toBeTypeOf("function");
    expect(runtime.sampleParameters.gradientLayer0Axis).toBeTruthy();
    expect(runtime.sampleParameters.fieldGradientLayer0Amplitude).toBeTruthy();
    expect(runtime.sampleParameters.imageLayer0).toBeTruthy();
    expect(runtime.sampleParameters.spotLayer0Radius).toBeTruthy();
    expect(runtime.sampleParameters.starfieldLayer0).toBeTruthy();
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

});
