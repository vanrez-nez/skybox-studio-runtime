// ─────────────────────────────────────────────────────────────────────────────
//  The bake.
//
//  Three compute passes over a square storage texture. The moon disc is inscribed
//  in it, and every texel maps to a point on an *implied* sphere:
//
//      p  = (x, y) in [-1,1]²          disc coordinate
//      z  = sqrt(1 - x² - y²)
//      N  = (x, y, z)                  the sphere normal — and the surface point
//
//  There is no geometry. That single identity is why there is no UV seam, no pole
//  pinch and no cube map: we only ever generate the hemisphere facing the camera,
//  and the disc image is its natural parameterisation.
//
//  Because the projection is orthographic, a sphere point's disc coordinate is
//  literally its xy — which makes the shadow march in pass C exact rather than
//  approximate.
//
//  pass A  terrain   craters + maria + regolith    → height, albedo, mare, bright
//  pass B  derive    normals + ambient occlusion   → normal.xyz, ao
//  pass C  shade     sun, shadows, style           → the finished RGBA image
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import type { MoonBakeParams } from "./params";
import { surface, librate } from "./tsl/fields";
import { cartoon } from "./tsl/cartoon";
import { rimTerm, haloTerm } from "./tsl/light";
import { DISC_FILL } from "./disc";

// See the note in tsl/fields.ts — TSL's exact node typings are more trouble than
// help for shader arithmetic.
const {
  Fn, instanceIndex, uniform, textureStore, textureLoad,
  int, float, vec2, vec3, vec4, ivec2,
  floor, sqrt, length, dot, min, max, mix, clamp, smoothstep, normalize,
} = TSL as any;

const AO_DIRS = 6;
const AO_STEPS = 4;
const SHADOW_STEPS = 14;

type Uniforms = Record<string, any>;

export class MoonBaker {
  private renderer: THREE.WebGPURenderer;
  private size: number;

  /** R = height, G = albedo, B = mare mask, A = fresh-crater brightness */
  terrainTex!: THREE.StorageTexture;
  /** RGB = perturbed normal, A = ambient occlusion */
  deriveTex!: THREE.StorageTexture;
  /** The finished, fully lit moon. This is the only texture the scene samples. */
  outputTex!: THREE.StorageTexture;

  private U: Uniforms;
  // Two independent pipelines, selected by style — not two ends of a blend.
  private realisticPasses: any[] = [];
  private cartoonPasses: any[] = [];

  constructor(renderer: THREE.WebGPURenderer, params: MoonBakeParams) {
    this.renderer = renderer;
    this.size = params.resolution;

    // Every parameter is a uniform node, so changing one only re-runs the passes —
    // it never recompiles a shader. Resolution is the exception: it is a compile-
    // time constant in the kernels, so it rebuilds them.
    this.U = {
      craterFreq: uniform(params.craterFreq),
      craterDepth: uniform(params.craterDepth),
      maria: uniform(params.maria),
      mariaDarkness: uniform(params.mariaDarkness),
      mariaDepth: uniform(params.mariaDepth),
      regolith: uniform(params.regolith),
      rays: uniform(params.rays),
      albedo: uniform(params.albedo),
      tilt: uniform(params.bodyTilt),
      rotation: uniform(params.bodyRotation),
      bumpStrength: uniform(params.bumpStrength),
      ao: uniform(params.ao),
      shadowStrength: uniform(params.shadowStrength),
      shadowReach: uniform(params.shadowReach),
      backscatter: uniform(params.backscatter),
      earthshine: uniform(params.earthshine),
      exposure: uniform(params.exposure),
      lightIntensity: uniform(params.lightIntensity),
      ambient: uniform(params.ambient),
      rimStrength: uniform(params.rimStrength),
      rimPower: uniform(params.rimPower),
      rimColor: uniform(new THREE.Color(params.rimColor)),
      glowStrength: uniform(params.glowStrength),
      glowWidth: uniform(params.glowWidth),
      glowWrap: uniform(params.glowWrap),
      glowColor: uniform(new THREE.Color(params.glowColor)),
      sunDir: uniform(new THREE.Vector3(0, 0, 1)),
      // Illuminated fraction, 0 at new and 1 at full. Only the drawn crescent uses
      // it — the real terminator falls out of sunDir on its own.
      phaseT: uniform(1),

      cartoonCraters: uniform(params.cartoonCraters),
      cartoonCraterSize: uniform(params.cartoonCraterSize),
      cartoonWobble: uniform(params.cartoonWobble),
      cartoonRelief: uniform(params.cartoonRelief),
      cartoonForm: uniform(params.cartoonForm),
      cartoonSunLean: uniform(params.cartoonSunLean),
      cartoonOutline: uniform(params.cartoonOutline),
      cartoonSoftness: uniform(params.cartoonSoftness),
      cartoonShadowSize: uniform(params.cartoonShadowSize),
      cartoonEdgeGlow: uniform(params.cartoonEdgeGlow),
      cartoonCrop: uniform(params.cartoonCrop ? 1 : 0),
      baseColor: uniform(new THREE.Color(params.baseColor)),
      mareColor: uniform(new THREE.Color(params.mareColor)),
      nightColor: uniform(new THREE.Color(params.nightColor)),
    };

    this.build();
    this.setSun(params);
  }

  // ── texture + kernel construction ──────────────────────────────────────────

  private build(): void {
    const size = this.size;

    // Height needs full float: adjacent texels on a gentle crater bowl differ by
    // ~1e-4, and the derive pass central-differences them. Half float terraces.
    this.terrainTex = new THREE.StorageTexture(size, size);
    this.terrainTex.type = THREE.FloatType;

    this.deriveTex = new THREE.StorageTexture(size, size);
    this.deriveTex.type = THREE.FloatType;

    // The output is sampled with filtering, so it must be a filterable format.
    this.outputTex = new THREE.StorageTexture(size, size);
    this.outputTex.type = THREE.HalfFloatType;
    this.outputTex.colorSpace = THREE.NoColorSpace; // linear light, tone-mapped on draw
    this.outputTex.minFilter = THREE.LinearFilter;
    this.outputTex.magFilter = THREE.LinearFilter;
    // The quad rotates its UVs, so corner samples can fall outside [0,1]. Clamp
    // rather than wrap, or the far limb bleeds in across the disc.
    this.outputTex.wrapS = THREE.ClampToEdgeWrapping;
    this.outputTex.wrapT = THREE.ClampToEdgeWrapping;

    const U = this.U;

    // ── shared geometry helpers ──
    const texelToDisc = (x: any, y: any) =>
      vec2(x.add(0.5).div(size), y.add(0.5).div(size)).sub(0.5).mul(2.0 / DISC_FILL);

    // Disc coordinate → nearest texel, clamped. Used by the AO and shadow marches.
    const discToTexel = (p: any) => {
      const uv = p.mul(DISC_FILL * 0.5).add(0.5);
      return ivec2(clamp(floor(uv.mul(size)), vec2(0.0), vec2(size - 1)));
    };

    const loadHeight = (p: any) => textureLoad(this.terrainTex, discToTexel(p)).x;

    const at = (x: any, y: any) => ivec2(
      clamp(x, int(0), int(size - 1)),
      clamp(y, int(0), int(size - 1)),
    );

    // Texel index → disc point, sphere normal, and the raw (unclamped) radius.
    // Outside the disc we project onto the limb so the derive pass's neighbour
    // taps stay continuous instead of falling off a cliff.
    const frame = () => {
      const x = int(instanceIndex.mod(size));
      const y = int(instanceIndex.div(size));
      const p = texelToDisc(float(x), float(y));
      const r = length(p);
      const pc = p.div(max(r, 1.0));
      const z = sqrt(max(dot(pc, pc).oneMinus(), 0.0));
      return { x, y, p, r, pc, z, n: vec3(pc.x, pc.y, z) };
    };

    // ── pass A · terrain ──────────────────────────────────────────────────────
    const terrainPass = Fn(() => {
      const { x, y, n } = frame();
      const sp = librate(n, U.tilt, U.rotation);
      textureStore(this.terrainTex, ivec2(x, y), surface(sp, U)).toWriteOnly();
    })().compute(size * size);

    // ── pass B · normals + ambient occlusion ──────────────────────────────────
    const derivePass = Fn(() => {
      const { x, y, pc, z, n } = frame();

      const h = (ix: any, iy: any) => textureLoad(this.terrainTex, at(ix, iy)).x;
      const h0 = h(x, y);
      const dp = 2.0 / (size * DISC_FILL); // disc units per texel
      const hx = h(x.add(1), y).sub(h(x.sub(1), y)).div(2.0 * dp);
      const hy = h(x, y.add(1)).sub(h(x, y.sub(1))).div(2.0 * dp);

      // Height lives on the sphere but we differentiated it in disc coordinates,
      // so the partials have to go through the first fundamental form of the
      // orthographic map to become a real surface gradient. For N = (x, y, z):
      //     E = 1 + x²/z²,  F = xy/z²,  G = 1 + y²/z²,  EG - F² = 1/z²
      // which inverts in closed form — no finite differencing on the sphere and
      // no tangent basis needed.
      const zc = max(z, 0.06); // the metric is singular exactly at the limb
      const z2 = zc.mul(zc);
      const xx = pc.x;
      const yy = pc.y;
      const a = z2.add(yy.mul(yy)).mul(hx).sub(xx.mul(yy).mul(hy));
      const b = z2.add(xx.mul(xx)).mul(hy).sub(xx.mul(yy).mul(hx));
      const grad = vec3(a, b, a.mul(xx).add(b.mul(yy)).div(zc).negate());

      // Near the limb a single texel spans an enormous arc, so the gradient is
      // undersampled and would alias into a bright fringe. Fade it out.
      const limbFade = smoothstep(0.0, 0.22, z);
      const nrm = normalize(n.sub(grad.mul(U.bumpStrength.mul(limbFade))));

      // Ambient occlusion by horizon scan. Marched in disc space with the sphere's
      // own fall-off (arc²/2) subtracted, so only genuine relief occludes. The
      // foreshortening error near the limb is invisible in an AO term.
      const occl = float(0).toVar();
      for (let d = 0; d < AO_DIRS; d++) {
        const ang = (d / AO_DIRS) * Math.PI * 2.0;
        const dir = vec2(Math.cos(ang), Math.sin(ang));
        const horizon = float(0).toVar();
        for (let s = 1; s <= AO_STEPS; s++) {
          const arc = U.shadowReach.mul(s / AO_STEPS);
          const rise = loadHeight(pc.add(dir.mul(arc))).sub(h0).sub(arc.mul(arc).mul(0.5));
          const t = max(rise.div(arc), 0.0);
          horizon.assign(max(horizon, t.div(sqrt(t.mul(t).add(1.0)))));
        }
        occl.addAssign(horizon);
      }
      const ao = occl.div(AO_DIRS).mul(U.ao).oneMinus().clamp(0.0, 1.0);

      textureStore(this.deriveTex, ivec2(x, y), vec4(nrm, ao)).toWriteOnly();
    })().compute(size * size);

    // ── pass C · shade ────────────────────────────────────────────────────────
    const shadePass = Fn(() => {
      const { x, y, r, pc, z, n } = frame();

      const terrain = textureLoad(this.terrainTex, ivec2(x, y));
      const derived = textureLoad(this.deriveTex, ivec2(x, y));
      const h0 = terrain.x;
      const albedo = terrain.y;
      const nrm = derived.xyz;
      const ao = derived.w;

      const L = U.sunDir;
      const ndl = max(dot(nrm, L), 0.0);
      const ndlBase = dot(n, L);
      const ndv = max(z, 0.0);

      // Cast shadows. The disc coordinate *is* the sphere point's xy under an
      // orthographic view, so stepping the tangential light direction by arc
      // length `s` is exactly a disc step of Lt.xy * s — no reprojection. The
      // sphere curving away under the ray is the arc²/2 term.
      const tangent = normalize(L.sub(n.mul(ndlBase)));
      const tanElev = ndlBase.div(sqrt(max(ndlBase.mul(ndlBase).oneMinus(), 1e-4)));
      const shadow = float(1.0).toVar();
      for (let s = 1; s <= SHADOW_STEPS; s++) {
        const arc = U.shadowReach.mul(s / SHADOW_STEPS);
        const surfH = loadHeight(pc.add(tangent.xy.mul(arc))).sub(arc.mul(arc).mul(0.5));
        const rayH = h0.add(arc.mul(tanElev));
        shadow.assign(min(shadow, smoothstep(0.0, U.craterDepth.mul(0.3), rayH.sub(surfH))));
      }
      // Only meaningful where the sun is actually above the local horizon.
      const shadowTerm = mix(
        float(1.0), shadow,
        U.shadowStrength.mul(smoothstep(0.0, 0.18, ndlBase)),
      );

      // Lambert is wrong for the moon: a full moon is famously *flat*, not bright
      // in the middle and dark at the edges. Lommel-Seeliger backscattering gives
      // that — at zero phase ndl ≈ ndv, so the disc reads uniform.
      const lommel = ndl.div(ndl.add(ndv).add(1e-4)).mul(2.0);
      const shading = mix(ndl, lommel, U.backscatter).clamp(0.0, 2.0);

      const sunColor = vec3(1.0, 0.97, 0.92);
      const earthColor = vec3(0.35, 0.5, 0.9);
      const earthshine = shading.oneMinus().clamp(0.0, 1.0).mul(ndv).mul(U.earthshine);

      // `lightIntensity` scales only the direct term, so pushing it past 1 blows out
      // the lit side while leaving earthshine and ambient where they were.
      const direct = shading.mul(shadowTerm).mul(ao).mul(U.lightIntensity);
      const rim = rimTerm(z, smoothstep(0.0, 0.25, ndlBase), U);

      const surfaceColor = vec3(albedo)
        .mul(direct.add(U.ambient))
        .mul(sunColor)
        .add(vec3(albedo).mul(earthshine).mul(earthColor))
        .add(U.rimColor.mul(rim))
        .mul(U.exposure);

      // Antialiased limb, ~1.5 texels wide.
      const edge = (2.0 / (size * DISC_FILL)) * 1.5;
      const discAlpha = smoothstep(1.0, 1.0 - edge, r);
      const halo = haloTerm(r, pc, L, U).mul(U.exposure);

      // The disc stays opaque and the halo carries its own alpha into the margin, so
      // one quad gives both without needing an additive pass.
      const color = mix(U.glowColor.mul(halo), surfaceColor, discAlpha);
      const alpha = clamp(discAlpha.add(halo), 0.0, 1.0);

      textureStore(this.outputTex, ivec2(x, y), vec4(color, alpha)).toWriteOnly();
    })().compute(size * size);

    // ── cartoon · a single pass, sharing nothing with the three above ─────────
    // No height field, so no derive pass and no shade pass — the shapes are drawn
    // and coloured in one go.
    const cartoonPass = Fn(() => {
      const { x, y, p, r, pc, n } = frame();
      const sp = librate(n, U.tilt, U.rotation);
      const sunBody = librate(U.sunDir, U.tilt, U.rotation);
      // A fixed upper-left key. It never moves with the phase — it is what gives the
      // disc its ball gradient and keeps crater relief readable at every phase,
      // including full, where the sun offers no usable tangential direction.
      const artView = normalize(vec3(-0.48, 0.62, 0.62));
      const artBody = librate(artView, U.tilt, U.rotation);
      const drawn = cartoon(p, sp, n, sunBody, U.sunDir, artBody, artView, U);

      // The limb gets its own ink line so the disc reads as a drawn object rather
      // than as a shape that merely stops.
      const limb = smoothstep(0.93, 1.0, r);
      const surfaceColor = mix(drawn.xyz, U.mareColor.mul(0.22), limb.mul(U.cartoonOutline));

      const edge = (2.0 / (size * DISC_FILL)) * 1.5;
      // `drawn.w` is the phase crop, so on a cropped crescent the halo has to be
      // gated by it too — otherwise the glow keeps ringing the whole disc after the
      // dark side has been discarded.
      const discAlpha = smoothstep(1.0, 1.0 - edge, r).mul(drawn.w);
      const halo = haloTerm(r, pc, U.sunDir, U).mul(U.exposure).mul(drawn.w);

      const color = mix(U.glowColor.mul(halo), surfaceColor, discAlpha);
      const alpha = clamp(discAlpha.add(halo), 0.0, 1.0);
      textureStore(this.outputTex, ivec2(x, y), vec4(color, alpha)).toWriteOnly();
    })().compute(size * size);

    this.realisticPasses = [terrainPass, derivePass, shadePass];
    this.cartoonPasses = [cartoonPass];
  }

  // ── driving it ─────────────────────────────────────────────────────────────

  /**
   * Phase is the sun vector — the realistic pipeline has no crescent mask anywhere.
   * `phaseT` is the same phase as an illuminated fraction, which the cartoon
   * pipeline's drawn crescent needs since it works in disc space.
   */
  private setSun(params: MoonBakeParams): void {
    const angle = (params.phase - 0.5) * Math.PI * 2.0;
    this.U.sunDir.value
      .set(Math.sin(angle), params.sunTilt, Math.cos(angle))
      .normalize();
    this.U.phaseT.value = (1 - Math.cos(params.phase * Math.PI * 2)) * 0.5;
  }

  /** Push params into the uniform nodes. Cheap — no shader recompile. */
  sync(params: MoonBakeParams): void {
    for (const key of Object.keys(this.U)) {
      if (key === "sunDir") continue;
      const paramKey = key === "tilt" ? "bodyTilt" : key === "rotation" ? "bodyRotation" : key;
      const value = (params as any)[paramKey];
      if (typeof value === "number") this.U[key].value = value;
      else if (typeof value === "boolean") this.U[key].value = value ? 1 : 0;
      else if (typeof value === "string") this.U[key].value.set(value);
    }
    this.setSun(params);
  }

  /** Resolution is compile-time in the kernels, so it rebuilds them. */
  setResolution(size: number): void {
    if (size === this.size) return;
    this.dispose();
    this.size = size;
    this.build();
  }

  async bake(params: MoonBakeParams): Promise<number> {
    this.sync(params);
    const passes = params.style === "cartoon" ? this.cartoonPasses : this.realisticPasses;
    const start = performance.now();
    for (const pass of passes) {
      await this.renderer.computeAsync(pass);
    }
    return performance.now() - start;
  }

  dispose(): void {
    this.terrainTex?.dispose();
    this.deriveTex?.dispose();
    this.outputTex?.dispose();
    this.realisticPasses = [];
    this.cartoonPasses = [];
  }
}
