import * as e from "three";
import { MeshBasicNodeMaterial as t, NodeMaterial as n } from "three/webgpu";
import { Fn as r, If as i, Loop as a, PI as o, acos as s, atan as c, attribute as l, cameraProjectionMatrixInverse as u, cameraWorldMatrix as d, clamp as f, cos as p, dot as m, exp as h, float as g, floor as _, int as v, max as y, min as b, mix as x, mod as S, modelViewProjection as C, mx_fractal_noise_float as ee, normalize as w, positionGeometry as te, pow as T, screenUV as ne, select as E, sin as D, smoothstep as O, step as k, texture as A, uniform as j, uniformArray as re, uniformTexture as M, uv as ie, varyingProperty as ae, vec2 as N, vec3 as P, vec4 as oe, wgslFn as F } from "three/tsl";
import { unzip as se } from "fflate";
//#region math.ts
function I(e, t = 0, n = 1) {
	return Math.min(n, Math.max(t, e));
}
function L(e) {
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
function ce(e) {
	let t = I(e);
	return t <= .0031308 ? t * 12.92 : 1.055 * t ** (1 / 2.4) - .055;
}
function le(e) {
	let t = e.trim().replace(/^#/, ""), n = t.length === 3 ? t.split("").map((e) => `${e}${e}`).join("") : t;
	return /^[0-9a-fA-F]{6}$/.test(n) ? [
		0,
		2,
		4
	].map((e) => L(Number.parseInt(n.slice(e, e + 2), 16) / 255)) : [
		1,
		1,
		1
	];
}
function ue(e) {
	return e.map((e) => Math.round(ce(e) * 255));
}
function de(e) {
	return e <= .25 ? ((16 * e - 12) * e + 4) * e : Math.sqrt(e);
}
function fe(e, t, n) {
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
		case "soft-light": return i <= .5 ? r - (1 - 2 * i) * r * (1 - r) : r + (2 * i - 1) * (de(r) - r);
		case "difference": return Math.abs(r - i);
		case "exclusion": return r + i - 2 * r * i;
		default: return i;
	}
}
function pe(e, t, n, r) {
	let i = I(t), a = I(r);
	return I(I(fe(e, i, n)) * a + i * (1 - a));
}
function me(e, t, n, r) {
	return [
		pe(r, e[0], t[0], n),
		pe(r, e[1], t[1], n),
		pe(r, e[2], t[2], n)
	];
}
function he(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n += 1) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return (t >>> 0).toString(36);
}
//#endregion
//#region manifest.ts
var R = { type: "box" };
function z(e) {
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
var ge = /* @__PURE__ */ new Map();
function _e(e) {
	let t = ge.get(e.type);
	ge.set(e.type, {
		...t ?? { type: e.type },
		...e
	});
}
function ve(e) {
	return ge.get(e);
}
function ye() {
	return Array.from(ge.values());
}
function be(e) {
	return ge.has(e);
}
//#endregion
//#region layer-addons/cpu-sampling.ts
var xe = Math.PI * 2;
function Se(e, t) {
	let n = (e - .5) * xe, r = (.5 - t) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function Ce(e, t) {
	let n = (e - .5) * xe, r = (t - .5) * Math.PI, i = Math.cos(r);
	return [
		i * Math.sin(n),
		Math.sin(r),
		-i * Math.cos(n)
	];
}
//#endregion
//#region image-placement-transform.ts
var we = [
	0,
	1,
	0
], Te = [
	0,
	0,
	-1
], Ee = [
	1,
	0,
	0
], De = [
	0,
	1,
	0
], Oe = 89.9;
function ke(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Ae(e) {
	return e * Math.PI / 180;
}
function je(e) {
	return e * 180 / Math.PI;
}
function Me(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Ne(e) {
	return (Math.round(e) % 360 + 360) % 360;
}
function Pe(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function Fe(e, t) {
	return [
		e[0] - t[0],
		e[1] - t[1],
		e[2] - t[2]
	];
}
function Ie(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function Le(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function Re(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function B(e, t = Te) {
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
function ze(e, t, n) {
	let r = Ae(n), i = Math.cos(r), a = Math.sin(r), o = B(t);
	return B(Le(Le(Ie(e, i), Ie(Re(o, e), a)), Ie(o, Pe(o, e) * (1 - i))), e);
}
function Be(e, t = we, n = 0) {
	let r = B(e), i = Fe(B(t, we), Ie(r, Pe(B(t, we), r)));
	if (Math.hypot(i[0], i[1], i[2]) < 1e-6) {
		let e = Math.abs(r[1]) > .98 ? [
			0,
			0,
			1
		] : we;
		i = Fe(e, Ie(r, Pe(e, r)));
	}
	return i = B(i, De), {
		tangentX: ze(B(Re(r, i), Ee), r, n),
		tangentY: ze(i, r, n)
	};
}
function Ve({ angularHeight: e, angularWidth: t, baseAngularHeight: n, baseAngularWidth: r, centerDirection: i, rotation: a = 0, upDirection: o = we }) {
	let s = B(i), c = Ne(a), { tangentX: l, tangentY: u } = Be(s, o, c), d = Math.max(1e-4, e), f = Math.max(1e-4, t);
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
function He(e) {
	let t = e, n = B(t?.centerDirection ?? t?.normal ?? t?.center, Te), r = Array.isArray(t?.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, i = typeof t?.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t?.width ?? .4) / (2 * r)), a = typeof t?.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t?.height ?? .3) / (2 * r));
	return Ve({
		angularHeight: a,
		angularWidth: i,
		baseAngularHeight: typeof t?.baseAngularHeight == "number" ? t.baseAngularHeight : a,
		baseAngularWidth: typeof t?.baseAngularWidth == "number" ? t.baseAngularWidth : i,
		centerDirection: n,
		rotation: typeof t?.rotation == "number" ? t.rotation : 0
	});
}
function Ue(e) {
	let t = B(e.centerDirection);
	return {
		x: Me(je(Math.atan2(t[0], -t[2]))),
		y: je(Math.asin(ke(t[1], -1, 1)))
	};
}
function We(e) {
	let t = Ae(e.x), n = Ae(ke(e.y, -89.9, Oe)), r = Math.cos(n);
	return B([
		Math.sin(t) * r,
		Math.sin(n),
		-Math.cos(t) * r
	]);
}
function Ge(e, t, n) {
	let r = He(e);
	return Ve({
		angularHeight: r.angularHeight,
		angularWidth: r.angularWidth,
		baseAngularHeight: r.baseAngularHeight,
		baseAngularWidth: r.baseAngularWidth,
		centerDirection: We(t),
		rotation: r.rotation,
		upDirection: n?.upDirection
	});
}
function Ke(e) {
	let t = He(e);
	return {
		x: t.angularWidth / t.baseAngularWidth,
		y: t.angularHeight / t.baseAngularHeight
	};
}
function qe(e, t) {
	let n = He(e);
	return {
		...n,
		angularHeight: Math.max(1e-4, n.baseAngularHeight * Math.max(1e-4, t.y)),
		angularWidth: Math.max(1e-4, n.baseAngularWidth * Math.max(1e-4, t.x))
	};
}
function Je(e) {
	return He(e).rotation;
}
function Ye(e, t) {
	let n = He(e);
	return Ve({
		angularHeight: n.angularHeight,
		angularWidth: n.angularWidth,
		baseAngularHeight: n.baseAngularHeight,
		baseAngularWidth: n.baseAngularWidth,
		centerDirection: n.centerDirection,
		rotation: t
	});
}
function Xe(e, t) {
	let n = He(t), r = B(e), i = Pe(r, n.centerDirection);
	if (i <= 0) return null;
	let a = Pe(r, n.tangentX) / i, o = Pe(r, n.tangentY) / i, s = Math.tan(n.angularWidth / 2), c = Math.tan(n.angularHeight / 2);
	return s <= 0 || c <= 0 || a < -s || a > s || o < -c || o > c ? null : {
		u: a / (2 * s) + .5,
		v: .5 - o / (2 * c)
	};
}
//#endregion
//#region spot-transform.ts
var Ze = Math.PI / 12;
function V(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Qe(e) {
	return e * 180 / Math.PI;
}
function $e(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function et() {
	return {
		angularRadius: Ze,
		baseAngularRadius: Ze,
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
function tt(e) {
	let t = e, n = et(), r = Math.max(1e-4, typeof t?.baseAngularRadius == "number" ? t.baseAngularRadius : n.baseAngularRadius);
	return {
		angularRadius: Math.max(1e-4, typeof t?.angularRadius == "number" ? t.angularRadius : r),
		baseAngularRadius: r,
		brightness: Math.max(0, typeof t?.brightness == "number" ? t.brightness : n.brightness),
		centerDirection: B(t?.centerDirection, n.centerDirection),
		colorMode: t?.colorMode === "gradient" ? "gradient" : "light",
		coreRadius: V(typeof t?.coreRadius == "number" ? t.coreRadius : n.coreRadius, .01, .7),
		coreSoftness: V(typeof t?.coreSoftness == "number" ? t.coreSoftness : n.coreSoftness, .4, 6),
		dispersion: V(typeof t?.dispersion == "number" ? t.dispersion : n.dispersion, 0, 1),
		dogSpread: V(typeof t?.dogSpread == "number" ? t.dogSpread : n.dogSpread, .015, .18),
		dogStrength: V(typeof t?.dogStrength == "number" ? t.dogStrength : n.dogStrength, 0, 1.8),
		dogStretch: V(typeof t?.dogStretch == "number" ? t.dogStretch : n.dogStretch, 0, .55),
		glareSize: V(typeof t?.glareSize == "number" ? t.glareSize : n.glareSize, .03, 1.1),
		glareStrength: V(typeof t?.glareStrength == "number" ? t.glareStrength : n.glareStrength, 0, 1.4),
		glow: V(typeof t?.glow == "number" ? t.glow : n.glow, 0, 1),
		glowSize: V(typeof t?.glowSize == "number" ? t.glowSize : n.glowSize, .05, 1.4),
		glowStrength: V(typeof t?.glowStrength == "number" ? t.glowStrength : n.glowStrength, 0, 1),
		halo: V(typeof t?.halo == "number" ? t.halo : n.halo, 0, 1),
		haloInnerWidth: V(typeof t?.haloInnerWidth == "number" ? t.haloInnerWidth : n.haloInnerWidth, .003, .09),
		haloOuterWidth: V(typeof t?.haloOuterWidth == "number" ? t.haloOuterWidth : n.haloOuterWidth, .01, .24),
		haloRadius: V(typeof t?.haloRadius == "number" ? t.haloRadius : n.haloRadius, .04, 1),
		haloStrength: V(typeof t?.haloStrength == "number" ? t.haloStrength : n.haloStrength, 0, 1.4),
		lightColor: typeof t?.lightColor == "string" ? t.lightColor : n.lightColor,
		stops: (t?.stops?.length ? t.stops : n.stops).map((e) => ({
			color: e.color,
			location: V(e.location, 0, 100),
			midpoint: V(e.midpoint ?? 50, 1, 99),
			opacity: V(e.opacity, 0, 100)
		}))
	};
}
function nt(e) {
	let t = B(e.centerDirection);
	return {
		x: $e(Qe(Math.atan2(t[0], -t[2]))),
		y: Qe(Math.asin(V(t[1], -1, 1)))
	};
}
function rt(e, t) {
	return {
		...tt(e),
		centerDirection: We({
			x: t.x,
			y: V(t.y, -Oe, Oe)
		})
	};
}
function it(e) {
	let t = tt(e);
	return t.angularRadius / t.baseAngularRadius;
}
function at(e, t) {
	let n = tt(e);
	return {
		...n,
		angularRadius: Math.max(1e-4, n.baseAngularRadius * Math.max(1e-4, t))
	};
}
function ot(e, t) {
	let n = tt(t), r = B(e), i = B(n.centerDirection), a = r[0] * i[0] + r[1] * i[1] + r[2] * i[2];
	return Math.acos(V(a, -1, 1)) <= n.angularRadius;
}
//#endregion
//#region starfield-static.ts
var H = Math.PI * 2, st = 8, ct = 1e3, lt = 2, ut = 128, dt = 64, ft = 4, pt = 8, mt = 12, ht = 2048 * 1024 * 1024, gt = 512 * 1024 * 1024, _t = 128 * 1024 * 1024, vt = 8, yt = 1.75, bt = 3.25, xt = 1, St = 1.5, Ct = 8, wt = 2048, Tt = 5, Et = 12, Dt = .35, Ot = .25, kt = [
	1,
	2,
	4,
	8,
	16
], At = 1024, jt = 8192, Mt = "medium", Nt = {
	high: { budgetBytes: ht },
	low: { budgetBytes: _t },
	medium: { budgetBytes: gt }
}, U = {
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
}, W = {
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
}, Pt = [
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
], G = {
	amplitude: .045,
	anchors: Pt.map((e) => ({
		color: Vt(e.color),
		...qt(e.dir)
	})),
	frequency: 2.2,
	mode: "inverse-distance",
	power: 2
}, Ft = {
	altitudeCenterDeg: 0,
	altitudeSpanDeg: 180,
	azimuthCenterDeg: 0,
	azimuthSpanDeg: 360
}, It = {
	clip: Ft,
	nebula: W,
	nebulaField: G,
	quality: Mt,
	stars: U
}, Lt = /* @__PURE__ */ new Map();
function K(e, t, n = -Infinity, r = Infinity) {
	return I(Number.isFinite(Number(e)) ? Number(e) : t, n, r);
}
function Rt(e) {
	return e === "high" ? "high" : e === "low" ? "low" : Mt;
}
function zt(e) {
	return Nt[Rt(e)];
}
function Bt(e, t) {
	return Array.isArray(e) ? [
		K(e[0], t[0], 0, 1),
		K(e[1], t[1], 0, 1),
		K(e[2], t[2], 0, 1)
	] : [...t];
}
function Vt(e) {
	return `#${e.map((e) => Math.round(I(e) * 255).toString(16).padStart(2, "0")).join("")}`;
}
function Ht(e) {
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
function Ut(e) {
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
function Wt(e, t) {
	return Ut(Array.isArray(e) ? [
		K(e[0], t[0]),
		K(e[1], t[1]),
		K(e[2], t[2])
	] : t);
}
function Gt(e, t) {
	let n = (e - .5) * H, r = I(t, 0, 1) * Math.PI, i = Math.sin(r);
	return Ut([
		i * Math.sin(n),
		Math.cos(r),
		i * Math.cos(n)
	]);
}
function Kt(e, t) {
	let n = (t % 2 + 2) % 2, r = +(n >= 1), i = e + r * .5, a = r ? 2 - n : n;
	return {
		u: i,
		v: a,
		x: i,
		y: a
	};
}
function qt(e) {
	let t = Ut(e), n = ((Math.atan2(t[0], t[2]) / H + .5) % 1 + 1) % 1, r = Math.acos(I(t[1], -1, 1)) / Math.PI;
	return {
		u: n,
		v: r,
		x: n,
		y: r
	};
}
function Jt(e = {}) {
	let t = Number(e.azimuthCenterDeg) || 0, n = K(e.azimuthSpanDeg, Ft.azimuthSpanDeg, 1, 360), r = K(e.altitudeSpanDeg, Ft.altitudeSpanDeg, 1, 180), i = Math.max(0, 90 - r * .5);
	return {
		altitudeCenterDeg: K(e.altitudeCenterDeg, Ft.altitudeCenterDeg, -i, i),
		altitudeSpanDeg: r,
		azimuthCenterDeg: t,
		azimuthSpanDeg: n
	};
}
function Yt(e) {
	let t = Jt(e), n = t.altitudeCenterDeg + t.altitudeSpanDeg * .5, r = t.altitudeCenterDeg - t.altitudeSpanDeg * .5, i = t.azimuthSpanDeg >= 359.999, a = i ? 0 : .5 + (t.azimuthCenterDeg - t.azimuthSpanDeg * .5) / 360, o = i ? 1 : t.azimuthSpanDeg / 360, s = (90 - n) / 180, c = (n - r) / 180;
	return {
		altitudeSpanRad: c * Math.PI,
		azimuthSpanRad: o * H,
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
function Xt(e, t = ut) {
	return Math.max(t, Math.ceil(Math.max(1, e) / t) * t);
}
function Zt(e, t) {
	return Math.max(1, Math.min(t, Xt(e)));
}
function Qt(e, t, n) {
	return Math.max(0, Math.round(e) * Math.round(t) * n);
}
function $t({ accumulationBytes: e, patchCount: t, residentBytesPerPixel: n = ft, storageHeight: r, storageWidth: i, supersample: a }) {
	let o = Qt(i, r, n) * t, s = Qt(i * a, r * a, e);
	return {
		peakBytes: o + s,
		residentBytes: o,
		scratchBytes: s
	};
}
function en({ accumulationBytes: e, budgetBytes: t, maxTextureSize: n, patchCount: r, residentBytesPerPixel: i = ft, storageHeight: a, storageWidth: o }) {
	let s = Math.max(1, Math.min(vt, Math.floor(n / Math.max(1, o)), Math.floor(n / Math.max(1, a))));
	for (let n = s; n >= 1; --n) {
		let s = $t({
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
	let c = $t({
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
function tn({ accumulationBytes: e, budgetBytes: t, coverage: n, grid: r, idealVirtualHeight: i, idealVirtualWidth: a, maxQualityScale: o = 1, maxTextureSize: s, residentBytesPerPixel: c = ft }) {
	let l = Yt(n), u = r === 1 ? 0 : dt, d = Math.max(1, s - u * 2), f = Math.max(1, s - u * 2), p = Math.max(1, a / r), m = Math.max(1, i / r), h = Math.min(1, Math.max(.001, o), d / p, f / m), g = r * r, _ = Math.max(.001, h), v = null;
	for (let n = 0; n < 18; n += 1) {
		let n = Zt(p * _, d), r = Zt(m * _, f), i = n + u * 2, a = r + u * 2, o = en({
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
		if (Math.abs(l - _) < .001 || n <= ut || r <= ut) break;
		_ = Math.max(.001, l);
	}
	if (!v) {
		let n = Zt(p * _, d), r = Zt(m * _, f), i = n + u * 2, a = r + u * 2;
		v = {
			allocation: en({
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
function nn(e, t, n) {
	return {
		x: e.coverageUvMin.x + t / e.columns * e.coverageUvSize.x,
		y: e.coverageUvMin.y + n / e.rows * e.coverageUvSize.y
	};
}
function rn(e) {
	return {
		x: e.coverageUvSize.x / e.columns,
		y: e.coverageUvSize.y / e.rows
	};
}
function an(e, t, n, r) {
	let i = nn(e, t, n), a = rn(e), o = Math.min(r, Math.max(1, Math.round(e.contentWidth))), s = Math.min(r, Math.max(1, Math.round(e.contentHeight))), c = Math.min(r, o + e.guard * 2), l = Math.min(r, s + e.guard * 2), u = Math.max(0, (c - o) * .5), d = Math.max(0, (l - s) * .5), f = a.x * (u / o), p = a.y * (d / s), m = e.wrapsHorizontally && e.columns === 1;
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
function on({ accumulationBytes: e = pt, budgetBytes: t = ht, clip: n, height: r, maxTextureSize: i = 4096, residentBytesPerPixel: a = mt, width: o }) {
	let s = Yt(n), c = Math.max(1, o * s.uvSize.x), l = Math.max(1, r * s.uvSize.y), u = Math.max(1, o), d = Math.max(1, r), f = (e, t) => kt.find((n) => {
		let r = Math.max(1, i - (n === 1 ? 0 : dt) * 2);
		return e / n <= r && t / n <= r;
	}) ?? kt[kt.length - 1], p = tn({
		accumulationBytes: e,
		budgetBytes: t,
		grid: f(u, d),
		idealVirtualHeight: d,
		idealVirtualWidth: u,
		maxTextureSize: i,
		residentBytesPerPixel: a
	}), m = f(c, l), h = tn({
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
	for (let e = 0; e < m; e += 1) for (let t = 0; t < m; t += 1) y.push(an(v, t, e, i));
	return {
		...v,
		descriptors: y
	};
}
function sn(e) {
	return !!(e && typeof e == "object" && "mode" in e && !("blend" in e));
}
function cn(e) {
	let t = Array.isArray(e?.anchors) && e.anchors.length ? e.anchors : Pt;
	return {
		amplitude: K(e?.warp?.amp, G.amplitude, 0, .6),
		anchors: t.slice(0, st).map((e, t) => {
			let n = Pt[t] ?? Pt[0], r = Wt(e?.dir, n.dir);
			return {
				color: Array.isArray(e?.color) ? Vt(Bt(e.color, n.color)) : typeof e?.color == "string" ? e.color : Vt(n.color),
				...qt(r)
			};
		}),
		frequency: K(e?.warp?.freq, G.frequency, .3, 4),
		mode: e?.blend === "gaussian" ? "gaussian" : "inverse-distance",
		power: K(e?.power, G.power, .4, 6)
	};
}
function ln(e) {
	if (!sn(e)) return cn(e);
	let t = Array.isArray(e.anchors) && e.anchors.length ? e.anchors : G.anchors;
	return {
		amplitude: K(e.amplitude, G.amplitude, 0, .6),
		anchors: t.slice(0, st).map((e, t) => ({
			color: typeof e?.color == "string" ? e.color : G.anchors[t]?.color ?? "#ffffff",
			x: K(e?.x, G.anchors[t]?.x ?? .5, 0, 1),
			y: K(e?.y, G.anchors[t]?.y ?? .5, 0, 1)
		})),
		frequency: K(e.frequency, G.frequency, .3, 4),
		mode: e.mode === "gaussian" ? "gaussian" : "inverse-distance",
		power: K(e.power, G.power, .4, 6)
	};
}
function un(e = {}) {
	let t = e.stars ?? U, n = e.nebula ?? W;
	return {
		clip: Jt(e.clip),
		nebula: {
			uBaseScale: K(n.uBaseScale, W.uBaseScale, .001, 100),
			uCloudCore: Bt(n.uCloudCore, W.uCloudCore),
			uCloudHighlight: Bt(n.uCloudHighlight, W.uCloudHighlight),
			uCloudShadow: Bt(n.uCloudShadow, W.uCloudShadow),
			uColorWarpAmp: K(n.uColorWarpAmp, W.uColorWarpAmp, 0, 1),
			uColorWarpFreq: K(n.uColorWarpFreq, W.uColorWarpFreq, .001, 20),
			uContrast: K(n.uContrast, W.uContrast, .05, 12),
			uCoverage: K(n.uCoverage, W.uCoverage, .02, .98),
			uDensity: K(n.uDensity, W.uDensity, 0, 10),
			uLightFocus: K(n.uLightFocus, W.uLightFocus, .001, 8),
			uLightIntensity: K(n.uLightIntensity, W.uLightIntensity, 0, 4),
			uLightLining: K(n.uLightLining, W.uLightLining, 0, 4),
			uNebulaExposure: K(n.uNebulaExposure, W.uNebulaExposure, .001, 4),
			uNebulaStrength: K(n.uNebulaStrength, W.uNebulaStrength, 0, 20),
			uOctaves: K(n.uOctaves, W.uOctaves, 1, 8),
			uOpacity: K(n.uOpacity, W.uOpacity, 0, 1),
			uSeed: K(n.uSeed, W.uSeed),
			uSoftness: K(n.uSoftness, W.uSoftness, .001, 2)
		},
		nebulaField: ln(e.nebulaField),
		quality: Rt(e.quality),
		stars: {
			uBright: K(t.uBright, U.uBright, 0, 8),
			uBrightVar: K(t.uBrightVar, U.uBrightVar, 0, 1),
			uColorVar: K(t.uColorVar, U.uColorVar, 0, 1),
			uDensity: K(t.uDensity, U.uDensity, 0, 2e3),
			uGlareSize: K(t.uGlareSize, U.uGlareSize, 0, 12),
			uGlareStr: K(t.uGlareStr, U.uGlareStr, 0, 4),
			uGlareVar: K(t.uGlareVar, U.uGlareVar, 0, 1),
			uLargeStarRarity: K(t.uLargeStarRarity, U.uLargeStarRarity, 0, 1),
			uSeed: K(t.uSeed, U.uSeed),
			uSizeVar: K(t.uSizeVar, U.uSizeVar, 0, 1),
			uStarSize: K(t.uStarSize, U.uStarSize, .01, 8)
		}
	};
}
function q(e, t, n) {
	return e + (t - e) * n;
}
function dn(e, t, n) {
	return [
		q(e[0], t[0], n),
		q(e[1], t[1], n),
		q(e[2], t[2], n)
	];
}
function J(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function Y(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function fn(e, t) {
	return [
		e[0] * t[0],
		e[1] * t[1],
		e[2] * t[2]
	];
}
function pn(e, t, n) {
	let r = I((n - e) / Math.max(t - e, 1e-5));
	return r * r * (3 - 2 * r);
}
function mn(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function hn(e) {
	return Math.max(0, 2 * (1 - I(e, -1, 1)));
}
function gn(e, t) {
	return ((e - t) % 1 + 1.5) % 1 - .5;
}
function _n(e, t, n) {
	if (t < n.uvMin.y || t > n.uvMin.y + n.uvSize.y) return !1;
	if (n.wrapsHorizontally) return !0;
	let r = n.uvMin.x + n.uvSize.x * .5;
	return Math.abs(gn(e, r)) <= n.uvSize.x * .5;
}
function vn(e, t, n) {
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
function yn(e, t) {
	let n = Yt(t), r = qt(e);
	return _n(r.u, r.v, n);
}
function bn(e) {
	return (Math.floor(e * 1000003) ^ 2654435769) >>> 0;
}
function xn(e) {
	let t = e >>> 0;
	return t = Math.imul(t ^ t >>> 16, 2146121005), t = Math.imul(t ^ t >>> 15, 2221713035), (t ^ t >>> 16) >>> 0;
}
function Sn(e, t, n, r) {
	let i = Math.imul(t + 2654435769 >>> 0, 2246822507), a = Math.imul(n + 3266489909 >>> 0, 668265263), o = Math.imul(r + 374761393 >>> 0, 2654435761);
	return xn((e ^ i ^ a ^ o) >>> 0) / 4294967296;
}
function Cn(e, t) {
	return (e % t + t) % t;
}
function wn(e) {
	return (1 - Math.cos(I(e, 0, 1) * Math.PI)) * .5;
}
function Tn(e) {
	let t = Math.max(1, Math.round(e.uDensity)), n = I(t / ct, 0, 1);
	return {
		activationThreshold: n * n,
		columns: ct,
		density: t,
		densityScale: n,
		rows: ct,
		seed: bn(e.uSeed)
	};
}
function En(e, t = 1, n = 0) {
	return I(e, 0, 1) ** Tt * (1 + (I(t, 0, 1) ** Et - 1) * I(n, 0, 1));
}
function Dn(e, t, n, r, i) {
	let a = En(e, t, n), o = r + (Math.max(r, a) - r) * Dt, s = i + (Math.max(i, a) - i) * Ot, c = o ** 3, l = s ** 8, u = I(a * .3 + c * .55 + l * .15, 0, 1);
	return u >= .78 || c > .85 && (a > .65 || l > .35) ? 3 : u >= .52 || c > .62 || l > .65 && a > .45 ? 2 : u < .16 && a < .35 && c < .08 && l < .08 ? 0 : 1;
}
function On(e, t, n, r = 0) {
	if (n < 0 || n >= e.rows) return null;
	let i = Cn(t, e.columns);
	if (Sn(e.seed, i, n, 0) >= e.activationThreshold) return null;
	let a = (i + Sn(e.seed, i, n, 1)) / e.columns, o = 1 - (n + Sn(e.seed, i, n, 2)) / e.rows * 2, s = (a - .5) * H, c = Math.sqrt(Math.max(0, 1 - o * o)), l = Sn(e.seed, i, n, 3), u = Sn(e.seed, i, n, 4), d = Sn(e.seed, i, n, 5), f = Sn(e.seed, i, n, 6), p = Sn(e.seed, i, n, 7);
	return {
		classId: Dn(l, p, r, u, d),
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
function kn(e, t, n, r) {
	if (t - e >= 1) return !0;
	let i = n / r, a = (n + 1) / r;
	for (let n = -1; n <= 1; n += 1) if (a + n >= e && i + n <= t) return !0;
	return !1;
}
function An(e, t) {
	let n = Math.PI / Math.max(1, t), r = Math.PI / wt, i = Math.max(e.uStarSize * r, yt * Math.max(n, r)), a = Math.max((e.uStarSize + e.uGlareSize) * r, bt * Math.max(n, r));
	return Math.max(i * .45, a * .36, n, r) * Ct;
}
function jn({ height: e, includeSeamCopies: t, rawVMax: n, rawVMin: r, seamCopies: i, stars: a, uMax: o, uMin: s, wrapsHorizontally: c }) {
	let l = Tn(a), u = An(a, e) / Math.PI, d = I(r, 0, 1), f = I(n, 0, 1), p = wn(d), m = wn(f), h = Math.max(0, Math.floor(p * l.rows) - lt), g = Math.min(l.rows - 1, Math.floor(m * l.rows) + lt), _ = r <= u || n >= 1 - u, v = I(a.uLargeStarRarity, 0, 1), y = JSON.stringify({
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
	}), b = Lt.get(y);
	if (b) return b.map((e) => ({ ...e }));
	let x = [];
	for (let e = h; e <= g; e += 1) for (let n = 0; n < l.columns; n += 1) {
		if (!_ && !c && !kn(s, o, n, l.columns)) continue;
		let r = On(l, n, e, v);
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
	return Lt.set(y, x.map((e) => ({ ...e }))), x;
}
function Mn(e, t, n, r = {}) {
	let i = Tn(e), a = An(e, n), o = a / Math.PI, s = t.uvMin.y - o, c = t.uvMin.y + t.uvSize.y + o, l = I(s, 0, 1), u = I(c, 0, 1), d = s <= o || c >= 1 - o, f = Math.max(Math.min(Math.sin(Math.max(l, .001) * Math.PI), Math.sin(Math.min(u, .999) * Math.PI)), .015), p = d ? 1 : Math.min(1, a / (H * f) + lt / i.columns), m = t.wrapsHorizontally ? -p : t.uvMin.x - p, h = t.wrapsHorizontally ? 1 + p : t.uvMin.x + t.uvSize.x + p;
	return jn({
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
function Nn(e, t, n, r = {}) {
	let i = Tn(e), a = An(e, n), o = a / Math.PI, s = t.storageUvMin.y - o, c = t.storageUvMin.y + t.storageUvSize.y + o, l = I(s, 0, 1), u = I(c, 0, 1), d = s <= o || c >= 1 - o, f = Math.max(Math.min(Math.sin(Math.max(l, .001) * Math.PI), Math.sin(Math.min(u, .999) * Math.PI)), .015), p = d ? 1 : Math.min(1, a / (H * f) + lt / i.columns);
	return jn({
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
function X(e) {
	return e >>> 0;
}
function Pn(e, t) {
	let n = X(e);
	return X(n << t | n >>> 32 - t);
}
function Fn(e, t, n) {
	let r = X(e), i = X(t), a = X(n);
	return a = X(a ^ i), a = X(a - Pn(i, 14)), r = X(r ^ a), r = X(r - Pn(a, 11)), i = X(i ^ r), i = X(i - Pn(r, 25)), a = X(a ^ i), a = X(a - Pn(i, 16)), r = X(r ^ a), r = X(r - Pn(a, 4)), i = X(i ^ r), i = X(i - Pn(r, 14)), a = X(a ^ i), a = X(a - Pn(i, 24)), a;
}
function In(e, t, n) {
	let r = X(3735928584);
	return Fn(X(r + X(e)), X(r + X(t)), X(r + X(n)));
}
function Ln(e) {
	return e * e * e * (e * (e * 6 - 15) + 10);
}
function Rn(e, t, n, r) {
	let i = e & 15, a = i < 8 ? t : n, o = i < 4 ? n : i === 12 || i === 14 ? t : r;
	return (i & 1 ? -a : a) + (i & 2 ? -o : o);
}
function zn(e, t, n, r, i, a, o, s, c, l, u) {
	let d = 1 - c, f = 1 - l;
	return (1 - u) * (f * (e * d + t * c) + l * (n * d + r * c)) + u * (f * (i * d + a * c) + l * (o * d + s * c));
}
function Bn(e) {
	let t = Math.floor(e[0]), n = Math.floor(e[1]), r = Math.floor(e[2]), i = e[0] - t, a = e[1] - n, o = e[2] - r, s = Ln(i), c = Ln(a), l = Ln(o);
	return zn(Rn(In(t, n, r), i, a, o), Rn(In(t + 1, n, r), i - 1, a, o), Rn(In(t, n + 1, r), i, a - 1, o), Rn(In(t + 1, n + 1, r), i - 1, a - 1, o), Rn(In(t, n, r + 1), i, a, o - 1), Rn(In(t + 1, n, r + 1), i - 1, a, o - 1), Rn(In(t, n + 1, r + 1), i, a - 1, o - 1), Rn(In(t + 1, n + 1, r + 1), i - 1, a - 1, o - 1), s, c, l) * .982;
}
function Vn(e, t, n, r) {
	let i = 0, a = .5, o = 0, s = Math.floor(I(t, 1, 8)), c = Math.max(n, .001), l = I(r, .001, .999), u = [...e];
	for (let e = 0; e < s; e += 1) {
		let e = Bn(u) * .5 + .5;
		i += a * e, o += a, u = Y(u, c), a *= l;
	}
	return o <= 0 ? 0 : i / o;
}
function Hn(e, t, n) {
	return t <= 0 ? e : Ut([
		e[0] + Math.sin((e[1] * n + .23) * H) * Math.cos((e[2] * n + .41) * H) * t,
		e[1] + Math.cos((e[2] * n + .17) * H) * Math.sin((e[0] * n + .37) * H) * t,
		e[2] + Math.sin((e[0] * n - .31) * H) * Math.cos((e[1] * n + .29) * H) * t
	]);
}
function Un(e) {
	let t = ln(e);
	return {
		anchors: t.anchors.map((e) => ({
			color: Ht(e.color),
			dir: Gt(e.x, e.y)
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
function Wn(e, t, n) {
	return 1 - pn(e, t, n);
}
function Gn(e, t) {
	let n = Un(t), r = Hn(e, n.warp.amp, n.warp.freq), i = [
		0,
		0,
		0
	], a = 0;
	return n.anchors.forEach((e) => {
		let t = 1 - I(mn(r, e.dir), -1, 1), o = n.blend === "gaussian" ? Math.exp(-(t * t) / Math.max(2 * n.sigma * n.sigma, 1e-4)) : 1 / (t + 1e-4) ** Math.max(n.power, 1e-4);
		i = J(i, Y(e.color, o)), a += o;
	}), a <= 0 ? [
		0,
		0,
		0
	] : Y(i, 1 / a);
}
function Kn(e, t) {
	let n = t.nebula, r = I(n.uOctaves, 1, 8), i = J(Y(e, Math.max(n.uColorWarpFreq, .001)), [
		n.uSeed,
		n.uSeed * .37,
		n.uSeed * -.21
	]), a = Gn(Ut(J(e, Y([
		Vn(i, r, 2.02, .52) * 2 - 1,
		Vn(J(i, [
			5.2,
			1.3,
			7.1
		]), r, 2.03, .5) * 2 - 1,
		Vn(J(i, [
			9.1,
			8.4,
			2.8
		]), r, 2.01, .51) * 2 - 1
	], Math.max(n.uColorWarpAmp, 0)))), t.nebulaField), o = [
		n.uSeed * 13.17,
		n.uSeed * -7.31,
		n.uSeed * 5.19
	], s = J(Y(e, Math.max(n.uBaseScale, .001)), o), c = I(Vn(J(s, Y([
		Vn(s, r, 2.02, .5),
		Vn(J(s, [
			5.2,
			1.3,
			2.8
		]), r, 2.02, .5),
		Vn(J(s, [
			2.1,
			4.7,
			9.2
		]), r, 2.02, .5)
	], 3)), r, 2.02, .5)), l = I(pn(n.uCoverage, n.uCoverage + Math.max(n.uSoftness, .001), c)) ** Math.max(n.uContrast, .05), u = I(Math.max(a[0], a[1], a[2]) * Math.max(n.uLightIntensity, 0)) ** Math.max(n.uLightFocus, .001), d = Y(fn(a, n.uCloudHighlight), Math.max(n.uLightIntensity, 0));
	return J([
		.004,
		.005,
		.011
	], Y(Y(J(dn(dn(n.uCloudShadow, d, u), n.uCloudCore, I(l * .4)), Y(a, u * (1 - l) * Math.max(n.uLightLining, 0) * Math.max(n.uLightIntensity, 0))), Math.max(n.uDensity, 0)).map((e) => Math.max(0, e) ** .92), I(l * n.uOpacity) * Math.max(n.uNebulaStrength, 0)));
}
function qn(e) {
	return e < .5 ? dn([
		1,
		.55,
		.3
	], [
		1,
		.96,
		.92
	], e * 2) : dn([
		1,
		.96,
		.92
	], [
		.7,
		.8,
		1
	], (e - .5) * 2);
}
function Jn(e, t, n, r, i) {
	let a = (r * t + n) * 4;
	e[a] += i[0], e[a + 1] += i[1], e[a + 2] += i[2], e[a + 3] = Math.max(e[a + 3], Math.max(i[0], i[1], i[2]));
}
function Yn(e) {
	return e < 256 ? 1 : e < 2048 ? 2 : 1;
}
function Xn(e, t, n, r, i = r) {
	let a = Yt(t.clip), o = t.stars;
	if (o.uDensity <= 0 || o.uBright <= 0) return;
	let s = Mn(o, a, i, { includeSeamCopies: !1 }), c = Math.PI / Math.max(1, i), l = Math.PI / wt, u = Math.PI / Math.max(1, r);
	s.forEach((t) => {
		let i = En(t.rSize, t.rSizeGate, o.uLargeStarRarity), s = t.rBright + (Math.max(t.rBright, i) - t.rBright) * Dt, d = t.rGlare + (Math.max(t.rGlare, i) - t.rGlare) * Ot, f = q(1, q(.1, 1, i), o.uSizeVar), p = o.uStarSize * f * l, m = o.uStarSize * f, h = Wn(xt, St, m), g = yt * Math.max(c, l), _ = Math.max(c, l * .5), v = Math.max(p, q(g, _, h)), y = Math.max(p, l * .1), b = q(1, Math.max(.08, pn(0, xt, m)), Wn(xt * .75, xt, m)), x = Math.max(y * .45, u * .5), S = Math.max(v * .45, u), C = pn(St, 1.75, m), ee = o.uGlareSize * q(1, f, o.uSizeVar) * l, w = Math.max(p + ee, bt * Math.max(c, l)), te = Math.max(p + ee, l * .1), T = Math.max(te * .36, u * .5), ne = Math.max(w * .36, u) * C * +(o.uGlareSize > 0 && o.uGlareStr > 0), E = Math.max(x, T) * Ct, D = Math.ceil(Math.max(E, S * Ct, ne * Ct) / Math.PI * r), O = t.u * n, k = t.v * r, A = o.uBright * q(1, s ** 3 * 3, o.uBrightVar), j = o.uGlareStr * q(1, d ** 8, o.uGlareVar), re = qn(q(.5, t.rColor, o.uColorVar)), M = Math.floor(O - D), ie = Math.ceil(O + D), ae = Math.max(0, Math.floor(k - D)), N = Math.min(r - 1, Math.ceil(k + D)), P = Math.max(Math.sin(t.v * Math.PI), .015);
		for (let i = ae; i <= N; i += 1) for (let o = M; o <= ie; o += 1) {
			let s = Cn(o, n), c = (s + .5) / n, l = (i + .5) / r;
			if (!_n(c, l, a)) continue;
			let u = gn(c, t.u) * H * P, d = (l - t.v) * Math.PI, f = u * u + d * d, p = (Math.exp(-f / Math.max(x * x * 2, 1e-10)) * b + Math.exp(-f / Math.max(T * T * 2, 1e-10)) * C * j) * A;
			p <= 1e-6 || Jn(e, n, s, i, Y(re, p));
		}
	});
}
function Zn(e, t, n, r) {
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
function Qn(e, t, n) {
	if (t.uDensity <= 0 || t.uBright <= 0) return [
		0,
		0,
		0
	];
	let r = qt(e), i = Tn(t), a = An(t, n), o = a / Math.PI, s = I(r.v - o, 0, 1), c = I(r.v + o, 0, 1), l = wn(s), u = wn(c), d = Math.max(0, Math.floor(l * i.rows) - lt), f = Math.min(i.rows - 1, Math.floor(u * i.rows) + lt), p = Math.max(Math.sin(I(r.v, .001, .999) * Math.PI), .015), m = Math.min(1, a / (H * p) + lt / i.columns), h = Math.floor((r.u - m) * i.columns) - lt, g = Math.ceil((r.u + m) * i.columns) + lt, _ = Math.PI / Math.max(1, n), v = Math.PI / wt, y = [
		0,
		0,
		0
	];
	for (let n = d; n <= f; n += 1) for (let r = h; r <= g; r += 1) {
		let a = On(i, r, n, t.uLargeStarRarity);
		if (!a) continue;
		let o = En(a.rSize, a.rSizeGate, t.uLargeStarRarity), s = a.rBright + (Math.max(a.rBright, o) - a.rBright) * Dt, c = a.rGlare + (Math.max(a.rGlare, o) - a.rGlare) * Ot, l = q(1, q(.1, 1, o), t.uSizeVar), u = t.uStarSize * l * v, d = t.uStarSize * l, f = Math.max(u, v * .1), p = Math.max(f * .45, _ * .5), m = q(1, Math.max(.08, pn(0, xt, d)), Wn(xt * .75, xt, d)), h = pn(St, 1.75, d), g = t.uGlareSize * q(1, l, t.uSizeVar) * v, b = Math.max(u + g, v * .1), x = Math.max(b * .36, _ * .5), S = hn(e[0] * a.x + e[1] * a.y + e[2] * a.z), C = Math.exp(-S / Math.max(p * p * 2, 1e-10)) * m, ee = t.uGlareStr * q(1, c ** 8, t.uGlareVar), w = Math.exp(-S / Math.max(x * x * 2, 1e-10)) * h * ee, te = t.uBright * q(1, s ** 3 * 3, t.uBrightVar), T = (C + w) * te;
		T <= 1e-6 || (y = J(y, Y(qn(q(.5, a.rColor, t.uColorVar)), T)));
	}
	return y;
}
function $n(e, t, n = Math.floor(jt / 2)) {
	let r = un(t);
	if (!yn(e, r.clip)) return [
		0,
		0,
		0,
		0
	];
	let i = rr(Kn(e, r), Qn(e, r.stars, n), r.nebula.uNebulaExposure);
	return [
		i[0],
		i[1],
		i[2],
		1
	];
}
function er(e, t, n = {}) {
	return $n(e, t, n.sampleHeight);
}
function tr(e, t, n, r = {}) {
	let i = un(e), a = zt(i.quality), o = Math.max(1, Math.floor(r.budgetBytes ?? a.budgetBytes)), s = Math.max(1, Math.floor(r.maxTextureSize ?? 8192)), c = on({
		accumulationBytes: r.accumulationBytes,
		budgetBytes: o,
		clip: i.clip,
		height: n,
		maxTextureSize: s,
		residentBytesPerPixel: r.residentBytesPerPixel,
		width: t
	});
	return he(JSON.stringify({
		height: n,
		layout: {
			allocation: c.allocation,
			accumulationBytes: r.accumulationBytes ?? pt,
			columns: c.columns,
			contentHeight: c.contentHeight,
			contentWidth: c.contentWidth,
			coverage: c.coverage,
			guard: c.guard,
			maxTextureSize: s,
			qualityScale: c.qualityScale,
			rows: c.rows,
			residentBytesPerPixel: r.residentBytesPerPixel ?? mt,
			storageHeight: c.storageHeight,
			storageWidth: c.storageWidth,
			supersample: c.supersample
		},
		params: i,
		width: t
	}));
}
function nr(e, t) {
	return e.map((e) => 1 - Math.exp(-Math.max(0, e) * Math.max(t, .001)));
}
function rr(e, t, n) {
	let r = nr(e, n), i = [
		.004,
		.005,
		.011
	], a = nr(i, 1), o = nr(J(i, t), 1);
	return J(r, [
		Math.max(o[0] - a[0], 0),
		Math.max(o[1] - a[1], 0),
		Math.max(o[2] - a[2], 0)
	]);
}
function ir(e, t, n, r, i, a, o, s) {
	for (let c = 0; c < o; c += 1) {
		let l = (c + .5) / o * n - .5, u = Math.floor(l), d = Math.max(0, u), f = Math.min(n - 1, u + 1), p = l - u, m = d * t * 4, h = f * t * 4;
		for (let n = 0; n < a; n += 1) {
			let o = (c * a + n) * 4, l = (n + .5) / a * t - .5, u = Math.floor(l), d = u + 1, f = l - u, g = Cn(u, t) * 4, _ = Cn(d, t) * 4, v = m + g, y = m + _, b = h + g, x = h + _, S = q(q(e[v], e[y], f), q(e[b], e[x], f), p), C = q(q(e[v + 1], e[y + 1], f), q(e[b + 1], e[x + 1], f), p), ee = q(q(e[v + 2], e[y + 2], f), q(e[b + 2], e[x + 2], f), p), w = q(q(e[v + 3], e[y + 3], f), q(e[b + 3], e[x + 3], f), p), te = Math.max(r[o], r[o + 1], r[o + 2]);
			if (w <= 0 && te <= 0) {
				i[o] = 0, i[o + 1] = 0, i[o + 2] = 0, i[o + 3] = 0;
				continue;
			}
			let [T, ne, E] = ue(rr([
				S,
				C,
				ee
			], [
				r[o],
				r[o + 1],
				r[o + 2]
			], s.nebula.uNebulaExposure));
			i[o] = T, i[o + 1] = ne, i[o + 2] = E, i[o + 3] = 255;
		}
	}
}
function ar(e, t = jt, n = Math.floor(t / 2)) {
	let r = un(e), i = zt(r.quality), a = Math.min(t, At), o = Math.max(1, Math.floor(a / 2)), s = on({
		budgetBytes: i.budgetBytes,
		clip: r.clip,
		height: o,
		maxTextureSize: jt,
		residentBytesPerPixel: ft,
		width: a
	}), c = new Float32Array(a * o * 4), l = new Uint8ClampedArray(t * n * 4), u = Yt(r.clip), d = Yn(t), f = t * d, p = n * d, m = new Float32Array(f * p * 4);
	return s.descriptors.forEach((e) => {
		let t = vn(e.uvMin.x, e.uvSize.x, a), n = Math.max(0, Math.floor(e.uvMin.y * o)), i = Math.min(o - 1, Math.ceil((e.uvMin.y + e.uvSize.y) * o));
		for (let e = n; e <= i; e += 1) {
			let n = (e + .5) / o;
			t.forEach(({ end: t, start: i }) => {
				for (let o = i; o <= t; o += 1) {
					let t = (o + .5) / a;
					if (!_n(t, n, u)) continue;
					let i = Kn(Gt(t, n), r), s = (e * a + o) * 4;
					c[s] = i[0], c[s + 1] = i[1], c[s + 2] = i[2], c[s + 3] = 1;
				}
			});
		}
	}), Xn(m, r, f, p, n), ir(c, a, o, Zn(m, f, p, d), l, t, n, r), {
		data: l,
		height: n,
		width: t
	};
}
//#endregion
//#region evaluator.ts
function or(e, t, n = {}) {
	let r = ve(t.type);
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
function sr(e, t, n = {}) {
	return t.filter((e) => e.enabled).reverse().reduce((t, r) => {
		let i = r.type === "group" ? [...sr(e, r.children, n), 1] : or(e, r, n), a = I(i[3] * (r.opacity / 100));
		return me(t, [
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
function cr(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = cr(n.children, t);
		if (e) return e;
	}
	return null;
}
function lr(e, t, n = {}) {
	let r = z(e), i = n.targetGroupId ? cr(r.nodes, n.targetGroupId) : null;
	return sr(t, n.targetGroupId ? i ? [i] : [] : r.nodes, n);
}
//#endregion
//#region bake.ts
var ur = 1024, dr = "0.1.0", fr = /* @__PURE__ */ new Map(), pr = /* @__PURE__ */ new Map();
function mr(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function hr(e, t) {
	return he(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: dr
	}));
}
function gr() {
	fr.clear(), pr.clear();
}
function _r(e, t = []) {
	return e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				_r(e.children, t);
				return;
			}
			e.type === "starfield" && t.push(e);
		}
	}), t;
}
function vr(e, t) {
	for (let n of e) {
		if (n.type !== "group") continue;
		if (n.id === t) return n;
		let e = vr(n.children, t);
		if (e) return e;
	}
	return null;
}
function yr(e, t, n, r, i) {
	let a = _r(r ? vr(e.nodes, r)?.children ?? [] : e.nodes);
	if (a.length === 0) return;
	let o = /* @__PURE__ */ new Map();
	return a.forEach((e) => {
		let r = i?.get(e.id);
		if (r) {
			o.set(e.id, r);
			return;
		}
		let a = tr(e.params, t, n), s = pr.get(a), c = s ?? ar(e.params, t, n);
		s || pr.set(a, c), o.set(e.id, c);
	}), o;
}
function br(e, t = {}) {
	let n = z(e), r = mr(t), i = r.cache ? hr(n, r) : null;
	if (i) {
		let e = fr.get(i);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: a, targetGroupId: o, width: s } = r, c = yr(n, s, a, o, t.starfieldBakes), l = new Uint8ClampedArray(s * a * 4);
	for (let e = 0; e < a; e += 1) {
		let t = (e + .5) / a;
		for (let r = 0; r < s; r += 1) {
			let [i, u, d] = ue(lr(n, Ce((r + .5) / s, t), {
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
	return i && fr.set(i, {
		...u,
		data: new Uint8ClampedArray(l)
	}), u;
}
//#endregion
//#region starfield-gpu-bake.ts
Math.PI * 2;
var xr = 8, Sr = jt / 2, Cr = 1.75, wr = 3.25, Tr = 1, Er = 1.5, Dr = 8, Or = .1, kr = 5, Ar = 12, jr = .35, Mr = .25, Nr = 1.0005, Pr = 32, Fr = new Float32Array([
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
function Ir(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function Lr(e) {
	let t = e.backend, n = t?.device, r = t?.gl;
	return typeof n?.limits?.maxTextureDimension2D == "number" ? n.limits.maxTextureDimension2D : r ? Number(r.getParameter(r.MAX_TEXTURE_SIZE)) : jt;
}
function Z(e, t) {
	let n = e[t];
	if (n?.isUniformNode) return n;
	let r = j(Number(n?.value ?? 0));
	return e[t] = r, r;
}
function Q(t, n) {
	let r = t[n], i = r?.value instanceof e.Vector2 ? r.value.clone() : new e.Vector2();
	if (r?.isUniformNode) return r;
	let a = j(i);
	return t[n] = a, a;
}
function Rr(t, n) {
	let r = t[n], i = r?.value instanceof e.Vector3 ? r.value.clone() : new e.Vector3();
	if (r?.isUniformNode) return r;
	let a = j(i);
	return t[n] = a, a;
}
function zr(e) {
	let t = e.x.sub(.5).mul(o).mul(2), n = e.y.mul(o), r = D(n);
	return w(P(r.mul(D(t)), p(n), r.mul(p(t))));
}
function Br(e) {
	let t = S(e.y, 2), n = k(1, t);
	return N(e.x.add(n.mul(.5)), x(t, g(2).sub(t), n));
}
function Vr(e) {
	return zr(Br(e));
}
function Hr(e) {
	let t = w(e);
	return N(c(t.x, t.z).div(o.mul(2)).add(.5), s(f(t.y, -1, 1)).div(o));
}
function Ur(e, t) {
	return o.mul(y(t.y, 1e-6)).div(y(e.y, 1));
}
function Wr(e, t) {
	return y(y(e.negate(), e.sub(t)), 0);
}
function Gr(e, t, n) {
	let r = e.sub(t), i = r.add(1), a = r.sub(1), o = Wr(r, n), s = Wr(i, n), c = Wr(a, n);
	return E(s.lessThan(o).and(s.lessThanEqual(c)), i, E(c.lessThan(o).and(c.lessThan(s)), a, r));
}
function Kr(e, t, n) {
	return N(Gr(e.x, t.x, n.x).div(n.x), e.y.sub(t.y).div(n.y));
}
function qr(e) {
	return k(0, e.x).mul(k(e.x, 1)).mul(k(0, e.y)).mul(k(e.y, 1));
}
function Jr(e) {
	let t = P(1, .55, .3), n = P(1, .96, .92), r = P(.7, .8, 1);
	return E(e.lessThan(.5), x(t, n, e.mul(2)), x(n, r, e.sub(.5).mul(2)));
}
function Yr(e, t, n) {
	let r = T(f(e, 0, 1), kr), i = x(1, T(f(t, 0, 1), Ar), n);
	return r.mul(i);
}
function Xr(e, t, n, r) {
	return x(1, x(Or, 1, Yr(e, t, n)), r);
}
function Zr(e, t, n, r) {
	let o = f(t, 1, 8), s = y(n, .001), c = f(r, .001, .999), l = P(e).toVar(), u = g(.5).toVar(), d = g(0).toVar(), p = g(0).toVar();
	return a(8, ({ i: e }) => {
		i(g(e).lessThan(o), () => {
			let e = ee(l, v(1), s, c).mul(.5).add(.5);
			d.addAssign(u.mul(e)), p.addAssign(u), l.mulAssign(s), u.mulAssign(c);
		});
	}), d.div(y(p, 1e-4));
}
function Qr(n, o) {
	let s = Un(n.nebulaField), c = Array.from({ length: xr }, (t, n) => {
		let r = s.anchors[n];
		return new e.Vector3(...r?.dir ?? [
			0,
			1,
			0
		]);
	}), l = Array.from({ length: xr }, (t, n) => {
		let r = s.anchors[n];
		return new e.Vector3(...r?.color ?? [
			0,
			0,
			0
		]);
	}), u = n.nebula, d = {
		uAnchorCount: { value: Math.min(s.anchors.length, xr) },
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
	}, p = Q(d, "uTileUvMin"), _ = Q(d, "uTileUvSize"), v = Z(d, "uAnchorCount"), b = Z(d, "uBlend"), S = Z(d, "uPower"), C = Z(d, "uSigma"), ee = Z(d, "uColorWarpAmp"), ne = Z(d, "uColorWarpFreq"), D = Z(d, "uSeed"), k = Z(d, "uCoverage"), A = Z(d, "uDensity"), j = Z(d, "uSoftness"), M = Z(d, "uContrast"), ie = Z(d, "uBaseScale"), ae = Z(d, "uOctaves"), N = Z(d, "uOpacity"), F = Z(d, "uLightFocus"), se = Z(d, "uLightLining"), I = Z(d, "uLightIntensity");
	Z(d, "uNebulaExposure");
	let L = Z(d, "uNebulaStrength"), ce = Rr(d, "uCloudShadow"), le = Rr(d, "uCloudHighlight"), ue = Rr(d, "uCloudCore"), de = re(c, "vec3"), fe = re(l, "vec3"), pe = new t({
		depthTest: !1,
		depthWrite: !1
	});
	return pe.uniforms = d, pe.colorNode = r(() => {
		let e = te.xy.mul(.5).add(.5), t = Vr(p.add(e.mul(_))), n = f(ae, 1, 8), r = t.mul(y(ne, .001)).add(P(D, D.mul(.37), D.mul(-.21))), o = P(Zr(r, n, 2.02, .52), Zr(r.add(P(5.2, 1.3, 7.1)), n, 2.03, .5), Zr(r.add(P(9.1, 8.4, 2.8)), n, 2.01, .51)).mul(2).sub(1), s = w(t.add(o.mul(y(ee, 0)))), c = P(0).toVar(), l = g(0).toVar();
		a(xr, ({ i: e }) => {
			i(g(e).lessThan(v), () => {
				let t = w(de.element(e)), n = fe.element(e), r = g(1).sub(m(s, t)), i = g(1).div(T(r.add(1e-4), y(S, 1e-4))), a = h(r.mul(r).negate().div(y(1e-4, g(2).mul(C).mul(C)))), o = E(b.lessThan(.5), i, a);
				c.addAssign(n.mul(o)), l.addAssign(o);
			});
		}), c.assign(c.div(y(l, 1e-4)));
		let u = P(D.mul(13.17), D.mul(-7.31), D.mul(5.19)), d = t.mul(y(ie, .001)).add(u), re = P(Zr(d, n, 2.02, .5), Zr(d.add(P(5.2, 1.3, 2.8)), n, 2.02, .5), Zr(d.add(P(2.1, 4.7, 9.2)), n, 2.02, .5)), pe = f(Zr(d.add(re.mul(3)), n, 2.02, .5), 0, 1), me = T(f(O(k, k.add(y(j, .001)), pe), 0, 1), y(M, .05)), he = T(f(y(y(c.r, c.g), c.b).mul(y(I, 0)), 0, 1), y(F, .001)), R = T(y(x(x(ce, c.mul(le).mul(y(I, 0)), he), ue, f(me.mul(.4), 0, 1)).add(c.mul(he).mul(me.oneMinus()).mul(y(se, 0)).mul(y(I, 0))).mul(y(A, 0)), P(0)), P(.92)), z = f(me.mul(N), 0, 1);
		return oe(y(P(.004, .005, .011).add(R.mul(z).mul(y(L, 0))), P(0)), 1);
	})(), pe;
}
function $r(t, n, r) {
	let i = Nn(t.stars, n, r, { includeSeamCopies: !0 }), a = [], o = [], s = [], c = [], l = [];
	i.forEach((e) => {
		a.push(e.x, e.y, e.z), o.push(e.u, e.v), s.push(e.rSize, e.rBright, e.rGlare, e.rColor), c.push(e.rSizeGate), l.push(e.classId);
	});
	let u = new e.InstancedBufferGeometry();
	return u.setAttribute("position", new e.BufferAttribute(Fr, 3)), u.setAttribute("iDirection", new e.InstancedBufferAttribute(new Float32Array(a), 3)), u.setAttribute("iUv", new e.InstancedBufferAttribute(new Float32Array(o), 2)), u.setAttribute("iRandoms", new e.InstancedBufferAttribute(new Float32Array(s), 4)), u.setAttribute("iSizeGate", new e.InstancedBufferAttribute(new Float32Array(c), 1)), u.setAttribute("iClass", new e.InstancedBufferAttribute(new Float32Array(l), 1)), u.instanceCount = l.length, u;
}
function ei(n, i, a = {}) {
	let c = n.stars, u = a.bakeWidth ?? i.storageSize.width, d = a.bakeHeight ?? i.storageSize.height, p = {
		uBakeSize: { value: new e.Vector2(u, d) },
		uBright: { value: c.uBright },
		uBrightVar: { value: c.uBrightVar },
		uColorVar: { value: c.uColorVar },
		uGlareSize: { value: c.uGlareSize },
		uGlareStr: { value: c.uGlareStr },
		uGlareVar: { value: c.uGlareVar },
		uLargeStarRarity: { value: c.uLargeStarRarity },
		uOutputSize: { value: new e.Vector2(i.storageSize.width, i.storageSize.height) },
		uDisplayPixelAngle: { value: a.displayPixelAngle ?? Math.PI / Sr },
		uScreenPixelScale: { value: a.screenPixelScale ?? 1 },
		uSizeVar: { value: c.uSizeVar },
		uStarSize: { value: c.uStarSize },
		uTileUvMin: { value: new e.Vector2(i.storageUvMin.x, i.storageUvMin.y) },
		uTileUvSize: { value: new e.Vector2(i.storageUvSize.x, i.storageUvSize.y) }
	}, _ = Q(p, "uBakeSize"), v = Q(p, "uTileUvMin"), S = Q(p, "uTileUvSize"), C = Z(p, "uDisplayPixelAngle"), ee = Z(p, "uScreenPixelScale"), ne = Z(p, "uStarSize"), E = Z(p, "uSizeVar"), A = Z(p, "uLargeStarRarity"), j = Z(p, "uBright"), re = Z(p, "uBrightVar"), M = Z(p, "uGlareSize"), ie = Z(p, "uGlareStr"), P = Z(p, "uGlareVar"), F = Z(p, "uColorVar"), se = ae("vec2", "vStarBakeUv"), I = ae("vec3", "vStarBakeDirection"), L = ae("vec4", "vStarBakeRandoms"), ce = ae("float", "vStarBakeSizeGate"), le = new t({
		blending: e.AdditiveBlending,
		depthTest: !1,
		depthWrite: !1,
		transparent: !0
	});
	return le.uniforms = p, le.vertexNode = r(() => {
		let e = l("iDirection", "vec3"), t = l("iUv", "vec2"), n = l("iRandoms", "vec4"), r = l("iSizeGate", "float"), i = Ur(_, S), a = Xr(n.x, r, A, E), s = ne.mul(a).mul(C), c = O(Tr, Er, ne.mul(a).mul(ee)).oneMinus(), u = y(y(s, x(g(Cr).mul(C), C.mul(.5), c)).mul(.45), C.mul(.5)), d = M.mul(x(1, a, E)).mul(C), f = y(y(u, y(y(s.add(d), g(wr).mul(C)).mul(.36), C.mul(.5)).mul(k(1e-6, M)).mul(k(1e-6, ie))), i).mul(Dr), p = y(D(t.y.mul(o)), .015), m = N(b(1.5, f.div(o.mul(2).mul(p))), f.div(o)), h = t.add(te.xy.mul(m)), w = h.sub(v).div(S);
		return se.assign(h), I.assign(e), L.assign(n), ce.assign(r), oe(w.mul(2).sub(1), 0, 1);
	})(), le.colorNode = r(() => {
		let e = s(f(m(Vr(se), w(I)), -1, 1)), t = Yr(L.x, ce, A), n = Xr(L.x, ce, A, E), r = ne.mul(n).mul(C), i = ne.mul(n).mul(ee), a = O(Tr * .75, Tr, i).oneMinus(), o = O(Er, 1.75, i), c = y(r, C.mul(.1)), l = x(1, y(.08, O(0, Tr, i)), a), u = y(c.mul(.45), C.mul(.5)), d = h(e.mul(e).negate().div(y(u.mul(u).mul(2), 1e-10))).mul(l), p = M.mul(x(1, n, E)).mul(C), g = y(y(r.add(p), C.mul(.1)).mul(.36), C.mul(.5)), _ = h(e.mul(e).negate().div(y(g.mul(g).mul(2), 1e-10))).mul(o).mul(k(1e-6, M)).mul(k(1e-6, ie)), v = x(L.y, y(L.y, t), E.mul(jr)), b = x(L.z, y(L.z, t), E.mul(Mr)), S = ie.mul(x(1, T(b, 8), P)), te = j.mul(x(1, T(v, 3).mul(3), re));
		return oe(Jr(x(.5, L.w, F)).mul(d.add(_.mul(S))).mul(te), 1);
	})(), le;
}
function ti(n, o, s, c, l, u) {
	let d = {
		uExposure: { value: 1 },
		uSourcePerTarget: { value: u },
		uSourceSize: { value: new e.Vector2(o, s) },
		uSourceTexture: { value: n },
		uTargetSize: { value: new e.Vector2(c, l) }
	}, p = M(n), m = Q(d, "uSourceSize"), v = Q(d, "uTargetSize"), b = Z(d, "uSourcePerTarget"), x = Z(d, "uExposure"), S = new t({
		depthTest: !1,
		depthWrite: !1
	});
	return S.uniforms = {
		...d,
		uSourceTexture: p
	}, S.colorNode = r(() => {
		let e = _(ie().mul(v)), t = _(b.add(.5)), n = oe(0).toVar(), r = g(0).toVar();
		a(8, ({ i: o }) => {
			a(8, ({ i: a }) => {
				i(g(a).lessThan(t).and(g(o).lessThan(t)), () => {
					let t = e.mul(b).add(N(g(a), g(o))).add(.5);
					n.addAssign(A(p, t.div(m))), r.addAssign(1);
				});
			});
		});
		let o = n.rgb.div(y(r, 1)), s = P(.004, .005, .011), c = P(1).sub(h(s.mul(x).negate())), l = y(P(1).sub(h(s.add(o).mul(x).negate())).sub(c), P(0));
		return oe(l, f(y(y(l.r, l.g), l.b), 0, 1));
	})(), S;
}
function ni(n, i, o, s) {
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
	}, l = M(n), u = M(i), d = Q(c, "uContentUvMin"), p = Q(c, "uContentUvSize"), m = Q(c, "uStorageUvMin"), _ = Q(c, "uStorageUvSize"), v = Z(c, "uHasLeftNeighbor"), b = Z(c, "uHasRightNeighbor"), S = Z(c, "uHasTopNeighbor"), C = Z(c, "uHasBottomNeighbor"), ee = Z(c, "uNebulaExposure"), w = new t({
		depthTest: !1,
		depthWrite: !1,
		transparent: !0
	}), T = +(o.uvSize.x >= .999), ne = .28;
	return w.blending = e.CustomBlending, w.blendEquation = e.AddEquation, w.blendSrc = e.OneFactor, w.blendDst = e.OneFactor, w.blendEquationAlpha = e.AddEquation, w.blendSrcAlpha = e.OneFactor, w.blendDstAlpha = e.OneMinusSrcAlphaFactor, c.uNebulaTexture = l, c.uStarTexture = u, w.uniforms = c, w.colorNode = r(() => {
		let e = te.xy.mul(.5).add(.5), t = N(e.x, g(1).sub(e.y)), n = y(g(1).sub(O(0, ne, t.y)), g(1).sub(O(0, ne, g(1).sub(t.y)))).mul(T), r = Kr(t, m, _), i = f(r, 0, 1), o = qr(r), s = N(Gr(t.x, d.x, p.x).div(p.x), t.y.sub(d.y).div(p.y)), c = y(_.sub(p).div(p.mul(2)), N(0)), w = y(c, N(1e-6)), D = E(v.greaterThan(.5), O(w.x.negate(), w.x, s.x), 1), k = E(b.greaterThan(.5), g(1).sub(O(g(1).sub(w.x), g(1).add(w.x), s.x)), 1), j = E(c.x.lessThanEqual(0), 1, D.mul(k)), re = E(S.greaterThan(.5), O(w.y.negate(), w.y, s.y), 1), M = E(C.greaterThan(.5), g(1).sub(O(g(1).sub(w.y), g(1).add(w.y), s.y)), 1), ie = E(c.y.lessThanEqual(0), 1, re.mul(M)), ae = f(j.mul(ie).mul(o), 0, 1), F = A(l, i).rgb, se = P(0).toVar(), I = g(0).toVar();
		a(32, ({ i: e }) => {
			let n = Kr(N(g(e).add(.5).div(32), t.y), m, _), r = f(n, 0, 1), i = qr(n);
			se.addAssign(A(l, r).rgb.mul(i)), I.addAssign(i);
		});
		let L = x(F, se.div(y(I, 1)), n), ce = A(u, i);
		return oe(P(1).sub(h(L.mul(y(ee, .001)).negate())).add(ce.rgb), 1).mul(ae);
	})(), w.name = `Starfield composite ${o.id}`, w;
}
function ri(t) {
	return fi(t).map(({ end: n, offset: r, skyV0: i, skyV1: a, start: o }) => {
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
function ii(e) {
	return Math.max(8, Math.floor(e / 2));
}
function ai(t, n) {
	let r = ii(Pr), i = n.uvMin, a = n.uvSize, o = Math.max(0, Math.min(1, i.y)), s = Math.max(0, Math.min(1, i.y + a.y)), c = Math.max(s - o, 1e-4), l = Math.max(3, Math.ceil(Pr * Math.max(a.x, .001))), u = Math.max(2, Math.ceil(r * Math.max(c, .001))), d = (i.x - .25) * Math.PI * 2, f = a.x * Math.PI * 2, p = o * Math.PI, m = c * Math.PI;
	return new e.SphereGeometry(Nr, l, u, d, f, p, m);
}
function oi(t) {
	let n = t.uvMin.x, r = t.uvMin.y, i = t.uvMin.x + t.uvSize.x, a = t.uvMin.y + t.uvSize.y, o = t.storageUvMin.x, s = t.storageUvMin.y, c = t.storageUvMin.x + t.storageUvSize.x, l = t.storageUvMin.y + t.storageUvSize.y, u = t.hasLeftNeighbor ? o : n, d = t.hasRightNeighbor ? c : i, f = t.hasTopNeighbor ? s : r, p = t.hasBottomNeighbor ? l : a;
	return {
		uvMin: new e.Vector2(u, f),
		uvSize: new e.Vector2(d - u, p - f)
	};
}
function si(n, i, a) {
	let o = M(n), s = j(new e.Vector2(i.uvMin.x, i.uvMin.y)), c = j(new e.Vector2(i.uvSize.x, i.uvSize.y)), l = j(new e.Vector2(i.storageUvMin.x, i.storageUvMin.y)), u = j(new e.Vector2(i.storageUvSize.x, i.storageUvSize.y)), d = j(Math.max(.001, a)), p = new t({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide
	});
	return p.colorNode = r(() => {
		let e = A(o, f(Kr(s.add(ie().mul(c)), l, u), 0, 1));
		return oe(P(1).sub(h(y(e.rgb, P(0)).mul(d).negate())), 1);
	})(), p.name = `Starfield live nebula patch ${i.id}`, p;
}
function ci(n, i) {
	let a = M(n), o = j(new e.Vector2(i.uvMin.x, i.uvMin.y)), s = j(new e.Vector2(i.uvSize.x, i.uvSize.y)), c = j(new e.Vector2(i.storageUvMin.x, i.storageUvMin.y)), l = j(new e.Vector2(i.storageUvSize.x, i.storageUvSize.y)), u = j(+!!i.hasLeftNeighbor), d = j(+!!i.hasRightNeighbor), p = j(+!!i.hasTopNeighbor), m = j(+!!i.hasBottomNeighbor), h = ae("vec3", `vStarfieldPatchDirection${i.x}_${i.y}`), _ = new t({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		transparent: !0
	});
	return _.blending = e.CustomBlending, _.blendEquation = e.AddEquation, _.blendSrc = e.OneFactor, _.blendDst = e.OneFactor, _.blendEquationAlpha = e.AddEquation, _.blendSrcAlpha = e.OneFactor, _.blendDstAlpha = e.OneMinusSrcAlphaFactor, _.vertexNode = r(() => (h.assign(te), C))(), _.colorNode = r(() => {
		let e = Hr(h), t = N(Gr(e.x, o.x, s.x).div(s.x), e.y.sub(o.y).div(s.y)), n = Kr(e, c, l), r = f(n, 0, 1), i = qr(n), _ = y(l.sub(s).div(s.mul(2)), N(0)), v = y(_, N(1e-6)), b = E(u.greaterThan(.5), O(v.x.negate(), v.x, t.x), 1), x = E(d.greaterThan(.5), g(1).sub(O(g(1).sub(v.x), g(1).add(v.x), t.x)), 1), S = E(_.x.lessThanEqual(0), 1, b.mul(x)), C = E(p.greaterThan(.5), O(v.y.negate(), v.y, t.y), 1), ee = E(m.greaterThan(.5), g(1).sub(O(g(1).sub(v.y), g(1).add(v.y), t.y)), 1), w = E(_.y.lessThanEqual(0), 1, C.mul(ee)), te = f(S.mul(w), 0, 1);
		return A(a, r).mul(i).mul(te);
	})(), _.name = `Starfield live stars patch ${i.id}`, _;
}
function li(t, n) {
	let r = new e.Group();
	return r.name = `Starfield live patch group ${t.key}`, t.patches.forEach((t) => {
		let i = t.descriptor, a = ai(i, {
			uvMin: i.uvMin,
			uvSize: i.uvSize
		}), o = si(t.nebulaTexture, i, n.nebula.uNebulaExposure), s = new e.Mesh(a, o);
		s.frustumCulled = !1, s.renderOrder = 0, r.add(s);
	}), t.patches.forEach((t) => {
		let n = t.descriptor, i = ai(n, oi(n)), a = ci(t.starTexture, n), o = new e.Mesh(i, a);
		o.frustumCulled = !1, o.renderOrder = .01, r.add(o);
	}), r;
}
function ui(t) {
	t.traverse((t) => {
		t instanceof e.Mesh && (t.geometry.dispose(), (Array.isArray(t.material) ? t.material : [t.material]).forEach((e) => {
			e.dispose();
		}));
	}), t.clear();
}
function di(e, t) {
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
function fi(e) {
	let t = e.hasLeftNeighbor ? e.storageUvMin.x : e.uvMin.x, n = e.hasRightNeighbor ? e.storageUvMin.x + e.storageUvSize.x : e.uvMin.x + e.uvSize.x, r = e.hasTopNeighbor ? e.storageUvMin.y : e.uvMin.y, i = e.hasBottomNeighbor ? e.storageUvMin.y + e.storageUvSize.y : e.uvMin.y + e.uvSize.y, a = Math.max(0, r), o = Math.min(1, i);
	return o <= a ? [] : di(t, n - t).map((e) => ({
		...e,
		skyV0: a,
		skyV1: o
	}));
}
function pi(t) {
	return t === "repeat" ? e.RepeatWrapping : e.ClampToEdgeWrapping;
}
function mi(t, n, r, i = {}) {
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
function hi(e) {
	e.dispose();
}
function gi(e) {
	return Math.max(1, Math.floor(e ?? 8192));
}
function _i(e, t) {
	return Math.max(1, Math.min(e, t));
}
var vi = class {
	#e = /* @__PURE__ */ new Map();
	#t = /* @__PURE__ */ new Map();
	#n;
	#r;
	#i = new e.Scene();
	#a = new e.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#o = new e.PlaneGeometry(2, 2);
	constructor(e) {
		this.#r = e, this.#n = Lr(e);
	}
	createBakeKey(e, t) {
		let n = un(e), r = zt(n.quality), i = gi(t);
		return tr(n, i, Math.floor(i / 2), {
			budgetBytes: r.budgetBytes,
			maxTextureSize: this.#n
		});
	}
	previewWidthFor(e) {
		return Math.max(1, Math.min(jt, this.#n));
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
		return Ir(this.#r);
	}
	dispose() {
		this.#e.forEach((e) => e.target.dispose()), this.#e.clear(), this.#t.forEach((e) => {
			e.targets.forEach((e) => e.dispose());
		}), this.#t.clear(), this.#o.dispose();
	}
	#s(t, n, r) {
		let i = un(t), a = zt(i.quality), o = gi(r), s = Math.floor(o / 2), c = n ?? this.createBakeKey(i, o), l = this.#t.get(c);
		if (l) return l;
		let u = on({
			budgetBytes: a.budgetBytes,
			clip: i.clip,
			height: s,
			maxTextureSize: this.#n,
			width: o
		}), d = this.#r.getRenderTarget(), f = this.#r.autoClear, p = Object.assign(new e.Color(), { a: 1 }), m = this.#r.getClearAlpha(), h = [], g = [];
		this.#r.getClearColor(p), this.#r.autoClear = !0, this.#r.setClearColor(0, 0), u.descriptors.forEach((t) => {
			let n = mi(t.storageSize.width, t.storageSize.height, `GPU baked starfield nebula ${t.id}`, {
				colorSpace: e.LinearSRGBColorSpace,
				type: e.HalfFloatType,
				wrapS: pi(t.wrapS),
				wrapT: pi(t.wrapT)
			}), r = mi(t.storageSize.width, t.storageSize.height, `GPU baked starfield stars ${t.id}`, {
				colorSpace: e.SRGBColorSpace,
				type: e.UnsignedByteType,
				wrapS: pi(t.wrapS),
				wrapT: pi(t.wrapT)
			});
			this.#l(Qr(i, t), n), this.#u(i, t, r, s, u.supersample), h.push(n, r), g.push({
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
		let i = un(t), a = zt(i.quality), o = gi(r), s = Math.floor(o / 2), c = _i(o, this.#n), l = Math.floor(c / 2), u = n ?? this.createBakeKey(i, o), d = this.#e.get(u);
		if (d && d.target.width === c && d.target.height === l) return d;
		let f = mi(c, l, "GPU baked starfield layer", {
			colorSpace: e.SRGBColorSpace,
			type: e.UnsignedByteType,
			wrapS: e.RepeatWrapping,
			wrapT: e.ClampToEdgeWrapping
		}), p = on({
			budgetBytes: a.budgetBytes,
			clip: i.clip,
			height: s,
			maxTextureSize: this.#n,
			width: o
		}), m = this.#r.getRenderTarget(), h = this.#r.autoClear, g = Object.assign(new e.Color(), { a: 1 }), _ = this.#r.getClearAlpha();
		return this.#r.getClearColor(g), this.#r.autoClear = !0, this.#r.setClearColor(0, 0), this.#r.setRenderTarget(f), this.#r.clear(), p.descriptors.forEach((t) => {
			let n = mi(t.storageSize.width, t.storageSize.height, `GPU baked starfield nebula ${t.id}`, {
				colorSpace: e.LinearSRGBColorSpace,
				type: e.HalfFloatType,
				wrapS: pi(t.wrapS),
				wrapT: pi(t.wrapT)
			}), r = mi(t.storageSize.width, t.storageSize.height, `GPU baked starfield stars ${t.id}`, {
				colorSpace: e.SRGBColorSpace,
				type: e.UnsignedByteType,
				wrapS: pi(t.wrapS),
				wrapT: pi(t.wrapT)
			});
			this.#l(Qr(i, t), n), this.#u(i, t, r, s, p.supersample), this.#d(i, t, n.texture, r.texture, f), n.dispose(), r.dispose();
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
		r.frustumCulled = !1, this.#i.clear(), this.#i.add(r), this.#r.setRenderTarget(n), this.#r.clear(), this.#r.render(this.#i, this.#a), this.#i.remove(r), hi(t);
	}
	#u(t, n, r, i, a) {
		let o = $r(t, n, i), s = Math.max(1, Math.floor(a)), c = n.storageSize.width * s, l = n.storageSize.height * s, u = c / n.storageSize.width, d = ei(t, n, {
			bakeHeight: l,
			bakeWidth: c,
			displayPixelAngle: Math.PI / Sr,
			screenPixelScale: i / Sr
		}), f = new e.Mesh(o, d), p = mi(c, l, `GPU baked starfield stars accumulation ${n.id}`, {
			colorSpace: e.LinearSRGBColorSpace,
			type: e.HalfFloatType,
			wrapS: e.ClampToEdgeWrapping
		});
		f.frustumCulled = !1, this.#i.clear(), this.#i.add(f), this.#r.setRenderTarget(p), this.#r.clear(), this.#r.render(this.#i, this.#a), this.#i.remove(f), o.dispose(), hi(d), this.#l(ti(p.texture, c, l, n.storageSize.width, n.storageSize.height, u), r), p.dispose();
	}
	#d(t, n, r, i, a) {
		let o = ni(r, i, n, t), s = ri(n);
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
		}), this.#i.clear(), hi(o);
	}
};
function yi(e) {
	return Ir(e) ? new vi(e) : null;
}
//#endregion
//#region layer-addons/built-ins.ts
function bi(e) {
	return e;
}
//#endregion
//#region layer-addons/shader-codegen.ts
function $(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function xi(e, t) {
	return t === "wgsl" ? `vec3<f32>(${$(e)})` : `vec3(${$(e)})`;
}
function Si(e, t, n, r) {
	return r === "wgsl" ? `var ${e}: ${t} = ${n};` : `${t} ${e} = ${n};`;
}
function Ci(e, t, n, r) {
	return r === "wgsl" ? `select(${n}, ${t}, ${e})` : `((${e}) ? ${t} : ${n})`;
}
function wi(e) {
	return `effectColor = ${e === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
//#endregion
//#region Skybox.ts
var Ti = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: R,
	nodes: [],
	version: 2
}, Ei = .18, Di = .75, Oi = 1.75, ki = 1e-4, Ai = .01, ji = {
	hoveredLayerId: null,
	selectedLayerId: null
}, Mi = new e.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, e.RGBAFormat);
Mi.colorSpace = e.SRGBColorSpace, Mi.needsUpdate = !0;
function Ni(e, t) {
	return +(t === e);
}
function Pi(e, t) {
	return +(t === e);
}
function Fi(e, t) {
	return Math.max(Ni(e, t.hoveredLayerId), Pi(e, t.selectedLayerId));
}
function Ii(e, t) {
	return e.map((e) => ({
		active: j(Fi(e.layer.id, t)),
		layerId: e.layer.id
	}));
}
function Li(e, t) {
	e.forEach((e) => {
		e.active.value = Fi(e.layerId, t);
	});
}
function Ri(e, t) {
	return Object.fromEntries(e.map((e) => [`imageActive${e.index}`, { value: Fi(e.layer.id, t) }]));
}
function zi(e, t) {
	return Object.fromEntries(e.map((e) => [`spotActive${e.index}`, { value: Fi(e.layer.id, t) }]));
}
function Bi(e, t, n, r) {
	t.forEach((t) => {
		let n = `imageActive${t.index}`;
		e.uniforms[n] && (e.uniforms[n].value = Fi(t.layer.id, r));
	}), n.forEach((t) => {
		let n = `spotActive${t.index}`;
		e.uniforms[n] && (e.uniforms[n].value = Fi(t.layer.id, r));
	});
}
function Vi(e, t) {
	e.userData.applyEditorLayerState = t;
}
function Hi(t) {
	if (!t) return {
		centerDirection: new e.Vector3(0, 0, -1),
		halfSize: new e.Vector2(0, 0),
		tangentX: new e.Vector3(1, 0, 0),
		tangentY: new e.Vector3(0, 1, 0)
	};
	let n = He(t);
	return {
		centerDirection: new e.Vector3(...n.centerDirection),
		halfSize: new e.Vector2(Math.max(0, Math.tan(n.angularWidth / 2)), Math.max(0, Math.tan(n.angularHeight / 2))),
		tangentX: new e.Vector3(...n.tangentX),
		tangentY: new e.Vector3(...n.tangentY)
	};
}
function Ui(e) {
	return e.map((e) => {
		let t = Hi(e.layer.params.placement);
		return {
			centerDirection: j(t.centerDirection),
			halfSize: j(t.halfSize),
			layerId: e.layer.id,
			tangentX: j(t.tangentX),
			tangentY: j(t.tangentY)
		};
	});
}
function Wi(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = Hi(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function Gi(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = Hi(e.layer.params.placement);
		return [
			[`imageCenterDirection${e.index}`, { value: t.centerDirection }],
			[`imageTangentX${e.index}`, { value: t.tangentX }],
			[`imageTangentY${e.index}`, { value: t.tangentY }],
			[`imageHalfSize${e.index}`, { value: t.halfSize }]
		];
	}));
}
function Ki(e, t, n, r) {
	let i = t.find((e) => e.layer.id === n);
	if (!i) return;
	let a = Hi(r);
	e.uniforms[`imageCenterDirection${i.index}`]?.value.copy(a.centerDirection), e.uniforms[`imageTangentX${i.index}`]?.value.copy(a.tangentX), e.uniforms[`imageTangentY${i.index}`]?.value.copy(a.tangentY), e.uniforms[`imageHalfSize${i.index}`]?.value.copy(a.halfSize);
}
function qi(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function Ji(t) {
	let n = t * Math.PI / 180;
	return new e.Vector3(Math.sin(n), Math.cos(n), 0).normalize();
}
function Yi(e) {
	return [...e.stops].map((e) => ({
		color: e.color,
		midpoint: I((e.midpoint ?? 50) / 100, .01, .99),
		opacity: I(e.opacity / 100),
		t: I(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function Xi(t) {
	let [n, r, i] = le(t.color);
	return new e.Vector4(n, r, i, t.opacity);
}
function Zi(e) {
	return +(e === "gaussian");
}
function Qi(e) {
	return +(e === "gradient");
}
function $i(e) {
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
function ea(e) {
	return {
		blendMode: $i(e.blendMode),
		opacity: I(e.opacity / 100)
	};
}
function ta(t, n) {
	let r = (I(t) - .5) * Math.PI * 2, i = (.5 - I(n)) * Math.PI, a = Math.cos(i);
	return new e.Vector3(a * Math.cos(r), Math.sin(i), a * Math.sin(r)).normalize();
}
function na(t) {
	let [n, r, i] = le(t);
	return new e.Vector3(n, r, i);
}
function ra(e) {
	return e.map((e) => {
		let t = Yi(e.layer.params);
		return {
			axis: j(Ji(e.layer.params.rotation)),
			layerId: e.layer.id,
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: j(Xi(r)),
					midpoint: j(r.midpoint),
					t: j(r.t)
				};
			})
		};
	});
}
function ia(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = Yi(t.params);
	n.axis.value.copy(Ji(t.params.rotation)), n.stops.forEach((e, t) => {
		let n = r[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(Xi(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function aa(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = Yi(e.layer.params);
		return [[`${e.parameterPrefix}Axis`, { value: Ji(e.layer.params.rotation) }], ...Array.from({ length: e.stopCount }, (n, r) => {
			let i = t[r] ?? {
				color: "#000000",
				midpoint: .5,
				opacity: 0,
				t: 0
			};
			return [
				[`${e.parameterPrefix}StopColor${r}`, { value: Xi(i) }],
				[`${e.parameterPrefix}StopMidpoint${r}`, { value: i.midpoint }],
				[`${e.parameterPrefix}StopT${r}`, { value: i.t }]
			];
		}).flat()];
	}));
}
function oa(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	if (!r) return;
	let i = Yi(t.params);
	e.uniforms[`${r.parameterPrefix}Axis`]?.value.copy(Ji(t.params.rotation)), Array.from({ length: r.stopCount }, (t, n) => {
		let a = i[n] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.uniforms[`${r.parameterPrefix}StopColor${n}`]?.value.copy(Xi(a)), e.uniforms[`${r.parameterPrefix}StopT${n}`] && (e.uniforms[`${r.parameterPrefix}StopT${n}`].value = a.t), e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`] && (e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`].value = a.midpoint);
	});
}
function sa(e) {
	return e.map((e) => ({
		amplitude: j(I(e.layer.params.amplitude, 0, .6)),
		anchors: Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return {
				color: j(na(r.color)),
				direction: j(ta(r.x, r.y))
			};
		}),
		frequency: j(Math.max(1e-4, e.layer.params.frequency)),
		layerId: e.layer.id,
		mode: j(Zi(e.layer.params.mode)),
		power: j(Math.max(1e-4, e.layer.params.power))
	}));
}
function ca(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n && (n.amplitude.value = I(t.params.amplitude, 0, .6), n.frequency.value = Math.max(1e-4, t.params.frequency), n.mode.value = Zi(t.params.mode), n.power.value = Math.max(1e-4, t.params.power), n.anchors.forEach((e, n) => {
		let r = t.params.anchors[n] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.color.value.copy(na(r.color)), e.direction.value.copy(ta(r.x, r.y));
	}));
}
function la(e) {
	return Object.fromEntries(e.flatMap((e) => [
		[`${e.parameterPrefix}Amplitude`, { value: I(e.layer.params.amplitude, 0, .6) }],
		[`${e.parameterPrefix}Frequency`, { value: Math.max(1e-4, e.layer.params.frequency) }],
		[`${e.parameterPrefix}Mode`, { value: Zi(e.layer.params.mode) }],
		[`${e.parameterPrefix}Power`, { value: Math.max(1e-4, e.layer.params.power) }],
		...Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return [[`${e.parameterPrefix}AnchorDirection${n}`, { value: ta(r.x, r.y) }], [`${e.parameterPrefix}AnchorColor${n}`, { value: na(r.color) }]];
		}).flat()
	]));
}
function ua(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	r && (e.uniforms[`${r.parameterPrefix}Amplitude`] && (e.uniforms[`${r.parameterPrefix}Amplitude`].value = I(t.params.amplitude, 0, .6)), e.uniforms[`${r.parameterPrefix}Frequency`] && (e.uniforms[`${r.parameterPrefix}Frequency`].value = Math.max(1e-4, t.params.frequency)), e.uniforms[`${r.parameterPrefix}Mode`] && (e.uniforms[`${r.parameterPrefix}Mode`].value = Zi(t.params.mode)), e.uniforms[`${r.parameterPrefix}Power`] && (e.uniforms[`${r.parameterPrefix}Power`].value = Math.max(1e-4, t.params.power)), Array.from({ length: r.anchorCount }, (n, i) => {
		let a = t.params.anchors[i] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.uniforms[`${r.parameterPrefix}AnchorDirection${i}`]?.value.copy(ta(a.x, a.y)), e.uniforms[`${r.parameterPrefix}AnchorColor${i}`]?.value.copy(na(a.color));
	}));
}
function da(t) {
	let n = tt(t);
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
		lightColor: na(n.lightColor),
		mode: Qi(n.colorMode),
		radius: Math.max(1e-4, n.angularRadius),
		stops: Yi(n)
	};
}
function fa(e) {
	return e.map((e) => {
		let t = da(e.layer.params);
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
					color: j(Xi(r)),
					midpoint: j(r.midpoint),
					t: j(r.t)
				};
			})
		};
	});
}
function pa(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = da(t.params);
	n.brightness.value = r.brightness, n.centerDirection.value.copy(r.centerDirection), n.coreRadius.value = r.coreRadius, n.coreSoftness.value = r.coreSoftness, n.dispersion.value = r.dispersion, n.dogSpread.value = r.dogSpread, n.dogStrength.value = r.dogStrength, n.dogStretch.value = r.dogStretch, n.glareSize.value = r.glareSize, n.glareStrength.value = r.glareStrength, n.glowSize.value = r.glowSize, n.glowStrength.value = r.glowStrength, n.haloInnerWidth.value = r.haloInnerWidth, n.haloOuterWidth.value = r.haloOuterWidth, n.haloRadius.value = r.haloRadius, n.haloStrength.value = r.haloStrength, n.lightColor.value.copy(r.lightColor), n.mode.value = r.mode, n.radius.value = r.radius, n.stops.forEach((e, t) => {
		let n = r.stops[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(Xi(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function ma(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = da(e.layer.params);
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
					[`${e.parameterPrefix}StopColor${r}`, { value: Xi(i) }],
					[`${e.parameterPrefix}StopMidpoint${r}`, { value: i.midpoint }],
					[`${e.parameterPrefix}StopT${r}`, { value: i.t }]
				];
			}).flat()
		];
	}));
}
function ha(e, t, n) {
	let r = n.find((e) => e.layer.id === t.id);
	if (!r) return;
	let i = da(t.params);
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
		e.uniforms[`${r.parameterPrefix}StopColor${n}`]?.value.copy(Xi(a)), e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`] && (e.uniforms[`${r.parameterPrefix}StopMidpoint${n}`].value = a.midpoint), e.uniforms[`${r.parameterPrefix}StopT${n}`] && (e.uniforms[`${r.parameterPrefix}StopT${n}`].value = a.t);
	});
}
function ga(e) {
	return e.map((e) => {
		let t = ea(e.node);
		return {
			blendMode: j(t.blendMode),
			nodeId: e.node.id,
			opacity: j(t.opacity)
		};
	});
}
function _a(e, t) {
	for (let n of e) if (n.enabled) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = _a(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
function va(e, t) {
	e.forEach((e) => {
		let n = _a(t.nodes, e.nodeId);
		if (!n) return;
		let r = ea(n);
		e.opacity.value = r.opacity, e.blendMode.value = r.blendMode;
	});
}
function ya(e, t) {
	let n = e.find((e) => e.nodeId === t.id);
	if (!n) return;
	let r = ea(t);
	n.opacity.value = r.opacity, n.blendMode.value = r.blendMode;
}
function ba(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = ea(e.node);
		return [[`${e.parameterPrefix}Opacity`, { value: t.opacity }], [`${e.parameterPrefix}BlendMode`, { value: t.blendMode }]];
	}));
}
function xa(e, t, n) {
	t.forEach((t) => {
		let r = _a(n.nodes, t.node.id);
		if (!r) return;
		let i = ea(r), a = e.uniforms[`${t.parameterPrefix}Opacity`], o = e.uniforms[`${t.parameterPrefix}BlendMode`];
		a && (a.value = i.opacity), o && (o.value = i.blendMode);
	});
}
function Sa(e, t, n) {
	let r = t.find((e) => e.node.id === n.id);
	if (!r) return;
	let i = ea(n), a = e.uniforms[`${r.parameterPrefix}Opacity`], o = e.uniforms[`${r.parameterPrefix}BlendMode`];
	a && (a.value = i.opacity), o && (o.value = i.blendMode);
}
function Ca(e, t) {
	e.userData.applyGradientLayerParams = t;
}
function wa(e, t) {
	e.userData.applyGradientLayerParam = t;
}
function Ta(e, t) {
	e.userData.applyFieldGradientLayerParams = t;
}
function Ea(e, t) {
	e.userData.applyFieldGradientLayerParam = t;
}
function Da(e, t) {
	e.userData.applySpotLayerParams = t;
}
function Oa(e, t) {
	e.userData.applySpotLayerParam = t;
}
function ka(e, t) {
	e.userData.applyCompositionParams = t;
}
function Aa(e, t) {
	e.userData.applyLayerComposition = t;
}
function ja(e) {
	return e ?? R;
}
function Ma(t = R) {
	return ja(t).type === "sphere" ? new e.SphereGeometry(1, 64, 32) : new e.BoxGeometry(1, 1, 1);
}
function Na(t = 1, n = 25, r = 25) {
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
function Pa(t = R) {
	if (ja(t).type === "sphere") return Na();
	let n = new e.BoxGeometry(1, 1, 1), r = new e.EdgesGeometry(n);
	return n.dispose(), r;
}
function Fa(e) {
	return e.filter((e) => e.enabled).reverse();
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
function La(e) {
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
function Ra(e) {
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
function za(e) {
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
function Ba(e) {
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
function Va(e) {
	let t = [];
	function n(e) {
		Fa(e).forEach((e) => {
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
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Ka(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function qa(e) {
	return new Map(e.map((e) => [e.node.id, e]));
}
function Ja(e, t, n) {
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
      ${o} imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${$(Ai)});
      ${o} imageHardInside = step(${$(ki)}, imageDenom) *
        step(0.0, ${n.halfSize}.x) *
        step(0.0, ${n.halfSize}.y);
      ${o} imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      ${s} imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return ${a}(imageU, imageV, imageValid, 0.0);
    `;
}
function Ya(e, t, n) {
	let r = t.get(e.id);
	return r ? n === "wgsl" ? `effectColor = ${r.parameterName};` : `{
    vec4 imageSampleInfo = skyboxStudioImageSampleInfo${r.index}(direction);
    vec4 imageSampleColor = texture2D(imageTexture${r.index}, imageSampleInfo.xy);
    effectColor = vec4(imageSampleColor.rgb, imageSampleColor.a * imageSampleInfo.z);
  }` : `effectColor = ${n === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function Xa(e, t, n) {
	let r = t.get(e.id);
	return r ? n === "wgsl" ? `effectColor = ${r.parameterName};` : `effectColor = texture2D(starfieldTexture${r.index}, directionToSourceStarfieldUv(direction));` : `effectColor = ${n === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function Za() {
	return "\n      const float SKYBOX_STUDIO_PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.x, -normalizedDirection.z);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * SKYBOX_STUDIO_PI) + 0.5, latitude / SKYBOX_STUDIO_PI + 0.5);\n      }\n\n      vec2 directionToSourceStarfieldUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float theta = atan(normalizedDirection.x, normalizedDirection.z);\n        float u = fract(theta / (2.0 * SKYBOX_STUDIO_PI) + 0.5);\n        float v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / SKYBOX_STUDIO_PI;\n\n        return vec2(u, v);\n      }\n    ";
}
function Qa(e) {
	return F(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${Ja(e, "wgsl", {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var $a = F("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n"), eo = F(`
  fn skyboxStudioApplyImageEditorRectOverlay(
    color: vec4<f32>,
    uv: vec2<f32>,
    valid: f32,
    activeValue: f32
  ) -> vec4<f32> {
    let activeAmount = clamp(activeValue, 0.0, 1.0);
    let rectCoverage = valid * activeAmount;
    let edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${$(Ai)});
    let bounds = rectCoverage * (
      1.0 - smoothstep(
        edgeWidth * ${$(Di)},
        edgeWidth * ${$(Oi)},
        edgeDistance
      )
    );
    let rectAlpha = rectCoverage * ${$(Ei)};
    let overlayAlpha = max(rectAlpha, bounds);
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), overlayAlpha),
      color.a
    );
  }
`), to = F(`
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
    let spotEdgeWidth = clamp(fwidth(spotEdgeDistance), 0.000001, ${$(Ai)});
    let spotValid = step(${$(ki)}, spotDenom) *
      step(-spotEdgeWidth, spotEdgeDistance) *
      smoothstep(-spotEdgeWidth, spotEdgeWidth, spotEdgeDistance);

    return vec4<f32>(spotU, spotV, spotValid, 0.0);
  }
`);
function no(e) {
	return e.map((e) => `
        vec4 skyboxStudioImageSampleInfo${e.index}(vec3 direction) {
          ${Ja(e, "glsl", {
		centerDirection: `imageCenterDirection${e.index}`,
		halfSize: `imageHalfSize${e.index}`,
		tangentX: `imageTangentX${e.index}`,
		tangentY: `imageTangentY${e.index}`
	})}
        }
      `).join("\n");
}
function ro(e) {
	return e.map((e) => `
        {
          vec4 imageEditorInfo = skyboxStudioImageSampleInfo${e.index}(direction);
          float activeAmount = clamp(imageActive${e.index}, 0.0, 1.0);
          float rectCoverage = imageEditorInfo.z * activeAmount;
          float edgeDistance = min(min(imageEditorInfo.x, 1.0 - imageEditorInfo.x), min(imageEditorInfo.y, 1.0 - imageEditorInfo.y));
          float edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${$(Ai)});
          float bounds = rectCoverage * (
            1.0 - smoothstep(
              edgeWidth * ${$(Di)},
              edgeWidth * ${$(Oi)},
              edgeDistance
            )
          );
          float rectAlpha = rectCoverage * ${$(Ei)};
          float overlayAlpha = max(rectAlpha, bounds);
          composedColor = mix(composedColor, vec3(1.0, 0.0, 0.0), overlayAlpha);
        }
      `).join("\n");
}
function io(e) {
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
          float edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${$(Ai)});
          float rectCoverage = step(${$(ki)}, spotEditorDenom) *
            step(-edgeWidth, edgeDistance) *
            smoothstep(-edgeWidth, edgeWidth, edgeDistance) *
            activeAmount;
          float bounds = rectCoverage * (
            1.0 - smoothstep(
              edgeWidth * ${$(Di)},
              edgeWidth * ${$(Oi)},
              edgeDistance
            )
          );
          float rectAlpha = rectCoverage * ${$(Ei)};
          float overlayAlpha = max(rectAlpha, bounds);
          composedColor = mix(composedColor, vec3(1.0, 0.0, 0.0), overlayAlpha);
        }
      `).join("\n");
}
function ao(e) {
	return e.map((e) => `uniform vec3 ${e.parameterPrefix}Axis;
      ${Array.from({ length: e.stopCount }, (t, n) => `uniform vec4 ${e.parameterPrefix}StopColor${n};
      uniform float ${e.parameterPrefix}StopMidpoint${n};
      uniform float ${e.parameterPrefix}StopT${n};`).join("\n")}`).join("\n");
}
function oo(e) {
	return e.map((e) => `uniform float ${e.parameterPrefix}Amplitude;
      uniform float ${e.parameterPrefix}Frequency;
      uniform float ${e.parameterPrefix}Mode;
      uniform float ${e.parameterPrefix}Power;
      ${Array.from({ length: e.anchorCount }, (t, n) => `uniform vec3 ${e.parameterPrefix}AnchorDirection${n};
      uniform vec3 ${e.parameterPrefix}AnchorColor${n};`).join("\n")}`).join("\n");
}
function so(e, t) {
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
function co(e, t) {
	return e.map((e) => `uniform sampler2D imageTexture${e.index};
      uniform vec3 imageCenterDirection${e.index};
      uniform vec3 imageTangentX${e.index};
      uniform vec3 imageTangentY${e.index};
      uniform vec2 imageHalfSize${e.index};${t ? `
      uniform float imageActive${e.index};` : ""}`).join("\n");
}
function lo(e) {
	return e.map((e) => `uniform sampler2D starfieldTexture${e.index};`).join("\n");
}
function uo(e, t) {
	return e.get(t.id) ?? Mi;
}
function fo(e, t) {
	return Object.fromEntries(e.map((e) => [`imageTexture${e.index}`, { value: uo(t, e.layer) }]));
}
function po(e, t, n) {
	t.forEach((t) => {
		let r = `imageTexture${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = uo(n, t.layer));
	});
}
function mo(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? Mi;
	});
}
function ho(e) {
	e.userData.starfieldRenderTarget || e.dispose();
}
function go(e, t) {
	return e.get(t.id) ?? Mi;
}
function _o(e, t) {
	return Object.fromEntries(e.map((e) => [`starfieldTexture${e.index}`, { value: go(t, e.layer) }]));
}
function vo(e, t, n) {
	t.forEach((t) => {
		let r = `starfieldTexture${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = go(n, t.layer));
	});
}
function yo(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? Mi;
	});
}
function bo(e, t) {
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
function xo(e, t) {
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
    ${Si("fieldDirection", r, "direction", t)}
    ${i} warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      ${i} warpX = sin((direction.y * warpFrequency + 0.23) * ${$(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${$(Math.PI * 2)});
      ${i} warpY = cos((direction.z * warpFrequency + 0.17) * ${$(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${$(Math.PI * 2)});
      ${i} warpZ = sin((direction.x * warpFrequency - 0.31) * ${$(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${$(Math.PI * 2)});
      fieldDirection = normalize(direction + ${r}(warpX, warpY, warpZ) * warpScale);
    }
    ${Si("weightedColor", r, `${r}(0.0)`, t)}
    ${Si("weightSum", t === "wgsl" ? "f32" : "float", "0.0", t)}
    ${a}
    if (weightSum > 0.0) {
      effectColor = ${n}(weightedColor / weightSum, 1.0);
    } else {
      effectColor = ${n}(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
function So(e, t) {
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
function Co(e, t) {
	let n = t === "wgsl" ? "vec4<f32>" : "vec4", r = t === "wgsl" ? "vec3<f32>" : "vec3", i = t === "wgsl" ? "let" : "float", a = `${e.parameterPrefix}Mode > 0.5`, o = So(e, t);
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
      ${Si("spotColor", r, `${e.parameterPrefix}LightColor * spotMonoLight + ${r}(max(spotMonoLight - 1.0, 0.0))`, t)}

      ${i} spotHaloInner = max(${e.parameterPrefix}HaloInnerWidth, 0.0001);
      ${i} spotHaloOuter = max(${e.parameterPrefix}HaloOuterWidth, 0.0001);
      ${i} spotHaloDelta = spotD - ${e.parameterPrefix}HaloRadius;
      ${i} spotHaloWidth = ${t === "wgsl" ? "select(spotHaloOuter, spotHaloInner, spotHaloDelta < 0.0)" : "(spotHaloDelta < 0.0 ? spotHaloInner : spotHaloOuter)"};
      ${i} spotHaloEnvelope = exp(-pow(spotHaloDelta / spotHaloWidth, 2.0));
      ${i} spotHaloT = clamp((spotD - (${e.parameterPrefix}HaloRadius - spotHaloInner)) / (spotHaloInner + spotHaloOuter), 0.0, 1.0);
      ${Si("spotSpectrum", r, `${r}(1.0, 0.12, 0.05)`, t)}
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
      ${Si("spotDogSpectrum", r, `${r}(1.0, 0.12, 0.05)`, t)}
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
var wo = /* @__PURE__ */ new Map();
function To(e, t, n) {
	let r = ve(e.type);
	return r?.glsl ? r.glsl.sampleExpression(e, n.get(e.type) ?? wo, t) : wi(t);
}
function Eo(e, t) {
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
	let n = xi(1, t), r = xi(.5, t), i = xi(0, t), a = "effectColor.rgb", o = "composedColor";
	switch (e) {
		case "darken": return `min(${o}, ${a})`;
		case "multiply": return `${o} * ${a}`;
		case "color-burn": return Ci(`${o} == ${n}`, n, Ci(`${a} == ${i}`, i, `${n} - min(${n}, (${n} - ${o}) / ${a})`, t), t);
		case "lighten": return `max(${o}, ${a})`;
		case "screen": return `${o} + ${a} - ${o} * ${a}`;
		case "color-dodge": return Ci(`${o} == ${i}`, i, Ci(`${a} == ${n}`, n, `min(${n}, ${o} / (${n} - ${a}))`, t), t);
		case "overlay": return Ci(`${o} <= ${r}`, `2.0 * ${o} * ${a}`, `${n} - 2.0 * (${n} - ${o}) * (${n} - ${a})`, t);
		case "soft-light": return Ci(`${a} <= ${r}`, `${o} - (${n} - 2.0 * ${a}) * ${o} * (${n} - ${o})`, `${o} + (2.0 * ${a} - ${n}) * (softLightD - ${o})`, t);
		case "hard-light": return Ci(`${a} <= ${r}`, `2.0 * ${o} * ${a}`, `${o} + (2.0 * ${a} - ${n}) - ${o} * (2.0 * ${a} - ${n})`, t);
		case "difference": return `abs(${o} - ${a})`;
		case "exclusion": return `${o} + ${a} - 2.0 * ${o} * ${a}`;
		default: return a;
	}
}
function Do(e) {
	if (e === "glsl") return "";
	let t = e === "wgsl" ? "vec3<f32>" : "vec3";
	return `${e === "wgsl" ? "let" : "vec3"} softLightD = ${Ci(`composedColor <= ${t}(0.25)`, `((16.0 * composedColor - ${t}(12.0)) * composedColor + ${t}(4.0)) * composedColor`, "sqrt(composedColor)", e)};`;
}
function Oo(e, t) {
	let n = $i(t);
	return `${e} >= ${$(n - .5)} && ${e} < ${$(n + .5)}`;
}
function ko(e, t) {
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
	].map((n, r) => `${r === 0 ? "if" : "else if"} (${Oo(e, n)}) {
          blendedColor = ${Eo(n, t)};
        }`).join("\n");
	return `${Do(t)}
        ${Si("blendedColor", n, "effectColor.rgb", t)}
        ${r}
        blendedColor = clamp(blendedColor, ${n}(0.0), ${n}(1.0));`;
}
function Ao(e, t, n, r, i, a = 0) {
	let o = t === "wgsl" ? "vec3<f32>" : "vec3", s = t === "wgsl" ? "vec4<f32>" : "vec4";
	return Fa(e).map((e, c) => {
		let l = e.type === "group" ? `effectColor = ${s}(${`groupColor${a}_${c}`}, 1.0);` : t === "wgsl" && i ? Mo(e, i) : To(e, t, n), u = `groupColor${a}_${c}`, d = r.get(e.id), f = d ? `${d.parameterPrefix}Opacity` : $(e.opacity / 100), p = d ? `${d.parameterPrefix}BlendMode` : $($i(e.blendMode));
		return `{
        ${e.type === "group" ? `${Si(u, o, `${o}(0.0)`, t)}
        {
          ${Si("previousComposedColor", o, "composedColor", t)}
          composedColor = ${o}(0.0);
          ${Ao(e.children, t, n, r, i, a + 1)}
          ${u} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${Si("effectColor", s, `${s}(0.0)`, t)}
        ${l}
        ${t === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${f}, 0.0, 1.0);
        ${ko(p, t)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          ${o}(0.0),
          ${o}(1.0)
        );
      }`;
	}).join("\n");
}
function jo(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Mo(e, t) {
	let n = t.adapters.get(e.type);
	return n ? n.adapter.createSampleExpression(e, "wgsl", { bindingsByLayerId: n.bindingsByLayerId }) : wi("wgsl");
}
var No = bi([
	{
		collect: Ia,
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
			return r ? bo(r, t) : wi(t);
		},
		createSampleParameters: (e, t) => Object.fromEntries(e.flatMap((e) => {
			let n = t[e.index];
			return [[`${e.parameterPrefix}Axis`, n.axis], ...Array.from({ length: e.stopCount }, (t, r) => [
				[`${e.parameterPrefix}StopColor${r}`, n.stops[r].color],
				[`${e.parameterPrefix}StopMidpoint${r}`, n.stops[r].midpoint],
				[`${e.parameterPrefix}StopT${r}`, n.stops[r].t]
			]).flat()];
		})),
		createUniforms: ra,
		getTopologyKey: (e) => ({
			mode: e.params.mode,
			stopCount: e.params.stops.length
		}),
		type: "gradient",
		updateUniforms: ia
	},
	{
		collect: La,
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
			return r ? xo(r, t) : wi(t);
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
		createUniforms: sa,
		getTopologyKey: (e) => ({ anchorCount: e.params.anchors.length }),
		type: "field-gradient",
		updateUniforms: ca
	},
	{
		collect: Ra,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : wi(t);
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, uniforms: r }) => {
			let i = Vo(e, t, n, r);
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
		createUniforms: Ui,
		getTopologyKey: (e) => ({
			hasPlacement: !!e.params.placement,
			hasSrc: !!e.params.src,
			height: e.params.height,
			width: e.params.width
		}),
		type: "image",
		updateUniforms: (e, t) => Wi(e, t.id, t.params.placement)
	},
	{
		collect: za,
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
			return r ? Co(r, t) : wi(t);
		},
		createSampleNodes: ({ bindings: e, direction: t, uniforms: n }) => ({ editorProjectionByLayerId: new Map(e.map((e) => {
			let r = n[e.index], i = to({
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
		createUniforms: fa,
		getTopologyKey: (e) => ({ stopCount: e.params.stops.length }),
		type: "spot",
		updateUniforms: pa
	},
	{
		collect: Ba,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : wi(t);
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n }) => {
			let r = n, i = /* @__PURE__ */ new Map(), a = Object.fromEntries(e.map((e) => {
				let n = Jo({ direction: t }), a = A(go(r, e.layer), n).setName(`starfieldTexture${e.index}`);
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
]), Po = new Set(["image", "spot"]);
No.forEach((e) => {
	_e({
		type: e.type,
		wgsl: e,
		wgslEditorOverlay: Po.has(e.type),
		getTopologyKey: (t) => e.getTopologyKey(t)
	});
}), Object.entries({
	gradient: {
		collectBindings: (e) => Ia(e),
		createBindingMap: (e) => Ha(e),
		uniformDeclarations: (e) => ao(e),
		shaderUniforms: (e) => aa(e),
		applyParams: (e, t, n) => oa(e, t, n),
		sampleExpression: (e, t, n) => {
			let r = t.get(e.id);
			return r ? bo(r, n) : wi(n);
		}
	},
	"field-gradient": {
		collectBindings: (e) => La(e),
		createBindingMap: (e) => Ua(e),
		uniformDeclarations: (e) => oo(e),
		shaderUniforms: (e) => la(e),
		applyParams: (e, t, n) => ua(e, t, n),
		sampleExpression: (e, t, n) => {
			let r = t.get(e.id);
			return r ? xo(r, n) : wi(n);
		}
	},
	spot: {
		collectBindings: (e) => za(e),
		createBindingMap: (e) => Ga(e),
		uniformDeclarations: (e, t) => so(e, t.editorPresentationEnabled),
		shaderUniforms: (e, t) => ({
			...ma(e),
			...t.editorPresentationEnabled ? zi(e, t.editorLayerState) : {}
		}),
		editorOverlayExpression: (e) => io(e),
		applyParams: (e, t, n) => ha(e, t, n),
		sampleExpression: (e, t, n) => {
			let r = t.get(e.id);
			return r ? Co(r, n) : wi(n);
		}
	},
	starfield: {
		collectBindings: (e) => Ba(e),
		createBindingMap: (e) => Ka(e),
		uniformDeclarations: (e) => lo(e),
		shaderUniforms: (e, t) => _o(e, t.starfieldTextures),
		sampleExpression: (e, t, n) => Xa(e, t, n)
	},
	image: {
		collectBindings: (e) => Ra(e),
		createBindingMap: (e) => Wa(e),
		uniformDeclarations: (e, t) => co(e, t.editorPresentationEnabled),
		fragmentHelpers: (e) => no(e),
		shaderUniforms: (e, t) => ({
			...Gi(e),
			...fo(e, t.imageTextures),
			...t.editorPresentationEnabled ? Ri(e, t.editorLayerState) : {}
		}),
		editorOverlayExpression: (e) => ro(e),
		sampleExpression: (e, t, n) => Ya(e, t, n)
	}
}).forEach(([e, t]) => {
	_e({
		type: e,
		glsl: t
	});
});
function Fo() {
	return ye().map((e) => e.wgsl).filter((e) => !!e);
}
function Io(e, t, n, r, i) {
	let a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = {}, c = {};
	return Fo().forEach((i) => {
		let l = i.collect(e.nodes), u = i.createUniforms(l), d = i.createSampleNodes?.({
			bindings: l,
			direction: t,
			imageTextures: i.type === "starfield" ? r : n,
			uniforms: u
		}), f = {
			adapter: i,
			bindings: l,
			bindingsByLayerId: jo(l),
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
function Lo(e, t) {
	return e.adapters.get(t);
}
function Ro(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Ro(e.children, t);
				return;
			}
			t(e);
		}
	});
}
function zo(e, t) {
	let n = e.adapters.get(t.type);
	n && n.adapter.updateUniforms(n.uniforms, t);
}
function Bo(e, t, n) {
	let r = qa(n), i = Ao(e.nodes, "wgsl", /* @__PURE__ */ new Map(), r, t);
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
function Vo(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	return {
		sampleData: i,
		sampleNodes: Object.fromEntries(e.map((e) => {
			let a = r[e.index], o = Qa(e)({
				direction: t,
				imageCenterDirection: a.centerDirection,
				imageHalfSize: a.halfSize,
				imageTangentX: a.tangentX,
				imageTangentY: a.tangentY
			}), s = N(o.x, o.y), c = A(uo(n, e.layer), s).setName(`imageTexture${e.index}`);
			c.getUniformHash = () => `skybox-image-texture:${e.layer.id}`;
			let l = $a({
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
function Ho(e, t, n, r, i) {
	let a = Va(e.nodes), o = ga(a), s = Io(e, t, n, r, i), c = Lo(s, "image"), l = c?.uniforms ?? [], u = c?.samples, d = Lo(s, "starfield")?.samples;
	return {
		colorNode: Bo(e, s, a)({
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
function Uo() {
	let e = ne.mul(2).sub(1), t = u.mul(oe(e.x, e.y.negate(), 1, 1)), n = t.xyz.div(t.w), r = d.mul(oe(n, 0)).xyz;
	return w(r);
}
function Wo(t, i, a, o, s, c) {
	let l = new n(), u = r(() => {
		let e = C;
		return e.z.assign(e.w), e;
	})();
	l.side = e.BackSide, l.depthTest = !1, l.depthWrite = !1, l.vertexNode = u;
	let { colorNode: d, compositionUniforms: f, imageSamples: p, imageUniforms: m, layerRuntime: h, starfieldSamples: g } = Ho(t, Uo(), a, o, s), _ = c ? ye().flatMap((e) => {
		let t = h.adapters.get(e.type);
		if (!e.wgslEditorOverlay || !t) return [];
		let n = t.bindings;
		return [{
			bindings: n,
			editorUniforms: Ii(n, i)
		}];
	}) : [], v = d;
	return _.forEach(({ bindings: e, editorUniforms: t }) => {
		e.forEach((e, n) => {
			let r = h.editorProjectionByLayerId.get(e.layer.id);
			r && (v = eo({
				color: v,
				activeValue: t[n].active,
				uv: r.uv,
				valid: r.valid
			}));
		});
	}), l.colorNode = v, _.length > 0 && Vi(l, (e) => {
		_.forEach(({ editorUniforms: t }) => Li(t, e));
	}), l.userData.webGpuLayerRuntime = h, l.userData.applyLayerParams = (e) => zo(h, e), Ca(l, (e) => Ro(e.nodes, l.userData.applyLayerParams)), wa(l, l.userData.applyLayerParams), Ta(l, (e) => Ro(e.nodes, l.userData.applyLayerParams)), Ea(l, l.userData.applyLayerParams), Da(l, (e) => Ro(e.nodes, l.userData.applyLayerParams)), Oa(l, l.userData.applyLayerParams), ka(l, (e) => va(f, e)), Aa(l, (e) => ya(f, e)), qi(l, (e, t) => Wi(m, e, t)), l.userData.applyImageTextures = (e) => mo(p?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.applyStarfieldTextures = (e) => yo(g?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.debugImageTextureSlots = h.textureSlotsByLayerId, l;
}
var Go = F("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.x, -normalizedDirection.z);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n"), Ko = F("\n  fn skyboxStudioEquirectUvToDirection(uv: vec2<f32>) -> vec3<f32> {\n    let lambda = (uv.x - 0.5) * 6.283185307179586;\n    let phi = (uv.y - 0.5) * 3.141592653589793;\n    let cosPhi = cos(phi);\n\n    return normalize(vec3<f32>(cosPhi * sin(lambda), sin(phi), -cosPhi * cos(lambda)));\n  }\n");
function qo(t, r, i, a = {}) {
	let o = new n();
	o.side = e.DoubleSide, o.depthTest = !1, o.depthWrite = !1;
	let s = te.xy.mul(.5).add(.5), { colorNode: c } = Ho(t, w(Ko({ uv: a.flipY ? N(s.x, s.y.oneMinus()) : s })), r, i, /* @__PURE__ */ new Map());
	return o.colorNode = c, o;
}
var Jo = F("\n  fn skyboxStudioDirectionToSourceStarfieldUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let theta = atan2(normalizedDirection.x, normalizedDirection.z);\n    let u = fract(theta / 6.283185307179586 + 0.5);\n    let v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / 3.141592653589793;\n\n    return vec2<f32>(u, v);\n  }\n");
function Yo(t) {
	let i = new n(), a = r(() => {
		let e = C;
		return e.z.assign(e.w), e;
	})(), o = Uo();
	return i.side = e.BackSide, i.depthTest = !1, i.depthWrite = !1, i.vertexNode = a, i.colorNode = A(t, Go({ direction: o })), i;
}
function Xo(t, n, r, i, a) {
	let o = Va(t.nodes), s = qa(o), c = {
		editorPresentationEnabled: a,
		editorLayerState: n,
		imageTextures: r,
		starfieldTextures: i
	}, l = ye().flatMap((e) => e.glsl ? [{
		type: e.type,
		glsl: e.glsl,
		bindings: e.glsl.collectBindings(t.nodes)
	}] : []), u = l.find((e) => e.type === "image")?.bindings ?? [], d = l.find((e) => e.type === "spot")?.bindings ?? [], f = l.find((e) => e.type === "starfield")?.bindings ?? [], p = new Map(l.map((e) => [e.type, e.glsl.createBindingMap(e.bindings)])), m = Object.assign({}, ...l.map((e) => e.glsl.shaderUniforms(e.bindings, c))), h = l.map((e) => e.glsl.uniformDeclarations(e.bindings, c)).join("\n"), g = l.map((e) => e.glsl.fragmentHelpers?.(e.bindings) ?? "").join("\n"), _ = a ? l.map((e) => e.glsl.editorOverlayExpression?.(e.bindings, c) ?? "").join("\n") : "", v = l.some((e) => !!e.glsl.fragmentHelpers && e.bindings.length > 0 || a && !!e.glsl.editorOverlayExpression && e.bindings.length > 0), y = Ao(t.nodes, "glsl", p, s), b = new e.ShaderMaterial({
		uniforms: {
			...m,
			...ba(o)
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
      ${Za()}
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
	return v && (b.extensions.derivatives = !0), a && Vi(b, (e) => Bi(b, u, d, e)), ka(b, (e) => xa(b, o, e)), Aa(b, (e) => Sa(b, o, e)), qi(b, (e, t) => Ki(b, u, e, t)), b.userData.applyImageTextures = (e) => po(b, u, e), b.userData.applyStarfieldTextures = (e) => vo(b, f, e), b.userData.applyLayerParams = (e) => {
		let t = l.find((t) => t.type === e.type);
		t?.glsl.applyParams?.(b, e, t.bindings);
	}, b;
}
function Zo(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function Qo(t, n = {}) {
	let r = br(t, n), i = Zo(r.width, r.height), a = i.getContext("2d");
	if (!a || !("putImageData" in a)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	a.putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
	let o = new e.CanvasTexture(i);
	return o.mapping = e.EquirectangularReflectionMapping, o.wrapS = e.RepeatWrapping, o.wrapT = e.ClampToEdgeWrapping, o.colorSpace = e.SRGBColorSpace, o.flipY = !1, o.needsUpdate = !0, o;
}
function $o(t) {
	return new e.ShaderMaterial({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		uniforms: { skyboxTexture: { value: t } },
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: "\n      precision highp float;\n      uniform sampler2D skyboxTexture;\n      varying vec3 vDirection;\n\n      const float PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.x, -normalizedDirection.z);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);\n      }\n\n      void main() {\n        vec3 direction = normalize(vDirection);\n        vec4 sampledColor = texture2D(skyboxTexture, directionToEquirectUv(direction));\n        gl_FragColor = vec4(sampledColor.rgb, sampledColor.a);\n      }\n    "
	});
}
function es(e, t) {
	return ts(t) ? Yo(e) : $o(e);
}
function ts(e) {
	return !!(e && "isWebGPURenderer" in e && e.isWebGPURenderer);
}
function ns(e, t) {
	return e === "auto" ? ts(t) ? "live-webgpu" : "live-webgl" : e;
}
function rs(e, t, n) {
	let r = (e) => e.type === "group" ? {
		children: e.children.map(r),
		enabled: e.enabled,
		id: e.id,
		type: e.type
	} : {
		enabled: e.enabled,
		id: e.id,
		topology: ve(e.type)?.getTopologyKey?.(e) ?? null,
		type: e.type
	};
	return JSON.stringify({
		editorPresentationEnabled: n,
		geometry: e.geometry?.type ?? R.type,
		nodes: e.nodes.map(r),
		renderMode: t
	});
}
function is(e, t) {
	for (let n of e) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = is(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
var as = class extends e.Mesh {
	#e = {};
	#t = { ...ji };
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
	#s = Ti;
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
		super(Ma(R), Wo(Ti, ji, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), !1)), this.frustumCulled = !1, this.renderOrder = -1, this.#m.name = "Skybox live starfield patches", this.add(this.#m);
	}
	fromManifest(e) {
		return this.#s = z(e), this.applyGeometry(this.#s.geometry ?? R), this;
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
		return this.#d = e, this.#f?.dispose(), this.#f = yi(e), this;
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
		let t = ja(e);
		if (this.#r.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#r = t, this.geometry = Ma(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#l?.dispose(), this.#l = null;
	}
	clearStarfieldPatchOverlay() {
		this.#m.children.forEach((t) => {
			t instanceof e.Group && ui(t);
		}), this.#m.clear();
	}
	syncStarfieldPatchOverlay() {
		this.clearStarfieldPatchOverlay();
		let e = this.material.userData.debugImageTextureSlots;
		ns(this.#u, this.#d) === "live-webgpu" && Ro(this.#s.nodes, (t) => {
			if (t.type !== "starfield") return;
			let n = this.#h.get(t.id);
			if (!n) return;
			e && (e[t.id] = { value: n });
			let r = li(n, t.params);
			r.renderOrder = 0, this.#m.add(r);
		});
	}
	disposeStarfieldTextures() {
		this.#p.forEach((e) => {
			clearTimeout(e);
		}), this.#p.clear(), this.#_.forEach((e) => ho(e)), this.#_.clear(), this.clearStarfieldPatchOverlay(), this.#h.clear(), this.#g.clear(), this.#f?.dispose(), this.#f = null;
	}
	syncStarfieldTextures() {
		let e = /* @__PURE__ */ new Set();
		Ro(this.#s.nodes, (t) => {
			if (t.type !== "starfield") return;
			e.add(t.id);
			let n = this.#f?.createBakeKey(t.params) ?? tr(t.params, 8192, 4096);
			this.#g.get(t.id) !== n && this.scheduleStarfieldTextureBake(t.id, t.params);
		}), Array.from(this.#_.keys()).forEach((t) => {
			if (e.has(t)) return;
			let n = this.#_.get(t);
			n && ho(n), this.#_.delete(t), this.#h.delete(t), this.#g.delete(t);
		}), Array.from(this.#p.entries()).forEach(([t, n]) => {
			e.has(t) || (clearTimeout(n), this.#p.delete(t));
		}), this.syncStarfieldPatchOverlay();
	}
	scheduleStarfieldTextureBake(e, t) {
		let n = this.#f?.createBakeKey(t) ?? tr(t, 8192, 4096);
		if (this.#g.get(e) === n) return;
		let r = this.#p.get(e);
		r && clearTimeout(r);
		let i = setTimeout(() => {
			this.#p.delete(e);
			let t = is(this.#s.nodes, e);
			if (t?.type !== "starfield") return;
			let r = this.#f?.createBakeKey(t.params) ?? tr(t.params, 8192, 4096);
			if (r !== n) {
				this.scheduleStarfieldTextureBake(e, t.params);
				return;
			}
			if (!this.#f?.canBake()) return;
			let i = this.#f.bakeTexture(t.params, r), a = this.#_.get(e);
			a && a !== i && ho(a), this.#_.set(e, i), this.#g.set(e, r), a ? this.refreshStarfieldTextureBindings() : (this.#c = null, this.setManifest(this.#s)), this.dispatchEvent({ type: "starfieldtexturechange" });
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
		this.material.userData.applyCompositionParams?.(this.#s), this.material.userData.applyLayerParams ? Ro(this.#s.nodes, this.material.userData.applyLayerParams) : (this.material.userData.applyGradientLayerParams?.(this.#s), this.material.userData.applyFieldGradientLayerParams?.(this.#s), this.material.userData.applySpotLayerParams?.(this.#s)), this.material.userData.applyImageTextures?.(this.#a), this.material.userData.applyStarfieldTextures?.(this.#_), this.material.userData.applyEditorLayerState?.(this.#t), this.#i.forEach((e, t) => {
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
		let n = is(this.#s.nodes, e);
		return n?.type === "image" && (n.params = {
			...n.params,
			placement: t
		}), this.#i.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this;
	}
	updateLayerComposition(e, t) {
		let n = is(this.#s.nodes, e);
		return n ? (t.blendMode !== void 0 && (n.blendMode = t.blendMode), t.opacity !== void 0 && (n.opacity = t.opacity), this.material.userData.applyLayerComposition?.(n), this) : this;
	}
	updateLayer(e, t) {
		let n = is(this.#s.nodes, e);
		return !n || n.type === "group" ? this : (n.params = t, ve(n.type)?.updateLive?.(this.#o, n), this);
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
		let t = z(e);
		this.#s = t, this.applyGeometry(this.#s.geometry ?? this.#r), this.syncStarfieldTextures();
		let n = ns(this.#u, this.#d), r = rs(this.#s, n, this.#n);
		if (this.#c === r && (n === "live-webgpu" || n === "live-webgl")) return this.applyLiveManifestUniformUpdates(), this;
		if (n === "live-webgpu") this.replaceMaterial(Wo(this.#s, this.#t, this.#a, this.#_, this.#h, this.#n));
		else if (n === "live-webgl") this.replaceMaterial(Xo(this.#s, this.#t, this.#a, this.#_, this.#n));
		else {
			let e = Qo(this.#s, this.#e);
			this.replaceMaterial(es(e, this.#d), e);
		}
		return this.#c = r, this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(es(e, this.#d)), this.#c = null, this;
	}
	invalidateBakeCache() {
		return gr(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture(), this.disposeStarfieldTextures();
	}
};
//#endregion
//#region skybox-gpu-bake.ts
function os(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function ss(t, n, r, i) {
	let a = new e.RenderTarget(t, n, {
		depthBuffer: !1,
		format: e.RGBAFormat,
		generateMipmaps: !1,
		magFilter: e.LinearFilter,
		minFilter: e.LinearFilter,
		stencilBuffer: !1,
		type: r ? i ? e.FloatType : e.HalfFloatType : e.UnsignedByteType,
		wrapS: e.RepeatWrapping,
		wrapT: e.ClampToEdgeWrapping
	});
	return a.texture.name = "GPU baked skybox composition", a.texture.colorSpace = r ? e.LinearSRGBColorSpace : e.SRGBColorSpace, a.texture.generateMipmaps = !1, a;
}
var cs = class {
	#e;
	#t = new e.Scene();
	#n = new e.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#r = new e.PlaneGeometry(2, 2);
	constructor(e) {
		this.#e = e;
	}
	canBake() {
		return os(this.#e);
	}
	bakeRenderTarget(t, n) {
		let r = Math.max(1, Math.floor(n.width)), i = Math.max(1, Math.floor(n.height)), a = qo(z(t), n.imageTextures ?? /* @__PURE__ */ new Map(), n.starfieldTextures ?? /* @__PURE__ */ new Map(), { flipY: n.flipY }), o = ss(r, i, !!n.hdr, !!n.float), s = new e.Mesh(this.#r, a);
		s.frustumCulled = !1;
		let c = this.#e.getRenderTarget(), l = this.#e.autoClear, u = new e.Color(), d = this.#e.getClearAlpha();
		this.#e.getClearColor(u);
		try {
			this.#t.clear(), this.#t.add(s), this.#e.autoClear = !0, this.#e.setClearColor(0, 0), this.#e.setRenderTarget(o), this.#e.clear(), this.#e.render(this.#t, this.#n), this.#t.remove(s);
		} finally {
			this.#e.setRenderTarget(c), this.#e.autoClear = l, this.#e.setClearColor(u, d);
		}
		return {
			height: i,
			target: o,
			width: r,
			dispose: () => {
				a.dispose(), o.dispose();
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
function ls(e) {
	return os(e) ? new cs(e) : null;
}
//#endregion
//#region loader/loader.ts
var us = class extends Error {
	constructor(e, t) {
		super(e), this.name = "LoaderAssetError", this.entry = t.entry ?? null, this.event = t.event, this.id = t.id, this.phase = t.phase, this.src = t.src;
	}
}, ds = class {
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
			let e = this.#o.size === 0, n = new us(e ? `No manifest loaded. Cannot resolve id: "${t}"` : `Manifest loaded but id not found: "${t}". Available ids: ${[...this.#o.keys()].join(", ")}`, {
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
		if (!this.#u(e)) throw new us("Invalid manifest entry.", { phase: "manifest-parse-error" });
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
		if (!r) throw new us(`No loader registered for type: ${e}`, {
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
//#region loader/extensions/texture.ts
function fs(t) {
	return t.colorSpace = e.SRGBColorSpace, t.wrapS = e.ClampToEdgeWrapping, t.wrapT = e.ClampToEdgeWrapping, t.flipY = !1, t.minFilter = e.LinearMipmapLinearFilter, t.magFilter = e.LinearFilter, t.generateMipmaps = !0, t.needsUpdate = !0, t;
}
var ps = class {
	static {
		this.type = "texture";
	}
	#e = new e.TextureLoader();
	async load(e, t) {
		let n = Array.isArray(e) ? e : [e], r = null;
		for (let e of n) try {
			return fs(await this.#e.loadAsync(e));
		} catch (n) {
			r = new us(`Failed to load texture: ${e}`, {
				entry: t,
				event: n,
				phase: "network-error",
				src: e
			});
		}
		throw r ?? new us(`No texture sources for entry ${t?.id ?? "?"}`, {
			entry: t,
			phase: "network-error",
			src: e
		});
	}
}, ms = "manifest.json";
function hs(e) {
	let t = [], n = (e) => {
		for (let r of e) r.type === "group" ? n(r.children) : r.type === "image" && t.push(r);
	};
	return n(e.nodes), t;
}
function gs(e) {
	switch (e.slice(e.lastIndexOf(".") + 1).toLowerCase()) {
		case "jpg":
		case "jpeg": return "image/jpeg";
		case "webp": return "image/webp";
		default: return "image/png";
	}
}
function _s(e, t) {
	let n = e.slice();
	return URL.createObjectURL(new Blob([n], { type: t }));
}
async function vs(e) {
	if (typeof e == "string") {
		let t = await fetch(e);
		if (!t.ok) throw Error(`Could not fetch zip bundle (${t.status} ${t.statusText}).`);
		return new Uint8Array(await t.arrayBuffer());
	}
	return e instanceof Uint8Array ? e : e instanceof ArrayBuffer ? new Uint8Array(e) : new Uint8Array(await e.arrayBuffer());
}
function ys(e) {
	return new Promise((t, n) => {
		se(e, (e, r) => {
			if (e) {
				n(e);
				return;
			}
			t(r);
		});
	});
}
async function bs(e, t = {}) {
	let n = t.toAssetUrl ?? _s, r = await ys(await vs(e)), i = r[ms];
	if (!i) throw Error(`Zip bundle is missing ${ms}.`);
	let a = JSON.parse(new TextDecoder().decode(i)), o = z(a), s = a.assets ?? {}, c = /* @__PURE__ */ new Map(), l = [];
	for (let [e, t] of Object.entries(r)) {
		if (e === ms) continue;
		let r = n(t, s[e]?.mimeType ?? gs(e), e);
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
async function xs(e) {
	let t = await fetch(new URL(ms, e).href);
	if (!t.ok) throw Error(`Could not load ${ms} (${t.status}).`);
	return {
		manifest: z(await t.json()),
		resolveAssetUrl: (t) => new URL(t, e).href,
		dispose: () => {}
	};
}
async function Ss(e, t) {
	let n = t.split("/").filter(Boolean), r = e;
	for (let e = 0; e < n.length - 1; e += 1) r = await r.getDirectoryHandle(n[e]);
	let i = await r.getFileHandle(n[n.length - 1]);
	return URL.createObjectURL(await i.getFile());
}
async function Cs(e) {
	let t = await (await e.getFileHandle(ms)).getFile(), n = z(JSON.parse(await t.text())), r = /* @__PURE__ */ new Map();
	for (let t of hs(n)) t.params.src && r.set(t.params.src, await Ss(e, t.params.src));
	return {
		manifest: n,
		resolveAssetUrl: (e) => r.get(e) ?? e,
		dispose: () => {
			for (let e of r.values()) typeof URL < "u" && URL.revokeObjectURL && URL.revokeObjectURL(e);
			r.clear();
		}
	};
}
async function ws(e) {
	let t = structuredClone(e.manifest);
	for (let n of hs(t)) {
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
//#region loader/skybox-bundle.ts
function Ts() {
	let e = new ds();
	return e.register(ps.type, ps), e;
}
async function Es(e, t = {}) {
	let n = t.loader ?? Ts(), r = hs(e.manifest).filter((e) => e.enabled && e.params.src), i = r.map((t) => ({
		id: t.id,
		src: e.resolveAssetUrl(t.params.src),
		type: ps.type
	})), a = t.onProgress ? n.onProgress(t.onProgress) : null;
	try {
		await n.load(i);
	} finally {
		a?.();
	}
	let o = /* @__PURE__ */ new Map();
	return await Promise.all(r.map(async (e) => {
		try {
			o.set(e.id, await n.loadAsset(ps.type, e.id));
		} catch {}
	})), o;
}
function Ds(e) {
	return typeof e == "object" && !!e && "manifest" in e && typeof e.resolveAssetUrl == "function";
}
async function Os(e, t = {}) {
	let { onProgress: n, ...r } = t, i = !Ds(e), a = Ds(e) ? e : await bs(e, r), o = Ts(), s = await Es(a, {
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
export { ur as DEFAULT_BAKE_WIDTH, Ze as DEFAULT_SPOT_BASE_ANGULAR_RADIUS, Ft as DEFAULT_STARFIELD_CLIP, W as DEFAULT_STARFIELD_NEBULA, G as DEFAULT_STARFIELD_NEBULA_FIELD, It as DEFAULT_STARFIELD_PARAMS, Mt as DEFAULT_STARFIELD_QUALITY, U as DEFAULT_STARFIELD_STARS, Oe as IMAGE_PLACEMENT_ELEVATION_LIMIT, ds as Loader, us as LoaderAssetError, jt as STARFIELD_PREVIEW_BAKE_WIDTH, Nt as STARFIELD_QUALITY_PRESETS, as as Skybox, cs as SkyboxGpuBakeService, vi as StarfieldGpuBakeService, ps as TextureLoaderExtension, br as bakeSkyboxImageData, ar as bakeStarfieldImageData, fe as blendChannel, I as clamp, hs as collectImageLayers, pe as compositeBlendChannel, me as compositeOver, fs as configureSkyboxImageTexture, Ve as createAngularDecalPlacement, hr as createBakeCacheKey, Qo as createBakedSkyboxTexture, et as createDefaultSpotParams, Be as createImagePlacementTangents, Ma as createSkyboxGeometry, ls as createSkyboxGpuBakeService, Pa as createSkyboxWireGeometry, Mn as createStarCatalogForCoverage, Nn as createStarCatalogForDescriptor, tr as createStarfieldBakeCacheKey, yi as createStarfieldGpuBakeService, on as createStarfieldPatchLayout, We as directionFromPosition, Se as equirectPointToDirection, Ce as equirectUvToDirection, lr as evaluateSkyboxDirection, ve as getLayerRuntimeAdapter, ye as getLayerRuntimeAdapters, zt as getStarfieldQualityPreset, gr as invalidateBakeCache, be as isRegisteredLayerType, ce as linearChannelToSrgb, ue as linearRgbToSrgbBytes, Cs as loadBundleFromDirectory, xs as loadBundleFromUrl, bs as loadBundleFromZip, Os as loadSkyboxBundle, Es as loadSkyboxImageTextures, z as migrateManifestToV2, He as normalizeImagePlacement, tt as normalizeSpotParams, Yt as normalizeStarfieldCoverage, un as normalizeStarfieldParams, Rt as normalizeStarfieldQuality, B as normalizeVector, le as parseHexColor, Ge as placementFromPosition, Ye as placementFromRotation, qe as placementFromScale, Ue as positionFromPlacement, nt as positionFromSpot, Xe as projectDirectionToImageUv, wn as qFromV, it as radiusScaleFromSpot, _e as registerLayerRuntimeAdapter, ws as rehydrateImagePixels, mr as resolveBakeOptions, Je as rotationFromPlacement, er as sampleStarfieldLayer, Ke as scaleFromPlacement, Gt as sourceDirectionFromUv, Kt as sourceFoldEquirectUv, qt as sourceUvFromDirection, ot as spotContainsDirection, rt as spotFromPosition, at as spotFromRadiusScale, L as srgbChannelToLinear, yn as starfieldClipContainsDirection, Un as starfieldFieldGradientToSourceField };
