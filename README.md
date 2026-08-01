# skybox-studio-runtime

`skybox-studio-runtime` renders Skybox Studio manifests in Three.js. It supports live shader rendering and baked equirectangular textures from the same manifest evaluator.

## Install

```bash
npm install skybox-studio-runtime three
```

`three` is a peer dependency. The package is ESM-only.

## Basic Usage

```ts
import * as THREE from "three";
import { Skybox, type SkyboxManifestV2 } from "skybox-studio-runtime";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);

const manifest: SkyboxManifestV2 = {
  version: 2,
  composition: { mode: "alpha-over", order: "bottom-to-top" },
  geometry: { type: "sphere" },
  nodes: [
    {
      id: "base",
      name: "Base",
      type: "gradient",
      enabled: true,
      opacity: 100,
      blendMode: "normal",
      params: {
        mode: "linear",
        rotation: 0,
        stops: [
          { color: "#14213d", location: 0, opacity: 100 },
          { color: "#fca311", location: 100, opacity: 100 },
        ],
      },
    },
  ],
};

const skybox = new Skybox()
  .setRenderer(renderer)
  .setRenderMode("auto")
  .setGeometry({ type: "sphere" })
  .setBakeOptions({ width: 1024, dpr: devicePixelRatio, cache: true })
  .fromManifest(manifest)
  .load();

scene.add(skybox);
renderer.setAnimationLoop(() => {
  skybox.setViewport({
    renderHeight: renderer.domElement.clientHeight,
    verticalFovRadians: THREE.MathUtils.degToRad(camera.fov),
  });
  renderer.render(scene, camera);
});
```

## Render Modes

- `auto`: chooses WebGPU live for `WebGPURenderer`, otherwise WebGL live.
- `live-webgpu`: uses Three TSL and `NodeMaterial`.
- `live-webgl`: uses `ShaderMaterial`.
- `baked-texture`: evaluates the manifest on the CPU into an equirectangular texture.

## Geometry

Use `geometry: { type: "box" }` or `geometry: { type: "sphere" }` in Manifest V2, or override it fluently with `setGeometry(...)`. Both primitives sample effects by world-space direction, so Gradient and Field Gradient layers render consistently across box and spherical sky geometry.

## Baking

```ts
import { bakeSkyboxImageData, createBakedSkyboxTexture } from "skybox-studio-runtime";

const image = bakeSkyboxImageData(manifest, { width: 1024, cache: true });
const texture = createBakedSkyboxTexture(manifest, { width: 1024 });
```

The bake path uses the same color conversion, layer ordering, opacity, blend modes, and group composition as the live renderers.

### GPU equirect bake (WebGPU)

When you have a `WebGPURenderer`, you can bake the live composition shader straight into an equirectangular render target (including HDR float targets) instead of evaluating on the CPU:

```ts
import { createSkyboxGpuBakeService } from "skybox-studio-runtime";

const bake = createSkyboxGpuBakeService(renderer);
const moonTextures = await bake.prepareMoonTextures(manifest, 1024);
const target = bake.bakeRenderTarget(manifest, {
  width: 2048,
  height: 1024,
  hdr: true,
  moonTextures,
});
// `bakeImageData` prepares Moon textures automatically.
const image = await bake.bakeImageData(manifest, { width: 2048, height: 1024 });
```

## Moon Generation

Moon layers are procedural WebGPU resources included in the core runtime. The
live `Skybox` generates and caches one texture per Moon layer; placement updates
move the angular decal without regenerating its terrain. Call `setViewport(...)`
when the viewport height or camera FOV changes so automatic Moon resolution can
track its projected size.

Moon layers require a WebGPU renderer with compute support. The CPU and WebGL
baked-texture fallbacks report them as unsupported instead of silently omitting
the layer.

## Starfield Generation

Procedural starfield generation (the star/nebula catalog, its GPU bake service, and the CPU sampler) lives behind a **separate entry point**, `skybox-studio-runtime/starfield`, so consumers that never use starfields don't pull that code into their core bundle. Import it **once** anywhere in your app to enable starfield layers:

```ts
// Side-effect import — registers the starfield GPU bake service + CPU sampler.
import "skybox-studio-runtime/starfield";

// …or import the helpers/params you need (also enables generation):
import {
  DEFAULT_STARFIELD_PARAMS,
  normalizeStarfieldParams,
} from "skybox-studio-runtime/starfield";
```

Without this import, `starfield` layers are a graceful no-op (they simply don't render/bake). With it imported, the live `Skybox` and the bakers generate starfield textures automatically from each layer's params.

## Loading Bundles

Skybox Studio exports project bundles (a `manifest.json` plus hashed image assets). The loader rehydrates a bundle from a directory, URL, or zip and returns a ready manifest with its image textures:

```ts
import { loadSkyboxBundle, Skybox } from "skybox-studio-runtime";

const { manifest, imageTextures } = await loadSkyboxBundle(source);

const skybox = new Skybox()
  .setRenderer(renderer)
  .setImageTextures(imageTextures)
  .fromManifest(manifest)
  .load();
```

`loadBundleFromUrl`, `loadBundleFromZip`, and `loadBundleFromDirectory` cover the individual sources, and `loadSkyboxImageTextures` loads just the image layers for a manifest you already have.

## Extending Layers

The runtime is registry-driven — there are no hardcoded `layer.type` branches. Register a custom layer adapter (its CPU `sampleCpu` plus optional WGSL/GLSL halves) with `registerLayerRuntimeAdapter`, and it composes end-to-end through both the live renderers and the bakers with no edits to the core.

## Groups

Manifest V2 supports nested groups. A group is evaluated as an isolated subtree, then composited into its parent using the group's `blendMode` and `opacity`.

Use `targetGroupId` in bake options to bake a group subtree:

```ts
const groupImage = bakeSkyboxImageData(manifest, {
  targetGroupId: "atmosphere",
  width: 1024,
});
```

## Color Management

Colors are authored as sRGB hex strings, evaluated in linear RGB, and encoded back to sRGB for baked textures. CMYK/ICC print profiles are not supported.
