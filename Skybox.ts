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
  SkyboxManifest,
  SkyboxManifestLayer,
  SkyboxManifestNode,
  SkyboxManifestV2,
  SkyboxRenderMode,
} from "./manifest";
import { DEFAULT_SKYBOX_GEOMETRY, migrateManifestToV2 } from "./manifest";

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
type ImageHoverUniformNode = {
  layerId: string;
  node: ReturnType<typeof uniform>;
};
type GradientUniformNodes = {
  axis: ReturnType<typeof uniform>;
  layerId: string;
  stops: Array<{
    color: ReturnType<typeof uniform>;
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

type ImageTextureMap = Record<string, THREE.Texture | null | undefined>;
type HoveredImageLayerId = string | null;

const DEFAULT_MANIFEST: SkyboxManifestV2 = {
  composition: { mode: "alpha-over", order: "bottom-to-top" },
  geometry: DEFAULT_SKYBOX_GEOMETRY,
  nodes: [],
  version: 2,
};

const IMAGE_HOVER_TINT_AMOUNT = 0.8;
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

function createImageHoverUniformNodes(
  bindings: ImageLayerShaderBinding[],
  hoveredImageLayerId: HoveredImageLayerId
): ImageHoverUniformNode[] {
  return bindings.map((binding) => ({
    layerId: binding.layer.id,
    node: uniform(imageHoverValue(binding.layer.id, hoveredImageLayerId)),
  }));
}

function applyHoveredImageLayerIdToUniformNodes(
  uniforms: ImageHoverUniformNode[],
  hoveredImageLayerId: HoveredImageLayerId
) {
  uniforms.forEach((hoverUniform) => {
    (hoverUniform.node as any).value = imageHoverValue(hoverUniform.layerId, hoveredImageLayerId);
  });
}

function imageHoverShaderUniforms(
  bindings: ImageLayerShaderBinding[],
  hoveredImageLayerId: HoveredImageLayerId
) {
  return Object.fromEntries(
    bindings.map((binding) => [
      `imageHover${binding.index}`,
      { value: imageHoverValue(binding.layer.id, hoveredImageLayerId) },
    ])
  );
}

function applyHoveredImageLayerIdToShaderUniforms(
  material: THREE.ShaderMaterial,
  bindings: ImageLayerShaderBinding[],
  hoveredImageLayerId: HoveredImageLayerId
) {
  bindings.forEach((binding) => {
    const uniformName = `imageHover${binding.index}`;

    if (material.uniforms[uniformName]) {
      material.uniforms[uniformName].value = imageHoverValue(
        binding.layer.id,
        hoveredImageLayerId
      );
    }
  });
}

function attachHoveredImageUpdater(
  material: RuntimeMaterial,
  updater: (hoveredImageLayerId: HoveredImageLayerId) => void
) {
  material.userData.applyHoveredImageLayerId = updater;
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

  const resolvedPlacement = resolveImagePlacement(placement);

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

function sortedGradientStops(params: SkyboxGradientParams) {
  return [...params.stops]
    .map((stop) => ({
      color: stop.color,
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
        const stop = stops[stopIndex] ?? { color: "#000000", opacity: 0, t: 0 };

        return {
          color: uniform(colorVectorFromStop(stop)),
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
    const stop = stops[stopIndex] ?? { color: "#000000", opacity: 0, t: 0 };

    (stopUniforms.color as any).value.copy(colorVectorFromStop(stop));
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
          const stop = stops[stopIndex] ?? { color: "#000000", opacity: 0, t: 0 };

          return [
            [`${binding.parameterPrefix}StopColor${stopIndex}`, { value: colorVectorFromStop(stop) }],
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
    const stop = stops[stopIndex] ?? { color: "#000000", opacity: 0, t: 0 };

    material.uniforms[`${binding.parameterPrefix}StopColor${stopIndex}`]?.value.copy(
      colorVectorFromStop(stop)
    );

    if (material.uniforms[`${binding.parameterPrefix}StopT${stopIndex}`]) {
      material.uniforms[`${binding.parameterPrefix}StopT${stopIndex}`].value = stop.t;
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

function resolveGeometryOptions(options?: SkyboxGeometryOptions): SkyboxGeometryOptions {
  return options ?? DEFAULT_SKYBOX_GEOMETRY;
}

export function createSkyboxGeometry(options: SkyboxGeometryOptions = DEFAULT_SKYBOX_GEOMETRY) {
  return resolveGeometryOptions(options).type === "sphere"
    ? new THREE.SphereGeometry(1, 64, 32)
    : new THREE.BoxGeometry(1, 1, 1);
}

export function createSkyboxWireGeometry(options: SkyboxGeometryOptions = DEFAULT_SKYBOX_GEOMETRY) {
  if (resolveGeometryOptions(options).type === "sphere") {
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 16);
    const wireGeometry = new THREE.WireframeGeometry(sphereGeometry);

    sphereGeometry.dispose();

    return wireGeometry;
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

function createGradientBindingMap(bindings: GradientLayerShaderBinding[]) {
  return new Map(bindings.map((binding) => [binding.layer.id, binding]));
}

function createFieldGradientBindingMap(bindings: FieldGradientLayerShaderBinding[]) {
  return new Map(bindings.map((binding) => [binding.layer.id, binding]));
}

function createImageBindingMap(bindings: ImageLayerShaderBinding[]) {
  return new Map(bindings.map((binding) => [binding.layer.id, binding]));
}

function imageVec3Literal(value: [number, number, number], language: ShaderLanguage) {
  const type = language === "wgsl" ? "vec3<f32>" : "vec3";

  return `${type}(${numberLiteral(value[0])}, ${numberLiteral(value[1])}, ${numberLiteral(value[2])})`;
}

function normalizeTuple(
  value: unknown,
  fallback: [number, number, number]
): [number, number, number] {
  if (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((component) => typeof component === "number" && Number.isFinite(component))
  ) {
    const length = Math.hypot(value[0], value[1], value[2]);

    if (length > 0) {
      return [value[0] / length, value[1] / length, value[2] / length];
    }
  }

  return fallback;
}

function resolveImagePlacement(
  placement: NonNullable<Extract<SkyboxManifestLayer, { type: "image" }>["params"]["placement"]>
) {
  const rawPlacement = placement as unknown as {
    angularHeight?: number;
    angularWidth?: number;
    center?: [number, number, number];
    centerDirection?: [number, number, number];
    height?: number;
    normal?: [number, number, number];
    projection?: string;
    tangentX?: [number, number, number];
    tangentY?: [number, number, number];
    width?: number;
  };
  const centerDirection = normalizeTuple(
    rawPlacement.centerDirection ?? rawPlacement.normal ?? rawPlacement.center,
    [0, 0, -1]
  );
  const tangentX = normalizeTuple(rawPlacement.tangentX, [1, 0, 0]);
  const tangentY = normalizeTuple(rawPlacement.tangentY, [0, 1, 0]);
  const legacyDistance = Array.isArray(rawPlacement.center)
    ? Math.max(0.0001, Math.hypot(rawPlacement.center[0], rawPlacement.center[1], rawPlacement.center[2]))
    : 1;
  const angularWidth =
    typeof rawPlacement.angularWidth === "number"
      ? rawPlacement.angularWidth
      : 2 * Math.atan(Math.max(0.0001, rawPlacement.width ?? 0.4) / (2 * legacyDistance));
  const angularHeight =
    typeof rawPlacement.angularHeight === "number"
      ? rawPlacement.angularHeight
      : 2 * Math.atan(Math.max(0.0001, rawPlacement.height ?? 0.3) / (2 * legacyDistance));

  return {
    angularHeight,
    angularWidth,
    centerDirection,
    tangentX,
    tangentY,
  };
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
  const { placement, src, width, height } = binding.layer.params;
  const vec4Type = language === "wgsl" ? "vec4<f32>" : "vec4";
  const floatType = language === "wgsl" ? "f32" : "float";
  const declare = language === "wgsl" ? "let" : "float";
  const vecDeclare = language === "wgsl" ? "let" : "vec3";

  if (!src || !placement || width <= 0 || height <= 0) {
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
      ${mutableDeclaration("imageValid", floatType, "0.0", language)}
      if (imageDenom > 0.0 &&
        ${refs.halfSize}.x > 0.0 &&
        ${refs.halfSize}.y > 0.0 &&
        projectedX >= -${refs.halfSize}.x &&
        projectedX <= ${refs.halfSize}.x &&
        projectedY >= -${refs.halfSize}.y &&
        projectedY <= ${refs.halfSize}.y &&
        imageU >= 0.0 &&
        imageU <= 1.0 &&
        imageV >= 0.0 &&
        imageV <= 1.0) {
        imageValid = 1.0;
      }
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
    imageSampleColor = vec4(
      mix(imageSampleColor.rgb, vec3(1.0, 0.0, 0.0), imageHover${binding.index} * ${numberLiteral(IMAGE_HOVER_TINT_AMOUNT)}),
      imageSampleColor.a
    );
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

const webGpuImageHoverFunction = wgslFn(`
  fn skyboxStudioApplyImageHover(color: vec4<f32>, hover: f32) -> vec4<f32> {
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), clamp(hover, 0.0, 1.0) * ${numberLiteral(IMAGE_HOVER_TINT_AMOUNT)}),
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

function getImageTexture(
  imageTextures: Map<string, THREE.Texture>,
  layer: Extract<SkyboxManifestLayer, { type: "image" }>
) {
  return layer.params.src ? imageTextures.get(layer.id) ?? EMPTY_IMAGE_TEXTURE : EMPTY_IMAGE_TEXTURE;
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

  if (binding.stopCount === 0) {
    return `effectColor = ${vec4Type}(0.0, 0.0, 0.0, 0.0);`;
  }

  const branches = Array.from({ length: Math.max(0, binding.stopCount - 1) }, (_, index) => {
    const currentStopT = `${binding.parameterPrefix}StopT${index}`;
    const nextStopT = `${binding.parameterPrefix}StopT${index + 1}`;
    const localT = `clamp((gradientT - ${currentStopT}) / max(${nextStopT} - ${currentStopT}, 0.00001), 0.0, 1.0)`;
    const keyword = index === 0 ? "if" : "else if";

    return `${keyword} (gradientT <= ${nextStopT}) {
      effectColor = mix(${binding.parameterPrefix}StopColor${index}, ${binding.parameterPrefix}StopColor${index + 1}, ${localT});
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

function effectExpression(
  layer: SkyboxManifestLayer,
  language: ShaderLanguage,
  gradientBindings: Map<string, GradientLayerShaderBinding>,
  fieldGradientBindings: Map<string, FieldGradientLayerShaderBinding>,
  imageBindings: Map<string, ImageLayerShaderBinding>
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

  return imageSampleExpression(layer, imageBindings, language);
}

function selectExpression(condition: string, whenTrue: string, whenFalse: string, language: ShaderLanguage) {
  return language === "wgsl"
    ? `select(${whenFalse}, ${whenTrue}, ${condition})`
    : `((${condition}) ? ${whenTrue} : ${whenFalse})`;
}

function blendExpression(node: SkyboxManifestNode, language: ShaderLanguage) {
  if (language === "glsl") {
    switch (node.blendMode) {
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

  switch (node.blendMode) {
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

function blendSetupExpression(node: SkyboxManifestNode, language: ShaderLanguage) {
  if (language === "glsl" || node.blendMode !== "soft-light") {
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

function composeNodesExpression(
  nodes: SkyboxManifestNode[],
  language: ShaderLanguage,
  gradientBindings: Map<string, GradientLayerShaderBinding>,
  fieldGradientBindings: Map<string, FieldGradientLayerShaderBinding>,
  imageBindings: Map<string, ImageLayerShaderBinding>,
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
          : effectExpression(node, language, gradientBindings, fieldGradientBindings, imageBindings);
      const groupColorName = `groupColor${depth}_${index}`;
      const groupBlock =
        node.type === "group"
          ? `${mutableDeclaration(groupColorName, vec3Type, `${vec3Type}(0.0)`, language)}
        {
          ${mutableDeclaration("previousComposedColor", vec3Type, "composedColor", language)}
          composedColor = ${vec3Type}(0.0);
          ${composeNodesExpression(node.children, language, gradientBindings, fieldGradientBindings, imageBindings, depth + 1)}
          ${groupColorName} = composedColor;
          composedColor = previousComposedColor;
        }`
          : "";

      return `{
        ${groupBlock}
        ${mutableDeclaration("effectColor", vec4Type, `${vec4Type}(0.0)`, language)}
        ${sourceExpression}
        ${language === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${numberLiteral(
        node.opacity / 100
      )}, 0.0, 1.0);
        ${blendSetupExpression(node, language)}
        ${language === "wgsl" ? "let" : "vec3"} blendedColor = clamp(${blendExpression(
        node,
        language
      )}, ${vec3Type}(0.0), ${vec3Type}(1.0));
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
  imageBindings: ImageLayerShaderBinding[]
) {
  const gradientBindingMap = createGradientBindingMap(gradientBindings);
  const fieldGradientBindingMap = createFieldGradientBindingMap(fieldGradientBindings);
  const imageBindingMap = createImageBindingMap(imageBindings);
  const layerBlocks = composeNodesExpression(
    manifest.nodes,
    "wgsl",
    gradientBindingMap,
    fieldGradientBindingMap,
    imageBindingMap
  );
  const gradientParameters = gradientBindings
    .flatMap((binding) => [
      `,
      ${binding.parameterPrefix}Axis: vec3<f32>`,
      ...Array.from({ length: binding.stopCount }, (_, stopIndex) => [
        `,
      ${binding.parameterPrefix}StopColor${stopIndex}: vec4<f32>`,
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

  return wgslFn(`
    fn skyboxStudioSample(
      direction: vec3<f32>${gradientParameters}${fieldGradientParameters}${imageParameters}
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
  hoverUniforms: ImageHoverUniformNode[],
  placementUniforms: ImagePlacementUniformNodes[]
) {
  return Object.fromEntries(
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
      const hoverColor = webGpuImageHoverFunction({
        color: sampleColor,
        hover: hoverUniforms[binding.index].node,
      });
      const maskedColor = webGpuImageMaskFunction({
        color: hoverColor,
        valid: sampleInfo.z,
      });

      return [binding.parameterName, maskedColor];
    })
  );
}

function createWebGpuMaterial(
  manifest: SkyboxManifestV2,
  hoveredImageLayerId: HoveredImageLayerId,
  imageTextures: Map<string, THREE.Texture>
) {
  const material = new NodeMaterial();
  const gradientBindings = collectGradientLayerBindings(manifest.nodes);
  const fieldGradientBindings = collectFieldGradientLayerBindings(manifest.nodes);
  const imageBindings = collectImageLayerBindings(manifest.nodes);
  const skyboxSample = createSkyboxFunction(manifest, gradientBindings, fieldGradientBindings, imageBindings);
  const gradientUniforms = createGradientUniformNodes(gradientBindings);
  const fieldGradientUniforms = createFieldGradientUniformNodes(fieldGradientBindings);
  const imageHoverUniforms = createImageHoverUniformNodes(imageBindings, hoveredImageLayerId);
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
  material.colorNode = skyboxSample({
    direction,
    ...Object.fromEntries(
      gradientBindings.flatMap((binding) => {
        const gradientUniform = gradientUniforms[binding.index];

        return [
          [`${binding.parameterPrefix}Axis`, gradientUniform.axis],
          ...Array.from({ length: binding.stopCount }, (_, stopIndex) => [
            [`${binding.parameterPrefix}StopColor${stopIndex}`, gradientUniform.stops[stopIndex].color],
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
    ...createWebGpuImageSampleNodes(
      imageBindings,
      direction,
      imageTextures,
      imageHoverUniforms,
      imagePlacementUniforms
    ),
  }) as any;
  attachHoveredImageUpdater(material, (nextHoveredImageLayerId) =>
    applyHoveredImageLayerIdToUniformNodes(imageHoverUniforms, nextHoveredImageLayerId)
  );
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
  hoveredImageLayerId: HoveredImageLayerId,
  imageTextures: Map<string, THREE.Texture>
) {
  const gradientBindings = collectGradientLayerBindings(manifest.nodes);
  const fieldGradientBindings = collectFieldGradientLayerBindings(manifest.nodes);
  const imageBindings = collectImageLayerBindings(manifest.nodes);
  const gradientBindingMap = createGradientBindingMap(gradientBindings);
  const fieldGradientBindingMap = createFieldGradientBindingMap(fieldGradientBindings);
  const imageBindingMap = createImageBindingMap(imageBindings);
  const layerBlocks = composeNodesExpression(
    manifest.nodes,
    "glsl",
    gradientBindingMap,
    fieldGradientBindingMap,
    imageBindingMap
  );
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...gradientShaderUniforms(gradientBindings),
      ...fieldGradientShaderUniforms(fieldGradientBindings),
      ...imageHoverShaderUniforms(imageBindings, hoveredImageLayerId),
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
      ${imageBindings
        .map(
          (binding) => `uniform sampler2D imageTexture${binding.index};
      uniform vec3 imageCenterDirection${binding.index};
      uniform vec3 imageTangentX${binding.index};
      uniform vec3 imageTangentY${binding.index};
      uniform vec2 imageHalfSize${binding.index};
      uniform float imageHover${binding.index};`
        )
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
        gl_FragColor = vec4(composedColor, 1.0);
      }
    `,
  });

  attachHoveredImageUpdater(material, (nextHoveredImageLayerId) =>
    applyHoveredImageLayerIdToShaderUniforms(material, imageBindings, nextHoveredImageLayerId)
  );
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
  renderMode: Exclude<SkyboxRenderMode, "auto">
) {
  const nodeKey = (node: SkyboxManifestNode): unknown => {
    if (node.type === "group") {
      return {
        blendMode: node.blendMode,
        children: node.children.map(nodeKey),
        enabled: node.enabled,
        id: node.id,
        opacity: node.opacity,
        type: node.type,
      };
    }

    if (node.type === "gradient") {
      return {
        blendMode: node.blendMode,
        enabled: node.enabled,
        id: node.id,
        mode: node.params.mode,
        opacity: node.opacity,
        stopCount: node.params.stops.length,
        type: node.type,
      };
    }

    if (node.type === "image") {
      return {
        blendMode: node.blendMode,
        enabled: node.enabled,
        hasPlacement: Boolean(node.params.placement),
        hasSrc: Boolean(node.params.src),
        height: node.params.height,
        id: node.id,
        opacity: node.opacity,
        type: node.type,
        width: node.params.width,
      };
    }

    return {
      anchorCount: node.params.anchors.length,
      blendMode: node.blendMode,
      enabled: node.enabled,
      id: node.id,
      opacity: node.opacity,
      type: node.type,
    };
  };

  return JSON.stringify({
    geometry: manifest.geometry?.type ?? DEFAULT_SKYBOX_GEOMETRY.type,
    nodes: manifest.nodes.map(nodeKey),
    renderMode,
  });
}

export class Skybox extends THREE.Mesh<THREE.BufferGeometry, RuntimeMaterial> {
  #bakeOptions: SkyboxBakeOptions = {};
  #geometryOptions: SkyboxGeometryOptions = DEFAULT_SKYBOX_GEOMETRY;
  #hoveredImageLayerId: HoveredImageLayerId = null;
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
      createWebGpuMaterial(DEFAULT_MANIFEST, null, new Map())
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
    nextMaterial.userData.applyHoveredImageLayerId?.(this.#hoveredImageLayerId);
    this.#imagePlacementOverrides.forEach((placement, layerId) => {
      nextMaterial.userData.applyImageLayerPlacement?.(layerId, placement);
    });
    previousMaterial.dispose();
    this.disposeOwnedTexture();
    this.#ownedTexture = ownedTexture;
  }

  private applyLiveManifestUniformUpdates() {
    this.material.userData.applyGradientLayerParams?.(this.#manifest);
    this.material.userData.applyFieldGradientLayerParams?.(this.#manifest);
    this.material.userData.applyImageTextures?.(this.#imageTextures);
    this.#imagePlacementOverrides.forEach((placement, layerId) => {
      this.material.userData.applyImageLayerPlacement?.(layerId, placement);
    });
  }

  setHoveredImageLayerId(layerId: string | null) {
    if (this.#hoveredImageLayerId === layerId) {
      return this;
    }

    this.#hoveredImageLayerId = layerId;
    this.material.userData.applyHoveredImageLayerId?.(this.#hoveredImageLayerId);

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
    const nextTopologyKey = createMaterialTopologyKey(this.#manifest, renderMode);

    if (
      this.#materialTopologyKey === nextTopologyKey &&
      (renderMode === "live-webgpu" || renderMode === "live-webgl")
    ) {
      this.applyLiveManifestUniformUpdates();
      return this;
    }

    if (renderMode === "live-webgpu") {
      this.replaceMaterial(createWebGpuMaterial(this.#manifest, this.#hoveredImageLayerId, this.#imageTextures));
    } else if (renderMode === "live-webgl") {
      this.replaceMaterial(createWebGlMaterial(this.#manifest, this.#hoveredImageLayerId, this.#imageTextures));
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
