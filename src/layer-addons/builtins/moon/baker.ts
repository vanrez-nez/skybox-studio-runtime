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
//  pass A  terrain   craters + maria + regolith    → height, mottle, mare, bright
//  pass B  derive    height-field normals          → normal.xyz
//  pass C  shade     Hapke photometry + shadows    → the finished RGBA image
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { deriveMoonFrameLight } from "./light-source";
import type { MoonBakeParams } from "./params";
import { SUN_ANGULAR_RADIUS_RADIANS } from "./photometry";
import { surface, librate } from "./tsl/fields";
import { cartoon } from "./tsl/cartoon";
import {
  earthshineIrradiance,
  hapkeReflectance,
  lunarHapkeMaterial,
  normalizeLunarReflectance,
} from "./tsl/hapke";
import { DISC_FILL } from "./disc";

// See the note in tsl/fields.ts — TSL's exact node typings are more trouble than
// help for shader arithmetic.
const {
  Fn, instanceIndex, uniform, textureStore, textureLoad,
  int, float, vec2, vec3, vec4, ivec2,
  floor, sqrt, length, dot, min, max, mix, clamp, smoothstep, normalize, acos,
} = TSL as any;

const SHADOW_STEPS = 24;
const MAX_CRATER_EJECTA_DIAMETER = 0.76 * 2.6;
const SOLAR_PENUMBRA_SLOPE = Math.tan(SUN_ANGULAR_RADIUS_RADIANS);

type Uniforms = Record<string, any>;

export class MoonBaker {
  private renderer: THREE.WebGPURenderer;
  private size: number;

  /** R = height, G = reflectance mottle, B = mare mask, A = fresh-ray mask */
  terrainTex!: THREE.StorageTexture;
  /** RGB = height-field normal. */
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
      mariaDepth: uniform(params.mariaDepth),
      regolith: uniform(params.regolith),
      rays: uniform(params.rays),
      tilt: uniform(params.bodyTilt),
      rotation: uniform(params.bodyRotation),
      exposure: uniform(params.exposure),
      shadowSoftness: uniform(params.shadowSoftness),
      sunDir: uniform(new THREE.Vector3(0, 0, 1)),
      // Illuminated fraction, 0 at new and 1 at full. Only the drawn crescent uses
      // it — the real terminator falls out of sunDir on its own.
      phaseT: uniform(1),

      cartoonLightIntensity: uniform(params.cartoonLightIntensity),
      cartoonFill: uniform(params.cartoonFill),
      cartoonNightStrength: uniform(params.cartoonNightStrength),
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

    // ── pass B · height-field normals ─────────────────────────────────────────
    const derivePass = Fn(() => {
      const { x, y, pc, z, n } = frame();

      const h = (ix: any, iy: any) => textureLoad(this.terrainTex, at(ix, iy)).x;
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
      const nrm = normalize(n.sub(grad.mul(limbFade)));

      textureStore(this.deriveTex, ivec2(x, y), vec4(nrm, 1.0)).toWriteOnly();
    })().compute(size * size);

    // ── pass C · shade ────────────────────────────────────────────────────────
    const shadePass = Fn(() => {
      const { x, y, r, pc, n } = frame();

      const terrain = textureLoad(this.terrainTex, ivec2(x, y));
      const derived = textureLoad(this.deriveTex, ivec2(x, y));
      const h0 = terrain.x;
      const mottle = terrain.y;
      const mare = terrain.z;
      const brightRays = terrain.w.mul(U.rays);
      const nrm = derived.xyz;

      const L = U.sunDir;
      const V = vec3(0.0, 0.0, 1.0);
      const ndl = dot(nrm, L);
      const ndlBase = dot(n, L);
      const ndv = dot(nrm, V);
      const phaseCosine = clamp(dot(L, V), -1.0, 1.0);
      const phaseAngle = acos(phaseCosine);
      const material = lunarHapkeMaterial(mare, mottle, brightRays);

      // Cast shadows. The disc coordinate *is* the sphere point's xy under an
      // orthographic view, so stepping the tangential light direction by arc
      // length `s` is exactly a disc step of Lt.xy * s — no reprojection. The
      // sphere curving away under the ray is the arc²/2 term.
      const tangent = normalize(L.sub(n.mul(ndlBase)).add(vec3(1e-6, 0.0, 0.0)));
      const tanElev = ndlBase.div(sqrt(max(ndlBase.mul(ndlBase).oneMinus(), 1e-4)));
      const shadowReach = clamp(
        float(MAX_CRATER_EJECTA_DIAMETER).div(max(U.craterFreq, 0.1)),
        0.11,
        0.4,
      );
      // Terminator softness: three exact identities at softness = 0
      // (x·1, x + 0·y, mix(x, y, 0)), so the default bake is bit-identical.
      // The penumbra widens as if the sun grew, the Hapke incidence cosine
      // lifts toward its smooth-max so light decays past the terminator
      // (see softTerminatorMu0 in photometry.ts, the CPU twin), and the
      // cast-shadow march relaxes on the night side so it cannot multiply
      // the lifted light back to zero.
      const soft = U.shadowSoftness;
      const penumbraScale = soft.mul(60.0).add(1.0);
      const shadow = float(1.0).toVar();
      for (let s = 1; s <= SHADOW_STEPS; s++) {
        const arc = shadowReach.mul(s / SHADOW_STEPS);
        const surfH = loadHeight(pc.add(tangent.xy.mul(arc))).sub(arc.mul(arc).mul(0.5));
        const rayH = h0.add(arc.mul(tanElev));
        const halfPenumbra = max(arc.mul(SOLAR_PENUMBRA_SLOPE).mul(penumbraScale), 1e-5);
        shadow.assign(min(
          shadow,
          smoothstep(halfPenumbra.negate(), halfPenumbra, rayH.sub(surfH)),
        ));
      }

      const softWidth = soft.mul(0.4);
      const smoothMax = ndl.add(sqrt(ndl.mul(ndl).add(softWidth.mul(softWidth)))).mul(0.5);
      const liftedNdl = ndl.add(soft.mul(max(smoothMax.sub(ndl), 0.0)));
      const nightRelax = soft.mul(
        smoothstep(float(-0.25), float(0.15), ndlBase).oneMinus(),
      );
      const shadowSoft = mix(shadow, float(1.0), nightRelax);

      const direct = hapkeReflectance({
        cosPhase: phaseCosine,
        material,
        mu: ndv,
        mu0: liftedNdl,
      }).mul(shadowSoft);
      const earthshine = hapkeReflectance({
        cosPhase: 1.0,
        material,
        mu: ndv,
        mu0: ndv,
      }).mul(earthshineIrradiance(phaseAngle));
      const surfaceLuminance = normalizeLunarReflectance(direct.add(earthshine))
        .mul(U.exposure);
      const surfaceColor = vec3(surfaceLuminance);

      // Antialiased limb, ~1.5 texels wide.
      const edge = (2.0 / (size * DISC_FILL)) * 1.5;
      const discAlpha = smoothstep(1.0, 1.0 - edge, r);

      textureStore(
        this.outputTex,
        ivec2(x, y),
        // The layer compositor expects straight alpha and applies sourceAlpha
        // itself. Keep the edge colour unassociated so AA is not multiplied twice.
        vec4(surfaceColor, discAlpha),
      ).toWriteOnly();
    })().compute(size * size);

    // ── cartoon · a single pass, sharing nothing with the three above ─────────
    // No height field, so no derive pass and no shade pass — the shapes are drawn
    // and coloured in one go.
    const cartoonPass = Fn(() => {
      const { x, y, p, r, n } = frame();
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
      const discAlpha = smoothstep(1.0, 1.0 - edge, r).mul(drawn.w);

      textureStore(
        this.outputTex,
        ivec2(x, y),
        vec4(surfaceColor, discAlpha),
      ).toWriteOnly();
    })().compute(size * size);

    this.realisticPasses = [terrainPass, derivePass, shadePass];
    this.cartoonPasses = [cartoonPass];
  }

  // ── driving it ─────────────────────────────────────────────────────────────

  /**
   * Phase is the sun vector — the realistic pipeline has no crescent mask anywhere.
   * `phaseT` is the same phase as an illuminated fraction, which the cartoon
   * pipeline's drawn crescent needs since it works in disc space.
   *
   * With dynamic lighting (a linked light layer) the sun vector comes from
   * the actual geometry between the two layers instead of the phase slider —
   * a moon transiting its light source shows its night side automatically.
   */
  private setSun(params: MoonBakeParams): void {
    const derived = deriveMoonFrameLight(params);

    if (derived) {
      this.U.sunDir.value.set(derived[0], derived[1], derived[2]);
      this.U.phaseT.value = (1 + derived[2]) * 0.5;
      return;
    }

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
