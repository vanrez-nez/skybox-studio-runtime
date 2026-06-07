import * as e from "three";
import { MeshBasicNodeMaterial as t, NodeMaterial as n } from "three/webgpu";
import { Fn as r, If as i, Loop as a, PI as o, acos as s, atan as c, attribute as l, cameraPosition as u, clamp as d, cos as f, dot as p, exp as m, float as h, floor as g, int as _, max as v, min as y, mix as b, mod as x, modelViewProjection as S, mx_fractal_noise_float as C, normalize as w, positionGeometry as ee, positionWorld as T, pow as E, select as D, sin as te, smoothstep as O, step as k, texture as A, uniform as j, uniformArray as ne, uniformTexture as M, uv as re, varyingProperty as ie, vec2 as N, vec3 as P, vec4 as ae, wgslFn as F } from "three/tsl";
//#region math.ts
function I(e, t = 0, n = 1) {
	return Math.min(n, Math.max(t, e));
}
function oe(e) {
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
function L(e) {
	let t = I(e);
	return t <= .0031308 ? t * 12.92 : 1.055 * t ** (1 / 2.4) - .055;
}
function se(e) {
	let t = e.trim().replace(/^#/, ""), n = t.length === 3 ? t.split("").map((e) => `${e}${e}`).join("") : t;
	return /^[0-9a-fA-F]{6}$/.test(n) ? [
		0,
		2,
		4
	].map((e) => oe(Number.parseInt(n.slice(e, e + 2), 16) / 255)) : [
		1,
		1,
		1
	];
}
function ce(e) {
	return e.map((e) => Math.round(L(e) * 255));
}
function le(e) {
	return e <= .25 ? ((16 * e - 12) * e + 4) * e : Math.sqrt(e);
}
function ue(e, t, n) {
	let r = I(t), i = I(n);
	switch (e) {
		case "multiply": return r * i;
		case "screen": return r + i - r * i;
		case "overlay": return r <= .5 ? 2 * r * i : 1 - 2 * (1 - r) * (1 - i);
		case "darken": return Math.min(r, i);
		case "lighten": return Math.max(r, i);
		case "color-dodge": return r === 0 ? 0 : i === 1 ? 1 : Math.min(1, r / (1 - i));
		case "color-burn": return r === 1 ? 1 : i === 0 ? 0 : 1 - Math.min(1, (1 - r) / i);
		case "hard-light": return i <= .5 ? 2 * r * i : r + (2 * i - 1) - r * (2 * i - 1);
		case "soft-light": return i <= .5 ? r - (1 - 2 * i) * r * (1 - r) : r + (2 * i - 1) * (le(r) - r);
		case "difference": return Math.abs(r - i);
		case "exclusion": return r + i - 2 * r * i;
		default: return i;
	}
}
function de(e, t, n, r) {
	let i = I(t), a = I(r);
	return I(I(ue(e, i, n)) * a + i * (1 - a));
}
function fe(e, t, n, r) {
	return [
		de(r, e[0], t[0], n),
		de(r, e[1], t[1], n),
		de(r, e[2], t[2], n)
	];
}
function pe(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n += 1) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return (t >>> 0).toString(36);
}
//#endregion
//#region manifest.ts
var R = { type: "box" };
function me(e) {
	return e.version === 2 ? {
		...e,
		geometry: e.geometry ?? R
	} : {
		composition: e.composition,
		geometry: R,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	};
}
//#endregion
//#region layer-addons/registry.ts
var he = /* @__PURE__ */ new Map();
function ge(e) {
	let t = he.get(e.type);
	he.set(e.type, {
		...t ?? { type: e.type },
		...e
	});
}
function _e(e) {
	return he.get(e);
}
function ve() {
	return Array.from(he.values());
}
function ye(e) {
	return he.has(e);
}
//#endregion
//#region layer-addons/cpu-sampling.ts
var be = Math.PI * 2;
function xe(e, t) {
	let n = (e - .5) * be, r = (.5 - t) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function Se(e, t) {
	let n = (e - .5) * be, r = (t - .5) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
//#endregion
//#region image-placement-transform.ts
var Ce = [
	0,
	1,
	0
], we = [
	0,
	0,
	-1
], Te = [
	1,
	0,
	0
], Ee = [
	0,
	1,
	0
], De = 89.9;
function Oe(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function ke(e) {
	return e * Math.PI / 180;
}
function Ae(e) {
	return e * 180 / Math.PI;
}
function je(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Me(e) {
	return (Math.round(e) % 360 + 360) % 360;
}
function Ne(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function Pe(e, t) {
	return [
		e[0] - t[0],
		e[1] - t[1],
		e[2] - t[2]
	];
}
function Fe(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function Ie(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function Le(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function z(e, t = we) {
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
function Re(e, t, n) {
	let r = ke(n), i = Math.cos(r), a = Math.sin(r), o = z(t);
	return z(Ie(Ie(Fe(e, i), Fe(Le(o, e), a)), Fe(o, Ne(o, e) * (1 - i))), e);
}
function ze(e, t = Ce, n = 0) {
	let r = z(e), i = Pe(z(t, Ce), Fe(r, Ne(z(t, Ce), r)));
	if (Math.hypot(i[0], i[1], i[2]) < 1e-6) {
		let e = Math.abs(r[1]) > .98 ? [
			0,
			0,
			1
		] : Ce;
		i = Pe(e, Fe(r, Ne(e, r)));
	}
	return i = z(i, Ee), {
		tangentX: Re(z(Le(r, i), Te), r, n),
		tangentY: Re(i, r, n)
	};
}
function Be({ angularHeight: e, angularWidth: t, baseAngularHeight: n, baseAngularWidth: r, centerDirection: i, rotation: a = 0, upDirection: o = Ce }) {
	let s = z(i), c = Me(a), { tangentX: l, tangentY: u } = ze(s, o, c), d = Math.max(1e-4, e), f = Math.max(1e-4, t);
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
function Ve(e) {
	let t = e, n = z(t?.centerDirection ?? t?.normal ?? t?.center, we), r = Array.isArray(t?.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, i = typeof t?.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t?.width ?? .4) / (2 * r)), a = typeof t?.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t?.height ?? .3) / (2 * r));
	return Be({
		angularHeight: a,
		angularWidth: i,
		baseAngularHeight: typeof t?.baseAngularHeight == "number" ? t.baseAngularHeight : a,
		baseAngularWidth: typeof t?.baseAngularWidth == "number" ? t.baseAngularWidth : i,
		centerDirection: n,
		rotation: typeof t?.rotation == "number" ? t.rotation : 0
	});
}
function He(e) {
	let t = z(e.centerDirection);
	return {
		x: je(Ae(Math.atan2(t[0], -t[2]))),
		y: Ae(Math.asin(Oe(t[1], -1, 1)))
	};
}
function Ue(e) {
	let t = ke(e.x), n = ke(Oe(e.y, -89.9, De)), r = Math.cos(n);
	return z([
		Math.sin(t) * r,
		Math.sin(n),
		-Math.cos(t) * r
	]);
}
function We(e, t, n) {
	let r = Ve(e);
	return Be({
		angularHeight: r.angularHeight,
		angularWidth: r.angularWidth,
		baseAngularHeight: r.baseAngularHeight,
		baseAngularWidth: r.baseAngularWidth,
		centerDirection: Ue(t),
		rotation: r.rotation,
		upDirection: n?.upDirection
	});
}
function Ge(e) {
	let t = Ve(e);
	return {
		x: t.angularWidth / t.baseAngularWidth,
		y: t.angularHeight / t.baseAngularHeight
	};
}
function Ke(e, t) {
	let n = Ve(e);
	return {
		...n,
		angularHeight: Math.max(1e-4, n.baseAngularHeight * Math.max(1e-4, t.y)),
		angularWidth: Math.max(1e-4, n.baseAngularWidth * Math.max(1e-4, t.x))
	};
}
function qe(e) {
	return Ve(e).rotation;
}
function Je(e, t) {
	let n = Ve(e);
	return Be({
		angularHeight: n.angularHeight,
		angularWidth: n.angularWidth,
		baseAngularHeight: n.baseAngularHeight,
		baseAngularWidth: n.baseAngularWidth,
		centerDirection: n.centerDirection,
		rotation: t
	});
}
function Ye(e, t) {
	let n = Ve(t), r = z(e), i = Ne(r, n.centerDirection);
	if (i <= 0) return null;
	let a = Ne(r, n.tangentX) / i, o = Ne(r, n.tangentY) / i, s = Math.tan(n.angularWidth / 2), c = Math.tan(n.angularHeight / 2);
	return s <= 0 || c <= 0 || a < -s || a > s || o < -c || o > c ? null : {
		u: a / (2 * s) + .5,
		v: .5 - o / (2 * c)
	};
}
//#endregion
//#region spot-transform.ts
var Xe = Math.PI / 12;
function B(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Ze(e) {
	return e * 180 / Math.PI;
}
function Qe(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function $e() {
	return {
		angularRadius: Xe,
		baseAngularRadius: Xe,
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
function et(e) {
	let t = e, n = $e(), r = Math.max(1e-4, typeof t?.baseAngularRadius == "number" ? t.baseAngularRadius : n.baseAngularRadius);
	return {
		angularRadius: Math.max(1e-4, typeof t?.angularRadius == "number" ? t.angularRadius : r),
		baseAngularRadius: r,
		brightness: Math.max(0, typeof t?.brightness == "number" ? t.brightness : n.brightness),
		centerDirection: z(t?.centerDirection, n.centerDirection),
		colorMode: t?.colorMode === "gradient" ? "gradient" : "light",
		coreRadius: B(typeof t?.coreRadius == "number" ? t.coreRadius : n.coreRadius, .01, .7),
		coreSoftness: B(typeof t?.coreSoftness == "number" ? t.coreSoftness : n.coreSoftness, .4, 6),
		dispersion: B(typeof t?.dispersion == "number" ? t.dispersion : n.dispersion, 0, 1),
		dogSpread: B(typeof t?.dogSpread == "number" ? t.dogSpread : n.dogSpread, .015, .18),
		dogStrength: B(typeof t?.dogStrength == "number" ? t.dogStrength : n.dogStrength, 0, 1.8),
		dogStretch: B(typeof t?.dogStretch == "number" ? t.dogStretch : n.dogStretch, 0, .55),
		glareSize: B(typeof t?.glareSize == "number" ? t.glareSize : n.glareSize, .03, 1.1),
		glareStrength: B(typeof t?.glareStrength == "number" ? t.glareStrength : n.glareStrength, 0, 1.4),
		glow: B(typeof t?.glow == "number" ? t.glow : n.glow, 0, 1),
		glowSize: B(typeof t?.glowSize == "number" ? t.glowSize : n.glowSize, .05, 1.4),
		glowStrength: B(typeof t?.glowStrength == "number" ? t.glowStrength : n.glowStrength, 0, 1),
		halo: B(typeof t?.halo == "number" ? t.halo : n.halo, 0, 1),
		haloInnerWidth: B(typeof t?.haloInnerWidth == "number" ? t.haloInnerWidth : n.haloInnerWidth, .003, .09),
		haloOuterWidth: B(typeof t?.haloOuterWidth == "number" ? t.haloOuterWidth : n.haloOuterWidth, .01, .24),
		haloRadius: B(typeof t?.haloRadius == "number" ? t.haloRadius : n.haloRadius, .04, 1),
		haloStrength: B(typeof t?.haloStrength == "number" ? t.haloStrength : n.haloStrength, 0, 1.4),
		lightColor: typeof t?.lightColor == "string" ? t.lightColor : n.lightColor,
		stops: (t?.stops?.length ? t.stops : n.stops).map((e) => ({
			color: e.color,
			location: B(e.location, 0, 100),
			midpoint: B(e.midpoint ?? 50, 1, 99),
			opacity: B(e.opacity, 0, 100)
		}))
	};
}
function tt(e) {
	let t = z(e.centerDirection);
	return {
		x: Qe(Ze(Math.atan2(t[0], -t[2]))),
		y: Ze(Math.asin(B(t[1], -1, 1)))
	};
}
function nt(e, t) {
	return {
		...et(e),
		centerDirection: Ue({
			x: t.x,
			y: B(t.y, -De, De)
		})
	};
}
function rt(e) {
	let t = et(e);
	return t.angularRadius / t.baseAngularRadius;
}
function it(e, t) {
	let n = et(e);
	return {
		...n,
		angularRadius: Math.max(1e-4, n.baseAngularRadius * Math.max(1e-4, t))
	};
}
function at(e, t) {
	let n = et(t), r = z(e), i = z(n.centerDirection), a = r[0] * i[0] + r[1] * i[1] + r[2] * i[2];
	return Math.acos(B(a, -1, 1)) <= n.angularRadius;
}
//#endregion
//#region starfield-static.ts
var V = Math.PI * 2, ot = 8, st = 1e3, ct = 2, lt = 128, ut = 64, dt = 4, ft = 8, pt = 12, mt = 2048 * 1024 * 1024, ht = 512 * 1024 * 1024, gt = 8, _t = 1.75, vt = 3.25, yt = 1, bt = 1.5, xt = 8, St = 2048, Ct = 5, wt = 12, Tt = .35, Et = .25, Dt = [
	1,
	2,
	4,
	8,
	16
], Ot = 1024, kt = 8192, At = "medium", jt = {
	high: { budgetBytes: mt },
	medium: { budgetBytes: ht }
}, H = {
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
}, U = {
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
}, Mt = [
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
], W = {
	amplitude: .045,
	anchors: Mt.map((e) => ({
		color: zt(e.color),
		...Gt(e.dir)
	})),
	frequency: 2.2,
	mode: "inverse-distance",
	power: 2
}, Nt = {
	altitudeCenterDeg: 0,
	altitudeSpanDeg: 180,
	azimuthCenterDeg: 0,
	azimuthSpanDeg: 360
}, Pt = {
	clip: Nt,
	nebula: U,
	nebulaField: W,
	quality: At,
	stars: H
}, Ft = /* @__PURE__ */ new Map();
function G(e, t, n = -Infinity, r = Infinity) {
	return I(Number.isFinite(Number(e)) ? Number(e) : t, n, r);
}
function It(e) {
	return e === "high" ? "high" : At;
}
function Lt(e) {
	return jt[It(e)];
}
function Rt(e, t) {
	return Array.isArray(e) ? [
		G(e[0], t[0], 0, 1),
		G(e[1], t[1], 0, 1),
		G(e[2], t[2], 0, 1)
	] : [...t];
}
function zt(e) {
	return `#${e.map((e) => Math.round(I(e) * 255).toString(16).padStart(2, "0")).join("")}`;
}
function Bt(e) {
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
function Vt(e) {
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
function Ht(e, t) {
	return Vt(Array.isArray(e) ? [
		G(e[0], t[0]),
		G(e[1], t[1]),
		G(e[2], t[2])
	] : t);
}
function Ut(e, t) {
	let n = (e - .5) * V, r = I(t, 0, 1) * Math.PI, i = Math.sin(r);
	return Vt([
		i * Math.sin(n),
		Math.cos(r),
		i * Math.cos(n)
	]);
}
function Wt(e, t) {
	let n = (t % 2 + 2) % 2, r = +(n >= 1), i = e + r * .5, a = r ? 2 - n : n;
	return {
		u: i,
		v: a,
		x: i,
		y: a
	};
}
function Gt(e) {
	let t = Vt(e), n = ((Math.atan2(t[0], t[2]) / V + .5) % 1 + 1) % 1, r = Math.acos(I(t[1], -1, 1)) / Math.PI;
	return {
		u: n,
		v: r,
		x: n,
		y: r
	};
}
function Kt(e = {}) {
	let t = Number(e.azimuthCenterDeg) || 0, n = G(e.azimuthSpanDeg, Nt.azimuthSpanDeg, 1, 360), r = G(e.altitudeSpanDeg, Nt.altitudeSpanDeg, 1, 180), i = Math.max(0, 90 - r * .5);
	return {
		altitudeCenterDeg: G(e.altitudeCenterDeg, Nt.altitudeCenterDeg, -i, i),
		altitudeSpanDeg: r,
		azimuthCenterDeg: t,
		azimuthSpanDeg: n
	};
}
function qt(e) {
	let t = Kt(e), n = t.altitudeCenterDeg + t.altitudeSpanDeg * .5, r = t.altitudeCenterDeg - t.altitudeSpanDeg * .5, i = t.azimuthSpanDeg >= 359.999, a = i ? 0 : .5 + (t.azimuthCenterDeg - t.azimuthSpanDeg * .5) / 360, o = i ? 1 : t.azimuthSpanDeg / 360, s = (90 - n) / 180, c = (n - r) / 180;
	return {
		altitudeSpanRad: c * Math.PI,
		azimuthSpanRad: o * V,
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
function Jt(e, t = lt) {
	return Math.max(t, Math.ceil(Math.max(1, e) / t) * t);
}
function Yt(e, t) {
	return Math.max(1, Math.min(t, Jt(e)));
}
function Xt(e, t, n) {
	return Math.max(0, Math.round(e) * Math.round(t) * n);
}
function Zt({ accumulationBytes: e, patchCount: t, residentBytesPerPixel: n = dt, storageHeight: r, storageWidth: i, supersample: a }) {
	let o = Xt(i, r, n) * t, s = Xt(i * a, r * a, e);
	return {
		peakBytes: o + s,
		residentBytes: o,
		scratchBytes: s
	};
}
function Qt({ accumulationBytes: e, budgetBytes: t, maxTextureSize: n, patchCount: r, residentBytesPerPixel: i = dt, storageHeight: a, storageWidth: o }) {
	let s = Math.max(1, Math.min(gt, Math.floor(n / Math.max(1, o)), Math.floor(n / Math.max(1, a))));
	for (let n = s; n >= 1; --n) {
		let s = Zt({
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
	let c = Zt({
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
function $t({ accumulationBytes: e, budgetBytes: t, coverage: n, grid: r, idealVirtualHeight: i, idealVirtualWidth: a, maxQualityScale: o = 1, maxTextureSize: s, residentBytesPerPixel: c = dt }) {
	let l = qt(n), u = r === 1 ? 0 : ut, d = Math.max(1, s - u * 2), f = Math.max(1, s - u * 2), p = Math.max(1, a / r), m = Math.max(1, i / r), h = Math.min(1, Math.max(.001, o), d / p, f / m), g = r * r, _ = Math.max(.001, h), v = null;
	for (let n = 0; n < 18; n += 1) {
		let n = Yt(p * _, d), r = Yt(m * _, f), i = n + u * 2, a = r + u * 2, o = Qt({
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
		if (Math.abs(l - _) < .001 || n <= lt || r <= lt) break;
		_ = Math.max(.001, l);
	}
	if (!v) {
		let n = Yt(p * _, d), r = Yt(m * _, f), i = n + u * 2, a = r + u * 2;
		v = {
			allocation: Qt({
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
function en(e, t, n) {
	return {
		x: e.coverageUvMin.x + t / e.columns * e.coverageUvSize.x,
		y: e.coverageUvMin.y + n / e.rows * e.coverageUvSize.y
	};
}
function tn(e) {
	return {
		x: e.coverageUvSize.x / e.columns,
		y: e.coverageUvSize.y / e.rows
	};
}
function nn(e, t, n, r) {
	let i = en(e, t, n), a = tn(e), o = Math.min(r, Math.max(1, Math.round(e.contentWidth))), s = Math.min(r, Math.max(1, Math.round(e.contentHeight))), c = Math.min(r, o + e.guard * 2), l = Math.min(r, s + e.guard * 2), u = Math.max(0, (c - o) * .5), d = Math.max(0, (l - s) * .5), f = a.x * (u / o), p = a.y * (d / s), m = e.wrapsHorizontally && e.columns === 1;
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
function rn({ accumulationBytes: e = ft, budgetBytes: t = mt, clip: n, height: r, maxTextureSize: i = 4096, residentBytesPerPixel: a = pt, width: o }) {
	let s = qt(n), c = Math.max(1, o * s.uvSize.x), l = Math.max(1, r * s.uvSize.y), u = Math.max(1, o), d = Math.max(1, r), f = (e, t) => Dt.find((n) => {
		let r = Math.max(1, i - (n === 1 ? 0 : ut) * 2);
		return e / n <= r && t / n <= r;
	}) ?? Dt[Dt.length - 1], p = $t({
		accumulationBytes: e,
		budgetBytes: t,
		grid: f(u, d),
		idealVirtualHeight: d,
		idealVirtualWidth: u,
		maxTextureSize: i,
		residentBytesPerPixel: a
	}), m = f(c, l), h = $t({
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
	for (let e = 0; e < m; e += 1) for (let t = 0; t < m; t += 1) y.push(nn(v, t, e, i));
	return {
		...v,
		descriptors: y
	};
}
function an(e) {
	return !!(e && typeof e == "object" && "mode" in e && !("blend" in e));
}
function on(e) {
	let t = Array.isArray(e?.anchors) && e.anchors.length ? e.anchors : Mt;
	return {
		amplitude: G(e?.warp?.amp, W.amplitude, 0, .6),
		anchors: t.slice(0, ot).map((e, t) => {
			let n = Mt[t] ?? Mt[0], r = Ht(e?.dir, n.dir);
			return {
				color: Array.isArray(e?.color) ? zt(Rt(e.color, n.color)) : typeof e?.color == "string" ? e.color : zt(n.color),
				...Gt(r)
			};
		}),
		frequency: G(e?.warp?.freq, W.frequency, .3, 4),
		mode: e?.blend === "gaussian" ? "gaussian" : "inverse-distance",
		power: G(e?.power, W.power, .4, 6)
	};
}
function sn(e) {
	if (!an(e)) return on(e);
	let t = Array.isArray(e.anchors) && e.anchors.length ? e.anchors : W.anchors;
	return {
		amplitude: G(e.amplitude, W.amplitude, 0, .6),
		anchors: t.slice(0, ot).map((e, t) => ({
			color: typeof e?.color == "string" ? e.color : W.anchors[t]?.color ?? "#ffffff",
			x: G(e?.x, W.anchors[t]?.x ?? .5, 0, 1),
			y: G(e?.y, W.anchors[t]?.y ?? .5, 0, 1)
		})),
		frequency: G(e.frequency, W.frequency, .3, 4),
		mode: e.mode === "gaussian" ? "gaussian" : "inverse-distance",
		power: G(e.power, W.power, .4, 6)
	};
}
function cn(e = {}) {
	let t = e.stars ?? H, n = e.nebula ?? U;
	return {
		clip: Kt(e.clip),
		nebula: {
			uBaseScale: G(n.uBaseScale, U.uBaseScale, .001, 100),
			uCloudCore: Rt(n.uCloudCore, U.uCloudCore),
			uCloudHighlight: Rt(n.uCloudHighlight, U.uCloudHighlight),
			uCloudShadow: Rt(n.uCloudShadow, U.uCloudShadow),
			uColorWarpAmp: G(n.uColorWarpAmp, U.uColorWarpAmp, 0, 1),
			uColorWarpFreq: G(n.uColorWarpFreq, U.uColorWarpFreq, .001, 20),
			uContrast: G(n.uContrast, U.uContrast, .05, 12),
			uCoverage: G(n.uCoverage, U.uCoverage, .02, .98),
			uDensity: G(n.uDensity, U.uDensity, 0, 10),
			uLightFocus: G(n.uLightFocus, U.uLightFocus, .001, 8),
			uLightIntensity: G(n.uLightIntensity, U.uLightIntensity, 0, 4),
			uLightLining: G(n.uLightLining, U.uLightLining, 0, 4),
			uNebulaExposure: G(n.uNebulaExposure, U.uNebulaExposure, .001, 4),
			uNebulaStrength: G(n.uNebulaStrength, U.uNebulaStrength, 0, 20),
			uOctaves: G(n.uOctaves, U.uOctaves, 1, 8),
			uOpacity: G(n.uOpacity, U.uOpacity, 0, 1),
			uSeed: G(n.uSeed, U.uSeed),
			uSoftness: G(n.uSoftness, U.uSoftness, .001, 2)
		},
		nebulaField: sn(e.nebulaField),
		quality: It(e.quality),
		stars: {
			uBright: G(t.uBright, H.uBright, 0, 8),
			uBrightVar: G(t.uBrightVar, H.uBrightVar, 0, 1),
			uColorVar: G(t.uColorVar, H.uColorVar, 0, 1),
			uDensity: G(t.uDensity, H.uDensity, 0, 2e3),
			uGlareSize: G(t.uGlareSize, H.uGlareSize, 0, 12),
			uGlareStr: G(t.uGlareStr, H.uGlareStr, 0, 4),
			uGlareVar: G(t.uGlareVar, H.uGlareVar, 0, 1),
			uLargeStarRarity: G(t.uLargeStarRarity, H.uLargeStarRarity, 0, 1),
			uSeed: G(t.uSeed, H.uSeed),
			uSizeVar: G(t.uSizeVar, H.uSizeVar, 0, 1),
			uStarSize: G(t.uStarSize, H.uStarSize, .01, 8)
		}
	};
}
function K(e, t, n) {
	return e + (t - e) * n;
}
function ln(e, t, n) {
	return [
		K(e[0], t[0], n),
		K(e[1], t[1], n),
		K(e[2], t[2], n)
	];
}
function q(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function J(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function un(e, t) {
	return [
		e[0] * t[0],
		e[1] * t[1],
		e[2] * t[2]
	];
}
function dn(e, t, n) {
	let r = I((n - e) / Math.max(t - e, 1e-5));
	return r * r * (3 - 2 * r);
}
function fn(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function pn(e) {
	return Math.max(0, 2 * (1 - I(e, -1, 1)));
}
function mn(e, t) {
	return ((e - t) % 1 + 1.5) % 1 - .5;
}
function hn(e, t, n) {
	if (t < n.uvMin.y || t > n.uvMin.y + n.uvSize.y) return !1;
	if (n.wrapsHorizontally) return !0;
	let r = n.uvMin.x + n.uvSize.x * .5;
	return Math.abs(mn(e, r)) <= n.uvSize.x * .5;
}
function gn(e, t, n) {
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
function _n(e, t) {
	let n = qt(t), r = Gt(e);
	return hn(r.u, r.v, n);
}
function vn(e) {
	return (Math.floor(e * 1000003) ^ 2654435769) >>> 0;
}
function yn(e) {
	let t = e >>> 0;
	return t = Math.imul(t ^ t >>> 16, 2146121005), t = Math.imul(t ^ t >>> 15, 2221713035), (t ^ t >>> 16) >>> 0;
}
function bn(e, t, n, r) {
	let i = Math.imul(t + 2654435769 >>> 0, 2246822507), a = Math.imul(n + 3266489909 >>> 0, 668265263), o = Math.imul(r + 374761393 >>> 0, 2654435761);
	return yn((e ^ i ^ a ^ o) >>> 0) / 4294967296;
}
function xn(e, t) {
	return (e % t + t) % t;
}
function Sn(e) {
	return (1 - Math.cos(I(e, 0, 1) * Math.PI)) * .5;
}
function Cn(e) {
	let t = Math.max(1, Math.round(e.uDensity)), n = I(t / st, 0, 1);
	return {
		activationThreshold: n * n,
		columns: st,
		density: t,
		densityScale: n,
		rows: st,
		seed: vn(e.uSeed)
	};
}
function wn(e, t = 1, n = 0) {
	return I(e, 0, 1) ** Ct * (1 + (I(t, 0, 1) ** wt - 1) * I(n, 0, 1));
}
function Tn(e, t, n, r, i) {
	let a = wn(e, t, n), o = r + (Math.max(r, a) - r) * Tt, s = i + (Math.max(i, a) - i) * Et, c = o ** 3, l = s ** 8, u = I(a * .3 + c * .55 + l * .15, 0, 1);
	return u >= .78 || c > .85 && (a > .65 || l > .35) ? 3 : u >= .52 || c > .62 || l > .65 && a > .45 ? 2 : u < .16 && a < .35 && c < .08 && l < .08 ? 0 : 1;
}
function En(e, t, n, r = 0) {
	if (n < 0 || n >= e.rows) return null;
	let i = xn(t, e.columns);
	if (bn(e.seed, i, n, 0) >= e.activationThreshold) return null;
	let a = (i + bn(e.seed, i, n, 1)) / e.columns, o = 1 - (n + bn(e.seed, i, n, 2)) / e.rows * 2, s = (a - .5) * V, c = Math.sqrt(Math.max(0, 1 - o * o)), l = bn(e.seed, i, n, 3), u = bn(e.seed, i, n, 4), d = bn(e.seed, i, n, 5), f = bn(e.seed, i, n, 6), p = bn(e.seed, i, n, 7);
	return {
		classId: Tn(l, p, r, u, d),
		column: i,
		rBright: u,
		rColor: f,
		rGlare: d,
		rSize: l,
		rSizeGate: p,
		row: n,
		u: a,
		v: Math.acos(I(o, -1, 1)) / Math.PI,
		x: c * Math.sin(s),
		y: o,
		z: c * Math.cos(s)
	};
}
function Dn(e, t, n, r) {
	if (t - e >= 1) return !0;
	let i = n / r, a = (n + 1) / r;
	for (let n = -1; n <= 1; n += 1) if (a + n >= e && i + n <= t) return !0;
	return !1;
}
function On(e, t) {
	let n = Math.PI / Math.max(1, t), r = Math.PI / St, i = Math.max(e.uStarSize * r, _t * Math.max(n, r)), a = Math.max((e.uStarSize + e.uGlareSize) * r, vt * Math.max(n, r));
	return Math.max(i * .45, a * .36, n, r) * xt;
}
function kn({ height: e, includeSeamCopies: t, rawVMax: n, rawVMin: r, seamCopies: i, stars: a, uMax: o, uMin: s, wrapsHorizontally: c }) {
	let l = Cn(a), u = On(a, e) / Math.PI, d = I(r, 0, 1), f = I(n, 0, 1), p = Sn(d), m = Sn(f), h = Math.max(0, Math.floor(p * l.rows) - ct), g = Math.min(l.rows - 1, Math.floor(m * l.rows) + ct), _ = r <= u || n >= 1 - u, v = I(a.uLargeStarRarity, 0, 1), y = JSON.stringify({
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
	}), b = Ft.get(y);
	if (b) return b.map((e) => ({ ...e }));
	let x = [];
	for (let e = h; e <= g; e += 1) for (let n = 0; n < l.columns; n += 1) {
		if (!_ && !c && !Dn(s, o, n, l.columns)) continue;
		let r = En(l, n, e, v);
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
	return Ft.set(y, x.map((e) => ({ ...e }))), x;
}
function An(e, t, n, r = {}) {
	let i = Cn(e), a = On(e, n), o = a / Math.PI, s = t.uvMin.y - o, c = t.uvMin.y + t.uvSize.y + o, l = I(s, 0, 1), u = I(c, 0, 1), d = s <= o || c >= 1 - o, f = Math.max(Math.min(Math.sin(Math.max(l, .001) * Math.PI), Math.sin(Math.min(u, .999) * Math.PI)), .015), p = d ? 1 : Math.min(1, a / (V * f) + ct / i.columns), m = t.wrapsHorizontally ? -p : t.uvMin.x - p, h = t.wrapsHorizontally ? 1 + p : t.uvMin.x + t.uvSize.x + p;
	return kn({
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
function jn(e, t, n, r = {}) {
	let i = Cn(e), a = On(e, n), o = a / Math.PI, s = t.storageUvMin.y - o, c = t.storageUvMin.y + t.storageUvSize.y + o, l = I(s, 0, 1), u = I(c, 0, 1), d = s <= o || c >= 1 - o, f = Math.max(Math.min(Math.sin(Math.max(l, .001) * Math.PI), Math.sin(Math.min(u, .999) * Math.PI)), .015), p = d ? 1 : Math.min(1, a / (V * f) + ct / i.columns);
	return kn({
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
function Y(e) {
	return e >>> 0;
}
function Mn(e, t) {
	let n = Y(e);
	return Y(n << t | n >>> 32 - t);
}
function Nn(e, t, n) {
	let r = Y(e), i = Y(t), a = Y(n);
	return a = Y(a ^ i), a = Y(a - Mn(i, 14)), r = Y(r ^ a), r = Y(r - Mn(a, 11)), i = Y(i ^ r), i = Y(i - Mn(r, 25)), a = Y(a ^ i), a = Y(a - Mn(i, 16)), r = Y(r ^ a), r = Y(r - Mn(a, 4)), i = Y(i ^ r), i = Y(i - Mn(r, 14)), a = Y(a ^ i), a = Y(a - Mn(i, 24)), a;
}
function Pn(e, t, n) {
	let r = Y(3735928584);
	return Nn(Y(r + Y(e)), Y(r + Y(t)), Y(r + Y(n)));
}
function Fn(e) {
	return e * e * e * (e * (e * 6 - 15) + 10);
}
function In(e, t, n, r) {
	let i = e & 15, a = i < 8 ? t : n, o = i < 4 ? n : i === 12 || i === 14 ? t : r;
	return (i & 1 ? -a : a) + (i & 2 ? -o : o);
}
function Ln(e, t, n, r, i, a, o, s, c, l, u) {
	let d = 1 - c, f = 1 - l;
	return (1 - u) * (f * (e * d + t * c) + l * (n * d + r * c)) + u * (f * (i * d + a * c) + l * (o * d + s * c));
}
function Rn(e) {
	let t = Math.floor(e[0]), n = Math.floor(e[1]), r = Math.floor(e[2]), i = e[0] - t, a = e[1] - n, o = e[2] - r, s = Fn(i), c = Fn(a), l = Fn(o);
	return Ln(In(Pn(t, n, r), i, a, o), In(Pn(t + 1, n, r), i - 1, a, o), In(Pn(t, n + 1, r), i, a - 1, o), In(Pn(t + 1, n + 1, r), i - 1, a - 1, o), In(Pn(t, n, r + 1), i, a, o - 1), In(Pn(t + 1, n, r + 1), i - 1, a, o - 1), In(Pn(t, n + 1, r + 1), i, a - 1, o - 1), In(Pn(t + 1, n + 1, r + 1), i - 1, a - 1, o - 1), s, c, l) * .982;
}
function zn(e, t, n, r) {
	let i = 0, a = .5, o = 0, s = Math.floor(I(t, 1, 8)), c = Math.max(n, .001), l = I(r, .001, .999), u = [...e];
	for (let e = 0; e < s; e += 1) {
		let e = Rn(u) * .5 + .5;
		i += a * e, o += a, u = J(u, c), a *= l;
	}
	return o <= 0 ? 0 : i / o;
}
function Bn(e, t, n) {
	return t <= 0 ? e : Vt([
		e[0] + Math.sin((e[1] * n + .23) * V) * Math.cos((e[2] * n + .41) * V) * t,
		e[1] + Math.cos((e[2] * n + .17) * V) * Math.sin((e[0] * n + .37) * V) * t,
		e[2] + Math.sin((e[0] * n - .31) * V) * Math.cos((e[1] * n + .29) * V) * t
	]);
}
function Vn(e) {
	let t = sn(e);
	return {
		anchors: t.anchors.map((e) => ({
			color: Bt(e.color),
			dir: Ut(e.x, e.y)
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
function Hn(e, t, n) {
	return 1 - dn(e, t, n);
}
function Un(e, t) {
	let n = Vn(t), r = Bn(e, n.warp.amp, n.warp.freq), i = [
		0,
		0,
		0
	], a = 0;
	return n.anchors.forEach((e) => {
		let t = 1 - I(fn(r, e.dir), -1, 1), o = n.blend === "gaussian" ? Math.exp(-(t * t) / Math.max(2 * n.sigma * n.sigma, 1e-4)) : 1 / (t + 1e-4) ** Math.max(n.power, 1e-4);
		i = q(i, J(e.color, o)), a += o;
	}), a <= 0 ? [
		0,
		0,
		0
	] : J(i, 1 / a);
}
function Wn(e, t) {
	let n = t.nebula, r = I(n.uOctaves, 1, 8), i = q(J(e, Math.max(n.uColorWarpFreq, .001)), [
		n.uSeed,
		n.uSeed * .37,
		n.uSeed * -.21
	]), a = Un(Vt(q(e, J([
		zn(i, r, 2.02, .52) * 2 - 1,
		zn(q(i, [
			5.2,
			1.3,
			7.1
		]), r, 2.03, .5) * 2 - 1,
		zn(q(i, [
			9.1,
			8.4,
			2.8
		]), r, 2.01, .51) * 2 - 1
	], Math.max(n.uColorWarpAmp, 0)))), t.nebulaField), o = [
		n.uSeed * 13.17,
		n.uSeed * -7.31,
		n.uSeed * 5.19
	], s = q(J(e, Math.max(n.uBaseScale, .001)), o), c = I(zn(q(s, J([
		zn(s, r, 2.02, .5),
		zn(q(s, [
			5.2,
			1.3,
			2.8
		]), r, 2.02, .5),
		zn(q(s, [
			2.1,
			4.7,
			9.2
		]), r, 2.02, .5)
	], 3)), r, 2.02, .5)), l = I(dn(n.uCoverage, n.uCoverage + Math.max(n.uSoftness, .001), c)) ** Math.max(n.uContrast, .05), u = I(Math.max(a[0], a[1], a[2]) * Math.max(n.uLightIntensity, 0)) ** Math.max(n.uLightFocus, .001), d = J(un(a, n.uCloudHighlight), Math.max(n.uLightIntensity, 0));
	return q([
		.004,
		.005,
		.011
	], J(J(q(ln(ln(n.uCloudShadow, d, u), n.uCloudCore, I(l * .4)), J(a, u * (1 - l) * Math.max(n.uLightLining, 0) * Math.max(n.uLightIntensity, 0))), Math.max(n.uDensity, 0)).map((e) => Math.max(0, e) ** .92), I(l * n.uOpacity) * Math.max(n.uNebulaStrength, 0)));
}
function Gn(e) {
	return e < .5 ? ln([
		1,
		.55,
		.3
	], [
		1,
		.96,
		.92
	], e * 2) : ln([
		1,
		.96,
		.92
	], [
		.7,
		.8,
		1
	], (e - .5) * 2);
}
function Kn(e, t, n, r, i) {
	let a = (r * t + n) * 4;
	e[a] += i[0], e[a + 1] += i[1], e[a + 2] += i[2], e[a + 3] = Math.max(e[a + 3], Math.max(i[0], i[1], i[2]));
}
function qn(e) {
	return e < 256 ? 1 : e < 2048 ? 2 : 1;
}
function Jn(e, t, n, r, i = r) {
	let a = qt(t.clip), o = t.stars;
	if (o.uDensity <= 0 || o.uBright <= 0) return;
	let s = An(o, a, i, { includeSeamCopies: !1 }), c = Math.PI / Math.max(1, i), l = Math.PI / St, u = Math.PI / Math.max(1, r);
	s.forEach((t) => {
		let i = wn(t.rSize, t.rSizeGate, o.uLargeStarRarity), s = t.rBright + (Math.max(t.rBright, i) - t.rBright) * Tt, d = t.rGlare + (Math.max(t.rGlare, i) - t.rGlare) * Et, f = K(1, K(.1, 1, i), o.uSizeVar), p = o.uStarSize * f * l, m = o.uStarSize * f, h = Hn(yt, bt, m), g = _t * Math.max(c, l), _ = Math.max(c, l * .5), v = Math.max(p, K(g, _, h)), y = Math.max(p, l * .1), b = K(1, Math.max(.08, dn(0, yt, m)), Hn(yt * .75, yt, m)), x = Math.max(y * .45, u * .5), S = Math.max(v * .45, u), C = dn(bt, 1.75, m), w = o.uGlareSize * K(1, f, o.uSizeVar) * l, ee = Math.max(p + w, vt * Math.max(c, l)), T = Math.max(p + w, l * .1), E = Math.max(T * .36, u * .5), D = Math.max(ee * .36, u) * C * +(o.uGlareSize > 0 && o.uGlareStr > 0), te = Math.max(x, E) * xt, O = Math.ceil(Math.max(te, S * xt, D * xt) / Math.PI * r), k = t.u * n, A = t.v * r, j = o.uBright * K(1, s ** 3 * 3, o.uBrightVar), ne = o.uGlareStr * K(1, d ** 8, o.uGlareVar), M = Gn(K(.5, t.rColor, o.uColorVar)), re = Math.floor(k - O), ie = Math.ceil(k + O), N = Math.max(0, Math.floor(A - O)), P = Math.min(r - 1, Math.ceil(A + O)), ae = Math.max(Math.sin(t.v * Math.PI), .015);
		for (let i = N; i <= P; i += 1) for (let o = re; o <= ie; o += 1) {
			let s = xn(o, n), c = (s + .5) / n, l = (i + .5) / r;
			if (!hn(c, l, a)) continue;
			let u = mn(c, t.u) * V * ae, d = (l - t.v) * Math.PI, f = u * u + d * d, p = (Math.exp(-f / Math.max(x * x * 2, 1e-10)) * b + Math.exp(-f / Math.max(E * E * 2, 1e-10)) * C * ne) * j;
			p <= 1e-6 || Kn(e, n, s, i, J(M, p));
		}
	});
}
function Yn(e, t, n, r) {
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
function Xn(e, t, n) {
	if (t.uDensity <= 0 || t.uBright <= 0) return [
		0,
		0,
		0
	];
	let r = Gt(e), i = Cn(t), a = On(t, n), o = a / Math.PI, s = I(r.v - o, 0, 1), c = I(r.v + o, 0, 1), l = Sn(s), u = Sn(c), d = Math.max(0, Math.floor(l * i.rows) - ct), f = Math.min(i.rows - 1, Math.floor(u * i.rows) + ct), p = Math.max(Math.sin(I(r.v, .001, .999) * Math.PI), .015), m = Math.min(1, a / (V * p) + ct / i.columns), h = Math.floor((r.u - m) * i.columns) - ct, g = Math.ceil((r.u + m) * i.columns) + ct, _ = Math.PI / Math.max(1, n), v = Math.PI / St, y = [
		0,
		0,
		0
	];
	for (let n = d; n <= f; n += 1) for (let r = h; r <= g; r += 1) {
		let a = En(i, r, n, t.uLargeStarRarity);
		if (!a) continue;
		let o = wn(a.rSize, a.rSizeGate, t.uLargeStarRarity), s = a.rBright + (Math.max(a.rBright, o) - a.rBright) * Tt, c = a.rGlare + (Math.max(a.rGlare, o) - a.rGlare) * Et, l = K(1, K(.1, 1, o), t.uSizeVar), u = t.uStarSize * l * v, d = t.uStarSize * l, f = Math.max(u, v * .1), p = Math.max(f * .45, _ * .5), m = K(1, Math.max(.08, dn(0, yt, d)), Hn(yt * .75, yt, d)), h = dn(bt, 1.75, d), g = t.uGlareSize * K(1, l, t.uSizeVar) * v, b = Math.max(u + g, v * .1), x = Math.max(b * .36, _ * .5), S = pn(e[0] * a.x + e[1] * a.y + e[2] * a.z), C = Math.exp(-S / Math.max(p * p * 2, 1e-10)) * m, w = t.uGlareStr * K(1, c ** 8, t.uGlareVar), ee = Math.exp(-S / Math.max(x * x * 2, 1e-10)) * h * w, T = t.uBright * K(1, s ** 3 * 3, t.uBrightVar), E = (C + ee) * T;
		E <= 1e-6 || (y = q(y, J(Gn(K(.5, a.rColor, t.uColorVar)), E)));
	}
	return y;
}
function Zn(e, t, n = Math.floor(kt / 2)) {
	let r = cn(t);
	if (!_n(e, r.clip)) return [
		0,
		0,
		0,
		0
	];
	let i = tr(Wn(e, r), Xn(e, r.stars, n), r.nebula.uNebulaExposure);
	return [
		i[0],
		i[1],
		i[2],
		1
	];
}
function Qn(e, t, n = {}) {
	return Zn(e, t, n.sampleHeight);
}
function $n(e, t, n, r = {}) {
	let i = cn(e), a = Lt(i.quality), o = Math.max(1, Math.floor(r.budgetBytes ?? a.budgetBytes)), s = Math.max(1, Math.floor(r.maxTextureSize ?? 8192)), c = rn({
		accumulationBytes: r.accumulationBytes,
		budgetBytes: o,
		clip: i.clip,
		height: n,
		maxTextureSize: s,
		residentBytesPerPixel: r.residentBytesPerPixel,
		width: t
	});
	return pe(JSON.stringify({
		height: n,
		layout: {
			allocation: c.allocation,
			accumulationBytes: r.accumulationBytes ?? ft,
			columns: c.columns,
			contentHeight: c.contentHeight,
			contentWidth: c.contentWidth,
			coverage: c.coverage,
			guard: c.guard,
			maxTextureSize: s,
			qualityScale: c.qualityScale,
			rows: c.rows,
			residentBytesPerPixel: r.residentBytesPerPixel ?? pt,
			storageHeight: c.storageHeight,
			storageWidth: c.storageWidth,
			supersample: c.supersample
		},
		params: i,
		width: t
	}));
}
function er(e, t) {
	return e.map((e) => 1 - Math.exp(-Math.max(0, e) * Math.max(t, .001)));
}
function tr(e, t, n) {
	let r = er(e, n), i = [
		.004,
		.005,
		.011
	], a = er(i, 1), o = er(q(i, t), 1);
	return q(r, [
		Math.max(o[0] - a[0], 0),
		Math.max(o[1] - a[1], 0),
		Math.max(o[2] - a[2], 0)
	]);
}
function nr(e, t, n, r, i, a, o, s) {
	for (let c = 0; c < o; c += 1) {
		let l = (c + .5) / o * n - .5, u = Math.floor(l), d = Math.max(0, u), f = Math.min(n - 1, u + 1), p = l - u, m = d * t * 4, h = f * t * 4;
		for (let n = 0; n < a; n += 1) {
			let o = (c * a + n) * 4, l = (n + .5) / a * t - .5, u = Math.floor(l), d = u + 1, f = l - u, g = xn(u, t) * 4, _ = xn(d, t) * 4, v = m + g, y = m + _, b = h + g, x = h + _, S = K(K(e[v], e[y], f), K(e[b], e[x], f), p), C = K(K(e[v + 1], e[y + 1], f), K(e[b + 1], e[x + 1], f), p), w = K(K(e[v + 2], e[y + 2], f), K(e[b + 2], e[x + 2], f), p), ee = K(K(e[v + 3], e[y + 3], f), K(e[b + 3], e[x + 3], f), p), T = Math.max(r[o], r[o + 1], r[o + 2]);
			if (ee <= 0 && T <= 0) {
				i[o] = 0, i[o + 1] = 0, i[o + 2] = 0, i[o + 3] = 0;
				continue;
			}
			let [E, D, te] = ce(tr([
				S,
				C,
				w
			], [
				r[o],
				r[o + 1],
				r[o + 2]
			], s.nebula.uNebulaExposure));
			i[o] = E, i[o + 1] = D, i[o + 2] = te, i[o + 3] = 255;
		}
	}
}
function rr(e, t = kt, n = Math.floor(t / 2)) {
	let r = cn(e), i = Lt(r.quality), a = Math.min(t, Ot), o = Math.max(1, Math.floor(a / 2)), s = rn({
		budgetBytes: i.budgetBytes,
		clip: r.clip,
		height: o,
		maxTextureSize: kt,
		residentBytesPerPixel: dt,
		width: a
	}), c = new Float32Array(a * o * 4), l = new Uint8ClampedArray(t * n * 4), u = qt(r.clip), d = qn(t), f = t * d, p = n * d, m = new Float32Array(f * p * 4);
	return s.descriptors.forEach((e) => {
		let t = gn(e.uvMin.x, e.uvSize.x, a), n = Math.max(0, Math.floor(e.uvMin.y * o)), i = Math.min(o - 1, Math.ceil((e.uvMin.y + e.uvSize.y) * o));
		for (let e = n; e <= i; e += 1) {
			let n = (e + .5) / o;
			t.forEach(({ end: t, start: i }) => {
				for (let o = i; o <= t; o += 1) {
					let t = (o + .5) / a;
					if (!hn(t, n, u)) continue;
					let i = Wn(Ut(t, n), r), s = (e * a + o) * 4;
					c[s] = i[0], c[s + 1] = i[1], c[s + 2] = i[2], c[s + 3] = 1;
				}
			});
		}
	}), Jn(m, r, f, p, n), nr(c, a, o, Yn(m, f, p, d), l, t, n, r), {
		data: l,
		height: n,
		width: t
	};
}
//#endregion
//#region evaluator.ts
function ir(e, t, n = {}) {
	let r = _e(t.type);
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
function ar(e, t, n = {}) {
	return t.filter((e) => e.enabled).reverse().reduce((t, r) => {
		let i = r.type === "group" ? [...ar(e, r.children, n), 1] : ir(e, r, n), a = I(i[3] * (r.opacity / 100));
		return fe(t, [
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
function or(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = or(n.children, t);
		if (e) return e;
	}
	return null;
}
function sr(e, t, n = {}) {
	let r = me(e), i = n.targetGroupId ? or(r.nodes, n.targetGroupId) : null;
	return ar(t, n.targetGroupId ? i ? [i] : [] : r.nodes, n);
}
//#endregion
//#region bake.ts
var cr = 1024, lr = "0.1.0", ur = /* @__PURE__ */ new Map(), dr = /* @__PURE__ */ new Map();
function fr(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function pr(e, t) {
	return pe(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: lr
	}));
}
function mr() {
	ur.clear(), dr.clear();
}
function hr(e, t = []) {
	return e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				hr(e.children, t);
				return;
			}
			e.type === "starfield" && t.push(e);
		}
	}), t;
}
function gr(e, t) {
	for (let n of e) {
		if (n.type !== "group") continue;
		if (n.id === t) return n;
		let e = gr(n.children, t);
		if (e) return e;
	}
	return null;
}
function _r(e, t, n, r, i) {
	let a = hr(r ? gr(e.nodes, r)?.children ?? [] : e.nodes);
	if (a.length === 0) return;
	let o = /* @__PURE__ */ new Map();
	return a.forEach((e) => {
		let r = i?.get(e.id);
		if (r) {
			o.set(e.id, r);
			return;
		}
		let a = $n(e.params, t, n), s = dr.get(a), c = s ?? rr(e.params, t, n);
		s || dr.set(a, c), o.set(e.id, c);
	}), o;
}
function vr(e, t = {}) {
	let n = me(e), r = fr(t), i = r.cache ? pr(n, r) : null;
	if (i) {
		let e = ur.get(i);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: a, targetGroupId: o, width: s } = r, c = _r(n, s, a, o, t.starfieldBakes), l = new Uint8ClampedArray(s * a * 4);
	for (let e = 0; e < a; e += 1) {
		let t = (e + .5) / a;
		for (let r = 0; r < s; r += 1) {
			let [i, u, d] = ce(sr(n, Se((r + .5) / s, t), {
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
	return i && ur.set(i, {
		...u,
		data: new Uint8ClampedArray(l)
	}), u;
}
//#endregion
//#region starfield-gpu-bake.ts
Math.PI * 2;
var yr = 8, br = 2048, xr = 1.75, Sr = 3.25, Cr = 1, wr = 1.5, Tr = 8, Er = .1, Dr = 5, Or = 12, kr = .35, Ar = .25, jr = 1.0005, Mr = 32, Nr = new Float32Array([
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
function Pr(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function Fr(e) {
	let t = e.backend, n = t?.device, r = t?.gl;
	return typeof n?.limits?.maxTextureDimension2D == "number" ? n.limits.maxTextureDimension2D : r ? Number(r.getParameter(r.MAX_TEXTURE_SIZE)) : kt;
}
function X(e, t) {
	let n = e[t];
	if (n?.isUniformNode) return n;
	let r = j(Number(n?.value ?? 0));
	return e[t] = r, r;
}
function Z(t, n) {
	let r = t[n], i = r?.value instanceof e.Vector2 ? r.value.clone() : new e.Vector2();
	if (r?.isUniformNode) return r;
	let a = j(i);
	return t[n] = a, a;
}
function Ir(t, n) {
	let r = t[n], i = r?.value instanceof e.Vector3 ? r.value.clone() : new e.Vector3();
	if (r?.isUniformNode) return r;
	let a = j(i);
	return t[n] = a, a;
}
function Lr(e) {
	let t = e.x.sub(.5).mul(o).mul(2), n = e.y.mul(o), r = te(n);
	return w(P(r.mul(te(t)), f(n), r.mul(f(t))));
}
function Rr(e) {
	let t = x(e.y, 2), n = k(1, t);
	return N(e.x.add(n.mul(.5)), b(t, h(2).sub(t), n));
}
function zr(e) {
	return Lr(Rr(e));
}
function Br(e) {
	let t = w(e);
	return N(c(t.x, t.z).div(o.mul(2)).add(.5), s(d(t.y, -1, 1)).div(o));
}
function Vr(e, t) {
	return o.mul(v(t.y, 1e-6)).div(v(e.y, 1));
}
function Hr(e, t) {
	return v(v(e.negate(), e.sub(t)), 0);
}
function Ur(e, t, n) {
	let r = e.sub(t), i = r.add(1), a = r.sub(1), o = Hr(r, n), s = Hr(i, n), c = Hr(a, n);
	return D(s.lessThan(o).and(s.lessThanEqual(c)), i, D(c.lessThan(o).and(c.lessThan(s)), a, r));
}
function Wr(e, t, n) {
	return N(Ur(e.x, t.x, n.x).div(n.x), e.y.sub(t.y).div(n.y));
}
function Gr(e) {
	return k(0, e.x).mul(k(e.x, 1)).mul(k(0, e.y)).mul(k(e.y, 1));
}
function Kr(e) {
	let t = P(1, .55, .3), n = P(1, .96, .92), r = P(.7, .8, 1);
	return D(e.lessThan(.5), b(t, n, e.mul(2)), b(n, r, e.sub(.5).mul(2)));
}
function qr(e, t, n) {
	let r = E(d(e, 0, 1), Dr), i = b(1, E(d(t, 0, 1), Or), n);
	return r.mul(i);
}
function Jr(e, t, n, r) {
	return b(1, b(Er, 1, qr(e, t, n)), r);
}
function Yr(e, t, n, r) {
	let o = d(t, 1, 8), s = v(n, .001), c = d(r, .001, .999), l = P(e).toVar(), u = h(.5).toVar(), f = h(0).toVar(), p = h(0).toVar();
	return a(8, ({ i: e }) => {
		i(h(e).lessThan(o), () => {
			let e = C(l, _(1), s, c).mul(.5).add(.5);
			f.addAssign(u.mul(e)), p.addAssign(u), l.mulAssign(s), u.mulAssign(c);
		});
	}), f.div(v(p, 1e-4));
}
function Xr(n, o) {
	let s = Vn(n.nebulaField), c = Array.from({ length: yr }, (t, n) => {
		let r = s.anchors[n];
		return new e.Vector3(...r?.dir ?? [
			0,
			1,
			0
		]);
	}), l = Array.from({ length: yr }, (t, n) => {
		let r = s.anchors[n];
		return new e.Vector3(...r?.color ?? [
			0,
			0,
			0
		]);
	}), u = n.nebula, f = {
		uAnchorCount: { value: Math.min(s.anchors.length, yr) },
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
	}, g = Z(f, "uTileUvMin"), _ = Z(f, "uTileUvSize"), y = X(f, "uAnchorCount"), x = X(f, "uBlend"), S = X(f, "uPower"), C = X(f, "uSigma"), T = X(f, "uColorWarpAmp"), te = X(f, "uColorWarpFreq"), k = X(f, "uSeed"), A = X(f, "uCoverage"), j = X(f, "uDensity"), M = X(f, "uSoftness"), re = X(f, "uContrast"), ie = X(f, "uBaseScale"), N = X(f, "uOctaves"), F = X(f, "uOpacity"), I = X(f, "uLightFocus"), oe = X(f, "uLightLining"), L = X(f, "uLightIntensity");
	X(f, "uNebulaExposure");
	let se = X(f, "uNebulaStrength"), ce = Ir(f, "uCloudShadow"), le = Ir(f, "uCloudHighlight"), ue = Ir(f, "uCloudCore"), de = ne(c, "vec3"), fe = ne(l, "vec3"), pe = new t({
		depthTest: !1,
		depthWrite: !1
	});
	return pe.uniforms = f, pe.colorNode = r(() => {
		let e = ee.xy.mul(.5).add(.5), t = zr(g.add(e.mul(_))), n = d(N, 1, 8), r = t.mul(v(te, .001)).add(P(k, k.mul(.37), k.mul(-.21))), o = P(Yr(r, n, 2.02, .52), Yr(r.add(P(5.2, 1.3, 7.1)), n, 2.03, .5), Yr(r.add(P(9.1, 8.4, 2.8)), n, 2.01, .51)).mul(2).sub(1), s = w(t.add(o.mul(v(T, 0)))), c = P(0).toVar(), l = h(0).toVar();
		a(yr, ({ i: e }) => {
			i(h(e).lessThan(y), () => {
				let t = w(de.element(e)), n = fe.element(e), r = h(1).sub(p(s, t)), i = h(1).div(E(r.add(1e-4), v(S, 1e-4))), a = m(r.mul(r).negate().div(v(1e-4, h(2).mul(C).mul(C)))), o = D(x.lessThan(.5), i, a);
				c.addAssign(n.mul(o)), l.addAssign(o);
			});
		}), c.assign(c.div(v(l, 1e-4)));
		let u = P(k.mul(13.17), k.mul(-7.31), k.mul(5.19)), f = t.mul(v(ie, .001)).add(u), ne = P(Yr(f, n, 2.02, .5), Yr(f.add(P(5.2, 1.3, 2.8)), n, 2.02, .5), Yr(f.add(P(2.1, 4.7, 9.2)), n, 2.02, .5)), pe = d(Yr(f.add(ne.mul(3)), n, 2.02, .5), 0, 1), R = E(d(O(A, A.add(v(M, .001)), pe), 0, 1), v(re, .05)), me = E(d(v(v(c.r, c.g), c.b).mul(v(L, 0)), 0, 1), v(I, .001)), he = E(v(b(b(ce, c.mul(le).mul(v(L, 0)), me), ue, d(R.mul(.4), 0, 1)).add(c.mul(me).mul(R.oneMinus()).mul(v(oe, 0)).mul(v(L, 0))).mul(v(j, 0)), P(0)), P(.92)), ge = d(R.mul(F), 0, 1);
		return ae(v(P(.004, .005, .011).add(he.mul(ge).mul(v(se, 0))), P(0)), 1);
	})(), pe;
}
function Zr(t, n, r) {
	let i = jn(t.stars, n, r, { includeSeamCopies: !0 }), a = [], o = [], s = [], c = [], l = [];
	i.forEach((e) => {
		a.push(e.x, e.y, e.z), o.push(e.u, e.v), s.push(e.rSize, e.rBright, e.rGlare, e.rColor), c.push(e.rSizeGate), l.push(e.classId);
	});
	let u = new e.InstancedBufferGeometry();
	return u.setAttribute("position", new e.BufferAttribute(Nr, 3)), u.setAttribute("iDirection", new e.InstancedBufferAttribute(new Float32Array(a), 3)), u.setAttribute("iUv", new e.InstancedBufferAttribute(new Float32Array(o), 2)), u.setAttribute("iRandoms", new e.InstancedBufferAttribute(new Float32Array(s), 4)), u.setAttribute("iSizeGate", new e.InstancedBufferAttribute(new Float32Array(c), 1)), u.setAttribute("iClass", new e.InstancedBufferAttribute(new Float32Array(l), 1)), u.instanceCount = l.length, u;
}
function Qr(n, i, a = {}) {
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
		uDisplayPixelAngle: { value: a.displayPixelAngle ?? Math.PI / br },
		uSizeVar: { value: c.uSizeVar },
		uStarSize: { value: c.uStarSize },
		uTileUvMin: { value: new e.Vector2(i.storageUvMin.x, i.storageUvMin.y) },
		uTileUvSize: { value: new e.Vector2(i.storageUvSize.x, i.storageUvSize.y) }
	}, _ = Z(g, "uBakeSize"), x = Z(g, "uTileUvMin"), S = Z(g, "uTileUvSize"), C = X(g, "uDisplayPixelAngle"), T = X(g, "uStarSize"), D = X(g, "uSizeVar"), A = X(g, "uLargeStarRarity"), j = X(g, "uBright"), ne = X(g, "uBrightVar"), M = X(g, "uGlareSize"), re = X(g, "uGlareStr"), P = X(g, "uGlareVar"), F = X(g, "uColorVar"), I = ie("vec2", "vStarBakeUv"), oe = ie("vec3", "vStarBakeDirection"), L = ie("vec4", "vStarBakeRandoms"), se = ie("float", "vStarBakeSizeGate"), ce = new t({
		blending: e.AdditiveBlending,
		depthTest: !1,
		depthWrite: !1,
		transparent: !0
	});
	return ce.uniforms = g, ce.vertexNode = r(() => {
		let e = l("iDirection", "vec3"), t = l("iUv", "vec2"), n = l("iRandoms", "vec4"), r = l("iSizeGate", "float"), i = Vr(_, S), a = Jr(n.x, r, A, D), s = T.mul(a).mul(C), c = T.mul(a), u = O(Cr, wr, c).oneMinus(), d = v(v(s, b(h(xr).mul(C), C.mul(.5), u)).mul(.45), C.mul(.5)), f = O(wr, 1.75, c), p = M.mul(b(1, a, D)).mul(C), m = v(v(d, v(v(s.add(p), h(Sr).mul(C)).mul(.36), C.mul(.5)).mul(f).mul(k(1e-6, M)).mul(k(1e-6, re))), i).mul(Tr), g = v(te(t.y.mul(o)), .015), w = N(y(1.5, m.div(o.mul(2).mul(g))), m.div(o)), E = t.add(ee.xy.mul(w)), j = E.sub(x).div(S);
		return I.assign(E), oe.assign(e), L.assign(n), se.assign(r), ae(j.mul(2).sub(1), 0, 1);
	})(), ce.colorNode = r(() => {
		let e = s(d(p(zr(I), w(oe)), -1, 1)), t = qr(L.x, se, A), n = Jr(L.x, se, A, D), r = T.mul(n).mul(C), i = T.mul(n), a = O(Cr * .75, Cr, i).oneMinus(), o = O(wr, 1.75, i), c = v(r, C.mul(.1)), l = b(1, v(.08, O(0, Cr, i)), a), u = v(c.mul(.45), C.mul(.5)), f = m(e.mul(e).negate().div(v(u.mul(u).mul(2), 1e-10))).mul(l), h = M.mul(b(1, n, D)).mul(C), g = v(v(r.add(h), C.mul(.1)).mul(.36), C.mul(.5)), _ = m(e.mul(e).negate().div(v(g.mul(g).mul(2), 1e-10))).mul(o).mul(k(1e-6, M)).mul(k(1e-6, re)), y = b(L.y, v(L.y, t), D.mul(kr)), x = b(L.z, v(L.z, t), D.mul(Ar)), S = re.mul(b(1, E(x, 8), P)), ee = j.mul(b(1, E(y, 3).mul(3), ne));
		return ae(Kr(b(.5, L.w, F)).mul(f.add(_.mul(S))).mul(ee), 1);
	})(), ce;
}
function $r(n, o, s, c, l, u) {
	let f = {
		uExposure: { value: 1 },
		uSourcePerTarget: { value: u },
		uSourceSize: { value: new e.Vector2(o, s) },
		uSourceTexture: { value: n },
		uTargetSize: { value: new e.Vector2(c, l) }
	}, p = M(n), _ = Z(f, "uSourceSize"), y = Z(f, "uTargetSize"), b = X(f, "uSourcePerTarget"), x = X(f, "uExposure"), S = new t({
		depthTest: !1,
		depthWrite: !1
	});
	return S.uniforms = {
		...f,
		uSourceTexture: p
	}, S.colorNode = r(() => {
		let e = g(re().mul(y)), t = g(b.add(.5)), n = ae(0).toVar(), r = h(0).toVar();
		a(8, ({ i: o }) => {
			a(8, ({ i: a }) => {
				i(h(a).lessThan(t).and(h(o).lessThan(t)), () => {
					let t = e.mul(b).add(N(h(a), h(o))).add(.5);
					n.addAssign(A(p, t.div(_))), r.addAssign(1);
				});
			});
		});
		let o = n.rgb.div(v(r, 1)), s = P(.004, .005, .011), c = P(1).sub(m(s.mul(x).negate())), l = v(P(1).sub(m(s.add(o).mul(x).negate())).sub(c), P(0));
		return ae(l, d(v(v(l.r, l.g), l.b), 0, 1));
	})(), S;
}
function ei(n, i, o, s) {
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
	}, l = M(n), u = M(i), f = Z(c, "uContentUvMin"), p = Z(c, "uContentUvSize"), g = Z(c, "uStorageUvMin"), _ = Z(c, "uStorageUvSize"), y = X(c, "uHasLeftNeighbor"), x = X(c, "uHasRightNeighbor"), S = X(c, "uHasTopNeighbor"), C = X(c, "uHasBottomNeighbor"), w = X(c, "uNebulaExposure"), T = new t({
		depthTest: !1,
		depthWrite: !1,
		transparent: !0
	}), E = +(o.uvSize.x >= .999), te = .28;
	return T.blending = e.CustomBlending, T.blendEquation = e.AddEquation, T.blendSrc = e.OneFactor, T.blendDst = e.OneFactor, T.blendEquationAlpha = e.AddEquation, T.blendSrcAlpha = e.OneFactor, T.blendDstAlpha = e.OneMinusSrcAlphaFactor, c.uNebulaTexture = l, c.uStarTexture = u, T.uniforms = c, T.colorNode = r(() => {
		let e = ee.xy.mul(.5).add(.5), t = N(e.x, h(1).sub(e.y)), n = v(h(1).sub(O(0, te, t.y)), h(1).sub(O(0, te, h(1).sub(t.y)))).mul(E), r = Wr(t, g, _), i = d(r, 0, 1), o = Gr(r), s = N(Ur(t.x, f.x, p.x).div(p.x), t.y.sub(f.y).div(p.y)), c = v(_.sub(p).div(p.mul(2)), N(0)), T = v(c, N(1e-6)), k = D(y.greaterThan(.5), O(T.x.negate(), T.x, s.x), 1), j = D(x.greaterThan(.5), h(1).sub(O(h(1).sub(T.x), h(1).add(T.x), s.x)), 1), ne = D(c.x.lessThanEqual(0), 1, k.mul(j)), M = D(S.greaterThan(.5), O(T.y.negate(), T.y, s.y), 1), re = D(C.greaterThan(.5), h(1).sub(O(h(1).sub(T.y), h(1).add(T.y), s.y)), 1), ie = D(c.y.lessThanEqual(0), 1, M.mul(re)), F = d(ne.mul(ie).mul(o), 0, 1), I = A(l, i).rgb, oe = P(0).toVar(), L = h(0).toVar();
		a(32, ({ i: e }) => {
			let n = Wr(N(h(e).add(.5).div(32), t.y), g, _), r = d(n, 0, 1), i = Gr(n);
			oe.addAssign(A(l, r).rgb.mul(i)), L.addAssign(i);
		});
		let se = b(I, oe.div(v(L, 1)), n), ce = A(u, i);
		return ae(P(1).sub(m(se.mul(v(w, .001)).negate())).add(ce.rgb), 1).mul(F);
	})(), T.name = `Starfield composite ${o.id}`, T;
}
function ti(t) {
	return ui(t).map(({ end: n, offset: r, skyV0: i, skyV1: a, start: o }) => {
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
function ni(e) {
	return Math.max(8, Math.floor(e / 2));
}
function ri(t, n) {
	let r = ni(Mr), i = n.uvMin, a = n.uvSize, o = Math.max(0, Math.min(1, i.y)), s = Math.max(0, Math.min(1, i.y + a.y)), c = Math.max(s - o, 1e-4), l = Math.max(3, Math.ceil(Mr * Math.max(a.x, .001))), u = Math.max(2, Math.ceil(r * Math.max(c, .001))), d = (i.x - .25) * Math.PI * 2, f = a.x * Math.PI * 2, p = o * Math.PI, m = c * Math.PI;
	return new e.SphereGeometry(jr, l, u, d, f, p, m);
}
function ii(t) {
	let n = t.uvMin.x, r = t.uvMin.y, i = t.uvMin.x + t.uvSize.x, a = t.uvMin.y + t.uvSize.y, o = t.storageUvMin.x, s = t.storageUvMin.y, c = t.storageUvMin.x + t.storageUvSize.x, l = t.storageUvMin.y + t.storageUvSize.y, u = t.hasLeftNeighbor ? o : n, d = t.hasRightNeighbor ? c : i, f = t.hasTopNeighbor ? s : r, p = t.hasBottomNeighbor ? l : a;
	return {
		uvMin: new e.Vector2(u, f),
		uvSize: new e.Vector2(d - u, p - f)
	};
}
function ai(n, i, a) {
	let o = M(n), s = j(new e.Vector2(i.uvMin.x, i.uvMin.y)), c = j(new e.Vector2(i.uvSize.x, i.uvSize.y)), l = j(new e.Vector2(i.storageUvMin.x, i.storageUvMin.y)), u = j(new e.Vector2(i.storageUvSize.x, i.storageUvSize.y)), f = j(Math.max(.001, a)), p = new t({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide
	});
	return p.colorNode = r(() => {
		let e = A(o, d(Wr(s.add(re().mul(c)), l, u), 0, 1));
		return ae(P(1).sub(m(v(e.rgb, P(0)).mul(f).negate())), 1);
	})(), p.name = `Starfield live nebula patch ${i.id}`, p;
}
function oi(n, i) {
	let a = M(n), o = j(new e.Vector2(i.uvMin.x, i.uvMin.y)), s = j(new e.Vector2(i.uvSize.x, i.uvSize.y)), c = j(new e.Vector2(i.storageUvMin.x, i.storageUvMin.y)), l = j(new e.Vector2(i.storageUvSize.x, i.storageUvSize.y)), u = j(+!!i.hasLeftNeighbor), f = j(+!!i.hasRightNeighbor), p = j(+!!i.hasTopNeighbor), m = j(+!!i.hasBottomNeighbor), g = ie("vec3", `vStarfieldPatchDirection${i.x}_${i.y}`), _ = new t({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		transparent: !0
	});
	return _.blending = e.CustomBlending, _.blendEquation = e.AddEquation, _.blendSrc = e.OneFactor, _.blendDst = e.OneFactor, _.blendEquationAlpha = e.AddEquation, _.blendSrcAlpha = e.OneFactor, _.blendDstAlpha = e.OneMinusSrcAlphaFactor, _.vertexNode = r(() => (g.assign(ee), S))(), _.colorNode = r(() => {
		let e = Br(g), t = N(Ur(e.x, o.x, s.x).div(s.x), e.y.sub(o.y).div(s.y)), n = Wr(e, c, l), r = d(n, 0, 1), i = Gr(n), _ = v(l.sub(s).div(s.mul(2)), N(0)), y = v(_, N(1e-6)), b = D(u.greaterThan(.5), O(y.x.negate(), y.x, t.x), 1), x = D(f.greaterThan(.5), h(1).sub(O(h(1).sub(y.x), h(1).add(y.x), t.x)), 1), S = D(_.x.lessThanEqual(0), 1, b.mul(x)), C = D(p.greaterThan(.5), O(y.y.negate(), y.y, t.y), 1), w = D(m.greaterThan(.5), h(1).sub(O(h(1).sub(y.y), h(1).add(y.y), t.y)), 1), ee = D(_.y.lessThanEqual(0), 1, C.mul(w)), T = d(S.mul(ee), 0, 1);
		return A(a, r).mul(i).mul(T);
	})(), _.name = `Starfield live stars patch ${i.id}`, _;
}
function si(t, n) {
	let r = new e.Group();
	return r.name = `Starfield live patch group ${t.key}`, t.patches.forEach((t) => {
		let i = t.descriptor, a = ri(i, {
			uvMin: i.uvMin,
			uvSize: i.uvSize
		}), o = ai(t.nebulaTexture, i, n.nebula.uNebulaExposure), s = new e.Mesh(a, o);
		s.frustumCulled = !1, s.renderOrder = 0, r.add(s);
	}), t.patches.forEach((t) => {
		let n = t.descriptor, i = ri(n, ii(n)), a = oi(t.starTexture, n), o = new e.Mesh(i, a);
		o.frustumCulled = !1, o.renderOrder = .01, r.add(o);
	}), r;
}
function ci(t) {
	t.traverse((t) => {
		t instanceof e.Mesh && (t.geometry.dispose(), (Array.isArray(t.material) ? t.material : [t.material]).forEach((e) => {
			e.dispose();
		}));
	}), t.clear();
}
function li(e, t) {
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
function ui(e) {
	let t = e.hasLeftNeighbor ? e.storageUvMin.x : e.uvMin.x, n = e.hasRightNeighbor ? e.storageUvMin.x + e.storageUvSize.x : e.uvMin.x + e.uvSize.x, r = e.hasTopNeighbor ? e.storageUvMin.y : e.uvMin.y, i = e.hasBottomNeighbor ? e.storageUvMin.y + e.storageUvSize.y : e.uvMin.y + e.uvSize.y, a = Math.max(0, r), o = Math.min(1, i);
	return o <= a ? [] : li(t, n - t).map((e) => ({
		...e,
		skyV0: a,
		skyV1: o
	}));
}
function di(t) {
	return t === "repeat" ? e.RepeatWrapping : e.ClampToEdgeWrapping;
}
function fi(t, n, r, i = {}) {
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
function pi(e) {
	e.dispose();
}
function mi(e) {
	return Math.PI / Math.max(1, e);
}
function hi(e) {
	return Math.max(1, Math.floor(e ?? 8192));
}
function gi(e, t) {
	return Math.max(1, Math.min(e, t));
}
var _i = class {
	#e = /* @__PURE__ */ new Map();
	#t = /* @__PURE__ */ new Map();
	#n;
	#r;
	#i = new e.Scene();
	#a = new e.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#o = new e.PlaneGeometry(2, 2);
	constructor(e) {
		this.#r = e, this.#n = Fr(e);
	}
	createBakeKey(e, t) {
		let n = cn(e), r = Lt(n.quality), i = hi(t);
		return $n(n, i, Math.floor(i / 2), {
			budgetBytes: r.budgetBytes,
			maxTextureSize: this.#n
		});
	}
	previewWidthFor(e) {
		return Math.max(1, Math.min(kt, this.#n));
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
		return Pr(this.#r);
	}
	dispose() {
		this.#e.forEach((e) => e.target.dispose()), this.#e.clear(), this.#t.forEach((e) => {
			e.targets.forEach((e) => e.dispose());
		}), this.#t.clear(), this.#o.dispose();
	}
	#s(t, n, r) {
		let i = cn(t), a = Lt(i.quality), o = hi(r), s = Math.floor(o / 2), c = n ?? this.createBakeKey(i, o), l = this.#t.get(c);
		if (l) return l;
		let u = rn({
			budgetBytes: a.budgetBytes,
			clip: i.clip,
			height: s,
			maxTextureSize: this.#n,
			width: o
		}), d = this.#r.getRenderTarget(), f = this.#r.autoClear, p = Object.assign(new e.Color(), { a: 1 }), m = this.#r.getClearAlpha(), h = [], g = [];
		this.#r.getClearColor(p), this.#r.autoClear = !0, this.#r.setClearColor(0, 0), u.descriptors.forEach((t) => {
			let n = fi(t.storageSize.width, t.storageSize.height, `GPU baked starfield nebula ${t.id}`, {
				colorSpace: e.LinearSRGBColorSpace,
				type: e.HalfFloatType,
				wrapS: di(t.wrapS),
				wrapT: di(t.wrapT)
			}), r = fi(t.storageSize.width, t.storageSize.height, `GPU baked starfield stars ${t.id}`, {
				colorSpace: e.SRGBColorSpace,
				type: e.UnsignedByteType,
				wrapS: di(t.wrapS),
				wrapT: di(t.wrapT)
			});
			this.#l(Xr(i, t), n), this.#u(i, t, r, s, u.supersample), h.push(n, r), g.push({
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
		let i = cn(t), a = Lt(i.quality), o = hi(r), s = Math.floor(o / 2), c = gi(o, this.#n), l = Math.floor(c / 2), u = n ?? this.createBakeKey(i, o), d = this.#e.get(u);
		if (d && d.target.width === c && d.target.height === l) return d;
		let f = fi(c, l, "GPU baked starfield layer", {
			colorSpace: e.SRGBColorSpace,
			type: e.UnsignedByteType,
			wrapS: e.RepeatWrapping,
			wrapT: e.ClampToEdgeWrapping
		}), p = rn({
			budgetBytes: a.budgetBytes,
			clip: i.clip,
			height: s,
			maxTextureSize: this.#n,
			width: o
		}), m = this.#r.getRenderTarget(), h = this.#r.autoClear, g = Object.assign(new e.Color(), { a: 1 }), _ = this.#r.getClearAlpha();
		return this.#r.getClearColor(g), this.#r.autoClear = !0, this.#r.setClearColor(0, 0), this.#r.setRenderTarget(f), this.#r.clear(), p.descriptors.forEach((t) => {
			let n = fi(t.storageSize.width, t.storageSize.height, `GPU baked starfield nebula ${t.id}`, {
				colorSpace: e.LinearSRGBColorSpace,
				type: e.HalfFloatType,
				wrapS: di(t.wrapS),
				wrapT: di(t.wrapT)
			}), r = fi(t.storageSize.width, t.storageSize.height, `GPU baked starfield stars ${t.id}`, {
				colorSpace: e.SRGBColorSpace,
				type: e.UnsignedByteType,
				wrapS: di(t.wrapS),
				wrapT: di(t.wrapT)
			});
			this.#l(Xr(i, t), n), this.#u(i, t, r, s, p.supersample), this.#d(i, t, n.texture, r.texture, f), n.dispose(), r.dispose();
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
		r.frustumCulled = !1, this.#i.clear(), this.#i.add(r), this.#r.setRenderTarget(n), this.#r.clear(), this.#r.render(this.#i, this.#a), this.#i.remove(r), pi(t);
	}
	#u(t, n, r, i, a) {
		let o = Zr(t, n, i), s = Math.max(1, Math.floor(a)), c = n.storageSize.width * s, l = n.storageSize.height * s, u = c / n.storageSize.width, d = Qr(t, n, {
			bakeHeight: l,
			bakeWidth: c,
			displayPixelAngle: mi(i)
		}), f = new e.Mesh(o, d), p = fi(c, l, `GPU baked starfield stars accumulation ${n.id}`, {
			colorSpace: e.LinearSRGBColorSpace,
			type: e.HalfFloatType,
			wrapS: e.ClampToEdgeWrapping
		});
		f.frustumCulled = !1, this.#i.clear(), this.#i.add(f), this.#r.setRenderTarget(p), this.#r.clear(), this.#r.render(this.#i, this.#a), this.#i.remove(f), o.dispose(), pi(d), this.#l($r(p.texture, c, l, n.storageSize.width, n.storageSize.height, u), r), p.dispose();
	}
	#d(t, n, r, i, a) {
		let o = ei(r, i, n, t), s = ti(n);
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
		}), this.#i.clear(), pi(o);
	}
};
function vi(e) {
	return Pr(e) ? new _i(e) : null;
}
//#endregion
//#region layer-addons/built-ins.ts
function yi(e) {
	return e;
}
//#endregion
//#region layer-addons/shader-codegen.ts
function Q(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function bi(e, t) {
	return t === "wgsl" ? `vec3<f32>(${Q(e)})` : `vec3(${Q(e)})`;
}
function $(e, t, n, r) {
	return r === "wgsl" ? `var ${e}: ${t} = ${n};` : `${t} ${e} = ${n};`;
}
function xi(e, t, n, r) {
	return r === "wgsl" ? `select(${n}, ${t}, ${e})` : `((${e}) ? ${t} : ${n})`;
}
function Si(e) {
	return `effectColor = ${e === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
//#endregion
//#region Skybox.ts
var Ci = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: R,
	nodes: [],
	version: 2
}, wi = .18, Ti = .75, Ei = 1.75, Di = 1e-4, Oi = .01, ki = {
	hoveredLayerId: null,
	selectedLayerId: null
}, Ai = new e.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, e.RGBAFormat);
Ai.colorSpace = e.SRGBColorSpace, Ai.needsUpdate = !0;
function ji(e, t) {
	return +(t === e);
}
function Mi(e, t) {
	return +(t === e);
}
function Ni(e, t) {
	return Math.max(ji(e, t.hoveredLayerId), Mi(e, t.selectedLayerId));
}
function Pi(e, t) {
	return e.map((e) => ({
		active: j(Ni(e.layer.id, t)),
		layerId: e.layer.id
	}));
}
function Fi(e, t) {
	e.forEach((e) => {
		e.active.value = Ni(e.layerId, t);
	});
}
function Ii(e, t) {
	return Object.fromEntries(e.map((e) => [`imageActive${e.index}`, { value: Ni(e.layer.id, t) }]));
}
function Li(e, t) {
	return Object.fromEntries(e.map((e) => [`spotActive${e.index}`, { value: Ni(e.layer.id, t) }]));
}
function Ri(e, t, n, r) {
	t.forEach((t) => {
		let n = `imageActive${t.index}`;
		e.uniforms[n] && (e.uniforms[n].value = Ni(t.layer.id, r));
	}), n.forEach((t) => {
		let n = `spotActive${t.index}`;
		e.uniforms[n] && (e.uniforms[n].value = Ni(t.layer.id, r));
	});
}
function zi(e, t) {
	e.userData.applyEditorLayerState = t;
}
function Bi(t) {
	if (!t) return {
		centerDirection: new e.Vector3(0, 0, -1),
		halfSize: new e.Vector2(0, 0),
		tangentX: new e.Vector3(1, 0, 0),
		tangentY: new e.Vector3(0, 1, 0)
	};
	let n = Ve(t);
	return {
		centerDirection: new e.Vector3(...n.centerDirection),
		halfSize: new e.Vector2(Math.max(0, Math.tan(n.angularWidth / 2)), Math.max(0, Math.tan(n.angularHeight / 2))),
		tangentX: new e.Vector3(...n.tangentX),
		tangentY: new e.Vector3(...n.tangentY)
	};
}
function Vi(e) {
	return e.map((e) => {
		let t = Bi(e.layer.params.placement);
		return {
			centerDirection: j(t.centerDirection),
			halfSize: j(t.halfSize),
			layerId: e.layer.id,
			tangentX: j(t.tangentX),
			tangentY: j(t.tangentY)
		};
	});
}
function Hi(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = Bi(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function Ui(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = Bi(e.layer.params.placement);
		return [
			[`imageCenterDirection${e.index}`, { value: t.centerDirection }],
			[`imageTangentX${e.index}`, { value: t.tangentX }],
			[`imageTangentY${e.index}`, { value: t.tangentY }],
			[`imageHalfSize${e.index}`, { value: t.halfSize }]
		];
	}));
}
function Wi(e, t, n, r) {
	let i = t.find((e) => e.layer.id === n);
	if (!i) return;
	let a = Bi(r);
	e.uniforms[`imageCenterDirection${i.index}`]?.value.copy(a.centerDirection), e.uniforms[`imageTangentX${i.index}`]?.value.copy(a.tangentX), e.uniforms[`imageTangentY${i.index}`]?.value.copy(a.tangentY), e.uniforms[`imageHalfSize${i.index}`]?.value.copy(a.halfSize);
}
function Gi(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function Ki(t) {
	let n = t * Math.PI / 180;
	return new e.Vector3(Math.sin(n), Math.cos(n), 0).normalize();
}
function qi(e) {
	return [...e.stops].map((e) => ({
		color: e.color,
		midpoint: I((e.midpoint ?? 50) / 100, .01, .99),
		opacity: I(e.opacity / 100),
		t: I(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function Ji(t) {
	let [n, r, i] = se(t.color);
	return new e.Vector4(n, r, i, t.opacity);
}
function Yi(e) {
	return +(e === "gaussian");
}
function Xi(e) {
	return +(e === "gradient");
}
function Zi(e) {
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
function Qi(e) {
	return {
		blendMode: Zi(e.blendMode),
		opacity: I(e.opacity / 100)
	};
}
function $i(t, n) {
	let r = (I(t) - .5) * Math.PI * 2, i = (.5 - I(n)) * Math.PI, a = Math.cos(i);
	return new e.Vector3(a * Math.cos(r), Math.sin(i), a * Math.sin(r)).normalize();
}
function ea(t) {
	let [n, r, i] = se(t);
	return new e.Vector3(n, r, i);
}
function ta(e) {
	return e.map((e) => {
		let t = qi(e.layer.params);
		return {
			axis: j(Ki(e.layer.params.rotation)),
			layerId: e.layer.id,
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: j(Ji(r)),
					midpoint: j(r.midpoint),
					t: j(r.t)
				};
			})
		};
	});
}
function na(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = qi(t.params);
	n.axis.value.copy(Ki(t.params.rotation)), n.stops.forEach((e, t) => {
		let n = r[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(Ji(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function ra(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = qi(e.layer.params);
		return [[`${e.parameterPrefix}Axis`, { value: Ki(e.layer.params.rotation) }], ...Array.from({ length: e.stopCount }, (n, r) => {
			let i = t[r] ?? {
				color: "#000000",
				midpoint: .5,
				opacity: 0,
				t: 0
			};
			return [
				[`${e.parameterPrefix}StopColor${r}`, { value: Ji(i) }],
				[`${e.parameterPrefix}StopMidpoint${r}`, { value: i.midpoint }],
				[`${e.parameterPrefix}StopT${r}`, { value: i.t }]
			];
		}).flat()];
	}));
}
function ia(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	if (!r) return;
	let i = qi(t.params);
	e.uniforms[`${r.parameterPrefix}Axis`]?.value.copy(Ki(t.params.rotation)), Array.from({ length: r.stopCount }, (t, n) => {
		let a = i[n] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.uniforms[`${r.parameterPrefix}StopColor${n}`]?.value.copy(Ji(a)), e.uniforms[`${r.parameterPrefix}StopT${n}`] && (e.uniforms[`${r.parameterPrefix}StopT${n}`].value = a.t), e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`] && (e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`].value = a.midpoint);
	});
}
function aa(e) {
	return e.map((e) => ({
		amplitude: j(I(e.layer.params.amplitude, 0, .6)),
		anchors: Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return {
				color: j(ea(r.color)),
				direction: j($i(r.x, r.y))
			};
		}),
		frequency: j(Math.max(1e-4, e.layer.params.frequency)),
		layerId: e.layer.id,
		mode: j(Yi(e.layer.params.mode)),
		power: j(Math.max(1e-4, e.layer.params.power))
	}));
}
function oa(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n && (n.amplitude.value = I(t.params.amplitude, 0, .6), n.frequency.value = Math.max(1e-4, t.params.frequency), n.mode.value = Yi(t.params.mode), n.power.value = Math.max(1e-4, t.params.power), n.anchors.forEach((e, n) => {
		let r = t.params.anchors[n] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.color.value.copy(ea(r.color)), e.direction.value.copy($i(r.x, r.y));
	}));
}
function sa(e) {
	return Object.fromEntries(e.flatMap((e) => [
		[`${e.parameterPrefix}Amplitude`, { value: I(e.layer.params.amplitude, 0, .6) }],
		[`${e.parameterPrefix}Frequency`, { value: Math.max(1e-4, e.layer.params.frequency) }],
		[`${e.parameterPrefix}Mode`, { value: Yi(e.layer.params.mode) }],
		[`${e.parameterPrefix}Power`, { value: Math.max(1e-4, e.layer.params.power) }],
		...Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return [[`${e.parameterPrefix}AnchorDirection${n}`, { value: $i(r.x, r.y) }], [`${e.parameterPrefix}AnchorColor${n}`, { value: ea(r.color) }]];
		}).flat()
	]));
}
function ca(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	r && (e.uniforms[`${r.parameterPrefix}Amplitude`] && (e.uniforms[`${r.parameterPrefix}Amplitude`].value = I(t.params.amplitude, 0, .6)), e.uniforms[`${r.parameterPrefix}Frequency`] && (e.uniforms[`${r.parameterPrefix}Frequency`].value = Math.max(1e-4, t.params.frequency)), e.uniforms[`${r.parameterPrefix}Mode`] && (e.uniforms[`${r.parameterPrefix}Mode`].value = Yi(t.params.mode)), e.uniforms[`${r.parameterPrefix}Power`] && (e.uniforms[`${r.parameterPrefix}Power`].value = Math.max(1e-4, t.params.power)), Array.from({ length: r.anchorCount }, (n, i) => {
		let a = t.params.anchors[i] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.uniforms[`${r.parameterPrefix}AnchorDirection${i}`]?.value.copy($i(a.x, a.y)), e.uniforms[`${r.parameterPrefix}AnchorColor${i}`]?.value.copy(ea(a.color));
	}));
}
function la(t) {
	let n = et(t);
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
		lightColor: ea(n.lightColor),
		mode: Xi(n.colorMode),
		radius: Math.max(1e-4, n.angularRadius),
		stops: qi(n)
	};
}
function ua(e) {
	return e.map((e) => {
		let t = la(e.layer.params);
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
					color: j(Ji(r)),
					midpoint: j(r.midpoint),
					t: j(r.t)
				};
			})
		};
	});
}
function da(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = la(t.params);
	n.brightness.value = r.brightness, n.centerDirection.value.copy(r.centerDirection), n.coreRadius.value = r.coreRadius, n.coreSoftness.value = r.coreSoftness, n.dispersion.value = r.dispersion, n.dogSpread.value = r.dogSpread, n.dogStrength.value = r.dogStrength, n.dogStretch.value = r.dogStretch, n.glareSize.value = r.glareSize, n.glareStrength.value = r.glareStrength, n.glowSize.value = r.glowSize, n.glowStrength.value = r.glowStrength, n.haloInnerWidth.value = r.haloInnerWidth, n.haloOuterWidth.value = r.haloOuterWidth, n.haloRadius.value = r.haloRadius, n.haloStrength.value = r.haloStrength, n.lightColor.value.copy(r.lightColor), n.mode.value = r.mode, n.radius.value = r.radius, n.stops.forEach((e, t) => {
		let n = r.stops[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(Ji(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function fa(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = la(e.layer.params);
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
					[`${e.parameterPrefix}StopColor${r}`, { value: Ji(i) }],
					[`${e.parameterPrefix}StopMidpoint${r}`, { value: i.midpoint }],
					[`${e.parameterPrefix}StopT${r}`, { value: i.t }]
				];
			}).flat()
		];
	}));
}
function pa(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	if (!r) return;
	let i = la(t.params);
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
		e.uniforms[`${r.parameterPrefix}StopColor${n}`]?.value.copy(Ji(a)), e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`] && (e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`].value = a.midpoint), e.uniforms[`${r.parameterPrefix}StopT${n}`] && (e.uniforms[`${r.parameterPrefix}StopT${n}`].value = a.t);
	});
}
function ma(e) {
	return e.map((e) => {
		let t = Qi(e.node);
		return {
			blendMode: j(t.blendMode),
			nodeId: e.node.id,
			opacity: j(t.opacity)
		};
	});
}
function ha(e, t) {
	for (let n of e) if (n.enabled) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = ha(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
function ga(e, t) {
	e.forEach((e) => {
		let n = ha(t.nodes, e.nodeId);
		if (!n) return;
		let r = Qi(n);
		e.opacity.value = r.opacity, e.blendMode.value = r.blendMode;
	});
}
function _a(e, t) {
	let n = e.find((e) => e.nodeId === t.id);
	if (!n) return;
	let r = Qi(t);
	n.opacity.value = r.opacity, n.blendMode.value = r.blendMode;
}
function va(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = Qi(e.node);
		return [[`${e.parameterPrefix}Opacity`, { value: t.opacity }], [`${e.parameterPrefix}BlendMode`, { value: t.blendMode }]];
	}));
}
function ya(e, t, n) {
	t.forEach((t) => {
		let r = ha(n.nodes, t.node.id);
		if (!r) return;
		let i = Qi(r), a = e.uniforms[`${t.parameterPrefix}Opacity`], o = e.uniforms[`${t.parameterPrefix}BlendMode`];
		a && (a.value = i.opacity), o && (o.value = i.blendMode);
	});
}
function ba(e, t, n) {
	let r = t.find((e) => e.node.id === n.id);
	if (!r) return;
	let i = Qi(n), a = e.uniforms[`${r.parameterPrefix}Opacity`], o = e.uniforms[`${r.parameterPrefix}BlendMode`];
	a && (a.value = i.opacity), o && (o.value = i.blendMode);
}
function xa(e, t) {
	e.userData.applyGradientLayerParams = t;
}
function Sa(e, t) {
	e.userData.applyGradientLayerParam = t;
}
function Ca(e, t) {
	e.userData.applyFieldGradientLayerParams = t;
}
function wa(e, t) {
	e.userData.applyFieldGradientLayerParam = t;
}
function Ta(e, t) {
	e.userData.applySpotLayerParams = t;
}
function Ea(e, t) {
	e.userData.applySpotLayerParam = t;
}
function Da(e, t) {
	e.userData.applyCompositionParams = t;
}
function Oa(e, t) {
	e.userData.applyLayerComposition = t;
}
function ka(e) {
	return e ?? R;
}
function Aa(t = R) {
	return ka(t).type === "sphere" ? new e.SphereGeometry(1, 64, 32) : new e.BoxGeometry(1, 1, 1);
}
function ja(t = 1, n = 25, r = 25) {
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
function Ma(t = R) {
	if (ka(t).type === "sphere") return ja();
	let n = new e.BoxGeometry(1, 1, 1), r = new e.EdgesGeometry(n);
	return n.dispose(), r;
}
function Na(e) {
	return e.filter((e) => e.enabled).reverse();
}
function Pa(e) {
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
function Fa(e) {
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
function Ia(e) {
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
function La(e) {
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
function Ra(e) {
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
function za(e) {
	let t = [];
	function n(e) {
		Na(e).forEach((e) => {
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
function Ba(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Va(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Ha(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Ua(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Wa(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Ga(e) {
	return new Map(e.map((e) => [e.node.id, e]));
}
function Ka(e, t, n) {
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
      ${o} imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${Q(Oi)});
      ${o} imageHardInside = step(${Q(Di)}, imageDenom) *
        step(0.0, ${n.halfSize}.x) *
        step(0.0, ${n.halfSize}.y);
      ${o} imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      ${s} imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return ${a}(imageU, imageV, imageValid, 0.0);
    `;
}
function qa(e, t, n) {
	let r = t.get(e.id);
	return r ? n === "wgsl" ? `effectColor = ${r.parameterName};` : `{
    vec4 imageSampleInfo = skyboxStudioImageSampleInfo${r.index}(direction);
    vec4 imageSampleColor = texture2D(imageTexture${r.index}, imageSampleInfo.xy);
    effectColor = vec4(imageSampleColor.rgb, imageSampleColor.a * imageSampleInfo.z);
  }` : `effectColor = ${n === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function Ja(e, t, n) {
	let r = t.get(e.id);
	return r ? n === "wgsl" ? `effectColor = ${r.parameterName};` : `effectColor = texture2D(starfieldTexture${r.index}, directionToSourceStarfieldUv(direction));` : `effectColor = ${n === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function Ya() {
	return "\n      const float SKYBOX_STUDIO_PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.z, normalizedDirection.x);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * SKYBOX_STUDIO_PI) + 0.5, latitude / SKYBOX_STUDIO_PI + 0.5);\n      }\n\n      vec2 directionToSourceStarfieldUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float theta = atan(normalizedDirection.x, normalizedDirection.z);\n        float u = fract(theta / (2.0 * SKYBOX_STUDIO_PI) + 0.5);\n        float v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / SKYBOX_STUDIO_PI;\n\n        return vec2(u, v);\n      }\n    ";
}
function Xa(e) {
	return F(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${Ka(e, "wgsl", {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var Za = F("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n"), Qa = F(`
  fn skyboxStudioApplyImageEditorRectOverlay(
    color: vec4<f32>,
    uv: vec2<f32>,
    valid: f32,
    activeValue: f32
  ) -> vec4<f32> {
    let activeAmount = clamp(activeValue, 0.0, 1.0);
    let rectCoverage = valid * activeAmount;
    let edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${Q(Oi)});
    let bounds = rectCoverage * (
      1.0 - smoothstep(
        edgeWidth * ${Q(Ti)},
        edgeWidth * ${Q(Ei)},
        edgeDistance
      )
    );
    let rectAlpha = rectCoverage * ${Q(wi)};
    let overlayAlpha = max(rectAlpha, bounds);
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), overlayAlpha),
      color.a
    );
  }
`), $a = F(`
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
    let spotEdgeWidth = clamp(fwidth(spotEdgeDistance), 0.000001, ${Q(Oi)});
    let spotValid = step(${Q(Di)}, spotDenom) *
      step(-spotEdgeWidth, spotEdgeDistance) *
      smoothstep(-spotEdgeWidth, spotEdgeWidth, spotEdgeDistance);

    return vec4<f32>(spotU, spotV, spotValid, 0.0);
  }
`);
function eo(e) {
	return e.map((e) => `
        vec4 skyboxStudioImageSampleInfo${e.index}(vec3 direction) {
          ${Ka(e, "glsl", {
		centerDirection: `imageCenterDirection${e.index}`,
		halfSize: `imageHalfSize${e.index}`,
		tangentX: `imageTangentX${e.index}`,
		tangentY: `imageTangentY${e.index}`
	})}
        }
      `).join("\n");
}
function to(e) {
	return e.map((e) => `
        {
          vec4 imageEditorInfo = skyboxStudioImageSampleInfo${e.index}(direction);
          float activeAmount = clamp(imageActive${e.index}, 0.0, 1.0);
          float rectCoverage = imageEditorInfo.z * activeAmount;
          float edgeDistance = min(min(imageEditorInfo.x, 1.0 - imageEditorInfo.x), min(imageEditorInfo.y, 1.0 - imageEditorInfo.y));
          float edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${Q(Oi)});
          float bounds = rectCoverage * (
            1.0 - smoothstep(
              edgeWidth * ${Q(Ti)},
              edgeWidth * ${Q(Ei)},
              edgeDistance
            )
          );
          float rectAlpha = rectCoverage * ${Q(wi)};
          float overlayAlpha = max(rectAlpha, bounds);
          composedColor = mix(composedColor, vec3(1.0, 0.0, 0.0), overlayAlpha);
        }
      `).join("\n");
}
function no(e) {
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
          float edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${Q(Oi)});
          float rectCoverage = step(${Q(Di)}, spotEditorDenom) *
            step(-edgeWidth, edgeDistance) *
            smoothstep(-edgeWidth, edgeWidth, edgeDistance) *
            activeAmount;
          float bounds = rectCoverage * (
            1.0 - smoothstep(
              edgeWidth * ${Q(Ti)},
              edgeWidth * ${Q(Ei)},
              edgeDistance
            )
          );
          float rectAlpha = rectCoverage * ${Q(wi)};
          float overlayAlpha = max(rectAlpha, bounds);
          composedColor = mix(composedColor, vec3(1.0, 0.0, 0.0), overlayAlpha);
        }
      `).join("\n");
}
function ro(e) {
	return e.map((e) => `uniform vec3 ${e.parameterPrefix}Axis;
      ${Array.from({ length: e.stopCount }, (t, n) => `uniform vec4 ${e.parameterPrefix}StopColor${n};
      uniform float ${e.parameterPrefix}StopMidpoint${n};
      uniform float ${e.parameterPrefix}StopT${n};`).join("\n")}`).join("\n");
}
function io(e) {
	return e.map((e) => `uniform float ${e.parameterPrefix}Amplitude;
      uniform float ${e.parameterPrefix}Frequency;
      uniform float ${e.parameterPrefix}Mode;
      uniform float ${e.parameterPrefix}Power;
      ${Array.from({ length: e.anchorCount }, (t, n) => `uniform vec3 ${e.parameterPrefix}AnchorDirection${n};
      uniform vec3 ${e.parameterPrefix}AnchorColor${n};`).join("\n")}`).join("\n");
}
function ao(e, t) {
	return e.map((e) => `uniform vec3 ${e.parameterPrefix}CenterDirection;
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
      ${t ? `uniform float spotActive${e.index};` : ""}
      ${Array.from({ length: e.stopCount }, (t, n) => `uniform vec4 ${e.parameterPrefix}StopColor${n};
      uniform float ${e.parameterPrefix}StopMidpoint${n};
      uniform float ${e.parameterPrefix}StopT${n};`).join("\n")}`).join("\n");
}
function oo(e, t) {
	return e.map((e) => `uniform sampler2D imageTexture${e.index};
      uniform vec3 imageCenterDirection${e.index};
      uniform vec3 imageTangentX${e.index};
      uniform vec3 imageTangentY${e.index};
      uniform vec2 imageHalfSize${e.index};${t ? `
      uniform float imageActive${e.index};` : ""}`).join("\n");
}
function so(e) {
	return e.map((e) => `uniform sampler2D starfieldTexture${e.index};`).join("\n");
}
function co(e, t) {
	return e.get(t.id) ?? Ai;
}
function lo(e, t) {
	return Object.fromEntries(e.map((e) => [`imageTexture${e.index}`, { value: co(t, e.layer) }]));
}
function uo(e, t, n) {
	t.forEach((t) => {
		let r = `imageTexture${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = co(n, t.layer));
	});
}
function fo(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? Ai;
	});
}
function po(e) {
	e.userData.starfieldRenderTarget || e.dispose();
}
function mo(e, t) {
	return e.get(t.id) ?? Ai;
}
function ho(e, t) {
	return Object.fromEntries(e.map((e) => [`starfieldTexture${e.index}`, { value: mo(t, e.layer) }]));
}
function go(e, t, n) {
	t.forEach((t) => {
		let r = `starfieldTexture${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = mo(n, t.layer));
	});
}
function _o(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? Ai;
	});
}
function vo(e, t) {
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
function yo(e, t) {
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
    ${$("fieldDirection", r, "direction", t)}
    ${i} warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      ${i} warpX = sin((direction.y * warpFrequency + 0.23) * ${Q(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${Q(Math.PI * 2)});
      ${i} warpY = cos((direction.z * warpFrequency + 0.17) * ${Q(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${Q(Math.PI * 2)});
      ${i} warpZ = sin((direction.x * warpFrequency - 0.31) * ${Q(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${Q(Math.PI * 2)});
      fieldDirection = normalize(direction + ${r}(warpX, warpY, warpZ) * warpScale);
    }
    ${$("weightedColor", r, `${r}(0.0)`, t)}
    ${$("weightSum", t === "wgsl" ? "f32" : "float", "0.0", t)}
    ${a}
    if (weightSum > 0.0) {
      effectColor = ${n}(weightedColor / weightSum, 1.0);
    } else {
      effectColor = ${n}(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
function bo(e, t) {
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
function xo(e, t) {
	let n = t === "wgsl" ? "vec4<f32>" : "vec4", r = t === "wgsl" ? "vec3<f32>" : "vec3", i = t === "wgsl" ? "let" : "float", a = `${e.parameterPrefix}Mode > 0.5`, o = bo(e, t);
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
      ${$("spotColor", r, `${e.parameterPrefix}LightColor * spotMonoLight + ${r}(max(spotMonoLight - 1.0, 0.0))`, t)}

      ${i} spotHaloInner = max(${e.parameterPrefix}HaloInnerWidth, 0.0001);
      ${i} spotHaloOuter = max(${e.parameterPrefix}HaloOuterWidth, 0.0001);
      ${i} spotHaloDelta = spotD - ${e.parameterPrefix}HaloRadius;
      ${i} spotHaloWidth = ${t === "wgsl" ? "select(spotHaloOuter, spotHaloInner, spotHaloDelta < 0.0)" : "(spotHaloDelta < 0.0 ? spotHaloInner : spotHaloOuter)"};
      ${i} spotHaloEnvelope = exp(-pow(spotHaloDelta / spotHaloWidth, 2.0));
      ${i} spotHaloT = clamp((spotD - (${e.parameterPrefix}HaloRadius - spotHaloInner)) / (spotHaloInner + spotHaloOuter), 0.0, 1.0);
      ${$("spotSpectrum", r, `${r}(1.0, 0.12, 0.05)`, t)}
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
      ${$("spotDogSpectrum", r, `${r}(1.0, 0.12, 0.05)`, t)}
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
var So = /* @__PURE__ */ new Map();
function Co(e, t, n) {
	let r = _e(e.type);
	return r?.glsl ? r.glsl.sampleExpression(e, n.get(e.type) ?? So, t) : Si(t);
}
function wo(e, t) {
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
	let n = bi(1, t), r = bi(.5, t), i = bi(0, t), a = "effectColor.rgb", o = "composedColor";
	switch (e) {
		case "darken": return `min(${o}, ${a})`;
		case "multiply": return `${o} * ${a}`;
		case "color-burn": return xi(`${o} == ${n}`, n, xi(`${a} == ${i}`, i, `${n} - min(${n}, (${n} - ${o}) / ${a})`, t), t);
		case "lighten": return `max(${o}, ${a})`;
		case "screen": return `${o} + ${a} - ${o} * ${a}`;
		case "color-dodge": return xi(`${o} == ${i}`, i, xi(`${a} == ${n}`, n, `min(${n}, ${o} / (${n} - ${a}))`, t), t);
		case "overlay": return xi(`${o} <= ${r}`, `2.0 * ${o} * ${a}`, `${n} - 2.0 * (${n} - ${o}) * (${n} - ${a})`, t);
		case "soft-light": return xi(`${a} <= ${r}`, `${o} - (${n} - 2.0 * ${a}) * ${o} * (${n} - ${o})`, `${o} + (2.0 * ${a} - ${n}) * (softLightD - ${o})`, t);
		case "hard-light": return xi(`${a} <= ${r}`, `2.0 * ${o} * ${a}`, `${o} + (2.0 * ${a} - ${n}) - ${o} * (2.0 * ${a} - ${n})`, t);
		case "difference": return `abs(${o} - ${a})`;
		case "exclusion": return `${o} + ${a} - 2.0 * ${o} * ${a}`;
		default: return a;
	}
}
function To(e) {
	if (e === "glsl") return "";
	let t = e === "wgsl" ? "vec3<f32>" : "vec3";
	return `${e === "wgsl" ? "let" : "vec3"} softLightD = ${xi(`composedColor <= ${t}(0.25)`, `((16.0 * composedColor - ${t}(12.0)) * composedColor + ${t}(4.0)) * composedColor`, "sqrt(composedColor)", e)};`;
}
function Eo(e, t) {
	let n = Zi(t);
	return `${e} >= ${Q(n - .5)} && ${e} < ${Q(n + .5)}`;
}
function Do(e, t) {
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
	].map((n, r) => `${r === 0 ? "if" : "else if"} (${Eo(e, n)}) {
          blendedColor = ${wo(n, t)};
        }`).join("\n");
	return `${To(t)}
        ${$("blendedColor", n, "effectColor.rgb", t)}
        ${r}
        blendedColor = clamp(blendedColor, ${n}(0.0), ${n}(1.0));`;
}
function Oo(e, t, n, r, i, a = 0) {
	let o = t === "wgsl" ? "vec3<f32>" : "vec3", s = t === "wgsl" ? "vec4<f32>" : "vec4";
	return Na(e).map((e, c) => {
		let l = e.type === "group" ? `effectColor = ${s}(${`groupColor${a}_${c}`}, 1.0);` : t === "wgsl" && i ? Ao(e, i) : Co(e, t, n), u = `groupColor${a}_${c}`, d = r.get(e.id), f = d ? `${d.parameterPrefix}Opacity` : Q(e.opacity / 100), p = d ? `${d.parameterPrefix}BlendMode` : Q(Zi(e.blendMode));
		return `{
        ${e.type === "group" ? `${$(u, o, `${o}(0.0)`, t)}
        {
          ${$("previousComposedColor", o, "composedColor", t)}
          composedColor = ${o}(0.0);
          ${Oo(e.children, t, n, r, i, a + 1)}
          ${u} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${$("effectColor", s, `${s}(0.0)`, t)}
        ${l}
        ${t === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${f}, 0.0, 1.0);
        ${Do(p, t)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          ${o}(0.0),
          ${o}(1.0)
        );
      }`;
	}).join("\n");
}
function ko(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Ao(e, t) {
	let n = t.adapters.get(e.type);
	return n ? n.adapter.createSampleExpression(e, "wgsl", { bindingsByLayerId: n.bindingsByLayerId }) : Si("wgsl");
}
var jo = yi([
	{
		collect: Pa,
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
			return r ? vo(r, t) : Si(t);
		},
		createSampleParameters: (e, t) => Object.fromEntries(e.flatMap((e) => {
			let n = t[e.index];
			return [[`${e.parameterPrefix}Axis`, n.axis], ...Array.from({ length: e.stopCount }, (t, r) => [
				[`${e.parameterPrefix}StopColor${r}`, n.stops[r].color],
				[`${e.parameterPrefix}StopMidpoint${r}`, n.stops[r].midpoint],
				[`${e.parameterPrefix}StopT${r}`, n.stops[r].t]
			]).flat()];
		})),
		createUniforms: ta,
		getTopologyKey: (e) => ({
			mode: e.params.mode,
			stopCount: e.params.stops.length
		}),
		type: "gradient",
		updateUniforms: na
	},
	{
		collect: Fa,
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
			return r ? yo(r, t) : Si(t);
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
		createUniforms: aa,
		getTopologyKey: (e) => ({ anchorCount: e.params.anchors.length }),
		type: "field-gradient",
		updateUniforms: oa
	},
	{
		collect: Ia,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : Si(t);
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, uniforms: r }) => {
			let i = zo(e, t, n, r);
			return {
				editorProjectionByLayerId: new Map(Array.from(i.sampleData.entries()).map(([e, t]) => [e, {
					uv: N(t.sampleInfo.x, t.sampleInfo.y),
					valid: t.sampleInfo.z
				}])),
				sampleData: i.sampleData,
				sampleNodesByLayerId: Object.fromEntries(e.map((e) => [e.layer.id, i.sampleNodes[e.parameterName]])),
				sampleNodesByParameterName: i.sampleNodes,
				textureSlots: Object.fromEntries(Array.from(i.sampleData.entries()).map(([e, t]) => [e, t.textureNode]))
			};
		},
		createSampleParameters: (e, t, n) => n?.sampleNodesByParameterName ?? {},
		createUniforms: Vi,
		getTopologyKey: (e) => ({
			hasPlacement: !!e.params.placement,
			hasSrc: !!e.params.src,
			height: e.params.height,
			width: e.params.width
		}),
		type: "image",
		updateUniforms: (e, t) => Hi(e, t.id, t.params.placement)
	},
	{
		collect: La,
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
			return r ? xo(r, t) : Si(t);
		},
		createSampleNodes: ({ bindings: e, direction: t, uniforms: n }) => ({ editorProjectionByLayerId: new Map(e.map((e) => {
			let r = n[e.index], i = $a({
				direction: t,
				spotCenterDirection: r.centerDirection,
				spotRadius: r.radius
			});
			return [e.layer.id, {
				uv: N(i.x, i.y),
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
		createUniforms: ua,
		getTopologyKey: (e) => ({ stopCount: e.params.stops.length }),
		type: "spot",
		updateUniforms: da
	},
	{
		collect: Ra,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : Si(t);
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n }) => {
			let r = n, i = /* @__PURE__ */ new Map(), a = Object.fromEntries(e.map((e) => {
				let n = Ho({ direction: t }), a = A(mo(r, e.layer), n).setName(`starfieldTexture${e.index}`);
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
	}
]), Mo = new Set(["image", "spot"]);
jo.forEach((e) => {
	ge({
		type: e.type,
		wgsl: e,
		wgslEditorOverlay: Mo.has(e.type),
		getTopologyKey: (t) => e.getTopologyKey(t)
	});
}), Object.entries({
	gradient: {
		collectBindings: (e) => Pa(e),
		createBindingMap: (e) => Ba(e),
		uniformDeclarations: (e) => ro(e),
		shaderUniforms: (e) => ra(e),
		applyParams: (e, t, n) => ia(e, t, n),
		sampleExpression: (e, t, n) => {
			let r = t.get(e.id);
			return r ? vo(r, n) : Si(n);
		}
	},
	"field-gradient": {
		collectBindings: (e) => Fa(e),
		createBindingMap: (e) => Va(e),
		uniformDeclarations: (e) => io(e),
		shaderUniforms: (e) => sa(e),
		applyParams: (e, t, n) => ca(e, t, n),
		sampleExpression: (e, t, n) => {
			let r = t.get(e.id);
			return r ? yo(r, n) : Si(n);
		}
	},
	spot: {
		collectBindings: (e) => La(e),
		createBindingMap: (e) => Ua(e),
		uniformDeclarations: (e, t) => ao(e, t.editorPresentationEnabled),
		shaderUniforms: (e, t) => ({
			...fa(e),
			...t.editorPresentationEnabled ? Li(e, t.editorLayerState) : {}
		}),
		editorOverlayExpression: (e) => no(e),
		applyParams: (e, t, n) => pa(e, t, n),
		sampleExpression: (e, t, n) => {
			let r = t.get(e.id);
			return r ? xo(r, n) : Si(n);
		}
	},
	starfield: {
		collectBindings: (e) => Ra(e),
		createBindingMap: (e) => Wa(e),
		uniformDeclarations: (e) => so(e),
		shaderUniforms: (e, t) => ho(e, t.starfieldTextures),
		sampleExpression: (e, t, n) => Ja(e, t, n)
	},
	image: {
		collectBindings: (e) => Ia(e),
		createBindingMap: (e) => Ha(e),
		uniformDeclarations: (e, t) => oo(e, t.editorPresentationEnabled),
		fragmentHelpers: (e) => eo(e),
		shaderUniforms: (e, t) => ({
			...Ui(e),
			...lo(e, t.imageTextures),
			...t.editorPresentationEnabled ? Ii(e, t.editorLayerState) : {}
		}),
		editorOverlayExpression: (e) => to(e),
		sampleExpression: (e, t, n) => qa(e, t, n)
	}
}).forEach(([e, t]) => {
	ge({
		type: e,
		glsl: t
	});
});
function No() {
	return ve().map((e) => e.wgsl).filter((e) => !!e);
}
function Po(e, t, n, r, i) {
	let a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = {}, c = {};
	return No().forEach((i) => {
		let l = i.collect(e.nodes), u = i.createUniforms(l), d = i.createSampleNodes?.({
			bindings: l,
			direction: t,
			imageTextures: i.type === "starfield" ? r : n,
			uniforms: u
		}), f = {
			adapter: i,
			bindings: l,
			bindingsByLayerId: ko(l),
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
function Fo(e, t) {
	return e.adapters.get(t);
}
function Io(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Io(e.children, t);
				return;
			}
			t(e);
		}
	});
}
function Lo(e, t) {
	let n = e.adapters.get(t.type);
	n && n.adapter.updateUniforms(n.uniforms, t);
}
function Ro(e, t, n) {
	let r = Ga(n), i = Oo(e.nodes, "wgsl", /* @__PURE__ */ new Map(), r, t);
	return F(`
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
function zo(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	return {
		sampleData: i,
		sampleNodes: Object.fromEntries(e.map((e) => {
			let a = r[e.index], o = Xa(e)({
				direction: t,
				imageCenterDirection: a.centerDirection,
				imageHalfSize: a.halfSize,
				imageTangentX: a.tangentX,
				imageTangentY: a.tangentY
			}), s = N(o.x, o.y), c = A(co(n, e.layer), s).setName(`imageTexture${e.index}`);
			c.getUniformHash = () => `skybox-image-texture:${e.layer.id}`;
			let l = Za({
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
function Bo(t, i, a, o, s, c) {
	let l = new n(), d = za(t.nodes), f = ma(d), p = r(() => {
		let e = S;
		return e.z.assign(e.w), e;
	})();
	l.side = e.BackSide, l.depthTest = !1, l.depthWrite = !1, l.vertexNode = p;
	let m = w(T.sub(u)), h = Po(t, m, a, o, s), g = Fo(h, "image"), _ = g?.uniforms ?? [], v = g?.samples, y = Fo(h, "starfield")?.samples, b = Ro(t, h, d), x = c ? ve().flatMap((e) => {
		let t = h.adapters.get(e.type);
		if (!e.wgslEditorOverlay || !t) return [];
		let n = t.bindings;
		return [{
			bindings: n,
			editorUniforms: Pi(n, i)
		}];
	}) : [], C = b({
		direction: m,
		...h.sampleParameters,
		...Object.fromEntries(d.flatMap((e) => {
			let t = f[e.index];
			return [[`${e.parameterPrefix}Opacity`, t.opacity], [`${e.parameterPrefix}BlendMode`, t.blendMode]];
		}))
	});
	return x.forEach(({ bindings: e, editorUniforms: t }) => {
		e.forEach((e, n) => {
			let r = h.editorProjectionByLayerId.get(e.layer.id);
			r && (C = Qa({
				color: C,
				activeValue: t[n].active,
				uv: r.uv,
				valid: r.valid
			}));
		});
	}), l.colorNode = C, x.length > 0 && zi(l, (e) => {
		x.forEach(({ editorUniforms: t }) => Fi(t, e));
	}), l.userData.webGpuLayerRuntime = h, l.userData.applyLayerParams = (e) => Lo(h, e), xa(l, (e) => Io(e.nodes, l.userData.applyLayerParams)), Sa(l, l.userData.applyLayerParams), Ca(l, (e) => Io(e.nodes, l.userData.applyLayerParams)), wa(l, l.userData.applyLayerParams), Ta(l, (e) => Io(e.nodes, l.userData.applyLayerParams)), Ea(l, l.userData.applyLayerParams), Da(l, (e) => ga(f, e)), Oa(l, (e) => _a(f, e)), Gi(l, (e, t) => Hi(_, e, t)), l.userData.applyImageTextures = (e) => fo(v?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.applyStarfieldTextures = (e) => _o(y?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.debugImageTextureSlots = h.textureSlotsByLayerId, l;
}
var Vo = F("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.z, normalizedDirection.x);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n"), Ho = F("\n  fn skyboxStudioDirectionToSourceStarfieldUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let theta = atan2(normalizedDirection.x, normalizedDirection.z);\n    let u = fract(theta / 6.283185307179586 + 0.5);\n    let v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / 3.141592653589793;\n\n    return vec2<f32>(u, v);\n  }\n");
function Uo(t) {
	let i = new n(), a = r(() => {
		let e = S;
		return e.z.assign(e.w), e;
	})(), o = w(T.sub(u));
	return i.side = e.BackSide, i.depthTest = !1, i.depthWrite = !1, i.vertexNode = a, i.colorNode = A(t, Vo({ direction: o })), i;
}
function Wo(t, n, r, i, a) {
	let o = za(t.nodes), s = Ga(o), c = {
		editorPresentationEnabled: a,
		editorLayerState: n,
		imageTextures: r,
		starfieldTextures: i
	}, l = ve().flatMap((e) => e.glsl ? [{
		type: e.type,
		glsl: e.glsl,
		bindings: e.glsl.collectBindings(t.nodes)
	}] : []), u = l.find((e) => e.type === "image")?.bindings ?? [], d = l.find((e) => e.type === "spot")?.bindings ?? [], f = l.find((e) => e.type === "starfield")?.bindings ?? [], p = new Map(l.map((e) => [e.type, e.glsl.createBindingMap(e.bindings)])), m = Object.assign({}, ...l.map((e) => e.glsl.shaderUniforms(e.bindings, c))), h = l.map((e) => e.glsl.uniformDeclarations(e.bindings, c)).join("\n"), g = l.map((e) => e.glsl.fragmentHelpers?.(e.bindings) ?? "").join("\n"), _ = a ? l.map((e) => e.glsl.editorOverlayExpression?.(e.bindings, c) ?? "").join("\n") : "", v = l.some((e) => !!e.glsl.fragmentHelpers && e.bindings.length > 0 || a && !!e.glsl.editorOverlayExpression && e.bindings.length > 0), y = Oo(t.nodes, "glsl", p, s), b = new e.ShaderMaterial({
		uniforms: {
			...m,
			...va(o)
		},
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: `
      precision highp float;
      ${h}
      ${o.map((e) => `uniform float ${e.parameterPrefix}Opacity;
      uniform float ${e.parameterPrefix}BlendMode;`).join("\n")}
      varying vec3 vDirection;
      ${Ya()}
      ${g}

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
        ${y}
        ${_}
        gl_FragColor = vec4(composedColor, 1.0);
      }
    `
	});
	return v && (b.extensions.derivatives = !0), a && zi(b, (e) => Ri(b, u, d, e)), Da(b, (e) => ya(b, o, e)), Oa(b, (e) => ba(b, o, e)), Gi(b, (e, t) => Wi(b, u, e, t)), b.userData.applyImageTextures = (e) => uo(b, u, e), b.userData.applyStarfieldTextures = (e) => go(b, f, e), b.userData.applyLayerParams = (e) => {
		let t = l.find((t) => t.type === e.type);
		t?.glsl.applyParams?.(b, e, t.bindings);
	}, b;
}
function Go(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function Ko(t, n = {}) {
	let r = vr(t, n), i = Go(r.width, r.height), a = i.getContext("2d");
	if (!a || !("putImageData" in a)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	a.putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
	let o = new e.CanvasTexture(i);
	return o.mapping = e.EquirectangularReflectionMapping, o.wrapS = e.RepeatWrapping, o.wrapT = e.ClampToEdgeWrapping, o.colorSpace = e.SRGBColorSpace, o.flipY = !1, o.needsUpdate = !0, o;
}
function qo(t) {
	return new e.ShaderMaterial({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		uniforms: { skyboxTexture: { value: t } },
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: "\n      precision highp float;\n      uniform sampler2D skyboxTexture;\n      varying vec3 vDirection;\n\n      const float PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.z, normalizedDirection.x);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);\n      }\n\n      void main() {\n        vec3 direction = normalize(vDirection);\n        vec4 sampledColor = texture2D(skyboxTexture, directionToEquirectUv(direction));\n        gl_FragColor = vec4(sampledColor.rgb, sampledColor.a);\n      }\n    "
	});
}
function Jo(e, t) {
	return Yo(t) ? Uo(e) : qo(e);
}
function Yo(e) {
	return !!(e && "isWebGPURenderer" in e && e.isWebGPURenderer);
}
function Xo(e, t) {
	return e === "auto" ? Yo(t) ? "live-webgpu" : "live-webgl" : e;
}
function Zo(e, t, n) {
	let r = (e) => e.type === "group" ? {
		children: e.children.map(r),
		enabled: e.enabled,
		id: e.id,
		type: e.type
	} : {
		enabled: e.enabled,
		id: e.id,
		topology: _e(e.type)?.getTopologyKey?.(e) ?? null,
		type: e.type
	};
	return JSON.stringify({
		editorPresentationEnabled: n,
		geometry: e.geometry?.type ?? R.type,
		nodes: e.nodes.map(r),
		renderMode: t
	});
}
function Qo(e, t) {
	for (let n of e) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = Qo(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
var $o = class extends e.Mesh {
	#e = {};
	#t = { ...ki };
	#n = !1;
	#r = R;
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
	#s = Ci;
	#c = null;
	#l = null;
	#u = "auto";
	#d = null;
	#f = null;
	#p = /* @__PURE__ */ new Map();
	#m = new e.Group();
	#h = /* @__PURE__ */ new Map();
	#g = /* @__PURE__ */ new Map();
	#_ = /* @__PURE__ */ new Map();
	constructor() {
		super(Aa(R), Bo(Ci, ki, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), !1)), this.frustumCulled = !1, this.renderOrder = -1, this.#m.name = "Skybox live starfield patches", this.add(this.#m);
	}
	fromManifest(e) {
		return this.#s = me(e), this.applyGeometry(this.#s.geometry ?? R), this;
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
		return this.#d = e, this.#f?.dispose(), this.#f = vi(e), this;
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
		this.material.userData.applyStarfieldTextures?.(this.#_);
	}
	otherOverridingSetup() {
		return this;
	}
	load(e) {
		return e && (this.#d = e), this.setManifest(this.#s), this;
	}
	applyGeometry(e) {
		let t = ka(e);
		if (this.#r.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#r = t, this.geometry = Aa(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#l?.dispose(), this.#l = null;
	}
	clearStarfieldPatchOverlay() {
		this.#m.children.forEach((t) => {
			t instanceof e.Group && ci(t);
		}), this.#m.clear();
	}
	syncStarfieldPatchOverlay() {
		this.clearStarfieldPatchOverlay();
		let e = this.material.userData.debugImageTextureSlots;
		Xo(this.#u, this.#d) === "live-webgpu" && Io(this.#s.nodes, (t) => {
			if (t.type !== "starfield") return;
			let n = this.#h.get(t.id);
			if (!n) return;
			e && (e[t.id] = { value: n });
			let r = si(n, t.params);
			r.renderOrder = 0, this.#m.add(r);
		});
	}
	disposeStarfieldTextures() {
		this.#p.forEach((e) => {
			clearTimeout(e);
		}), this.#p.clear(), this.#_.forEach((e) => po(e)), this.#_.clear(), this.clearStarfieldPatchOverlay(), this.#h.clear(), this.#g.clear(), this.#f?.dispose(), this.#f = null;
	}
	syncStarfieldTextures() {
		let e = /* @__PURE__ */ new Set();
		Io(this.#s.nodes, (t) => {
			if (t.type !== "starfield") return;
			e.add(t.id);
			let n = this.#f?.createBakeKey(t.params) ?? $n(t.params, 8192, 4096);
			this.#g.get(t.id) !== n && this.scheduleStarfieldTextureBake(t.id, t.params);
		}), Array.from(this.#_.keys()).forEach((t) => {
			if (e.has(t)) return;
			let n = this.#_.get(t);
			n && po(n), this.#_.delete(t), this.#h.delete(t), this.#g.delete(t);
		}), Array.from(this.#p.entries()).forEach(([t, n]) => {
			e.has(t) || (clearTimeout(n), this.#p.delete(t));
		}), this.syncStarfieldPatchOverlay();
	}
	scheduleStarfieldTextureBake(e, t) {
		let n = this.#f?.createBakeKey(t) ?? $n(t, 8192, 4096);
		if (this.#g.get(e) === n) return;
		let r = this.#p.get(e);
		r && clearTimeout(r);
		let i = setTimeout(() => {
			this.#p.delete(e);
			let t = Qo(this.#s.nodes, e);
			if (t?.type !== "starfield") return;
			let r = this.#f?.createBakeKey(t.params) ?? $n(t.params, 8192, 4096);
			if (r !== n) {
				this.scheduleStarfieldTextureBake(e, t.params);
				return;
			}
			if (!this.#f?.canBake()) return;
			let i = this.#f.bakeTexture(t.params, r), a = this.#_.get(e);
			a && a !== i && po(a), this.#_.set(e, i), this.#g.set(e, r), this.refreshStarfieldTextureBindings(), this.dispatchEvent({ type: "starfieldtexturechange" });
		}, 150);
		this.#p.set(e, i);
	}
	replaceMaterial(e, t = null) {
		let n = this.material;
		this.material = e, e.userData.applyEditorLayerState?.(this.#t), this.#i.forEach((t, n) => {
			e.userData.applyImageLayerPlacement?.(n, t);
		}), e.userData.applyStarfieldTextures?.(this.#_), n.dispose(), this.disposeOwnedTexture(), this.#l = t;
	}
	applyLiveManifestUniformUpdates() {
		this.material.userData.applyCompositionParams?.(this.#s), this.material.userData.applyLayerParams ? Io(this.#s.nodes, this.material.userData.applyLayerParams) : (this.material.userData.applyGradientLayerParams?.(this.#s), this.material.userData.applyFieldGradientLayerParams?.(this.#s), this.material.userData.applySpotLayerParams?.(this.#s)), this.material.userData.applyImageTextures?.(this.#a), this.material.userData.applyStarfieldTextures?.(this.#_), this.material.userData.applyEditorLayerState?.(this.#t), this.#i.forEach((e, t) => {
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
		let n = Qo(this.#s.nodes, e);
		return n?.type === "image" && (n.params = {
			...n.params,
			placement: t
		}), this.#i.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this;
	}
	updateLayerComposition(e, t) {
		let n = Qo(this.#s.nodes, e);
		return n ? (t.blendMode !== void 0 && (n.blendMode = t.blendMode), t.opacity !== void 0 && (n.opacity = t.opacity), this.material.userData.applyLayerComposition?.(n), this) : this;
	}
	updateLayer(e, t) {
		let n = Qo(this.#s.nodes, e);
		return !n || n.type === "group" ? this : (n.params = t, _e(n.type)?.updateLive?.(this.#o, n), this);
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
		let t = me(e);
		this.#s = t, this.applyGeometry(this.#s.geometry ?? this.#r), this.syncStarfieldTextures();
		let n = Xo(this.#u, this.#d), r = Zo(this.#s, n, this.#n);
		if (this.#c === r && (n === "live-webgpu" || n === "live-webgl")) return this.applyLiveManifestUniformUpdates(), this;
		if (n === "live-webgpu") this.replaceMaterial(Bo(this.#s, this.#t, this.#a, this.#_, this.#h, this.#n));
		else if (n === "live-webgl") this.replaceMaterial(Wo(this.#s, this.#t, this.#a, this.#_, this.#n));
		else {
			let e = Ko(this.#s, this.#e);
			this.replaceMaterial(Jo(e, this.#d), e);
		}
		return this.#c = r, this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(Jo(e, this.#d)), this.#c = null, this;
	}
	invalidateBakeCache() {
		return mr(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture(), this.disposeStarfieldTextures();
	}
};
//#endregion
export { cr as DEFAULT_BAKE_WIDTH, Xe as DEFAULT_SPOT_BASE_ANGULAR_RADIUS, Nt as DEFAULT_STARFIELD_CLIP, U as DEFAULT_STARFIELD_NEBULA, W as DEFAULT_STARFIELD_NEBULA_FIELD, Pt as DEFAULT_STARFIELD_PARAMS, At as DEFAULT_STARFIELD_QUALITY, H as DEFAULT_STARFIELD_STARS, De as IMAGE_PLACEMENT_ELEVATION_LIMIT, kt as STARFIELD_PREVIEW_BAKE_WIDTH, jt as STARFIELD_QUALITY_PRESETS, $o as Skybox, _i as StarfieldGpuBakeService, vr as bakeSkyboxImageData, rr as bakeStarfieldImageData, ue as blendChannel, I as clamp, de as compositeBlendChannel, fe as compositeOver, Be as createAngularDecalPlacement, pr as createBakeCacheKey, Ko as createBakedSkyboxTexture, $e as createDefaultSpotParams, ze as createImagePlacementTangents, Aa as createSkyboxGeometry, Ma as createSkyboxWireGeometry, An as createStarCatalogForCoverage, jn as createStarCatalogForDescriptor, $n as createStarfieldBakeCacheKey, vi as createStarfieldGpuBakeService, rn as createStarfieldPatchLayout, Ue as directionFromPosition, xe as equirectPointToDirection, Se as equirectUvToDirection, sr as evaluateSkyboxDirection, _e as getLayerRuntimeAdapter, ve as getLayerRuntimeAdapters, Lt as getStarfieldQualityPreset, mr as invalidateBakeCache, ye as isRegisteredLayerType, L as linearChannelToSrgb, ce as linearRgbToSrgbBytes, me as migrateManifestToV2, Ve as normalizeImagePlacement, et as normalizeSpotParams, qt as normalizeStarfieldCoverage, cn as normalizeStarfieldParams, It as normalizeStarfieldQuality, z as normalizeVector, se as parseHexColor, We as placementFromPosition, Je as placementFromRotation, Ke as placementFromScale, He as positionFromPlacement, tt as positionFromSpot, Ye as projectDirectionToImageUv, Sn as qFromV, rt as radiusScaleFromSpot, ge as registerLayerRuntimeAdapter, fr as resolveBakeOptions, qe as rotationFromPlacement, Qn as sampleStarfieldLayer, Ge as scaleFromPlacement, Ut as sourceDirectionFromUv, Wt as sourceFoldEquirectUv, Gt as sourceUvFromDirection, at as spotContainsDirection, nt as spotFromPosition, it as spotFromRadiusScale, oe as srgbChannelToLinear, _n as starfieldClipContainsDirection, Vn as starfieldFieldGradientToSourceField };
