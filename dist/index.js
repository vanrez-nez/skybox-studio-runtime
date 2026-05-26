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
//#region image-placement-transform.ts
var C = [
	0,
	1,
	0
], ee = [
	0,
	0,
	-1
], te = [
	1,
	0,
	0
], ne = [
	0,
	1,
	0
], w = 89.9;
function re(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function ie(e) {
	return e * Math.PI / 180;
}
function ae(e) {
	return e * 180 / Math.PI;
}
function oe(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function T(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function se(e, t) {
	return [
		e[0] - t[0],
		e[1] - t[1],
		e[2] - t[2]
	];
}
function ce(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function le(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function E(e, t = ee) {
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
function ue(e, t = C) {
	let n = E(e), r = se(E(t, C), ce(n, T(E(t, C), n)));
	if (Math.hypot(r[0], r[1], r[2]) < 1e-6) {
		let e = Math.abs(n[1]) > .98 ? [
			0,
			0,
			1
		] : C;
		r = se(e, ce(n, T(e, n)));
	}
	return r = E(r, ne), {
		tangentX: E(le(n, r), te),
		tangentY: r
	};
}
function D({ angularHeight: e, angularWidth: t, baseAngularHeight: n, baseAngularWidth: r, centerDirection: i, upDirection: a = C }) {
	let o = E(i), { tangentX: s, tangentY: c } = ue(o, a), l = Math.max(1e-4, e), u = Math.max(1e-4, t);
	return {
		angularHeight: l,
		angularWidth: u,
		baseAngularHeight: Math.max(1e-4, n ?? l),
		baseAngularWidth: Math.max(1e-4, r ?? u),
		centerDirection: o,
		projection: "angular-decal",
		tangentX: s,
		tangentY: c
	};
}
function O(e) {
	let t = e, n = E(t?.centerDirection ?? t?.normal ?? t?.center, ee), r = Array.isArray(t?.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, i = typeof t?.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t?.width ?? .4) / (2 * r)), a = typeof t?.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t?.height ?? .3) / (2 * r));
	return D({
		angularHeight: a,
		angularWidth: i,
		baseAngularHeight: typeof t?.baseAngularHeight == "number" ? t.baseAngularHeight : a,
		baseAngularWidth: typeof t?.baseAngularWidth == "number" ? t.baseAngularWidth : i,
		centerDirection: n
	});
}
function de(e) {
	let t = E(e.centerDirection);
	return {
		x: oe(ae(Math.atan2(t[0], -t[2]))),
		y: ae(Math.asin(re(t[1], -1, 1)))
	};
}
function fe(e) {
	let t = ie(e.x), n = ie(re(e.y, -89.9, w)), r = Math.cos(n);
	return E([
		Math.sin(t) * r,
		Math.sin(n),
		-Math.cos(t) * r
	]);
}
function pe(e, t, n) {
	let r = O(e);
	return D({
		angularHeight: r.angularHeight,
		angularWidth: r.angularWidth,
		baseAngularHeight: r.baseAngularHeight,
		baseAngularWidth: r.baseAngularWidth,
		centerDirection: fe(t),
		upDirection: n?.upDirection
	});
}
function me(e) {
	let t = O(e);
	return {
		x: t.angularWidth / t.baseAngularWidth,
		y: t.angularHeight / t.baseAngularHeight
	};
}
function he(e, t) {
	let n = O(e);
	return {
		...n,
		angularHeight: Math.max(1e-4, n.baseAngularHeight * Math.max(1e-4, t.y)),
		angularWidth: Math.max(1e-4, n.baseAngularWidth * Math.max(1e-4, t.x))
	};
}
function ge(e, t) {
	let n = O(t), r = E(e), i = T(r, n.centerDirection);
	if (i <= 0) return null;
	let a = T(r, n.tangentX) / i, o = T(r, n.tangentY) / i, s = Math.tan(n.angularWidth / 2), c = Math.tan(n.angularHeight / 2);
	return s <= 0 || c <= 0 || a < -s || a > s || o < -c || o > c ? null : {
		u: a / (2 * s) + .5,
		v: .5 - o / (2 * c)
	};
}
//#endregion
//#region evaluator.ts
var k = Math.PI * 2;
function A(e, t, n) {
	return e + (t - e) * n;
}
function _e(e) {
	return e.map((e) => ({
		alpha: d(e.opacity / 100),
		color: m(e.color),
		t: d(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function ve(e, t) {
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
			A(r.color[0], i.color[0], o),
			A(r.color[1], i.color[1], o),
			A(r.color[2], i.color[2], o),
			A(r.alpha, i.alpha, o)
		];
	}
	return [...i.color, i.alpha];
}
function ye(e) {
	let t = e * Math.PI / 180;
	return [
		Math.sin(t),
		Math.cos(t),
		0
	];
}
function be(e, t) {
	let n = ye(t.rotation), r = e[0] * n[0] + e[1] * n[1] + e[2] * n[2];
	return ve(_e(t.stops), r * .5 + .5);
}
function xe(e, t) {
	let n = (e - .5) * k, r = (.5 - t) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function Se(e, t) {
	let n = (e - .5) * k, r = (t - .5) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function Ce(e) {
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
function we(e, t, n) {
	if (t <= 0) return e;
	let r = Math.max(1e-4, n), i = [
		Math.sin((e[1] * r + .23) * k) * Math.cos((e[2] * r + .41) * k),
		Math.cos((e[2] * r + .17) * k) * Math.sin((e[0] * r + .37) * k),
		Math.sin((e[0] * r - .31) * k) * Math.cos((e[1] * r + .29) * k)
	];
	return Ce([
		e[0] + i[0] * t,
		e[1] + i[1] * t,
		e[2] + i[2] * t
	]);
}
function Te(e, t) {
	return 1 - d(e[0] * t[0] + e[1] * t[1] + e[2] * t[2], -1, 1);
}
function Ee(e, t) {
	if (t.anchors.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = we(e, d(t.amplitude, 0, .6), Math.max(1e-4, t.frequency)), r = 0, i = 0, a = 0, o = 0;
	return t.anchors.forEach((e) => {
		let s = Te(n, xe(e.x, e.y)), c = t.mode === "gaussian" ? Math.exp(-(s * s) / (2 * (.46 / t.power) ** 2)) : 1 / (s + 5e-4) ** t.power, l = m(e.color);
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
function De(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function j(e, t, n) {
	return [
		A(e[0], t[0], n),
		A(e[1], t[1], n),
		A(e[2], t[2], n),
		A(e[3], t[3], n)
	];
}
function M(e, t, n) {
	let r = Math.min(e.width - 1, Math.max(0, t)), i = (Math.min(e.height - 1, Math.max(0, n)) * e.width + r) * 4, a = e.pixels?.[i] ?? 0, o = e.pixels?.[i + 1] ?? 0, s = e.pixels?.[i + 2] ?? 0, c = e.pixels?.[i + 3] ?? 255;
	return [
		f(a / 255),
		f(o / 255),
		f(s / 255),
		c / 255
	];
}
function Oe(e, t) {
	let n = t.placement;
	if (!n || !t.pixels || t.width <= 0 || t.height <= 0) return [
		0,
		0,
		0,
		0
	];
	let r = ge(e, n);
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
	let o = i * (t.width - 1), s = a * (t.height - 1), c = Math.floor(o), l = Math.floor(s), u = c + 1, d = l + 1, f = o - c, p = s - l;
	return j(j(M(t, c, l), M(t, u, l), f), j(M(t, c, d), M(t, u, d), f), p);
}
function ke(e, t) {
	return t.type === "gradient" ? be(e, t.params) : t.type === "field-gradient" ? Ee(e, t.params) : Oe(e, t.params);
}
function Ae(e, t) {
	return t.filter((e) => e.enabled).reverse().reduce((t, n) => {
		let r = n.type === "group" ? [...Ae(e, n.children), 1] : ke(e, n), i = d(r[3] * (n.opacity / 100));
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
function je(e, t, n) {
	if (!n || n.opacity <= 0 || n.radius <= 0 || 1 - d(De(t, n.direction), -1, 1) > n.radius) return e;
	let r = m(n.color), i = d(n.opacity);
	return [
		r[0] * i + e[0] * (1 - i),
		r[1] * i + e[1] * (1 - i),
		r[2] * i + e[2] * (1 - i)
	];
}
function Me(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = Me(n.children, t);
		if (e) return e;
	}
	return null;
}
function Ne(e, t, n = {}) {
	let r = S(e), i = n.targetGroupId ? Me(r.nodes, n.targetGroupId) : null;
	return je(Ae(t, n.targetGroupId ? i ? [i] : [] : r.nodes), t, r.selectionDot);
}
//#endregion
//#region bake.ts
var Pe = 1024, Fe = "0.1.0", N = /* @__PURE__ */ new Map();
function Ie(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function Le(e, t) {
	return b(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: Fe
	}));
}
function Re() {
	N.clear();
}
function ze(e, t = {}) {
	let n = Ie(t), r = n.cache ? Le(e, n) : null;
	if (r) {
		let e = N.get(r);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: i, targetGroupId: a, width: o } = n, s = new Uint8ClampedArray(o * i * 4);
	for (let t = 0; t < i; t += 1) {
		let n = (t + .5) / i;
		for (let r = 0; r < o; r += 1) {
			let [i, c, l] = h(Ne(e, Se((r + .5) / o, n), { targetGroupId: a })), u = (t * o + r) * 4;
			s[u] = i, s[u + 1] = c, s[u + 2] = l, s[u + 3] = 255;
		}
	}
	let c = {
		data: s,
		height: i,
		width: o
	};
	return r && N.set(r, {
		...c,
		data: new Uint8ClampedArray(s)
	}), c;
}
//#endregion
//#region Skybox.ts
var Be = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: x,
	nodes: [],
	version: 2
}, Ve = .8, P = new e.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, e.RGBAFormat);
P.colorSpace = e.SRGBColorSpace, P.needsUpdate = !0;
function F(e, t) {
	return +(t === e);
}
function He(e, t) {
	return e.map((e) => ({
		layerId: e.layer.id,
		node: c(F(e.layer.id, t))
	}));
}
function Ue(e, t) {
	e.forEach((e) => {
		e.node.value = F(e.layerId, t);
	});
}
function We(e, t) {
	return Object.fromEntries(e.map((e) => [`imageHover${e.index}`, { value: F(e.layer.id, t) }]));
}
function Ge(e, t, n) {
	t.forEach((t) => {
		let r = `imageHover${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = F(t.layer.id, n));
	});
}
function Ke(e, t) {
	e.userData.applyHoveredImageLayerId = t;
}
function I(t) {
	if (!t) return {
		centerDirection: new e.Vector3(0, 0, -1),
		halfSize: new e.Vector2(0, 0),
		tangentX: new e.Vector3(1, 0, 0),
		tangentY: new e.Vector3(0, 1, 0)
	};
	let n = O(t);
	return {
		centerDirection: new e.Vector3(...n.centerDirection),
		halfSize: new e.Vector2(Math.max(0, Math.tan(n.angularWidth / 2)), Math.max(0, Math.tan(n.angularHeight / 2))),
		tangentX: new e.Vector3(...n.tangentX),
		tangentY: new e.Vector3(...n.tangentY)
	};
}
function qe(e) {
	return e.map((e) => {
		let t = I(e.layer.params.placement);
		return {
			centerDirection: c(t.centerDirection),
			halfSize: c(t.halfSize),
			layerId: e.layer.id,
			tangentX: c(t.tangentX),
			tangentY: c(t.tangentY)
		};
	});
}
function Je(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = I(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function Ye(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = I(e.layer.params.placement);
		return [
			[`imageCenterDirection${e.index}`, { value: t.centerDirection }],
			[`imageTangentX${e.index}`, { value: t.tangentX }],
			[`imageTangentY${e.index}`, { value: t.tangentY }],
			[`imageHalfSize${e.index}`, { value: t.halfSize }]
		];
	}));
}
function Xe(e, t, n, r) {
	let i = t.find((e) => e.layer.id === n);
	if (!i) return;
	let a = I(r);
	e.uniforms[`imageCenterDirection${i.index}`]?.value.copy(a.centerDirection), e.uniforms[`imageTangentX${i.index}`]?.value.copy(a.tangentX), e.uniforms[`imageTangentY${i.index}`]?.value.copy(a.tangentY), e.uniforms[`imageHalfSize${i.index}`]?.value.copy(a.halfSize);
}
function Ze(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function L(t) {
	let n = t * Math.PI / 180;
	return new e.Vector3(Math.sin(n), Math.cos(n), 0).normalize();
}
function R(e) {
	return [...e.stops].map((e) => ({
		color: e.color,
		opacity: d(e.opacity / 100),
		t: d(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function z(t) {
	let [n, r, i] = m(t.color);
	return new e.Vector4(n, r, i, t.opacity);
}
function B(e) {
	return +(e === "gaussian");
}
function V(t, n) {
	let r = (d(t) - .5) * Math.PI * 2, i = (.5 - d(n)) * Math.PI, a = Math.cos(i);
	return new e.Vector3(a * Math.cos(r), Math.sin(i), a * Math.sin(r)).normalize();
}
function H(t) {
	let [n, r, i] = m(t);
	return new e.Vector3(n, r, i);
}
function Qe(e) {
	return e.map((e) => {
		let t = R(e.layer.params);
		return {
			axis: c(L(e.layer.params.rotation)),
			layerId: e.layer.id,
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t[n] ?? {
					color: "#000000",
					opacity: 0,
					t: 0
				};
				return {
					color: c(z(r)),
					t: c(r.t)
				};
			})
		};
	});
}
function $e(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = R(t.params);
	n.axis.value.copy(L(t.params.rotation)), n.stops.forEach((e, t) => {
		let n = r[t] ?? {
			color: "#000000",
			opacity: 0,
			t: 0
		};
		e.color.value.copy(z(n)), e.t.value = n.t;
	});
}
function et(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = R(e.layer.params);
		return [[`${e.parameterPrefix}Axis`, { value: L(e.layer.params.rotation) }], ...Array.from({ length: e.stopCount }, (n, r) => {
			let i = t[r] ?? {
				color: "#000000",
				opacity: 0,
				t: 0
			};
			return [[`${e.parameterPrefix}StopColor${r}`, { value: z(i) }], [`${e.parameterPrefix}StopT${r}`, { value: i.t }]];
		}).flat()];
	}));
}
function tt(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	if (!r) return;
	let i = R(t.params);
	e.uniforms[`${r.parameterPrefix}Axis`]?.value.copy(L(t.params.rotation)), Array.from({ length: r.stopCount }, (t, n) => {
		let a = i[n] ?? {
			color: "#000000",
			opacity: 0,
			t: 0
		};
		e.uniforms[`${r.parameterPrefix}StopColor${n}`]?.value.copy(z(a)), e.uniforms[`${r.parameterPrefix}StopT${n}`] && (e.uniforms[`${r.parameterPrefix}StopT${n}`].value = a.t);
	});
}
function nt(e) {
	return e.map((e) => ({
		amplitude: c(d(e.layer.params.amplitude, 0, .6)),
		anchors: Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return {
				color: c(H(r.color)),
				direction: c(V(r.x, r.y))
			};
		}),
		frequency: c(Math.max(1e-4, e.layer.params.frequency)),
		layerId: e.layer.id,
		mode: c(B(e.layer.params.mode)),
		power: c(Math.max(1e-4, e.layer.params.power))
	}));
}
function rt(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n && (n.amplitude.value = d(t.params.amplitude, 0, .6), n.frequency.value = Math.max(1e-4, t.params.frequency), n.mode.value = B(t.params.mode), n.power.value = Math.max(1e-4, t.params.power), n.anchors.forEach((e, n) => {
		let r = t.params.anchors[n] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.color.value.copy(H(r.color)), e.direction.value.copy(V(r.x, r.y));
	}));
}
function it(e) {
	return Object.fromEntries(e.flatMap((e) => [
		[`${e.parameterPrefix}Amplitude`, { value: d(e.layer.params.amplitude, 0, .6) }],
		[`${e.parameterPrefix}Frequency`, { value: Math.max(1e-4, e.layer.params.frequency) }],
		[`${e.parameterPrefix}Mode`, { value: B(e.layer.params.mode) }],
		[`${e.parameterPrefix}Power`, { value: Math.max(1e-4, e.layer.params.power) }],
		...Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return [[`${e.parameterPrefix}AnchorDirection${n}`, { value: V(r.x, r.y) }], [`${e.parameterPrefix}AnchorColor${n}`, { value: H(r.color) }]];
		}).flat()
	]));
}
function at(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	r && (e.uniforms[`${r.parameterPrefix}Amplitude`] && (e.uniforms[`${r.parameterPrefix}Amplitude`].value = d(t.params.amplitude, 0, .6)), e.uniforms[`${r.parameterPrefix}Frequency`] && (e.uniforms[`${r.parameterPrefix}Frequency`].value = Math.max(1e-4, t.params.frequency)), e.uniforms[`${r.parameterPrefix}Mode`] && (e.uniforms[`${r.parameterPrefix}Mode`].value = B(t.params.mode)), e.uniforms[`${r.parameterPrefix}Power`] && (e.uniforms[`${r.parameterPrefix}Power`].value = Math.max(1e-4, t.params.power)), Array.from({ length: r.anchorCount }, (n, i) => {
		let a = t.params.anchors[i] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.uniforms[`${r.parameterPrefix}AnchorDirection${i}`]?.value.copy(V(a.x, a.y)), e.uniforms[`${r.parameterPrefix}AnchorColor${i}`]?.value.copy(H(a.color));
	}));
}
function U(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				U(e.children, t);
				return;
			}
			e.type === "gradient" && t(e);
		}
	});
}
function W(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				W(e.children, t);
				return;
			}
			e.type === "field-gradient" && t(e);
		}
	});
}
function ot(e, t) {
	e.userData.applyGradientLayerParams = t;
}
function st(e, t) {
	e.userData.applyFieldGradientLayerParams = t;
}
function G(e) {
	return e ?? x;
}
function K(t = x) {
	return G(t).type === "sphere" ? new e.SphereGeometry(1, 64, 32) : new e.BoxGeometry(1, 1, 1);
}
function ct(t = x) {
	if (G(t).type === "sphere") {
		let t = new e.SphereGeometry(1, 32, 16), n = new e.WireframeGeometry(t);
		return t.dispose(), n;
	}
	let n = new e.BoxGeometry(1, 1, 1), r = new e.EdgesGeometry(n);
	return n.dispose(), r;
}
function q(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function J(e, t) {
	return t === "wgsl" ? `vec3<f32>(${q(e)})` : `vec3(${q(e)})`;
}
function Y(e, t, n, r) {
	return r === "wgsl" ? `var ${e}: ${t} = ${n};` : `${t} ${e} = ${n};`;
}
function lt(e) {
	return e.filter((e) => e.enabled).reverse();
}
function ut(e) {
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
function dt(e) {
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
function ft(e) {
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
function X(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function pt(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function mt(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function ht(e, t, n) {
	let { placement: r, src: i, width: a, height: o } = e.layer.params, s = t === "wgsl" ? "vec4<f32>" : "vec4", c = t === "wgsl" ? "f32" : "float", l = t === "wgsl" ? "let" : "float";
	return !i || a <= 0 || o <= 0 ? `return ${s}(0.0, 0.0, 0.0, 0.0);` : `
      ${t === "wgsl" ? "let" : "vec3"} imageDirection = normalize(direction);
      ${l} imageDenom = dot(imageDirection, ${n.centerDirection});
      ${l} safeImageDenom = max(imageDenom, 0.000001);
      ${l} projectedX = dot(imageDirection, ${n.tangentX}) / safeImageDenom;
      ${l} projectedY = dot(imageDirection, ${n.tangentY}) / safeImageDenom;
      ${l} imageU = projectedX / max(${n.halfSize}.x * 2.0, 0.000001) + 0.5;
      ${l} imageV = 0.5 - projectedY / max(${n.halfSize}.y * 2.0, 0.000001);
      ${Y("imageValid", c, "0.0", t)}
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
function gt(e, t, n) {
	let r = t.get(e.id);
	return r ? n === "wgsl" ? `effectColor = ${r.parameterName};` : `{
    vec4 imageSampleInfo = skyboxStudioImageSampleInfo${r.index}(direction);
    vec4 imageSampleColor = texture2D(imageTexture${r.index}, imageSampleInfo.xy);
    imageSampleColor = vec4(
      mix(imageSampleColor.rgb, vec3(1.0, 0.0, 0.0), imageHover${r.index} * ${q(Ve)}),
      imageSampleColor.a
    );
    effectColor = vec4(imageSampleColor.rgb, imageSampleColor.a * imageSampleInfo.z);
  }` : `effectColor = ${n === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function _t(e) {
	return u(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${ht(e, "wgsl", {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var vt = u("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n"), yt = u(`
  fn skyboxStudioApplyImageHover(color: vec4<f32>, hover: f32) -> vec4<f32> {
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), clamp(hover, 0.0, 1.0) * ${q(Ve)}),
      color.a
    );
  }
`);
function bt(e) {
	return e.map((e) => `
        vec4 skyboxStudioImageSampleInfo${e.index}(vec3 direction) {
          ${ht(e, "glsl", {
		centerDirection: `imageCenterDirection${e.index}`,
		halfSize: `imageHalfSize${e.index}`,
		tangentX: `imageTangentX${e.index}`,
		tangentY: `imageTangentY${e.index}`
	})}
        }
      `).join("\n");
}
function Z(e, t) {
	return t.params.src ? e.get(t.id) ?? P : P;
}
function xt(e, t) {
	return Object.fromEntries(e.map((e) => [`imageTexture${e.index}`, { value: Z(t, e.layer) }]));
}
function St(e, t, n) {
	t.forEach((t) => {
		let r = `imageTexture${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = Z(n, t.layer));
	});
}
function Ct(e, t) {
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
function wt(e, t) {
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
    ${Y("fieldDirection", r, "direction", t)}
    ${i} warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      ${i} warpX = sin((direction.y * warpFrequency + 0.23) * ${q(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${q(Math.PI * 2)});
      ${i} warpY = cos((direction.z * warpFrequency + 0.17) * ${q(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${q(Math.PI * 2)});
      ${i} warpZ = sin((direction.x * warpFrequency - 0.31) * ${q(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${q(Math.PI * 2)});
      fieldDirection = normalize(direction + ${r}(warpX, warpY, warpZ) * warpScale);
    }
    ${Y("weightedColor", r, `${r}(0.0)`, t)}
    ${Y("weightSum", t === "wgsl" ? "f32" : "float", "0.0", t)}
    ${a}
    if (weightSum > 0.0) {
      effectColor = ${n}(weightedColor / weightSum, 1.0);
    } else {
      effectColor = ${n}(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
function Tt(e, t, n, r, i) {
	if (e.type === "gradient") {
		let r = n.get(e.id);
		return r ? Ct(r, t) : `effectColor = ${t === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
	}
	if (e.type === "field-gradient") {
		let n = r.get(e.id);
		return n ? wt(n, t) : `effectColor = ${t === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
	}
	return gt(e, i, t);
}
function Q(e, t, n, r) {
	return r === "wgsl" ? `select(${n}, ${t}, ${e})` : `((${e}) ? ${t} : ${n})`;
}
function Et(e, t) {
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
	let n = J(1, t), r = J(.5, t), i = J(0, t), a = "effectColor.rgb", o = "composedColor";
	switch (e.blendMode) {
		case "darken": return `min(${o}, ${a})`;
		case "multiply": return `${o} * ${a}`;
		case "color-burn": return Q(`${o} == ${n}`, n, Q(`${a} == ${i}`, i, `${n} - min(${n}, (${n} - ${o}) / ${a})`, t), t);
		case "lighten": return `max(${o}, ${a})`;
		case "screen": return `${o} + ${a} - ${o} * ${a}`;
		case "color-dodge": return Q(`${o} == ${i}`, i, Q(`${a} == ${n}`, n, `min(${n}, ${o} / (${n} - ${a}))`, t), t);
		case "overlay": return Q(`${o} <= ${r}`, `2.0 * ${o} * ${a}`, `${n} - 2.0 * (${n} - ${o}) * (${n} - ${a})`, t);
		case "soft-light": return Q(`${a} <= ${r}`, `${o} - (${n} - 2.0 * ${a}) * ${o} * (${n} - ${o})`, `${o} + (2.0 * ${a} - ${n}) * (softLightD - ${o})`, t);
		case "hard-light": return Q(`${a} <= ${r}`, `2.0 * ${o} * ${a}`, `${o} + (2.0 * ${a} - ${n}) - ${o} * (2.0 * ${a} - ${n})`, t);
		case "difference": return `abs(${o} - ${a})`;
		case "exclusion": return `${o} + ${a} - 2.0 * ${o} * ${a}`;
		default: return a;
	}
}
function Dt(e, t) {
	if (t === "glsl" || e.blendMode !== "soft-light") return "";
	let n = t === "wgsl" ? "vec3<f32>" : "vec3";
	return `${t === "wgsl" ? "let" : "vec3"} softLightD = ${Q(`composedColor <= ${n}(0.25)`, `((16.0 * composedColor - ${n}(12.0)) * composedColor + ${n}(4.0)) * composedColor`, "sqrt(composedColor)", t)};`;
}
function $(e, t, n, r, i, a = 0) {
	let o = t === "wgsl" ? "vec3<f32>" : "vec3", s = t === "wgsl" ? "vec4<f32>" : "vec4";
	return lt(e).map((e, c) => {
		let l = e.type === "group" ? `effectColor = ${s}(${`groupColor${a}_${c}`}, 1.0);` : Tt(e, t, n, r, i), u = `groupColor${a}_${c}`;
		return `{
        ${e.type === "group" ? `${Y(u, o, `${o}(0.0)`, t)}
        {
          ${Y("previousComposedColor", o, "composedColor", t)}
          composedColor = ${o}(0.0);
          ${$(e.children, t, n, r, i, a + 1)}
          ${u} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${Y("effectColor", s, `${s}(0.0)`, t)}
        ${l}
        ${t === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${q(e.opacity / 100)}, 0.0, 1.0);
        ${Dt(e, t)}
        ${t === "wgsl" ? "let" : "vec3"} blendedColor = clamp(${Et(e, t)}, ${o}(0.0), ${o}(1.0));
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          ${o}(0.0),
          ${o}(1.0)
        );
      }`;
	}).join("\n");
}
function Ot(e, t, n, r) {
	let i = X(t), a = pt(n), o = mt(r), s = $(e.nodes, "wgsl", i, a, o);
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
function kt(e, t, n, r, i) {
	return Object.fromEntries(e.map((e) => {
		let a = i[e.index], o = _t(e)({
			direction: t,
			imageCenterDirection: a.centerDirection,
			imageHalfSize: a.halfSize,
			imageTangentX: a.tangentX,
			imageTangentY: a.tangentY
		}), c = l(o.x, o.y), u = vt({
			color: yt({
				color: s(Z(n, e.layer), c),
				hover: r[e.index].node
			}),
			valid: o.z
		});
		return [e.parameterName, u];
	}));
}
function At(s, c, l) {
	let u = new t(), d = ut(s.nodes), f = dt(s.nodes), p = ft(s.nodes), m = Ot(s, d, f, p), h = Qe(d), g = nt(f), _ = He(p, c), v = qe(p), y = n(() => {
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
		...kt(p, b, l, _, v)
	}), Ke(u, (e) => Ue(_, e)), ot(u, (e) => U(e.nodes, (e) => $e(h, e))), st(u, (e) => W(e.nodes, (e) => rt(g, e))), Ze(u, (e, t) => Je(v, e, t)), u;
}
var jt = u("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.z, normalizedDirection.x);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n");
function Mt(c) {
	let l = new t(), u = n(() => {
		let e = i;
		return e.z.assign(e.w), e;
	})(), d = a(o.sub(r));
	return l.side = e.BackSide, l.depthTest = !1, l.depthWrite = !1, l.vertexNode = u, l.colorNode = s(c, jt({ direction: d })), l;
}
function Nt(t, n, r) {
	let i = ut(t.nodes), a = dt(t.nodes), o = ft(t.nodes), s = X(i), c = pt(a), l = mt(o), u = $(t.nodes, "glsl", s, c, l), d = new e.ShaderMaterial({
		uniforms: {
			...et(i),
			...it(a),
			...We(o, n),
			...Ye(o),
			...xt(o, r)
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
      ${bt(o)}

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
	return Ke(d, (e) => Ge(d, o, e)), ot(d, (e) => U(e.nodes, (e) => tt(d, e, i))), st(d, (e) => W(e.nodes, (e) => at(d, e, a))), Ze(d, (e, t) => Xe(d, o, e, t)), d.userData.applyImageTextures = (e) => St(d, o, e), d;
}
function Pt(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function Ft(t, n = {}) {
	let r = ze(t, n), i = Pt(r.width, r.height), a = i.getContext("2d");
	if (!a || !("putImageData" in a)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	a.putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
	let o = new e.CanvasTexture(i);
	return o.mapping = e.EquirectangularReflectionMapping, o.wrapS = e.RepeatWrapping, o.wrapT = e.ClampToEdgeWrapping, o.colorSpace = e.SRGBColorSpace, o.flipY = !1, o.needsUpdate = !0, o;
}
function It(t) {
	return new e.ShaderMaterial({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		uniforms: { skyboxTexture: { value: t } },
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: "\n      precision highp float;\n      uniform sampler2D skyboxTexture;\n      varying vec3 vDirection;\n\n      const float PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.z, normalizedDirection.x);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);\n      }\n\n      void main() {\n        vec3 direction = normalize(vDirection);\n        vec4 sampledColor = texture2D(skyboxTexture, directionToEquirectUv(direction));\n        gl_FragColor = vec4(sampledColor.rgb, sampledColor.a);\n      }\n    "
	});
}
function Lt(e, t) {
	return Rt(t) ? Mt(e) : It(e);
}
function Rt(e) {
	return !!(e && "isWebGPURenderer" in e && e.isWebGPURenderer);
}
function zt(e, t) {
	return e === "auto" ? Rt(t) ? "live-webgpu" : "live-webgl" : e;
}
function Bt(e, t) {
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
var Vt = class extends e.Mesh {
	#e = {};
	#t = x;
	#n = null;
	#r = /* @__PURE__ */ new Map();
	#i = /* @__PURE__ */ new Map();
	#a = Be;
	#o = null;
	#s = null;
	#c = "auto";
	#l = null;
	constructor() {
		super(K(x), At(Be, null, /* @__PURE__ */ new Map())), this.frustumCulled = !1, this.renderOrder = -1;
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
		let t = G(e);
		if (this.#t.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#t = t, this.geometry = K(t), n.dispose();
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
		let n = zt(this.#c, this.#l), r = Bt(this.#a, n);
		if (this.#o === r && (n === "live-webgpu" || n === "live-webgl")) return this.applyLiveManifestUniformUpdates(), this;
		if (n === "live-webgpu") this.replaceMaterial(At(this.#a, this.#n, this.#i));
		else if (n === "live-webgl") this.replaceMaterial(Nt(this.#a, this.#n, this.#i));
		else {
			let e = Ft(this.#a, this.#e);
			this.replaceMaterial(Lt(e, this.#l), e);
		}
		return this.#o = r, this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(Lt(e, this.#l)), this.#o = null, this;
	}
	invalidateBakeCache() {
		return Re(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture();
	}
};
//#endregion
export { Pe as DEFAULT_BAKE_WIDTH, w as IMAGE_PLACEMENT_ELEVATION_LIMIT, Vt as Skybox, ze as bakeSkyboxImageData, _ as blendChannel, d as clamp, v as compositeBlendChannel, y as compositeOver, D as createAngularDecalPlacement, Le as createBakeCacheKey, Ft as createBakedSkyboxTexture, ue as createImagePlacementTangents, K as createSkyboxGeometry, ct as createSkyboxWireGeometry, fe as directionFromPosition, xe as equirectPointToDirection, Se as equirectUvToDirection, Ne as evaluateSkyboxDirection, Re as invalidateBakeCache, p as linearChannelToSrgb, h as linearRgbToSrgbBytes, S as migrateManifestToV2, O as normalizeImagePlacement, E as normalizeVector, m as parseHexColor, pe as placementFromPosition, he as placementFromScale, de as positionFromPlacement, ge as projectDirectionToImageUv, Ie as resolveBakeOptions, me as scaleFromPlacement, f as srgbChannelToLinear };
