import * as THREE from "three";
import "./layer-addons/builtins";
import type { SkyboxGeometryOptions, SkyboxImagePlacement, SkyboxBakeOptions, SkyboxFieldGradientParams, SkyboxGradientParams, SkyboxManifest, SkyboxRenderMode, SkyboxSpotParams, SkyboxStarfieldParams } from "./manifest";
import type { StarGlintViewport } from "./baking/starfield-gpu-bake";
import type { ImageTextureMap, LayerCompositionUpdate, RuntimeMaterial, SkyboxEditorImageState, SkyboxEditorLayerState, SupportedRenderer } from "./skybox/types";
export declare class Skybox extends THREE.Mesh<THREE.BufferGeometry, RuntimeMaterial> {
    #private;
    constructor();
    fromManifest(manifest: SkyboxManifest): this;
    setGeometry(options: SkyboxGeometryOptions): this;
    setBakeOptions(options: SkyboxBakeOptions): this;
    setRenderer(renderer: SupportedRenderer | null): this;
    setRenderMode(mode: SkyboxRenderMode): this;
    setStarGlintViewport(viewport: StarGlintViewport | null): this;
    setImageTexture(layerId: string, texture: THREE.Texture | null): this;
    setImageTextures(textures: ImageTextureMap): this;
    refreshImageTextureBindings(): this;
    private refreshStarfieldTextureBindings;
    otherOverridingSetup(): this;
    load(renderer?: SupportedRenderer): this;
    private applyGeometry;
    private disposeOwnedTexture;
    private disposeStarfieldTextures;
    private disposeStarfieldGlints;
    private disposeStarfieldGlint;
    private syncStarfieldGlint;
    private coverageActive;
    private disposeCoverage;
    private syncCoverage;
    private renderCoveragePrepass;
    private syncStarfieldTextures;
    private scheduleStarfieldTextureBake;
    private replaceMaterial;
    private applyLiveManifestUniformUpdates;
    setEditorPresentationEnabled(enabled: boolean): this;
    setEditorLayerState(state: Partial<SkyboxEditorLayerState>): this;
    setEditorImageState(state: Partial<SkyboxEditorImageState>): this;
    setHoveredImageLayerId(layerId: string | null): this;
    setImageLayerPlacement(layerId: string, placement: SkyboxImagePlacement | null): this;
    updateImageLayerPlacement(layerId: string, placement: SkyboxImagePlacement | null): this;
    updateLayerComposition(layerId: string, composition: LayerCompositionUpdate): this;
    /**
     * Direct-pipeline live update for one layer's params (editor tweaks). Layer-
     * agnostic: delegates the per-type live behavior to the registered adapter's
     * `updateLive`. Never rebuilds the material (no setManifest).
     */
    updateLayer(layerId: string, params: unknown): this;
    updateGradientLayer(layerId: string, params: SkyboxGradientParams): this;
    updateFieldGradientLayer(layerId: string, params: SkyboxFieldGradientParams): this;
    updateSpotLayer(layerId: string, params: SkyboxSpotParams): this;
    updateStarfieldLayer(layerId: string, params: SkyboxStarfieldParams): this;
    setManifest(manifest: SkyboxManifest): this;
    setBakedTexture(texture: THREE.Texture): this;
    invalidateBakeCache(): this;
    dispose(): void;
}
