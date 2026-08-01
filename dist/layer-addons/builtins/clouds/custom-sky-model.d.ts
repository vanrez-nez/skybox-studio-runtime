import { BoxGeometry, Color, Mesh, NodeMaterial, Vector3 } from "three/webgpu";
import type { Texture } from "three/webgpu";
/**
 * Skydome shader graph for the Custom SkyMesh demo.
 *
 * The mesh, the far-plane trick and the FBM cloud layer come from Three.js
 * r184's SkyMesh add-on (three/examples/jsm/objects/SkyMesh.js, MIT). The
 * atmosphere is no longer the add-on's Preetham analytic model: it is Sean
 * O'Neil, "Accurate Atmospheric Scattering", GPU Gems 2, Chapter 16.
 *
 * https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-16-accurate-atmospheric-scattering
 *
 * Written from the equations and constants the chapter states in prose, not
 * transliterated from its NVIDIA-copyrighted code listings.
 *
 * What the chapter's model brings over Preetham:
 *
 * - A spherical planet inside an atmosphere shell with exp(-h / scaleDepth)
 *   density, instead of a flat-earth air-mass approximation.
 * - `opticalScale`, the polynomial fit to exp(-4x) that lets the optical-depth
 *   lookup table drop its height dimension. This is the chapter's central
 *   contribution.
 * - A real in-scattering integral sampled along the view ray, so the sky is
 *   integrated rather than evaluated in closed form.
 * - Wavelength-dependent scattering from 1 / lambda^4 and the chapter's own
 *   Kr / Km / ESun constants, instead of Preetham's turbidity fit.
 * - Cornette-Shanks Mie phase (Henyey-Greenstein with the (1 + cos^2) term and
 *   the (2 + g^2) normalization), and the correct (1 + cos^2) Rayleigh phase.
 * - The chapter's HDR curve, 1 - exp(-exposure * color).
 *
 * Three deliberate departures, the first two forced by this being a skybox:
 *
 * - The chapter runs the integral per vertex on a tessellated dome and applies
 *   only the phase functions per fragment. A skybox is a 24-vertex cube, so the
 *   integral runs per fragment here. That removes the interpolation artifacts
 *   the chapter's split exists to avoid, at a higher per-pixel cost.
 * - The chapter's ground and from-space permutations are not implemented. There
 *   is no planet surface to shade and the observer is always inside the
 *   atmosphere. Below the horizon the optical path is clamped to the horizon
 *   ray, which is what the add-on's Preetham path already did.
 * - The chapter models one sun. Here the integral, the phase composite, the
 *   discs and the cloud lighting all run for two independent lights — a sun
 *   and a moon — unrolled at graph-build time. With both lights below the
 *   horizon everything extinguishes to black: night has no artificial floor.
 */
/**
 * Rayleigh phase, 0.75 * (1 + cos^2). `cosAngle` is measured along
 * camera-minus-sample, the reverse of the view direction, which is the
 * convention the chapter's negative g pairs with.
 */
export declare const rayleighPhase: import("three/src/nodes/TSL.js").FnNode<any[], import("three/webgpu").Node<"float">>;
/**
 * Cornette-Shanks Mie phase, the chapter's form: Henyey-Greenstein carrying the
 * (1 + cos^2) term and the (2 + g^2) normalization.
 *
 * Exported with g as a parameter so cloud layers can drive silver-lining and
 * rim terms off the same function the sky uses, at their own asymmetry.
 */
export declare const miePhase: import("three/src/nodes/TSL.js").FnNode<any[], import("three/webgpu").Node<"float">>;
interface LightDefaults {
    /** Irradiance scale — the chapter's ESun, for the sun. */
    intensity: number;
    /** sRGB hex; Color converts it to the linear value the shader wants. */
    tint: string;
    showDisc: boolean;
}
declare function createLightUniforms(defaults: LightDefaults): {
    /** Unit vector toward the light. Set from elevation/azimuth on the JS side. */
    direction: import("three/webgpu").UniformNode<"vec3", Vector3>;
    intensity: import("three/webgpu").UniformNode<"float", number>;
    tint: import("three/webgpu").UniformNode<"color", Color>;
    showDisc: import("three/webgpu").UniformNode<"float", number>;
};
export type LightUniforms = ReturnType<typeof createLightUniforms>;
interface CloudLayerDefaults {
    /**
     * Height of the layer above the surface, in the same radius-10 units as the
     * atmosphere (which is 0.25 thick). Sets *where* the view ray crosses the
     * layer — the perspective and the parallax against the other layer — and
     * nothing about cloud size.
     */
    altitude: number;
    /**
     * World span of one tile of the cloud field. Sets cloud size, and only cloud
     * size. This and `altitude` used to multiply the same term, which made them
     * the same control.
     */
    featureSize: number;
    /**
     * Wind drift in world units per time unit, applied before the feature-size
     * divide — so resizing clouds does not change how fast they appear to move.
     */
    speed: number;
    /**
     * Mix weight of the morph fetch — a second read of the same field at its own
     * scale and speed on a rotated sample plane. Two patterns that drift apart
     * and never re-register make shapes grow, split and dissolve instead of
     * sliding as a rigid sheet. 0 disables the mix exactly; the morph frame is
     * still fetched and seeds the tendril warp (see TENDRIL_WARP).
     */
    morphBlend: number;
    /**
     * World tile span of the morph fetch, as a multiple of `featureSize`.
     * Non-integer ratios (1.7, 1.6) keep the two lattices from ever locking.
     */
    morphScale: number;
    /**
     * The morph fetch's own wind, in the same world units as `speed`. Shape
     * evolution rate is set by the RELATIVE drift of the two fetches, so a sign
     * opposite to `speed` morphs roughly twice as fast as a matched one.
     */
    morphSpeed: number;
    coverage: number;
    density: number;
    /** Forward-scattering asymmetry for this layer's silver lining. */
    phaseG: number;
    /**
     * Decorrelates this layer's sample of the shared field: it both rotates the
     * sample plane (by `seed` radians) and translates it (by `seed` tiles).
     *
     * Translation alone was not enough. Both layers read one tiling texture, so a
     * pure offset leaves them showing the same shapes, and whenever altitude and
     * feature size happened to put their uv scales near a common ratio the two
     * patterns locked together and beat against each other as the altitude slider
     * swept through it. A rotation has no such coincidence, and a seamlessly
     * tiling field stays seamless under one — the field is periodic on a lattice,
     * so rotating the lookup only rotates a continuous infinite plane.
     */
    seed: number;
}
declare function createCloudLayerUniforms(defaults: CloudLayerDefaults): {
    /** 0 skips the layer entirely, including its shadow on the layer below. */
    enabled: import("three/webgpu").UniformNode<"float", number>;
    altitude: import("three/webgpu").UniformNode<"float", number>;
    featureSize: import("three/webgpu").UniformNode<"float", number>;
    speed: import("three/webgpu").UniformNode<"float", number>;
    morphBlend: import("three/webgpu").UniformNode<"float", number>;
    morphScale: import("three/webgpu").UniformNode<"float", number>;
    morphSpeed: import("three/webgpu").UniformNode<"float", number>;
    coverage: import("three/webgpu").UniformNode<"float", number>;
    density: import("three/webgpu").UniformNode<"float", number>;
    phaseG: import("three/webgpu").UniformNode<"float", number>;
    seed: import("three/webgpu").UniformNode<"float", number>;
};
export type CloudLayerUniforms = ReturnType<typeof createCloudLayerUniforms>;
export type CustomSkyModelInputs = {
    direction?: any;
    time?: any;
};
/**
 * Builds the source model against explicit direction/time nodes.
 *
 * Supplying neither input preserves the standalone SkyMesh behavior. The
 * runtime supplies both so viewport and equirect export share the same graph
 * and so time remains host-controlled rather than wall-clock-driven.
 */
export declare function createCustomSkyModel(fieldTexture: Texture, inputs?: CustomSkyModelInputs): {
    colorNode: import("three/webgpu").VarNode<"vec4", import("three/webgpu").ConstNode<"vec4", import("three").Vector4>>;
    sampleNode: import("three/webgpu").StructNode;
    uniforms: {
        /** Rayleigh scattering constant. Chapter default 0.0025. */
        kr: import("three/webgpu").UniformNode<"float", number>;
        /** Mie scattering constant. Chapter default 0.0010. */
        km: import("three/webgpu").UniformNode<"float", number>;
        /**
         * The chapter models one sun. Both lights here run through the same
         * integral, phase composite, disc and cloud lighting, so night is not a
         * preset — it is the same model with the other light up. Intensity 20 is
         * the chapter's ESun.
         */
        sun: {
            /** Unit vector toward the light. Set from elevation/azimuth on the JS side. */
            direction: import("three/webgpu").UniformNode<"vec3", Vector3>;
            intensity: import("three/webgpu").UniformNode<"float", number>;
            tint: import("three/webgpu").UniformNode<"color", Color>;
            showDisc: import("three/webgpu").UniformNode<"float", number>;
        };
        /**
         * Real moonlight is reflected sunlight and physically a touch *warmer*
         * than the sun — the familiar cool night is the Purkinje shift in human
         * vision, so the slightly warm default is the physical choice and a blue
         * moon is an artistic one. The real sun-to-full-moon ratio is ~400,000:1,
         * which renders black at any usable exposure, so the intensity is a
         * deliberate cheat.
         */
        moon: {
            /** Unit vector toward the light. Set from elevation/azimuth on the JS side. */
            direction: import("three/webgpu").UniformNode<"vec3", Vector3>;
            intensity: import("three/webgpu").UniformNode<"float", number>;
            tint: import("three/webgpu").UniformNode<"color", Color>;
            showDisc: import("three/webgpu").UniformNode<"float", number>;
        };
        /**
         * Mie phase asymmetry, in the chapter's negative convention (it measures
         * the angle toward the camera, not away from it). Chapter default -0.990.
         */
        mieDirectionalG: import("three/webgpu").UniformNode<"float", number>;
        /** Primary wavelengths in micrometres. Chapter default (0.650, 0.570, 0.475). */
        wavelength: import("three/webgpu").UniformNode<"vec3", Vector3>;
        /** Observer height above the surface, in the chapter's radius-10 units. */
        eyeHeight: import("three/webgpu").UniformNode<"float", number>;
        /**
         * Ground mist: a second exponential density profile inside the same
         * extinction framework as the atmosphere, but with a scale height far
         * below the cloud shells — the boundary-layer haze the single big
         * exponential cannot produce. `mistDensity` is the VERTICAL optical depth
         * of the whole column seen from the surface (0 switches the layer off
         * exactly); `mistHeight` is the scale height in world units. Mist
         * droplets are large compared to light's wavelength, so its extinction is
         * grey — a scalar, unlike the 1/lambda^4 air.
         */
        mistDensity: import("three/webgpu").UniformNode<"float", number>;
        mistHeight: import("three/webgpu").UniformNode<"float", number>;
        /** Samples along the view ray. The chapter states 5 is enough. */
        samples: import("three/webgpu").UniformNode<"int", number>;
        /** HDR exposure for 1 - exp(-exposure * color). Chapter default 2. */
        exposure: import("three/webgpu").UniformNode<"float", number>;
        up: import("three/webgpu").UniformNode<"vec3", Vector3>;
        /**
         * The near layer. Composited last, shadowed by the high layer, and the one
         * that will grow a volumetric body.
         */
        cloudLow: {
            /** 0 skips the layer entirely, including its shadow on the layer below. */
            enabled: import("three/webgpu").UniformNode<"float", number>;
            altitude: import("three/webgpu").UniformNode<"float", number>;
            featureSize: import("three/webgpu").UniformNode<"float", number>;
            speed: import("three/webgpu").UniformNode<"float", number>;
            morphBlend: import("three/webgpu").UniformNode<"float", number>;
            morphScale: import("three/webgpu").UniformNode<"float", number>;
            morphSpeed: import("three/webgpu").UniformNode<"float", number>;
            coverage: import("three/webgpu").UniformNode<"float", number>;
            density: import("three/webgpu").UniformNode<"float", number>;
            phaseG: import("three/webgpu").UniformNode<"float", number>;
            seed: import("three/webgpu").UniformNode<"float", number>;
        };
        /** The far, thinner sheet. */
        cloudHigh: {
            /** 0 skips the layer entirely, including its shadow on the layer below. */
            enabled: import("three/webgpu").UniformNode<"float", number>;
            altitude: import("three/webgpu").UniformNode<"float", number>;
            featureSize: import("three/webgpu").UniformNode<"float", number>;
            speed: import("three/webgpu").UniformNode<"float", number>;
            morphBlend: import("three/webgpu").UniformNode<"float", number>;
            morphScale: import("three/webgpu").UniformNode<"float", number>;
            morphSpeed: import("three/webgpu").UniformNode<"float", number>;
            coverage: import("three/webgpu").UniformNode<"float", number>;
            density: import("three/webgpu").UniformNode<"float", number>;
            phaseG: import("three/webgpu").UniformNode<"float", number>;
            seed: import("three/webgpu").UniformNode<"float", number>;
        };
        /** Resolution of the baked field, so the shader can convert a uv footprint
         * into texels and pick a mip explicitly. */
        fieldSize: import("three/webgpu").UniformNode<"float", number>;
        /** Tints each layer's contribution so overlap and order are visible. */
        debugLayers: import("three/webgpu").UniformNode<"float", number>;
    };
    setFieldTexture: (next: Texture) => void;
    vertexNode: any;
};
export declare function createCustomSkyMesh(fieldTexture: Texture): {
    mesh: Mesh<BoxGeometry, NodeMaterial, import("three").Object3DEventMap>;
    uniforms: {
        /** Rayleigh scattering constant. Chapter default 0.0025. */
        kr: import("three/webgpu").UniformNode<"float", number>;
        /** Mie scattering constant. Chapter default 0.0010. */
        km: import("three/webgpu").UniformNode<"float", number>;
        /**
         * The chapter models one sun. Both lights here run through the same
         * integral, phase composite, disc and cloud lighting, so night is not a
         * preset — it is the same model with the other light up. Intensity 20 is
         * the chapter's ESun.
         */
        sun: {
            /** Unit vector toward the light. Set from elevation/azimuth on the JS side. */
            direction: import("three/webgpu").UniformNode<"vec3", Vector3>;
            intensity: import("three/webgpu").UniformNode<"float", number>;
            tint: import("three/webgpu").UniformNode<"color", Color>;
            showDisc: import("three/webgpu").UniformNode<"float", number>;
        };
        /**
         * Real moonlight is reflected sunlight and physically a touch *warmer*
         * than the sun — the familiar cool night is the Purkinje shift in human
         * vision, so the slightly warm default is the physical choice and a blue
         * moon is an artistic one. The real sun-to-full-moon ratio is ~400,000:1,
         * which renders black at any usable exposure, so the intensity is a
         * deliberate cheat.
         */
        moon: {
            /** Unit vector toward the light. Set from elevation/azimuth on the JS side. */
            direction: import("three/webgpu").UniformNode<"vec3", Vector3>;
            intensity: import("three/webgpu").UniformNode<"float", number>;
            tint: import("three/webgpu").UniformNode<"color", Color>;
            showDisc: import("three/webgpu").UniformNode<"float", number>;
        };
        /**
         * Mie phase asymmetry, in the chapter's negative convention (it measures
         * the angle toward the camera, not away from it). Chapter default -0.990.
         */
        mieDirectionalG: import("three/webgpu").UniformNode<"float", number>;
        /** Primary wavelengths in micrometres. Chapter default (0.650, 0.570, 0.475). */
        wavelength: import("three/webgpu").UniformNode<"vec3", Vector3>;
        /** Observer height above the surface, in the chapter's radius-10 units. */
        eyeHeight: import("three/webgpu").UniformNode<"float", number>;
        /**
         * Ground mist: a second exponential density profile inside the same
         * extinction framework as the atmosphere, but with a scale height far
         * below the cloud shells — the boundary-layer haze the single big
         * exponential cannot produce. `mistDensity` is the VERTICAL optical depth
         * of the whole column seen from the surface (0 switches the layer off
         * exactly); `mistHeight` is the scale height in world units. Mist
         * droplets are large compared to light's wavelength, so its extinction is
         * grey — a scalar, unlike the 1/lambda^4 air.
         */
        mistDensity: import("three/webgpu").UniformNode<"float", number>;
        mistHeight: import("three/webgpu").UniformNode<"float", number>;
        /** Samples along the view ray. The chapter states 5 is enough. */
        samples: import("three/webgpu").UniformNode<"int", number>;
        /** HDR exposure for 1 - exp(-exposure * color). Chapter default 2. */
        exposure: import("three/webgpu").UniformNode<"float", number>;
        up: import("three/webgpu").UniformNode<"vec3", Vector3>;
        /**
         * The near layer. Composited last, shadowed by the high layer, and the one
         * that will grow a volumetric body.
         */
        cloudLow: {
            /** 0 skips the layer entirely, including its shadow on the layer below. */
            enabled: import("three/webgpu").UniformNode<"float", number>;
            altitude: import("three/webgpu").UniformNode<"float", number>;
            featureSize: import("three/webgpu").UniformNode<"float", number>;
            speed: import("three/webgpu").UniformNode<"float", number>;
            morphBlend: import("three/webgpu").UniformNode<"float", number>;
            morphScale: import("three/webgpu").UniformNode<"float", number>;
            morphSpeed: import("three/webgpu").UniformNode<"float", number>;
            coverage: import("three/webgpu").UniformNode<"float", number>;
            density: import("three/webgpu").UniformNode<"float", number>;
            phaseG: import("three/webgpu").UniformNode<"float", number>;
            seed: import("three/webgpu").UniformNode<"float", number>;
        };
        /** The far, thinner sheet. */
        cloudHigh: {
            /** 0 skips the layer entirely, including its shadow on the layer below. */
            enabled: import("three/webgpu").UniformNode<"float", number>;
            altitude: import("three/webgpu").UniformNode<"float", number>;
            featureSize: import("three/webgpu").UniformNode<"float", number>;
            speed: import("three/webgpu").UniformNode<"float", number>;
            morphBlend: import("three/webgpu").UniformNode<"float", number>;
            morphScale: import("three/webgpu").UniformNode<"float", number>;
            morphSpeed: import("three/webgpu").UniformNode<"float", number>;
            coverage: import("three/webgpu").UniformNode<"float", number>;
            density: import("three/webgpu").UniformNode<"float", number>;
            phaseG: import("three/webgpu").UniformNode<"float", number>;
            seed: import("three/webgpu").UniformNode<"float", number>;
        };
        /** Resolution of the baked field, so the shader can convert a uv footprint
         * into texels and pick a mip explicitly. */
        fieldSize: import("three/webgpu").UniformNode<"float", number>;
        /** Tints each layer's contribution so overlap and order are visible. */
        debugLayers: import("three/webgpu").UniformNode<"float", number>;
    };
    setFieldTexture: (next: Texture) => void;
};
export {};
