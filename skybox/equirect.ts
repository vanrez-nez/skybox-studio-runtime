// Generic equirectangular direction↔UV helpers (GLSL). The WGSL/TSL equivalents live with the
// material builders; the CPU versions live in `layer-addons/cpu-sampling.ts`. Centered on -Z with
// +X to the right (matches the editor's default camera + the image/spot placement convention).
export function glslDirectionToEquirectUvFunction() {
  return `
      const float SKYBOX_STUDIO_PI = 3.141592653589793;

      vec2 directionToEquirectUv(vec3 direction) {
        vec3 normalizedDirection = normalize(direction);
        float longitude = atan(normalizedDirection.x, -normalizedDirection.z);
        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));

        return vec2(longitude / (2.0 * SKYBOX_STUDIO_PI) + 0.5, latitude / SKYBOX_STUDIO_PI + 0.5);
      }

      vec2 directionToSourceStarfieldUv(vec3 direction) {
        vec3 normalizedDirection = normalize(direction);
        float theta = atan(normalizedDirection.x, normalizedDirection.z);
        float u = fract(theta / (2.0 * SKYBOX_STUDIO_PI) + 0.5);
        float v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / SKYBOX_STUDIO_PI;

        return vec2(u, v);
      }
    `;
}
