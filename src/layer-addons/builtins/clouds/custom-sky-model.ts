import {
  BackSide,
  BoxGeometry,
  Color,
  Mesh,
  NodeMaterial,
  Vector3,
} from "three/webgpu";
import type { Texture } from "three/webgpu";
import {
  Fn,
  If,
  Loop,
  cameraPosition,
  cos,
  dFdx,
  dFdy,
  dot,
  exp,
  float,
  int,
  length,
  log2,
  max,
  min,
  mix,
  modelViewProjection,
  normalize,
  positionWorld,
  pow,
  select,
  sin,
  smoothstep,
  sqrt,
  struct,
  sub,
  texture,
  time,
  uniform,
  vec2,
  vec3,
  vec4,
} from "three/tsl";

/**
 * Skydome shader graph for the Custom SkyMesh demo.
 *
 * The mesh, the far-plane trick and the FBM cloud layer come from Three.js
 * r184's SkyMesh add-on (three/examples/jsm/objects/SkyMesh.js, MIT). The
 * atmosphere is no longer the add-on's Preetham analytic model: it is Sean
 * O'Neil, "Accurate Atmospheric Scattering", GPU Gems 2, Chapter 16.
 *
 * https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-16-accurate-atmospheric-scattering
 *
 * Written from the equations and constants the chapter states in prose, not
 * transliterated from its NVIDIA-copyrighted code listings.
 *
 * What the chapter's model brings over Preetham:
 *
 * - A spherical planet inside an atmosphere shell with exp(-h / scaleDepth)
 *   density, instead of a flat-earth air-mass approximation.
 * - `opticalScale`, the polynomial fit to exp(-4x) that lets the optical-depth
 *   lookup table drop its height dimension. This is the chapter's central
 *   contribution.
 * - A real in-scattering integral sampled along the view ray, so the sky is
 *   integrated rather than evaluated in closed form.
 * - Wavelength-dependent scattering from 1 / lambda^4 and the chapter's own
 *   Kr / Km / ESun constants, instead of Preetham's turbidity fit.
 * - Cornette-Shanks Mie phase (Henyey-Greenstein with the (1 + cos^2) term and
 *   the (2 + g^2) normalization), and the correct (1 + cos^2) Rayleigh phase.
 * - The chapter's HDR curve, 1 - exp(-exposure * color).
 *
 * Three deliberate departures, the first two forced by this being a skybox:
 *
 * - The chapter runs the integral per vertex on a tessellated dome and applies
 *   only the phase functions per fragment. A skybox is a 24-vertex cube, so the
 *   integral runs per fragment here. That removes the interpolation artifacts
 *   the chapter's split exists to avoid, at a higher per-pixel cost.
 * - The chapter's ground and from-space permutations are not implemented. There
 *   is no planet surface to shade and the observer is always inside the
 *   atmosphere. Below the horizon the optical path is clamped to the horizon
 *   ray, which is what the add-on's Preetham path already did.
 * - The chapter models one sun. Here the integral, the phase composite, the
 *   discs and the cloud lighting all run for two independent lights — a sun
 *   and a moon — unrolled at graph-build time. With both lights below the
 *   horizon everything extinguishes to black: night has no artificial floor.
 */
/**
 * Rayleigh phase, 0.75 * (1 + cos^2). `cosAngle` is measured along
 * camera-minus-sample, the reverse of the view direction, which is the
 * convention the chapter's negative g pairs with.
 */
export const rayleighPhase = Fn(([cosAngle]: any[]) => {
  return float(0.75).mul(float(1).add(cosAngle.mul(cosAngle)));
});

/**
 * Cornette-Shanks Mie phase, the chapter's form: Henyey-Greenstein carrying the
 * (1 + cos^2) term and the (2 + g^2) normalization.
 *
 * Exported with g as a parameter so cloud layers can drive silver-lining and
 * rim terms off the same function the sky uses, at their own asymmetry.
 */
export const miePhase = Fn(([g, cosAngle]: any[]) => {
  const g2 = g.mul(g);
  return float(1.5)
    .mul(float(1).sub(g2).div(float(2).add(g2)))
    .mul(float(1).add(cosAngle.mul(cosAngle)))
    .div(
      pow(
        max(
          float(1).add(g2).sub(float(2).mul(g).mul(cosAngle)) as any,
          0.0001,
        ),
        1.5,
      ),
    );
});

interface LightDefaults {
  /** Irradiance scale — the chapter's ESun, for the sun. */
  intensity: number;
  /** sRGB hex; Color converts it to the linear value the shader wants. */
  tint: string;
  showDisc: boolean;
}

function createLightUniforms(defaults: LightDefaults) {
  return {
    /** Unit vector toward the light. Set from elevation/azimuth on the JS side. */
    direction: uniform(new Vector3(0, 1, 0)),
    intensity: uniform(defaults.intensity),
    tint: uniform(new Color(defaults.tint)),
    showDisc: uniform(defaults.showDisc ? 1 : 0),
  };
}

export type LightUniforms = ReturnType<typeof createLightUniforms>;

interface CloudLayerDefaults {
  /**
   * Height of the layer above the surface, in the same radius-10 units as the
   * atmosphere (which is 0.25 thick). Sets *where* the view ray crosses the
   * layer — the perspective and the parallax against the other layer — and
   * nothing about cloud size.
   */
  altitude: number;
  /**
   * World span of one tile of the cloud field. Sets cloud size, and only cloud
   * size. This and `altitude` used to multiply the same term, which made them
   * the same control.
   */
  featureSize: number;
  /**
   * Wind drift in world units per time unit, applied before the feature-size
   * divide — so resizing clouds does not change how fast they appear to move.
   */
  speed: number;
  /**
   * Mix weight of the morph fetch — a second read of the same field at its own
   * scale and speed on a rotated sample plane. Two patterns that drift apart
   * and never re-register make shapes grow, split and dissolve instead of
   * sliding as a rigid sheet. 0 disables the mix exactly; the morph frame is
   * still fetched and seeds the tendril warp (see TENDRIL_WARP).
   */
  morphBlend: number;
  /**
   * World tile span of the morph fetch, as a multiple of `featureSize`.
   * Non-integer ratios (1.7, 1.6) keep the two lattices from ever locking.
   */
  morphScale: number;
  /**
   * The morph fetch's own wind, in the same world units as `speed`. Shape
   * evolution rate is set by the RELATIVE drift of the two fetches, so a sign
   * opposite to `speed` morphs roughly twice as fast as a matched one.
   */
  morphSpeed: number;
  coverage: number;
  density: number;
  /** Forward-scattering asymmetry for this layer's silver lining. */
  phaseG: number;
  /**
   * Decorrelates this layer's sample of the shared field: it both rotates the
   * sample plane (by `seed` radians) and translates it (by `seed` tiles).
   *
   * Translation alone was not enough. Both layers read one tiling texture, so a
   * pure offset leaves them showing the same shapes, and whenever altitude and
   * feature size happened to put their uv scales near a common ratio the two
   * patterns locked together and beat against each other as the altitude slider
   * swept through it. A rotation has no such coincidence, and a seamlessly
   * tiling field stays seamless under one — the field is periodic on a lattice,
   * so rotating the lookup only rotates a continuous infinite plane.
   */
  seed: number;
}

function createCloudLayerUniforms(defaults: CloudLayerDefaults) {
  return {
    /** 0 skips the layer entirely, including its shadow on the layer below. */
    enabled: uniform(1),
    altitude: uniform(defaults.altitude),
    featureSize: uniform(defaults.featureSize),
    speed: uniform(defaults.speed),
    morphBlend: uniform(defaults.morphBlend),
    morphScale: uniform(defaults.morphScale),
    morphSpeed: uniform(defaults.morphSpeed),
    coverage: uniform(defaults.coverage),
    density: uniform(defaults.density),
    phaseG: uniform(defaults.phaseG),
    seed: uniform(defaults.seed),
  };
}

export type CloudLayerUniforms = ReturnType<typeof createCloudLayerUniforms>;

export type CustomSkyModelInputs = {
  direction?: any;
  time?: any;
};

const CustomSkySample = struct(
  {
    debugColor: "vec3",
    radiance: "vec3",
    transmission: "vec3",
  },
  "CustomSkySample",
);

/**
 * Builds the source model against explicit direction/time nodes.
 *
 * Supplying neither input preserves the standalone SkyMesh behavior. The
 * runtime supplies both so viewport and equirect export share the same graph
 * and so time remains host-controlled rather than wall-clock-driven.
 */
export function createCustomSkyModel(
  fieldTexture: Texture,
  inputs: CustomSkyModelInputs = {},
) {
  const uniforms = {
    /** Rayleigh scattering constant. Chapter default 0.0025. */
    kr: uniform(0.0025),
    /** Mie scattering constant. Chapter default 0.0010. */
    km: uniform(0.001),
    /**
     * The chapter models one sun. Both lights here run through the same
     * integral, phase composite, disc and cloud lighting, so night is not a
     * preset — it is the same model with the other light up. Intensity 20 is
     * the chapter's ESun.
     */
    sun: createLightUniforms({
      intensity: 20,
      tint: "#ffffff",
      showDisc: true,
    }),
    /**
     * Real moonlight is reflected sunlight and physically a touch *warmer*
     * than the sun — the familiar cool night is the Purkinje shift in human
     * vision, so the slightly warm default is the physical choice and a blue
     * moon is an artistic one. The real sun-to-full-moon ratio is ~400,000:1,
     * which renders black at any usable exposure, so the intensity is a
     * deliberate cheat.
     */
    moon: createLightUniforms({
      intensity: 0.2,
      tint: "#fff2e0",
      showDisc: true,
    }),
    /**
     * Mie phase asymmetry, in the chapter's negative convention (it measures
     * the angle toward the camera, not away from it). Chapter default -0.990.
     */
    mieDirectionalG: uniform(-0.99),
    /** Primary wavelengths in micrometres. Chapter default (0.650, 0.570, 0.475). */
    wavelength: uniform(new Vector3(0.65, 0.57, 0.475)),
    /** Observer height above the surface, in the chapter's radius-10 units. */
    eyeHeight: uniform(0.001),
    /**
     * Ground mist: a second exponential density profile inside the same
     * extinction framework as the atmosphere, but with a scale height far
     * below the cloud shells — the boundary-layer haze the single big
     * exponential cannot produce. `mistDensity` is the VERTICAL optical depth
     * of the whole column seen from the surface (0 switches the layer off
     * exactly); `mistHeight` is the scale height in world units. Mist
     * droplets are large compared to light's wavelength, so its extinction is
     * grey — a scalar, unlike the 1/lambda^4 air.
     */
    mistDensity: uniform(0.04),
    mistHeight: uniform(0.003),
    /** Samples along the view ray. The chapter states 5 is enough. */
    samples: uniform(int(5)),
    /** HDR exposure for 1 - exp(-exposure * color). Chapter default 2. */
    exposure: uniform(2),
    up: uniform(new Vector3(0, 1, 0)),
    /**
     * The near layer. Composited last, shadowed by the high layer, and the one
     * that will grow a volumetric body.
     */
    cloudLow: createCloudLayerUniforms({
      altitude: 0.015,
      featureSize: 0.05,
      speed: 0.0001,
      morphBlend: 0.45,
      morphScale: 1.7,
      morphSpeed: -0.00012,
      coverage: 0.55,
      density: 0.7,
      phaseG: 0.7,
      seed: 0,
    }),
    /** The far, thinner sheet. */
    cloudHigh: createCloudLayerUniforms({
      altitude: 0.045,
      featureSize: 0.09,
      speed: 0.00009,
      morphBlend: 0.35,
      morphScale: 1.6,
      morphSpeed: -0.00006,
      coverage: 0.5,
      density: 0.45,
      phaseG: 0.7,
      seed: 41.3,
    }),
    /** Resolution of the baked field, so the shader can convert a uv footprint
     * into texels and pick a mip explicitly. */
    fieldSize: uniform(512),
    /** Tints each layer's contribution so overlap and order are visible. */
    debugLayers: uniform(0),
  };

  /**
   * Unrolled at graph-build time: everything per-light below is a plain JS map
   * over this list, so the shader carries no light count and no branching on
   * it.
   */
  const LIGHTS = [uniforms.sun, uniforms.moon];

  // Chapter geometry: planet radius 10, atmosphere 2.5% thicker. The
  // `opticalScale` polynomial was fitted for this ratio and a 0.25 scale
  // depth, so both are fixed rather than exposed.
  const INNER_RADIUS = 10;
  const OUTER_RADIUS = 10.25;
  const SCALE_DEPTH = 0.25;
  const HEIGHT_SCALE = 1 / (OUTER_RADIUS - INNER_RADIUS);
  const SCALE_OVER_SCALE_DEPTH = HEIGHT_SCALE / SCALE_DEPTH;
  const FOUR_PI = 4 * Math.PI;

  // Cloud extinction. `cloudDensity` runs 0..1 and the noise field peaks around
  // 0.6 after the coverage subtraction, so this is what turns that into an
  // optical depth deep enough for opaque cores.
  //
  // At 20 the alpha ramp spanned only ~0.15 of field value, roughly twice as
  // sharp as the smoothstep it replaced, which turned the low-frequency noise
  // into hard-edged blobs tracing the lattice. 10 restores about the old edge
  // softness while keeping the variable-width falloff.
  const CLOUD_EXTINCTION = 10;
  const LIGHT_MARCH_SAMPLES = 4;
  const LIGHT_MARCH_STEP = 0.08;
  /** Single-sample weighting for the shadow one layer casts on another. */
  const INTERLAYER_SHADOW_SCALE = 0.2;
  /**
   * Height difference over which one layer's shadow on the other fades in.
   *
   * A layer only shadows what is below it, and at zero separation the shadow
   * would land exactly on the caster — which is not a shadow, it is the caster's
   * own noise printed onto its neighbour. Fading over a small band instead of
   * switching at exactly equal altitude keeps that continuous while the slider
   * moves through the crossing.
   */
  const INTERLAYER_SHADOW_FADE = 0.01;

  // Direct-light scatter coefficient. Calibrated so the sun at intensity 20
  // lands near the old model's direct level (see the octave sum below: at 90
  // degrees, g 0.7 and unit shadow depth the octaves sum to ~0.32).
  const CLOUD_SCATTER = 0.06;
  // Wrenninge-style multiple-scattering octaves: octave i sees MS_A^i of the
  // optical depth, keeps MS_B^i of the energy at MS_C^i of the phase
  // eccentricity. The higher octaves tunnel through deep cloud, which is the
  // light penetration the old flat 0.35 extinction fudge stood in for —
  // except this form stays anchored to the actual optical depth instead of
  // globally weakening it.
  const MS_OCTAVES = 3;
  const MS_A = 0.5;
  const MS_B = 0.6;
  const MS_C = 0.75;
  // Cosine half-widths of the powder bypass around each light, measured from
  // the layer's own phase mean: for Henyey-Greenstein the mean scattering
  // cosine IS g, so smoothstep(g - BELOW, g + ABOVE, cosTheta) switches the
  // powder term off inside the forward lobe the silver lining lives in and on
  // everywhere else — the gate tracks the phase slider instead of a fixed sun
  // cone. At the default g 0.7 this is the classic 0.4..0.9 band.
  const POWDER_GATE_BELOW = 0.3;
  const POWDER_GATE_ABOVE = 0.2;
  // Ground-mist scattering. The mist is lit by the same per-light transmitted
  // irradiance the clouds use (so it whitens at noon, gilds at sunset and
  // cools under a tinted moon for free): an isotropic dome term plus a
  // modest forward Mie lobe, which is what makes the milky glow around a
  // low sun or moon seen through haze. MIST_G is in the chapter's negative
  // convention, pairing with the negated phase cosine like the sky's Mie.
  const MIST_G = -0.5;
  const MIST_ISO = 0.05;
  const MIST_FWD = 0.02;
  // Horizon clamp for the mist's slant path, the same convention as the
  // sky's flattened ray: below-horizon rays saturate into the mist floor
  // instead of diverging. Flat-earth 1/sin(elevation) is valid because the
  // mist scale height is minuscule against the planet's curvature scale.
  const MIST_MIN_Y = 0.015;
  // Ambient is the Rayleigh-only sky attenuated by the cloud's own view
  // depth: wisps stay sky-lit, opaque cores go genuinely dark. The strength
  // is near 1 because the source is already a radiance, not a scale factor.
  const CLOUD_AMBIENT_STRENGTH = 0.9;
  const CLOUD_AMBIENT_DEPTH = 0.25;
  // Grazing-path regularizer for the light marches: 1 / (|y| + this).
  const MIN_LIGHT_Y = 0.15;
  // cos of the solar angular diameter (~0.53 deg). The moon's angular size
  // happens to match the sun's, so both discs share it.
  const DISC_ANGULAR_COS = 0.9999566769464484;
  const DISC_EDGE = 0.00002;
  // The skybox has no ground pass, so the horizon swallows a setting disc
  // over roughly its own angular diameter (0.0093 rad), standing in for the
  // terrain that would occlude it. Without this the disc's own atmospheric
  // transmittance is not enough: a few degrees below the horizon it would
  // still glow visibly through where the ground should be.
  const DISC_HORIZON_FADE = 0.0093;
  /** Frequency of the shader-side detail (erosion) fetch, relative to the
   * base tile. */
  const DETAIL_RATIO = 5;
  // Tendril warp: the detail tap's coordinate is displaced by the two macro
  // fetches the view sample already makes — vec2(a, b) - 0.5 — so the
  // isotropic detail is curled into flow-stretched filaments along the macro
  // field's iso-contours. No new field, no new fetch, and the filaments
  // writhe for free: a and b drift apart by construction (that IS the morph).
  // Units are detail tiles; typical |(a,b) - 0.5| ~ 0.2, so 1.0 displaces by
  // about one detail cell, four at the extremes.
  const TENDRIL_WARP = 1.0;
  // Mip selection for the warped tap. The warp adds the macro fields'
  // gradients to the detail footprint (chain rule), and those gradients scale
  // with the same base footprint, so the correction folds into the frequency
  // ratio: ratio' = DETAIL_RATIO + TENDRIL_WARP * (typical |grad field| per
  // tile, ~2; ~3 at the extremes). Free overhead — both forms clamp to mip 0
  // there — while protecting the mid-range from warp shimmer.
  const FIELD_GRAD_TYP = 2;
  const DETAIL_FOOTPRINT_RATIO = DETAIL_RATIO + TENDRIL_WARP * FIELD_GRAD_TYP;
  // Maximum edge carve, in field units (detail is 0..1 and scales it; the
  // body's own transmittance exp(-tau_body) gates it). The detail fetch no
  // longer overlays the field — it erodes the coverage boundary exactly where
  // light would already pass through the un-eroded body, so cores are
  // untouched, the contour crenellates where detail is high and wisps survive
  // where it is low. 0.12 is sized against the alpha ramp: at default density
  // it can fully sever material only up to alpha ~0.4 — the translucent
  // fringe band — and merely thins anything denser. Raising density collapses
  // the erodible skin, so dense cloud re-hardens its edges, which is
  // physically consistent.
  const DETAIL_EROSION = 0.12;
  /** Mips coarser than the view sample the shadow taps read at. */
  const SHADOW_LOD_BIAS = 2;
  // The morph fetch samples the field on a plane rotated ~109 degrees from the
  // layer's own, so the two fetches' world drift directions diverge even at
  // matched speeds. A tiling field stays seamless under rotation (the argument
  // `seed` already makes), and rotation plus the tile offset below keep the
  // two lattices from re-registering even when `morphScale` sweeps through an
  // integer ratio.
  const MORPH_ROTATION = 1.9;
  const MORPH_UV_OFFSET = 17.31;
  const COS_MR = Math.cos(MORPH_ROTATION);
  const SIN_MR = Math.sin(MORPH_ROTATION);

  // Built at factory scope so a rebaked field can be swapped in without
  // rebuilding the shader graph.
  const cloudField = texture(fieldTexture);

  /**
   * The chapter's optical-depth approximation. Normalized optical depth tracks
   * exp(-4x) closely enough that height drops out of the lookup table, leaving
   * one polynomial in the ray angle.
   */
  const opticalScale = Fn(([cosAngle]: any[]) => {
    const x = float(1).sub(cosAngle);
    const poly = float(-0.00287).add(
      x.mul(
        float(0.459).add(
          x.mul(float(3.83).add(x.mul(float(-6.8).add(x.mul(5.25))))),
        ),
      ),
    );
    // Straight down the polynomial reaches ~46, so the scale would be ~1e19
    // and the subtraction in the sample loop would lose every significant f32
    // digit. An optical depth past ~30 is already fully extinguished, so a cap
    // far above that is exact wherever the result is visible.
    return float(SCALE_DEPTH).mul(exp(min(poly, 12)));
  });

  const vertexNode = Fn(() => {
    // The current @types/three declaration loses modelViewProjection's vec4
    // shape even though the runtime node exposes component assignment.
    const position = modelViewProjection as any;
    position.z.assign(position.w); // set z to camera.far
    return position;
  })();

  const sampleNode = Fn(() => {
    // The published typings only declare the scalar overloads of pow/max, so
    // the componentwise vec3 forms below need the same casts the add-on's own
    // extinction line used.
    const invWavelength = vec3(1).div(
      pow(uniforms.wavelength as any, vec3(4) as any),
    );
    // Combined out-scattering coefficient, 4pi * (Kr / lambda^4 + Km).
    const extinction = invWavelength
      .mul(uniforms.kr.mul(FOUR_PI))
      .add(uniforms.km.mul(FOUR_PI));

    const direction = normalize(
      (inputs.direction ?? positionWorld.sub(cameraPosition)) as any,
    ) as any;
    const sourceTime = inputs.time ?? time;

    // Virtual observer, standing on the chapter's planet under the skybox.
    const cameraHeight = float(INNER_RADIUS).add(uniforms.eyeHeight);
    const eyePos = uniforms.up.mul(cameraHeight);

    // No ground pass exists here, so below the horizon the optical path is
    // clamped to the horizon ray rather than driven through the planet, where
    // the density term diverges. The add-on's Preetham path clamped the same
    // way. The phase functions still use the true view direction, so the sun
    // stays where it is.
    const flattened = vec3(direction.x, max(direction.y, 0), direction.z);
    const ray = flattened.div(max(length(flattened), 1e-4));

    // Distance from the observer to the shell along that ray.
    const b = float(2).mul(dot(eyePos, ray));
    const c = dot(eyePos, eyePos).sub(OUTER_RADIUS * OUTER_RADIUS);
    const far = float(0.5).mul(
      b.negate().add(sqrt(max(b.mul(b).sub(c.mul(4)), 0))),
    );

    const startDensity = exp(
      float(SCALE_OVER_SCALE_DEPTH).mul(float(INNER_RADIUS).sub(cameraHeight)),
    );
    const startAngle = dot(ray, eyePos).div(cameraHeight);
    const startOffset = startDensity.mul(opticalScale(startAngle));

    /**
     * Everything the shader derives from one light. A plain JS builder over
     * the uniform bundle rather than a TSL `Fn`, for the same reason as
     * `buildCloudLayer` below; the graph is unrolled over `LIGHTS` at build
     * time, so none of this branches.
     */
    function buildLightContext(light: LightUniforms) {
      const dir = normalize(light.direction);
      const irradiance = light.tint.mul(light.intensity);
      // The chapter measures the phase angle along camera-minus-vertex, the
      // reverse of the view direction. Negating pairs with its negative g
      // default; the clouds use the un-negated value with positive g.
      const cosTheta = dot(direction, dir);
      const phaseCos = cosTheta.negate();
      const cosZenith = dot(dir, uniforms.up);
      // Horizontal distance the light ray covers per unit of vertical travel:
      // a low light marches a long grazing path and self-shadows hard, a high
      // one barely shadows at all. The |y| + eps form stays continuous and
      // direction-true through the horizon — the old max(y, 0.15) froze the
      // slope for any light below ~8.6 degrees, which is what smeared cloud
      // shadows through sunset.
      const invY = float(1).div(dir.y.abs().add(MIN_LIGHT_Y));
      const slope = vec2(dir.x, dir.z).mul(invY);
      const pathLength = invY;
      // Transmittance down to the observer, for the relevance gate below.
      const groundTransmit = exp(
        (extinction as any)
          .mul(startDensity.mul(opticalScale(cosZenith)))
          .negate(),
      );
      // Uniform-valued gate for the per-light cloud marches: once a light's
      // transmitted irradiance cannot reach the clouds, its texture work is
      // skipped wholesale, keeping the two-light worst case off the common
      // path. The atmosphere loop is NOT gated — twilight glow comes from
      // samples a below-horizon light still reaches.
      // The published typings collapse exp() on a vec3 expression to a scalar
      // node, so the channel reads need the file's usual casts.
      const peak = max(
        max((groundTransmit as any).r, (groundTransmit as any).g),
        (groundTransmit as any).b,
      );
      const relevant = light.intensity.mul(peak).greaterThan(1e-4);
      /** Accumulated per-light in-scatter from the shared sample loop. */
      const frontColor = vec3(0).toVar();
      return {
        light,
        dir,
        irradiance,
        cosTheta,
        phaseCos,
        cosZenith,
        slope,
        pathLength,
        groundTransmit,
        relevant,
        frontColor,
      };
    }

    const lightContexts = LIGHTS.map(buildLightContext);

    // In-scattering integral, midpoint sampled. The view-path terms are
    // shared per sample; only the light-angle lookup and the accumulator are
    // per-light.
    const sampleCount = float(uniforms.samples);
    const sampleLength = far.div(sampleCount);
    const scaledLength = sampleLength.mul(HEIGHT_SCALE);
    const sampleRay = ray.mul(sampleLength);
    const samplePoint = eyePos.add(sampleRay.mul(0.5)).toVar();

    Loop({ start: int(0), end: uniforms.samples }, () => {
      const height = max(length(samplePoint), 0.0001);
      const density = exp(
        float(SCALE_OVER_SCALE_DEPTH).mul(float(INNER_RADIUS).sub(height)),
      );
      const cameraAngle = dot(ray, samplePoint).div(height);
      const camScale = opticalScale(cameraAngle);
      for (const ctx of lightContexts) {
        const lightAngle = dot(ctx.dir, samplePoint).div(height);
        const scatter = startOffset.add(
          density.mul(opticalScale(lightAngle).sub(camScale)),
        );
        const attenuate = exp(
          (extinction as any).mul(max(scatter, 0)).negate(),
        );
        ctx.frontColor.addAssign(attenuate.mul(density.mul(scaledLength)));
      }
      samplePoint.addAssign(sampleRay);
    });

    // Per-light phase composite. `skyColor` never contains a disc — it feeds
    // the cloud ambient and the aerial haze, and a disc in either is exactly
    // the bright-blob-through-opaque-cloud artifact the old wiring had.
    // `rayleighSky` additionally drops the Mie term, so the strong forward
    // lobe cannot leak around a cloud through its ambient.
    const skyColor = vec3(0).toVar();
    const rayleighSky = vec3(0).toVar();
    for (const ctx of lightContexts) {
      const rayleigh = ctx.frontColor
        .mul(invWavelength.mul(uniforms.kr))
        .mul(ctx.irradiance);
      const mie = ctx.frontColor.mul(uniforms.km).mul(ctx.irradiance);
      const rayleighTerm = rayleighPhase(ctx.phaseCos).mul(rayleigh);
      rayleighSky.addAssign(rayleighTerm);
      skyColor.addAssign(
        rayleighTerm.add(
          miePhase(uniforms.mieDirectionalG, ctx.phaseCos).mul(mie),
        ),
      );
    }

    // Per-light discs, composited after the cloud layers so clouds occlude
    // them. Transmittance runs along the TRUE view direction, not the
    // flattened ray: the flattened path would show a below-horizon disc at
    // half strength through the ground. Below the horizon the polynomial
    // diverges, so the disc reddens, dims and dies with the same falloff the
    // light itself has; the horizon fade covers the last stretch where the
    // atmosphere alone is not opaque enough (see DISC_HORIZON_FADE).
    const discTransmit = exp(
      (extinction as any)
        .mul(
          startDensity.mul(
            opticalScale(dot(direction, eyePos).div(cameraHeight)),
          ),
        )
        .negate(),
    );
    const discTotal = lightContexts
      .reduce(
        (acc: any, ctx) =>
          acc.add(
            ctx.irradiance.mul(
              smoothstep(
                DISC_ANGULAR_COS,
                DISC_ANGULAR_COS + DISC_EDGE,
                ctx.cosTheta,
              ).mul(ctx.light.showDisc),
            ),
          ),
        vec3(0) as any,
      )
      .mul(discTransmit)
      .mul(smoothstep(float(-DISC_HORIZON_FADE), float(0), direction.y));

    /**
     * The morphed field: base fetch mixed with the morph fetch, then contrast
     * restored. Mixing two same-histogram fields shrinks their spread by
     * ~sqrt((1-b)^2 + b^2), which would make the blend slider double as a
     * mush/coverage slider; dividing it back keeps coverage meaning the same
     * at every blend. Written as mixed*norm + 0.5*(1-norm) so blend 0 is
     * IEEE-exact identity with the un-morphed field.
     *
     * Plain builders rather than TSL `Fn`s from here down: the uv pair plus
     * per-layer morph bundle would be seven positional untyped arguments.
     *
     * (The published typings drop `.level()` off `sample()`, same gap the
     * lightest-clouds port notes.)
     */
    function blendedLevel(
      uvA: any,
      uvB: any,
      lodA: any,
      lodB: any,
      morph: { blend: any; norm: any; bias: any },
    ): { a: any; b: any; level: any } {
      const a = (cloudField.sample(uvA) as any).level(lodA).r;
      const b = (cloudField.sample(uvB) as any).level(lodB).r;
      // The raw fetches ride along so the view sampler can reuse them as its
      // tendril-warp vector without fetching anything twice.
      return {
        a,
        b,
        level: mix(a, b, morph.blend).mul(morph.norm).add(morph.bias),
      };
    }

    /**
     * View optical depth at a uv pair, from a continuous field rather than a
     * thresholded mask. Subtracting the coverage level instead of running a
     * smoothstep across it keeps the falloff width set by the field's own
     * gradient, so wisps fade wide and dense cores go opaque quickly.
     *
     * The extra fetch of the same texture at `DETAIL_RATIO` is the
     * second-order disturbance on the edges: it ERODES the coverage boundary
     * instead of overlaying the interior. `edgeness` is the un-eroded body's
     * own Beer-Lambert transmittance — the model introduces no new field;
     * erosion strength is literally "how much light would already get through
     * here" — so cores are untouched while the fringe crenellates where
     * detail is high and dissolves into translucent tendrils where it is low.
     * The erosion is one-sided (dens <= body always), so empty sky can never
     * gain density. The detail fetch exists at shader level because the shell
     * projection magnifies the base tile several times overhead, and adding
     * frequency here is far cheaper than baking a texture large enough to
     * cover it; it stays keyed to uvA — at high blend the fine grain slides
     * relative to the morphing macro shapes, which is not worth doubling the
     * fetches to fix.
     *
     * Takes the layer bundle and returns tau directly: `edgeness` and the
     * final depth must share the same sigma for the transmittance argument to
     * be true by construction.
     */
    function cloudViewOpticalDepthAt(
      uvA: any,
      uvB: any,
      lodA: any,
      lodB: any,
      lodDetail: any,
      morph: { blend: any; norm: any; bias: any },
      layer: CloudLayerUniforms,
    ): any {
      const { a, b, level: base } = blendedLevel(uvA, uvB, lodA, lodB, morph);
      // The tendril warp (see TENDRIL_WARP): the two macro fetches displace
      // the detail coordinate, curling the erosion pattern into filaments.
      // Active at morphBlend 0 by design — b is fetched regardless, and the
      // warp shapes the pattern without changing how much erosion the
      // edgeness gate allows.
      const warp = vec2(a.sub(0.5), b.sub(0.5)).mul(TENDRIL_WARP);
      const detail = (
        cloudField.sample(uvA.mul(DETAIL_RATIO).add(0.37).add(warp)) as any
      ).level(lodDetail).r;
      const body = max(base.sub(sub(1, layer.coverage)), 0);
      const sigma = layer.density.mul(CLOUD_EXTINCTION);
      const edgeness = exp(body.mul(sigma).negate());
      const dens = max(
        body.sub(detail.mul(DETAIL_EROSION).mul(edgeness)),
        0,
      );
      return dens.mul(sigma);
    }

    /**
     * Shadow-tap variant. Shadows carry no high-frequency information, so this
     * drops the detail fetch and pins explicitly coarse mips for both fields.
     * That keeps the march taps off the highest mip, where they would cost
     * bandwidth for detail nothing can see. No erosion either: the un-eroded
     * body is a slightly conservative (larger) shadow caster, invisible at
     * these mips, and it keeps the march at zero extra fetches.
     */
    function cloudShadowAt(
      uvA: any,
      uvB: any,
      lodA: any,
      lodB: any,
      morph: { blend: any; norm: any; bias: any },
      coverage: any,
    ): any {
      const { level } = blendedLevel(
        uvA,
        uvB,
        lodA.add(SHADOW_LOD_BIAS),
        lodB.add(SHADOW_LOD_BIAS),
        morph,
      );
      return max(level.sub(sub(1, coverage)), 0);
    }

    /**
     * RAW mip level for a uv, from its screen footprint — negative where the
     * texture is magnified. Clamping to zero happens per consumer, because the
     * detail tap must add its frequency ratio BEFORE the clamp: clamping first
     * froze the detail at mip log2(DETAIL_RATIO) everywhere the base was
     * magnified — which is precisely overhead, where the shell projection
     * blows the tile up several times — blurring the erosion pattern ~5x in
     * the one region it is most visible.
     *
     * `dFdx`/`dFdy` give tiles-per-pixel; multiplying by the field resolution
     * gives texels-per-pixel, and log2 of that is the mip that matches. This is
     * computed at top level rather than left to implicit sampling because the
     * layers are shaded inside `If(direction.y > 0)` — non-uniform control
     * flow, where implicit derivatives are undefined. The epsilon floor guards
     * log2(0), which the old max(..., 1) provided incidentally.
     */
    function cloudLodRaw(uv: any) {
      const footprint = max(length(dFdx(uv)), length(dFdy(uv)));
      return log2(max(footprint.mul(uniforms.fieldSize), 1e-6));
    }

    /**
     * Where the view ray crosses a shell at `INNER_RADIUS + altitude`.
     *
     * This replaces `direction.xz / direction.y`, which diverged at the horizon.
     * Everything downstream depended on that being bounded: an unbounded
     * coordinate has no screen footprint to reason about, so no valid mip level,
     * and past ~1e5 no f32 precision either. The observer is always inside the
     * shell, so the positive root always exists, and `|worldXZ|` is now capped
     * near `sqrt(2 * INNER_RADIUS * altitude)` at the tangent — about 0.63 at
     * altitude 0.02, against no bound at all before.
     */
    function shellCrossing(altitude: any) {
      // Held above the observer. `eyeHeight` reaches 0.24 while altitude tops
      // out at 0.08, so the eye can be raised past a layer — and there the
      // positive root is behind the camera, which sent the uv backwards and
      // turned the layer inside out. Clouds are only drawn above the horizon
      // anyway, so pinning the shell just overhead is the graceful end of the
      // range rather than a case to render.
      const shellRadius = max(
        float(INNER_RADIUS).add(altitude),
        cameraHeight.add(1e-4),
      );
      const b = float(2).mul(dot(eyePos, direction));
      const c = dot(eyePos, eyePos).sub(shellRadius.mul(shellRadius));
      const t = float(0.5).mul(
        b.negate().add(sqrt(max(b.mul(b).sub(c.mul(4)), 0))),
      );
      return {
        worldXZ: eyePos.add(direction.mul(t)).xz,
        t,
        shellRadius,
      };
    }

    /**
     * A world XZ position in one sample frame: rotate the plane, drift in
     * world units (before the span divide, so resizing clouds does not change
     * how fast the wind appears to move), scale to tiles, offset.
     *
     * Rotation is length-preserving, so it leaves the screen footprint — and
     * therefore `cloudLod` and the feature-size ratios — untouched.
     */
    function fieldUv(
      worldXZ: any,
      angle: any,
      speed: any,
      span: any,
      offset: any,
    ): any {
      const c = cos(angle);
      const s = sin(angle);
      const rotated = vec2(
        worldXZ.x.mul(c).sub(worldXZ.y.mul(s)),
        worldXZ.x.mul(s).add(worldXZ.y.mul(c)),
      );
      return rotated.add(sourceTime.mul(speed)).div(span).add(offset);
    }

    /**
     * One layer's two sample frames: the base fetch and the morph fetch.
     *
     * Shared so the interlayer shadow lands in exactly the frame the caster is
     * drawn in — it has to reproduce the caster's rotation, tile size, drift,
     * offset AND its morph pair, not just its tile size.
     *
     * `featureSize` is the world span of one base tile, so it alone sets cloud
     * size. Altitude only moves the crossing point, which is the perspective
     * and parallax. The two used to multiply the same term and were therefore
     * the same knob.
     */
    function layerUvPair(worldXZ: any, layer: CloudLayerUniforms) {
      return {
        uvA: fieldUv(
          worldXZ,
          layer.seed,
          layer.speed,
          layer.featureSize,
          layer.seed,
        ),
        uvB: fieldUv(
          worldXZ,
          layer.seed.add(MORPH_ROTATION),
          layer.morphSpeed,
          layer.featureSize.mul(layer.morphScale),
          layer.seed.add(MORPH_UV_OFFSET),
        ),
      };
    }

    function layerSampling(layer: CloudLayerUniforms) {
      // `worldXZ` is kept separate from the uv so the layers, which have
      // different feature sizes, can sample each other's fields in a common
      // space.
      const { worldXZ, t, shellRadius } = shellCrossing(layer.altitude);
      const { uvA, uvB } = layerUvPair(worldXZ, layer);

      // The morph blend's contrast restore (see `blendedLevel`), uniform-only
      // and shared by every tap of this layer — including the interlayer taps
      // the OTHER layer makes into this one's field.
      const blend = layer.morphBlend;
      const norm = float(1).div(
        sqrt(sub(1, blend).mul(sub(1, blend)).add(blend.mul(blend))),
      );
      const morph = { blend, norm, bias: float(0.5).mul(sub(1, norm)) };

      // Air density at the layer's own shell, exp(-16 * altitude). This is
      // what the layer's incoming light extinguishes through — a high sheet
      // sits above more of the atmosphere than a low deck, so it holds warm
      // light later into sunset.
      const shellDensity = exp(
        float(SCALE_OVER_SCALE_DEPTH).mul(float(INNER_RADIUS).sub(shellRadius)),
      );

      // Aerial perspective: optical depth from the camera to the crossing, as
      // the difference of two point-to-space depths along the same ray — the
      // sample loop's own bookkeeping, so it is monotonic in t, bounded by
      // `startOffset`, and agrees with the sky integral at the shell exit.
      // Clouds only draw above the horizon, where the flattened `ray` behind
      // `startOffset` is the view direction, so sharing it is exact.
      const cosShellAngle = dot(eyePos, direction).add(t).div(shellRadius);
      const airDepth = max(
        startOffset.sub(shellDensity.mul(opticalScale(cosShellAngle))),
        0,
      );
      const airTransmit = exp((extinction as any).mul(airDepth).negate());

      // Raw (possibly negative) footprints; each consumer clamps after adding
      // its own frequency ratio. lodA/lodB are bit-identical to the old
      // clamped form — log2(max(x,1)) == max(log2(x),0) — so every existing
      // consumer is unchanged; only the detail tap gains resolution.
      const lodRawA = cloudLodRaw(uvA);
      const lodRawB = cloudLodRaw(uvB);
      return {
        worldXZ,
        uvA,
        uvB,
        lodA: max(lodRawA, 0),
        lodB: max(lodRawB, 0),
        lodDetail: max(lodRawA.add(Math.log2(DETAIL_FOOTPRINT_RATIO)), 0),
        morph,
        shellDensity,
        airTransmit,
      };
    }

    /**
     * Emits one layer's graph. A plain builder rather than a TSL `Fn` because
     * it takes uniform bundles, not node arguments. `sampling` comes from
     * `layerSampling`, evaluated at top level so the derivatives inside
     * `cloudLod` see uniform control flow.
     *
     * `shadowFrom` is the other layer, this one's candidate shadow caster.
     * Sampling its field where the light ray crosses its altitude is what
     * makes the pair read as depth: at a small height difference the shadow
     * lands almost directly beneath the upper cloud and the two read as one
     * mass, while at a large difference it slides far away and they separate.
     * `shadowFromSampling` supplies only the caster's morph bundle — its uv
     * and lods are at the wrong world point for a shadow.
     */
    function buildCloudLayer(
      layer: CloudLayerUniforms,
      sampling: ReturnType<typeof layerSampling>,
      shadowFrom: CloudLayerUniforms,
      shadowFromSampling: ReturnType<typeof layerSampling>,
    ) {
      const {
        worldXZ,
        uvA,
        uvB,
        lodA,
        lodB,
        lodDetail,
        morph,
        shellDensity,
        airTransmit,
      } = sampling;

      // --- Opacity from Beer-Lambert, not from a threshold -----------------
      const viewOpticalDepth = cloudViewOpticalDepthAt(
        uvA,
        uvB,
        lodA,
        lodB,
        lodDetail,
        morph,
        layer,
      );
      const alpha = sub(1, exp(viewOpticalDepth.negate())).toVar();

      // Powder: 1 - exp(-2*tau) == 1 - T^2 == alpha*(2 - alpha) — an exact
      // identity on the alpha above, so no second exp and no free constant.
      // The round-trip depth is the multiple-scattering paucity argument: a
      // thin medium starves the octave sum standing in for MS, so the direct
      // term dims where the cloud is thin. Per-layer (view depth is
      // light-independent); the per-light forward gate below decides where it
      // applies.
      const powder = alpha.mul(sub(2, alpha));

      // --- Interlayer geometry, shared by both lights ----------------------
      // Each layer is handed the other as a candidate caster; the sign of the
      // separation decides which one actually casts. At or below zero
      // separation the caster's field would land at zero displacement — the
      // other layer's noise stamped straight onto this one, not a shadow — so
      // the term fades out through the crossing band.
      const separation = shadowFrom.altitude.sub(layer.altitude);
      const deltaH = max(separation, 0);
      const cast = smoothstep(
        float(0),
        float(INTERLAYER_SHADOW_FADE),
        separation,
      ).mul(shadowFrom.enabled);
      // The caster's tiles are a different world size, so its uv moves at a
      // different rate across the screen than this layer's. Same world
      // footprint, scaled by the feature-size ratio — exact, and derivative
      // free, which matters because this is inside non-uniform control flow.
      // The caster's morph fetch differs from that by exactly its morphScale
      // (rotation is length-preserving, the shadow offset is uniform per
      // light, so neither touches the footprint).
      const shadowLodA = lodA.add(
        log2(layer.featureSize.div(shadowFrom.featureSize)),
      );
      const shadowLodB = shadowLodA.sub(log2(shadowFrom.morphScale));

      // --- Direct term, per light ------------------------------------------
      const direct = vec3(0).toVar();

      for (const ctx of lightContexts) {
        If(ctx.relevant, () => {
          // Optical depth toward this light: the self-shadow march plus the
          // single interlayer tap, folded into ONE depth so the octave sum
          // below sees both. Thin cloud transmits and thick cloud does not,
          // so the bright rim lands where the cloud is genuinely thin and its
          // width follows the field rather than a fixed ramp.
          //
          // Both fetches march the SAME world light path, which is what makes
          // the marched shadow a shadow of the blended field: the morph frame
          // is rotated by MORPH_ROTATION, so its step carries that rotation
          // and the morph-scale divide. (The step convention ignores `seed`
          // for the base frame — a pre-existing quirk, left alone so blend 0
          // stays identical.)
          const stepA = ctx.slope
            .div(layer.featureSize)
            .mul(LIGHT_MARCH_STEP);
          const rotSlope = vec2(
            ctx.slope.x.mul(COS_MR).sub(ctx.slope.y.mul(SIN_MR)),
            ctx.slope.x.mul(SIN_MR).add(ctx.slope.y.mul(COS_MR)),
          );
          const stepB = rotSlope
            .div(layer.featureSize.mul(layer.morphScale))
            .mul(LIGHT_MARCH_STEP);
          const marchUvA = vec2(uvA).toVar();
          const marchUvB = vec2(uvB).toVar();
          const lightDepth = float(0).toVar();

          Loop(LIGHT_MARCH_SAMPLES, () => {
            marchUvA.addAssign(stepA);
            marchUvB.addAssign(stepB);
            lightDepth.addAssign(
              cloudShadowAt(
                marchUvA,
                marchUvB,
                lodA,
                lodB,
                morph,
                layer.coverage,
              ),
            );
          });

          const shadowDepth = lightDepth
            .mul(1 / LIGHT_MARCH_SAMPLES)
            .mul(layer.density)
            .mul(CLOUD_EXTINCTION)
            .mul(ctx.pathLength)
            .toVar();

          // Shadow cast by the layer above, along this light's own slope.
          // `INTERLAYER_SHADOW_SCALE` weights the single tap against the
          // march's average — the march averages its samples while this takes
          // one, so reusing the march weighting drove the term binary and
          // painted the caster's noise lattice onto this layer. The caster's
          // full frame pair and its own morph bundle, so its shadow morphs
          // exactly as it does.
          const shadowPair = layerUvPair(
            worldXZ.add(ctx.slope.mul(deltaH)),
            shadowFrom,
          );
          shadowDepth.addAssign(
            cloudShadowAt(
              shadowPair.uvA,
              shadowPair.uvB,
              shadowLodA,
              shadowLodB,
              shadowFromSampling.morph,
              shadowFrom.coverage,
            )
              .mul(shadowFrom.density)
              .mul(CLOUD_EXTINCTION)
              .mul(INTERLAYER_SHADOW_SCALE)
              .mul(ctx.pathLength)
              .mul(cast),
          );

          // Irradiance reaching THIS layer's altitude — `shellDensity`, not
          // the observer's density, so clouds redden through sunset at their
          // own height and track Kr, Km and altitude for free.
          const incoming = ctx.irradiance.mul(
            exp(
              (extinction as any)
                .mul(shellDensity.mul(opticalScale(ctx.cosZenith)))
                .negate(),
            ),
          );

          // The multiple-scattering octave sum (see MS_* above): each octave
          // sees a progressively shallower copy of the same optical depth at
          // a progressively rounder phase, which is what keeps deep cloud
          // readable without globally weakening extinction.
          let octaves: any = float(0);
          for (let i = 0; i < MS_OCTAVES; i += 1) {
            octaves = octaves.add(
              float(MS_B ** i)
                .mul(miePhase(layer.phaseG.mul(MS_C ** i), ctx.cosTheta))
                .mul(exp(shadowDepth.mul(MS_A ** i).negate())),
            );
          }

          // Powder bypass inside the forward lobe: thin backlit fringes must
          // stay bright (the silver lining IS thin cloud), so the powder
          // darkening lerps out as the view closes on this light. Anchored to
          // the layer's phase mean (see POWDER_GATE_*), per light — the sun
          // and moon gate independently on their own angles. Ambient is
          // exempt, matching the chalice-unity precedent.
          const forwardGate = smoothstep(
            layer.phaseG.sub(POWDER_GATE_BELOW),
            min(layer.phaseG.add(POWDER_GATE_ABOVE), 0.98),
            ctx.cosTheta,
          );
          direct.addAssign(
            incoming
              .mul(CLOUD_SCATTER)
              .mul(octaves)
              .mul(mix(powder, float(1), forwardGate)),
          );
        });
      }

      // --- Ambient ---------------------------------------------------------
      // The Rayleigh-only sky, attenuated by the cloud's own view depth:
      // wisps stay sky-lit, opaque cores go genuinely dark. This is what lets
      // a cloud read DARKER than the sky behind it — the old ambient added
      // the full sky to every cloud, so overcast and dark undersides were
      // unreachable.
      const ambient = rayleighSky
        .mul(CLOUD_AMBIENT_STRENGTH)
        .mul(exp(viewOpticalDepth.mul(CLOUD_AMBIENT_DEPTH).negate()));

      // --- Aerial perspective ----------------------------------------------
      // Folded into colour, not alpha: the air in front of a cloud hazes it
      // toward the sky but does not make it transparent to the discs behind
      // it. At the horizon `airTransmit` goes to zero and the layer dissolves
      // into the sky at exactly the rate the atmosphere says — which is also
      // what finally separates altitude from feature size.
      //
      // The in-scatter proxy is the Rayleigh-only sky for the same reason the
      // ambient is: the full sky carries the Mie forward lobe, whose in-
      // scatter accumulates mostly BEHIND the cloud — crediting it to the
      // segment in front let an opaque overcast still glow around the sun at
      // the horizon, the exact occlusion artifact this rework removes.
      const color = direct
        .add(ambient)
        .mul(airTransmit)
        .add(rayleighSky.mul(sub(1, airTransmit)));

      return { color, alpha };
    }

    // Sampled outside the branches below: `cloudLod` takes screen derivatives,
    // which are only defined in uniform control flow.
    const lowSampling = layerSampling(uniforms.cloudLow);
    const highSampling = layerSampling(uniforms.cloudHigh);

    // Both layers are shaded first and composited afterwards, in altitude
    // order. Ordering used to be hard-coded by role, which meant raising the
    // "low" layer above the "high" one still drew it in front: altitude could
    // never change which layer occludes, so the far layer looked unresponsive.
    // Both altitude sliders share a range, so they can and do cross.
    const lowAlpha = float(0).toVar();
    const highAlpha = float(0).toVar();
    const lowColor = vec3(0).toVar();
    const highColor = vec3(0).toVar();

    // Each layer is handed the other as its candidate shadow caster. Which one
    // actually casts is resolved inside `buildCloudLayer` from the sign of the
    // altitude difference, so the geometry decides it rather than the wiring —
    // and only one of the two directions is ever live.
    If(
      direction.y
        .greaterThan(0)
        .and(uniforms.cloudHigh.enabled.greaterThan(0))
        .and(uniforms.cloudHigh.coverage.greaterThan(0)),
      () => {
        const high = buildCloudLayer(
          uniforms.cloudHigh,
          highSampling,
          uniforms.cloudLow,
          lowSampling,
        );
        highAlpha.assign(high.alpha);
        highColor.assign(high.color);
      },
    );

    If(
      direction.y
        .greaterThan(0)
        .and(uniforms.cloudLow.enabled.greaterThan(0))
        .and(uniforms.cloudLow.coverage.greaterThan(0)),
      () => {
        const low = buildCloudLayer(
          uniforms.cloudLow,
          lowSampling,
          uniforms.cloudHigh,
          highSampling,
        );
        lowAlpha.assign(low.alpha);
        lowColor.assign(low.color);
      },
    );

    // Back to front: the higher layer is farther when looking up.
    const highIsFar = uniforms.cloudHigh.altitude.greaterThanEqual(
      uniforms.cloudLow.altitude,
    );
    const farColor = select(highIsFar, highColor, lowColor);
    const farAlpha = select(highIsFar, highAlpha, lowAlpha);
    const nearColor = select(highIsFar, lowColor, highColor);
    const nearAlpha = select(highIsFar, lowAlpha, highAlpha);

    skyColor.assign(mix(skyColor, farColor, farAlpha));
    skyColor.assign(mix(skyColor, nearColor, nearAlpha));

    // The discs sit behind both layers: any cloud in front occludes them by
    // its own alpha — the occlusion the old disc-inside-the-sky term could
    // never produce, because the ambient carried the disc into the cloud.
    skyColor.addAssign(discTotal.mul(sub(1, farAlpha)).mul(sub(1, nearAlpha)));

    // --- Ground mist ------------------------------------------------------
    // One composite over the whole scene, and that is exact here, not a
    // shortcut: the mist top sits far below the cloud shells, so the entire
    // mist column is in front of sky, clouds and discs alike. The slant
    // optical depth of an exponential layer has a closed form — the vertical
    // column depth, reduced by the observer's height inside the layer,
    // divided by the ray's sine of elevation. Climbing above the layer fades
    // it out for free.
    const mistColumn = uniforms.mistDensity.mul(
      exp(uniforms.eyeHeight.div(uniforms.mistHeight).negate()),
    );
    const mistDepth = mistColumn.div(max(direction.y, MIST_MIN_Y));
    // Grey extinction — large droplets scatter all wavelengths alike, which
    // is exactly why mist is white while the clean sky is blue.
    const mistTransmit = exp(mistDepth.negate());
    const mistLight = lightContexts.reduce(
      (acc: any, ctx) =>
        acc.add(
          ctx.irradiance
            .mul(ctx.groundTransmit)
            .mul(
              float(MIST_ISO).add(
                miePhase(float(MIST_G), ctx.phaseCos).mul(MIST_FWD),
              ),
            ),
        ),
      vec3(0) as any,
    );
    skyColor.assign(
      skyColor.mul(mistTransmit).add(mistLight.mul(sub(1, mistTransmit))),
    );

    // Overlap view. Red is the low layer, green the high one, so both together
    // read yellow and whiten as the overlap deepens. Applied after the tone map
    // so the curve does not squash it.
    const debugColor = vec3(lowAlpha, highAlpha, lowAlpha.mul(highAlpha));

    // Transmission of radiance originating behind this layer. These are the
    // model's existing extinction terms, exposed for host-layer composition;
    // no scattering, cloud, shadow, mist, or noise expression is changed.
    const cloudTransmit = sub(1, farAlpha).mul(sub(1, nearAlpha));
    const backdropTransmission = discTransmit
      .mul(cloudTransmit)
      .mul(mistTransmit);

    return CustomSkySample(debugColor, skyColor, backdropTransmission);
  })();

  const colorNode = Fn(() => {
    const sample = sampleNode as any;
    const transmittance = exp(
      sample.get("radiance").mul(uniforms.exposure).negate() as any,
    ) as any;
    const mapped = sub(1, transmittance) as any;

    return vec4(
      mix(mapped, sample.get("debugColor"), uniforms.debugLayers) as any,
      1,
    );
  })();

  /** Swaps in a rebaked field. The graph is unchanged, so no recompile. */
  function setFieldTexture(next: Texture): void {
    (cloudField as any).value = next;
  }

  return { colorNode, sampleNode, uniforms, setFieldTexture, vertexNode };
}

export function createCustomSkyMesh(fieldTexture: Texture) {
  const model = createCustomSkyModel(fieldTexture);

  const material = new NodeMaterial();
  material.side = BackSide;
  material.depthWrite = false;
  material.vertexNode = model.vertexNode;
  material.colorNode = model.colorNode;

  const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);

  return { mesh, uniforms: model.uniforms, setFieldTexture: model.setFieldTexture };
}
