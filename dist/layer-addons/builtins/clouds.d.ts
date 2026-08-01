import * as THREE from "three";
import { uniform } from "three/tsl";
import type { SkyboxCloudsParams, SkyboxManifestLayer, SkyboxManifestV2 } from "../../manifest";
import { createCustomSkyModel } from "./clouds/custom-sky-model";
export type CloudsLayerShaderBinding = {
    index: number;
    layer: Extract<SkyboxManifestLayer, {
        type: "clouds";
    }>;
    parameterPrefix: string;
};
type CustomSkyModel = ReturnType<typeof createCustomSkyModel>;
export type CloudsUniformNodes = {
    layerId: string;
    model: CustomSkyModel | null;
    motionMode: SkyboxCloudsParams["motionMode"];
    time: ReturnType<typeof uniform> | null;
};
export type CloudsSampleNodeData = {
    model: CustomSkyModel;
    sampleNode: any;
    time: ReturnType<typeof uniform>;
};
export type CloudsLayerSampleNodes = {
    sampleData: Map<string, CloudsSampleNodeData>;
    sampleNodesByLayerId: Record<string, unknown>;
    textureSlots: Record<string, unknown>;
};
export declare const DEFAULT_SKYBOX_CLOUDS_PARAMS: SkyboxCloudsParams;
export declare const FULL_MOON_SKYBOX_CLOUDS_PARAMS: SkyboxCloudsParams;
export declare function cloneSkyboxCloudsParams(params: SkyboxCloudsParams): SkyboxCloudsParams;
export declare function createDefaultSkyboxCloudsParams(): SkyboxCloudsParams;
export declare function syncCloudFieldTextures(manifest: SkyboxManifestV2, textures: Map<string, THREE.Texture>): boolean;
export declare function disposeCloudFieldTextures(textures: Map<string, THREE.Texture>): void;
export declare function updateCloudFieldTextureNodes(samples: CloudsLayerSampleNodes | undefined, textures: Map<string, THREE.Texture>): void;
export {};
