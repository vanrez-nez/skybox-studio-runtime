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
], w = [
	0,
	0,
	-1
], ee = [
	1,
	0,
	0
], T = [
	0,
	1,
	0
], E = 89.9;
function D(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function O(e) {
	return e * Math.PI / 180;
}
function te(e) {
	return e * 180 / Math.PI;
}
function ne(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function k(e) {
	return (Math.round(e) % 360 + 360) % 360;
}
function A(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function re(e, t) {
	return [
		e[0] - t[0],
		e[1] - t[1],
		e[2] - t[2]
	];
}
function j(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function ie(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function ae(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function M(e, t = w) {
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
function oe(e, t, n) {
	let r = O(n), i = Math.cos(r), a = Math.sin(r), o = M(t);
	return M(ie(ie(j(e, i), j(ae(o, e), a)), j(o, A(o, e) * (1 - i))), e);
}
function se(e, t = C, n = 0) {
	let r = M(e), i = re(M(t, C), j(r, A(M(t, C), r)));
	if (Math.hypot(i[0], i[1], i[2]) < 1e-6) {
		let e = Math.abs(r[1]) > .98 ? [
			0,
			0,
			1
		] : C;
		i = re(e, j(r, A(e, r)));
	}
	return i = M(i, T), {
		tangentX: oe(M(ae(r, i), ee), r, n),
		tangentY: oe(i, r, n)
	};
}
function N({ angularHeight: e, angularWidth: t, baseAngularHeight: n, baseAngularWidth: r, centerDirection: i, rotation: a = 0, upDirection: o = C }) {
	let s = M(i), c = k(a), { tangentX: l, tangentY: u } = se(s, o, c), d = Math.max(1e-4, e), f = Math.max(1e-4, t);
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
function P(e) {
	let t = e, n = M(t?.centerDirection ?? t?.normal ?? t?.center, w), r = Array.isArray(t?.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, i = typeof t?.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t?.width ?? .4) / (2 * r)), a = typeof t?.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t?.height ?? .3) / (2 * r));
	return N({
		angularHeight: a,
		angularWidth: i,
		baseAngularHeight: typeof t?.baseAngularHeight == "number" ? t.baseAngularHeight : a,
		baseAngularWidth: typeof t?.baseAngularWidth == "number" ? t.baseAngularWidth : i,
		centerDirection: n,
		rotation: typeof t?.rotation == "number" ? t.rotation : 0
	});
}
function ce(e) {
	let t = M(e.centerDirection);
	return {
		x: ne(te(Math.atan2(t[0], -t[2]))),
		y: te(Math.asin(D(t[1], -1, 1)))
	};
}
function le(e) {
	let t = O(e.x), n = O(D(e.y, -89.9, E)), r = Math.cos(n);
	return M([
		Math.sin(t) * r,
		Math.sin(n),
		-Math.cos(t) * r
	]);
}
function ue(e, t, n) {
	let r = P(e);
	return N({
		angularHeight: r.angularHeight,
		angularWidth: r.angularWidth,
		baseAngularHeight: r.baseAngularHeight,
		baseAngularWidth: r.baseAngularWidth,
		centerDirection: le(t),
		rotation: r.rotation,
		upDirection: n?.upDirection
	});
}
function de(e) {
	let t = P(e);
	return {
		x: t.angularWidth / t.baseAngularWidth,
		y: t.angularHeight / t.baseAngularHeight
	};
}
function fe(e, t) {
	let n = P(e);
	return {
		...n,
		angularHeight: Math.max(1e-4, n.baseAngularHeight * Math.max(1e-4, t.y)),
		angularWidth: Math.max(1e-4, n.baseAngularWidth * Math.max(1e-4, t.x))
	};
}
function pe(e) {
	return P(e).rotation;
}
function me(e, t) {
	let n = P(e);
	return N({
		angularHeight: n.angularHeight,
		angularWidth: n.angularWidth,
		baseAngularHeight: n.baseAngularHeight,
		baseAngularWidth: n.baseAngularWidth,
		centerDirection: n.centerDirection,
		rotation: t
	});
}
function he(e, t) {
	let n = P(t), r = M(e), i = A(r, n.centerDirection);
	if (i <= 0) return null;
	let a = A(r, n.tangentX) / i, o = A(r, n.tangentY) / i, s = Math.tan(n.angularWidth / 2), c = Math.tan(n.angularHeight / 2);
	return s <= 0 || c <= 0 || a < -s || a > s || o < -c || o > c ? null : {
		u: a / (2 * s) + .5,
		v: .5 - o / (2 * c)
	};
}
//#endregion
//#region spot-transform.ts
var ge = Math.PI / 12;
function F(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function _e(e) {
	return e * 180 / Math.PI;
}
function ve(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function ye() {
	return {
		angularRadius: ge,
		baseAngularRadius: ge,
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
function I(e) {
	let t = e, n = ye(), r = Math.max(1e-4, typeof t?.baseAngularRadius == "number" ? t.baseAngularRadius : n.baseAngularRadius);
	return {
		angularRadius: Math.max(1e-4, typeof t?.angularRadius == "number" ? t.angularRadius : r),
		baseAngularRadius: r,
		brightness: Math.max(0, typeof t?.brightness == "number" ? t.brightness : n.brightness),
		centerDirection: M(t?.centerDirection, n.centerDirection),
		colorMode: t?.colorMode === "gradient" ? "gradient" : "light",
		coreRadius: F(typeof t?.coreRadius == "number" ? t.coreRadius : n.coreRadius, .01, .7),
		coreSoftness: F(typeof t?.coreSoftness == "number" ? t.coreSoftness : n.coreSoftness, .4, 6),
		dispersion: F(typeof t?.dispersion == "number" ? t.dispersion : n.dispersion, 0, 1),
		dogSpread: F(typeof t?.dogSpread == "number" ? t.dogSpread : n.dogSpread, .015, .18),
		dogStrength: F(typeof t?.dogStrength == "number" ? t.dogStrength : n.dogStrength, 0, 1.8),
		dogStretch: F(typeof t?.dogStretch == "number" ? t.dogStretch : n.dogStretch, 0, .55),
		glareSize: F(typeof t?.glareSize == "number" ? t.glareSize : n.glareSize, .03, 1.1),
		glareStrength: F(typeof t?.glareStrength == "number" ? t.glareStrength : n.glareStrength, 0, 1.4),
		glow: F(typeof t?.glow == "number" ? t.glow : n.glow, 0, 1),
		glowSize: F(typeof t?.glowSize == "number" ? t.glowSize : n.glowSize, .05, 1.4),
		glowStrength: F(typeof t?.glowStrength == "number" ? t.glowStrength : n.glowStrength, 0, 1),
		halo: F(typeof t?.halo == "number" ? t.halo : n.halo, 0, 1),
		haloInnerWidth: F(typeof t?.haloInnerWidth == "number" ? t.haloInnerWidth : n.haloInnerWidth, .003, .09),
		haloOuterWidth: F(typeof t?.haloOuterWidth == "number" ? t.haloOuterWidth : n.haloOuterWidth, .01, .24),
		haloRadius: F(typeof t?.haloRadius == "number" ? t.haloRadius : n.haloRadius, .04, 1),
		haloStrength: F(typeof t?.haloStrength == "number" ? t.haloStrength : n.haloStrength, 0, 1.4),
		lightColor: typeof t?.lightColor == "string" ? t.lightColor : n.lightColor,
		stops: (t?.stops?.length ? t.stops : n.stops).map((e) => ({
			color: e.color,
			location: F(e.location, 0, 100),
			midpoint: F(e.midpoint ?? 50, 1, 99),
			opacity: F(e.opacity, 0, 100)
		}))
	};
}
function be(e) {
	let t = M(e.centerDirection);
	return {
		x: ve(_e(Math.atan2(t[0], -t[2]))),
		y: _e(Math.asin(F(t[1], -1, 1)))
	};
}
function xe(e, t) {
	return {
		...I(e),
		centerDirection: le({
			x: t.x,
			y: F(t.y, -E, E)
		})
	};
}
function Se(e) {
	let t = I(e);
	return t.angularRadius / t.baseAngularRadius;
}
function Ce(e, t) {
	let n = I(e);
	return {
		...n,
		angularRadius: Math.max(1e-4, n.baseAngularRadius * Math.max(1e-4, t))
	};
}
function we(e, t) {
	let n = I(t), r = M(e), i = M(n.centerDirection), a = r[0] * i[0] + r[1] * i[1] + r[2] * i[2];
	return Math.acos(F(a, -1, 1)) <= n.angularRadius;
}
//#endregion
//#region evaluator.ts
var L = Math.PI * 2;
function R(e, t, n) {
	return e + (t - e) * n;
}
function Te(e) {
	return e.map((e) => ({
		alpha: d(e.opacity / 100),
		color: m(e.color),
		midpoint: d((e.midpoint ?? 50) / 100, .01, .99),
		t: d(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function Ee(e, t) {
	return e <= t ? e / Math.max(t * 2, 1e-5) : .5 + (e - t) / Math.max((1 - t) * 2, 1e-5);
}
function De(e, t) {
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
		let a = i.t - r.t, o = Ee(a <= 0 ? 0 : (n - r.t) / a, r.midpoint);
		return [
			R(r.color[0], i.color[0], o),
			R(r.color[1], i.color[1], o),
			R(r.color[2], i.color[2], o),
			R(r.alpha, i.alpha, o)
		];
	}
	return [...i.color, i.alpha];
}
function Oe(e) {
	let t = e * Math.PI / 180;
	return [
		Math.sin(t),
		Math.cos(t),
		0
	];
}
function ke(e, t) {
	let n = Oe(t.rotation), r = e[0] * n[0] + e[1] * n[1] + e[2] * n[2];
	return De(Te(t.stops), r * .5 + .5);
}
function z(e, t, n) {
	let r = d((n - e) / Math.max(t - e, 1e-5));
	return r * r * (3 - 2 * r);
}
function B(e) {
	return e * e;
}
function Ae(e) {
	let t = d(e), n = [
		1,
		.12,
		.05
	];
	return n = V(n, [
		1,
		.55,
		.1
	], z(0, .28, t)), n = V(n, [
		1,
		.93,
		.6
	], z(.22, .45, t)), n = V(n, [
		1,
		1,
		1
	], z(.42, .6, t)), n = V(n, [
		.55,
		.8,
		1
	], z(.62, .85, t)), n = V(n, [
		.35,
		.5,
		1
	], z(.85, 1, t)), n;
}
function V(e, t, n) {
	return [
		R(e[0], t[0], n),
		R(e[1], t[1], n),
		R(e[2], t[2], n)
	];
}
function je(e, t) {
	return [
		e[0] * t[0],
		e[1] * t[1],
		e[2] * t[2]
	];
}
function H(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function U(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function Me(e, t) {
	return V(t, je(e, V([
		1,
		1,
		1
	], t, .82)), .82);
}
function Ne(e, t) {
	let n = (e - .5) * L, r = (.5 - t) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function Pe(e, t) {
	let n = (e - .5) * L, r = (t - .5) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function W(e) {
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
function Fe(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function Ie(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function Le(e, t, n) {
	let r = W(e), i = W(t), a = W(Ie([
		0,
		1,
		0
	], i)), o = W(Ie(i, a)), s = Math.max(Fe(r, i), 1e-6), c = Fe(r, a) / s / Math.max(n, 1e-4), l = Fe(r, o) / s / Math.max(n, 1e-4);
	return {
		x: c,
		y: l,
		d: Math.hypot(c, l)
	};
}
function Re(e, t, n) {
	if (t <= 0) return e;
	let r = Math.max(1e-4, n), i = [
		Math.sin((e[1] * r + .23) * L) * Math.cos((e[2] * r + .41) * L),
		Math.cos((e[2] * r + .17) * L) * Math.sin((e[0] * r + .37) * L),
		Math.sin((e[0] * r - .31) * L) * Math.cos((e[1] * r + .29) * L)
	];
	return W([
		e[0] + i[0] * t,
		e[1] + i[1] * t,
		e[2] + i[2] * t
	]);
}
function ze(e, t) {
	return 1 - d(e[0] * t[0] + e[1] * t[1] + e[2] * t[2], -1, 1);
}
function Be(e, t) {
	if (t.anchors.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = Re(e, d(t.amplitude, 0, .6), Math.max(1e-4, t.frequency)), r = 0, i = 0, a = 0, o = 0;
	return t.anchors.forEach((e) => {
		let s = ze(n, Ne(e.x, e.y)), c = t.mode === "gaussian" ? Math.exp(-(s * s) / (2 * (.46 / t.power) ** 2)) : 1 / (s + 5e-4) ** t.power, l = m(e.color);
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
function Ve(e, t, n) {
	return [
		R(e[0], t[0], n),
		R(e[1], t[1], n),
		R(e[2], t[2], n),
		R(e[3], t[3], n)
	];
}
function He(e, t, n) {
	let r = Math.min(e.width - 1, Math.max(0, t)), i = (Math.min(e.height - 1, Math.max(0, n)) * e.width + r) * 4, a = e.pixels?.[i] ?? 0, o = e.pixels?.[i + 1] ?? 0, s = e.pixels?.[i + 2] ?? 0, c = e.pixels?.[i + 3] ?? 255;
	return [
		f(a / 255),
		f(o / 255),
		f(s / 255),
		c / 255
	];
}
function Ue(e, t) {
	let n = t.placement;
	if (!n || !t.pixels || t.width <= 0 || t.height <= 0) return [
		0,
		0,
		0,
		0
	];
	let r = he(e, n);
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
	return Ve(Ve(He(t, c, l), He(t, u, l), f), Ve(He(t, c, d), He(t, u, d), f), p);
}
function We(e, t) {
	let n = I(t), r = W(e), i = W(n.centerDirection), a = Fe(r, i), o = Math.acos(d(a, -1, 1)), s = Math.max(n.angularRadius, 1e-4), c = o / s;
	if (n.colorMode === "gradient") return c > 1 ? [
		0,
		0,
		0,
		0
	] : De(Te(n.stops), c);
	let l = Le(e, i, s), u = l.d, f = m(n.lightColor), p = n.brightness, h = d(1 - u / n.coreRadius) ** +n.coreSoftness, g = d(1 - u / n.glowSize) ** 2 * n.glowStrength, _ = d(1 - u / n.glareSize) ** 1.15 * n.glareStrength, v = (h + g + _) * p, y = H(f, v);
	y = U(y, [
		Math.max(v - 1, 0),
		Math.max(v - 1, 0),
		Math.max(v - 1, 0)
	]);
	let b = Math.max(n.haloInnerWidth, 1e-4), x = Math.max(n.haloOuterWidth, 1e-4), S = u - n.haloRadius, C = Math.exp(-B(S / (S < 0 ? b : x))), w = Me(V([
		1,
		1,
		1
	], Ae(d((u - (n.haloRadius - b)) / (b + x))), n.dispersion), f), ee = C * n.haloStrength * p;
	y = U(y, H(w, ee)), y = U(y, H([
		1,
		1,
		1
	], Math.max(ee - 1.2, 0) * .22));
	let T = Math.abs(l.y), E = Math.abs(l.x), D = Math.exp(-B((E - n.haloRadius) / Math.max(n.dogSpread, 1e-4))) * Math.exp(-B(T / Math.max(n.dogSpread * .72, 1e-4))), O = z(n.haloRadius, n.haloRadius + Math.max(n.dogStretch, 1e-4), E) * (1 - z(n.haloRadius + Math.max(n.dogStretch, 1e-4), n.haloRadius + Math.max(n.dogStretch * 2.2, 1e-4), E)) * Math.exp(-B(T / Math.max(n.dogSpread * .9, 1e-4))), te = Me(V([
		1,
		1,
		1
	], Ae(d((E - (n.haloRadius - n.dogSpread * 1.4)) / Math.max(n.dogSpread * 3.5, 1e-4))), n.dispersion), f), ne = (D + O * .28) * n.dogStrength * p;
	y = U(y, H(te, ne)), y = U(y, H([
		1,
		1,
		1
	], Math.max(ne - 1.1, 0) * .18));
	let k = d(Math.max(y[0], y[1], y[2]));
	return k <= 1e-5 ? [
		0,
		0,
		0,
		0
	] : [
		y[0] / k,
		y[1] / k,
		y[2] / k,
		k
	];
}
function Ge(e, t) {
	return t.type === "gradient" ? ke(e, t.params) : t.type === "field-gradient" ? Be(e, t.params) : t.type === "spot" ? We(e, t.params) : Ue(e, t.params);
}
function Ke(e, t) {
	return t.filter((e) => e.enabled).reverse().reduce((t, n) => {
		let r = n.type === "group" ? [...Ke(e, n.children), 1] : Ge(e, n), i = d(r[3] * (n.opacity / 100));
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
function qe(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = qe(n.children, t);
		if (e) return e;
	}
	return null;
}
function Je(e, t, n = {}) {
	let r = S(e), i = n.targetGroupId ? qe(r.nodes, n.targetGroupId) : null;
	return Ke(t, n.targetGroupId ? i ? [i] : [] : r.nodes);
}
//#endregion
//#region bake.ts
var Ye = 1024, Xe = "0.1.0", Ze = /* @__PURE__ */ new Map();
function Qe(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function $e(e, t) {
	return b(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: Xe
	}));
}
function et() {
	Ze.clear();
}
function tt(e, t = {}) {
	let n = Qe(t), r = n.cache ? $e(e, n) : null;
	if (r) {
		let e = Ze.get(r);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: i, targetGroupId: a, width: o } = n, s = new Uint8ClampedArray(o * i * 4);
	for (let t = 0; t < i; t += 1) {
		let n = (t + .5) / i;
		for (let r = 0; r < o; r += 1) {
			let [i, c, l] = h(Je(e, Pe((r + .5) / o, n), { targetGroupId: a })), u = (t * o + r) * 4;
			s[u] = i, s[u + 1] = c, s[u + 2] = l, s[u + 3] = 255;
		}
	}
	let c = {
		data: s,
		height: i,
		width: o
	};
	return r && Ze.set(r, {
		...c,
		data: new Uint8ClampedArray(s)
	}), c;
}
//#endregion
//#region Skybox.ts
var nt = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: x,
	nodes: [],
	version: 2
}, rt = .18, it = .75, at = 1.75, ot = 1e-4, st = .01, ct = {
	hoveredImageLayerId: null,
	selectedImageLayerId: null
}, G = new e.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, e.RGBAFormat);
G.colorSpace = e.SRGBColorSpace, G.needsUpdate = !0;
function lt(e, t) {
	return +(t === e);
}
function ut(e, t) {
	return +(t === e);
}
function dt(e, t) {
	return Math.max(lt(e, t.hoveredImageLayerId), ut(e, t.selectedImageLayerId));
}
function ft(e, t) {
	return e.map((e) => ({
		active: c(dt(e.layer.id, t)),
		layerId: e.layer.id
	}));
}
function pt(e, t) {
	e.forEach((e) => {
		e.active.value = dt(e.layerId, t);
	});
}
function mt(e, t) {
	return Object.fromEntries(e.map((e) => [`imageActive${e.index}`, { value: dt(e.layer.id, t) }]));
}
function ht(e, t, n) {
	t.forEach((t) => {
		let r = `imageActive${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = dt(t.layer.id, n));
	});
}
function gt(e, t) {
	e.userData.applyEditorImageState = t;
}
function _t(t) {
	if (!t) return {
		centerDirection: new e.Vector3(0, 0, -1),
		halfSize: new e.Vector2(0, 0),
		tangentX: new e.Vector3(1, 0, 0),
		tangentY: new e.Vector3(0, 1, 0)
	};
	let n = P(t);
	return {
		centerDirection: new e.Vector3(...n.centerDirection),
		halfSize: new e.Vector2(Math.max(0, Math.tan(n.angularWidth / 2)), Math.max(0, Math.tan(n.angularHeight / 2))),
		tangentX: new e.Vector3(...n.tangentX),
		tangentY: new e.Vector3(...n.tangentY)
	};
}
function vt(e) {
	return e.map((e) => {
		let t = _t(e.layer.params.placement);
		return {
			centerDirection: c(t.centerDirection),
			halfSize: c(t.halfSize),
			layerId: e.layer.id,
			tangentX: c(t.tangentX),
			tangentY: c(t.tangentY)
		};
	});
}
function yt(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = _t(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function bt(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = _t(e.layer.params.placement);
		return [
			[`imageCenterDirection${e.index}`, { value: t.centerDirection }],
			[`imageTangentX${e.index}`, { value: t.tangentX }],
			[`imageTangentY${e.index}`, { value: t.tangentY }],
			[`imageHalfSize${e.index}`, { value: t.halfSize }]
		];
	}));
}
function xt(e, t, n, r) {
	let i = t.find((e) => e.layer.id === n);
	if (!i) return;
	let a = _t(r);
	e.uniforms[`imageCenterDirection${i.index}`]?.value.copy(a.centerDirection), e.uniforms[`imageTangentX${i.index}`]?.value.copy(a.tangentX), e.uniforms[`imageTangentY${i.index}`]?.value.copy(a.tangentY), e.uniforms[`imageHalfSize${i.index}`]?.value.copy(a.halfSize);
}
function St(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function Ct(t) {
	let n = t * Math.PI / 180;
	return new e.Vector3(Math.sin(n), Math.cos(n), 0).normalize();
}
function K(e) {
	return [...e.stops].map((e) => ({
		color: e.color,
		midpoint: d((e.midpoint ?? 50) / 100, .01, .99),
		opacity: d(e.opacity / 100),
		t: d(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function q(t) {
	let [n, r, i] = m(t.color);
	return new e.Vector4(n, r, i, t.opacity);
}
function wt(e) {
	return +(e === "gaussian");
}
function Tt(e) {
	return +(e === "gradient");
}
function Et(e) {
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
function J(e) {
	return {
		blendMode: Et(e.blendMode),
		opacity: d(e.opacity / 100)
	};
}
function Dt(t, n) {
	let r = (d(t) - .5) * Math.PI * 2, i = (.5 - d(n)) * Math.PI, a = Math.cos(i);
	return new e.Vector3(a * Math.cos(r), Math.sin(i), a * Math.sin(r)).normalize();
}
function Y(t) {
	let [n, r, i] = m(t);
	return new e.Vector3(n, r, i);
}
function Ot(e) {
	return e.map((e) => {
		let t = K(e.layer.params);
		return {
			axis: c(Ct(e.layer.params.rotation)),
			layerId: e.layer.id,
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: c(q(r)),
					midpoint: c(r.midpoint),
					t: c(r.t)
				};
			})
		};
	});
}
function kt(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = K(t.params);
	n.axis.value.copy(Ct(t.params.rotation)), n.stops.forEach((e, t) => {
		let n = r[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(q(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function At(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = K(e.layer.params);
		return [[`${e.parameterPrefix}Axis`, { value: Ct(e.layer.params.rotation) }], ...Array.from({ length: e.stopCount }, (n, r) => {
			let i = t[r] ?? {
				color: "#000000",
				midpoint: .5,
				opacity: 0,
				t: 0
			};
			return [
				[`${e.parameterPrefix}StopColor${r}`, { value: q(i) }],
				[`${e.parameterPrefix}StopMidpoint${r}`, { value: i.midpoint }],
				[`${e.parameterPrefix}StopT${r}`, { value: i.t }]
			];
		}).flat()];
	}));
}
function jt(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	if (!r) return;
	let i = K(t.params);
	e.uniforms[`${r.parameterPrefix}Axis`]?.value.copy(Ct(t.params.rotation)), Array.from({ length: r.stopCount }, (t, n) => {
		let a = i[n] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.uniforms[`${r.parameterPrefix}StopColor${n}`]?.value.copy(q(a)), e.uniforms[`${r.parameterPrefix}StopT${n}`] && (e.uniforms[`${r.parameterPrefix}StopT${n}`].value = a.t), e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`] && (e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`].value = a.midpoint);
	});
}
function Mt(e) {
	return e.map((e) => ({
		amplitude: c(d(e.layer.params.amplitude, 0, .6)),
		anchors: Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return {
				color: c(Y(r.color)),
				direction: c(Dt(r.x, r.y))
			};
		}),
		frequency: c(Math.max(1e-4, e.layer.params.frequency)),
		layerId: e.layer.id,
		mode: c(wt(e.layer.params.mode)),
		power: c(Math.max(1e-4, e.layer.params.power))
	}));
}
function Nt(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n && (n.amplitude.value = d(t.params.amplitude, 0, .6), n.frequency.value = Math.max(1e-4, t.params.frequency), n.mode.value = wt(t.params.mode), n.power.value = Math.max(1e-4, t.params.power), n.anchors.forEach((e, n) => {
		let r = t.params.anchors[n] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.color.value.copy(Y(r.color)), e.direction.value.copy(Dt(r.x, r.y));
	}));
}
function Pt(e) {
	return Object.fromEntries(e.flatMap((e) => [
		[`${e.parameterPrefix}Amplitude`, { value: d(e.layer.params.amplitude, 0, .6) }],
		[`${e.parameterPrefix}Frequency`, { value: Math.max(1e-4, e.layer.params.frequency) }],
		[`${e.parameterPrefix}Mode`, { value: wt(e.layer.params.mode) }],
		[`${e.parameterPrefix}Power`, { value: Math.max(1e-4, e.layer.params.power) }],
		...Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return [[`${e.parameterPrefix}AnchorDirection${n}`, { value: Dt(r.x, r.y) }], [`${e.parameterPrefix}AnchorColor${n}`, { value: Y(r.color) }]];
		}).flat()
	]));
}
function Ft(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	r && (e.uniforms[`${r.parameterPrefix}Amplitude`] && (e.uniforms[`${r.parameterPrefix}Amplitude`].value = d(t.params.amplitude, 0, .6)), e.uniforms[`${r.parameterPrefix}Frequency`] && (e.uniforms[`${r.parameterPrefix}Frequency`].value = Math.max(1e-4, t.params.frequency)), e.uniforms[`${r.parameterPrefix}Mode`] && (e.uniforms[`${r.parameterPrefix}Mode`].value = wt(t.params.mode)), e.uniforms[`${r.parameterPrefix}Power`] && (e.uniforms[`${r.parameterPrefix}Power`].value = Math.max(1e-4, t.params.power)), Array.from({ length: r.anchorCount }, (n, i) => {
		let a = t.params.anchors[i] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.uniforms[`${r.parameterPrefix}AnchorDirection${i}`]?.value.copy(Dt(a.x, a.y)), e.uniforms[`${r.parameterPrefix}AnchorColor${i}`]?.value.copy(Y(a.color));
	}));
}
function It(t) {
	let n = I(t);
	return {
		brightness: Math.max(0, n.brightness),
		centerDirection: new e.Vector3(...n.centerDirection).normalize(),
		coreRadius: n.coreRadius,
		coreSoftness: n.coreSoftness,
		dispersion: n.dispersion,
		dogSpread: n.dogSpread,
		dogStrength: n.dogStrength,
		dogStretch: n.dogStretch,
		glareSize: n.glareSize,
		glareStrength: n.glareStrength,
		glowSize: n.glowSize,
		glowStrength: n.glowStrength,
		haloInnerWidth: n.haloInnerWidth,
		haloOuterWidth: n.haloOuterWidth,
		haloRadius: n.haloRadius,
		haloStrength: n.haloStrength,
		lightColor: Y(n.lightColor),
		mode: Tt(n.colorMode),
		radius: Math.max(1e-4, n.angularRadius),
		stops: K(n)
	};
}
function Lt(e) {
	return e.map((e) => {
		let t = It(e.layer.params);
		return {
			brightness: c(t.brightness),
			centerDirection: c(t.centerDirection),
			coreRadius: c(t.coreRadius),
			coreSoftness: c(t.coreSoftness),
			dispersion: c(t.dispersion),
			dogSpread: c(t.dogSpread),
			dogStrength: c(t.dogStrength),
			dogStretch: c(t.dogStretch),
			glareSize: c(t.glareSize),
			glareStrength: c(t.glareStrength),
			glowSize: c(t.glowSize),
			glowStrength: c(t.glowStrength),
			haloInnerWidth: c(t.haloInnerWidth),
			haloOuterWidth: c(t.haloOuterWidth),
			haloRadius: c(t.haloRadius),
			haloStrength: c(t.haloStrength),
			layerId: e.layer.id,
			lightColor: c(t.lightColor),
			mode: c(t.mode),
			radius: c(t.radius),
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t.stops[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: c(q(r)),
					midpoint: c(r.midpoint),
					t: c(r.t)
				};
			})
		};
	});
}
function Rt(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = It(t.params);
	n.brightness.value = r.brightness, n.centerDirection.value.copy(r.centerDirection), n.coreRadius.value = r.coreRadius, n.coreSoftness.value = r.coreSoftness, n.dispersion.value = r.dispersion, n.dogSpread.value = r.dogSpread, n.dogStrength.value = r.dogStrength, n.dogStretch.value = r.dogStretch, n.glareSize.value = r.glareSize, n.glareStrength.value = r.glareStrength, n.glowSize.value = r.glowSize, n.glowStrength.value = r.glowStrength, n.haloInnerWidth.value = r.haloInnerWidth, n.haloOuterWidth.value = r.haloOuterWidth, n.haloRadius.value = r.haloRadius, n.haloStrength.value = r.haloStrength, n.lightColor.value.copy(r.lightColor), n.mode.value = r.mode, n.radius.value = r.radius, n.stops.forEach((e, t) => {
		let n = r.stops[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(q(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function zt(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = It(e.layer.params);
		return [
			[`${e.parameterPrefix}CenterDirection`, { value: t.centerDirection }],
			[`${e.parameterPrefix}Radius`, { value: t.radius }],
			[`${e.parameterPrefix}Mode`, { value: t.mode }],
			[`${e.parameterPrefix}LightColor`, { value: t.lightColor }],
			[`${e.parameterPrefix}Brightness`, { value: t.brightness }],
			[`${e.parameterPrefix}CoreRadius`, { value: t.coreRadius }],
			[`${e.parameterPrefix}CoreSoftness`, { value: t.coreSoftness }],
			[`${e.parameterPrefix}Dispersion`, { value: t.dispersion }],
			[`${e.parameterPrefix}DogSpread`, { value: t.dogSpread }],
			[`${e.parameterPrefix}DogStrength`, { value: t.dogStrength }],
			[`${e.parameterPrefix}DogStretch`, { value: t.dogStretch }],
			[`${e.parameterPrefix}GlareSize`, { value: t.glareSize }],
			[`${e.parameterPrefix}GlareStrength`, { value: t.glareStrength }],
			[`${e.parameterPrefix}GlowSize`, { value: t.glowSize }],
			[`${e.parameterPrefix}GlowStrength`, { value: t.glowStrength }],
			[`${e.parameterPrefix}HaloInnerWidth`, { value: t.haloInnerWidth }],
			[`${e.parameterPrefix}HaloOuterWidth`, { value: t.haloOuterWidth }],
			[`${e.parameterPrefix}HaloRadius`, { value: t.haloRadius }],
			[`${e.parameterPrefix}HaloStrength`, { value: t.haloStrength }],
			...Array.from({ length: e.stopCount }, (n, r) => {
				let i = t.stops[r] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return [
					[`${e.parameterPrefix}StopColor${r}`, { value: q(i) }],
					[`${e.parameterPrefix}StopMidpoint${r}`, { value: i.midpoint }],
					[`${e.parameterPrefix}StopT${r}`, { value: i.t }]
				];
			}).flat()
		];
	}));
}
function Bt(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	if (!r) return;
	let i = It(t.params);
	e.uniforms[`${r.parameterPrefix}CenterDirection`]?.value.copy(i.centerDirection), e.uniforms[`${r.parameterPrefix}Radius`] && (e.uniforms[`${r.parameterPrefix}Radius`].value = i.radius), e.uniforms[`${r.parameterPrefix}Mode`] && (e.uniforms[`${r.parameterPrefix}Mode`].value = i.mode), e.uniforms[`${r.parameterPrefix}LightColor`]?.value.copy(i.lightColor), e.uniforms[`${r.parameterPrefix}Brightness`] && (e.uniforms[`${r.parameterPrefix}Brightness`].value = i.brightness), [
		["CoreRadius", i.coreRadius],
		["CoreSoftness", i.coreSoftness],
		["Dispersion", i.dispersion],
		["DogSpread", i.dogSpread],
		["DogStrength", i.dogStrength],
		["DogStretch", i.dogStretch],
		["GlareSize", i.glareSize],
		["GlareStrength", i.glareStrength],
		["GlowSize", i.glowSize],
		["GlowStrength", i.glowStrength],
		["HaloInnerWidth", i.haloInnerWidth],
		["HaloOuterWidth", i.haloOuterWidth],
		["HaloRadius", i.haloRadius],
		["HaloStrength", i.haloStrength]
	].forEach(([t, n]) => {
		e.uniforms[`${r.parameterPrefix}${t}`] && (e.uniforms[`${r.parameterPrefix}${t}`].value = n);
	}), Array.from({ length: r.stopCount }, (t, n) => {
		let a = i.stops[n] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.uniforms[`${r.parameterPrefix}StopColor${n}`]?.value.copy(q(a)), e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`] && (e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`].value = a.midpoint), e.uniforms[`${r.parameterPrefix}StopT${n}`] && (e.uniforms[`${r.parameterPrefix}StopT${n}`].value = a.t);
	});
}
function Vt(e) {
	return e.map((e) => {
		let t = J(e.node);
		return {
			blendMode: c(t.blendMode),
			nodeId: e.node.id,
			opacity: c(t.opacity)
		};
	});
}
function Ht(e, t) {
	for (let n of e) if (n.enabled) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = Ht(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
function Ut(e, t) {
	e.forEach((e) => {
		let n = Ht(t.nodes, e.nodeId);
		if (!n) return;
		let r = J(n);
		e.opacity.value = r.opacity, e.blendMode.value = r.blendMode;
	});
}
function Wt(e, t) {
	let n = e.find((e) => e.nodeId === t.id);
	if (!n) return;
	let r = J(t);
	n.opacity.value = r.opacity, n.blendMode.value = r.blendMode;
}
function Gt(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = J(e.node);
		return [[`${e.parameterPrefix}Opacity`, { value: t.opacity }], [`${e.parameterPrefix}BlendMode`, { value: t.blendMode }]];
	}));
}
function Kt(e, t, n) {
	t.forEach((t) => {
		let r = Ht(n.nodes, t.node.id);
		if (!r) return;
		let i = J(r), a = e.uniforms[`${t.parameterPrefix}Opacity`], o = e.uniforms[`${t.parameterPrefix}BlendMode`];
		a && (a.value = i.opacity), o && (o.value = i.blendMode);
	});
}
function qt(e, t, n) {
	let r = t.find((e) => e.node.id === n.id);
	if (!r) return;
	let i = J(n), a = e.uniforms[`${r.parameterPrefix}Opacity`], o = e.uniforms[`${r.parameterPrefix}BlendMode`];
	a && (a.value = i.opacity), o && (o.value = i.blendMode);
}
function Jt(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Jt(e.children, t);
				return;
			}
			e.type === "gradient" && t(e);
		}
	});
}
function Yt(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Yt(e.children, t);
				return;
			}
			e.type === "field-gradient" && t(e);
		}
	});
}
function Xt(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Xt(e.children, t);
				return;
			}
			e.type === "spot" && t(e);
		}
	});
}
function Zt(e, t) {
	e.userData.applyGradientLayerParams = t;
}
function Qt(e, t) {
	e.userData.applyGradientLayerParam = t;
}
function $t(e, t) {
	e.userData.applyFieldGradientLayerParams = t;
}
function en(e, t) {
	e.userData.applyFieldGradientLayerParam = t;
}
function tn(e, t) {
	e.userData.applySpotLayerParams = t;
}
function nn(e, t) {
	e.userData.applySpotLayerParam = t;
}
function rn(e, t) {
	e.userData.applyCompositionParams = t;
}
function an(e, t) {
	e.userData.applyLayerComposition = t;
}
function on(e) {
	return e ?? x;
}
function sn(t = x) {
	return on(t).type === "sphere" ? new e.SphereGeometry(1, 64, 32) : new e.BoxGeometry(1, 1, 1);
}
function cn(t = 1, n = 25, r = 25) {
	let i = [], a = (e, n) => {
		i.push(t * Math.sin(n) * Math.cos(e), t * Math.cos(n), t * Math.sin(n) * Math.sin(e));
	};
	for (let e = 0; e < n; e += 1) {
		let t = e / n * Math.PI * 2;
		for (let e = 0; e < r; e += 1) {
			let n = e / r * Math.PI, i = (e + 1) / r * Math.PI;
			a(t, n), a(t, i);
		}
	}
	for (let e = 1; e < r; e += 1) {
		let t = e / r * Math.PI;
		for (let e = 0; e < n; e += 1) {
			let r = e / n * Math.PI * 2, i = (e + 1) / n * Math.PI * 2;
			a(r, t), a(i, t);
		}
	}
	return new e.BufferGeometry().setAttribute("position", new e.Float32BufferAttribute(i, 3));
}
function ln(t = x) {
	if (on(t).type === "sphere") return cn();
	let n = new e.BoxGeometry(1, 1, 1), r = new e.EdgesGeometry(n);
	return n.dispose(), r;
}
function X(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function un(e, t) {
	return t === "wgsl" ? `vec3<f32>(${X(e)})` : `vec3(${X(e)})`;
}
function Z(e, t, n, r) {
	return r === "wgsl" ? `var ${e}: ${t} = ${n};` : `${t} ${e} = ${n};`;
}
function dn(e) {
	return e.filter((e) => e.enabled).reverse();
}
function fn(e) {
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
function pn(e) {
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
function mn(e) {
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
function hn(e) {
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
function gn(e) {
	let t = [];
	function n(e) {
		dn(e).forEach((e) => {
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
function _n(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function vn(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function yn(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function bn(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function xn(e) {
	return new Map(e.map((e) => [e.node.id, e]));
}
function Sn(e, t, n) {
	let { width: r, height: i } = e.layer.params, a = t === "wgsl" ? "vec4<f32>" : "vec4", o = t === "wgsl" ? "let" : "float", s = t === "wgsl" ? "let" : "float";
	return r <= 0 || i <= 0 ? `return ${a}(0.0, 0.0, 0.0, 0.0);` : `
      ${t === "wgsl" ? "let" : "vec3"} imageDirection = normalize(direction);
      ${o} imageDenom = dot(imageDirection, ${n.centerDirection});
      ${o} safeImageDenom = max(imageDenom, 0.000001);
      ${o} projectedX = dot(imageDirection, ${n.tangentX}) / safeImageDenom;
      ${o} projectedY = dot(imageDirection, ${n.tangentY}) / safeImageDenom;
      ${o} imageU = projectedX / max(${n.halfSize}.x * 2.0, 0.000001) + 0.5;
      ${o} imageV = 0.5 - projectedY / max(${n.halfSize}.y * 2.0, 0.000001);
      ${o} imageEdgeDistance = min(min(imageU, 1.0 - imageU), min(imageV, 1.0 - imageV));
      ${o} imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${X(st)});
      ${o} imageHardInside = step(${X(ot)}, imageDenom) *
        step(0.0, ${n.halfSize}.x) *
        step(0.0, ${n.halfSize}.y);
      ${o} imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      ${s} imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return ${a}(imageU, imageV, imageValid, 0.0);
    `;
}
function Cn(e, t, n) {
	let r = t.get(e.id);
	return r ? n === "wgsl" ? `effectColor = ${r.parameterName};` : `{
    vec4 imageSampleInfo = skyboxStudioImageSampleInfo${r.index}(direction);
    vec4 imageSampleColor = texture2D(imageTexture${r.index}, imageSampleInfo.xy);
    effectColor = vec4(imageSampleColor.rgb, imageSampleColor.a * imageSampleInfo.z);
  }` : `effectColor = ${n === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function wn(e) {
	return u(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${Sn(e, "wgsl", {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var Tn = u("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n"), En = u(`
  fn skyboxStudioApplyImageEditorRectOverlay(
    color: vec4<f32>,
    uv: vec2<f32>,
    valid: f32,
    activeValue: f32
  ) -> vec4<f32> {
    let activeAmount = clamp(activeValue, 0.0, 1.0);
    let rectCoverage = valid * activeAmount;
    let edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${X(st)});
    let bounds = rectCoverage * (
      1.0 - smoothstep(
        edgeWidth * ${X(it)},
        edgeWidth * ${X(at)},
        edgeDistance
      )
    );
    let rectAlpha = rectCoverage * ${X(rt)};
    let overlayAlpha = max(rectAlpha, bounds);
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), overlayAlpha),
      color.a
    );
  }
`);
function Dn(e) {
	return e.map((e) => `
        vec4 skyboxStudioImageSampleInfo${e.index}(vec3 direction) {
          ${Sn(e, "glsl", {
		centerDirection: `imageCenterDirection${e.index}`,
		halfSize: `imageHalfSize${e.index}`,
		tangentX: `imageTangentX${e.index}`,
		tangentY: `imageTangentY${e.index}`
	})}
        }
      `).join("\n");
}
function On(e) {
	return e.map((e) => `
        {
          vec4 imageEditorInfo = skyboxStudioImageSampleInfo${e.index}(direction);
          float activeAmount = clamp(imageActive${e.index}, 0.0, 1.0);
          float rectCoverage = imageEditorInfo.z * activeAmount;
          float edgeDistance = min(min(imageEditorInfo.x, 1.0 - imageEditorInfo.x), min(imageEditorInfo.y, 1.0 - imageEditorInfo.y));
          float edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${X(st)});
          float bounds = rectCoverage * (
            1.0 - smoothstep(
              edgeWidth * ${X(it)},
              edgeWidth * ${X(at)},
              edgeDistance
            )
          );
          float rectAlpha = rectCoverage * ${X(rt)};
          float overlayAlpha = max(rectAlpha, bounds);
          composedColor = mix(composedColor, vec3(1.0, 0.0, 0.0), overlayAlpha);
        }
      `).join("\n");
}
function kn(e, t) {
	return e.get(t.id) ?? G;
}
function An(e, t) {
	return Object.fromEntries(e.map((e) => [`imageTexture${e.index}`, { value: kn(t, e.layer) }]));
}
function jn(e, t, n) {
	t.forEach((t) => {
		let r = `imageTexture${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = kn(n, t.layer));
	});
}
function Mn(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? G;
	});
}
function Nn(e, t) {
	let n = t === "wgsl" ? "vec4<f32>" : "vec4", r = t === "wgsl" ? "let" : "float";
	if (e.stopCount === 0) return `effectColor = ${n}(0.0, 0.0, 0.0, 0.0);`;
	let i = Array.from({ length: Math.max(0, e.stopCount - 1) }, (n, i) => {
		let a = `${e.parameterPrefix}StopT${i}`, o = `${e.parameterPrefix}StopT${i + 1}`, s = `localT${i}`, c = `segmentMidpoint${i}`, l = `midpointT${i}`, u = `${e.parameterPrefix}StopMidpoint${i}`, d = `${s} / max(${c} * 2.0, 0.00001)`, f = `0.5 + (${s} - ${c}) / max((1.0 - ${c}) * 2.0, 0.00001)`, p = t === "wgsl" ? `select(${f}, ${d}, ${s} <= ${c})` : `(${s} <= ${c} ? ${d} : ${f})`, m = t === "wgsl" ? ": f32" : "";
		return `${i === 0 ? "if" : "else if"} (gradientT <= ${o}) {
      ${r} ${s}${m} = clamp((gradientT - ${a}) / max(${o} - ${a}, 0.00001), 0.0, 1.0);
      ${r} ${c}${m} = clamp(${u}, 0.01, 0.99);
      ${r} ${l}${m} = ${p};
      effectColor = mix(${e.parameterPrefix}StopColor${i}, ${e.parameterPrefix}StopColor${i + 1}, ${l});
    }`;
	}), a = e.stopCount - 1;
	return `{
    ${t === "wgsl" ? "let" : "vec3"} gradientAxis = normalize(${e.parameterPrefix}Axis);
    ${t === "wgsl" ? "let" : "float"} gradientT = dot(direction, gradientAxis) * 0.5 + 0.5;
    ${i.join("\n")}
    ${i.length > 0 ? "else" : ""} {
      effectColor = ${e.parameterPrefix}StopColor${a};
    }
  }`;
}
function Pn(e, t) {
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
    ${Z("fieldDirection", r, "direction", t)}
    ${i} warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      ${i} warpX = sin((direction.y * warpFrequency + 0.23) * ${X(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${X(Math.PI * 2)});
      ${i} warpY = cos((direction.z * warpFrequency + 0.17) * ${X(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${X(Math.PI * 2)});
      ${i} warpZ = sin((direction.x * warpFrequency - 0.31) * ${X(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${X(Math.PI * 2)});
      fieldDirection = normalize(direction + ${r}(warpX, warpY, warpZ) * warpScale);
    }
    ${Z("weightedColor", r, `${r}(0.0)`, t)}
    ${Z("weightSum", t === "wgsl" ? "f32" : "float", "0.0", t)}
    ${a}
    if (weightSum > 0.0) {
      effectColor = ${n}(weightedColor / weightSum, 1.0);
    } else {
      effectColor = ${n}(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
function Fn(e, t) {
	let n = t === "wgsl" ? "let" : "float", r = Array.from({ length: Math.max(0, e.stopCount - 1) }, (r, i) => {
		let a = `${e.parameterPrefix}StopT${i}`, o = `${e.parameterPrefix}StopT${i + 1}`, s = `spotLocalT${i}`, c = `spotSegmentMidpoint${i}`, l = `spotMidpointT${i}`, u = `${e.parameterPrefix}StopMidpoint${i}`, d = `${s} / max(${c} * 2.0, 0.00001)`, f = `0.5 + (${s} - ${c}) / max((1.0 - ${c}) * 2.0, 0.00001)`, p = t === "wgsl" ? `select(${f}, ${d}, ${s} <= ${c})` : `(${s} <= ${c} ? ${d} : ${f})`, m = t === "wgsl" ? ": f32" : "";
		return `${i === 0 ? "if" : "else if"} (spotT <= ${o}) {
        ${n} ${s}${m} = clamp((spotT - ${a}) / max(${o} - ${a}, 0.00001), 0.0, 1.0);
        ${n} ${c}${m} = clamp(${u}, 0.01, 0.99);
        ${n} ${l}${m} = ${p};
        effectColor = mix(${e.parameterPrefix}StopColor${i}, ${e.parameterPrefix}StopColor${i + 1}, ${l});
      }`;
	}), i = Math.max(0, e.stopCount - 1);
	return e.stopCount === 0 ? "" : `if (spotT <= 1.0) {
      ${r.join("\n")}
      ${r.length > 0 ? "else" : ""} {
        effectColor = ${e.parameterPrefix}StopColor${i};
      }
    }`;
}
function In(e, t) {
	let n = t === "wgsl" ? "vec4<f32>" : "vec4", r = t === "wgsl" ? "vec3<f32>" : "vec3", i = t === "wgsl" ? "let" : "float", a = `${e.parameterPrefix}Mode > 0.5`, o = Fn(e, t);
	return `{
    ${t === "wgsl" ? "let" : "vec3"} spotCenter = normalize(${e.parameterPrefix}CenterDirection);
    ${i} spotDot = clamp(dot(normalize(direction), spotCenter), -1.0, 1.0);
    ${i} spotT = acos(spotDot) / max(${e.parameterPrefix}Radius, 0.0001);
    if (${a}) {
      ${o || `effectColor = ${n}(0.0, 0.0, 0.0, 0.0);`}
    } else {
      ${t === "wgsl" ? "let" : "vec3"} spotTangentX = normalize(cross(${r}(0.0, 1.0, 0.0), spotCenter));
      ${t === "wgsl" ? "let" : "vec3"} spotTangentY = normalize(cross(spotCenter, spotTangentX));
      ${i} spotDenom = max(dot(normalize(direction), spotCenter), 0.000001);
      ${i} spotLocalX = dot(normalize(direction), spotTangentX) / spotDenom / max(${e.parameterPrefix}Radius, 0.0001);
      ${i} spotLocalY = dot(normalize(direction), spotTangentY) / spotDenom / max(${e.parameterPrefix}Radius, 0.0001);
      ${i} spotD = length(${t === "wgsl" ? "vec2<f32>" : "vec2"}(spotLocalX, spotLocalY));

      ${i} spotCore = pow(clamp(1.0 - spotD / ${e.parameterPrefix}CoreRadius, 0.0, 1.0), ${e.parameterPrefix}CoreSoftness);
      ${i} spotGlow = pow(clamp(1.0 - spotD / ${e.parameterPrefix}GlowSize, 0.0, 1.0), 2.0) * ${e.parameterPrefix}GlowStrength;
      ${i} spotGlare = pow(clamp(1.0 - spotD / ${e.parameterPrefix}GlareSize, 0.0, 1.0), 1.15) * ${e.parameterPrefix}GlareStrength;
      ${i} spotMonoLight = (spotCore + spotGlow + spotGlare) * ${e.parameterPrefix}Brightness;
      ${Z("spotColor", r, `${e.parameterPrefix}LightColor * spotMonoLight + ${r}(max(spotMonoLight - 1.0, 0.0))`, t)}

      ${i} spotHaloInner = max(${e.parameterPrefix}HaloInnerWidth, 0.0001);
      ${i} spotHaloOuter = max(${e.parameterPrefix}HaloOuterWidth, 0.0001);
      ${i} spotHaloDelta = spotD - ${e.parameterPrefix}HaloRadius;
      ${i} spotHaloWidth = ${t === "wgsl" ? "select(spotHaloOuter, spotHaloInner, spotHaloDelta < 0.0)" : "(spotHaloDelta < 0.0 ? spotHaloInner : spotHaloOuter)"};
      ${i} spotHaloEnvelope = exp(-pow(spotHaloDelta / spotHaloWidth, 2.0));
      ${i} spotHaloT = clamp((spotD - (${e.parameterPrefix}HaloRadius - spotHaloInner)) / (spotHaloInner + spotHaloOuter), 0.0, 1.0);
      ${Z("spotSpectrum", r, `${r}(1.0, 0.12, 0.05)`, t)}
      spotSpectrum = mix(spotSpectrum, ${r}(1.0, 0.55, 0.10), smoothstep(0.00, 0.28, spotHaloT));
      spotSpectrum = mix(spotSpectrum, ${r}(1.0, 0.93, 0.60), smoothstep(0.22, 0.45, spotHaloT));
      spotSpectrum = mix(spotSpectrum, ${r}(1.0), smoothstep(0.42, 0.60, spotHaloT));
      spotSpectrum = mix(spotSpectrum, ${r}(0.55, 0.80, 1.0), smoothstep(0.62, 0.85, spotHaloT));
      spotSpectrum = mix(spotSpectrum, ${r}(0.35, 0.50, 1.0), smoothstep(0.85, 1.00, spotHaloT));
      ${t === "wgsl" ? "let" : "vec3"} spotHaloLayerColor = mix(${r}(1.0), spotSpectrum, ${e.parameterPrefix}Dispersion);
      ${t === "wgsl" ? "let" : "vec3"} spotHaloTinted = spotHaloLayerColor * mix(${r}(1.0), ${e.parameterPrefix}LightColor, 0.82);
      ${t === "wgsl" ? "let" : "vec3"} spotHaloColor = mix(${e.parameterPrefix}LightColor, spotHaloTinted, 0.82);
      ${i} spotHaloLight = spotHaloEnvelope * ${e.parameterPrefix}HaloStrength * ${e.parameterPrefix}Brightness;
      spotColor += spotHaloColor * spotHaloLight + ${r}(max(spotHaloLight - 1.2, 0.0) * 0.22);

      ${i} spotAxisDistance = abs(spotLocalY);
      ${i} spotDogX = abs(spotLocalX);
      ${i} spotDogBody = exp(-pow((spotDogX - ${e.parameterPrefix}HaloRadius) / max(${e.parameterPrefix}DogSpread, 0.0001), 2.0)) *
        exp(-pow(spotAxisDistance / max(${e.parameterPrefix}DogSpread * 0.72, 0.0001), 2.0));
      ${i} spotDogTail = smoothstep(${e.parameterPrefix}HaloRadius, ${e.parameterPrefix}HaloRadius + max(${e.parameterPrefix}DogStretch, 0.0001), spotDogX) *
        (1.0 - smoothstep(${e.parameterPrefix}HaloRadius + max(${e.parameterPrefix}DogStretch, 0.0001), ${e.parameterPrefix}HaloRadius + max(${e.parameterPrefix}DogStretch * 2.2, 0.0001), spotDogX)) *
        exp(-pow(spotAxisDistance / max(${e.parameterPrefix}DogSpread * 0.9, 0.0001), 2.0));
      ${i} spotDogT = clamp((spotDogX - (${e.parameterPrefix}HaloRadius - ${e.parameterPrefix}DogSpread * 1.4)) / max(${e.parameterPrefix}DogSpread * 3.5, 0.0001), 0.0, 1.0);
      ${Z("spotDogSpectrum", r, `${r}(1.0, 0.12, 0.05)`, t)}
      spotDogSpectrum = mix(spotDogSpectrum, ${r}(1.0, 0.55, 0.10), smoothstep(0.00, 0.28, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, ${r}(1.0, 0.93, 0.60), smoothstep(0.22, 0.45, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, ${r}(1.0), smoothstep(0.42, 0.60, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, ${r}(0.55, 0.80, 1.0), smoothstep(0.62, 0.85, spotDogT));
      spotDogSpectrum = mix(spotDogSpectrum, ${r}(0.35, 0.50, 1.0), smoothstep(0.85, 1.00, spotDogT));
      ${t === "wgsl" ? "let" : "vec3"} spotDogLayerColor = mix(${r}(1.0), spotDogSpectrum, ${e.parameterPrefix}Dispersion);
      ${t === "wgsl" ? "let" : "vec3"} spotDogTinted = spotDogLayerColor * mix(${r}(1.0), ${e.parameterPrefix}LightColor, 0.82);
      ${t === "wgsl" ? "let" : "vec3"} spotDogColor = mix(${e.parameterPrefix}LightColor, spotDogTinted, 0.82);
      ${i} spotDogLight = (spotDogBody + spotDogTail * 0.28) * ${e.parameterPrefix}DogStrength * ${e.parameterPrefix}Brightness;
      spotColor += spotDogColor * spotDogLight + ${r}(max(spotDogLight - 1.1, 0.0) * 0.18);

      ${i} spotAlpha = clamp(max(max(spotColor.r, spotColor.g), spotColor.b), 0.0, 1.0);
      effectColor = ${n}(spotColor / max(spotAlpha, 0.00001), spotAlpha);
    }
  }`;
}
function Ln(e, t, n, r, i, a) {
	if (e.type === "gradient") {
		let r = n.get(e.id);
		return r ? Nn(r, t) : `effectColor = ${t === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
	}
	if (e.type === "field-gradient") {
		let n = r.get(e.id);
		return n ? Pn(n, t) : `effectColor = ${t === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
	}
	if (e.type === "spot") {
		let n = a.get(e.id);
		return n ? In(n, t) : `effectColor = ${t === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
	}
	return Cn(e, i, t);
}
function Q(e, t, n, r) {
	return r === "wgsl" ? `select(${n}, ${t}, ${e})` : `((${e}) ? ${t} : ${n})`;
}
function Rn(e, t) {
	if (t === "glsl") switch (e) {
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
	let n = un(1, t), r = un(.5, t), i = un(0, t), a = "effectColor.rgb", o = "composedColor";
	switch (e) {
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
function zn(e) {
	if (e === "glsl") return "";
	let t = e === "wgsl" ? "vec3<f32>" : "vec3";
	return `${e === "wgsl" ? "let" : "vec3"} softLightD = ${Q(`composedColor <= ${t}(0.25)`, `((16.0 * composedColor - ${t}(12.0)) * composedColor + ${t}(4.0)) * composedColor`, "sqrt(composedColor)", e)};`;
}
function Bn(e, t) {
	let n = Et(t);
	return `${e} >= ${X(n - .5)} && ${e} < ${X(n + .5)}`;
}
function Vn(e, t) {
	let n = t === "wgsl" ? "vec3<f32>" : "vec3", r = [
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
	].map((n, r) => `${r === 0 ? "if" : "else if"} (${Bn(e, n)}) {
          blendedColor = ${Rn(n, t)};
        }`).join("\n");
	return `${zn(t)}
        ${Z("blendedColor", n, "effectColor.rgb", t)}
        ${r}
        blendedColor = clamp(blendedColor, ${n}(0.0), ${n}(1.0));`;
}
function Hn(e, t, n, r, i, a, o, s = 0) {
	let c = t === "wgsl" ? "vec3<f32>" : "vec3", l = t === "wgsl" ? "vec4<f32>" : "vec4";
	return dn(e).map((e, u) => {
		let d = e.type === "group" ? `effectColor = ${l}(${`groupColor${s}_${u}`}, 1.0);` : Ln(e, t, n, r, i, a), f = `groupColor${s}_${u}`, p = o.get(e.id), m = p ? `${p.parameterPrefix}Opacity` : X(e.opacity / 100), h = p ? `${p.parameterPrefix}BlendMode` : X(Et(e.blendMode));
		return `{
        ${e.type === "group" ? `${Z(f, c, `${c}(0.0)`, t)}
        {
          ${Z("previousComposedColor", c, "composedColor", t)}
          composedColor = ${c}(0.0);
          ${Hn(e.children, t, n, r, i, a, o, s + 1)}
          ${f} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${Z("effectColor", l, `${l}(0.0)`, t)}
        ${d}
        ${t === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${m}, 0.0, 1.0);
        ${Vn(h, t)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          ${c}(0.0),
          ${c}(1.0)
        );
      }`;
	}).join("\n");
}
function Un(e, t, n, r, i, a) {
	let o = _n(t), s = vn(n), c = yn(r), l = bn(i), d = xn(a), f = Hn(e.nodes, "wgsl", o, s, c, l, d), p = t.flatMap((e) => [`,
      ${e.parameterPrefix}Axis: vec3<f32>`, ...Array.from({ length: e.stopCount }, (t, n) => [
		`,
      ${e.parameterPrefix}StopColor${n}: vec4<f32>`,
		`,
      ${e.parameterPrefix}StopMidpoint${n}: f32`,
		`,
      ${e.parameterPrefix}StopT${n}: f32`
	]).flat()]).join(""), m = n.flatMap((e) => [
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
	]).join(""), h = r.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""), g = a.flatMap((e) => [`,
      ${e.parameterPrefix}Opacity: f32`, `,
      ${e.parameterPrefix}BlendMode: f32`]).join("");
	return u(`
    fn skyboxStudioSample(
      direction: vec3<f32>${p}${m}${h}${i.flatMap((e) => [
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
	]).join("")}${g}
    ) -> vec4<f32> {
      var composedColor = vec3<f32>(0.0);
      ${f}
      return vec4<f32>(composedColor, 1.0);
    }
  `);
}
function Wn(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	return {
		sampleData: i,
		sampleNodes: Object.fromEntries(e.map((e) => {
			let a = r[e.index], o = wn(e)({
				direction: t,
				imageCenterDirection: a.centerDirection,
				imageHalfSize: a.halfSize,
				imageTangentX: a.tangentX,
				imageTangentY: a.tangentY
			}), c = l(o.x, o.y), u = s(kn(n, e.layer), c).setName(`imageTexture${e.index}`);
			u.getUniformHash = () => `skybox-image-texture:${e.layer.id}`;
			let d = Tn({
				color: u,
				valid: o.z
			});
			return i.set(e.layer.id, {
				sampleInfo: o,
				sampleNode: d,
				textureNode: u
			}), [e.parameterName, d];
		}))
	};
}
function Gn(s, c, u, d) {
	let f = new t(), p = fn(s.nodes), m = pn(s.nodes), h = mn(s.nodes), g = hn(s.nodes), _ = gn(s.nodes), v = Un(s, p, m, h, g, _), y = Ot(p), b = Mt(m), x = Lt(g), S = Vt(_), C = d ? ft(h, c) : null, w = vt(h), ee = n(() => {
		let e = i;
		return e.z.assign(e.w), e;
	})();
	f.side = e.BackSide, f.depthTest = !1, f.depthWrite = !1, f.vertexNode = ee;
	let T = a(o.sub(r)), E = Wn(h, T, u, w), D = v({
		direction: T,
		...Object.fromEntries(p.flatMap((e) => {
			let t = y[e.index];
			return [[`${e.parameterPrefix}Axis`, t.axis], ...Array.from({ length: e.stopCount }, (n, r) => [
				[`${e.parameterPrefix}StopColor${r}`, t.stops[r].color],
				[`${e.parameterPrefix}StopMidpoint${r}`, t.stops[r].midpoint],
				[`${e.parameterPrefix}StopT${r}`, t.stops[r].t]
			]).flat()];
		})),
		...Object.fromEntries(m.flatMap((e) => {
			let t = b[e.index];
			return [
				[`${e.parameterPrefix}Amplitude`, t.amplitude],
				[`${e.parameterPrefix}Frequency`, t.frequency],
				[`${e.parameterPrefix}Mode`, t.mode],
				[`${e.parameterPrefix}Power`, t.power],
				...Array.from({ length: e.anchorCount }, (n, r) => [[`${e.parameterPrefix}AnchorDirection${r}`, t.anchors[r].direction], [`${e.parameterPrefix}AnchorColor${r}`, t.anchors[r].color]]).flat()
			];
		})),
		...Object.fromEntries(g.flatMap((e) => {
			let t = x[e.index];
			return [
				[`${e.parameterPrefix}CenterDirection`, t.centerDirection],
				[`${e.parameterPrefix}Radius`, t.radius],
				[`${e.parameterPrefix}Mode`, t.mode],
				[`${e.parameterPrefix}LightColor`, t.lightColor],
				[`${e.parameterPrefix}Brightness`, t.brightness],
				[`${e.parameterPrefix}CoreRadius`, t.coreRadius],
				[`${e.parameterPrefix}CoreSoftness`, t.coreSoftness],
				[`${e.parameterPrefix}Dispersion`, t.dispersion],
				[`${e.parameterPrefix}DogSpread`, t.dogSpread],
				[`${e.parameterPrefix}DogStrength`, t.dogStrength],
				[`${e.parameterPrefix}DogStretch`, t.dogStretch],
				[`${e.parameterPrefix}GlareSize`, t.glareSize],
				[`${e.parameterPrefix}GlareStrength`, t.glareStrength],
				[`${e.parameterPrefix}GlowSize`, t.glowSize],
				[`${e.parameterPrefix}GlowStrength`, t.glowStrength],
				[`${e.parameterPrefix}HaloInnerWidth`, t.haloInnerWidth],
				[`${e.parameterPrefix}HaloOuterWidth`, t.haloOuterWidth],
				[`${e.parameterPrefix}HaloRadius`, t.haloRadius],
				[`${e.parameterPrefix}HaloStrength`, t.haloStrength],
				...Array.from({ length: e.stopCount }, (n, r) => [
					[`${e.parameterPrefix}StopColor${r}`, t.stops[r].color],
					[`${e.parameterPrefix}StopMidpoint${r}`, t.stops[r].midpoint],
					[`${e.parameterPrefix}StopT${r}`, t.stops[r].t]
				]).flat()
			];
		})),
		...E.sampleNodes,
		...Object.fromEntries(_.flatMap((e) => {
			let t = S[e.index];
			return [[`${e.parameterPrefix}Opacity`, t.opacity], [`${e.parameterPrefix}BlendMode`, t.blendMode]];
		}))
	});
	return C && h.forEach((e) => {
		let t = E.sampleData.get(e.layer.id)?.sampleInfo;
		t && (D = En({
			color: D,
			activeValue: C[e.index].active,
			uv: l(t.x, t.y),
			valid: t.z
		}));
	}), f.colorNode = D, C && gt(f, (e) => pt(C, e)), Zt(f, (e) => Jt(e.nodes, (e) => kt(y, e))), Qt(f, (e) => kt(y, e)), $t(f, (e) => Yt(e.nodes, (e) => Nt(b, e))), en(f, (e) => Nt(b, e)), tn(f, (e) => Xt(e.nodes, (e) => Rt(x, e))), nn(f, (e) => Rt(x, e)), rn(f, (e) => Ut(S, e)), an(f, (e) => Wt(S, e)), St(f, (e, t) => yt(w, e, t)), f.userData.applyImageTextures = (e) => Mn(E.sampleData, e), f.userData.debugImageTextureSlots = Object.fromEntries(Array.from(E.sampleData.entries()).map(([e, t]) => [e, t.textureNode])), f;
}
var Kn = u("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.z, normalizedDirection.x);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n");
function qn(c) {
	let l = new t(), u = n(() => {
		let e = i;
		return e.z.assign(e.w), e;
	})(), d = a(o.sub(r));
	return l.side = e.BackSide, l.depthTest = !1, l.depthWrite = !1, l.vertexNode = u, l.colorNode = s(c, Kn({ direction: d })), l;
}
function Jn(t, n, r, i) {
	let a = fn(t.nodes), o = pn(t.nodes), s = mn(t.nodes), c = hn(t.nodes), l = gn(t.nodes), u = _n(a), d = vn(o), f = yn(s), p = bn(c), m = xn(l), h = Hn(t.nodes, "glsl", u, d, f, p, m), g = new e.ShaderMaterial({
		uniforms: {
			...At(a),
			...Pt(o),
			...zt(c),
			...Gt(l),
			...i ? mt(s, n) : {},
			...bt(s),
			...An(s, r)
		},
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: `
      precision highp float;
      ${a.map((e) => `uniform vec3 ${e.parameterPrefix}Axis;
      ${Array.from({ length: e.stopCount }, (t, n) => `uniform vec4 ${e.parameterPrefix}StopColor${n};
      uniform float ${e.parameterPrefix}StopMidpoint${n};
      uniform float ${e.parameterPrefix}StopT${n};`).join("\n")}`).join("\n")}
      ${o.map((e) => `uniform float ${e.parameterPrefix}Amplitude;
      uniform float ${e.parameterPrefix}Frequency;
      uniform float ${e.parameterPrefix}Mode;
      uniform float ${e.parameterPrefix}Power;
      ${Array.from({ length: e.anchorCount }, (t, n) => `uniform vec3 ${e.parameterPrefix}AnchorDirection${n};
      uniform vec3 ${e.parameterPrefix}AnchorColor${n};`).join("\n")}`).join("\n")}
      ${c.map((e) => `uniform vec3 ${e.parameterPrefix}CenterDirection;
      uniform float ${e.parameterPrefix}Radius;
      uniform float ${e.parameterPrefix}Mode;
      uniform vec3 ${e.parameterPrefix}LightColor;
      uniform float ${e.parameterPrefix}Brightness;
      uniform float ${e.parameterPrefix}CoreRadius;
      uniform float ${e.parameterPrefix}CoreSoftness;
      uniform float ${e.parameterPrefix}Dispersion;
      uniform float ${e.parameterPrefix}DogSpread;
      uniform float ${e.parameterPrefix}DogStrength;
      uniform float ${e.parameterPrefix}DogStretch;
      uniform float ${e.parameterPrefix}GlareSize;
      uniform float ${e.parameterPrefix}GlareStrength;
      uniform float ${e.parameterPrefix}GlowSize;
      uniform float ${e.parameterPrefix}GlowStrength;
      uniform float ${e.parameterPrefix}HaloInnerWidth;
      uniform float ${e.parameterPrefix}HaloOuterWidth;
      uniform float ${e.parameterPrefix}HaloRadius;
      uniform float ${e.parameterPrefix}HaloStrength;
      ${Array.from({ length: e.stopCount }, (t, n) => `uniform vec4 ${e.parameterPrefix}StopColor${n};
      uniform float ${e.parameterPrefix}StopMidpoint${n};
      uniform float ${e.parameterPrefix}StopT${n};`).join("\n")}`).join("\n")}
      ${s.map((e) => `uniform sampler2D imageTexture${e.index};
      uniform vec3 imageCenterDirection${e.index};
      uniform vec3 imageTangentX${e.index};
      uniform vec3 imageTangentY${e.index};
      uniform vec2 imageHalfSize${e.index};${i ? `
      uniform float imageActive${e.index};` : ""}`).join("\n")}
      ${l.map((e) => `uniform float ${e.parameterPrefix}Opacity;
      uniform float ${e.parameterPrefix}BlendMode;`).join("\n")}
      varying vec3 vDirection;
      ${Dn(s)}

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
        ${h}
        ${i ? On(s) : ""}
        gl_FragColor = vec4(composedColor, 1.0);
      }
    `
	});
	return s.length > 0 && (g.extensions.derivatives = !0), i && gt(g, (e) => ht(g, s, e)), Zt(g, (e) => Jt(e.nodes, (e) => jt(g, e, a))), Qt(g, (e) => jt(g, e, a)), $t(g, (e) => Yt(e.nodes, (e) => Ft(g, e, o))), en(g, (e) => Ft(g, e, o)), tn(g, (e) => Xt(e.nodes, (e) => Bt(g, e, c))), nn(g, (e) => Bt(g, e, c)), rn(g, (e) => Kt(g, l, e)), an(g, (e) => qt(g, l, e)), St(g, (e, t) => xt(g, s, e, t)), g.userData.applyImageTextures = (e) => jn(g, s, e), g;
}
function Yn(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function Xn(t, n = {}) {
	let r = tt(t, n), i = Yn(r.width, r.height), a = i.getContext("2d");
	if (!a || !("putImageData" in a)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	a.putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
	let o = new e.CanvasTexture(i);
	return o.mapping = e.EquirectangularReflectionMapping, o.wrapS = e.RepeatWrapping, o.wrapT = e.ClampToEdgeWrapping, o.colorSpace = e.SRGBColorSpace, o.flipY = !1, o.needsUpdate = !0, o;
}
function Zn(t) {
	return new e.ShaderMaterial({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		uniforms: { skyboxTexture: { value: t } },
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: "\n      precision highp float;\n      uniform sampler2D skyboxTexture;\n      varying vec3 vDirection;\n\n      const float PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.z, normalizedDirection.x);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);\n      }\n\n      void main() {\n        vec3 direction = normalize(vDirection);\n        vec4 sampledColor = texture2D(skyboxTexture, directionToEquirectUv(direction));\n        gl_FragColor = vec4(sampledColor.rgb, sampledColor.a);\n      }\n    "
	});
}
function Qn(e, t) {
	return $n(t) ? qn(e) : Zn(e);
}
function $n(e) {
	return !!(e && "isWebGPURenderer" in e && e.isWebGPURenderer);
}
function er(e, t) {
	return e === "auto" ? $n(t) ? "live-webgpu" : "live-webgl" : e;
}
function tr(e, t, n) {
	let r = (e) => e.type === "group" ? {
		children: e.children.map(r),
		enabled: e.enabled,
		id: e.id,
		type: e.type
	} : e.type === "gradient" ? {
		enabled: e.enabled,
		id: e.id,
		mode: e.params.mode,
		stopCount: e.params.stops.length,
		type: e.type
	} : e.type === "image" ? {
		enabled: e.enabled,
		hasPlacement: !!e.params.placement,
		hasSrc: !!e.params.src,
		height: e.params.height,
		id: e.id,
		type: e.type,
		width: e.params.width
	} : e.type === "spot" ? {
		enabled: e.enabled,
		id: e.id,
		stopCount: e.params.stops.length,
		type: e.type
	} : {
		anchorCount: e.params.anchors.length,
		enabled: e.enabled,
		id: e.id,
		type: e.type
	};
	return JSON.stringify({
		editorPresentationEnabled: n,
		geometry: e.geometry?.type ?? x.type,
		nodes: e.nodes.map(r),
		renderMode: t
	});
}
function $(e, t) {
	for (let n of e) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = $(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
var nr = class extends e.Mesh {
	#e = {};
	#t = { ...ct };
	#n = !1;
	#r = x;
	#i = /* @__PURE__ */ new Map();
	#a = /* @__PURE__ */ new Map();
	#o = nt;
	#s = null;
	#c = null;
	#l = "auto";
	#u = null;
	constructor() {
		super(sn(x), Gn(nt, ct, /* @__PURE__ */ new Map(), !1)), this.frustumCulled = !1, this.renderOrder = -1;
	}
	fromManifest(e) {
		return this.#o = S(e), this.applyGeometry(this.#o.geometry ?? x), this;
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
		return this.#u = e, this;
	}
	setRenderMode(e) {
		return this.#l = e, this;
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
		return this.#s = null, this.setManifest(this.#o), this;
	}
	otherOverridingSetup() {
		return this;
	}
	load(e) {
		return e && (this.#u = e), this.setManifest(this.#o), this;
	}
	applyGeometry(e) {
		let t = on(e);
		if (this.#r.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#r = t, this.geometry = sn(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#c?.dispose(), this.#c = null;
	}
	replaceMaterial(e, t = null) {
		let n = this.material;
		this.material = e, e.userData.applyEditorImageState?.(this.#t), this.#i.forEach((t, n) => {
			e.userData.applyImageLayerPlacement?.(n, t);
		}), n.dispose(), this.disposeOwnedTexture(), this.#c = t;
	}
	applyLiveManifestUniformUpdates() {
		this.material.userData.applyCompositionParams?.(this.#o), this.material.userData.applyGradientLayerParams?.(this.#o), this.material.userData.applyFieldGradientLayerParams?.(this.#o), this.material.userData.applySpotLayerParams?.(this.#o), this.material.userData.applyImageTextures?.(this.#a), this.material.userData.applyEditorImageState?.(this.#t), this.#i.forEach((e, t) => {
			this.material.userData.applyImageLayerPlacement?.(t, e);
		});
	}
	setEditorPresentationEnabled(e) {
		return this.#n === e ? this : (this.#n = e, this.#s = null, this.setManifest(this.#o), this);
	}
	setEditorImageState(e) {
		let t = {
			...this.#t,
			...e
		};
		return t.hoveredImageLayerId === this.#t.hoveredImageLayerId && t.selectedImageLayerId === this.#t.selectedImageLayerId ? this : (this.#t = t, this.material.userData.applyEditorImageState?.(this.#t), this);
	}
	setHoveredImageLayerId(e) {
		return this.setEditorImageState({ hoveredImageLayerId: e }), this;
	}
	setImageLayerPlacement(e, t) {
		return this.updateImageLayerPlacement(e, t);
	}
	updateImageLayerPlacement(e, t) {
		let n = $(this.#o.nodes, e);
		return n?.type === "image" && (n.params = {
			...n.params,
			placement: t
		}), this.#i.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this;
	}
	updateLayerComposition(e, t) {
		let n = $(this.#o.nodes, e);
		return n ? (t.blendMode !== void 0 && (n.blendMode = t.blendMode), t.opacity !== void 0 && (n.opacity = t.opacity), this.material.userData.applyLayerComposition?.(n), this) : this;
	}
	updateGradientLayer(e, t) {
		let n = $(this.#o.nodes, e);
		return n?.type === "gradient" ? (n.params = t, this.material.userData.applyGradientLayerParam?.(n), this) : this;
	}
	updateFieldGradientLayer(e, t) {
		let n = $(this.#o.nodes, e);
		return n?.type === "field-gradient" ? (n.params = t, this.material.userData.applyFieldGradientLayerParam?.(n), this) : this;
	}
	updateSpotLayer(e, t) {
		let n = $(this.#o.nodes, e);
		return n?.type === "spot" ? (n.params = t, this.material.userData.applySpotLayerParam?.(n), this) : this;
	}
	setManifest(e) {
		let t = S(e);
		this.#o = t, this.applyGeometry(this.#o.geometry ?? this.#r);
		let n = er(this.#l, this.#u), r = tr(this.#o, n, this.#n);
		if (this.#s === r && (n === "live-webgpu" || n === "live-webgl")) return this.applyLiveManifestUniformUpdates(), this;
		if (n === "live-webgpu") this.replaceMaterial(Gn(this.#o, this.#t, this.#a, this.#n));
		else if (n === "live-webgl") this.replaceMaterial(Jn(this.#o, this.#t, this.#a, this.#n));
		else {
			let e = Xn(this.#o, this.#e);
			this.replaceMaterial(Qn(e, this.#u), e);
		}
		return this.#s = r, this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(Qn(e, this.#u)), this.#s = null, this;
	}
	invalidateBakeCache() {
		return et(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture();
	}
};
//#endregion
export { Ye as DEFAULT_BAKE_WIDTH, ge as DEFAULT_SPOT_BASE_ANGULAR_RADIUS, E as IMAGE_PLACEMENT_ELEVATION_LIMIT, nr as Skybox, tt as bakeSkyboxImageData, _ as blendChannel, d as clamp, v as compositeBlendChannel, y as compositeOver, N as createAngularDecalPlacement, $e as createBakeCacheKey, Xn as createBakedSkyboxTexture, ye as createDefaultSpotParams, se as createImagePlacementTangents, sn as createSkyboxGeometry, ln as createSkyboxWireGeometry, le as directionFromPosition, Ne as equirectPointToDirection, Pe as equirectUvToDirection, Je as evaluateSkyboxDirection, et as invalidateBakeCache, p as linearChannelToSrgb, h as linearRgbToSrgbBytes, S as migrateManifestToV2, P as normalizeImagePlacement, I as normalizeSpotParams, M as normalizeVector, m as parseHexColor, ue as placementFromPosition, me as placementFromRotation, fe as placementFromScale, ce as positionFromPlacement, be as positionFromSpot, he as projectDirectionToImageUv, Se as radiusScaleFromSpot, Qe as resolveBakeOptions, pe as rotationFromPlacement, de as scaleFromPlacement, we as spotContainsDirection, xe as spotFromPosition, Ce as spotFromRadiusScale, f as srgbChannelToLinear };
