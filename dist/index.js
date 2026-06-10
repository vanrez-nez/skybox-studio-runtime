import { $ as e, A as t, D as n, F as r, G as i, H as a, I as o, J as s, K as c, L as l, M as u, N as d, O as f, P as p, Q as m, R as h, U as ee, V as g, W as _, X as te, Y as v, Z as y, d as b, et as ne, it as re, j as ie, k as ae, m as oe, nt as se, q as x, rt as S, t as C, tt as w, z as T } from "./starfield-bake-registry-C0-DJPT5.js";
import * as E from "three";
import { NodeMaterial as D } from "three/webgpu";
import { Fn as ce, cameraProjectionMatrixInverse as le, cameraWorldMatrix as ue, modelViewProjection as O, normalize as de, positionGeometry as fe, screenUV as pe, texture as k, uniform as A, vec2 as me, vec4 as he, wgslFn as j } from "three/tsl";
//#region src/manifest.ts
var M = { type: "box" };
function N(e) {
	return e.version === 2 ? {
		...e,
		geometry: e.geometry ?? M
	} : {
		composition: e.composition,
		geometry: M,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	};
}
//#endregion
//#region src/skybox/geometry.ts
function ge(e) {
	return e ?? M;
}
function P(e = M) {
	return ge(e).type === "sphere" ? new E.SphereGeometry(1, 64, 32) : new E.BoxGeometry(1, 1, 1);
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
	return new E.BufferGeometry().setAttribute("position", new E.Float32BufferAttribute(r, 3));
}
function ve(e = M) {
	if (ge(e).type === "sphere") return _e();
	let t = new E.BoxGeometry(1, 1, 1), n = new E.EdgesGeometry(t);
	return t.dispose(), n;
}
//#endregion
//#region src/skybox/stops.ts
function ye(e) {
	return [...e.stops].map((e) => ({
		color: e.color,
		midpoint: y((e.midpoint ?? 50) / 100, .01, .99),
		opacity: y(e.opacity / 100),
		t: y(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function F(e) {
	let [t, n, r] = S(e.color);
	return new E.Vector4(t, n, r, e.opacity);
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
	return new E.Vector3(Math.sin(t), Math.cos(t), 0).normalize();
}
function we(e) {
	return e.map((e) => {
		let t = ye(e.layer.params);
		return {
			axis: A(Ce(e.layer.params.rotation)),
			layerId: e.layer.id,
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: A(F(r)),
					midpoint: A(r.midpoint),
					t: A(r.t)
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
v({
	type: "gradient",
	sampleCpu: (e, t) => Se(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Oe,
	getTopologyKey: (e) => Oe.getTopologyKey(e)
});
//#endregion
//#region src/skybox/colors.ts
function ke(e) {
	let [t, n, r] = S(e);
	return new E.Vector3(t, n, r);
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
function je(e) {
	return +(e === "gaussian");
}
function Me(e, t) {
	let n = (y(e) - .5) * Math.PI * 2, r = (.5 - y(t)) * Math.PI, i = Math.cos(r);
	return new E.Vector3(i * Math.cos(n), Math.sin(r), i * Math.sin(n)).normalize();
}
function Ne(e) {
	return e.map((e) => ({
		amplitude: A(y(e.layer.params.amplitude, 0, .6)),
		anchors: Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return {
				color: A(ke(r.color)),
				direction: A(Me(r.x, r.y))
			};
		}),
		frequency: A(Math.max(1e-4, e.layer.params.frequency)),
		layerId: e.layer.id,
		mode: A(je(e.layer.params.mode)),
		power: A(Math.max(1e-4, e.layer.params.power))
	}));
}
function Pe(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n && (n.amplitude.value = y(t.params.amplitude, 0, .6), n.frequency.value = Math.max(1e-4, t.params.frequency), n.mode.value = je(t.params.mode), n.power.value = Math.max(1e-4, t.params.power), n.anchors.forEach((e, n) => {
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
v({
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
function G({ angularHeight: e, angularWidth: t, baseAngularHeight: n, baseAngularWidth: r, centerDirection: i, rotation: a = 0, upDirection: o = B }) {
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
function K(e) {
	let t = e, n = W(t?.centerDirection ?? t?.normal ?? t?.center, Re), r = Array.isArray(t?.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, i = typeof t?.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t?.width ?? .4) / (2 * r)), a = typeof t?.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t?.height ?? .3) / (2 * r));
	return G({
		angularHeight: a,
		angularWidth: i,
		baseAngularHeight: typeof t?.baseAngularHeight == "number" ? t.baseAngularHeight : a,
		baseAngularWidth: typeof t?.baseAngularWidth == "number" ? t.baseAngularWidth : i,
		centerDirection: n,
		rotation: typeof t?.rotation == "number" ? t.rotation : 0
	});
}
function Ze(e) {
	let t = W(e.centerDirection);
	return {
		x: We(Ue(Math.atan2(t[0], -t[2]))),
		y: Ue(Math.asin(Ve(t[1], -1, 1)))
	};
}
function Qe(e) {
	let t = He(e.x), n = He(Ve(e.y, -89.9, V)), r = Math.cos(n);
	return W([
		Math.sin(t) * r,
		Math.sin(n),
		-Math.cos(t) * r
	]);
}
function $e(e, t, n) {
	let r = K(e);
	return G({
		angularHeight: r.angularHeight,
		angularWidth: r.angularWidth,
		baseAngularHeight: r.baseAngularHeight,
		baseAngularWidth: r.baseAngularWidth,
		centerDirection: Qe(t),
		rotation: r.rotation,
		upDirection: n?.upDirection
	});
}
function et(e) {
	let t = K(e);
	return {
		x: t.angularWidth / t.baseAngularWidth,
		y: t.angularHeight / t.baseAngularHeight
	};
}
function tt(e, t) {
	let n = K(e);
	return {
		...n,
		angularHeight: Math.max(1e-4, n.baseAngularHeight * Math.max(1e-4, t.y)),
		angularWidth: Math.max(1e-4, n.baseAngularWidth * Math.max(1e-4, t.x))
	};
}
function nt(e) {
	return K(e).rotation;
}
function rt(e, t) {
	let n = K(e);
	return G({
		angularHeight: n.angularHeight,
		angularWidth: n.angularWidth,
		baseAngularHeight: n.baseAngularHeight,
		baseAngularWidth: n.baseAngularWidth,
		centerDirection: n.centerDirection,
		rotation: t
	});
}
function it(e, t) {
	let n = K(t), r = W(e), i = H(r, n.centerDirection);
	if (i <= 0) return null;
	let a = H(r, n.tangentX) / i, o = H(r, n.tangentY) / i, s = Math.tan(n.angularWidth / 2), c = Math.tan(n.angularHeight / 2);
	return s <= 0 || c <= 0 || a < -s || a > s || o < -c || o > c ? null : {
		u: a / (2 * s) + .5,
		v: .5 - o / (2 * c)
	};
}
//#endregion
//#region src/skybox/empty-texture.ts
var q = new E.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, E.RGBAFormat);
q.colorSpace = E.SRGBColorSpace, q.needsUpdate = !0;
//#endregion
//#region src/skybox/overlay.ts
var at = .18, ot = .75, st = 1.75, ct = 1e-4, lt = .01;
//#endregion
//#region src/layer-addons/builtins/image.ts
function ut(e, t) {
	let n = t.placement;
	if (!n || !t.pixels || t.width <= 0 || t.height <= 0) return [
		0,
		0,
		0,
		0
	];
	let r = it(e, n);
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
	return p(p(T(t, c, l), T(t, u, l), f), p(T(t, c, d), T(t, u, d), f), m);
}
function dt(e) {
	if (!e) return {
		centerDirection: new E.Vector3(0, 0, -1),
		halfSize: new E.Vector2(0, 0),
		tangentX: new E.Vector3(1, 0, 0),
		tangentY: new E.Vector3(0, 1, 0)
	};
	let t = K(e);
	return {
		centerDirection: new E.Vector3(...t.centerDirection),
		halfSize: new E.Vector2(Math.max(0, Math.tan(t.angularWidth / 2)), Math.max(0, Math.tan(t.angularHeight / 2))),
		tangentX: new E.Vector3(...t.tangentX),
		tangentY: new E.Vector3(...t.tangentY)
	};
}
function ft(e) {
	return e.map((e) => {
		let t = dt(e.layer.params.placement);
		return {
			centerDirection: A(t.centerDirection),
			halfSize: A(t.halfSize),
			layerId: e.layer.id,
			tangentX: A(t.tangentX),
			tangentY: A(t.tangentY)
		};
	});
}
function pt(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = dt(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function mt(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function ht(e) {
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
function gt(e, t) {
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
      let imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${I(lt)});
      let imageHardInside = step(${I(ct)}, imageDenom) *
        step(0.0, ${t.halfSize}.x) *
        step(0.0, ${t.halfSize}.y);
      let imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      let imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return vec4<f32>(imageU, imageV, imageValid, 0.0);
    `;
}
function _t(e) {
	return j(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${gt(e, {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var vt = j("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n");
function yt(e, t) {
	return e.get(t.id) ?? q;
}
function bt(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? q;
	});
}
function xt(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	return {
		sampleData: i,
		sampleNodes: Object.fromEntries(e.map((e) => {
			let a = r[e.index], o = _t(e)({
				direction: t,
				imageCenterDirection: a.centerDirection,
				imageHalfSize: a.halfSize,
				imageTangentX: a.tangentX,
				imageTangentY: a.tangentY
			}), s = me(o.x, o.y), c = k(yt(n, e.layer), s).setName(`imageTexture${e.index}`);
			c.getUniformHash = () => `skybox-image-texture:${e.layer.id}`;
			let l = vt({
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
var St = {
	collect: ht,
	createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
	createSampleExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id);
		return r ? `effectColor = ${r.parameterName};` : z();
	},
	createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, uniforms: r }) => {
		let i = xt(e, t, n, r);
		return {
			editorProjectionByLayerId: new Map(Array.from(i.sampleData.entries()).map(([e, t]) => [e, {
				uv: me(t.sampleInfo.x, t.sampleInfo.y),
				valid: t.sampleInfo.z
			}])),
			sampleData: i.sampleData,
			sampleNodesByLayerId: Object.fromEntries(e.map((e) => [e.layer.id, i.sampleNodes[e.parameterName]])),
			sampleNodesByParameterName: i.sampleNodes,
			textureSlots: Object.fromEntries(Array.from(i.sampleData.entries()).map(([e, t]) => [e, t.textureNode]))
		};
	},
	createSampleParameters: (e, t, n) => n?.sampleNodesByParameterName ?? {},
	createUniforms: ft,
	getTopologyKey: (e) => ({
		hasPlacement: !!e.params.placement,
		hasSrc: !!e.params.src,
		height: e.params.height,
		width: e.params.width
	}),
	type: "image",
	updateUniforms: (e, t) => pt(e, t.id, t.params.placement)
};
v({
	type: "image",
	sampleCpu: (e, t) => ut(e, t),
	updateLive: (e, t) => e.applyImagePlacement(t.id, t.params.placement),
	wgsl: St,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => St.getTopologyKey(e)
});
//#endregion
//#region src/spot-transform.ts
var Ct = Math.PI / 12;
function J(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function wt(e) {
	return e * 180 / Math.PI;
}
function Tt(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Et() {
	return {
		angularRadius: Ct,
		baseAngularRadius: Ct,
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
function Y(e) {
	let t = e, n = Et(), r = Math.max(1e-4, typeof t?.baseAngularRadius == "number" ? t.baseAngularRadius : n.baseAngularRadius);
	return {
		angularRadius: Math.max(1e-4, typeof t?.angularRadius == "number" ? t.angularRadius : r),
		baseAngularRadius: r,
		brightness: Math.max(0, typeof t?.brightness == "number" ? t.brightness : n.brightness),
		centerDirection: W(t?.centerDirection, n.centerDirection),
		colorMode: t?.colorMode === "gradient" ? "gradient" : "light",
		coreRadius: J(typeof t?.coreRadius == "number" ? t.coreRadius : n.coreRadius, .01, .7),
		coreSoftness: J(typeof t?.coreSoftness == "number" ? t.coreSoftness : n.coreSoftness, .4, 6),
		dispersion: J(typeof t?.dispersion == "number" ? t.dispersion : n.dispersion, 0, 1),
		dogSpread: J(typeof t?.dogSpread == "number" ? t.dogSpread : n.dogSpread, .015, .18),
		dogStrength: J(typeof t?.dogStrength == "number" ? t.dogStrength : n.dogStrength, 0, 1.8),
		dogStretch: J(typeof t?.dogStretch == "number" ? t.dogStretch : n.dogStretch, 0, .55),
		glareSize: J(typeof t?.glareSize == "number" ? t.glareSize : n.glareSize, .03, 1.1),
		glareStrength: J(typeof t?.glareStrength == "number" ? t.glareStrength : n.glareStrength, 0, 1.4),
		glow: J(typeof t?.glow == "number" ? t.glow : n.glow, 0, 1),
		glowSize: J(typeof t?.glowSize == "number" ? t.glowSize : n.glowSize, .05, 1.4),
		glowStrength: J(typeof t?.glowStrength == "number" ? t.glowStrength : n.glowStrength, 0, 1),
		halo: J(typeof t?.halo == "number" ? t.halo : n.halo, 0, 1),
		haloInnerWidth: J(typeof t?.haloInnerWidth == "number" ? t.haloInnerWidth : n.haloInnerWidth, .003, .09),
		haloOuterWidth: J(typeof t?.haloOuterWidth == "number" ? t.haloOuterWidth : n.haloOuterWidth, .01, .24),
		haloRadius: J(typeof t?.haloRadius == "number" ? t.haloRadius : n.haloRadius, .04, 1),
		haloStrength: J(typeof t?.haloStrength == "number" ? t.haloStrength : n.haloStrength, 0, 1.4),
		lightColor: typeof t?.lightColor == "string" ? t.lightColor : n.lightColor,
		stops: (t?.stops?.length ? t.stops : n.stops).map((e) => ({
			color: e.color,
			location: J(e.location, 0, 100),
			midpoint: J(e.midpoint ?? 50, 1, 99),
			opacity: J(e.opacity, 0, 100)
		}))
	};
}
function Dt(e) {
	let t = W(e.centerDirection);
	return {
		x: Tt(wt(Math.atan2(t[0], -t[2]))),
		y: wt(Math.asin(J(t[1], -1, 1)))
	};
}
function Ot(e, t) {
	return {
		...Y(e),
		centerDirection: Qe({
			x: t.x,
			y: J(t.y, -V, V)
		})
	};
}
function kt(e) {
	let t = Y(e);
	return t.angularRadius / t.baseAngularRadius;
}
function At(e, t) {
	let n = Y(e);
	return {
		...n,
		angularRadius: Math.max(1e-4, n.baseAngularRadius * Math.max(1e-4, t))
	};
}
function jt(e, t) {
	let n = Y(t), r = W(e), i = W(n.centerDirection), a = r[0] * i[0] + r[1] * i[1] + r[2] * i[2];
	return Math.acos(J(a, -1, 1)) <= n.angularRadius;
}
//#endregion
//#region src/skybox/editor-presentation.ts
var Mt = {
	hoveredLayerId: null,
	selectedLayerId: null
};
function Nt(e, t) {
	return +(t === e);
}
function Pt(e, t) {
	return +(t === e);
}
function Ft(e, t) {
	return Math.max(Nt(e, t.hoveredLayerId), Pt(e, t.selectedLayerId));
}
function It(e, t) {
	return e.map((e) => ({
		active: A(Ft(e.layer.id, t)),
		layerId: e.layer.id
	}));
}
function Lt(e, t) {
	e.forEach((e) => {
		e.active.value = Ft(e.layerId, t);
	});
}
function Rt(e, t) {
	e.userData.applyEditorLayerState = t;
}
var zt = j(`
  fn skyboxStudioApplyImageEditorRectOverlay(
    color: vec4<f32>,
    uv: vec2<f32>,
    valid: f32,
    activeValue: f32
  ) -> vec4<f32> {
    let activeAmount = clamp(activeValue, 0.0, 1.0);
    let rectCoverage = valid * activeAmount;
    let edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${I(lt)});
    let bounds = rectCoverage * (
      1.0 - smoothstep(
        edgeWidth * ${I(ot)},
        edgeWidth * ${I(st)},
        edgeDistance
      )
    );
    let rectAlpha = rectCoverage * ${I(at)};
    let overlayAlpha = max(rectAlpha, bounds);
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), overlayAlpha),
      color.a
    );
  }
`), Bt = j(`
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
    let spotEdgeWidth = clamp(fwidth(spotEdgeDistance), 0.000001, ${I(lt)});
    let spotValid = step(${I(ct)}, spotDenom) *
      step(-spotEdgeWidth, spotEdgeDistance) *
      smoothstep(-spotEdgeWidth, spotEdgeWidth, spotEdgeDistance);

    return vec4<f32>(spotU, spotV, spotValid, 0.0);
  }
`);
//#endregion
//#region src/layer-addons/builtins/spot.ts
function Vt(e, i) {
	let s = Y(i), c = r(e), u = r(s.centerDirection), f = t(c, u), p = Math.acos(y(f, -1, 1)), m = Math.max(s.angularRadius, 1e-4), te = p / m;
	if (s.colorMode === "gradient") return te > 1 ? [
		0,
		0,
		0,
		0
	] : h(o(s.stops), te);
	let v = l(e, u, m), b = v.d, ne = S(s.lightColor), re = s.brightness, ie = y(1 - b / s.coreRadius) ** +s.coreSoftness, oe = y(1 - b / s.glowSize) ** 2 * s.glowStrength, se = y(1 - b / s.glareSize) ** 1.15 * s.glareStrength, x = (ie + oe + se) * re, C = g(ne, x);
	C = n(C, [
		Math.max(x - 1, 0),
		Math.max(x - 1, 0),
		Math.max(x - 1, 0)
	]);
	let w = Math.max(s.haloInnerWidth, 1e-4), T = Math.max(s.haloOuterWidth, 1e-4), E = b - s.haloRadius, D = Math.exp(-_(E / (E < 0 ? w : T))), ce = ae(d([
		1,
		1,
		1
	], ee(y((b - (s.haloRadius - w)) / (w + T))), s.dispersion), ne), le = D * s.haloStrength * re;
	C = n(C, g(ce, le)), C = n(C, g([
		1,
		1,
		1
	], Math.max(le - 1.2, 0) * .22));
	let ue = Math.abs(v.y), O = Math.abs(v.x), de = Math.exp(-_((O - s.haloRadius) / Math.max(s.dogSpread, 1e-4))) * Math.exp(-_(ue / Math.max(s.dogSpread * .72, 1e-4))), fe = a(s.haloRadius, s.haloRadius + Math.max(s.dogStretch, 1e-4), O) * (1 - a(s.haloRadius + Math.max(s.dogStretch, 1e-4), s.haloRadius + Math.max(s.dogStretch * 2.2, 1e-4), O)) * Math.exp(-_(ue / Math.max(s.dogSpread * .9, 1e-4))), pe = ae(d([
		1,
		1,
		1
	], ee(y((O - (s.haloRadius - s.dogSpread * 1.4)) / Math.max(s.dogSpread * 3.5, 1e-4))), s.dispersion), ne), k = (de + fe * .28) * s.dogStrength * re;
	C = n(C, g(pe, k)), C = n(C, g([
		1,
		1,
		1
	], Math.max(k - 1.1, 0) * .18));
	let A = y(Math.max(C[0], C[1], C[2]));
	return A <= 1e-5 ? [
		0,
		0,
		0,
		0
	] : [
		C[0] / A,
		C[1] / A,
		C[2] / A,
		A
	];
}
function Ht(e) {
	return +(e === "gradient");
}
function Ut(e) {
	let t = Y(e);
	return {
		brightness: Math.max(0, t.brightness),
		centerDirection: new E.Vector3(...t.centerDirection).normalize(),
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
		mode: Ht(t.colorMode),
		radius: Math.max(1e-4, t.angularRadius),
		stops: ye(t)
	};
}
function Wt(e) {
	return e.map((e) => {
		let t = Ut(e.layer.params);
		return {
			brightness: A(t.brightness),
			centerDirection: A(t.centerDirection),
			coreRadius: A(t.coreRadius),
			coreSoftness: A(t.coreSoftness),
			dispersion: A(t.dispersion),
			dogSpread: A(t.dogSpread),
			dogStrength: A(t.dogStrength),
			dogStretch: A(t.dogStretch),
			glareSize: A(t.glareSize),
			glareStrength: A(t.glareStrength),
			glowSize: A(t.glowSize),
			glowStrength: A(t.glowStrength),
			haloInnerWidth: A(t.haloInnerWidth),
			haloOuterWidth: A(t.haloOuterWidth),
			haloRadius: A(t.haloRadius),
			haloStrength: A(t.haloStrength),
			layerId: e.layer.id,
			lightColor: A(t.lightColor),
			mode: A(t.mode),
			radius: A(t.radius),
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t.stops[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: A(F(r)),
					midpoint: A(r.midpoint),
					t: A(r.t)
				};
			})
		};
	});
}
function Gt(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = Ut(t.params);
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
function Kt(e) {
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
function qt(e) {
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
function Jt(e) {
	let t = `${e.parameterPrefix}Mode > 0.5`, n = qt(e);
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
var Yt = {
	collect: Kt,
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
		return r ? Jt(r) : z();
	},
	createSampleNodes: ({ bindings: e, direction: t, uniforms: n }) => ({ editorProjectionByLayerId: new Map(e.map((e) => {
		let r = n[e.index], i = Bt({
			direction: t,
			spotCenterDirection: r.centerDirection,
			spotRadius: r.radius
		});
		return [e.layer.id, {
			uv: me(i.x, i.y),
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
	createUniforms: Wt,
	getTopologyKey: (e) => ({ stopCount: e.params.stops.length }),
	type: "spot",
	updateUniforms: Gt
};
v({
	type: "spot",
	sampleCpu: (e, t) => Vt(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Yt,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => Yt.getTopologyKey(e)
});
//#endregion
//#region src/layer-addons/builtins/starfield.ts
function Xt(e) {
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
function Zt(e) {
	e.userData.starfieldRenderTarget || e.dispose();
}
function Qt(e, t) {
	return e.get(t.id) ?? q;
}
function $t(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? q;
	});
}
var en = j("\n  fn skyboxStudioDirectionToSourceStarfieldUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let theta = atan2(normalizedDirection.x, normalizedDirection.z);\n    let u = fract(theta / 6.283185307179586 + 0.5);\n    let v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / 3.141592653589793;\n\n    return vec2<f32>(u, v);\n  }\n");
v({
	type: "starfield",
	updateLive: (e, t) => {
		e.applyLayerParams(t), e.scheduleResourceBake(t.id, t.params);
	},
	wgsl: {
		collect: Xt,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : z();
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n }) => {
			let r = n, i = /* @__PURE__ */ new Map(), a = Object.fromEntries(e.map((e) => {
				let n = en({ direction: t }), a = k(Qt(r, e.layer), n).setName(`starfieldTexture${e.index}`);
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
function tn(e, t, n = {}) {
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
function nn(t, n, r = {}) {
	return n.filter((e) => e.enabled).reverse().reduce((n, i) => {
		let a = i.type === "group" ? [...nn(t, i.children, r), 1] : tn(t, i, r), o = y(a[3] * (i.opacity / 100));
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
function rn(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = rn(n.children, t);
		if (e) return e;
	}
	return null;
}
function an(e, t, n = {}) {
	let r = N(e), i = n.targetGroupId ? rn(r.nodes, n.targetGroupId) : null;
	return nn(t, n.targetGroupId ? i ? [i] : [] : r.nodes, n);
}
//#endregion
//#region src/baking/bake.ts
var on = 1024, sn = "0.1.0", cn = /* @__PURE__ */ new Map(), ln = /* @__PURE__ */ new Map();
function un(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function dn(e, t) {
	return ne(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: sn
	}));
}
function fn() {
	cn.clear(), ln.clear();
}
function pn(e, t = []) {
	return e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				pn(e.children, t);
				return;
			}
			e.type === "starfield" && t.push(e);
		}
	}), t;
}
function mn(e, t) {
	for (let n of e) {
		if (n.type !== "group") continue;
		if (n.id === t) return n;
		let e = mn(n.children, t);
		if (e) return e;
	}
	return null;
}
function hn(e, t, n, r, i) {
	let a = pn(r ? mn(e.nodes, r)?.children ?? [] : e.nodes);
	if (a.length === 0) return;
	let o = /* @__PURE__ */ new Map();
	return a.forEach((e) => {
		let r = i?.get(e.id);
		if (r) {
			o.set(e.id, r);
			return;
		}
		let a = oe(e.params, t, n), s = ln.get(a), c = s ?? b(e.params, t, n);
		s || ln.set(a, c), o.set(e.id, c);
	}), o;
}
function gn(e, t = {}) {
	let n = N(e), r = un(t), i = r.cache ? dn(n, r) : null;
	if (i) {
		let e = cn.get(i);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: a, targetGroupId: o, width: s } = r, c = hn(n, s, a, o, t.starfieldBakes), l = new Uint8ClampedArray(s * a * 4);
	for (let e = 0; e < a; e += 1) {
		let t = (e + .5) / a;
		for (let r = 0; r < s; r += 1) {
			let [i, d, f] = se(an(n, u((r + .5) / s, t), {
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
	return i && cn.set(i, {
		...d,
		data: new Uint8ClampedArray(l)
	}), d;
}
//#endregion
//#region src/skybox/composition.ts
function _n(e) {
	return e.filter((e) => e.enabled).reverse();
}
function vn(e) {
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
function yn(e) {
	return {
		blendMode: vn(e.blendMode),
		opacity: y(e.opacity / 100)
	};
}
function bn(e) {
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
function xn() {
	return `let softLightD = ${R("composedColor <= vec3<f32>(0.25)", "((16.0 * composedColor - vec3<f32>(12.0)) * composedColor + vec3<f32>(4.0)) * composedColor", "sqrt(composedColor)")};`;
}
function Sn(e, t) {
	let n = vn(t);
	return `${e} >= ${I(n - .5)} && ${e} < ${I(n + .5)}`;
}
function Cn(e) {
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
	].map((t, n) => `${n === 0 ? "if" : "else if"} (${Sn(e, t)}) {
          blendedColor = ${bn(t)};
        }`).join("\n");
	return `${xn()}
        ${L("blendedColor", "vec3<f32>", "effectColor.rgb")}
        ${t}
        blendedColor = clamp(blendedColor, vec3<f32>(0.0), vec3<f32>(1.0));`;
}
function wn(e, t, n, r = 0) {
	return _n(e).map((e, i) => {
		let a = e.type === "group" ? `effectColor = vec4<f32>(groupColor${r}_${i}, 1.0);` : En(e, n), o = `groupColor${r}_${i}`, s = t.get(e.id), c = s ? `${s.parameterPrefix}Opacity` : I(e.opacity / 100), l = s ? `${s.parameterPrefix}BlendMode` : I(vn(e.blendMode));
		return `{
        ${e.type === "group" ? `${L(o, "vec3<f32>", "vec3<f32>(0.0)")}
        {
          ${L("previousComposedColor", "vec3<f32>", "composedColor")}
          composedColor = vec3<f32>(0.0);
          ${wn(e.children, t, n, r + 1)}
          ${o} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${L("effectColor", "vec4<f32>", "vec4<f32>(0.0)")}
        ${a}
        let sourceAlpha = clamp(effectColor.a * ${c}, 0.0, 1.0);
        ${Cn(l)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          vec3<f32>(0.0),
          vec3<f32>(1.0)
        );
      }`;
	}).join("\n");
}
function Tn(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function En(e, t) {
	let n = t.adapters.get(e.type);
	return n ? n.adapter.createSampleExpression(e, "wgsl", { bindingsByLayerId: n.bindingsByLayerId }) : z();
}
function Dn(e) {
	return e.type === "group" ? e.children.some(Dn) : e.type === "starfield";
}
function On(e) {
	let t = _n(e), n = -1;
	return t.forEach((e, t) => {
		Dn(e) && (n = t);
	}), n >= 0 && n < t.length - 1;
}
function kn(e, t) {
	let n = _n(e), r = -1;
	return n.forEach((e, t) => {
		Dn(e) && (r = t);
	}), n.map((e, n) => {
		if (n <= r) return "";
		let i = I(e.opacity / 100);
		return e.type === "group" ? `{
        let sourceAlpha = clamp(${i}, 0.0, 1.0);
        coverageAbove = sourceAlpha + coverageAbove * (1.0 - sourceAlpha);
      }` : `{
        ${L("effectColor", "vec4<f32>", "vec4<f32>(0.0)")}
        ${En(e, t)}
        let sourceAlpha = clamp(effectColor.a * ${i}, 0.0, 1.0);
        coverageAbove = sourceAlpha + coverageAbove * (1.0 - sourceAlpha);
      }`;
	}).filter(Boolean).join("\n");
}
//#endregion
//#region src/skybox/materials.ts
function An(e) {
	return e.map((e) => {
		let t = yn(e.node);
		return {
			blendMode: A(t.blendMode),
			nodeId: e.node.id,
			opacity: A(t.opacity)
		};
	});
}
function jn(e, t) {
	for (let n of e) if (n.enabled) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = jn(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
function Mn(e, t) {
	e.forEach((e) => {
		let n = jn(t.nodes, e.nodeId);
		if (!n) return;
		let r = yn(n);
		e.opacity.value = r.opacity, e.blendMode.value = r.blendMode;
	});
}
function Nn(e, t) {
	let n = e.find((e) => e.nodeId === t.id);
	if (!n) return;
	let r = yn(t);
	n.opacity.value = r.opacity, n.blendMode.value = r.blendMode;
}
function Pn(e, t) {
	e.userData.applyCompositionParams = t;
}
function Fn(e, t) {
	e.userData.applyLayerComposition = t;
}
function In(e) {
	let t = [];
	function n(e) {
		_n(e).forEach((e) => {
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
function Ln(e) {
	return new Map(e.map((e) => [e.node.id, e]));
}
function Rn() {
	return x().map((e) => e.wgsl).filter((e) => !!e);
}
function zn(e, t, n, r, i) {
	let a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = {}, c = {};
	return Rn().forEach((i) => {
		let l = i.collect(e.nodes), u = i.createUniforms(l), d = i.createSampleNodes?.({
			bindings: l,
			direction: t,
			imageTextures: i.type === "starfield" ? r : n,
			uniforms: u
		}), f = {
			adapter: i,
			bindings: l,
			bindingsByLayerId: Tn(l),
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
function Bn(e, t) {
	return e.adapters.get(t);
}
function Vn(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Vn(e.children, t);
				return;
			}
			t(e);
		}
	});
}
function Hn(e, t) {
	let n = e.adapters.get(t.type);
	n && n.adapter.updateUniforms(n.uniforms, t);
}
function Un(e, t, n) {
	let r = Ln(n), i = wn(e.nodes, r, t);
	return j(`
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
function Wn(e, t, n, r, i) {
	let a = In(e.nodes), o = An(a), s = zn(e, t, n, r, i), c = Bn(s, "image"), l = c?.uniforms ?? [], u = c?.samples, d = Bn(s, "starfield")?.samples;
	return {
		colorNode: Un(e, s, a)({
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
function Gn() {
	let e = pe.mul(2).sub(1), t = le.mul(he(e.x, e.y.negate(), 1, 1)), n = t.xyz.div(t.w), r = ue.mul(he(n, 0)).xyz;
	return de(r);
}
function Kn(e, t, n, r, i, a) {
	let o = new D(), s = ce(() => {
		let e = O;
		return e.z.assign(e.w), e;
	})();
	o.side = E.BackSide, o.depthTest = !1, o.depthWrite = !1, o.vertexNode = s;
	let { colorNode: c, compositionUniforms: l, imageSamples: u, imageUniforms: d, layerRuntime: f, starfieldSamples: p } = Wn(e, Gn(), n, r, i), m = a ? x().flatMap((e) => {
		let n = f.adapters.get(e.type);
		if (!e.wgslEditorOverlay || !n) return [];
		let r = n.bindings;
		return [{
			bindings: r,
			editorUniforms: It(r, t)
		}];
	}) : [], h = c;
	return m.forEach(({ bindings: e, editorUniforms: t }) => {
		e.forEach((e, n) => {
			let r = f.editorProjectionByLayerId.get(e.layer.id);
			r && (h = zt({
				color: h,
				activeValue: t[n].active,
				uv: r.uv,
				valid: r.valid
			}));
		});
	}), o.colorNode = h, m.length > 0 && Rt(o, (e) => {
		m.forEach(({ editorUniforms: t }) => Lt(t, e));
	}), o.userData.webGpuLayerRuntime = f, o.userData.applyLayerParams = (e) => Hn(f, e), Pn(o, (e) => Mn(l, e)), Fn(o, (e) => Nn(l, e)), mt(o, (e, t) => pt(d, e, t)), o.userData.applyImageTextures = (e) => bt(u?.sampleData ?? /* @__PURE__ */ new Map(), e), o.userData.applyStarfieldTextures = (e) => $t(p?.sampleData ?? /* @__PURE__ */ new Map(), e), o.userData.debugImageTextureSlots = f.textureSlotsByLayerId, o;
}
function qn(e, t) {
	let n = kn(e.nodes, t);
	return j(`
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
function Jn(e, t, n, r) {
	let i = new D();
	i.side = E.BackSide, i.depthTest = !1, i.depthWrite = !1, i.vertexNode = ce(() => {
		let e = O;
		return e.z.assign(e.w), e;
	})();
	let a = Gn(), o = zn(e, a, t, n, r), s = Bn(o, "image"), c = s?.samples, l = s?.uniforms ?? [], u = Bn(o, "starfield")?.samples;
	return i.colorNode = qn(e, o)({
		direction: a,
		...o.sampleParameters
	}), i.userData.applyLayerParams = (e) => Hn(o, e), mt(i, (e, t) => pt(l, e, t)), i.userData.applyImageTextures = (e) => bt(c?.sampleData ?? /* @__PURE__ */ new Map(), e), i.userData.applyStarfieldTextures = (e) => $t(u?.sampleData ?? /* @__PURE__ */ new Map(), e), i;
}
var Yn = j("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.x, -normalizedDirection.z);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n"), Xn = j("\n  fn skyboxStudioEquirectUvToDirection(uv: vec2<f32>) -> vec3<f32> {\n    let lambda = (uv.x - 0.5) * 6.283185307179586;\n    let phi = (uv.y - 0.5) * 3.141592653589793;\n    let cosPhi = cos(phi);\n\n    return normalize(vec3<f32>(cosPhi * sin(lambda), sin(phi), -cosPhi * cos(lambda)));\n  }\n");
function Zn(e, t, n, r = {}) {
	let i = new D();
	i.side = E.DoubleSide, i.depthTest = !1, i.depthWrite = !1;
	let a = fe.xy.mul(.5).add(.5), { colorNode: o } = Wn(e, de(Xn({ uv: r.flipY ? me(a.x, a.y.oneMinus()) : a })), t, n, /* @__PURE__ */ new Map());
	return i.colorNode = o, i;
}
function Qn(e) {
	let t = new D(), n = ce(() => {
		let e = O;
		return e.z.assign(e.w), e;
	})(), r = Gn();
	return t.side = E.BackSide, t.depthTest = !1, t.depthWrite = !1, t.vertexNode = n, t.colorNode = k(e, Yn({ direction: r })), t;
}
function $n(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function er(e, t = {}) {
	let n = gn(e, t), r = $n(n.width, n.height), i = r.getContext("2d");
	if (!i || !("putImageData" in i)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	i.putImageData(new ImageData(n.data, n.width, n.height), 0, 0);
	let a = new E.CanvasTexture(r);
	return a.mapping = E.EquirectangularReflectionMapping, a.wrapS = E.RepeatWrapping, a.wrapT = E.ClampToEdgeWrapping, a.colorSpace = E.SRGBColorSpace, a.flipY = !1, a.needsUpdate = !0, a;
}
function tr(e) {
	return Qn(e);
}
function nr(e) {
	return e === "baked-texture" ? "baked-texture" : "live-webgpu";
}
function rr(e, t, n) {
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
		geometry: e.geometry?.type ?? M.type,
		nodes: e.nodes.map(r),
		renderMode: t
	});
}
function X(e, t) {
	for (let n of e) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = X(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
//#endregion
//#region src/skybox.ts
var ir = { starsOmitted: !0 }, ar = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: M,
	nodes: [],
	version: 2
}, or = class extends E.Mesh {
	#e = {};
	#t = { ...Mt };
	#n = !1;
	#r = M;
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
	#s = ar;
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
	#v = new E.Scene();
	#y = null;
	#b = null;
	#x = null;
	#S = null;
	#C = null;
	#w = new E.Vector2();
	constructor() {
		super(P(M), Kn(ar, Mt, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), !1)), this.frustumCulled = !1, this.renderOrder = -1, this.onBeforeRender = ((e, t, n) => {
			this.renderCoveragePrepass(e, n);
		});
	}
	fromManifest(e) {
		return this.#s = N(e), this.applyGeometry(this.#s.geometry ?? M), this;
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
		let t = ge(e);
		if (this.#r.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#r = t, this.geometry = P(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#l?.dispose(), this.#l = null;
	}
	disposeStarfieldTextures() {
		this.#m.forEach((e) => {
			clearTimeout(e);
		}), this.#m.clear(), this.#g.forEach((e) => Zt(e)), this.#g.clear(), this.#h.clear(), this.#f?.dispose(), this.#f = null;
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
		if (!n?.createGlints || nr(this.#u) !== "live-webgpu") {
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
		return nr(this.#u) === "live-webgpu" && this.#_.size > 0 && On(this.#s.nodes);
	}
	disposeCoverage() {
		this.#b &&= (this.#v.remove(this.#b), null), this.#x?.dispose(), this.#x = null, this.#C = null, this.#_.forEach(({ handle: e }) => e.setCoverageTexture(null));
	}
	syncCoverage(e) {
		if (!this.coverageActive()) {
			this.disposeCoverage();
			return;
		}
		(!this.#x || this.#C !== e) && (this.#x?.dispose(), this.#b && this.#v.remove(this.#b), this.#x = Jn(this.#s, this.#a, this.#g, /* @__PURE__ */ new Map()), this.#x.userData.applyImageTextures?.(this.#a), this.#i.forEach((e, t) => {
			this.#x?.userData.applyImageLayerPlacement?.(t, e);
		}), this.#y ||= P(M), this.#b = new E.Mesh(this.#y, this.#x), this.#b.frustumCulled = !1, this.#v.add(this.#b), this.#S ||= new E.RenderTarget(1, 1, { depthBuffer: !1 }), this.#C = e);
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
		Vn(this.#s.nodes, (t) => {
			if (t.type !== "starfield") return;
			e.add(t.id), this.syncStarfieldGlint(t.id, t.params);
			let n = this.#f?.createBakeKey(t.params, void 0, null, ir) ?? "";
			this.#h.get(t.id) !== n && this.scheduleStarfieldTextureBake(t.id, t.params);
		}), Array.from(this.#g.keys()).forEach((t) => {
			if (e.has(t)) return;
			let n = this.#g.get(t);
			n && Zt(n), this.#g.delete(t), this.#h.delete(t);
		}), Array.from(this.#_.keys()).forEach((t) => {
			e.has(t) || this.disposeStarfieldGlint(t);
		}), Array.from(this.#m.entries()).forEach(([t, n]) => {
			e.has(t) || (clearTimeout(n), this.#m.delete(t));
		});
	}
	scheduleStarfieldTextureBake(e, t) {
		this.syncStarfieldGlint(e, t);
		let n = this.#f?.createBakeKey(t, void 0, null, ir) ?? "";
		if (this.#h.get(e) === n) return;
		let r = this.#m.get(e);
		r && clearTimeout(r);
		let i = setTimeout(() => {
			this.#m.delete(e);
			let t = X(this.#s.nodes, e);
			if (t?.type !== "starfield") return;
			let r = this.#f?.createBakeKey(t.params, void 0, null, ir) ?? "";
			if (r !== n) {
				this.scheduleStarfieldTextureBake(e, t.params);
				return;
			}
			if (!this.#f && this.#d && (this.#f = C(this.#d)), !this.#f?.canBake()) return;
			let i = this.#f.bakeTexture(t.params, r, void 0, null, ir), a = this.#g.get(e);
			a && a !== i && Zt(a), this.#g.set(e, i), this.#h.set(e, r), a ? this.refreshStarfieldTextureBindings() : (this.#c = null, this.setManifest(this.#s)), this.dispatchEvent({ type: "starfieldtexturechange" });
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
		this.material.userData.applyCompositionParams?.(this.#s), this.material.userData.applyLayerParams && Vn(this.#s.nodes, this.material.userData.applyLayerParams), this.material.userData.applyImageTextures?.(this.#a), this.material.userData.applyStarfieldTextures?.(this.#g), this.material.userData.applyEditorLayerState?.(this.#t), this.#i.forEach((e, t) => {
			this.material.userData.applyImageLayerPlacement?.(t, e);
		}), this.#x && (this.#x.userData.applyLayerParams && Vn(this.#s.nodes, this.#x.userData.applyLayerParams), this.#x.userData.applyImageTextures?.(this.#a), this.#i.forEach((e, t) => {
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
		let n = X(this.#s.nodes, e);
		return n?.type === "image" && (n.params = {
			...n.params,
			placement: t
		}), this.#i.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this.#x?.userData.applyImageLayerPlacement?.(e, t), this;
	}
	updateLayerComposition(e, t) {
		let n = X(this.#s.nodes, e);
		return n ? (t.blendMode !== void 0 && (n.blendMode = t.blendMode), t.opacity !== void 0 && (n.opacity = t.opacity), this.material.userData.applyLayerComposition?.(n), this) : this;
	}
	updateLayer(e, t) {
		let n = X(this.#s.nodes, e);
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
		let t = N(e);
		this.#s = t, this.applyGeometry(this.#s.geometry ?? this.#r), this.syncStarfieldTextures();
		let n = nr(this.#u), r = rr(this.#s, n, this.#n);
		if (this.#c === r && n === "live-webgpu") return this.applyLiveManifestUniformUpdates(), this.syncCoverage(r), this;
		if (n === "live-webgpu") this.replaceMaterial(Kn(this.#s, this.#t, this.#a, this.#g, /* @__PURE__ */ new Map(), this.#n));
		else {
			let e = er(this.#s, this.#e);
			this.replaceMaterial(tr(e), e);
		}
		return this.#c = r, this.syncCoverage(r), this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(tr(e)), this.#c = null, this;
	}
	invalidateBakeCache() {
		return fn(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture(), this.disposeStarfieldTextures(), this.disposeStarfieldGlints(), this.disposeCoverage(), this.#y?.dispose(), this.#y = null, this.#S?.dispose(), this.#S = null;
	}
};
//#endregion
//#region src/baking/skybox-gpu-bake.ts
function sr(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function cr(e, t, n, r) {
	let i = new E.RenderTarget(e, t, {
		depthBuffer: !1,
		format: E.RGBAFormat,
		generateMipmaps: !1,
		magFilter: E.LinearFilter,
		minFilter: E.LinearFilter,
		stencilBuffer: !1,
		type: n ? r ? E.FloatType : E.HalfFloatType : E.UnsignedByteType,
		wrapS: E.RepeatWrapping,
		wrapT: E.ClampToEdgeWrapping
	});
	return i.texture.name = "GPU baked skybox composition", i.texture.colorSpace = n ? E.LinearSRGBColorSpace : E.SRGBColorSpace, i.texture.generateMipmaps = !1, i;
}
var lr = class {
	#e;
	#t = new E.Scene();
	#n = new E.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#r = new E.PlaneGeometry(2, 2);
	constructor(e) {
		this.#e = e;
	}
	canBake() {
		return sr(this.#e);
	}
	bakeRenderTarget(e, t) {
		let n = Math.max(1, Math.floor(t.width)), r = Math.max(1, Math.floor(t.height)), i = Zn(N(e), t.imageTextures ?? /* @__PURE__ */ new Map(), t.starfieldTextures ?? /* @__PURE__ */ new Map(), { flipY: t.flipY }), a = cr(n, r, !!t.hdr, !!t.float), o = new E.Mesh(this.#r, i);
		o.frustumCulled = !1;
		let s = this.#e.getRenderTarget(), c = this.#e.autoClear, l = new E.Color(), u = this.#e.getClearAlpha();
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
function ur(e) {
	return sr(e) ? new lr(e) : null;
}
//#endregion
//#region src/loader/loader.ts
var Z = class extends Error {
	constructor(e, t) {
		super(e), this.name = "LoaderAssetError", this.entry = t.entry ?? null, this.event = t.event, this.id = t.id, this.phase = t.phase, this.src = t.src;
	}
}, dr = class {
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
function fr(e) {
	return e.colorSpace = E.SRGBColorSpace, e.wrapS = E.ClampToEdgeWrapping, e.wrapT = E.ClampToEdgeWrapping, e.flipY = !1, e.minFilter = E.LinearMipmapLinearFilter, e.magFilter = E.LinearFilter, e.generateMipmaps = !0, e.needsUpdate = !0, e;
}
var Q = class {
	static {
		this.type = "texture";
	}
	#e = new E.TextureLoader();
	async load(e, t) {
		let n = Array.isArray(e) ? e : [e], r = null;
		for (let e of n) try {
			return fr(await this.#e.loadAsync(e));
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
function pr(e) {
	let t = [], n = (e) => {
		for (let r of e) r.type === "group" ? n(r.children) : r.type === "image" && t.push(r);
	};
	return n(e.nodes), t;
}
function mr(e) {
	switch (e.slice(e.lastIndexOf(".") + 1).toLowerCase()) {
		case "jpg":
		case "jpeg": return "image/jpeg";
		case "webp": return "image/webp";
		default: return "image/png";
	}
}
function hr(e, t) {
	let n = e.slice();
	return URL.createObjectURL(new Blob([n], { type: t }));
}
async function gr(e) {
	if (typeof e == "string") {
		let t = await fetch(e);
		if (!t.ok) throw Error(`Could not fetch zip bundle (${t.status} ${t.statusText}).`);
		return new Uint8Array(await t.arrayBuffer());
	}
	return e instanceof Uint8Array ? e : e instanceof ArrayBuffer ? new Uint8Array(e) : new Uint8Array(await e.arrayBuffer());
}
async function _r(e) {
	let t = e.slice(), n = new Blob([t]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
	return new Uint8Array(await new Response(n).arrayBuffer());
}
var vr = 101010256, yr = 33639248, br = 67324752, xr = 22, Sr = 65535;
function Cr(e) {
	let t = Math.max(0, e.byteLength - xr - Sr);
	for (let n = e.byteLength - xr; n >= t; --n) if (e.getUint32(n, !0) === vr) return n;
	return -1;
}
async function wr(e) {
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = Cr(t);
	if (n < 0) throw Error("Invalid zip bundle: end-of-central-directory record not found.");
	let r = t.getUint16(n + 10, !0), i = t.getUint32(n + 16, !0), a = new TextDecoder(), o = [];
	for (let n = 0; n < r; n += 1) {
		if (t.getUint32(i, !0) !== yr) throw Error("Invalid zip bundle: malformed central directory.");
		let n = t.getUint16(i + 10, !0), r = t.getUint32(i + 20, !0), s = t.getUint16(i + 28, !0), c = t.getUint16(i + 30, !0), l = t.getUint16(i + 32, !0), u = t.getUint32(i + 42, !0), d = a.decode(e.subarray(i + 46, i + 46 + s));
		if (t.getUint32(u, !0) !== br) throw Error(`Invalid zip bundle: bad local header for "${d}".`);
		let f = t.getUint16(u + 26, !0), p = t.getUint16(u + 28, !0), m = u + 30 + f + p, h = e.subarray(m, m + r);
		if (n === 0) o.push(Promise.resolve([d, h]));
		else if (n === 8) o.push(_r(h).then((e) => [d, e]));
		else throw Error(`Unsupported zip compression method ${n} for "${d}".`);
		i += 46 + s + c + l;
	}
	return Object.fromEntries(await Promise.all(o));
}
async function Tr(e, t = {}) {
	let n = t.toAssetUrl ?? hr, r = await wr(await gr(e)), i = r[$];
	if (!i) throw Error(`Zip bundle is missing ${$}.`);
	let a = JSON.parse(new TextDecoder().decode(i)), o = N(a), s = a.assets ?? {}, c = /* @__PURE__ */ new Map(), l = [];
	for (let [e, t] of Object.entries(r)) {
		if (e === $) continue;
		let r = n(t, s[e]?.mimeType ?? mr(e), e);
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
async function Er(e) {
	let t = await fetch(new URL($, e).href);
	if (!t.ok) throw Error(`Could not load ${$} (${t.status}).`);
	return {
		manifest: N(await t.json()),
		resolveAssetUrl: (t) => new URL(t, e).href,
		dispose: () => {}
	};
}
async function Dr(e, t) {
	let n = t.split("/").filter(Boolean), r = e;
	for (let e = 0; e < n.length - 1; e += 1) r = await r.getDirectoryHandle(n[e]);
	let i = await r.getFileHandle(n[n.length - 1]);
	return URL.createObjectURL(await i.getFile());
}
async function Or(e) {
	let t = await (await e.getFileHandle($)).getFile(), n = N(JSON.parse(await t.text())), r = /* @__PURE__ */ new Map();
	for (let t of pr(n)) t.params.src && r.set(t.params.src, await Dr(e, t.params.src));
	return {
		manifest: n,
		resolveAssetUrl: (e) => r.get(e) ?? e,
		dispose: () => {
			for (let e of r.values()) typeof URL < "u" && URL.revokeObjectURL && URL.revokeObjectURL(e);
			r.clear();
		}
	};
}
async function kr(e) {
	let t = structuredClone(e.manifest);
	for (let n of pr(t)) {
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
function Ar() {
	let e = new dr();
	return e.register(Q.type, Q), e;
}
async function jr(e, t = {}) {
	let n = t.loader ?? Ar(), r = pr(e.manifest).filter((e) => e.enabled && e.params.src), i = r.map((t) => ({
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
function Mr(e) {
	return typeof e == "object" && !!e && "manifest" in e && typeof e.resolveAssetUrl == "function";
}
async function Nr(e, t = {}) {
	let { onProgress: n, ...r } = t, i = !Mr(e), a = Mr(e) ? e : await Tr(e, r), o = Ar(), s = await jr(a, {
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
export { on as DEFAULT_BAKE_WIDTH, Ct as DEFAULT_SPOT_BASE_ANGULAR_RADIUS, V as IMAGE_PLACEMENT_ELEVATION_LIMIT, dr as Loader, Z as LoaderAssetError, or as Skybox, lr as SkyboxGpuBakeService, Q as TextureLoaderExtension, gn as bakeSkyboxImageData, te as blendChannel, y as clamp, pr as collectImageLayers, m as compositeBlendChannel, e as compositeOver, fr as configureSkyboxImageTexture, G as createAngularDecalPlacement, dn as createBakeCacheKey, er as createBakedSkyboxTexture, Et as createDefaultSpotParams, Xe as createImagePlacementTangents, P as createSkyboxGeometry, ur as createSkyboxGpuBakeService, ve as createSkyboxWireGeometry, Qe as directionFromPosition, an as evaluateSkyboxDirection, c as getLayerRuntimeAdapter, x as getLayerRuntimeAdapters, fn as invalidateBakeCache, s as isRegisteredLayerType, w as linearChannelToSrgb, se as linearRgbToSrgbBytes, Or as loadBundleFromDirectory, Er as loadBundleFromUrl, Tr as loadBundleFromZip, Nr as loadSkyboxBundle, jr as loadSkyboxImageTextures, N as migrateManifestToV2, K as normalizeImagePlacement, Y as normalizeSpotParams, W as normalizeVector, S as parseHexColor, $e as placementFromPosition, rt as placementFromRotation, tt as placementFromScale, Ze as positionFromPlacement, Dt as positionFromSpot, it as projectDirectionToImageUv, kt as radiusScaleFromSpot, v as registerLayerRuntimeAdapter, kr as rehydrateImagePixels, un as resolveBakeOptions, nt as rotationFromPlacement, et as scaleFromPlacement, jt as spotContainsDirection, Ot as spotFromPosition, At as spotFromRadiusScale, re as srgbChannelToLinear };
