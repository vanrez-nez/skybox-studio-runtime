import { $ as e, A as t, D as n, F as r, G as i, H as a, I as o, J as s, K as c, L as l, M as u, N as d, O as f, P as p, Q as m, R as h, U as ee, V as g, W as te, X as ne, Y as _, Z as v, d as y, et as b, it as x, j as re, k as ie, m as ae, nt as oe, q as S, rt as C, t as w, tt as T, z as E } from "./starfield-bake-registry-DrgMw3WJ.js";
import * as D from "three";
import { NodeMaterial as O } from "three/webgpu";
import { Fn as se, cameraProjectionMatrixInverse as ce, cameraWorldMatrix as le, modelViewProjection as k, normalize as ue, positionGeometry as de, screenUV as fe, texture as A, uniform as j, vec2 as pe, vec4 as me, wgslFn as M } from "three/tsl";
//#region src/manifest.ts
var N = { type: "box" };
function P(e) {
	return e.version === 2 ? {
		...e,
		geometry: e.geometry ?? N
	} : {
		composition: e.composition,
		geometry: N,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	};
}
//#endregion
//#region src/skybox/geometry.ts
function he(e) {
	return e ?? N;
}
function ge(e = N) {
	return he(e).type === "sphere" ? new D.SphereGeometry(1, 64, 32) : new D.BoxGeometry(1, 1, 1);
}
function _e(e = 1, t = 25, n = 25) {
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
	return new D.BufferGeometry().setAttribute("position", new D.Float32BufferAttribute(r, 3));
}
function ve(e = N) {
	if (he(e).type === "sphere") return _e();
	let t = new D.BoxGeometry(1, 1, 1), n = new D.EdgesGeometry(t);
	return t.dispose(), n;
}
//#endregion
//#region src/skybox/stops.ts
function ye(e) {
	return [...e.stops].map((e) => ({
		color: e.color,
		midpoint: v((e.midpoint ?? 50) / 100, .01, .99),
		opacity: v(e.opacity / 100),
		t: v(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function F(e) {
	let [t, n, r] = C(e.color);
	return new D.Vector4(t, n, r, e.opacity);
}
//#endregion
//#region src/layer-addons/shader-codegen.ts
function I(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function be(e) {
	return `vec3<f32>(${I(e)})`;
}
function L(e, t, n) {
	return `var ${e}: ${t} = ${n};`;
}
function R(e, t, n) {
	return `select(${n}, ${t}, ${e})`;
}
function z() {
	return "effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);";
}
//#endregion
//#region src/layer-addons/builtins/gradient.ts
function xe(e) {
	let t = e * Math.PI / 180;
	return [
		Math.sin(t),
		Math.cos(t),
		0
	];
}
function Se(e, t) {
	let n = xe(t.rotation), r = e[0] * n[0] + e[1] * n[1] + e[2] * n[2];
	return h(o(t.stops), r * .5 + .5);
}
function Ce(e) {
	let t = e * Math.PI / 180;
	return new D.Vector3(Math.sin(t), Math.cos(t), 0).normalize();
}
function we(e) {
	return e.map((e) => {
		let t = ye(e.layer.params);
		return {
			axis: j(Ce(e.layer.params.rotation)),
			layerId: e.layer.id,
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: j(F(r)),
					midpoint: j(r.midpoint),
					t: j(r.t)
				};
			})
		};
	});
}
function Te(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = ye(t.params);
	n.axis.value.copy(Ce(t.params.rotation)), n.stops.forEach((e, t) => {
		let n = r[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(F(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function Ee(e) {
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
function De(e) {
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
var Oe = {
	collect: Ee,
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
		return r ? De(r) : z();
	},
	createSampleParameters: (e, t) => Object.fromEntries(e.flatMap((e) => {
		let n = t[e.index];
		return [[`${e.parameterPrefix}Axis`, n.axis], ...Array.from({ length: e.stopCount }, (t, r) => [
			[`${e.parameterPrefix}StopColor${r}`, n.stops[r].color],
			[`${e.parameterPrefix}StopMidpoint${r}`, n.stops[r].midpoint],
			[`${e.parameterPrefix}StopT${r}`, n.stops[r].t]
		]).flat()];
	})),
	createUniforms: we,
	getTopologyKey: (e) => ({
		mode: e.params.mode,
		stopCount: e.params.stops.length
	}),
	type: "gradient",
	updateUniforms: Te
};
_({
	type: "gradient",
	sampleCpu: (e, t) => Se(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Oe,
	getTopologyKey: (e) => Oe.getTopologyKey(e)
});
//#endregion
//#region src/skybox/colors.ts
function ke(e) {
	let [t, n, r] = C(e);
	return new D.Vector3(t, n, r);
}
//#endregion
//#region src/layer-addons/builtins/field-gradient.ts
function Ae(e, t) {
	if (t.anchors.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = i(e, v(t.amplitude, 0, .6), Math.max(1e-4, t.frequency)), r = 0, a = 0, o = 0, s = 0;
	return t.anchors.forEach((e) => {
		let i = f(n, re(e.x, e.y)), c = t.mode === "gaussian" ? Math.exp(-(i * i) / (2 * (.46 / t.power) ** 2)) : 1 / (i + 5e-4) ** t.power, l = C(e.color);
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
function je(e) {
	return +(e === "gaussian");
}
function Me(e, t) {
	let n = (v(e) - .5) * Math.PI * 2, r = (.5 - v(t)) * Math.PI, i = Math.cos(r);
	return new D.Vector3(i * Math.cos(n), Math.sin(r), i * Math.sin(n)).normalize();
}
function Ne(e) {
	return e.map((e) => ({
		amplitude: j(v(e.layer.params.amplitude, 0, .6)),
		anchors: Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return {
				color: j(ke(r.color)),
				direction: j(Me(r.x, r.y))
			};
		}),
		frequency: j(Math.max(1e-4, e.layer.params.frequency)),
		layerId: e.layer.id,
		mode: j(je(e.layer.params.mode)),
		power: j(Math.max(1e-4, e.layer.params.power))
	}));
}
function Pe(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n && (n.amplitude.value = v(t.params.amplitude, 0, .6), n.frequency.value = Math.max(1e-4, t.params.frequency), n.mode.value = je(t.params.mode), n.power.value = Math.max(1e-4, t.params.power), n.anchors.forEach((e, n) => {
		let r = t.params.anchors[n] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.color.value.copy(ke(r.color)), e.direction.value.copy(Me(r.x, r.y));
	}));
}
function Fe(e) {
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
function Ie(e) {
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
    ${L("fieldDirection", "vec3<f32>", "direction")}
    let warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      let warpX = sin((direction.y * warpFrequency + 0.23) * ${I(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${I(Math.PI * 2)});
      let warpY = cos((direction.z * warpFrequency + 0.17) * ${I(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${I(Math.PI * 2)});
      let warpZ = sin((direction.x * warpFrequency - 0.31) * ${I(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${I(Math.PI * 2)});
      fieldDirection = normalize(direction + vec3<f32>(warpX, warpY, warpZ) * warpScale);
    }
    ${L("weightedColor", "vec3<f32>", "vec3<f32>(0.0)")}
    ${L("weightSum", "f32", "0.0")}
    ${t}
    if (weightSum > 0.0) {
      effectColor = vec4<f32>(weightedColor / weightSum, 1.0);
    } else {
      effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
var Le = {
	collect: Fe,
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
		return r ? Ie(r) : z();
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
	createUniforms: Ne,
	getTopologyKey: (e) => ({ anchorCount: e.params.anchors.length }),
	type: "field-gradient",
	updateUniforms: Pe
};
_({
	type: "field-gradient",
	sampleCpu: (e, t) => Ae(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Le,
	getTopologyKey: (e) => Le.getTopologyKey(e)
});
//#endregion
//#region src/image-placement-transform.ts
var B = [
	0,
	1,
	0
], Re = [
	0,
	0,
	-1
], ze = [
	1,
	0,
	0
], Be = [
	0,
	1,
	0
], V = 89.9;
function Ve(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function He(e) {
	return e * Math.PI / 180;
}
function Ue(e) {
	return e * 180 / Math.PI;
}
function We(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Ge(e) {
	return (Math.round(e) % 360 + 360) % 360;
}
function H(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function Ke(e, t) {
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
function qe(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function Je(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function W(e, t = Re) {
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
function Ye(e, t, n) {
	let r = He(n), i = Math.cos(r), a = Math.sin(r), o = W(t);
	return W(qe(qe(U(e, i), U(Je(o, e), a)), U(o, H(o, e) * (1 - i))), e);
}
function Xe(e, t = B, n = 0) {
	let r = W(e), i = Ke(W(t, B), U(r, H(W(t, B), r)));
	if (Math.hypot(i[0], i[1], i[2]) < 1e-6) {
		let e = Math.abs(r[1]) > .98 ? [
			0,
			0,
			1
		] : B;
		i = Ke(e, U(r, H(e, r)));
	}
	return i = W(i, Be), {
		tangentX: Ye(W(Je(r, i), ze), r, n),
		tangentY: Ye(i, r, n)
	};
}
function Ze({ angularHeight: e, angularWidth: t, baseAngularHeight: n, baseAngularWidth: r, centerDirection: i, rotation: a = 0, upDirection: o = B }) {
	let s = W(i), c = Ge(a), { tangentX: l, tangentY: u } = Xe(s, o, c), d = Math.max(1e-4, e), f = Math.max(1e-4, t);
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
	let t = e, n = W(t?.centerDirection ?? t?.normal ?? t?.center, Re), r = Array.isArray(t?.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, i = typeof t?.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t?.width ?? .4) / (2 * r)), a = typeof t?.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t?.height ?? .3) / (2 * r));
	return Ze({
		angularHeight: a,
		angularWidth: i,
		baseAngularHeight: typeof t?.baseAngularHeight == "number" ? t.baseAngularHeight : a,
		baseAngularWidth: typeof t?.baseAngularWidth == "number" ? t.baseAngularWidth : i,
		centerDirection: n,
		rotation: typeof t?.rotation == "number" ? t.rotation : 0
	});
}
function Qe(e) {
	let t = W(e.centerDirection);
	return {
		x: We(Ue(Math.atan2(t[0], -t[2]))),
		y: Ue(Math.asin(Ve(t[1], -1, 1)))
	};
}
function $e(e) {
	let t = He(e.x), n = He(Ve(e.y, -89.9, V)), r = Math.cos(n);
	return W([
		Math.sin(t) * r,
		Math.sin(n),
		-Math.cos(t) * r
	]);
}
function et(e, t, n) {
	let r = G(e);
	return Ze({
		angularHeight: r.angularHeight,
		angularWidth: r.angularWidth,
		baseAngularHeight: r.baseAngularHeight,
		baseAngularWidth: r.baseAngularWidth,
		centerDirection: $e(t),
		rotation: r.rotation,
		upDirection: n?.upDirection
	});
}
function tt(e) {
	let t = G(e);
	return {
		x: t.angularWidth / t.baseAngularWidth,
		y: t.angularHeight / t.baseAngularHeight
	};
}
function nt(e, t) {
	let n = G(e);
	return {
		...n,
		angularHeight: Math.max(1e-4, n.baseAngularHeight * Math.max(1e-4, t.y)),
		angularWidth: Math.max(1e-4, n.baseAngularWidth * Math.max(1e-4, t.x))
	};
}
function rt(e) {
	return G(e).rotation;
}
function it(e, t) {
	let n = G(e);
	return Ze({
		angularHeight: n.angularHeight,
		angularWidth: n.angularWidth,
		baseAngularHeight: n.baseAngularHeight,
		baseAngularWidth: n.baseAngularWidth,
		centerDirection: n.centerDirection,
		rotation: t
	});
}
function at(e, t) {
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
var K = new D.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, D.RGBAFormat);
K.colorSpace = D.SRGBColorSpace, K.needsUpdate = !0;
//#endregion
//#region src/skybox/overlay.ts
var ot = .18, st = .75, ct = 1.75, lt = 1e-4, ut = .01;
//#endregion
//#region src/layer-addons/builtins/image.ts
function dt(e, t) {
	let n = t.placement;
	if (!n || !t.pixels || t.width <= 0 || t.height <= 0) return [
		0,
		0,
		0,
		0
	];
	let r = at(e, n);
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
	return p(p(E(t, c, l), E(t, u, l), f), p(E(t, c, d), E(t, u, d), f), m);
}
function ft(e) {
	if (!e) return {
		centerDirection: new D.Vector3(0, 0, -1),
		halfSize: new D.Vector2(0, 0),
		tangentX: new D.Vector3(1, 0, 0),
		tangentY: new D.Vector3(0, 1, 0)
	};
	let t = G(e);
	return {
		centerDirection: new D.Vector3(...t.centerDirection),
		halfSize: new D.Vector2(Math.max(0, Math.tan(t.angularWidth / 2)), Math.max(0, Math.tan(t.angularHeight / 2))),
		tangentX: new D.Vector3(...t.tangentX),
		tangentY: new D.Vector3(...t.tangentY)
	};
}
function pt(e) {
	return e.map((e) => {
		let t = ft(e.layer.params.placement);
		return {
			centerDirection: j(t.centerDirection),
			halfSize: j(t.halfSize),
			layerId: e.layer.id,
			tangentX: j(t.tangentX),
			tangentY: j(t.tangentY)
		};
	});
}
function mt(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = ft(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function ht(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function gt(e) {
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
function _t(e, t) {
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
      let imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${I(ut)});
      let imageHardInside = step(${I(lt)}, imageDenom) *
        step(0.0, ${t.halfSize}.x) *
        step(0.0, ${t.halfSize}.y);
      let imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      let imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return vec4<f32>(imageU, imageV, imageValid, 0.0);
    `;
}
function vt(e) {
	return M(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${_t(e, {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var yt = M("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n");
function bt(e, t) {
	return e.get(t.id) ?? K;
}
function xt(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? K;
	});
}
function St(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	return {
		sampleData: i,
		sampleNodes: Object.fromEntries(e.map((e) => {
			let a = r[e.index], o = vt(e)({
				direction: t,
				imageCenterDirection: a.centerDirection,
				imageHalfSize: a.halfSize,
				imageTangentX: a.tangentX,
				imageTangentY: a.tangentY
			}), s = pe(o.x, o.y), c = A(bt(n, e.layer), s).setName(`imageTexture${e.index}`);
			c.getUniformHash = () => `skybox-image-texture:${e.layer.id}`;
			let l = yt({
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
var Ct = {
	collect: gt,
	createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
	createSampleExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id);
		return r ? `effectColor = ${r.parameterName};` : z();
	},
	createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, uniforms: r }) => {
		let i = St(e, t, n, r);
		return {
			editorProjectionByLayerId: new Map(Array.from(i.sampleData.entries()).map(([e, t]) => [e, {
				uv: pe(t.sampleInfo.x, t.sampleInfo.y),
				valid: t.sampleInfo.z
			}])),
			sampleData: i.sampleData,
			sampleNodesByLayerId: Object.fromEntries(e.map((e) => [e.layer.id, i.sampleNodes[e.parameterName]])),
			sampleNodesByParameterName: i.sampleNodes,
			textureSlots: Object.fromEntries(Array.from(i.sampleData.entries()).map(([e, t]) => [e, t.textureNode]))
		};
	},
	createSampleParameters: (e, t, n) => n?.sampleNodesByParameterName ?? {},
	createUniforms: pt,
	getTopologyKey: (e) => ({
		hasPlacement: !!e.params.placement,
		hasSrc: !!e.params.src,
		height: e.params.height,
		width: e.params.width
	}),
	type: "image",
	updateUniforms: (e, t) => mt(e, t.id, t.params.placement)
};
_({
	type: "image",
	sampleCpu: (e, t) => dt(e, t),
	updateLive: (e, t) => e.applyImagePlacement(t.id, t.params.placement),
	wgsl: Ct,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => Ct.getTopologyKey(e)
});
//#endregion
//#region src/spot-transform.ts
var wt = Math.PI / 12;
function q(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Tt(e) {
	return e * 180 / Math.PI;
}
function Et(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Dt() {
	return {
		angularRadius: wt,
		baseAngularRadius: wt,
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
	let t = e, n = Dt(), r = Math.max(1e-4, typeof t?.baseAngularRadius == "number" ? t.baseAngularRadius : n.baseAngularRadius);
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
function Ot(e) {
	let t = W(e.centerDirection);
	return {
		x: Et(Tt(Math.atan2(t[0], -t[2]))),
		y: Tt(Math.asin(q(t[1], -1, 1)))
	};
}
function kt(e, t) {
	return {
		...J(e),
		centerDirection: $e({
			x: t.x,
			y: q(t.y, -V, V)
		})
	};
}
function At(e) {
	let t = J(e);
	return t.angularRadius / t.baseAngularRadius;
}
function jt(e, t) {
	let n = J(e);
	return {
		...n,
		angularRadius: Math.max(1e-4, n.baseAngularRadius * Math.max(1e-4, t))
	};
}
function Mt(e, t) {
	let n = J(t), r = W(e), i = W(n.centerDirection), a = r[0] * i[0] + r[1] * i[1] + r[2] * i[2];
	return Math.acos(q(a, -1, 1)) <= n.angularRadius;
}
//#endregion
//#region src/skybox/editor-presentation.ts
var Nt = {
	hoveredLayerId: null,
	selectedLayerId: null
};
function Pt(e, t) {
	return +(t === e);
}
function Ft(e, t) {
	return +(t === e);
}
function It(e, t) {
	return Math.max(Pt(e, t.hoveredLayerId), Ft(e, t.selectedLayerId));
}
function Lt(e, t) {
	return e.map((e) => ({
		active: j(It(e.layer.id, t)),
		layerId: e.layer.id
	}));
}
function Rt(e, t) {
	e.forEach((e) => {
		e.active.value = It(e.layerId, t);
	});
}
function zt(e, t) {
	e.userData.applyEditorLayerState = t;
}
var Bt = M(`
  fn skyboxStudioApplyImageEditorRectOverlay(
    color: vec4<f32>,
    uv: vec2<f32>,
    valid: f32,
    activeValue: f32
  ) -> vec4<f32> {
    let activeAmount = clamp(activeValue, 0.0, 1.0);
    let rectCoverage = valid * activeAmount;
    let edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${I(ut)});
    let bounds = rectCoverage * (
      1.0 - smoothstep(
        edgeWidth * ${I(st)},
        edgeWidth * ${I(ct)},
        edgeDistance
      )
    );
    let rectAlpha = rectCoverage * ${I(ot)};
    let overlayAlpha = max(rectAlpha, bounds);
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), overlayAlpha),
      color.a
    );
  }
`), Vt = M(`
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
    let spotEdgeWidth = clamp(fwidth(spotEdgeDistance), 0.000001, ${I(ut)});
    let spotValid = step(${I(lt)}, spotDenom) *
      step(-spotEdgeWidth, spotEdgeDistance) *
      smoothstep(-spotEdgeWidth, spotEdgeWidth, spotEdgeDistance);

    return vec4<f32>(spotU, spotV, spotValid, 0.0);
  }
`);
//#endregion
//#region src/layer-addons/builtins/spot.ts
function Ht(e, i) {
	let s = J(i), c = r(e), u = r(s.centerDirection), f = t(c, u), p = Math.acos(v(f, -1, 1)), m = Math.max(s.angularRadius, 1e-4), ne = p / m;
	if (s.colorMode === "gradient") return ne > 1 ? [
		0,
		0,
		0,
		0
	] : h(o(s.stops), ne);
	let _ = l(e, u, m), y = _.d, b = C(s.lightColor), x = s.brightness, re = v(1 - y / s.coreRadius) ** +s.coreSoftness, ae = v(1 - y / s.glowSize) ** 2 * s.glowStrength, oe = v(1 - y / s.glareSize) ** 1.15 * s.glareStrength, S = (re + ae + oe) * x, w = g(b, S);
	w = n(w, [
		Math.max(S - 1, 0),
		Math.max(S - 1, 0),
		Math.max(S - 1, 0)
	]);
	let T = Math.max(s.haloInnerWidth, 1e-4), E = Math.max(s.haloOuterWidth, 1e-4), D = y - s.haloRadius, O = Math.exp(-te(D / (D < 0 ? T : E))), se = ie(d([
		1,
		1,
		1
	], ee(v((y - (s.haloRadius - T)) / (T + E))), s.dispersion), b), ce = O * s.haloStrength * x;
	w = n(w, g(se, ce)), w = n(w, g([
		1,
		1,
		1
	], Math.max(ce - 1.2, 0) * .22));
	let le = Math.abs(_.y), k = Math.abs(_.x), ue = Math.exp(-te((k - s.haloRadius) / Math.max(s.dogSpread, 1e-4))) * Math.exp(-te(le / Math.max(s.dogSpread * .72, 1e-4))), de = a(s.haloRadius, s.haloRadius + Math.max(s.dogStretch, 1e-4), k) * (1 - a(s.haloRadius + Math.max(s.dogStretch, 1e-4), s.haloRadius + Math.max(s.dogStretch * 2.2, 1e-4), k)) * Math.exp(-te(le / Math.max(s.dogSpread * .9, 1e-4))), fe = ie(d([
		1,
		1,
		1
	], ee(v((k - (s.haloRadius - s.dogSpread * 1.4)) / Math.max(s.dogSpread * 3.5, 1e-4))), s.dispersion), b), A = (ue + de * .28) * s.dogStrength * x;
	w = n(w, g(fe, A)), w = n(w, g([
		1,
		1,
		1
	], Math.max(A - 1.1, 0) * .18));
	let j = v(Math.max(w[0], w[1], w[2]));
	return j <= 1e-5 ? [
		0,
		0,
		0,
		0
	] : [
		w[0] / j,
		w[1] / j,
		w[2] / j,
		j
	];
}
function Ut(e) {
	return +(e === "gradient");
}
function Wt(e) {
	let t = J(e);
	return {
		brightness: Math.max(0, t.brightness),
		centerDirection: new D.Vector3(...t.centerDirection).normalize(),
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
		lightColor: ke(t.lightColor),
		mode: Ut(t.colorMode),
		radius: Math.max(1e-4, t.angularRadius),
		stops: ye(t)
	};
}
function Gt(e) {
	return e.map((e) => {
		let t = Wt(e.layer.params);
		return {
			brightness: j(t.brightness),
			centerDirection: j(t.centerDirection),
			coreRadius: j(t.coreRadius),
			coreSoftness: j(t.coreSoftness),
			dispersion: j(t.dispersion),
			dogSpread: j(t.dogSpread),
			dogStrength: j(t.dogStrength),
			dogStretch: j(t.dogStretch),
			glareSize: j(t.glareSize),
			glareStrength: j(t.glareStrength),
			glowSize: j(t.glowSize),
			glowStrength: j(t.glowStrength),
			haloInnerWidth: j(t.haloInnerWidth),
			haloOuterWidth: j(t.haloOuterWidth),
			haloRadius: j(t.haloRadius),
			haloStrength: j(t.haloStrength),
			layerId: e.layer.id,
			lightColor: j(t.lightColor),
			mode: j(t.mode),
			radius: j(t.radius),
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t.stops[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: j(F(r)),
					midpoint: j(r.midpoint),
					t: j(r.t)
				};
			})
		};
	});
}
function Kt(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = Wt(t.params);
	n.brightness.value = r.brightness, n.centerDirection.value.copy(r.centerDirection), n.coreRadius.value = r.coreRadius, n.coreSoftness.value = r.coreSoftness, n.dispersion.value = r.dispersion, n.dogSpread.value = r.dogSpread, n.dogStrength.value = r.dogStrength, n.dogStretch.value = r.dogStretch, n.glareSize.value = r.glareSize, n.glareStrength.value = r.glareStrength, n.glowSize.value = r.glowSize, n.glowStrength.value = r.glowStrength, n.haloInnerWidth.value = r.haloInnerWidth, n.haloOuterWidth.value = r.haloOuterWidth, n.haloRadius.value = r.haloRadius, n.haloStrength.value = r.haloStrength, n.lightColor.value.copy(r.lightColor), n.mode.value = r.mode, n.radius.value = r.radius, n.stops.forEach((e, t) => {
		let n = r.stops[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(F(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function qt(e) {
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
function Jt(e) {
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
function Yt(e) {
	let t = `${e.parameterPrefix}Mode > 0.5`, n = Jt(e);
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
      ${L("spotColor", "vec3<f32>", `${e.parameterPrefix}LightColor * spotMonoLight + vec3<f32>(max(spotMonoLight - 1.0, 0.0))`)}

      let spotHaloInner = max(${e.parameterPrefix}HaloInnerWidth, 0.0001);
      let spotHaloOuter = max(${e.parameterPrefix}HaloOuterWidth, 0.0001);
      let spotHaloDelta = spotD - ${e.parameterPrefix}HaloRadius;
      let spotHaloWidth = select(spotHaloOuter, spotHaloInner, spotHaloDelta < 0.0);
      let spotHaloEnvelope = exp(-pow(spotHaloDelta / spotHaloWidth, 2.0));
      let spotHaloT = clamp((spotD - (${e.parameterPrefix}HaloRadius - spotHaloInner)) / (spotHaloInner + spotHaloOuter), 0.0, 1.0);
      ${L("spotSpectrum", "vec3<f32>", "vec3<f32>(1.0, 0.12, 0.05)")}
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
      ${L("spotDogSpectrum", "vec3<f32>", "vec3<f32>(1.0, 0.12, 0.05)")}
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
var Xt = {
	collect: qt,
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
		return r ? Yt(r) : z();
	},
	createSampleNodes: ({ bindings: e, direction: t, uniforms: n }) => ({ editorProjectionByLayerId: new Map(e.map((e) => {
		let r = n[e.index], i = Vt({
			direction: t,
			spotCenterDirection: r.centerDirection,
			spotRadius: r.radius
		});
		return [e.layer.id, {
			uv: pe(i.x, i.y),
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
	createUniforms: Gt,
	getTopologyKey: (e) => ({ stopCount: e.params.stops.length }),
	type: "spot",
	updateUniforms: Kt
};
_({
	type: "spot",
	sampleCpu: (e, t) => Ht(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Xt,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => Xt.getTopologyKey(e)
});
//#endregion
//#region src/layer-addons/builtins/starfield.ts
function Zt(e) {
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
function Qt(e) {
	e.userData.starfieldRenderTarget || e.dispose();
}
function $t(e, t) {
	return e.get(t.id) ?? K;
}
function en(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? K;
	});
}
var tn = M("\n  fn skyboxStudioDirectionToSourceStarfieldUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let theta = atan2(normalizedDirection.x, normalizedDirection.z);\n    let u = fract(theta / 6.283185307179586 + 0.5);\n    let v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / 3.141592653589793;\n\n    return vec2<f32>(u, v);\n  }\n");
_({
	type: "starfield",
	updateLive: (e, t) => {
		e.applyLayerParams(t), e.scheduleResourceBake(t.id, t.params);
	},
	wgsl: {
		collect: Zt,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : z();
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n }) => {
			let r = n, i = /* @__PURE__ */ new Map(), a = Object.fromEntries(e.map((e) => {
				let n = tn({ direction: t }), a = A($t(r, e.layer), n).setName(`starfieldTexture${e.index}`);
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
function nn(e, t, n = {}) {
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
function rn(t, n, r = {}) {
	return n.filter((e) => e.enabled).reverse().reduce((n, i) => {
		let a = i.type === "group" ? [...rn(t, i.children, r), 1] : nn(t, i, r), o = v(a[3] * (i.opacity / 100));
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
function an(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = an(n.children, t);
		if (e) return e;
	}
	return null;
}
function on(e, t, n = {}) {
	let r = P(e), i = n.targetGroupId ? an(r.nodes, n.targetGroupId) : null;
	return rn(t, n.targetGroupId ? i ? [i] : [] : r.nodes, n);
}
//#endregion
//#region src/baking/bake.ts
var sn = 1024, cn = "0.1.0", ln = /* @__PURE__ */ new Map(), un = /* @__PURE__ */ new Map();
function dn(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function fn(e, t) {
	return b(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: cn
	}));
}
function pn() {
	ln.clear(), un.clear();
}
function mn(e, t = []) {
	return e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				mn(e.children, t);
				return;
			}
			e.type === "starfield" && t.push(e);
		}
	}), t;
}
function hn(e, t) {
	for (let n of e) {
		if (n.type !== "group") continue;
		if (n.id === t) return n;
		let e = hn(n.children, t);
		if (e) return e;
	}
	return null;
}
function gn(e, t, n, r, i) {
	let a = mn(r ? hn(e.nodes, r)?.children ?? [] : e.nodes);
	if (a.length === 0) return;
	let o = /* @__PURE__ */ new Map();
	return a.forEach((e) => {
		let r = i?.get(e.id);
		if (r) {
			o.set(e.id, r);
			return;
		}
		let a = ae(e.params, t, n), s = un.get(a), c = s ?? y(e.params, t, n);
		s || un.set(a, c), o.set(e.id, c);
	}), o;
}
function _n(e, t = {}) {
	let n = P(e), r = dn(t), i = r.cache ? fn(n, r) : null;
	if (i) {
		let e = ln.get(i);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: a, targetGroupId: o, width: s } = r, c = gn(n, s, a, o, t.starfieldBakes), l = new Uint8ClampedArray(s * a * 4);
	for (let e = 0; e < a; e += 1) {
		let t = (e + .5) / a;
		for (let r = 0; r < s; r += 1) {
			let [i, d, f] = oe(on(n, u((r + .5) / s, t), {
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
	return i && ln.set(i, {
		...d,
		data: new Uint8ClampedArray(l)
	}), d;
}
//#endregion
//#region src/skybox/composition.ts
function vn(e) {
	return e.filter((e) => e.enabled).reverse();
}
function yn(e) {
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
function bn(e) {
	return {
		blendMode: yn(e.blendMode),
		opacity: v(e.opacity / 100)
	};
}
function xn(e) {
	let t = be(1), n = be(.5), r = be(0), i = "effectColor.rgb", a = "composedColor";
	switch (e) {
		case "darken": return `min(${a}, ${i})`;
		case "multiply": return `${a} * ${i}`;
		case "color-burn": return R(`${a} == ${t}`, t, R(`${i} == ${r}`, r, `${t} - min(${t}, (${t} - ${a}) / ${i})`));
		case "lighten": return `max(${a}, ${i})`;
		case "screen": return `${a} + ${i} - ${a} * ${i}`;
		case "color-dodge": return R(`${a} == ${r}`, r, R(`${i} == ${t}`, t, `min(${t}, ${a} / (${t} - ${i}))`));
		case "overlay": return R(`${a} <= ${n}`, `2.0 * ${a} * ${i}`, `${t} - 2.0 * (${t} - ${a}) * (${t} - ${i})`);
		case "soft-light": return R(`${i} <= ${n}`, `${a} - (${t} - 2.0 * ${i}) * ${a} * (${t} - ${a})`, `${a} + (2.0 * ${i} - ${t}) * (softLightD - ${a})`);
		case "hard-light": return R(`${i} <= ${n}`, `2.0 * ${a} * ${i}`, `${a} + (2.0 * ${i} - ${t}) - ${a} * (2.0 * ${i} - ${t})`);
		case "difference": return `abs(${a} - ${i})`;
		case "exclusion": return `${a} + ${i} - 2.0 * ${a} * ${i}`;
		default: return i;
	}
}
function Sn() {
	return `let softLightD = ${R("composedColor <= vec3<f32>(0.25)", "((16.0 * composedColor - vec3<f32>(12.0)) * composedColor + vec3<f32>(4.0)) * composedColor", "sqrt(composedColor)")};`;
}
function Cn(e, t) {
	let n = yn(t);
	return `${e} >= ${I(n - .5)} && ${e} < ${I(n + .5)}`;
}
function wn(e) {
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
	].map((t, n) => `${n === 0 ? "if" : "else if"} (${Cn(e, t)}) {
          blendedColor = ${xn(t)};
        }`).join("\n");
	return `${Sn()}
        ${L("blendedColor", "vec3<f32>", "effectColor.rgb")}
        ${t}
        blendedColor = clamp(blendedColor, vec3<f32>(0.0), vec3<f32>(1.0));`;
}
function Tn(e, t, n, r = 0) {
	return vn(e).map((e, i) => {
		let a = e.type === "group" ? `effectColor = vec4<f32>(groupColor${r}_${i}, 1.0);` : Dn(e, n), o = `groupColor${r}_${i}`, s = t.get(e.id), c = s ? `${s.parameterPrefix}Opacity` : I(e.opacity / 100), l = s ? `${s.parameterPrefix}BlendMode` : I(yn(e.blendMode));
		return `{
        ${e.type === "group" ? `${L(o, "vec3<f32>", "vec3<f32>(0.0)")}
        {
          ${L("previousComposedColor", "vec3<f32>", "composedColor")}
          composedColor = vec3<f32>(0.0);
          ${Tn(e.children, t, n, r + 1)}
          ${o} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${L("effectColor", "vec4<f32>", "vec4<f32>(0.0)")}
        ${a}
        let sourceAlpha = clamp(effectColor.a * ${c}, 0.0, 1.0);
        ${wn(l)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          vec3<f32>(0.0),
          vec3<f32>(1.0)
        );
      }`;
	}).join("\n");
}
function En(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Dn(e, t) {
	let n = t.adapters.get(e.type);
	return n ? n.adapter.createSampleExpression(e, "wgsl", { bindingsByLayerId: n.bindingsByLayerId }) : z();
}
//#endregion
//#region src/skybox/materials.ts
function On(e) {
	return e.map((e) => {
		let t = bn(e.node);
		return {
			blendMode: j(t.blendMode),
			nodeId: e.node.id,
			opacity: j(t.opacity)
		};
	});
}
function kn(e, t) {
	for (let n of e) if (n.enabled) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = kn(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
function An(e, t) {
	e.forEach((e) => {
		let n = kn(t.nodes, e.nodeId);
		if (!n) return;
		let r = bn(n);
		e.opacity.value = r.opacity, e.blendMode.value = r.blendMode;
	});
}
function jn(e, t) {
	let n = e.find((e) => e.nodeId === t.id);
	if (!n) return;
	let r = bn(t);
	n.opacity.value = r.opacity, n.blendMode.value = r.blendMode;
}
function Mn(e, t) {
	e.userData.applyCompositionParams = t;
}
function Nn(e, t) {
	e.userData.applyLayerComposition = t;
}
function Pn(e) {
	let t = [];
	function n(e) {
		vn(e).forEach((e) => {
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
function Fn(e) {
	return new Map(e.map((e) => [e.node.id, e]));
}
function In() {
	return S().map((e) => e.wgsl).filter((e) => !!e);
}
function Ln(e, t, n, r, i) {
	let a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = {}, c = {};
	return In().forEach((i) => {
		let l = i.collect(e.nodes), u = i.createUniforms(l), d = i.createSampleNodes?.({
			bindings: l,
			direction: t,
			imageTextures: i.type === "starfield" ? r : n,
			uniforms: u
		}), f = {
			adapter: i,
			bindings: l,
			bindingsByLayerId: En(l),
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
function Rn(e, t) {
	return e.adapters.get(t);
}
function zn(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				zn(e.children, t);
				return;
			}
			t(e);
		}
	});
}
function Bn(e, t) {
	let n = e.adapters.get(t.type);
	n && n.adapter.updateUniforms(n.uniforms, t);
}
function Vn(e, t, n) {
	let r = Fn(n), i = Tn(e.nodes, r, t);
	return M(`
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
function Hn(e, t, n, r, i) {
	let a = Pn(e.nodes), o = On(a), s = Ln(e, t, n, r, i), c = Rn(s, "image"), l = c?.uniforms ?? [], u = c?.samples, d = Rn(s, "starfield")?.samples;
	return {
		colorNode: Vn(e, s, a)({
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
function Un() {
	let e = fe.mul(2).sub(1), t = ce.mul(me(e.x, e.y.negate(), 1, 1)), n = t.xyz.div(t.w), r = le.mul(me(n, 0)).xyz;
	return ue(r);
}
function Wn(e, t, n, r, i, a) {
	let o = new O(), s = se(() => {
		let e = k;
		return e.z.assign(e.w), e;
	})();
	o.side = D.BackSide, o.depthTest = !1, o.depthWrite = !1, o.vertexNode = s;
	let { colorNode: c, compositionUniforms: l, imageSamples: u, imageUniforms: d, layerRuntime: f, starfieldSamples: p } = Hn(e, Un(), n, r, i), m = a ? S().flatMap((e) => {
		let n = f.adapters.get(e.type);
		if (!e.wgslEditorOverlay || !n) return [];
		let r = n.bindings;
		return [{
			bindings: r,
			editorUniforms: Lt(r, t)
		}];
	}) : [], h = c;
	return m.forEach(({ bindings: e, editorUniforms: t }) => {
		e.forEach((e, n) => {
			let r = f.editorProjectionByLayerId.get(e.layer.id);
			r && (h = Bt({
				color: h,
				activeValue: t[n].active,
				uv: r.uv,
				valid: r.valid
			}));
		});
	}), o.colorNode = h, m.length > 0 && zt(o, (e) => {
		m.forEach(({ editorUniforms: t }) => Rt(t, e));
	}), o.userData.webGpuLayerRuntime = f, o.userData.applyLayerParams = (e) => Bn(f, e), Mn(o, (e) => An(l, e)), Nn(o, (e) => jn(l, e)), ht(o, (e, t) => mt(d, e, t)), o.userData.applyImageTextures = (e) => xt(u?.sampleData ?? /* @__PURE__ */ new Map(), e), o.userData.applyStarfieldTextures = (e) => en(p?.sampleData ?? /* @__PURE__ */ new Map(), e), o.userData.debugImageTextureSlots = f.textureSlotsByLayerId, o;
}
var Gn = M("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.x, -normalizedDirection.z);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n"), Kn = M("\n  fn skyboxStudioEquirectUvToDirection(uv: vec2<f32>) -> vec3<f32> {\n    let lambda = (uv.x - 0.5) * 6.283185307179586;\n    let phi = (uv.y - 0.5) * 3.141592653589793;\n    let cosPhi = cos(phi);\n\n    return normalize(vec3<f32>(cosPhi * sin(lambda), sin(phi), -cosPhi * cos(lambda)));\n  }\n");
function qn(e, t, n, r = {}) {
	let i = new O();
	i.side = D.DoubleSide, i.depthTest = !1, i.depthWrite = !1;
	let a = de.xy.mul(.5).add(.5), { colorNode: o } = Hn(e, ue(Kn({ uv: r.flipY ? pe(a.x, a.y.oneMinus()) : a })), t, n, /* @__PURE__ */ new Map());
	return i.colorNode = o, i;
}
function Jn(e) {
	let t = new O(), n = se(() => {
		let e = k;
		return e.z.assign(e.w), e;
	})(), r = Un();
	return t.side = D.BackSide, t.depthTest = !1, t.depthWrite = !1, t.vertexNode = n, t.colorNode = A(e, Gn({ direction: r })), t;
}
function Yn(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function Xn(e, t = {}) {
	let n = _n(e, t), r = Yn(n.width, n.height), i = r.getContext("2d");
	if (!i || !("putImageData" in i)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	i.putImageData(new ImageData(n.data, n.width, n.height), 0, 0);
	let a = new D.CanvasTexture(r);
	return a.mapping = D.EquirectangularReflectionMapping, a.wrapS = D.RepeatWrapping, a.wrapT = D.ClampToEdgeWrapping, a.colorSpace = D.SRGBColorSpace, a.flipY = !1, a.needsUpdate = !0, a;
}
function Zn(e) {
	return Jn(e);
}
function Qn(e) {
	return e === "baked-texture" ? "baked-texture" : "live-webgpu";
}
function $n(e, t, n) {
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
		geometry: e.geometry?.type ?? N.type,
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
var er = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: N,
	nodes: [],
	version: 2
}, tr = class extends D.Mesh {
	#e = {};
	#t = { ...Nt };
	#n = !1;
	#r = N;
	#i = /* @__PURE__ */ new Map();
	#a = /* @__PURE__ */ new Map();
	#o = {
		applyLayerParams: (e) => {
			this.material.userData.applyLayerParams?.(e);
		},
		applyImagePlacement: (e, t) => {
			this.#i.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t);
		},
		scheduleResourceBake: (e, t) => {
			this.scheduleStarfieldTextureBake(e, t);
		}
	};
	#s = er;
	#c = null;
	#l = null;
	#u = "auto";
	#d = null;
	#f = null;
	#p = /* @__PURE__ */ new Map();
	#m = /* @__PURE__ */ new Map();
	#h = /* @__PURE__ */ new Map();
	constructor() {
		super(ge(N), Wn(er, Nt, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), !1)), this.frustumCulled = !1, this.renderOrder = -1;
	}
	fromManifest(e) {
		return this.#s = P(e), this.applyGeometry(this.#s.geometry ?? N), this;
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
		return this.#d = e, this.#f?.dispose(), this.#f = w(e), this;
	}
	setRenderMode(e) {
		return this.#u = e, this;
	}
	setImageTexture(e, t) {
		return t ? this.#a.set(e, t) : this.#a.delete(e), this.material.userData.applyImageTextures?.(this.#a), this;
	}
	setImageTextures(e) {
		return this.#a.clear(), Object.entries(e).forEach(([e, t]) => {
			t && this.#a.set(e, t);
		}), this.material.userData.applyImageTextures?.(this.#a), this;
	}
	refreshImageTextureBindings() {
		return this.#c = null, this.setManifest(this.#s), this;
	}
	refreshStarfieldTextureBindings() {
		this.material.userData.applyStarfieldTextures?.(this.#h);
	}
	otherOverridingSetup() {
		return this;
	}
	load(e) {
		return e && (this.#d = e), this.setManifest(this.#s), this;
	}
	applyGeometry(e) {
		let t = he(e);
		if (this.#r.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#r = t, this.geometry = ge(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#l?.dispose(), this.#l = null;
	}
	disposeStarfieldTextures() {
		this.#p.forEach((e) => {
			clearTimeout(e);
		}), this.#p.clear(), this.#h.forEach((e) => Qt(e)), this.#h.clear(), this.#m.clear(), this.#f?.dispose(), this.#f = null;
	}
	syncStarfieldTextures() {
		let e = /* @__PURE__ */ new Set();
		zn(this.#s.nodes, (t) => {
			if (t.type !== "starfield") return;
			e.add(t.id);
			let n = this.#f?.createBakeKey(t.params) ?? "";
			this.#m.get(t.id) !== n && this.scheduleStarfieldTextureBake(t.id, t.params);
		}), Array.from(this.#h.keys()).forEach((t) => {
			if (e.has(t)) return;
			let n = this.#h.get(t);
			n && Qt(n), this.#h.delete(t), this.#m.delete(t);
		}), Array.from(this.#p.entries()).forEach(([t, n]) => {
			e.has(t) || (clearTimeout(n), this.#p.delete(t));
		});
	}
	scheduleStarfieldTextureBake(e, t) {
		let n = this.#f?.createBakeKey(t) ?? "";
		if (this.#m.get(e) === n) return;
		let r = this.#p.get(e);
		r && clearTimeout(r);
		let i = setTimeout(() => {
			this.#p.delete(e);
			let t = Y(this.#s.nodes, e);
			if (t?.type !== "starfield") return;
			let r = this.#f?.createBakeKey(t.params) ?? "";
			if (r !== n) {
				this.scheduleStarfieldTextureBake(e, t.params);
				return;
			}
			if (!this.#f && this.#d && (this.#f = w(this.#d)), !this.#f?.canBake()) return;
			let i = this.#f.bakeTexture(t.params, r), a = this.#h.get(e);
			a && a !== i && Qt(a), this.#h.set(e, i), this.#m.set(e, r), a ? this.refreshStarfieldTextureBindings() : (this.#c = null, this.setManifest(this.#s)), this.dispatchEvent({ type: "starfieldtexturechange" });
		}, 150);
		this.#p.set(e, i);
	}
	replaceMaterial(e, t = null) {
		let n = this.material;
		this.material = e, e.userData.applyEditorLayerState?.(this.#t), this.#i.forEach((t, n) => {
			e.userData.applyImageLayerPlacement?.(n, t);
		}), e.userData.applyStarfieldTextures?.(this.#h), n.dispose(), this.disposeOwnedTexture(), this.#l = t;
	}
	applyLiveManifestUniformUpdates() {
		this.material.userData.applyCompositionParams?.(this.#s), this.material.userData.applyLayerParams && zn(this.#s.nodes, this.material.userData.applyLayerParams), this.material.userData.applyImageTextures?.(this.#a), this.material.userData.applyStarfieldTextures?.(this.#h), this.material.userData.applyEditorLayerState?.(this.#t), this.#i.forEach((e, t) => {
			this.material.userData.applyImageLayerPlacement?.(t, e);
		});
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
		}), this.#i.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this;
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
		let t = P(e);
		this.#s = t, this.applyGeometry(this.#s.geometry ?? this.#r), this.syncStarfieldTextures();
		let n = Qn(this.#u), r = $n(this.#s, n, this.#n);
		if (this.#c === r && n === "live-webgpu") return this.applyLiveManifestUniformUpdates(), this;
		if (n === "live-webgpu") this.replaceMaterial(Wn(this.#s, this.#t, this.#a, this.#h, /* @__PURE__ */ new Map(), this.#n));
		else {
			let e = Xn(this.#s, this.#e);
			this.replaceMaterial(Zn(e), e);
		}
		return this.#c = r, this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(Zn(e)), this.#c = null, this;
	}
	invalidateBakeCache() {
		return pn(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture(), this.disposeStarfieldTextures();
	}
};
//#endregion
//#region src/baking/skybox-gpu-bake.ts
function nr(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function rr(e, t, n, r) {
	let i = new D.RenderTarget(e, t, {
		depthBuffer: !1,
		format: D.RGBAFormat,
		generateMipmaps: !1,
		magFilter: D.LinearFilter,
		minFilter: D.LinearFilter,
		stencilBuffer: !1,
		type: n ? r ? D.FloatType : D.HalfFloatType : D.UnsignedByteType,
		wrapS: D.RepeatWrapping,
		wrapT: D.ClampToEdgeWrapping
	});
	return i.texture.name = "GPU baked skybox composition", i.texture.colorSpace = n ? D.LinearSRGBColorSpace : D.SRGBColorSpace, i.texture.generateMipmaps = !1, i;
}
var ir = class {
	#e;
	#t = new D.Scene();
	#n = new D.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#r = new D.PlaneGeometry(2, 2);
	constructor(e) {
		this.#e = e;
	}
	canBake() {
		return nr(this.#e);
	}
	bakeRenderTarget(e, t) {
		let n = Math.max(1, Math.floor(t.width)), r = Math.max(1, Math.floor(t.height)), i = qn(P(e), t.imageTextures ?? /* @__PURE__ */ new Map(), t.starfieldTextures ?? /* @__PURE__ */ new Map(), { flipY: t.flipY }), a = rr(n, r, !!t.hdr, !!t.float), o = new D.Mesh(this.#r, i);
		o.frustumCulled = !1;
		let s = this.#e.getRenderTarget(), c = this.#e.autoClear, l = new D.Color(), u = this.#e.getClearAlpha();
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
function ar(e) {
	return nr(e) ? new ir(e) : null;
}
//#endregion
//#region src/loader/loader.ts
var X = class extends Error {
	constructor(e, t) {
		super(e), this.name = "LoaderAssetError", this.entry = t.entry ?? null, this.event = t.event, this.id = t.id, this.phase = t.phase, this.src = t.src;
	}
}, or = class {
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
			let e = this.#o.size === 0, n = new X(e ? `No manifest loaded. Cannot resolve id: "${t}"` : `Manifest loaded but id not found: "${t}". Available ids: ${[...this.#o.keys()].join(", ")}`, {
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
		if (!this.#u(e)) throw new X("Invalid manifest entry.", { phase: "manifest-parse-error" });
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
		if (!r) throw new X(`No loader registered for type: ${e}`, {
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
function sr(e) {
	return e.colorSpace = D.SRGBColorSpace, e.wrapS = D.ClampToEdgeWrapping, e.wrapT = D.ClampToEdgeWrapping, e.flipY = !1, e.minFilter = D.LinearMipmapLinearFilter, e.magFilter = D.LinearFilter, e.generateMipmaps = !0, e.needsUpdate = !0, e;
}
var Z = class {
	static {
		this.type = "texture";
	}
	#e = new D.TextureLoader();
	async load(e, t) {
		let n = Array.isArray(e) ? e : [e], r = null;
		for (let e of n) try {
			return sr(await this.#e.loadAsync(e));
		} catch (n) {
			r = new X(`Failed to load texture: ${e}`, {
				entry: t,
				event: n,
				phase: "network-error",
				src: e
			});
		}
		throw r ?? new X(`No texture sources for entry ${t?.id ?? "?"}`, {
			entry: t,
			phase: "network-error",
			src: e
		});
	}
}, Q = "manifest.json";
function $(e) {
	let t = [], n = (e) => {
		for (let r of e) r.type === "group" ? n(r.children) : r.type === "image" && t.push(r);
	};
	return n(e.nodes), t;
}
function cr(e) {
	switch (e.slice(e.lastIndexOf(".") + 1).toLowerCase()) {
		case "jpg":
		case "jpeg": return "image/jpeg";
		case "webp": return "image/webp";
		default: return "image/png";
	}
}
function lr(e, t) {
	let n = e.slice();
	return URL.createObjectURL(new Blob([n], { type: t }));
}
async function ur(e) {
	if (typeof e == "string") {
		let t = await fetch(e);
		if (!t.ok) throw Error(`Could not fetch zip bundle (${t.status} ${t.statusText}).`);
		return new Uint8Array(await t.arrayBuffer());
	}
	return e instanceof Uint8Array ? e : e instanceof ArrayBuffer ? new Uint8Array(e) : new Uint8Array(await e.arrayBuffer());
}
async function dr(e) {
	let t = e.slice(), n = new Blob([t]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
	return new Uint8Array(await new Response(n).arrayBuffer());
}
var fr = 101010256, pr = 33639248, mr = 67324752, hr = 22, gr = 65535;
function _r(e) {
	let t = Math.max(0, e.byteLength - hr - gr);
	for (let n = e.byteLength - hr; n >= t; --n) if (e.getUint32(n, !0) === fr) return n;
	return -1;
}
async function vr(e) {
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = _r(t);
	if (n < 0) throw Error("Invalid zip bundle: end-of-central-directory record not found.");
	let r = t.getUint16(n + 10, !0), i = t.getUint32(n + 16, !0), a = new TextDecoder(), o = [];
	for (let n = 0; n < r; n += 1) {
		if (t.getUint32(i, !0) !== pr) throw Error("Invalid zip bundle: malformed central directory.");
		let n = t.getUint16(i + 10, !0), r = t.getUint32(i + 20, !0), s = t.getUint16(i + 28, !0), c = t.getUint16(i + 30, !0), l = t.getUint16(i + 32, !0), u = t.getUint32(i + 42, !0), d = a.decode(e.subarray(i + 46, i + 46 + s));
		if (t.getUint32(u, !0) !== mr) throw Error(`Invalid zip bundle: bad local header for "${d}".`);
		let f = t.getUint16(u + 26, !0), p = t.getUint16(u + 28, !0), m = u + 30 + f + p, h = e.subarray(m, m + r);
		if (n === 0) o.push(Promise.resolve([d, h]));
		else if (n === 8) o.push(dr(h).then((e) => [d, e]));
		else throw Error(`Unsupported zip compression method ${n} for "${d}".`);
		i += 46 + s + c + l;
	}
	return Object.fromEntries(await Promise.all(o));
}
async function yr(e, t = {}) {
	let n = t.toAssetUrl ?? lr, r = await vr(await ur(e)), i = r[Q];
	if (!i) throw Error(`Zip bundle is missing ${Q}.`);
	let a = JSON.parse(new TextDecoder().decode(i)), o = P(a), s = a.assets ?? {}, c = /* @__PURE__ */ new Map(), l = [];
	for (let [e, t] of Object.entries(r)) {
		if (e === Q) continue;
		let r = n(t, s[e]?.mimeType ?? cr(e), e);
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
async function br(e) {
	let t = await fetch(new URL(Q, e).href);
	if (!t.ok) throw Error(`Could not load ${Q} (${t.status}).`);
	return {
		manifest: P(await t.json()),
		resolveAssetUrl: (t) => new URL(t, e).href,
		dispose: () => {}
	};
}
async function xr(e, t) {
	let n = t.split("/").filter(Boolean), r = e;
	for (let e = 0; e < n.length - 1; e += 1) r = await r.getDirectoryHandle(n[e]);
	let i = await r.getFileHandle(n[n.length - 1]);
	return URL.createObjectURL(await i.getFile());
}
async function Sr(e) {
	let t = await (await e.getFileHandle(Q)).getFile(), n = P(JSON.parse(await t.text())), r = /* @__PURE__ */ new Map();
	for (let t of $(n)) t.params.src && r.set(t.params.src, await xr(e, t.params.src));
	return {
		manifest: n,
		resolveAssetUrl: (e) => r.get(e) ?? e,
		dispose: () => {
			for (let e of r.values()) typeof URL < "u" && URL.revokeObjectURL && URL.revokeObjectURL(e);
			r.clear();
		}
	};
}
async function Cr(e) {
	let t = structuredClone(e.manifest);
	for (let n of $(t)) {
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
function wr() {
	let e = new or();
	return e.register(Z.type, Z), e;
}
async function Tr(e, t = {}) {
	let n = t.loader ?? wr(), r = $(e.manifest).filter((e) => e.enabled && e.params.src), i = r.map((t) => ({
		id: t.id,
		src: e.resolveAssetUrl(t.params.src),
		type: Z.type
	})), a = t.onProgress ? n.onProgress(t.onProgress) : null;
	try {
		await n.load(i);
	} finally {
		a?.();
	}
	let o = /* @__PURE__ */ new Map();
	return await Promise.all(r.map(async (e) => {
		try {
			o.set(e.id, await n.loadAsset(Z.type, e.id));
		} catch {}
	})), o;
}
function Er(e) {
	return typeof e == "object" && !!e && "manifest" in e && typeof e.resolveAssetUrl == "function";
}
async function Dr(e, t = {}) {
	let { onProgress: n, ...r } = t, i = !Er(e), a = Er(e) ? e : await yr(e, r), o = wr(), s = await Tr(a, {
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
export { sn as DEFAULT_BAKE_WIDTH, wt as DEFAULT_SPOT_BASE_ANGULAR_RADIUS, V as IMAGE_PLACEMENT_ELEVATION_LIMIT, or as Loader, X as LoaderAssetError, tr as Skybox, ir as SkyboxGpuBakeService, Z as TextureLoaderExtension, _n as bakeSkyboxImageData, ne as blendChannel, v as clamp, $ as collectImageLayers, m as compositeBlendChannel, e as compositeOver, sr as configureSkyboxImageTexture, Ze as createAngularDecalPlacement, fn as createBakeCacheKey, Xn as createBakedSkyboxTexture, Dt as createDefaultSpotParams, Xe as createImagePlacementTangents, ge as createSkyboxGeometry, ar as createSkyboxGpuBakeService, ve as createSkyboxWireGeometry, $e as directionFromPosition, on as evaluateSkyboxDirection, c as getLayerRuntimeAdapter, S as getLayerRuntimeAdapters, pn as invalidateBakeCache, s as isRegisteredLayerType, T as linearChannelToSrgb, oe as linearRgbToSrgbBytes, Sr as loadBundleFromDirectory, br as loadBundleFromUrl, yr as loadBundleFromZip, Dr as loadSkyboxBundle, Tr as loadSkyboxImageTextures, P as migrateManifestToV2, G as normalizeImagePlacement, J as normalizeSpotParams, W as normalizeVector, C as parseHexColor, et as placementFromPosition, it as placementFromRotation, nt as placementFromScale, Qe as positionFromPlacement, Ot as positionFromSpot, at as projectDirectionToImageUv, At as radiusScaleFromSpot, _ as registerLayerRuntimeAdapter, Cr as rehydrateImagePixels, dn as resolveBakeOptions, rt as rotationFromPlacement, tt as scaleFromPlacement, Mt as spotContainsDirection, kt as spotFromPosition, jt as spotFromRadiusScale, x as srgbChannelToLinear };
