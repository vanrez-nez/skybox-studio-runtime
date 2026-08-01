import { normalizeSkyboxMoonParams } from "./layer-addons/builtins/moon/params";
// Value import, but registry.ts itself has type-only imports, so this edge is
// runtime-cycle-free. manifest.ts must never import the builtins barrel.
import { getLayerRuntimeAdapter } from "./layer-addons/registry";

export type SkyboxCompositionMode = "alpha-over";
export type SkyboxCompositionOrder = "bottom-to-top";
export type SkyboxEffectType =
  | "clouds"
  | "field-gradient"
  | "gradient"
  | "image"
  | "moon"
  | "spot"
  | "starfield";
export type SkyboxLayerBlendMode =
  | "normal"
  | "darken"
  | "multiply"
  | "color-burn"
  | "lighten"
  | "screen"
  | "color-dodge"
  | "overlay"
  | "soft-light"
  | "hard-light"
  | "difference"
  | "exclusion";
export type SkyboxGradientMode = "linear";
export type SkyboxFieldGradientMode = "gaussian" | "inverse-distance";
export type SkyboxGeometryType = "box" | "sphere";
export type SkyboxSpotColorMode = "gradient" | "light";
export type SkyboxStarfieldQuality = "low" | "medium" | "high";

export type SkyboxGeometryOptions = {
  type: SkyboxGeometryType;
};

export type SkyboxBakeOptions = {
  cache?: boolean;
  dpr?: number;
  height?: number;
  targetGroupId?: string;
  width?: number;
};

export type SkyboxGradientStop = {
  color: string;
  location: number;
  midpoint?: number;
  opacity: number;
};

export type SkyboxGradientParams = {
  mode: SkyboxGradientMode;
  rotation: number;
  stops: SkyboxGradientStop[];
};

export type SkyboxFieldGradientAnchor = {
  color: string;
  x: number;
  y: number;
};

export type SkyboxFieldGradientParams = {
  amplitude: number;
  anchors: SkyboxFieldGradientAnchor[];
  frequency: number;
  mode: SkyboxFieldGradientMode;
  power: number;
};

export type SkyboxImagePlacement = {
  angularHeight: number;
  angularWidth: number;
  baseAngularHeight: number;
  baseAngularWidth: number;
  centerDirection: [number, number, number];
  projection: "angular-decal";
  rotation: number;
  tangentX: [number, number, number];
  tangentY: [number, number, number];
};

export type SkyboxImageParams = {
  height: number;
  pixels: number[] | null;
  placement: SkyboxImagePlacement | null;
  src: string | null;
  width: number;
};

export type SkyboxMoonStyle = "realistic" | "cartoon";
export type SkyboxMoonPhotometryModel = "hapke-wac-643";
export type SkyboxMoonResolutionMode = "auto" | "128" | "256" | "512" | "1024" | "2048";

export type SkyboxMoonParams = {
  placement: SkyboxImagePlacement;
  resolutionMode: SkyboxMoonResolutionMode;
  photometryModel: SkyboxMoonPhotometryModel;
  phase: number;
  sunTilt: number;
  bodyRotation: number;
  bodyTilt: number;
  craterFreq: number;
  craterDepth: number;
  maria: number;
  mariaDepth: number;
  regolith: number;
  rays: number;
  exposure: number;
  style: SkyboxMoonStyle;
  cartoonLightIntensity: number;
  cartoonFill: number;
  cartoonNightStrength: number;
  cartoonCraters: number;
  cartoonCraterSize: number;
  cartoonWobble: number;
  cartoonRelief: number;
  cartoonForm: number;
  cartoonSunLean: number;
  cartoonOutline: number;
  cartoonSoftness: number;
  cartoonShadowSize: number;
  cartoonEdgeGlow: number;
  cartoonCrop: boolean;
  baseColor: string;
  mareColor: string;
  nightColor: string;
};

export type SkyboxSpotParams = {
  angularRadius: number;
  baseAngularRadius: number;
  brightness: number;
  centerDirection: [number, number, number];
  colorMode: SkyboxSpotColorMode;
  coreRadius: number;
  coreSoftness: number;
  dispersion: number;
  dogSpread: number;
  dogStrength: number;
  dogStretch: number;
  glareSize: number;
  glareStrength: number;
  glow: number;
  glowSize: number;
  glowStrength: number;
  halo: number;
  haloInnerWidth: number;
  haloOuterWidth: number;
  haloRadius: number;
  haloStrength: number;
  lightColor: string;
  stops: SkyboxGradientStop[];
};

export type SkyboxStarfieldStarsParams = {
  uBright: number;
  uBrightVar: number;
  uColorVar: number;
  uDensity: number;
  uGlareSize: number;
  uGlareStr: number;
  uGlareVar: number;
  uLargeStarRarity: number;
  uSeed: number;
  uSizeVar: number;
  uStarSize: number;
};

export type SkyboxStarfieldNebulaParams = {
  uBaseScale: number;
  uCloudCore: [number, number, number];
  uCloudHighlight: [number, number, number];
  uCloudShadow: [number, number, number];
  uColorWarpAmp: number;
  uColorWarpFreq: number;
  uContrast: number;
  uCoverage: number;
  uDensity: number;
  uLightFocus: number;
  uLightIntensity: number;
  uLightLining: number;
  uNebulaExposure: number;
  uNebulaStrength: number;
  uOctaves: number;
  uOpacity: number;
  uSeed: number;
  uSoftness: number;
};

export type SkyboxStarfieldClipParams = {
  altitudeCenterDeg: number;
  altitudeSpanDeg: number;
  azimuthCenterDeg: number;
  azimuthSpanDeg: number;
};

export type SkyboxStarfieldParams = {
  clip: SkyboxStarfieldClipParams;
  nebula: SkyboxStarfieldNebulaParams;
  nebulaField: SkyboxFieldGradientParams;
  quality: SkyboxStarfieldQuality;
  stars: SkyboxStarfieldStarsParams;
};

export type SkyboxCloudMotionMode = "static" | "dynamic";

export type SkyboxCloudFieldParams = {
  octaves: number;
  persistence: number;
  seed: number;
  size: number;
  tiles: number;
};

export type SkyboxCloudLayerParams = {
  altitude: number;
  coverage: number;
  density: number;
  enabled: boolean;
  featureSize: number;
  morphBlend: number;
  morphScale: number;
  morphSpeed: number;
  phaseG: number;
  speed: number;
};

export type SkyboxCloudLightParams = {
  direction: [number, number, number];
  directionLayerId: string | null;
  disc: boolean;
  intensity: number;
  tint: string;
  // Resolution outputs — written by resolveCloudLightReferences from the
  // linked layer's LayerLightSourceDescriptor, same lifecycle as `direction`:
  // overwritten (or stripped) on every resolve, never user-edited.
  resolvedAngularRadius?: number;
  resolvedIntensityScale?: number;
  resolvedSourceDisc?: boolean;
};

// Full custom SkyMesh model. The cloud field is baked only when `field` changes;
// every other value is a shader uniform. `time` is an explicit deterministic
// input, while dynamic motion is driven by the host through `Skybox.setTime()`.
export type SkyboxCloudsParams = {
  cloudHigh: SkyboxCloudLayerParams;
  cloudLow: SkyboxCloudLayerParams;
  debugLayers: boolean;
  exposure: number;
  eyeHeight: number;
  field: SkyboxCloudFieldParams;
  km: number;
  kr: number;
  mieDirectionalG: number;
  mistDensity: number;
  mistHeight: number;
  moon: SkyboxCloudLightParams;
  motionMode: SkyboxCloudMotionMode;
  samples: number;
  sun: SkyboxCloudLightParams;
  time: number;
};

export type SkyboxCloudsLayer = {
  blendMode: SkyboxLayerBlendMode;
  enabled: boolean;
  id: string;
  name: string;
  opacity: number;
  params: SkyboxCloudsParams;
  type: "clouds";
};

export type SkyboxGradientLayer = {
  blendMode: SkyboxLayerBlendMode;
  enabled: boolean;
  id: string;
  name: string;
  opacity: number;
  params: SkyboxGradientParams;
  type: "gradient";
};

export type SkyboxFieldGradientLayer = {
  blendMode: SkyboxLayerBlendMode;
  enabled: boolean;
  id: string;
  name: string;
  opacity: number;
  params: SkyboxFieldGradientParams;
  type: "field-gradient";
};

export type SkyboxImageLayer = {
  blendMode: SkyboxLayerBlendMode;
  enabled: boolean;
  id: string;
  name: string;
  opacity: number;
  params: SkyboxImageParams;
  type: "image";
};

export type SkyboxMoonLayer = {
  blendMode: SkyboxLayerBlendMode;
  enabled: boolean;
  id: string;
  name: string;
  opacity: number;
  params: SkyboxMoonParams;
  type: "moon";
};

export type SkyboxSpotLayer = {
  blendMode: SkyboxLayerBlendMode;
  enabled: boolean;
  id: string;
  name: string;
  opacity: number;
  params: SkyboxSpotParams;
  type: "spot";
};

export type SkyboxStarfieldLayer = {
  blendMode: SkyboxLayerBlendMode;
  enabled: boolean;
  id: string;
  name: string;
  opacity: number;
  params: SkyboxStarfieldParams;
  type: "starfield";
};

export type SkyboxManifestLayer =
  | SkyboxCloudsLayer
  | SkyboxGradientLayer
  | SkyboxFieldGradientLayer
  | SkyboxImageLayer
  | SkyboxMoonLayer
  | SkyboxSpotLayer
  | SkyboxStarfieldLayer;

export type SkyboxManifestGroup = {
  blendMode: SkyboxLayerBlendMode;
  children: SkyboxManifestNode[];
  enabled: boolean;
  id: string;
  name: string;
  opacity: number;
  type: "group";
};

export type SkyboxManifestNode = SkyboxManifestLayer | SkyboxManifestGroup;

export type SkyboxManifestV1Layer =
  | {
      blendMode: SkyboxLayerBlendMode;
      enabled: boolean;
      id: string;
      name: string;
      opacity: number;
      params: SkyboxGradientParams;
      type: "gradient";
    }
  | {
      blendMode: SkyboxLayerBlendMode;
      enabled: boolean;
      id: string;
      name: string;
      opacity: number;
      params: SkyboxFieldGradientParams;
      type: "field-gradient";
    }
  | {
      blendMode: SkyboxLayerBlendMode;
      enabled: boolean;
      id: string;
      name: string;
      opacity: number;
      params: SkyboxImageParams;
      type: "image";
    }
  | {
      blendMode: SkyboxLayerBlendMode;
      enabled: boolean;
      id: string;
      name: string;
      opacity: number;
      params: SkyboxSpotParams;
      type: "spot";
    }
  | {
      blendMode: SkyboxLayerBlendMode;
      enabled: boolean;
      id: string;
      name: string;
      opacity: number;
      params: SkyboxStarfieldParams;
      type: "starfield";
    };

export type SkyboxManifestV1 = {
  composition: {
    mode: SkyboxCompositionMode;
    order: SkyboxCompositionOrder;
  };
  layers: SkyboxManifestV1Layer[];
  version: 1;
};

export type SkyboxManifestV2 = {
  composition: {
    mode: SkyboxCompositionMode;
    order: SkyboxCompositionOrder;
  };
  geometry?: SkyboxGeometryOptions;
  nodes: SkyboxManifestNode[];
  version: 2;
};

export type SkyboxManifest = SkyboxManifestV1 | SkyboxManifestV2;

export type SkyboxRenderMode = "auto" | "live-webgpu" | "live-webgl" | "baked-texture";

export const DEFAULT_SKYBOX_GEOMETRY: SkyboxGeometryOptions = { type: "box" };

function normalizedCloudLightDirection(
  direction: [number, number, number],
): [number, number, number] {
  const length = Math.hypot(direction[0], direction[1], direction[2]);

  if (!Number.isFinite(length) || length <= 1e-8) {
    return [0, 1, 0];
  }

  return [direction[0] / length, direction[1] / length, direction[2] / length];
}

/**
 * Resolves Clouds light links without importing editor state. Links are
 * resolved through the registered adapter's `getLightSource` capability, so
 * the resolver has no per-type knowledge. Source appearance (tint) never
 * leaks into the sky model. Links to a missing layer or to a layer that is
 * not a light source are cleared while the last stored direction is retained;
 * links to an UNREGISTERED type are preserved verbatim (fail-soft for
 * standalone consumers that import the manifest without the builtins barrel).
 */
export function resolveCloudLightReferences(
  manifest: SkyboxManifestV2,
): SkyboxManifestV2 {
  const layers = new Map<string, SkyboxManifestLayer>();

  const collect = (nodes: SkyboxManifestNode[]) => {
    nodes.forEach((node) => {
      if (node.type === "group") {
        collect(node.children);
      } else {
        layers.set(node.id, node);
      }
    });
  };
  collect(manifest.nodes);

  const stripResolved = (
    light: SkyboxCloudLightParams,
  ): SkyboxCloudLightParams => {
    const {
      resolvedAngularRadius: _radius,
      resolvedIntensityScale: _scale,
      resolvedSourceDisc: _disc,
      ...rest
    } = light;
    return rest;
  };

  const resolveLight = (
    light: SkyboxCloudLightParams,
  ): SkyboxCloudLightParams => {
    const unlinked = (directionLayerId: string | null) => ({
      ...stripResolved(light),
      direction: normalizedCloudLightDirection(light.direction),
      directionLayerId,
    });

    if (!light.directionLayerId) {
      return unlinked(null);
    }

    const target = layers.get(light.directionLayerId);
    if (!target) {
      return unlinked(null);
    }

    const adapter = getLayerRuntimeAdapter(target.type);
    if (!adapter) {
      // Fail soft: without the adapter we cannot prove the link invalid, so
      // preserve the link and every stored value (including prior resolution
      // outputs) verbatim for a lossless round-trip.
      return {
        ...light,
        direction: normalizedCloudLightDirection(light.direction),
      };
    }

    const source = adapter.getLightSource?.(target.params) ?? null;
    if (!source) {
      return unlinked(null);
    }

    return {
      ...stripResolved(light),
      direction: normalizedCloudLightDirection(source.direction),
      directionLayerId: light.directionLayerId,
      ...(source.intensityScale !== undefined
        ? { resolvedIntensityScale: source.intensityScale }
        : {}),
      ...(source.angularRadius
        ? { resolvedAngularRadius: source.angularRadius }
        : {}),
      ...(source.rendersOwnDisc ? { resolvedSourceDisc: true } : {}),
    };
  };

  const resolveNodes = (nodes: SkyboxManifestNode[]): SkyboxManifestNode[] =>
    nodes.map((node) => {
      if (node.type === "group") {
        return { ...node, children: resolveNodes(node.children) };
      }

      if (node.type === "moon") {
        return {
          ...node,
          params: normalizeSkyboxMoonParams(node.params),
        };
      }

      if (node.type !== "clouds") {
        return node;
      }

      return {
        ...node,
        params: {
          ...node.params,
          moon: resolveLight(node.params.moon),
          sun: resolveLight(node.params.sun),
        },
      };
    });

  return { ...manifest, nodes: resolveNodes(manifest.nodes) };
}

export function migrateManifestToV2(manifest: SkyboxManifest): SkyboxManifestV2 {
  if (manifest.version === 2) {
    return resolveCloudLightReferences({
      ...manifest,
      geometry: manifest.geometry ?? DEFAULT_SKYBOX_GEOMETRY,
    });
  }

  return resolveCloudLightReferences({
    composition: manifest.composition,
    geometry: DEFAULT_SKYBOX_GEOMETRY,
    nodes: manifest.layers.map((layer) => ({ ...layer })),
    version: 2,
  });
}
