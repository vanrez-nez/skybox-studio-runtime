import * as e from "three";
import { MeshBasicNodeMaterial as t, NodeMaterial as n } from "three/webgpu";
import { Fn as r, If as i, Loop as a, PI as o, acos as s, atan as c, attribute as l, cameraPosition as u, clamp as d, cos as f, dot as p, exp as m, float as h, floor as g, int as _, max as v, min as y, mix as b, mod as x, modelViewProjection as S, mx_fractal_noise_float as C, normalize as w, positionGeometry as T, positionWorld as E, pow as D, select as O, sin as k, smoothstep as A, step as j, texture as M, uniform as N, uniformArray as ee, uniformTexture as P, uv as te, varyingProperty as ne, vec2 as F, vec3 as I, vec4 as re, wgslFn as ie } from "three/tsl";
//#region math.ts
function L(e, t = 0, n = 1) {
	return Math.min(n, Math.max(t, e));
}
function R(e) {
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
function z(e) {
	let t = L(e);
	return t <= .0031308 ? t * 12.92 : 1.055 * t ** (1 / 2.4) - .055;
}
function ae(e) {
	let t = e.trim().replace(/^#/, ""), n = t.length === 3 ? t.split("").map((e) => `${e}${e}`).join("") : t;
	return /^[0-9a-fA-F]{6}$/.test(n) ? [
		0,
		2,
		4
	].map((e) => R(Number.parseInt(n.slice(e, e + 2), 16) / 255)) : [
		1,
		1,
		1
	];
}
function oe(e) {
	return e.map((e) => Math.round(z(e) * 255));
}
function se(e) {
	return e <= .25 ? ((16 * e - 12) * e + 4) * e : Math.sqrt(e);
}
function ce(e, t, n) {
	let r = L(t), i = L(n);
	switch (e) {
		case "multiply": return r * i;
		case "screen": return r + i - r * i;
		case "overlay": return r <= .5 ? 2 * r * i : 1 - 2 * (1 - r) * (1 - i);
		case "darken": return Math.min(r, i);
		case "lighten": return Math.max(r, i);
		case "color-dodge": return r === 0 ? 0 : i === 1 ? 1 : Math.min(1, r / (1 - i));
		case "color-burn": return r === 1 ? 1 : i === 0 ? 0 : 1 - Math.min(1, (1 - r) / i);
		case "hard-light": return i <= .5 ? 2 * r * i : r + (2 * i - 1) - r * (2 * i - 1);
		case "soft-light": return i <= .5 ? r - (1 - 2 * i) * r * (1 - r) : r + (2 * i - 1) * (se(r) - r);
		case "difference": return Math.abs(r - i);
		case "exclusion": return r + i - 2 * r * i;
		default: return i;
	}
}
function le(e, t, n, r) {
	let i = L(t), a = L(r);
	return L(L(ce(e, i, n)) * a + i * (1 - a));
}
function ue(e, t, n, r) {
	return [
		le(r, e[0], t[0], n),
		le(r, e[1], t[1], n),
		le(r, e[2], t[2], n)
	];
}
function de(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n += 1) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return (t >>> 0).toString(36);
}
//#endregion
//#region manifest.ts
var B = { type: "box" };
function fe(e) {
	return e.version === 2 ? {
		...e,
		geometry: e.geometry ?? B
	} : {
		composition: e.composition,
		geometry: B,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	};
}
//#endregion
//#region image-placement-transform.ts
var pe = [
	0,
	1,
	0
], me = [
	0,
	0,
	-1
], he = [
	1,
	0,
	0
], ge = [
	0,
	1,
	0
], _e = 89.9;
function ve(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function ye(e) {
	return e * Math.PI / 180;
}
function be(e) {
	return e * 180 / Math.PI;
}
function xe(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Se(e) {
	return (Math.round(e) % 360 + 360) % 360;
}
function Ce(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function we(e, t) {
	return [
		e[0] - t[0],
		e[1] - t[1],
		e[2] - t[2]
	];
}
function Te(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function Ee(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function De(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function V(e, t = me) {
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
function Oe(e, t, n) {
	let r = ye(n), i = Math.cos(r), a = Math.sin(r), o = V(t);
	return V(Ee(Ee(Te(e, i), Te(De(o, e), a)), Te(o, Ce(o, e) * (1 - i))), e);
}
function ke(e, t = pe, n = 0) {
	let r = V(e), i = we(V(t, pe), Te(r, Ce(V(t, pe), r)));
	if (Math.hypot(i[0], i[1], i[2]) < 1e-6) {
		let e = Math.abs(r[1]) > .98 ? [
			0,
			0,
			1
		] : pe;
		i = we(e, Te(r, Ce(e, r)));
	}
	return i = V(i, ge), {
		tangentX: Oe(V(De(r, i), he), r, n),
		tangentY: Oe(i, r, n)
	};
}
function Ae({ angularHeight: e, angularWidth: t, baseAngularHeight: n, baseAngularWidth: r, centerDirection: i, rotation: a = 0, upDirection: o = pe }) {
	let s = V(i), c = Se(a), { tangentX: l, tangentY: u } = ke(s, o, c), d = Math.max(1e-4, e), f = Math.max(1e-4, t);
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
function je(e) {
	let t = e, n = V(t?.centerDirection ?? t?.normal ?? t?.center, me), r = Array.isArray(t?.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, i = typeof t?.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t?.width ?? .4) / (2 * r)), a = typeof t?.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t?.height ?? .3) / (2 * r));
	return Ae({
		angularHeight: a,
		angularWidth: i,
		baseAngularHeight: typeof t?.baseAngularHeight == "number" ? t.baseAngularHeight : a,
		baseAngularWidth: typeof t?.baseAngularWidth == "number" ? t.baseAngularWidth : i,
		centerDirection: n,
		rotation: typeof t?.rotation == "number" ? t.rotation : 0
	});
}
function Me(e) {
	let t = V(e.centerDirection);
	return {
		x: xe(be(Math.atan2(t[0], -t[2]))),
		y: be(Math.asin(ve(t[1], -1, 1)))
	};
}
function Ne(e) {
	let t = ye(e.x), n = ye(ve(e.y, -89.9, _e)), r = Math.cos(n);
	return V([
		Math.sin(t) * r,
		Math.sin(n),
		-Math.cos(t) * r
	]);
}
function Pe(e, t, n) {
	let r = je(e);
	return Ae({
		angularHeight: r.angularHeight,
		angularWidth: r.angularWidth,
		baseAngularHeight: r.baseAngularHeight,
		baseAngularWidth: r.baseAngularWidth,
		centerDirection: Ne(t),
		rotation: r.rotation,
		upDirection: n?.upDirection
	});
}
function Fe(e) {
	let t = je(e);
	return {
		x: t.angularWidth / t.baseAngularWidth,
		y: t.angularHeight / t.baseAngularHeight
	};
}
function Ie(e, t) {
	let n = je(e);
	return {
		...n,
		angularHeight: Math.max(1e-4, n.baseAngularHeight * Math.max(1e-4, t.y)),
		angularWidth: Math.max(1e-4, n.baseAngularWidth * Math.max(1e-4, t.x))
	};
}
function Le(e) {
	return je(e).rotation;
}
function Re(e, t) {
	let n = je(e);
	return Ae({
		angularHeight: n.angularHeight,
		angularWidth: n.angularWidth,
		baseAngularHeight: n.baseAngularHeight,
		baseAngularWidth: n.baseAngularWidth,
		centerDirection: n.centerDirection,
		rotation: t
	});
}
function ze(e, t) {
	let n = je(t), r = V(e), i = Ce(r, n.centerDirection);
	if (i <= 0) return null;
	let a = Ce(r, n.tangentX) / i, o = Ce(r, n.tangentY) / i, s = Math.tan(n.angularWidth / 2), c = Math.tan(n.angularHeight / 2);
	return s <= 0 || c <= 0 || a < -s || a > s || o < -c || o > c ? null : {
		u: a / (2 * s) + .5,
		v: .5 - o / (2 * c)
	};
}
//#endregion
//#region spot-transform.ts
var Be = Math.PI / 12;
function H(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Ve(e) {
	return e * 180 / Math.PI;
}
function He(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Ue() {
	return {
		angularRadius: Be,
		baseAngularRadius: Be,
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
function We(e) {
	let t = e, n = Ue(), r = Math.max(1e-4, typeof t?.baseAngularRadius == "number" ? t.baseAngularRadius : n.baseAngularRadius);
	return {
		angularRadius: Math.max(1e-4, typeof t?.angularRadius == "number" ? t.angularRadius : r),
		baseAngularRadius: r,
		brightness: Math.max(0, typeof t?.brightness == "number" ? t.brightness : n.brightness),
		centerDirection: V(t?.centerDirection, n.centerDirection),
		colorMode: t?.colorMode === "gradient" ? "gradient" : "light",
		coreRadius: H(typeof t?.coreRadius == "number" ? t.coreRadius : n.coreRadius, .01, .7),
		coreSoftness: H(typeof t?.coreSoftness == "number" ? t.coreSoftness : n.coreSoftness, .4, 6),
		dispersion: H(typeof t?.dispersion == "number" ? t.dispersion : n.dispersion, 0, 1),
		dogSpread: H(typeof t?.dogSpread == "number" ? t.dogSpread : n.dogSpread, .015, .18),
		dogStrength: H(typeof t?.dogStrength == "number" ? t.dogStrength : n.dogStrength, 0, 1.8),
		dogStretch: H(typeof t?.dogStretch == "number" ? t.dogStretch : n.dogStretch, 0, .55),
		glareSize: H(typeof t?.glareSize == "number" ? t.glareSize : n.glareSize, .03, 1.1),
		glareStrength: H(typeof t?.glareStrength == "number" ? t.glareStrength : n.glareStrength, 0, 1.4),
		glow: H(typeof t?.glow == "number" ? t.glow : n.glow, 0, 1),
		glowSize: H(typeof t?.glowSize == "number" ? t.glowSize : n.glowSize, .05, 1.4),
		glowStrength: H(typeof t?.glowStrength == "number" ? t.glowStrength : n.glowStrength, 0, 1),
		halo: H(typeof t?.halo == "number" ? t.halo : n.halo, 0, 1),
		haloInnerWidth: H(typeof t?.haloInnerWidth == "number" ? t.haloInnerWidth : n.haloInnerWidth, .003, .09),
		haloOuterWidth: H(typeof t?.haloOuterWidth == "number" ? t.haloOuterWidth : n.haloOuterWidth, .01, .24),
		haloRadius: H(typeof t?.haloRadius == "number" ? t.haloRadius : n.haloRadius, .04, 1),
		haloStrength: H(typeof t?.haloStrength == "number" ? t.haloStrength : n.haloStrength, 0, 1.4),
		lightColor: typeof t?.lightColor == "string" ? t.lightColor : n.lightColor,
		stops: (t?.stops?.length ? t.stops : n.stops).map((e) => ({
			color: e.color,
			location: H(e.location, 0, 100),
			midpoint: H(e.midpoint ?? 50, 1, 99),
			opacity: H(e.opacity, 0, 100)
		}))
	};
}
function Ge(e) {
	let t = V(e.centerDirection);
	return {
		x: He(Ve(Math.atan2(t[0], -t[2]))),
		y: Ve(Math.asin(H(t[1], -1, 1)))
	};
}
function Ke(e, t) {
	return {
		...We(e),
		centerDirection: Ne({
			x: t.x,
			y: H(t.y, -_e, _e)
		})
	};
}
function qe(e) {
	let t = We(e);
	return t.angularRadius / t.baseAngularRadius;
}
function Je(e, t) {
	let n = We(e);
	return {
		...n,
		angularRadius: Math.max(1e-4, n.baseAngularRadius * Math.max(1e-4, t))
	};
}
function Ye(e, t) {
	let n = We(t), r = V(e), i = V(n.centerDirection), a = r[0] * i[0] + r[1] * i[1] + r[2] * i[2];
	return Math.acos(H(a, -1, 1)) <= n.angularRadius;
}
//#endregion
//#region starfield-static.ts
var U = Math.PI * 2, Xe = 8, Ze = 1e3, Qe = 2, $e = 128, et = 64, tt = 4, nt = 8, rt = 12, it = 2048 * 1024 * 1024, at = 512 * 1024 * 1024, ot = 8, st = 1.75, ct = 3.25, lt = 1, ut = 1.5, dt = 8, ft = 2048, pt = 5, mt = 12, ht = .35, gt = .25, _t = [
	1,
	2,
	4,
	8,
	16
], vt = 1024, yt = 8192, bt = "medium", xt = {
	high: { budgetBytes: it },
	medium: { budgetBytes: at }
}, W = {
	uBright: 2,
	uBrightVar: .85,
	uColorVar: 1,
	uDensity: 325,
	uGlareSize: 4.6,
	uGlareStr: .8,
	uGlareVar: .7,
	uLargeStarRarity: .97,
	uSeed: 1,
	uSizeVar: .7,
	uStarSize: 1.55
}, G = {
	uBaseScale: 10,
	uCloudCore: [
		.025,
		.03,
		.07
	],
	uCloudHighlight: [
		.3,
		.36,
		.72
	],
	uCloudShadow: [
		.004,
		.006,
		.018
	],
	uColorWarpAmp: .045,
	uColorWarpFreq: 2.2,
	uContrast: 3,
	uCoverage: .15,
	uDensity: 2,
	uLightFocus: 1.55,
	uLightIntensity: .25,
	uLightLining: 1,
	uNebulaExposure: .1,
	uNebulaStrength: 7.4,
	uOctaves: 8,
	uOpacity: .21,
	uSeed: 2.4,
	uSoftness: .596
}, St = [
	{
		dir: [
			.26,
			.18,
			.95
		],
		color: [
			.14,
			.19,
			.46
		]
	},
	{
		dir: [
			-.72,
			.34,
			.6
		],
		color: [
			.18,
			.08,
			.22
		]
	},
	{
		dir: [
			.62,
			-.46,
			-.64
		],
		color: [
			.05,
			.12,
			.28
		]
	},
	{
		dir: [
			-.18,
			-.82,
			-.54
		],
		color: [
			.13,
			.15,
			.2
		]
	}
], K = {
	amplitude: .045,
	anchors: St.map((e) => ({
		color: kt(e.color),
		...Ft(e.dir)
	})),
	frequency: 2.2,
	mode: "inverse-distance",
	power: 2
}, Ct = {
	altitudeCenterDeg: 0,
	altitudeSpanDeg: 180,
	azimuthCenterDeg: 0,
	azimuthSpanDeg: 360
}, wt = {
	clip: Ct,
	nebula: G,
	nebulaField: K,
	quality: bt,
	stars: W
}, Tt = /* @__PURE__ */ new Map();
function q(e, t, n = -Infinity, r = Infinity) {
	return L(Number.isFinite(Number(e)) ? Number(e) : t, n, r);
}
function Et(e) {
	return e === "high" ? "high" : bt;
}
function Dt(e) {
	return xt[Et(e)];
}
function Ot(e, t) {
	return Array.isArray(e) ? [
		q(e[0], t[0], 0, 1),
		q(e[1], t[1], 0, 1),
		q(e[2], t[2], 0, 1)
	] : [...t];
}
function kt(e) {
	return `#${e.map((e) => Math.round(L(e) * 255).toString(16).padStart(2, "0")).join("")}`;
}
function At(e) {
	let t = e.replace("#", "");
	return /^[0-9a-fA-F]{6}$/.test(t) ? [
		0,
		2,
		4
	].map((e) => Number.parseInt(t.slice(e, e + 2), 16) / 255) : [
		1,
		1,
		1
	];
}
function jt(e) {
	let t = Math.hypot(e[0], e[1], e[2]);
	return t <= 1e-5 ? [
		0,
		0,
		1
	] : [
		e[0] / t,
		e[1] / t,
		e[2] / t
	];
}
function Mt(e, t) {
	return jt(Array.isArray(e) ? [
		q(e[0], t[0]),
		q(e[1], t[1]),
		q(e[2], t[2])
	] : t);
}
function Nt(e, t) {
	let n = (e - .5) * U, r = L(t, 0, 1) * Math.PI, i = Math.sin(r);
	return jt([
		i * Math.sin(n),
		Math.cos(r),
		i * Math.cos(n)
	]);
}
function Pt(e, t) {
	let n = (t % 2 + 2) % 2, r = +(n >= 1), i = e + r * .5, a = r ? 2 - n : n;
	return {
		u: i,
		v: a,
		x: i,
		y: a
	};
}
function Ft(e) {
	let t = jt(e), n = ((Math.atan2(t[0], t[2]) / U + .5) % 1 + 1) % 1, r = Math.acos(L(t[1], -1, 1)) / Math.PI;
	return {
		u: n,
		v: r,
		x: n,
		y: r
	};
}
function It(e = {}) {
	let t = Number(e.azimuthCenterDeg) || 0, n = q(e.azimuthSpanDeg, Ct.azimuthSpanDeg, 1, 360), r = q(e.altitudeSpanDeg, Ct.altitudeSpanDeg, 1, 180), i = Math.max(0, 90 - r * .5);
	return {
		altitudeCenterDeg: q(e.altitudeCenterDeg, Ct.altitudeCenterDeg, -i, i),
		altitudeSpanDeg: r,
		azimuthCenterDeg: t,
		azimuthSpanDeg: n
	};
}
function Lt(e) {
	let t = It(e), n = t.altitudeCenterDeg + t.altitudeSpanDeg * .5, r = t.altitudeCenterDeg - t.altitudeSpanDeg * .5, i = t.azimuthSpanDeg >= 359.999, a = i ? 0 : .5 + (t.azimuthCenterDeg - t.azimuthSpanDeg * .5) / 360, o = i ? 1 : t.azimuthSpanDeg / 360, s = (90 - n) / 180, c = (n - r) / 180;
	return {
		altitudeSpanRad: c * Math.PI,
		azimuthSpanRad: o * U,
		config: t,
		fraction: Math.max(1e-4, o * c),
		uvMin: {
			x: a,
			y: s
		},
		uvSize: {
			x: o,
			y: c
		},
		wrapsHorizontally: i
	};
}
function Rt(e, t = $e) {
	return Math.max(t, Math.ceil(Math.max(1, e) / t) * t);
}
function zt(e, t) {
	return Math.max(1, Math.min(t, Rt(e)));
}
function Bt(e, t, n) {
	return Math.max(0, Math.round(e) * Math.round(t) * n);
}
function Vt({ accumulationBytes: e, patchCount: t, residentBytesPerPixel: n = tt, storageHeight: r, storageWidth: i, supersample: a }) {
	let o = Bt(i, r, n) * t, s = Bt(i * a, r * a, e);
	return {
		peakBytes: o + s,
		residentBytes: o,
		scratchBytes: s
	};
}
function Ht({ accumulationBytes: e, budgetBytes: t, maxTextureSize: n, patchCount: r, residentBytesPerPixel: i = tt, storageHeight: a, storageWidth: o }) {
	let s = Math.max(1, Math.min(ot, Math.floor(n / Math.max(1, o)), Math.floor(n / Math.max(1, a))));
	for (let n = s; n >= 1; --n) {
		let s = Vt({
			accumulationBytes: e,
			patchCount: r,
			residentBytesPerPixel: i,
			storageHeight: a,
			storageWidth: o,
			supersample: n
		});
		if (s.peakBytes <= t || n === 1) return {
			...s,
			peakBudgetRatio: s.peakBytes / Math.max(1, t),
			supersample: n
		};
	}
	let c = Vt({
		accumulationBytes: e,
		patchCount: r,
		residentBytesPerPixel: i,
		storageHeight: a,
		storageWidth: o,
		supersample: 1
	});
	return {
		...c,
		peakBudgetRatio: c.peakBytes / Math.max(1, t),
		supersample: 1
	};
}
function Ut({ accumulationBytes: e, budgetBytes: t, coverage: n, grid: r, idealVirtualHeight: i, idealVirtualWidth: a, maxQualityScale: o = 1, maxTextureSize: s, residentBytesPerPixel: c = tt }) {
	let l = Lt(n), u = r === 1 ? 0 : et, d = Math.max(1, s - u * 2), f = Math.max(1, s - u * 2), p = Math.max(1, a / r), m = Math.max(1, i / r), h = Math.min(1, Math.max(.001, o), d / p, f / m), g = r * r, _ = Math.max(.001, h), v = null;
	for (let n = 0; n < 18; n += 1) {
		let n = zt(p * _, d), r = zt(m * _, f), i = n + u * 2, a = r + u * 2, o = Ht({
			accumulationBytes: e,
			budgetBytes: t,
			maxTextureSize: s,
			patchCount: g,
			residentBytesPerPixel: c,
			storageHeight: a,
			storageWidth: i
		});
		if (v = {
			allocation: o,
			contentHeight: r,
			contentWidth: n,
			scale: Math.min(n / p, r / m, 1),
			storageHeight: a,
			storageWidth: i
		}, o.peakBytes <= t) break;
		let l = _ * Math.sqrt(t / Math.max(o.peakBytes, 1)) * .96;
		if (Math.abs(l - _) < .001 || n <= $e || r <= $e) break;
		_ = Math.max(.001, l);
	}
	if (!v) {
		let n = zt(p * _, d), r = zt(m * _, f), i = n + u * 2, a = r + u * 2;
		v = {
			allocation: Ht({
				accumulationBytes: e,
				budgetBytes: t,
				maxTextureSize: s,
				patchCount: g,
				residentBytesPerPixel: c,
				storageHeight: a,
				storageWidth: i
			}),
			contentHeight: r,
			contentWidth: n,
			scale: _,
			storageHeight: a,
			storageWidth: i
		};
	}
	return {
		coverage: l,
		grid: r,
		guard: u,
		idealPatchHeight: m,
		idealPatchWidth: p,
		patchCount: g,
		...v
	};
}
function Wt(e, t, n) {
	return {
		x: e.coverageUvMin.x + t / e.columns * e.coverageUvSize.x,
		y: e.coverageUvMin.y + n / e.rows * e.coverageUvSize.y
	};
}
function Gt(e) {
	return {
		x: e.coverageUvSize.x / e.columns,
		y: e.coverageUvSize.y / e.rows
	};
}
function Kt(e, t, n, r) {
	let i = Wt(e, t, n), a = Gt(e), o = Math.min(r, Math.max(1, Math.round(e.contentWidth))), s = Math.min(r, Math.max(1, Math.round(e.contentHeight))), c = Math.min(r, o + e.guard * 2), l = Math.min(r, s + e.guard * 2), u = Math.max(0, (c - o) * .5), d = Math.max(0, (l - s) * .5), f = a.x * (u / o), p = a.y * (d / s), m = e.wrapsHorizontally && e.columns === 1;
	return {
		hasBottomNeighbor: n < e.rows - 1,
		hasLeftNeighbor: e.wrapsHorizontally || t > 0,
		hasRightNeighbor: e.wrapsHorizontally || t < e.columns - 1,
		hasTopNeighbor: n > 0,
		id: `${e.virtualWidth}x${e.virtualHeight}:${t},${n}`,
		innerOffset: {
			x: u / c,
			y: d / l
		},
		innerScale: {
			x: o / c,
			y: s / l
		},
		storageGuard: {
			x: u,
			y: d
		},
		storageSize: {
			height: l,
			width: c
		},
		storageUvMin: {
			x: i.x - f,
			y: i.y - p
		},
		storageUvSize: {
			x: a.x + f * 2,
			y: a.y + p * 2
		},
		uvMin: i,
		uvSize: a,
		wrapS: m ? "repeat" : "clamp",
		wrapT: "clamp",
		x: t,
		y: n
	};
}
function qt({ accumulationBytes: e = nt, budgetBytes: t = it, clip: n, height: r, maxTextureSize: i = 4096, residentBytesPerPixel: a = rt, width: o }) {
	let s = Lt(n), c = Math.max(1, o * s.uvSize.x), l = Math.max(1, r * s.uvSize.y), u = Math.max(1, o), d = Math.max(1, r), f = (e, t) => _t.find((n) => {
		let r = Math.max(1, i - (n === 1 ? 0 : et) * 2);
		return e / n <= r && t / n <= r;
	}) ?? _t[_t.length - 1], p = Ut({
		accumulationBytes: e,
		budgetBytes: t,
		grid: f(u, d),
		idealVirtualHeight: d,
		idealVirtualWidth: u,
		maxTextureSize: i,
		residentBytesPerPixel: a
	}), m = f(c, l), h = Ut({
		accumulationBytes: e,
		budgetBytes: t,
		coverage: s.config,
		grid: m,
		idealVirtualHeight: l,
		idealVirtualWidth: c,
		maxQualityScale: s.fraction < .9999 ? p.scale : 1,
		maxTextureSize: i,
		residentBytesPerPixel: a
	}), g = h.allocation.peakBytes > t, _ = {
		budgetBytes: t,
		budgetExceeded: g,
		effectiveVirtualHeight: h.contentHeight * m,
		effectiveVirtualWidth: h.contentWidth * m,
		idealVirtualHeight: l,
		idealVirtualWidth: c,
		peakBytes: h.allocation.peakBytes,
		qualityScale: h.scale,
		residentBytes: h.allocation.residentBytes,
		scratchBytes: h.allocation.scratchBytes
	}, v = {
		allocation: {
			budgetBytes: t,
			budgetExceeded: g,
			peakBudgetRatio: h.allocation.peakBudgetRatio,
			peakBytes: h.allocation.peakBytes,
			residentBytes: h.allocation.residentBytes,
			scratchBytes: h.allocation.scratchBytes
		},
		autoLayout: !0,
		autoLayoutDemand: _,
		autoLayoutReason: g ? "budget-minimum" : h.scale < .995 ? "budget-scaled" : "screen-fit",
		columns: m,
		contentHeight: h.contentHeight,
		contentWidth: h.contentWidth,
		coverage: s.config,
		coverageFraction: s.fraction,
		coverageUvMin: s.uvMin,
		coverageUvSize: s.uvSize,
		demand: _,
		effectiveVirtualHeight: h.contentHeight * m,
		effectiveVirtualWidth: h.contentWidth * m,
		guard: h.guard,
		idealPatchHeight: h.idealPatchHeight,
		idealPatchWidth: h.idealPatchWidth,
		idealVirtualHeight: l,
		idealVirtualWidth: c,
		patchCount: h.patchCount,
		qualityScale: h.scale,
		rows: m,
		storageHeight: h.storageHeight,
		storageWidth: h.storageWidth,
		supersample: h.allocation.supersample,
		targetTexelsPerPixel: 1,
		virtualHeight: h.contentHeight * m,
		virtualWidth: h.contentWidth * m,
		wrapsHorizontally: s.wrapsHorizontally
	}, y = [];
	for (let e = 0; e < m; e += 1) for (let t = 0; t < m; t += 1) y.push(Kt(v, t, e, i));
	return {
		...v,
		descriptors: y
	};
}
function Jt(e) {
	return !!(e && typeof e == "object" && "mode" in e && !("blend" in e));
}
function Yt(e) {
	let t = Array.isArray(e?.anchors) && e.anchors.length ? e.anchors : St;
	return {
		amplitude: q(e?.warp?.amp, K.amplitude, 0, .6),
		anchors: t.slice(0, Xe).map((e, t) => {
			let n = St[t] ?? St[0], r = Mt(e?.dir, n.dir);
			return {
				color: Array.isArray(e?.color) ? kt(Ot(e.color, n.color)) : typeof e?.color == "string" ? e.color : kt(n.color),
				...Ft(r)
			};
		}),
		frequency: q(e?.warp?.freq, K.frequency, .3, 4),
		mode: e?.blend === "gaussian" ? "gaussian" : "inverse-distance",
		power: q(e?.power, K.power, .4, 6)
	};
}
function Xt(e) {
	if (!Jt(e)) return Yt(e);
	let t = Array.isArray(e.anchors) && e.anchors.length ? e.anchors : K.anchors;
	return {
		amplitude: q(e.amplitude, K.amplitude, 0, .6),
		anchors: t.slice(0, Xe).map((e, t) => ({
			color: typeof e?.color == "string" ? e.color : K.anchors[t]?.color ?? "#ffffff",
			x: q(e?.x, K.anchors[t]?.x ?? .5, 0, 1),
			y: q(e?.y, K.anchors[t]?.y ?? .5, 0, 1)
		})),
		frequency: q(e.frequency, K.frequency, .3, 4),
		mode: e.mode === "gaussian" ? "gaussian" : "inverse-distance",
		power: q(e.power, K.power, .4, 6)
	};
}
function Zt(e = {}) {
	let t = e.stars ?? W, n = e.nebula ?? G;
	return {
		clip: It(e.clip),
		nebula: {
			uBaseScale: q(n.uBaseScale, G.uBaseScale, .001, 100),
			uCloudCore: Ot(n.uCloudCore, G.uCloudCore),
			uCloudHighlight: Ot(n.uCloudHighlight, G.uCloudHighlight),
			uCloudShadow: Ot(n.uCloudShadow, G.uCloudShadow),
			uColorWarpAmp: q(n.uColorWarpAmp, G.uColorWarpAmp, 0, 1),
			uColorWarpFreq: q(n.uColorWarpFreq, G.uColorWarpFreq, .001, 20),
			uContrast: q(n.uContrast, G.uContrast, .05, 12),
			uCoverage: q(n.uCoverage, G.uCoverage, .02, .98),
			uDensity: q(n.uDensity, G.uDensity, 0, 10),
			uLightFocus: q(n.uLightFocus, G.uLightFocus, .001, 8),
			uLightIntensity: q(n.uLightIntensity, G.uLightIntensity, 0, 4),
			uLightLining: q(n.uLightLining, G.uLightLining, 0, 4),
			uNebulaExposure: q(n.uNebulaExposure, G.uNebulaExposure, .001, 4),
			uNebulaStrength: q(n.uNebulaStrength, G.uNebulaStrength, 0, 20),
			uOctaves: q(n.uOctaves, G.uOctaves, 1, 8),
			uOpacity: q(n.uOpacity, G.uOpacity, 0, 1),
			uSeed: q(n.uSeed, G.uSeed),
			uSoftness: q(n.uSoftness, G.uSoftness, .001, 2)
		},
		nebulaField: Xt(e.nebulaField),
		quality: Et(e.quality),
		stars: {
			uBright: q(t.uBright, W.uBright, 0, 8),
			uBrightVar: q(t.uBrightVar, W.uBrightVar, 0, 1),
			uColorVar: q(t.uColorVar, W.uColorVar, 0, 1),
			uDensity: q(t.uDensity, W.uDensity, 0, 2e3),
			uGlareSize: q(t.uGlareSize, W.uGlareSize, 0, 12),
			uGlareStr: q(t.uGlareStr, W.uGlareStr, 0, 4),
			uGlareVar: q(t.uGlareVar, W.uGlareVar, 0, 1),
			uLargeStarRarity: q(t.uLargeStarRarity, W.uLargeStarRarity, 0, 1),
			uSeed: q(t.uSeed, W.uSeed),
			uSizeVar: q(t.uSizeVar, W.uSizeVar, 0, 1),
			uStarSize: q(t.uStarSize, W.uStarSize, .01, 8)
		}
	};
}
function J(e, t, n) {
	return e + (t - e) * n;
}
function Qt(e, t, n) {
	return [
		J(e[0], t[0], n),
		J(e[1], t[1], n),
		J(e[2], t[2], n)
	];
}
function Y(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function X(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function $t(e, t) {
	return [
		e[0] * t[0],
		e[1] * t[1],
		e[2] * t[2]
	];
}
function en(e, t, n) {
	let r = L((n - e) / Math.max(t - e, 1e-5));
	return r * r * (3 - 2 * r);
}
function tn(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function nn(e) {
	return Math.max(0, 2 * (1 - L(e, -1, 1)));
}
function rn(e, t) {
	return ((e - t) % 1 + 1.5) % 1 - .5;
}
function an(e, t, n) {
	if (t < n.uvMin.y || t > n.uvMin.y + n.uvSize.y) return !1;
	if (n.wrapsHorizontally) return !0;
	let r = n.uvMin.x + n.uvSize.x * .5;
	return Math.abs(rn(e, r)) <= n.uvSize.x * .5;
}
function on(e, t, n) {
	if (t >= 1) return [{
		end: n - 1,
		start: 0
	}];
	let r = (e % 1 + 1) % 1, i = r + t;
	return i <= 1 ? [{
		end: Math.min(n - 1, Math.ceil(i * n)),
		start: Math.max(0, Math.floor(r * n))
	}] : [{
		end: n - 1,
		start: Math.max(0, Math.floor(r * n))
	}, {
		end: Math.min(n - 1, Math.ceil((i - 1) * n)),
		start: 0
	}];
}
function sn(e, t) {
	let n = Lt(t), r = Ft(e);
	return an(r.u, r.v, n);
}
function cn(e) {
	return (Math.floor(e * 1000003) ^ 2654435769) >>> 0;
}
function ln(e) {
	let t = e >>> 0;
	return t = Math.imul(t ^ t >>> 16, 2146121005), t = Math.imul(t ^ t >>> 15, 2221713035), (t ^ t >>> 16) >>> 0;
}
function un(e, t, n, r) {
	let i = Math.imul(t + 2654435769 >>> 0, 2246822507), a = Math.imul(n + 3266489909 >>> 0, 668265263), o = Math.imul(r + 374761393 >>> 0, 2654435761);
	return ln((e ^ i ^ a ^ o) >>> 0) / 4294967296;
}
function dn(e, t) {
	return (e % t + t) % t;
}
function fn(e) {
	return (1 - Math.cos(L(e, 0, 1) * Math.PI)) * .5;
}
function pn(e) {
	let t = Math.max(1, Math.round(e.uDensity)), n = L(t / Ze, 0, 1);
	return {
		activationThreshold: n * n,
		columns: Ze,
		density: t,
		densityScale: n,
		rows: Ze,
		seed: cn(e.uSeed)
	};
}
function mn(e, t = 1, n = 0) {
	return L(e, 0, 1) ** pt * (1 + (L(t, 0, 1) ** mt - 1) * L(n, 0, 1));
}
function hn(e, t, n, r, i) {
	let a = mn(e, t, n), o = r + (Math.max(r, a) - r) * ht, s = i + (Math.max(i, a) - i) * gt, c = o ** 3, l = s ** 8, u = L(a * .3 + c * .55 + l * .15, 0, 1);
	return u >= .78 || c > .85 && (a > .65 || l > .35) ? 3 : u >= .52 || c > .62 || l > .65 && a > .45 ? 2 : u < .16 && a < .35 && c < .08 && l < .08 ? 0 : 1;
}
function gn(e, t, n, r = 0) {
	if (n < 0 || n >= e.rows) return null;
	let i = dn(t, e.columns);
	if (un(e.seed, i, n, 0) >= e.activationThreshold) return null;
	let a = (i + un(e.seed, i, n, 1)) / e.columns, o = 1 - (n + un(e.seed, i, n, 2)) / e.rows * 2, s = (a - .5) * U, c = Math.sqrt(Math.max(0, 1 - o * o)), l = un(e.seed, i, n, 3), u = un(e.seed, i, n, 4), d = un(e.seed, i, n, 5), f = un(e.seed, i, n, 6), p = un(e.seed, i, n, 7);
	return {
		classId: hn(l, p, r, u, d),
		column: i,
		rBright: u,
		rColor: f,
		rGlare: d,
		rSize: l,
		rSizeGate: p,
		row: n,
		u: a,
		v: Math.acos(L(o, -1, 1)) / Math.PI,
		x: c * Math.sin(s),
		y: o,
		z: c * Math.cos(s)
	};
}
function _n(e, t, n, r) {
	if (t - e >= 1) return !0;
	let i = n / r, a = (n + 1) / r;
	for (let n = -1; n <= 1; n += 1) if (a + n >= e && i + n <= t) return !0;
	return !1;
}
function vn(e, t) {
	let n = Math.PI / Math.max(1, t), r = Math.PI / ft, i = Math.max(e.uStarSize * r, st * Math.max(n, r)), a = Math.max((e.uStarSize + e.uGlareSize) * r, ct * Math.max(n, r));
	return Math.max(i * .45, a * .36, n, r) * dt;
}
function yn({ height: e, includeSeamCopies: t, rawVMax: n, rawVMin: r, seamCopies: i, stars: a, uMax: o, uMin: s, wrapsHorizontally: c }) {
	let l = pn(a), u = vn(a, e) / Math.PI, d = L(r, 0, 1), f = L(n, 0, 1), p = fn(d), m = fn(f), h = Math.max(0, Math.floor(p * l.rows) - Qe), g = Math.min(l.rows - 1, Math.floor(m * l.rows) + Qe), _ = r <= u || n >= 1 - u, v = L(a.uLargeStarRarity, 0, 1), y = JSON.stringify({
		activationThreshold: l.activationThreshold,
		height: e,
		includeSeamCopies: t,
		largeStarRarity: v,
		poleWideQuery: _,
		rawVMax: n,
		rawVMin: r,
		seamCopies: i,
		seed: l.seed,
		uMax: o,
		uMin: s,
		vMax: f,
		vMin: d,
		wrapsHorizontally: c
	}), b = Tt.get(y);
	if (b) return b.map((e) => ({ ...e }));
	let x = [];
	for (let e = h; e <= g; e += 1) for (let n = 0; n < l.columns; n += 1) {
		if (!_ && !c && !_n(s, o, n, l.columns)) continue;
		let r = gn(l, n, e, v);
		if (r) {
			if (!t) {
				x.push(r);
				continue;
			}
			for (let e = -1; e <= 1; e += 1) {
				let t = r.u + e;
				(i === "all" || c || t >= s && t <= o) && x.push({
					...r,
					u: t
				});
			}
		}
	}
	return Tt.set(y, x.map((e) => ({ ...e }))), x;
}
function bn(e, t, n, r = {}) {
	let i = pn(e), a = vn(e, n), o = a / Math.PI, s = t.uvMin.y - o, c = t.uvMin.y + t.uvSize.y + o, l = L(s, 0, 1), u = L(c, 0, 1), d = s <= o || c >= 1 - o, f = Math.max(Math.min(Math.sin(Math.max(l, .001) * Math.PI), Math.sin(Math.min(u, .999) * Math.PI)), .015), p = d ? 1 : Math.min(1, a / (U * f) + Qe / i.columns), m = t.wrapsHorizontally ? -p : t.uvMin.x - p, h = t.wrapsHorizontally ? 1 + p : t.uvMin.x + t.uvSize.x + p;
	return yn({
		height: n,
		includeSeamCopies: r.includeSeamCopies ?? !0,
		rawVMax: c,
		rawVMin: s,
		seamCopies: "filtered",
		stars: e,
		uMax: h,
		uMin: m,
		wrapsHorizontally: t.wrapsHorizontally
	});
}
function xn(e, t, n, r = {}) {
	let i = pn(e), a = vn(e, n), o = a / Math.PI, s = t.storageUvMin.y - o, c = t.storageUvMin.y + t.storageUvSize.y + o, l = L(s, 0, 1), u = L(c, 0, 1), d = s <= o || c >= 1 - o, f = Math.max(Math.min(Math.sin(Math.max(l, .001) * Math.PI), Math.sin(Math.min(u, .999) * Math.PI)), .015), p = d ? 1 : Math.min(1, a / (U * f) + Qe / i.columns);
	return yn({
		height: n,
		includeSeamCopies: r.includeSeamCopies ?? !0,
		rawVMax: c,
		rawVMin: s,
		seamCopies: "all",
		stars: e,
		uMax: t.storageUvMin.x + t.storageUvSize.x + p,
		uMin: t.storageUvMin.x - p,
		wrapsHorizontally: !1
	});
}
function Z(e) {
	return e >>> 0;
}
function Sn(e, t) {
	let n = Z(e);
	return Z(n << t | n >>> 32 - t);
}
function Cn(e, t, n) {
	let r = Z(e), i = Z(t), a = Z(n);
	return a = Z(a ^ i), a = Z(a - Sn(i, 14)), r = Z(r ^ a), r = Z(r - Sn(a, 11)), i = Z(i ^ r), i = Z(i - Sn(r, 25)), a = Z(a ^ i), a = Z(a - Sn(i, 16)), r = Z(r ^ a), r = Z(r - Sn(a, 4)), i = Z(i ^ r), i = Z(i - Sn(r, 14)), a = Z(a ^ i), a = Z(a - Sn(i, 24)), a;
}
function wn(e, t, n) {
	let r = Z(3735928584);
	return Cn(Z(r + Z(e)), Z(r + Z(t)), Z(r + Z(n)));
}
function Tn(e) {
	return e * e * e * (e * (e * 6 - 15) + 10);
}
function En(e, t, n, r) {
	let i = e & 15, a = i < 8 ? t : n, o = i < 4 ? n : i === 12 || i === 14 ? t : r;
	return (i & 1 ? -a : a) + (i & 2 ? -o : o);
}
function Dn(e, t, n, r, i, a, o, s, c, l, u) {
	let d = 1 - c, f = 1 - l;
	return (1 - u) * (f * (e * d + t * c) + l * (n * d + r * c)) + u * (f * (i * d + a * c) + l * (o * d + s * c));
}
function On(e) {
	let t = Math.floor(e[0]), n = Math.floor(e[1]), r = Math.floor(e[2]), i = e[0] - t, a = e[1] - n, o = e[2] - r, s = Tn(i), c = Tn(a), l = Tn(o);
	return Dn(En(wn(t, n, r), i, a, o), En(wn(t + 1, n, r), i - 1, a, o), En(wn(t, n + 1, r), i, a - 1, o), En(wn(t + 1, n + 1, r), i - 1, a - 1, o), En(wn(t, n, r + 1), i, a, o - 1), En(wn(t + 1, n, r + 1), i - 1, a, o - 1), En(wn(t, n + 1, r + 1), i, a - 1, o - 1), En(wn(t + 1, n + 1, r + 1), i - 1, a - 1, o - 1), s, c, l) * .982;
}
function kn(e, t, n, r) {
	let i = 0, a = .5, o = 0, s = Math.floor(L(t, 1, 8)), c = Math.max(n, .001), l = L(r, .001, .999), u = [...e];
	for (let e = 0; e < s; e += 1) {
		let e = On(u) * .5 + .5;
		i += a * e, o += a, u = X(u, c), a *= l;
	}
	return o <= 0 ? 0 : i / o;
}
function An(e, t, n) {
	return t <= 0 ? e : jt([
		e[0] + Math.sin((e[1] * n + .23) * U) * Math.cos((e[2] * n + .41) * U) * t,
		e[1] + Math.cos((e[2] * n + .17) * U) * Math.sin((e[0] * n + .37) * U) * t,
		e[2] + Math.sin((e[0] * n - .31) * U) * Math.cos((e[1] * n + .29) * U) * t
	]);
}
function jn(e) {
	let t = Xt(e);
	return {
		anchors: t.anchors.map((e) => ({
			color: At(e.color),
			dir: Nt(e.x, e.y)
		})),
		blend: t.mode === "gaussian" ? "gaussian" : "idw",
		power: t.power,
		sigma: .46 / Math.max(t.power, 1e-4),
		warp: {
			amp: t.amplitude,
			freq: t.frequency
		}
	};
}
function Mn(e, t, n) {
	return 1 - en(e, t, n);
}
function Nn(e, t) {
	let n = jn(t), r = An(e, n.warp.amp, n.warp.freq), i = [
		0,
		0,
		0
	], a = 0;
	return n.anchors.forEach((e) => {
		let t = 1 - L(tn(r, e.dir), -1, 1), o = n.blend === "gaussian" ? Math.exp(-(t * t) / Math.max(2 * n.sigma * n.sigma, 1e-4)) : 1 / (t + 1e-4) ** Math.max(n.power, 1e-4);
		i = Y(i, X(e.color, o)), a += o;
	}), a <= 0 ? [
		0,
		0,
		0
	] : X(i, 1 / a);
}
function Pn(e, t) {
	let n = t.nebula, r = L(n.uOctaves, 1, 8), i = Y(X(e, Math.max(n.uColorWarpFreq, .001)), [
		n.uSeed,
		n.uSeed * .37,
		n.uSeed * -.21
	]), a = Nn(jt(Y(e, X([
		kn(i, r, 2.02, .52) * 2 - 1,
		kn(Y(i, [
			5.2,
			1.3,
			7.1
		]), r, 2.03, .5) * 2 - 1,
		kn(Y(i, [
			9.1,
			8.4,
			2.8
		]), r, 2.01, .51) * 2 - 1
	], Math.max(n.uColorWarpAmp, 0)))), t.nebulaField), o = [
		n.uSeed * 13.17,
		n.uSeed * -7.31,
		n.uSeed * 5.19
	], s = Y(X(e, Math.max(n.uBaseScale, .001)), o), c = L(kn(Y(s, X([
		kn(s, r, 2.02, .5),
		kn(Y(s, [
			5.2,
			1.3,
			2.8
		]), r, 2.02, .5),
		kn(Y(s, [
			2.1,
			4.7,
			9.2
		]), r, 2.02, .5)
	], 3)), r, 2.02, .5)), l = L(en(n.uCoverage, n.uCoverage + Math.max(n.uSoftness, .001), c)) ** Math.max(n.uContrast, .05), u = L(Math.max(a[0], a[1], a[2]) * Math.max(n.uLightIntensity, 0)) ** Math.max(n.uLightFocus, .001), d = X($t(a, n.uCloudHighlight), Math.max(n.uLightIntensity, 0));
	return Y([
		.004,
		.005,
		.011
	], X(X(Y(Qt(Qt(n.uCloudShadow, d, u), n.uCloudCore, L(l * .4)), X(a, u * (1 - l) * Math.max(n.uLightLining, 0) * Math.max(n.uLightIntensity, 0))), Math.max(n.uDensity, 0)).map((e) => Math.max(0, e) ** .92), L(l * n.uOpacity) * Math.max(n.uNebulaStrength, 0)));
}
function Fn(e) {
	return e < .5 ? Qt([
		1,
		.55,
		.3
	], [
		1,
		.96,
		.92
	], e * 2) : Qt([
		1,
		.96,
		.92
	], [
		.7,
		.8,
		1
	], (e - .5) * 2);
}
function In(e, t, n, r, i) {
	let a = (r * t + n) * 4;
	e[a] += i[0], e[a + 1] += i[1], e[a + 2] += i[2], e[a + 3] = Math.max(e[a + 3], Math.max(i[0], i[1], i[2]));
}
function Ln(e) {
	return e < 256 ? 1 : e < 2048 ? 2 : 1;
}
function Rn(e, t, n, r, i = r) {
	let a = Lt(t.clip), o = t.stars;
	if (o.uDensity <= 0 || o.uBright <= 0) return;
	let s = bn(o, a, i, { includeSeamCopies: !1 }), c = Math.PI / Math.max(1, i), l = Math.PI / ft, u = Math.PI / Math.max(1, r);
	s.forEach((t) => {
		let i = mn(t.rSize, t.rSizeGate, o.uLargeStarRarity), s = t.rBright + (Math.max(t.rBright, i) - t.rBright) * ht, d = t.rGlare + (Math.max(t.rGlare, i) - t.rGlare) * gt, f = J(1, J(.1, 1, i), o.uSizeVar), p = o.uStarSize * f * l, m = o.uStarSize * f, h = Mn(lt, ut, m), g = st * Math.max(c, l), _ = Math.max(c, l * .5), v = Math.max(p, J(g, _, h)), y = Math.max(p, l * .1), b = J(1, Math.max(.08, en(0, lt, m)), Mn(lt * .75, lt, m)), x = Math.max(y * .45, u * .5), S = Math.max(v * .45, u), C = en(ut, 1.75, m), w = o.uGlareSize * J(1, f, o.uSizeVar) * l, T = Math.max(p + w, ct * Math.max(c, l)), E = Math.max(p + w, l * .1), D = Math.max(E * .36, u * .5), O = Math.max(T * .36, u) * C * +(o.uGlareSize > 0 && o.uGlareStr > 0), k = Math.max(x, D) * dt, A = Math.ceil(Math.max(k, S * dt, O * dt) / Math.PI * r), j = t.u * n, M = t.v * r, N = o.uBright * J(1, s ** 3 * 3, o.uBrightVar), ee = o.uGlareStr * J(1, d ** 8, o.uGlareVar), P = Fn(J(.5, t.rColor, o.uColorVar)), te = Math.floor(j - A), ne = Math.ceil(j + A), F = Math.max(0, Math.floor(M - A)), I = Math.min(r - 1, Math.ceil(M + A)), re = Math.max(Math.sin(t.v * Math.PI), .015);
		for (let i = F; i <= I; i += 1) for (let o = te; o <= ne; o += 1) {
			let s = dn(o, n), c = (s + .5) / n, l = (i + .5) / r;
			if (!an(c, l, a)) continue;
			let u = rn(c, t.u) * U * re, d = (l - t.v) * Math.PI, f = u * u + d * d, p = (Math.exp(-f / Math.max(x * x * 2, 1e-10)) * b + Math.exp(-f / Math.max(D * D * 2, 1e-10)) * C * ee) * N;
			p <= 1e-6 || In(e, n, s, i, X(P, p));
		}
	});
}
function zn(e, t, n, r) {
	if (r <= 1) return e;
	let i = Math.max(1, Math.floor(t / r)), a = Math.max(1, Math.floor(n / r)), o = new Float32Array(i * a * 4), s = r * r;
	for (let n = 0; n < a; n += 1) for (let a = 0; a < i; a += 1) {
		let c = (n * i + a) * 4;
		for (let i = 0; i < r; i += 1) for (let s = 0; s < r; s += 1) {
			let l = ((n * r + i) * t + a * r + s) * 4;
			o[c] += e[l], o[c + 1] += e[l + 1], o[c + 2] += e[l + 2], o[c + 3] += e[l + 3];
		}
		o[c] /= s, o[c + 1] /= s, o[c + 2] /= s, o[c + 3] /= s;
	}
	return o;
}
function Bn(e, t, n) {
	if (t.uDensity <= 0 || t.uBright <= 0) return [
		0,
		0,
		0
	];
	let r = Ft(e), i = pn(t), a = vn(t, n), o = a / Math.PI, s = L(r.v - o, 0, 1), c = L(r.v + o, 0, 1), l = fn(s), u = fn(c), d = Math.max(0, Math.floor(l * i.rows) - Qe), f = Math.min(i.rows - 1, Math.floor(u * i.rows) + Qe), p = Math.max(Math.sin(L(r.v, .001, .999) * Math.PI), .015), m = Math.min(1, a / (U * p) + Qe / i.columns), h = Math.floor((r.u - m) * i.columns) - Qe, g = Math.ceil((r.u + m) * i.columns) + Qe, _ = Math.PI / Math.max(1, n), v = Math.PI / ft, y = [
		0,
		0,
		0
	];
	for (let n = d; n <= f; n += 1) for (let r = h; r <= g; r += 1) {
		let a = gn(i, r, n, t.uLargeStarRarity);
		if (!a) continue;
		let o = mn(a.rSize, a.rSizeGate, t.uLargeStarRarity), s = a.rBright + (Math.max(a.rBright, o) - a.rBright) * ht, c = a.rGlare + (Math.max(a.rGlare, o) - a.rGlare) * gt, l = J(1, J(.1, 1, o), t.uSizeVar), u = t.uStarSize * l * v, d = t.uStarSize * l, f = Math.max(u, v * .1), p = Math.max(f * .45, _ * .5), m = J(1, Math.max(.08, en(0, lt, d)), Mn(lt * .75, lt, d)), h = en(ut, 1.75, d), g = t.uGlareSize * J(1, l, t.uSizeVar) * v, b = Math.max(u + g, v * .1), x = Math.max(b * .36, _ * .5), S = nn(e[0] * a.x + e[1] * a.y + e[2] * a.z), C = Math.exp(-S / Math.max(p * p * 2, 1e-10)) * m, w = t.uGlareStr * J(1, c ** 8, t.uGlareVar), T = Math.exp(-S / Math.max(x * x * 2, 1e-10)) * h * w, E = t.uBright * J(1, s ** 3 * 3, t.uBrightVar), D = (C + T) * E;
		D <= 1e-6 || (y = Y(y, X(Fn(J(.5, a.rColor, t.uColorVar)), D)));
	}
	return y;
}
function Vn(e, t, n = Math.floor(yt / 2)) {
	let r = Zt(t);
	if (!sn(e, r.clip)) return [
		0,
		0,
		0,
		0
	];
	let i = Gn(Pn(e, r), Bn(e, r.stars, n), r.nebula.uNebulaExposure);
	return [
		i[0],
		i[1],
		i[2],
		1
	];
}
function Hn(e, t, n = {}) {
	return Vn(e, t, n.sampleHeight);
}
function Un(e, t, n, r = {}) {
	let i = Zt(e), a = Dt(i.quality), o = Math.max(1, Math.floor(r.budgetBytes ?? a.budgetBytes)), s = Math.max(1, Math.floor(r.maxTextureSize ?? 8192)), c = qt({
		accumulationBytes: r.accumulationBytes,
		budgetBytes: o,
		clip: i.clip,
		height: n,
		maxTextureSize: s,
		residentBytesPerPixel: r.residentBytesPerPixel,
		width: t
	});
	return de(JSON.stringify({
		height: n,
		layout: {
			allocation: c.allocation,
			accumulationBytes: r.accumulationBytes ?? nt,
			columns: c.columns,
			contentHeight: c.contentHeight,
			contentWidth: c.contentWidth,
			coverage: c.coverage,
			guard: c.guard,
			maxTextureSize: s,
			qualityScale: c.qualityScale,
			rows: c.rows,
			residentBytesPerPixel: r.residentBytesPerPixel ?? rt,
			storageHeight: c.storageHeight,
			storageWidth: c.storageWidth,
			supersample: c.supersample
		},
		params: i,
		width: t
	}));
}
function Wn(e, t) {
	return e.map((e) => 1 - Math.exp(-Math.max(0, e) * Math.max(t, .001)));
}
function Gn(e, t, n) {
	let r = Wn(e, n), i = [
		.004,
		.005,
		.011
	], a = Wn(i, 1), o = Wn(Y(i, t), 1);
	return Y(r, [
		Math.max(o[0] - a[0], 0),
		Math.max(o[1] - a[1], 0),
		Math.max(o[2] - a[2], 0)
	]);
}
function Kn(e, t, n, r, i, a, o, s) {
	for (let c = 0; c < o; c += 1) {
		let l = (c + .5) / o * n - .5, u = Math.floor(l), d = Math.max(0, u), f = Math.min(n - 1, u + 1), p = l - u, m = d * t * 4, h = f * t * 4;
		for (let n = 0; n < a; n += 1) {
			let o = (c * a + n) * 4, l = (n + .5) / a * t - .5, u = Math.floor(l), d = u + 1, f = l - u, g = dn(u, t) * 4, _ = dn(d, t) * 4, v = m + g, y = m + _, b = h + g, x = h + _, S = J(J(e[v], e[y], f), J(e[b], e[x], f), p), C = J(J(e[v + 1], e[y + 1], f), J(e[b + 1], e[x + 1], f), p), w = J(J(e[v + 2], e[y + 2], f), J(e[b + 2], e[x + 2], f), p), T = J(J(e[v + 3], e[y + 3], f), J(e[b + 3], e[x + 3], f), p), E = Math.max(r[o], r[o + 1], r[o + 2]);
			if (T <= 0 && E <= 0) {
				i[o] = 0, i[o + 1] = 0, i[o + 2] = 0, i[o + 3] = 0;
				continue;
			}
			let [D, O, k] = oe(Gn([
				S,
				C,
				w
			], [
				r[o],
				r[o + 1],
				r[o + 2]
			], s.nebula.uNebulaExposure));
			i[o] = D, i[o + 1] = O, i[o + 2] = k, i[o + 3] = 255;
		}
	}
}
function qn(e, t = yt, n = Math.floor(t / 2)) {
	let r = Zt(e), i = Dt(r.quality), a = Math.min(t, vt), o = Math.max(1, Math.floor(a / 2)), s = qt({
		budgetBytes: i.budgetBytes,
		clip: r.clip,
		height: o,
		maxTextureSize: yt,
		residentBytesPerPixel: tt,
		width: a
	}), c = new Float32Array(a * o * 4), l = new Uint8ClampedArray(t * n * 4), u = Lt(r.clip), d = Ln(t), f = t * d, p = n * d, m = new Float32Array(f * p * 4);
	return s.descriptors.forEach((e) => {
		let t = on(e.uvMin.x, e.uvSize.x, a), n = Math.max(0, Math.floor(e.uvMin.y * o)), i = Math.min(o - 1, Math.ceil((e.uvMin.y + e.uvSize.y) * o));
		for (let e = n; e <= i; e += 1) {
			let n = (e + .5) / o;
			t.forEach(({ end: t, start: i }) => {
				for (let o = i; o <= t; o += 1) {
					let t = (o + .5) / a;
					if (!an(t, n, u)) continue;
					let i = Pn(Nt(t, n), r), s = (e * a + o) * 4;
					c[s] = i[0], c[s + 1] = i[1], c[s + 2] = i[2], c[s + 3] = 1;
				}
			});
		}
	}), Rn(m, r, f, p, n), Kn(c, a, o, zn(m, f, p, d), l, t, n, r), {
		data: l,
		height: n,
		width: t
	};
}
//#endregion
//#region evaluator.ts
var Jn = Math.PI * 2;
function Yn(e, t, n) {
	return e + (t - e) * n;
}
function Xn(e) {
	return e.map((e) => ({
		alpha: L(e.opacity / 100),
		color: ae(e.color),
		midpoint: L((e.midpoint ?? 50) / 100, .01, .99),
		t: L(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function Zn(e, t) {
	return e <= t ? e / Math.max(t * 2, 1e-5) : .5 + (e - t) / Math.max((1 - t) * 2, 1e-5);
}
function Qn(e, t) {
	if (e.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = L(t), r = e[0], i = e[e.length - 1];
	if (n <= r.t) return [...r.color, r.alpha];
	if (n >= i.t) return [...i.color, i.alpha];
	for (let t = 0; t < e.length - 1; t += 1) {
		let r = e[t], i = e[t + 1];
		if (n < r.t || n > i.t) continue;
		let a = i.t - r.t, o = Zn(a <= 0 ? 0 : (n - r.t) / a, r.midpoint);
		return [
			Yn(r.color[0], i.color[0], o),
			Yn(r.color[1], i.color[1], o),
			Yn(r.color[2], i.color[2], o),
			Yn(r.alpha, i.alpha, o)
		];
	}
	return [...i.color, i.alpha];
}
function $n(e) {
	let t = e * Math.PI / 180;
	return [
		Math.sin(t),
		Math.cos(t),
		0
	];
}
function er(e, t) {
	let n = $n(t.rotation), r = e[0] * n[0] + e[1] * n[1] + e[2] * n[2];
	return Qn(Xn(t.stops), r * .5 + .5);
}
function tr(e, t, n) {
	let r = L((n - e) / Math.max(t - e, 1e-5));
	return r * r * (3 - 2 * r);
}
function nr(e) {
	return e * e;
}
function rr(e) {
	let t = L(e), n = [
		1,
		.12,
		.05
	];
	return n = ir(n, [
		1,
		.55,
		.1
	], tr(0, .28, t)), n = ir(n, [
		1,
		.93,
		.6
	], tr(.22, .45, t)), n = ir(n, [
		1,
		1,
		1
	], tr(.42, .6, t)), n = ir(n, [
		.55,
		.8,
		1
	], tr(.62, .85, t)), n = ir(n, [
		.35,
		.5,
		1
	], tr(.85, 1, t)), n;
}
function ir(e, t, n) {
	return [
		Yn(e[0], t[0], n),
		Yn(e[1], t[1], n),
		Yn(e[2], t[2], n)
	];
}
function ar(e, t) {
	return [
		e[0] * t[0],
		e[1] * t[1],
		e[2] * t[2]
	];
}
function or(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function sr(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function cr(e, t) {
	return ir(t, ar(e, ir([
		1,
		1,
		1
	], t, .82)), .82);
}
function lr(e, t) {
	let n = (e - .5) * Jn, r = (.5 - t) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function ur(e, t) {
	let n = (e - .5) * Jn, r = (t - .5) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function dr(e) {
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
function fr(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function pr(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function mr(e, t, n) {
	let r = dr(e), i = dr(t), a = dr(pr([
		0,
		1,
		0
	], i)), o = dr(pr(i, a)), s = Math.max(fr(r, i), 1e-6), c = fr(r, a) / s / Math.max(n, 1e-4), l = fr(r, o) / s / Math.max(n, 1e-4);
	return {
		x: c,
		y: l,
		d: Math.hypot(c, l)
	};
}
function hr(e, t, n) {
	if (t <= 0) return e;
	let r = Math.max(1e-4, n), i = [
		Math.sin((e[1] * r + .23) * Jn) * Math.cos((e[2] * r + .41) * Jn),
		Math.cos((e[2] * r + .17) * Jn) * Math.sin((e[0] * r + .37) * Jn),
		Math.sin((e[0] * r - .31) * Jn) * Math.cos((e[1] * r + .29) * Jn)
	];
	return dr([
		e[0] + i[0] * t,
		e[1] + i[1] * t,
		e[2] + i[2] * t
	]);
}
function gr(e, t) {
	return 1 - L(e[0] * t[0] + e[1] * t[1] + e[2] * t[2], -1, 1);
}
function _r(e, t) {
	if (t.anchors.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = hr(e, L(t.amplitude, 0, .6), Math.max(1e-4, t.frequency)), r = 0, i = 0, a = 0, o = 0;
	return t.anchors.forEach((e) => {
		let s = gr(n, lr(e.x, e.y)), c = t.mode === "gaussian" ? Math.exp(-(s * s) / (2 * (.46 / t.power) ** 2)) : 1 / (s + 5e-4) ** t.power, l = ae(e.color);
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
function vr(e, t, n) {
	return [
		Yn(e[0], t[0], n),
		Yn(e[1], t[1], n),
		Yn(e[2], t[2], n),
		Yn(e[3], t[3], n)
	];
}
function yr(e, t, n) {
	let r = (t % e.width + e.width) % e.width, i = (Math.min(e.height - 1, Math.max(0, n)) * e.width + r) * 4;
	return [
		R((e.data[i] ?? 0) / 255),
		R((e.data[i + 1] ?? 0) / 255),
		R((e.data[i + 2] ?? 0) / 255),
		(e.data[i + 3] ?? 0) / 255
	];
}
function br(e, t, n) {
	let r = Math.min(e.width - 1, Math.max(0, t)), i = (Math.min(e.height - 1, Math.max(0, n)) * e.width + r) * 4, a = e.pixels?.[i] ?? 0, o = e.pixels?.[i + 1] ?? 0, s = e.pixels?.[i + 2] ?? 0, c = e.pixels?.[i + 3] ?? 255;
	return [
		R(a / 255),
		R(o / 255),
		R(s / 255),
		c / 255
	];
}
function xr(e, t) {
	let n = t.placement;
	if (!n || !t.pixels || t.width <= 0 || t.height <= 0) return [
		0,
		0,
		0,
		0
	];
	let r = ze(e, n);
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
	return vr(vr(br(t, c, l), br(t, u, l), f), vr(br(t, c, d), br(t, u, d), f), p);
}
function Sr(e, t) {
	let n = We(t), r = dr(e), i = dr(n.centerDirection), a = fr(r, i), o = Math.acos(L(a, -1, 1)), s = Math.max(n.angularRadius, 1e-4), c = o / s;
	if (n.colorMode === "gradient") return c > 1 ? [
		0,
		0,
		0,
		0
	] : Qn(Xn(n.stops), c);
	let l = mr(e, i, s), u = l.d, d = ae(n.lightColor), f = n.brightness, p = L(1 - u / n.coreRadius) ** +n.coreSoftness, m = L(1 - u / n.glowSize) ** 2 * n.glowStrength, h = L(1 - u / n.glareSize) ** 1.15 * n.glareStrength, g = (p + m + h) * f, _ = or(d, g);
	_ = sr(_, [
		Math.max(g - 1, 0),
		Math.max(g - 1, 0),
		Math.max(g - 1, 0)
	]);
	let v = Math.max(n.haloInnerWidth, 1e-4), y = Math.max(n.haloOuterWidth, 1e-4), b = u - n.haloRadius, x = Math.exp(-nr(b / (b < 0 ? v : y))), S = cr(ir([
		1,
		1,
		1
	], rr(L((u - (n.haloRadius - v)) / (v + y))), n.dispersion), d), C = x * n.haloStrength * f;
	_ = sr(_, or(S, C)), _ = sr(_, or([
		1,
		1,
		1
	], Math.max(C - 1.2, 0) * .22));
	let w = Math.abs(l.y), T = Math.abs(l.x), E = Math.exp(-nr((T - n.haloRadius) / Math.max(n.dogSpread, 1e-4))) * Math.exp(-nr(w / Math.max(n.dogSpread * .72, 1e-4))), D = tr(n.haloRadius, n.haloRadius + Math.max(n.dogStretch, 1e-4), T) * (1 - tr(n.haloRadius + Math.max(n.dogStretch, 1e-4), n.haloRadius + Math.max(n.dogStretch * 2.2, 1e-4), T)) * Math.exp(-nr(w / Math.max(n.dogSpread * .9, 1e-4))), O = cr(ir([
		1,
		1,
		1
	], rr(L((T - (n.haloRadius - n.dogSpread * 1.4)) / Math.max(n.dogSpread * 3.5, 1e-4))), n.dispersion), d), k = (E + D * .28) * n.dogStrength * f;
	_ = sr(_, or(O, k)), _ = sr(_, or([
		1,
		1,
		1
	], Math.max(k - 1.1, 0) * .18));
	let A = L(Math.max(_[0], _[1], _[2]));
	return A <= 1e-5 ? [
		0,
		0,
		0,
		0
	] : [
		_[0] / A,
		_[1] / A,
		_[2] / A,
		A
	];
}
function Cr(e, t, n, r = {}) {
	let i = r.starfieldBakes?.get(e);
	if (i) {
		let e = Ft(t), n = (e.u % 1 + 1) % 1 * i.width - .5, r = L(e.v, 0, 1) * i.height - .5, a = Math.floor(n), o = Math.floor(r), s = a + 1, c = o + 1, l = n - a, u = r - o;
		return vr(vr(yr(i, a, o), yr(i, s, o), l), vr(yr(i, a, c), yr(i, s, c), l), u);
	}
	return Hn(t, n, { sampleHeight: r.sampleHeight });
}
function wr(e, t, n = {}) {
	return t.type === "gradient" ? er(e, t.params) : t.type === "field-gradient" ? _r(e, t.params) : t.type === "spot" ? Sr(e, t.params) : t.type === "starfield" ? Cr(t.id, e, t.params, n) : xr(e, t.params);
}
function Tr(e, t, n = {}) {
	return t.filter((e) => e.enabled).reverse().reduce((t, r) => {
		let i = r.type === "group" ? [...Tr(e, r.children, n), 1] : wr(e, r, n), a = L(i[3] * (r.opacity / 100));
		return ue(t, [
			i[0],
			i[1],
			i[2]
		], a, r.blendMode);
	}, [
		0,
		0,
		0
	]);
}
function Er(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = Er(n.children, t);
		if (e) return e;
	}
	return null;
}
function Dr(e, t, n = {}) {
	let r = fe(e), i = n.targetGroupId ? Er(r.nodes, n.targetGroupId) : null;
	return Tr(t, n.targetGroupId ? i ? [i] : [] : r.nodes, n);
}
//#endregion
//#region bake.ts
var Or = 1024, kr = "0.1.0", Ar = /* @__PURE__ */ new Map(), jr = /* @__PURE__ */ new Map();
function Mr(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function Nr(e, t) {
	return de(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: kr
	}));
}
function Pr() {
	Ar.clear(), jr.clear();
}
function Fr(e, t = []) {
	return e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Fr(e.children, t);
				return;
			}
			e.type === "starfield" && t.push(e);
		}
	}), t;
}
function Ir(e, t) {
	for (let n of e) {
		if (n.type !== "group") continue;
		if (n.id === t) return n;
		let e = Ir(n.children, t);
		if (e) return e;
	}
	return null;
}
function Lr(e, t, n, r, i) {
	let a = Fr(r ? Ir(e.nodes, r)?.children ?? [] : e.nodes);
	if (a.length === 0) return;
	let o = /* @__PURE__ */ new Map();
	return a.forEach((e) => {
		let r = i?.get(e.id);
		if (r) {
			o.set(e.id, r);
			return;
		}
		let a = Un(e.params, t, n), s = jr.get(a), c = s ?? qn(e.params, t, n);
		s || jr.set(a, c), o.set(e.id, c);
	}), o;
}
function Rr(e, t = {}) {
	let n = fe(e), r = Mr(t), i = r.cache ? Nr(n, r) : null;
	if (i) {
		let e = Ar.get(i);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: a, targetGroupId: o, width: s } = r, c = Lr(n, s, a, o, t.starfieldBakes), l = new Uint8ClampedArray(s * a * 4);
	for (let e = 0; e < a; e += 1) {
		let t = (e + .5) / a;
		for (let r = 0; r < s; r += 1) {
			let [i, u, d] = oe(Dr(n, ur((r + .5) / s, t), {
				sampleHeight: a,
				starfieldBakes: c,
				targetGroupId: o
			})), f = (e * s + r) * 4;
			l[f] = i, l[f + 1] = u, l[f + 2] = d, l[f + 3] = 255;
		}
	}
	let u = {
		data: l,
		height: a,
		width: s
	};
	return i && Ar.set(i, {
		...u,
		data: new Uint8ClampedArray(l)
	}), u;
}
//#endregion
//#region starfield-gpu-bake.ts
Math.PI * 2;
var zr = 8, Br = 2048, Vr = 1.75, Hr = 3.25, Ur = 1, Wr = 1.5, Gr = 8, Kr = .1, qr = 5, Jr = 12, Yr = .35, Xr = .25, Zr = 1.0005, Qr = 32, $r = new Float32Array([
	-1,
	-1,
	0,
	1,
	-1,
	0,
	-1,
	1,
	0,
	1,
	-1,
	0,
	1,
	1,
	0,
	-1,
	1,
	0
]);
function ei(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function ti(e) {
	let t = e.backend, n = t?.device, r = t?.gl;
	return typeof n?.limits?.maxTextureDimension2D == "number" ? n.limits.maxTextureDimension2D : r ? Number(r.getParameter(r.MAX_TEXTURE_SIZE)) : yt;
}
function Q(e, t) {
	let n = e[t];
	if (n?.isUniformNode) return n;
	let r = N(Number(n?.value ?? 0));
	return e[t] = r, r;
}
function ni(t, n) {
	let r = t[n], i = r?.value instanceof e.Vector2 ? r.value.clone() : new e.Vector2();
	if (r?.isUniformNode) return r;
	let a = N(i);
	return t[n] = a, a;
}
function ri(t, n) {
	let r = t[n], i = r?.value instanceof e.Vector3 ? r.value.clone() : new e.Vector3();
	if (r?.isUniformNode) return r;
	let a = N(i);
	return t[n] = a, a;
}
function ii(e) {
	let t = e.x.sub(.5).mul(o).mul(2), n = e.y.mul(o), r = k(n);
	return w(I(r.mul(k(t)), f(n), r.mul(f(t))));
}
function ai(e) {
	let t = x(e.y, 2), n = j(1, t);
	return F(e.x.add(n.mul(.5)), b(t, h(2).sub(t), n));
}
function oi(e) {
	return ii(ai(e));
}
function si(e) {
	let t = w(e);
	return F(c(t.x, t.z).div(o.mul(2)).add(.5), s(d(t.y, -1, 1)).div(o));
}
function ci(e, t) {
	return o.mul(v(t.y, 1e-6)).div(v(e.y, 1));
}
function li(e, t) {
	return v(v(e.negate(), e.sub(t)), 0);
}
function ui(e, t, n) {
	let r = e.sub(t), i = r.add(1), a = r.sub(1), o = li(r, n), s = li(i, n), c = li(a, n);
	return O(s.lessThan(o).and(s.lessThanEqual(c)), i, O(c.lessThan(o).and(c.lessThan(s)), a, r));
}
function di(e, t, n) {
	return F(ui(e.x, t.x, n.x).div(n.x), e.y.sub(t.y).div(n.y));
}
function fi(e) {
	return j(0, e.x).mul(j(e.x, 1)).mul(j(0, e.y)).mul(j(e.y, 1));
}
function pi(e) {
	let t = I(1, .55, .3), n = I(1, .96, .92), r = I(.7, .8, 1);
	return O(e.lessThan(.5), b(t, n, e.mul(2)), b(n, r, e.sub(.5).mul(2)));
}
function mi(e, t, n) {
	let r = D(d(e, 0, 1), qr), i = b(1, D(d(t, 0, 1), Jr), n);
	return r.mul(i);
}
function hi(e, t, n, r) {
	return b(1, b(Kr, 1, mi(e, t, n)), r);
}
function gi(e, t, n, r) {
	let o = d(t, 1, 8), s = v(n, .001), c = d(r, .001, .999), l = I(e).toVar(), u = h(.5).toVar(), f = h(0).toVar(), p = h(0).toVar();
	return a(8, ({ i: e }) => {
		i(h(e).lessThan(o), () => {
			let e = C(l, _(1), s, c).mul(.5).add(.5);
			f.addAssign(u.mul(e)), p.addAssign(u), l.mulAssign(s), u.mulAssign(c);
		});
	}), f.div(v(p, 1e-4));
}
function _i(n, o) {
	let s = jn(n.nebulaField), c = Array.from({ length: zr }, (t, n) => {
		let r = s.anchors[n];
		return new e.Vector3(...r?.dir ?? [
			0,
			1,
			0
		]);
	}), l = Array.from({ length: zr }, (t, n) => {
		let r = s.anchors[n];
		return new e.Vector3(...r?.color ?? [
			0,
			0,
			0
		]);
	}), u = n.nebula, f = {
		uAnchorCount: { value: Math.min(s.anchors.length, zr) },
		uBaseScale: { value: u.uBaseScale },
		uBlend: { value: +(s.blend === "gaussian") },
		uCloudCore: { value: new e.Vector3(...u.uCloudCore) },
		uCloudHighlight: { value: new e.Vector3(...u.uCloudHighlight) },
		uCloudShadow: { value: new e.Vector3(...u.uCloudShadow) },
		uColorWarpAmp: { value: u.uColorWarpAmp },
		uColorWarpFreq: { value: u.uColorWarpFreq },
		uContrast: { value: u.uContrast },
		uCoverage: { value: u.uCoverage },
		uDensity: { value: u.uDensity },
		uLightFocus: { value: u.uLightFocus },
		uLightIntensity: { value: u.uLightIntensity },
		uLightLining: { value: u.uLightLining },
		uNebulaExposure: { value: u.uNebulaExposure },
		uNebulaStrength: { value: u.uNebulaStrength },
		uOctaves: { value: u.uOctaves },
		uOpacity: { value: u.uOpacity },
		uPower: { value: s.power },
		uSeed: { value: u.uSeed },
		uSigma: { value: s.sigma },
		uSoftness: { value: u.uSoftness },
		uTileUvMin: { value: new e.Vector2(o.storageUvMin.x, o.storageUvMin.y) },
		uTileUvSize: { value: new e.Vector2(o.storageUvSize.x, o.storageUvSize.y) }
	}, g = ni(f, "uTileUvMin"), _ = ni(f, "uTileUvSize"), y = Q(f, "uAnchorCount"), x = Q(f, "uBlend"), S = Q(f, "uPower"), C = Q(f, "uSigma"), E = Q(f, "uColorWarpAmp"), k = Q(f, "uColorWarpFreq"), j = Q(f, "uSeed"), M = Q(f, "uCoverage"), N = Q(f, "uDensity"), P = Q(f, "uSoftness"), te = Q(f, "uContrast"), ne = Q(f, "uBaseScale"), F = Q(f, "uOctaves"), ie = Q(f, "uOpacity"), L = Q(f, "uLightFocus"), R = Q(f, "uLightLining"), z = Q(f, "uLightIntensity");
	Q(f, "uNebulaExposure");
	let ae = Q(f, "uNebulaStrength"), oe = ri(f, "uCloudShadow"), se = ri(f, "uCloudHighlight"), ce = ri(f, "uCloudCore"), le = ee(c, "vec3"), ue = ee(l, "vec3"), de = new t({
		depthTest: !1,
		depthWrite: !1
	});
	return de.uniforms = f, de.colorNode = r(() => {
		let e = T.xy.mul(.5).add(.5), t = oi(g.add(e.mul(_))), n = d(F, 1, 8), r = t.mul(v(k, .001)).add(I(j, j.mul(.37), j.mul(-.21))), o = I(gi(r, n, 2.02, .52), gi(r.add(I(5.2, 1.3, 7.1)), n, 2.03, .5), gi(r.add(I(9.1, 8.4, 2.8)), n, 2.01, .51)).mul(2).sub(1), s = w(t.add(o.mul(v(E, 0)))), c = I(0).toVar(), l = h(0).toVar();
		a(zr, ({ i: e }) => {
			i(h(e).lessThan(y), () => {
				let t = w(le.element(e)), n = ue.element(e), r = h(1).sub(p(s, t)), i = h(1).div(D(r.add(1e-4), v(S, 1e-4))), a = m(r.mul(r).negate().div(v(1e-4, h(2).mul(C).mul(C)))), o = O(x.lessThan(.5), i, a);
				c.addAssign(n.mul(o)), l.addAssign(o);
			});
		}), c.assign(c.div(v(l, 1e-4)));
		let u = I(j.mul(13.17), j.mul(-7.31), j.mul(5.19)), f = t.mul(v(ne, .001)).add(u), ee = I(gi(f, n, 2.02, .5), gi(f.add(I(5.2, 1.3, 2.8)), n, 2.02, .5), gi(f.add(I(2.1, 4.7, 9.2)), n, 2.02, .5)), de = d(gi(f.add(ee.mul(3)), n, 2.02, .5), 0, 1), B = D(d(A(M, M.add(v(P, .001)), de), 0, 1), v(te, .05)), fe = D(d(v(v(c.r, c.g), c.b).mul(v(z, 0)), 0, 1), v(L, .001)), pe = D(v(b(b(oe, c.mul(se).mul(v(z, 0)), fe), ce, d(B.mul(.4), 0, 1)).add(c.mul(fe).mul(B.oneMinus()).mul(v(R, 0)).mul(v(z, 0))).mul(v(N, 0)), I(0)), I(.92)), me = d(B.mul(ie), 0, 1);
		return re(v(I(.004, .005, .011).add(pe.mul(me).mul(v(ae, 0))), I(0)), 1);
	})(), de;
}
function vi(t, n, r) {
	let i = xn(t.stars, n, r, { includeSeamCopies: !0 }), a = [], o = [], s = [], c = [], l = [];
	i.forEach((e) => {
		a.push(e.x, e.y, e.z), o.push(e.u, e.v), s.push(e.rSize, e.rBright, e.rGlare, e.rColor), c.push(e.rSizeGate), l.push(e.classId);
	});
	let u = new e.InstancedBufferGeometry();
	return u.setAttribute("position", new e.BufferAttribute($r, 3)), u.setAttribute("iDirection", new e.InstancedBufferAttribute(new Float32Array(a), 3)), u.setAttribute("iUv", new e.InstancedBufferAttribute(new Float32Array(o), 2)), u.setAttribute("iRandoms", new e.InstancedBufferAttribute(new Float32Array(s), 4)), u.setAttribute("iSizeGate", new e.InstancedBufferAttribute(new Float32Array(c), 1)), u.setAttribute("iClass", new e.InstancedBufferAttribute(new Float32Array(l), 1)), u.instanceCount = l.length, u;
}
function yi(n, i, a = {}) {
	let c = n.stars, u = a.bakeWidth ?? i.storageSize.width, f = a.bakeHeight ?? i.storageSize.height, g = {
		uBakeSize: { value: new e.Vector2(u, f) },
		uBright: { value: c.uBright },
		uBrightVar: { value: c.uBrightVar },
		uColorVar: { value: c.uColorVar },
		uGlareSize: { value: c.uGlareSize },
		uGlareStr: { value: c.uGlareStr },
		uGlareVar: { value: c.uGlareVar },
		uLargeStarRarity: { value: c.uLargeStarRarity },
		uOutputSize: { value: new e.Vector2(i.storageSize.width, i.storageSize.height) },
		uDisplayPixelAngle: { value: a.displayPixelAngle ?? Math.PI / Br },
		uSizeVar: { value: c.uSizeVar },
		uStarSize: { value: c.uStarSize },
		uTileUvMin: { value: new e.Vector2(i.storageUvMin.x, i.storageUvMin.y) },
		uTileUvSize: { value: new e.Vector2(i.storageUvSize.x, i.storageUvSize.y) }
	}, _ = ni(g, "uBakeSize"), x = ni(g, "uTileUvMin"), S = ni(g, "uTileUvSize"), C = Q(g, "uDisplayPixelAngle"), E = Q(g, "uStarSize"), O = Q(g, "uSizeVar"), M = Q(g, "uLargeStarRarity"), N = Q(g, "uBright"), ee = Q(g, "uBrightVar"), P = Q(g, "uGlareSize"), te = Q(g, "uGlareStr"), I = Q(g, "uGlareVar"), ie = Q(g, "uColorVar"), L = ne("vec2", "vStarBakeUv"), R = ne("vec3", "vStarBakeDirection"), z = ne("vec4", "vStarBakeRandoms"), ae = ne("float", "vStarBakeSizeGate"), oe = new t({
		blending: e.AdditiveBlending,
		depthTest: !1,
		depthWrite: !1,
		transparent: !0
	});
	return oe.uniforms = g, oe.vertexNode = r(() => {
		let e = l("iDirection", "vec3"), t = l("iUv", "vec2"), n = l("iRandoms", "vec4"), r = l("iSizeGate", "float"), i = ci(_, S), a = hi(n.x, r, M, O), s = E.mul(a).mul(C), c = E.mul(a), u = A(Ur, Wr, c).oneMinus(), d = v(v(s, b(h(Vr).mul(C), C.mul(.5), u)).mul(.45), C.mul(.5)), f = A(Wr, 1.75, c), p = P.mul(b(1, a, O)).mul(C), m = v(v(d, v(v(s.add(p), h(Hr).mul(C)).mul(.36), C.mul(.5)).mul(f).mul(j(1e-6, P)).mul(j(1e-6, te))), i).mul(Gr), g = v(k(t.y.mul(o)), .015), w = F(y(1.5, m.div(o.mul(2).mul(g))), m.div(o)), D = t.add(T.xy.mul(w)), N = D.sub(x).div(S);
		return L.assign(D), R.assign(e), z.assign(n), ae.assign(r), re(N.mul(2).sub(1), 0, 1);
	})(), oe.colorNode = r(() => {
		let e = s(d(p(oi(L), w(R)), -1, 1)), t = mi(z.x, ae, M), n = hi(z.x, ae, M, O), r = E.mul(n).mul(C), i = E.mul(n), a = A(Ur * .75, Ur, i).oneMinus(), o = A(Wr, 1.75, i), c = v(r, C.mul(.1)), l = b(1, v(.08, A(0, Ur, i)), a), u = v(c.mul(.45), C.mul(.5)), f = m(e.mul(e).negate().div(v(u.mul(u).mul(2), 1e-10))).mul(l), h = P.mul(b(1, n, O)).mul(C), g = v(v(r.add(h), C.mul(.1)).mul(.36), C.mul(.5)), _ = m(e.mul(e).negate().div(v(g.mul(g).mul(2), 1e-10))).mul(o).mul(j(1e-6, P)).mul(j(1e-6, te)), y = b(z.y, v(z.y, t), O.mul(Yr)), x = b(z.z, v(z.z, t), O.mul(Xr)), S = te.mul(b(1, D(x, 8), I)), T = N.mul(b(1, D(y, 3).mul(3), ee));
		return re(pi(b(.5, z.w, ie)).mul(f.add(_.mul(S))).mul(T), 1);
	})(), oe;
}
function bi(n, o, s, c, l, u) {
	let f = {
		uExposure: { value: 1 },
		uSourcePerTarget: { value: u },
		uSourceSize: { value: new e.Vector2(o, s) },
		uSourceTexture: { value: n },
		uTargetSize: { value: new e.Vector2(c, l) }
	}, p = P(n), _ = ni(f, "uSourceSize"), y = ni(f, "uTargetSize"), b = Q(f, "uSourcePerTarget"), x = Q(f, "uExposure"), S = new t({
		depthTest: !1,
		depthWrite: !1
	});
	return S.uniforms = {
		...f,
		uSourceTexture: p
	}, S.colorNode = r(() => {
		let e = g(te().mul(y)), t = g(b.add(.5)), n = re(0).toVar(), r = h(0).toVar();
		a(8, ({ i: o }) => {
			a(8, ({ i: a }) => {
				i(h(a).lessThan(t).and(h(o).lessThan(t)), () => {
					let t = e.mul(b).add(F(h(a), h(o))).add(.5);
					n.addAssign(M(p, t.div(_))), r.addAssign(1);
				});
			});
		});
		let o = n.rgb.div(v(r, 1)), s = I(.004, .005, .011), c = I(1).sub(m(s.mul(x).negate())), l = v(I(1).sub(m(s.add(o).mul(x).negate())).sub(c), I(0));
		return re(l, d(v(v(l.r, l.g), l.b), 0, 1));
	})(), S;
}
function xi(n, i, o, s) {
	let c = {
		uContentUvMin: { value: new e.Vector2(o.uvMin.x, o.uvMin.y) },
		uContentUvSize: { value: new e.Vector2(o.uvSize.x, o.uvSize.y) },
		uHasBottomNeighbor: { value: +!!o.hasBottomNeighbor },
		uHasLeftNeighbor: { value: +!!o.hasLeftNeighbor },
		uHasRightNeighbor: { value: +!!o.hasRightNeighbor },
		uHasTopNeighbor: { value: +!!o.hasTopNeighbor },
		uNebulaExposure: { value: s.nebula.uNebulaExposure },
		uNebulaTexture: { value: n },
		uStorageUvMin: { value: new e.Vector2(o.storageUvMin.x, o.storageUvMin.y) },
		uStorageUvSize: { value: new e.Vector2(o.storageUvSize.x, o.storageUvSize.y) },
		uStarTexture: { value: i }
	}, l = P(n), u = P(i), f = ni(c, "uContentUvMin"), p = ni(c, "uContentUvSize"), g = ni(c, "uStorageUvMin"), _ = ni(c, "uStorageUvSize"), y = Q(c, "uHasLeftNeighbor"), x = Q(c, "uHasRightNeighbor"), S = Q(c, "uHasTopNeighbor"), C = Q(c, "uHasBottomNeighbor"), w = Q(c, "uNebulaExposure"), E = new t({
		depthTest: !1,
		depthWrite: !1,
		transparent: !0
	}), D = +(o.uvSize.x >= .999), k = .28;
	return E.blending = e.CustomBlending, E.blendEquation = e.AddEquation, E.blendSrc = e.OneFactor, E.blendDst = e.OneFactor, E.blendEquationAlpha = e.AddEquation, E.blendSrcAlpha = e.OneFactor, E.blendDstAlpha = e.OneMinusSrcAlphaFactor, c.uNebulaTexture = l, c.uStarTexture = u, E.uniforms = c, E.colorNode = r(() => {
		let e = T.xy.mul(.5).add(.5), t = F(e.x, h(1).sub(e.y)), n = v(h(1).sub(A(0, k, t.y)), h(1).sub(A(0, k, h(1).sub(t.y)))).mul(D), r = di(t, g, _), i = d(r, 0, 1), o = fi(r), s = F(ui(t.x, f.x, p.x).div(p.x), t.y.sub(f.y).div(p.y)), c = v(_.sub(p).div(p.mul(2)), F(0)), E = v(c, F(1e-6)), j = O(y.greaterThan(.5), A(E.x.negate(), E.x, s.x), 1), N = O(x.greaterThan(.5), h(1).sub(A(h(1).sub(E.x), h(1).add(E.x), s.x)), 1), ee = O(c.x.lessThanEqual(0), 1, j.mul(N)), P = O(S.greaterThan(.5), A(E.y.negate(), E.y, s.y), 1), te = O(C.greaterThan(.5), h(1).sub(A(h(1).sub(E.y), h(1).add(E.y), s.y)), 1), ne = O(c.y.lessThanEqual(0), 1, P.mul(te)), ie = d(ee.mul(ne).mul(o), 0, 1), L = M(l, i).rgb, R = I(0).toVar(), z = h(0).toVar();
		a(32, ({ i: e }) => {
			let n = di(F(h(e).add(.5).div(32), t.y), g, _), r = d(n, 0, 1), i = fi(n);
			R.addAssign(M(l, r).rgb.mul(i)), z.addAssign(i);
		});
		let ae = b(L, R.div(v(z, 1)), n), oe = M(u, i);
		return re(I(1).sub(m(ae.mul(v(w, .001)).negate())).add(oe.rgb), 1).mul(ie);
	})(), E.name = `Starfield composite ${o.id}`, E;
}
function Si(t) {
	return ji(t).map(({ end: n, offset: r, skyV0: i, skyV1: a, start: o }) => {
		let s = (o + r - t.storageUvMin.x) / t.storageUvSize.x, c = (n + r - t.storageUvMin.x) / t.storageUvSize.x, l = (i - t.storageUvMin.y) / t.storageUvSize.y, u = (a - t.storageUvMin.y) / t.storageUvSize.y, d = o * 2 - 1, f = n * 2 - 1, p = 1 - i * 2, m = 1 - a * 2, h = new e.BufferGeometry();
		return h.setAttribute("position", new e.BufferAttribute(new Float32Array([
			d,
			m,
			0,
			f,
			m,
			0,
			d,
			p,
			0,
			f,
			m,
			0,
			f,
			p,
			0,
			d,
			p,
			0
		]), 3)), h.setAttribute("uv", new e.BufferAttribute(new Float32Array([
			s,
			u,
			c,
			u,
			s,
			l,
			c,
			u,
			c,
			l,
			s,
			l
		]), 2)), h;
	});
}
function Ci(e) {
	return Math.max(8, Math.floor(e / 2));
}
function wi(t, n) {
	let r = Ci(Qr), i = n.uvMin, a = n.uvSize, o = Math.max(0, Math.min(1, i.y)), s = Math.max(0, Math.min(1, i.y + a.y)), c = Math.max(s - o, 1e-4), l = Math.max(3, Math.ceil(Qr * Math.max(a.x, .001))), u = Math.max(2, Math.ceil(r * Math.max(c, .001))), d = (i.x - .25) * Math.PI * 2, f = a.x * Math.PI * 2, p = o * Math.PI, m = c * Math.PI;
	return new e.SphereGeometry(Zr, l, u, d, f, p, m);
}
function Ti(t) {
	let n = t.uvMin.x, r = t.uvMin.y, i = t.uvMin.x + t.uvSize.x, a = t.uvMin.y + t.uvSize.y, o = t.storageUvMin.x, s = t.storageUvMin.y, c = t.storageUvMin.x + t.storageUvSize.x, l = t.storageUvMin.y + t.storageUvSize.y, u = t.hasLeftNeighbor ? o : n, d = t.hasRightNeighbor ? c : i, f = t.hasTopNeighbor ? s : r, p = t.hasBottomNeighbor ? l : a;
	return {
		uvMin: new e.Vector2(u, f),
		uvSize: new e.Vector2(d - u, p - f)
	};
}
function Ei(n, i, a) {
	let o = P(n), s = N(new e.Vector2(i.uvMin.x, i.uvMin.y)), c = N(new e.Vector2(i.uvSize.x, i.uvSize.y)), l = N(new e.Vector2(i.storageUvMin.x, i.storageUvMin.y)), u = N(new e.Vector2(i.storageUvSize.x, i.storageUvSize.y)), f = N(Math.max(.001, a)), p = new t({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide
	});
	return p.colorNode = r(() => {
		let e = M(o, d(di(s.add(te().mul(c)), l, u), 0, 1));
		return re(I(1).sub(m(v(e.rgb, I(0)).mul(f).negate())), 1);
	})(), p.name = `Starfield live nebula patch ${i.id}`, p;
}
function Di(n, i) {
	let a = P(n), o = N(new e.Vector2(i.uvMin.x, i.uvMin.y)), s = N(new e.Vector2(i.uvSize.x, i.uvSize.y)), c = N(new e.Vector2(i.storageUvMin.x, i.storageUvMin.y)), l = N(new e.Vector2(i.storageUvSize.x, i.storageUvSize.y)), u = N(+!!i.hasLeftNeighbor), f = N(+!!i.hasRightNeighbor), p = N(+!!i.hasTopNeighbor), m = N(+!!i.hasBottomNeighbor), g = ne("vec3", `vStarfieldPatchDirection${i.x}_${i.y}`), _ = new t({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		transparent: !0
	});
	return _.blending = e.CustomBlending, _.blendEquation = e.AddEquation, _.blendSrc = e.OneFactor, _.blendDst = e.OneFactor, _.blendEquationAlpha = e.AddEquation, _.blendSrcAlpha = e.OneFactor, _.blendDstAlpha = e.OneMinusSrcAlphaFactor, _.vertexNode = r(() => (g.assign(T), S))(), _.colorNode = r(() => {
		let e = si(g), t = F(ui(e.x, o.x, s.x).div(s.x), e.y.sub(o.y).div(s.y)), n = di(e, c, l), r = d(n, 0, 1), i = fi(n), _ = v(l.sub(s).div(s.mul(2)), F(0)), y = v(_, F(1e-6)), b = O(u.greaterThan(.5), A(y.x.negate(), y.x, t.x), 1), x = O(f.greaterThan(.5), h(1).sub(A(h(1).sub(y.x), h(1).add(y.x), t.x)), 1), S = O(_.x.lessThanEqual(0), 1, b.mul(x)), C = O(p.greaterThan(.5), A(y.y.negate(), y.y, t.y), 1), w = O(m.greaterThan(.5), h(1).sub(A(h(1).sub(y.y), h(1).add(y.y), t.y)), 1), T = O(_.y.lessThanEqual(0), 1, C.mul(w)), E = d(S.mul(T), 0, 1);
		return M(a, r).mul(i).mul(E);
	})(), _.name = `Starfield live stars patch ${i.id}`, _;
}
function Oi(t, n) {
	let r = new e.Group();
	return r.name = `Starfield live patch group ${t.key}`, t.patches.forEach((t) => {
		let i = t.descriptor, a = wi(i, {
			uvMin: i.uvMin,
			uvSize: i.uvSize
		}), o = Ei(t.nebulaTexture, i, n.nebula.uNebulaExposure), s = new e.Mesh(a, o);
		s.frustumCulled = !1, s.renderOrder = 0, r.add(s);
	}), t.patches.forEach((t) => {
		let n = t.descriptor, i = wi(n, Ti(n)), a = Di(t.starTexture, n), o = new e.Mesh(i, a);
		o.frustumCulled = !1, o.renderOrder = .01, r.add(o);
	}), r;
}
function ki(t) {
	t.traverse((t) => {
		t instanceof e.Mesh && (t.geometry.dispose(), (Array.isArray(t.material) ? t.material : [t.material]).forEach((e) => {
			e.dispose();
		}));
	}), t.clear();
}
function Ai(e, t) {
	if (t >= 1) return [{
		end: 1,
		offset: 0,
		start: 0
	}];
	let n = (e % 1 + 1) % 1, r = n + t;
	return r <= 1 ? [{
		end: r,
		offset: e - n,
		start: n
	}] : [{
		end: 1,
		offset: e - n,
		start: n
	}, {
		end: r - 1,
		offset: e - n + 1,
		start: 0
	}];
}
function ji(e) {
	let t = e.hasLeftNeighbor ? e.storageUvMin.x : e.uvMin.x, n = e.hasRightNeighbor ? e.storageUvMin.x + e.storageUvSize.x : e.uvMin.x + e.uvSize.x, r = e.hasTopNeighbor ? e.storageUvMin.y : e.uvMin.y, i = e.hasBottomNeighbor ? e.storageUvMin.y + e.storageUvSize.y : e.uvMin.y + e.uvSize.y, a = Math.max(0, r), o = Math.min(1, i);
	return o <= a ? [] : Ai(t, n - t).map((e) => ({
		...e,
		skyV0: a,
		skyV1: o
	}));
}
function Mi(t) {
	return t === "repeat" ? e.RepeatWrapping : e.ClampToEdgeWrapping;
}
function Ni(t, n, r, i = {}) {
	let a = new e.RenderTarget(t, n, {
		depthBuffer: !1,
		format: e.RGBAFormat,
		generateMipmaps: !1,
		magFilter: e.LinearFilter,
		minFilter: e.LinearFilter,
		stencilBuffer: !1,
		type: i.type ?? e.UnsignedByteType,
		wrapS: i.wrapS ?? e.ClampToEdgeWrapping,
		wrapT: i.wrapT ?? e.ClampToEdgeWrapping
	});
	return a.texture.name = r, a.texture.colorSpace = i.colorSpace ?? e.SRGBColorSpace, a.texture.generateMipmaps = !1, a;
}
function Pi(e) {
	e.dispose();
}
function Fi(e) {
	return Math.PI / Math.max(1, e);
}
function Ii(e) {
	return Math.max(1, Math.floor(e ?? 8192));
}
function Li(e, t) {
	return Math.max(1, Math.min(e, t));
}
var Ri = class {
	#e = /* @__PURE__ */ new Map();
	#t = /* @__PURE__ */ new Map();
	#n;
	#r;
	#i = new e.Scene();
	#a = new e.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#o = new e.PlaneGeometry(2, 2);
	constructor(e) {
		this.#r = e, this.#n = ti(e);
	}
	createBakeKey(e, t) {
		let n = Zt(e), r = Dt(n.quality), i = Ii(t);
		return Un(n, i, Math.floor(i / 2), {
			budgetBytes: r.budgetBytes,
			maxTextureSize: this.#n
		});
	}
	previewWidthFor(e) {
		return Math.max(1, Math.min(yt, this.#n));
	}
	bakeTexture(e, t, n) {
		return this.#c(e, t, n).texture;
	}
	bakePatchTextures(e, t, n) {
		return this.#s(e, t, n);
	}
	async bakeImageData(e, t, n) {
		let r = this.#c(e, t, n), { height: i, width: a } = r.target, o = r.target, s = this.#r.readRenderTargetPixelsAsync ? await this.#r.readRenderTargetPixelsAsync(o, 0, 0, a, i) : null, c = new Uint8Array(a * i * 4);
		if (s) c.set(new Uint8Array(s.buffer, s.byteOffset, s.byteLength));
		else if (this.#r.readRenderTargetPixels) this.#r.readRenderTargetPixels(o, 0, 0, a, i, c);
		else throw Error("GPU Starfield bake readback is not available.");
		return {
			data: new Uint8ClampedArray(c.buffer),
			height: i,
			width: a
		};
	}
	canBake() {
		return ei(this.#r);
	}
	dispose() {
		this.#e.forEach((e) => e.target.dispose()), this.#e.clear(), this.#t.forEach((e) => {
			e.targets.forEach((e) => e.dispose());
		}), this.#t.clear(), this.#o.dispose();
	}
	#s(t, n, r) {
		let i = Zt(t), a = Dt(i.quality), o = Ii(r), s = Math.floor(o / 2), c = n ?? this.createBakeKey(i, o), l = this.#t.get(c);
		if (l) return l;
		let u = qt({
			budgetBytes: a.budgetBytes,
			clip: i.clip,
			height: s,
			maxTextureSize: this.#n,
			width: o
		}), d = this.#r.getRenderTarget(), f = this.#r.autoClear, p = Object.assign(new e.Color(), { a: 1 }), m = this.#r.getClearAlpha(), h = [], g = [];
		this.#r.getClearColor(p), this.#r.autoClear = !0, this.#r.setClearColor(0, 0), u.descriptors.forEach((t) => {
			let n = Ni(t.storageSize.width, t.storageSize.height, `GPU baked starfield nebula ${t.id}`, {
				colorSpace: e.LinearSRGBColorSpace,
				type: e.HalfFloatType,
				wrapS: Mi(t.wrapS),
				wrapT: Mi(t.wrapT)
			}), r = Ni(t.storageSize.width, t.storageSize.height, `GPU baked starfield stars ${t.id}`, {
				colorSpace: e.SRGBColorSpace,
				type: e.UnsignedByteType,
				wrapS: Mi(t.wrapS),
				wrapT: Mi(t.wrapT)
			});
			this.#l(_i(i, t), n), this.#u(i, t, r, s, u.supersample), h.push(n, r), g.push({
				descriptor: t,
				nebulaTexture: n.texture,
				starTexture: r.texture
			});
		}), this.#r.setRenderTarget(d), this.#r.autoClear = f, this.#r.setClearColor(p, m);
		let _ = {
			key: c,
			patches: g,
			targets: h
		};
		return this.#t.set(c, _), _;
	}
	#c(t, n, r) {
		let i = Zt(t), a = Dt(i.quality), o = Ii(r), s = Math.floor(o / 2), c = Li(o, this.#n), l = Math.floor(c / 2), u = n ?? this.createBakeKey(i, o), d = this.#e.get(u);
		if (d && d.target.width === c && d.target.height === l) return d;
		let f = Ni(c, l, "GPU baked starfield layer", {
			colorSpace: e.SRGBColorSpace,
			type: e.UnsignedByteType,
			wrapS: e.RepeatWrapping,
			wrapT: e.ClampToEdgeWrapping
		}), p = qt({
			budgetBytes: a.budgetBytes,
			clip: i.clip,
			height: s,
			maxTextureSize: this.#n,
			width: o
		}), m = this.#r.getRenderTarget(), h = this.#r.autoClear, g = Object.assign(new e.Color(), { a: 1 }), _ = this.#r.getClearAlpha();
		return this.#r.getClearColor(g), this.#r.autoClear = !0, this.#r.setClearColor(0, 0), this.#r.setRenderTarget(f), this.#r.clear(), p.descriptors.forEach((t) => {
			let n = Ni(t.storageSize.width, t.storageSize.height, `GPU baked starfield nebula ${t.id}`, {
				colorSpace: e.LinearSRGBColorSpace,
				type: e.HalfFloatType,
				wrapS: Mi(t.wrapS),
				wrapT: Mi(t.wrapT)
			}), r = Ni(t.storageSize.width, t.storageSize.height, `GPU baked starfield stars ${t.id}`, {
				colorSpace: e.SRGBColorSpace,
				type: e.UnsignedByteType,
				wrapS: Mi(t.wrapS),
				wrapT: Mi(t.wrapT)
			});
			this.#l(_i(i, t), n), this.#u(i, t, r, s, p.supersample), this.#d(i, t, n.texture, r.texture, f), n.dispose(), r.dispose();
		}), this.#r.setRenderTarget(m), this.#r.autoClear = h, this.#r.setClearColor(g, _), f.texture.userData.starfieldRenderTarget = f, this.#e.get(u)?.target.dispose(), this.#e.set(u, {
			key: u,
			target: f,
			texture: f.texture
		}), {
			key: u,
			target: f,
			texture: f.texture
		};
	}
	#l(t, n) {
		let r = new e.Mesh(this.#o, t);
		r.frustumCulled = !1, this.#i.clear(), this.#i.add(r), this.#r.setRenderTarget(n), this.#r.clear(), this.#r.render(this.#i, this.#a), this.#i.remove(r), Pi(t);
	}
	#u(t, n, r, i, a) {
		let o = vi(t, n, i), s = Math.max(1, Math.floor(a)), c = n.storageSize.width * s, l = n.storageSize.height * s, u = c / n.storageSize.width, d = yi(t, n, {
			bakeHeight: l,
			bakeWidth: c,
			displayPixelAngle: Fi(i)
		}), f = new e.Mesh(o, d), p = Ni(c, l, `GPU baked starfield stars accumulation ${n.id}`, {
			colorSpace: e.LinearSRGBColorSpace,
			type: e.HalfFloatType,
			wrapS: e.ClampToEdgeWrapping
		});
		f.frustumCulled = !1, this.#i.clear(), this.#i.add(f), this.#r.setRenderTarget(p), this.#r.clear(), this.#r.render(this.#i, this.#a), this.#i.remove(f), o.dispose(), Pi(d), this.#l(bi(p.texture, c, l, n.storageSize.width, n.storageSize.height, u), r), p.dispose();
	}
	#d(t, n, r, i, a) {
		let o = xi(r, i, n, t), s = Si(n);
		this.#i.clear(), s.forEach((t) => {
			let n = new e.Mesh(t, o);
			n.frustumCulled = !1, this.#i.add(n);
		});
		let c = this.#r.autoClear;
		try {
			this.#r.autoClear = !1, this.#r.setRenderTarget(a), this.#r.render(this.#i, this.#a);
		} finally {
			this.#r.autoClear = c;
		}
		this.#i.children.forEach((t) => {
			t instanceof e.Mesh && t.geometry.dispose();
		}), this.#i.clear(), Pi(o);
	}
};
function zi(e) {
	return ei(e) ? new Ri(e) : null;
}
//#endregion
//#region layer-addons/built-ins.ts
function Bi(e) {
	return e;
}
//#endregion
//#region Skybox.ts
var Vi = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: B,
	nodes: [],
	version: 2
}, Hi = .18, Ui = .75, Wi = 1.75, Gi = 1e-4, Ki = .01, qi = {
	hoveredLayerId: null,
	selectedLayerId: null
}, Ji = new e.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, e.RGBAFormat);
Ji.colorSpace = e.SRGBColorSpace, Ji.needsUpdate = !0;
function Yi(e, t) {
	return +(t === e);
}
function Xi(e, t) {
	return +(t === e);
}
function Zi(e, t) {
	return Math.max(Yi(e, t.hoveredLayerId), Xi(e, t.selectedLayerId));
}
function Qi(e, t) {
	return e.map((e) => ({
		active: N(Zi(e.layer.id, t)),
		layerId: e.layer.id
	}));
}
function $i(e, t) {
	return e.map((e) => ({
		active: N(Zi(e.layer.id, t)),
		layerId: e.layer.id
	}));
}
function ea(e, t) {
	e.forEach((e) => {
		e.active.value = Zi(e.layerId, t);
	});
}
function ta(e, t) {
	return Object.fromEntries(e.map((e) => [`imageActive${e.index}`, { value: Zi(e.layer.id, t) }]));
}
function na(e, t) {
	return Object.fromEntries(e.map((e) => [`spotActive${e.index}`, { value: Zi(e.layer.id, t) }]));
}
function ra(e, t, n, r) {
	t.forEach((t) => {
		let n = `imageActive${t.index}`;
		e.uniforms[n] && (e.uniforms[n].value = Zi(t.layer.id, r));
	}), n.forEach((t) => {
		let n = `spotActive${t.index}`;
		e.uniforms[n] && (e.uniforms[n].value = Zi(t.layer.id, r));
	});
}
function ia(e, t) {
	e.userData.applyEditorLayerState = t;
}
function aa(t) {
	if (!t) return {
		centerDirection: new e.Vector3(0, 0, -1),
		halfSize: new e.Vector2(0, 0),
		tangentX: new e.Vector3(1, 0, 0),
		tangentY: new e.Vector3(0, 1, 0)
	};
	let n = je(t);
	return {
		centerDirection: new e.Vector3(...n.centerDirection),
		halfSize: new e.Vector2(Math.max(0, Math.tan(n.angularWidth / 2)), Math.max(0, Math.tan(n.angularHeight / 2))),
		tangentX: new e.Vector3(...n.tangentX),
		tangentY: new e.Vector3(...n.tangentY)
	};
}
function oa(e) {
	return e.map((e) => {
		let t = aa(e.layer.params.placement);
		return {
			centerDirection: N(t.centerDirection),
			halfSize: N(t.halfSize),
			layerId: e.layer.id,
			tangentX: N(t.tangentX),
			tangentY: N(t.tangentY)
		};
	});
}
function sa(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = aa(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function ca(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = aa(e.layer.params.placement);
		return [
			[`imageCenterDirection${e.index}`, { value: t.centerDirection }],
			[`imageTangentX${e.index}`, { value: t.tangentX }],
			[`imageTangentY${e.index}`, { value: t.tangentY }],
			[`imageHalfSize${e.index}`, { value: t.halfSize }]
		];
	}));
}
function la(e, t, n, r) {
	let i = t.find((e) => e.layer.id === n);
	if (!i) return;
	let a = aa(r);
	e.uniforms[`imageCenterDirection${i.index}`]?.value.copy(a.centerDirection), e.uniforms[`imageTangentX${i.index}`]?.value.copy(a.tangentX), e.uniforms[`imageTangentY${i.index}`]?.value.copy(a.tangentY), e.uniforms[`imageHalfSize${i.index}`]?.value.copy(a.halfSize);
}
function ua(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function da(t) {
	let n = t * Math.PI / 180;
	return new e.Vector3(Math.sin(n), Math.cos(n), 0).normalize();
}
function fa(e) {
	return [...e.stops].map((e) => ({
		color: e.color,
		midpoint: L((e.midpoint ?? 50) / 100, .01, .99),
		opacity: L(e.opacity / 100),
		t: L(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function pa(t) {
	let [n, r, i] = ae(t.color);
	return new e.Vector4(n, r, i, t.opacity);
}
function ma(e) {
	return +(e === "gaussian");
}
function ha(e) {
	return +(e === "gradient");
}
function ga(e) {
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
function _a(e) {
	return {
		blendMode: ga(e.blendMode),
		opacity: L(e.opacity / 100)
	};
}
function va(t, n) {
	let r = (L(t) - .5) * Math.PI * 2, i = (.5 - L(n)) * Math.PI, a = Math.cos(i);
	return new e.Vector3(a * Math.cos(r), Math.sin(i), a * Math.sin(r)).normalize();
}
function ya(t) {
	let [n, r, i] = ae(t);
	return new e.Vector3(n, r, i);
}
function ba(e) {
	return e.map((e) => {
		let t = fa(e.layer.params);
		return {
			axis: N(da(e.layer.params.rotation)),
			layerId: e.layer.id,
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: N(pa(r)),
					midpoint: N(r.midpoint),
					t: N(r.t)
				};
			})
		};
	});
}
function xa(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = fa(t.params);
	n.axis.value.copy(da(t.params.rotation)), n.stops.forEach((e, t) => {
		let n = r[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(pa(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function Sa(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = fa(e.layer.params);
		return [[`${e.parameterPrefix}Axis`, { value: da(e.layer.params.rotation) }], ...Array.from({ length: e.stopCount }, (n, r) => {
			let i = t[r] ?? {
				color: "#000000",
				midpoint: .5,
				opacity: 0,
				t: 0
			};
			return [
				[`${e.parameterPrefix}StopColor${r}`, { value: pa(i) }],
				[`${e.parameterPrefix}StopMidpoint${r}`, { value: i.midpoint }],
				[`${e.parameterPrefix}StopT${r}`, { value: i.t }]
			];
		}).flat()];
	}));
}
function Ca(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	if (!r) return;
	let i = fa(t.params);
	e.uniforms[`${r.parameterPrefix}Axis`]?.value.copy(da(t.params.rotation)), Array.from({ length: r.stopCount }, (t, n) => {
		let a = i[n] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.uniforms[`${r.parameterPrefix}StopColor${n}`]?.value.copy(pa(a)), e.uniforms[`${r.parameterPrefix}StopT${n}`] && (e.uniforms[`${r.parameterPrefix}StopT${n}`].value = a.t), e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`] && (e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`].value = a.midpoint);
	});
}
function wa(e) {
	return e.map((e) => ({
		amplitude: N(L(e.layer.params.amplitude, 0, .6)),
		anchors: Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return {
				color: N(ya(r.color)),
				direction: N(va(r.x, r.y))
			};
		}),
		frequency: N(Math.max(1e-4, e.layer.params.frequency)),
		layerId: e.layer.id,
		mode: N(ma(e.layer.params.mode)),
		power: N(Math.max(1e-4, e.layer.params.power))
	}));
}
function Ta(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n && (n.amplitude.value = L(t.params.amplitude, 0, .6), n.frequency.value = Math.max(1e-4, t.params.frequency), n.mode.value = ma(t.params.mode), n.power.value = Math.max(1e-4, t.params.power), n.anchors.forEach((e, n) => {
		let r = t.params.anchors[n] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.color.value.copy(ya(r.color)), e.direction.value.copy(va(r.x, r.y));
	}));
}
function Ea(e) {
	return Object.fromEntries(e.flatMap((e) => [
		[`${e.parameterPrefix}Amplitude`, { value: L(e.layer.params.amplitude, 0, .6) }],
		[`${e.parameterPrefix}Frequency`, { value: Math.max(1e-4, e.layer.params.frequency) }],
		[`${e.parameterPrefix}Mode`, { value: ma(e.layer.params.mode) }],
		[`${e.parameterPrefix}Power`, { value: Math.max(1e-4, e.layer.params.power) }],
		...Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return [[`${e.parameterPrefix}AnchorDirection${n}`, { value: va(r.x, r.y) }], [`${e.parameterPrefix}AnchorColor${n}`, { value: ya(r.color) }]];
		}).flat()
	]));
}
function Da(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	r && (e.uniforms[`${r.parameterPrefix}Amplitude`] && (e.uniforms[`${r.parameterPrefix}Amplitude`].value = L(t.params.amplitude, 0, .6)), e.uniforms[`${r.parameterPrefix}Frequency`] && (e.uniforms[`${r.parameterPrefix}Frequency`].value = Math.max(1e-4, t.params.frequency)), e.uniforms[`${r.parameterPrefix}Mode`] && (e.uniforms[`${r.parameterPrefix}Mode`].value = ma(t.params.mode)), e.uniforms[`${r.parameterPrefix}Power`] && (e.uniforms[`${r.parameterPrefix}Power`].value = Math.max(1e-4, t.params.power)), Array.from({ length: r.anchorCount }, (n, i) => {
		let a = t.params.anchors[i] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.uniforms[`${r.parameterPrefix}AnchorDirection${i}`]?.value.copy(va(a.x, a.y)), e.uniforms[`${r.parameterPrefix}AnchorColor${i}`]?.value.copy(ya(a.color));
	}));
}
function Oa(t) {
	let n = We(t);
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
		lightColor: ya(n.lightColor),
		mode: ha(n.colorMode),
		radius: Math.max(1e-4, n.angularRadius),
		stops: fa(n)
	};
}
function ka(e) {
	return e.map((e) => {
		let t = Oa(e.layer.params);
		return {
			brightness: N(t.brightness),
			centerDirection: N(t.centerDirection),
			coreRadius: N(t.coreRadius),
			coreSoftness: N(t.coreSoftness),
			dispersion: N(t.dispersion),
			dogSpread: N(t.dogSpread),
			dogStrength: N(t.dogStrength),
			dogStretch: N(t.dogStretch),
			glareSize: N(t.glareSize),
			glareStrength: N(t.glareStrength),
			glowSize: N(t.glowSize),
			glowStrength: N(t.glowStrength),
			haloInnerWidth: N(t.haloInnerWidth),
			haloOuterWidth: N(t.haloOuterWidth),
			haloRadius: N(t.haloRadius),
			haloStrength: N(t.haloStrength),
			layerId: e.layer.id,
			lightColor: N(t.lightColor),
			mode: N(t.mode),
			radius: N(t.radius),
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t.stops[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: N(pa(r)),
					midpoint: N(r.midpoint),
					t: N(r.t)
				};
			})
		};
	});
}
function Aa(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = Oa(t.params);
	n.brightness.value = r.brightness, n.centerDirection.value.copy(r.centerDirection), n.coreRadius.value = r.coreRadius, n.coreSoftness.value = r.coreSoftness, n.dispersion.value = r.dispersion, n.dogSpread.value = r.dogSpread, n.dogStrength.value = r.dogStrength, n.dogStretch.value = r.dogStretch, n.glareSize.value = r.glareSize, n.glareStrength.value = r.glareStrength, n.glowSize.value = r.glowSize, n.glowStrength.value = r.glowStrength, n.haloInnerWidth.value = r.haloInnerWidth, n.haloOuterWidth.value = r.haloOuterWidth, n.haloRadius.value = r.haloRadius, n.haloStrength.value = r.haloStrength, n.lightColor.value.copy(r.lightColor), n.mode.value = r.mode, n.radius.value = r.radius, n.stops.forEach((e, t) => {
		let n = r.stops[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(pa(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function ja(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = Oa(e.layer.params);
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
					[`${e.parameterPrefix}StopColor${r}`, { value: pa(i) }],
					[`${e.parameterPrefix}StopMidpoint${r}`, { value: i.midpoint }],
					[`${e.parameterPrefix}StopT${r}`, { value: i.t }]
				];
			}).flat()
		];
	}));
}
function Ma(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	if (!r) return;
	let i = Oa(t.params);
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
		e.uniforms[`${r.parameterPrefix}StopColor${n}`]?.value.copy(pa(a)), e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`] && (e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`].value = a.midpoint), e.uniforms[`${r.parameterPrefix}StopT${n}`] && (e.uniforms[`${r.parameterPrefix}StopT${n}`].value = a.t);
	});
}
function Na(e) {
	return e.map((e) => {
		let t = _a(e.node);
		return {
			blendMode: N(t.blendMode),
			nodeId: e.node.id,
			opacity: N(t.opacity)
		};
	});
}
function Pa(e, t) {
	for (let n of e) if (n.enabled) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = Pa(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
function Fa(e, t) {
	e.forEach((e) => {
		let n = Pa(t.nodes, e.nodeId);
		if (!n) return;
		let r = _a(n);
		e.opacity.value = r.opacity, e.blendMode.value = r.blendMode;
	});
}
function Ia(e, t) {
	let n = e.find((e) => e.nodeId === t.id);
	if (!n) return;
	let r = _a(t);
	n.opacity.value = r.opacity, n.blendMode.value = r.blendMode;
}
function La(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = _a(e.node);
		return [[`${e.parameterPrefix}Opacity`, { value: t.opacity }], [`${e.parameterPrefix}BlendMode`, { value: t.blendMode }]];
	}));
}
function Ra(e, t, n) {
	t.forEach((t) => {
		let r = Pa(n.nodes, t.node.id);
		if (!r) return;
		let i = _a(r), a = e.uniforms[`${t.parameterPrefix}Opacity`], o = e.uniforms[`${t.parameterPrefix}BlendMode`];
		a && (a.value = i.opacity), o && (o.value = i.blendMode);
	});
}
function za(e, t, n) {
	let r = t.find((e) => e.node.id === n.id);
	if (!r) return;
	let i = _a(n), a = e.uniforms[`${r.parameterPrefix}Opacity`], o = e.uniforms[`${r.parameterPrefix}BlendMode`];
	a && (a.value = i.opacity), o && (o.value = i.blendMode);
}
function Ba(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Ba(e.children, t);
				return;
			}
			e.type === "gradient" && t(e);
		}
	});
}
function Va(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Va(e.children, t);
				return;
			}
			e.type === "field-gradient" && t(e);
		}
	});
}
function Ha(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Ha(e.children, t);
				return;
			}
			e.type === "spot" && t(e);
		}
	});
}
function Ua(e, t) {
	e.userData.applyGradientLayerParams = t;
}
function Wa(e, t) {
	e.userData.applyGradientLayerParam = t;
}
function Ga(e, t) {
	e.userData.applyFieldGradientLayerParams = t;
}
function Ka(e, t) {
	e.userData.applyFieldGradientLayerParam = t;
}
function qa(e, t) {
	e.userData.applySpotLayerParams = t;
}
function Ja(e, t) {
	e.userData.applySpotLayerParam = t;
}
function Ya(e, t) {
	e.userData.applyCompositionParams = t;
}
function Xa(e, t) {
	e.userData.applyLayerComposition = t;
}
function Za(e) {
	return e ?? B;
}
function Qa(t = B) {
	return Za(t).type === "sphere" ? new e.SphereGeometry(1, 64, 32) : new e.BoxGeometry(1, 1, 1);
}
function $a(t = 1, n = 25, r = 25) {
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
function eo(t = B) {
	if (Za(t).type === "sphere") return $a();
	let n = new e.BoxGeometry(1, 1, 1), r = new e.EdgesGeometry(n);
	return n.dispose(), r;
}
function $(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function to(e, t) {
	return t === "wgsl" ? `vec3<f32>(${$(e)})` : `vec3(${$(e)})`;
}
function no(e, t, n, r) {
	return r === "wgsl" ? `var ${e}: ${t} = ${n};` : `${t} ${e} = ${n};`;
}
function ro(e) {
	return e.filter((e) => e.enabled).reverse();
}
function io(e) {
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
function ao(e) {
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
function oo(e) {
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
function so(e) {
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
function co(e) {
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
function lo(e) {
	let t = [];
	function n(e) {
		ro(e).forEach((e) => {
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
function uo(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function fo(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function po(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function mo(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function ho(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function go(e) {
	return new Map(e.map((e) => [e.node.id, e]));
}
function _o(e, t, n) {
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
      ${o} imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${$(Ki)});
      ${o} imageHardInside = step(${$(Gi)}, imageDenom) *
        step(0.0, ${n.halfSize}.x) *
        step(0.0, ${n.halfSize}.y);
      ${o} imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      ${s} imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return ${a}(imageU, imageV, imageValid, 0.0);
    `;
}
function vo(e, t, n) {
	let r = t.get(e.id);
	return r ? n === "wgsl" ? `effectColor = ${r.parameterName};` : `{
    vec4 imageSampleInfo = skyboxStudioImageSampleInfo${r.index}(direction);
    vec4 imageSampleColor = texture2D(imageTexture${r.index}, imageSampleInfo.xy);
    effectColor = vec4(imageSampleColor.rgb, imageSampleColor.a * imageSampleInfo.z);
  }` : `effectColor = ${n === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function yo(e, t, n) {
	let r = t.get(e.id);
	return r ? n === "wgsl" ? `effectColor = ${r.parameterName};` : `effectColor = texture2D(starfieldTexture${r.index}, directionToSourceStarfieldUv(direction));` : `effectColor = ${n === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function bo() {
	return "\n      const float SKYBOX_STUDIO_PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.z, normalizedDirection.x);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * SKYBOX_STUDIO_PI) + 0.5, latitude / SKYBOX_STUDIO_PI + 0.5);\n      }\n\n      vec2 directionToSourceStarfieldUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float theta = atan(normalizedDirection.x, normalizedDirection.z);\n        float u = fract(theta / (2.0 * SKYBOX_STUDIO_PI) + 0.5);\n        float v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / SKYBOX_STUDIO_PI;\n\n        return vec2(u, v);\n      }\n    ";
}
function xo(e) {
	return ie(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${_o(e, "wgsl", {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var So = ie("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n"), Co = ie(`
  fn skyboxStudioApplyImageEditorRectOverlay(
    color: vec4<f32>,
    uv: vec2<f32>,
    valid: f32,
    activeValue: f32
  ) -> vec4<f32> {
    let activeAmount = clamp(activeValue, 0.0, 1.0);
    let rectCoverage = valid * activeAmount;
    let edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${$(Ki)});
    let bounds = rectCoverage * (
      1.0 - smoothstep(
        edgeWidth * ${$(Ui)},
        edgeWidth * ${$(Wi)},
        edgeDistance
      )
    );
    let rectAlpha = rectCoverage * ${$(Hi)};
    let overlayAlpha = max(rectAlpha, bounds);
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), overlayAlpha),
      color.a
    );
  }
`), wo = ie(`
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
    let spotEdgeWidth = clamp(fwidth(spotEdgeDistance), 0.000001, ${$(Ki)});
    let spotValid = step(${$(Gi)}, spotDenom) *
      step(-spotEdgeWidth, spotEdgeDistance) *
      smoothstep(-spotEdgeWidth, spotEdgeWidth, spotEdgeDistance);

    return vec4<f32>(spotU, spotV, spotValid, 0.0);
  }
`);
function To(e) {
	return e.map((e) => `
        vec4 skyboxStudioImageSampleInfo${e.index}(vec3 direction) {
          ${_o(e, "glsl", {
		centerDirection: `imageCenterDirection${e.index}`,
		halfSize: `imageHalfSize${e.index}`,
		tangentX: `imageTangentX${e.index}`,
		tangentY: `imageTangentY${e.index}`
	})}
        }
      `).join("\n");
}
function Eo(e) {
	return e.map((e) => `
        {
          vec4 imageEditorInfo = skyboxStudioImageSampleInfo${e.index}(direction);
          float activeAmount = clamp(imageActive${e.index}, 0.0, 1.0);
          float rectCoverage = imageEditorInfo.z * activeAmount;
          float edgeDistance = min(min(imageEditorInfo.x, 1.0 - imageEditorInfo.x), min(imageEditorInfo.y, 1.0 - imageEditorInfo.y));
          float edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${$(Ki)});
          float bounds = rectCoverage * (
            1.0 - smoothstep(
              edgeWidth * ${$(Ui)},
              edgeWidth * ${$(Wi)},
              edgeDistance
            )
          );
          float rectAlpha = rectCoverage * ${$(Hi)};
          float overlayAlpha = max(rectAlpha, bounds);
          composedColor = mix(composedColor, vec3(1.0, 0.0, 0.0), overlayAlpha);
        }
      `).join("\n");
}
function Do(e) {
	return e.map((e) => `
        {
          vec3 spotEditorCenter = normalize(${e.parameterPrefix}CenterDirection);
          vec3 spotEditorTangentX = normalize(cross(vec3(0.0, 1.0, 0.0), spotEditorCenter));
          vec3 spotEditorTangentY = normalize(cross(spotEditorCenter, spotEditorTangentX));
          float spotEditorDenom = dot(direction, spotEditorCenter);
          float safeSpotEditorDenom = max(spotEditorDenom, 0.000001);
          float spotEditorLocalX = dot(direction, spotEditorTangentX) / safeSpotEditorDenom / max(${e.parameterPrefix}Radius, 0.0001);
          float spotEditorLocalY = dot(direction, spotEditorTangentY) / safeSpotEditorDenom / max(${e.parameterPrefix}Radius, 0.0001);
          vec2 spotEditorUv = vec2(spotEditorLocalX * 0.5 + 0.5, 0.5 - spotEditorLocalY * 0.5);
          float activeAmount = clamp(spotActive${e.index}, 0.0, 1.0);
          float edgeDistance = min(min(spotEditorUv.x, 1.0 - spotEditorUv.x), min(spotEditorUv.y, 1.0 - spotEditorUv.y));
          float edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${$(Ki)});
          float rectCoverage = step(${$(Gi)}, spotEditorDenom) *
            step(-edgeWidth, edgeDistance) *
            smoothstep(-edgeWidth, edgeWidth, edgeDistance) *
            activeAmount;
          float bounds = rectCoverage * (
            1.0 - smoothstep(
              edgeWidth * ${$(Ui)},
              edgeWidth * ${$(Wi)},
              edgeDistance
            )
          );
          float rectAlpha = rectCoverage * ${$(Hi)};
          float overlayAlpha = max(rectAlpha, bounds);
          composedColor = mix(composedColor, vec3(1.0, 0.0, 0.0), overlayAlpha);
        }
      `).join("\n");
}
function Oo(e, t) {
	return e.get(t.id) ?? Ji;
}
function ko(e, t) {
	return Object.fromEntries(e.map((e) => [`imageTexture${e.index}`, { value: Oo(t, e.layer) }]));
}
function Ao(e, t, n) {
	t.forEach((t) => {
		let r = `imageTexture${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = Oo(n, t.layer));
	});
}
function jo(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? Ji;
	});
}
function Mo(e) {
	e.userData.starfieldRenderTarget || e.dispose();
}
function No(e, t) {
	return e.get(t.id) ?? Ji;
}
function Po(e, t) {
	return Object.fromEntries(e.map((e) => [`starfieldTexture${e.index}`, { value: No(t, e.layer) }]));
}
function Fo(e, t, n) {
	t.forEach((t) => {
		let r = `starfieldTexture${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = No(n, t.layer));
	});
}
function Io(e, t) {
	e.forEach((e) => {
		e.textureNodes.forEach((e) => {
			e.value = e.value ?? Ji;
		});
	});
}
function Lo(e, t) {
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
function Ro(e, t) {
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
    ${no("fieldDirection", r, "direction", t)}
    ${i} warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      ${i} warpX = sin((direction.y * warpFrequency + 0.23) * ${$(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${$(Math.PI * 2)});
      ${i} warpY = cos((direction.z * warpFrequency + 0.17) * ${$(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${$(Math.PI * 2)});
      ${i} warpZ = sin((direction.x * warpFrequency - 0.31) * ${$(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${$(Math.PI * 2)});
      fieldDirection = normalize(direction + ${r}(warpX, warpY, warpZ) * warpScale);
    }
    ${no("weightedColor", r, `${r}(0.0)`, t)}
    ${no("weightSum", t === "wgsl" ? "f32" : "float", "0.0", t)}
    ${a}
    if (weightSum > 0.0) {
      effectColor = ${n}(weightedColor / weightSum, 1.0);
    } else {
      effectColor = ${n}(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
function zo(e, t) {
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
function Bo(e, t) {
	let n = t === "wgsl" ? "vec4<f32>" : "vec4", r = t === "wgsl" ? "vec3<f32>" : "vec3", i = t === "wgsl" ? "let" : "float", a = `${e.parameterPrefix}Mode > 0.5`, o = zo(e, t);
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
      ${no("spotColor", r, `${e.parameterPrefix}LightColor * spotMonoLight + ${r}(max(spotMonoLight - 1.0, 0.0))`, t)}

      ${i} spotHaloInner = max(${e.parameterPrefix}HaloInnerWidth, 0.0001);
      ${i} spotHaloOuter = max(${e.parameterPrefix}HaloOuterWidth, 0.0001);
      ${i} spotHaloDelta = spotD - ${e.parameterPrefix}HaloRadius;
      ${i} spotHaloWidth = ${t === "wgsl" ? "select(spotHaloOuter, spotHaloInner, spotHaloDelta < 0.0)" : "(spotHaloDelta < 0.0 ? spotHaloInner : spotHaloOuter)"};
      ${i} spotHaloEnvelope = exp(-pow(spotHaloDelta / spotHaloWidth, 2.0));
      ${i} spotHaloT = clamp((spotD - (${e.parameterPrefix}HaloRadius - spotHaloInner)) / (spotHaloInner + spotHaloOuter), 0.0, 1.0);
      ${no("spotSpectrum", r, `${r}(1.0, 0.12, 0.05)`, t)}
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
      ${no("spotDogSpectrum", r, `${r}(1.0, 0.12, 0.05)`, t)}
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
function Vo(e, t, n, r, i, a, o = /* @__PURE__ */ new Map()) {
	if (e.type === "gradient") {
		let r = n.get(e.id);
		return r ? Lo(r, t) : `effectColor = ${t === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
	}
	if (e.type === "field-gradient") {
		let n = r.get(e.id);
		return n ? Ro(n, t) : `effectColor = ${t === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
	}
	if (e.type === "spot") {
		let n = a.get(e.id);
		return n ? Bo(n, t) : `effectColor = ${t === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
	}
	return e.type === "starfield" ? yo(e, o, t) : vo(e, i, t);
}
function Ho(e, t, n, r) {
	return r === "wgsl" ? `select(${n}, ${t}, ${e})` : `((${e}) ? ${t} : ${n})`;
}
function Uo(e, t) {
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
	let n = to(1, t), r = to(.5, t), i = to(0, t), a = "effectColor.rgb", o = "composedColor";
	switch (e) {
		case "darken": return `min(${o}, ${a})`;
		case "multiply": return `${o} * ${a}`;
		case "color-burn": return Ho(`${o} == ${n}`, n, Ho(`${a} == ${i}`, i, `${n} - min(${n}, (${n} - ${o}) / ${a})`, t), t);
		case "lighten": return `max(${o}, ${a})`;
		case "screen": return `${o} + ${a} - ${o} * ${a}`;
		case "color-dodge": return Ho(`${o} == ${i}`, i, Ho(`${a} == ${n}`, n, `min(${n}, ${o} / (${n} - ${a}))`, t), t);
		case "overlay": return Ho(`${o} <= ${r}`, `2.0 * ${o} * ${a}`, `${n} - 2.0 * (${n} - ${o}) * (${n} - ${a})`, t);
		case "soft-light": return Ho(`${a} <= ${r}`, `${o} - (${n} - 2.0 * ${a}) * ${o} * (${n} - ${o})`, `${o} + (2.0 * ${a} - ${n}) * (softLightD - ${o})`, t);
		case "hard-light": return Ho(`${a} <= ${r}`, `2.0 * ${o} * ${a}`, `${o} + (2.0 * ${a} - ${n}) - ${o} * (2.0 * ${a} - ${n})`, t);
		case "difference": return `abs(${o} - ${a})`;
		case "exclusion": return `${o} + ${a} - 2.0 * ${o} * ${a}`;
		default: return a;
	}
}
function Wo(e) {
	if (e === "glsl") return "";
	let t = e === "wgsl" ? "vec3<f32>" : "vec3";
	return `${e === "wgsl" ? "let" : "vec3"} softLightD = ${Ho(`composedColor <= ${t}(0.25)`, `((16.0 * composedColor - ${t}(12.0)) * composedColor + ${t}(4.0)) * composedColor`, "sqrt(composedColor)", e)};`;
}
function Go(e, t) {
	let n = ga(t);
	return `${e} >= ${$(n - .5)} && ${e} < ${$(n + .5)}`;
}
function Ko(e, t) {
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
	].map((n, r) => `${r === 0 ? "if" : "else if"} (${Go(e, n)}) {
          blendedColor = ${Uo(n, t)};
        }`).join("\n");
	return `${Wo(t)}
        ${no("blendedColor", n, "effectColor.rgb", t)}
        ${r}
        blendedColor = clamp(blendedColor, ${n}(0.0), ${n}(1.0));`;
}
function qo(e, t, n, r, i, a, o, s, c, l = 0) {
	let u = t === "wgsl" ? "vec3<f32>" : "vec3", d = t === "wgsl" ? "vec4<f32>" : "vec4";
	return ro(e).map((e, f) => {
		let p = e.type === "group" ? `effectColor = ${d}(${`groupColor${l}_${f}`}, 1.0);` : t === "wgsl" && c ? Xo(e, c) : Vo(e, t, n, r, i, a, o), m = `groupColor${l}_${f}`, h = s.get(e.id), g = h ? `${h.parameterPrefix}Opacity` : $(e.opacity / 100), _ = h ? `${h.parameterPrefix}BlendMode` : $(ga(e.blendMode));
		return `{
        ${e.type === "group" ? `${no(m, u, `${u}(0.0)`, t)}
        {
          ${no("previousComposedColor", u, "composedColor", t)}
          composedColor = ${u}(0.0);
          ${qo(e.children, t, n, r, i, a, o, s, c, l + 1)}
          ${m} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${no("effectColor", d, `${d}(0.0)`, t)}
        ${p}
        ${t === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${g}, 0.0, 1.0);
        ${Ko(_, t)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          ${u}(0.0),
          ${u}(1.0)
        );
      }`;
	}).join("\n");
}
function Jo(e) {
	return `effectColor = ${e === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function Yo(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Xo(e, t) {
	let n = t.adapters.get(e.type);
	return n ? n.adapter.createSampleExpression(e, "wgsl", { bindingsByLayerId: n.bindingsByLayerId }) : Jo("wgsl");
}
var Zo = Bi([
	{
		collect: io,
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
			return r ? Lo(r, t) : Jo(t);
		},
		createSampleParameters: (e, t) => Object.fromEntries(e.flatMap((e) => {
			let n = t[e.index];
			return [[`${e.parameterPrefix}Axis`, n.axis], ...Array.from({ length: e.stopCount }, (t, r) => [
				[`${e.parameterPrefix}StopColor${r}`, n.stops[r].color],
				[`${e.parameterPrefix}StopMidpoint${r}`, n.stops[r].midpoint],
				[`${e.parameterPrefix}StopT${r}`, n.stops[r].t]
			]).flat()];
		})),
		createUniforms: ba,
		getTopologyKey: (e) => ({
			mode: e.params.mode,
			stopCount: e.params.stops.length
		}),
		type: "gradient",
		updateUniforms: xa
	},
	{
		collect: ao,
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
			return r ? Ro(r, t) : Jo(t);
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
		createUniforms: wa,
		getTopologyKey: (e) => ({ anchorCount: e.params.anchors.length }),
		type: "field-gradient",
		updateUniforms: Ta
	},
	{
		collect: oo,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : Jo(t);
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, uniforms: r }) => {
			let i = rs(e, t, n, r);
			return {
				editorProjectionByLayerId: new Map(Array.from(i.sampleData.entries()).map(([e, t]) => [e, {
					uv: F(t.sampleInfo.x, t.sampleInfo.y),
					valid: t.sampleInfo.z
				}])),
				sampleData: i.sampleData,
				sampleNodesByLayerId: Object.fromEntries(e.map((e) => [e.layer.id, i.sampleNodes[e.parameterName]])),
				sampleNodesByParameterName: i.sampleNodes,
				textureSlots: Object.fromEntries(Array.from(i.sampleData.entries()).map(([e, t]) => [e, t.textureNode]))
			};
		},
		createSampleParameters: (e, t, n) => n?.sampleNodesByParameterName ?? {},
		createUniforms: oa,
		getTopologyKey: (e) => ({
			hasPlacement: !!e.params.placement,
			hasSrc: !!e.params.src,
			height: e.params.height,
			width: e.params.width
		}),
		type: "image",
		updateUniforms: (e, t) => sa(e, t.id, t.params.placement)
	},
	{
		collect: so,
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
			return r ? Bo(r, t) : Jo(t);
		},
		createSampleNodes: ({ bindings: e, direction: t, uniforms: n }) => ({ editorProjectionByLayerId: new Map(e.map((e) => {
			let r = n[e.index], i = wo({
				direction: t,
				spotCenterDirection: r.centerDirection,
				spotRadius: r.radius
			});
			return [e.layer.id, {
				uv: F(i.x, i.y),
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
		createUniforms: ka,
		getTopologyKey: (e) => ({ stopCount: e.params.stops.length }),
		type: "spot",
		updateUniforms: Aa
	},
	{
		collect: co,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : Jo(t);
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n }) => {
			let r = /* @__PURE__ */ new Map(), i = Object.fromEntries(e.map((e) => {
				let t = re(0, 0, 0, 0);
				return r.set(e.layer.id, {
					sampleNode: t,
					textureNodes: []
				}), [e.parameterName, t];
			}));
			return {
				sampleData: r,
				sampleNodesByLayerId: Object.fromEntries(e.map((e) => [e.layer.id, i[e.parameterName]])),
				sampleNodesByParameterName: i,
				textureSlots: Object.fromEntries(Array.from(r.entries()).map(([e, t]) => [e, t.textureNodes]))
			};
		},
		createSampleParameters: (e, t, n) => n?.sampleNodesByParameterName ?? {},
		createUniforms: () => [],
		getTopologyKey: () => ({}),
		type: "starfield",
		updateUniforms: () => {}
	}
]);
function Qo(e, t, n, r, i) {
	let a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = {}, c = {};
	return Zo.forEach((r) => {
		let l = r.collect(e.nodes), u = r.createUniforms(l), d = r.createSampleNodes?.({
			bindings: l,
			direction: t,
			imageTextures: r.type === "starfield" ? i : n,
			uniforms: u
		}), f = {
			adapter: r,
			bindings: l,
			bindingsByLayerId: Yo(l),
			samples: d,
			uniforms: u
		};
		d?.editorProjectionByLayerId && d.editorProjectionByLayerId.forEach((e, t) => {
			o.set(t, e);
		}), d?.textureSlots && Object.assign(c, d.textureSlots), Object.assign(s, r.createSampleParameters?.(l, u, d) ?? {}), a.set(r.type, f);
	}), {
		adapters: a,
		editorProjectionByLayerId: o,
		sampleParameters: s,
		textureSlotsByLayerId: c
	};
}
function $o(e, t) {
	return e.adapters.get(t);
}
function es(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				es(e.children, t);
				return;
			}
			t(e);
		}
	});
}
function ts(e, t) {
	let n = e.adapters.get(t.type);
	n && n.adapter.updateUniforms(n.uniforms, t);
}
function ns(e, t, n) {
	let r = go(n), i = qo(e.nodes, "wgsl", /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), r, t);
	return ie(`
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
function rs(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	return {
		sampleData: i,
		sampleNodes: Object.fromEntries(e.map((e) => {
			let a = r[e.index], o = xo(e)({
				direction: t,
				imageCenterDirection: a.centerDirection,
				imageHalfSize: a.halfSize,
				imageTangentX: a.tangentX,
				imageTangentY: a.tangentY
			}), s = F(o.x, o.y), c = M(Oo(n, e.layer), s).setName(`imageTexture${e.index}`);
			c.getUniformHash = () => `skybox-image-texture:${e.layer.id}`;
			let l = So({
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
function is(t, i, a, o, s, c) {
	let l = new n(), d = lo(t.nodes), f = Na(d), p = r(() => {
		let e = S;
		return e.z.assign(e.w), e;
	})();
	l.side = e.BackSide, l.depthTest = !1, l.depthWrite = !1, l.vertexNode = p;
	let m = w(E.sub(u)), h = Qo(t, m, a, o, s), g = $o(h, "image"), _ = $o(h, "spot"), v = g?.bindings ?? [], y = _?.bindings ?? [], b = g?.uniforms ?? [], x = g?.samples, C = $o(h, "starfield")?.samples, T = ns(t, h, d), D = c ? Qi(v, i) : null, O = c ? $i(y, i) : null, k = T({
		direction: m,
		...h.sampleParameters,
		...Object.fromEntries(d.flatMap((e) => {
			let t = f[e.index];
			return [[`${e.parameterPrefix}Opacity`, t.opacity], [`${e.parameterPrefix}BlendMode`, t.blendMode]];
		}))
	});
	return D && v.forEach((e) => {
		let t = h.editorProjectionByLayerId.get(e.layer.id);
		t && (k = Co({
			color: k,
			activeValue: D[e.index].active,
			uv: t.uv,
			valid: t.valid
		}));
	}), O && y.forEach((e) => {
		let t = h.editorProjectionByLayerId.get(e.layer.id);
		t && (k = Co({
			color: k,
			activeValue: O[e.index].active,
			uv: t.uv,
			valid: t.valid
		}));
	}), l.colorNode = k, (D || O) && ia(l, (e) => {
		D && ea(D, e), O && ea(O, e);
	}), l.userData.webGpuLayerRuntime = h, l.userData.applyLayerParams = (e) => ts(h, e), Ua(l, (e) => es(e.nodes, l.userData.applyLayerParams)), Wa(l, l.userData.applyLayerParams), Ga(l, (e) => es(e.nodes, l.userData.applyLayerParams)), Ka(l, l.userData.applyLayerParams), qa(l, (e) => es(e.nodes, l.userData.applyLayerParams)), Ja(l, l.userData.applyLayerParams), Ya(l, (e) => Fa(f, e)), Xa(l, (e) => Ia(f, e)), ua(l, (e, t) => sa(b, e, t)), l.userData.applyImageTextures = (e) => jo(x?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.applyStarfieldTextures = (e) => Io(C?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.debugImageTextureSlots = h.textureSlotsByLayerId, l;
}
var as = ie("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.z, normalizedDirection.x);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n");
ie("\n  fn skyboxStudioDirectionToSourceStarfieldUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let theta = atan2(normalizedDirection.x, normalizedDirection.z);\n    let u = fract(theta / 6.283185307179586 + 0.5);\n    let v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / 3.141592653589793;\n\n    return vec2<f32>(u, v);\n  }\n");
function os(t) {
	let i = new n(), a = r(() => {
		let e = S;
		return e.z.assign(e.w), e;
	})(), o = w(E.sub(u));
	return i.side = e.BackSide, i.depthTest = !1, i.depthWrite = !1, i.vertexNode = a, i.colorNode = M(t, as({ direction: o })), i;
}
function ss(t, n, r, i, a) {
	let o = io(t.nodes), s = ao(t.nodes), c = oo(t.nodes), l = so(t.nodes), u = co(t.nodes), d = lo(t.nodes), f = uo(o), p = fo(s), m = po(c), h = mo(l), g = ho(u), _ = go(d), v = qo(t.nodes, "glsl", f, p, m, h, g, _), y = new e.ShaderMaterial({
		uniforms: {
			...Sa(o),
			...Ea(s),
			...ja(l),
			...Po(u, i),
			...La(d),
			...a ? ta(c, n) : {},
			...a ? na(l, n) : {},
			...ca(c),
			...ko(c, r)
		},
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: `
      precision highp float;
      ${o.map((e) => `uniform vec3 ${e.parameterPrefix}Axis;
      ${Array.from({ length: e.stopCount }, (t, n) => `uniform vec4 ${e.parameterPrefix}StopColor${n};
      uniform float ${e.parameterPrefix}StopMidpoint${n};
      uniform float ${e.parameterPrefix}StopT${n};`).join("\n")}`).join("\n")}
      ${s.map((e) => `uniform float ${e.parameterPrefix}Amplitude;
      uniform float ${e.parameterPrefix}Frequency;
      uniform float ${e.parameterPrefix}Mode;
      uniform float ${e.parameterPrefix}Power;
      ${Array.from({ length: e.anchorCount }, (t, n) => `uniform vec3 ${e.parameterPrefix}AnchorDirection${n};
      uniform vec3 ${e.parameterPrefix}AnchorColor${n};`).join("\n")}`).join("\n")}
      ${l.map((e) => `uniform vec3 ${e.parameterPrefix}CenterDirection;
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
      ${a ? `uniform float spotActive${e.index};` : ""}
      ${Array.from({ length: e.stopCount }, (t, n) => `uniform vec4 ${e.parameterPrefix}StopColor${n};
      uniform float ${e.parameterPrefix}StopMidpoint${n};
      uniform float ${e.parameterPrefix}StopT${n};`).join("\n")}`).join("\n")}
      ${c.map((e) => `uniform sampler2D imageTexture${e.index};
      uniform vec3 imageCenterDirection${e.index};
      uniform vec3 imageTangentX${e.index};
      uniform vec3 imageTangentY${e.index};
      uniform vec2 imageHalfSize${e.index};${a ? `
      uniform float imageActive${e.index};` : ""}`).join("\n")}
      ${u.map((e) => `uniform sampler2D starfieldTexture${e.index};`).join("\n")}
      ${d.map((e) => `uniform float ${e.parameterPrefix}Opacity;
      uniform float ${e.parameterPrefix}BlendMode;`).join("\n")}
      varying vec3 vDirection;
      ${bo()}
      ${To(c)}

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
        ${v}
        ${a ? Eo(c) : ""}
        ${a ? Do(l) : ""}
        gl_FragColor = vec4(composedColor, 1.0);
      }
    `
	});
	return (c.length > 0 || a && l.length > 0) && (y.extensions.derivatives = !0), a && ia(y, (e) => ra(y, c, l, e)), Ua(y, (e) => Ba(e.nodes, (e) => Ca(y, e, o))), Wa(y, (e) => Ca(y, e, o)), Ga(y, (e) => Va(e.nodes, (e) => Da(y, e, s))), Ka(y, (e) => Da(y, e, s)), qa(y, (e) => Ha(e.nodes, (e) => Ma(y, e, l))), Ja(y, (e) => Ma(y, e, l)), Ya(y, (e) => Ra(y, d, e)), Xa(y, (e) => za(y, d, e)), ua(y, (e, t) => la(y, c, e, t)), y.userData.applyImageTextures = (e) => Ao(y, c, e), y.userData.applyStarfieldTextures = (e) => Fo(y, u, e), y;
}
function cs(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function ls(t, n = {}) {
	let r = Rr(t, n), i = cs(r.width, r.height), a = i.getContext("2d");
	if (!a || !("putImageData" in a)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	a.putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
	let o = new e.CanvasTexture(i);
	return o.mapping = e.EquirectangularReflectionMapping, o.wrapS = e.RepeatWrapping, o.wrapT = e.ClampToEdgeWrapping, o.colorSpace = e.SRGBColorSpace, o.flipY = !1, o.needsUpdate = !0, o;
}
function us(t) {
	return new e.ShaderMaterial({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		uniforms: { skyboxTexture: { value: t } },
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: "\n      precision highp float;\n      uniform sampler2D skyboxTexture;\n      varying vec3 vDirection;\n\n      const float PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.z, normalizedDirection.x);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);\n      }\n\n      void main() {\n        vec3 direction = normalize(vDirection);\n        vec4 sampledColor = texture2D(skyboxTexture, directionToEquirectUv(direction));\n        gl_FragColor = vec4(sampledColor.rgb, sampledColor.a);\n      }\n    "
	});
}
function ds(e, t) {
	return fs(t) ? os(e) : us(e);
}
function fs(e) {
	return !!(e && "isWebGPURenderer" in e && e.isWebGPURenderer);
}
function ps(e, t) {
	return e === "auto" ? fs(t) ? "live-webgpu" : "live-webgl" : e;
}
function ms(e, t, n) {
	let r = (e) => {
		if (e.type === "group") return {
			children: e.children.map(r),
			enabled: e.enabled,
			id: e.id,
			type: e.type
		};
		if (t === "live-webgpu") {
			let t = Zo.find((t) => t.type === e.type);
			return {
				enabled: e.enabled,
				id: e.id,
				topology: t?.getTopologyKey(e) ?? null,
				type: e.type
			};
		}
		return e.type === "gradient" ? {
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
		} : e.type === "starfield" ? {
			enabled: e.enabled,
			id: e.id,
			type: e.type
		} : {
			anchorCount: e.params.anchors.length,
			enabled: e.enabled,
			id: e.id,
			type: e.type
		};
	};
	return JSON.stringify({
		editorPresentationEnabled: n,
		geometry: e.geometry?.type ?? B.type,
		nodes: e.nodes.map(r),
		renderMode: t
	});
}
function hs(e, t) {
	for (let n of e) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = hs(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
var gs = class extends e.Mesh {
	#e = {};
	#t = { ...qi };
	#n = !1;
	#r = B;
	#i = /* @__PURE__ */ new Map();
	#a = /* @__PURE__ */ new Map();
	#o = Vi;
	#s = null;
	#c = null;
	#l = "auto";
	#u = null;
	#d = null;
	#f = /* @__PURE__ */ new Map();
	#p = new e.Group();
	#m = /* @__PURE__ */ new Map();
	#h = /* @__PURE__ */ new Map();
	#g = /* @__PURE__ */ new Map();
	constructor() {
		super(Qa(B), is(Vi, qi, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), !1)), this.frustumCulled = !1, this.renderOrder = -1, this.#p.name = "Skybox live starfield patches", this.add(this.#p);
	}
	fromManifest(e) {
		return this.#o = fe(e), this.applyGeometry(this.#o.geometry ?? B), this;
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
		return this.#u = e, this.#d?.dispose(), this.#d = zi(e), this;
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
	refreshStarfieldTextureBindings() {
		if (ps(this.#l, this.#u) === "live-webgpu") {
			this.syncStarfieldPatchOverlay();
			return;
		}
		this.material.userData.applyStarfieldTextures?.(this.#g);
	}
	otherOverridingSetup() {
		return this;
	}
	load(e) {
		return e && (this.#u = e), this.setManifest(this.#o), this;
	}
	applyGeometry(e) {
		let t = Za(e);
		if (this.#r.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#r = t, this.geometry = Qa(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#c?.dispose(), this.#c = null;
	}
	clearStarfieldPatchOverlay() {
		this.#p.children.forEach((t) => {
			t instanceof e.Group && ki(t);
		}), this.#p.clear();
	}
	syncStarfieldPatchOverlay() {
		this.clearStarfieldPatchOverlay();
		let e = this.material.userData.debugImageTextureSlots;
		ps(this.#l, this.#u) === "live-webgpu" && es(this.#o.nodes, (t) => {
			if (t.type !== "starfield") return;
			let n = this.#m.get(t.id);
			if (!n) return;
			e && (e[t.id] = { value: n });
			let r = Oi(n, t.params);
			r.renderOrder = 0, this.#p.add(r);
		});
	}
	disposeStarfieldTextures() {
		this.#f.forEach((e) => {
			clearTimeout(e);
		}), this.#f.clear(), this.#g.forEach((e) => Mo(e)), this.#g.clear(), this.clearStarfieldPatchOverlay(), this.#m.clear(), this.#h.clear(), this.#d?.dispose(), this.#d = null;
	}
	syncStarfieldTextures() {
		let e = /* @__PURE__ */ new Set();
		es(this.#o.nodes, (t) => {
			if (t.type !== "starfield") return;
			e.add(t.id);
			let n = this.#d?.createBakeKey(t.params) ?? Un(t.params, 8192, 4096);
			this.#h.get(t.id) !== n && this.scheduleStarfieldTextureBake(t.id, t.params);
		}), Array.from(this.#g.keys()).forEach((t) => {
			if (e.has(t)) return;
			let n = this.#g.get(t);
			n && Mo(n), this.#g.delete(t), this.#m.delete(t), this.#h.delete(t);
		}), Array.from(this.#f.entries()).forEach(([t, n]) => {
			e.has(t) || (clearTimeout(n), this.#f.delete(t));
		}), this.syncStarfieldPatchOverlay();
	}
	scheduleStarfieldTextureBake(e, t) {
		let n = this.#d?.createBakeKey(t) ?? Un(t, 8192, 4096);
		if (this.#h.get(e) === n) return;
		let r = this.#f.get(e);
		r && clearTimeout(r);
		let i = setTimeout(() => {
			this.#f.delete(e);
			let t = hs(this.#o.nodes, e);
			if (t?.type !== "starfield") return;
			let r = this.#d?.createBakeKey(t.params) ?? Un(t.params, 8192, 4096);
			if (r !== n) {
				this.scheduleStarfieldTextureBake(e, t.params);
				return;
			}
			if (this.#d?.canBake()) {
				if (ps(this.#l, this.#u) === "live-webgpu") {
					let n = this.#d.bakePatchTextures(t.params, r);
					this.#m.set(e, n), this.#h.set(e, r);
				} else {
					let n = this.#d.bakeTexture(t.params, r), i = this.#g.get(e);
					i && i !== n && Mo(i), this.#g.set(e, n), this.#h.set(e, r);
				}
				this.refreshStarfieldTextureBindings(), this.dispatchEvent({ type: "starfieldtexturechange" });
			}
		}, 150);
		this.#f.set(e, i);
	}
	replaceMaterial(e, t = null) {
		let n = this.material;
		this.material = e, e.userData.applyEditorLayerState?.(this.#t), this.#i.forEach((t, n) => {
			e.userData.applyImageLayerPlacement?.(n, t);
		}), e.userData.applyStarfieldTextures?.(this.#g), n.dispose(), this.disposeOwnedTexture(), this.#c = t;
	}
	applyLiveManifestUniformUpdates() {
		this.material.userData.applyCompositionParams?.(this.#o), this.material.userData.applyLayerParams ? es(this.#o.nodes, this.material.userData.applyLayerParams) : (this.material.userData.applyGradientLayerParams?.(this.#o), this.material.userData.applyFieldGradientLayerParams?.(this.#o), this.material.userData.applySpotLayerParams?.(this.#o)), this.material.userData.applyImageTextures?.(this.#a), this.material.userData.applyStarfieldTextures?.(this.#g), this.material.userData.applyEditorLayerState?.(this.#t), this.#i.forEach((e, t) => {
			this.material.userData.applyImageLayerPlacement?.(t, e);
		});
	}
	setEditorPresentationEnabled(e) {
		return this.#n === e ? this : (this.#n = e, this.#s = null, this.setManifest(this.#o), this);
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
		let n = hs(this.#o.nodes, e);
		return n?.type === "image" && (n.params = {
			...n.params,
			placement: t
		}), this.#i.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this;
	}
	updateLayerComposition(e, t) {
		let n = hs(this.#o.nodes, e);
		return n ? (t.blendMode !== void 0 && (n.blendMode = t.blendMode), t.opacity !== void 0 && (n.opacity = t.opacity), this.material.userData.applyLayerComposition?.(n), this) : this;
	}
	updateGradientLayer(e, t) {
		let n = hs(this.#o.nodes, e);
		return n?.type === "gradient" ? (n.params = t, this.material.userData.applyGradientLayerParam?.(n), this) : this;
	}
	updateFieldGradientLayer(e, t) {
		let n = hs(this.#o.nodes, e);
		return n?.type === "field-gradient" ? (n.params = t, this.material.userData.applyFieldGradientLayerParam?.(n), this) : this;
	}
	updateSpotLayer(e, t) {
		let n = hs(this.#o.nodes, e);
		return n?.type === "spot" ? (n.params = t, this.material.userData.applySpotLayerParam?.(n), this) : this;
	}
	updateStarfieldLayer(e, t) {
		let n = hs(this.#o.nodes, e);
		return n?.type === "starfield" ? (n.params = t, this.scheduleStarfieldTextureBake(e, t), this) : this;
	}
	setManifest(e) {
		let t = fe(e);
		this.#o = t, this.applyGeometry(this.#o.geometry ?? this.#r), this.syncStarfieldTextures();
		let n = ps(this.#l, this.#u), r = ms(this.#o, n, this.#n);
		if (this.#s === r && (n === "live-webgpu" || n === "live-webgl")) return this.applyLiveManifestUniformUpdates(), this;
		if (n === "live-webgpu") this.replaceMaterial(is(this.#o, this.#t, this.#a, this.#g, this.#m, this.#n));
		else if (n === "live-webgl") this.replaceMaterial(ss(this.#o, this.#t, this.#a, this.#g, this.#n));
		else {
			let e = ls(this.#o, this.#e);
			this.replaceMaterial(ds(e, this.#u), e);
		}
		return this.#s = r, this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(ds(e, this.#u)), this.#s = null, this;
	}
	invalidateBakeCache() {
		return Pr(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture(), this.disposeStarfieldTextures();
	}
};
//#endregion
export { Or as DEFAULT_BAKE_WIDTH, Be as DEFAULT_SPOT_BASE_ANGULAR_RADIUS, Ct as DEFAULT_STARFIELD_CLIP, G as DEFAULT_STARFIELD_NEBULA, K as DEFAULT_STARFIELD_NEBULA_FIELD, wt as DEFAULT_STARFIELD_PARAMS, bt as DEFAULT_STARFIELD_QUALITY, W as DEFAULT_STARFIELD_STARS, _e as IMAGE_PLACEMENT_ELEVATION_LIMIT, yt as STARFIELD_PREVIEW_BAKE_WIDTH, xt as STARFIELD_QUALITY_PRESETS, gs as Skybox, Ri as StarfieldGpuBakeService, Rr as bakeSkyboxImageData, qn as bakeStarfieldImageData, ce as blendChannel, L as clamp, le as compositeBlendChannel, ue as compositeOver, Ae as createAngularDecalPlacement, Nr as createBakeCacheKey, ls as createBakedSkyboxTexture, Ue as createDefaultSpotParams, ke as createImagePlacementTangents, Qa as createSkyboxGeometry, eo as createSkyboxWireGeometry, bn as createStarCatalogForCoverage, xn as createStarCatalogForDescriptor, Un as createStarfieldBakeCacheKey, zi as createStarfieldGpuBakeService, qt as createStarfieldPatchLayout, Ne as directionFromPosition, lr as equirectPointToDirection, ur as equirectUvToDirection, Dr as evaluateSkyboxDirection, Dt as getStarfieldQualityPreset, Pr as invalidateBakeCache, z as linearChannelToSrgb, oe as linearRgbToSrgbBytes, fe as migrateManifestToV2, je as normalizeImagePlacement, We as normalizeSpotParams, Lt as normalizeStarfieldCoverage, Zt as normalizeStarfieldParams, Et as normalizeStarfieldQuality, V as normalizeVector, ae as parseHexColor, Pe as placementFromPosition, Re as placementFromRotation, Ie as placementFromScale, Me as positionFromPlacement, Ge as positionFromSpot, ze as projectDirectionToImageUv, fn as qFromV, qe as radiusScaleFromSpot, Mr as resolveBakeOptions, Le as rotationFromPlacement, Hn as sampleStarfieldLayer, Fe as scaleFromPlacement, Nt as sourceDirectionFromUv, Pt as sourceFoldEquirectUv, Ft as sourceUvFromDirection, Ye as spotContainsDirection, Ke as spotFromPosition, Je as spotFromRadiusScale, R as srgbChannelToLinear, sn as starfieldClipContainsDirection, jn as starfieldFieldGradientToSourceField };
