export type SkyboxCompositionMode = "alpha-over";
export type SkyboxCompositionOrder = "bottom-to-top";
export type SkyboxEffectType = "field-gradient" | "gradient" | "image" | "spot";
export type SkyboxLayerBlendMode = "normal" | "darken" | "multiply" | "color-burn" | "lighten" | "screen" | "color-dodge" | "overlay" | "soft-light" | "hard-light" | "difference" | "exclusion";
export type SkyboxGradientMode = "linear";
export type SkyboxFieldGradientMode = "gaussian" | "inverse-distance";
export type SkyboxGeometryType = "box" | "sphere";
export type SkyboxSpotColorMode = "gradient" | "light";
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
export type SkyboxSpotLayer = {
    blendMode: SkyboxLayerBlendMode;
    enabled: boolean;
    id: string;
    name: string;
    opacity: number;
    params: SkyboxSpotParams;
    type: "spot";
};
export type SkyboxManifestLayer = SkyboxGradientLayer | SkyboxFieldGradientLayer | SkyboxImageLayer | SkyboxSpotLayer;
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
export type SkyboxManifestV1Layer = {
    blendMode: SkyboxLayerBlendMode;
    enabled: boolean;
    id: string;
    name: string;
    opacity: number;
    params: SkyboxGradientParams;
    type: "gradient";
} | {
    blendMode: SkyboxLayerBlendMode;
    enabled: boolean;
    id: string;
    name: string;
    opacity: number;
    params: SkyboxFieldGradientParams;
    type: "field-gradient";
} | {
    blendMode: SkyboxLayerBlendMode;
    enabled: boolean;
    id: string;
    name: string;
    opacity: number;
    params: SkyboxImageParams;
    type: "image";
} | {
    blendMode: SkyboxLayerBlendMode;
    enabled: boolean;
    id: string;
    name: string;
    opacity: number;
    params: SkyboxSpotParams;
    type: "spot";
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
export declare const DEFAULT_SKYBOX_GEOMETRY: SkyboxGeometryOptions;
export declare function migrateManifestToV2(manifest: SkyboxManifest): SkyboxManifestV2;
