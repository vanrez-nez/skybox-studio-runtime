// Calibrated visible-light Hapke parameters for the Moon at 640/643 nm.
//
// The material tuples are the LRO/WAC regional averages reported by Sato et al.
// (2014), reproduced in Jiang et al. (2021), table 2. The roughness correction
// and H-function follow the public-domain USGS ISIS Hapke implementation.

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

export const HAPKE_HIGHLANDS_643: HapkeMaterial = {
  b: 0.23,
  c: 0.37,
  oppositionAmplitude: 1.7,
  oppositionWidth: 0.08,
  singleScatteringAlbedo: 0.42,
};

export const HAPKE_MARIA_643: HapkeMaterial = {
  b: 0.26,
  c: 0.08,
  oppositionAmplitude: 2,
  oppositionWidth: 0.05,
  singleScatteringAlbedo: 0.24,
};

export const HAPKE_ALL_AREA_643: HapkeMaterial = {
  b: 0.24,
  c: 0.32,
  oppositionAmplitude: 1.7,
  oppositionWidth: 0.07,
  singleScatteringAlbedo: 0.38,
};

export const HAPKE_ROUGHNESS_RADIANS = 23.4 * Math.PI / 180;
export const SUN_ANGULAR_RADIUS_RADIANS = 0.266 * Math.PI / 180;

const EARTH_GEOMETRIC_ALBEDO = 0.434;
const EARTH_MEAN_RADIUS_KM = 6371;
const EARTH_MOON_MEAN_DISTANCE_KM = 384_400;

export const EARTHSHINE_MAX_IRRADIANCE =
  EARTH_GEOMETRIC_ALBEDO *
  (EARTH_MEAN_RADIUS_KM / EARTH_MOON_MEAN_DISTANCE_KM) ** 2;

const EPSILON = 1e-10;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hFunction(mu: number, gamma: number) {
  return (1 + 2 * mu) / (1 + 2 * mu * gamma);
}

/**
 * Evaluates the SHOE-only Hapke reflectance used by the GPU baker.
 * `mu0` is N.L, `mu` is N.V, and `cosPhase` is L.V.
 */
export function evaluateHapkeReflectance({
  cosPhase,
  material,
  mu,
  mu0,
}: {
  cosPhase: number;
  material: HapkeMaterial;
  mu: number;
  mu0: number;
}) {
  mu0 = clamp(mu0, 0, 1);
  mu = clamp(mu, 0, 1);
  if (mu0 <= EPSILON || mu <= EPSILON) return 0;

  const phase = Math.acos(clamp(cosPhase, -1, 1));
  const cosG = Math.cos(phase);
  const halfPhaseTan = Math.tan(phase / 2);
  const opposition = material.oppositionAmplitude /
    (1 + halfPhaseTan / material.oppositionWidth);

  const b2 = material.b * material.b;
  const phaseNumerator = 1 - b2;
  const backward = phaseNumerator /
    Math.max((1 - 2 * material.b * cosG + b2) ** 1.5, EPSILON);
  const forward = phaseNumerator /
    Math.max((1 + 2 * material.b * cosG + b2) ** 1.5, EPSILON);
  const particlePhase =
    0.5 * (1 + material.c) * backward +
    0.5 * (1 - material.c) * forward;

  const theta = HAPKE_ROUGHNESS_RADIANS;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cotTheta = cosTheta / Math.max(sinTheta, EPSILON);
  const cotTheta2 = cotTheta * cotTheta;
  const tanTheta = sinTheta / Math.max(cosTheta, EPSILON);
  const roughnessScale = Math.sqrt(1 + Math.PI * tanTheta * tanTheta);
  const inverseRoughnessScale = 1 / roughnessScale;

  const sinI = Math.sqrt(Math.max(1 - mu0 * mu0, 0));
  const cotI = mu0 / Math.max(sinI, EPSILON);
  const expCotI = Math.exp(-cotTheta2 * cotI * cotI / Math.PI);
  const exp2CotI = Math.exp(-2 * cotTheta * cotI / Math.PI);
  const mu0Projected = inverseRoughnessScale *
    (mu0 + sinI * tanTheta * expCotI / Math.max(2 - exp2CotI, EPSILON));

  const sinE = Math.sqrt(Math.max(1 - mu * mu, 0));
  const cotE = mu / Math.max(sinE, EPSILON);
  const expCotE = Math.exp(-cotTheta2 * cotE * cotE / Math.PI);
  const exp2CotE = Math.exp(-2 * cotTheta * cotE / Math.PI);
  const muProjected = inverseRoughnessScale *
    (mu + sinE * tanTheta * expCotE / Math.max(2 - exp2CotE, EPSILON));

  const sinProduct = sinI * sinE;
  const azimuthCosine = sinProduct <= EPSILON
    ? 1
    : clamp((cosG - mu * mu0) / sinProduct, -1, 1);
  const azimuth = Math.acos(azimuthCosine);
  const halfAzimuth = azimuth / 2;
  const azimuthFade = halfAzimuth >= Math.PI / 2
    ? 0
    : Math.exp(-2 * Math.tan(halfAzimuth));
  const sinHalfAzimuth2 = Math.sin(halfAzimuth) ** 2;
  const normalizedAzimuth = azimuth / Math.PI;

  let effectiveMu0: number;
  let effectiveMu: number;
  let q: number;
  if (mu0 >= mu) {
    q = inverseRoughnessScale * mu0 / Math.max(mu0Projected, EPSILON);
    const denominator = Math.max(2 - exp2CotE - normalizedAzimuth * exp2CotI, EPSILON);
    const cross = sinHalfAzimuth2 * expCotI;
    effectiveMu0 = inverseRoughnessScale *
      (mu0 + sinI * tanTheta * (azimuthCosine * expCotE + cross) / denominator);
    effectiveMu = inverseRoughnessScale *
      (mu + sinE * tanTheta * (expCotE - cross) / denominator);
  } else {
    q = inverseRoughnessScale * mu / Math.max(muProjected, EPSILON);
    const denominator = Math.max(2 - exp2CotI - normalizedAzimuth * exp2CotE, EPSILON);
    const cross = sinHalfAzimuth2 * expCotE;
    effectiveMu0 = inverseRoughnessScale *
      (mu0 + sinI * tanTheta * (expCotI - cross) / denominator);
    effectiveMu = inverseRoughnessScale *
      (mu + sinE * tanTheta * (azimuthCosine * expCotI + cross) / denominator);
  }

  effectiveMu0 = Math.max(effectiveMu0, EPSILON);
  effectiveMu = Math.max(effectiveMu, EPSILON);
  const gamma = Math.sqrt(Math.max(1 - material.singleScatteringAlbedo, 0));
  const multipleScattering =
    hFunction(effectiveMu0, gamma) * hFunction(effectiveMu, gamma);
  const singleAndMultiple =
    (1 + opposition) * particlePhase - 1 + multipleScattering;
  const radiance = material.singleScatteringAlbedo / 4 *
    effectiveMu0 / (effectiveMu0 + effectiveMu) * singleAndMultiple;
  const shadowing = effectiveMu * mu0 /
    Math.max(
      muProjected * mu0Projected * roughnessScale *
        (1 - azimuthFade + azimuthFade * q),
      EPSILON,
    );

  return Math.max(radiance * shadowing, 0);
}

export const HAPKE_ALL_AREA_FULL_MOON_REFERENCE = evaluateHapkeReflectance({
  cosPhase: 1,
  material: HAPKE_ALL_AREA_643,
  mu: 1,
  mu0: 1,
});

/** Lambertian disk phase, 1 at full Earth and 0 at new Earth. */
export function lambertSpherePhase(phaseRadians: number) {
  const phase = clamp(phaseRadians, 0, Math.PI);
  return Math.max(
    (Math.sin(phase) + (Math.PI - phase) * Math.cos(phase)) / Math.PI,
    0,
  );
}
