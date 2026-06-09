// WGSL shader-string emitters shared by the layer adapters + composition codegen.
// The runtime is WebGPU-only, so these emit WGSL exclusively.
import { clamp, parseHexColor } from "../math";

export function numberLiteral(value: number) {
  return Number.isFinite(value) ? value.toFixed(8) : "0.0";
}

export function colorLiteral(color: string) {
  const [red, green, blue] = parseHexColor(color);

  return `vec3<f32>(${numberLiteral(red)}, ${numberLiteral(green)}, ${numberLiteral(blue)})`;
}

export function vec4Literal(color: string, alpha: number) {
  return `vec4<f32>(${colorLiteral(color)}, ${numberLiteral(clamp(alpha))})`;
}

export function vectorLiteral(value: number) {
  return `vec3<f32>(${numberLiteral(value)})`;
}

export function imageVec3Literal(value: [number, number, number]) {
  return `vec3<f32>(${numberLiteral(value[0])}, ${numberLiteral(value[1])}, ${numberLiteral(value[2])})`;
}

export function mutableDeclaration(name: string, type: string, initialValue: string) {
  return `var ${name}: ${type} = ${initialValue};`;
}

export function selectExpression(condition: string, whenTrue: string, whenFalse: string) {
  return `select(${whenFalse}, ${whenTrue}, ${condition})`;
}

export function zeroEffectExpression() {
  return `effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);`;
}
