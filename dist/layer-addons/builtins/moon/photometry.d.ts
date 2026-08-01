export type HapkeMaterial = Readonly<{
    /** Double-lobed Henyey-Greenstein lobe width. */
    b: number;
    /** Backward-versus-forward lobe weight. */
    c: number;
    /** Shadow-hiding opposition-effect amplitude. */
    oppositionAmplitude: number;
    /** Shadow-hiding opposition-effect angular width. */
    oppositionWidth: number;
    /** Single-scattering albedo. */
    singleScatteringAlbedo: number;
}>;
export declare const HAPKE_HIGHLANDS_643: HapkeMaterial;
export declare const HAPKE_MARIA_643: HapkeMaterial;
export declare const HAPKE_ALL_AREA_643: HapkeMaterial;
export declare const HAPKE_ROUGHNESS_RADIANS: number;
export declare const SUN_ANGULAR_RADIUS_RADIANS: number;
export declare const EARTHSHINE_MAX_IRRADIANCE: number;
/**
 * Evaluates the SHOE-only Hapke reflectance used by the GPU baker.
 * `mu0` is N.L, `mu` is N.V, and `cosPhase` is L.V.
 */
export declare function evaluateHapkeReflectance({ cosPhase, material, mu, mu0, }: {
    cosPhase: number;
    material: HapkeMaterial;
    mu: number;
    mu0: number;
}): number;
export declare const HAPKE_ALL_AREA_FULL_MOON_REFERENCE: number;
/** Lambertian disk phase, 1 at full Earth and 0 at new Earth. */
export declare function lambertSpherePhase(phaseRadians: number): number;
