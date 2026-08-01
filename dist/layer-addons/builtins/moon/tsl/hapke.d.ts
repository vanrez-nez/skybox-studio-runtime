export declare function lunarHapkeMaterial(mare: any, mottle: any, brightRays: any): {
    b: any;
    c: any;
    oppositionAmplitude: any;
    oppositionWidth: any;
    singleScatteringAlbedo: any;
};
/**
 * SHOE-only Hapke radiance coefficient with the 1984 macroscopic-roughness
 * correction. This is the node equivalent of evaluateHapkeReflectance().
 */
export declare function hapkeReflectance({ cosPhase, material, mu, mu0, }: {
    cosPhase: any;
    material: ReturnType<typeof lunarHapkeMaterial>;
    mu: any;
    mu0: any;
}): any;
export declare function normalizeLunarReflectance(reflectance: any): any;
/** Earth is full from the Moon when the observer-facing lunar side is new. */
export declare function earthshineIrradiance(lunarPhase: any): any;
