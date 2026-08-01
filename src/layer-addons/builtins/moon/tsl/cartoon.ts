// ─────────────────────────────────────────────────────────────────────────────
//  The cartoon moon — a separate implementation, not a restyling of the realistic
//  one.
//
//  The realistic moon is *simulated*: thousands of craters sampled from a lattice,
//  accumulated into a height field, then lit. Posterising that gives mush, because
//  the band edges land on noise rather than on shapes.
//
//  A cartoon moon is *drawn*. No height field, no normals, no ambient occlusion,
//  no shadow march. Instead:
//
//    · a small set of craters on a spherical Fibonacci lattice — near-uniform with
//      a guaranteed minimum separation, so they read as composed rather than
//      clumped, which a jittered lattice never manages at low counts
//    · each with an *irregular* outline: the radius is perturbed by angular noise,
//      because a field of clean ellipses reads as bubbles, not craters
//    · a lighter interior with a shadow crescent on the lit wall and a light
//      crescent opposite, which is what makes it read as a pit
//
//  Two lights, deliberately separated:
//
//    · the **art light** gives the smooth ball gradient and orients crater relief.
//      It is fixed, upper-left, and never moves — that is what makes the sphere
//      read as a sphere in an illustration.
//    · the **sun** gives the phase, and only the phase. It cuts the terminator.
//
//  Keeping them apart is what lets `cartoonCrop` discard the unlit side outright
//  and still leave a properly shaded crescent behind.
//
//  Craters live in body space, so rotation and tilt work and the shapes foreshorten
//  toward the limb on their own.
// ─────────────────────────────────────────────────────────────────────────────
import * as TSL from "three/tsl";

const {
  float, vec2, vec3, vec4, Loop,
  acos, sqrt, cos, sin, dot, abs, min, max, mix, smoothstep, clamp, normalize, step,
  length, pow, mx_fractal_noise_float, mx_noise_float,
} = TSL as any;

import { hash43 } from "./fields";
import { rimTerm } from "./light";

// Loop bound. The active count is a uniform; inactive craters are masked out.
export const MAX_CARTOON_CRATERS = 64;

const GOLDEN_ANGLE = 2.399963229728653;

/**
 * @param sp        surface point in body space (rotated by libration)
 * @param n         surface normal in view space
 * @param sunBody   sun direction in body space
 * @param sunView   sun direction in view space — drives the phase only
 * @param artBody   fixed key light in body space — orients crater relief
 * @param artView   fixed key light in view space — drives the ball gradient
 * @returns vec4(colour, alphaFactor) — alpha is 0 on the cropped-away side
 */
export function cartoon(
  p: any, sp: any, n: any,
  sunBody: any, sunView: any,
  artBody: any, artView: any,
  U: any,
) {
  // ── flat base regions ──
  // Blobby, scattered, low contrast. A hard threshold on very low frequency gives
  // continents; the reference look wants patches.
  const mareNoise = mx_fractal_noise_float(sp.mul(2.3).add(vec3(5.0, 1.7, 9.3)), 4, 2.2, 0.5)
    .mul(0.5).add(0.5);
  const threshold = mix(float(0.70), float(0.34), U.maria);
  const mare = smoothstep(threshold, threshold.add(0.05), mareNoise);
  const albedo = mix(U.baseColor, U.mareColor, mare);

  // ── craters as drawn shapes ──
  const relief = float(0).toVar();
  const outline = float(0).toVar();

  const count = max(U.cartoonCraters, 1.0);

  Loop(MAX_CARTOON_CRATERS, ({ i }: any) => {
    const fi = float(i);
    // Only the first `count` are drawn, and the lattice is built from `count` too —
    // a Fibonacci lattice truncated to a prefix bunches at one pole.
    const active = step(fi, count.sub(0.5));

    const gz = fi.mul(2.0).add(1.0).div(count).oneMinus();
    const gr = sqrt(max(gz.mul(gz).oneMinus(), 0.0));
    const ga = fi.mul(GOLDEN_ANGLE);
    const lattice = vec3(cos(ga).mul(gr), gz, sin(ga).mul(gr));

    const h = hash43(vec3(fi, fi.mul(0.37), 3.1));
    // Light jitter only — the even spacing is the point of the lattice.
    const centre = normalize(lattice.add(h.xyz.sub(0.5).mul(0.22)));

    // A power law on the radius: a few large craters and a lot of specks, rather
    // than a field of one size.
    const radius = U.cartoonCraterSize.mul(pow(h.w, float(1.9)).mul(1.5).add(0.16));

    const offset = sp.sub(centre.mul(dot(sp, centre)));
    const around = normalize(offset.add(1e-5));
    const d = acos(clamp(dot(sp, centre), -1.0, 1.0));

    // Irregular outline. Perturbing the radius by noise in the *angular* direction
    // around the crater turns a circle into a lumpy blob — the single biggest thing
    // separating a crater field from a field of bubbles.
    const wobble = mx_noise_float(around.mul(1.15).add(centre.mul(11.0)));
    const rEff = radius.mul(float(1.0).add(wobble.mul(U.cartoonWobble)));

    const inside = smoothstep(rEff.mul(0.94), rEff, d).oneMinus();

    // Azimuth around the crater, against the direction light arrives from.
    // The sun's tangential component collapses when it is near the crater's own
    // normal — exactly the full moon — so relief is oriented by the fixed art
    // light, with the sun only nudging it where it is well defined.
    const tangential = sunBody.sub(centre.mul(dot(sunBody, centre)));
    const artTangential = artBody.sub(centre.mul(dot(artBody, centre)));
    const defined = smoothstep(0.25, 0.8, length(tangential)).mul(U.cartoonSunLean);
    const lightDir = normalize(mix(artTangential, tangential, defined).add(1e-5));
    const u = dot(around, lightDir);

    // A pit lit from one side. The floor sits slightly lighter than the plain, and
    // the concavity comes from a broad shadow arc along the wall *facing* the light
    // with a brighter arc opposite. Narrow crescents read as a specular highlight
    // on a dome instead — the arcs have to cover most of their half of the bowl.
    const rimBand = smoothstep(rEff.mul(0.25), rEff.mul(0.72), d).mul(inside);
    const litWall = rimBand.mul(smoothstep(-0.5, 0.2, u).oneMinus());
    const shadowWall = rimBand.mul(smoothstep(-0.2, 0.5, u));
    const floorLift = inside.mul(0.3);

    const shape = floorLift
      .add(litWall.mul(0.45))
      .sub(shadowWall.mul(1.1));
    relief.addAssign(shape.mul(U.cartoonRelief).mul(active));

    const width = rEff.mul(0.05).add(0.003);
    const ring = abs(d.sub(rEff)).div(width).oneMinus().clamp(0.0, 1.0);
    outline.addAssign(ring.mul(active));
  });

  // ── the ball gradient ──
  // A smooth ramp from the fixed key, independent of phase. This is what makes the
  // disc read as a sphere rather than as a flat circle with holes in it.
  const form = dot(n, artView).mul(0.5).add(0.5);
  const shade = mix(U.cartoonForm.oneMinus(), 1.0, smoothstep(0.1, 0.95, form));

  const shaped = albedo.mul(float(1.0).add(relief.clamp(-0.8, 0.8))).mul(shade);

  // Ink is a colour the line moves *toward*, not a multiplier — multiplying a pale
  // base by 0.5 gives mid-cream, which never reads as a drawn line.
  const inkColor = U.mareColor.mul(0.22);
  const inked = mix(shaped, inkColor, min(outline, 1.0).mul(U.cartoonOutline).clamp(0.0, 1.0));

  // ── phase ──
  // The sun does nothing but cut the terminator. Two constructions, chosen by
  // `cartoonShadowSize`, unified through one signed distance past the cut.
  //
  //   0  → the real terminator: the set where N·L = 0. This is a great circle on the
  //        sphere, so it projects to an ellipse pinned to the disc's poles.
  //
  //   >0 → the shape an illustrator draws: the disc minus a circle of that radius,
  //        offset opposite the sun. Its inner edge is a circular arc whose curvature
  //        is independent of how thin the crescent is, so the horns can be pulled
  //        into sharp cusps — the iconic look. A real terminator cannot do this: its
  //        bulge is locked to cos(phase).
  //
  // Note it has to be a *2D* construction. Biasing N·L instead only shrinks the lit
  // region toward a cap around the sub-solar point, which reads as an oval blob —
  // every level set of N·L except zero closes up rather than spanning the disc.
  const edge = U.cartoonSoftness.mul(0.4).add(0.012);

  const realDist = dot(n, sunView);

  const axis = normalize(vec2(sunView.x, sunView.y).add(1e-4));
  const shadowR = max(U.cartoonShadowSize, 1e-3);
  // t = 0 covers the disc, 0.5 puts the shadow's edge through the centre, 1 clears it.
  const centre = axis.mul(mix(shadowR.sub(1.0), shadowR.add(1.0), U.phaseT).negate());
  const drawnDist = length(p.sub(centre)).sub(shadowR);

  // Blend over a short run off zero so dragging the slider up does not snap.
  const drawn = smoothstep(0.0, 0.15, U.cartoonShadowSize);
  const signedDist = mix(realDist, drawnDist, drawn);

  const phase = smoothstep(edge.negate(), edge, signedDist);

  // The reference look has the crescent's inner edge reading brighter than its
  // middle — a drawn convention, not anything physical. Off by default.
  const glow = smoothstep(edge, edge.add(0.13), signedDist)
    .oneMinus().mul(phase).mul(U.cartoonEdgeGlow);

  // Shared light rig on top of the drawn surface. `lightIntensity` scales only what
  // the light contributes, so overshooting it blows the lit side out without also
  // lifting the ambient fill. The rim is gated by the phase so it hugs the crescent.
  const rim = rimTerm(n.z, phase, U);
  const lit = inked
    .add(inked.mul(glow))
    .mul(U.lightIntensity)
    .add(inked.mul(U.ambient))
    .add(U.rimColor.mul(rim));

  // Cropped: the unlit side is discarded entirely, leaving a shaded crescent with
  // nothing behind it. Otherwise it is filled with the night colour.
  const night = U.nightColor.mul(U.earthshine.mul(6.0));
  const color = mix(mix(night, lit, phase), lit, U.cartoonCrop);
  const alpha = mix(float(1.0), phase, U.cartoonCrop);

  return vec4(color.mul(U.exposure), alpha);
}

