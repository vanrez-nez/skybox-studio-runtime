import * as THREE from "three";
type MoonSampleData = {
    sampleInfo: unknown;
    sampleNode: unknown;
    textureNode: {
        value: THREE.Texture;
    };
};
export type MoonLayerSampleNodes = {
    editorProjectionByLayerId: Map<string, {
        uv: unknown;
        valid: unknown;
    }>;
    sampleData: Map<string, MoonSampleData>;
    sampleNodesByParameterName: Record<string, unknown>;
    textureSlots: Record<string, unknown>;
};
export declare function updateMoonTextureNodes(samples: MoonLayerSampleNodes | undefined, textures: Map<string, THREE.Texture>): void;
export {};
