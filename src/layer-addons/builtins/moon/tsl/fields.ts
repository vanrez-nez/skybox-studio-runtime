// ─────────────────────────────────────────────────────────────────────────────
//  The generation layers.
//
//  Everything here is a function of a 3D point on the unit sphere. The bake never
//  needs a UV map, a cube map or any geometry — the disc image *is* the
//  parameterisation, and these functions only ever get asked about the hemisphere
//  that happens to be facing us.
// ─────────────────────────────────────────────────────────────────────────────
import * as TSL from "three/tsl";

// TSL's published types model each node's exact scalar type, which makes ordinary
// shader arithmetic (mixing floats, uniforms and swizzles) fight the checker for
// no benefit. Destructure once as untyped — the shader graph validates itself at
// build time anyway.
const {
  Fn, float, vec3, vec4, Loop,
  floor, fract, sin, exp, dot, length, min, max, mix, smoothstep, clamp, pow,
  mx_fractal_noise_float, mx_noise_float,
} = TSL as any;

// Four decorrelated 0..1 values from an integer lattice cell. One hash call gives
// a crater its jitter (xyz) and its radius (w); the freshness is folded back out
// of x and z so it stays independent of position.
export const hash43 = /*#__PURE__*/ Fn(([cell]: any) => {
  const q = vec4(
    dot(cell, vec3(127.1, 311.7, 74.7)),
    dot(cell, vec3(269.5, 183.3, 246.1)),
    dot(cell, vec3(113.5, 271.9, 124.6)),
    dot(cell, vec3(419.2, 371.9, 168.2)),
  );
  return fract(sin(q).mul(43758.5453123));
});

// ── One octave of craters ────────────────────────────────────────────────────
//
// Feature points sit on a jittered 3D lattice and the moon's surface slices
// through it. A crater whose centre lands exactly on the shell gets its full
// radius; one sitting off the shell is cut by the surface into a smaller, shallower
// bowl. That gives a natural size distribution for free — no explicit sampling of
// a crater-size power law.
//
// Bowls combine with `min` (deepest wins) rather than by age-sorting. It is
// order-independent, which a gather kernel needs, and reads almost the same: the
// visible cue is that craters cut each other cleanly, which min preserves.
// Freshness then drives rim sharpness, ray systems and albedo, which is where the
// eye actually reads a crater's age.
//
// Returns vec4(height, rimMask, albedoBoost, unused).
export const craterOctave = /*#__PURE__*/ Fn(([p, freq, depth, seed]: any) => {
  const P = p.mul(freq).add(seed);
  const base = floor(P);

  const bowl = float(0).toVar();
  const rim = float(0).toVar();
  const ejecta = float(0).toVar();
  const bright = float(0).toVar();

  // 3×3×3 neighbourhood, decomposed from a flat loop so the kernel compiles as
  // one body instead of 27 unrolled copies.
  Loop(27, ({ i }: any) => {
    const fi = float(i);
    const offset = vec3(
      fi.mod(3.0).sub(1.0),
      fi.div(3.0).floor().mod(3.0).sub(1.0),
      fi.div(9.0).floor().sub(1.0),
    );
    const cell = base.add(offset);
    const h = hash43(cell);
    const centre = cell.add(h.xyz);
    const d = length(P.sub(centre));

    // Crater sizes follow a power law — a great many small ones, a few large.
    // A uniform radius here reads as a golf ball.
    const radius = pow(h.w, float(2.2)).mul(0.62).add(0.14);
    const fresh = fract(h.x.mul(7.13).add(h.z.mul(3.71)));
    const u = d.div(radius);

    // Parabolic bowl inside u<1, flat outside.
    const inner = clamp(u, 0.0, 1.0);
    const bowlProfile = inner.mul(inner).oneMinus().negate();
    // Raised rim: a gaussian ring sitting on u = 1.
    const e = u.sub(1.0);
    const rimProfile = exp(e.mul(e).mul(-26.0)).mul(smoothstep(0.0, 0.45, u));
    // Ejecta blanket fading out to ~2.6 radii.
    const ejectaProfile = smoothstep(2.6, 1.05, u).mul(smoothstep(0.95, 1.2, u));

    const amp = depth.mul(mix(float(0.5), float(1.0), fresh));
    bowl.assign(min(bowl, bowlProfile.mul(amp)));
    rim.addAssign(rimProfile.mul(amp).mul(0.45));
    ejecta.addAssign(ejectaProfile.mul(amp).mul(0.1));

    // Ray systems: a directional noise around the crater centre, so bright
    // streaks radiate outward. Only the freshest craters get them — that is what
    // makes Tycho readable.
    const dir = P.sub(centre).div(max(d, 1e-4));
    const rayNoise = mx_noise_float(dir.mul(9.0).add(cell)).mul(0.5).add(0.5);
    const rays = pow(rayNoise, float(4.0)).mul(smoothstep(7.0, 1.1, u));
    bright.addAssign(rimProfile.add(rays.mul(0.8)).mul(smoothstep(0.55, 0.95, fresh)));
  });

  return vec4(bowl.add(rim).add(ejecta), rim, bright, float(0.0));
});

// ── The full surface ─────────────────────────────────────────────────────────
//
// Composites the layers into vec4(height, albedo, mareMask, brightAccum).
// `sp` is a point on the unit sphere in the moon's own body frame.
export function surface(sp: any, U: any) {
  const c0 = craterOctave(sp, U.craterFreq, U.craterDepth, vec3(0.0, 0.0, 0.0));
  const c1 = craterOctave(sp, U.craterFreq.mul(2.7), U.craterDepth.mul(0.45), vec3(11.3, 4.7, 19.1));
  const c2 = craterOctave(sp, U.craterFreq.mul(7.1), U.craterDepth.mul(0.18), vec3(31.7, 23.9, 7.5));

  // Maria: very low-frequency fBm thresholded into basins. This is the highest-
  // leverage single term — without large-scale composition the surface reads as
  // uniform crater soup rather than as a moon.
  // Frequency has to sit above the moon's own scale or the mask is near-constant
  // across the whole visible face — either everything floods or nothing does.
  const mareNoise = mx_fractal_noise_float(sp.mul(1.7).add(vec3(5.0, 1.7, 9.3)), 4, 2.0, 0.55)
    .mul(0.5).add(0.5);
  const threshold = mix(float(0.78), float(0.18), U.maria);
  const mare = smoothstep(threshold, threshold.add(0.13), mareNoise);

  // Regolith micro-relief.
  const regolith = mx_fractal_noise_float(sp.mul(U.craterFreq.mul(16.0)), 4, 2.0, 0.5)
    .mul(U.regolith).mul(U.craterDepth).mul(0.28);

  // Maria are younger and smoother, so they carry far fewer small craters.
  const height = c0.x
    .add(c1.x.mul(mix(float(1.0), float(0.45), mare)))
    .add(c2.x.mul(mix(float(1.0), float(0.2), mare)))
    .add(regolith.mul(mix(float(1.0), float(0.4), mare)))
    .sub(mare.mul(U.mariaDepth));

  const brightAccum = c0.z.add(c1.z.mul(0.7)).add(c2.z.mul(0.4));

  // Broad albedo mottling so the highlands are not a flat grey.
  const mottle = mx_fractal_noise_float(sp.mul(3.1).add(vec3(17.0, 3.0, 21.0)), 3, 2.0, 0.5)
    .mul(0.07);

  const albedo = mix(U.albedo, U.albedo.mul(U.mariaDarkness), mare)
    .mul(float(1.0).add(mottle))
    .add(brightAccum.mul(U.rays).mul(U.albedo).mul(0.55))
    .clamp(0.0, 1.0);

  return vec4(height, albedo, mare, brightAccum);
}

// Rotate a point about X then Y — the moon's libration, i.e. which sliver of the
// far side is tipped into view.
export function librate(n: any, lat: any, lon: any) {
  const cx = lat.cos();
  const sx = lat.sin();
  const p1 = vec3(n.x, n.y.mul(cx).sub(n.z.mul(sx)), n.y.mul(sx).add(n.z.mul(cx)));
  const cy = lon.cos();
  const sy = lon.sin();
  return vec3(p1.x.mul(cy).add(p1.z.mul(sy)), p1.y, p1.z.mul(cy).sub(p1.x.mul(sy)));
}

