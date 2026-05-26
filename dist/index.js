import * as e from "three";
import { NodeMaterial as t } from "three/webgpu";
import { Fn as n, cameraPosition as r, modelViewProjection as i, normalize as a, positionWorld as o, texture as s, uniform as c, vec2 as l, wgslFn as u } from "three/tsl";
//#region math.ts
function d(e, t = 0, n = 1) {
	return Math.min(n, Math.max(t, e));
}
function f(e) {
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
function p(e) {
	let t = d(e);
	return t <= .0031308 ? t * 12.92 : 1.055 * t ** (1 / 2.4) - .055;
}
function m(e) {
	let t = e.trim().replace(/^#/, ""), n = t.length === 3 ? t.split("").map((e) => `${e}${e}`).join("") : t;
	return /^[0-9a-fA-F]{6}$/.test(n) ? [
		0,
		2,
		4
	].map((e) => f(Number.parseInt(n.slice(e, e + 2), 16) / 255)) : [
		1,
		1,
		1
	];
}
function h(e) {
	return e.map((e) => Math.round(p(e) * 255));
}
function g(e) {
	return e <= .25 ? ((16 * e - 12) * e + 4) * e : Math.sqrt(e);
}
function _(e, t, n) {
	let r = d(t), i = d(n);
	switch (e) {
		case "multiply": return r * i;
		case "screen": return r + i - r * i;
		case "overlay": return r <= .5 ? 2 * r * i : 1 - 2 * (1 - r) * (1 - i);
		case "darken": return Math.min(r, i);
		case "lighten": return Math.max(r, i);
		case "color-dodge": return r === 0 ? 0 : i === 1 ? 1 : Math.min(1, r / (1 - i));
		case "color-burn": return r === 1 ? 1 : i === 0 ? 0 : 1 - Math.min(1, (1 - r) / i);
		case "hard-light": return i <= .5 ? 2 * r * i : r + (2 * i - 1) - r * (2 * i - 1);
		case "soft-light": return i <= .5 ? r - (1 - 2 * i) * r * (1 - r) : r + (2 * i - 1) * (g(r) - r);
		case "difference": return Math.abs(r - i);
		case "exclusion": return r + i - 2 * r * i;
		default: return i;
	}
}
function v(e, t, n, r) {
	let i = d(t), a = d(r);
	return d(d(_(e, i, n)) * a + i * (1 - a));
}
function y(e, t, n, r) {
	return [
		v(r, e[0], t[0], n),
		v(r, e[1], t[1], n),
		v(r, e[2], t[2], n)
	];
}
function b(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n += 1) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return (t >>> 0).toString(36);
}
//#endregion
//#region manifest.ts
var x = { type: "box" };
function S(e) {
	return e.version === 2 ? {
		...e,
		geometry: e.geometry ?? x
	} : {
		composition: e.composition,
		geometry: x,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	};
}
//#endregion
//#region evaluator.ts
var C = Math.PI * 2;
function w(e, t, n) {
	return e + (t - e) * n;
}
function ee(e) {
	return e.map((e) => ({
		alpha: d(e.opacity / 100),
		color: m(e.color),
		t: d(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function te(e, t) {
	if (e.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = d(t), r = e[0], i = e[e.length - 1];
	if (n <= r.t) return [...r.color, r.alpha];
	if (n >= i.t) return [...i.color, i.alpha];
	for (let t = 0; t < e.length - 1; t += 1) {
		let r = e[t], i = e[t + 1];
		if (n < r.t || n > i.t) continue;
		let a = i.t - r.t, o = a <= 0 ? 0 : (n - r.t) / a;
		return [
			w(r.color[0], i.color[0], o),
			w(r.color[1], i.color[1], o),
			w(r.color[2], i.color[2], o),
			w(r.alpha, i.alpha, o)
		];
	}
	return [...i.color, i.alpha];
}
function ne(e) {
	let t = e * Math.PI / 180;
	return [
		Math.sin(t),
		Math.cos(t),
		0
	];
}
function re(e, t) {
	let n = ne(t.rotation), r = e[0] * n[0] + e[1] * n[1] + e[2] * n[2];
	return te(ee(t.stops), r * .5 + .5);
}
function ie(e, t) {
	let n = (e - .5) * C, r = (.5 - t) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function T(e, t) {
	let n = (e - .5) * C, r = (t - .5) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function E(e) {
	let t = Math.hypot(e[0], e[1], e[2]);
	return t <= 0 ? [
		0,
		1,
		0
	] : [
		e[0] / t,
		e[1] / t,
		e[2] / t
	];
}
function ae(e, t, n) {
	if (t <= 0) return e;
	let r = Math.max(1e-4, n), i = [
		Math.sin((e[1] * r + .23) * C) * Math.cos((e[2] * r + .41) * C),
		Math.cos((e[2] * r + .17) * C) * Math.sin((e[0] * r + .37) * C),
		Math.sin((e[0] * r - .31) * C) * Math.cos((e[1] * r + .29) * C)
	];
	return E([
		e[0] + i[0] * t,
		e[1] + i[1] * t,
		e[2] + i[2] * t
	]);
}
function oe(e, t) {
	return 1 - d(e[0] * t[0] + e[1] * t[1] + e[2] * t[2], -1, 1);
}
function se(e, t) {
	if (t.anchors.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = ae(e, d(t.amplitude, 0, .6), Math.max(1e-4, t.frequency)), r = 0, i = 0, a = 0, o = 0;
	return t.anchors.forEach((e) => {
		let s = oe(n, ie(e.x, e.y)), c = t.mode === "gaussian" ? Math.exp(-(s * s) / (2 * (.46 / t.power) ** 2)) : 1 / (s + 5e-4) ** t.power, l = m(e.color);
		r += l[0] * c, i += l[1] * c, a += l[2] * c, o += c;
	}), o <= 0 ? [
		0,
		0,
		0,
		0
	] : [
		r / o,
		i / o,
		a / o,
		1
	];
}
function D(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function O(e, t, n) {
	return [
		w(e[0], t[0], n),
		w(e[1], t[1], n),
		w(e[2], t[2], n),
		w(e[3], t[3], n)
	];
}
function k(e, t, n) {
	let r = Math.min(e.width - 1, Math.max(0, t)), i = (Math.min(e.height - 1, Math.max(0, n)) * e.width + r) * 4, a = e.pixels?.[i] ?? 0, o = e.pixels?.[i + 1] ?? 0, s = e.pixels?.[i + 2] ?? 0, c = e.pixels?.[i + 3] ?? 255;
	return [
		f(a / 255),
		f(o / 255),
		f(s / 255),
		c / 255
	];
}
function ce(e) {
	let t = e, n = E(t.centerDirection ?? t.normal ?? t.center ?? [
		0,
		0,
		-1
	]), r = E(t.tangentX ?? [
		1,
		0,
		0
	]), i = E(t.tangentY ?? [
		0,
		1,
		0
	]), a = t.center ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, o = typeof t.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t.width ?? .4) / (2 * a));
	return {
		angularHeight: typeof t.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t.height ?? .3) / (2 * a)),
		angularWidth: o,
		centerDirection: n,
		tangentX: r,
		tangentY: i
	};
}
function le(e, t) {
	let n = t.placement;
	if (!n || !t.pixels || t.width <= 0 || t.height <= 0) return [
		0,
		0,
		0,
		0
	];
	let r = ce(n), i = E(e), a = D(i, r.centerDirection);
	if (a <= 0) return [
		0,
		0,
		0,
		0
	];
	let o = D(i, r.tangentX) / a, s = D(i, r.tangentY) / a, c = Math.tan(r.angularWidth / 2), l = Math.tan(r.angularHeight / 2);
	if (c <= 0 || l <= 0 || o < -c || o > c || s < -l || s > l) return [
		0,
		0,
		0,
		0
	];
	let u = o / (2 * c) + .5, d = .5 - s / (2 * l);
	if (u < 0 || u > 1 || d < 0 || d > 1) return [
		0,
		0,
		0,
		0
	];
	let f = u * (t.width - 1), p = d * (t.height - 1), m = Math.floor(f), h = Math.floor(p), g = m + 1, _ = h + 1, v = f - m, y = p - h;
	return O(O(k(t, m, h), k(t, g, h), v), O(k(t, m, _), k(t, g, _), v), y);
}
function ue(e, t) {
	return t.type === "gradient" ? re(e, t.params) : t.type === "field-gradient" ? se(e, t.params) : le(e, t.params);
}
function de(e, t) {
	return t.filter((e) => e.enabled).reverse().reduce((t, n) => {
		let r = n.type === "group" ? [...de(e, n.children), 1] : ue(e, n), i = d(r[3] * (n.opacity / 100));
		return y(t, [
			r[0],
			r[1],
			r[2]
		], i, n.blendMode);
	}, [
		0,
		0,
		0
	]);
}
function fe(e, t, n) {
	if (!n || n.opacity <= 0 || n.radius <= 0 || 1 - d(D(t, n.direction), -1, 1) > n.radius) return e;
	let r = m(n.color), i = d(n.opacity);
	return [
		r[0] * i + e[0] * (1 - i),
		r[1] * i + e[1] * (1 - i),
		r[2] * i + e[2] * (1 - i)
	];
}
function pe(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = pe(n.children, t);
		if (e) return e;
	}
	return null;
}
function me(e, t, n = {}) {
	let r = S(e), i = n.targetGroupId ? pe(r.nodes, n.targetGroupId) : null;
	return fe(de(t, n.targetGroupId ? i ? [i] : [] : r.nodes), t, r.selectionDot);
}
//#endregion
//#region bake.ts
var he = 1024, ge = "0.1.0", A = /* @__PURE__ */ new Map();
function _e(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function ve(e, t) {
	return b(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: ge
	}));
}
function ye() {
	A.clear();
}
function be(e, t = {}) {
	let n = _e(t), r = n.cache ? ve(e, n) : null;
	if (r) {
		let e = A.get(r);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: i, targetGroupId: a, width: o } = n, s = new Uint8ClampedArray(o * i * 4);
	for (let t = 0; t < i; t += 1) {
		let n = (t + .5) / i;
		for (let r = 0; r < o; r += 1) {
			let [i, c, l] = h(me(e, T((r + .5) / o, n), { targetGroupId: a })), u = (t * o + r) * 4;
			s[u] = i, s[u + 1] = c, s[u + 2] = l, s[u + 3] = 255;
		}
	}
	let c = {
		data: s,
		height: i,
		width: o
	};
	return r && A.set(r, {
		...c,
		data: new Uint8ClampedArray(s)
	}), c;
}
//#endregion
//#region Skybox.ts
var j = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: x,
	nodes: [],
	version: 2
}, M = .8, N = new e.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, e.RGBAFormat);
N.colorSpace = e.SRGBColorSpace, N.needsUpdate = !0;
function P(e, t) {
	return +(t === e);
}
function xe(e, t) {
	return e.map((e) => ({
		layerId: e.layer.id,
		node: c(P(e.layer.id, t))
	}));
}
function Se(e, t) {
	e.forEach((e) => {
		e.node.value = P(e.layerId, t);
	});
}
function Ce(e, t) {
	return Object.fromEntries(e.map((e) => [`imageHover${e.index}`, { value: P(e.layer.id, t) }]));
}
function we(e, t, n) {
	t.forEach((t) => {
		let r = `imageHover${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = P(t.layer.id, n));
	});
}
function Te(e, t) {
	e.userData.applyHoveredImageLayerId = t;
}
function F(t) {
	if (!t) return {
		centerDirection: new e.Vector3(0, 0, -1),
		halfSize: new e.Vector2(0, 0),
		tangentX: new e.Vector3(1, 0, 0),
		tangentY: new e.Vector3(0, 1, 0)
	};
	let n = Ye(t);
	return {
		centerDirection: new e.Vector3(...n.centerDirection),
		halfSize: new e.Vector2(Math.max(0, Math.tan(n.angularWidth / 2)), Math.max(0, Math.tan(n.angularHeight / 2))),
		tangentX: new e.Vector3(...n.tangentX),
		tangentY: new e.Vector3(...n.tangentY)
	};
}
function Ee(e) {
	return e.map((e) => {
		let t = F(e.layer.params.placement);
		return {
			centerDirection: c(t.centerDirection),
			halfSize: c(t.halfSize),
			layerId: e.layer.id,
			tangentX: c(t.tangentX),
			tangentY: c(t.tangentY)
		};
	});
}
function De(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = F(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function Oe(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = F(e.layer.params.placement);
		return [
			[`imageCenterDirection${e.index}`, { value: t.centerDirection }],
			[`imageTangentX${e.index}`, { value: t.tangentX }],
			[`imageTangentY${e.index}`, { value: t.tangentY }],
			[`imageHalfSize${e.index}`, { value: t.halfSize }]
		];
	}));
}
function ke(e, t, n, r) {
	let i = t.find((e) => e.layer.id === n);
	if (!i) return;
	let a = F(r);
	e.uniforms[`imageCenterDirection${i.index}`]?.value.copy(a.centerDirection), e.uniforms[`imageTangentX${i.index}`]?.value.copy(a.tangentX), e.uniforms[`imageTangentY${i.index}`]?.value.copy(a.tangentY), e.uniforms[`imageHalfSize${i.index}`]?.value.copy(a.halfSize);
}
function Ae(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function I(t) {
	let n = t * Math.PI / 180;
	return new e.Vector3(Math.sin(n), Math.cos(n), 0).normalize();
}
function L(e) {
	return [...e.stops].map((e) => ({
		color: e.color,
		opacity: d(e.opacity / 100),
		t: d(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function R(t) {
	let [n, r, i] = m(t.color);
	return new e.Vector4(n, r, i, t.opacity);
}
function z(e) {
	return +(e === "gaussian");
}
function B(t, n) {
	let r = (d(t) - .5) * Math.PI * 2, i = (.5 - d(n)) * Math.PI, a = Math.cos(i);
	return new e.Vector3(a * Math.cos(r), Math.sin(i), a * Math.sin(r)).normalize();
}
function V(t) {
	let [n, r, i] = m(t);
	return new e.Vector3(n, r, i);
}
function je(e) {
	return e.map((e) => {
		let t = L(e.layer.params);
		return {
			axis: c(I(e.layer.params.rotation)),
			layerId: e.layer.id,
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t[n] ?? {
					color: "#000000",
					opacity: 0,
					t: 0
				};
				return {
					color: c(R(r)),
					t: c(r.t)
				};
			})
		};
	});
}
function Me(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = L(t.params);
	n.axis.value.copy(I(t.params.rotation)), n.stops.forEach((e, t) => {
		let n = r[t] ?? {
			color: "#000000",
			opacity: 0,
			t: 0
		};
		e.color.value.copy(R(n)), e.t.value = n.t;
	});
}
function Ne(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = L(e.layer.params);
		return [[`${e.parameterPrefix}Axis`, { value: I(e.layer.params.rotation) }], ...Array.from({ length: e.stopCount }, (n, r) => {
			let i = t[r] ?? {
				color: "#000000",
				opacity: 0,
				t: 0
			};
			return [[`${e.parameterPrefix}StopColor${r}`, { value: R(i) }], [`${e.parameterPrefix}StopT${r}`, { value: i.t }]];
		}).flat()];
	}));
}
function Pe(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	if (!r) return;
	let i = L(t.params);
	e.uniforms[`${r.parameterPrefix}Axis`]?.value.copy(I(t.params.rotation)), Array.from({ length: r.stopCount }, (t, n) => {
		let a = i[n] ?? {
			color: "#000000",
			opacity: 0,
			t: 0
		};
		e.uniforms[`${r.parameterPrefix}StopColor${n}`]?.value.copy(R(a)), e.uniforms[`${r.parameterPrefix}StopT${n}`] && (e.uniforms[`${r.parameterPrefix}StopT${n}`].value = a.t);
	});
}
function Fe(e) {
	return e.map((e) => ({
		amplitude: c(d(e.layer.params.amplitude, 0, .6)),
		anchors: Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return {
				color: c(V(r.color)),
				direction: c(B(r.x, r.y))
			};
		}),
		frequency: c(Math.max(1e-4, e.layer.params.frequency)),
		layerId: e.layer.id,
		mode: c(z(e.layer.params.mode)),
		power: c(Math.max(1e-4, e.layer.params.power))
	}));
}
function Ie(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n && (n.amplitude.value = d(t.params.amplitude, 0, .6), n.frequency.value = Math.max(1e-4, t.params.frequency), n.mode.value = z(t.params.mode), n.power.value = Math.max(1e-4, t.params.power), n.anchors.forEach((e, n) => {
		let r = t.params.anchors[n] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.color.value.copy(V(r.color)), e.direction.value.copy(B(r.x, r.y));
	}));
}
function Le(e) {
	return Object.fromEntries(e.flatMap((e) => [
		[`${e.parameterPrefix}Amplitude`, { value: d(e.layer.params.amplitude, 0, .6) }],
		[`${e.parameterPrefix}Frequency`, { value: Math.max(1e-4, e.layer.params.frequency) }],
		[`${e.parameterPrefix}Mode`, { value: z(e.layer.params.mode) }],
		[`${e.parameterPrefix}Power`, { value: Math.max(1e-4, e.layer.params.power) }],
		...Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return [[`${e.parameterPrefix}AnchorDirection${n}`, { value: B(r.x, r.y) }], [`${e.parameterPrefix}AnchorColor${n}`, { value: V(r.color) }]];
		}).flat()
	]));
}
function Re(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	r && (e.uniforms[`${r.parameterPrefix}Amplitude`] && (e.uniforms[`${r.parameterPrefix}Amplitude`].value = d(t.params.amplitude, 0, .6)), e.uniforms[`${r.parameterPrefix}Frequency`] && (e.uniforms[`${r.parameterPrefix}Frequency`].value = Math.max(1e-4, t.params.frequency)), e.uniforms[`${r.parameterPrefix}Mode`] && (e.uniforms[`${r.parameterPrefix}Mode`].value = z(t.params.mode)), e.uniforms[`${r.parameterPrefix}Power`] && (e.uniforms[`${r.parameterPrefix}Power`].value = Math.max(1e-4, t.params.power)), Array.from({ length: r.anchorCount }, (n, i) => {
		let a = t.params.anchors[i] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.uniforms[`${r.parameterPrefix}AnchorDirection${i}`]?.value.copy(B(a.x, a.y)), e.uniforms[`${r.parameterPrefix}AnchorColor${i}`]?.value.copy(V(a.color));
	}));
}
function H(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				H(e.children, t);
				return;
			}
			e.type === "gradient" && t(e);
		}
	});
}
function U(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				U(e.children, t);
				return;
			}
			e.type === "field-gradient" && t(e);
		}
	});
}
function ze(e, t) {
	e.userData.applyGradientLayerParams = t;
}
function Be(e, t) {
	e.userData.applyFieldGradientLayerParams = t;
}
function W(e) {
	return e ?? x;
}
function G(t = x) {
	return W(t).type === "sphere" ? new e.SphereGeometry(1, 64, 32) : new e.BoxGeometry(1, 1, 1);
}
function Ve(t = x) {
	if (W(t).type === "sphere") {
		let t = new e.SphereGeometry(1, 32, 16), n = new e.WireframeGeometry(t);
		return t.dispose(), n;
	}
	let n = new e.BoxGeometry(1, 1, 1), r = new e.EdgesGeometry(n);
	return n.dispose(), r;
}
function K(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function q(e, t) {
	return t === "wgsl" ? `vec3<f32>(${K(e)})` : `vec3(${K(e)})`;
}
function J(e, t, n, r) {
	return r === "wgsl" ? `var ${e}: ${t} = ${n};` : `${t} ${e} = ${n};`;
}
function He(e) {
	return e.filter((e) => e.enabled).reverse();
}
function Ue(e) {
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
function We(e) {
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
function Ge(e) {
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
function Ke(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function qe(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Je(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Y(e, t) {
	if (Array.isArray(e) && e.length === 3 && e.every((e) => typeof e == "number" && Number.isFinite(e))) {
		let t = Math.hypot(e[0], e[1], e[2]);
		if (t > 0) return [
			e[0] / t,
			e[1] / t,
			e[2] / t
		];
	}
	return t;
}
function Ye(e) {
	let t = e, n = Y(t.centerDirection ?? t.normal ?? t.center, [
		0,
		0,
		-1
	]), r = Y(t.tangentX, [
		1,
		0,
		0
	]), i = Y(t.tangentY, [
		0,
		1,
		0
	]), a = Array.isArray(t.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, o = typeof t.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t.width ?? .4) / (2 * a));
	return {
		angularHeight: typeof t.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t.height ?? .3) / (2 * a)),
		angularWidth: o,
		centerDirection: n,
		tangentX: r,
		tangentY: i
	};
}
function Xe(e, t, n) {
	let { placement: r, src: i, width: a, height: o } = e.layer.params, s = t === "wgsl" ? "vec4<f32>" : "vec4", c = t === "wgsl" ? "f32" : "float", l = t === "wgsl" ? "let" : "float";
	return !i || !r || a <= 0 || o <= 0 ? `return ${s}(0.0, 0.0, 0.0, 0.0);` : `
      ${t === "wgsl" ? "let" : "vec3"} imageDirection = normalize(direction);
      ${l} imageDenom = dot(imageDirection, ${n.centerDirection});
      ${l} safeImageDenom = max(imageDenom, 0.000001);
      ${l} projectedX = dot(imageDirection, ${n.tangentX}) / safeImageDenom;
      ${l} projectedY = dot(imageDirection, ${n.tangentY}) / safeImageDenom;
      ${l} imageU = projectedX / max(${n.halfSize}.x * 2.0, 0.000001) + 0.5;
      ${l} imageV = 0.5 - projectedY / max(${n.halfSize}.y * 2.0, 0.000001);
      ${J("imageValid", c, "0.0", t)}
      if (imageDenom > 0.0 &&
        ${n.halfSize}.x > 0.0 &&
        ${n.halfSize}.y > 0.0 &&
        projectedX >= -${n.halfSize}.x &&
        projectedX <= ${n.halfSize}.x &&
        projectedY >= -${n.halfSize}.y &&
        projectedY <= ${n.halfSize}.y &&
        imageU >= 0.0 &&
        imageU <= 1.0 &&
        imageV >= 0.0 &&
        imageV <= 1.0) {
        imageValid = 1.0;
      }
      return ${s}(imageU, imageV, imageValid, 0.0);
    `;
}
function Ze(e, t, n) {
	let r = t.get(e.id);
	return r ? n === "wgsl" ? `effectColor = ${r.parameterName};` : `{
    vec4 imageSampleInfo = skyboxStudioImageSampleInfo${r.index}(direction);
    vec4 imageSampleColor = texture2D(imageTexture${r.index}, imageSampleInfo.xy);
    imageSampleColor = vec4(
      mix(imageSampleColor.rgb, vec3(1.0, 0.0, 0.0), imageHover${r.index} * ${K(M)}),
      imageSampleColor.a
    );
    effectColor = vec4(imageSampleColor.rgb, imageSampleColor.a * imageSampleInfo.z);
  }` : `effectColor = ${n === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function Qe(e) {
	return u(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${Xe(e, "wgsl", {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var $e = u("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n"), et = u(`
  fn skyboxStudioApplyImageHover(color: vec4<f32>, hover: f32) -> vec4<f32> {
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), clamp(hover, 0.0, 1.0) * ${K(M)}),
      color.a
    );
  }
`);
function tt(e) {
	return e.map((e) => `
        vec4 skyboxStudioImageSampleInfo${e.index}(vec3 direction) {
          ${Xe(e, "glsl", {
		centerDirection: `imageCenterDirection${e.index}`,
		halfSize: `imageHalfSize${e.index}`,
		tangentX: `imageTangentX${e.index}`,
		tangentY: `imageTangentY${e.index}`
	})}
        }
      `).join("\n");
}
function X(e, t) {
	return t.params.src ? e.get(t.id) ?? N : N;
}
function nt(e, t) {
	return Object.fromEntries(e.map((e) => [`imageTexture${e.index}`, { value: X(t, e.layer) }]));
}
function rt(e, t, n) {
	t.forEach((t) => {
		let r = `imageTexture${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = X(n, t.layer));
	});
}
function it(e, t) {
	let n = t === "wgsl" ? "vec4<f32>" : "vec4";
	if (e.stopCount === 0) return `effectColor = ${n}(0.0, 0.0, 0.0, 0.0);`;
	let r = Array.from({ length: Math.max(0, e.stopCount - 1) }, (t, n) => {
		let r = `${e.parameterPrefix}StopT${n}`, i = `${e.parameterPrefix}StopT${n + 1}`, a = `clamp((gradientT - ${r}) / max(${i} - ${r}, 0.00001), 0.0, 1.0)`;
		return `${n === 0 ? "if" : "else if"} (gradientT <= ${i}) {
      effectColor = mix(${e.parameterPrefix}StopColor${n}, ${e.parameterPrefix}StopColor${n + 1}, ${a});
    }`;
	}), i = e.stopCount - 1;
	return `{
    ${t === "wgsl" ? "let" : "vec3"} gradientAxis = normalize(${e.parameterPrefix}Axis);
    ${t === "wgsl" ? "let" : "float"} gradientT = dot(direction, gradientAxis) * 0.5 + 0.5;
    ${r.join("\n")}
    ${r.length > 0 ? "else" : ""} {
      effectColor = ${e.parameterPrefix}StopColor${i};
    }
  }`;
}
function at(e, t) {
	let n = t === "wgsl" ? "vec4<f32>" : "vec4", r = t === "wgsl" ? "vec3<f32>" : "vec3", i = t === "wgsl" ? "let" : "float";
	if (e.anchorCount === 0) return `effectColor = ${n}(0.0, 0.0, 0.0, 0.0);`;
	let a = Array.from({ length: e.anchorCount }, (n, r) => `{
        ${i} anchorDirection = normalize(${e.parameterPrefix}AnchorDirection${r});
        ${i} anchorDistance = 1.0 - clamp(dot(fieldDirection, anchorDirection), -1.0, 1.0);
        ${i} fieldSigma = 0.46 / max(${e.parameterPrefix}Power, 0.0001);
        ${i} inverseDistanceWeight = 1.0 / pow(anchorDistance + 0.0005, max(${e.parameterPrefix}Power, 0.0001));
        ${i} gaussianWeight = exp(-(anchorDistance * anchorDistance) / max(2.0 * fieldSigma * fieldSigma, 0.000001));
        ${i} weight = ${t === "wgsl" ? `select(inverseDistanceWeight, gaussianWeight, ${e.parameterPrefix}Mode > 0.5)` : `(${e.parameterPrefix}Mode > 0.5 ? gaussianWeight : inverseDistanceWeight)`};
        weightedColor += ${e.parameterPrefix}AnchorColor${r} * weight;
        weightSum += weight;
      }`).join("\n");
	return `{
    ${i} warpAmplitude = clamp(${e.parameterPrefix}Amplitude, 0.0, 0.6);
    ${i} warpFrequency = max(${e.parameterPrefix}Frequency, 0.0001);
    ${J("fieldDirection", r, "direction", t)}
    ${i} warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      ${i} warpX = sin((direction.y * warpFrequency + 0.23) * ${K(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${K(Math.PI * 2)});
      ${i} warpY = cos((direction.z * warpFrequency + 0.17) * ${K(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${K(Math.PI * 2)});
      ${i} warpZ = sin((direction.x * warpFrequency - 0.31) * ${K(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${K(Math.PI * 2)});
      fieldDirection = normalize(direction + ${r}(warpX, warpY, warpZ) * warpScale);
    }
    ${J("weightedColor", r, `${r}(0.0)`, t)}
    ${J("weightSum", t === "wgsl" ? "f32" : "float", "0.0", t)}
    ${a}
    if (weightSum > 0.0) {
      effectColor = ${n}(weightedColor / weightSum, 1.0);
    } else {
      effectColor = ${n}(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
function ot(e, t, n, r, i) {
	if (e.type === "gradient") {
		let r = n.get(e.id);
		return r ? it(r, t) : `effectColor = ${t === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
	}
	if (e.type === "field-gradient") {
		let n = r.get(e.id);
		return n ? at(n, t) : `effectColor = ${t === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
	}
	return Ze(e, i, t);
}
function Z(e, t, n, r) {
	return r === "wgsl" ? `select(${n}, ${t}, ${e})` : `((${e}) ? ${t} : ${n})`;
}
function st(e, t) {
	if (t === "glsl") switch (e.blendMode) {
		case "darken": return "min(composedColor, effectColor.rgb)";
		case "multiply": return "composedColor * effectColor.rgb";
		case "color-burn": return "blendColorBurn(composedColor, effectColor.rgb)";
		case "lighten": return "max(composedColor, effectColor.rgb)";
		case "screen": return "composedColor + effectColor.rgb - composedColor * effectColor.rgb";
		case "color-dodge": return "blendColorDodge(composedColor, effectColor.rgb)";
		case "overlay": return "blendOverlay(composedColor, effectColor.rgb)";
		case "soft-light": return "blendSoftLight(composedColor, effectColor.rgb)";
		case "hard-light": return "blendHardLight(composedColor, effectColor.rgb)";
		case "difference": return "abs(composedColor - effectColor.rgb)";
		case "exclusion": return "composedColor + effectColor.rgb - 2.0 * composedColor * effectColor.rgb";
		default: return "effectColor.rgb";
	}
	let n = q(1, t), r = q(.5, t), i = q(0, t), a = "effectColor.rgb", o = "composedColor";
	switch (e.blendMode) {
		case "darken": return `min(${o}, ${a})`;
		case "multiply": return `${o} * ${a}`;
		case "color-burn": return Z(`${o} == ${n}`, n, Z(`${a} == ${i}`, i, `${n} - min(${n}, (${n} - ${o}) / ${a})`, t), t);
		case "lighten": return `max(${o}, ${a})`;
		case "screen": return `${o} + ${a} - ${o} * ${a}`;
		case "color-dodge": return Z(`${o} == ${i}`, i, Z(`${a} == ${n}`, n, `min(${n}, ${o} / (${n} - ${a}))`, t), t);
		case "overlay": return Z(`${o} <= ${r}`, `2.0 * ${o} * ${a}`, `${n} - 2.0 * (${n} - ${o}) * (${n} - ${a})`, t);
		case "soft-light": return Z(`${a} <= ${r}`, `${o} - (${n} - 2.0 * ${a}) * ${o} * (${n} - ${o})`, `${o} + (2.0 * ${a} - ${n}) * (softLightD - ${o})`, t);
		case "hard-light": return Z(`${a} <= ${r}`, `2.0 * ${o} * ${a}`, `${o} + (2.0 * ${a} - ${n}) - ${o} * (2.0 * ${a} - ${n})`, t);
		case "difference": return `abs(${o} - ${a})`;
		case "exclusion": return `${o} + ${a} - 2.0 * ${o} * ${a}`;
		default: return a;
	}
}
function ct(e, t) {
	if (t === "glsl" || e.blendMode !== "soft-light") return "";
	let n = t === "wgsl" ? "vec3<f32>" : "vec3";
	return `${t === "wgsl" ? "let" : "vec3"} softLightD = ${Z(`composedColor <= ${n}(0.25)`, `((16.0 * composedColor - ${n}(12.0)) * composedColor + ${n}(4.0)) * composedColor`, "sqrt(composedColor)", t)};`;
}
function Q(e, t, n, r, i, a = 0) {
	let o = t === "wgsl" ? "vec3<f32>" : "vec3", s = t === "wgsl" ? "vec4<f32>" : "vec4";
	return He(e).map((e, c) => {
		let l = e.type === "group" ? `effectColor = ${s}(${`groupColor${a}_${c}`}, 1.0);` : ot(e, t, n, r, i), u = `groupColor${a}_${c}`;
		return `{
        ${e.type === "group" ? `${J(u, o, `${o}(0.0)`, t)}
        {
          ${J("previousComposedColor", o, "composedColor", t)}
          composedColor = ${o}(0.0);
          ${Q(e.children, t, n, r, i, a + 1)}
          ${u} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${J("effectColor", s, `${s}(0.0)`, t)}
        ${l}
        ${t === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${K(e.opacity / 100)}, 0.0, 1.0);
        ${ct(e, t)}
        ${t === "wgsl" ? "let" : "vec3"} blendedColor = clamp(${st(e, t)}, ${o}(0.0), ${o}(1.0));
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          ${o}(0.0),
          ${o}(1.0)
        );
      }`;
	}).join("\n");
}
function lt(e, t, n, r) {
	let i = Ke(t), a = qe(n), o = Je(r), s = Q(e.nodes, "wgsl", i, a, o);
	return u(`
    fn skyboxStudioSample(
      direction: vec3<f32>${t.flatMap((e) => [`,
      ${e.parameterPrefix}Axis: vec3<f32>`, ...Array.from({ length: e.stopCount }, (t, n) => [`,
      ${e.parameterPrefix}StopColor${n}: vec4<f32>`, `,
      ${e.parameterPrefix}StopT${n}: f32`]).flat()]).join("")}${n.flatMap((e) => [
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
	]).join("")}${r.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join("")}
    ) -> vec4<f32> {
      var composedColor = vec3<f32>(0.0);
      ${s}
      return vec4<f32>(composedColor, 1.0);
    }
  `);
}
function ut(e, t, n, r, i) {
	return Object.fromEntries(e.map((e) => {
		let a = i[e.index], o = Qe(e)({
			direction: t,
			imageCenterDirection: a.centerDirection,
			imageHalfSize: a.halfSize,
			imageTangentX: a.tangentX,
			imageTangentY: a.tangentY
		}), c = l(o.x, o.y), u = $e({
			color: et({
				color: s(X(n, e.layer), c),
				hover: r[e.index].node
			}),
			valid: o.z
		});
		return [e.parameterName, u];
	}));
}
function dt(s, c, l) {
	let u = new t(), d = Ue(s.nodes), f = We(s.nodes), p = Ge(s.nodes), m = lt(s, d, f, p), h = je(d), g = Fe(f), _ = xe(p, c), v = Ee(p), y = n(() => {
		let e = i;
		return e.z.assign(e.w), e;
	})();
	u.side = e.BackSide, u.depthTest = !1, u.depthWrite = !1, u.vertexNode = y;
	let b = a(o.sub(r));
	return u.colorNode = m({
		direction: b,
		...Object.fromEntries(d.flatMap((e) => {
			let t = h[e.index];
			return [[`${e.parameterPrefix}Axis`, t.axis], ...Array.from({ length: e.stopCount }, (n, r) => [[`${e.parameterPrefix}StopColor${r}`, t.stops[r].color], [`${e.parameterPrefix}StopT${r}`, t.stops[r].t]]).flat()];
		})),
		...Object.fromEntries(f.flatMap((e) => {
			let t = g[e.index];
			return [
				[`${e.parameterPrefix}Amplitude`, t.amplitude],
				[`${e.parameterPrefix}Frequency`, t.frequency],
				[`${e.parameterPrefix}Mode`, t.mode],
				[`${e.parameterPrefix}Power`, t.power],
				...Array.from({ length: e.anchorCount }, (n, r) => [[`${e.parameterPrefix}AnchorDirection${r}`, t.anchors[r].direction], [`${e.parameterPrefix}AnchorColor${r}`, t.anchors[r].color]]).flat()
			];
		})),
		...ut(p, b, l, _, v)
	}), Te(u, (e) => Se(_, e)), ze(u, (e) => H(e.nodes, (e) => Me(h, e))), Be(u, (e) => U(e.nodes, (e) => Ie(g, e))), Ae(u, (e, t) => De(v, e, t)), u;
}
var ft = u("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.z, normalizedDirection.x);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n");
function pt(c) {
	let l = new t(), u = n(() => {
		let e = i;
		return e.z.assign(e.w), e;
	})(), d = a(o.sub(r));
	return l.side = e.BackSide, l.depthTest = !1, l.depthWrite = !1, l.vertexNode = u, l.colorNode = s(c, ft({ direction: d })), l;
}
function mt(t, n, r) {
	let i = Ue(t.nodes), a = We(t.nodes), o = Ge(t.nodes), s = Ke(i), c = qe(a), l = Je(o), u = Q(t.nodes, "glsl", s, c, l), d = new e.ShaderMaterial({
		uniforms: {
			...Ne(i),
			...Le(a),
			...Ce(o, n),
			...Oe(o),
			...nt(o, r)
		},
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: `
      precision highp float;
      ${i.map((e) => `uniform vec3 ${e.parameterPrefix}Axis;
      ${Array.from({ length: e.stopCount }, (t, n) => `uniform vec4 ${e.parameterPrefix}StopColor${n};
      uniform float ${e.parameterPrefix}StopT${n};`).join("\n")}`).join("\n")}
      ${a.map((e) => `uniform float ${e.parameterPrefix}Amplitude;
      uniform float ${e.parameterPrefix}Frequency;
      uniform float ${e.parameterPrefix}Mode;
      uniform float ${e.parameterPrefix}Power;
      ${Array.from({ length: e.anchorCount }, (t, n) => `uniform vec3 ${e.parameterPrefix}AnchorDirection${n};
      uniform vec3 ${e.parameterPrefix}AnchorColor${n};`).join("\n")}`).join("\n")}
      ${o.map((e) => `uniform sampler2D imageTexture${e.index};
      uniform vec3 imageCenterDirection${e.index};
      uniform vec3 imageTangentX${e.index};
      uniform vec3 imageTangentY${e.index};
      uniform vec2 imageHalfSize${e.index};
      uniform float imageHover${e.index};`).join("\n")}
      varying vec3 vDirection;
      ${tt(o)}

      float softLightDChannel(float backdrop) {
        return backdrop <= 0.25
          ? ((16.0 * backdrop - 12.0) * backdrop + 4.0) * backdrop
          : sqrt(backdrop);
      }

      float blendColorBurnChannel(float backdrop, float source) {
        if (backdrop == 1.0) {
          return 1.0;
        }

        if (source == 0.0) {
          return 0.0;
        }

        return 1.0 - min(1.0, (1.0 - backdrop) / source);
      }

      float blendColorDodgeChannel(float backdrop, float source) {
        if (backdrop == 0.0) {
          return 0.0;
        }

        if (source == 1.0) {
          return 1.0;
        }

        return min(1.0, backdrop / (1.0 - source));
      }

      float blendOverlayChannel(float backdrop, float source) {
        return backdrop <= 0.5
          ? 2.0 * backdrop * source
          : 1.0 - 2.0 * (1.0 - backdrop) * (1.0 - source);
      }

      float blendSoftLightChannel(float backdrop, float source) {
        return source <= 0.5
          ? backdrop - (1.0 - 2.0 * source) * backdrop * (1.0 - backdrop)
          : backdrop + (2.0 * source - 1.0) * (softLightDChannel(backdrop) - backdrop);
      }

      float blendHardLightChannel(float backdrop, float source) {
        return source <= 0.5
          ? 2.0 * backdrop * source
          : backdrop + (2.0 * source - 1.0) - backdrop * (2.0 * source - 1.0);
      }

      vec3 blendColorBurn(vec3 backdrop, vec3 source) {
        return vec3(
          blendColorBurnChannel(backdrop.r, source.r),
          blendColorBurnChannel(backdrop.g, source.g),
          blendColorBurnChannel(backdrop.b, source.b)
        );
      }

      vec3 blendColorDodge(vec3 backdrop, vec3 source) {
        return vec3(
          blendColorDodgeChannel(backdrop.r, source.r),
          blendColorDodgeChannel(backdrop.g, source.g),
          blendColorDodgeChannel(backdrop.b, source.b)
        );
      }

      vec3 blendOverlay(vec3 backdrop, vec3 source) {
        return vec3(
          blendOverlayChannel(backdrop.r, source.r),
          blendOverlayChannel(backdrop.g, source.g),
          blendOverlayChannel(backdrop.b, source.b)
        );
      }

      vec3 blendSoftLight(vec3 backdrop, vec3 source) {
        return vec3(
          blendSoftLightChannel(backdrop.r, source.r),
          blendSoftLightChannel(backdrop.g, source.g),
          blendSoftLightChannel(backdrop.b, source.b)
        );
      }

      vec3 blendHardLight(vec3 backdrop, vec3 source) {
        return vec3(
          blendHardLightChannel(backdrop.r, source.r),
          blendHardLightChannel(backdrop.g, source.g),
          blendHardLightChannel(backdrop.b, source.b)
        );
      }

      void main() {
        vec3 direction = normalize(vDirection);
        vec3 composedColor = vec3(0.0);
        ${u}
        gl_FragColor = vec4(composedColor, 1.0);
      }
    `
	});
	return Te(d, (e) => we(d, o, e)), ze(d, (e) => H(e.nodes, (e) => Pe(d, e, i))), Be(d, (e) => U(e.nodes, (e) => Re(d, e, a))), Ae(d, (e, t) => ke(d, o, e, t)), d.userData.applyImageTextures = (e) => rt(d, o, e), d;
}
function ht(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function gt(t, n = {}) {
	let r = be(t, n), i = ht(r.width, r.height), a = i.getContext("2d");
	if (!a || !("putImageData" in a)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	a.putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
	let o = new e.CanvasTexture(i);
	return o.mapping = e.EquirectangularReflectionMapping, o.wrapS = e.RepeatWrapping, o.wrapT = e.ClampToEdgeWrapping, o.colorSpace = e.SRGBColorSpace, o.flipY = !1, o.needsUpdate = !0, o;
}
function _t(t) {
	return new e.ShaderMaterial({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		uniforms: { skyboxTexture: { value: t } },
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: "\n      precision highp float;\n      uniform sampler2D skyboxTexture;\n      varying vec3 vDirection;\n\n      const float PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.z, normalizedDirection.x);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);\n      }\n\n      void main() {\n        vec3 direction = normalize(vDirection);\n        vec4 sampledColor = texture2D(skyboxTexture, directionToEquirectUv(direction));\n        gl_FragColor = vec4(sampledColor.rgb, sampledColor.a);\n      }\n    "
	});
}
function vt(e, t) {
	return $(t) ? pt(e) : _t(e);
}
function $(e) {
	return !!(e && "isWebGPURenderer" in e && e.isWebGPURenderer);
}
function yt(e, t) {
	return e === "auto" ? $(t) ? "live-webgpu" : "live-webgl" : e;
}
function bt(e, t) {
	let n = (e) => e.type === "group" ? {
		blendMode: e.blendMode,
		children: e.children.map(n),
		enabled: e.enabled,
		id: e.id,
		opacity: e.opacity,
		type: e.type
	} : e.type === "gradient" ? {
		blendMode: e.blendMode,
		enabled: e.enabled,
		id: e.id,
		mode: e.params.mode,
		opacity: e.opacity,
		stopCount: e.params.stops.length,
		type: e.type
	} : e.type === "image" ? {
		blendMode: e.blendMode,
		enabled: e.enabled,
		hasPlacement: !!e.params.placement,
		hasSrc: !!e.params.src,
		height: e.params.height,
		id: e.id,
		opacity: e.opacity,
		type: e.type,
		width: e.params.width
	} : {
		anchorCount: e.params.anchors.length,
		blendMode: e.blendMode,
		enabled: e.enabled,
		id: e.id,
		opacity: e.opacity,
		type: e.type
	};
	return JSON.stringify({
		geometry: e.geometry?.type ?? x.type,
		nodes: e.nodes.map(n),
		renderMode: t
	});
}
var xt = class extends e.Mesh {
	#e = {};
	#t = x;
	#n = null;
	#r = /* @__PURE__ */ new Map();
	#i = /* @__PURE__ */ new Map();
	#a = j;
	#o = null;
	#s = null;
	#c = "auto";
	#l = null;
	constructor() {
		super(G(x), dt(j, null, /* @__PURE__ */ new Map())), this.frustumCulled = !1, this.renderOrder = -1;
	}
	fromManifest(e) {
		return this.#a = S(e), this.applyGeometry(this.#a.geometry ?? x), this;
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
		return this.#l = e, this;
	}
	setRenderMode(e) {
		return this.#c = e, this;
	}
	setImageTexture(e, t) {
		return t ? this.#i.set(e, t) : this.#i.delete(e), this.#o = null, this.setManifest(this.#a), this;
	}
	setImageTextures(e) {
		return this.#i.clear(), Object.entries(e).forEach(([e, t]) => {
			t && this.#i.set(e, t);
		}), this.#o = null, this.setManifest(this.#a), this;
	}
	otherOverridingSetup() {
		return this;
	}
	load(e) {
		return e && (this.#l = e), this.setManifest(this.#a), this;
	}
	applyGeometry(e) {
		let t = W(e);
		if (this.#t.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#t = t, this.geometry = G(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#s?.dispose(), this.#s = null;
	}
	replaceMaterial(e, t = null) {
		let n = this.material;
		this.material = e, e.userData.applyHoveredImageLayerId?.(this.#n), this.#r.forEach((t, n) => {
			e.userData.applyImageLayerPlacement?.(n, t);
		}), n.dispose(), this.disposeOwnedTexture(), this.#s = t;
	}
	applyLiveManifestUniformUpdates() {
		this.material.userData.applyGradientLayerParams?.(this.#a), this.material.userData.applyFieldGradientLayerParams?.(this.#a), this.material.userData.applyImageTextures?.(this.#i), this.#r.forEach((e, t) => {
			this.material.userData.applyImageLayerPlacement?.(t, e);
		});
	}
	setHoveredImageLayerId(e) {
		return this.#n === e ? this : (this.#n = e, this.material.userData.applyHoveredImageLayerId?.(this.#n), this);
	}
	setImageLayerPlacement(e, t) {
		return this.#r.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this;
	}
	setManifest(e) {
		let t = S(e);
		this.#a = t, this.applyGeometry(this.#a.geometry ?? this.#t);
		let n = yt(this.#c, this.#l), r = bt(this.#a, n);
		if (this.#o === r && (n === "live-webgpu" || n === "live-webgl")) return this.applyLiveManifestUniformUpdates(), this;
		if (n === "live-webgpu") this.replaceMaterial(dt(this.#a, this.#n, this.#i));
		else if (n === "live-webgl") this.replaceMaterial(mt(this.#a, this.#n, this.#i));
		else {
			let e = gt(this.#a, this.#e);
			this.replaceMaterial(vt(e, this.#l), e);
		}
		return this.#o = r, this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(vt(e, this.#l)), this.#o = null, this;
	}
	invalidateBakeCache() {
		return ye(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture();
	}
};
//#endregion
export { he as DEFAULT_BAKE_WIDTH, xt as Skybox, be as bakeSkyboxImageData, _ as blendChannel, d as clamp, v as compositeBlendChannel, y as compositeOver, ve as createBakeCacheKey, gt as createBakedSkyboxTexture, G as createSkyboxGeometry, Ve as createSkyboxWireGeometry, ie as equirectPointToDirection, T as equirectUvToDirection, me as evaluateSkyboxDirection, ye as invalidateBakeCache, p as linearChannelToSrgb, h as linearRgbToSrgbBytes, S as migrateManifestToV2, m as parseHexColor, _e as resolveBakeOptions, f as srgbChannelToLinear };
