import * as THREE from "three";
import type { ImageEditorUniformNodes, ImageLayerShaderBinding, RuntimeMaterial, SkyboxEditorLayerState, SpotEditorUniformNodes, SpotLayerShaderBinding } from "./types";
export declare const DEFAULT_EDITOR_LAYER_STATE: SkyboxEditorLayerState;
export declare function createImageEditorUniformNodes(bindings: ImageLayerShaderBinding[], editorLayerState: SkyboxEditorLayerState): ImageEditorUniformNodes[];
export declare function createSpotEditorUniformNodes(bindings: SpotLayerShaderBinding[], editorLayerState: SkyboxEditorLayerState): SpotEditorUniformNodes[];
export declare function createWgslEditorUniformNodes(bindings: {
    layer: {
        id: string;
    };
}[], editorLayerState: SkyboxEditorLayerState): ImageEditorUniformNodes[];
export declare function applyEditorLayerStateToUniformNodes(uniforms: ImageEditorUniformNodes[], editorLayerState: SkyboxEditorLayerState): void;
export declare function imageEditorShaderUniforms(bindings: ImageLayerShaderBinding[], editorLayerState: SkyboxEditorLayerState): {
    [k: string]: {
        value: number;
    };
};
export declare function spotEditorShaderUniforms(bindings: SpotLayerShaderBinding[], editorLayerState: SkyboxEditorLayerState): {
    [k: string]: {
        value: number;
    };
};
export declare function applyEditorLayerStateToShaderUniforms(material: THREE.ShaderMaterial, imageBindings: ImageLayerShaderBinding[], spotBindings: SpotLayerShaderBinding[], editorLayerState: SkyboxEditorLayerState): void;
export declare function attachEditorLayerStateUpdater(material: RuntimeMaterial, updater: (editorLayerState: SkyboxEditorLayerState) => void): void;
export declare const webGpuImageEditorRectOverlayFunction: (...params: (number | import("three/webgpu").Node)[] | readonly [import("three/tsl").ProxiedObject<{
    [name: string]: number | import("three/webgpu").Node;
}>]) => import("three/webgpu").Node;
export declare const webGpuSpotEditorRectInfoFunction: (...params: (number | import("three/webgpu").Node)[] | readonly [import("three/tsl").ProxiedObject<{
    [name: string]: number | import("three/webgpu").Node;
}>]) => import("three/webgpu").Node;
