import * as THREE from "three/webgpu";

/**
 * Single-channel `DataTexture` with a mip chain.
 *
 * The mip chain is the point: shaders that sample this from a projection with a
 * varying screen footprint rely on hardware trilinear filtering to pick a level,
 * and on explicit `texture(tex, uv, lod)` where a deliberately coarser level is
 * wanted.
 */
export function makeMippedDataTexture(
  data: Uint8Array,
  width: number,
  height: number,
  wrap: THREE.Wrapping,
): THREE.DataTexture {
  const dataTexture = new THREE.DataTexture(data, width, height);
  dataTexture.format = THREE.RedFormat;
  dataTexture.type = THREE.UnsignedByteType;
  dataTexture.wrapS = wrap;
  dataTexture.wrapT = wrap;
  dataTexture.minFilter = THREE.LinearMipmapLinearFilter;
  dataTexture.magFilter = THREE.LinearFilter;
  dataTexture.generateMipmaps = true;
  dataTexture.unpackAlignment = 1;
  dataTexture.needsUpdate = true;
  return dataTexture;
}
