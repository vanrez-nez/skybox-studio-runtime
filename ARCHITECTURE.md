# `skybox-studio-runtime` — module map

The runtime is the **minimal logic an external consumer needs** to render or bake a skybox from a
manifest. It is registry-driven: there are no hardcoded `layer.type === …` branches in the core —
every layer is a self-contained addon, so adding a layer is one file + one `register()` call, with
zero edits to the material builders or composition code.

## Top level (`src/`)

| File | Responsibility |
|---|---|
| `index.ts` | The **public barrel** — the stable API surface (see below). |
| `skybox.ts` | The stateful `Skybox extends THREE.Mesh` class: lifecycle, state, starfield-texture sync, Direct-pipeline live `updateLayer*`, and `setManifest` orchestration. Delegates all material building to `skybox/materials.ts`. |
| `manifest.ts` | Manifest schema + `migrateManifestToV2`. |
| `evaluator.ts` | CPU evaluator (`evaluateSkyboxDirection`) — composes registered layers' `sampleCpu`. |
| `starfield-static.ts` | Procedural star/nebula catalog + CPU sampler (the starfield *generation* source the bakers read). |
| `baking/` | Texture baking, grouped: `bake.ts` (CPU equirect bake), `skybox-gpu-bake.ts` + `starfield-gpu-bake.ts` (offscreen WebGPU bake services), and `starfield-bake-registry.ts` (the bake-service injection point that keeps starfield generation out of the core chunk). |
| `image-placement-transform.ts` / `spot-transform.ts` | Pure placement/param math. |
| `loader/` | Bundle/zip/url loaders (re-uses THREE loaders). |
| `math.ts` | Color/vector primitives. |

## `skybox/` — material + composition runtime (consumed by the `Skybox` class)

| File | Responsibility |
|---|---|
| `materials.ts` | Builds the live **WebGPU** (NodeMaterial/TSL) + **WebGL** (GLSL) materials, the offscreen **equirect GPU-bake** material, and the CPU baked-texture fallback — all manifest-driven through the registry. |
| `composition.ts` | Blend-mode + layer composition codegen (`composeNodesExpression`, `effectExpression`, …) shared by both render paths. |
| `geometry.ts` | Skybox sphere/box geometry builders. |
| `types.ts` | Shared shader-binding / uniform-node types (pure types). |
| `editor-presentation.ts` | Editor-only selection/hover overlay uniforms + rect-overlay shaders, gated by `editorPresentationEnabled` (a standalone consumer never pays for it). |
| `stops.ts` / `colors.ts` | Shared gradient-stop + hex-color → vector helpers. |
| `overlay.ts` | Shared overlay/projection constants. |
| `equirect.ts` | GLSL equirect direction↔UV helpers. |
| `empty-texture.ts` | 1×1 transparent fallback texture. |

## `layer-addons/` — the per-layer registry

| File | Responsibility |
|---|---|
| `registry.ts` | `registerLayerRuntimeAdapter` (merges partial adapters), `getLayerRuntimeAdapter(s)`, `isRegisteredLayerType`. |
| `cpu-sampling.ts` | Shared CPU sampling helpers. |
| `shader-codegen.ts` | Shared GLSL/WGSL literal + expression emitters. |
| `types.ts` | The `WebGpuLayerAdapter` / `LayerGlslAdapter` contracts. |
| `builtins/<type>.ts` | **Self-contained** gradient, field-gradient, image, spot, starfield adapters — each registers its CPU + WGSL + GLSL halves in one `register()` call. |
| `builtins/index.ts` | Imports every builtin for its registration side effect. |

## Adding a layer

1. Create `layer-addons/builtins/<type>.ts`.
2. Call `registerLayerRuntimeAdapter({ type, sampleCpu, updateLive, wgsl?, glsl?, getTopologyKey?, wgslEditorOverlay? })`.
3. Add it to `builtins/index.ts`.

No edits to `skybox.ts`, `materials.ts`, `composition.ts`, or the evaluator. See
`tests/registry.test.ts` for a proof that a brand-new type composes end-to-end.

## Public API (the `index.ts` barrel)

The stable surface is everything re-exported from `index.ts` — notably `Skybox`,
`createBakedSkyboxTexture`, `createSkyboxGeometry`, `evaluateSkyboxDirection`, `migrateManifestToV2`,
the loaders, and the `registerLayerRuntimeAdapter` / `getLayerRuntimeAdapter` / `isRegisteredLayerType`
registry entry points. Internal `skybox/*` and `layer-addons/builtins/*` modules are **not** part of
the stability boundary — import from the package root.
