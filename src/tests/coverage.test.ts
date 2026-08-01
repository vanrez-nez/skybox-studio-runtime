import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import { DEFAULT_STARFIELD_PARAMS } from "../starfield";
import { Skybox } from "../skybox";
import {
  composeCoverageExpression,
  type CompositionNodeShaderBinding,
} from "../skybox/composition";
import type { WebGpuCompositionRuntime } from "../layer-addons";
import { getLayerRuntimeAdapter } from "../layer-addons/registry";
import { createDefaultSkyboxCloudsParams } from "../layer-addons/builtins/clouds";
import type { SkyboxManifestLayer, SkyboxManifestV2 } from "../manifest";

function imageOverStarfieldManifest(): SkyboxManifestV2 {
  return {
    composition: { mode: "alpha-over", order: "bottom-to-top" },
    geometry: { type: "box" },
    nodes: [
      {
        blendMode: "normal",
        enabled: true,
        id: "image",
        name: "Image",
        opacity: 100,
        params: {
          height: 1,
          pixels: null,
          placement: null,
          src: "",
          width: 1,
        },
        type: "image",
      },
      {
        blendMode: "normal",
        enabled: true,
        id: "starfield",
        name: "Starfield",
        opacity: 100,
        params: DEFAULT_STARFIELD_PARAMS,
        type: "starfield",
      },
    ],
    version: 2,
  };
}

describe("Starfield glint coverage", () => {
  it("generates upper-layer coverage from the live opacity binding", () => {
    const manifest = imageOverStarfieldManifest();
    const image = manifest.nodes[0] as SkyboxManifestLayer;
    const compositionBinding: CompositionNodeShaderBinding = {
      index: 0,
      node: image,
      parameterPrefix: "compositionNode0",
    };
    const runtime = {
      adapters: new Map([
        [
          "image",
          {
            adapter: {
              createSampleExpression: () => "effectColor = imageLayer0;",
            },
            bindings: [],
            bindingsByLayerId: new Map(),
            uniforms: [],
          },
        ],
      ]),
      editorProjectionByLayerId: new Map(),
      sampleParameters: {},
      textureSlotsByLayerId: {},
    } as unknown as WebGpuCompositionRuntime;

    const expression = composeCoverageExpression(
      manifest.nodes,
      new Map([[image.id, compositionBinding]]),
      runtime,
    );

    expect(expression).toContain("effectColor.a * compositionNode0Opacity");
    expect(expression).not.toContain("effectColor.a * 1.0");
  });

  it("routes live opacity edits to the coverage material", () => {
    let renderTarget: THREE.RenderTarget | null = null;
    const render = vi.fn();
    const renderer = {
      autoClear: true,
      backend: { device: { limits: { maxTextureDimension2D: 64 } } },
      getDrawingBufferSize: (target: THREE.Vector2) => target.set(64, 32),
      getRenderTarget: () => renderTarget,
      isWebGPURenderer: true,
      render,
      setRenderTarget: (target: THREE.RenderTarget | null) => {
        renderTarget = target;
      },
    };
    const skybox = new Skybox()
      .setRenderer(renderer as never)
      .fromManifest(imageOverStarfieldManifest())
      .load();

    try {
      skybox.onBeforeRender(
        renderer as never,
        new THREE.Scene(),
        new THREE.PerspectiveCamera(),
        skybox.geometry,
        skybox.material,
        new THREE.Group(),
      );

      const coverageScene = render.mock.calls[0]?.[0] as THREE.Scene | undefined;
      const coverageMesh = coverageScene?.children[0] as THREE.Mesh | undefined;
      const coverageMaterial = coverageMesh?.material as THREE.Material | undefined;
      const updateCoverage = vi.spyOn(
        coverageMaterial!.userData,
        "applyLayerComposition",
      );

      skybox.updateLayerComposition("image", { opacity: 0 });

      expect(updateCoverage).toHaveBeenCalledOnce();
      expect(updateCoverage).toHaveBeenCalledWith(
        expect.objectContaining({ id: "image", opacity: 0 }),
      );
    } finally {
      skybox.dispose();
    }
  });

  it("uses the same live opacity binding for Clouds transmission", () => {
    const clouds: SkyboxManifestLayer = {
      blendMode: "normal",
      enabled: true,
      id: "clouds",
      name: "Clouds",
      opacity: 100,
      params: createDefaultSkyboxCloudsParams(),
      type: "clouds",
    };
    const manifest = imageOverStarfieldManifest();
    manifest.nodes[0] = clouds;
    const adapter = getLayerRuntimeAdapter("clouds")?.wgsl;

    expect(adapter).toBeTruthy();

    const bindings = adapter!.collect(manifest.nodes) as Array<{ layer: SkyboxManifestLayer }>;
    const runtime = {
      adapters: new Map([
        [
          "clouds",
          {
            adapter,
            bindings,
            bindingsByLayerId: new Map(bindings.map((binding) => [binding.layer.id, binding])),
            uniforms: [],
          },
        ],
      ]),
      editorProjectionByLayerId: new Map(),
      sampleParameters: {},
      textureSlotsByLayerId: {},
    } as unknown as WebGpuCompositionRuntime;
    const expression = composeCoverageExpression(
      manifest.nodes,
      new Map([
        [
          clouds.id,
          {
            index: 0,
            node: clouds,
            parameterPrefix: "compositionNode0",
          },
        ],
      ]),
      runtime,
    );

    expect(expression).toContain("vec3<f32>(compositionNode0Opacity)");
  });
});
