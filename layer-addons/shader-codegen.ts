import { clamp, parseHexColor } from "../math";

export type ShaderLanguage = "glsl" | "wgsl";

export function numberLiteral(value: number) {
  return Number.isFinite(value) ? value.toFixed(8) : "0.0";
}

export function colorLiteral(color: string, language: ShaderLanguage) {
  const [red, green, blue] = parseHexColor(color);
  const type = language === "wgsl" ? "vec3<f32>" : "vec3";

  return `${type}(${numberLiteral(red)}, ${numberLiteral(green)}, ${numberLiteral(blue)})`;
}

export function vec4Literal(color: string, alpha: number, language: ShaderLanguage) {
  const type = language === "wgsl" ? "vec4<f32>" : "vec4";

  return `${type}(${colorLiteral(color, language)}, ${numberLiteral(clamp(alpha))})`;
}

export function vectorLiteral(value: number, language: ShaderLanguage) {
  return language === "wgsl" ? `vec3<f32>(${numberLiteral(value)})` : `vec3(${numberLiteral(value)})`;
}

export function imageVec3Literal(value: [number, number, number], language: ShaderLanguage) {
  const type = language === "wgsl" ? "vec3<f32>" : "vec3";

  return `${type}(${numberLiteral(value[0])}, ${numberLiteral(value[1])}, ${numberLiteral(value[2])})`;
}

export function mutableDeclaration(
  name: string,
  type: string,
  initialValue: string,
  language: ShaderLanguage
) {
  return language === "wgsl"
    ? `var ${name}: ${type} = ${initialValue};`
    : `${type} ${name} = ${initialValue};`;
}

export function selectExpression(
  condition: string,
  whenTrue: string,
  whenFalse: string,
  language: ShaderLanguage
) {
  return language === "wgsl"
    ? `select(${whenFalse}, ${whenTrue}, ${condition})`
    : `((${condition}) ? ${whenTrue} : ${whenFalse})`;
}

export function zeroEffectExpression(language: ShaderLanguage) {
  return `effectColor = ${language === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
