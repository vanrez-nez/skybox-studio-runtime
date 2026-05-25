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
  .setBakeOptions({ width: 1024, dpr: devicePixelRatio, cache: true })
  .fromManifest(manifest)
  .load();

scene.add(skybox);
renderer.setAnimationLoop(() => renderer.render(scene, camera));
```

## Render Modes

- `auto`: chooses WebGPU live for `WebGPURenderer`, otherwise WebGL live.
- `live-webgpu`: uses Three TSL and `NodeMaterial`.
- `live-webgl`: uses `ShaderMaterial`.
- `baked-texture`: evaluates the manifest on the CPU into an equirectangular texture.

## Baking

```ts
import { bakeSkyboxImageData, createBakedSkyboxTexture } from "skybox-studio-runtime";

const image = bakeSkyboxImageData(manifest, { width: 1024, cache: true });
const texture = createBakedSkyboxTexture(manifest, { width: 1024 });
```

The bake path uses the same color conversion, layer ordering, opacity, blend modes, and group composition as the live renderers.

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
