export type SkyboxCompositionMode = "alpha-over";
export type SkyboxCompositionOrder = "bottom-to-top";
export type SkyboxEffectType = "field-gradient" | "gradient";
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

export type SkyboxGradientStop = {
  color: string;
  location: number;
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

export type SkyboxManifestLayer =
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
    };

export type SkyboxManifestV1 = {
  composition: {
    mode: SkyboxCompositionMode;
    order: SkyboxCompositionOrder;
  };
  layers: SkyboxManifestLayer[];
  version: 1;
};
