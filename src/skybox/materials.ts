// Material + composition runtime for the skybox: builds the live WebGPU (NodeMaterial/TSL) and
// WebGL (GLSL ShaderMaterial) materials, the offscreen equirect GPU-bake material, and the CPU
// baked-texture fallback — all from a manifest, driving per-layer sampling through the shared
// layer-addon registry (no hardcoded layer types). The stateful `Skybox` mesh class consumes this.
import * as THREE from "three";
import { NodeMaterial } from "three/webgpu";
import {
  cameraProjectionMatrixInverse,
  cameraWorldMatrix,
  Fn,
  modelViewProjection,
  normalize,
  positionGeometry,
  screenUV,
  texture as textureNode,
  uniform,
  vec2,
  vec4,
  wgslFn,
} from "three/tsl";

import { bakeSkyboxImageData } from "../baking/bake";
import {
  composeCoverageExpression,
  composeNodesExpression,
  compositionNodeValues,
  createBindingMapFromLayers,
  getRenderableNodes,
  type CompositionNodeShaderBinding,
} from "./composition";
import {
  applyEditorLayerStateToUniformNodes,
  attachEditorLayerStateUpdater,
  createWgslEditorUniformNodes,
  webGpuImageEditorRectOverlayFunction,
} from "./editor-presentation";
import {
  applyImageLayerPlacementToUniformNodes,
  attachImagePlacementUpdater,
  updateImageTextureNodes,
} from "../layer-addons/builtins/image";
import type { WebGpuImageLayerSampleNodes, WebGpuStarfieldLayerSampleNodes } from "./types";
import { updateStarfieldTextureNodes } from "../layer-addons/builtins/starfield";
import type {
  SkyboxBakeOptions,
  SkyboxManifest,
  SkyboxManifestLayer,
  SkyboxManifestNode,
  SkyboxManifestV2,
  SkyboxRenderMode,
} from "../manifest";
import { DEFAULT_SKYBOX_GEOMETRY } from "../manifest";
import type { StarfieldGpuPatchTextureSet } from "../baking/starfield-gpu-bake";
import type {
  WebGpuCompositionRuntime,
  WebGpuLayerAdapter,
  WebGpuLayerAdapterRuntime,
} from "../layer-addons";
import {
  getLayerRuntimeAdapter,
  getLayerRuntimeAdapters,
} from "../layer-addons/registry";

import type {
  CompositionUniformNodes,
  ImageLayerShaderBinding,
  ImagePlacementUniformNodes,
  RuntimeMaterial,
  SkyboxEditorLayerState,
  StarfieldLayerShaderBinding,
} from "./types";

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

function applyLayerCompositionToUniformNodes(
  uniforms: CompositionUniformNodes[],
  node: SkyboxManifestNode
) {
  const compositionUniforms = uniforms.find((nextUniforms) => nextUniforms.nodeId === node.id);

  if (!compositionUniforms) {
    return;
  }

  const values = compositionNodeValues(node);

  (compositionUniforms.opacity as any).value = values.opacity;
  (compositionUniforms.blendMode as any).value = values.blendMode;
}

function attachCompositionUpdater(
  material: RuntimeMaterial,
  updater: (manifest: SkyboxManifestV2) => void
) {
  material.userData.applyCompositionParams = updater;
}

function attachLayerCompositionUpdater(
  material: RuntimeMaterial,
  updater: (node: SkyboxManifestNode) => void
) {
  material.userData.applyLayerComposition = updater;
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





function createCompositionBindingMap(bindings: CompositionNodeShaderBinding[]) {
  return new Map(bindings.map((binding) => [binding.node.id, binding]));
}



// Every built-in layer (gradient, field-gradient, image, spot, starfield) now registers its own
// CPU + WGSL + GLSL adapter from `layer-addons/builtins/<type>.ts` (imported for side effects at
// the top of this module). The runtime here only iterates the shared registry.

// All WebGPU layer adapters known to the registry (built-in + any externally
// registered). Used by the live-webgpu material + topology builders so adding a
// layer never edits a hardcoded list.
function webGpuLayerAdapters(): WebGpuLayerAdapter[] {
  return getLayerRuntimeAdapters()
    .map((adapter) => adapter.wgsl)
    .filter((adapter): adapter is WebGpuLayerAdapter => Boolean(adapter));
}

function createWebGpuLayerRuntime(
  manifest: SkyboxManifestV2,
  direction: unknown,
  imageTextures: Map<string, THREE.Texture>,
  starfieldTextures: Map<string, THREE.Texture>,
  _starfieldPatchTextures: Map<string, StarfieldGpuPatchTextureSet>
): WebGpuCompositionRuntime {
  const adapters = new Map<string, WebGpuLayerAdapterRuntime>();
  const editorProjectionByLayerId = new Map<string, { uv: unknown; valid: unknown }>();
  const sampleParameters: Record<string, unknown> = {};
  const textureSlotsByLayerId: Record<string, unknown> = {};

  webGpuLayerAdapters().forEach((adapter) => {
    const bindings = adapter.collect(manifest.nodes) as { layer: SkyboxManifestLayer }[];
    const uniforms = (adapter as WebGpuLayerAdapter<SkyboxManifestLayer, typeof bindings[number], unknown>)
      .createUniforms(bindings);
    const samples = (adapter as WebGpuLayerAdapter<SkyboxManifestLayer, typeof bindings[number], unknown>)
      .createSampleNodes?.({
        bindings,
        direction,
        imageTextures: adapter.type === "starfield" ? starfieldTextures : imageTextures,
        uniforms,
      });
    const bindingRuntime: WebGpuLayerAdapterRuntime = {
      adapter: adapter as WebGpuLayerAdapter,
      bindings,
      bindingsByLayerId: createBindingMapFromLayers(bindings),
      samples,
      uniforms,
    };

    if (samples?.editorProjectionByLayerId) {
      samples.editorProjectionByLayerId.forEach((projection, layerId) => {
        editorProjectionByLayerId.set(layerId, projection);
      });
    }

    if (samples?.textureSlots) {
      Object.assign(textureSlotsByLayerId, samples.textureSlots);
    }

    Object.assign(
      sampleParameters,
      (adapter as WebGpuLayerAdapter<SkyboxManifestLayer, typeof bindings[number], unknown>)
        .createSampleParameters?.(bindings, uniforms, samples) ?? {}
    );
    adapters.set(adapter.type, bindingRuntime);
  });

  return {
    adapters,
    editorProjectionByLayerId,
    sampleParameters,
    textureSlotsByLayerId,
  };
}

function getWebGpuAdapterRuntime<TType extends SkyboxManifestLayer["type"], TBinding, TUniforms>(
  runtime: WebGpuCompositionRuntime,
  type: TType
) {
  return runtime.adapters.get(type) as
    | WebGpuLayerAdapterRuntime<Extract<SkyboxManifestLayer, { type: TType }>, TBinding, TUniforms>
    | undefined;
}

export function forEachRenderableLayer(
  nodes: SkyboxManifestNode[],
  callback: (layer: SkyboxManifestLayer) => void
) {
  nodes.forEach((node) => {
    if (!node.enabled) {
      return;
    }

    if (node.type === "group") {
      forEachRenderableLayer(node.children, callback);
      return;
    }

    callback(node);
  });
}

function applyWebGpuLayerParamsToRuntime(
  runtime: WebGpuCompositionRuntime,
  layer: SkyboxManifestLayer
) {
  const adapterRuntime = runtime.adapters.get(layer.type);

  if (!adapterRuntime) {
    return;
  }

  (adapterRuntime.adapter as WebGpuLayerAdapter<SkyboxManifestLayer, unknown, unknown>)
    .updateUniforms(adapterRuntime.uniforms, layer);
}

function createSkyboxFunction(
  manifest: SkyboxManifestV2,
  layerRuntime: WebGpuCompositionRuntime,
  compositionBindings: CompositionNodeShaderBinding[]
) {
  const compositionBindingMap = createCompositionBindingMap(compositionBindings);
  const layerBlocks = composeNodesExpression(
    manifest.nodes,
    compositionBindingMap,
    layerRuntime
  );
  const layerParameters = Array.from(layerRuntime.adapters.values())
    .map((adapterRuntime) => adapterRuntime.adapter.createParameterDeclarations(adapterRuntime.bindings))
    .join("");
  const compositionParameters = compositionBindings
    .flatMap((binding) => [
      `,
      ${binding.parameterPrefix}Opacity: f32`,
      `,
      ${binding.parameterPrefix}BlendMode: f32`,
    ])
    .join("");

  return wgslFn(`
    fn skyboxStudioSample(
      direction: vec3<f32>${layerParameters}${compositionParameters}
    ) -> vec4<f32> {
      var composedColor = vec3<f32>(0.0);
      ${layerBlocks}
      return vec4<f32>(composedColor, 1.0);
    }
  `);
}


// Shared builder for the WebGPU composition `colorNode`. Both the live viewport material and
// the offscreen equirect bake material run the SAME per-fragment layer composition
// (`skyboxStudioSample`); they differ only in how `direction` is derived (viewport geometry vs.
// equirect UV) and in the vertex stage. Keeping this single source of truth guarantees the
// exported bake matches the live look.
function buildSkyboxComposition(
  manifest: SkyboxManifestV2,
  direction: any,
  imageTextures: Map<string, THREE.Texture>,
  starfieldTextures: Map<string, THREE.Texture>,
  starfieldPatchTextures: Map<string, StarfieldGpuPatchTextureSet>
) {
  const compositionBindings = collectCompositionNodeBindings(manifest.nodes);
  const compositionUniforms = createCompositionUniformNodes(compositionBindings);
  const layerRuntime = createWebGpuLayerRuntime(
    manifest,
    direction,
    imageTextures,
    starfieldTextures,
    starfieldPatchTextures
  );
  const imageRuntime = getWebGpuAdapterRuntime<"image", ImageLayerShaderBinding, ImagePlacementUniformNodes>(
    layerRuntime,
    "image"
  );
  const imageUniforms = imageRuntime?.uniforms ?? [];
  const imageSamples = imageRuntime?.samples as WebGpuImageLayerSampleNodes | undefined;
  const starfieldRuntime = getWebGpuAdapterRuntime<
    "starfield",
    StarfieldLayerShaderBinding,
    never
  >(layerRuntime, "starfield");
  const starfieldSamples = starfieldRuntime?.samples as
    | WebGpuStarfieldLayerSampleNodes
    | undefined;
  const skyboxSample = createSkyboxFunction(manifest, layerRuntime, compositionBindings);
  const colorNode = skyboxSample({
    direction,
    ...layerRuntime.sampleParameters,
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

  return {
    colorNode,
    compositionUniforms,
    imageSamples,
    imageUniforms,
    layerRuntime,
    starfieldSamples,
  };
}

// Exact per-fragment view ray (TSL/WebGPU). Deriving the sampling direction from the interpolated
// mesh position (`positionWorld - cameraPosition`) bakes the skybox mesh topology into the equirect
// UV: the coarse UV-sphere's pole fans + lat/long grid etch a faceted "radial segment" pattern into
// the high-frequency starfield, and a box's flat faces produce seams. Reconstructing the ray from
// the screen NDC + inverse projection makes the UV (and its screen-space derivatives) smooth and
// mesh-independent, so star sampling is identical on any sky geometry.
function skyboxViewDirectionNode() {
  const ndc = (screenUV as any).mul(2.0).sub(1.0);
  // screenUV.y is top-down here, opposite the projection's bottom-up clip Y, so flip it — otherwise
  // the live view renders vertically mirrored (exports don't use this path, so they look correct).
  const viewHomogeneous = (cameraProjectionMatrixInverse as any).mul(vec4(ndc.x, ndc.y.negate(), 1.0, 1.0));
  const viewRay = viewHomogeneous.xyz.div(viewHomogeneous.w);
  const worldRay = (cameraWorldMatrix as any).mul(vec4(viewRay, 0.0)).xyz;
  return normalize(worldRay as any);
}

export function createWebGpuMaterial(
  manifest: SkyboxManifestV2,
  editorLayerState: SkyboxEditorLayerState,
  imageTextures: Map<string, THREE.Texture>,
  starfieldTextures: Map<string, THREE.Texture>,
  starfieldPatchTextures: Map<string, StarfieldGpuPatchTextureSet>,
  editorPresentationEnabled: boolean
) {
  const material = new NodeMaterial();
  const vertexNode = Fn(() => {
    const position = modelViewProjection as any;

    position.z.assign(position.w);

    return position;
  })();

  material.side = THREE.BackSide;
  material.depthTest = false;
  material.depthWrite = false;
  material.vertexNode = vertexNode as any;
  const direction = skyboxViewDirectionNode();
  const {
    colorNode: compositionColorNode,
    compositionUniforms,
    imageSamples,
    imageUniforms,
    layerRuntime,
    starfieldSamples,
  } = buildSkyboxComposition(
    manifest,
    direction,
    imageTextures,
    starfieldTextures,
    starfieldPatchTextures
  );
  // Per-layer editor selection-rect overlays, opted in via the registry's
  // wgslEditorOverlay flag — no per-type branching here.
  const editorOverlayLayers = editorPresentationEnabled
    ? getLayerRuntimeAdapters().flatMap((adapter) => {
        const runtime = layerRuntime.adapters.get(adapter.type);

        if (!adapter.wgslEditorOverlay || !runtime) {
          return [];
        }

        const bindings = runtime.bindings as { layer: { id: string } }[];

        return [{ bindings, editorUniforms: createWgslEditorUniformNodes(bindings, editorLayerState) }];
      })
    : [];
  let colorNode = compositionColorNode;
  editorOverlayLayers.forEach(({ bindings, editorUniforms }) => {
    bindings.forEach((binding, index) => {
      const projection = layerRuntime.editorProjectionByLayerId.get(binding.layer.id);

      if (!projection) {
        return;
      }

      colorNode = (webGpuImageEditorRectOverlayFunction as any)({
        color: colorNode,
        activeValue: editorUniforms[index].active,
        uv: projection.uv,
        valid: projection.valid,
      }) as any;
    });
  });
  material.colorNode = colorNode as any;
  if (editorOverlayLayers.length > 0) {
    attachEditorLayerStateUpdater(material, (nextEditorLayerState) => {
      editorOverlayLayers.forEach(({ editorUniforms }) =>
        applyEditorLayerStateToUniformNodes(editorUniforms, nextEditorLayerState)
      );
    });
  }
  material.userData.webGpuLayerRuntime = layerRuntime;
  material.userData.applyLayerParams = (layer: SkyboxManifestLayer) =>
    applyWebGpuLayerParamsToRuntime(layerRuntime, layer);
  attachCompositionUpdater(material, (nextManifest) =>
    applyCompositionParamsToUniformNodes(compositionUniforms, nextManifest)
  );
  attachLayerCompositionUpdater(material, (node) =>
    applyLayerCompositionToUniformNodes(compositionUniforms, node)
  );
  attachImagePlacementUpdater(material, (layerId, placement) =>
    applyImageLayerPlacementToUniformNodes(imageUniforms, layerId, placement)
  );
  material.userData.applyImageTextures = (textures: Map<string, THREE.Texture>) =>
    updateImageTextureNodes(imageSamples?.sampleData ?? new Map(), textures);
  material.userData.applyStarfieldTextures = (textures: Map<string, THREE.Texture>) =>
    updateStarfieldTextureNodes(starfieldSamples?.sampleData ?? new Map(), textures);
  material.userData.debugImageTextureSlots = layerRuntime.textureSlotsByLayerId;

  return material;
}

// --- Coverage (transmittance) material for screen-space glint occlusion (Phase B) ---------------
//
// Same per-fragment ray + per-layer sampling as the live composite, but instead of a color it outputs
// the transmittance Π(1 − sourceAlpha) of the layers ABOVE the topmost starfield. The Skybox renders
// this into an offscreen target each frame (a pre-pass) and the glint shader multiplies its radiance
// by the sampled transmittance, so opaque upper layers hide the glints behind them.
export { manifestHasLayerAboveStarfield } from "./composition";

function createSkyboxCoverageFunction(
  manifest: SkyboxManifestV2,
  layerRuntime: WebGpuCompositionRuntime
) {
  const body = composeCoverageExpression(manifest.nodes, layerRuntime);
  const layerParameters = Array.from(layerRuntime.adapters.values())
    .map((adapterRuntime) => adapterRuntime.adapter.createParameterDeclarations(adapterRuntime.bindings))
    .join("");

  return wgslFn(`
    fn skyboxStudioCoverage(
      direction: vec3<f32>${layerParameters}
    ) -> vec4<f32> {
      var coverageAbove = 0.0;
      ${body}
      let transmittance = clamp(1.0 - coverageAbove, 0.0, 1.0);
      return vec4<f32>(transmittance, transmittance, transmittance, 1.0);
    }
  `);
}

export function createWebGpuCoverageMaterial(
  manifest: SkyboxManifestV2,
  imageTextures: Map<string, THREE.Texture>,
  starfieldTextures: Map<string, THREE.Texture>,
  starfieldPatchTextures: Map<string, StarfieldGpuPatchTextureSet>
) {
  const material = new NodeMaterial();

  material.side = THREE.BackSide;
  material.depthTest = false;
  material.depthWrite = false;
  material.vertexNode = Fn(() => {
    const position = modelViewProjection as any;

    position.z.assign(position.w);

    return position;
  })() as any;

  const direction = skyboxViewDirectionNode();
  const layerRuntime = createWebGpuLayerRuntime(
    manifest,
    direction,
    imageTextures,
    starfieldTextures,
    starfieldPatchTextures
  );
  const imageRuntime = getWebGpuAdapterRuntime<"image", ImageLayerShaderBinding, ImagePlacementUniformNodes>(
    layerRuntime,
    "image"
  );
  const imageSamples = imageRuntime?.samples as WebGpuImageLayerSampleNodes | undefined;
  const imageUniforms = imageRuntime?.uniforms ?? [];
  const starfieldRuntime = getWebGpuAdapterRuntime<"starfield", StarfieldLayerShaderBinding, never>(
    layerRuntime,
    "starfield"
  );
  const starfieldSamples = starfieldRuntime?.samples as WebGpuStarfieldLayerSampleNodes | undefined;
  const coverage = createSkyboxCoverageFunction(manifest, layerRuntime);

  material.colorNode = coverage({
    direction,
    ...layerRuntime.sampleParameters,
  }) as any;
  material.userData.applyLayerParams = (layer: SkyboxManifestLayer) =>
    applyWebGpuLayerParamsToRuntime(layerRuntime, layer);
  attachImagePlacementUpdater(material, (layerId, placement) =>
    applyImageLayerPlacementToUniformNodes(imageUniforms, layerId, placement)
  );
  material.userData.applyImageTextures = (textures: Map<string, THREE.Texture>) =>
    updateImageTextureNodes(imageSamples?.sampleData ?? new Map(), textures);
  material.userData.applyStarfieldTextures = (textures: Map<string, THREE.Texture>) =>
    updateStarfieldTextureNodes(starfieldSamples?.sampleData ?? new Map(), textures);

  return material;
}

// Equirect is centered on -Z (the camera's default forward), with +X growing to the right of center
// and +Y up. uv.x = 0.5 -> -Z, uv.x = 0.75 -> +X. This matches the image/spot placement longitude
// (atan2(x, -z)) so the exported image is aligned with the editor's default view.
const directionToEquirectUv = wgslFn(`
  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {
    let normalizedDirection = normalize(direction);
    let longitude = atan2(normalizedDirection.x, -normalizedDirection.z);
    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));

    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);
  }
`);

// Exact inverse of `skyboxStudioDirectionToEquirectUv` above (and matches the CPU
// `equirectUvToDirection`), so a baked equirect PNG round-trips with how the runtime samples
// equirect textures. Note this is a DIFFERENT convention from starfield-gpu-bake's
// `equirectDirectionNode` (which centers +Z and flips V), so it must not be reused here.
const equirectUvToDirection = wgslFn(`
  fn skyboxStudioEquirectUvToDirection(uv: vec2<f32>) -> vec3<f32> {
    let lambda = (uv.x - 0.5) * 6.283185307179586;
    let phi = (uv.y - 0.5) * 3.141592653589793;
    let cosPhi = cos(phi);

    return normalize(vec3<f32>(cosPhi * sin(lambda), sin(phi), -cosPhi * cos(lambda)));
  }
`);

// Offscreen material for the single-pass equirect export bake. Renders a full-screen quad
// (PlaneGeometry(2,2) + ortho camera) where each fragment's direction comes from the equirect
// UV, then runs the same `buildSkyboxComposition` colorNode the live viewport uses. No editor
// overlays and no live updaters — this material is one-shot.
export function createWebGpuEquirectBakeMaterial(
  manifest: SkyboxManifestV2,
  imageTextures: Map<string, THREE.Texture>,
  starfieldTextures: Map<string, THREE.Texture>,
  options: { flipY?: boolean } = {}
) {
  const material = new NodeMaterial();

  material.side = THREE.DoubleSide;
  material.depthTest = false;
  material.depthWrite = false;

  // Derive equirect UV from the full-screen quad's local position (PlaneGeometry(2,2) → [-1,1]),
  // remapped to [0,1]. This mirrors the proven starfield bake; the `uv()` attribute does not sweep
  // the full quad reliably in this offscreen NodeMaterial setup.
  // `flipY` pre-flips V for the EXR path: EXRExporter always flips scanlines (assuming WebGL
  // bottom-up readback), but our WebGPU readback is top-down — so we invert here to cancel it out.
  const baseUv = (positionGeometry.xy as any).mul(0.5).add(0.5);
  const sampleUv = options.flipY ? vec2(baseUv.x, baseUv.y.oneMinus()) : baseUv;
  const direction = normalize(equirectUvToDirection({ uv: sampleUv }) as any);
  const { colorNode } = buildSkyboxComposition(
    manifest,
    direction,
    imageTextures,
    starfieldTextures,
    new Map()
  );

  material.colorNode = colorNode as any;

  return material;
}


function createWebGpuBakedMaterial(texture: THREE.Texture) {
  const material = new NodeMaterial();
  const vertexNode = Fn(() => {
    const position = modelViewProjection as any;

    position.z.assign(position.w);

    return position;
  })();
  const direction = skyboxViewDirectionNode();

  material.side = THREE.BackSide;
  material.depthTest = false;
  material.depthWrite = false;
  material.vertexNode = vertexNode as any;
  material.colorNode = textureNode(texture, directionToEquirectUv({ direction }) as any) as any;

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

export function createBakedMaterialFromTexture(texture: THREE.Texture) {
  return createWebGpuBakedMaterial(texture);
}

// WebGPU-only runtime: "auto"/"live-webgl" collapse to the WebGPU live path; "baked-texture" preserved.
export function resolveRenderMode(mode: SkyboxRenderMode): Exclude<SkyboxRenderMode, "auto"> {
  return mode === "baked-texture" ? "baked-texture" : "live-webgpu";
}

export function createMaterialTopologyKey(
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

    // Structural key is identical across render modes; the per-layer specifics
    // come from the registered adapter (no per-type branching here).
    return {
      enabled: node.enabled,
      id: node.id,
      topology: getLayerRuntimeAdapter(node.type)?.getTopologyKey?.(node) ?? null,
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

export function findManifestNodeById(nodes: SkyboxManifestNode[], nodeId: string): SkyboxManifestNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    if (node.type === "group") {
      const childNode = findManifestNodeById(node.children, nodeId);

      if (childNode) {
        return childNode;
      }
    }
  }

  return null;
}
