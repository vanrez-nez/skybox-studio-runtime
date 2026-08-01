import * as THREE from "three";
import { type SkyboxGeometryOptions } from "../manifest";
export declare function resolveGeometryOptions(options?: SkyboxGeometryOptions): SkyboxGeometryOptions;
export declare function createSkyboxGeometry(options?: SkyboxGeometryOptions): THREE.BoxGeometry | THREE.SphereGeometry;
export declare function createSkyboxWireGeometry(options?: SkyboxGeometryOptions): THREE.BufferGeometry<THREE.NormalBufferAttributes, THREE.BufferGeometryEventMap>;
