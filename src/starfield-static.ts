import {
  clamp,
  hashString,
  linearRgbToSrgbBytes,
  type Rgb,
  type Rgba,
} from "./math";
import type {
  SkyboxFieldGradientAnchor,
  SkyboxFieldGradientParams,
  SkyboxStarfieldClipParams,
  SkyboxStarfieldNebulaParams,
  SkyboxStarfieldParams,
  SkyboxStarfieldQuality,
  SkyboxStarfieldStarsParams,
} from "./manifest";

const TWO_PI = Math.PI * 2;
const MAX_ANCHORS = 8;
const STAR_CATALOG_BASE_DENSITY = 1000;
const STAR_QUERY_EDGE_PAD_CELLS = 2;
const PATCH_SIZE_ALIGNMENT = 128;
const PATCH_GUARD_TEXELS = 64;
const FINAL_TEXTURE_BYTES_PER_PIXEL = 4;
const HDR_TEXTURE_BYTES_PER_PIXEL = 8;
const STARFIELD_ACCUMULATION_BYTES_PER_PIXEL = HDR_TEXTURE_BYTES_PER_PIXEL;
const STARFIELD_RESIDENT_BYTES_PER_PIXEL =
  FINAL_TEXTURE_BYTES_PER_PIXEL + HDR_TEXTURE_BYTES_PER_PIXEL;
const STARFIELD_ALLOCATION_BUDGET_BYTES = 2048 * 1024 * 1024;
const STARFIELD_MEDIUM_ALLOCATION_BUDGET_BYTES = 512 * 1024 * 1024;
const STARFIELD_LOW_ALLOCATION_BUDGET_BYTES = 128 * 1024 * 1024;
const MAX_AUTO_SUPERSAMPLE = 8;
const MIN_CORE_PIXELS = 1.75;
const MIN_GLARE_PIXELS = 3.25;
const SUBPIXEL_DENSITY_THRESHOLD_PX = 1;
const AA_PIN_THRESHOLD_PX = 1.5;
const GAUSSIAN_CUTOFF_SIGMA = 8;
const REFERENCE_BAKE_HEIGHT = 2048;
const STAR_SIZE_RARITY_EXPONENT = 5;
const STAR_SIZE_GATE_EXPONENT = 12;
const STAR_SIZE_BRIGHTNESS_LINK = 0.35;
const STAR_SIZE_GLARE_LINK = 0.25;
const AUTO_PATCH_GRIDS = [1, 2, 4, 8, 16] as const;
const NEBULA_BAKE_MAX_WIDTH = 1024;

export const STARFIELD_PREVIEW_BAKE_WIDTH = 8192;
export const DEFAULT_STARFIELD_QUALITY: SkyboxStarfieldQuality = "medium";

export const STARFIELD_QUALITY_PRESETS: Record<
  SkyboxStarfieldQuality,
  { budgetBytes: number }
> = {
  high: {
    budgetBytes: STARFIELD_ALLOCATION_BUDGET_BYTES,
  },
  low: {
    budgetBytes: STARFIELD_LOW_ALLOCATION_BUDGET_BYTES,
  },
  medium: {
    budgetBytes: STARFIELD_MEDIUM_ALLOCATION_BUDGET_BYTES,
  },
};

export const DEFAULT_STARFIELD_STARS: SkyboxStarfieldStarsParams = {
  uBright: 2,
  uBrightVar: 0.85,
  uColorVar: 1,
  uDensity: 325,
  uGlareSize: 4.6,
  uGlareStr: 0.8,
  uGlareVar: 0.7,
  uLargeStarRarity: 0.97,
  uSeed: 1,
  uSizeVar: 0.7,
  uStarSize: 1.55,
};

export const DEFAULT_STARFIELD_NEBULA: SkyboxStarfieldNebulaParams = {
  uBaseScale: 10,
  uCloudCore: [0.025, 0.03, 0.07],
  uCloudHighlight: [0.3, 0.36, 0.72],
  uCloudShadow: [0.004, 0.006, 0.018],
  uColorWarpAmp: 0.045,
  uColorWarpFreq: 2.2,
  uContrast: 3,
  uCoverage: 0.15,
  uDensity: 2,
  uLightFocus: 1.55,
  uLightIntensity: 0.25,
  uLightLining: 1,
  uNebulaExposure: 0.1,
  uNebulaStrength: 7.4,
  uOctaves: 8,
  uOpacity: 0.21,
  uSeed: 2.4,
  uSoftness: 0.596,
};

const SOURCE_NEBULA_FIELD_ANCHORS = [
  { dir: [0.26, 0.18, 0.95] as Rgb, color: [0.14, 0.19, 0.46] as Rgb },
  { dir: [-0.72, 0.34, 0.6] as Rgb, color: [0.18, 0.08, 0.22] as Rgb },
  { dir: [0.62, -0.46, -0.64] as Rgb, color: [0.05, 0.12, 0.28] as Rgb },
  { dir: [-0.18, -0.82, -0.54] as Rgb, color: [0.13, 0.15, 0.2] as Rgb },
];

export const DEFAULT_STARFIELD_NEBULA_FIELD: SkyboxFieldGradientParams = {
  amplitude: 0.045,
  anchors: SOURCE_NEBULA_FIELD_ANCHORS.map((anchor) => ({
    color: rgbToHex(anchor.color),
    ...sourceUvFromDirection(anchor.dir),
  })),
  frequency: 2.2,
  mode: "inverse-distance",
  power: 2,
};

export const DEFAULT_STARFIELD_CLIP: SkyboxStarfieldClipParams = {
  altitudeCenterDeg: 0,
  altitudeSpanDeg: 180,
  azimuthCenterDeg: 0,
  azimuthSpanDeg: 360,
};

export const DEFAULT_STARFIELD_PARAMS: SkyboxStarfieldParams = {
  clip: DEFAULT_STARFIELD_CLIP,
  nebula: DEFAULT_STARFIELD_NEBULA,
  nebulaField: DEFAULT_STARFIELD_NEBULA_FIELD,
  quality: DEFAULT_STARFIELD_QUALITY,
  stars: DEFAULT_STARFIELD_STARS,
};

export type StarfieldBakeData = {
  data: Uint8ClampedArray<ArrayBuffer>;
  height: number;
  width: number;
};

export type StarfieldCoverage = {
  altitudeSpanRad: number;
  azimuthSpanRad: number;
  config: SkyboxStarfieldClipParams;
  fraction: number;
  uvMin: { x: number; y: number };
  uvSize: { x: number; y: number };
  wrapsHorizontally: boolean;
};

export type StarfieldPatchDescriptor = {
  hasBottomNeighbor: boolean;
  hasLeftNeighbor: boolean;
  hasRightNeighbor: boolean;
  hasTopNeighbor: boolean;
  id: string;
  innerOffset: { x: number; y: number };
  innerScale: { x: number; y: number };
  storageGuard: { x: number; y: number };
  storageSize: { height: number; width: number };
  storageUvMin: { x: number; y: number };
  storageUvSize: { x: number; y: number };
  uvMin: { x: number; y: number };
  uvSize: { x: number; y: number };
  wrapS: "clamp" | "repeat";
  wrapT: "clamp" | "repeat";
  x: number;
  y: number;
};

export type StarfieldPatchAllocation = {
  budgetBytes: number;
  budgetExceeded: boolean;
  peakBudgetRatio: number;
  peakBytes: number;
  residentBytes: number;
  scratchBytes: number;
};

export type StarfieldPatchDemand = {
  budgetBytes: number;
  budgetExceeded: boolean;
  effectiveVirtualHeight: number;
  effectiveVirtualWidth: number;
  idealVirtualHeight: number;
  idealVirtualWidth: number;
  peakBytes: number;
  qualityScale: number;
  residentBytes: number;
  scratchBytes: number;
};

export type StarfieldPatchLayout = {
  allocation: StarfieldPatchAllocation | null;
  autoLayout: boolean;
  autoLayoutDemand: StarfieldPatchDemand | null;
  autoLayoutReason: string;
  columns: number;
  contentHeight: number;
  contentWidth: number;
  coverage: SkyboxStarfieldClipParams;
  coverageFraction: number;
  coverageUvMin: { x: number; y: number };
  coverageUvSize: { x: number; y: number };
  demand: StarfieldPatchDemand | null;
  descriptors: StarfieldPatchDescriptor[];
  effectiveVirtualHeight: number;
  effectiveVirtualWidth: number;
  guard: number;
  idealPatchHeight: number;
  idealPatchWidth: number;
  idealVirtualHeight: number;
  idealVirtualWidth: number;
  patchCount: number;
  qualityScale: number;
  rows: number;
  storageHeight: number;
  storageWidth: number;
  supersample: number;
  targetTexelsPerPixel: number;
  virtualHeight: number;
  virtualWidth: number;
  wrapsHorizontally: boolean;
};

export type SourceNebulaAnchor = {
  color: Rgb;
  dir: Rgb;
};

export type SourceNebulaField = {
  anchors: SourceNebulaAnchor[];
  blend: "gaussian" | "idw";
  power: number;
  sigma: number;
  warp: {
    amp: number;
    freq: number;
  };
};

type CatalogStar = {
  classId: number;
  column: number;
  rBright: number;
  rColor: number;
  rGlare: number;
  rSize: number;
  rSizeGate: number;
  row: number;
  u: number;
  v: number;
  x: number;
  y: number;
  z: number;
};

const starCatalogCache = new Map<string, CatalogStar[]>();

function numberValue(value: unknown, fallback: number, min = -Infinity, max = Infinity) {
  return clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, min, max);
}

export function normalizeStarfieldQuality(value: unknown): SkyboxStarfieldQuality {
  if (value === "high") {
    return "high";
  }

  if (value === "low") {
    return "low";
  }

  return DEFAULT_STARFIELD_QUALITY;
}

export function getStarfieldQualityPreset(quality: unknown) {
  return STARFIELD_QUALITY_PRESETS[normalizeStarfieldQuality(quality)];
}

function colorValue(value: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return [
    numberValue(value[0], fallback[0], 0, 1),
    numberValue(value[1], fallback[1], 0, 1),
    numberValue(value[2], fallback[2], 0, 1),
  ];
}

function rgbToHex(color: Rgb) {
  return `#${color
    .map((channel) =>
      Math.round(clamp(channel) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}

function hexToRgb(color: string): Rgb {
  const value = color.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return [1, 1, 1];
  }

  return [0, 2, 4].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16) / 255
  ) as Rgb;
}

function normalizeVector(vector: Rgb): Rgb {
  const length = Math.hypot(vector[0], vector[1], vector[2]);

  if (length <= 0.00001) {
    return [0, 0, 1];
  }

  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function vectorValue(value: unknown, fallback: Rgb): Rgb {
  if (!Array.isArray(value)) {
    return normalizeVector(fallback);
  }

  return normalizeVector([
    numberValue(value[0], fallback[0]),
    numberValue(value[1], fallback[1]),
    numberValue(value[2], fallback[2]),
  ]);
}

export function sourceDirectionFromUv(u: number, v: number): Rgb {
  const theta = (u - 0.5) * TWO_PI;
  const phi = clamp(v, 0, 1) * Math.PI;
  const sinPhi = Math.sin(phi);

  return normalizeVector([
    sinPhi * Math.sin(theta),
    Math.cos(phi),
    sinPhi * Math.cos(theta),
  ]);
}

export function sourceFoldEquirectUv(u: number, v: number): { u: number; v: number; x: number; y: number } {
  const wrappedV = ((v % 2) + 2) % 2;
  const folded = wrappedV >= 1 ? 1 : 0;
  const foldedU = u + folded * 0.5;
  const foldedV = folded ? 2 - wrappedV : wrappedV;

  return { u: foldedU, v: foldedV, x: foldedU, y: foldedV };
}

export function sourceUvFromDirection(direction: Rgb) {
  const normalized = normalizeVector(direction);
  const theta = Math.atan2(normalized[0], normalized[2]);
  const u = ((theta / TWO_PI + 0.5) % 1 + 1) % 1;
  const v = Math.acos(clamp(normalized[1], -1, 1)) / Math.PI;

  return { u, v, x: u, y: v };
}

function normalizeStarfieldClip(raw: Partial<SkyboxStarfieldClipParams> = {}): SkyboxStarfieldClipParams {
  const azimuthCenterDeg = Number(raw.azimuthCenterDeg) || 0;
  const azimuthSpanDeg = numberValue(raw.azimuthSpanDeg, DEFAULT_STARFIELD_CLIP.azimuthSpanDeg, 1, 360);
  const altitudeSpanDeg = numberValue(raw.altitudeSpanDeg, DEFAULT_STARFIELD_CLIP.altitudeSpanDeg, 1, 180);
  const altitudeCenterLimit = Math.max(0, 90 - altitudeSpanDeg * 0.5);
  const altitudeCenterDeg = numberValue(
    raw.altitudeCenterDeg,
    DEFAULT_STARFIELD_CLIP.altitudeCenterDeg,
    -altitudeCenterLimit,
    altitudeCenterLimit
  );

  return {
    altitudeCenterDeg,
    altitudeSpanDeg,
    azimuthCenterDeg,
    azimuthSpanDeg,
  };
}

export function normalizeStarfieldCoverage(raw?: Partial<SkyboxStarfieldClipParams>): StarfieldCoverage {
  const config = normalizeStarfieldClip(raw);
  const altitudeMax = config.altitudeCenterDeg + config.altitudeSpanDeg * 0.5;
  const altitudeMin = config.altitudeCenterDeg - config.altitudeSpanDeg * 0.5;
  const wrapsHorizontally = config.azimuthSpanDeg >= 359.999;
  const uMin = wrapsHorizontally
    ? 0
    : 0.5 + (config.azimuthCenterDeg - config.azimuthSpanDeg * 0.5) / 360;
  const uSize = wrapsHorizontally ? 1 : config.azimuthSpanDeg / 360;
  const vMin = (90 - altitudeMax) / 180;
  const vSize = (altitudeMax - altitudeMin) / 180;

  return {
    altitudeSpanRad: vSize * Math.PI,
    azimuthSpanRad: uSize * TWO_PI,
    config,
    fraction: Math.max(0.0001, uSize * vSize),
    uvMin: { x: uMin, y: vMin },
    uvSize: { x: uSize, y: vSize },
    wrapsHorizontally,
  };
}

function alignTexels(value: number, alignment = PATCH_SIZE_ALIGNMENT) {
  return Math.max(alignment, Math.ceil(Math.max(1, value) / alignment) * alignment);
}

function clampContentSize(value: number, maxContentSize: number) {
  return Math.max(1, Math.min(maxContentSize, alignTexels(value)));
}

function estimateTextureBytes(width: number, height: number, bytesPerPixel: number) {
  return Math.max(0, Math.round(width) * Math.round(height) * bytesPerPixel);
}

type CandidateMemoryArgs = {
  accumulationBytes: number;
  patchCount: number;
  residentBytesPerPixel?: number;
  storageHeight: number;
  storageWidth: number;
  supersample: number;
};

type SupersampleChoice = {
  peakBudgetRatio: number;
  peakBytes: number;
  residentBytes: number;
  scratchBytes: number;
  supersample: number;
};

type MemoryBoundCandidate = {
  allocation: SupersampleChoice;
  contentHeight: number;
  contentWidth: number;
  coverage: StarfieldCoverage;
  grid: number;
  guard: number;
  idealPatchHeight: number;
  idealPatchWidth: number;
  patchCount: number;
  scale: number;
  storageHeight: number;
  storageWidth: number;
};

function candidateMemory({
  accumulationBytes,
  patchCount,
  residentBytesPerPixel = FINAL_TEXTURE_BYTES_PER_PIXEL,
  storageHeight,
  storageWidth,
  supersample,
}: CandidateMemoryArgs): Omit<SupersampleChoice, "peakBudgetRatio" | "supersample"> {
  const residentBytes =
    estimateTextureBytes(storageWidth, storageHeight, residentBytesPerPixel) * patchCount;
  const scratchBytes = estimateTextureBytes(
    storageWidth * supersample,
    storageHeight * supersample,
    accumulationBytes
  );

  return {
    peakBytes: residentBytes + scratchBytes,
    residentBytes,
    scratchBytes,
  };
}

function chooseSupersample({
  accumulationBytes,
  budgetBytes,
  maxTextureSize,
  patchCount,
  residentBytesPerPixel = FINAL_TEXTURE_BYTES_PER_PIXEL,
  storageHeight,
  storageWidth,
}: Omit<CandidateMemoryArgs, "supersample"> & {
  budgetBytes: number;
  maxTextureSize: number;
}): SupersampleChoice {
  const maxSupersample = Math.max(
    1,
    Math.min(
      MAX_AUTO_SUPERSAMPLE,
      Math.floor(maxTextureSize / Math.max(1, storageWidth)),
      Math.floor(maxTextureSize / Math.max(1, storageHeight))
    )
  );

  for (let supersample = maxSupersample; supersample >= 1; supersample -= 1) {
    const memory = candidateMemory({
      accumulationBytes,
      patchCount,
      residentBytesPerPixel,
      storageHeight,
      storageWidth,
      supersample,
    });

    if (memory.peakBytes <= budgetBytes || supersample === 1) {
      return {
        ...memory,
        peakBudgetRatio: memory.peakBytes / Math.max(1, budgetBytes),
        supersample,
      };
    }
  }

  const memory = candidateMemory({
    accumulationBytes,
    patchCount,
    residentBytesPerPixel,
    storageHeight,
    storageWidth,
    supersample: 1,
  });

  return {
    ...memory,
    peakBudgetRatio: memory.peakBytes / Math.max(1, budgetBytes),
    supersample: 1,
  };
}

function buildMemoryBoundCandidate({
  accumulationBytes,
  budgetBytes,
  coverage,
  grid,
  idealVirtualHeight,
  idealVirtualWidth,
  maxQualityScale = 1,
  maxTextureSize,
  residentBytesPerPixel = FINAL_TEXTURE_BYTES_PER_PIXEL,
}: {
  accumulationBytes: number;
  budgetBytes: number;
  coverage?: Partial<SkyboxStarfieldClipParams>;
  grid: number;
  idealVirtualHeight: number;
  idealVirtualWidth: number;
  maxQualityScale?: number;
  maxTextureSize: number;
  residentBytesPerPixel?: number;
}): MemoryBoundCandidate {
  const normalizedCoverage = normalizeStarfieldCoverage(coverage);
  const guard = grid === 1 ? 0 : PATCH_GUARD_TEXELS;
  const maxContentWidth = Math.max(1, maxTextureSize - guard * 2);
  const maxContentHeight = Math.max(1, maxTextureSize - guard * 2);
  const idealPatchWidth = Math.max(1, idealVirtualWidth / grid);
  const idealPatchHeight = Math.max(1, idealVirtualHeight / grid);
  const textureScale = Math.min(
    1,
    Math.max(0.001, maxQualityScale),
    maxContentWidth / idealPatchWidth,
    maxContentHeight / idealPatchHeight
  );
  const patchCount = grid * grid;
  let scale = Math.max(0.001, textureScale);
  let result: Pick<
    MemoryBoundCandidate,
    "allocation" | "contentHeight" | "contentWidth" | "scale" | "storageHeight" | "storageWidth"
  > | null = null;

  for (let attempt = 0; attempt < 18; attempt += 1) {
    const contentWidth = clampContentSize(idealPatchWidth * scale, maxContentWidth);
    const contentHeight = clampContentSize(idealPatchHeight * scale, maxContentHeight);
    const storageWidth = contentWidth + guard * 2;
    const storageHeight = contentHeight + guard * 2;
    const allocation = chooseSupersample({
      accumulationBytes,
      budgetBytes,
      maxTextureSize,
      patchCount,
      residentBytesPerPixel,
      storageHeight,
      storageWidth,
    });

    result = {
      allocation,
      contentHeight,
      contentWidth,
      scale: Math.min(contentWidth / idealPatchWidth, contentHeight / idealPatchHeight, 1),
      storageHeight,
      storageWidth,
    };

    if (allocation.peakBytes <= budgetBytes) {
      break;
    }

    const nextScale =
      scale * Math.sqrt(budgetBytes / Math.max(allocation.peakBytes, 1)) * 0.96;

    if (
      Math.abs(nextScale - scale) < 0.001 ||
      contentWidth <= PATCH_SIZE_ALIGNMENT ||
      contentHeight <= PATCH_SIZE_ALIGNMENT
    ) {
      break;
    }

    scale = Math.max(0.001, nextScale);
  }

  if (!result) {
    const contentWidth = clampContentSize(idealPatchWidth * scale, maxContentWidth);
    const contentHeight = clampContentSize(idealPatchHeight * scale, maxContentHeight);
    const storageWidth = contentWidth + guard * 2;
    const storageHeight = contentHeight + guard * 2;
    const allocation = chooseSupersample({
      accumulationBytes,
      budgetBytes,
      maxTextureSize,
      patchCount,
      residentBytesPerPixel,
      storageHeight,
      storageWidth,
    });

    result = {
      allocation,
      contentHeight,
      contentWidth,
      scale,
      storageHeight,
      storageWidth,
    };
  }

  return {
    coverage: normalizedCoverage,
    grid,
    guard,
    idealPatchHeight,
    idealPatchWidth,
    patchCount,
    ...result,
  };
}

function descriptorUvMin(layout: Omit<StarfieldPatchLayout, "descriptors">, x: number, y: number) {
  return {
    x: layout.coverageUvMin.x + (x / layout.columns) * layout.coverageUvSize.x,
    y: layout.coverageUvMin.y + (y / layout.rows) * layout.coverageUvSize.y,
  };
}

function descriptorUvSize(layout: Omit<StarfieldPatchLayout, "descriptors">) {
  return {
    x: layout.coverageUvSize.x / layout.columns,
    y: layout.coverageUvSize.y / layout.rows,
  };
}

function createPatchDescriptor(
  layout: Omit<StarfieldPatchLayout, "descriptors">,
  x: number,
  y: number,
  maxTextureSize: number
): StarfieldPatchDescriptor {
  const uvMin = descriptorUvMin(layout, x, y);
  const uvSize = descriptorUvSize(layout);
  const assignedWidth = Math.min(maxTextureSize, Math.max(1, Math.round(layout.contentWidth)));
  const assignedHeight = Math.min(maxTextureSize, Math.max(1, Math.round(layout.contentHeight)));
  const storageWidth = Math.min(maxTextureSize, assignedWidth + layout.guard * 2);
  const storageHeight = Math.min(maxTextureSize, assignedHeight + layout.guard * 2);
  const guardX = Math.max(0, (storageWidth - assignedWidth) * 0.5);
  const guardY = Math.max(0, (storageHeight - assignedHeight) * 0.5);
  const guardUvX = uvSize.x * (guardX / assignedWidth);
  const guardUvY = uvSize.y * (guardY / assignedHeight);
  const horizontalWrap = layout.wrapsHorizontally && layout.columns === 1;

  return {
    hasBottomNeighbor: y < layout.rows - 1,
    hasLeftNeighbor: layout.wrapsHorizontally || x > 0,
    hasRightNeighbor: layout.wrapsHorizontally || x < layout.columns - 1,
    hasTopNeighbor: y > 0,
    id: `${layout.virtualWidth}x${layout.virtualHeight}:${x},${y}`,
    innerOffset: { x: guardX / storageWidth, y: guardY / storageHeight },
    innerScale: { x: assignedWidth / storageWidth, y: assignedHeight / storageHeight },
    storageGuard: { x: guardX, y: guardY },
    storageSize: { height: storageHeight, width: storageWidth },
    storageUvMin: { x: uvMin.x - guardUvX, y: uvMin.y - guardUvY },
    storageUvSize: { x: uvSize.x + guardUvX * 2, y: uvSize.y + guardUvY * 2 },
    uvMin,
    uvSize,
    wrapS: horizontalWrap ? "repeat" : "clamp",
    wrapT: "clamp",
    x,
    y,
  };
}

export function createStarfieldPatchLayout({
  accumulationBytes = STARFIELD_ACCUMULATION_BYTES_PER_PIXEL,
  budgetBytes = STARFIELD_ALLOCATION_BUDGET_BYTES,
  clip,
  height,
  maxTextureSize = 4096,
  residentBytesPerPixel = STARFIELD_RESIDENT_BYTES_PER_PIXEL,
  width,
}: {
  accumulationBytes?: number;
  budgetBytes?: number;
  clip?: Partial<SkyboxStarfieldClipParams>;
  height: number;
  maxTextureSize?: number;
  residentBytesPerPixel?: number;
  width: number;
}): StarfieldPatchLayout {
  const coverage = normalizeStarfieldCoverage(clip);
  const idealVirtualWidth = Math.max(1, width * coverage.uvSize.x);
  const idealVirtualHeight = Math.max(1, height * coverage.uvSize.y);
  const fullIdealVirtualWidth = Math.max(1, width);
  const fullIdealVirtualHeight = Math.max(1, height);
  const gridForDemand = (demandWidth: number, demandHeight: number) => AUTO_PATCH_GRIDS.find((candidate) => {
    const guard = candidate === 1 ? 0 : PATCH_GUARD_TEXELS;
    const maxContent = Math.max(1, maxTextureSize - guard * 2);

    return demandWidth / candidate <= maxContent && demandHeight / candidate <= maxContent;
  }) ?? AUTO_PATCH_GRIDS[AUTO_PATCH_GRIDS.length - 1];
  const fullCandidate = buildMemoryBoundCandidate({
    accumulationBytes,
    budgetBytes,
    grid: gridForDemand(fullIdealVirtualWidth, fullIdealVirtualHeight),
    idealVirtualHeight: fullIdealVirtualHeight,
    idealVirtualWidth: fullIdealVirtualWidth,
    maxTextureSize,
    residentBytesPerPixel,
  });
  const selectedGrid = gridForDemand(idealVirtualWidth, idealVirtualHeight);
  const candidate = buildMemoryBoundCandidate({
    accumulationBytes,
    budgetBytes,
    coverage: coverage.config,
    grid: selectedGrid,
    idealVirtualHeight,
    idealVirtualWidth,
    maxQualityScale: coverage.fraction < 0.9999 ? fullCandidate.scale : 1,
    maxTextureSize,
    residentBytesPerPixel,
  });
  const budgetExceeded = candidate.allocation.peakBytes > budgetBytes;
  const demand = {
    budgetBytes,
    budgetExceeded,
    effectiveVirtualHeight: candidate.contentHeight * selectedGrid,
    effectiveVirtualWidth: candidate.contentWidth * selectedGrid,
    idealVirtualHeight,
    idealVirtualWidth,
    peakBytes: candidate.allocation.peakBytes,
    qualityScale: candidate.scale,
    residentBytes: candidate.allocation.residentBytes,
    scratchBytes: candidate.allocation.scratchBytes,
  };
  const allocation = {
    budgetBytes,
    budgetExceeded,
    peakBudgetRatio: candidate.allocation.peakBudgetRatio,
    peakBytes: candidate.allocation.peakBytes,
    residentBytes: candidate.allocation.residentBytes,
    scratchBytes: candidate.allocation.scratchBytes,
  };
  const layoutBase: Omit<StarfieldPatchLayout, "descriptors"> = {
    allocation,
    autoLayout: true,
    autoLayoutDemand: demand,
    autoLayoutReason: budgetExceeded
      ? "budget-minimum"
      : candidate.scale < 0.995
        ? "budget-scaled"
        : "screen-fit",
    columns: selectedGrid,
    contentHeight: candidate.contentHeight,
    contentWidth: candidate.contentWidth,
    coverage: coverage.config,
    coverageFraction: coverage.fraction,
    coverageUvMin: coverage.uvMin,
    coverageUvSize: coverage.uvSize,
    demand,
    effectiveVirtualHeight: candidate.contentHeight * selectedGrid,
    effectiveVirtualWidth: candidate.contentWidth * selectedGrid,
    guard: candidate.guard,
    idealPatchHeight: candidate.idealPatchHeight,
    idealPatchWidth: candidate.idealPatchWidth,
    idealVirtualHeight,
    idealVirtualWidth,
    patchCount: candidate.patchCount,
    qualityScale: candidate.scale,
    rows: selectedGrid,
    storageHeight: candidate.storageHeight,
    storageWidth: candidate.storageWidth,
    supersample: candidate.allocation.supersample,
    targetTexelsPerPixel: 1,
    virtualHeight: candidate.contentHeight * selectedGrid,
    virtualWidth: candidate.contentWidth * selectedGrid,
    wrapsHorizontally: coverage.wrapsHorizontally,
  };
  const descriptors: StarfieldPatchDescriptor[] = [];

  for (let y = 0; y < selectedGrid; y += 1) {
    for (let x = 0; x < selectedGrid; x += 1) {
      descriptors.push(createPatchDescriptor(layoutBase, x, y, maxTextureSize));
    }
  }

  return { ...layoutBase, descriptors };
}

function isFieldGradientParams(value: unknown): value is Partial<SkyboxFieldGradientParams> {
  return Boolean(value && typeof value === "object" && "mode" in value && !("blend" in value));
}

function oldNebulaFieldToFieldGradient(value: any): SkyboxFieldGradientParams {
  const anchorsSource = Array.isArray(value?.anchors) && value.anchors.length
    ? value.anchors
    : SOURCE_NEBULA_FIELD_ANCHORS;

  return {
    amplitude: numberValue(value?.warp?.amp, DEFAULT_STARFIELD_NEBULA_FIELD.amplitude, 0, 0.6),
    anchors: anchorsSource.slice(0, MAX_ANCHORS).map((anchor: any, index: number) => {
      const sourceFallback = SOURCE_NEBULA_FIELD_ANCHORS[index] ?? SOURCE_NEBULA_FIELD_ANCHORS[0];
      const dir = vectorValue(anchor?.dir, sourceFallback.dir);
      const color = Array.isArray(anchor?.color)
        ? rgbToHex(colorValue(anchor.color, sourceFallback.color))
        : typeof anchor?.color === "string"
          ? anchor.color
          : rgbToHex(sourceFallback.color);

      return {
        color,
        ...sourceUvFromDirection(dir),
      };
    }),
    frequency: numberValue(value?.warp?.freq, DEFAULT_STARFIELD_NEBULA_FIELD.frequency, 0.3, 4),
    mode: value?.blend === "gaussian" ? "gaussian" : "inverse-distance",
    power: numberValue(value?.power, DEFAULT_STARFIELD_NEBULA_FIELD.power, 0.4, 6),
  };
}

export function normalizeStarfieldNebulaField(raw: unknown): SkyboxFieldGradientParams {
  if (!isFieldGradientParams(raw)) {
    return oldNebulaFieldToFieldGradient(raw);
  }

  const anchors = Array.isArray(raw.anchors) && raw.anchors.length
    ? raw.anchors
    : DEFAULT_STARFIELD_NEBULA_FIELD.anchors;

  return {
    amplitude: numberValue(raw.amplitude, DEFAULT_STARFIELD_NEBULA_FIELD.amplitude, 0, 0.6),
    anchors: anchors.slice(0, MAX_ANCHORS).map((anchor, index) => ({
      color: typeof anchor?.color === "string"
        ? anchor.color
        : DEFAULT_STARFIELD_NEBULA_FIELD.anchors[index]?.color ?? "#ffffff",
      x: numberValue(anchor?.x, DEFAULT_STARFIELD_NEBULA_FIELD.anchors[index]?.x ?? 0.5, 0, 1),
      y: numberValue(anchor?.y, DEFAULT_STARFIELD_NEBULA_FIELD.anchors[index]?.y ?? 0.5, 0, 1),
    })),
    frequency: numberValue(raw.frequency, DEFAULT_STARFIELD_NEBULA_FIELD.frequency, 0.3, 4),
    mode: raw.mode === "gaussian" ? "gaussian" : "inverse-distance",
    power: numberValue(raw.power, DEFAULT_STARFIELD_NEBULA_FIELD.power, 0.4, 6),
  };
}

export function normalizeStarfieldParams(raw: Partial<SkyboxStarfieldParams> = {}): SkyboxStarfieldParams {
  const stars = raw.stars ?? DEFAULT_STARFIELD_STARS;
  const nebula = raw.nebula ?? DEFAULT_STARFIELD_NEBULA;

  return {
    clip: normalizeStarfieldClip(raw.clip),
    nebula: {
      uBaseScale: numberValue(nebula.uBaseScale, DEFAULT_STARFIELD_NEBULA.uBaseScale, 0.001, 100),
      uCloudCore: colorValue(nebula.uCloudCore, DEFAULT_STARFIELD_NEBULA.uCloudCore),
      uCloudHighlight: colorValue(nebula.uCloudHighlight, DEFAULT_STARFIELD_NEBULA.uCloudHighlight),
      uCloudShadow: colorValue(nebula.uCloudShadow, DEFAULT_STARFIELD_NEBULA.uCloudShadow),
      uColorWarpAmp: numberValue(nebula.uColorWarpAmp, DEFAULT_STARFIELD_NEBULA.uColorWarpAmp, 0, 1),
      uColorWarpFreq: numberValue(nebula.uColorWarpFreq, DEFAULT_STARFIELD_NEBULA.uColorWarpFreq, 0.001, 20),
      uContrast: numberValue(nebula.uContrast, DEFAULT_STARFIELD_NEBULA.uContrast, 0.05, 12),
      uCoverage: numberValue(nebula.uCoverage, DEFAULT_STARFIELD_NEBULA.uCoverage, 0.02, 0.98),
      uDensity: numberValue(nebula.uDensity, DEFAULT_STARFIELD_NEBULA.uDensity, 0, 10),
      uLightFocus: numberValue(nebula.uLightFocus, DEFAULT_STARFIELD_NEBULA.uLightFocus, 0.001, 8),
      uLightIntensity: numberValue(nebula.uLightIntensity, DEFAULT_STARFIELD_NEBULA.uLightIntensity, 0, 4),
      uLightLining: numberValue(nebula.uLightLining, DEFAULT_STARFIELD_NEBULA.uLightLining, 0, 4),
      uNebulaExposure: numberValue(nebula.uNebulaExposure, DEFAULT_STARFIELD_NEBULA.uNebulaExposure, 0.001, 4),
      uNebulaStrength: numberValue(nebula.uNebulaStrength, DEFAULT_STARFIELD_NEBULA.uNebulaStrength, 0, 20),
      uOctaves: numberValue(nebula.uOctaves, DEFAULT_STARFIELD_NEBULA.uOctaves, 1, 8),
      uOpacity: numberValue(nebula.uOpacity, DEFAULT_STARFIELD_NEBULA.uOpacity, 0, 1),
      uSeed: numberValue(nebula.uSeed, DEFAULT_STARFIELD_NEBULA.uSeed),
      uSoftness: numberValue(nebula.uSoftness, DEFAULT_STARFIELD_NEBULA.uSoftness, 0.001, 2),
    },
    nebulaField: normalizeStarfieldNebulaField(raw.nebulaField),
    quality: normalizeStarfieldQuality(raw.quality),
    stars: {
      uBright: numberValue(stars.uBright, DEFAULT_STARFIELD_STARS.uBright, 0, 8),
      uBrightVar: numberValue(stars.uBrightVar, DEFAULT_STARFIELD_STARS.uBrightVar, 0, 1),
      uColorVar: numberValue(stars.uColorVar, DEFAULT_STARFIELD_STARS.uColorVar, 0, 1),
      uDensity: numberValue(stars.uDensity, DEFAULT_STARFIELD_STARS.uDensity, 0, 2000),
      uGlareSize: numberValue(stars.uGlareSize, DEFAULT_STARFIELD_STARS.uGlareSize, 0, 12),
      uGlareStr: numberValue(stars.uGlareStr, DEFAULT_STARFIELD_STARS.uGlareStr, 0, 4),
      uGlareVar: numberValue(stars.uGlareVar, DEFAULT_STARFIELD_STARS.uGlareVar, 0, 1),
      uLargeStarRarity: numberValue(stars.uLargeStarRarity, DEFAULT_STARFIELD_STARS.uLargeStarRarity, 0, 1),
      uSeed: numberValue(stars.uSeed, DEFAULT_STARFIELD_STARS.uSeed),
      uSizeVar: numberValue(stars.uSizeVar, DEFAULT_STARFIELD_STARS.uSizeVar, 0, 1),
      uStarSize: numberValue(stars.uStarSize, DEFAULT_STARFIELD_STARS.uStarSize, 0.01, 8),
    },
  };
}

function mix(first: number, second: number, amount: number) {
  return first + (second - first) * amount;
}

function mixRgb(first: Rgb, second: Rgb, amount: number): Rgb {
  return [
    mix(first[0], second[0], amount),
    mix(first[1], second[1], amount),
    mix(first[2], second[2], amount),
  ];
}

function addRgb(first: Rgb, second: Rgb): Rgb {
  return [first[0] + second[0], first[1] + second[1], first[2] + second[2]];
}

function scaleRgb(color: Rgb, amount: number): Rgb {
  return [color[0] * amount, color[1] * amount, color[2] * amount];
}

function multiplyRgb(first: Rgb, second: Rgb): Rgb {
  return [first[0] * second[0], first[1] * second[1], first[2] * second[2]];
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / Math.max(edge1 - edge0, 0.00001));

  return t * t * (3 - 2 * t);
}

function dot(first: Rgb, second: Rgb) {
  return first[0] * second[0] + first[1] * second[1] + first[2] * second[2];
}

function angularDistanceSquaredFromDot(value: number) {
  return Math.max(0, 2 * (1 - clamp(value, -1, 1)));
}

function angleDeltaWrapped(value: number, center: number) {
  return ((((value - center) % 1) + 1.5) % 1) - 0.5;
}

function uvInCoverage(u: number, v: number, coverage: StarfieldCoverage) {
  if (v < coverage.uvMin.y || v > coverage.uvMin.y + coverage.uvSize.y) {
    return false;
  }

  if (coverage.wrapsHorizontally) {
    return true;
  }

  const center = coverage.uvMin.x + coverage.uvSize.x * 0.5;

  return Math.abs(angleDeltaWrapped(u, center)) <= coverage.uvSize.x * 0.5;
}

function uvRangeToPixelIntervals(uvMin: number, uvSize: number, width: number) {
  if (uvSize >= 1) {
    return [{ end: width - 1, start: 0 }];
  }

  const startU = ((uvMin % 1) + 1) % 1;
  const endU = startU + uvSize;

  if (endU <= 1) {
    return [{
      end: Math.min(width - 1, Math.ceil(endU * width)),
      start: Math.max(0, Math.floor(startU * width)),
    }];
  }

  return [
    {
      end: width - 1,
      start: Math.max(0, Math.floor(startU * width)),
    },
    {
      end: Math.min(width - 1, Math.ceil((endU - 1) * width)),
      start: 0,
    },
  ];
}

export function starfieldClipContainsDirection(
  direction: Rgb,
  clip: SkyboxStarfieldClipParams
) {
  const coverage = normalizeStarfieldCoverage(clip);
  const uv = sourceUvFromDirection(direction);

  return uvInCoverage(uv.u, uv.v, coverage);
}

function catalogSeed(value: number): number {
  const scaled = Math.floor(value * 1000003);

  return (scaled ^ 0x9e3779b9) >>> 0;
}

function mixUint32(value: number): number {
  let state = value >>> 0;
  state = Math.imul(state ^ (state >>> 16), 0x7feb352d);
  state = Math.imul(state ^ (state >>> 15), 0x846ca68b);

  return (state ^ (state >>> 16)) >>> 0;
}

function hashCellUnit(seed: number, column: number, row: number, salt: number): number {
  const x = Math.imul((column + 0x9e3779b9) >>> 0, 0x85ebca6b);
  const y = Math.imul((row + 0xc2b2ae35) >>> 0, 0x27d4eb2f);
  const s = Math.imul((salt + 0x165667b1) >>> 0, 0x9e3779b1);

  return mixUint32((seed ^ x ^ y ^ s) >>> 0) / 4294967296;
}

function wrapIndex(index: number, size: number): number {
  return ((index % size) + size) % size;
}

export function qFromV(v: number): number {
  return (1 - Math.cos(clamp(v, 0, 1) * Math.PI)) * 0.5;
}

function currentStarGrid(stars: Pick<SkyboxStarfieldStarsParams, "uDensity" | "uSeed">) {
  const density = Math.max(1, Math.round(stars.uDensity));
  const densityScale = clamp(density / STAR_CATALOG_BASE_DENSITY, 0, 1);
  const activationThreshold = densityScale * densityScale;

  return {
    activationThreshold,
    columns: STAR_CATALOG_BASE_DENSITY,
    density,
    densityScale,
    rows: STAR_CATALOG_BASE_DENSITY,
    seed: catalogSeed(stars.uSeed),
  };
}

function starSizeRank(rSize: number, rSizeGate = 1, largeStarRarity = 0) {
  const baseRank = clamp(rSize, 0, 1) ** STAR_SIZE_RARITY_EXPONENT;
  const gate = 1 + ((clamp(rSizeGate, 0, 1) ** STAR_SIZE_GATE_EXPONENT) - 1) * clamp(largeStarRarity, 0, 1);

  return baseRank * gate;
}

function classifyStar(
  rSize: number,
  rSizeGate: number,
  largeStarRarity: number,
  rBright: number,
  rGlare: number
) {
  const sizeScore = starSizeRank(rSize, rSizeGate, largeStarRarity);
  const linkedBrightRand = rBright + (Math.max(rBright, sizeScore) - rBright) * STAR_SIZE_BRIGHTNESS_LINK;
  const linkedGlareRand = rGlare + (Math.max(rGlare, sizeScore) - rGlare) * STAR_SIZE_GLARE_LINK;
  const brightScore = linkedBrightRand ** 3;
  const glareScore = linkedGlareRand ** 8;
  const importance = clamp(sizeScore * 0.3 + brightScore * 0.55 + glareScore * 0.15, 0, 1);

  if (importance >= 0.78 || (brightScore > 0.85 && (sizeScore > 0.65 || glareScore > 0.35))) {
    return 3;
  }

  if (importance >= 0.52 || brightScore > 0.62 || (glareScore > 0.65 && sizeScore > 0.45)) {
    return 2;
  }

  if (importance < 0.16 && sizeScore < 0.35 && brightScore < 0.08 && glareScore < 0.08) {
    return 0;
  }

  return 1;
}

function starFromCell(
  grid: ReturnType<typeof currentStarGrid>,
  column: number,
  row: number,
  largeStarRarity = 0
): CatalogStar | null {
  if (row < 0 || row >= grid.rows) {
    return null;
  }

  const wrappedColumn = wrapIndex(column, grid.columns);

  if (hashCellUnit(grid.seed, wrappedColumn, row, 0) >= grid.activationThreshold) {
    return null;
  }

  const u = (wrappedColumn + hashCellUnit(grid.seed, wrappedColumn, row, 1)) / grid.columns;
  const q = (row + hashCellUnit(grid.seed, wrappedColumn, row, 2)) / grid.rows;
  const y = 1 - q * 2;
  const theta = (u - 0.5) * TWO_PI;
  const ring = Math.sqrt(Math.max(0, 1 - y * y));
  const rSize = hashCellUnit(grid.seed, wrappedColumn, row, 3);
  const rBright = hashCellUnit(grid.seed, wrappedColumn, row, 4);
  const rGlare = hashCellUnit(grid.seed, wrappedColumn, row, 5);
  const rColor = hashCellUnit(grid.seed, wrappedColumn, row, 6);
  const rSizeGate = hashCellUnit(grid.seed, wrappedColumn, row, 7);

  return {
    classId: classifyStar(rSize, rSizeGate, largeStarRarity, rBright, rGlare),
    column: wrappedColumn,
    rBright,
    rColor,
    rGlare,
    rSize,
    rSizeGate,
    row,
    u,
    v: Math.acos(clamp(y, -1, 1)) / Math.PI,
    x: ring * Math.sin(theta),
    y,
    z: ring * Math.cos(theta),
  };
}

function uvRangeIntersectsColumn(uMin: number, uMax: number, column: number, columns: number) {
  if (uMax - uMin >= 1) {
    return true;
  }

  const cellMin = column / columns;
  const cellMax = (column + 1) / columns;

  for (let seam = -1; seam <= 1; seam += 1) {
    if (cellMax + seam >= uMin && cellMin + seam <= uMax) {
      return true;
    }
  }

  return false;
}

function supportAngleForBake(stars: SkyboxStarfieldStarsParams, height: number) {
  const outputAngularPx = Math.PI / Math.max(1, height);
  const screenAngularPx = Math.PI / REFERENCE_BAKE_HEIGHT;
  const coreRadius = Math.max(
    stars.uStarSize * screenAngularPx,
    MIN_CORE_PIXELS * Math.max(outputAngularPx, screenAngularPx)
  );
  const glareRadius = Math.max(
    (stars.uStarSize + stars.uGlareSize) * screenAngularPx,
    MIN_GLARE_PIXELS * Math.max(outputAngularPx, screenAngularPx)
  );

  return Math.max(coreRadius * 0.45, glareRadius * 0.36, outputAngularPx, screenAngularPx) * GAUSSIAN_CUTOFF_SIGMA;
}

type StarCatalogQuery = {
  height: number;
  includeSeamCopies: boolean;
  rawVMax: number;
  rawVMin: number;
  seamCopies: "all" | "filtered";
  stars: SkyboxStarfieldStarsParams;
  uMax: number;
  uMin: number;
  wrapsHorizontally: boolean;
};

function createStarCatalogForQuery({
  height,
  includeSeamCopies,
  rawVMax,
  rawVMin,
  seamCopies,
  stars,
  uMax,
  uMin,
  wrapsHorizontally,
}: StarCatalogQuery) {
  const grid = currentStarGrid(stars);
  const supportAngle = supportAngleForBake(stars, height);
  const vMargin = supportAngle / Math.PI;
  const vMin = clamp(rawVMin, 0, 1);
  const vMax = clamp(rawVMax, 0, 1);
  const qMin = qFromV(vMin);
  const qMax = qFromV(vMax);
  const rowStart = Math.max(0, Math.floor(qMin * grid.rows) - STAR_QUERY_EDGE_PAD_CELLS);
  const rowEnd = Math.min(grid.rows - 1, Math.floor(qMax * grid.rows) + STAR_QUERY_EDGE_PAD_CELLS);
  const poleWideQuery = rawVMin <= vMargin || rawVMax >= 1 - vMargin;
  const largeStarRarity = clamp(stars.uLargeStarRarity, 0, 1);
  const cacheKey = JSON.stringify({
    activationThreshold: grid.activationThreshold,
    height,
    includeSeamCopies,
    largeStarRarity,
    poleWideQuery,
    rawVMax,
    rawVMin,
    seamCopies,
    seed: grid.seed,
    uMax,
    uMin,
    vMax,
    vMin,
    wrapsHorizontally,
  });
  const cachedCatalog = starCatalogCache.get(cacheKey);

  if (cachedCatalog) {
    return cachedCatalog.map((star) => ({ ...star }));
  }

  const catalog: CatalogStar[] = [];

  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      if (!poleWideQuery && !wrapsHorizontally && !uvRangeIntersectsColumn(uMin, uMax, column, grid.columns)) {
        continue;
      }

      const star = starFromCell(grid, column, row, largeStarRarity);

      if (!star) {
        continue;
      }

      if (!includeSeamCopies) {
        catalog.push(star);
        continue;
      }

      for (let seam = -1; seam <= 1; seam += 1) {
        const seamU = star.u + seam;

        if (seamCopies === "all" || wrapsHorizontally || (seamU >= uMin && seamU <= uMax)) {
          catalog.push({ ...star, u: seamU });
        }
      }
    }
  }

  starCatalogCache.set(cacheKey, catalog.map((star) => ({ ...star })));

  return catalog;
}

export function createStarCatalogForCoverage(
  stars: SkyboxStarfieldStarsParams,
  coverage: StarfieldCoverage,
  height: number,
  options: { includeSeamCopies?: boolean } = {}
) {
  const grid = currentStarGrid(stars);
  const supportAngle = supportAngleForBake(stars, height);
  const vMargin = supportAngle / Math.PI;
  const rawVMin = coverage.uvMin.y - vMargin;
  const rawVMax = coverage.uvMin.y + coverage.uvSize.y + vMargin;
  const vMin = clamp(rawVMin, 0, 1);
  const vMax = clamp(rawVMax, 0, 1);
  const poleWideQuery = rawVMin <= vMargin || rawVMax >= 1 - vMargin;
  const sinPhi = Math.max(
    Math.min(
      Math.sin(Math.max(vMin, 0.001) * Math.PI),
      Math.sin(Math.min(vMax, 0.999) * Math.PI)
    ),
    0.015
  );
  const uMargin = poleWideQuery
    ? 1
    : Math.min(1, supportAngle / (TWO_PI * sinPhi) + STAR_QUERY_EDGE_PAD_CELLS / grid.columns);
  const uMin = coverage.wrapsHorizontally ? -uMargin : coverage.uvMin.x - uMargin;
  const uMax = coverage.wrapsHorizontally ? 1 + uMargin : coverage.uvMin.x + coverage.uvSize.x + uMargin;
  const includeSeamCopies = options.includeSeamCopies ?? true;

  return createStarCatalogForQuery({
    height,
    includeSeamCopies,
    rawVMax,
    rawVMin,
    seamCopies: "filtered",
    stars,
    uMax,
    uMin,
    wrapsHorizontally: coverage.wrapsHorizontally,
  });
}

export function createStarCatalogForDescriptor(
  stars: SkyboxStarfieldStarsParams,
  descriptor: Pick<StarfieldPatchDescriptor, "storageUvMin" | "storageUvSize">,
  height: number,
  options: { includeSeamCopies?: boolean } = {}
) {
  const grid = currentStarGrid(stars);
  const supportAngle = supportAngleForBake(stars, height);
  const vMargin = supportAngle / Math.PI;
  const rawVMin = descriptor.storageUvMin.y - vMargin;
  const rawVMax = descriptor.storageUvMin.y + descriptor.storageUvSize.y + vMargin;
  const vMin = clamp(rawVMin, 0, 1);
  const vMax = clamp(rawVMax, 0, 1);
  const poleWideQuery = rawVMin <= vMargin || rawVMax >= 1 - vMargin;
  const sinPhi = Math.max(
    Math.min(
      Math.sin(Math.max(vMin, 0.001) * Math.PI),
      Math.sin(Math.min(vMax, 0.999) * Math.PI)
    ),
    0.015
  );
  const uMargin = poleWideQuery
    ? 1
    : Math.min(1, supportAngle / (TWO_PI * sinPhi) + STAR_QUERY_EDGE_PAD_CELLS / grid.columns);

  return createStarCatalogForQuery({
    height,
    includeSeamCopies: options.includeSeamCopies ?? true,
    rawVMax,
    rawVMin,
    seamCopies: "all",
    stars,
    uMax: descriptor.storageUvMin.x + descriptor.storageUvSize.x + uMargin,
    uMin: descriptor.storageUvMin.x - uMargin,
    wrapsHorizontally: false,
  });
}

function toUint32(value: number) {
  return value >>> 0;
}

function rotateLeft32(value: number, shift: number) {
  const input = toUint32(value);

  return toUint32((input << shift) | (input >>> (32 - shift)));
}

function bjFinal(aInput: number, bInput: number, cInput: number) {
  let a = toUint32(aInput);
  let b = toUint32(bInput);
  let c = toUint32(cInput);

  c = toUint32(c ^ b);
  c = toUint32(c - rotateLeft32(b, 14));
  a = toUint32(a ^ c);
  a = toUint32(a - rotateLeft32(c, 11));
  b = toUint32(b ^ a);
  b = toUint32(b - rotateLeft32(a, 25));
  c = toUint32(c ^ b);
  c = toUint32(c - rotateLeft32(b, 16));
  a = toUint32(a ^ c);
  a = toUint32(a - rotateLeft32(c, 4));
  b = toUint32(b ^ a);
  b = toUint32(b - rotateLeft32(a, 14));
  c = toUint32(c ^ b);
  c = toUint32(c - rotateLeft32(b, 24));

  return c;
}

function materialHashInt3(x: number, y: number, z: number) {
  const seed = toUint32(0xdeadbeef + (3 << 2) + 13);

  return bjFinal(
    toUint32(seed + toUint32(x)),
    toUint32(seed + toUint32(y)),
    toUint32(seed + toUint32(z))
  );
}

function fadePerlin(value: number) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function gradientPerlin3(hash: number, x: number, y: number, z: number) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;

  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

function trilerp(
  v0: number,
  v1: number,
  v2: number,
  v3: number,
  v4: number,
  v5: number,
  v6: number,
  v7: number,
  s: number,
  t: number,
  r: number
) {
  const s1 = 1 - s;
  const t1 = 1 - t;
  const r1 = 1 - r;

  return (
    r1 * (t1 * (v0 * s1 + v1 * s) + t * (v2 * s1 + v3 * s)) +
    r * (t1 * (v4 * s1 + v5 * s) + t * (v6 * s1 + v7 * s))
  );
}

function materialPerlinNoise3(point: Rgb) {
  const x = Math.floor(point[0]);
  const y = Math.floor(point[1]);
  const z = Math.floor(point[2]);
  const fx = point[0] - x;
  const fy = point[1] - y;
  const fz = point[2] - z;
  const u = fadePerlin(fx);
  const v = fadePerlin(fy);
  const w = fadePerlin(fz);
  const result = trilerp(
    gradientPerlin3(materialHashInt3(x, y, z), fx, fy, fz),
    gradientPerlin3(materialHashInt3(x + 1, y, z), fx - 1, fy, fz),
    gradientPerlin3(materialHashInt3(x, y + 1, z), fx, fy - 1, fz),
    gradientPerlin3(materialHashInt3(x + 1, y + 1, z), fx - 1, fy - 1, fz),
    gradientPerlin3(materialHashInt3(x, y, z + 1), fx, fy, fz - 1),
    gradientPerlin3(materialHashInt3(x + 1, y, z + 1), fx - 1, fy, fz - 1),
    gradientPerlin3(materialHashInt3(x, y + 1, z + 1), fx, fy - 1, fz - 1),
    gradientPerlin3(materialHashInt3(x + 1, y + 1, z + 1), fx - 1, fy - 1, fz - 1),
    u,
    v,
    w
  );

  return result * 0.982;
}

function fbm01(pointInput: Rgb, octaves: number, lacunarity: number, gain: number) {
  let sum = 0;
  let amplitude = 0.5;
  let norm = 0;
  const octaveCount = Math.floor(clamp(octaves, 1, 8));
  const safeLacunarity = Math.max(lacunarity, 0.001);
  const safeGain = clamp(gain, 0.001, 0.999);
  let point: Rgb = [...pointInput];

  for (let octave = 0; octave < octaveCount; octave += 1) {
    const octaveNoise = materialPerlinNoise3(point) * 0.5 + 0.5;

    sum += amplitude * octaveNoise;
    norm += amplitude;
    point = scaleRgb(point, safeLacunarity);
    amplitude *= safeGain;
  }

  return norm <= 0 ? 0 : sum / norm;
}

function warpDirection(direction: Rgb, amp: number, freq: number): Rgb {
  if (amp <= 0) {
    return direction;
  }

  return normalizeVector([
    direction[0] + Math.sin((direction[1] * freq + 0.23) * TWO_PI) * Math.cos((direction[2] * freq + 0.41) * TWO_PI) * amp,
    direction[1] + Math.cos((direction[2] * freq + 0.17) * TWO_PI) * Math.sin((direction[0] * freq + 0.37) * TWO_PI) * amp,
    direction[2] + Math.sin((direction[0] * freq - 0.31) * TWO_PI) * Math.cos((direction[1] * freq + 0.29) * TWO_PI) * amp,
  ]);
}

export function starfieldFieldGradientToSourceField(field: SkyboxFieldGradientParams): SourceNebulaField {
  const normalizedField = normalizeStarfieldNebulaField(field);

  return {
    anchors: normalizedField.anchors.map((anchor) => ({
      color: hexToRgb(anchor.color),
      dir: sourceDirectionFromUv(anchor.x, anchor.y),
    })),
    blend: normalizedField.mode === "gaussian" ? "gaussian" : "idw",
    power: normalizedField.power,
    sigma: 0.46 / Math.max(normalizedField.power, 0.0001),
    warp: {
      amp: normalizedField.amplitude,
      freq: normalizedField.frequency,
    },
  };
}

function oneMinusSmoothstep(edge0: number, edge1: number, value: number) {
  return 1 - smoothstep(edge0, edge1, value);
}

function sampleNebulaField(direction: Rgb, field: SkyboxFieldGradientParams): Rgb {
  const sourceField = starfieldFieldGradientToSourceField(field);
  const fieldDirection = warpDirection(direction, sourceField.warp.amp, sourceField.warp.freq);
  let color: Rgb = [0, 0, 0];
  let weightSum = 0;

  sourceField.anchors.forEach((anchor) => {
    const distance = 1 - clamp(dot(fieldDirection, anchor.dir), -1, 1);
    const weight = sourceField.blend === "gaussian"
      ? Math.exp(-(distance * distance) / Math.max(2 * sourceField.sigma * sourceField.sigma, 0.0001))
      : 1 / (distance + 0.0001) ** Math.max(sourceField.power, 0.0001);

    color = addRgb(color, scaleRgb(anchor.color, weight));
    weightSum += weight;
  });

  return weightSum <= 0 ? [0, 0, 0] : scaleRgb(color, 1 / weightSum);
}

function sampleNebula(direction: Rgb, params: SkyboxStarfieldParams): Rgb {
  const nebula = params.nebula;
  const octaves = clamp(nebula.uOctaves, 1, 8);
  const warpP = addRgb(scaleRgb(direction, Math.max(nebula.uColorWarpFreq, 0.001)), [
    nebula.uSeed,
    nebula.uSeed * 0.37,
    nebula.uSeed * -0.21,
  ]);
  const warpVec = scaleRgb([
    fbm01(warpP, octaves, 2.02, 0.52) * 2 - 1,
    fbm01(addRgb(warpP, [5.2, 1.3, 7.1]), octaves, 2.03, 0.5) * 2 - 1,
    fbm01(addRgb(warpP, [9.1, 8.4, 2.8]), octaves, 2.01, 0.51) * 2 - 1,
  ], Math.max(nebula.uColorWarpAmp, 0));
  const warpedDir = normalizeVector(addRgb(direction, warpVec));
  const lightField = sampleNebulaField(warpedDir, params.nebulaField);
  const seedOffset: Rgb = [nebula.uSeed * 13.17, nebula.uSeed * -7.31, nebula.uSeed * 5.19];
  const p = addRgb(scaleRgb(direction, Math.max(nebula.uBaseScale, 0.001)), seedOffset);
  const q: Rgb = [
    fbm01(p, octaves, 2.02, 0.5),
    fbm01(addRgb(p, [5.2, 1.3, 2.8]), octaves, 2.02, 0.5),
    fbm01(addRgb(p, [2.1, 4.7, 9.2]), octaves, 2.02, 0.5),
  ];
  const cloudNoise = clamp(fbm01(addRgb(p, scaleRgb(q, 3)), octaves, 2.02, 0.5));
  const density = clamp(smoothstep(nebula.uCoverage, nebula.uCoverage + Math.max(nebula.uSoftness, 0.001), cloudNoise)) ** Math.max(nebula.uContrast, 0.05);
  const lightMask = clamp(Math.max(lightField[0], lightField[1], lightField[2]) * Math.max(nebula.uLightIntensity, 0));
  const lit = lightMask ** Math.max(nebula.uLightFocus, 0.001);
  const highlight = scaleRgb(multiplyRgb(lightField, nebula.uCloudHighlight), Math.max(nebula.uLightIntensity, 0));
  const cloudColor = scaleRgb(
    addRgb(
      mixRgb(mixRgb(nebula.uCloudShadow, highlight, lit), nebula.uCloudCore, clamp(density * 0.4)),
      scaleRgb(lightField, lit * (1 - density) * Math.max(nebula.uLightLining, 0) * Math.max(nebula.uLightIntensity, 0))
    ),
    Math.max(nebula.uDensity, 0)
  );
  const nebulaRgb = cloudColor.map((channel) => Math.max(0, channel) ** 0.92) as Rgb;
  const alpha = clamp(density * nebula.uOpacity);

  return addRgb(
    [0.004, 0.005, 0.011],
    scaleRgb(nebulaRgb, alpha * Math.max(nebula.uNebulaStrength, 0))
  );
}

function starColor(t: number): Rgb {
  return t < 0.5
    ? mixRgb([1, 0.55, 0.3], [1, 0.96, 0.92], t * 2)
    : mixRgb([1, 0.96, 0.92], [0.7, 0.8, 1], (t - 0.5) * 2);
}

function addLinearPixel(data: Float32Array, width: number, x: number, y: number, color: Rgb) {
  const index = (y * width + x) * 4;

  data[index] += color[0];
  data[index + 1] += color[1];
  data[index + 2] += color[2];
  data[index + 3] = Math.max(data[index + 3], Math.max(color[0], color[1], color[2]));
}

function starSupersampleForBake(width: number) {
  if (width < 256) {
    return 1;
  }

  if (width < 2048) {
    return 2;
  }

  return 1;
}

function drawStars(
  linearData: Float32Array,
  params: SkyboxStarfieldParams,
  width: number,
  height: number,
  outputHeight = height
) {
  const coverage = normalizeStarfieldCoverage(params.clip);
  const stars = params.stars;

  if (stars.uDensity <= 0 || stars.uBright <= 0) {
    return;
  }

  const catalog = createStarCatalogForCoverage(stars, coverage, outputHeight, { includeSeamCopies: false });
  const outputAngularPx = Math.PI / Math.max(1, outputHeight);
  const screenAngularPx = Math.PI / REFERENCE_BAKE_HEIGHT;
  const bakeAngularPx = Math.PI / Math.max(1, height);

  catalog.forEach((star) => {
    const rank = starSizeRank(star.rSize, star.rSizeGate, stars.uLargeStarRarity);
    const linkedBrightRand = star.rBright + (Math.max(star.rBright, rank) - star.rBright) * STAR_SIZE_BRIGHTNESS_LINK;
    const linkedGlareRand = star.rGlare + (Math.max(star.rGlare, rank) - star.rGlare) * STAR_SIZE_GLARE_LINK;
    const scale = mix(1, mix(0.1, 1, rank), stars.uSizeVar);
    const starRadius = stars.uStarSize * scale * screenAngularPx;
    const screenRadiusPx = stars.uStarSize * scale;
    const pinWeight = oneMinusSmoothstep(SUBPIXEL_DENSITY_THRESHOLD_PX, AA_PIN_THRESHOLD_PX, screenRadiusPx);
    const normalCoreFloor = MIN_CORE_PIXELS * Math.max(outputAngularPx, screenAngularPx);
    const pinCoreFloor = Math.max(outputAngularPx, screenAngularPx * 0.5);
    const coreSupportRadius = Math.max(starRadius, mix(normalCoreFloor, pinCoreFloor, pinWeight));
    const coreRadius = Math.max(starRadius, screenAngularPx * 0.1);
    const densityEnergy = Math.max(0.08, smoothstep(0, SUBPIXEL_DENSITY_THRESHOLD_PX, screenRadiusPx));
    const coreEnergy = mix(1, densityEnergy, oneMinusSmoothstep(SUBPIXEL_DENSITY_THRESHOLD_PX * 0.75, SUBPIXEL_DENSITY_THRESHOLD_PX, screenRadiusPx));
    const coreSigma = Math.max(coreRadius * 0.45, bakeAngularPx * 0.5);
    const coreSupportSigma = Math.max(coreSupportRadius * 0.45, bakeAngularPx);
    const normalWeight = smoothstep(AA_PIN_THRESHOLD_PX, AA_PIN_THRESHOLD_PX + 0.25, screenRadiusPx);
    const glareRadius = stars.uGlareSize * mix(1, scale, stars.uSizeVar) * screenAngularPx;
    const glareSupportEdge = Math.max(
      starRadius + glareRadius,
      MIN_GLARE_PIXELS * Math.max(outputAngularPx, screenAngularPx)
    );
    const glareEdge = Math.max(starRadius + glareRadius, screenAngularPx * 0.1);
    const glareSigma = Math.max(glareEdge * 0.36, bakeAngularPx * 0.5);
    const glareSupportSigma = Math.max(glareSupportEdge * 0.36, bakeAngularPx) *
      normalWeight *
      (stars.uGlareSize > 0 && stars.uGlareStr > 0 ? 1 : 0);
    const supportAngle = Math.max(coreSigma, glareSigma) * GAUSSIAN_CUTOFF_SIGMA;
    const support = Math.ceil((Math.max(supportAngle, coreSupportSigma * GAUSSIAN_CUTOFF_SIGMA, glareSupportSigma * GAUSSIAN_CUTOFF_SIGMA) / Math.PI) * height);
    const centerX = star.u * width;
    const centerY = star.v * height;
    const brightness = stars.uBright * mix(1, linkedBrightRand ** 3 * 3, stars.uBrightVar);
    const glareStrength = stars.uGlareStr * mix(1, linkedGlareRand ** 8, stars.uGlareVar);
    const baseColor = starColor(mix(0.5, star.rColor, stars.uColorVar));
    const minX = Math.floor(centerX - support);
    const maxX = Math.ceil(centerX + support);
    const minY = Math.max(0, Math.floor(centerY - support));
    const maxY = Math.min(height - 1, Math.ceil(centerY + support));
    const starSinPhi = Math.max(Math.sin(star.v * Math.PI), 0.015);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const wrappedX = wrapIndex(x, width);
        const canonicalU = (wrappedX + 0.5) / width;
        const canonicalV = (y + 0.5) / height;

        if (!uvInCoverage(canonicalU, canonicalV, coverage)) {
          continue;
        }

        const deltaX = angleDeltaWrapped(canonicalU, star.u) * TWO_PI * starSinPhi;
        const deltaY = (canonicalV - star.v) * Math.PI;
        const angularDistanceSq = deltaX * deltaX + deltaY * deltaY;
        const core = Math.exp(-angularDistanceSq / Math.max(coreSigma * coreSigma * 2, 1e-10)) * coreEnergy;
        const glare = Math.exp(-angularDistanceSq / Math.max(glareSigma * glareSigma * 2, 1e-10)) * normalWeight * glareStrength;
        const contribution = (core + glare) * brightness;

        if (contribution <= 0.000001) {
          continue;
        }

        addLinearPixel(linearData, width, wrappedX, y, scaleRgb(baseColor, contribution));
      }
    }
  });
}

function downsampleStarData(starData: Float32Array, width: number, height: number, supersample: number) {
  if (supersample <= 1) {
    return starData;
  }

  const outputWidth = Math.max(1, Math.floor(width / supersample));
  const outputHeight = Math.max(1, Math.floor(height / supersample));
  const outputData = new Float32Array(outputWidth * outputHeight * 4);
  const sampleCount = supersample * supersample;

  for (let outputY = 0; outputY < outputHeight; outputY += 1) {
    for (let outputX = 0; outputX < outputWidth; outputX += 1) {
      const outputIndex = (outputY * outputWidth + outputX) * 4;

      for (let sampleY = 0; sampleY < supersample; sampleY += 1) {
        for (let sampleX = 0; sampleX < supersample; sampleX += 1) {
          const sampleIndex = (
            (outputY * supersample + sampleY) * width +
            outputX * supersample +
            sampleX
          ) * 4;

          outputData[outputIndex] += starData[sampleIndex];
          outputData[outputIndex + 1] += starData[sampleIndex + 1];
          outputData[outputIndex + 2] += starData[sampleIndex + 2];
          outputData[outputIndex + 3] += starData[sampleIndex + 3];
        }
      }

      outputData[outputIndex] /= sampleCount;
      outputData[outputIndex + 1] /= sampleCount;
      outputData[outputIndex + 2] /= sampleCount;
      outputData[outputIndex + 3] /= sampleCount;
    }
  }

  return outputData;
}

function sampleStarsAtDirection(
  direction: Rgb,
  stars: SkyboxStarfieldStarsParams,
  sampleHeight: number
): Rgb {
  if (stars.uDensity <= 0 || stars.uBright <= 0) {
    return [0, 0, 0];
  }

  const uv = sourceUvFromDirection(direction);
  const grid = currentStarGrid(stars);
  const supportAngle = supportAngleForBake(stars, sampleHeight);
  const vMargin = supportAngle / Math.PI;
  const vMin = clamp(uv.v - vMargin, 0, 1);
  const vMax = clamp(uv.v + vMargin, 0, 1);
  const qMin = qFromV(vMin);
  const qMax = qFromV(vMax);
  const rowStart = Math.max(0, Math.floor(qMin * grid.rows) - STAR_QUERY_EDGE_PAD_CELLS);
  const rowEnd = Math.min(grid.rows - 1, Math.floor(qMax * grid.rows) + STAR_QUERY_EDGE_PAD_CELLS);
  const sinPhi = Math.max(Math.sin(clamp(uv.v, 0.001, 0.999) * Math.PI), 0.015);
  const uMargin = Math.min(1, supportAngle / (TWO_PI * sinPhi) + STAR_QUERY_EDGE_PAD_CELLS / grid.columns);
  const columnStart = Math.floor((uv.u - uMargin) * grid.columns) - STAR_QUERY_EDGE_PAD_CELLS;
  const columnEnd = Math.ceil((uv.u + uMargin) * grid.columns) + STAR_QUERY_EDGE_PAD_CELLS;
  const outputAngularPx = Math.PI / Math.max(1, sampleHeight);
  const screenAngularPx = Math.PI / REFERENCE_BAKE_HEIGHT;
  let color: Rgb = [0, 0, 0];

  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let column = columnStart; column <= columnEnd; column += 1) {
      const star = starFromCell(grid, column, row, stars.uLargeStarRarity);

      if (!star) {
        continue;
      }

      const rank = starSizeRank(star.rSize, star.rSizeGate, stars.uLargeStarRarity);
      const linkedBrightRand = star.rBright + (Math.max(star.rBright, rank) - star.rBright) * STAR_SIZE_BRIGHTNESS_LINK;
      const linkedGlareRand = star.rGlare + (Math.max(star.rGlare, rank) - star.rGlare) * STAR_SIZE_GLARE_LINK;
      const scale = mix(1, mix(0.1, 1, rank), stars.uSizeVar);
      const starRadius = stars.uStarSize * scale * screenAngularPx;
      const screenRadiusPx = stars.uStarSize * scale;
      const coreRadius = Math.max(starRadius, screenAngularPx * 0.1);
      const coreSigma = Math.max(coreRadius * 0.45, outputAngularPx * 0.5);
      const coreEnergy = mix(
        1,
        Math.max(0.08, smoothstep(0, SUBPIXEL_DENSITY_THRESHOLD_PX, screenRadiusPx)),
        oneMinusSmoothstep(SUBPIXEL_DENSITY_THRESHOLD_PX * 0.75, SUBPIXEL_DENSITY_THRESHOLD_PX, screenRadiusPx)
      );
      const normalWeight = smoothstep(AA_PIN_THRESHOLD_PX, AA_PIN_THRESHOLD_PX + 0.25, screenRadiusPx);
      const glareRadius = stars.uGlareSize * mix(1, scale, stars.uSizeVar) * screenAngularPx;
      const glareEdge = Math.max(starRadius + glareRadius, screenAngularPx * 0.1);
      const glareSigma = Math.max(glareEdge * 0.36, outputAngularPx * 0.5);
      const angularDistanceSq = angularDistanceSquaredFromDot(
        direction[0] * star.x + direction[1] * star.y + direction[2] * star.z,
      );
      const core = Math.exp(-angularDistanceSq / Math.max(coreSigma * coreSigma * 2, 1e-10)) * coreEnergy;
      const glareStrength = stars.uGlareStr * mix(1, linkedGlareRand ** 8, stars.uGlareVar);
      const glare = Math.exp(-angularDistanceSq / Math.max(glareSigma * glareSigma * 2, 1e-10)) * normalWeight * glareStrength;
      const brightness = stars.uBright * mix(1, linkedBrightRand ** 3 * 3, stars.uBrightVar);
      const contribution = (core + glare) * brightness;

      if (contribution <= 0.000001) {
        continue;
      }

      color = addRgb(color, scaleRgb(starColor(mix(0.5, star.rColor, stars.uColorVar)), contribution));
    }
  }

  return color;
}

function sampleStarfieldLinear(
  direction: Rgb,
  rawParams: SkyboxStarfieldParams,
  sampleHeight = Math.floor(STARFIELD_PREVIEW_BAKE_WIDTH / 2)
): Rgba {
  const params = normalizeStarfieldParams(rawParams);

  if (!starfieldClipContainsDirection(direction, params.clip)) {
    return [0, 0, 0, 0];
  }

  const nebulaLinear = sampleNebula(direction, params);
  const starsLinear = sampleStarsAtDirection(direction, params.stars, sampleHeight);
  const exposed = composeStarfieldMappedColor(nebulaLinear, starsLinear, params.nebula.uNebulaExposure);

  return [exposed[0], exposed[1], exposed[2], 1];
}

export function sampleStarfieldLayer(
  direction: Rgb,
  rawParams: SkyboxStarfieldParams,
  options: { sampleHeight?: number } = {}
): Rgba {
  return sampleStarfieldLinear(direction, rawParams, options.sampleHeight);
}

export function createStarfieldBakeCacheKey(
  params: SkyboxStarfieldParams,
  width: number,
  height: number,
  options: {
    accumulationBytes?: number;
    budgetBytes?: number;
    maxTextureSize?: number;
    residentBytesPerPixel?: number;
  } = {}
) {
  const normalizedParams = normalizeStarfieldParams(params);
  const preset = getStarfieldQualityPreset(normalizedParams.quality);
  const budgetBytes = Math.max(1, Math.floor(options.budgetBytes ?? preset.budgetBytes));
  const maxTextureSize = Math.max(
    1,
    Math.floor(options.maxTextureSize ?? STARFIELD_PREVIEW_BAKE_WIDTH)
  );
  const layout = createStarfieldPatchLayout({
    accumulationBytes: options.accumulationBytes,
    budgetBytes,
    clip: normalizedParams.clip,
    height,
    maxTextureSize,
    residentBytesPerPixel: options.residentBytesPerPixel,
    width,
  });

  return hashString(JSON.stringify({
    height,
    layout: {
      allocation: layout.allocation,
      accumulationBytes: options.accumulationBytes ?? STARFIELD_ACCUMULATION_BYTES_PER_PIXEL,
      columns: layout.columns,
      contentHeight: layout.contentHeight,
      contentWidth: layout.contentWidth,
      coverage: layout.coverage,
      guard: layout.guard,
      maxTextureSize,
      qualityScale: layout.qualityScale,
      rows: layout.rows,
      residentBytesPerPixel: options.residentBytesPerPixel ?? STARFIELD_RESIDENT_BYTES_PER_PIXEL,
      storageHeight: layout.storageHeight,
      storageWidth: layout.storageWidth,
      supersample: layout.supersample,
    },
    params: normalizedParams,
    width,
  }));
}

function exposureMap(color: Rgb, exposure: number): Rgb {
  return color.map((channel) =>
    1 - Math.exp(-Math.max(0, channel) * Math.max(exposure, 0.001))
  ) as Rgb;
}

function composeStarfieldMappedColor(nebulaLinear: Rgb, starsLinear: Rgb, nebulaExposure: number): Rgb {
  const nebulaMapped = exposureMap(nebulaLinear, nebulaExposure);
  const backgroundLinear: Rgb = [0.004, 0.005, 0.011];
  const backgroundMapped = exposureMap(backgroundLinear, 1);
  const starsMapped = exposureMap(addRgb(backgroundLinear, starsLinear), 1);
  const starContribution: Rgb = [
    Math.max(starsMapped[0] - backgroundMapped[0], 0),
    Math.max(starsMapped[1] - backgroundMapped[1], 0),
    Math.max(starsMapped[2] - backgroundMapped[2], 0),
  ];

  return addRgb(nebulaMapped, starContribution);
}

function writeOutputFromLinear(
  nebulaData: Float32Array,
  nebulaWidth: number,
  nebulaHeight: number,
  starData: Float32Array,
  outputData: Uint8ClampedArray<ArrayBuffer>,
  outputWidth: number,
  outputHeight: number,
  params: SkyboxStarfieldParams
) {
  for (let outputY = 0; outputY < outputHeight; outputY += 1) {
    const nebulaY = ((outputY + 0.5) / outputHeight) * nebulaHeight - 0.5;
    const rawY0 = Math.floor(nebulaY);
    const y0 = Math.max(0, rawY0);
    const y1 = Math.min(nebulaHeight - 1, rawY0 + 1);
    const ty = nebulaY - rawY0;
    const y0Offset = y0 * nebulaWidth * 4;
    const y1Offset = y1 * nebulaWidth * 4;

    for (let outputX = 0; outputX < outputWidth; outputX += 1) {
      const index = (outputY * outputWidth + outputX) * 4;
      const nebulaX = ((outputX + 0.5) / outputWidth) * nebulaWidth - 0.5;
      const x0 = Math.floor(nebulaX);
      const x1 = x0 + 1;
      const tx = nebulaX - x0;
      const x0Offset = wrapIndex(x0, nebulaWidth) * 4;
      const x1Offset = wrapIndex(x1, nebulaWidth) * 4;
      const c00 = y0Offset + x0Offset;
      const c10 = y0Offset + x1Offset;
      const c01 = y1Offset + x0Offset;
      const c11 = y1Offset + x1Offset;
      const nebulaRed = mix(
        mix(nebulaData[c00], nebulaData[c10], tx),
        mix(nebulaData[c01], nebulaData[c11], tx),
        ty
      );
      const nebulaGreen = mix(
        mix(nebulaData[c00 + 1], nebulaData[c10 + 1], tx),
        mix(nebulaData[c01 + 1], nebulaData[c11 + 1], tx),
        ty
      );
      const nebulaBlue = mix(
        mix(nebulaData[c00 + 2], nebulaData[c10 + 2], tx),
        mix(nebulaData[c01 + 2], nebulaData[c11 + 2], tx),
        ty
      );
      const nebulaAlpha = mix(
        mix(nebulaData[c00 + 3], nebulaData[c10 + 3], tx),
        mix(nebulaData[c01 + 3], nebulaData[c11 + 3], tx),
        ty
      );
      const starPeak = Math.max(starData[index], starData[index + 1], starData[index + 2]);

      if (nebulaAlpha <= 0 && starPeak <= 0) {
        outputData[index] = 0;
        outputData[index + 1] = 0;
        outputData[index + 2] = 0;
        outputData[index + 3] = 0;
        continue;
      }

      const exposed = composeStarfieldMappedColor(
        [nebulaRed, nebulaGreen, nebulaBlue],
        [starData[index], starData[index + 1], starData[index + 2]],
        params.nebula.uNebulaExposure
      );
      const [red, green, blue] = linearRgbToSrgbBytes(exposed);

      outputData[index] = red;
      outputData[index + 1] = green;
      outputData[index + 2] = blue;
      outputData[index + 3] = 255;
    }
  }
}

export function bakeStarfieldImageData(
  rawParams: SkyboxStarfieldParams,
  width = STARFIELD_PREVIEW_BAKE_WIDTH,
  height = Math.floor(width / 2)
): StarfieldBakeData {
  const params = normalizeStarfieldParams(rawParams);
  const preset = getStarfieldQualityPreset(params.quality);
  const nebulaWidth = Math.min(width, NEBULA_BAKE_MAX_WIDTH);
  const nebulaHeight = Math.max(1, Math.floor(nebulaWidth / 2));
  const layout = createStarfieldPatchLayout({
    budgetBytes: preset.budgetBytes,
    clip: params.clip,
    height: nebulaHeight,
    maxTextureSize: STARFIELD_PREVIEW_BAKE_WIDTH,
    residentBytesPerPixel: FINAL_TEXTURE_BYTES_PER_PIXEL,
    width: nebulaWidth,
  });
  const nebulaData = new Float32Array(nebulaWidth * nebulaHeight * 4);
  const data = new Uint8ClampedArray(width * height * 4) as Uint8ClampedArray<ArrayBuffer>;
  const coverage = normalizeStarfieldCoverage(params.clip);
  const starSupersample = starSupersampleForBake(width);
  const starWidth = width * starSupersample;
  const starHeight = height * starSupersample;
  const starSupersampledData = new Float32Array(starWidth * starHeight * 4);

  layout.descriptors.forEach((descriptor) => {
    const xIntervals = uvRangeToPixelIntervals(descriptor.uvMin.x, descriptor.uvSize.x, nebulaWidth);
    const yStart = Math.max(0, Math.floor(descriptor.uvMin.y * nebulaHeight));
    const yEnd = Math.min(nebulaHeight - 1, Math.ceil((descriptor.uvMin.y + descriptor.uvSize.y) * nebulaHeight));

    for (let y = yStart; y <= yEnd; y += 1) {
      const v = (y + 0.5) / nebulaHeight;

      xIntervals.forEach(({ end, start }) => {
        for (let x = start; x <= end; x += 1) {
          const u = (x + 0.5) / nebulaWidth;

          if (!uvInCoverage(u, v, coverage)) {
            continue;
          }

          const direction = sourceDirectionFromUv(u, v);
          const color = sampleNebula(direction, params);
          const index = (y * nebulaWidth + x) * 4;

          nebulaData[index] = color[0];
          nebulaData[index + 1] = color[1];
          nebulaData[index + 2] = color[2];
          nebulaData[index + 3] = 1;
        }
      });
    }
  });

  drawStars(starSupersampledData, params, starWidth, starHeight, height);
  const starData = downsampleStarData(starSupersampledData, starWidth, starHeight, starSupersample);
  writeOutputFromLinear(nebulaData, nebulaWidth, nebulaHeight, starData, data, width, height, params);

  return { data, height, width };
}
