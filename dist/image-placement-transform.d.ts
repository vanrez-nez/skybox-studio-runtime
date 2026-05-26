import type { SkyboxImagePlacement } from "./manifest";
export type VectorTuple = [number, number, number];
export type Point2 = {
    x: number;
    y: number;
};
export type ImageProjectionUv = {
    u: number;
    v: number;
};
export type CreateAngularDecalPlacementOptions = {
    angularHeight: number;
    angularWidth: number;
    baseAngularHeight?: number;
    baseAngularWidth?: number;
    centerDirection: VectorTuple;
    rotation?: number;
    upDirection?: VectorTuple;
};
export type ImagePlacementPositionOptions = {
    upDirection?: VectorTuple;
};
export declare const IMAGE_PLACEMENT_ELEVATION_LIMIT = 89.9;
export declare function normalizeVector(vector: unknown, fallback?: VectorTuple): VectorTuple;
export declare function createImagePlacementTangents(centerDirection: VectorTuple, upDirection?: VectorTuple, rotation?: number): {
    tangentX: VectorTuple;
    tangentY: VectorTuple;
};
export declare function createAngularDecalPlacement({ angularHeight, angularWidth, baseAngularHeight, baseAngularWidth, centerDirection, rotation, upDirection, }: CreateAngularDecalPlacementOptions): SkyboxImagePlacement;
export declare function normalizeImagePlacement(rawPlacement: unknown): SkyboxImagePlacement;
export declare function positionFromPlacement(placement: SkyboxImagePlacement): Point2;
export declare function directionFromPosition(position: Point2): VectorTuple;
export declare function placementFromPosition(placement: SkyboxImagePlacement, position: Point2, options?: ImagePlacementPositionOptions): SkyboxImagePlacement;
export declare function scaleFromPlacement(placement: SkyboxImagePlacement): Point2;
export declare function placementFromScale(placement: SkyboxImagePlacement, scale: Point2): SkyboxImagePlacement;
export declare function rotationFromPlacement(placement: SkyboxImagePlacement): number;
export declare function placementFromRotation(placement: SkyboxImagePlacement, rotation: number): SkyboxImagePlacement;
export declare function projectDirectionToImageUv(direction: VectorTuple, placement: SkyboxImagePlacement): ImageProjectionUv | null;
