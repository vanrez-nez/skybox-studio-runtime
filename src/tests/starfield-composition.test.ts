import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import { createDefaultSkyboxCloudsParams } from "../layer-addons/builtins/clouds";
import type { SkyboxManifestV2 } from "../manifest";
import { DEFAULT_STARFIELD_PARAMS } from "../starfield";
import { Skybox } from "../skybox";

function createManifest(options: { clouds?: boolean; secondStarfield?: boolean } = {}): SkyboxManifestV2 {
  const starfield = (id: string) => ({
    blendMode: "normal" as const,
    enabled: true,
    id,
    name: id,
    opacity: 100,
    params: DEFAULT_STARFIELD_PARAMS,
    type: "starfield" as const,
  });
  const nodes: SkyboxManifestV2["nodes"] = [];

  if (options.clouds) {
    nodes.push({
      blendMode: "normal",
      enabled: true,
      id: "clouds",
      name: "Clouds",
      opacity: 100,
      params: createDefaultSkyboxCloudsParams(),
      type: "clouds",
    });
  }

  nodes.push(starfield("starfield"));
  if (options.secondStarfield) {
    nodes.push(starfield("starfield-b"));
  }

  return {
    composition: { mode: "alpha-over", order: "bottom-to-top" },
    geometry: { type: "box" },
    nodes,
    version: 2,
  };
}

function createRenderer() {
  let renderTarget: THREE.RenderTarget | null = null;
  let width = 64;
  let height = 32;
  let clearAlpha = 1;
  const clearColor = new THREE.Color(0x123456);
  const render = vi.fn();

  return {
    renderer: {
      autoClear: true,
      backend: { device: { limits: { maxTextureDimension2D: 64 } } },
      getClearAlpha: () => clearAlpha,
      getClearColor: (target: THREE.Color) => target.copy(clearColor),
      getDrawingBufferSize: (target: THREE.Vector2) => target.set(width, height),
      getRenderTarget: () => renderTarget,
      isWebGPURenderer: true,
      render,
      setClearColor: (color: THREE.ColorRepresentation, alpha = 1) => {
        clearColor.set(color);
        clearAlpha = alpha;
      },
      setRenderTarget: (target: THREE.RenderTarget | null) => {
        renderTarget = target;
      },
    },
    render,
    resize: (nextWidth: number, nextHeight: number) => {
      width = nextWidth;
      height = nextHeight;
    },
  };
}

function renderTargets(skybox: Skybox, renderer: ReturnType<typeof createRenderer>["renderer"], camera: THREE.Camera) {
  skybox.onBeforeRender(
    renderer as never,
    new THREE.Scene(),
    camera,
    skybox.geometry,
    skybox.material,
    new THREE.Group(),
  );
}

describe("Starfield layer composition", () => {
  it("samples its cached screen-space stars inside the Starfield layer", () => {
    const { renderer, render } = createRenderer();
    const skybox = new Skybox()
      .setRenderer(renderer as never)
      .fromManifest(createManifest())
      .load();

    try {
      const screenSlot = skybox.material.userData.debugStarfieldScreenTextureSlots.starfield;
      const combinedSample = skybox.material.userData.debugStarfieldSampleNodes.starfield;
      const equirectSlot = skybox.material.userData.debugImageTextureSlots.starfield;

      expect(screenSlot.value).toBeInstanceOf(THREE.Texture);
      expect(screenSlot.value.name).toBe("Starfield screen target starfield");
      expect(combinedSample).not.toBe(equirectSlot);
      expect(skybox.children).toHaveLength(0);

      renderTargets(skybox, renderer, new THREE.PerspectiveCamera(50, 2, 0.1, 100));

      expect(render).toHaveBeenCalledOnce();
      const targetScene = render.mock.calls[0]?.[0] as THREE.Scene;
      expect(targetScene.children).toHaveLength(1);
      expect(targetScene.children[0]?.name).toBe("Starfield glints");
    } finally {
      skybox.dispose();
    }
  });

  it("refreshes only for Starfield, camera, projection, or viewport invalidation", () => {
    const { renderer, render, resize } = createRenderer();
    const skybox = new Skybox()
      .setRenderer(renderer as never)
      .fromManifest(createManifest({ clouds: true }))
      .load();
    const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 100);

    try {
      renderTargets(skybox, renderer, camera);
      render.mockClear();

      renderTargets(skybox, renderer, camera);
      expect(render).not.toHaveBeenCalled();

      skybox.setTime(12);
      skybox.updateLayerComposition("clouds", { opacity: 35 });
      skybox.updateLayer("clouds", {
        ...createDefaultSkyboxCloudsParams(),
        sunIntensity: 0,
      });
      renderTargets(skybox, renderer, camera);
      expect(render).not.toHaveBeenCalled();

      camera.rotation.y = 0.25;
      camera.updateMatrixWorld(true);
      renderTargets(skybox, renderer, camera);
      expect(render).toHaveBeenCalledTimes(1);

      render.mockClear();
      camera.fov = 65;
      camera.updateProjectionMatrix();
      renderTargets(skybox, renderer, camera);
      expect(render).toHaveBeenCalledTimes(1);

      render.mockClear();
      resize(80, 40);
      renderTargets(skybox, renderer, camera);
      expect(render).toHaveBeenCalledTimes(1);

      render.mockClear();
      skybox.updateStarfieldLayer("starfield", {
        ...DEFAULT_STARFIELD_PARAMS,
        stars: {
          ...DEFAULT_STARFIELD_PARAMS.stars,
          uBright: DEFAULT_STARFIELD_PARAMS.stars.uBright + 0.1,
        },
      });
      renderTargets(skybox, renderer, camera);
      expect(render).toHaveBeenCalledTimes(1);
    } finally {
      skybox.dispose();
    }
  });

  it("keeps independent targets for multiple Starfield layers", () => {
    const { renderer, render } = createRenderer();
    const skybox = new Skybox()
      .setRenderer(renderer as never)
      .fromManifest(createManifest({ secondStarfield: true }))
      .load();

    try {
      const slots = skybox.material.userData.debugStarfieldScreenTextureSlots;

      expect(slots.starfield.value).not.toBe(slots["starfield-b"].value);
      renderTargets(skybox, renderer, new THREE.PerspectiveCamera(50, 2, 0.1, 100));
      expect(render).toHaveBeenCalledTimes(2);
    } finally {
      skybox.dispose();
    }
  });
});
