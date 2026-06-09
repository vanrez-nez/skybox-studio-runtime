import * as THREE from "three";

import { DEFAULT_SKYBOX_GEOMETRY, type SkyboxGeometryOptions } from "../manifest";

export function resolveGeometryOptions(options?: SkyboxGeometryOptions): SkyboxGeometryOptions {
  return options ?? DEFAULT_SKYBOX_GEOMETRY;
}

export function createSkyboxGeometry(options: SkyboxGeometryOptions = DEFAULT_SKYBOX_GEOMETRY) {
  return resolveGeometryOptions(options).type === "sphere"
    ? new THREE.SphereGeometry(1, 64, 32)
    : new THREE.BoxGeometry(1, 1, 1);
}

function createSphereGridWireGeometry(radius = 1, longitudeSegments = 25, latitudeSegments = 25) {
  const vertices: number[] = [];

  const pushPoint = (theta: number, phi: number) => {
    vertices.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  };

  for (let longitudeIndex = 0; longitudeIndex < longitudeSegments; longitudeIndex += 1) {
    const theta = (longitudeIndex / longitudeSegments) * Math.PI * 2;

    for (let latitudeIndex = 0; latitudeIndex < latitudeSegments; latitudeIndex += 1) {
      const firstPhi = (latitudeIndex / latitudeSegments) * Math.PI;
      const secondPhi = ((latitudeIndex + 1) / latitudeSegments) * Math.PI;

      pushPoint(theta, firstPhi);
      pushPoint(theta, secondPhi);
    }
  }

  for (let latitudeIndex = 1; latitudeIndex < latitudeSegments; latitudeIndex += 1) {
    const phi = (latitudeIndex / latitudeSegments) * Math.PI;

    for (let longitudeIndex = 0; longitudeIndex < longitudeSegments; longitudeIndex += 1) {
      const firstTheta = (longitudeIndex / longitudeSegments) * Math.PI * 2;
      const secondTheta = ((longitudeIndex + 1) / longitudeSegments) * Math.PI * 2;

      pushPoint(firstTheta, phi);
      pushPoint(secondTheta, phi);
    }
  }

  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
}

export function createSkyboxWireGeometry(options: SkyboxGeometryOptions = DEFAULT_SKYBOX_GEOMETRY) {
  if (resolveGeometryOptions(options).type === "sphere") {
    return createSphereGridWireGeometry();
  }

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const wireGeometry = new THREE.EdgesGeometry(boxGeometry);

  boxGeometry.dispose();

  return wireGeometry;
}
