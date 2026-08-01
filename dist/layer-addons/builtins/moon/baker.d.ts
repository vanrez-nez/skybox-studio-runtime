import * as THREE from "three/webgpu";
import type { MoonBakeParams } from "./params";
export declare class MoonBaker {
    private renderer;
    private size;
    /** R = height, G = reflectance mottle, B = mare mask, A = fresh-ray mask */
    terrainTex: THREE.StorageTexture;
    /** RGB = height-field normal. */
    deriveTex: THREE.StorageTexture;
    /** The finished, fully lit moon. This is the only texture the scene samples. */
    outputTex: THREE.StorageTexture;
    private U;
    private realisticPasses;
    private cartoonPasses;
    constructor(renderer: THREE.WebGPURenderer, params: MoonBakeParams);
    private build;
    /**
     * Phase is the sun vector — the realistic pipeline has no crescent mask anywhere.
     * `phaseT` is the same phase as an illuminated fraction, which the cartoon
     * pipeline's drawn crescent needs since it works in disc space.
     */
    private setSun;
    /** Push params into the uniform nodes. Cheap — no shader recompile. */
    sync(params: MoonBakeParams): void;
    /** Resolution is compile-time in the kernels, so it rebuilds them. */
    setResolution(size: number): void;
    bake(params: MoonBakeParams): Promise<number>;
    dispose(): void;
}
