import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
  Fn,
  If,
  Loop,
  PI,
  acos,
  atan,
  attribute,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp as nodeClamp,
  cos,
  dot,
  exp,
  float,
  floor,
  int,
  length,
  max,
  min,
  mix,
  modelViewProjection,
  modelWorldMatrix,
  mod,
  mx_fractal_noise_float,
  normalize,
  positionGeometry,
  pow,
  screenSize,
  screenUV,
  select,
  sin,
  smoothstep,
  step,
  texture,
  uniform,
  uniformArray,
  uniformTexture,
  uv,
  varyingProperty,
  vec2,
  vec3,
  vec4,
} from "three/tsl";

import type {
  SkyboxFieldGradientParams,
  SkyboxStarfieldParams,
} from "../manifest";
import {
  createStarCatalogForCoverage,
  createStarCatalogForDescriptor,
  createStarfieldPatchLayout,
  createStarfieldBakeCacheKey,
  getStarfieldQualityPreset,
  normalizeStarfieldCoverage,
  normalizeStarfieldParams,
  starfieldClipContainsDirection,
  starfieldFieldGradientToSourceField,
  STARFIELD_PREVIEW_BAKE_WIDTH,
  type StarfieldBakeData,
  type StarfieldPatchDescriptor,
} from "../starfield-static";

const TWO_PI = Math.PI * 2;
const MAX_ANCHORS = 8;
// Stars are sized at a FIXED angular size anchored to this reference height, so a star covers the
// same fraction of the sphere at every export/preview resolution (a higher-res bake just samples
// that same angular size at more texels). Anchored to the editor preview height so the editor and
// every export match. Only AA/sub-pixel thresholds scale with the actual output resolution.
const REFERENCE_BAKE_HEIGHT = STARFIELD_PREVIEW_BAKE_WIDTH / 2;
const MIN_CORE_PIXELS = 1.75;
const MIN_GLARE_PIXELS = 3.25;
const SUBPIXEL_DENSITY_THRESHOLD_PX = 1;
const AA_PIN_THRESHOLD_PX = 1.5;
const GAUSSIAN_CUTOFF_SIGMA = 8;
const STAR_SIZE_MIN_SCALE = 0.1;
const STAR_SIZE_RARITY_EXPONENT = 5;
const STAR_SIZE_GATE_EXPONENT = 12;
const STAR_SIZE_BRIGHTNESS_LINK = 0.35;
const STAR_SIZE_GLARE_LINK = 0.25;
const LIVE_SKYDOME_RADIUS = 1.0005;
const LIVE_SKYDOME_SEGMENTS = 32;

type StarfieldGpuRenderer = {
  autoClear: boolean;
  clear: () => void;
  getClearAlpha: () => number;
  getClearColor: (target: THREE.Color) => THREE.Color;
  getRenderTarget: () => THREE.RenderTarget | null;
  readRenderTargetPixels?: (
    renderTarget: THREE.RenderTarget,
    x: number,
    y: number,
    width: number,
    height: number,
    buffer: Uint8Array
  ) => void;
  readRenderTargetPixelsAsync?: (
    renderTarget: THREE.RenderTarget,
    x: number,
    y: number,
    width: number,
    height: number
  ) => Promise<ArrayBufferView>;
  render: (scene: THREE.Scene, camera: THREE.Camera) => void;
  setClearColor: (color: THREE.ColorRepresentation, alpha?: number) => void;
  setRenderTarget: (target: THREE.RenderTarget | null) => void;
};

type StarfieldUniformMap = Record<string, any>;

// Viewport the baked starfield will be VIEWED through. When provided, stars are sized to a fixed
// logical-pixel size: displayPixelAngle = verticalFovRadians / renderHeight makes the on-screen
// size cancel out to `uStarSize · scale` logical px regardless of FOV/resolution (point-source
// glint behavior). `renderHeight` is logical/CSS pixels, not the device drawing-buffer height.
export type StarGlintViewport = {
  renderHeight: number;
  verticalFovRadians: number;
};

// displayPixelAngle (rad/star-size-unit) + screenPixelScale (AA threshold scale, in screen px)
// for a given viewport and equirect output height. With a viewport, on-screen radius already
// equals `uStarSize · scale` logical px, so screenPixelScale is 1 (AA thresholds become true
// logical-pixel thresholds). Without one, fall back to the legacy fixed-angular behavior.
export function starGlintScalesFor(
  viewport: StarGlintViewport | null | undefined,
  outputHeight: number
) {
  if (viewport && viewport.renderHeight > 0 && viewport.verticalFovRadians > 0) {
    // Exact angle subtended by one screen pixel at the center of a rectilinear (perspective)
    // projection: a ray at angle a lands at r = f·tan(a) with f = (H/2)/tan(vFov/2), so the
    // center pixel-angle is 1/f = 2·tan(vFov/2)/H — NOT the small-angle approximation vFov/H
    // (which under-sizes stars by ~6% at 50°, ~15% at 70°, ~27% at 90°). With this, a star's
    // on-screen center radius is exactly uStarSize·scale px, so screenPixelScale stays 1.
    return {
      displayPixelAngle: (2 * Math.tan(viewport.verticalFovRadians / 2)) / viewport.renderHeight,
      screenPixelScale: 1,
    };
  }

  return {
    displayPixelAngle: Math.PI / REFERENCE_BAKE_HEIGHT,
    screenPixelScale: outputHeight / REFERENCE_BAKE_HEIGHT,
  };
}

type GpuBakeEntry = {
  key: string;
  target: THREE.RenderTarget;
  texture: THREE.Texture;
};
export type StarfieldGpuPatchTexture = {
  descriptor: StarfieldPatchDescriptor;
  nebulaTexture: THREE.Texture;
  starTexture: THREE.Texture;
};
export type StarfieldGpuPatchTextureSet = {
  key: string;
  patches: StarfieldGpuPatchTexture[];
};
type GpuPatchBakeEntry = StarfieldGpuPatchTextureSet & {
  targets: THREE.RenderTarget[];
};

const EMPTY_STAR_POSITIONS = new Float32Array([
  -1, -1, 0,
  1, -1, 0,
  -1, 1, 0,
  1, -1, 0,
  1, 1, 0,
  -1, 1, 0,
]);

function hasRenderTargetApi(renderer: unknown): renderer is StarfieldGpuRenderer {
  const value = renderer as Partial<StarfieldGpuRenderer> | null;

  return Boolean(
    value &&
      typeof value.render === "function" &&
      typeof value.setRenderTarget === "function" &&
      typeof value.getRenderTarget === "function"
  );
}

function rendererMaxTextureSize(renderer: StarfieldGpuRenderer) {
  const backend = (renderer as unknown as { backend?: Record<string, unknown> }).backend;
  const device = backend?.device as { limits?: { maxTextureDimension2D?: number } } | undefined;
  const gl = backend?.gl as WebGL2RenderingContext | undefined;

  if (typeof device?.limits?.maxTextureDimension2D === "number") {
    return device.limits.maxTextureDimension2D;
  }

  if (gl) {
    return Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
  }

  return STARFIELD_PREVIEW_BAKE_WIDTH;
}

function numberUniform(uniforms: StarfieldUniformMap, key: string) {
  const existing = uniforms[key] as { value?: unknown; isUniformNode?: boolean } | undefined;

  if (existing?.isUniformNode) {
    return existing;
  }

  const node = uniform(Number(existing?.value ?? 0));
  uniforms[key] = node;

  return node as any;
}

function vec2Uniform(uniforms: StarfieldUniformMap, key: string) {
  const existing = uniforms[key] as { value?: unknown; isUniformNode?: boolean } | undefined;
  const value = existing?.value instanceof THREE.Vector2 ? existing.value.clone() : new THREE.Vector2();

  if (existing?.isUniformNode) {
    return existing;
  }

  const node = uniform(value);
  uniforms[key] = node;

  return node as any;
}

function vec3Uniform(uniforms: StarfieldUniformMap, key: string) {
  const existing = uniforms[key] as { value?: unknown; isUniformNode?: boolean } | undefined;
  const value = existing?.value instanceof THREE.Vector3 ? existing.value.clone() : new THREE.Vector3();

  if (existing?.isUniformNode) {
    return existing;
  }

  const node = uniform(value);
  uniforms[key] = node;

  return node as any;
}

function equirectDirectionNode(rawUv: any): any {
  const theta = rawUv.x.sub(0.5).mul(PI).mul(2.0);
  const phi = rawUv.y.mul(PI);
  const sinPhi = sin(phi);

  return normalize(vec3(sinPhi.mul(sin(theta)), cos(phi), sinPhi.mul(cos(theta))));
}

function foldEquirectUvNode(rawUv: any): any {
  const v = mod(rawUv.y, 2.0);
  const folded = step(1.0, v);

  return vec2(rawUv.x.add(folded.mul(0.5)), mix(v, float(2.0).sub(v), folded));
}

function foldedEquirectDirectionNode(rawUv: any): any {
  return equirectDirectionNode(foldEquirectUvNode(rawUv));
}

function directionToSourceStarfieldUvNode(direction: any): any {
  const normalizedDirection = normalize(direction) as any;

  return vec2(
    (atan as any)(normalizedDirection.x, normalizedDirection.z).div(PI.mul(2.0)).add(0.5),
    acos(nodeClamp(normalizedDirection.y, -1.0, 1.0)).div(PI)
  );
}

function angularPixelNode(textureSize: any, tileUvSize: any): any {
  return PI.mul(max(tileUvSize.y, 1e-6)).div(max(textureSize.y, 1.0));
}

function intervalErrorNode(value: any, intervalSize: any): any {
  return max(max(value.negate(), value.sub(intervalSize)), 0.0);
}

function wrappedIntervalOffsetNode(skyU: any, intervalMinU: any, intervalSizeU: any): any {
  const d0 = skyU.sub(intervalMinU);
  const d1 = d0.add(1.0);
  const d2 = d0.sub(1.0);
  const e0 = intervalErrorNode(d0, intervalSizeU);
  const e1 = intervalErrorNode(d1, intervalSizeU);
  const e2 = intervalErrorNode(d2, intervalSizeU);

  return (select as any)(
    e1.lessThan(e0).and(e1.lessThanEqual(e2)),
    d1,
    (select as any)(e2.lessThan(e0).and(e2.lessThan(e1)), d2, d0)
  );
}

function storageLocalUvNode(skyUv: any, storageMin: any, storageSize: any): any {
  return vec2(
    wrappedIntervalOffsetNode(skyUv.x, storageMin.x, storageSize.x).div(storageSize.x),
    skyUv.y.sub(storageMin.y).div(storageSize.y)
  );
}

function uvInside01MaskNode(localUv: any): any {
  return step(0.0, localUv.x)
    .mul(step(localUv.x, 1.0))
    .mul(step(0.0, localUv.y))
    .mul(step(localUv.y, 1.0));
}

function starColorNode(t: any): any {
  const cool = vec3(1.0, 0.55, 0.3);
  const mid = vec3(1.0, 0.96, 0.92);
  const hot = vec3(0.7, 0.8, 1.0);

  return (select as any)(
    t.lessThan(0.5),
    mix(cool, mid, t.mul(2.0)),
    mix(mid, hot, t.sub(0.5).mul(2.0))
  );
}

function sizeRankNode(rSize: any, rSizeGate: any, largeStarRarity: any): any {
  const baseRank = pow(nodeClamp(rSize, 0.0, 1.0), STAR_SIZE_RARITY_EXPONENT);
  const gate = mix(1.0, pow(nodeClamp(rSizeGate, 0.0, 1.0), STAR_SIZE_GATE_EXPONENT), largeStarRarity);

  return baseRank.mul(gate);
}

function sizeMultiplierNode(rSize: any, rSizeGate: any, largeStarRarity: any, sizeVar: any): any {
  return mix(1.0, mix(STAR_SIZE_MIN_SCALE, 1.0, sizeRankNode(rSize, rSizeGate, largeStarRarity)), sizeVar);
}

function fbm01Node(pointInput: any, octavesInput: any, lacunarityInput: any, gainInput: any): any {
  const octaves = nodeClamp(octavesInput, 1.0, 8.0);
  const lacunarity = max(lacunarityInput, 0.001);
  const gain = nodeClamp(gainInput, 0.001, 0.999);
  const point = vec3(pointInput).toVar();
  const amplitude = float(0.5).toVar();
  const sum = float(0.0).toVar();
  const norm = float(0.0).toVar();

  Loop(8, ({ i }: any) => {
    If(float(i).lessThan(octaves), () => {
      const octaveNoise = mx_fractal_noise_float(point, int(1), lacunarity, gain).mul(0.5).add(0.5);

      sum.addAssign(amplitude.mul(octaveNoise));
      norm.addAssign(amplitude);
      point.mulAssign(lacunarity);
      amplitude.mulAssign(gain);
    });
  });

  return sum.div(max(norm, 0.0001));
}

function createNebulaMaterial(params: SkyboxStarfieldParams, descriptor: StarfieldPatchDescriptor) {
  const field = starfieldFieldGradientToSourceField(params.nebulaField);
  const anchorDirs = Array.from({ length: MAX_ANCHORS }, (_, index) => {
    const anchor = field.anchors[index];

    return new THREE.Vector3(...(anchor?.dir ?? [0, 1, 0]));
  });
  const anchorColors = Array.from({ length: MAX_ANCHORS }, (_, index) => {
    const anchor = field.anchors[index];

    return new THREE.Vector3(...(anchor?.color ?? [0, 0, 0]));
  });
  const nebula = params.nebula;
  const uniforms: StarfieldUniformMap = {
    uAnchorCount: { value: Math.min(field.anchors.length, MAX_ANCHORS) },
    uBaseScale: { value: nebula.uBaseScale },
    uBlend: { value: field.blend === "gaussian" ? 1 : 0 },
    uCloudCore: { value: new THREE.Vector3(...nebula.uCloudCore) },
    uCloudHighlight: { value: new THREE.Vector3(...nebula.uCloudHighlight) },
    uCloudShadow: { value: new THREE.Vector3(...nebula.uCloudShadow) },
    uColorWarpAmp: { value: nebula.uColorWarpAmp },
    uColorWarpFreq: { value: nebula.uColorWarpFreq },
    uContrast: { value: nebula.uContrast },
    uCoverage: { value: nebula.uCoverage },
    uDensity: { value: nebula.uDensity },
    uLightFocus: { value: nebula.uLightFocus },
    uLightIntensity: { value: nebula.uLightIntensity },
    uLightLining: { value: nebula.uLightLining },
    uNebulaExposure: { value: nebula.uNebulaExposure },
    uNebulaStrength: { value: nebula.uNebulaStrength },
    uOctaves: { value: nebula.uOctaves },
    uOpacity: { value: nebula.uOpacity },
    uPower: { value: field.power },
    uSeed: { value: nebula.uSeed },
    uSigma: { value: field.sigma },
    uSoftness: { value: nebula.uSoftness },
    uTileUvMin: { value: new THREE.Vector2(descriptor.storageUvMin.x, descriptor.storageUvMin.y) },
    uTileUvSize: { value: new THREE.Vector2(descriptor.storageUvSize.x, descriptor.storageUvSize.y) },
  };
  const uTileUvMin = vec2Uniform(uniforms, "uTileUvMin");
  const uTileUvSize = vec2Uniform(uniforms, "uTileUvSize");
  const uAnchorCount = numberUniform(uniforms, "uAnchorCount");
  const uBlend = numberUniform(uniforms, "uBlend");
  const uPower = numberUniform(uniforms, "uPower");
  const uSigma = numberUniform(uniforms, "uSigma");
  const uColorWarpAmp = numberUniform(uniforms, "uColorWarpAmp");
  const uColorWarpFreq = numberUniform(uniforms, "uColorWarpFreq");
  const uSeed = numberUniform(uniforms, "uSeed");
  const uCoverage = numberUniform(uniforms, "uCoverage");
  const uDensity = numberUniform(uniforms, "uDensity");
  const uSoftness = numberUniform(uniforms, "uSoftness");
  const uContrast = numberUniform(uniforms, "uContrast");
  const uBaseScale = numberUniform(uniforms, "uBaseScale");
  const uOctaves = numberUniform(uniforms, "uOctaves");
  const uOpacity = numberUniform(uniforms, "uOpacity");
  const uLightFocus = numberUniform(uniforms, "uLightFocus");
  const uLightLining = numberUniform(uniforms, "uLightLining");
  const uLightIntensity = numberUniform(uniforms, "uLightIntensity");
  const uNebulaExposure = numberUniform(uniforms, "uNebulaExposure");
  const uNebulaStrength = numberUniform(uniforms, "uNebulaStrength");
  const uCloudShadow = vec3Uniform(uniforms, "uCloudShadow");
  const uCloudHighlight = vec3Uniform(uniforms, "uCloudHighlight");
  const uCloudCore = vec3Uniform(uniforms, "uCloudCore");
  const uniformAnchorDirs = uniformArray(anchorDirs, "vec3") as any;
  const uniformAnchorColors = uniformArray(anchorColors, "vec3") as any;
  const material = new MeshBasicNodeMaterial({
    depthTest: false,
    depthWrite: false,
  }) as any;

  material.uniforms = uniforms;
  material.colorNode = Fn(() => {
    const fullscreenUv = positionGeometry.xy.mul(0.5).add(0.5);
    const skyUv = uTileUvMin.add(fullscreenUv.mul(uTileUvSize));
    const direction = foldedEquirectDirectionNode(skyUv);
    const octaves = nodeClamp(uOctaves, 1.0, 8.0);
    const warpPoint = direction
      .mul(max(uColorWarpFreq, 0.001))
      .add(vec3(uSeed, uSeed.mul(0.37), uSeed.mul(-0.21)));
    const warpVector = vec3(
      fbm01Node(warpPoint, octaves, 2.02, 0.52),
      fbm01Node(warpPoint.add(vec3(5.2, 1.3, 7.1)), octaves, 2.03, 0.5),
      fbm01Node(warpPoint.add(vec3(9.1, 8.4, 2.8)), octaves, 2.01, 0.51)
    ).mul(2.0).sub(1.0);
    const warpedDirection = normalize(direction.add(warpVector.mul(max(uColorWarpAmp, 0.0))));
    const lightField = vec3(0.0).toVar();
    const weightSum = float(0.0).toVar();

    Loop(MAX_ANCHORS, ({ i }: any) => {
      If(float(i).lessThan(uAnchorCount), () => {
        const anchorDirection = normalize(uniformAnchorDirs.element(i));
        const anchorColor = uniformAnchorColors.element(i);
        const distance = float(1.0).sub(dot(warpedDirection, anchorDirection));
        const idwWeight = float(1.0).div(pow(distance.add(0.0001), max(uPower, 0.0001)));
        const gaussianWeight = exp(distance.mul(distance).negate().div((max as any)(0.0001, float(2.0).mul(uSigma).mul(uSigma))));
        const weight = (select as any)(uBlend.lessThan(0.5), idwWeight, gaussianWeight);

        lightField.addAssign(anchorColor.mul(weight));
        weightSum.addAssign(weight);
      });
    });
    lightField.assign(lightField.div(max(weightSum, 0.0001)));

    const seedOffset = vec3(uSeed.mul(13.17), uSeed.mul(-7.31), uSeed.mul(5.19));
    const point = direction.mul(max(uBaseScale, 0.001)).add(seedOffset);
    const noiseVector = vec3(
      fbm01Node(point, octaves, 2.02, 0.5),
      fbm01Node(point.add(vec3(5.2, 1.3, 2.8)), octaves, 2.02, 0.5),
      fbm01Node(point.add(vec3(2.1, 4.7, 9.2)), octaves, 2.02, 0.5)
    );
    const cloudNoise = nodeClamp(fbm01Node(point.add(noiseVector.mul(3.0)), octaves, 2.02, 0.5), 0.0, 1.0);
    const density = pow(
      nodeClamp(smoothstep(uCoverage, uCoverage.add(max(uSoftness, 0.001)), cloudNoise), 0.0, 1.0),
      max(uContrast, 0.05)
    );
    const lightMask = nodeClamp(max(max(lightField.r, lightField.g), lightField.b).mul(max(uLightIntensity, 0.0)), 0.0, 1.0);
    const lit = pow(lightMask, max(uLightFocus, 0.001));
    const highlight = lightField.mul(uCloudHighlight).mul(max(uLightIntensity, 0.0));
    const cloudColor = mix(mix(uCloudShadow, highlight, lit), uCloudCore, nodeClamp(density.mul(0.4), 0.0, 1.0))
      .add(lightField.mul(lit).mul(density.oneMinus()).mul(max(uLightLining, 0.0)).mul(max(uLightIntensity, 0.0)))
      .mul(max(uDensity, 0.0));
    const nebulaRgb = (pow as any)((max as any)(cloudColor, vec3(0.0)), vec3(0.92));
    const alpha = nodeClamp(density.mul(uOpacity), 0.0, 1.0);
    const baseLinear = vec3(0.004, 0.005, 0.011);

    return vec4((max as any)(baseLinear.add(nebulaRgb.mul(alpha).mul(max(uNebulaStrength, 0.0))), vec3(0.0)), 1.0);
  })();

  return material as THREE.Material;
}

function createStarGeometry(params: SkyboxStarfieldParams, descriptor: StarfieldPatchDescriptor, height: number) {
  const stars = createStarCatalogForDescriptor(params.stars, descriptor, height, {
    includeSeamCopies: true,
  });
  const directions: number[] = [];
  const uvs: number[] = [];
  const randoms: number[] = [];
  const sizeGates: number[] = [];
  const classes: number[] = [];

  stars.forEach((star) => {
    directions.push(star.x, star.y, star.z);
    uvs.push(star.u, star.v);
    randoms.push(star.rSize, star.rBright, star.rGlare, star.rColor);
    sizeGates.push(star.rSizeGate);
    classes.push(star.classId);
  });

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(EMPTY_STAR_POSITIONS, 3));
  geometry.setAttribute("iDirection", new THREE.InstancedBufferAttribute(new Float32Array(directions), 3));
  geometry.setAttribute("iUv", new THREE.InstancedBufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute("iRandoms", new THREE.InstancedBufferAttribute(new Float32Array(randoms), 4));
  geometry.setAttribute("iSizeGate", new THREE.InstancedBufferAttribute(new Float32Array(sizeGates), 1));
  geometry.setAttribute("iClass", new THREE.InstancedBufferAttribute(new Float32Array(classes), 1));
  geometry.instanceCount = classes.length;

  return geometry;
}

function createStarMaterial(
  params: SkyboxStarfieldParams,
  descriptor: StarfieldPatchDescriptor,
  options: {
    bakeHeight?: number;
    bakeWidth?: number;
    displayPixelAngle?: number;
    screenPixelScale?: number;
  } = {}
) {
  const stars = params.stars;
  const bakeWidth = options.bakeWidth ?? descriptor.storageSize.width;
  const bakeHeight = options.bakeHeight ?? descriptor.storageSize.height;
  const uniforms: StarfieldUniformMap = {
    uBakeSize: { value: new THREE.Vector2(bakeWidth, bakeHeight) },
    uBright: { value: stars.uBright },
    uBrightVar: { value: stars.uBrightVar },
    uColorVar: { value: stars.uColorVar },
    uGlareSize: { value: stars.uGlareSize },
    uGlareStr: { value: stars.uGlareStr },
    uGlareVar: { value: stars.uGlareVar },
    uLargeStarRarity: { value: stars.uLargeStarRarity },
    uOutputSize: { value: new THREE.Vector2(descriptor.storageSize.width, descriptor.storageSize.height) },
    uDisplayPixelAngle: { value: options.displayPixelAngle ?? Math.PI / REFERENCE_BAKE_HEIGHT },
    uScreenPixelScale: { value: options.screenPixelScale ?? 1 },
    uSizeVar: { value: stars.uSizeVar },
    uStarSize: { value: stars.uStarSize },
    uTileUvMin: { value: new THREE.Vector2(descriptor.storageUvMin.x, descriptor.storageUvMin.y) },
    uTileUvSize: { value: new THREE.Vector2(descriptor.storageUvSize.x, descriptor.storageUvSize.y) },
  };
  const uBakeSize = vec2Uniform(uniforms, "uBakeSize");
  const uTileUvMin = vec2Uniform(uniforms, "uTileUvMin");
  const uTileUvSize = vec2Uniform(uniforms, "uTileUvSize");
  const uDisplayPixelAngle = numberUniform(uniforms, "uDisplayPixelAngle");
  const uScreenPixelScale = numberUniform(uniforms, "uScreenPixelScale");
  const uStarSize = numberUniform(uniforms, "uStarSize");
  const uSizeVar = numberUniform(uniforms, "uSizeVar");
  const uLargeStarRarity = numberUniform(uniforms, "uLargeStarRarity");
  const uBright = numberUniform(uniforms, "uBright");
  const uBrightVar = numberUniform(uniforms, "uBrightVar");
  const uGlareSize = numberUniform(uniforms, "uGlareSize");
  const uGlareStr = numberUniform(uniforms, "uGlareStr");
  const uGlareVar = numberUniform(uniforms, "uGlareVar");
  const uColorVar = numberUniform(uniforms, "uColorVar");
  const vUv = varyingProperty("vec2", "vStarBakeUv") as any;
  const vDirection = varyingProperty("vec3", "vStarBakeDirection") as any;
  const vRandoms = varyingProperty("vec4", "vStarBakeRandoms") as any;
  const vSizeGate = varyingProperty("float", "vStarBakeSizeGate") as any;
  const material = new MeshBasicNodeMaterial({
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  }) as any;

  material.uniforms = uniforms;
  material.vertexNode = Fn(() => {
    const iDirection = attribute("iDirection", "vec3") as any;
    const iUv = attribute("iUv", "vec2") as any;
    const iRandoms = attribute("iRandoms", "vec4") as any;
    const iSizeGate = attribute("iSizeGate", "float") as any;
    const bakeTexelAngle = angularPixelNode(uBakeSize, uTileUvSize);
    const scale = sizeMultiplierNode(iRandoms.x, iSizeGate, uLargeStarRarity, uSizeVar);
    const starRadius = uStarSize.mul(scale).mul(uDisplayPixelAngle);
    const screenRadiusPx = uStarSize.mul(scale).mul(uScreenPixelScale);
    const pinWeight = smoothstep(SUBPIXEL_DENSITY_THRESHOLD_PX, AA_PIN_THRESHOLD_PX, screenRadiusPx).oneMinus();
    const normalCoreFloor = float(MIN_CORE_PIXELS).mul(uDisplayPixelAngle);
    const pinCoreFloor = uDisplayPixelAngle.mul(0.5);
    const coreSupportRadius = max(starRadius, mix(normalCoreFloor, pinCoreFloor, pinWeight));
    const coreSigma = max(coreSupportRadius.mul(0.45), uDisplayPixelAngle.mul(0.5));
    const glareRadius = uGlareSize.mul(mix(1.0, scale, uSizeVar)).mul(uDisplayPixelAngle);
    const glareSupportEdge = max(starRadius.add(glareRadius), float(MIN_GLARE_PIXELS).mul(uDisplayPixelAngle));
    // Size the support quad from the FULL glare sigma. The fragment renders the glare at this same
    // (full) sigma and only scales its *amplitude* by normalWeight — so multiplying the support
    // sigma by normalWeight here shrank the quad to ~2σ while the glare still extended to ~4σ,
    // hard-clipping bright mid-size stars into squares. Keep the step() gates so the quad collapses
    // only when glare is fully off.
    const glareSigma = max(glareSupportEdge.mul(0.36), uDisplayPixelAngle.mul(0.5))
      .mul(step(0.000001, uGlareSize))
      .mul(step(0.000001, uGlareStr));
    const supportSigma = (max as any)(coreSigma, glareSigma);
    const supportAngle = (max as any)(supportSigma, bakeTexelAngle).mul(GAUSSIAN_CUTOFF_SIGMA);
    const sinPhi = max(sin(iUv.y.mul(PI)), 0.015);
    const halfUv = vec2(
      min(1.5, supportAngle.div(PI.mul(2.0).mul(sinPhi))),
      supportAngle.div(PI)
    );
    const splatUv = iUv.add(positionGeometry.xy.mul(halfUv));
    const patchUv = splatUv.sub(uTileUvMin).div(uTileUvSize);

    vUv.assign(splatUv);
    vDirection.assign(iDirection);
    vRandoms.assign(iRandoms);
    vSizeGate.assign(iSizeGate);

    return vec4(patchUv.mul(2.0).sub(1.0), 0.0, 1.0);
  })();
  material.colorNode = Fn(() => {
    const direction = foldedEquirectDirectionNode(vUv);
    const angularDistance = acos(nodeClamp(dot(direction, normalize(vDirection) as any), -1.0, 1.0));
    const rank = sizeRankNode(vRandoms.x, vSizeGate, uLargeStarRarity);
    const scale = sizeMultiplierNode(vRandoms.x, vSizeGate, uLargeStarRarity, uSizeVar);
    const starRadius = uStarSize.mul(scale).mul(uDisplayPixelAngle);
    const screenRadiusPx = uStarSize.mul(scale).mul(uScreenPixelScale);
    const subpixelWeight = smoothstep(SUBPIXEL_DENSITY_THRESHOLD_PX * 0.75, SUBPIXEL_DENSITY_THRESHOLD_PX, screenRadiusPx).oneMinus();
    const normalWeight = smoothstep(AA_PIN_THRESHOLD_PX, AA_PIN_THRESHOLD_PX + 0.25, screenRadiusPx);
    const coreRadius = max(starRadius, uDisplayPixelAngle.mul(0.1));
    const densityEnergy = max(0.08, smoothstep(0.0, SUBPIXEL_DENSITY_THRESHOLD_PX, screenRadiusPx));
    const coreEnergy = mix(1.0, densityEnergy, subpixelWeight);
    const coreSigma = max(coreRadius.mul(0.45), uDisplayPixelAngle.mul(0.5));
    const core = exp(angularDistance.mul(angularDistance).negate().div(max(coreSigma.mul(coreSigma).mul(2.0), 1e-10))).mul(coreEnergy);
    const glareRadius = uGlareSize.mul(mix(1.0, scale, uSizeVar)).mul(uDisplayPixelAngle);
    const glareEdge = max(starRadius.add(glareRadius), uDisplayPixelAngle.mul(0.1));
    const glareSigma = max(glareEdge.mul(0.36), uDisplayPixelAngle.mul(0.5));
    const glare = exp(angularDistance.mul(angularDistance).negate().div(max(glareSigma.mul(glareSigma).mul(2.0), 1e-10)))
      .mul(normalWeight)
      .mul(step(0.000001, uGlareSize))
      .mul(step(0.000001, uGlareStr));
    const linkedBrightRand = mix(vRandoms.y, max(vRandoms.y, rank), uSizeVar.mul(STAR_SIZE_BRIGHTNESS_LINK));
    const linkedGlareRand = mix(vRandoms.z, max(vRandoms.z, rank), uSizeVar.mul(STAR_SIZE_GLARE_LINK));
    const glareStrength = uGlareStr.mul(mix(1.0, pow(linkedGlareRand, 8.0), uGlareVar));
    const bright = uBright.mul(mix(1.0, pow(linkedBrightRand, 3.0).mul(3.0), uBrightVar));
    const color = starColorNode(mix(0.5, vRandoms.w, uColorVar));
    const radiance = color.mul(core.add(glare.mul(glareStrength))).mul(bright);

    return vec4(radiance, 1.0);
  })();

  return material as THREE.Material;
}

// --- Screen-space star glints (live render path) -------------------------------------------------
//
// The equirect bake (above) can only carry a *fixed-angular* sky: FOV-compensating the baked angular
// star size streaks stars radially at wide FOV (the projection stretches an inflated angular blob).
// To get genuinely constant *screen-pixel* stars at any FOV, the live path renders the star catalog
// as instanced quads projected with the live camera and sized in real pixels — reusing the exact
// per-star core+glare recipe from `createStarMaterial`, with the angular-distance metric replaced by
// pixel distance (so `displayPixelAngle` collapses to 1 px and `screenPixelScale` to 1).

// Viewport the glints are VIEWED through. Only `renderHeight` (logical/CSS px of the canvas) is used:
// it converts the logical-pixel star size to device pixels via screenSize.y / renderHeight. The FOV
// is intentionally ignored — that is the whole point (no FOV compensation, no streaks).
export type StarfieldGlintHandle = {
  object: THREE.Object3D;
  /** Push the live viewport so glints stay a fixed logical-pixel size across FOV/DPR/resize. */
  setViewport: (viewport: StarGlintViewport | null) => void;
  /** Update per-star appearance uniforms in place (no geometry rebuild) for live slider tweaks. */
  setParams: (params: SkyboxStarfieldParams) => void;
  /** Bind the per-frame transmittance target (Phase B occlusion), or null to disable occlusion. */
  setCoverageTexture: (texture: THREE.Texture | null) => void;
  dispose: () => void;
};

// Distribution-only signature: which stars exist + their per-star randoms depend on these alone, so
// the instanced geometry is rebuilt only when one of them changes. Size/brightness/glare/color are
// uniforms (live uniform updates, no rebuild). Clip changes which stars are filtered out.
export function starfieldGlintGeometryKey(params: SkyboxStarfieldParams) {
  const stars = params.stars;

  return JSON.stringify({
    density: stars.uDensity,
    largeStarRarity: stars.uLargeStarRarity,
    seed: stars.uSeed,
    clip: params.clip,
  });
}

function createStarGlintGeometry(params: SkyboxStarfieldParams) {
  // Full-sphere catalog (no equirect seam copies — a 3D direction is unambiguous), then drop stars
  // outside the layer's clip region. REFERENCE_BAKE_HEIGHT only feeds the (here unused) query margin.
  const coverage = normalizeStarfieldCoverage(params.clip);
  const catalog = createStarCatalogForCoverage(params.stars, coverage, REFERENCE_BAKE_HEIGHT, {
    includeSeamCopies: false,
  });
  const directions: number[] = [];
  const randoms: number[] = [];
  const sizeGates: number[] = [];

  catalog.forEach((star) => {
    if (!starfieldClipContainsDirection([star.x, star.y, star.z], params.clip)) {
      return;
    }

    directions.push(star.x, star.y, star.z);
    randoms.push(star.rSize, star.rBright, star.rGlare, star.rColor);
    sizeGates.push(star.rSizeGate);
  });

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(EMPTY_STAR_POSITIONS, 3));
  geometry.setAttribute("iDirection", new THREE.InstancedBufferAttribute(new Float32Array(directions), 3));
  geometry.setAttribute("iRandoms", new THREE.InstancedBufferAttribute(new Float32Array(randoms), 4));
  geometry.setAttribute("iSizeGate", new THREE.InstancedBufferAttribute(new Float32Array(sizeGates), 1));
  geometry.instanceCount = sizeGates.length;
  // The quad is billboarded in the shader from camera-relative directions; never frustum-cull by the
  // (origin-centered, zero-size) bounding sphere.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), Infinity);

  return geometry;
}

function starGlintUniformValues(params: SkyboxStarfieldParams) {
  const stars = params.stars;

  return {
    uBright: stars.uBright,
    uBrightVar: stars.uBrightVar,
    uColorVar: stars.uColorVar,
    uGlareSize: stars.uGlareSize,
    uGlareStr: stars.uGlareStr,
    uGlareVar: stars.uGlareVar,
    uLargeStarRarity: stars.uLargeStarRarity,
    uSizeVar: stars.uSizeVar,
    uStarSize: stars.uStarSize,
  };
}

function createStarGlintMaterial(params: SkyboxStarfieldParams) {
  const values = starGlintUniformValues(params);
  const uniforms: StarfieldUniformMap = {
    uBright: { value: values.uBright },
    uBrightVar: { value: values.uBrightVar },
    uColorVar: { value: values.uColorVar },
    uGlareSize: { value: values.uGlareSize },
    uGlareStr: { value: values.uGlareStr },
    uGlareVar: { value: values.uGlareVar },
    uCoverageEnabled: { value: 0 },
    uCoverageTexture: { value: whiteCoverageTexture() },
    uLargeStarRarity: { value: values.uLargeStarRarity },
    uRenderHeight: { value: REFERENCE_BAKE_HEIGHT },
    uSizeVar: { value: values.uSizeVar },
    uStarSize: { value: values.uStarSize },
  };
  const uCoverageEnabled = numberUniform(uniforms, "uCoverageEnabled");
  const uCoverageTexture = uniformTexture(whiteCoverageTexture());
  uniforms.uCoverageTexture = uCoverageTexture;
  const uStarSize = numberUniform(uniforms, "uStarSize");
  const uSizeVar = numberUniform(uniforms, "uSizeVar");
  const uLargeStarRarity = numberUniform(uniforms, "uLargeStarRarity");
  const uBright = numberUniform(uniforms, "uBright");
  const uBrightVar = numberUniform(uniforms, "uBrightVar");
  const uGlareSize = numberUniform(uniforms, "uGlareSize");
  const uGlareStr = numberUniform(uniforms, "uGlareStr");
  const uGlareVar = numberUniform(uniforms, "uGlareVar");
  const uColorVar = numberUniform(uniforms, "uColorVar");
  const uRenderHeight = numberUniform(uniforms, "uRenderHeight");
  const vLocalPx = varyingProperty("vec2", "vStarGlintLocalPx") as any;
  const vRandoms = varyingProperty("vec4", "vStarGlintRandoms") as any;
  const vSizeGate = varyingProperty("float", "vStarGlintSizeGate") as any;
  const material = new MeshBasicNodeMaterial({
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    transparent: true,
  }) as any;

  material.uniforms = uniforms;
  material.vertexNode = Fn(() => {
    const iDirection = attribute("iDirection", "vec3") as any;
    const iRandoms = attribute("iRandoms", "vec4") as any;
    const iSizeGate = attribute("iSizeGate", "float") as any;
    const scale = sizeMultiplierNode(iRandoms.x, iSizeGate, uLargeStarRarity, uSizeVar);
    // All radii are LOGICAL pixels here (port of createStarMaterial's vertex with displayPixelAngle
    // → 1 px and screenPixelScale → 1). The support quad spans the larger of the core/glare sigmas
    // out to GAUSSIAN_CUTOFF_SIGMA so bright mid-size stars are never hard-clipped into squares.
    const screenRadiusPx = uStarSize.mul(scale);
    const pinWeight = smoothstep(SUBPIXEL_DENSITY_THRESHOLD_PX, AA_PIN_THRESHOLD_PX, screenRadiusPx).oneMinus();
    const coreSupportRadius = max(screenRadiusPx, mix(float(MIN_CORE_PIXELS), float(0.5), pinWeight));
    const coreSigma = max(coreSupportRadius.mul(0.45), float(0.5));
    const glareRadius = uGlareSize.mul(mix(1.0, scale, uSizeVar));
    const glareSupportEdge = max(screenRadiusPx.add(glareRadius), float(MIN_GLARE_PIXELS));
    const glareSigma = max(glareSupportEdge.mul(0.36), float(0.5))
      .mul(step(0.000001, uGlareSize))
      .mul(step(0.000001, uGlareStr));
    const supportSigma = (max as any)(coreSigma, glareSigma);
    const supportRadiusPx = max(supportSigma, float(0.5)).mul(GAUSSIAN_CUTOFF_SIGMA);

    // Project the star direction to clip space ignoring all translation (transform as a direction,
    // w = 0), so the sky is at infinity: no parallax from camera/skybox translation, matching the
    // equirect composite's per-pixel ray.
    const quadCorner = (positionGeometry as any).xy;
    const screen = screenSize as any;
    const worldDir = (modelWorldMatrix as any).mul(vec4(normalize(iDirection) as any, 0.0)).xyz;
    const viewDir = (cameraViewMatrix as any).mul(vec4(worldDir as any, 0.0)).xyz;
    const clip = (cameraProjectionMatrix as any).mul(vec4(viewDir as any, 1.0));
    // Billboard the quad corner by a constant pixel radius (device px = logical px · DPR), expanded
    // in clip space (· clip.w) so the on-screen size is depth-independent.
    const pixelRatio = screen.y.div(max(uRenderHeight, 1.0));
    const cornerDevicePx = quadCorner.mul(supportRadiusPx).mul(pixelRatio);
    const cornerNdc = cornerDevicePx.div(screen.mul(0.5));
    const offset = vec4(cornerNdc.mul(clip.w) as any, 0.0, 0.0);

    vLocalPx.assign(quadCorner.mul(supportRadiusPx));
    vRandoms.assign(iRandoms);
    vSizeGate.assign(iSizeGate);

    // Cull stars at/behind the camera plane (clip.w <= 0 projects them incorrectly): collapse the
    // whole quad to a single off-screen point so it rasterizes nothing.
    return (select as any)(clip.w.greaterThan(0.0), clip.add(offset), vec4(2.0, 2.0, 2.0, 1.0));
  })();
  material.colorNode = Fn(() => {
    const distancePx = length(vLocalPx);
    const rank = sizeRankNode(vRandoms.x, vSizeGate, uLargeStarRarity);
    const scale = sizeMultiplierNode(vRandoms.x, vSizeGate, uLargeStarRarity, uSizeVar);
    const screenRadiusPx = uStarSize.mul(scale);
    const subpixelWeight = smoothstep(SUBPIXEL_DENSITY_THRESHOLD_PX * 0.75, SUBPIXEL_DENSITY_THRESHOLD_PX, screenRadiusPx).oneMinus();
    const normalWeight = smoothstep(AA_PIN_THRESHOLD_PX, AA_PIN_THRESHOLD_PX + 0.25, screenRadiusPx);
    const coreRadius = max(screenRadiusPx, float(0.1));
    const densityEnergy = max(0.08, smoothstep(0.0, SUBPIXEL_DENSITY_THRESHOLD_PX, screenRadiusPx));
    const coreEnergy = mix(1.0, densityEnergy, subpixelWeight);
    const coreSigma = max(coreRadius.mul(0.45), float(0.5));
    const core = exp(distancePx.mul(distancePx).negate().div(max(coreSigma.mul(coreSigma).mul(2.0), 1e-10))).mul(coreEnergy);
    const glareRadius = uGlareSize.mul(mix(1.0, scale, uSizeVar));
    const glareEdge = max(screenRadiusPx.add(glareRadius), float(0.1));
    const glareSigma = max(glareEdge.mul(0.36), float(0.5));
    const glare = exp(distancePx.mul(distancePx).negate().div(max(glareSigma.mul(glareSigma).mul(2.0), 1e-10)))
      .mul(normalWeight)
      .mul(step(0.000001, uGlareSize))
      .mul(step(0.000001, uGlareStr));
    const linkedBrightRand = mix(vRandoms.y, max(vRandoms.y, rank), uSizeVar.mul(STAR_SIZE_BRIGHTNESS_LINK));
    const linkedGlareRand = mix(vRandoms.z, max(vRandoms.z, rank), uSizeVar.mul(STAR_SIZE_GLARE_LINK));
    const glareStrength = uGlareStr.mul(mix(1.0, pow(linkedGlareRand, 8.0), uGlareVar));
    const bright = uBright.mul(mix(1.0, pow(linkedBrightRand, 3.0).mul(3.0), uBrightVar));
    const color = starColorNode(mix(0.5, vRandoms.w, uColorVar));
    const radiance = color.mul(core.add(glare.mul(glareStrength))).mul(bright);
    // Phase B: attenuate by the transmittance of layers stacked above the starfield (sampled at this
    // screen pixel) so opaque upper layers occlude the glints. Defaults to 1 (no coverage bound).
    const transmittance = texture(uCoverageTexture, screenUV as any).rgb;
    const occluded = radiance.mul(mix(vec3(1.0), transmittance, uCoverageEnabled));

    return vec4(occluded, 1.0);
  })();

  return { material: material as THREE.Material, uniforms };
}

export function createStarfieldGlints(params: SkyboxStarfieldParams): StarfieldGlintHandle {
  const normalized = normalizeStarfieldParams(params);
  const geometry = createStarGlintGeometry(normalized);
  const { material, uniforms } = createStarGlintMaterial(normalized);
  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = "Starfield glints";
  mesh.frustumCulled = false;
  // Draw after the composited skybox mesh (renderOrder -1) so glints sit on top of the sky.
  mesh.renderOrder = 1;

  return {
    object: mesh,
    setViewport: (viewport) => {
      uniforms.uRenderHeight.value =
        viewport && viewport.renderHeight > 0 ? viewport.renderHeight : REFERENCE_BAKE_HEIGHT;
    },
    setParams: (nextParams) => {
      const next = starGlintUniformValues(normalizeStarfieldParams(nextParams));
      Object.entries(next).forEach(([key, value]) => {
        uniforms[key].value = value;
      });
    },
    setCoverageTexture: (coverageTexture) => {
      uniforms.uCoverageTexture.value = coverageTexture ?? whiteCoverageTexture();
      uniforms.uCoverageEnabled.value = coverageTexture ? 1 : 0;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

function createDownsampleMaterial(
  sourceTexture: THREE.Texture,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  sourcePerTarget: number
) {
  const uniforms: StarfieldUniformMap = {
    uExposure: { value: 1 },
    uSourcePerTarget: { value: sourcePerTarget },
    uSourceSize: { value: new THREE.Vector2(sourceWidth, sourceHeight) },
    uSourceTexture: { value: sourceTexture },
    uTargetSize: { value: new THREE.Vector2(targetWidth, targetHeight) },
  };
  const uSourceTexture = uniformTexture(sourceTexture);
  const uSourceSize = vec2Uniform(uniforms, "uSourceSize");
  const uTargetSize = vec2Uniform(uniforms, "uTargetSize");
  const uSourcePerTarget = numberUniform(uniforms, "uSourcePerTarget");
  const uExposure = numberUniform(uniforms, "uExposure");
  const material = new MeshBasicNodeMaterial({
    depthTest: false,
    depthWrite: false,
  }) as any;

  material.uniforms = {
    ...uniforms,
    uSourceTexture: uSourceTexture as unknown as StarfieldUniformMap[string],
  };
  material.colorNode = Fn(() => {
    const targetPixel = floor(uv().mul(uTargetSize));
    const kernel = floor(uSourcePerTarget.add(0.5));
    const color = vec4(0.0).toVar();
    const count = float(0.0).toVar();

    Loop(8, ({ i: y }: any) => {
      Loop(8, ({ i: x }: any) => {
        If(float(x).lessThan(kernel).and(float(y).lessThan(kernel)), () => {
          const sourcePixel = targetPixel
            .mul(uSourcePerTarget)
            .add(vec2(float(x), float(y)))
            .add(0.5);

          color.addAssign(texture(uSourceTexture, sourcePixel.div(uSourceSize)));
          count.addAssign(1.0);
        });
      });
    });

    const stars = color.rgb.div(max(count, 1.0));
    const background = vec3(0.004, 0.005, 0.011);
    const backgroundMapped = vec3(1.0).sub((exp as any)(background.mul(uExposure).negate()));
    const combinedMapped = vec3(1.0).sub((exp as any)(background.add(stars).mul(uExposure).negate()));
    const starContribution = (max as any)(combinedMapped.sub(backgroundMapped), vec3(0.0));
    const alpha = nodeClamp(max(max(starContribution.r, starContribution.g), starContribution.b), 0.0, 1.0);

    return vec4(starContribution, alpha);
  })();

  return material as THREE.Material;
}

function createCompositeMaterial(
  nebulaTexture: THREE.Texture,
  starTexture: THREE.Texture,
  descriptor: StarfieldPatchDescriptor,
  params: SkyboxStarfieldParams
) {
  const uniforms: StarfieldUniformMap = {
    uContentUvMin: { value: new THREE.Vector2(descriptor.uvMin.x, descriptor.uvMin.y) },
    uContentUvSize: { value: new THREE.Vector2(descriptor.uvSize.x, descriptor.uvSize.y) },
    uHasBottomNeighbor: { value: descriptor.hasBottomNeighbor ? 1 : 0 },
    uHasLeftNeighbor: { value: descriptor.hasLeftNeighbor ? 1 : 0 },
    uHasRightNeighbor: { value: descriptor.hasRightNeighbor ? 1 : 0 },
    uHasTopNeighbor: { value: descriptor.hasTopNeighbor ? 1 : 0 },
    uNebulaExposure: { value: params.nebula.uNebulaExposure },
    uNebulaTexture: { value: nebulaTexture },
    uStorageUvMin: { value: new THREE.Vector2(descriptor.storageUvMin.x, descriptor.storageUvMin.y) },
    uStorageUvSize: { value: new THREE.Vector2(descriptor.storageUvSize.x, descriptor.storageUvSize.y) },
    uStarTexture: { value: starTexture },
  };
  const uNebulaTexture = uniformTexture(nebulaTexture);
  const uStarTexture = uniformTexture(starTexture);
  const uContentUvMin = vec2Uniform(uniforms, "uContentUvMin");
  const uContentUvSize = vec2Uniform(uniforms, "uContentUvSize");
  const uStorageUvMin = vec2Uniform(uniforms, "uStorageUvMin");
  const uStorageUvSize = vec2Uniform(uniforms, "uStorageUvSize");
  const uHasLeftNeighbor = numberUniform(uniforms, "uHasLeftNeighbor");
  const uHasRightNeighbor = numberUniform(uniforms, "uHasRightNeighbor");
  const uHasTopNeighbor = numberUniform(uniforms, "uHasTopNeighbor");
  const uHasBottomNeighbor = numberUniform(uniforms, "uHasBottomNeighbor");
  const uNebulaExposure = numberUniform(uniforms, "uNebulaExposure");
  const material = new MeshBasicNodeMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
  }) as any;
  const poleResolveEnabled = descriptor.uvSize.x >= 0.999 ? 1 : 0;
  const poleResolveWidth = 0.28;

  material.blending = THREE.CustomBlending;
  material.blendEquation = THREE.AddEquation;
  material.blendSrc = THREE.OneFactor;
  material.blendDst = THREE.OneFactor;
  material.blendEquationAlpha = THREE.AddEquation;
  material.blendSrcAlpha = THREE.OneFactor;
  material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  uniforms.uNebulaTexture = uNebulaTexture;
  uniforms.uStarTexture = uStarTexture;
  material.uniforms = uniforms;
  material.colorNode = Fn(() => {
    const screenUv = positionGeometry.xy.mul(0.5).add(0.5);
    const skyUv = vec2(screenUv.x, float(1.0).sub(screenUv.y));
    const topPoleWeight = float(1.0).sub(smoothstep(0.0, poleResolveWidth, skyUv.y));
    const bottomPoleWeight = float(1.0).sub(smoothstep(0.0, poleResolveWidth, float(1.0).sub(skyUv.y)));
    const poleWeight = max(topPoleWeight, bottomPoleWeight).mul(poleResolveEnabled);
    const patchUvRaw = storageLocalUvNode(skyUv, uStorageUvMin, uStorageUvSize);
    const patchUv = nodeClamp(patchUvRaw, 0.0, 1.0);
    const sampleMask = uvInside01MaskNode(patchUvRaw);
    const contentLocalUv = vec2(
      wrappedIntervalOffsetNode(skyUv.x, uContentUvMin.x, uContentUvSize.x).div(uContentUvSize.x),
      skyUv.y.sub(uContentUvMin.y).div(uContentUvSize.y)
    );
    const guardFrac = (max as any)(
      uStorageUvSize.sub(uContentUvSize).div(uContentUvSize.mul(2.0)),
      vec2(0.0)
    );
    const safeGuardFrac = (max as any)(guardFrac, vec2(1e-6));
    const leftOwner = (select as any)(
      uHasLeftNeighbor.greaterThan(0.5),
      smoothstep(safeGuardFrac.x.negate(), safeGuardFrac.x, contentLocalUv.x),
      1.0
    );
    const rightOwner = (select as any)(
      uHasRightNeighbor.greaterThan(0.5),
      float(1.0).sub(smoothstep(float(1.0).sub(safeGuardFrac.x), float(1.0).add(safeGuardFrac.x), contentLocalUv.x)),
      1.0
    );
    const horizontalOwner = (select as any)(
      guardFrac.x.lessThanEqual(0.0),
      1.0,
      leftOwner.mul(rightOwner)
    );
    const topOwner = (select as any)(
      uHasTopNeighbor.greaterThan(0.5),
      smoothstep(safeGuardFrac.y.negate(), safeGuardFrac.y, contentLocalUv.y),
      1.0
    );
    const bottomOwner = (select as any)(
      uHasBottomNeighbor.greaterThan(0.5),
      float(1.0).sub(smoothstep(float(1.0).sub(safeGuardFrac.y), float(1.0).add(safeGuardFrac.y), contentLocalUv.y)),
      1.0
    );
    const verticalOwner = (select as any)(
      guardFrac.y.lessThanEqual(0.0),
      1.0,
      topOwner.mul(bottomOwner)
    );
    const ownership = nodeClamp(horizontalOwner.mul(verticalOwner).mul(sampleMask), 0.0, 1.0);
    const baseNebula = texture(uNebulaTexture, patchUv).rgb;
    const poleNebula = vec3(0.0).toVar();
    const poleSampleCount = float(0.0).toVar();

    Loop(32, ({ i }: any) => {
      const poleSkyUv = vec2(float(i).add(0.5).div(32.0), skyUv.y);
      const polePatchUvRaw = storageLocalUvNode(poleSkyUv, uStorageUvMin, uStorageUvSize);
      const polePatchUv = nodeClamp(polePatchUvRaw, 0.0, 1.0);
      const poleSampleMask = uvInside01MaskNode(polePatchUvRaw);

      poleNebula.addAssign(texture(uNebulaTexture, polePatchUv).rgb.mul(poleSampleMask));
      poleSampleCount.addAssign(poleSampleMask);
    });

    const nebula = mix(baseNebula, poleNebula.div(max(poleSampleCount, 1.0)), poleWeight);
    const stars = texture(uStarTexture, patchUv);
    const nebulaMapped = vec3(1.0).sub((exp as any)(nebula.mul(max(uNebulaExposure, 0.001)).negate()));
    const color = nebulaMapped.add(stars.rgb);

    return vec4(color, 1.0).mul(ownership);
  })();
  material.name = `Starfield composite ${descriptor.id}`;

  return material as THREE.Material;
}

function createFinalPatchGeometry(descriptor: StarfieldPatchDescriptor) {
  const ranges = createStarfieldFinalPatchGeometryRanges(descriptor);
  const geometries = ranges.map(({ end, offset, skyV0, skyV1, start }) => {
    const sampleU0 = (start + offset - descriptor.storageUvMin.x) / descriptor.storageUvSize.x;
    const sampleU1 = (end + offset - descriptor.storageUvMin.x) / descriptor.storageUvSize.x;
    const sampleV0 = (skyV0 - descriptor.storageUvMin.y) / descriptor.storageUvSize.y;
    const sampleV1 = (skyV1 - descriptor.storageUvMin.y) / descriptor.storageUvSize.y;
    const x0 = start * 2 - 1;
    const x1 = end * 2 - 1;
    const y0 = 1 - skyV0 * 2;
    const y1 = 1 - skyV1 * 2;
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
      x0, y1, 0,
      x1, y1, 0,
      x0, y0, 0,
      x1, y1, 0,
      x1, y0, 0,
      x0, y0, 0,
    ]), 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([
      sampleU0, sampleV1,
      sampleU1, sampleV1,
      sampleU0, sampleV0,
      sampleU1, sampleV1,
      sampleU1, sampleV0,
      sampleU0, sampleV0,
    ]), 2));

    return geometry;
  });

  return geometries;
}

function liveSphereVerticalSegmentsFor(horizontalSegments: number) {
  return Math.max(8, Math.floor(horizontalSegments / 2));
}

function createLiveDomeGeometry(
  descriptor: StarfieldPatchDescriptor,
  geometryUvRange: { uvMin: { x: number; y: number }; uvSize: { x: number; y: number } }
) {
  const sphereVerticalSegments = liveSphereVerticalSegmentsFor(LIVE_SKYDOME_SEGMENTS);
  const uvMin = geometryUvRange.uvMin;
  const uvSize = geometryUvRange.uvSize;
  const vStart = Math.max(0, Math.min(1, uvMin.y));
  const vEnd = Math.max(0, Math.min(1, uvMin.y + uvSize.y));
  const clampedVSize = Math.max(vEnd - vStart, 0.0001);
  const horizontalSegments = Math.max(3, Math.ceil(LIVE_SKYDOME_SEGMENTS * Math.max(uvSize.x, 0.001)));
  const verticalSegments = Math.max(2, Math.ceil(sphereVerticalSegments * Math.max(clampedVSize, 0.001)));
  const phiStart = (uvMin.x - 0.25) * Math.PI * 2;
  const phiLength = uvSize.x * Math.PI * 2;
  const thetaStart = vStart * Math.PI;
  const thetaLength = clampedVSize * Math.PI;

  return new THREE.SphereGeometry(
    LIVE_SKYDOME_RADIUS,
    horizontalSegments,
    verticalSegments,
    phiStart,
    phiLength,
    thetaStart,
    thetaLength
  );
}

function starPatchGeometryUvRange(descriptor: StarfieldPatchDescriptor) {
  const contentMinX = descriptor.uvMin.x;
  const contentMinY = descriptor.uvMin.y;
  const contentMaxX = descriptor.uvMin.x + descriptor.uvSize.x;
  const contentMaxY = descriptor.uvMin.y + descriptor.uvSize.y;
  const storageMinX = descriptor.storageUvMin.x;
  const storageMinY = descriptor.storageUvMin.y;
  const storageMaxX = descriptor.storageUvMin.x + descriptor.storageUvSize.x;
  const storageMaxY = descriptor.storageUvMin.y + descriptor.storageUvSize.y;
  const minX = descriptor.hasLeftNeighbor ? storageMinX : contentMinX;
  const maxX = descriptor.hasRightNeighbor ? storageMaxX : contentMaxX;
  const minY = descriptor.hasTopNeighbor ? storageMinY : contentMinY;
  const maxY = descriptor.hasBottomNeighbor ? storageMaxY : contentMaxY;

  return {
    uvMin: new THREE.Vector2(minX, minY),
    uvSize: new THREE.Vector2(maxX - minX, maxY - minY),
  };
}

function createLiveNebulaPatchMaterial(
  textureValue: THREE.Texture,
  descriptor: StarfieldPatchDescriptor,
  nebulaExposure: number
) {
  const uTexture = uniformTexture(textureValue);
  const uContentUvMin = uniform(new THREE.Vector2(descriptor.uvMin.x, descriptor.uvMin.y)) as any;
  const uContentUvSize = uniform(new THREE.Vector2(descriptor.uvSize.x, descriptor.uvSize.y)) as any;
  const uStorageUvMin = uniform(new THREE.Vector2(descriptor.storageUvMin.x, descriptor.storageUvMin.y)) as any;
  const uStorageUvSize = uniform(new THREE.Vector2(descriptor.storageUvSize.x, descriptor.storageUvSize.y)) as any;
  const uNebulaExposure = uniform(Math.max(0.001, nebulaExposure)) as any;
  const material = new MeshBasicNodeMaterial({
    depthTest: false,
    depthWrite: false,
    side: THREE.BackSide,
  }) as any;

  material.colorNode = Fn(() => {
    const skyUv = uContentUvMin.add(uv().mul(uContentUvSize));
    const patchUv = nodeClamp(storageLocalUvNode(skyUv, uStorageUvMin, uStorageUvSize), 0.0, 1.0);
    const patchColor = texture(uTexture, patchUv);
    const mapped = vec3(1.0).sub((exp as any)((max as any)(patchColor.rgb, vec3(0.0)).mul(uNebulaExposure).negate()));

    return vec4(mapped, 1.0);
  })();
  material.name = `Starfield live nebula patch ${descriptor.id}`;

  return material as THREE.Material;
}

function createLiveStarPatchMaterial(textureValue: THREE.Texture, descriptor: StarfieldPatchDescriptor) {
  const uTexture = uniformTexture(textureValue);
  const uContentUvMin = uniform(new THREE.Vector2(descriptor.uvMin.x, descriptor.uvMin.y)) as any;
  const uContentUvSize = uniform(new THREE.Vector2(descriptor.uvSize.x, descriptor.uvSize.y)) as any;
  const uStorageUvMin = uniform(new THREE.Vector2(descriptor.storageUvMin.x, descriptor.storageUvMin.y)) as any;
  const uStorageUvSize = uniform(new THREE.Vector2(descriptor.storageUvSize.x, descriptor.storageUvSize.y)) as any;
  const uHasLeftNeighbor = uniform(descriptor.hasLeftNeighbor ? 1 : 0) as any;
  const uHasRightNeighbor = uniform(descriptor.hasRightNeighbor ? 1 : 0) as any;
  const uHasTopNeighbor = uniform(descriptor.hasTopNeighbor ? 1 : 0) as any;
  const uHasBottomNeighbor = uniform(descriptor.hasBottomNeighbor ? 1 : 0) as any;
  const vDirection = varyingProperty("vec3", `vStarfieldPatchDirection${descriptor.x}_${descriptor.y}`) as any;
  const material = new MeshBasicNodeMaterial({
    depthTest: false,
    depthWrite: false,
    side: THREE.BackSide,
    transparent: true,
  }) as any;

  material.blending = THREE.CustomBlending;
  material.blendEquation = THREE.AddEquation;
  material.blendSrc = THREE.OneFactor;
  material.blendDst = THREE.OneFactor;
  material.blendEquationAlpha = THREE.AddEquation;
  material.blendSrcAlpha = THREE.OneFactor;
  material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  material.vertexNode = Fn(() => {
    vDirection.assign(positionGeometry);
    return modelViewProjection;
  })();
  material.colorNode = Fn(() => {
    const skyUv = directionToSourceStarfieldUvNode(vDirection);
    const contentLocalUv = vec2(
      wrappedIntervalOffsetNode(skyUv.x, uContentUvMin.x, uContentUvSize.x).div(uContentUvSize.x),
      skyUv.y.sub(uContentUvMin.y).div(uContentUvSize.y)
    );
    const patchUvRaw = storageLocalUvNode(skyUv, uStorageUvMin, uStorageUvSize);
    const patchUv = nodeClamp(patchUvRaw, 0.0, 1.0);
    const sampleMask = uvInside01MaskNode(patchUvRaw);
    const guardFrac = (max as any)(
      uStorageUvSize.sub(uContentUvSize).div(uContentUvSize.mul(2.0)),
      vec2(0.0)
    );
    const safeGuardFrac = (max as any)(guardFrac, vec2(0.000001));
    const leftOwner = (select as any)(
      uHasLeftNeighbor.greaterThan(0.5),
      smoothstep(safeGuardFrac.x.negate(), safeGuardFrac.x, contentLocalUv.x),
      1.0
    );
    const rightOwner = (select as any)(
      uHasRightNeighbor.greaterThan(0.5),
      float(1.0).sub(smoothstep(float(1.0).sub(safeGuardFrac.x), float(1.0).add(safeGuardFrac.x), contentLocalUv.x)),
      1.0
    );
    const horizontalOwner = (select as any)(
      guardFrac.x.lessThanEqual(0.0),
      1.0,
      leftOwner.mul(rightOwner)
    );
    const topOwner = (select as any)(
      uHasTopNeighbor.greaterThan(0.5),
      smoothstep(safeGuardFrac.y.negate(), safeGuardFrac.y, contentLocalUv.y),
      1.0
    );
    const bottomOwner = (select as any)(
      uHasBottomNeighbor.greaterThan(0.5),
      float(1.0).sub(smoothstep(float(1.0).sub(safeGuardFrac.y), float(1.0).add(safeGuardFrac.y), contentLocalUv.y)),
      1.0
    );
    const verticalOwner = (select as any)(
      guardFrac.y.lessThanEqual(0.0),
      1.0,
      topOwner.mul(bottomOwner)
    );
    const ownership = nodeClamp(horizontalOwner.mul(verticalOwner), 0.0, 1.0);

    return texture(uTexture, patchUv).mul(sampleMask).mul(ownership);
  })();
  material.name = `Starfield live stars patch ${descriptor.id}`;

  return material as THREE.Material;
}

export function createStarfieldPatchMeshGroup(patchSet: StarfieldGpuPatchTextureSet, params: SkyboxStarfieldParams) {
  const group = new THREE.Group();

  group.name = `Starfield live patch group ${patchSet.key}`;
  patchSet.patches.forEach((patch) => {
    const descriptor = patch.descriptor;
    const geometry = createLiveDomeGeometry(descriptor, {
      uvMin: descriptor.uvMin,
      uvSize: descriptor.uvSize,
    });
    const material = createLiveNebulaPatchMaterial(patch.nebulaTexture, descriptor, params.nebula.uNebulaExposure);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.frustumCulled = false;
    mesh.renderOrder = 0;
    group.add(mesh);
  });
  patchSet.patches.forEach((patch) => {
    const descriptor = patch.descriptor;
    const geometry = createLiveDomeGeometry(descriptor, starPatchGeometryUvRange(descriptor));
    const material = createLiveStarPatchMaterial(patch.starTexture, descriptor);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.frustumCulled = false;
    mesh.renderOrder = 0.01;
    group.add(mesh);
  });

  return group;
}

export function disposeStarfieldPatchMeshGroup(group: THREE.Group) {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];

    materials.forEach((material) => {
      material.dispose();
    });
  });
  group.clear();
}

function uvIntervals(uvMin: number, uvSize: number) {
  if (uvSize >= 1) {
    return [{ end: 1, offset: 0, start: 0 }];
  }

  const start = ((uvMin % 1) + 1) % 1;
  const end = start + uvSize;

  if (end <= 1) {
    return [{ end, offset: uvMin - start, start }];
  }

  return [
    { end: 1, offset: uvMin - start, start },
    { end: end - 1, offset: uvMin - start + 1, start: 0 },
  ];
}

export function createStarfieldFinalPatchGeometryRanges(descriptor: StarfieldPatchDescriptor) {
  const uvMinX = descriptor.hasLeftNeighbor ? descriptor.storageUvMin.x : descriptor.uvMin.x;
  const uvMaxX = descriptor.hasRightNeighbor
    ? descriptor.storageUvMin.x + descriptor.storageUvSize.x
    : descriptor.uvMin.x + descriptor.uvSize.x;
  const uvMinY = descriptor.hasTopNeighbor ? descriptor.storageUvMin.y : descriptor.uvMin.y;
  const uvMaxY = descriptor.hasBottomNeighbor
    ? descriptor.storageUvMin.y + descriptor.storageUvSize.y
    : descriptor.uvMin.y + descriptor.uvSize.y;
  const skyV0 = Math.max(0, uvMinY);
  const skyV1 = Math.min(1, uvMaxY);

  if (skyV1 <= skyV0) {
    return [];
  }

  return uvIntervals(uvMinX, uvMaxX - uvMinX).map((interval) => ({
    ...interval,
    skyV0,
    skyV1,
  }));
}

function descriptorWrapping(wrap: StarfieldPatchDescriptor["wrapS"] | StarfieldPatchDescriptor["wrapT"]) {
  return wrap === "repeat" ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
}

function createRenderTarget(width: number, height: number, name: string, options: {
  colorSpace?: THREE.ColorSpace;
  type?: THREE.TextureDataType;
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
} = {}) {
  const target = new THREE.RenderTarget(width, height, {
    depthBuffer: false,
    format: THREE.RGBAFormat,
    generateMipmaps: false,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    stencilBuffer: false,
    type: options.type ?? THREE.UnsignedByteType,
    wrapS: options.wrapS ?? THREE.ClampToEdgeWrapping,
    wrapT: options.wrapT ?? THREE.ClampToEdgeWrapping,
  });

  target.texture.name = name;
  target.texture.colorSpace = options.colorSpace ?? THREE.SRGBColorSpace;
  target.texture.generateMipmaps = false;

  return target;
}

function disposeMaterial(material: THREE.Material) {
  material.dispose();
}

let whiteCoverageTextureInstance: THREE.DataTexture | null = null;

// Default glint coverage = fully transmissive (white) → no occlusion until a real coverage target is
// bound. Phase B (layer-order occlusion) swaps this for the per-frame transmittance pre-pass output.
function whiteCoverageTexture() {
  if (!whiteCoverageTextureInstance) {
    const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);

    texture.needsUpdate = true;
    whiteCoverageTextureInstance = texture;
  }

  return whiteCoverageTextureInstance;
}

let blackStarTextureInstance: THREE.DataTexture | null = null;

// Shared 1x1 opaque-black texture used as the "no stars" input when compositing a nebula-only live
// bake (the star pass is additive, so black contributes nothing).
function blackStarTexture() {
  if (!blackStarTextureInstance) {
    const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    blackStarTextureInstance = texture;
  }

  return blackStarTextureInstance;
}

export function starfieldDisplayPixelAngleForHeight(height: number) {
  return Math.PI / Math.max(1, height);
}

function requestedStarfieldBakeWidth(width?: number) {
  return Math.max(1, Math.floor(width ?? STARFIELD_PREVIEW_BAKE_WIDTH));
}

function clampedStarfieldTargetWidth(requestedWidth: number, maxTextureSize: number) {
  return Math.max(1, Math.min(requestedWidth, maxTextureSize));
}

export class StarfieldGpuBakeService {
  #cache = new Map<string, GpuBakeEntry>();
  #patchCache = new Map<string, GpuPatchBakeEntry>();
  #maxTextureSize: number;
  #renderer: StarfieldGpuRenderer;
  #scene = new THREE.Scene();
  #camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  #quadGeometry = new THREE.PlaneGeometry(2, 2);

  constructor(renderer: StarfieldGpuRenderer) {
    this.#renderer = renderer;
    this.#maxTextureSize = rendererMaxTextureSize(renderer);
  }

  createBakeKey(
    paramsInput: SkyboxStarfieldParams,
    width?: number,
    viewport?: StarGlintViewport | null,
    options?: { starsOmitted?: boolean }
  ) {
    const params = normalizeStarfieldParams(paramsInput);
    const preset = getStarfieldQualityPreset(params.quality);
    const bakeWidth = requestedStarfieldBakeWidth(width);
    const baseKey = createStarfieldBakeCacheKey(params, bakeWidth, Math.floor(bakeWidth / 2), {
      budgetBytes: preset.budgetBytes,
      maxTextureSize: this.#maxTextureSize,
      viewport,
    });

    // Nebula-only (live) and full (export) bakes of identical params must not collide in the cache.
    return options?.starsOmitted ? `nebula-only:${baseKey}` : baseKey;
  }

  previewWidthFor(_paramsInput: SkyboxStarfieldParams) {
    return Math.max(1, Math.min(STARFIELD_PREVIEW_BAKE_WIDTH, this.#maxTextureSize));
  }

  bakeTexture(
    paramsInput: SkyboxStarfieldParams,
    key?: string,
    width?: number,
    viewport?: StarGlintViewport | null,
    options?: { starsOmitted?: boolean }
  ) {
    return this.#bakeTarget(paramsInput, key, width, viewport, options).texture;
  }

  // Screen-space star glints for the live path: constant-pixel stars projected with the live camera,
  // paired with a nebula-only equirect bake (bakeTexture(..., { starsOmitted: true })).
  createGlints(paramsInput: SkyboxStarfieldParams): StarfieldGlintHandle {
    return createStarfieldGlints(paramsInput);
  }

  // Distribution-only key: when it changes the glint geometry must be rebuilt; otherwise a live
  // tweak is just a uniform update via the handle's setParams.
  glintGeometryKey(paramsInput: SkyboxStarfieldParams): string {
    return starfieldGlintGeometryKey(normalizeStarfieldParams(paramsInput));
  }

  bakePatchTextures(
    paramsInput: SkyboxStarfieldParams,
    key?: string,
    width?: number,
    viewport?: StarGlintViewport | null
  ): StarfieldGpuPatchTextureSet {
    return this.#bakePatchTargets(paramsInput, key, width, viewport);
  }

  async bakeImageData(
    paramsInput: SkyboxStarfieldParams,
    key?: string,
    width?: number,
    viewport?: StarGlintViewport | null
  ): Promise<StarfieldBakeData> {
    const entry = this.#bakeTarget(paramsInput, key, width, viewport);
    const { height, width: targetWidth } = entry.target;
    const target = entry.target;
    const result = this.#renderer.readRenderTargetPixelsAsync
      ? await this.#renderer.readRenderTargetPixelsAsync(target, 0, 0, targetWidth, height)
      : null;
    const bytes = new Uint8Array(targetWidth * height * 4);

    if (result) {
      bytes.set(new Uint8Array(result.buffer, result.byteOffset, result.byteLength));
    } else if (this.#renderer.readRenderTargetPixels) {
      this.#renderer.readRenderTargetPixels(target, 0, 0, targetWidth, height, bytes);
    } else {
      throw new Error("GPU Starfield bake readback is not available.");
    }

    return {
      data: new Uint8ClampedArray(bytes.buffer) as Uint8ClampedArray<ArrayBuffer>,
      height,
      width: targetWidth,
    };
  }

  canBake() {
    return hasRenderTargetApi(this.#renderer);
  }

  dispose() {
    this.#cache.forEach((entry) => entry.target.dispose());
    this.#cache.clear();
    this.#patchCache.forEach((entry) => {
      entry.targets.forEach((target) => target.dispose());
    });
    this.#patchCache.clear();
    this.#quadGeometry.dispose();
  }

  #bakePatchTargets(
    paramsInput: SkyboxStarfieldParams,
    key?: string,
    width?: number,
    viewport?: StarGlintViewport | null
  ) {
    const params = normalizeStarfieldParams(paramsInput);
    const preset = getStarfieldQualityPreset(params.quality);
    const requestedWidth = requestedStarfieldBakeWidth(width);
    const requestedHeight = Math.floor(requestedWidth / 2);
    const bakeKey = key ?? this.createBakeKey(params, requestedWidth, viewport);
    const cached = this.#patchCache.get(bakeKey);

    if (cached) {
      return cached;
    }

    const layout = createStarfieldPatchLayout({
      budgetBytes: preset.budgetBytes,
      clip: params.clip,
      height: requestedHeight,
      maxTextureSize: this.#maxTextureSize,
      width: requestedWidth,
    });
    const previousTarget = this.#renderer.getRenderTarget();
    const previousAutoClear = this.#renderer.autoClear;
    const previousClearColor = Object.assign(new THREE.Color(), { a: 1 }) as THREE.Color;
    const previousClearAlpha = this.#renderer.getClearAlpha();
    const targets: THREE.RenderTarget[] = [];
    const patches: StarfieldGpuPatchTexture[] = [];

    this.#renderer.getClearColor(previousClearColor);
    this.#renderer.autoClear = true;
    this.#renderer.setClearColor(0x000000, 0);

    layout.descriptors.forEach((descriptor) => {
      const nebulaTarget = createRenderTarget(
        descriptor.storageSize.width,
        descriptor.storageSize.height,
        `GPU baked starfield nebula ${descriptor.id}`,
        {
          colorSpace: THREE.LinearSRGBColorSpace,
          type: THREE.HalfFloatType,
          wrapS: descriptorWrapping(descriptor.wrapS),
          wrapT: descriptorWrapping(descriptor.wrapT),
        }
      );
      const starTarget = createRenderTarget(
        descriptor.storageSize.width,
        descriptor.storageSize.height,
        `GPU baked starfield stars ${descriptor.id}`,
        {
          colorSpace: THREE.SRGBColorSpace,
          type: THREE.UnsignedByteType,
          wrapS: descriptorWrapping(descriptor.wrapS),
          wrapT: descriptorWrapping(descriptor.wrapT),
        }
      );

      this.#renderMaterialToTarget(createNebulaMaterial(params, descriptor), nebulaTarget);
      this.#renderStarsToTarget(params, descriptor, starTarget, requestedHeight, layout.supersample, viewport ?? null);
      targets.push(nebulaTarget, starTarget);
      patches.push({
        descriptor,
        nebulaTexture: nebulaTarget.texture,
        starTexture: starTarget.texture,
      });
    });

    this.#renderer.setRenderTarget(previousTarget);
    this.#renderer.autoClear = previousAutoClear;
    this.#renderer.setClearColor(previousClearColor, previousClearAlpha);
    const entry: GpuPatchBakeEntry = { key: bakeKey, patches, targets };
    this.#patchCache.set(bakeKey, entry);

    return entry;
  }

  #bakeTarget(
    paramsInput: SkyboxStarfieldParams,
    key?: string,
    width?: number,
    viewport?: StarGlintViewport | null,
    options?: { starsOmitted?: boolean }
  ) {
    const params = normalizeStarfieldParams(paramsInput);
    const preset = getStarfieldQualityPreset(params.quality);
    const requestedWidth = requestedStarfieldBakeWidth(width);
    const requestedHeight = Math.floor(requestedWidth / 2);
    const targetWidth = clampedStarfieldTargetWidth(requestedWidth, this.#maxTextureSize);
    const targetHeight = Math.floor(targetWidth / 2);
    const starsOmitted = options?.starsOmitted ?? false;
    const bakeKey = key ?? this.createBakeKey(params, requestedWidth, viewport, options);
    const cached = this.#cache.get(bakeKey);

    if (cached && cached.target.width === targetWidth && cached.target.height === targetHeight) {
      return cached;
    }

    const finalTarget = createRenderTarget(targetWidth, targetHeight, "GPU baked starfield layer", {
      colorSpace: THREE.SRGBColorSpace,
      type: THREE.UnsignedByteType,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    });
    const layout = createStarfieldPatchLayout({
      budgetBytes: preset.budgetBytes,
      clip: params.clip,
      height: requestedHeight,
      maxTextureSize: this.#maxTextureSize,
      width: requestedWidth,
    });
    const previousTarget = this.#renderer.getRenderTarget();
    const previousAutoClear = this.#renderer.autoClear;
    const previousClearColor = Object.assign(new THREE.Color(), { a: 1 }) as THREE.Color;
    const previousClearAlpha = this.#renderer.getClearAlpha();

    this.#renderer.getClearColor(previousClearColor);
    this.#renderer.autoClear = true;
    this.#renderer.setClearColor(0x000000, 0);
    this.#renderer.setRenderTarget(finalTarget);
    this.#renderer.clear();

    layout.descriptors.forEach((descriptor) => {
      const nebulaTarget = createRenderTarget(
        descriptor.storageSize.width,
        descriptor.storageSize.height,
        `GPU baked starfield nebula ${descriptor.id}`,
        {
          colorSpace: THREE.LinearSRGBColorSpace,
          type: THREE.HalfFloatType,
          wrapS: descriptorWrapping(descriptor.wrapS),
          wrapT: descriptorWrapping(descriptor.wrapT),
        }
      );
      this.#renderMaterialToTarget(createNebulaMaterial(params, descriptor), nebulaTarget);

      if (starsOmitted) {
        // Live path: stars come from the screen-space glint pass, so the equirect texture carries
        // nebula only. A black star texture makes the additive star contribution zero.
        this.#renderPatchToFinal(params, descriptor, nebulaTarget.texture, blackStarTexture(), finalTarget);
        nebulaTarget.dispose();
        return;
      }

      const starTarget = createRenderTarget(
        descriptor.storageSize.width,
        descriptor.storageSize.height,
        `GPU baked starfield stars ${descriptor.id}`,
        {
          colorSpace: THREE.SRGBColorSpace,
          type: THREE.UnsignedByteType,
          wrapS: descriptorWrapping(descriptor.wrapS),
          wrapT: descriptorWrapping(descriptor.wrapT),
        }
      );

      this.#renderStarsToTarget(params, descriptor, starTarget, requestedHeight, layout.supersample, viewport ?? null);
      this.#renderPatchToFinal(params, descriptor, nebulaTarget.texture, starTarget.texture, finalTarget);
      nebulaTarget.dispose();
      starTarget.dispose();
    });

    this.#renderer.setRenderTarget(previousTarget);
    this.#renderer.autoClear = previousAutoClear;
    this.#renderer.setClearColor(previousClearColor, previousClearAlpha);
    finalTarget.texture.userData.starfieldRenderTarget = finalTarget;
    this.#cache.get(bakeKey)?.target.dispose();
    this.#cache.set(bakeKey, { key: bakeKey, target: finalTarget, texture: finalTarget.texture });

    return { key: bakeKey, target: finalTarget, texture: finalTarget.texture };
  }

  #renderMaterialToTarget(material: THREE.Material, target: THREE.RenderTarget) {
    const mesh = new THREE.Mesh(this.#quadGeometry, material);

    mesh.frustumCulled = false;
    this.#scene.clear();
    this.#scene.add(mesh);
    this.#renderer.setRenderTarget(target);
    this.#renderer.clear();
    this.#renderer.render(this.#scene, this.#camera);
    this.#scene.remove(mesh);
    disposeMaterial(material);
  }

  #renderStarsToTarget(
    params: SkyboxStarfieldParams,
    descriptor: StarfieldPatchDescriptor,
    target: THREE.RenderTarget,
    outputHeight: number,
    supersample: number,
    viewport: StarGlintViewport | null
  ) {
    const geometry = createStarGeometry(params, descriptor, outputHeight);
    const safeSupersample = Math.max(1, Math.floor(supersample));
    const internalWidth = descriptor.storageSize.width * safeSupersample;
    const internalHeight = descriptor.storageSize.height * safeSupersample;
    const sourcePerTarget = internalWidth / descriptor.storageSize.width;
    // With a viewport, stars are sized to a fixed logical-pixel size (displayPixelAngle =
    // vFov/renderHeight); without one, fall back to the legacy fixed-angular size where only the
    // AA/sub-pixel thresholds track the output resolution.
    const { displayPixelAngle, screenPixelScale } = starGlintScalesFor(viewport, outputHeight);
    const material = createStarMaterial(params, descriptor, {
      bakeHeight: internalHeight,
      bakeWidth: internalWidth,
      displayPixelAngle,
      screenPixelScale,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const renderTarget = createRenderTarget(
      internalWidth,
      internalHeight,
      `GPU baked starfield stars accumulation ${descriptor.id}`,
      {
        colorSpace: THREE.LinearSRGBColorSpace,
        type: THREE.HalfFloatType,
        wrapS: THREE.ClampToEdgeWrapping,
      }
    );

    mesh.frustumCulled = false;
    this.#scene.clear();
    this.#scene.add(mesh);
    this.#renderer.setRenderTarget(renderTarget);
    this.#renderer.clear();
    this.#renderer.render(this.#scene, this.#camera);
    this.#scene.remove(mesh);
    geometry.dispose();
    disposeMaterial(material);
    this.#renderMaterialToTarget(
      createDownsampleMaterial(
        renderTarget.texture,
        internalWidth,
        internalHeight,
        descriptor.storageSize.width,
        descriptor.storageSize.height,
        sourcePerTarget
      ),
      target
    );
    renderTarget.dispose();
  }

  #renderPatchToFinal(
    params: SkyboxStarfieldParams,
    descriptor: StarfieldPatchDescriptor,
    nebulaTexture: THREE.Texture,
    starTexture: THREE.Texture,
    target: THREE.RenderTarget
  ) {
    const material = createCompositeMaterial(nebulaTexture, starTexture, descriptor, params);
    const geometries = createFinalPatchGeometry(descriptor);

    this.#scene.clear();
    geometries.forEach((geometry) => {
      const mesh = new THREE.Mesh(geometry, material);

      mesh.frustumCulled = false;
      this.#scene.add(mesh);
    });
    const previousAutoClear = this.#renderer.autoClear;

    try {
      this.#renderer.autoClear = false;
      this.#renderer.setRenderTarget(target);
      this.#renderer.render(this.#scene, this.#camera);
    } finally {
      this.#renderer.autoClear = previousAutoClear;
    }
    this.#scene.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    });
    this.#scene.clear();
    disposeMaterial(material);
  }
}

export function createStarfieldGpuBakeService(renderer: unknown) {
  if (!hasRenderTargetApi(renderer)) {
    return null;
  }

  return new StarfieldGpuBakeService(renderer);
}
