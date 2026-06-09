import * as THREE from "three";
import type { SkyboxGradientParams } from "../manifest";
export declare function sortedGradientStops(params: {
    stops: SkyboxGradientParams["stops"];
}): {
    color: string;
    midpoint: number;
    opacity: number;
    t: number;
}[];
export declare function colorVectorFromStop(stop: ReturnType<typeof sortedGradientStops>[number]): THREE.Vector4;
