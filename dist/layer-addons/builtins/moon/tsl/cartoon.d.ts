export declare const MAX_CARTOON_CRATERS = 64;
/**
 * @param sp        surface point in body space (rotated by libration)
 * @param n         surface normal in view space
 * @param sunBody   sun direction in body space
 * @param sunView   sun direction in view space — drives the phase only
 * @param artBody   fixed key light in body space — orients crater relief
 * @param artView   fixed key light in view space — drives the ball gradient
 * @returns vec4(colour, alphaFactor) — alpha is 0 on the cropped-away side
 */
export declare function cartoon(p: any, sp: any, n: any, sunBody: any, sunView: any, artBody: any, artView: any, U: any): any;
