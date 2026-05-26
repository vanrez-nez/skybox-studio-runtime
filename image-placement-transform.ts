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

const WORLD_UP: VectorTuple = [0, 1, 0];
const DEFAULT_CENTER_DIRECTION: VectorTuple = [0, 0, -1];
const DEFAULT_TANGENT_X: VectorTuple = [1, 0, 0];
const DEFAULT_TANGENT_Y: VectorTuple = [0, 1, 0];
export const IMAGE_PLACEMENT_ELEVATION_LIMIT = 89.9;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

function normalizeAngleDegrees(degrees: number) {
  return ((degrees + 180) % 360 + 360) % 360 - 180;
}

function normalizeRotationDegrees(degrees: number) {
  return ((Math.round(degrees) % 360) + 360) % 360;
}

function dotVector(firstVector: VectorTuple, secondVector: VectorTuple) {
  return (
    firstVector[0] * secondVector[0] +
    firstVector[1] * secondVector[1] +
    firstVector[2] * secondVector[2]
  );
}

function subtractVector(firstVector: VectorTuple, secondVector: VectorTuple): VectorTuple {
  return [
    firstVector[0] - secondVector[0],
    firstVector[1] - secondVector[1],
    firstVector[2] - secondVector[2],
  ];
}

function multiplyVector(vector: VectorTuple, scalar: number): VectorTuple {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

function addVector(firstVector: VectorTuple, secondVector: VectorTuple): VectorTuple {
  return [
    firstVector[0] + secondVector[0],
    firstVector[1] + secondVector[1],
    firstVector[2] + secondVector[2],
  ];
}

function crossVector(firstVector: VectorTuple, secondVector: VectorTuple): VectorTuple {
  return [
    firstVector[1] * secondVector[2] - firstVector[2] * secondVector[1],
    firstVector[2] * secondVector[0] - firstVector[0] * secondVector[2],
    firstVector[0] * secondVector[1] - firstVector[1] * secondVector[0],
  ];
}

export function normalizeVector(
  vector: unknown,
  fallback: VectorTuple = DEFAULT_CENTER_DIRECTION
): VectorTuple {
  if (
    Array.isArray(vector) &&
    vector.length === 3 &&
    vector.every((component) => typeof component === "number" && Number.isFinite(component))
  ) {
    const length = Math.hypot(vector[0], vector[1], vector[2]);

    if (length > 0.000001) {
      return [vector[0] / length, vector[1] / length, vector[2] / length];
    }
  }

  return fallback;
}

function rotateVectorAroundAxis(vector: VectorTuple, axis: VectorTuple, degrees: number): VectorTuple {
  const radians = degreesToRadians(degrees);
  const cosRotation = Math.cos(radians);
  const sinRotation = Math.sin(radians);
  const normalizedAxis = normalizeVector(axis);
  const rotated = addVector(
    addVector(
      multiplyVector(vector, cosRotation),
      multiplyVector(crossVector(normalizedAxis, vector), sinRotation)
    ),
    multiplyVector(normalizedAxis, dotVector(normalizedAxis, vector) * (1 - cosRotation))
  );

  return normalizeVector(rotated, vector);
}

export function createImagePlacementTangents(
  centerDirection: VectorTuple,
  upDirection: VectorTuple = WORLD_UP,
  rotation = 0
) {
  const normalizedCenterDirection = normalizeVector(centerDirection);
  let tangentY = subtractVector(
    normalizeVector(upDirection, WORLD_UP),
    multiplyVector(
      normalizedCenterDirection,
      dotVector(normalizeVector(upDirection, WORLD_UP), normalizedCenterDirection)
    )
  );

  if (Math.hypot(tangentY[0], tangentY[1], tangentY[2]) < 0.000001) {
    const fallbackUp: VectorTuple = Math.abs(normalizedCenterDirection[1]) > 0.98
      ? [0, 0, 1]
      : WORLD_UP;

    tangentY = subtractVector(
      fallbackUp,
      multiplyVector(normalizedCenterDirection, dotVector(fallbackUp, normalizedCenterDirection))
    );
  }

  tangentY = normalizeVector(tangentY, DEFAULT_TANGENT_Y);

  return {
    tangentX: rotateVectorAroundAxis(
      normalizeVector(crossVector(normalizedCenterDirection, tangentY), DEFAULT_TANGENT_X),
      normalizedCenterDirection,
      rotation
    ),
    tangentY: rotateVectorAroundAxis(tangentY, normalizedCenterDirection, rotation),
  };
}

export function createAngularDecalPlacement({
  angularHeight,
  angularWidth,
  baseAngularHeight,
  baseAngularWidth,
  centerDirection,
  rotation = 0,
  upDirection = WORLD_UP,
}: CreateAngularDecalPlacementOptions): SkyboxImagePlacement {
  const normalizedCenterDirection = normalizeVector(centerDirection);
  const normalizedRotation = normalizeRotationDegrees(rotation);
  const { tangentX, tangentY } = createImagePlacementTangents(
    normalizedCenterDirection,
    upDirection,
    normalizedRotation
  );
  const normalizedAngularHeight = Math.max(0.0001, angularHeight);
  const normalizedAngularWidth = Math.max(0.0001, angularWidth);

  return {
    angularHeight: normalizedAngularHeight,
    angularWidth: normalizedAngularWidth,
    baseAngularHeight: Math.max(0.0001, baseAngularHeight ?? normalizedAngularHeight),
    baseAngularWidth: Math.max(0.0001, baseAngularWidth ?? normalizedAngularWidth),
    centerDirection: normalizedCenterDirection,
    projection: "angular-decal",
    rotation: normalizedRotation,
    tangentX,
    tangentY,
  };
}

export function normalizeImagePlacement(rawPlacement: unknown): SkyboxImagePlacement {
  const raw = rawPlacement as {
    angularHeight?: number;
    angularWidth?: number;
    baseAngularHeight?: number;
    baseAngularWidth?: number;
    center?: VectorTuple;
    centerDirection?: VectorTuple;
    height?: number;
    normal?: VectorTuple;
    rotation?: number;
    tangentX?: VectorTuple;
    tangentY?: VectorTuple;
    width?: number;
  } | null;
  const centerDirection = normalizeVector(
    raw?.centerDirection ?? raw?.normal ?? raw?.center,
    DEFAULT_CENTER_DIRECTION
  );
  const legacyDistance = Array.isArray(raw?.center)
    ? Math.max(0.0001, Math.hypot(raw.center[0], raw.center[1], raw.center[2]))
    : 1;
  const angularWidth =
    typeof raw?.angularWidth === "number"
      ? raw.angularWidth
      : 2 * Math.atan(Math.max(0.0001, raw?.width ?? 0.4) / (2 * legacyDistance));
  const angularHeight =
    typeof raw?.angularHeight === "number"
      ? raw.angularHeight
      : 2 * Math.atan(Math.max(0.0001, raw?.height ?? 0.3) / (2 * legacyDistance));

  return createAngularDecalPlacement({
    angularHeight,
    angularWidth,
    baseAngularHeight: typeof raw?.baseAngularHeight === "number" ? raw.baseAngularHeight : angularHeight,
    baseAngularWidth: typeof raw?.baseAngularWidth === "number" ? raw.baseAngularWidth : angularWidth,
    centerDirection,
    rotation: typeof raw?.rotation === "number" ? raw.rotation : 0,
  });
}

export function positionFromPlacement(placement: SkyboxImagePlacement): Point2 {
  const centerDirection = normalizeVector(placement.centerDirection);

  return {
    x: normalizeAngleDegrees(radiansToDegrees(Math.atan2(centerDirection[0], -centerDirection[2]))),
    y: radiansToDegrees(Math.asin(clamp(centerDirection[1], -1, 1))),
  };
}

export function directionFromPosition(position: Point2): VectorTuple {
  const yaw = degreesToRadians(position.x);
  const elevation = degreesToRadians(
    clamp(position.y, -IMAGE_PLACEMENT_ELEVATION_LIMIT, IMAGE_PLACEMENT_ELEVATION_LIMIT)
  );
  const cosElevation = Math.cos(elevation);

  return normalizeVector([
    Math.sin(yaw) * cosElevation,
    Math.sin(elevation),
    -Math.cos(yaw) * cosElevation,
  ]);
}

export function placementFromPosition(
  placement: SkyboxImagePlacement,
  position: Point2,
  options?: ImagePlacementPositionOptions
): SkyboxImagePlacement {
  const normalizedPlacement = normalizeImagePlacement(placement);

  return createAngularDecalPlacement({
    angularHeight: normalizedPlacement.angularHeight,
    angularWidth: normalizedPlacement.angularWidth,
    baseAngularHeight: normalizedPlacement.baseAngularHeight,
    baseAngularWidth: normalizedPlacement.baseAngularWidth,
    centerDirection: directionFromPosition(position),
    rotation: normalizedPlacement.rotation,
    upDirection: options?.upDirection,
  });
}

export function scaleFromPlacement(placement: SkyboxImagePlacement): Point2 {
  const normalizedPlacement = normalizeImagePlacement(placement);

  return {
    x: normalizedPlacement.angularWidth / normalizedPlacement.baseAngularWidth,
    y: normalizedPlacement.angularHeight / normalizedPlacement.baseAngularHeight,
  };
}

export function placementFromScale(placement: SkyboxImagePlacement, scale: Point2): SkyboxImagePlacement {
  const normalizedPlacement = normalizeImagePlacement(placement);

  return {
    ...normalizedPlacement,
    angularHeight: Math.max(0.0001, normalizedPlacement.baseAngularHeight * Math.max(0.0001, scale.y)),
    angularWidth: Math.max(0.0001, normalizedPlacement.baseAngularWidth * Math.max(0.0001, scale.x)),
  };
}

export function rotationFromPlacement(placement: SkyboxImagePlacement) {
  return normalizeImagePlacement(placement).rotation;
}

export function placementFromRotation(
  placement: SkyboxImagePlacement,
  rotation: number
): SkyboxImagePlacement {
  const normalizedPlacement = normalizeImagePlacement(placement);

  return createAngularDecalPlacement({
    angularHeight: normalizedPlacement.angularHeight,
    angularWidth: normalizedPlacement.angularWidth,
    baseAngularHeight: normalizedPlacement.baseAngularHeight,
    baseAngularWidth: normalizedPlacement.baseAngularWidth,
    centerDirection: normalizedPlacement.centerDirection,
    rotation,
  });
}

export function projectDirectionToImageUv(
  direction: VectorTuple,
  placement: SkyboxImagePlacement
): ImageProjectionUv | null {
  const normalizedPlacement = normalizeImagePlacement(placement);
  const normalizedDirection = normalizeVector(direction);
  const denom = dotVector(normalizedDirection, normalizedPlacement.centerDirection);

  if (denom <= 0) {
    return null;
  }

  const projectedX = dotVector(normalizedDirection, normalizedPlacement.tangentX) / denom;
  const projectedY = dotVector(normalizedDirection, normalizedPlacement.tangentY) / denom;
  const halfWidth = Math.tan(normalizedPlacement.angularWidth / 2);
  const halfHeight = Math.tan(normalizedPlacement.angularHeight / 2);

  if (
    halfWidth <= 0 ||
    halfHeight <= 0 ||
    projectedX < -halfWidth ||
    projectedX > halfWidth ||
    projectedY < -halfHeight ||
    projectedY > halfHeight
  ) {
    return null;
  }

  return {
    u: projectedX / (2 * halfWidth) + 0.5,
    v: 0.5 - projectedY / (2 * halfHeight),
  };
}
