// Constants shared by the image rect projection and the editor selection-rect overlays
// (image + spot). Kept in one place so the per-layer builtins and the editor-overlay codegen agree.
export const IMAGE_ACTIVE_RECT_ALPHA = 0.18;
export const IMAGE_ACTIVE_BOUNDS_INNER_PIXELS = 0.75;
export const IMAGE_ACTIVE_BOUNDS_OUTER_PIXELS = 1.75;
export const IMAGE_PROJECTION_DENOM_EPSILON = 0.0001;
export const IMAGE_PROJECTION_MAX_EDGE_WIDTH = 0.01;
