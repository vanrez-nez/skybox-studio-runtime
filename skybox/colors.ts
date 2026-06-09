// Color helpers shared across layers (e.g. field-gradient anchors and spot light color).
import * as THREE from "three";

import { parseHexColor } from "../math";

export function colorVectorFromHex(color: string) {
  const [red, green, blue] = parseHexColor(color);

  return new THREE.Vector3(red, green, blue);
}
