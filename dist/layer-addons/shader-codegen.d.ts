export type ShaderLanguage = "glsl" | "wgsl";
export declare function numberLiteral(value: number): string;
export declare function colorLiteral(color: string, language: ShaderLanguage): string;
export declare function vec4Literal(color: string, alpha: number, language: ShaderLanguage): string;
export declare function vectorLiteral(value: number, language: ShaderLanguage): string;
export declare function imageVec3Literal(value: [number, number, number], language: ShaderLanguage): string;
export declare function mutableDeclaration(name: string, type: string, initialValue: string, language: ShaderLanguage): string;
export declare function selectExpression(condition: string, whenTrue: string, whenFalse: string, language: ShaderLanguage): string;
export declare function zeroEffectExpression(language: ShaderLanguage): string;
