// Occluded solar disk — a faithful port of the reference implementation:
//   · analytic limb-darkened photosphere (SHELLS uniform disks stacked to
//     reproduce the per-channel limb profile),
//   · the scattered-light AUREOLE as a radial integral over the lit angular
//     measure of rings — inside the sun's shells, outside the occluder —
//     with an inverse-square kernel evaluated as an average over log r.
//     The crescent glare and the diamond-ring flash EMERGE from this
//     integral; there are no stylized gates anywhere in this file.
//   · a procedural CORONA (ridged angular noise → streamers, high-frequency
//     plumes toward the poles, coronal holes, Baumbach radial profile in
//     millionths of disk brightness), always emitted, visible only when the
//     photosphere is covered, blocked by the occluder like everything else.
//
// Everything runs in the layer's gnomonic d-units (tan-plane divided by
// `angularRadius`), so the model is scale-free: the photosphere rim sits at
// tan(angularRadius)/angularRadius and the aureole reach is measured in
// photosphere radii. The WGSL functions and the CPU sampler are structural
// mirrors; the value-noise stack cannot be bit-identical across f32 GPU
// implementations, so parity is structural (same fields, same constants),
// not bitwise. Tone mapping is the reference's extended Reinhard, WITHOUT
// its gamma step — the renderer owns the display transform.
import * as THREE from "three";
import { uniform, vec2, wgslFn } from "three/tsl";

import { clamp, type Rgb, type Rgba } from "../../math";
import type {
  SkyboxManifestLayer,
  SkyboxManifestNode,
  SkyboxSunParams,
} from "../../manifest";
import { normalizeSunParams } from "../../sun-transform";
import { webGpuSpotEditorRectInfoFunction } from "../../skybox/editor-presentation";
import type {
  BuiltInWebGpuLayerAdapter,
  SunLayerShaderBinding,
  SunUniformNodes,
} from "../../skybox/types";
import {
  dotDirection,
  normalizeDirection,
  projectDirectionToSpotLocal,
  smoothstep,
} from "../cpu-sampling";
import { registerLayerRuntimeAdapter } from "../registry";
import { zeroEffectExpression } from "../shader-codegen";
import type { WebGpuLayerAdapter } from "../types";
import { computeSunEclipseGeometry, computeSunLightSource } from "./sun/eclipse";

const TAU = Math.PI * 2;
const LIMB: Rgb = [0.52, 0.68, 0.82]; // limb darkening coefficient per channel
const SHELLS = 4; // uniform disks stacked to make the limb profile
const BREAKPOINTS = 2 * SHELLS + 2; // kink radii in the radial integrand
const SUBSAMPLES = 6; // samples per smooth segment
const EDGE_AA = 0.008; // fixed-width limb antialiasing, d-units (CPU parity)
const REINHARD_WHITE_SQ = 16; // W = 4
const CORONA_DRIFT_RATE = 0.02; // reference: seed drifts slowly, never static

// --- CPU sampling (structural mirror of the WGSL below) ---

function hash21(px: number, py: number) {
  let x = (px * 123.34) % 1;
  let y = (py * 456.21) % 1;
  x = x < 0 ? x + 1 : x;
  y = y < 0 ? y + 1 : y;
  const d = x * (x + 45.32) + y * (y + 45.32);
  x += d;
  y += d;
  const f = (x * y) % 1;
  return f < 0 ? f + 1 : f;
}

function vnoise(px: number, py: number) {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  let fx = px - ix;
  let fy = py - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash21(ix, iy);
  const b = hash21(ix + 1, iy);
  const c = hash21(ix, iy + 1);
  const d = hash21(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a + (a - b + d - c) * fx) * fy;
}

function fbm(px: number, py: number, octaves: number) {
  let sum = 0;
  let norm = 0;
  let amplitude = 0.5;
  let x = px;
  let y = py;
  for (let i = 0; i < 5; i += 1) {
    if (i >= octaves) break;
    sum += amplitude * vnoise(x, y);
    norm += amplitude;
    x *= 2.03;
    y *= 2.03;
    amplitude *= 0.5;
  }
  return sum / Math.max(norm, 1e-5);
}

/**
 * The corona: an emitter in its own right, present at all times and only
 * visible once the photosphere is covered. `x` is the distance in solar
 * radii (>= 1). Baumbach's empirical radial profile carries the rays in its
 * two shallower terms; the steepest term is the rim and stays uniform.
 */
function coronaAt(
  phi: number,
  x: number,
  seed: number,
  axis: number,
  structure: number,
): Rgb {
  const lx = Math.log(x);

  // each ray leans by its own signed amount rather than all of them shearing
  // together; the lean saturates within a couple of radii.
  const driftN = fbm(Math.cos(phi) * 4 + seed + 77, Math.sin(phi) * 4 + seed * 1.9, 2);
  const lean = (driftN - 0.5) * 0.14 * (1 - Math.exp(-2 * lx));

  // ridged noise: peaks of a 1D angular field are isolated angles — rays.
  const leaned = phi + lean;
  const nS = fbm(Math.cos(leaned) * 4 + seed, Math.sin(leaned) * 4 + 1.7 * seed, 4);
  const ridgeS = Math.pow(1 - Math.abs(2 * nS - 1), 3);
  const reach = 2.5 + 8 * fbm(Math.cos(phi) * 4 + seed + 31, Math.sin(phi) * 4 + seed - 12, 2);
  let streamer = ridgeS * (1 - smoothstep(0.4 * reach, reach, x));

  // fine plumes: high angular frequency, straight, gone within a radius or two
  const nP = fbm(Math.cos(phi) * 26 + 7 + 1.3 * seed, Math.sin(phi) * 26 + seed, 3);
  let plume = Math.pow(1 - Math.abs(2 * nP - 1), 4) * (1 - smoothstep(1.08, 2.2, x));

  // coronal holes: whole sectors that are genuinely empty
  const holes = smoothstep(
    0.18,
    0.72,
    fbm(Math.cos(phi) * 2 + seed + 50, Math.sin(phi) * 2 + seed * 0.7, 2),
  );

  // a tilted axis sorts them: plumes toward the poles, streamers to the equator
  const ca = Math.abs(Math.cos(phi - axis));
  const sa = Math.abs(Math.sin(phi - axis));
  plume *= 0.1 + 0.9 * ca * ca * ca * ca;
  streamer *= 0.25 + 0.75 * sa * sa;

  const k = structure;
  const S = 1 + k * ((0.12 + 2.8 * streamer) * (0.2 + 0.8 * holes) - 1);
  const P = 1 + k * (0.3 + 2.4 * plume - 1);

  const f = 0.0532 * Math.pow(x, -2.5) * S;
  const k1 = 1.425 * Math.pow(x, -7) * S * P;
  const k2 = 2.565 * Math.pow(x, -17) * (1 + k * (0.8 + 0.4 * plume - 1));
  const radial = (f + k1 + k2) * 1e-6;

  return [radial, 0.985 * radial, 0.96 * radial];
}

/**
 * Half angular width of the arc where a ring of radius r about a point at
 * distance d from a disk centre falls inside that disk of radius R.
 */
function arcHalf(r: number, d: number, R: number) {
  if (d < 1e-9) return r < R ? Math.PI : 0;
  const c = (r * r + d * d - R * R) / (2 * r * d);
  if (c <= -1) return Math.PI; // ring lies wholly inside
  if (c >= 1) return 0; // ring misses the disk entirely
  return Math.acos(c);
}

/**
 * Angular measure shared by two arcs of half widths a and b whose centres
 * are separated by delta, accounting for wrap around the circle.
 */
function arcOverlap(a: number, b: number, delta: number) {
  const mn = 2 * Math.min(a, b);
  const o1 = clamp(a + b - delta, 0, mn);
  const o2 = clamp(a + b - (TAU - delta), 0, mn);
  return Math.min(o1 + o2, mn);
}

/**
 * Lit angular measure of the ring of radius r: inside the sun, outside the
 * occluder, summed over the shells that reproduce the limb darkened profile.
 */
function litMeasure(
  r: number,
  ds: number,
  dm: number,
  sunR: number,
  moonR: number,
  delta: number,
): Rgb {
  const moonArc = arcHalf(r, dm, moonR);
  const lit: [number, number, number] = [0, 0, 0];
  for (let k = SHELLS; k >= 1; k -= 1) {
    const tA = (k - 0.5) / SHELLS;
    const tB = (k + 0.5) / SHELLS;
    const muA = Math.sqrt(Math.max(0, 1 - tA * tA));
    const muB = Math.sqrt(Math.max(0, 1 - tB * tB));
    const sunArc = arcHalf(r, ds, (k / SHELLS) * sunR);
    const measure = 2 * sunArc - arcOverlap(sunArc, moonArc, delta);
    for (let channel = 0; channel < 3; channel += 1) {
      const intensityA = 1 - LIMB[channel] * (1 - muA);
      const intensityB = k === SHELLS ? 0 : 1 - LIMB[channel] * (1 - muB);
      lit[channel] += (intensityA - intensityB) * measure;
    }
  }
  return lit;
}

export function sampleSunLayer(direction: Rgb, params: SkyboxSunParams, time = 0): Rgba {
  const sun = normalizeSunParams(params);
  const geometry = computeSunEclipseGeometry(sun);
  const centerDirection = normalizeDirection(sun.centerDirection);
  const radius = Math.max(sun.angularRadius, 0.0001);
  // The gnomonic projection folds the exact antipode back onto the disc
  // center; gate on the front hemisphere so no ghost sun appears there.
  const facing = dotDirection(normalizeDirection(direction), centerDirection) > 0 ? 1 : 0;
  const local = projectDirectionToSpotLocal(direction, centerDirection, radius);

  const sunRD = Math.tan(radius) / radius; // photosphere rim in d-units
  const seed = sun.coronaSeed + time * CORONA_DRIFT_RATE;
  const ds = local.d;
  const occDx = local.x - geometry.occLocalX;
  const occDy = local.y - geometry.occLocalY;
  const dm = Math.hypot(occDx, occDy);

  const sunMask = 1 - smoothstep(sunRD - EDGE_AA, sunRD + EDGE_AA, ds);
  const moonMask =
    geometry.active *
    (1 - smoothstep(geometry.occRadiusD - EDGE_AA, geometry.occRadiusD + EDGE_AA, dm));

  // the disk itself, drawn analytically so the limb stays crisp
  const t = clamp(ds / sunRD);
  const mu = Math.sqrt(Math.max(0, 1 - t * t));
  const diskFactor = sunMask * (1 - moonMask);

  // angle between the direction to the sun centre and to the moon centre,
  // taken from a dot product: no branch cut, defined everywhere.
  // dot(-p, occ - p) = p·(p - occ), with occDx/occDy = (p - occ).
  let delta = 0;
  if (ds > 1e-9 && dm > 1e-9) {
    delta = Math.acos(
      clamp((local.x * occDx + local.y * occDy) / (ds * dm), -1, 1),
    );
  }

  const rMax = sun.aureoleReach * sunRD;
  const rMin = Math.max(0.25 * EDGE_AA, 1e-7);

  // radii where the integrand kinks: a ring of that radius is exactly
  // tangent to one of the disks, either from inside or from outside
  const breakpoints: number[] = [];
  for (let k = 1; k <= SHELLS; k += 1) {
    const shellRadius = (k / SHELLS) * sunRD;
    breakpoints.push(clamp(Math.abs(ds - shellRadius), rMin, rMax));
    breakpoints.push(clamp(ds + shellRadius, rMin, rMax));
  }
  breakpoints.push(clamp(Math.abs(dm - geometry.occRadiusD), rMin, rMax));
  breakpoints.push(clamp(dm + geometry.occRadiusD, rMin, rMax));
  breakpoints.sort((first, second) => first - second);

  // inverse square kernel makes the radial integral an average over log r,
  // so each smooth segment is weighted by its own span in log r
  const aureole: [number, number, number] = [0, 0, 0];
  let total = 0;
  let prev = rMin;
  for (let i = 0; i <= BREAKPOINTS; i += 1) {
    const next = i < BREAKPOINTS ? breakpoints[i] : rMax;
    if (next > prev) {
      const logWidth = Math.log(next / prev);
      for (let s = 0; s < SUBSAMPLES; s += 1) {
        const f = (s + 0.5) / SUBSAMPLES;
        const r = prev * Math.exp(logWidth * f);
        // taper the kernel to zero over the last two octaves instead of
        // truncating it, so the edge of its support is not a visible edge
        const w = 1 - smoothstep(0.25 * rMax, rMax, r);
        const dw = (w * logWidth) / SUBSAMPLES;
        const lit = litMeasure(r, ds, dm, sunRD, geometry.occRadiusD, delta);
        aureole[0] += lit[0] * dw;
        aureole[1] += lit[1] * dw;
        aureole[2] += lit[2] * dw;
        total += dw;
      }
      prev = next;
    }
  }
  const norm = Math.max(total, 1e-6) * TAU;

  // the moon blocks the corona as it blocks everything else
  let corona: Rgb = [0, 0, 0];
  if (ds > 1e-9) {
    corona = coronaAt(Math.atan2(local.y, local.x), Math.max(ds / sunRD, 1), seed, sun.coronaAxis, sun.coronaStructure);
  }

  const exposureScale = Math.pow(2, sun.exposure);
  const coronaScale = Math.pow(2, sun.exposure + sun.coronaGain) * (1 - moonMask);
  const color: [number, number, number] = [0, 0, 0];
  for (let channel = 0; channel < 3; channel += 1) {
    const disk = (1 - LIMB[channel] * (1 - mu)) * diskFactor;
    const linear =
      (disk + (sun.aureoleStrength * aureole[channel]) / norm) * exposureScale +
      corona[channel] * coronaScale;
    // extended Reinhard: linear where the corona lives, compressive where the
    // disk lives, so limb and streamers can be on screen at the same time.
    // No gamma here — the renderer owns the display transform.
    color[channel] =
      ((linear * (1 + linear / REINHARD_WHITE_SQ)) / (1 + linear)) * facing;
  }

  const chromaticAlpha = clamp(Math.max(color[0], color[1], color[2]));
  const alpha = clamp(Math.max(chromaticAlpha, diskFactor * facing));

  if (alpha <= 0.00001) {
    return [0, 0, 0, 0];
  }

  return [color[0] / alpha, color[1] / alpha, color[2] / alpha, alpha];
}

// --- WGSL twins ---

const sunHashFn = wgslFn(`
  fn skyboxStudioSunHash21(p: vec2<f32>) -> f32 {
    var q = fract(p * vec2<f32>(123.34, 456.21));
    q = q + dot(q, q + 45.32);
    return fract(q.x * q.y);
  }
`);

const sunVnoiseFn = wgslFn(
  `
  fn skyboxStudioSunVnoise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    let a = skyboxStudioSunHash21(i);
    let b = skyboxStudioSunHash21(i + vec2<f32>(1.0, 0.0));
    let c = skyboxStudioSunHash21(i + vec2<f32>(0.0, 1.0));
    let d = skyboxStudioSunHash21(i + vec2<f32>(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
`,
  [sunHashFn] as any[],
);

const sunFbmFn = wgslFn(
  `
  fn skyboxStudioSunFbm(p: vec2<f32>, octaves: i32) -> f32 {
    var s = 0.0;
    var n = 0.0;
    var a = 0.5;
    var q = p;
    for (var i: i32 = 0; i < 5; i++) {
      if (i >= octaves) { break; }
      s = s + a * skyboxStudioSunVnoise(q);
      n = n + a;
      q = q * 2.03;
      a = a * 0.5;
    }
    return s / max(n, 0.00001);
  }
`,
  [sunVnoiseFn] as any[],
);

const sunCoronaFn = wgslFn(
  `
  fn skyboxStudioSunCorona(
    phi: f32,
    x: f32,
    seed: f32,
    axis: f32,
    structure: f32
  ) -> vec3<f32> {
    let lx = log(x);
    let unit = vec2<f32>(cos(phi), sin(phi));

    let driftN = skyboxStudioSunFbm(unit * 4.0 + vec2<f32>(seed + 77.0, seed * 1.9), 2);
    let lean = (driftN - 0.5) * 0.14 * (1.0 - exp(-2.0 * lx));

    let leaned = vec2<f32>(cos(phi + lean), sin(phi + lean));
    let nS = skyboxStudioSunFbm(leaned * 4.0 + vec2<f32>(seed, 1.7 * seed), 4);
    let ridgeS = pow(1.0 - abs(2.0 * nS - 1.0), 3.0);
    let reach = 2.5 + 8.0 * skyboxStudioSunFbm(unit * 4.0 + vec2<f32>(seed + 31.0, seed - 12.0), 2);
    var streamer = ridgeS * (1.0 - smoothstep(0.4 * reach, reach, x));

    let nP = skyboxStudioSunFbm(unit * 26.0 + vec2<f32>(7.0 + 1.3 * seed, seed), 3);
    var plume = pow(1.0 - abs(2.0 * nP - 1.0), 4.0) * (1.0 - smoothstep(1.08, 2.2, x));

    let holes = smoothstep(0.18, 0.72,
      skyboxStudioSunFbm(unit * 2.0 + vec2<f32>(seed + 50.0, seed * 0.7), 2));

    let ca = abs(cos(phi - axis));
    let sa = abs(sin(phi - axis));
    plume = plume * mix(0.10, 1.0, ca * ca * ca * ca);
    streamer = streamer * mix(0.25, 1.0, sa * sa);

    let S = mix(1.0, (0.12 + 2.8 * streamer) * mix(0.20, 1.0, holes), structure);
    let P = mix(1.0, 0.30 + 2.4 * plume, structure);

    let f = 0.0532 * pow(x, -2.5) * S;
    let k1 = 1.425 * pow(x, -7.0) * S * P;
    let k2 = 2.565 * pow(x, -17.0) * mix(1.0, 0.80 + 0.4 * plume, structure);
    return vec3<f32>(1.0, 0.985, 0.96) * (f + k1 + k2) * 0.000001;
  }
`,
  [sunFbmFn] as any[],
);

const sunArcHalfFn = wgslFn(`
  fn skyboxStudioSunArcHalf(r: f32, d: f32, bigR: f32) -> f32 {
    if (d < 0.000000001) {
      return select(0.0, 3.14159265359, r < bigR);
    }
    let c = (r * r + d * d - bigR * bigR) / (2.0 * r * d);
    if (c <= -1.0) { return 3.14159265359; }
    if (c >= 1.0) { return 0.0; }
    return acos(c);
  }
`);

const sunArcOverlapFn = wgslFn(`
  fn skyboxStudioSunArcOverlap(a: f32, b: f32, delta: f32) -> f32 {
    let mn = 2.0 * min(a, b);
    let o1 = clamp(a + b - delta, 0.0, mn);
    let o2 = clamp(a + b - (6.28318530718 - delta), 0.0, mn);
    return min(o1 + o2, mn);
  }
`);

const sunLitMeasureFn = wgslFn(
  `
  fn skyboxStudioSunLitMeasure(
    r: f32,
    ds: f32,
    dm: f32,
    sunR: f32,
    moonR: f32,
    delta: f32
  ) -> vec3<f32> {
    let LIMB = vec3<f32>(0.52, 0.68, 0.82);
    let moonArc = skyboxStudioSunArcHalf(r, dm, moonR);
    var lit = vec3<f32>(0.0);
    for (var k: i32 = 4; k >= 1; k--) {
      let tA = (f32(k) - 0.5) / 4.0;
      let tB = (f32(k) + 0.5) / 4.0;
      let iA = vec3<f32>(1.0) - LIMB * (1.0 - sqrt(max(0.0, 1.0 - tA * tA)));
      var iB = vec3<f32>(0.0);
      if (k != 4) {
        iB = vec3<f32>(1.0) - LIMB * (1.0 - sqrt(max(0.0, 1.0 - tB * tB)));
      }
      let sunArc = skyboxStudioSunArcHalf(r, ds, (f32(k) / 4.0) * sunR);
      lit = lit + (iA - iB) * (2.0 * sunArc - skyboxStudioSunArcOverlap(sunArc, moonArc, delta));
    }
    return lit;
  }
`,
  [sunArcHalfFn, sunArcOverlapFn] as any[],
);

const sunSampleFn = wgslFn(
  `
  fn skyboxStudioSunSample(
    direction: vec3<f32>,
    centerDirection: vec3<f32>,
    radius: f32,
    sunRD: f32,
    aureoleStrength: f32,
    reachD: f32,
    exposure: f32,
    coronaGain: f32,
    coronaStructure: f32,
    seed: f32,
    axis: f32,
    eclipseActive: f32,
    occLocalX: f32,
    occLocalY: f32,
    occRadiusD: f32
  ) -> vec4<f32> {
    let sunCenter = normalize(centerDirection);
    let tangentX = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), sunCenter));
    let tangentY = normalize(cross(sunCenter, tangentX));
    let facing = select(0.0, 1.0, dot(normalize(direction), sunCenter) > 0.0);
    let denom = max(dot(normalize(direction), sunCenter), 0.000001);
    let p = vec2<f32>(
      dot(normalize(direction), tangentX) / denom / max(radius, 0.0001),
      dot(normalize(direction), tangentY) / denom / max(radius, 0.0001)
    );

    let occPos = vec2<f32>(occLocalX, occLocalY);
    let ds = length(p);
    let dm = length(p - occPos);
    let e = ${EDGE_AA};

    let sunMask = 1.0 - smoothstep(sunRD - e, sunRD + e, ds);
    let moonMask = eclipseActive * (1.0 - smoothstep(occRadiusD - e, occRadiusD + e, dm));
    let t = clamp(ds / sunRD, 0.0, 1.0);
    let mu = sqrt(max(0.0, 1.0 - t * t));
    let LIMB = vec3<f32>(0.52, 0.68, 0.82);
    let diskFactor = sunMask * (1.0 - moonMask);
    let disk = (vec3<f32>(1.0) - LIMB * (1.0 - mu)) * diskFactor;

    var delta = 0.0;
    if (ds > 0.000000001 && dm > 0.000000001) {
      delta = acos(clamp(dot(-p / ds, (occPos - p) / dm), -1.0, 1.0));
    }

    let rMax = reachD;
    let rMin = max(0.25 * e, 0.0000001);

    var bp: array<f32, 10>;
    for (var k: i32 = 1; k <= 4; k++) {
      let shellRadius = (f32(k) / 4.0) * sunRD;
      bp[2 * (k - 1)] = clamp(abs(ds - shellRadius), rMin, rMax);
      bp[2 * (k - 1) + 1] = clamp(ds + shellRadius, rMin, rMax);
    }
    bp[8] = clamp(abs(dm - occRadiusD), rMin, rMax);
    bp[9] = clamp(dm + occRadiusD, rMin, rMax);

    for (var i: i32 = 1; i < 10; i++) {
      let key = bp[i];
      var j: i32 = i - 1;
      loop {
        if (j < 0) { break; }
        if (bp[j] <= key) { break; }
        bp[j + 1] = bp[j];
        j = j - 1;
      }
      bp[j + 1] = key;
    }

    var aureole = vec3<f32>(0.0);
    var total = 0.0;
    var prev = rMin;
    for (var i: i32 = 0; i <= 10; i++) {
      var next = rMax;
      if (i < 10) { next = bp[i]; }
      if (next > prev) {
        let logWidth = log(next / prev);
        for (var s: i32 = 0; s < 6; s++) {
          let f = (f32(s) + 0.5) / 6.0;
          let r = prev * exp(logWidth * f);
          let w = 1.0 - smoothstep(0.25 * rMax, rMax, r);
          let dw = w * logWidth / 6.0;
          aureole = aureole + skyboxStudioSunLitMeasure(r, ds, dm, sunRD, occRadiusD, delta) * dw;
          total = total + dw;
        }
        prev = next;
      }
    }
    aureole = aureole / (max(total, 0.000001) * 6.28318530718);

    var corona = vec3<f32>(0.0);
    if (ds > 0.000000001) {
      corona = skyboxStudioSunCorona(atan2(p.y, p.x), max(ds / sunRD, 1.0), seed, axis, coronaStructure);
    }

    var c = (disk + aureoleStrength * aureole) * exp2(exposure)
          + corona * exp2(exposure + coronaGain) * (1.0 - moonMask);
    c = c * (1.0 + c / ${REINHARD_WHITE_SQ}.0) / (1.0 + c) * facing;

    let chromaticAlpha = clamp(max(max(c.r, c.g), c.b), 0.0, 1.0);
    let alpha = clamp(max(chromaticAlpha, diskFactor * facing), 0.0, 1.0);
    return vec4<f32>(c / max(alpha, 0.00001), alpha);
  }
`,
  [sunLitMeasureFn, sunCoronaFn] as any[],
);

// --- Shared GPU values ---

function sunShaderValues(params: SkyboxSunParams) {
  const sun = normalizeSunParams(params);
  const geometry = computeSunEclipseGeometry(sun);
  const radius = Math.max(sun.angularRadius, 0.0001);
  const sunRadiusD = Math.tan(radius) / radius;

  return {
    aureoleStrength: sun.aureoleStrength,
    centerDirection: new THREE.Vector3(...sun.centerDirection).normalize(),
    coronaAxis: sun.coronaAxis,
    coronaGain: sun.coronaGain,
    coronaSeed: sun.coronaSeed,
    coronaStructure: sun.coronaStructure,
    eclipseActive: geometry.active,
    exposure: sun.exposure,
    occLocalX: geometry.occLocalX,
    occLocalY: geometry.occLocalY,
    occRadiusD: geometry.occRadiusD,
    radius,
    reachD: sun.aureoleReach * sunRadiusD,
    sunRadiusD,
  };
}

// --- WebGPU (TSL) uniform nodes ---

function createSunUniformNodes(bindings: SunLayerShaderBinding[]) {
  return bindings.map((binding): SunUniformNodes => {
    const values = sunShaderValues(binding.layer.params);

    return {
      aureoleStrength: uniform(values.aureoleStrength),
      centerDirection: uniform(values.centerDirection),
      coronaAxis: uniform(values.coronaAxis),
      coronaGain: uniform(values.coronaGain),
      coronaStructure: uniform(values.coronaStructure),
      eclipseActive: uniform(values.eclipseActive),
      exposure: uniform(values.exposure),
      layerId: binding.layer.id,
      occLocalX: uniform(values.occLocalX),
      occLocalY: uniform(values.occLocalY),
      occRadiusD: uniform(values.occRadiusD),
      radius: uniform(values.radius),
      reachD: uniform(values.reachD),
      seed: uniform(values.coronaSeed),
      seedBase: values.coronaSeed,
      sunRadiusD: uniform(values.sunRadiusD),
    };
  });
}

function applySunLayerParamsToUniformNodes(
  uniforms: SunUniformNodes[],
  layer: Extract<SkyboxManifestLayer, { type: "sun" }>,
) {
  const sunUniforms = uniforms.find((nextUniforms) => nextUniforms.layerId === layer.id);

  if (!sunUniforms) {
    return;
  }

  const values = sunShaderValues(layer.params);

  (sunUniforms.aureoleStrength as any).value = values.aureoleStrength;
  (sunUniforms.centerDirection as any).value.copy(values.centerDirection);
  (sunUniforms.coronaAxis as any).value = values.coronaAxis;
  (sunUniforms.coronaGain as any).value = values.coronaGain;
  (sunUniforms.coronaStructure as any).value = values.coronaStructure;
  (sunUniforms.eclipseActive as any).value = values.eclipseActive;
  (sunUniforms.exposure as any).value = values.exposure;
  (sunUniforms.occLocalX as any).value = values.occLocalX;
  (sunUniforms.occLocalY as any).value = values.occLocalY;
  (sunUniforms.occRadiusD as any).value = values.occRadiusD;
  (sunUniforms.radius as any).value = values.radius;
  (sunUniforms.reachD as any).value = values.reachD;
  sunUniforms.seedBase = values.coronaSeed;
  (sunUniforms.seed as any).value = values.coronaSeed;
  (sunUniforms.sunRadiusD as any).value = values.sunRadiusD;
}

function updateSunTime(uniforms: SunUniformNodes[], time: number) {
  uniforms.forEach((target) => {
    // The reference drifts the corona seed slowly so it is never static.
    (target.seed as any).value = target.seedBase + time * CORONA_DRIFT_RATE;
  });
}

// --- Binding collection ---

function collectSunLayerBindings(nodes: SkyboxManifestNode[]) {
  const bindings: SunLayerShaderBinding[] = [];

  function collect(nextNodes: SkyboxManifestNode[]) {
    nextNodes.forEach((node) => {
      if (!node.enabled) {
        return;
      }

      if (node.type === "group") {
        collect(node.children);
        return;
      }

      if (node.type === "sun") {
        const index = bindings.length;

        bindings.push({
          index,
          layer: node,
          parameterName: `sunLayer${index}`,
        });
      }
    });
  }

  collect(nodes);

  return bindings;
}

// --- WebGPU adapter (TSL) ---

type SunLayerSampleNodes = {
  editorProjectionByLayerId: Map<string, { uv: unknown; valid: unknown }>;
  sampleNodesByParameterName: Record<string, unknown>;
};

const sunWebGpuAdapter: BuiltInWebGpuLayerAdapter<"sun", SunLayerShaderBinding, SunUniformNodes> = {
  collect: collectSunLayerBindings,
  createParameterDeclarations: (bindings) =>
    bindings.map((binding) => `,\n      ${binding.parameterName}: vec4<f32>`).join(""),
  createSampleExpression: (layer, _language, context) => {
    const binding = context.bindingsByLayerId.get(layer.id);

    return binding ? `effectColor = ${binding.parameterName};` : zeroEffectExpression();
  },
  createSampleNodes: ({ bindings, direction, uniforms }) => {
    const sampleNodesByParameterName = Object.fromEntries(
      bindings.map((binding) => {
        const sunUniform = uniforms[binding.index];
        const sampleNode = (sunSampleFn as any)({
          direction,
          centerDirection: sunUniform.centerDirection,
          radius: sunUniform.radius,
          sunRD: sunUniform.sunRadiusD,
          aureoleStrength: sunUniform.aureoleStrength,
          reachD: sunUniform.reachD,
          exposure: sunUniform.exposure,
          coronaGain: sunUniform.coronaGain,
          coronaStructure: sunUniform.coronaStructure,
          seed: sunUniform.seed,
          axis: sunUniform.coronaAxis,
          eclipseActive: sunUniform.eclipseActive,
          occLocalX: sunUniform.occLocalX,
          occLocalY: sunUniform.occLocalY,
          occRadiusD: sunUniform.occRadiusD,
        });

        return [binding.parameterName, sampleNode];
      }),
    );

    return {
      editorProjectionByLayerId: new Map(
        bindings.map((binding) => {
          const sunUniform = uniforms[binding.index];
          const sunInfo = (webGpuSpotEditorRectInfoFunction as any)({
            direction,
            spotCenterDirection: sunUniform.centerDirection,
            spotRadius: sunUniform.radius,
          }) as any;

          return [
            binding.layer.id,
            {
              uv: vec2(sunInfo.x, sunInfo.y),
              valid: sunInfo.z,
            },
          ];
        }),
      ),
      sampleNodesByParameterName,
    } satisfies SunLayerSampleNodes;
  },
  createSampleParameters: (_bindings, _uniforms, samples) =>
    (samples as SunLayerSampleNodes | undefined)?.sampleNodesByParameterName ?? {},
  createUniforms: createSunUniformNodes,
  getTopologyKey: () => ({}),
  type: "sun",
  updateTime: updateSunTime,
  updateUniforms: applySunLayerParamsToUniformNodes,
};

registerLayerRuntimeAdapter({
  type: "sun",
  sampleCpu: (direction, params) => sampleSunLayer(direction, params as SkyboxSunParams),
  updateLive: (context, layer) => context.applyLayerParams(layer),
  wgsl: sunWebGpuAdapter as WebGpuLayerAdapter,
  wgslEditorOverlay: true,
  getTopologyKey: () => ({}),
  getLightSource: (params) => computeSunLightSource(params as SkyboxSunParams),
  consumesLightSources: true,
});
