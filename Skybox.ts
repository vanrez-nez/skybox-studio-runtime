import * as THREE from "three";
import { NodeMaterial } from "three/webgpu";
import {
  cameraPosition,
  Fn,
  modelViewProjection,
  normalize,
  positionWorld,
  texture as textureNode,
  uniform,
  vec2,
  wgslFn,
} from "three/tsl";

import { bakeSkyboxImageData, invalidateBakeCache as invalidateGlobalBakeCache } from "./bake";
import {
  clamp,
  parseHexColor,
  type Rgb,
} from "./math";
import type {
  SkyboxGeometryOptions,
  SkyboxImagePlacement,
  SkyboxBakeOptions,
  SkyboxFieldGradientParams,
  SkyboxGradientParams,
  SkyboxLayerBlendMode,
  SkyboxManifest,
  SkyboxManifestLayer,
  SkyboxManifestNode,
  SkyboxManifestV2,
  SkyboxRenderMode,
  SkyboxSpotParams,
} from "./manifest";
import { DEFAULT_SKYBOX_GEOMETRY, migrateManifestToV2 } from "./manifest";
import { normalizeImagePlacement } from "./image-placement-transform";
import { normalizeSpotParams } from "./spot-transform";

type SupportedRenderer = THREE.WebGLRenderer | { isWebGPURenderer?: boolean };
type RuntimeMaterial = THREE.ShaderMaterial | NodeMaterial;
type ShaderLanguage = "glsl" | "wgsl";
type ImageLayerShaderBinding = {
  index: number;
  layer: Extract<SkyboxManifestLayer, { type: "image" }>;
  parameterName: string;
};
type GradientLayerShaderBinding = {
  index: number;
  layer: Extract<SkyboxManifestLayer, { type: "gradient" }>;
  parameterPrefix: string;
  stopCount: number;
};
type FieldGradientLayerShaderBinding = {
  anchorCount: number;
  index: number;
  layer: Extract<SkyboxManifestLayer, { type: "field-gradient" }>;
  parameterPrefix: string;
};
type SpotLayerShaderBinding = {
  index: number;
  layer: Extract<SkyboxManifestLayer, { type: "spot" }>;
  parameterPrefix: string;
  stopCount: number;
};
type CompositionNodeShaderBinding = {
  index: number;
  node: SkyboxManifestNode;
  parameterPrefix: string;
};
type GradientUniformNodes = {
  axis: ReturnType<typeof uniform>;
  layerId: string;
  stops: Array<{
    color: ReturnType<typeof uniform>;
    midpoint: ReturnType<typeof uniform>;
    t: ReturnType<typeof uniform>;
  }>;
};
type FieldGradientUniformNodes = {
  amplitude: ReturnType<typeof uniform>;
  anchors: Array<{
    color: ReturnType<typeof uniform>;
    direction: ReturnType<typeof uniform>;
  }>;
  frequency: ReturnType<typeof uniform>;
  layerId: string;
  mode: ReturnType<typeof uniform>;
  power: ReturnType<typeof uniform>;
};
type ImagePlacementUniformNodes = {
  centerDirection: ReturnType<typeof uniform>;
  halfSize: ReturnType<typeof uniform>;
  layerId: string;
  tangentX: ReturnType<typeof uniform>;
  tangentY: ReturnType<typeof uniform>;
};
type SpotUniformNodes = {
  brightness: ReturnType<typeof uniform>;
  centerDirection: ReturnType<typeof uniform>;
  coreRadius: ReturnType<typeof uniform>;
  coreSoftness: ReturnType<typeof uniform>;
  dispersion: ReturnType<typeof uniform>;
  dogSpread: ReturnType<typeof uniform>;
  dogStrength: ReturnType<typeof uniform>;
  dogStretch: ReturnType<typeof uniform>;
  glareSize: ReturnType<typeof uniform>;
  glareStrength: ReturnType<typeof uniform>;
  glowSize: ReturnType<typeof uniform>;
  glowStrength: ReturnType<typeof uniform>;
  haloInnerWidth: ReturnType<typeof uniform>;
  haloOuterWidth: ReturnType<typeof uniform>;
  haloRadius: ReturnType<typeof uniform>;
  haloStrength: ReturnType<typeof uniform>;
  layerId: string;
  lightColor: ReturnType<typeof uniform>;
  mode: ReturnType<typeof uniform>;
  radius: ReturnType<typeof uniform>;
  stops: Array<{
    color: ReturnType<typeof uniform>;
    midpoint: ReturnType<typeof uniform>;
    t: ReturnType<typeof uniform>;
  }>;
};
type CompositionUniformNodes = {
  blendMode: ReturnType<typeof uniform>;
  nodeId: string;
  opacity: ReturnType<typeof uniform>;
};
type ImageEditorUniformNodes = {
  active: ReturnType<typeof uniform>;
  layerId: string;
};

type ImageTextureMap = Record<string, THREE.Texture | null | undefined>;
type HoveredImageLayerId = string | null;
type WebGpuImageSampleNodeData = {
  sampleInfo: any;
  sampleNode: any;
};
export type SkyboxEditorImageState = {
  hoveredImageLayerId: string | null;
  selectedImageLayerId: string | null;
};

const DEFAULT_MANIFEST: SkyboxManifestV2 = {
  composition: { mode: "alpha-over", order: "bottom-to-top" },
  geometry: DEFAULT_SKYBOX_GEOMETRY,
  nodes: [],
  version: 2,
};

const IMAGE_ACTIVE_RECT_ALPHA = 0.18;
const IMAGE_ACTIVE_BOUNDS_INNER_PIXELS = 0.75;
const IMAGE_ACTIVE_BOUNDS_OUTER_PIXELS = 1.75;
const IMAGE_PROJECTION_DENOM_EPSILON = 0.0001;
const IMAGE_PROJECTION_MAX_EDGE_WIDTH = 0.01;
const DEFAULT_EDITOR_IMAGE_STATE: SkyboxEditorImageState = {
  hoveredImageLayerId: null,
  selectedImageLayerId: null,
};
const EMPTY_IMAGE_TEXTURE = new THREE.DataTexture(
  new Uint8Array([0, 0, 0, 0]),
  1,
  1,
  THREE.RGBAFormat
);

EMPTY_IMAGE_TEXTURE.colorSpace = THREE.SRGBColorSpace;
EMPTY_IMAGE_TEXTURE.needsUpdate = true;

function imageHoverValue(layerId: string, hoveredImageLayerId: HoveredImageLayerId) {
  return hoveredImageLayerId === layerId ? 1 : 0;
}

function imageSelectedValue(layerId: string, selectedImageLayerId: string | null) {
  return selectedImageLayerId === layerId ? 1 : 0;
}

function imageActiveValue(layerId: string, editorImageState: SkyboxEditorImageState) {
  return Math.max(
    imageHoverValue(layerId, editorImageState.hoveredImageLayerId),
    imageSelectedValue(layerId, editorImageState.selectedImageLayerId)
  );
}

function createImageEditorUniformNodes(
  bindings: ImageLayerShaderBinding[],
  editorImageState: SkyboxEditorImageState
): ImageEditorUniformNodes[] {
  return bindings.map((binding) => ({
    active: uniform(imageActiveValue(binding.layer.id, editorImageState)),
    layerId: binding.layer.id,
  }));
}

function applyEditorImageStateToUniformNodes(
  uniforms: ImageEditorUniformNodes[],
  editorImageState: SkyboxEditorImageState
) {
  uniforms.forEach((editorUniform) => {
    (editorUniform.active as any).value = imageActiveValue(editorUniform.layerId, editorImageState);
  });
}

function imageEditorShaderUniforms(
  bindings: ImageLayerShaderBinding[],
  editorImageState: SkyboxEditorImageState
) {
  return Object.fromEntries(
    bindings.map((binding) => [
      `imageActive${binding.index}`,
      { value: imageActiveValue(binding.layer.id, editorImageState) },
    ])
  );
}

function applyEditorImageStateToShaderUniforms(
  material: THREE.ShaderMaterial,
  bindings: ImageLayerShaderBinding[],
  editorImageState: SkyboxEditorImageState
) {
  bindings.forEach((binding) => {
    const activeUniformName = `imageActive${binding.index}`;

    if (material.uniforms[activeUniformName]) {
      material.uniforms[activeUniformName].value = imageActiveValue(binding.layer.id, editorImageState);
    }
  });
}

function attachEditorImageStateUpdater(
  material: RuntimeMaterial,
  updater: (editorImageState: SkyboxEditorImageState) => void
) {
  material.userData.applyEditorImageState = updater;
}

function imagePlacementShaderValues(
  placement: Extract<SkyboxManifestLayer, { type: "image" }>["params"]["placement"]
) {
  if (!placement) {
    return {
      centerDirection: new THREE.Vector3(0, 0, -1),
      halfSize: new THREE.Vector2(0, 0),
      tangentX: new THREE.Vector3(1, 0, 0),
      tangentY: new THREE.Vector3(0, 1, 0),
    };
  }

  const resolvedPlacement = normalizeImagePlacement(placement);

  return {
    centerDirection: new THREE.Vector3(...resolvedPlacement.centerDirection),
    halfSize: new THREE.Vector2(
      Math.max(0, Math.tan(resolvedPlacement.angularWidth / 2)),
      Math.max(0, Math.tan(resolvedPlacement.angularHeight / 2))
    ),
    tangentX: new THREE.Vector3(...resolvedPlacement.tangentX),
    tangentY: new THREE.Vector3(...resolvedPlacement.tangentY),
  };
}

function createImagePlacementUniformNodes(bindings: ImageLayerShaderBinding[]) {
  return bindings.map((binding): ImagePlacementUniformNodes => {
    const placement = imagePlacementShaderValues(binding.layer.params.placement);

    return {
      centerDirection: uniform(placement.centerDirection),
      halfSize: uniform(placement.halfSize),
      layerId: binding.layer.id,
      tangentX: uniform(placement.tangentX),
      tangentY: uniform(placement.tangentY),
    };
  });
}

function applyImageLayerPlacementToUniformNodes(
  uniforms: ImagePlacementUniformNodes[],
  layerId: string,
  placement: SkyboxImagePlacement | null
) {
  const placementUniforms = uniforms.find((nextUniforms) => nextUniforms.layerId === layerId);

  if (!placementUniforms) {
    return;
  }

  const placementValues = imagePlacementShaderValues(placement);

  (placementUniforms.centerDirection as any).value.copy(placementValues.centerDirection);
  (placementUniforms.tangentX as any).value.copy(placementValues.tangentX);
  (placementUniforms.tangentY as any).value.copy(placementValues.tangentY);
  (placementUniforms.halfSize as any).value.copy(placementValues.halfSize);
}

function imagePlacementShaderUniforms(bindings: ImageLayerShaderBinding[]) {
  return Object.fromEntries(
    bindings.flatMap((binding) => {
      const placement = imagePlacementShaderValues(binding.layer.params.placement);

      return [
        [`imageCenterDirection${binding.index}`, { value: placement.centerDirection }],
        [`imageTangentX${binding.index}`, { value: placement.tangentX }],
        [`imageTangentY${binding.index}`, { value: placement.tangentY }],
        [`imageHalfSize${binding.index}`, { value: placement.halfSize }],
      ];
    })
  );
}

function applyImageLayerPlacementToShaderUniforms(
  material: THREE.ShaderMaterial,
  bindings: ImageLayerShaderBinding[],
  layerId: string,
  placement: SkyboxImagePlacement | null
) {
  const binding = bindings.find((nextBinding) => nextBinding.layer.id === layerId);

  if (!binding) {
    return;
  }

  const placementValues = imagePlacementShaderValues(placement);

  material.uniforms[`imageCenterDirection${binding.index}`]?.value.copy(placementValues.centerDirection);
  material.uniforms[`imageTangentX${binding.index}`]?.value.copy(placementValues.tangentX);
  material.uniforms[`imageTangentY${binding.index}`]?.value.copy(placementValues.tangentY);
  material.uniforms[`imageHalfSize${binding.index}`]?.value.copy(placementValues.halfSize);
}

function attachImagePlacementUpdater(
  material: RuntimeMaterial,
  updater: (layerId: string, placement: SkyboxImagePlacement | null) => void
) {
  material.userData.applyImageLayerPlacement = updater;
}

function gradientAxisFromRotation(rotation: number) {
  const radians = (rotation * Math.PI) / 180;

  return new THREE.Vector3(Math.sin(radians), Math.cos(radians), 0).normalize();
}

function sortedGradientStops(params: { stops: SkyboxGradientParams["stops"] }) {
  return [...params.stops]
    .map((stop) => ({
      color: stop.color,
      midpoint: clamp((stop.midpoint ?? 50) / 100, 0.01, 0.99),
      opacity: clamp(stop.opacity / 100),
      t: clamp(stop.location / 100),
    }))
    .sort((firstStop, secondStop) => firstStop.t - secondStop.t);
}

function colorVectorFromStop(stop: ReturnType<typeof sortedGradientStops>[number]) {
  const [red, green, blue] = parseHexColor(stop.color);

  return new THREE.Vector4(red, green, blue, stop.opacity);
}

function fieldGradientModeValue(mode: SkyboxFieldGradientParams["mode"]) {
  return mode === "gaussian" ? 1 : 0;
}

function spotColorModeValue(mode: SkyboxSpotParams["colorMode"]) {
  return mode === "gradient" ? 1 : 0;
}

function blendModeValue(mode: SkyboxLayerBlendMode) {
  switch (mode) {
    case "darken":
      return 1;
    case "multiply":
      return 2;
    case "color-burn":
      return 3;
    case "lighten":
      return 4;
    case "screen":
      return 5;
    case "color-dodge":
      return 6;
    case "overlay":
      return 7;
    case "soft-light":
      return 8;
    case "hard-light":
      return 9;
    case "difference":
      return 10;
    case "exclusion":
      return 11;
    case "normal":
    default:
      return 0;
  }
}

function compositionNodeValues(node: SkyboxManifestNode) {
  return {
    blendMode: blendModeValue(node.blendMode),
    opacity: clamp(node.opacity / 100),
  };
}

function directionVectorFromPoint(x: number, y: number) {
  const lambda = (clamp(x) - 0.5) * Math.PI * 2;
  const phi = (0.5 - clamp(y)) * Math.PI;
  const cosPhi = Math.cos(phi);

  return new THREE.Vector3(
    cosPhi * Math.cos(lambda),
    Math.sin(phi),
    cosPhi * Math.sin(lambda)
  ).normalize();
}

function colorVectorFromHex(color: string) {
  const [red, green, blue] = parseHexColor(color);

  return new THREE.Vector3(red, green, blue);
}

function createGradientUniformNodes(bindings: GradientLayerShaderBinding[]) {
  return bindings.map((binding): GradientUniformNodes => {
    const stops = sortedGradientStops(binding.layer.params);

    return {
      axis: uniform(gradientAxisFromRotation(binding.layer.params.rotation)),
      layerId: binding.layer.id,
      stops: Array.from({ length: binding.stopCount }, (_, stopIndex) => {
        const stop = stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

        return {
          color: uniform(colorVectorFromStop(stop)),
          midpoint: uniform(stop.midpoint),
          t: uniform(stop.t),
        };
      }),
    };
  });
}

function applyGradientLayerParamsToUniformNodes(
  uniforms: GradientUniformNodes[],
  layer: Extract<SkyboxManifestLayer, { type: "gradient" }>
) {
  const gradientUniforms = uniforms.find((nextUniforms) => nextUniforms.layerId === layer.id);

  if (!gradientUniforms) {
    return;
  }

  const stops = sortedGradientStops(layer.params);

  (gradientUniforms.axis as any).value.copy(gradientAxisFromRotation(layer.params.rotation));
  gradientUniforms.stops.forEach((stopUniforms, stopIndex) => {
    const stop = stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

    (stopUniforms.color as any).value.copy(colorVectorFromStop(stop));
    (stopUniforms.midpoint as any).value = stop.midpoint;
    (stopUniforms.t as any).value = stop.t;
  });
}

function gradientShaderUniforms(bindings: GradientLayerShaderBinding[]) {
  return Object.fromEntries(
    bindings.flatMap((binding) => {
      const stops = sortedGradientStops(binding.layer.params);

      return [
        [`${binding.parameterPrefix}Axis`, { value: gradientAxisFromRotation(binding.layer.params.rotation) }],
        ...Array.from({ length: binding.stopCount }, (_, stopIndex) => {
          const stop = stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

          return [
            [`${binding.parameterPrefix}StopColor${stopIndex}`, { value: colorVectorFromStop(stop) }],
            [`${binding.parameterPrefix}StopMidpoint${stopIndex}`, { value: stop.midpoint }],
            [`${binding.parameterPrefix}StopT${stopIndex}`, { value: stop.t }],
          ];
        }).flat(),
      ];
    })
  );
}

function applyGradientLayerParamsToShaderUniforms(
  material: THREE.ShaderMaterial,
  layer: Extract<SkyboxManifestLayer, { type: "gradient" }>,
  bindings: GradientLayerShaderBinding[]
) {
  const binding = bindings.find((nextBinding) => nextBinding.layer.id === layer.id);

  if (!binding) {
    return;
  }

  const stops = sortedGradientStops(layer.params);

  material.uniforms[`${binding.parameterPrefix}Axis`]?.value.copy(
    gradientAxisFromRotation(layer.params.rotation)
  );
  Array.from({ length: binding.stopCount }, (_, stopIndex) => {
    const stop = stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

    material.uniforms[`${binding.parameterPrefix}StopColor${stopIndex}`]?.value.copy(
      colorVectorFromStop(stop)
    );

    if (material.uniforms[`${binding.parameterPrefix}StopT${stopIndex}`]) {
      material.uniforms[`${binding.parameterPrefix}StopT${stopIndex}`].value = stop.t;
    }

    if (material.uniforms[`${binding.parameterPrefix}StopMidpoint${stopIndex}`]) {
      material.uniforms[`${binding.parameterPrefix}StopMidpoint${stopIndex}`].value = stop.midpoint;
    }
  });
}

function createFieldGradientUniformNodes(bindings: FieldGradientLayerShaderBinding[]) {
  return bindings.map((binding): FieldGradientUniformNodes => ({
    amplitude: uniform(clamp(binding.layer.params.amplitude, 0, 0.6)),
    anchors: Array.from({ length: binding.anchorCount }, (_, anchorIndex) => {
      const anchor = binding.layer.params.anchors[anchorIndex] ?? {
        color: "#000000",
        x: 0.5,
        y: 0.5,
      };

      return {
        color: uniform(colorVectorFromHex(anchor.color)),
        direction: uniform(directionVectorFromPoint(anchor.x, anchor.y)),
      };
    }),
    frequency: uniform(Math.max(0.0001, binding.layer.params.frequency)),
    layerId: binding.layer.id,
    mode: uniform(fieldGradientModeValue(binding.layer.params.mode)),
    power: uniform(Math.max(0.0001, binding.layer.params.power)),
  }));
}

function applyFieldGradientLayerParamsToUniformNodes(
  uniforms: FieldGradientUniformNodes[],
  layer: Extract<SkyboxManifestLayer, { type: "field-gradient" }>
) {
  const fieldUniforms = uniforms.find((nextUniforms) => nextUniforms.layerId === layer.id);

  if (!fieldUniforms) {
    return;
  }

  (fieldUniforms.amplitude as any).value = clamp(layer.params.amplitude, 0, 0.6);
  (fieldUniforms.frequency as any).value = Math.max(0.0001, layer.params.frequency);
  (fieldUniforms.mode as any).value = fieldGradientModeValue(layer.params.mode);
  (fieldUniforms.power as any).value = Math.max(0.0001, layer.params.power);
  fieldUniforms.anchors.forEach((anchorUniforms, anchorIndex) => {
    const anchor = layer.params.anchors[anchorIndex] ?? {
      color: "#000000",
      x: 0.5,
      y: 0.5,
    };

    (anchorUniforms.color as any).value.copy(colorVectorFromHex(anchor.color));
    (anchorUniforms.direction as any).value.copy(directionVectorFromPoint(anchor.x, anchor.y));
  });
}

function fieldGradientShaderUniforms(bindings: FieldGradientLayerShaderBinding[]) {
  return Object.fromEntries(
    bindings.flatMap((binding) => [
      [`${binding.parameterPrefix}Amplitude`, { value: clamp(binding.layer.params.amplitude, 0, 0.6) }],
      [`${binding.parameterPrefix}Frequency`, { value: Math.max(0.0001, binding.layer.params.frequency) }],
      [`${binding.parameterPrefix}Mode`, { value: fieldGradientModeValue(binding.layer.params.mode) }],
      [`${binding.parameterPrefix}Power`, { value: Math.max(0.0001, binding.layer.params.power) }],
      ...Array.from({ length: binding.anchorCount }, (_, anchorIndex) => {
        const anchor = binding.layer.params.anchors[anchorIndex] ?? {
          color: "#000000",
          x: 0.5,
          y: 0.5,
        };

        return [
          [`${binding.parameterPrefix}AnchorDirection${anchorIndex}`, { value: directionVectorFromPoint(anchor.x, anchor.y) }],
          [`${binding.parameterPrefix}AnchorColor${anchorIndex}`, { value: colorVectorFromHex(anchor.color) }],
        ];
      }).flat(),
    ])
  );
}

function applyFieldGradientLayerParamsToShaderUniforms(
  material: THREE.ShaderMaterial,
  layer: Extract<SkyboxManifestLayer, { type: "field-gradient" }>,
  bindings: FieldGradientLayerShaderBinding[]
) {
  const binding = bindings.find((nextBinding) => nextBinding.layer.id === layer.id);

  if (!binding) {
    return;
  }

  if (material.uniforms[`${binding.parameterPrefix}Amplitude`]) {
    material.uniforms[`${binding.parameterPrefix}Amplitude`].value = clamp(layer.params.amplitude, 0, 0.6);
  }

  if (material.uniforms[`${binding.parameterPrefix}Frequency`]) {
    material.uniforms[`${binding.parameterPrefix}Frequency`].value = Math.max(0.0001, layer.params.frequency);
  }

  if (material.uniforms[`${binding.parameterPrefix}Mode`]) {
    material.uniforms[`${binding.parameterPrefix}Mode`].value = fieldGradientModeValue(layer.params.mode);
  }

  if (material.uniforms[`${binding.parameterPrefix}Power`]) {
    material.uniforms[`${binding.parameterPrefix}Power`].value = Math.max(0.0001, layer.params.power);
  }

  Array.from({ length: binding.anchorCount }, (_, anchorIndex) => {
    const anchor = layer.params.anchors[anchorIndex] ?? {
      color: "#000000",
      x: 0.5,
      y: 0.5,
    };

    material.uniforms[`${binding.parameterPrefix}AnchorDirection${anchorIndex}`]?.value.copy(
      directionVectorFromPoint(anchor.x, anchor.y)
    );
    material.uniforms[`${binding.parameterPrefix}AnchorColor${anchorIndex}`]?.value.copy(
      colorVectorFromHex(anchor.color)
    );
  });
}

function spotShaderValues(params: SkyboxSpotParams) {
  const spot = normalizeSpotParams(params);

  return {
    brightness: Math.max(0, spot.brightness),
    centerDirection: new THREE.Vector3(...spot.centerDirection).normalize(),
    coreRadius: spot.coreRadius,
    coreSoftness: spot.coreSoftness,
    dispersion: spot.dispersion,
    dogSpread: spot.dogSpread,
    dogStrength: spot.dogStrength,
    dogStretch: spot.dogStretch,
    glareSize: spot.glareSize,
    glareStrength: spot.glareStrength,
    glowSize: spot.glowSize,
    glowStrength: spot.glowStrength,
    haloInnerWidth: spot.haloInnerWidth,
    haloOuterWidth: spot.haloOuterWidth,
    haloRadius: spot.haloRadius,
    haloStrength: spot.haloStrength,
    lightColor: colorVectorFromHex(spot.lightColor),
    mode: spotColorModeValue(spot.colorMode),
    radius: Math.max(0.0001, spot.angularRadius),
    stops: sortedGradientStops(spot),
  };
}

function createSpotUniformNodes(bindings: SpotLayerShaderBinding[]) {
  return bindings.map((binding): SpotUniformNodes => {
    const values = spotShaderValues(binding.layer.params);

    return {
      brightness: uniform(values.brightness),
      centerDirection: uniform(values.centerDirection),
      coreRadius: uniform(values.coreRadius),
      coreSoftness: uniform(values.coreSoftness),
      dispersion: uniform(values.dispersion),
      dogSpread: uniform(values.dogSpread),
      dogStrength: uniform(values.dogStrength),
      dogStretch: uniform(values.dogStretch),
      glareSize: uniform(values.glareSize),
      glareStrength: uniform(values.glareStrength),
      glowSize: uniform(values.glowSize),
      glowStrength: uniform(values.glowStrength),
      haloInnerWidth: uniform(values.haloInnerWidth),
      haloOuterWidth: uniform(values.haloOuterWidth),
      haloRadius: uniform(values.haloRadius),
      haloStrength: uniform(values.haloStrength),
      layerId: binding.layer.id,
      lightColor: uniform(values.lightColor),
      mode: uniform(values.mode),
      radius: uniform(values.radius),
      stops: Array.from({ length: binding.stopCount }, (_, stopIndex) => {
        const stop = values.stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

        return {
          color: uniform(colorVectorFromStop(stop)),
          midpoint: uniform(stop.midpoint),
          t: uniform(stop.t),
        };
      }),
    };
  });
}

function applySpotLayerParamsToUniformNodes(
  uniforms: SpotUniformNodes[],
  layer: Extract<SkyboxManifestLayer, { type: "spot" }>
) {
  const spotUniforms = uniforms.find((nextUniforms) => nextUniforms.layerId === layer.id);

  if (!spotUniforms) {
    return;
  }

  const values = spotShaderValues(layer.params);

  (spotUniforms.brightness as any).value = values.brightness;
  (spotUniforms.centerDirection as any).value.copy(values.centerDirection);
  (spotUniforms.coreRadius as any).value = values.coreRadius;
  (spotUniforms.coreSoftness as any).value = values.coreSoftness;
  (spotUniforms.dispersion as any).value = values.dispersion;
  (spotUniforms.dogSpread as any).value = values.dogSpread;
  (spotUniforms.dogStrength as any).value = values.dogStrength;
  (spotUniforms.dogStretch as any).value = values.dogStretch;
  (spotUniforms.glareSize as any).value = values.glareSize;
  (spotUniforms.glareStrength as any).value = values.glareStrength;
  (spotUniforms.glowSize as any).value = values.glowSize;
  (spotUniforms.glowStrength as any).value = values.glowStrength;
  (spotUniforms.haloInnerWidth as any).value = values.haloInnerWidth;
  (spotUniforms.haloOuterWidth as any).value = values.haloOuterWidth;
  (spotUniforms.haloRadius as any).value = values.haloRadius;
  (spotUniforms.haloStrength as any).value = values.haloStrength;
  (spotUniforms.lightColor as any).value.copy(values.lightColor);
  (spotUniforms.mode as any).value = values.mode;
  (spotUniforms.radius as any).value = values.radius;
  spotUniforms.stops.forEach((stopUniforms, stopIndex) => {
    const stop = values.stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

    (stopUniforms.color as any).value.copy(colorVectorFromStop(stop));
    (stopUniforms.midpoint as any).value = stop.midpoint;
    (stopUniforms.t as any).value = stop.t;
  });
}

function spotShaderUniforms(bindings: SpotLayerShaderBinding[]) {
  return Object.fromEntries(
    bindings.flatMap((binding) => {
      const values = spotShaderValues(binding.layer.params);

      return [
        [`${binding.parameterPrefix}CenterDirection`, { value: values.centerDirection }],
        [`${binding.parameterPrefix}Radius`, { value: values.radius }],
        [`${binding.parameterPrefix}Mode`, { value: values.mode }],
        [`${binding.parameterPrefix}LightColor`, { value: values.lightColor }],
        [`${binding.parameterPrefix}Brightness`, { value: values.brightness }],
        [`${binding.parameterPrefix}CoreRadius`, { value: values.coreRadius }],
        [`${binding.parameterPrefix}CoreSoftness`, { value: values.coreSoftness }],
        [`${binding.parameterPrefix}Dispersion`, { value: values.dispersion }],
        [`${binding.parameterPrefix}DogSpread`, { value: values.dogSpread }],
        [`${binding.parameterPrefix}DogStrength`, { value: values.dogStrength }],
        [`${binding.parameterPrefix}DogStretch`, { value: values.dogStretch }],
        [`${binding.parameterPrefix}GlareSize`, { value: values.glareSize }],
        [`${binding.parameterPrefix}GlareStrength`, { value: values.glareStrength }],
        [`${binding.parameterPrefix}GlowSize`, { value: values.glowSize }],
        [`${binding.parameterPrefix}GlowStrength`, { value: values.glowStrength }],
        [`${binding.parameterPrefix}HaloInnerWidth`, { value: values.haloInnerWidth }],
        [`${binding.parameterPrefix}HaloOuterWidth`, { value: values.haloOuterWidth }],
        [`${binding.parameterPrefix}HaloRadius`, { value: values.haloRadius }],
        [`${binding.parameterPrefix}HaloStrength`, { value: values.haloStrength }],
        ...Array.from({ length: binding.stopCount }, (_, stopIndex) => {
          const stop = values.stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

          return [
            [`${binding.parameterPrefix}StopColor${stopIndex}`, { value: colorVectorFromStop(stop) }],
            [`${binding.parameterPrefix}StopMidpoint${stopIndex}`, { value: stop.midpoint }],
            [`${binding.parameterPrefix}StopT${stopIndex}`, { value: stop.t }],
          ];
        }).flat(),
      ];
    })
  );
}

function applySpotLayerParamsToShaderUniforms(
  material: THREE.ShaderMaterial,
  layer: Extract<SkyboxManifestLayer, { type: "spot" }>,
  bindings: SpotLayerShaderBinding[]
) {
  const binding = bindings.find((nextBinding) => nextBinding.layer.id === layer.id);

  if (!binding) {
    return;
  }

  const values = spotShaderValues(layer.params);

  material.uniforms[`${binding.parameterPrefix}CenterDirection`]?.value.copy(values.centerDirection);
  if (material.uniforms[`${binding.parameterPrefix}Radius`]) {
    material.uniforms[`${binding.parameterPrefix}Radius`].value = values.radius;
  }
  if (material.uniforms[`${binding.parameterPrefix}Mode`]) {
    material.uniforms[`${binding.parameterPrefix}Mode`].value = values.mode;
  }
  material.uniforms[`${binding.parameterPrefix}LightColor`]?.value.copy(values.lightColor);
  if (material.uniforms[`${binding.parameterPrefix}Brightness`]) {
    material.uniforms[`${binding.parameterPrefix}Brightness`].value = values.brightness;
  }
  [
    ["CoreRadius", values.coreRadius],
    ["CoreSoftness", values.coreSoftness],
    ["Dispersion", values.dispersion],
    ["DogSpread", values.dogSpread],
    ["DogStrength", values.dogStrength],
    ["DogStretch", values.dogStretch],
    ["GlareSize", values.glareSize],
    ["GlareStrength", values.glareStrength],
    ["GlowSize", values.glowSize],
    ["GlowStrength", values.glowStrength],
    ["HaloInnerWidth", values.haloInnerWidth],
    ["HaloOuterWidth", values.haloOuterWidth],
    ["HaloRadius", values.haloRadius],
    ["HaloStrength", values.haloStrength],
  ].forEach(([suffix, nextValue]) => {
    if (material.uniforms[`${binding.parameterPrefix}${suffix}`]) {
      material.uniforms[`${binding.parameterPrefix}${suffix}`].value = nextValue;
    }
  });
  Array.from({ length: binding.stopCount }, (_, stopIndex) => {
    const stop = values.stops[stopIndex] ?? { color: "#000000", midpoint: 0.5, opacity: 0, t: 0 };

    material.uniforms[`${binding.parameterPrefix}StopColor${stopIndex}`]?.value.copy(
      colorVectorFromStop(stop)
    );
    if (material.uniforms[`${binding.parameterPrefix}StopMidpoint${stopIndex}`]) {
      material.uniforms[`${binding.parameterPrefix}StopMidpoint${stopIndex}`].value = stop.midpoint;
    }
    if (material.uniforms[`${binding.parameterPrefix}StopT${stopIndex}`]) {
      material.uniforms[`${binding.parameterPrefix}StopT${stopIndex}`].value = stop.t;
    }
  });
}

function createCompositionUniformNodes(bindings: CompositionNodeShaderBinding[]) {
  return bindings.map((binding): CompositionUniformNodes => {
    const values = compositionNodeValues(binding.node);

    return {
      blendMode: uniform(values.blendMode),
      nodeId: binding.node.id,
      opacity: uniform(values.opacity),
    };
  });
}

function findCompositionNode(nodes: SkyboxManifestNode[], nodeId: string): SkyboxManifestNode | null {
  for (const node of nodes) {
    if (!node.enabled) {
      continue;
    }

    if (node.id === nodeId) {
      return node;
    }

    if (node.type === "group") {
      const childNode = findCompositionNode(node.children, nodeId);

      if (childNode) {
        return childNode;
      }
    }
  }

  return null;
}

function applyCompositionParamsToUniformNodes(
  uniforms: CompositionUniformNodes[],
  manifest: SkyboxManifestV2
) {
  uniforms.forEach((compositionUniforms) => {
    const node = findCompositionNode(manifest.nodes, compositionUniforms.nodeId);

    if (!node) {
      return;
    }

    const values = compositionNodeValues(node);

    (compositionUniforms.opacity as any).value = values.opacity;
    (compositionUniforms.blendMode as any).value = values.blendMode;
  });
}

function compositionShaderUniforms(bindings: CompositionNodeShaderBinding[]) {
  return Object.fromEntries(
    bindings.flatMap((binding) => {
      const values = compositionNodeValues(binding.node);

      return [
        [`${binding.parameterPrefix}Opacity`, { value: values.opacity }],
        [`${binding.parameterPrefix}BlendMode`, { value: values.blendMode }],
      ];
    })
  );
}

function applyCompositionParamsToShaderUniforms(
  material: THREE.ShaderMaterial,
  bindings: CompositionNodeShaderBinding[],
  manifest: SkyboxManifestV2
) {
  bindings.forEach((binding) => {
    const node = findCompositionNode(manifest.nodes, binding.node.id);

    if (!node) {
      return;
    }

    const values = compositionNodeValues(node);
    const opacityUniform = material.uniforms[`${binding.parameterPrefix}Opacity`];
    const blendModeUniform = material.uniforms[`${binding.parameterPrefix}BlendMode`];

    if (opacityUniform) {
      opacityUniform.value = values.opacity;
    }

    if (blendModeUniform) {
      blendModeUniform.value = values.blendMode;
    }
  });
}

function forEachGradientLayer(
  nodes: SkyboxManifestNode[],
  callback: (layer: Extract<SkyboxManifestLayer, { type: "gradient" }>) => void
) {
  nodes.forEach((node) => {
    if (!node.enabled) {
      return;
    }

    if (node.type === "group") {
      forEachGradientLayer(node.children, callback);
      return;
    }

    if (node.type === "gradient") {
      callback(node);
    }
  });
}

function forEachFieldGradientLayer(
  nodes: SkyboxManifestNode[],
  callback: (layer: Extract<SkyboxManifestLayer, { type: "field-gradient" }>) => void
) {
  nodes.forEach((node) => {
    if (!node.enabled) {
      return;
    }

    if (node.type === "group") {
      forEachFieldGradientLayer(node.children, callback);
      return;
    }

    if (node.type === "field-gradient") {
      callback(node);
    }
  });
}

function forEachSpotLayer(
  nodes: SkyboxManifestNode[],
  callback: (layer: Extract<SkyboxManifestLayer, { type: "spot" }>) => void
) {
  nodes.forEach((node) => {
    if (!node.enabled) {
      return;
    }

    if (node.type === "group") {
      forEachSpotLayer(node.children, callback);
      return;
    }

    if (node.type === "spot") {
      callback(node);
    }
  });
}

function attachGradientUpdater(
  material: RuntimeMaterial,
  updater: (manifest: SkyboxManifestV2) => void
) {
  material.userData.applyGradientLayerParams = updater;
}

function attachFieldGradientUpdater(
  material: RuntimeMaterial,
  updater: (manifest: SkyboxManifestV2) => void
) {
  material.userData.applyFieldGradientLayerParams = updater;
}

function attachSpotUpdater(
  material: RuntimeMaterial,
  updater: (manifest: SkyboxManifestV2) => void
) {
  material.userData.applySpotLayerParams = updater;
}

function attachCompositionUpdater(
  material: RuntimeMaterial,
  updater: (manifest: SkyboxManifestV2) => void
) {
  material.userData.applyCompositionParams = updater;
}

function resolveGeometryOptions(options?: SkyboxGeometryOptions): SkyboxGeometryOptions {
  return options ?? DEFAULT_SKYBOX_GEOMETRY;
}

export function createSkyboxGeometry(options: SkyboxGeometryOptions = DEFAULT_SKYBOX_GEOMETRY) {
  return resolveGeometryOptions(options).type === "sphere"
    ? new THREE.SphereGeometry(1, 64, 32)
    : new THREE.BoxGeometry(1, 1, 1);
}

function createSphereGridWireGeometry(radius = 1, longitudeSegments = 25, latitudeSegments = 25) {
  const vertices: number[] = [];

  const pushPoint = (theta: number, phi: number) => {
    vertices.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  };

  for (let longitudeIndex = 0; longitudeIndex < longitudeSegments; longitudeIndex += 1) {
    const theta = (longitudeIndex / longitudeSegments) * Math.PI * 2;

    for (let latitudeIndex = 0; latitudeIndex < latitudeSegments; latitudeIndex += 1) {
      const firstPhi = (latitudeIndex / latitudeSegments) * Math.PI;
      const secondPhi = ((latitudeIndex + 1) / latitudeSegments) * Math.PI;

      pushPoint(theta, firstPhi);
      pushPoint(theta, secondPhi);
    }
  }

  for (let latitudeIndex = 1; latitudeIndex < latitudeSegments; latitudeIndex += 1) {
    const phi = (latitudeIndex / latitudeSegments) * Math.PI;

    for (let longitudeIndex = 0; longitudeIndex < longitudeSegments; longitudeIndex += 1) {
      const firstTheta = (longitudeIndex / longitudeSegments) * Math.PI * 2;
      const secondTheta = ((longitudeIndex + 1) / longitudeSegments) * Math.PI * 2;

      pushPoint(firstTheta, phi);
      pushPoint(secondTheta, phi);
    }
  }

  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
}

export function createSkyboxWireGeometry(options: SkyboxGeometryOptions = DEFAULT_SKYBOX_GEOMETRY) {
  if (resolveGeometryOptions(options).type === "sphere") {
    return createSphereGridWireGeometry();
  }

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const wireGeometry = new THREE.EdgesGeometry(boxGeometry);

  boxGeometry.dispose();

  return wireGeometry;
}
function numberLiteral(value: number) {
  return Number.isFinite(value) ? value.toFixed(8) : "0.0";
}

function colorLiteral(color: string, language: ShaderLanguage) {
  const [red, green, blue] = parseHexColor(color);
  const type = language === "wgsl" ? "vec3<f32>" : "vec3";

  return `${type}(${numberLiteral(red)}, ${numberLiteral(green)}, ${numberLiteral(blue)})`;
}

function vec4Literal(color: string, alpha: number, language: ShaderLanguage) {
  const type = language === "wgsl" ? "vec4<f32>" : "vec4";

  return `${type}(${colorLiteral(color, language)}, ${numberLiteral(clamp(alpha))})`;
}

function vectorLiteral(value: number, language: ShaderLanguage) {
  return language === "wgsl" ? `vec3<f32>(${numberLiteral(value)})` : `vec3(${numberLiteral(value)})`;
}

function mutableDeclaration(
  name: string,
  type: string,
  initialValue: string,
  language: ShaderLanguage
) {
  return language === "wgsl"
    ? `var ${name}: ${type} = ${initialValue};`
    : `${type} ${name} = ${initialValue};`;
}

function getRenderableNodes(nodes: SkyboxManifestNode[]) {
  return nodes.filter((node) => node.enabled).reverse();
}

function collectGradientLayerBindings(nodes: SkyboxManifestNode[]) {
  const bindings: GradientLayerShaderBinding[] = [];

  function collect(nextNodes: SkyboxManifestNode[]) {
    nextNodes.forEach((node) => {
      if (!node.enabled) {
        return;
      }

      if (node.type === "group") {
        collect(node.children);
        return;
      }

      if (node.type === "gradient") {
        const index = bindings.length;

        bindings.push({
          index,
          layer: node,
          parameterPrefix: `gradientLayer${index}`,
          stopCount: node.params.stops.length,
        });
      }
    });
  }

  collect(nodes);

  return bindings;
}

function collectFieldGradientLayerBindings(nodes: SkyboxManifestNode[]) {
  const bindings: FieldGradientLayerShaderBinding[] = [];

  function collect(nextNodes: SkyboxManifestNode[]) {
    nextNodes.forEach((node) => {
      if (!node.enabled) {
        return;
      }

      if (node.type === "group") {
        collect(node.children);
        return;
      }

      if (node.type === "field-gradient") {
        const index = bindings.length;

        bindings.push({
          anchorCount: node.params.anchors.length,
          index,
          layer: node,
          parameterPrefix: `fieldGradientLayer${index}`,
        });
      }
    });
  }

  collect(nodes);

  return bindings;
}

function collectImageLayerBindings(nodes: SkyboxManifestNode[]) {
  const bindings: ImageLayerShaderBinding[] = [];

  function collect(nextNodes: SkyboxManifestNode[]) {
    nextNodes.forEach((node) => {
      if (!node.enabled) {
        return;
      }

      if (node.type === "group") {
        collect(node.children);
        return;
      }

      if (node.type === "image") {
        const index = bindings.length;

        bindings.push({
          index,
          layer: node,
          parameterName: `imageLayer${index}`,
        });
      }
    });
  }

  collect(nodes);

  return bindings;
}

function collectSpotLayerBindings(nodes: SkyboxManifestNode[]) {
  const bindings: SpotLayerShaderBinding[] = [];

  function collect(nextNodes: SkyboxManifestNode[]) {
    nextNodes.forEach((node) => {
      if (!node.enabled) {
        return;
      }

      if (node.type === "group") {
        collect(node.children);
        return;
      }

      if (node.type === "spot") {
        const index = bindings.length;

        bindings.push({
          index,
          layer: node,
          parameterPrefix: `spotLayer${index}`,
          stopCount: node.params.stops.length,
        });
      }
    });
  }

  collect(nodes);

  return bindings;
}

function collectCompositionNodeBindings(nodes: SkyboxManifestNode[]) {
  const bindings: CompositionNodeShaderBinding[] = [];

  function collect(nextNodes: SkyboxManifestNode[]) {
    getRenderableNodes(nextNodes).forEach((node) => {
      const index = bindings.length;

      bindings.push({
        index,
        node,
        parameterPrefix: `compositionNode${index}`,
      });

      if (node.type === "group") {
        collect(node.children);
      }
    });
  }

  collect(nodes);

  return bindings;
}

function createGradientBindingMap(bindings: GradientLayerShaderBinding[]) {
  return new Map(bindings.map((binding) => [binding.layer.id, binding]));
}

function createFieldGradientBindingMap(bindings: FieldGradientLayerShaderBinding[]) {
  return new Map(bindings.map((binding) => [binding.layer.id, binding]));
}

function createImageBindingMap(bindings: ImageLayerShaderBinding[]) {
  return new Map(bindings.map((binding) => [binding.layer.id, binding]));
}

function createSpotBindingMap(bindings: SpotLayerShaderBinding[]) {
  return new Map(bindings.map((binding) => [binding.layer.id, binding]));
}

function createCompositionBindingMap(bindings: CompositionNodeShaderBinding[]) {
  return new Map(bindings.map((binding) => [binding.node.id, binding]));
}

function imageVec3Literal(value: [number, number, number], language: ShaderLanguage) {
  const type = language === "wgsl" ? "vec3<f32>" : "vec3";

  return `${type}(${numberLiteral(value[0])}, ${numberLiteral(value[1])}, ${numberLiteral(value[2])})`;
}

function imageSampleInfoExpression(
  binding: ImageLayerShaderBinding,
  language: ShaderLanguage,
  refs: {
    centerDirection: string;
    halfSize: string;
    tangentX: string;
    tangentY: string;
  }
) {
  const { width, height } = binding.layer.params;
  const vec4Type = language === "wgsl" ? "vec4<f32>" : "vec4";
  const declare = language === "wgsl" ? "let" : "float";
  const validDeclare = language === "wgsl" ? "let" : "float";
  const vecDeclare = language === "wgsl" ? "let" : "vec3";

  if (width <= 0 || height <= 0) {
    return `return ${vec4Type}(0.0, 0.0, 0.0, 0.0);`;
  }

  return `
      ${vecDeclare} imageDirection = normalize(direction);
      ${declare} imageDenom = dot(imageDirection, ${refs.centerDirection});
      ${declare} safeImageDenom = max(imageDenom, 0.000001);
      ${declare} projectedX = dot(imageDirection, ${refs.tangentX}) / safeImageDenom;
      ${declare} projectedY = dot(imageDirection, ${refs.tangentY}) / safeImageDenom;
      ${declare} imageU = projectedX / max(${refs.halfSize}.x * 2.0, 0.000001) + 0.5;
      ${declare} imageV = 0.5 - projectedY / max(${refs.halfSize}.y * 2.0, 0.000001);
      ${declare} imageEdgeDistance = min(min(imageU, 1.0 - imageU), min(imageV, 1.0 - imageV));
      ${declare} imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${numberLiteral(IMAGE_PROJECTION_MAX_EDGE_WIDTH)});
      ${declare} imageHardInside = step(${numberLiteral(IMAGE_PROJECTION_DENOM_EPSILON)}, imageDenom) *
        step(0.0, ${refs.halfSize}.x) *
        step(0.0, ${refs.halfSize}.y);
      ${declare} imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      ${validDeclare} imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return ${vec4Type}(imageU, imageV, imageValid, 0.0);
    `;
}

function imageSampleExpression(
  layer: Extract<SkyboxManifestLayer, { type: "image" }>,
  imageBindings: Map<string, ImageLayerShaderBinding>,
  language: ShaderLanguage
) {
  const binding = imageBindings.get(layer.id);
  const vec4Type = language === "wgsl" ? "vec4<f32>" : "vec4";

  if (!binding) {
    return `effectColor = ${vec4Type}(0.0, 0.0, 0.0, 0.0);`;
  }

  if (language === "wgsl") {
    return `effectColor = ${binding.parameterName};`;
  }

  return `{
    vec4 imageSampleInfo = skyboxStudioImageSampleInfo${binding.index}(direction);
    vec4 imageSampleColor = texture2D(imageTexture${binding.index}, imageSampleInfo.xy);
    effectColor = vec4(imageSampleColor.rgb, imageSampleColor.a * imageSampleInfo.z);
  }`;
}

function webGpuImageSampleInfoFunction(binding: ImageLayerShaderBinding) {
  return wgslFn(`
    fn skyboxStudioImageSampleInfo${binding.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${imageSampleInfoExpression(binding, "wgsl", {
        centerDirection: "imageCenterDirection",
        halfSize: "imageHalfSize",
        tangentX: "imageTangentX",
        tangentY: "imageTangentY",
      })}
    }
  `);
}

const webGpuImageMaskFunction = wgslFn(`
  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {
    return vec4<f32>(color.rgb, color.a * valid);
  }
`);

const webGpuImageEditorRectOverlayFunction = wgslFn(`
  fn skyboxStudioApplyImageEditorRectOverlay(
    color: vec4<f32>,
    uv: vec2<f32>,
    valid: f32,
    activeValue: f32
  ) -> vec4<f32> {
    let activeAmount = clamp(activeValue, 0.0, 1.0);
    let rectCoverage = valid * activeAmount;
    let edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${numberLiteral(IMAGE_PROJECTION_MAX_EDGE_WIDTH)});
    let bounds = rectCoverage * (
      1.0 - smoothstep(
        edgeWidth * ${numberLiteral(IMAGE_ACTIVE_BOUNDS_INNER_PIXELS)},
        edgeWidth * ${numberLiteral(IMAGE_ACTIVE_BOUNDS_OUTER_PIXELS)},
        edgeDistance
      )
    );
    let rectAlpha = rectCoverage * ${numberLiteral(IMAGE_ACTIVE_RECT_ALPHA)};
    let overlayAlpha = max(rectAlpha, bounds);
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), overlayAlpha),
      color.a
    );
  }
`);

function glslImageSampleInfoFunctions(bindings: ImageLayerShaderBinding[]) {
  return bindings
    .map(
      (binding) => `
        vec4 skyboxStudioImageSampleInfo${binding.index}(vec3 direction) {
          ${imageSampleInfoExpression(binding, "glsl", {
            centerDirection: `imageCenterDirection${binding.index}`,
            halfSize: `imageHalfSize${binding.index}`,
            tangentX: `imageTangentX${binding.index}`,
            tangentY: `imageTangentY${binding.index}`,
          })}
        }
      `
    )
    .join("\n");
}

function glslImageEditorRectOverlayExpression(bindings: ImageLayerShaderBinding[]) {
  return bindings
    .map(
      (binding) => `
        {
          vec4 imageEditorInfo = skyboxStudioImageSampleInfo${binding.index}(direction);
          float activeAmount = clamp(imageActive${binding.index}, 0.0, 1.0);
          float rectCoverage = imageEditorInfo.z * activeAmount;
          float edgeDistance = min(min(imageEditorInfo.x, 1.0 - imageEditorInfo.x), min(imageEditorInfo.y, 1.0 - imageEditorInfo.y));
          float edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${numberLiteral(IMAGE_PROJECTION_MAX_EDGE_WIDTH)});
          float bounds = rectCoverage * (
            1.0 - smoothstep(
              edgeWidth * ${numberLiteral(IMAGE_ACTIVE_BOUNDS_INNER_PIXELS)},
              edgeWidth * ${numberLiteral(IMAGE_ACTIVE_BOUNDS_OUTER_PIXELS)},
              edgeDistance
            )
          );
          float rectAlpha = rectCoverage * ${numberLiteral(IMAGE_ACTIVE_RECT_ALPHA)};
          float overlayAlpha = max(rectAlpha, bounds);
          composedColor = mix(composedColor, vec3(1.0, 0.0, 0.0), overlayAlpha);
        }
      `
    )
    .join("\n");
}

function getImageTexture(
  imageTextures: Map<string, THREE.Texture>,
  layer: Extract<SkyboxManifestLayer, { type: "image" }>
) {
  return imageTextures.get(layer.id) ?? EMPTY_IMAGE_TEXTURE;
}

function imageTextureUniforms(
  bindings: ImageLayerShaderBinding[],
  imageTextures: Map<string, THREE.Texture>
) {
  return Object.fromEntries(
    bindings.map((binding) => [
      `imageTexture${binding.index}`,
      { value: getImageTexture(imageTextures, binding.layer) },
    ])
  );
}

function updateImageTextureUniforms(
  material: THREE.ShaderMaterial,
  bindings: ImageLayerShaderBinding[],
  imageTextures: Map<string, THREE.Texture>
) {
  bindings.forEach((binding) => {
    const uniformName = `imageTexture${binding.index}`;

    if (material.uniforms[uniformName]) {
      material.uniforms[uniformName].value = getImageTexture(imageTextures, binding.layer);
    }
  });
}

function gradientSampleExpression(binding: GradientLayerShaderBinding, language: ShaderLanguage) {
  const vec4Type = language === "wgsl" ? "vec4<f32>" : "vec4";
  const vec3Type = language === "wgsl" ? "vec3<f32>" : "vec3";
  const declare = language === "wgsl" ? "let" : "float";

  if (binding.stopCount === 0) {
    return `effectColor = ${vec4Type}(0.0, 0.0, 0.0, 0.0);`;
  }

  const branches = Array.from({ length: Math.max(0, binding.stopCount - 1) }, (_, index) => {
    const currentStopT = `${binding.parameterPrefix}StopT${index}`;
    const nextStopT = `${binding.parameterPrefix}StopT${index + 1}`;
    const localT = `localT${index}`;
    const segmentMidpoint = `segmentMidpoint${index}`;
    const midpointT = `midpointT${index}`;
    const midpointUniform = `${binding.parameterPrefix}StopMidpoint${index}`;
    const lowerMidpoint = `${localT} / max(${segmentMidpoint} * 2.0, 0.00001)`;
    const upperMidpoint = `0.5 + (${localT} - ${segmentMidpoint}) / max((1.0 - ${segmentMidpoint}) * 2.0, 0.00001)`;
    const midpointExpression = language === "wgsl"
      ? `select(${upperMidpoint}, ${lowerMidpoint}, ${localT} <= ${segmentMidpoint})`
      : `(${localT} <= ${segmentMidpoint} ? ${lowerMidpoint} : ${upperMidpoint})`;
    const declarationSuffix = language === "wgsl" ? ": f32" : "";
    const keyword = index === 0 ? "if" : "else if";

    return `${keyword} (gradientT <= ${nextStopT}) {
      ${declare} ${localT}${declarationSuffix} = clamp((gradientT - ${currentStopT}) / max(${nextStopT} - ${currentStopT}, 0.00001), 0.0, 1.0);
      ${declare} ${segmentMidpoint}${declarationSuffix} = clamp(${midpointUniform}, 0.01, 0.99);
      ${declare} ${midpointT}${declarationSuffix} = ${midpointExpression};
      effectColor = mix(${binding.parameterPrefix}StopColor${index}, ${binding.parameterPrefix}StopColor${index + 1}, ${midpointT});
    }`;
  });
  const lastStopIndex = binding.stopCount - 1;

  return `{
    ${language === "wgsl" ? "let" : "vec3"} gradientAxis = normalize(${binding.parameterPrefix}Axis);
    ${language === "wgsl" ? "let" : "float"} gradientT = dot(direction, gradientAxis) * 0.5 + 0.5;
    ${branches.join("\n")}
    ${branches.length > 0 ? "else" : ""} {
      effectColor = ${binding.parameterPrefix}StopColor${lastStopIndex};
    }
  }`;
}

function fieldGradientSampleExpression(binding: FieldGradientLayerShaderBinding, language: ShaderLanguage) {
  const vec4Type = language === "wgsl" ? "vec4<f32>" : "vec4";
  const vec3Type = language === "wgsl" ? "vec3<f32>" : "vec3";
  const declare = language === "wgsl" ? "let" : "float";

  if (binding.anchorCount === 0) {
    return `effectColor = ${vec4Type}(0.0, 0.0, 0.0, 0.0);`;
  }

  const anchorLines = Array.from({ length: binding.anchorCount }, (_, anchorIndex) => `{
        ${declare} anchorDirection = normalize(${binding.parameterPrefix}AnchorDirection${anchorIndex});
        ${declare} anchorDistance = 1.0 - clamp(dot(fieldDirection, anchorDirection), -1.0, 1.0);
        ${declare} fieldSigma = 0.46 / max(${binding.parameterPrefix}Power, 0.0001);
        ${declare} inverseDistanceWeight = 1.0 / pow(anchorDistance + 0.0005, max(${binding.parameterPrefix}Power, 0.0001));
        ${declare} gaussianWeight = exp(-(anchorDistance * anchorDistance) / max(2.0 * fieldSigma * fieldSigma, 0.000001));
        ${declare} weight = ${
          language === "wgsl"
            ? `select(inverseDistanceWeight, gaussianWeight, ${binding.parameterPrefix}Mode > 0.5)`
            : `(${binding.parameterPrefix}Mode > 0.5 ? gaussianWeight : inverseDistanceWeight)`
        };
        weightedColor += ${binding.parameterPrefix}AnchorColor${anchorIndex} * weight;
        weightSum += weight;
      }`
  ).join("\n");

  return `{
    ${declare} warpAmplitude = clamp(${binding.parameterPrefix}Amplitude, 0.0, 0.6);
    ${declare} warpFrequency = max(${binding.parameterPrefix}Frequency, 0.0001);
    ${mutableDeclaration("fieldDirection", vec3Type, "direction", language)}
    ${declare} warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      ${declare} warpX = sin((direction.y * warpFrequency + 0.23) * ${numberLiteral(
        Math.PI * 2
      )}) * cos((direction.z * warpFrequency + 0.41) * ${numberLiteral(Math.PI * 2)});
      ${declare} warpY = cos((direction.z * warpFrequency + 0.17) * ${numberLiteral(
        Math.PI * 2
      )}) * sin((direction.x * warpFrequency + 0.37) * ${numberLiteral(Math.PI * 2)});
      ${declare} warpZ = sin((direction.x * warpFrequency - 0.31) * ${numberLiteral(
        Math.PI * 2
      )}) * cos((direction.y * warpFrequency + 0.29) * ${numberLiteral(Math.PI * 2)});
      fieldDirection = normalize(direction + ${vec3Type}(warpX, warpY, warpZ) * warpScale);
    }
    ${mutableDeclaration("weightedColor", vec3Type, `${vec3Type}(0.0)`, language)}
    ${mutableDeclaration("weightSum", language === "wgsl" ? "f32" : "float", "0.0", language)}
    ${anchorLines}
    if (weightSum > 0.0) {
      effectColor = ${vec4Type}(weightedColor / weightSum, 1.0);
    } else {
      effectColor = ${vec4Type}(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}

function spotGradientSampleExpression(binding: SpotLayerShaderBinding, language: ShaderLanguage) {
  const declare = language === "wgsl" ? "let" : "float";
  const branches = Array.from({ length: Math.max(0, binding.stopCount - 1) }, (_, index) => {
    const currentStopT = `${binding.parameterPrefix}StopT${index}`;
    const nextStopT = `${binding.parameterPrefix}StopT${index + 1}`;
    const localT = `spotLocalT${index}`;
    const segmentMidpoint = `spotSegmentMidpoint${index}`;
    const midpointT = `spotMidpointT${index}`;
    const midpointUniform = `${binding.parameterPrefix}StopMidpoint${index}`;
    const lowerMidpoint = `${localT} / max(${segmentMidpoint} * 2.0, 0.00001)`;
    const upperMidpoint = `0.5 + (${localT} - ${segmentMidpoint}) / max((1.0 - ${segmentMidpoint}) * 2.0, 0.00001)`;
    const midpointExpression = language === "wgsl"
      ? `select(${upperMidpoint}, ${lowerMidpoint}, ${localT} <= ${segmentMidpoint})`
      : `(${localT} <= ${segmentMidpoint} ? ${lowerMidpoint} : ${upperMidpoint})`;
    const declarationSuffix = language === "wgsl" ? ": f32" : "";
    const keyword = index === 0 ? "if" : "else if";

    return `${keyword} (spotT <= ${nextStopT}) {
        ${declare} ${localT}${declarationSuffix} = clamp((spotT - ${currentStopT}) / max(${nextStopT} - ${currentStopT}, 0.00001), 0.0, 1.0);
        ${declare} ${segmentMidpoint}${declarationSuffix} = clamp(${midpointUniform}, 0.01, 0.99);
        ${declare} ${midpointT}${declarationSuffix} = ${midpointExpression};
        effectColor = mix(${binding.parameterPrefix}StopColor${index}, ${binding.parameterPrefix}StopColor${index + 1}, ${midpointT});
      }`;
  });
  const lastStopIndex = Math.max(0, binding.stopCount - 1);

  if (binding.stopCount === 0) {
    return "";
  }

  return `if (spotT <= 1.0) {
      ${branches.join("\n")}
      ${branches.length > 0 ? "else" : ""} {
        effectColor = ${binding.parameterPrefix}StopColor${lastStopIndex};
      }
    }`;
}

function spotSampleExpression(binding: SpotLayerShaderBinding, language: ShaderLanguage) {
  const vec4Type = language === "wgsl" ? "vec4<f32>" : "vec4";
  const vec3Type = language === "wgsl" ? "vec3<f32>" : "vec3";
  const declare = language === "wgsl" ? "let" : "float";
  const colorModeCondition = `${binding.parameterPrefix}Mode > 0.5`;
  const gradientBranch = spotGradientSampleExpression(binding, language);

  return `{
    ${language === "wgsl" ? "let" : "vec3"} spotCenter = normalize(${binding.parameterPrefix}CenterDirection);
    ${declare} spotDot = clamp(dot(normalize(direction), spotCenter), -1.0, 1.0);
    ${declare} spotT = acos(spotDot) / max(${binding.parameterPrefix}Radius, 0.0001);
    if (${colorModeCondition}) {
      ${gradientBranch || `effectColor = ${vec4Type}(0.0, 0.0, 0.0, 0.0);`}
    } else {
      ${language === "wgsl" ? "let" : "vec3"} spotTangentX = normalize(cross(${vec3Type}(0.0, 1.0, 0.0), spotCenter));
      ${language === "wgsl" ? "let" : "vec3"} spotTangentY = normalize(cross(spotCenter, spotTangentX));
      ${declare} spotDenom = max(dot(normalize(direction), spotCenter), 0.000001);
      ${declare} spotLocalX = dot(normalize(direction), spotTangentX) / spotDenom / max(${binding.parameterPrefix}Radius, 0.0001);
      ${declare} spotLocalY = dot(normalize(direction), spotTangentY) / spotDenom / max(${binding.parameterPrefix}Radius, 0.0001);
      ${declare} spotD = length(${language === "wgsl" ? "vec2<f32>" : "vec2"}(spotLocalX, spotLocalY));

      ${declare} spotCore = pow(clamp(1.0 - spotD / ${binding.parameterPrefix}CoreRadius, 0.0, 1.0), ${binding.parameterPrefix}CoreSoftness);
      ${declare} spotGlow = pow(clamp(1.0 - spotD / ${binding.parameterPrefix}GlowSize, 0.0, 1.0), 2.0) * ${binding.parameterPrefix}GlowStrength;
      ${declare} spotGlare = pow(clamp(1.0 - spotD / ${binding.parameterPrefix}GlareSize, 0.0, 1.0), 1.15) * ${binding.parameterPrefix}GlareStrength;
      ${declare} spotMonoLight = (spotCore + spotGlow + spotGlare) * ${binding.parameterPrefix}Brightness;
      ${mutableDeclaration("spotColor", vec3Type, `${binding.parameterPrefix}LightColor * spotMonoLight + ${vec3Type}(max(spotMonoLight - 1.0, 0.0))`, language)}

      ${declare} spotHaloInner = max(${binding.parameterPrefix}HaloInnerWidth, 0.0001);
      ${declare} spotHaloOuter = max(${binding.parameterPrefix}HaloOuterWidth, 0.0001);
      ${declare} spotHaloDelta = spotD - ${binding.parameterPrefix}HaloRadius;
      ${declare} spotHaloWidth = ${language === "wgsl" ? "select(spotHaloOuter, spotHaloInner, spotHaloDelta < 0.0)" : "(spotHaloDelta < 0.0 ? spotHaloInner : spotHaloOuter)"};
      ${declare} spotHaloEnvelope = exp(-pow(spotHaloDelta / spotHaloWidth, 2.0));
      ${declare} spotHaloT = clamp((spotD - (${binding.parameterPrefix}HaloRadius - spotHaloInner)) / (spotHaloInner + spotHaloOuter), 0.0, 1.0);
      ${mutableDeclaration("spotSpectrum", vec3Type, `${vec3Type}(1.0, 0.12, 0.05)`, language)}
      spotSpectrum = mix(spotSpectrum, ${vec3Type}(1.0, 0.55, 0.10), smoothstep(0.00, 0.28, spotHaloT));
      spotSpectrum = mix(spotSpectrum, ${vec3Type}(1.0, 0.93, 0.60), smoothstep(0.22, 0.45, spotHaloT));
      spotSpectrum = mix(spotSpectrum, ${vec3Type}(1.0), smoothstep(0.42, 0.60, spotHaloT));
      spotSpectrum = mix(spotSpectrum, ${vec3Type}(0.55, 0.80, 1.0), smoothstep(0.62, 0.85, spotHaloT));
      spotSpectrum = mix(spotSpectrum, ${vec3Type}(0.35, 0.50, 1.0), smoothstep(0.85, 1.00, spotHaloT));
      ${language === "wgsl" ? "let" : "vec3"} spotHaloLayerColor = mix(${vec3Type}(1.0), spotSpectrum, ${binding.parameterPrefix}Dispersion);
      ${language === "wgsl" ? "let" : "vec3"} spotHaloTinted = spotHaloLayerColor * mix(${vec3Type}(1.0), ${binding.parameterPrefix}LightColor, 0.82);
      ${language === "wgsl" ? "let" : "vec3"} spotHaloColor = mix(${binding.parameterPrefix}LightColor, spotHaloTinted, 0.82);
      ${declare} spotHaloLight = spotHaloEnvelope * ${binding.parameterPrefix}HaloStrength * ${binding.parameterPrefix}Brightness;
      spotColor += spotHaloColor * spotHaloLight + ${vec3Type}(max(spotHaloLight - 1.2, 0.0) * 0.22);

      ${declare} spotAxisDistance = abs(spotLocalY);
      ${declare} spotDogX = abs(spotLocalX);
      ${declare} spotDogBody = exp(-pow((spotDogX - ${binding.parameterPrefix}HaloRadius) / max(${binding.parameterPrefix}DogSpread, 0.0001), 2.0)) *
        exp(-pow(spotAxisDistance / max(${binding.parameterPrefix}DogSpread * 0.72, 0.0001), 2.0));
      ${declare} spotDogTail = smoothstep(${binding.parameterPrefix}HaloRadius, ${binding.parameterPrefix}HaloRadius + max(${binding.parameterPrefix}DogStretch, 0.0001), spotDogX) *
        (1.0 - smoothstep(${binding.parameterPrefix}HaloRadius + max(${binding.parameterPrefix}DogStretch, 0.0001), ${binding.parameterPrefix}HaloRadius + max(${binding.parameterPrefix}DogStretch * 2.2, 0.0001), spotDogX)) *
        exp(-pow(spotAxisDistance / max(${binding.parameterPrefix}DogSpread * 0.9, 0.0001), 2.0));
      ${declare} spotDogT = clamp((spotDogX - (${binding.parameterPrefix}HaloRadius - ${binding.parameterPrefix}DogSpread * 1.4)) / max(${binding.parameterPrefix}DogSpread * 3.5, 0.0001), 0.0, 1.0);
      ${mutableDeclaration("spotDogSpectrum", vec3Type, `${vec3Type}(1.0, 0.12, 0.05)`, language)}
      spotDogSpectrum = mix(spotDogSpectrum, ${vec3Type}(1.0, 0.55, 0.10), smoothstep(0.00, 0.28, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, ${vec3Type}(1.0, 0.93, 0.60), smoothstep(0.22, 0.45, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, ${vec3Type}(1.0), smoothstep(0.42, 0.60, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, ${vec3Type}(0.55, 0.80, 1.0), smoothstep(0.62, 0.85, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, ${vec3Type}(0.35, 0.50, 1.0), smoothstep(0.85, 1.00, spotDogT));
      ${language === "wgsl" ? "let" : "vec3"} spotDogLayerColor = mix(${vec3Type}(1.0), spotDogSpectrum, ${binding.parameterPrefix}Dispersion);
      ${language === "wgsl" ? "let" : "vec3"} spotDogTinted = spotDogLayerColor * mix(${vec3Type}(1.0), ${binding.parameterPrefix}LightColor, 0.82);
      ${language === "wgsl" ? "let" : "vec3"} spotDogColor = mix(${binding.parameterPrefix}LightColor, spotDogTinted, 0.82);
      ${declare} spotDogLight = (spotDogBody + spotDogTail * 0.28) * ${binding.parameterPrefix}DogStrength * ${binding.parameterPrefix}Brightness;
      spotColor += spotDogColor * spotDogLight + ${vec3Type}(max(spotDogLight - 1.1, 0.0) * 0.18);

      ${declare} spotAlpha = clamp(max(max(spotColor.r, spotColor.g), spotColor.b), 0.0, 1.0);
      effectColor = ${vec4Type}(spotColor / max(spotAlpha, 0.00001), spotAlpha);
    }
  }`;
}

function effectExpression(
  layer: SkyboxManifestLayer,
  language: ShaderLanguage,
  gradientBindings: Map<string, GradientLayerShaderBinding>,
  fieldGradientBindings: Map<string, FieldGradientLayerShaderBinding>,
  imageBindings: Map<string, ImageLayerShaderBinding>,
  spotBindings: Map<string, SpotLayerShaderBinding>
) {
  if (layer.type === "gradient") {
    const binding = gradientBindings.get(layer.id);

    return binding
      ? gradientSampleExpression(binding, language)
      : `effectColor = ${language === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
  }

  if (layer.type === "field-gradient") {
    const binding = fieldGradientBindings.get(layer.id);

    return binding
      ? fieldGradientSampleExpression(binding, language)
      : `effectColor = ${language === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
  }

  if (layer.type === "spot") {
    const binding = spotBindings.get(layer.id);

    return binding
      ? spotSampleExpression(binding, language)
      : `effectColor = ${language === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
  }

  return imageSampleExpression(layer, imageBindings, language);
}

function selectExpression(condition: string, whenTrue: string, whenFalse: string, language: ShaderLanguage) {
  return language === "wgsl"
    ? `select(${whenFalse}, ${whenTrue}, ${condition})`
    : `((${condition}) ? ${whenTrue} : ${whenFalse})`;
}

function blendColorExpression(mode: SkyboxLayerBlendMode, language: ShaderLanguage) {
  if (language === "glsl") {
    switch (mode) {
      case "darken":
        return "min(composedColor, effectColor.rgb)";
      case "multiply":
        return "composedColor * effectColor.rgb";
      case "color-burn":
        return "blendColorBurn(composedColor, effectColor.rgb)";
      case "lighten":
        return "max(composedColor, effectColor.rgb)";
      case "screen":
        return "composedColor + effectColor.rgb - composedColor * effectColor.rgb";
      case "color-dodge":
        return "blendColorDodge(composedColor, effectColor.rgb)";
      case "overlay":
        return "blendOverlay(composedColor, effectColor.rgb)";
      case "soft-light":
        return "blendSoftLight(composedColor, effectColor.rgb)";
      case "hard-light":
        return "blendHardLight(composedColor, effectColor.rgb)";
      case "difference":
        return "abs(composedColor - effectColor.rgb)";
      case "exclusion":
        return "composedColor + effectColor.rgb - 2.0 * composedColor * effectColor.rgb";
      case "normal":
      default:
        return "effectColor.rgb";
    }
  }

  const one = vectorLiteral(1, language);
  const half = vectorLiteral(0.5, language);
  const zero = vectorLiteral(0, language);
  const source = "effectColor.rgb";
  const backdrop = "composedColor";

  switch (mode) {
    case "darken":
      return `min(${backdrop}, ${source})`;
    case "multiply":
      return `${backdrop} * ${source}`;
    case "color-burn":
      return selectExpression(
        `${backdrop} == ${one}`,
        one,
        selectExpression(
          `${source} == ${zero}`,
          zero,
          `${one} - min(${one}, (${one} - ${backdrop}) / ${source})`,
          language
        ),
        language
      );
    case "lighten":
      return `max(${backdrop}, ${source})`;
    case "screen":
      return `${backdrop} + ${source} - ${backdrop} * ${source}`;
    case "color-dodge":
      return selectExpression(
        `${backdrop} == ${zero}`,
        zero,
        selectExpression(
          `${source} == ${one}`,
          one,
          `min(${one}, ${backdrop} / (${one} - ${source}))`,
          language
        ),
        language
      );
    case "overlay":
      return selectExpression(
        `${backdrop} <= ${half}`,
        `2.0 * ${backdrop} * ${source}`,
        `${one} - 2.0 * (${one} - ${backdrop}) * (${one} - ${source})`,
        language
      );
    case "soft-light":
      return selectExpression(
        `${source} <= ${half}`,
        `${backdrop} - (${one} - 2.0 * ${source}) * ${backdrop} * (${one} - ${backdrop})`,
        `${backdrop} + (2.0 * ${source} - ${one}) * (softLightD - ${backdrop})`,
        language
      );
    case "hard-light":
      return selectExpression(
        `${source} <= ${half}`,
        `2.0 * ${backdrop} * ${source}`,
        `${backdrop} + (2.0 * ${source} - ${one}) - ${backdrop} * (2.0 * ${source} - ${one})`,
        language
      );
    case "difference":
      return `abs(${backdrop} - ${source})`;
    case "exclusion":
      return `${backdrop} + ${source} - 2.0 * ${backdrop} * ${source}`;
    case "normal":
    default:
      return source;
  }
}

function blendSoftLightSetupExpression(language: ShaderLanguage) {
  if (language === "glsl") {
    return "";
  }

  const vec3Type = language === "wgsl" ? "vec3<f32>" : "vec3";
  const declaration = language === "wgsl" ? "let" : "vec3";

  return `${declaration} softLightD = ${selectExpression(
    `composedColor <= ${vec3Type}(0.25)`,
    `((16.0 * composedColor - ${vec3Type}(12.0)) * composedColor + ${vec3Type}(4.0)) * composedColor`,
    "sqrt(composedColor)",
    language
  )};`;
}

function blendModeCondition(blendModeRef: string, mode: SkyboxLayerBlendMode) {
  const value = blendModeValue(mode);

  return `${blendModeRef} >= ${numberLiteral(value - 0.5)} && ${blendModeRef} < ${numberLiteral(value + 0.5)}`;
}

function blendAssignmentBlock(blendModeRef: string, language: ShaderLanguage) {
  const vec3Type = language === "wgsl" ? "vec3<f32>" : "vec3";
  const blendModes: SkyboxLayerBlendMode[] = [
    "darken",
    "multiply",
    "color-burn",
    "lighten",
    "screen",
    "color-dodge",
    "overlay",
    "soft-light",
    "hard-light",
    "difference",
    "exclusion",
  ];
  const branches = blendModes
    .map((mode, index) => `${index === 0 ? "if" : "else if"} (${blendModeCondition(blendModeRef, mode)}) {
          blendedColor = ${blendColorExpression(mode, language)};
        }`)
    .join("\n");

  return `${blendSoftLightSetupExpression(language)}
        ${mutableDeclaration("blendedColor", vec3Type, "effectColor.rgb", language)}
        ${branches}
        blendedColor = clamp(blendedColor, ${vec3Type}(0.0), ${vec3Type}(1.0));`;
}

function composeNodesExpression(
  nodes: SkyboxManifestNode[],
  language: ShaderLanguage,
  gradientBindings: Map<string, GradientLayerShaderBinding>,
  fieldGradientBindings: Map<string, FieldGradientLayerShaderBinding>,
  imageBindings: Map<string, ImageLayerShaderBinding>,
  spotBindings: Map<string, SpotLayerShaderBinding>,
  compositionBindings: Map<string, CompositionNodeShaderBinding>,
  depth = 0
): string {
  const vec3Type = language === "wgsl" ? "vec3<f32>" : "vec3";
  const vec4Type = language === "wgsl" ? "vec4<f32>" : "vec4";

  return getRenderableNodes(nodes)
    .map((node, index) => {
      const sourceExpression =
        node.type === "group"
          ? `effectColor = ${vec4Type}(${(() => {
              const variableName = `groupColor${depth}_${index}`;
              return variableName;
            })()}, 1.0);`
          : effectExpression(
              node,
              language,
              gradientBindings,
              fieldGradientBindings,
              imageBindings,
              spotBindings
            );
      const groupColorName = `groupColor${depth}_${index}`;
      const compositionBinding = compositionBindings.get(node.id);
      const opacityRef = compositionBinding
        ? `${compositionBinding.parameterPrefix}Opacity`
        : numberLiteral(node.opacity / 100);
      const blendModeRef = compositionBinding
        ? `${compositionBinding.parameterPrefix}BlendMode`
        : numberLiteral(blendModeValue(node.blendMode));
      const groupBlock =
        node.type === "group"
          ? `${mutableDeclaration(groupColorName, vec3Type, `${vec3Type}(0.0)`, language)}
        {
          ${mutableDeclaration("previousComposedColor", vec3Type, "composedColor", language)}
          composedColor = ${vec3Type}(0.0);
          ${composeNodesExpression(
            node.children,
            language,
            gradientBindings,
            fieldGradientBindings,
            imageBindings,
            spotBindings,
            compositionBindings,
            depth + 1
          )}
          ${groupColorName} = composedColor;
          composedColor = previousComposedColor;
        }`
          : "";

      return `{
        ${groupBlock}
        ${mutableDeclaration("effectColor", vec4Type, `${vec4Type}(0.0)`, language)}
        ${sourceExpression}
        ${language === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${opacityRef}, 0.0, 1.0);
        ${blendAssignmentBlock(blendModeRef, language)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          ${vec3Type}(0.0),
          ${vec3Type}(1.0)
        );
      }`;
    })
    .join("\n");
}

function createSkyboxFunction(
  manifest: SkyboxManifestV2,
  gradientBindings: GradientLayerShaderBinding[],
  fieldGradientBindings: FieldGradientLayerShaderBinding[],
  imageBindings: ImageLayerShaderBinding[],
  spotBindings: SpotLayerShaderBinding[],
  compositionBindings: CompositionNodeShaderBinding[]
) {
  const gradientBindingMap = createGradientBindingMap(gradientBindings);
  const fieldGradientBindingMap = createFieldGradientBindingMap(fieldGradientBindings);
  const imageBindingMap = createImageBindingMap(imageBindings);
  const spotBindingMap = createSpotBindingMap(spotBindings);
  const compositionBindingMap = createCompositionBindingMap(compositionBindings);
  const layerBlocks = composeNodesExpression(
    manifest.nodes,
    "wgsl",
    gradientBindingMap,
    fieldGradientBindingMap,
    imageBindingMap,
    spotBindingMap,
    compositionBindingMap
  );
  const gradientParameters = gradientBindings
    .flatMap((binding) => [
      `,
      ${binding.parameterPrefix}Axis: vec3<f32>`,
      ...Array.from({ length: binding.stopCount }, (_, stopIndex) => [
        `,
      ${binding.parameterPrefix}StopColor${stopIndex}: vec4<f32>`,
        `,
      ${binding.parameterPrefix}StopMidpoint${stopIndex}: f32`,
        `,
      ${binding.parameterPrefix}StopT${stopIndex}: f32`,
      ]).flat(),
    ])
    .join("");
  const fieldGradientParameters = fieldGradientBindings
    .flatMap((binding) => [
      `,
      ${binding.parameterPrefix}Amplitude: f32`,
      `,
      ${binding.parameterPrefix}Frequency: f32`,
      `,
      ${binding.parameterPrefix}Mode: f32`,
      `,
      ${binding.parameterPrefix}Power: f32`,
      ...Array.from({ length: binding.anchorCount }, (_, anchorIndex) => [
        `,
      ${binding.parameterPrefix}AnchorDirection${anchorIndex}: vec3<f32>`,
        `,
      ${binding.parameterPrefix}AnchorColor${anchorIndex}: vec3<f32>`,
      ]).flat(),
    ])
    .join("");
  const imageParameters = imageBindings
    .map((binding) => `,
      ${binding.parameterName}: vec4<f32>`)
    .join("");
  const compositionParameters = compositionBindings
    .flatMap((binding) => [
      `,
      ${binding.parameterPrefix}Opacity: f32`,
      `,
      ${binding.parameterPrefix}BlendMode: f32`,
    ])
    .join("");
  const spotParameters = spotBindings
    .flatMap((binding) => [
      `,
      ${binding.parameterPrefix}CenterDirection: vec3<f32>`,
      `,
      ${binding.parameterPrefix}Radius: f32`,
      `,
      ${binding.parameterPrefix}Mode: f32`,
      `,
      ${binding.parameterPrefix}LightColor: vec3<f32>`,
      `,
      ${binding.parameterPrefix}Brightness: f32`,
      `,
      ${binding.parameterPrefix}CoreRadius: f32`,
      `,
      ${binding.parameterPrefix}CoreSoftness: f32`,
      `,
      ${binding.parameterPrefix}Dispersion: f32`,
      `,
      ${binding.parameterPrefix}DogSpread: f32`,
      `,
      ${binding.parameterPrefix}DogStrength: f32`,
      `,
      ${binding.parameterPrefix}DogStretch: f32`,
      `,
      ${binding.parameterPrefix}GlareSize: f32`,
      `,
      ${binding.parameterPrefix}GlareStrength: f32`,
      `,
      ${binding.parameterPrefix}GlowSize: f32`,
      `,
      ${binding.parameterPrefix}GlowStrength: f32`,
      `,
      ${binding.parameterPrefix}HaloInnerWidth: f32`,
      `,
      ${binding.parameterPrefix}HaloOuterWidth: f32`,
      `,
      ${binding.parameterPrefix}HaloRadius: f32`,
      `,
      ${binding.parameterPrefix}HaloStrength: f32`,
      ...Array.from({ length: binding.stopCount }, (_, stopIndex) => [
        `,
      ${binding.parameterPrefix}StopColor${stopIndex}: vec4<f32>`,
        `,
      ${binding.parameterPrefix}StopMidpoint${stopIndex}: f32`,
        `,
      ${binding.parameterPrefix}StopT${stopIndex}: f32`,
      ]).flat(),
    ])
    .join("");

  return wgslFn(`
    fn skyboxStudioSample(
      direction: vec3<f32>${gradientParameters}${fieldGradientParameters}${imageParameters}${spotParameters}${compositionParameters}
    ) -> vec4<f32> {
      var composedColor = vec3<f32>(0.0);
      ${layerBlocks}
      return vec4<f32>(composedColor, 1.0);
    }
  `);
}

function createWebGpuImageSampleNodes(
  bindings: ImageLayerShaderBinding[],
  direction: unknown,
  imageTextures: Map<string, THREE.Texture>,
  placementUniforms: ImagePlacementUniformNodes[]
) {
  const sampleData = new Map<string, WebGpuImageSampleNodeData>();
  const sampleNodes = Object.fromEntries(
    bindings.map((binding) => {
      const placement = placementUniforms[binding.index];
      const sampleInfo = webGpuImageSampleInfoFunction(binding)({
        direction,
        imageCenterDirection: placement.centerDirection,
        imageHalfSize: placement.halfSize,
        imageTangentX: placement.tangentX,
        imageTangentY: placement.tangentY,
      } as any) as any;
      const sampleUv = vec2(sampleInfo.x, sampleInfo.y);
      const sampleColor = textureNode(
        getImageTexture(imageTextures, binding.layer),
        sampleUv
      );
      const maskedColor = webGpuImageMaskFunction({
        color: sampleColor,
        valid: sampleInfo.z,
      });

      sampleData.set(binding.layer.id, {
        sampleInfo,
        sampleNode: maskedColor,
      });

      return [binding.parameterName, maskedColor];
    })
  );

  return { sampleData, sampleNodes };
}

function createWebGpuMaterial(
  manifest: SkyboxManifestV2,
  editorImageState: SkyboxEditorImageState,
  imageTextures: Map<string, THREE.Texture>,
  editorPresentationEnabled: boolean
) {
  const material = new NodeMaterial();
  const gradientBindings = collectGradientLayerBindings(manifest.nodes);
  const fieldGradientBindings = collectFieldGradientLayerBindings(manifest.nodes);
  const imageBindings = collectImageLayerBindings(manifest.nodes);
  const spotBindings = collectSpotLayerBindings(manifest.nodes);
  const compositionBindings = collectCompositionNodeBindings(manifest.nodes);
  const skyboxSample = createSkyboxFunction(
    manifest,
    gradientBindings,
    fieldGradientBindings,
    imageBindings,
    spotBindings,
    compositionBindings
  );
  const gradientUniforms = createGradientUniformNodes(gradientBindings);
  const fieldGradientUniforms = createFieldGradientUniformNodes(fieldGradientBindings);
  const spotUniforms = createSpotUniformNodes(spotBindings);
  const compositionUniforms = createCompositionUniformNodes(compositionBindings);
  const imageEditorUniforms = editorPresentationEnabled
    ? createImageEditorUniformNodes(imageBindings, editorImageState)
    : null;
  const imagePlacementUniforms = createImagePlacementUniformNodes(imageBindings);
  const vertexNode = Fn(() => {
    const position = modelViewProjection as any;

    position.z.assign(position.w);

    return position;
  })();

  material.side = THREE.BackSide;
  material.depthTest = false;
  material.depthWrite = false;
  material.vertexNode = vertexNode as any;
  const direction = normalize(positionWorld.sub(cameraPosition));
  const imageSampleNodes = createWebGpuImageSampleNodes(
    imageBindings,
    direction,
    imageTextures,
    imagePlacementUniforms
  );
  let colorNode = skyboxSample({
    direction,
    ...Object.fromEntries(
      gradientBindings.flatMap((binding) => {
        const gradientUniform = gradientUniforms[binding.index];

        return [
          [`${binding.parameterPrefix}Axis`, gradientUniform.axis],
          ...Array.from({ length: binding.stopCount }, (_, stopIndex) => [
            [`${binding.parameterPrefix}StopColor${stopIndex}`, gradientUniform.stops[stopIndex].color],
            [`${binding.parameterPrefix}StopMidpoint${stopIndex}`, gradientUniform.stops[stopIndex].midpoint],
            [`${binding.parameterPrefix}StopT${stopIndex}`, gradientUniform.stops[stopIndex].t],
          ]).flat(),
        ];
      })
    ),
    ...Object.fromEntries(
      fieldGradientBindings.flatMap((binding) => {
        const fieldGradientUniform = fieldGradientUniforms[binding.index];

        return [
          [`${binding.parameterPrefix}Amplitude`, fieldGradientUniform.amplitude],
          [`${binding.parameterPrefix}Frequency`, fieldGradientUniform.frequency],
          [`${binding.parameterPrefix}Mode`, fieldGradientUniform.mode],
          [`${binding.parameterPrefix}Power`, fieldGradientUniform.power],
          ...Array.from({ length: binding.anchorCount }, (_, anchorIndex) => [
            [`${binding.parameterPrefix}AnchorDirection${anchorIndex}`, fieldGradientUniform.anchors[anchorIndex].direction],
            [`${binding.parameterPrefix}AnchorColor${anchorIndex}`, fieldGradientUniform.anchors[anchorIndex].color],
          ]).flat(),
        ];
      })
    ),
    ...Object.fromEntries(
      spotBindings.flatMap((binding) => {
        const spotUniform = spotUniforms[binding.index];

        return [
          [`${binding.parameterPrefix}CenterDirection`, spotUniform.centerDirection],
          [`${binding.parameterPrefix}Radius`, spotUniform.radius],
          [`${binding.parameterPrefix}Mode`, spotUniform.mode],
          [`${binding.parameterPrefix}LightColor`, spotUniform.lightColor],
          [`${binding.parameterPrefix}Brightness`, spotUniform.brightness],
          [`${binding.parameterPrefix}CoreRadius`, spotUniform.coreRadius],
          [`${binding.parameterPrefix}CoreSoftness`, spotUniform.coreSoftness],
          [`${binding.parameterPrefix}Dispersion`, spotUniform.dispersion],
          [`${binding.parameterPrefix}DogSpread`, spotUniform.dogSpread],
          [`${binding.parameterPrefix}DogStrength`, spotUniform.dogStrength],
          [`${binding.parameterPrefix}DogStretch`, spotUniform.dogStretch],
          [`${binding.parameterPrefix}GlareSize`, spotUniform.glareSize],
          [`${binding.parameterPrefix}GlareStrength`, spotUniform.glareStrength],
          [`${binding.parameterPrefix}GlowSize`, spotUniform.glowSize],
          [`${binding.parameterPrefix}GlowStrength`, spotUniform.glowStrength],
          [`${binding.parameterPrefix}HaloInnerWidth`, spotUniform.haloInnerWidth],
          [`${binding.parameterPrefix}HaloOuterWidth`, spotUniform.haloOuterWidth],
          [`${binding.parameterPrefix}HaloRadius`, spotUniform.haloRadius],
          [`${binding.parameterPrefix}HaloStrength`, spotUniform.haloStrength],
          ...Array.from({ length: binding.stopCount }, (_, stopIndex) => [
            [`${binding.parameterPrefix}StopColor${stopIndex}`, spotUniform.stops[stopIndex].color],
            [`${binding.parameterPrefix}StopMidpoint${stopIndex}`, spotUniform.stops[stopIndex].midpoint],
            [`${binding.parameterPrefix}StopT${stopIndex}`, spotUniform.stops[stopIndex].t],
          ]).flat(),
        ];
      })
    ),
    ...imageSampleNodes.sampleNodes,
    ...Object.fromEntries(
      compositionBindings.flatMap((binding) => {
        const compositionUniform = compositionUniforms[binding.index];

        return [
          [`${binding.parameterPrefix}Opacity`, compositionUniform.opacity],
          [`${binding.parameterPrefix}BlendMode`, compositionUniform.blendMode],
        ];
      })
    ),
  }) as any;
  if (imageEditorUniforms) {
    imageBindings.forEach((binding) => {
      const sampleInfo = imageSampleNodes.sampleData.get(binding.layer.id)?.sampleInfo;

      if (!sampleInfo) {
        return;
      }

      colorNode = webGpuImageEditorRectOverlayFunction({
        color: colorNode,
        activeValue: imageEditorUniforms[binding.index].active,
        uv: vec2(sampleInfo.x, sampleInfo.y),
        valid: sampleInfo.z,
      }) as any;
    });
  }
  material.colorNode = colorNode as any;
  if (imageEditorUniforms) {
    attachEditorImageStateUpdater(material, (nextEditorImageState) =>
      applyEditorImageStateToUniformNodes(imageEditorUniforms, nextEditorImageState)
    );
  }
  attachGradientUpdater(material, (nextManifest) =>
    forEachGradientLayer(nextManifest.nodes, (layer) =>
      applyGradientLayerParamsToUniformNodes(gradientUniforms, layer)
    )
  );
  attachFieldGradientUpdater(material, (nextManifest) =>
    forEachFieldGradientLayer(nextManifest.nodes, (layer) =>
      applyFieldGradientLayerParamsToUniformNodes(fieldGradientUniforms, layer)
    )
  );
  attachSpotUpdater(material, (nextManifest) =>
    forEachSpotLayer(nextManifest.nodes, (layer) =>
      applySpotLayerParamsToUniformNodes(spotUniforms, layer)
    )
  );
  attachCompositionUpdater(material, (nextManifest) =>
    applyCompositionParamsToUniformNodes(compositionUniforms, nextManifest)
  );
  attachImagePlacementUpdater(material, (layerId, placement) =>
    applyImageLayerPlacementToUniformNodes(imagePlacementUniforms, layerId, placement)
  );

  return material;
}

const directionToEquirectUv = wgslFn(`
  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {
    let normalizedDirection = normalize(direction);
    let longitude = atan2(normalizedDirection.z, normalizedDirection.x);
    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));

    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);
  }
`);

function createWebGpuBakedMaterial(texture: THREE.Texture) {
  const material = new NodeMaterial();
  const vertexNode = Fn(() => {
    const position = modelViewProjection as any;

    position.z.assign(position.w);

    return position;
  })();
  const direction = normalize(positionWorld.sub(cameraPosition));

  material.side = THREE.BackSide;
  material.depthTest = false;
  material.depthWrite = false;
  material.vertexNode = vertexNode as any;
  material.colorNode = textureNode(texture, directionToEquirectUv({ direction }) as any) as any;

  return material;
}

function createWebGlMaterial(
  manifest: SkyboxManifestV2,
  editorImageState: SkyboxEditorImageState,
  imageTextures: Map<string, THREE.Texture>,
  editorPresentationEnabled: boolean
) {
  const gradientBindings = collectGradientLayerBindings(manifest.nodes);
  const fieldGradientBindings = collectFieldGradientLayerBindings(manifest.nodes);
  const imageBindings = collectImageLayerBindings(manifest.nodes);
  const spotBindings = collectSpotLayerBindings(manifest.nodes);
  const compositionBindings = collectCompositionNodeBindings(manifest.nodes);
  const gradientBindingMap = createGradientBindingMap(gradientBindings);
  const fieldGradientBindingMap = createFieldGradientBindingMap(fieldGradientBindings);
  const imageBindingMap = createImageBindingMap(imageBindings);
  const spotBindingMap = createSpotBindingMap(spotBindings);
  const compositionBindingMap = createCompositionBindingMap(compositionBindings);
  const layerBlocks = composeNodesExpression(
    manifest.nodes,
    "glsl",
    gradientBindingMap,
    fieldGradientBindingMap,
    imageBindingMap,
    spotBindingMap,
    compositionBindingMap
  );
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...gradientShaderUniforms(gradientBindings),
      ...fieldGradientShaderUniforms(fieldGradientBindings),
      ...spotShaderUniforms(spotBindings),
      ...compositionShaderUniforms(compositionBindings),
      ...(editorPresentationEnabled ? imageEditorShaderUniforms(imageBindings, editorImageState) : {}),
      ...imagePlacementShaderUniforms(imageBindings),
      ...imageTextureUniforms(imageBindings, imageTextures),
    },

    depthTest: false,
    depthWrite: false,
    side: THREE.BackSide,
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vDirection = worldPosition.xyz - cameraPosition;
        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = clipPosition.xyww;
      }
    `,
    fragmentShader: `
      precision highp float;
      ${gradientBindings
        .map((binding) => `uniform vec3 ${binding.parameterPrefix}Axis;
      ${Array.from({ length: binding.stopCount }, (_, stopIndex) => `uniform vec4 ${binding.parameterPrefix}StopColor${stopIndex};
      uniform float ${binding.parameterPrefix}StopMidpoint${stopIndex};
      uniform float ${binding.parameterPrefix}StopT${stopIndex};`).join("\n")}`)
        .join("\n")}
      ${fieldGradientBindings
        .map((binding) => `uniform float ${binding.parameterPrefix}Amplitude;
      uniform float ${binding.parameterPrefix}Frequency;
      uniform float ${binding.parameterPrefix}Mode;
      uniform float ${binding.parameterPrefix}Power;
      ${Array.from({ length: binding.anchorCount }, (_, anchorIndex) => `uniform vec3 ${binding.parameterPrefix}AnchorDirection${anchorIndex};
      uniform vec3 ${binding.parameterPrefix}AnchorColor${anchorIndex};`).join("\n")}`)
        .join("\n")}
      ${spotBindings
        .map((binding) => `uniform vec3 ${binding.parameterPrefix}CenterDirection;
      uniform float ${binding.parameterPrefix}Radius;
      uniform float ${binding.parameterPrefix}Mode;
      uniform vec3 ${binding.parameterPrefix}LightColor;
      uniform float ${binding.parameterPrefix}Brightness;
      uniform float ${binding.parameterPrefix}CoreRadius;
      uniform float ${binding.parameterPrefix}CoreSoftness;
      uniform float ${binding.parameterPrefix}Dispersion;
      uniform float ${binding.parameterPrefix}DogSpread;
      uniform float ${binding.parameterPrefix}DogStrength;
      uniform float ${binding.parameterPrefix}DogStretch;
      uniform float ${binding.parameterPrefix}GlareSize;
      uniform float ${binding.parameterPrefix}GlareStrength;
      uniform float ${binding.parameterPrefix}GlowSize;
      uniform float ${binding.parameterPrefix}GlowStrength;
      uniform float ${binding.parameterPrefix}HaloInnerWidth;
      uniform float ${binding.parameterPrefix}HaloOuterWidth;
      uniform float ${binding.parameterPrefix}HaloRadius;
      uniform float ${binding.parameterPrefix}HaloStrength;
      ${Array.from({ length: binding.stopCount }, (_, stopIndex) => `uniform vec4 ${binding.parameterPrefix}StopColor${stopIndex};
      uniform float ${binding.parameterPrefix}StopMidpoint${stopIndex};
      uniform float ${binding.parameterPrefix}StopT${stopIndex};`).join("\n")}`)
        .join("\n")}
      ${imageBindings
        .map(
          (binding) => `uniform sampler2D imageTexture${binding.index};
      uniform vec3 imageCenterDirection${binding.index};
      uniform vec3 imageTangentX${binding.index};
      uniform vec3 imageTangentY${binding.index};
      uniform vec2 imageHalfSize${binding.index};${
        editorPresentationEnabled
          ? `
      uniform float imageActive${binding.index};`
          : ""
      }`
        )
        .join("\n")}
      ${compositionBindings
        .map((binding) => `uniform float ${binding.parameterPrefix}Opacity;
      uniform float ${binding.parameterPrefix}BlendMode;`)
        .join("\n")}
      varying vec3 vDirection;
      ${glslImageSampleInfoFunctions(imageBindings)}

      float softLightDChannel(float backdrop) {
        return backdrop <= 0.25
          ? ((16.0 * backdrop - 12.0) * backdrop + 4.0) * backdrop
          : sqrt(backdrop);
      }

      float blendColorBurnChannel(float backdrop, float source) {
        if (backdrop == 1.0) {
          return 1.0;
        }

        if (source == 0.0) {
          return 0.0;
        }

        return 1.0 - min(1.0, (1.0 - backdrop) / source);
      }

      float blendColorDodgeChannel(float backdrop, float source) {
        if (backdrop == 0.0) {
          return 0.0;
        }

        if (source == 1.0) {
          return 1.0;
        }

        return min(1.0, backdrop / (1.0 - source));
      }

      float blendOverlayChannel(float backdrop, float source) {
        return backdrop <= 0.5
          ? 2.0 * backdrop * source
          : 1.0 - 2.0 * (1.0 - backdrop) * (1.0 - source);
      }

      float blendSoftLightChannel(float backdrop, float source) {
        return source <= 0.5
          ? backdrop - (1.0 - 2.0 * source) * backdrop * (1.0 - backdrop)
          : backdrop + (2.0 * source - 1.0) * (softLightDChannel(backdrop) - backdrop);
      }

      float blendHardLightChannel(float backdrop, float source) {
        return source <= 0.5
          ? 2.0 * backdrop * source
          : backdrop + (2.0 * source - 1.0) - backdrop * (2.0 * source - 1.0);
      }

      vec3 blendColorBurn(vec3 backdrop, vec3 source) {
        return vec3(
          blendColorBurnChannel(backdrop.r, source.r),
          blendColorBurnChannel(backdrop.g, source.g),
          blendColorBurnChannel(backdrop.b, source.b)
        );
      }

      vec3 blendColorDodge(vec3 backdrop, vec3 source) {
        return vec3(
          blendColorDodgeChannel(backdrop.r, source.r),
          blendColorDodgeChannel(backdrop.g, source.g),
          blendColorDodgeChannel(backdrop.b, source.b)
        );
      }

      vec3 blendOverlay(vec3 backdrop, vec3 source) {
        return vec3(
          blendOverlayChannel(backdrop.r, source.r),
          blendOverlayChannel(backdrop.g, source.g),
          blendOverlayChannel(backdrop.b, source.b)
        );
      }

      vec3 blendSoftLight(vec3 backdrop, vec3 source) {
        return vec3(
          blendSoftLightChannel(backdrop.r, source.r),
          blendSoftLightChannel(backdrop.g, source.g),
          blendSoftLightChannel(backdrop.b, source.b)
        );
      }

      vec3 blendHardLight(vec3 backdrop, vec3 source) {
        return vec3(
          blendHardLightChannel(backdrop.r, source.r),
          blendHardLightChannel(backdrop.g, source.g),
          blendHardLightChannel(backdrop.b, source.b)
        );
      }

      void main() {
        vec3 direction = normalize(vDirection);
        vec3 composedColor = vec3(0.0);
        ${layerBlocks}
        ${editorPresentationEnabled ? glslImageEditorRectOverlayExpression(imageBindings) : ""}
        gl_FragColor = vec4(composedColor, 1.0);
      }
    `,
  });

  if (imageBindings.length > 0) {
    (material.extensions as { derivatives?: boolean }).derivatives = true;
  }

  if (editorPresentationEnabled) {
    attachEditorImageStateUpdater(material, (nextEditorImageState) =>
      applyEditorImageStateToShaderUniforms(material, imageBindings, nextEditorImageState)
    );
  }
  attachGradientUpdater(material, (nextManifest) =>
    forEachGradientLayer(nextManifest.nodes, (layer) =>
      applyGradientLayerParamsToShaderUniforms(material, layer, gradientBindings)
    )
  );
  attachFieldGradientUpdater(material, (nextManifest) =>
    forEachFieldGradientLayer(nextManifest.nodes, (layer) =>
      applyFieldGradientLayerParamsToShaderUniforms(material, layer, fieldGradientBindings)
    )
  );
  attachSpotUpdater(material, (nextManifest) =>
    forEachSpotLayer(nextManifest.nodes, (layer) =>
      applySpotLayerParamsToShaderUniforms(material, layer, spotBindings)
    )
  );
  attachCompositionUpdater(material, (nextManifest) =>
    applyCompositionParamsToShaderUniforms(material, compositionBindings, nextManifest)
  );
  attachImagePlacementUpdater(material, (layerId, placement) =>
    applyImageLayerPlacementToShaderUniforms(material, imageBindings, layerId, placement)
  );
  material.userData.applyImageTextures = (textures: Map<string, THREE.Texture>) =>
    updateImageTextureUniforms(material, imageBindings, textures);

  return material;
}

function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  return new OffscreenCanvas(width, height);
}

export function createBakedSkyboxTexture(manifest: SkyboxManifest, options: SkyboxBakeOptions = {}) {
  const bakedImage = bakeSkyboxImageData(manifest, options);
  const canvas = createCanvas(bakedImage.width, bakedImage.height);
  const context = canvas.getContext("2d");

  if (!context || !("putImageData" in context)) {
    throw new Error("Skybox runtime: unable to create a 2D canvas context for baking.");
  }

  context.putImageData(new ImageData(bakedImage.data, bakedImage.width, bakedImage.height), 0, 0);

  const texture = new THREE.CanvasTexture(canvas as HTMLCanvasElement);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;

  return texture;
}

function createWebGlBakedMaterial(texture: THREE.Texture) {
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    side: THREE.BackSide,
    uniforms: {
      skyboxTexture: { value: texture },
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vDirection = worldPosition.xyz - cameraPosition;
        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = clipPosition.xyww;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform sampler2D skyboxTexture;
      varying vec3 vDirection;

      const float PI = 3.141592653589793;

      vec2 directionToEquirectUv(vec3 direction) {
        vec3 normalizedDirection = normalize(direction);
        float longitude = atan(normalizedDirection.z, normalizedDirection.x);
        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));

        return vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);
      }

      void main() {
        vec3 direction = normalize(vDirection);
        vec4 sampledColor = texture2D(skyboxTexture, directionToEquirectUv(direction));
        gl_FragColor = vec4(sampledColor.rgb, sampledColor.a);
      }
    `,
  });

  return material;
}

function createBakedMaterialFromTexture(
  texture: THREE.Texture,
  renderer?: SupportedRenderer | null
) {
  return isWebGpuRenderer(renderer)
    ? createWebGpuBakedMaterial(texture)
    : createWebGlBakedMaterial(texture);
}

function isWebGpuRenderer(renderer?: SupportedRenderer | null) {
  return Boolean(renderer && "isWebGPURenderer" in renderer && renderer.isWebGPURenderer);
}

function resolveRenderMode(mode: SkyboxRenderMode, renderer?: SupportedRenderer | null): Exclude<SkyboxRenderMode, "auto"> {
  if (mode !== "auto") {
    return mode;
  }

  return isWebGpuRenderer(renderer) ? "live-webgpu" : "live-webgl";
}

function createMaterialTopologyKey(
  manifest: SkyboxManifestV2,
  renderMode: Exclude<SkyboxRenderMode, "auto">,
  editorPresentationEnabled: boolean
) {
  const nodeKey = (node: SkyboxManifestNode): unknown => {
    if (node.type === "group") {
      return {
        children: node.children.map(nodeKey),
        enabled: node.enabled,
        id: node.id,
        type: node.type,
      };
    }

    if (node.type === "gradient") {
      return {
        enabled: node.enabled,
        id: node.id,
        mode: node.params.mode,
        stopCount: node.params.stops.length,
        type: node.type,
      };
    }

    if (node.type === "image") {
      return {
        enabled: node.enabled,
        hasPlacement: Boolean(node.params.placement),
        hasSrc: Boolean(node.params.src),
        height: node.params.height,
        id: node.id,
        type: node.type,
        width: node.params.width,
      };
    }

    if (node.type === "spot") {
      return {
        enabled: node.enabled,
        id: node.id,
        stopCount: node.params.stops.length,
        type: node.type,
      };
    }

    return {
      anchorCount: node.params.anchors.length,
      enabled: node.enabled,
      id: node.id,
      type: node.type,
    };
  };

  return JSON.stringify({
    editorPresentationEnabled,
    geometry: manifest.geometry?.type ?? DEFAULT_SKYBOX_GEOMETRY.type,
    nodes: manifest.nodes.map(nodeKey),
    renderMode,
  });
}

export class Skybox extends THREE.Mesh<THREE.BufferGeometry, RuntimeMaterial> {
  #bakeOptions: SkyboxBakeOptions = {};
  #editorImageState: SkyboxEditorImageState = { ...DEFAULT_EDITOR_IMAGE_STATE };
  #editorPresentationEnabled = false;
  #geometryOptions: SkyboxGeometryOptions = DEFAULT_SKYBOX_GEOMETRY;
  #imagePlacementOverrides = new Map<string, SkyboxImagePlacement | null>();
  #imageTextures = new Map<string, THREE.Texture>();
  #manifest: SkyboxManifestV2 = DEFAULT_MANIFEST;
  #materialTopologyKey: string | null = null;
  #ownedTexture: THREE.Texture | null = null;
  #renderMode: SkyboxRenderMode = "auto";
  #renderer: SupportedRenderer | null = null;

  constructor() {
    super(
      createSkyboxGeometry(DEFAULT_SKYBOX_GEOMETRY),
      createWebGpuMaterial(DEFAULT_MANIFEST, DEFAULT_EDITOR_IMAGE_STATE, new Map(), false)
    );
    this.frustumCulled = false;
    this.renderOrder = -1;
  }

  fromManifest(manifest: SkyboxManifest) {
    this.#manifest = migrateManifestToV2(manifest);
    this.applyGeometry(this.#manifest.geometry ?? DEFAULT_SKYBOX_GEOMETRY);
    return this;
  }

  setGeometry(options: SkyboxGeometryOptions) {
    this.applyGeometry(options);

    return this;
  }

  setBakeOptions(options: SkyboxBakeOptions) {
    this.#bakeOptions = { ...this.#bakeOptions, ...options };
    return this;
  }

  setRenderer(renderer: SupportedRenderer | null) {
    this.#renderer = renderer;
    return this;
  }

  setRenderMode(mode: SkyboxRenderMode) {
    this.#renderMode = mode;
    return this;
  }

  setImageTexture(layerId: string, texture: THREE.Texture | null) {
    if (texture) {
      this.#imageTextures.set(layerId, texture);
    } else {
      this.#imageTextures.delete(layerId);
    }

    this.#materialTopologyKey = null;
    this.setManifest(this.#manifest);

    return this;
  }

  setImageTextures(textures: ImageTextureMap) {
    this.#imageTextures.clear();

    Object.entries(textures).forEach(([layerId, texture]) => {
      if (texture) {
        this.#imageTextures.set(layerId, texture);
      }
    });

    this.#materialTopologyKey = null;
    this.setManifest(this.#manifest);

    return this;
  }

  otherOverridingSetup() {
    return this;
  }

  load(renderer?: SupportedRenderer) {
    if (renderer) {
      this.#renderer = renderer;
    }

    this.setManifest(this.#manifest);
    return this;
  }

  private applyGeometry(options: SkyboxGeometryOptions) {
    const nextOptions = resolveGeometryOptions(options);

    if (this.#geometryOptions.type === nextOptions.type && this.geometry) {
      return;
    }

    const previousGeometry = this.geometry;
    this.#geometryOptions = nextOptions;
    this.geometry = createSkyboxGeometry(nextOptions);
    previousGeometry.dispose();
  }

  private disposeOwnedTexture() {
    this.#ownedTexture?.dispose();
    this.#ownedTexture = null;
  }

  private replaceMaterial(nextMaterial: RuntimeMaterial, ownedTexture: THREE.Texture | null = null) {
    const previousMaterial = this.material;

    this.material = nextMaterial;
    nextMaterial.userData.applyEditorImageState?.(this.#editorImageState);
    this.#imagePlacementOverrides.forEach((placement, layerId) => {
      nextMaterial.userData.applyImageLayerPlacement?.(layerId, placement);
    });
    previousMaterial.dispose();
    this.disposeOwnedTexture();
    this.#ownedTexture = ownedTexture;
  }

  private applyLiveManifestUniformUpdates() {
    this.material.userData.applyCompositionParams?.(this.#manifest);
    this.material.userData.applyGradientLayerParams?.(this.#manifest);
    this.material.userData.applyFieldGradientLayerParams?.(this.#manifest);
    this.material.userData.applySpotLayerParams?.(this.#manifest);
    this.material.userData.applyImageTextures?.(this.#imageTextures);
    this.material.userData.applyEditorImageState?.(this.#editorImageState);
    this.#imagePlacementOverrides.forEach((placement, layerId) => {
      this.material.userData.applyImageLayerPlacement?.(layerId, placement);
    });
  }

  setEditorPresentationEnabled(enabled: boolean) {
    if (this.#editorPresentationEnabled === enabled) {
      return this;
    }

    this.#editorPresentationEnabled = enabled;
    this.#materialTopologyKey = null;
    this.setManifest(this.#manifest);

    return this;
  }

  setEditorImageState(state: Partial<SkyboxEditorImageState>) {
    const nextEditorImageState = {
      ...this.#editorImageState,
      ...state,
    };

    if (
      nextEditorImageState.hoveredImageLayerId === this.#editorImageState.hoveredImageLayerId &&
      nextEditorImageState.selectedImageLayerId === this.#editorImageState.selectedImageLayerId
    ) {
      return this;
    }

    this.#editorImageState = nextEditorImageState;
    this.material.userData.applyEditorImageState?.(this.#editorImageState);

    return this;
  }

  setHoveredImageLayerId(layerId: string | null) {
    this.setEditorImageState({ hoveredImageLayerId: layerId });

    return this;
  }

  setImageLayerPlacement(layerId: string, placement: SkyboxImagePlacement | null) {
    this.#imagePlacementOverrides.set(layerId, placement);
    this.material.userData.applyImageLayerPlacement?.(layerId, placement);

    return this;
  }

  setManifest(manifest: SkyboxManifest) {
    const nextManifest = migrateManifestToV2(manifest);
    this.#manifest = nextManifest;
    this.applyGeometry(this.#manifest.geometry ?? this.#geometryOptions);
    const renderMode = resolveRenderMode(this.#renderMode, this.#renderer);
    const nextTopologyKey = createMaterialTopologyKey(
      this.#manifest,
      renderMode,
      this.#editorPresentationEnabled
    );

    if (
      this.#materialTopologyKey === nextTopologyKey &&
      (renderMode === "live-webgpu" || renderMode === "live-webgl")
    ) {
      this.applyLiveManifestUniformUpdates();
      return this;
    }

    if (renderMode === "live-webgpu") {
      this.replaceMaterial(createWebGpuMaterial(
        this.#manifest,
        this.#editorImageState,
        this.#imageTextures,
        this.#editorPresentationEnabled
      ));
    } else if (renderMode === "live-webgl") {
      this.replaceMaterial(createWebGlMaterial(
        this.#manifest,
        this.#editorImageState,
        this.#imageTextures,
        this.#editorPresentationEnabled
      ));
    } else {
      const texture = createBakedSkyboxTexture(this.#manifest, this.#bakeOptions);
      this.replaceMaterial(createBakedMaterialFromTexture(texture, this.#renderer), texture);
    }

    this.#materialTopologyKey = nextTopologyKey;

    return this;
  }

  setBakedTexture(texture: THREE.Texture) {
    this.replaceMaterial(createBakedMaterialFromTexture(texture, this.#renderer));
    this.#materialTopologyKey = null;

    return this;
  }

  invalidateBakeCache() {
    invalidateGlobalBakeCache();
    return this;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.disposeOwnedTexture();
  }
}
