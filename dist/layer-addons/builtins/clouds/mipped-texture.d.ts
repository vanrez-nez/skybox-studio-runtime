import * as THREE from "three/webgpu";
/**
 * Single-channel `DataTexture` with a mip chain.
 *
 * The mip chain is the point: shaders that sample this from a projection with a
 * varying screen footprint rely on hardware trilinear filtering to pick a level,
 * and on explicit `texture(tex, uv, lod)` where a deliberately coarser level is
 * wanted.
 */
export declare function makeMippedDataTexture(data: Uint8Array, width: number, height: number, wrap: THREE.Wrapping): THREE.DataTexture;
