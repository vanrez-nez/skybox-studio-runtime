import * as THREE from "three";
import { Skybox, type SkyboxManifestV2 } from "../index";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

const manifest: SkyboxManifestV2 = {
  composition: { mode: "alpha-over", order: "bottom-to-top" },
  nodes: [
    {
      blendMode: "normal",
      enabled: true,
      id: "example-gradient",
      name: "Example Gradient",
      opacity: 100,
      params: {
        mode: "linear",
        rotation: 0,
        stops: [
          { color: "#101827", location: 0, opacity: 100 },
          { color: "#7dd3fc", location: 100, opacity: 100 },
        ],
      },
      type: "gradient",
    },
  ],
  version: 2,
};

scene.add(new Skybox().setRenderer(renderer).fromManifest(manifest).load());
renderer.setAnimationLoop(() => renderer.render(scene, camera));
