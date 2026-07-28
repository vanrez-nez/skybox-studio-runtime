import { $ as e, A as t, D as n, F as r, G as i, H as a, I as o, J as s, K as c, L as l, M as u, N as d, O as f, P as p, Q as m, R as h, U as g, V as _, W as ee, X as te, Y as v, Z as y, d as b, et as ne, it as re, j as ie, k as ae, m as oe, nt as se, q as x, rt as S, t as C, tt as ce, z as w } from "./starfield-bake-registry-C0-DJPT5.js";
import * as T from "three";
import { NodeMaterial as E } from "three/webgpu";
import { Fn as le, cameraProjectionMatrixInverse as ue, cameraWorldMatrix as de, modelViewProjection as D, normalize as fe, positionGeometry as pe, screenUV as me, texture as O, uniform as k, vec2 as he, vec4 as ge, wgslFn as A } from "three/tsl";
//#region src/manifest.ts
var j = { type: "box" };
function M(e) {
	return e.version === 2 ? {
		...e,
		geometry: e.geometry ?? j
	} : {
		composition: e.composition,
		geometry: j,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	};
}
//#endregion
//#region src/skybox/geometry.ts
function _e(e) {
	return e ?? j;
}
function ve(e = j) {
	return _e(e).type === "sphere" ? new T.SphereGeometry(1, 64, 32) : new T.BoxGeometry(1, 1, 1);
}
function ye(e = 1, t = 25, n = 25) {
	let r = [], i = (t, n) => {
		r.push(e * Math.sin(n) * Math.cos(t), e * Math.cos(n), e * Math.sin(n) * Math.sin(t));
	};
	for (let e = 0; e < t; e += 1) {
		let r = e / t * Math.PI * 2;
		for (let e = 0; e < n; e += 1) {
			let t = e / n * Math.PI, a = (e + 1) / n * Math.PI;
			i(r, t), i(r, a);
		}
	}
	for (let e = 1; e < n; e += 1) {
		let r = e / n * Math.PI;
		for (let e = 0; e < t; e += 1) {
			let n = e / t * Math.PI * 2, a = (e + 1) / t * Math.PI * 2;
			i(n, r), i(a, r);
		}
	}
	return new T.BufferGeometry().setAttribute("position", new T.Float32BufferAttribute(r, 3));
}
function be(e = j) {
	if (_e(e).type === "sphere") return ye();
	let t = new T.BoxGeometry(1, 1, 1), n = new T.EdgesGeometry(t);
	return t.dispose(), n;
}
//#endregion
//#region src/skybox/colors.ts
function N(e) {
	let [t, n, r] = S(e);
	return new T.Vector3(t, n, r);
}
//#endregion
//#region src/layer-addons/shader-codegen.ts
function P(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function xe(e) {
	return `vec3<f32>(${P(e)})`;
}
function F(e, t, n) {
	return `var ${e}: ${t} = ${n};`;
}
function I(e, t, n) {
	return `select(${n}, ${t}, ${e})`;
}
function L() {
	return "effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);";
}
//#endregion
//#region src/layer-addons/builtins/clouds.ts
var Se = 5, Ce = [{
	offset: 0,
	scale: 1e3,
	weight: 1
}, {
	offset: 3.7,
	scale: 2e3,
	weight: .5
}];
function we(e) {
	let t = new T.Vector3(...e.sunDirection);
	return t.lengthSq() === 0 && t.set(0, 1, 0), {
		color: N(e.color),
		coverage: y(e.coverage),
		density: y(e.density),
		elevation: y(e.elevation),
		offset: e.phase * e.speed,
		scale: Math.max(e.scale, 0),
		shadowColor: N(e.shadowColor),
		sunDirection: t.normalize()
	};
}
function R(e, t) {
	let n = Math.imul(e | 0, 374761393) + Math.imul(t | 0, 668265263) >>> 0;
	return n = Math.imul(n ^ n >>> 13, 1274126177) >>> 0, ((n ^ n >>> 16) >>> 0) * 23283064365386963e-26;
}
function Te(e, t) {
	let n = Math.floor(e), r = Math.floor(t), i = e - n, a = t - r, o = i * i * (3 - 2 * i), s = a * a * (3 - 2 * a), c = R(n, r), l = R(n + 1, r), u = R(n, r + 1), d = R(n + 1, r + 1), f = c + (l - c) * o;
	return f + (u + (d - u) * o - f) * s;
}
function Ee(e, t) {
	let n = e, r = t, i = .5, a = 0;
	for (let e = 0; e < Se; e += 1) a += i * Te(n, r), n *= 2, r *= 2, i *= .5;
	return a;
}
function De(e, t) {
	let n = we(t), [i, o, s] = r(e);
	if (o <= 0 || n.coverage <= 0) return [
		0,
		0,
		0,
		0
	];
	let c = 1 + -.9 * n.elevation, l = i / (o * c) * n.scale + n.offset, u = s / (o * c) * n.scale + n.offset, d = Ce.reduce((e, t) => e + Ee(l * t.scale + t.offset, u * t.scale + t.offset) * t.weight, 0) * .5 + .5, f = 1 - n.coverage, p = y(a(f, f + .3, d) * a(0, .1 + .2 * n.elevation, o) * n.density);
	if (p <= 1e-5) return [
		0,
		0,
		0,
		0
	];
	let m = (i * n.sunDirection.x + o * n.sunDirection.y + s * n.sunDirection.z) * .5 + .5, h = n.shadowColor, g = n.color;
	return [
		h.x + (g.x - h.x) * m,
		h.y + (g.y - h.y) * m,
		h.z + (g.z - h.z) * m,
		p
	];
}
function Oe(e) {
	return e.map((e) => {
		let t = we(e.layer.params);
		return {
			color: k(t.color),
			coverage: k(t.coverage),
			density: k(t.density),
			elevation: k(t.elevation),
			layerId: e.layer.id,
			offset: k(t.offset),
			scale: k(t.scale),
			shadowColor: k(t.shadowColor),
			sunDirection: k(t.sunDirection)
		};
	});
}
function ke(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = we(t.params);
	n.color.value.copy(r.color), n.coverage.value = r.coverage, n.density.value = r.density, n.elevation.value = r.elevation, n.offset.value = r.offset, n.scale.value = r.scale, n.shadowColor.value.copy(r.shadowColor), n.sunDirection.value.copy(r.sunDirection);
}
function Ae(e) {
	let t = [];
	function n(e) {
		e.forEach((e) => {
			if (e.enabled) {
				if (e.type === "group") {
					n(e.children);
					return;
				}
				if (e.type === "clouds") {
					let n = t.length;
					t.push({
						index: n,
						layer: e,
						parameterPrefix: `cloudsLayer${n}`
					});
				}
			}
		});
	}
	return n(e), t;
}
function z(e, t, n) {
	return `
        let ${e}Seed: u32 = u32(i32(${t})) * 374761393u + u32(i32(${n})) * 668265263u;
        let ${e}Mix: u32 = (${e}Seed ^ (${e}Seed >> 13u)) * 1274126177u;
        let ${e}: f32 = f32(${e}Mix ^ (${e}Mix >> 16u)) * 2.3283064365386963e-10;`;
}
function je(e) {
	let t = e.parameterPrefix;
	return `{
    let cloudDirection = normalize(direction);
    var cloudColor: vec3<f32> = vec3<f32>(0.0);
    var cloudAlpha: f32 = 0.0;
    if (cloudDirection.y > 0.0 && ${t}Coverage > 0.0) {
      let cloudElevation = mix(1.0, 0.1, ${t}Elevation);
      let cloudUv = cloudDirection.xz / (cloudDirection.y * cloudElevation) * ${t}Scale + ${t}Offset;
      var cloudNoise: f32 = 0.0;
      ${Ce.map((e, t) => `
      {
        var p${t}: vec2<f32> = cloudUv * ${e.scale.toFixed(1)} + ${e.offset.toFixed(8)};
        var amplitude${t}: f32 = 0.5;
        var sum${t}: f32 = 0.0;
        for (var octave${t}: i32 = 0; octave${t} < ${Se}; octave${t} = octave${t} + 1) {
          let cell${t} = floor(p${t});
          let frac${t} = p${t} - cell${t};
          let weight${t} = frac${t} * frac${t} * (3.0 - 2.0 * frac${t});
          ${z(`h00_${t}`, `cell${t}.x`, `cell${t}.y`)}
          ${z(`h10_${t}`, `cell${t}.x + 1.0`, `cell${t}.y`)}
          ${z(`h01_${t}`, `cell${t}.x`, `cell${t}.y + 1.0`)}
          ${z(`h11_${t}`, `cell${t}.x + 1.0`, `cell${t}.y + 1.0`)}
          let top${t} = mix(h00_${t}, h10_${t}, weight${t}.x);
          let bottom${t} = mix(h01_${t}, h11_${t}, weight${t}.x);
          sum${t} = sum${t} + amplitude${t} * mix(top${t}, bottom${t}, weight${t}.y);
          p${t} = p${t} * 2.0;
          amplitude${t} = amplitude${t} * 0.5;
        }
        cloudNoise = cloudNoise + sum${t} * ${e.weight.toFixed(8)};
      }`).join("")}
      cloudNoise = cloudNoise * 0.5 + 0.5;
      let cloudCoverageEdge = 1.0 - ${t}Coverage;
      var cloudMask: f32 = smoothstep(cloudCoverageEdge, cloudCoverageEdge + 0.3, cloudNoise);
      cloudMask = cloudMask * smoothstep(0.0, 0.1 + 0.2 * ${t}Elevation, cloudDirection.y);
      let cloudSunInfluence = dot(cloudDirection, normalize(${t}SunDirection)) * 0.5 + 0.5;
      cloudColor = mix(${t}ShadowColor, ${t}Color, cloudSunInfluence);
      cloudAlpha = clamp(cloudMask * ${t}Density, 0.0, 1.0);
    }
    effectColor = vec4<f32>(cloudColor, cloudAlpha);
  }`;
}
var Me = {
	collect: Ae,
	createParameterDeclarations: (e) => e.flatMap((e) => [
		`,
      ${e.parameterPrefix}Color: vec3<f32>`,
		`,
      ${e.parameterPrefix}Coverage: f32`,
		`,
      ${e.parameterPrefix}Density: f32`,
		`,
      ${e.parameterPrefix}Elevation: f32`,
		`,
      ${e.parameterPrefix}Offset: f32`,
		`,
      ${e.parameterPrefix}Scale: f32`,
		`,
      ${e.parameterPrefix}ShadowColor: vec3<f32>`,
		`,
      ${e.parameterPrefix}SunDirection: vec3<f32>`
	]).join(""),
	createSampleExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id);
		return r ? je(r) : L();
	},
	createSampleParameters: (e, t) => Object.fromEntries(e.flatMap((e) => {
		let n = t[e.index];
		return [
			[`${e.parameterPrefix}Color`, n.color],
			[`${e.parameterPrefix}Coverage`, n.coverage],
			[`${e.parameterPrefix}Density`, n.density],
			[`${e.parameterPrefix}Elevation`, n.elevation],
			[`${e.parameterPrefix}Offset`, n.offset],
			[`${e.parameterPrefix}Scale`, n.scale],
			[`${e.parameterPrefix}ShadowColor`, n.shadowColor],
			[`${e.parameterPrefix}SunDirection`, n.sunDirection]
		];
	})),
	createUniforms: Oe,
	getTopologyKey: () => ({}),
	type: "clouds",
	updateUniforms: ke
};
v({
	type: "clouds",
	sampleCpu: (e, t) => De(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Me,
	getTopologyKey: (e) => Me.getTopologyKey(e)
});
//#endregion
//#region src/skybox/stops.ts
function Ne(e) {
	return [...e.stops].map((e) => ({
		color: e.color,
		midpoint: y((e.midpoint ?? 50) / 100, .01, .99),
		opacity: y(e.opacity / 100),
		t: y(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function B(e) {
	let [t, n, r] = S(e.color);
	return new T.Vector4(t, n, r, e.opacity);
}
//#endregion
//#region src/layer-addons/builtins/gradient.ts
function Pe(e) {
	let t = e * Math.PI / 180;
	return [
		Math.sin(t),
		Math.cos(t),
		0
	];
}
function Fe(e, t) {
	let n = Pe(t.rotation), r = e[0] * n[0] + e[1] * n[1] + e[2] * n[2];
	return h(o(t.stops), r * .5 + .5);
}
function Ie(e) {
	let t = e * Math.PI / 180;
	return new T.Vector3(Math.sin(t), Math.cos(t), 0).normalize();
}
function Le(e) {
	return e.map((e) => {
		let t = Ne(e.layer.params);
		return {
			axis: k(Ie(e.layer.params.rotation)),
			layerId: e.layer.id,
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: k(B(r)),
					midpoint: k(r.midpoint),
					t: k(r.t)
				};
			})
		};
	});
}
function Re(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = Ne(t.params);
	n.axis.value.copy(Ie(t.params.rotation)), n.stops.forEach((e, t) => {
		let n = r[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(B(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function ze(e) {
	let t = [];
	function n(e) {
		e.forEach((e) => {
			if (e.enabled) {
				if (e.type === "group") {
					n(e.children);
					return;
				}
				if (e.type === "gradient") {
					let n = t.length;
					t.push({
						index: n,
						layer: e,
						parameterPrefix: `gradientLayer${n}`,
						stopCount: e.params.stops.length
					});
				}
			}
		});
	}
	return n(e), t;
}
function Be(e) {
	if (e.stopCount === 0) return "effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);";
	let t = Array.from({ length: Math.max(0, e.stopCount - 1) }, (t, n) => {
		let r = `${e.parameterPrefix}StopT${n}`, i = `${e.parameterPrefix}StopT${n + 1}`, a = `localT${n}`, o = `segmentMidpoint${n}`, s = `midpointT${n}`, c = `${e.parameterPrefix}StopMidpoint${n}`, l = `${a} / max(${o} * 2.0, 0.00001)`, u = `select(${`0.5 + (${a} - ${o}) / max((1.0 - ${o}) * 2.0, 0.00001)`}, ${l}, ${a} <= ${o})`;
		return `${n === 0 ? "if" : "else if"} (gradientT <= ${i}) {
      let ${a}: f32 = clamp((gradientT - ${r}) / max(${i} - ${r}, 0.00001), 0.0, 1.0);
      let ${o}: f32 = clamp(${c}, 0.01, 0.99);
      let ${s}: f32 = ${u};
      effectColor = mix(${e.parameterPrefix}StopColor${n}, ${e.parameterPrefix}StopColor${n + 1}, ${s});
    }`;
	}), n = e.stopCount - 1;
	return `{
    let gradientAxis = normalize(${e.parameterPrefix}Axis);
    let gradientT = dot(direction, gradientAxis) * 0.5 + 0.5;
    ${t.join("\n")}
    ${t.length > 0 ? "else" : ""} {
      effectColor = ${e.parameterPrefix}StopColor${n};
    }
  }`;
}
var Ve = {
	collect: ze,
	createParameterDeclarations: (e) => e.flatMap((e) => [`,
      ${e.parameterPrefix}Axis: vec3<f32>`, ...Array.from({ length: e.stopCount }, (t, n) => [
		`,
      ${e.parameterPrefix}StopColor${n}: vec4<f32>`,
		`,
      ${e.parameterPrefix}StopMidpoint${n}: f32`,
		`,
      ${e.parameterPrefix}StopT${n}: f32`
	]).flat()]).join(""),
	createSampleExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id);
		return r ? Be(r) : L();
	},
	createSampleParameters: (e, t) => Object.fromEntries(e.flatMap((e) => {
		let n = t[e.index];
		return [[`${e.parameterPrefix}Axis`, n.axis], ...Array.from({ length: e.stopCount }, (t, r) => [
			[`${e.parameterPrefix}StopColor${r}`, n.stops[r].color],
			[`${e.parameterPrefix}StopMidpoint${r}`, n.stops[r].midpoint],
			[`${e.parameterPrefix}StopT${r}`, n.stops[r].t]
		]).flat()];
	})),
	createUniforms: Le,
	getTopologyKey: (e) => ({
		mode: e.params.mode,
		stopCount: e.params.stops.length
	}),
	type: "gradient",
	updateUniforms: Re
};
v({
	type: "gradient",
	sampleCpu: (e, t) => Fe(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Ve,
	getTopologyKey: (e) => Ve.getTopologyKey(e)
});
//#endregion
//#region src/layer-addons/builtins/field-gradient.ts
function He(e, t) {
	if (t.anchors.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = i(e, y(t.amplitude, 0, .6), Math.max(1e-4, t.frequency)), r = 0, a = 0, o = 0, s = 0;
	return t.anchors.forEach((e) => {
		let i = f(n, ie(e.x, e.y)), c = t.mode === "gaussian" ? Math.exp(-(i * i) / (2 * (.46 / t.power) ** 2)) : 1 / (i + 5e-4) ** t.power, l = S(e.color);
		r += l[0] * c, a += l[1] * c, o += l[2] * c, s += c;
	}), s <= 0 ? [
		0,
		0,
		0,
		0
	] : [
		r / s,
		a / s,
		o / s,
		1
	];
}
function Ue(e) {
	return +(e === "gaussian");
}
function We(e, t) {
	let n = (y(e) - .5) * Math.PI * 2, r = (.5 - y(t)) * Math.PI, i = Math.cos(r);
	return new T.Vector3(i * Math.cos(n), Math.sin(r), i * Math.sin(n)).normalize();
}
function Ge(e) {
	return e.map((e) => ({
		amplitude: k(y(e.layer.params.amplitude, 0, .6)),
		anchors: Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return {
				color: k(N(r.color)),
				direction: k(We(r.x, r.y))
			};
		}),
		frequency: k(Math.max(1e-4, e.layer.params.frequency)),
		layerId: e.layer.id,
		mode: k(Ue(e.layer.params.mode)),
		power: k(Math.max(1e-4, e.layer.params.power))
	}));
}
function Ke(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n && (n.amplitude.value = y(t.params.amplitude, 0, .6), n.frequency.value = Math.max(1e-4, t.params.frequency), n.mode.value = Ue(t.params.mode), n.power.value = Math.max(1e-4, t.params.power), n.anchors.forEach((e, n) => {
		let r = t.params.anchors[n] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.color.value.copy(N(r.color)), e.direction.value.copy(We(r.x, r.y));
	}));
}
function qe(e) {
	let t = [];
	function n(e) {
		e.forEach((e) => {
			if (e.enabled) {
				if (e.type === "group") {
					n(e.children);
					return;
				}
				if (e.type === "field-gradient") {
					let n = t.length;
					t.push({
						anchorCount: e.params.anchors.length,
						index: n,
						layer: e,
						parameterPrefix: `fieldGradientLayer${n}`
					});
				}
			}
		});
	}
	return n(e), t;
}
function Je(e) {
	if (e.anchorCount === 0) return "effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);";
	let t = Array.from({ length: e.anchorCount }, (t, n) => `{
        let anchorDirection = normalize(${e.parameterPrefix}AnchorDirection${n});
        let anchorDistance = 1.0 - clamp(dot(fieldDirection, anchorDirection), -1.0, 1.0);
        let fieldSigma = 0.46 / max(${e.parameterPrefix}Power, 0.0001);
        let inverseDistanceWeight = 1.0 / pow(anchorDistance + 0.0005, max(${e.parameterPrefix}Power, 0.0001));
        let gaussianWeight = exp(-(anchorDistance * anchorDistance) / max(2.0 * fieldSigma * fieldSigma, 0.000001));
        let weight = select(inverseDistanceWeight, gaussianWeight, ${e.parameterPrefix}Mode > 0.5);
        weightedColor += ${e.parameterPrefix}AnchorColor${n} * weight;
        weightSum += weight;
      }`).join("\n");
	return `{
    let warpAmplitude = clamp(${e.parameterPrefix}Amplitude, 0.0, 0.6);
    let warpFrequency = max(${e.parameterPrefix}Frequency, 0.0001);
    ${F("fieldDirection", "vec3<f32>", "direction")}
    let warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      let warpX = sin((direction.y * warpFrequency + 0.23) * ${P(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${P(Math.PI * 2)});
      let warpY = cos((direction.z * warpFrequency + 0.17) * ${P(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${P(Math.PI * 2)});
      let warpZ = sin((direction.x * warpFrequency - 0.31) * ${P(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${P(Math.PI * 2)});
      fieldDirection = normalize(direction + vec3<f32>(warpX, warpY, warpZ) * warpScale);
    }
    ${F("weightedColor", "vec3<f32>", "vec3<f32>(0.0)")}
    ${F("weightSum", "f32", "0.0")}
    ${t}
    if (weightSum > 0.0) {
      effectColor = vec4<f32>(weightedColor / weightSum, 1.0);
    } else {
      effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
var Ye = {
	collect: qe,
	createParameterDeclarations: (e) => e.flatMap((e) => [
		`,
      ${e.parameterPrefix}Amplitude: f32`,
		`,
      ${e.parameterPrefix}Frequency: f32`,
		`,
      ${e.parameterPrefix}Mode: f32`,
		`,
      ${e.parameterPrefix}Power: f32`,
		...Array.from({ length: e.anchorCount }, (t, n) => [`,
      ${e.parameterPrefix}AnchorDirection${n}: vec3<f32>`, `,
      ${e.parameterPrefix}AnchorColor${n}: vec3<f32>`]).flat()
	]).join(""),
	createSampleExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id);
		return r ? Je(r) : L();
	},
	createSampleParameters: (e, t) => Object.fromEntries(e.flatMap((e) => {
		let n = t[e.index];
		return [
			[`${e.parameterPrefix}Amplitude`, n.amplitude],
			[`${e.parameterPrefix}Frequency`, n.frequency],
			[`${e.parameterPrefix}Mode`, n.mode],
			[`${e.parameterPrefix}Power`, n.power],
			...Array.from({ length: e.anchorCount }, (t, r) => [[`${e.parameterPrefix}AnchorDirection${r}`, n.anchors[r].direction], [`${e.parameterPrefix}AnchorColor${r}`, n.anchors[r].color]]).flat()
		];
	})),
	createUniforms: Ge,
	getTopologyKey: (e) => ({ anchorCount: e.params.anchors.length }),
	type: "field-gradient",
	updateUniforms: Ke
};
v({
	type: "field-gradient",
	sampleCpu: (e, t) => He(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Ye,
	getTopologyKey: (e) => Ye.getTopologyKey(e)
});
//#endregion
//#region src/image-placement-transform.ts
var V = [
	0,
	1,
	0
], Xe = [
	0,
	0,
	-1
], Ze = [
	1,
	0,
	0
], Qe = [
	0,
	1,
	0
], $e = 89.9;
function et(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function tt(e) {
	return e * Math.PI / 180;
}
function nt(e) {
	return e * 180 / Math.PI;
}
function rt(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function it(e) {
	return (Math.round(e) % 360 + 360) % 360;
}
function H(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function at(e, t) {
	return [
		e[0] - t[0],
		e[1] - t[1],
		e[2] - t[2]
	];
}
function U(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function ot(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function st(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function W(e, t = Xe) {
	if (Array.isArray(e) && e.length === 3 && e.every((e) => typeof e == "number" && Number.isFinite(e))) {
		let t = Math.hypot(e[0], e[1], e[2]);
		if (t > 1e-6) return [
			e[0] / t,
			e[1] / t,
			e[2] / t
		];
	}
	return t;
}
function ct(e, t, n) {
	let r = tt(n), i = Math.cos(r), a = Math.sin(r), o = W(t);
	return W(ot(ot(U(e, i), U(st(o, e), a)), U(o, H(o, e) * (1 - i))), e);
}
function lt(e, t = V, n = 0) {
	let r = W(e), i = at(W(t, V), U(r, H(W(t, V), r)));
	if (Math.hypot(i[0], i[1], i[2]) < 1e-6) {
		let e = Math.abs(r[1]) > .98 ? [
			0,
			0,
			1
		] : V;
		i = at(e, U(r, H(e, r)));
	}
	return i = W(i, Qe), {
		tangentX: ct(W(st(r, i), Ze), r, n),
		tangentY: ct(i, r, n)
	};
}
function ut({ angularHeight: e, angularWidth: t, baseAngularHeight: n, baseAngularWidth: r, centerDirection: i, rotation: a = 0, upDirection: o = V }) {
	let s = W(i), c = it(a), { tangentX: l, tangentY: u } = lt(s, o, c), d = Math.max(1e-4, e), f = Math.max(1e-4, t);
	return {
		angularHeight: d,
		angularWidth: f,
		baseAngularHeight: Math.max(1e-4, n ?? d),
		baseAngularWidth: Math.max(1e-4, r ?? f),
		centerDirection: s,
		projection: "angular-decal",
		rotation: c,
		tangentX: l,
		tangentY: u
	};
}
function G(e) {
	let t = e, n = W(t?.centerDirection ?? t?.normal ?? t?.center, Xe), r = Array.isArray(t?.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, i = typeof t?.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t?.width ?? .4) / (2 * r)), a = typeof t?.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t?.height ?? .3) / (2 * r));
	return ut({
		angularHeight: a,
		angularWidth: i,
		baseAngularHeight: typeof t?.baseAngularHeight == "number" ? t.baseAngularHeight : a,
		baseAngularWidth: typeof t?.baseAngularWidth == "number" ? t.baseAngularWidth : i,
		centerDirection: n,
		rotation: typeof t?.rotation == "number" ? t.rotation : 0
	});
}
function dt(e) {
	let t = W(e.centerDirection);
	return {
		x: rt(nt(Math.atan2(t[0], -t[2]))),
		y: nt(Math.asin(et(t[1], -1, 1)))
	};
}
function ft(e) {
	let t = tt(e.x), n = tt(et(e.y, -89.9, $e)), r = Math.cos(n);
	return W([
		Math.sin(t) * r,
		Math.sin(n),
		-Math.cos(t) * r
	]);
}
function pt(e, t, n) {
	let r = G(e);
	return ut({
		angularHeight: r.angularHeight,
		angularWidth: r.angularWidth,
		baseAngularHeight: r.baseAngularHeight,
		baseAngularWidth: r.baseAngularWidth,
		centerDirection: ft(t),
		rotation: r.rotation,
		upDirection: n?.upDirection
	});
}
function mt(e) {
	let t = G(e);
	return {
		x: t.angularWidth / t.baseAngularWidth,
		y: t.angularHeight / t.baseAngularHeight
	};
}
function ht(e, t) {
	let n = G(e);
	return {
		...n,
		angularHeight: Math.max(1e-4, n.baseAngularHeight * Math.max(1e-4, t.y)),
		angularWidth: Math.max(1e-4, n.baseAngularWidth * Math.max(1e-4, t.x))
	};
}
function gt(e) {
	return G(e).rotation;
}
function _t(e, t) {
	let n = G(e);
	return ut({
		angularHeight: n.angularHeight,
		angularWidth: n.angularWidth,
		baseAngularHeight: n.baseAngularHeight,
		baseAngularWidth: n.baseAngularWidth,
		centerDirection: n.centerDirection,
		rotation: t
	});
}
function vt(e, t) {
	let n = G(t), r = W(e), i = H(r, n.centerDirection);
	if (i <= 0) return null;
	let a = H(r, n.tangentX) / i, o = H(r, n.tangentY) / i, s = Math.tan(n.angularWidth / 2), c = Math.tan(n.angularHeight / 2);
	return s <= 0 || c <= 0 || a < -s || a > s || o < -c || o > c ? null : {
		u: a / (2 * s) + .5,
		v: .5 - o / (2 * c)
	};
}
//#endregion
//#region src/skybox/empty-texture.ts
var K = new T.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, T.RGBAFormat);
K.colorSpace = T.SRGBColorSpace, K.needsUpdate = !0;
//#endregion
//#region src/skybox/overlay.ts
var yt = .18, bt = .75, xt = 1.75, St = 1e-4, Ct = .01;
//#endregion
//#region src/layer-addons/builtins/image.ts
function wt(e, t) {
	let n = t.placement;
	if (!n || !t.pixels || t.width <= 0 || t.height <= 0) return [
		0,
		0,
		0,
		0
	];
	let r = vt(e, n);
	if (!r) return [
		0,
		0,
		0,
		0
	];
	let { u: i, v: a } = r;
	if (i < 0 || i > 1 || a < 0 || a > 1) return [
		0,
		0,
		0,
		0
	];
	let o = i * (t.width - 1), s = a * (t.height - 1), c = Math.floor(o), l = Math.floor(s), u = c + 1, d = l + 1, f = o - c, m = s - l;
	return p(p(w(t, c, l), w(t, u, l), f), p(w(t, c, d), w(t, u, d), f), m);
}
function Tt(e) {
	if (!e) return {
		centerDirection: new T.Vector3(0, 0, -1),
		halfSize: new T.Vector2(0, 0),
		tangentX: new T.Vector3(1, 0, 0),
		tangentY: new T.Vector3(0, 1, 0)
	};
	let t = G(e);
	return {
		centerDirection: new T.Vector3(...t.centerDirection),
		halfSize: new T.Vector2(Math.max(0, Math.tan(t.angularWidth / 2)), Math.max(0, Math.tan(t.angularHeight / 2))),
		tangentX: new T.Vector3(...t.tangentX),
		tangentY: new T.Vector3(...t.tangentY)
	};
}
function Et(e) {
	return e.map((e) => {
		let t = Tt(e.layer.params.placement);
		return {
			centerDirection: k(t.centerDirection),
			halfSize: k(t.halfSize),
			layerId: e.layer.id,
			tangentX: k(t.tangentX),
			tangentY: k(t.tangentY)
		};
	});
}
function Dt(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = Tt(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function Ot(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function kt(e) {
	let t = [];
	function n(e) {
		e.forEach((e) => {
			if (e.enabled) {
				if (e.type === "group") {
					n(e.children);
					return;
				}
				if (e.type === "image") {
					let n = t.length;
					t.push({
						index: n,
						layer: e,
						parameterName: `imageLayer${n}`
					});
				}
			}
		});
	}
	return n(e), t;
}
function At(e, t) {
	let { width: n, height: r } = e.layer.params;
	return n <= 0 || r <= 0 ? "return vec4<f32>(0.0, 0.0, 0.0, 0.0);" : `
      let imageDirection = normalize(direction);
      let imageDenom = dot(imageDirection, ${t.centerDirection});
      let safeImageDenom = max(imageDenom, 0.000001);
      let projectedX = dot(imageDirection, ${t.tangentX}) / safeImageDenom;
      let projectedY = dot(imageDirection, ${t.tangentY}) / safeImageDenom;
      let imageU = projectedX / max(${t.halfSize}.x * 2.0, 0.000001) + 0.5;
      let imageV = 0.5 - projectedY / max(${t.halfSize}.y * 2.0, 0.000001);
      let imageEdgeDistance = min(min(imageU, 1.0 - imageU), min(imageV, 1.0 - imageV));
      let imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${P(Ct)});
      let imageHardInside = step(${P(St)}, imageDenom) *
        step(0.0, ${t.halfSize}.x) *
        step(0.0, ${t.halfSize}.y);
      let imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      let imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return vec4<f32>(imageU, imageV, imageValid, 0.0);
    `;
}
function jt(e) {
	return A(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${At(e, {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var Mt = A("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n");
function Nt(e, t) {
	return e.get(t.id) ?? K;
}
function Pt(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? K;
	});
}
function Ft(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	return {
		sampleData: i,
		sampleNodes: Object.fromEntries(e.map((e) => {
			let a = r[e.index], o = jt(e)({
				direction: t,
				imageCenterDirection: a.centerDirection,
				imageHalfSize: a.halfSize,
				imageTangentX: a.tangentX,
				imageTangentY: a.tangentY
			}), s = he(o.x, o.y), c = O(Nt(n, e.layer), s).setName(`imageTexture${e.index}`);
			c.getUniformHash = () => `skybox-image-texture:${e.layer.id}`;
			let l = Mt({
				color: c,
				valid: o.z
			});
			return i.set(e.layer.id, {
				sampleInfo: o,
				sampleNode: l,
				textureNode: c
			}), [e.parameterName, l];
		}))
	};
}
var It = {
	collect: kt,
	createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
	createSampleExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id);
		return r ? `effectColor = ${r.parameterName};` : L();
	},
	createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, uniforms: r }) => {
		let i = Ft(e, t, n, r);
		return {
			editorProjectionByLayerId: new Map(Array.from(i.sampleData.entries()).map(([e, t]) => [e, {
				uv: he(t.sampleInfo.x, t.sampleInfo.y),
				valid: t.sampleInfo.z
			}])),
			sampleData: i.sampleData,
			sampleNodesByLayerId: Object.fromEntries(e.map((e) => [e.layer.id, i.sampleNodes[e.parameterName]])),
			sampleNodesByParameterName: i.sampleNodes,
			textureSlots: Object.fromEntries(Array.from(i.sampleData.entries()).map(([e, t]) => [e, t.textureNode]))
		};
	},
	createSampleParameters: (e, t, n) => n?.sampleNodesByParameterName ?? {},
	createUniforms: Et,
	getTopologyKey: (e) => ({
		hasPlacement: !!e.params.placement,
		hasSrc: !!e.params.src,
		height: e.params.height,
		width: e.params.width
	}),
	type: "image",
	updateUniforms: (e, t) => Dt(e, t.id, t.params.placement)
};
v({
	type: "image",
	sampleCpu: (e, t) => wt(e, t),
	updateLive: (e, t) => e.applyImagePlacement(t.id, t.params.placement),
	wgsl: It,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => It.getTopologyKey(e)
});
//#endregion
//#region src/spot-transform.ts
var Lt = Math.PI / 12;
function q(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Rt(e) {
	return e * 180 / Math.PI;
}
function zt(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Bt() {
	return {
		angularRadius: Lt,
		baseAngularRadius: Lt,
		brightness: 1,
		centerDirection: [
			0,
			0,
			-1
		],
		colorMode: "light",
		coreRadius: .16,
		coreSoftness: 2.25,
		dispersion: .88,
		dogSpread: .055,
		dogStrength: .64,
		dogStretch: .18,
		glareSize: .34,
		glareStrength: .48,
		glow: .5,
		glowSize: .55,
		glowStrength: .35,
		halo: .25,
		haloInnerWidth: .014,
		haloOuterWidth: .07,
		haloRadius: .42,
		haloStrength: .58,
		lightColor: "#ffffff",
		stops: [{
			color: "#ffffff",
			location: 0,
			midpoint: 50,
			opacity: 100
		}, {
			color: "#ffffff",
			location: 100,
			midpoint: 50,
			opacity: 0
		}]
	};
}
function J(e) {
	let t = e, n = Bt(), r = Math.max(1e-4, typeof t?.baseAngularRadius == "number" ? t.baseAngularRadius : n.baseAngularRadius);
	return {
		angularRadius: Math.max(1e-4, typeof t?.angularRadius == "number" ? t.angularRadius : r),
		baseAngularRadius: r,
		brightness: Math.max(0, typeof t?.brightness == "number" ? t.brightness : n.brightness),
		centerDirection: W(t?.centerDirection, n.centerDirection),
		colorMode: t?.colorMode === "gradient" ? "gradient" : "light",
		coreRadius: q(typeof t?.coreRadius == "number" ? t.coreRadius : n.coreRadius, .01, .7),
		coreSoftness: q(typeof t?.coreSoftness == "number" ? t.coreSoftness : n.coreSoftness, .4, 6),
		dispersion: q(typeof t?.dispersion == "number" ? t.dispersion : n.dispersion, 0, 1),
		dogSpread: q(typeof t?.dogSpread == "number" ? t.dogSpread : n.dogSpread, .015, .18),
		dogStrength: q(typeof t?.dogStrength == "number" ? t.dogStrength : n.dogStrength, 0, 1.8),
		dogStretch: q(typeof t?.dogStretch == "number" ? t.dogStretch : n.dogStretch, 0, .55),
		glareSize: q(typeof t?.glareSize == "number" ? t.glareSize : n.glareSize, .03, 1.1),
		glareStrength: q(typeof t?.glareStrength == "number" ? t.glareStrength : n.glareStrength, 0, 1.4),
		glow: q(typeof t?.glow == "number" ? t.glow : n.glow, 0, 1),
		glowSize: q(typeof t?.glowSize == "number" ? t.glowSize : n.glowSize, .05, 1.4),
		glowStrength: q(typeof t?.glowStrength == "number" ? t.glowStrength : n.glowStrength, 0, 1),
		halo: q(typeof t?.halo == "number" ? t.halo : n.halo, 0, 1),
		haloInnerWidth: q(typeof t?.haloInnerWidth == "number" ? t.haloInnerWidth : n.haloInnerWidth, .003, .09),
		haloOuterWidth: q(typeof t?.haloOuterWidth == "number" ? t.haloOuterWidth : n.haloOuterWidth, .01, .24),
		haloRadius: q(typeof t?.haloRadius == "number" ? t.haloRadius : n.haloRadius, .04, 1),
		haloStrength: q(typeof t?.haloStrength == "number" ? t.haloStrength : n.haloStrength, 0, 1.4),
		lightColor: typeof t?.lightColor == "string" ? t.lightColor : n.lightColor,
		stops: (t?.stops?.length ? t.stops : n.stops).map((e) => ({
			color: e.color,
			location: q(e.location, 0, 100),
			midpoint: q(e.midpoint ?? 50, 1, 99),
			opacity: q(e.opacity, 0, 100)
		}))
	};
}
function Vt(e) {
	let t = W(e.centerDirection);
	return {
		x: zt(Rt(Math.atan2(t[0], -t[2]))),
		y: Rt(Math.asin(q(t[1], -1, 1)))
	};
}
function Ht(e, t) {
	return {
		...J(e),
		centerDirection: ft({
			x: t.x,
			y: q(t.y, -$e, $e)
		})
	};
}
function Ut(e) {
	let t = J(e);
	return t.angularRadius / t.baseAngularRadius;
}
function Wt(e, t) {
	let n = J(e);
	return {
		...n,
		angularRadius: Math.max(1e-4, n.baseAngularRadius * Math.max(1e-4, t))
	};
}
function Gt(e, t) {
	let n = J(t), r = W(e), i = W(n.centerDirection), a = r[0] * i[0] + r[1] * i[1] + r[2] * i[2];
	return Math.acos(q(a, -1, 1)) <= n.angularRadius;
}
//#endregion
//#region src/skybox/editor-presentation.ts
var Kt = {
	hoveredLayerId: null,
	selectedLayerId: null
};
function qt(e, t) {
	return +(t === e);
}
function Jt(e, t) {
	return +(t === e);
}
function Yt(e, t) {
	return Math.max(qt(e, t.hoveredLayerId), Jt(e, t.selectedLayerId));
}
function Xt(e, t) {
	return e.map((e) => ({
		active: k(Yt(e.layer.id, t)),
		layerId: e.layer.id
	}));
}
function Zt(e, t) {
	e.forEach((e) => {
		e.active.value = Yt(e.layerId, t);
	});
}
function Qt(e, t) {
	e.userData.applyEditorLayerState = t;
}
var $t = A(`
  fn skyboxStudioApplyImageEditorRectOverlay(
    color: vec4<f32>,
    uv: vec2<f32>,
    valid: f32,
    activeValue: f32
  ) -> vec4<f32> {
    let activeAmount = clamp(activeValue, 0.0, 1.0);
    let rectCoverage = valid * activeAmount;
    let edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${P(Ct)});
    let bounds = rectCoverage * (
      1.0 - smoothstep(
        edgeWidth * ${P(bt)},
        edgeWidth * ${P(xt)},
        edgeDistance
      )
    );
    let rectAlpha = rectCoverage * ${P(yt)};
    let overlayAlpha = max(rectAlpha, bounds);
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), overlayAlpha),
      color.a
    );
  }
`), en = A(`
  fn skyboxStudioSpotEditorRectInfo(
    direction: vec3<f32>,
    spotCenterDirection: vec3<f32>,
    spotRadius: f32
  ) -> vec4<f32> {
    let spotDirection = normalize(direction);
    let spotCenter = normalize(spotCenterDirection);
    let spotTangentX = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), spotCenter));
    let spotTangentY = normalize(cross(spotCenter, spotTangentX));
    let spotDenom = dot(spotDirection, spotCenter);
    let safeSpotDenom = max(spotDenom, 0.000001);
    let spotLocalX = dot(spotDirection, spotTangentX) / safeSpotDenom / max(spotRadius, 0.0001);
    let spotLocalY = dot(spotDirection, spotTangentY) / safeSpotDenom / max(spotRadius, 0.0001);
    let spotU = spotLocalX * 0.5 + 0.5;
    let spotV = 0.5 - spotLocalY * 0.5;
    let spotEdgeDistance = min(min(spotU, 1.0 - spotU), min(spotV, 1.0 - spotV));
    let spotEdgeWidth = clamp(fwidth(spotEdgeDistance), 0.000001, ${P(Ct)});
    let spotValid = step(${P(St)}, spotDenom) *
      step(-spotEdgeWidth, spotEdgeDistance) *
      smoothstep(-spotEdgeWidth, spotEdgeWidth, spotEdgeDistance);

    return vec4<f32>(spotU, spotV, spotValid, 0.0);
  }
`);
//#endregion
//#region src/layer-addons/builtins/spot.ts
function tn(e, i) {
	let s = J(i), c = r(e), u = r(s.centerDirection), f = t(c, u), p = Math.acos(y(f, -1, 1)), m = Math.max(s.angularRadius, 1e-4), te = p / m;
	if (s.colorMode === "gradient") return te > 1 ? [
		0,
		0,
		0,
		0
	] : h(o(s.stops), te);
	let v = l(e, u, m), b = v.d, ne = S(s.lightColor), re = s.brightness, ie = y(1 - b / s.coreRadius) ** +s.coreSoftness, oe = y(1 - b / s.glowSize) ** 2 * s.glowStrength, se = y(1 - b / s.glareSize) ** 1.15 * s.glareStrength, x = (ie + oe + se) * re, C = _(ne, x);
	C = n(C, [
		Math.max(x - 1, 0),
		Math.max(x - 1, 0),
		Math.max(x - 1, 0)
	]);
	let ce = Math.max(s.haloInnerWidth, 1e-4), w = Math.max(s.haloOuterWidth, 1e-4), T = b - s.haloRadius, E = Math.exp(-ee(T / (T < 0 ? ce : w))), le = ae(d([
		1,
		1,
		1
	], g(y((b - (s.haloRadius - ce)) / (ce + w))), s.dispersion), ne), ue = E * s.haloStrength * re;
	C = n(C, _(le, ue)), C = n(C, _([
		1,
		1,
		1
	], Math.max(ue - 1.2, 0) * .22));
	let de = Math.abs(v.y), D = Math.abs(v.x), fe = Math.exp(-ee((D - s.haloRadius) / Math.max(s.dogSpread, 1e-4))) * Math.exp(-ee(de / Math.max(s.dogSpread * .72, 1e-4))), pe = a(s.haloRadius, s.haloRadius + Math.max(s.dogStretch, 1e-4), D) * (1 - a(s.haloRadius + Math.max(s.dogStretch, 1e-4), s.haloRadius + Math.max(s.dogStretch * 2.2, 1e-4), D)) * Math.exp(-ee(de / Math.max(s.dogSpread * .9, 1e-4))), me = ae(d([
		1,
		1,
		1
	], g(y((D - (s.haloRadius - s.dogSpread * 1.4)) / Math.max(s.dogSpread * 3.5, 1e-4))), s.dispersion), ne), O = (fe + pe * .28) * s.dogStrength * re;
	C = n(C, _(me, O)), C = n(C, _([
		1,
		1,
		1
	], Math.max(O - 1.1, 0) * .18));
	let k = y(Math.max(C[0], C[1], C[2]));
	return k <= 1e-5 ? [
		0,
		0,
		0,
		0
	] : [
		C[0] / k,
		C[1] / k,
		C[2] / k,
		k
	];
}
function nn(e) {
	return +(e === "gradient");
}
function rn(e) {
	let t = J(e);
	return {
		brightness: Math.max(0, t.brightness),
		centerDirection: new T.Vector3(...t.centerDirection).normalize(),
		coreRadius: t.coreRadius,
		coreSoftness: t.coreSoftness,
		dispersion: t.dispersion,
		dogSpread: t.dogSpread,
		dogStrength: t.dogStrength,
		dogStretch: t.dogStretch,
		glareSize: t.glareSize,
		glareStrength: t.glareStrength,
		glowSize: t.glowSize,
		glowStrength: t.glowStrength,
		haloInnerWidth: t.haloInnerWidth,
		haloOuterWidth: t.haloOuterWidth,
		haloRadius: t.haloRadius,
		haloStrength: t.haloStrength,
		lightColor: N(t.lightColor),
		mode: nn(t.colorMode),
		radius: Math.max(1e-4, t.angularRadius),
		stops: Ne(t)
	};
}
function an(e) {
	return e.map((e) => {
		let t = rn(e.layer.params);
		return {
			brightness: k(t.brightness),
			centerDirection: k(t.centerDirection),
			coreRadius: k(t.coreRadius),
			coreSoftness: k(t.coreSoftness),
			dispersion: k(t.dispersion),
			dogSpread: k(t.dogSpread),
			dogStrength: k(t.dogStrength),
			dogStretch: k(t.dogStretch),
			glareSize: k(t.glareSize),
			glareStrength: k(t.glareStrength),
			glowSize: k(t.glowSize),
			glowStrength: k(t.glowStrength),
			haloInnerWidth: k(t.haloInnerWidth),
			haloOuterWidth: k(t.haloOuterWidth),
			haloRadius: k(t.haloRadius),
			haloStrength: k(t.haloStrength),
			layerId: e.layer.id,
			lightColor: k(t.lightColor),
			mode: k(t.mode),
			radius: k(t.radius),
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t.stops[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: k(B(r)),
					midpoint: k(r.midpoint),
					t: k(r.t)
				};
			})
		};
	});
}
function on(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = rn(t.params);
	n.brightness.value = r.brightness, n.centerDirection.value.copy(r.centerDirection), n.coreRadius.value = r.coreRadius, n.coreSoftness.value = r.coreSoftness, n.dispersion.value = r.dispersion, n.dogSpread.value = r.dogSpread, n.dogStrength.value = r.dogStrength, n.dogStretch.value = r.dogStretch, n.glareSize.value = r.glareSize, n.glareStrength.value = r.glareStrength, n.glowSize.value = r.glowSize, n.glowStrength.value = r.glowStrength, n.haloInnerWidth.value = r.haloInnerWidth, n.haloOuterWidth.value = r.haloOuterWidth, n.haloRadius.value = r.haloRadius, n.haloStrength.value = r.haloStrength, n.lightColor.value.copy(r.lightColor), n.mode.value = r.mode, n.radius.value = r.radius, n.stops.forEach((e, t) => {
		let n = r.stops[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(B(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function sn(e) {
	let t = [];
	function n(e) {
		e.forEach((e) => {
			if (e.enabled) {
				if (e.type === "group") {
					n(e.children);
					return;
				}
				if (e.type === "spot") {
					let n = t.length;
					t.push({
						index: n,
						layer: e,
						parameterPrefix: `spotLayer${n}`,
						stopCount: e.params.stops.length
					});
				}
			}
		});
	}
	return n(e), t;
}
function cn(e) {
	let t = Array.from({ length: Math.max(0, e.stopCount - 1) }, (t, n) => {
		let r = `${e.parameterPrefix}StopT${n}`, i = `${e.parameterPrefix}StopT${n + 1}`, a = `spotLocalT${n}`, o = `spotSegmentMidpoint${n}`, s = `spotMidpointT${n}`, c = `${e.parameterPrefix}StopMidpoint${n}`, l = `${a} / max(${o} * 2.0, 0.00001)`, u = `select(${`0.5 + (${a} - ${o}) / max((1.0 - ${o}) * 2.0, 0.00001)`}, ${l}, ${a} <= ${o})`;
		return `${n === 0 ? "if" : "else if"} (spotT <= ${i}) {
        let ${a}: f32 = clamp((spotT - ${r}) / max(${i} - ${r}, 0.00001), 0.0, 1.0);
        let ${o}: f32 = clamp(${c}, 0.01, 0.99);
        let ${s}: f32 = ${u};
        effectColor = mix(${e.parameterPrefix}StopColor${n}, ${e.parameterPrefix}StopColor${n + 1}, ${s});
      }`;
	}), n = Math.max(0, e.stopCount - 1);
	return e.stopCount === 0 ? "" : `if (spotT <= 1.0) {
      ${t.join("\n")}
      ${t.length > 0 ? "else" : ""} {
        effectColor = ${e.parameterPrefix}StopColor${n};
      }
    }`;
}
function ln(e) {
	let t = `${e.parameterPrefix}Mode > 0.5`, n = cn(e);
	return `{
    let spotCenter = normalize(${e.parameterPrefix}CenterDirection);
    let spotDot = clamp(dot(normalize(direction), spotCenter), -1.0, 1.0);
    let spotT = acos(spotDot) / max(${e.parameterPrefix}Radius, 0.0001);
    if (${t}) {
      ${n || "effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);"}
    } else {
      let spotTangentX = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), spotCenter));
      let spotTangentY = normalize(cross(spotCenter, spotTangentX));
      let spotDenom = max(dot(normalize(direction), spotCenter), 0.000001);
      let spotLocalX = dot(normalize(direction), spotTangentX) / spotDenom / max(${e.parameterPrefix}Radius, 0.0001);
      let spotLocalY = dot(normalize(direction), spotTangentY) / spotDenom / max(${e.parameterPrefix}Radius, 0.0001);
      let spotD = length(vec2<f32>(spotLocalX, spotLocalY));

      let spotCore = pow(clamp(1.0 - spotD / ${e.parameterPrefix}CoreRadius, 0.0, 1.0), ${e.parameterPrefix}CoreSoftness);
      let spotGlow = pow(clamp(1.0 - spotD / ${e.parameterPrefix}GlowSize, 0.0, 1.0), 2.0) * ${e.parameterPrefix}GlowStrength;
      let spotGlare = pow(clamp(1.0 - spotD / ${e.parameterPrefix}GlareSize, 0.0, 1.0), 1.15) * ${e.parameterPrefix}GlareStrength;
      let spotMonoLight = (spotCore + spotGlow + spotGlare) * ${e.parameterPrefix}Brightness;
      ${F("spotColor", "vec3<f32>", `${e.parameterPrefix}LightColor * spotMonoLight + vec3<f32>(max(spotMonoLight - 1.0, 0.0))`)}

      let spotHaloInner = max(${e.parameterPrefix}HaloInnerWidth, 0.0001);
      let spotHaloOuter = max(${e.parameterPrefix}HaloOuterWidth, 0.0001);
      let spotHaloDelta = spotD - ${e.parameterPrefix}HaloRadius;
      let spotHaloWidth = select(spotHaloOuter, spotHaloInner, spotHaloDelta < 0.0);
      let spotHaloEnvelope = exp(-pow(spotHaloDelta / spotHaloWidth, 2.0));
      let spotHaloT = clamp((spotD - (${e.parameterPrefix}HaloRadius - spotHaloInner)) / (spotHaloInner + spotHaloOuter), 0.0, 1.0);
      ${F("spotSpectrum", "vec3<f32>", "vec3<f32>(1.0, 0.12, 0.05)")}
      spotSpectrum = mix(spotSpectrum, vec3<f32>(1.0, 0.55, 0.10), smoothstep(0.00, 0.28, spotHaloT));
      spotSpectrum = mix(spotSpectrum, vec3<f32>(1.0, 0.93, 0.60), smoothstep(0.22, 0.45, spotHaloT));
      spotSpectrum = mix(spotSpectrum, vec3<f32>(1.0), smoothstep(0.42, 0.60, spotHaloT));
      spotSpectrum = mix(spotSpectrum, vec3<f32>(0.55, 0.80, 1.0), smoothstep(0.62, 0.85, spotHaloT));
      spotSpectrum = mix(spotSpectrum, vec3<f32>(0.35, 0.50, 1.0), smoothstep(0.85, 1.00, spotHaloT));
      let spotHaloLayerColor = mix(vec3<f32>(1.0), spotSpectrum, ${e.parameterPrefix}Dispersion);
      let spotHaloTinted = spotHaloLayerColor * mix(vec3<f32>(1.0), ${e.parameterPrefix}LightColor, 0.82);
      let spotHaloColor = mix(${e.parameterPrefix}LightColor, spotHaloTinted, 0.82);
      let spotHaloLight = spotHaloEnvelope * ${e.parameterPrefix}HaloStrength * ${e.parameterPrefix}Brightness;
      spotColor += spotHaloColor * spotHaloLight + vec3<f32>(max(spotHaloLight - 1.2, 0.0) * 0.22);

      let spotAxisDistance = abs(spotLocalY);
      let spotDogX = abs(spotLocalX);
      let spotDogBody = exp(-pow((spotDogX - ${e.parameterPrefix}HaloRadius) / max(${e.parameterPrefix}DogSpread, 0.0001), 2.0)) *
        exp(-pow(spotAxisDistance / max(${e.parameterPrefix}DogSpread * 0.72, 0.0001), 2.0));
      let spotDogTail = smoothstep(${e.parameterPrefix}HaloRadius, ${e.parameterPrefix}HaloRadius + max(${e.parameterPrefix}DogStretch, 0.0001), spotDogX) *
        (1.0 - smoothstep(${e.parameterPrefix}HaloRadius + max(${e.parameterPrefix}DogStretch, 0.0001), ${e.parameterPrefix}HaloRadius + max(${e.parameterPrefix}DogStretch * 2.2, 0.0001), spotDogX)) *
        exp(-pow(spotAxisDistance / max(${e.parameterPrefix}DogSpread * 0.9, 0.0001), 2.0));
      let spotDogT = clamp((spotDogX - (${e.parameterPrefix}HaloRadius - ${e.parameterPrefix}DogSpread * 1.4)) / max(${e.parameterPrefix}DogSpread * 3.5, 0.0001), 0.0, 1.0);
      ${F("spotDogSpectrum", "vec3<f32>", "vec3<f32>(1.0, 0.12, 0.05)")}
      spotDogSpectrum = mix(spotDogSpectrum, vec3<f32>(1.0, 0.55, 0.10), smoothstep(0.00, 0.28, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, vec3<f32>(1.0, 0.93, 0.60), smoothstep(0.22, 0.45, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, vec3<f32>(1.0), smoothstep(0.42, 0.60, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, vec3<f32>(0.55, 0.80, 1.0), smoothstep(0.62, 0.85, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, vec3<f32>(0.35, 0.50, 1.0), smoothstep(0.85, 1.00, spotDogT));
      let spotDogLayerColor = mix(vec3<f32>(1.0), spotDogSpectrum, ${e.parameterPrefix}Dispersion);
      let spotDogTinted = spotDogLayerColor * mix(vec3<f32>(1.0), ${e.parameterPrefix}LightColor, 0.82);
      let spotDogColor = mix(${e.parameterPrefix}LightColor, spotDogTinted, 0.82);
      let spotDogLight = (spotDogBody + spotDogTail * 0.28) * ${e.parameterPrefix}DogStrength * ${e.parameterPrefix}Brightness;
      spotColor += spotDogColor * spotDogLight + vec3<f32>(max(spotDogLight - 1.1, 0.0) * 0.18);

      let spotAlpha = clamp(max(max(spotColor.r, spotColor.g), spotColor.b), 0.0, 1.0);
      effectColor = vec4<f32>(spotColor / max(spotAlpha, 0.00001), spotAlpha);
    }
  }`;
}
var un = {
	collect: sn,
	createParameterDeclarations: (e) => e.flatMap((e) => [
		`,
      ${e.parameterPrefix}CenterDirection: vec3<f32>`,
		`,
      ${e.parameterPrefix}Radius: f32`,
		`,
      ${e.parameterPrefix}Mode: f32`,
		`,
      ${e.parameterPrefix}LightColor: vec3<f32>`,
		`,
      ${e.parameterPrefix}Brightness: f32`,
		`,
      ${e.parameterPrefix}CoreRadius: f32`,
		`,
      ${e.parameterPrefix}CoreSoftness: f32`,
		`,
      ${e.parameterPrefix}Dispersion: f32`,
		`,
      ${e.parameterPrefix}DogSpread: f32`,
		`,
      ${e.parameterPrefix}DogStrength: f32`,
		`,
      ${e.parameterPrefix}DogStretch: f32`,
		`,
      ${e.parameterPrefix}GlareSize: f32`,
		`,
      ${e.parameterPrefix}GlareStrength: f32`,
		`,
      ${e.parameterPrefix}GlowSize: f32`,
		`,
      ${e.parameterPrefix}GlowStrength: f32`,
		`,
      ${e.parameterPrefix}HaloInnerWidth: f32`,
		`,
      ${e.parameterPrefix}HaloOuterWidth: f32`,
		`,
      ${e.parameterPrefix}HaloRadius: f32`,
		`,
      ${e.parameterPrefix}HaloStrength: f32`,
		...Array.from({ length: e.stopCount }, (t, n) => [
			`,
      ${e.parameterPrefix}StopColor${n}: vec4<f32>`,
			`,
      ${e.parameterPrefix}StopMidpoint${n}: f32`,
			`,
      ${e.parameterPrefix}StopT${n}: f32`
		]).flat()
	]).join(""),
	createSampleExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id);
		return r ? ln(r) : L();
	},
	createSampleNodes: ({ bindings: e, direction: t, uniforms: n }) => ({ editorProjectionByLayerId: new Map(e.map((e) => {
		let r = n[e.index], i = en({
			direction: t,
			spotCenterDirection: r.centerDirection,
			spotRadius: r.radius
		});
		return [e.layer.id, {
			uv: he(i.x, i.y),
			valid: i.z
		}];
	})) }),
	createSampleParameters: (e, t) => Object.fromEntries(e.flatMap((e) => {
		let n = t[e.index];
		return [
			[`${e.parameterPrefix}CenterDirection`, n.centerDirection],
			[`${e.parameterPrefix}Radius`, n.radius],
			[`${e.parameterPrefix}Mode`, n.mode],
			[`${e.parameterPrefix}LightColor`, n.lightColor],
			[`${e.parameterPrefix}Brightness`, n.brightness],
			[`${e.parameterPrefix}CoreRadius`, n.coreRadius],
			[`${e.parameterPrefix}CoreSoftness`, n.coreSoftness],
			[`${e.parameterPrefix}Dispersion`, n.dispersion],
			[`${e.parameterPrefix}DogSpread`, n.dogSpread],
			[`${e.parameterPrefix}DogStrength`, n.dogStrength],
			[`${e.parameterPrefix}DogStretch`, n.dogStretch],
			[`${e.parameterPrefix}GlareSize`, n.glareSize],
			[`${e.parameterPrefix}GlareStrength`, n.glareStrength],
			[`${e.parameterPrefix}GlowSize`, n.glowSize],
			[`${e.parameterPrefix}GlowStrength`, n.glowStrength],
			[`${e.parameterPrefix}HaloInnerWidth`, n.haloInnerWidth],
			[`${e.parameterPrefix}HaloOuterWidth`, n.haloOuterWidth],
			[`${e.parameterPrefix}HaloRadius`, n.haloRadius],
			[`${e.parameterPrefix}HaloStrength`, n.haloStrength],
			...Array.from({ length: e.stopCount }, (t, r) => [
				[`${e.parameterPrefix}StopColor${r}`, n.stops[r].color],
				[`${e.parameterPrefix}StopMidpoint${r}`, n.stops[r].midpoint],
				[`${e.parameterPrefix}StopT${r}`, n.stops[r].t]
			]).flat()
		];
	})),
	createUniforms: an,
	getTopologyKey: (e) => ({ stopCount: e.params.stops.length }),
	type: "spot",
	updateUniforms: on
};
v({
	type: "spot",
	sampleCpu: (e, t) => tn(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: un,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => un.getTopologyKey(e)
});
//#endregion
//#region src/layer-addons/builtins/starfield.ts
function dn(e) {
	let t = [];
	function n(e) {
		e.forEach((e) => {
			if (e.enabled) {
				if (e.type === "group") {
					n(e.children);
					return;
				}
				if (e.type === "starfield") {
					let n = t.length;
					t.push({
						index: n,
						layer: e,
						parameterName: `starfieldLayer${n}`
					});
				}
			}
		});
	}
	return n(e), t;
}
function fn(e) {
	e.userData.starfieldRenderTarget || e.dispose();
}
function pn(e, t) {
	return e.get(t.id) ?? K;
}
function mn(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? K;
	});
}
var hn = A("\n  fn skyboxStudioDirectionToSourceStarfieldUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let theta = atan2(normalizedDirection.x, normalizedDirection.z);\n    let u = fract(theta / 6.283185307179586 + 0.5);\n    let v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / 3.141592653589793;\n\n    return vec2<f32>(u, v);\n  }\n");
v({
	type: "starfield",
	updateLive: (e, t) => {
		e.applyLayerParams(t), e.scheduleResourceBake(t.id, t.params);
	},
	wgsl: {
		collect: dn,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : L();
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n }) => {
			let r = n, i = /* @__PURE__ */ new Map(), a = Object.fromEntries(e.map((e) => {
				let n = hn({ direction: t }), a = O(pn(r, e.layer), n).setName(`starfieldTexture${e.index}`);
				return a.getUniformHash = () => `skybox-starfield-texture:${e.layer.id}`, i.set(e.layer.id, {
					sampleNode: a,
					textureNode: a
				}), [e.parameterName, a];
			}));
			return {
				sampleData: i,
				sampleNodesByLayerId: Object.fromEntries(e.map((e) => [e.layer.id, a[e.parameterName]])),
				sampleNodesByParameterName: a,
				textureSlots: Object.fromEntries(Array.from(i.entries()).map(([e, t]) => [e, t.textureNode]))
			};
		},
		createSampleParameters: (e, t, n) => n?.sampleNodesByParameterName ?? {},
		createUniforms: () => [],
		getTopologyKey: () => ({}),
		type: "starfield",
		updateUniforms: () => {}
	},
	getTopologyKey: () => ({})
});
//#endregion
//#region src/evaluator.ts
function gn(e, t, n = {}) {
	let r = c(t.type);
	return r?.sampleCpu ? r.sampleCpu(e, t.params, {
		layerId: t.id,
		sampleHeight: n.sampleHeight,
		starfieldBakes: n.starfieldBakes
	}) : [
		0,
		0,
		0,
		0
	];
}
function _n(t, n, r = {}) {
	return n.filter((e) => e.enabled).reverse().reduce((n, i) => {
		let a = i.type === "group" ? [..._n(t, i.children, r), 1] : gn(t, i, r), o = y(a[3] * (i.opacity / 100));
		return e(n, [
			a[0],
			a[1],
			a[2]
		], o, i.blendMode);
	}, [
		0,
		0,
		0
	]);
}
function vn(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = vn(n.children, t);
		if (e) return e;
	}
	return null;
}
function yn(e, t, n = {}) {
	let r = M(e), i = n.targetGroupId ? vn(r.nodes, n.targetGroupId) : null;
	return _n(t, n.targetGroupId ? i ? [i] : [] : r.nodes, n);
}
//#endregion
//#region src/baking/bake.ts
var bn = 1024, xn = "0.1.0", Sn = /* @__PURE__ */ new Map(), Cn = /* @__PURE__ */ new Map();
function wn(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function Tn(e, t) {
	return ne(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: xn
	}));
}
function En() {
	Sn.clear(), Cn.clear();
}
function Dn(e, t = []) {
	return e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Dn(e.children, t);
				return;
			}
			e.type === "starfield" && t.push(e);
		}
	}), t;
}
function On(e, t) {
	for (let n of e) {
		if (n.type !== "group") continue;
		if (n.id === t) return n;
		let e = On(n.children, t);
		if (e) return e;
	}
	return null;
}
function kn(e, t, n, r, i) {
	let a = Dn(r ? On(e.nodes, r)?.children ?? [] : e.nodes);
	if (a.length === 0) return;
	let o = /* @__PURE__ */ new Map();
	return a.forEach((e) => {
		let r = i?.get(e.id);
		if (r) {
			o.set(e.id, r);
			return;
		}
		let a = oe(e.params, t, n), s = Cn.get(a), c = s ?? b(e.params, t, n);
		s || Cn.set(a, c), o.set(e.id, c);
	}), o;
}
function An(e, t = {}) {
	let n = M(e), r = wn(t), i = r.cache ? Tn(n, r) : null;
	if (i) {
		let e = Sn.get(i);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: a, targetGroupId: o, width: s } = r, c = kn(n, s, a, o, t.starfieldBakes), l = new Uint8ClampedArray(s * a * 4);
	for (let e = 0; e < a; e += 1) {
		let t = (e + .5) / a;
		for (let r = 0; r < s; r += 1) {
			let [i, d, f] = se(yn(n, u((r + .5) / s, t), {
				sampleHeight: a,
				starfieldBakes: c,
				targetGroupId: o
			})), p = (e * s + r) * 4;
			l[p] = i, l[p + 1] = d, l[p + 2] = f, l[p + 3] = 255;
		}
	}
	let d = {
		data: l,
		height: a,
		width: s
	};
	return i && Sn.set(i, {
		...d,
		data: new Uint8ClampedArray(l)
	}), d;
}
//#endregion
//#region src/skybox/composition.ts
function jn(e) {
	return e.filter((e) => e.enabled).reverse();
}
function Mn(e) {
	switch (e) {
		case "darken": return 1;
		case "multiply": return 2;
		case "color-burn": return 3;
		case "lighten": return 4;
		case "screen": return 5;
		case "color-dodge": return 6;
		case "overlay": return 7;
		case "soft-light": return 8;
		case "hard-light": return 9;
		case "difference": return 10;
		case "exclusion": return 11;
		default: return 0;
	}
}
function Nn(e) {
	return {
		blendMode: Mn(e.blendMode),
		opacity: y(e.opacity / 100)
	};
}
function Pn(e) {
	let t = xe(1), n = xe(.5), r = xe(0), i = "effectColor.rgb", a = "composedColor";
	switch (e) {
		case "darken": return `min(${a}, ${i})`;
		case "multiply": return `${a} * ${i}`;
		case "color-burn": return I(`${a} == ${t}`, t, I(`${i} == ${r}`, r, `${t} - min(${t}, (${t} - ${a}) / ${i})`));
		case "lighten": return `max(${a}, ${i})`;
		case "screen": return `${a} + ${i} - ${a} * ${i}`;
		case "color-dodge": return I(`${a} == ${r}`, r, I(`${i} == ${t}`, t, `min(${t}, ${a} / (${t} - ${i}))`));
		case "overlay": return I(`${a} <= ${n}`, `2.0 * ${a} * ${i}`, `${t} - 2.0 * (${t} - ${a}) * (${t} - ${i})`);
		case "soft-light": return I(`${i} <= ${n}`, `${a} - (${t} - 2.0 * ${i}) * ${a} * (${t} - ${a})`, `${a} + (2.0 * ${i} - ${t}) * (softLightD - ${a})`);
		case "hard-light": return I(`${i} <= ${n}`, `2.0 * ${a} * ${i}`, `${a} + (2.0 * ${i} - ${t}) - ${a} * (2.0 * ${i} - ${t})`);
		case "difference": return `abs(${a} - ${i})`;
		case "exclusion": return `${a} + ${i} - 2.0 * ${a} * ${i}`;
		default: return i;
	}
}
function Fn() {
	return `let softLightD = ${I("composedColor <= vec3<f32>(0.25)", "((16.0 * composedColor - vec3<f32>(12.0)) * composedColor + vec3<f32>(4.0)) * composedColor", "sqrt(composedColor)")};`;
}
function In(e, t) {
	let n = Mn(t);
	return `${e} >= ${P(n - .5)} && ${e} < ${P(n + .5)}`;
}
function Ln(e) {
	let t = [
		"darken",
		"multiply",
		"color-burn",
		"lighten",
		"screen",
		"color-dodge",
		"overlay",
		"soft-light",
		"hard-light",
		"difference",
		"exclusion"
	].map((t, n) => `${n === 0 ? "if" : "else if"} (${In(e, t)}) {
          blendedColor = ${Pn(t)};
        }`).join("\n");
	return `${Fn()}
        ${F("blendedColor", "vec3<f32>", "effectColor.rgb")}
        ${t}
        blendedColor = clamp(blendedColor, vec3<f32>(0.0), vec3<f32>(1.0));`;
}
function Rn(e, t, n, r = 0) {
	return jn(e).map((e, i) => {
		let a = e.type === "group" ? `effectColor = vec4<f32>(groupColor${r}_${i}, 1.0);` : Bn(e, n), o = `groupColor${r}_${i}`, s = t.get(e.id), c = s ? `${s.parameterPrefix}Opacity` : P(e.opacity / 100), l = s ? `${s.parameterPrefix}BlendMode` : P(Mn(e.blendMode));
		return `{
        ${e.type === "group" ? `${F(o, "vec3<f32>", "vec3<f32>(0.0)")}
        {
          ${F("previousComposedColor", "vec3<f32>", "composedColor")}
          composedColor = vec3<f32>(0.0);
          ${Rn(e.children, t, n, r + 1)}
          ${o} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${F("effectColor", "vec4<f32>", "vec4<f32>(0.0)")}
        ${a}
        let sourceAlpha = clamp(effectColor.a * ${c}, 0.0, 1.0);
        ${Ln(l)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          vec3<f32>(0.0),
          vec3<f32>(1.0)
        );
      }`;
	}).join("\n");
}
function zn(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Bn(e, t) {
	let n = t.adapters.get(e.type);
	return n ? n.adapter.createSampleExpression(e, "wgsl", { bindingsByLayerId: n.bindingsByLayerId }) : L();
}
function Vn(e) {
	return e.type === "group" ? e.children.some(Vn) : e.type === "starfield";
}
function Hn(e) {
	let t = jn(e), n = -1;
	return t.forEach((e, t) => {
		Vn(e) && (n = t);
	}), n >= 0 && n < t.length - 1;
}
function Un(e, t) {
	let n = jn(e), r = -1;
	return n.forEach((e, t) => {
		Vn(e) && (r = t);
	}), n.map((e, n) => {
		if (n <= r) return "";
		let i = P(e.opacity / 100);
		return e.type === "group" ? `{
        let sourceAlpha = clamp(${i}, 0.0, 1.0);
        coverageAbove = sourceAlpha + coverageAbove * (1.0 - sourceAlpha);
      }` : `{
        ${F("effectColor", "vec4<f32>", "vec4<f32>(0.0)")}
        ${Bn(e, t)}
        let sourceAlpha = clamp(effectColor.a * ${i}, 0.0, 1.0);
        coverageAbove = sourceAlpha + coverageAbove * (1.0 - sourceAlpha);
      }`;
	}).filter(Boolean).join("\n");
}
//#endregion
//#region src/skybox/materials.ts
function Wn(e) {
	return e.map((e) => {
		let t = Nn(e.node);
		return {
			blendMode: k(t.blendMode),
			nodeId: e.node.id,
			opacity: k(t.opacity)
		};
	});
}
function Gn(e, t) {
	for (let n of e) if (n.enabled) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = Gn(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
function Kn(e, t) {
	e.forEach((e) => {
		let n = Gn(t.nodes, e.nodeId);
		if (!n) return;
		let r = Nn(n);
		e.opacity.value = r.opacity, e.blendMode.value = r.blendMode;
	});
}
function qn(e, t) {
	let n = e.find((e) => e.nodeId === t.id);
	if (!n) return;
	let r = Nn(t);
	n.opacity.value = r.opacity, n.blendMode.value = r.blendMode;
}
function Jn(e, t) {
	e.userData.applyCompositionParams = t;
}
function Yn(e, t) {
	e.userData.applyLayerComposition = t;
}
function Xn(e) {
	let t = [];
	function n(e) {
		jn(e).forEach((e) => {
			let r = t.length;
			t.push({
				index: r,
				node: e,
				parameterPrefix: `compositionNode${r}`
			}), e.type === "group" && n(e.children);
		});
	}
	return n(e), t;
}
function Zn(e) {
	return new Map(e.map((e) => [e.node.id, e]));
}
function Qn() {
	return x().map((e) => e.wgsl).filter((e) => !!e);
}
function $n(e, t, n, r, i) {
	let a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = {}, c = {};
	return Qn().forEach((i) => {
		let l = i.collect(e.nodes), u = i.createUniforms(l), d = i.createSampleNodes?.({
			bindings: l,
			direction: t,
			imageTextures: i.type === "starfield" ? r : n,
			uniforms: u
		}), f = {
			adapter: i,
			bindings: l,
			bindingsByLayerId: zn(l),
			samples: d,
			uniforms: u
		};
		d?.editorProjectionByLayerId && d.editorProjectionByLayerId.forEach((e, t) => {
			o.set(t, e);
		}), d?.textureSlots && Object.assign(c, d.textureSlots), Object.assign(s, i.createSampleParameters?.(l, u, d) ?? {}), a.set(i.type, f);
	}), {
		adapters: a,
		editorProjectionByLayerId: o,
		sampleParameters: s,
		textureSlotsByLayerId: c
	};
}
function er(e, t) {
	return e.adapters.get(t);
}
function tr(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				tr(e.children, t);
				return;
			}
			t(e);
		}
	});
}
function nr(e, t) {
	let n = e.adapters.get(t.type);
	n && n.adapter.updateUniforms(n.uniforms, t);
}
function rr(e, t, n) {
	let r = Zn(n), i = Rn(e.nodes, r, t);
	return A(`
    fn skyboxStudioSample(
      direction: vec3<f32>${Array.from(t.adapters.values()).map((e) => e.adapter.createParameterDeclarations(e.bindings)).join("")}${n.flatMap((e) => [`,
      ${e.parameterPrefix}Opacity: f32`, `,
      ${e.parameterPrefix}BlendMode: f32`]).join("")}
    ) -> vec4<f32> {
      var composedColor = vec3<f32>(0.0);
      ${i}
      return vec4<f32>(composedColor, 1.0);
    }
  `);
}
function ir(e, t, n, r, i) {
	let a = Xn(e.nodes), o = Wn(a), s = $n(e, t, n, r, i), c = er(s, "image"), l = c?.uniforms ?? [], u = c?.samples, d = er(s, "starfield")?.samples;
	return {
		colorNode: rr(e, s, a)({
			direction: t,
			...s.sampleParameters,
			...Object.fromEntries(a.flatMap((e) => {
				let t = o[e.index];
				return [[`${e.parameterPrefix}Opacity`, t.opacity], [`${e.parameterPrefix}BlendMode`, t.blendMode]];
			}))
		}),
		compositionUniforms: o,
		imageSamples: u,
		imageUniforms: l,
		layerRuntime: s,
		starfieldSamples: d
	};
}
function ar() {
	let e = me.mul(2).sub(1), t = ue.mul(ge(e.x, e.y.negate(), 1, 1)), n = t.xyz.div(t.w), r = de.mul(ge(n, 0)).xyz;
	return fe(r);
}
function or(e, t, n, r, i, a) {
	let o = new E(), s = le(() => {
		let e = D;
		return e.z.assign(e.w), e;
	})();
	o.side = T.BackSide, o.depthTest = !1, o.depthWrite = !1, o.vertexNode = s;
	let { colorNode: c, compositionUniforms: l, imageSamples: u, imageUniforms: d, layerRuntime: f, starfieldSamples: p } = ir(e, ar(), n, r, i), m = a ? x().flatMap((e) => {
		let n = f.adapters.get(e.type);
		if (!e.wgslEditorOverlay || !n) return [];
		let r = n.bindings;
		return [{
			bindings: r,
			editorUniforms: Xt(r, t)
		}];
	}) : [], h = c;
	return m.forEach(({ bindings: e, editorUniforms: t }) => {
		e.forEach((e, n) => {
			let r = f.editorProjectionByLayerId.get(e.layer.id);
			r && (h = $t({
				color: h,
				activeValue: t[n].active,
				uv: r.uv,
				valid: r.valid
			}));
		});
	}), o.colorNode = h, m.length > 0 && Qt(o, (e) => {
		m.forEach(({ editorUniforms: t }) => Zt(t, e));
	}), o.userData.webGpuLayerRuntime = f, o.userData.applyLayerParams = (e) => nr(f, e), Jn(o, (e) => Kn(l, e)), Yn(o, (e) => qn(l, e)), Ot(o, (e, t) => Dt(d, e, t)), o.userData.applyImageTextures = (e) => Pt(u?.sampleData ?? /* @__PURE__ */ new Map(), e), o.userData.applyStarfieldTextures = (e) => mn(p?.sampleData ?? /* @__PURE__ */ new Map(), e), o.userData.debugImageTextureSlots = f.textureSlotsByLayerId, o;
}
function sr(e, t) {
	let n = Un(e.nodes, t);
	return A(`
    fn skyboxStudioCoverage(
      direction: vec3<f32>${Array.from(t.adapters.values()).map((e) => e.adapter.createParameterDeclarations(e.bindings)).join("")}
    ) -> vec4<f32> {
      var coverageAbove = 0.0;
      ${n}
      let transmittance = clamp(1.0 - coverageAbove, 0.0, 1.0);
      return vec4<f32>(transmittance, transmittance, transmittance, 1.0);
    }
  `);
}
function cr(e, t, n, r) {
	let i = new E();
	i.side = T.BackSide, i.depthTest = !1, i.depthWrite = !1, i.vertexNode = le(() => {
		let e = D;
		return e.z.assign(e.w), e;
	})();
	let a = ar(), o = $n(e, a, t, n, r), s = er(o, "image"), c = s?.samples, l = s?.uniforms ?? [], u = er(o, "starfield")?.samples;
	return i.colorNode = sr(e, o)({
		direction: a,
		...o.sampleParameters
	}), i.userData.applyLayerParams = (e) => nr(o, e), Ot(i, (e, t) => Dt(l, e, t)), i.userData.applyImageTextures = (e) => Pt(c?.sampleData ?? /* @__PURE__ */ new Map(), e), i.userData.applyStarfieldTextures = (e) => mn(u?.sampleData ?? /* @__PURE__ */ new Map(), e), i;
}
var lr = A("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.x, -normalizedDirection.z);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n"), ur = A("\n  fn skyboxStudioEquirectUvToDirection(uv: vec2<f32>) -> vec3<f32> {\n    let lambda = (uv.x - 0.5) * 6.283185307179586;\n    let phi = (uv.y - 0.5) * 3.141592653589793;\n    let cosPhi = cos(phi);\n\n    return normalize(vec3<f32>(cosPhi * sin(lambda), sin(phi), -cosPhi * cos(lambda)));\n  }\n");
function dr(e, t, n, r = {}) {
	let i = new E();
	i.side = T.DoubleSide, i.depthTest = !1, i.depthWrite = !1;
	let a = pe.xy.mul(.5).add(.5), { colorNode: o } = ir(e, fe(ur({ uv: r.flipY ? he(a.x, a.y.oneMinus()) : a })), t, n, /* @__PURE__ */ new Map());
	return i.colorNode = o, i;
}
function fr(e) {
	let t = new E(), n = le(() => {
		let e = D;
		return e.z.assign(e.w), e;
	})(), r = ar();
	return t.side = T.BackSide, t.depthTest = !1, t.depthWrite = !1, t.vertexNode = n, t.colorNode = O(e, lr({ direction: r })), t;
}
function pr(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function mr(e, t = {}) {
	let n = An(e, t), r = pr(n.width, n.height), i = r.getContext("2d");
	if (!i || !("putImageData" in i)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	i.putImageData(new ImageData(n.data, n.width, n.height), 0, 0);
	let a = new T.CanvasTexture(r);
	return a.mapping = T.EquirectangularReflectionMapping, a.wrapS = T.RepeatWrapping, a.wrapT = T.ClampToEdgeWrapping, a.colorSpace = T.SRGBColorSpace, a.flipY = !1, a.needsUpdate = !0, a;
}
function hr(e) {
	return fr(e);
}
function gr(e) {
	return e === "baked-texture" ? "baked-texture" : "live-webgpu";
}
function _r(e, t, n) {
	let r = (e) => e.type === "group" ? {
		children: e.children.map(r),
		enabled: e.enabled,
		id: e.id,
		type: e.type
	} : {
		enabled: e.enabled,
		id: e.id,
		topology: c(e.type)?.getTopologyKey?.(e) ?? null,
		type: e.type
	};
	return JSON.stringify({
		editorPresentationEnabled: n,
		geometry: e.geometry?.type ?? j.type,
		nodes: e.nodes.map(r),
		renderMode: t
	});
}
function Y(e, t) {
	for (let n of e) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = Y(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
//#endregion
//#region src/skybox.ts
var X = { starsOmitted: !0 }, vr = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: j,
	nodes: [],
	version: 2
}, yr = class extends T.Mesh {
	#e = {};
	#t = { ...Kt };
	#n = !1;
	#r = j;
	#i = /* @__PURE__ */ new Map();
	#a = /* @__PURE__ */ new Map();
	#o = {
		applyLayerParams: (e) => {
			this.material.userData.applyLayerParams?.(e), this.#x?.userData.applyLayerParams?.(e);
		},
		applyImagePlacement: (e, t) => {
			this.#i.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this.#x?.userData.applyImageLayerPlacement?.(e, t);
		},
		scheduleResourceBake: (e, t) => {
			this.scheduleStarfieldTextureBake(e, t);
		}
	};
	#s = vr;
	#c = null;
	#l = null;
	#u = "auto";
	#d = null;
	#f = null;
	#p = null;
	#m = /* @__PURE__ */ new Map();
	#h = /* @__PURE__ */ new Map();
	#g = /* @__PURE__ */ new Map();
	#_ = /* @__PURE__ */ new Map();
	#v = new T.Scene();
	#y = null;
	#b = null;
	#x = null;
	#S = null;
	#C = null;
	#w = new T.Vector2();
	constructor() {
		super(ve(j), or(vr, Kt, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), !1)), this.frustumCulled = !1, this.renderOrder = -1, this.onBeforeRender = ((e, t, n) => {
			this.renderCoveragePrepass(e, n);
		});
	}
	fromManifest(e) {
		return this.#s = M(e), this.applyGeometry(this.#s.geometry ?? j), this;
	}
	setGeometry(e) {
		return this.applyGeometry(e), this;
	}
	setBakeOptions(e) {
		return this.#e = {
			...this.#e,
			...e
		}, this;
	}
	setRenderer(e) {
		return this.#d = e, this.#f?.dispose(), this.#f = C(e), this;
	}
	setRenderMode(e) {
		return this.#u = e, this;
	}
	setStarGlintViewport(e) {
		let t = e && e.renderHeight > 0 && e.verticalFovRadians > 0 ? {
			renderHeight: e.renderHeight,
			verticalFovRadians: e.verticalFovRadians
		} : null, n = this.#p?.renderHeight !== t?.renderHeight;
		return this.#p = t, n && this.#_.forEach(({ handle: e }) => e.setViewport(t)), this;
	}
	setImageTexture(e, t) {
		return t ? this.#a.set(e, t) : this.#a.delete(e), this.material.userData.applyImageTextures?.(this.#a), this.#x?.userData.applyImageTextures?.(this.#a), this;
	}
	setImageTextures(e) {
		return this.#a.clear(), Object.entries(e).forEach(([e, t]) => {
			t && this.#a.set(e, t);
		}), this.material.userData.applyImageTextures?.(this.#a), this.#x?.userData.applyImageTextures?.(this.#a), this;
	}
	refreshImageTextureBindings() {
		return this.#c = null, this.setManifest(this.#s), this;
	}
	refreshStarfieldTextureBindings() {
		this.material.userData.applyStarfieldTextures?.(this.#g);
	}
	otherOverridingSetup() {
		return this;
	}
	load(e) {
		return e && (this.#d = e), this.setManifest(this.#s), this;
	}
	applyGeometry(e) {
		let t = _e(e);
		if (this.#r.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#r = t, this.geometry = ve(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#l?.dispose(), this.#l = null;
	}
	disposeStarfieldTextures() {
		this.#m.forEach((e) => {
			clearTimeout(e);
		}), this.#m.clear(), this.#g.forEach((e) => fn(e)), this.#g.clear(), this.#h.clear(), this.#f?.dispose(), this.#f = null;
	}
	disposeStarfieldGlints() {
		this.#_.forEach(({ handle: e }) => {
			this.remove(e.object), e.dispose();
		}), this.#_.clear();
	}
	disposeStarfieldGlint(e) {
		let t = this.#_.get(e);
		t && (this.remove(t.handle.object), t.handle.dispose(), this.#_.delete(e));
	}
	syncStarfieldGlint(e, t) {
		let n = this.#f;
		if (!n?.createGlints || gr(this.#u) !== "live-webgpu") {
			this.disposeStarfieldGlint(e);
			return;
		}
		let r = n.glintGeometryKey(t), i = this.#_.get(e);
		if (i) {
			if (i.geometryKey === r) {
				i.handle.setParams(t);
				return;
			}
			this.remove(i.handle.object), i.handle.dispose();
		}
		let a = n.createGlints(t);
		a.setViewport(this.#p), a.setCoverageTexture(this.#S?.texture ?? null), this.add(a.object), this.#_.set(e, {
			handle: a,
			geometryKey: r
		});
	}
	coverageActive() {
		return gr(this.#u) === "live-webgpu" && this.#_.size > 0 && Hn(this.#s.nodes);
	}
	disposeCoverage() {
		this.#b &&= (this.#v.remove(this.#b), null), this.#x?.dispose(), this.#x = null, this.#C = null, this.#_.forEach(({ handle: e }) => e.setCoverageTexture(null));
	}
	syncCoverage(e) {
		if (!this.coverageActive()) {
			this.disposeCoverage();
			return;
		}
		(!this.#x || this.#C !== e) && (this.#x?.dispose(), this.#b && this.#v.remove(this.#b), this.#x = cr(this.#s, this.#a, this.#g, /* @__PURE__ */ new Map()), this.#x.userData.applyImageTextures?.(this.#a), this.#i.forEach((e, t) => {
			this.#x?.userData.applyImageLayerPlacement?.(t, e);
		}), this.#y ||= ve(j), this.#b = new T.Mesh(this.#y, this.#x), this.#b.frustumCulled = !1, this.#v.add(this.#b), this.#S ||= new T.RenderTarget(1, 1, { depthBuffer: !1 }), this.#C = e);
		let t = this.#S?.texture ?? null;
		this.#_.forEach(({ handle: e }) => e.setCoverageTexture(t));
	}
	renderCoveragePrepass(e, t) {
		let n = e;
		if (!this.#b || !this.#S || typeof n.setRenderTarget != "function") return;
		n.getDrawingBufferSize?.(this.#w);
		let r = Math.max(1, Math.floor(this.#w.x || this.#S.width)), i = Math.max(1, Math.floor(this.#w.y || this.#S.height));
		(this.#S.width !== r || this.#S.height !== i) && this.#S.setSize(r, i);
		let a = n.getRenderTarget(), o = n.autoClear;
		n.autoClear = !0, n.setRenderTarget(this.#S), n.render(this.#v, t), n.setRenderTarget(a), n.autoClear = o;
	}
	syncStarfieldTextures() {
		let e = /* @__PURE__ */ new Set();
		tr(this.#s.nodes, (t) => {
			if (t.type !== "starfield") return;
			e.add(t.id), this.syncStarfieldGlint(t.id, t.params);
			let n = this.#f?.createBakeKey(t.params, void 0, null, X) ?? "";
			this.#h.get(t.id) !== n && this.scheduleStarfieldTextureBake(t.id, t.params);
		}), Array.from(this.#g.keys()).forEach((t) => {
			if (e.has(t)) return;
			let n = this.#g.get(t);
			n && fn(n), this.#g.delete(t), this.#h.delete(t);
		}), Array.from(this.#_.keys()).forEach((t) => {
			e.has(t) || this.disposeStarfieldGlint(t);
		}), Array.from(this.#m.entries()).forEach(([t, n]) => {
			e.has(t) || (clearTimeout(n), this.#m.delete(t));
		});
	}
	scheduleStarfieldTextureBake(e, t) {
		this.syncStarfieldGlint(e, t);
		let n = this.#f?.createBakeKey(t, void 0, null, X) ?? "";
		if (this.#h.get(e) === n) return;
		let r = this.#m.get(e);
		r && clearTimeout(r);
		let i = setTimeout(() => {
			this.#m.delete(e);
			let t = Y(this.#s.nodes, e);
			if (t?.type !== "starfield") return;
			let r = this.#f?.createBakeKey(t.params, void 0, null, X) ?? "";
			if (r !== n) {
				this.scheduleStarfieldTextureBake(e, t.params);
				return;
			}
			if (!this.#f && this.#d && (this.#f = C(this.#d)), !this.#f?.canBake()) return;
			let i = this.#f.bakeTexture(t.params, r, void 0, null, X), a = this.#g.get(e);
			a && a !== i && fn(a), this.#g.set(e, i), this.#h.set(e, r), a ? this.refreshStarfieldTextureBindings() : (this.#c = null, this.setManifest(this.#s)), this.dispatchEvent({ type: "starfieldtexturechange" });
		}, 150);
		this.#m.set(e, i);
	}
	replaceMaterial(e, t = null) {
		let n = this.material;
		this.material = e, e.userData.applyEditorLayerState?.(this.#t), this.#i.forEach((t, n) => {
			e.userData.applyImageLayerPlacement?.(n, t);
		}), e.userData.applyStarfieldTextures?.(this.#g), n.dispose(), this.disposeOwnedTexture(), this.#l = t;
	}
	applyLiveManifestUniformUpdates() {
		this.material.userData.applyCompositionParams?.(this.#s), this.material.userData.applyLayerParams && tr(this.#s.nodes, this.material.userData.applyLayerParams), this.material.userData.applyImageTextures?.(this.#a), this.material.userData.applyStarfieldTextures?.(this.#g), this.material.userData.applyEditorLayerState?.(this.#t), this.#i.forEach((e, t) => {
			this.material.userData.applyImageLayerPlacement?.(t, e);
		}), this.#x && (this.#x.userData.applyLayerParams && tr(this.#s.nodes, this.#x.userData.applyLayerParams), this.#x.userData.applyImageTextures?.(this.#a), this.#i.forEach((e, t) => {
			this.#x?.userData.applyImageLayerPlacement?.(t, e);
		}));
	}
	setEditorPresentationEnabled(e) {
		return this.#n === e ? this : (this.#n = e, this.#c = null, this.setManifest(this.#s), this);
	}
	setEditorLayerState(e) {
		let t = {
			...this.#t,
			...e
		};
		return t.hoveredLayerId === this.#t.hoveredLayerId && t.selectedLayerId === this.#t.selectedLayerId ? this : (this.#t = t, this.material.userData.applyEditorLayerState?.(this.#t), this);
	}
	setEditorImageState(e) {
		let t = {};
		return Object.prototype.hasOwnProperty.call(e, "hoveredImageLayerId") && (t.hoveredLayerId = e.hoveredImageLayerId ?? null), Object.prototype.hasOwnProperty.call(e, "selectedImageLayerId") && (t.selectedLayerId = e.selectedImageLayerId ?? null), this.setEditorLayerState(t);
	}
	setHoveredImageLayerId(e) {
		return this.setEditorLayerState({ hoveredLayerId: e }), this;
	}
	setImageLayerPlacement(e, t) {
		return this.updateImageLayerPlacement(e, t);
	}
	updateImageLayerPlacement(e, t) {
		let n = Y(this.#s.nodes, e);
		return n?.type === "image" && (n.params = {
			...n.params,
			placement: t
		}), this.#i.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this.#x?.userData.applyImageLayerPlacement?.(e, t), this;
	}
	updateLayerComposition(e, t) {
		let n = Y(this.#s.nodes, e);
		return n ? (t.blendMode !== void 0 && (n.blendMode = t.blendMode), t.opacity !== void 0 && (n.opacity = t.opacity), this.material.userData.applyLayerComposition?.(n), this) : this;
	}
	updateLayer(e, t) {
		let n = Y(this.#s.nodes, e);
		return !n || n.type === "group" ? this : (n.params = t, c(n.type)?.updateLive?.(this.#o, n), this);
	}
	updateGradientLayer(e, t) {
		return this.updateLayer(e, t);
	}
	updateFieldGradientLayer(e, t) {
		return this.updateLayer(e, t);
	}
	updateSpotLayer(e, t) {
		return this.updateLayer(e, t);
	}
	updateStarfieldLayer(e, t) {
		return this.updateLayer(e, t);
	}
	setManifest(e) {
		let t = M(e);
		this.#s = t, this.applyGeometry(this.#s.geometry ?? this.#r), this.syncStarfieldTextures();
		let n = gr(this.#u), r = _r(this.#s, n, this.#n);
		if (this.#c === r && n === "live-webgpu") return this.applyLiveManifestUniformUpdates(), this.syncCoverage(r), this;
		if (n === "live-webgpu") this.replaceMaterial(or(this.#s, this.#t, this.#a, this.#g, /* @__PURE__ */ new Map(), this.#n));
		else {
			let e = mr(this.#s, this.#e);
			this.replaceMaterial(hr(e), e);
		}
		return this.#c = r, this.syncCoverage(r), this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(hr(e)), this.#c = null, this;
	}
	invalidateBakeCache() {
		return En(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture(), this.disposeStarfieldTextures(), this.disposeStarfieldGlints(), this.disposeCoverage(), this.#y?.dispose(), this.#y = null, this.#S?.dispose(), this.#S = null;
	}
};
//#endregion
//#region src/baking/skybox-gpu-bake.ts
function br(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function xr(e, t, n, r) {
	let i = new T.RenderTarget(e, t, {
		depthBuffer: !1,
		format: T.RGBAFormat,
		generateMipmaps: !1,
		magFilter: T.LinearFilter,
		minFilter: T.LinearFilter,
		stencilBuffer: !1,
		type: n ? r ? T.FloatType : T.HalfFloatType : T.UnsignedByteType,
		wrapS: T.RepeatWrapping,
		wrapT: T.ClampToEdgeWrapping
	});
	return i.texture.name = "GPU baked skybox composition", i.texture.colorSpace = n ? T.LinearSRGBColorSpace : T.SRGBColorSpace, i.texture.generateMipmaps = !1, i;
}
var Sr = class {
	#e;
	#t = new T.Scene();
	#n = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#r = new T.PlaneGeometry(2, 2);
	constructor(e) {
		this.#e = e;
	}
	canBake() {
		return br(this.#e);
	}
	bakeRenderTarget(e, t) {
		let n = Math.max(1, Math.floor(t.width)), r = Math.max(1, Math.floor(t.height)), i = dr(M(e), t.imageTextures ?? /* @__PURE__ */ new Map(), t.starfieldTextures ?? /* @__PURE__ */ new Map(), { flipY: t.flipY }), a = xr(n, r, !!t.hdr, !!t.float), o = new T.Mesh(this.#r, i);
		o.frustumCulled = !1;
		let s = this.#e.getRenderTarget(), c = this.#e.autoClear, l = new T.Color(), u = this.#e.getClearAlpha();
		this.#e.getClearColor(l);
		try {
			this.#t.clear(), this.#t.add(o), this.#e.autoClear = !0, this.#e.setClearColor(0, 0), this.#e.setRenderTarget(a), this.#e.clear(), this.#e.render(this.#t, this.#n), this.#t.remove(o);
		} finally {
			this.#e.setRenderTarget(s), this.#e.autoClear = c, this.#e.setClearColor(l, u);
		}
		return {
			height: r,
			target: a,
			width: n,
			dispose: () => {
				i.dispose(), a.dispose();
			}
		};
	}
	async bakeImageData(e, t) {
		let { dispose: n, height: r, target: i, width: a } = this.bakeRenderTarget(e, {
			...t,
			hdr: !1
		});
		try {
			return {
				data: await this.#i(i, a, r),
				height: r,
				width: a
			};
		} finally {
			n();
		}
	}
	dispose() {
		this.#r.dispose();
	}
	async #i(e, t, n) {
		let r = new Uint8Array(t * n * 4);
		if (this.#e.readRenderTargetPixelsAsync) {
			let i = await this.#e.readRenderTargetPixelsAsync(e, 0, 0, t, n);
			r.set(new Uint8Array(i.buffer, i.byteOffset, i.byteLength));
		} else if (this.#e.readRenderTargetPixels) this.#e.readRenderTargetPixels(e, 0, 0, t, n, r);
		else throw Error("GPU skybox bake readback is not available.");
		return new Uint8ClampedArray(r.buffer);
	}
};
function Cr(e) {
	return br(e) ? new Sr(e) : null;
}
//#endregion
//#region src/loader/loader.ts
var Z = class extends Error {
	constructor(e, t) {
		super(e), this.name = "LoaderAssetError", this.entry = t.entry ?? null, this.event = t.event, this.id = t.id, this.phase = t.phase, this.src = t.src;
	}
}, wr = class {
	#e = {
		total: 0,
		loaded: 0,
		failed: 0,
		pending: 0
	};
	#t = /* @__PURE__ */ new Map();
	#n = /* @__PURE__ */ new Map();
	#r = /* @__PURE__ */ new Map();
	#i = {
		loaded: 0,
		failed: 0
	};
	#a = {
		complete: [],
		error: [],
		progress: [],
		start: []
	};
	#o = /* @__PURE__ */ new Map();
	register(e, t) {
		this.#n.set(e, t), typeof t.install == "function" && t.install(this);
	}
	setManifest(e) {
		for (let t of e) {
			if (!t.id) continue;
			this.#o.set(t.id, t);
			let e = this.#r.get(t.id);
			e && this.#y(e.src) !== this.#y(t.src) && (e.stale = !0);
		}
	}
	async load(e) {
		let t = this.#c(e);
		this.setManifest(t);
		let n = t.filter((e) => !e.lazy).map((e) => this.#m(e));
		this.#e = {
			failed: 0,
			loaded: 0,
			pending: n.length,
			total: n.length
		}, this.#_("start", { ...this.#e }), await Promise.allSettled(n), this.#_("complete", { ...this.#e });
	}
	async loadAsset(e, t, n) {
		try {
			let r = await this.#s(e, t);
			return n?.(null, r), r;
		} catch (e) {
			let t = this.#v(e);
			throw n?.(t), t;
		}
	}
	loadTexture(e, t) {
		return this.loadAsset("texture", e, t);
	}
	onProgress(e) {
		return this.#g("progress", e);
	}
	onError(e) {
		return this.#g("error", e);
	}
	onStart(e) {
		return this.#g("start", e);
	}
	onComplete(e) {
		return this.#g("complete", e);
	}
	async #s(e, t) {
		let n = this.#o.get(t) ?? null;
		if (!n && !this.#b(t)) {
			let e = this.#o.size === 0, n = new Z(e ? `No manifest loaded. Cannot resolve id: "${t}"` : `Manifest loaded but id not found: "${t}". Available ids: ${[...this.#o.keys()].join(", ")}`, {
				id: t,
				phase: e ? "no-manifest" : "id-not-found"
			});
			throw this.#h(n, null), n;
		}
		let r = n ? n.src : t, i = n ? n.type : e, a = n ? n.id : this.#y(r), o = this.#y(r), s = this.#d(a, o);
		if (s.found) return s.data;
		let c = this.#f(a, o, r);
		if (c) return c;
		let l = this.#p(i, r, n).then((e) => (this.#t.set(a, e), o !== a && this.#t.set(o, e), this.#r.delete(a), o !== a && this.#r.delete(o), this.#i.loaded += 1, n && (this.#e.loaded += 1, --this.#e.pending), this.#_("progress", {
			...this.#e,
			data: e,
			entry: n,
			lifetime: { ...this.#i }
		}), e)).catch((e) => {
			let t = this.#v(e);
			throw this.#r.delete(a), o !== a && this.#r.delete(o), this.#h(t, n), t;
		}), u = {
			promise: l,
			src: r,
			entry: n
		};
		return this.#r.set(a, u), o !== a && this.#r.set(o, u), l;
	}
	#c(e) {
		return Array.isArray(e) ? e.map((e) => this.#l(e)) : "assets" in e ? e.assets.map((e) => this.#l(e)) : [this.#l(e)];
	}
	#l(e) {
		if (!this.#u(e)) throw new Z("Invalid manifest entry.", { phase: "manifest-parse-error" });
		return e;
	}
	#u(e) {
		if (!e || typeof e != "object") return !1;
		let t = e;
		return typeof t.id == "string" && typeof t.type == "string" && (typeof t.src == "string" || Array.isArray(t.src) && t.src.every((e) => typeof e == "string"));
	}
	#d(e, t) {
		if (this.#t.has(e)) return {
			data: this.#t.get(e),
			found: !0
		};
		if (t !== e && this.#t.has(t)) {
			let n = this.#t.get(t);
			return this.#t.set(e, n), {
				data: n,
				found: !0
			};
		}
		return { found: !1 };
	}
	#f(e, t, n) {
		let r = this.#r.get(e);
		if (r && !r.stale && this.#y(r.src) === this.#y(n)) return r.promise;
		let i = this.#r.get(t);
		return i && !i.stale && this.#y(i.src) === this.#y(n) ? (this.#r.set(e, i), i.promise) : null;
	}
	async #p(e, t, n) {
		let r = this.#n.get(e);
		if (!r) throw new Z(`No loader registered for type: ${e}`, {
			entry: n,
			phase: "missing-extension",
			src: t
		});
		return await new r(this).load(t, n);
	}
	async #m(e) {
		return await this.loadAsset(e.type, e.id || this.#y(e.src));
	}
	#h(e, t) {
		this.#i.failed += 1, t && (this.#e.failed += 1, --this.#e.pending);
		let n = {
			...this.#e,
			entry: t,
			error: e,
			lifetime: { ...this.#i }
		};
		this.#_("error", n), this.#_("progress", n);
	}
	#g(e, t) {
		return this.#a[e].push(t), () => {
			let n = this.#a[e], r = n.indexOf(t);
			r !== -1 && n.splice(r, 1);
		};
	}
	#_(e, t) {
		for (let n of this.#a[e]) try {
			n(t);
		} catch (e) {
			console.error(e);
		}
	}
	#v(e) {
		return e instanceof Error ? e : Error(String(e));
	}
	#y(e) {
		return typeof e == "string" ? e : JSON.stringify(e);
	}
	#b(e) {
		return !!(/^(https?:|blob:|data:)/.test(e) || /^(https?:)?\/\//.test(e) || /\.[a-zA-Z0-9]{1,5}$/.test(e) || e.startsWith("/") || e.startsWith("./") || e.startsWith("../"));
	}
};
//#endregion
//#region src/loader/extensions/texture.ts
function Tr(e) {
	return e.colorSpace = T.SRGBColorSpace, e.wrapS = T.ClampToEdgeWrapping, e.wrapT = T.ClampToEdgeWrapping, e.flipY = !1, e.minFilter = T.LinearMipmapLinearFilter, e.magFilter = T.LinearFilter, e.generateMipmaps = !0, e.needsUpdate = !0, e;
}
var Q = class {
	static {
		this.type = "texture";
	}
	#e = new T.TextureLoader();
	async load(e, t) {
		let n = Array.isArray(e) ? e : [e], r = null;
		for (let e of n) try {
			return Tr(await this.#e.loadAsync(e));
		} catch (n) {
			r = new Z(`Failed to load texture: ${e}`, {
				entry: t,
				event: n,
				phase: "network-error",
				src: e
			});
		}
		throw r ?? new Z(`No texture sources for entry ${t?.id ?? "?"}`, {
			entry: t,
			phase: "network-error",
			src: e
		});
	}
}, $ = "manifest.json";
function Er(e) {
	let t = [], n = (e) => {
		for (let r of e) r.type === "group" ? n(r.children) : r.type === "image" && t.push(r);
	};
	return n(e.nodes), t;
}
function Dr(e) {
	switch (e.slice(e.lastIndexOf(".") + 1).toLowerCase()) {
		case "jpg":
		case "jpeg": return "image/jpeg";
		case "webp": return "image/webp";
		default: return "image/png";
	}
}
function Or(e, t) {
	let n = e.slice();
	return URL.createObjectURL(new Blob([n], { type: t }));
}
async function kr(e) {
	if (typeof e == "string") {
		let t = await fetch(e);
		if (!t.ok) throw Error(`Could not fetch zip bundle (${t.status} ${t.statusText}).`);
		return new Uint8Array(await t.arrayBuffer());
	}
	return e instanceof Uint8Array ? e : e instanceof ArrayBuffer ? new Uint8Array(e) : new Uint8Array(await e.arrayBuffer());
}
async function Ar(e) {
	let t = e.slice(), n = new Blob([t]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
	return new Uint8Array(await new Response(n).arrayBuffer());
}
var jr = 101010256, Mr = 33639248, Nr = 67324752, Pr = 22, Fr = 65535;
function Ir(e) {
	let t = Math.max(0, e.byteLength - Pr - Fr);
	for (let n = e.byteLength - Pr; n >= t; --n) if (e.getUint32(n, !0) === jr) return n;
	return -1;
}
async function Lr(e) {
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = Ir(t);
	if (n < 0) throw Error("Invalid zip bundle: end-of-central-directory record not found.");
	let r = t.getUint16(n + 10, !0), i = t.getUint32(n + 16, !0), a = new TextDecoder(), o = [];
	for (let n = 0; n < r; n += 1) {
		if (t.getUint32(i, !0) !== Mr) throw Error("Invalid zip bundle: malformed central directory.");
		let n = t.getUint16(i + 10, !0), r = t.getUint32(i + 20, !0), s = t.getUint16(i + 28, !0), c = t.getUint16(i + 30, !0), l = t.getUint16(i + 32, !0), u = t.getUint32(i + 42, !0), d = a.decode(e.subarray(i + 46, i + 46 + s));
		if (t.getUint32(u, !0) !== Nr) throw Error(`Invalid zip bundle: bad local header for "${d}".`);
		let f = t.getUint16(u + 26, !0), p = t.getUint16(u + 28, !0), m = u + 30 + f + p, h = e.subarray(m, m + r);
		if (n === 0) o.push(Promise.resolve([d, h]));
		else if (n === 8) o.push(Ar(h).then((e) => [d, e]));
		else throw Error(`Unsupported zip compression method ${n} for "${d}".`);
		i += 46 + s + c + l;
	}
	return Object.fromEntries(await Promise.all(o));
}
async function Rr(e, t = {}) {
	let n = t.toAssetUrl ?? Or, r = await Lr(await kr(e)), i = r[$];
	if (!i) throw Error(`Zip bundle is missing ${$}.`);
	let a = JSON.parse(new TextDecoder().decode(i)), o = M(a), s = a.assets ?? {}, c = /* @__PURE__ */ new Map(), l = [];
	for (let [e, t] of Object.entries(r)) {
		if (e === $) continue;
		let r = n(t, s[e]?.mimeType ?? Dr(e), e);
		c.set(e, r), l.push(r);
	}
	return {
		manifest: o,
		resolveAssetUrl: (e) => c.get(e) ?? e,
		dispose: () => {
			for (let e of l) e.startsWith("blob:") && typeof URL < "u" && URL.revokeObjectURL && URL.revokeObjectURL(e);
			c.clear(), l.length = 0;
		}
	};
}
async function zr(e) {
	let t = await fetch(new URL($, e).href);
	if (!t.ok) throw Error(`Could not load ${$} (${t.status}).`);
	return {
		manifest: M(await t.json()),
		resolveAssetUrl: (t) => new URL(t, e).href,
		dispose: () => {}
	};
}
async function Br(e, t) {
	let n = t.split("/").filter(Boolean), r = e;
	for (let e = 0; e < n.length - 1; e += 1) r = await r.getDirectoryHandle(n[e]);
	let i = await r.getFileHandle(n[n.length - 1]);
	return URL.createObjectURL(await i.getFile());
}
async function Vr(e) {
	let t = await (await e.getFileHandle($)).getFile(), n = M(JSON.parse(await t.text())), r = /* @__PURE__ */ new Map();
	for (let t of Er(n)) t.params.src && r.set(t.params.src, await Br(e, t.params.src));
	return {
		manifest: n,
		resolveAssetUrl: (e) => r.get(e) ?? e,
		dispose: () => {
			for (let e of r.values()) typeof URL < "u" && URL.revokeObjectURL && URL.revokeObjectURL(e);
			r.clear();
		}
	};
}
async function Hr(e) {
	let t = structuredClone(e.manifest);
	for (let n of Er(t)) {
		if (!n.params.src) continue;
		let t = await (await fetch(e.resolveAssetUrl(n.params.src))).blob(), r = await createImageBitmap(t), i = document.createElement("canvas");
		i.width = r.width, i.height = r.height;
		let a = i.getContext("2d");
		if (!a) {
			r.close();
			continue;
		}
		a.drawImage(r, 0, 0), r.close(), n.params.pixels = Array.from(a.getImageData(0, 0, i.width, i.height).data), n.params.width = i.width, n.params.height = i.height;
	}
	return t;
}
//#endregion
//#region src/loader/skybox-bundle.ts
function Ur() {
	let e = new wr();
	return e.register(Q.type, Q), e;
}
async function Wr(e, t = {}) {
	let n = t.loader ?? Ur(), r = Er(e.manifest).filter((e) => e.enabled && e.params.src), i = r.map((t) => ({
		id: t.id,
		src: e.resolveAssetUrl(t.params.src),
		type: Q.type
	})), a = t.onProgress ? n.onProgress(t.onProgress) : null;
	try {
		await n.load(i);
	} finally {
		a?.();
	}
	let o = /* @__PURE__ */ new Map();
	return await Promise.all(r.map(async (e) => {
		try {
			o.set(e.id, await n.loadAsset(Q.type, e.id));
		} catch {}
	})), o;
}
function Gr(e) {
	return typeof e == "object" && !!e && "manifest" in e && typeof e.resolveAssetUrl == "function";
}
async function Kr(e, t = {}) {
	let { onProgress: n, ...r } = t, i = !Gr(e), a = Gr(e) ? e : await Rr(e, r), o = Ur(), s = await Wr(a, {
		loader: o,
		onProgress: n
	});
	return {
		bundle: a,
		imageTextures: s,
		loader: o,
		manifest: a.manifest,
		dispose: () => {
			s.forEach((e) => e.dispose()), s.clear(), i && a.dispose();
		}
	};
}
//#endregion
export { bn as DEFAULT_BAKE_WIDTH, Lt as DEFAULT_SPOT_BASE_ANGULAR_RADIUS, $e as IMAGE_PLACEMENT_ELEVATION_LIMIT, wr as Loader, Z as LoaderAssetError, yr as Skybox, Sr as SkyboxGpuBakeService, Q as TextureLoaderExtension, An as bakeSkyboxImageData, te as blendChannel, y as clamp, Er as collectImageLayers, m as compositeBlendChannel, e as compositeOver, Tr as configureSkyboxImageTexture, ut as createAngularDecalPlacement, Tn as createBakeCacheKey, mr as createBakedSkyboxTexture, Bt as createDefaultSpotParams, lt as createImagePlacementTangents, ve as createSkyboxGeometry, Cr as createSkyboxGpuBakeService, be as createSkyboxWireGeometry, ft as directionFromPosition, yn as evaluateSkyboxDirection, c as getLayerRuntimeAdapter, x as getLayerRuntimeAdapters, En as invalidateBakeCache, s as isRegisteredLayerType, ce as linearChannelToSrgb, se as linearRgbToSrgbBytes, Vr as loadBundleFromDirectory, zr as loadBundleFromUrl, Rr as loadBundleFromZip, Kr as loadSkyboxBundle, Wr as loadSkyboxImageTextures, M as migrateManifestToV2, G as normalizeImagePlacement, J as normalizeSpotParams, W as normalizeVector, S as parseHexColor, pt as placementFromPosition, _t as placementFromRotation, ht as placementFromScale, dt as positionFromPlacement, Vt as positionFromSpot, vt as projectDirectionToImageUv, Ut as radiusScaleFromSpot, v as registerLayerRuntimeAdapter, Hr as rehydrateImagePixels, wn as resolveBakeOptions, gt as rotationFromPlacement, mt as scaleFromPlacement, Gt as spotContainsDirection, Ht as spotFromPosition, Wt as spotFromRadiusScale, re as srgbChannelToLinear };
