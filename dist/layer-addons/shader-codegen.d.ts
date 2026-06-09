export declare function numberLiteral(value: number): string;
export declare function colorLiteral(color: string): string;
export declare function vec4Literal(color: string, alpha: number): string;
export declare function vectorLiteral(value: number): string;
export declare function imageVec3Literal(value: [number, number, number]): string;
export declare function mutableDeclaration(name: string, type: string, initialValue: string): string;
export declare function selectExpression(condition: string, whenTrue: string, whenFalse: string): string;
export declare function zeroEffectExpression(): string;
