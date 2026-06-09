import * as THREE from "three";

// 1×1 transparent fallback texture for image/starfield layers that have no bound texture yet.
export const EMPTY_IMAGE_TEXTURE = new THREE.DataTexture(
  new Uint8Array([0, 0, 0, 0]),
  1,
  1,
  THREE.RGBAFormat
);

EMPTY_IMAGE_TEXTURE.colorSpace = THREE.SRGBColorSpace;
EMPTY_IMAGE_TEXTURE.needsUpdate = true;
