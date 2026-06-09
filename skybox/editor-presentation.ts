// Editor-only presentation: per-layer selection/hover "active" uniforms that drive the editor's
// selection-rect overlays. Gated by the Skybox's `editorPresentationEnabled` flag, so a standalone
// (non-editor) consumer never pays for it. The overlay shader code itself lives with each layer.
import * as THREE from "three";
import { uniform, wgslFn } from "three/tsl";

import { numberLiteral } from "../layer-addons/shader-codegen";
import {
  IMAGE_ACTIVE_BOUNDS_INNER_PIXELS,
  IMAGE_ACTIVE_BOUNDS_OUTER_PIXELS,
  IMAGE_ACTIVE_RECT_ALPHA,
  IMAGE_PROJECTION_DENOM_EPSILON,
  IMAGE_PROJECTION_MAX_EDGE_WIDTH,
} from "./overlay";
import type {
  HoveredImageLayerId,
  ImageEditorUniformNodes,
  ImageLayerShaderBinding,
  RuntimeMaterial,
  SkyboxEditorLayerState,
  SpotEditorUniformNodes,
  SpotLayerShaderBinding,
} from "./types";

export const DEFAULT_EDITOR_LAYER_STATE: SkyboxEditorLayerState = {
  hoveredLayerId: null,
  selectedLayerId: null,
};

function editorLayerHoverValue(layerId: string, hoveredLayerId: HoveredImageLayerId) {
  return hoveredLayerId === layerId ? 1 : 0;
}

function editorLayerSelectedValue(layerId: string, selectedLayerId: string | null) {
  return selectedLayerId === layerId ? 1 : 0;
}

function editorLayerActiveValue(layerId: string, editorLayerState: SkyboxEditorLayerState) {
  return Math.max(
    editorLayerHoverValue(layerId, editorLayerState.hoveredLayerId),
    editorLayerSelectedValue(layerId, editorLayerState.selectedLayerId)
  );
}

export function createImageEditorUniformNodes(
  bindings: ImageLayerShaderBinding[],
  editorLayerState: SkyboxEditorLayerState
): ImageEditorUniformNodes[] {
  return bindings.map((binding) => ({
    active: uniform(editorLayerActiveValue(binding.layer.id, editorLayerState)),
    layerId: binding.layer.id,
  }));
}

export function createSpotEditorUniformNodes(
  bindings: SpotLayerShaderBinding[],
  editorLayerState: SkyboxEditorLayerState
): SpotEditorUniformNodes[] {
  return bindings.map((binding) => ({
    active: uniform(editorLayerActiveValue(binding.layer.id, editorLayerState)),
    layerId: binding.layer.id,
  }));
}

export function createWgslEditorUniformNodes(
  bindings: { layer: { id: string } }[],
  editorLayerState: SkyboxEditorLayerState
): ImageEditorUniformNodes[] {
  return bindings.map((binding) => ({
    active: uniform(editorLayerActiveValue(binding.layer.id, editorLayerState)),
    layerId: binding.layer.id,
  }));
}

export function applyEditorLayerStateToUniformNodes(
  uniforms: ImageEditorUniformNodes[],
  editorLayerState: SkyboxEditorLayerState
) {
  uniforms.forEach((editorUniform) => {
    (editorUniform.active as any).value = editorLayerActiveValue(editorUniform.layerId, editorLayerState);
  });
}

export function imageEditorShaderUniforms(
  bindings: ImageLayerShaderBinding[],
  editorLayerState: SkyboxEditorLayerState
) {
  return Object.fromEntries(
    bindings.map((binding) => [
      `imageActive${binding.index}`,
      { value: editorLayerActiveValue(binding.layer.id, editorLayerState) },
    ])
  );
}

export function spotEditorShaderUniforms(
  bindings: SpotLayerShaderBinding[],
  editorLayerState: SkyboxEditorLayerState
) {
  return Object.fromEntries(
    bindings.map((binding) => [
      `spotActive${binding.index}`,
      { value: editorLayerActiveValue(binding.layer.id, editorLayerState) },
    ])
  );
}

export function applyEditorLayerStateToShaderUniforms(
  material: THREE.ShaderMaterial,
  imageBindings: ImageLayerShaderBinding[],
  spotBindings: SpotLayerShaderBinding[],
  editorLayerState: SkyboxEditorLayerState
) {
  imageBindings.forEach((binding) => {
    const activeUniformName = `imageActive${binding.index}`;

    if (material.uniforms[activeUniformName]) {
      material.uniforms[activeUniformName].value = editorLayerActiveValue(binding.layer.id, editorLayerState);
    }
  });

  spotBindings.forEach((binding) => {
    const activeUniformName = `spotActive${binding.index}`;

    if (material.uniforms[activeUniformName]) {
      material.uniforms[activeUniformName].value = editorLayerActiveValue(binding.layer.id, editorLayerState);
    }
  });
}

export function attachEditorLayerStateUpdater(
  material: RuntimeMaterial,
  updater: (editorLayerState: SkyboxEditorLayerState) => void
) {
  material.userData.applyEditorLayerState = updater;
}

// --- Selection-rect overlay shader codegen (image + spot), WGSL + GLSL ---

export const webGpuImageEditorRectOverlayFunction = wgslFn(`
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

export const webGpuSpotEditorRectInfoFunction = wgslFn(`
  fn skyboxStudioSpotEditorRectInfo(
    direction: vec3<f32>,
    spotCenterDirection: vec3<f32>,
    spotRadius: f32
  ) -> vec4<f32> {
    let spotDirection = normalize(direction);
    let spotCenter = normalize(spotCenterDirection);
    let spotTangentX = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), spotCenter));
    let spotTangentY = normalize(cross(spotCenter, spotTangentX));
    let spotDenom = dot(spotDirection, spotCenter);
    let safeSpotDenom = max(spotDenom, 0.000001);
    let spotLocalX = dot(spotDirection, spotTangentX) / safeSpotDenom / max(spotRadius, 0.0001);
    let spotLocalY = dot(spotDirection, spotTangentY) / safeSpotDenom / max(spotRadius, 0.0001);
    let spotU = spotLocalX * 0.5 + 0.5;
    let spotV = 0.5 - spotLocalY * 0.5;
    let spotEdgeDistance = min(min(spotU, 1.0 - spotU), min(spotV, 1.0 - spotV));
    let spotEdgeWidth = clamp(fwidth(spotEdgeDistance), 0.000001, ${numberLiteral(IMAGE_PROJECTION_MAX_EDGE_WIDTH)});
    let spotValid = step(${numberLiteral(IMAGE_PROJECTION_DENOM_EPSILON)}, spotDenom) *
      step(-spotEdgeWidth, spotEdgeDistance) *
      smoothstep(-spotEdgeWidth, spotEdgeWidth, spotEdgeDistance);

    return vec4<f32>(spotU, spotV, spotValid, 0.0);
  }
`);

