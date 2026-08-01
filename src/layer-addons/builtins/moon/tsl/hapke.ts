import * as TSL from "three/tsl";

import {
  EARTHSHINE_MAX_IRRADIANCE,
  HAPKE_ALL_AREA_FULL_MOON_REFERENCE,
  HAPKE_HIGHLANDS_643,
  HAPKE_MARIA_643,
  HAPKE_ROUGHNESS_RADIANS,
} from "../photometry";

const {
  acos, clamp, cos, exp, float, max, min, mix, pow, select, sin, sqrt, step, tan,
} = TSL as any;

const PI = Math.PI;
const EPSILON = 1e-6;

function hFunction(mu: any, gamma: any) {
  return mu.mul(2).add(1).div(mu.mul(gamma).mul(2).add(1));
}

export function lunarHapkeMaterial(mare: any, mottle: any, brightRays: any) {
  const mixParameter = (highlands: number, maria: number) =>
    mix(float(highlands), float(maria), mare);
  const rayBoost = clamp(brightRays, 0, 1).mul(0.25).add(1);
  const singleScatteringAlbedo = mixParameter(
    HAPKE_HIGHLANDS_643.singleScatteringAlbedo,
    HAPKE_MARIA_643.singleScatteringAlbedo,
  )
    .mul(mottle.clamp(-0.07, 0.07).add(1))
    .mul(rayBoost)
    .clamp(0.02, 0.95);

  return {
    b: mixParameter(HAPKE_HIGHLANDS_643.b, HAPKE_MARIA_643.b),
    c: mixParameter(HAPKE_HIGHLANDS_643.c, HAPKE_MARIA_643.c),
    oppositionAmplitude: mixParameter(
      HAPKE_HIGHLANDS_643.oppositionAmplitude,
      HAPKE_MARIA_643.oppositionAmplitude,
    ),
    oppositionWidth: mixParameter(
      HAPKE_HIGHLANDS_643.oppositionWidth,
      HAPKE_MARIA_643.oppositionWidth,
    ),
    singleScatteringAlbedo,
  };
}

/**
 * SHOE-only Hapke radiance coefficient with the 1984 macroscopic-roughness
 * correction. This is the node equivalent of evaluateHapkeReflectance().
 */
export function hapkeReflectance({
  cosPhase,
  material,
  mu,
  mu0,
}: {
  cosPhase: any;
  material: ReturnType<typeof lunarHapkeMaterial>;
  mu: any;
  mu0: any;
}) {
  const incident = clamp(mu0, 0, 1);
  const emitted = clamp(mu, 0, 1);
  const phaseCosine = clamp(cosPhase, -1, 1);
  const phase = acos(phaseCosine);
  const opposition = material.oppositionAmplitude.div(
    tan(phase.mul(0.5)).div(material.oppositionWidth).add(1),
  );

  const b2 = material.b.mul(material.b);
  const numerator = b2.oneMinus();
  const backward = numerator.div(
    pow(max(float(1).sub(material.b.mul(phaseCosine).mul(2)).add(b2), EPSILON), 1.5),
  );
  const forward = numerator.div(
    pow(max(float(1).add(material.b.mul(phaseCosine).mul(2)).add(b2), EPSILON), 1.5),
  );
  const particlePhase = material.c.add(1).mul(0.5).mul(backward)
    .add(material.c.oneMinus().mul(0.5).mul(forward));

  const cosTheta = Math.cos(HAPKE_ROUGHNESS_RADIANS);
  const sinTheta = Math.sin(HAPKE_ROUGHNESS_RADIANS);
  const cotTheta = cosTheta / sinTheta;
  const cotTheta2 = cotTheta * cotTheta;
  const tanTheta = sinTheta / cosTheta;
  const roughnessScale = Math.sqrt(1 + PI * tanTheta * tanTheta);
  const inverseRoughnessScale = 1 / roughnessScale;

  const sinI = sqrt(max(incident.mul(incident).oneMinus(), 0));
  const cotI = incident.div(max(sinI, EPSILON));
  const expCotI = exp(cotI.mul(cotI).mul(-cotTheta2 / PI));
  const exp2CotI = exp(cotI.mul(-2 * cotTheta / PI));
  const mu0Projected = incident
    .add(sinI.mul(tanTheta).mul(expCotI).div(max(exp2CotI.oneMinus().add(1), EPSILON)))
    .mul(inverseRoughnessScale);

  const sinE = sqrt(max(emitted.mul(emitted).oneMinus(), 0));
  const cotE = emitted.div(max(sinE, EPSILON));
  const expCotE = exp(cotE.mul(cotE).mul(-cotTheta2 / PI));
  const exp2CotE = exp(cotE.mul(-2 * cotTheta / PI));
  const muProjected = emitted
    .add(sinE.mul(tanTheta).mul(expCotE).div(max(exp2CotE.oneMinus().add(1), EPSILON)))
    .mul(inverseRoughnessScale);

  const sinProduct = sinI.mul(sinE);
  const azimuthCosine = select(
    sinProduct.lessThanEqual(EPSILON),
    float(1),
    clamp(
      phaseCosine.sub(emitted.mul(incident)).div(max(sinProduct, EPSILON)),
      -1,
      1,
    ),
  );
  const azimuth = acos(azimuthCosine);
  const halfAzimuth = azimuth.mul(0.5);
  const azimuthFade = exp(tan(min(halfAzimuth, PI / 2 - 1e-4)).mul(-2));
  const sinHalfAzimuth = sin(halfAzimuth);
  const sinHalfAzimuth2 = sinHalfAzimuth.mul(sinHalfAzimuth);
  const normalizedAzimuth = azimuth.div(PI);

  const incidenceIsSmaller = incident.greaterThanEqual(emitted);
  const qIncidence = incident.mul(inverseRoughnessScale).div(max(mu0Projected, EPSILON));
  const qEmission = emitted.mul(inverseRoughnessScale).div(max(muProjected, EPSILON));
  const q = select(incidenceIsSmaller, qIncidence, qEmission);

  const incidenceDenominator = max(
    float(2).sub(exp2CotE).sub(normalizedAzimuth.mul(exp2CotI)),
    EPSILON,
  );
  const incidenceCross = sinHalfAzimuth2.mul(expCotI);
  const mu0WhenIncidenceSmaller = incident.add(
    sinI.mul(tanTheta)
      .mul(azimuthCosine.mul(expCotE).add(incidenceCross))
      .div(incidenceDenominator),
  ).mul(inverseRoughnessScale);
  const muWhenIncidenceSmaller = emitted.add(
    sinE.mul(tanTheta).mul(expCotE.sub(incidenceCross)).div(incidenceDenominator),
  ).mul(inverseRoughnessScale);

  const emissionDenominator = max(
    float(2).sub(exp2CotI).sub(normalizedAzimuth.mul(exp2CotE)),
    EPSILON,
  );
  const emissionCross = sinHalfAzimuth2.mul(expCotE);
  const mu0WhenEmissionSmaller = incident.add(
    sinI.mul(tanTheta).mul(expCotI.sub(emissionCross)).div(emissionDenominator),
  ).mul(inverseRoughnessScale);
  const muWhenEmissionSmaller = emitted.add(
    sinE.mul(tanTheta)
      .mul(azimuthCosine.mul(expCotI).add(emissionCross))
      .div(emissionDenominator),
  ).mul(inverseRoughnessScale);

  const effectiveMu0 = max(select(
    incidenceIsSmaller,
    mu0WhenIncidenceSmaller,
    mu0WhenEmissionSmaller,
  ), EPSILON);
  const effectiveMu = max(select(
    incidenceIsSmaller,
    muWhenIncidenceSmaller,
    muWhenEmissionSmaller,
  ), EPSILON);

  const gamma = sqrt(max(material.singleScatteringAlbedo.oneMinus(), 0));
  const multipleScattering = hFunction(effectiveMu0, gamma).mul(hFunction(effectiveMu, gamma));
  const scattering = opposition.add(1).mul(particlePhase).sub(1).add(multipleScattering);
  const radiance = material.singleScatteringAlbedo.mul(0.25)
    .mul(effectiveMu0.div(effectiveMu0.add(effectiveMu)))
    .mul(scattering);
  const shadowing = effectiveMu.mul(incident).div(max(
    muProjected.mul(mu0Projected).mul(roughnessScale)
      .mul(azimuthFade.oneMinus().add(azimuthFade.mul(q))),
    EPSILON,
  ));
  const visibility = step(EPSILON, incident).mul(step(EPSILON, emitted));

  return max(radiance.mul(shadowing), 0).mul(visibility);
}

export function normalizeLunarReflectance(reflectance: any) {
  return reflectance.div(HAPKE_ALL_AREA_FULL_MOON_REFERENCE);
}

/** Earth is full from the Moon when the observer-facing lunar side is new. */
export function earthshineIrradiance(lunarPhase: any) {
  const earthPhase = float(PI).sub(lunarPhase);
  const diskPhase = sin(earthPhase)
    .add(float(PI).sub(earthPhase).mul(cos(earthPhase)))
    .div(PI);
  return max(diskPhase, 0).mul(EARTHSHINE_MAX_IRRADIANCE);
}
