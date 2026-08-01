import { $ as e, A as t, D as n, F as r, G as i, H as a, I as o, J as s, K as c, L as l, M as u, N as d, O as f, P as p, Q as m, R as h, U as g, V as _, W as v, X as y, Y as b, Z as x, d as S, et as C, it as w, j as ee, k as T, m as E, nt as D, q as O, rt as k, t as A, tt as j, z as M } from "./starfield-bake-registry-D5mi0bgU.js";
import * as N from "three";
import * as te from "three/tsl";
import { Fn as P, If as ne, Loop as F, cameraPosition as I, cameraProjectionMatrixInverse as re, cameraWorldMatrix as ie, cos as ae, dFdx as oe, dFdy as se, dot as L, exp as R, float as z, int as ce, length as le, log2 as ue, max as B, min as de, mix as fe, modelViewProjection as pe, normalize as me, positionGeometry as he, positionWorld as ge, pow as _e, screenUV as ve, select as ye, sin as be, smoothstep as xe, sqrt as Se, struct as Ce, sub as V, texture as we, time as Te, uniform as H, vec2 as Ee, vec3 as U, vec4 as De, wgslFn as W } from "three/tsl";
import * as G from "three/webgpu";
import { Color as Oe, NodeMaterial as ke, Vector3 as Ae } from "three/webgpu";
//#region src/image-placement-transform.ts
var je = [
	0,
	1,
	0
], Me = [
	0,
	0,
	-1
], Ne = [
	1,
	0,
	0
], Pe = [
	0,
	1,
	0
], Fe = 89.9;
function Ie(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Le(e) {
	return e * Math.PI / 180;
}
function Re(e) {
	return e * 180 / Math.PI;
}
function ze(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Be(e) {
	return (Math.round(e) % 360 + 360) % 360;
}
function Ve(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function He(e, t) {
	return [
		e[0] - t[0],
		e[1] - t[1],
		e[2] - t[2]
	];
}
function Ue(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function We(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function Ge(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function K(e, t = Me) {
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
function Ke(e, t, n) {
	let r = Le(n), i = Math.cos(r), a = Math.sin(r), o = K(t);
	return K(We(We(Ue(e, i), Ue(Ge(o, e), a)), Ue(o, Ve(o, e) * (1 - i))), e);
}
function qe(e, t = je, n = 0) {
	let r = K(e), i = He(K(t, je), Ue(r, Ve(K(t, je), r)));
	if (Math.hypot(i[0], i[1], i[2]) < 1e-6) {
		let e = Math.abs(r[1]) > .98 ? [
			0,
			0,
			1
		] : je;
		i = He(e, Ue(r, Ve(e, r)));
	}
	return i = K(i, Pe), {
		tangentX: Ke(K(Ge(r, i), Ne), r, n),
		tangentY: Ke(i, r, n)
	};
}
function Je({ angularHeight: e, angularWidth: t, baseAngularHeight: n, baseAngularWidth: r, centerDirection: i, rotation: a = 0, upDirection: o = je }) {
	let s = K(i), c = Be(a), { tangentX: l, tangentY: u } = qe(s, o, c), d = Math.max(1e-4, e), f = Math.max(1e-4, t);
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
function Ye(e) {
	let t = e, n = K(t?.centerDirection ?? t?.normal ?? t?.center, Me), r = Array.isArray(t?.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, i = typeof t?.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t?.width ?? .4) / (2 * r)), a = typeof t?.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t?.height ?? .3) / (2 * r));
	return Je({
		angularHeight: a,
		angularWidth: i,
		baseAngularHeight: typeof t?.baseAngularHeight == "number" ? t.baseAngularHeight : a,
		baseAngularWidth: typeof t?.baseAngularWidth == "number" ? t.baseAngularWidth : i,
		centerDirection: n,
		rotation: typeof t?.rotation == "number" ? t.rotation : 0
	});
}
function Xe(e) {
	let t = K(e.centerDirection);
	return {
		x: ze(Re(Math.atan2(t[0], -t[2]))),
		y: Re(Math.asin(Ie(t[1], -1, 1)))
	};
}
function Ze(e) {
	let t = Le(e.x), n = Le(Ie(e.y, -89.9, Fe)), r = Math.cos(n);
	return K([
		Math.sin(t) * r,
		Math.sin(n),
		-Math.cos(t) * r
	]);
}
function Qe(e, t, n) {
	let r = Ye(e);
	return Je({
		angularHeight: r.angularHeight,
		angularWidth: r.angularWidth,
		baseAngularHeight: r.baseAngularHeight,
		baseAngularWidth: r.baseAngularWidth,
		centerDirection: Ze(t),
		rotation: r.rotation,
		upDirection: n?.upDirection
	});
}
function $e(e) {
	let t = Ye(e);
	return {
		x: t.angularWidth / t.baseAngularWidth,
		y: t.angularHeight / t.baseAngularHeight
	};
}
function et(e, t) {
	let n = Ye(e);
	return {
		...n,
		angularHeight: Math.max(1e-4, n.baseAngularHeight * Math.max(1e-4, t.y)),
		angularWidth: Math.max(1e-4, n.baseAngularWidth * Math.max(1e-4, t.x))
	};
}
function tt(e) {
	return Ye(e).rotation;
}
function nt(e, t) {
	let n = Ye(e);
	return Je({
		angularHeight: n.angularHeight,
		angularWidth: n.angularWidth,
		baseAngularHeight: n.baseAngularHeight,
		baseAngularWidth: n.baseAngularWidth,
		centerDirection: n.centerDirection,
		rotation: t
	});
}
function rt(e, t) {
	let n = Ye(t), r = K(e), i = Ve(r, n.centerDirection);
	if (i <= 0) return null;
	let a = Ve(r, n.tangentX) / i, o = Ve(r, n.tangentY) / i, s = Math.tan(n.angularWidth / 2), c = Math.tan(n.angularHeight / 2);
	return s <= 0 || c <= 0 || a < -s || a > s || o < -c || o > c ? null : {
		u: a / (2 * s) + .5,
		v: .5 - o / (2 * c)
	};
}
//#endregion
//#region src/layer-addons/builtins/moon/params.ts
var it = 128, at = 2048, ot = 2 * Math.atan(1 / 4), st = {
	realistic: 1,
	cartoon: 1
};
function ct(e = [
	0,
	0,
	-1
]) {
	return {
		placement: Je({
			angularHeight: ot,
			angularWidth: ot,
			centerDirection: K(e)
		}),
		resolutionMode: "auto",
		photometryModel: "hapke-wac-643",
		phase: .5,
		sunTilt: .12,
		bodyRotation: 0,
		bodyTilt: 0,
		craterFreq: 7,
		craterDepth: .012,
		maria: .42,
		mariaDepth: .004,
		regolith: .5,
		rays: 1,
		exposure: st.realistic,
		style: "realistic",
		cartoonLightIntensity: 1,
		cartoonFill: 0,
		cartoonNightStrength: .3,
		cartoonCraters: 44,
		cartoonCraterSize: .13,
		cartoonWobble: .34,
		cartoonRelief: .42,
		cartoonForm: .5,
		cartoonSunLean: .35,
		cartoonOutline: .12,
		cartoonSoftness: .1,
		cartoonShadowSize: 0,
		cartoonEdgeGlow: 0,
		cartoonCrop: !1,
		baseColor: "#d3dde3",
		mareColor: "#a6b8c2",
		nightColor: "#1b2740"
	};
}
function lt(e) {
	return {
		...e,
		placement: Ye(e.placement)
	};
}
function ut(e) {
	let t = ct(e?.placement?.centerDirection), n = e ?? {}, r = {
		...t,
		...n
	};
	return lt({
		placement: Ye(r.placement),
		resolutionMode: r.resolutionMode,
		photometryModel: "hapke-wac-643",
		phase: r.phase,
		sunTilt: r.sunTilt,
		bodyRotation: r.bodyRotation,
		bodyTilt: r.bodyTilt,
		craterFreq: r.craterFreq,
		craterDepth: r.craterDepth,
		maria: r.maria,
		mariaDepth: r.mariaDepth,
		regolith: r.regolith,
		rays: r.rays,
		exposure: r.exposure,
		style: r.style,
		cartoonLightIntensity: n.cartoonLightIntensity ?? n.lightIntensity ?? t.cartoonLightIntensity,
		cartoonFill: n.cartoonFill ?? n.ambient ?? t.cartoonFill,
		cartoonNightStrength: n.cartoonNightStrength ?? (typeof n.earthshine == "number" ? n.earthshine * 6 : t.cartoonNightStrength),
		cartoonCraters: r.cartoonCraters,
		cartoonCraterSize: r.cartoonCraterSize,
		cartoonWobble: r.cartoonWobble,
		cartoonRelief: r.cartoonRelief,
		cartoonForm: r.cartoonForm,
		cartoonSunLean: r.cartoonSunLean,
		cartoonOutline: r.cartoonOutline,
		cartoonSoftness: r.cartoonSoftness,
		cartoonShadowSize: r.cartoonShadowSize,
		cartoonEdgeGlow: r.cartoonEdgeGlow,
		cartoonCrop: r.cartoonCrop,
		baseColor: r.baseColor,
		mareColor: r.mareColor,
		nightColor: r.nightColor
	});
}
//#endregion
//#region src/manifest.ts
var dt = { type: "box" };
function ft(e) {
	let t = Math.hypot(e[0], e[1], e[2]);
	return !Number.isFinite(t) || t <= 1e-8 ? [
		0,
		1,
		0
	] : [
		e[0] / t,
		e[1] / t,
		e[2] / t
	];
}
function pt(e) {
	let t = /* @__PURE__ */ new Map(), n = (e) => {
		e.forEach((e) => {
			e.type === "group" ? n(e.children) : t.set(e.id, e);
		});
	};
	n(e.nodes);
	let r = (e) => {
		let n = e.directionLayerId ? t.get(e.directionLayerId) : void 0, r = n?.type === "spot" ? n.params.centerDirection : n?.type === "image" ? n.params.placement?.centerDirection : null;
		return {
			...e,
			direction: ft(r ?? e.direction),
			directionLayerId: r ? e.directionLayerId : null
		};
	}, i = (e) => e.map((e) => e.type === "group" ? {
		...e,
		children: i(e.children)
	} : e.type === "moon" ? {
		...e,
		params: ut(e.params)
	} : e.type === "clouds" ? {
		...e,
		params: {
			...e.params,
			moon: r(e.params.moon),
			sun: r(e.params.sun)
		}
	} : e);
	return {
		...e,
		nodes: i(e.nodes)
	};
}
function mt(e) {
	return e.version === 2 ? pt({
		...e,
		geometry: e.geometry ?? dt
	}) : pt({
		composition: e.composition,
		geometry: dt,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	});
}
//#endregion
//#region src/skybox/geometry.ts
function ht(e) {
	return e ?? dt;
}
function gt(e = dt) {
	return ht(e).type === "sphere" ? new N.SphereGeometry(1, 64, 32) : new N.BoxGeometry(1, 1, 1);
}
function _t(e = 1, t = 25, n = 25) {
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
	return new N.BufferGeometry().setAttribute("position", new N.Float32BufferAttribute(r, 3));
}
function vt(e = dt) {
	if (ht(e).type === "sphere") return _t();
	let t = new N.BoxGeometry(1, 1, 1), n = new N.EdgesGeometry(t);
	return t.dispose(), n;
}
//#endregion
//#region src/layer-addons/shader-codegen.ts
function q(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function yt(e) {
	return `vec3<f32>(${q(e)})`;
}
function bt(e, t, n) {
	return `var ${e}: ${t} = ${n};`;
}
function xt(e, t, n) {
	return `select(${n}, ${t}, ${e})`;
}
function St() {
	return "effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);";
}
//#endregion
//#region src/layer-addons/builtins/clouds/mipped-texture.ts
function Ct(e, t, n, r) {
	let i = new G.DataTexture(e, t, n);
	return i.format = G.RedFormat, i.type = G.UnsignedByteType, i.wrapS = r, i.wrapT = r, i.minFilter = G.LinearMipmapLinearFilter, i.magFilter = G.LinearFilter, i.generateMipmaps = !0, i.unpackAlignment = 1, i.needsUpdate = !0, i;
}
//#endregion
//#region src/layer-addons/builtins/clouds/cloud-field.ts
var wt = {
	size: 512,
	tiles: 6,
	octaves: 5,
	persistence: .5,
	seed: 11
};
function Tt(e, t) {
	return Math.max(1, Math.floor(Math.log2(e / (4 * t))) + 1);
}
function Et(e) {
	let t = new Uint8Array(512), n = new Uint8Array(256);
	for (let e = 0; e < 256; e += 1) n[e] = e;
	let r = e | 0, i = () => {
		r = r + 1831565813 | 0;
		let e = Math.imul(r ^ r >>> 15, 1 | r);
		return e = e + Math.imul(e ^ e >>> 7, 61 | e) ^ e, ((e ^ e >>> 14) >>> 0) / 4294967296;
	};
	for (let e = 255; e > 0; --e) {
		let t = Math.floor(i() * (e + 1)), r = n[e];
		n[e] = n[t], n[t] = r;
	}
	for (let e = 0; e < 512; e += 1) t[e] = n[e & 255];
	return t;
}
var Dt = [
	1,
	-1,
	1,
	-1,
	1,
	-1,
	0,
	0
], Ot = [
	1,
	1,
	-1,
	-1,
	0,
	0,
	1,
	-1
], kt = (e) => e * e * e * (e * (e * 6 - 15) + 10), At = (e, t, n) => e + (t - e) * n;
function jt(e, t, n, r) {
	let i = Math.floor(t), a = Math.floor(n), o = t - i, s = n - a, c = (e) => (e % r + r) % r, l = c(i), u = c(i + 1), d = c(a), f = c(a + 1), p = (t, n, r, i) => {
		let a = e[e[t & 255] + n & 255] & 7;
		return Dt[a] * r + Ot[a] * i;
	}, m = kt(o), h = kt(s);
	return At(At(p(l, d, o, s), p(u, d, o - 1, s), m), At(p(l, f, o, s - 1), p(u, f, o - 1, s - 1), m), h);
}
function Mt(e) {
	let { size: t, tiles: n, persistence: r, seed: i } = e, a = Math.min(e.octaves, Tt(t, n)), o = Et(i), s = new Float32Array(t * t), c = Infinity, l = -Infinity, u = 0;
	for (let e = 0; e < t; e += 1) {
		let i = e / t;
		for (let e = 0; e < t; e += 1) {
			let d = e / t, f = n, p = 1, m = 0, h = 0;
			for (let e = 0; e < a; e += 1) m += jt(o, d * f, i * f, f) * p, h += p, f *= 2, p *= r;
			let g = m / h;
			g < c && (c = g), g > l && (l = g), s[u] = g, u += 1;
		}
	}
	let d = l - c || 1, f = new Uint8Array(t * t);
	for (let e = 0; e < s.length; e += 1) f[e] = Math.round((s[e] - c) / d * 255);
	return Ct(f, t, t, G.RepeatWrapping);
}
//#endregion
//#region src/layer-addons/builtins/clouds/custom-sky-model.ts
var Nt = P(([e]) => z(.75).mul(z(1).add(e.mul(e)))), Pt = P(([e, t]) => {
	let n = e.mul(e);
	return z(1.5).mul(z(1).sub(n).div(z(2).add(n))).mul(z(1).add(t.mul(t))).div(_e(B(z(1).add(n).sub(z(2).mul(e).mul(t)), 1e-4), 1.5));
});
function Ft(e) {
	return {
		direction: H(new Ae(0, 1, 0)),
		intensity: H(e.intensity),
		tint: H(new Oe(e.tint)),
		showDisc: H(+!!e.showDisc)
	};
}
function It(e) {
	return {
		enabled: H(1),
		altitude: H(e.altitude),
		featureSize: H(e.featureSize),
		speed: H(e.speed),
		morphBlend: H(e.morphBlend),
		morphScale: H(e.morphScale),
		morphSpeed: H(e.morphSpeed),
		coverage: H(e.coverage),
		density: H(e.density),
		phaseG: H(e.phaseG),
		seed: H(e.seed)
	};
}
var Lt = Ce({
	debugColor: "vec3",
	radiance: "vec3",
	transmission: "vec3"
}, "CustomSkySample");
function Rt(e, t = {}) {
	let n = {
		kr: H(.0025),
		km: H(.001),
		sun: Ft({
			intensity: 20,
			tint: "#ffffff",
			showDisc: !0
		}),
		moon: Ft({
			intensity: .2,
			tint: "#fff2e0",
			showDisc: !0
		}),
		mieDirectionalG: H(-.99),
		wavelength: H(new Ae(.65, .57, .475)),
		eyeHeight: H(.001),
		mistDensity: H(.04),
		mistHeight: H(.003),
		samples: H(ce(5)),
		exposure: H(2),
		up: H(new Ae(0, 1, 0)),
		cloudLow: It({
			altitude: .015,
			featureSize: .05,
			speed: 1e-4,
			morphBlend: .45,
			morphScale: 1.7,
			morphSpeed: -12e-5,
			coverage: .55,
			density: .7,
			phaseG: .7,
			seed: 0
		}),
		cloudHigh: It({
			altitude: .045,
			featureSize: .09,
			speed: 9e-5,
			morphBlend: .35,
			morphScale: 1.6,
			morphSpeed: -6e-5,
			coverage: .5,
			density: .45,
			phaseG: .7,
			seed: 41.3
		}),
		fieldSize: H(512),
		debugLayers: H(0)
	}, r = [n.sun, n.moon], i = 10.25, a = 4 * Math.PI, o = .08, s = 1.9, c = Math.cos(s), l = Math.sin(s), u = we(e), d = P(([e]) => {
		let t = z(1).sub(e), n = z(-.00287).add(t.mul(z(.459).add(t.mul(z(3.83).add(t.mul(z(-6.8).add(t.mul(5.25))))))));
		return z(.25).mul(R(de(n, 12)));
	}), f = P(() => {
		let e = pe;
		return e.z.assign(e.w), e;
	})(), p = P(() => {
		let e = U(1).div(_e(n.wavelength, U(4))), f = e.mul(n.kr.mul(a)).add(n.km.mul(a)), p = me(t.direction ?? ge.sub(I)), m = t.time ?? Te, h = z(10).add(n.eyeHeight), g = n.up.mul(h), _ = U(p.x, B(p.y, 0), p.z), v = _.div(B(le(_), 1e-4)), y = z(2).mul(L(g, v)), b = L(g, g).sub(i * i), x = z(.5).mul(y.negate().add(Se(B(y.mul(y).sub(b.mul(4)), 0)))), S = R(z(16).mul(z(10).sub(h))), C = L(v, g).div(h), w = S.mul(d(C));
		function ee(e) {
			let t = me(e.direction), r = e.tint.mul(e.intensity), i = L(p, t), a = i.negate(), o = L(t, n.up), s = z(1).div(t.y.abs().add(.15)), c = Ee(t.x, t.z).mul(s), l = s, u = R(f.mul(S.mul(d(o))).negate()), m = B(B(u.r, u.g), u.b);
			return {
				light: e,
				dir: t,
				irradiance: r,
				cosTheta: i,
				phaseCos: a,
				cosZenith: o,
				slope: c,
				pathLength: l,
				groundTransmit: u,
				relevant: e.intensity.mul(m).greaterThan(1e-4),
				frontColor: U(0).toVar()
			};
		}
		let T = r.map(ee), E = z(n.samples), D = x.div(E), O = D.mul(4), k = v.mul(D), A = g.add(k.mul(.5)).toVar();
		F({
			start: ce(0),
			end: n.samples
		}, () => {
			let e = B(le(A), 1e-4), t = R(z(16).mul(z(10).sub(e))), n = d(L(v, A).div(e));
			for (let r of T) {
				let i = L(r.dir, A).div(e), a = w.add(t.mul(d(i).sub(n))), o = R(f.mul(B(a, 0)).negate());
				r.frontColor.addAssign(o.mul(t.mul(O)));
			}
			A.addAssign(k);
		});
		let j = U(0).toVar(), M = U(0).toVar();
		for (let t of T) {
			let r = t.frontColor.mul(e.mul(n.kr)).mul(t.irradiance), i = t.frontColor.mul(n.km).mul(t.irradiance), a = Nt(t.phaseCos).mul(r);
			M.addAssign(a), j.addAssign(a.add(Pt(n.mieDirectionalG, t.phaseCos).mul(i)));
		}
		let N = R(f.mul(S.mul(d(L(p, g).div(h)))).negate()), te = T.reduce((e, t) => e.add(t.irradiance.mul(xe(.9999566769464484, .9999766769464484, t.cosTheta).mul(t.light.showDisc))), U(0)).mul(N).mul(xe(z(-.0093), z(0), p.y));
		function P(e, t, n, r, i) {
			let a = u.sample(e).level(n).r, o = u.sample(t).level(r).r;
			return {
				a,
				b: o,
				level: fe(a, o, i.blend).mul(i.norm).add(i.bias)
			};
		}
		function re(e, t, n, r, i, a, o) {
			let { a: s, b: c, level: l } = P(e, t, n, r, a), d = Ee(s.sub(.5), c.sub(.5)).mul(1), f = u.sample(e.mul(5).add(.37).add(d)).level(i).r, p = B(l.sub(V(1, o.coverage)), 0), m = o.density.mul(10), h = R(p.mul(m).negate());
			return B(p.sub(f.mul(.12).mul(h)), 0).mul(m);
		}
		function ie(e, t, n, r, i, a) {
			let { level: o } = P(e, t, n.add(2), r.add(2), i);
			return B(o.sub(V(1, a)), 0);
		}
		function pe(e) {
			return ue(B(B(le(oe(e)), le(se(e))).mul(n.fieldSize), 1e-6));
		}
		function he(e) {
			let t = B(z(10).add(e), h.add(1e-4)), n = z(2).mul(L(g, p)), r = L(g, g).sub(t.mul(t)), i = z(.5).mul(n.negate().add(Se(B(n.mul(n).sub(r.mul(4)), 0))));
			return {
				worldXZ: g.add(p.mul(i)).xz,
				t: i,
				shellRadius: t
			};
		}
		function ve(e, t, n, r, i) {
			let a = ae(t), o = be(t);
			return Ee(e.x.mul(a).sub(e.y.mul(o)), e.x.mul(o).add(e.y.mul(a))).add(m.mul(n)).div(r).add(i);
		}
		function Ce(e, t) {
			return {
				uvA: ve(e, t.seed, t.speed, t.featureSize, t.seed),
				uvB: ve(e, t.seed.add(s), t.morphSpeed, t.featureSize.mul(t.morphScale), t.seed.add(17.31))
			};
		}
		function we(e) {
			let { worldXZ: t, t: n, shellRadius: r } = he(e.altitude), { uvA: i, uvB: a } = Ce(t, e), o = e.morphBlend, s = z(1).div(Se(V(1, o).mul(V(1, o)).add(o.mul(o)))), c = {
				blend: o,
				norm: s,
				bias: z(.5).mul(V(1, s))
			}, l = R(z(16).mul(z(10).sub(r))), u = L(g, p).add(n).div(r), m = B(w.sub(l.mul(d(u))), 0), h = R(f.mul(m).negate()), _ = pe(i), v = pe(a);
			return {
				worldXZ: t,
				uvA: i,
				uvB: a,
				lodA: B(_, 0),
				lodB: B(v, 0),
				lodDetail: B(_.add(Math.log2(7)), 0),
				morph: c,
				shellDensity: l,
				airTransmit: h
			};
		}
		function H(e, t, n, r) {
			let { worldXZ: i, uvA: a, uvB: s, lodA: u, lodB: p, lodDetail: m, morph: h, shellDensity: g, airTransmit: _ } = t, v = re(a, s, u, p, m, h, e), y = V(1, R(v.negate())).toVar(), b = y.mul(V(2, y)), x = n.altitude.sub(e.altitude), S = B(x, 0), C = xe(z(0), z(.01), x).mul(n.enabled), w = u.add(ue(e.featureSize.div(n.featureSize))), ee = w.sub(ue(n.morphScale)), E = U(0).toVar();
			for (let t of T) ne(t.relevant, () => {
				let m = t.slope.div(e.featureSize).mul(o), _ = Ee(t.slope.x.mul(c).sub(t.slope.y.mul(l)), t.slope.x.mul(l).add(t.slope.y.mul(c))).div(e.featureSize.mul(e.morphScale)).mul(o), v = Ee(a).toVar(), y = Ee(s).toVar(), x = z(0).toVar();
				F(4, () => {
					v.addAssign(m), y.addAssign(_), x.addAssign(ie(v, y, u, p, h, e.coverage));
				});
				let T = x.mul(1 / 4).mul(e.density).mul(10).mul(t.pathLength).toVar(), D = Ce(i.add(t.slope.mul(S)), n);
				T.addAssign(ie(D.uvA, D.uvB, w, ee, r.morph, n.coverage).mul(n.density).mul(10).mul(.2).mul(t.pathLength).mul(C));
				let O = t.irradiance.mul(R(f.mul(g.mul(d(t.cosZenith))).negate())), k = z(0);
				for (let n = 0; n < 3; n += 1) k = k.add(z(.6 ** n).mul(Pt(e.phaseG.mul(.75 ** n), t.cosTheta)).mul(R(T.mul(.5 ** n).negate())));
				let A = xe(e.phaseG.sub(.3), de(e.phaseG.add(.2), .98), t.cosTheta);
				E.addAssign(O.mul(.06).mul(k).mul(fe(b, z(1), A)));
			});
			let D = M.mul(.9).mul(R(v.mul(.25).negate()));
			return {
				color: E.add(D).mul(_).add(M.mul(V(1, _))),
				alpha: y
			};
		}
		let De = we(n.cloudLow), W = we(n.cloudHigh), G = z(0).toVar(), Oe = z(0).toVar(), ke = U(0).toVar(), Ae = U(0).toVar();
		ne(p.y.greaterThan(0).and(n.cloudHigh.enabled.greaterThan(0)).and(n.cloudHigh.coverage.greaterThan(0)), () => {
			let e = H(n.cloudHigh, W, n.cloudLow, De);
			Oe.assign(e.alpha), Ae.assign(e.color);
		}), ne(p.y.greaterThan(0).and(n.cloudLow.enabled.greaterThan(0)).and(n.cloudLow.coverage.greaterThan(0)), () => {
			let e = H(n.cloudLow, De, n.cloudHigh, W);
			G.assign(e.alpha), ke.assign(e.color);
		});
		let je = n.cloudHigh.altitude.greaterThanEqual(n.cloudLow.altitude), Me = ye(je, Ae, ke), Ne = ye(je, Oe, G), Pe = ye(je, ke, Ae), Fe = ye(je, G, Oe);
		j.assign(fe(j, Me, Ne)), j.assign(fe(j, Pe, Fe)), j.addAssign(te.mul(V(1, Ne)).mul(V(1, Fe)));
		let Ie = R(n.mistDensity.mul(R(n.eyeHeight.div(n.mistHeight).negate())).div(B(p.y, .015)).negate()), Le = T.reduce((e, t) => e.add(t.irradiance.mul(t.groundTransmit).mul(z(.05).add(Pt(z(-.5), t.phaseCos).mul(.02)))), U(0));
		j.assign(j.mul(Ie).add(Le.mul(V(1, Ie))));
		let Re = U(G, Oe, G.mul(Oe)), ze = V(1, Ne).mul(V(1, Fe));
		return Lt(Re, j, N.mul(ze).mul(Ie));
	})(), m = P(() => {
		let e = p;
		return De(fe(V(1, R(e.get("radiance").mul(n.exposure).negate())), e.get("debugColor"), n.debugLayers), 1);
	})();
	function h(e) {
		u.value = e;
	}
	return {
		colorNode: m,
		sampleNode: p,
		uniforms: n,
		setFieldTexture: h,
		vertexNode: f
	};
}
//#endregion
//#region src/layer-addons/builtins/clouds.ts
function zt(e, t) {
	let n = N.MathUtils.degToRad(90 - e), r = N.MathUtils.degToRad(t), i = new N.Vector3().setFromSphericalCoords(1, n, r);
	return [
		i.x,
		i.y,
		i.z
	];
}
var Bt = {
	direction: zt(18, 180),
	directionLayerId: null,
	disc: !0,
	intensity: 20,
	tint: "#ffffff"
}, Vt = {
	cloudHigh: {
		altitude: .045,
		coverage: .5,
		density: .45,
		enabled: !0,
		featureSize: .09,
		morphBlend: .35,
		morphScale: 1.6,
		morphSpeed: -6e-5,
		phaseG: .7,
		speed: 9e-5
	},
	cloudLow: {
		altitude: .015,
		coverage: .55,
		density: .7,
		enabled: !0,
		featureSize: .05,
		morphBlend: .45,
		morphScale: 1.7,
		morphSpeed: -12e-5,
		phaseG: .7,
		speed: 1e-4
	},
	debugLayers: !1,
	exposure: 2,
	eyeHeight: .001,
	field: wt,
	km: .001,
	kr: .0025,
	mieDirectionalG: -.99,
	mistDensity: .04,
	mistHeight: .003,
	moon: {
		direction: zt(-30, 0),
		directionLayerId: null,
		disc: !0,
		intensity: .2,
		tint: "#fff2e0"
	},
	motionMode: "static",
	samples: 5,
	sun: Bt,
	time: 0
}, Ht = {
	cloudHigh: {
		altitude: .045,
		coverage: .48,
		density: .2,
		enabled: !0,
		featureSize: .09,
		morphBlend: .3,
		morphScale: 1.6,
		morphSpeed: -5e-5,
		phaseG: .44,
		speed: 9e-5
	},
	cloudLow: {
		altitude: .015,
		coverage: .66,
		density: .74,
		enabled: !0,
		featureSize: .225,
		morphBlend: .4,
		morphScale: 2,
		morphSpeed: -15e-5,
		phaseG: .83,
		speed: 22e-5
	},
	debugLayers: !1,
	exposure: 1,
	eyeHeight: .001,
	field: wt,
	km: .0104,
	kr: 7e-4,
	mieDirectionalG: -.956,
	mistDensity: .12,
	mistHeight: .004,
	moon: {
		direction: zt(11.1, 180),
		directionLayerId: null,
		disc: !1,
		intensity: 1.1,
		tint: "#bbdafb"
	},
	motionMode: "static",
	samples: 9,
	sun: {
		direction: zt(-12.8, 180),
		directionLayerId: null,
		disc: !1,
		intensity: 0,
		tint: "#ffffff"
	},
	time: 0
};
function Ut(e) {
	return {
		...e,
		cloudHigh: { ...e.cloudHigh },
		cloudLow: { ...e.cloudLow },
		field: { ...e.field },
		moon: {
			...e.moon,
			direction: [...e.moon.direction]
		},
		sun: {
			...e.sun,
			direction: [...e.sun.direction]
		}
	};
}
function Wt() {
	return Ut(Vt);
}
function Gt(e) {
	return [
		e.size,
		e.tiles,
		e.octaves,
		e.persistence,
		e.seed
	].join(":");
}
function Kt(e) {
	return {
		octaves: e.octaves,
		persistence: e.persistence,
		seed: e.seed,
		size: e.size,
		tiles: e.tiles
	};
}
function qt(e, t) {
	let n = /* @__PURE__ */ new Set(), r = !1, i = (e) => {
		e.forEach((e) => {
			if (e.type === "group") {
				i(e.children);
				return;
			}
			if (e.type !== "clouds") return;
			n.add(e.id);
			let a = Gt(e.params.field), o = t.get(e.id);
			if (o?.userData.cloudFieldKey === a || !e.enabled) return;
			let s = Mt(Kt(e.params.field));
			s.name = `Cloud field ${e.id}`, s.userData.cloudFieldKey = a, t.set(e.id, s), o?.dispose(), r = !0;
		});
	};
	return i(e.nodes), Array.from(t.entries()).forEach(([e, i]) => {
		n.has(e) || (i.dispose(), t.delete(e), r = !0);
	}), r;
}
function Jt(e) {
	e.forEach((e) => e.dispose()), e.clear();
}
function Yt(e, t) {
	e?.sampleData.forEach((e, n) => {
		let r = t.get(n);
		r && e.model.setFieldTexture(r);
	});
}
function Xt(e, t) {
	t.direction.value.set(...e.direction).normalize(), t.intensity.value = e.intensity, t.tint.value.set(e.tint), t.showDisc.value = +!!e.disc;
}
function Zt(e, t) {
	t.enabled.value = +!!e.enabled, t.altitude.value = e.altitude, t.featureSize.value = e.featureSize, t.speed.value = e.speed, t.morphBlend.value = e.morphBlend, t.morphScale.value = e.morphScale, t.morphSpeed.value = e.morphSpeed, t.coverage.value = e.coverage, t.density.value = e.density, t.phaseG.value = e.phaseG;
}
function Qt(e, t) {
	e.uniforms.kr.value = t.kr, e.uniforms.km.value = t.km, e.uniforms.mieDirectionalG.value = t.mieDirectionalG, e.uniforms.samples.value = Math.round(t.samples), e.uniforms.eyeHeight.value = t.eyeHeight, e.uniforms.mistDensity.value = t.mistDensity, e.uniforms.mistHeight.value = t.mistHeight, e.uniforms.exposure.value = t.exposure, e.uniforms.fieldSize.value = t.field.size, e.uniforms.debugLayers.value = +!!t.debugLayers, Xt(t.sun, e.uniforms.sun), Xt(t.moon, e.uniforms.moon), Zt(t.cloudLow, e.uniforms.cloudLow), Zt(t.cloudHigh, e.uniforms.cloudHigh);
}
function $t(e) {
	let t = [], n = (e) => {
		e.forEach((e) => {
			if (e.enabled) {
				if (e.type === "group") n(e.children);
				else if (e.type === "clouds") {
					let n = t.length;
					t.push({
						index: n,
						layer: e,
						parameterPrefix: `cloudsLayer${n}`
					});
				}
			}
		});
	};
	return n(e), t;
}
function en(e) {
	return e.map((e) => ({
		layerId: e.layer.id,
		model: null,
		motionMode: e.layer.params.motionMode,
		time: null
	}));
}
function tn({ bindings: e, direction: t, resourceTextures: n, uniforms: r }) {
	let i = /* @__PURE__ */ new Map(), a = {}, o = {};
	return e.forEach((e, s) => {
		let c = e.layer.params, l = n.get(e.layer.id);
		if (!l) return;
		let u = H(c.time), d = Rt(l, {
			direction: t,
			time: u
		});
		Qt(d, c), r[s].model = d, r[s].time = u;
		let f = {
			model: d,
			sampleNode: d.sampleNode,
			time: u
		};
		i.set(e.layer.id, f), a[e.layer.id] = d.sampleNode, o[e.layer.id] = l;
	}), {
		sampleData: i,
		sampleNodesByLayerId: a,
		textureSlots: o
	};
}
function nn(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n?.model && (Qt(n.model, t.params), n.motionMode = t.params.motionMode, t.params.motionMode === "static" && n.time && (n.time.value = t.params.time));
}
function rn(e, t) {
	e.forEach((e) => {
		e.time && e.motionMode === "dynamic" && (e.time.value = t);
	});
}
function an(e) {
	let t = e.parameterPrefix;
	return `{
    let cloudsRadiance = ${t}Radiance;
    let cloudsTransmission = ${t}Transmission;
    let cloudsPhysical = vec3<f32>(1.0) - exp(
      -${t}Exposure * (cloudsRadiance + composedColor * cloudsTransmission)
    );
    let cloudsMapped = mix(cloudsPhysical, ${t}DebugColor, ${t}DebugLayers);
    // The source model deliberately writes its HDR curve straight to a
    // Linear-sRGB canvas. Skybox Studio writes through an sRGB output
    // transform, so decode that exact display value here to avoid applying
    // an extra gamma curve in the host renderer.
    let cloudsMappedClamped = clamp(cloudsMapped, vec3<f32>(0.0), vec3<f32>(1.0));
    let cloudsSceneLinear = select(
      pow(
        (cloudsMappedClamped + vec3<f32>(0.055)) / vec3<f32>(1.055),
        vec3<f32>(2.4)
      ),
      cloudsMappedClamped / vec3<f32>(12.92),
      cloudsMappedClamped <= vec3<f32>(0.04045)
    );
    effectColor = vec4<f32>(cloudsSceneLinear, 1.0);
  }`;
}
var on = {
	collect: $t,
	createCoverageExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id), i = n.opacityRef ?? (e.opacity / 100).toFixed(8);
		return r ? `transmissionAbove = transmissionAbove * mix(
          vec3<f32>(1.0),
          ${r.parameterPrefix}Transmission,
          vec3<f32>(${i})
        );` : "";
	},
	createParameterDeclarations: (e) => e.flatMap((e) => [
		`,\n      ${e.parameterPrefix}DebugColor: vec3<f32>`,
		`,\n      ${e.parameterPrefix}DebugLayers: f32`,
		`,\n      ${e.parameterPrefix}Exposure: f32`,
		`,\n      ${e.parameterPrefix}Radiance: vec3<f32>`,
		`,\n      ${e.parameterPrefix}Transmission: vec3<f32>`
	]).join(""),
	createSampleExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id);
		return r ? an(r) : St();
	},
	createSampleNodes: tn,
	createSampleParameters: (e, t, n) => {
		let r = n;
		return Object.fromEntries(e.flatMap((e) => {
			let n = t[e.index].model, i = r?.sampleData.get(e.layer.id)?.sampleNode;
			return !n || !i ? [] : [
				[`${e.parameterPrefix}DebugColor`, i.get("debugColor")],
				[`${e.parameterPrefix}DebugLayers`, n.uniforms.debugLayers],
				[`${e.parameterPrefix}Exposure`, n.uniforms.exposure],
				[`${e.parameterPrefix}Radiance`, i.get("radiance")],
				[`${e.parameterPrefix}Transmission`, i.get("transmission")]
			];
		}));
	},
	createUniforms: en,
	getTopologyKey: () => ({}),
	type: "clouds",
	updateTime: rn,
	updateUniforms: nn
};
w({
	type: "clouds",
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: on,
	getTopologyKey: (e) => on.getTopologyKey(e)
});
//#endregion
//#region src/skybox/stops.ts
function sn(e) {
	return [...e.stops].map((e) => ({
		color: e.color,
		midpoint: O((e.midpoint ?? 50) / 100, .01, .99),
		opacity: O(e.opacity / 100),
		t: O(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function cn(t) {
	let [n, r, i] = e(t.color);
	return new N.Vector4(n, r, i, t.opacity);
}
//#endregion
//#region src/layer-addons/builtins/gradient.ts
function ln(e) {
	let t = e * Math.PI / 180;
	return [
		Math.sin(t),
		Math.cos(t),
		0
	];
}
function un(e, t) {
	let n = ln(t.rotation), r = e[0] * n[0] + e[1] * n[1] + e[2] * n[2];
	return h(o(t.stops), r * .5 + .5);
}
function dn(e) {
	let t = e * Math.PI / 180;
	return new N.Vector3(Math.sin(t), Math.cos(t), 0).normalize();
}
function fn(e) {
	return e.map((e) => {
		let t = sn(e.layer.params);
		return {
			axis: H(dn(e.layer.params.rotation)),
			layerId: e.layer.id,
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: H(cn(r)),
					midpoint: H(r.midpoint),
					t: H(r.t)
				};
			})
		};
	});
}
function pn(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = sn(t.params);
	n.axis.value.copy(dn(t.params.rotation)), n.stops.forEach((e, t) => {
		let n = r[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(cn(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
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
function hn(e) {
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
var gn = {
	collect: mn,
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
		return r ? hn(r) : St();
	},
	createSampleParameters: (e, t) => Object.fromEntries(e.flatMap((e) => {
		let n = t[e.index];
		return [[`${e.parameterPrefix}Axis`, n.axis], ...Array.from({ length: e.stopCount }, (t, r) => [
			[`${e.parameterPrefix}StopColor${r}`, n.stops[r].color],
			[`${e.parameterPrefix}StopMidpoint${r}`, n.stops[r].midpoint],
			[`${e.parameterPrefix}StopT${r}`, n.stops[r].t]
		]).flat()];
	})),
	createUniforms: fn,
	getTopologyKey: (e) => ({
		mode: e.params.mode,
		stopCount: e.params.stops.length
	}),
	type: "gradient",
	updateUniforms: pn
};
w({
	type: "gradient",
	sampleCpu: (e, t) => un(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: gn,
	getTopologyKey: (e) => gn.getTopologyKey(e)
});
//#endregion
//#region src/skybox/colors.ts
function _n(t) {
	let [n, r, i] = e(t);
	return new N.Vector3(n, r, i);
}
//#endregion
//#region src/layer-addons/builtins/field-gradient.ts
function vn(t, n) {
	if (n.anchors.length === 0) return [
		0,
		0,
		0,
		0
	];
	let r = i(t, O(n.amplitude, 0, .6), Math.max(1e-4, n.frequency)), a = 0, o = 0, s = 0, c = 0;
	return n.anchors.forEach((t) => {
		let i = f(r, ee(t.x, t.y)), l = n.mode === "gaussian" ? Math.exp(-(i * i) / (2 * (.46 / n.power) ** 2)) : 1 / (i + 5e-4) ** n.power, u = e(t.color);
		a += u[0] * l, o += u[1] * l, s += u[2] * l, c += l;
	}), c <= 0 ? [
		0,
		0,
		0,
		0
	] : [
		a / c,
		o / c,
		s / c,
		1
	];
}
function yn(e) {
	return +(e === "gaussian");
}
function bn(e, t) {
	let n = (O(e) - .5) * Math.PI * 2, r = (.5 - O(t)) * Math.PI, i = Math.cos(r);
	return new N.Vector3(i * Math.cos(n), Math.sin(r), i * Math.sin(n)).normalize();
}
function xn(e) {
	return e.map((e) => ({
		amplitude: H(O(e.layer.params.amplitude, 0, .6)),
		anchors: Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return {
				color: H(_n(r.color)),
				direction: H(bn(r.x, r.y))
			};
		}),
		frequency: H(Math.max(1e-4, e.layer.params.frequency)),
		layerId: e.layer.id,
		mode: H(yn(e.layer.params.mode)),
		power: H(Math.max(1e-4, e.layer.params.power))
	}));
}
function Sn(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n && (n.amplitude.value = O(t.params.amplitude, 0, .6), n.frequency.value = Math.max(1e-4, t.params.frequency), n.mode.value = yn(t.params.mode), n.power.value = Math.max(1e-4, t.params.power), n.anchors.forEach((e, n) => {
		let r = t.params.anchors[n] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.color.value.copy(_n(r.color)), e.direction.value.copy(bn(r.x, r.y));
	}));
}
function Cn(e) {
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
function wn(e) {
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
    ${bt("fieldDirection", "vec3<f32>", "direction")}
    let warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      let warpX = sin((direction.y * warpFrequency + 0.23) * ${q(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${q(Math.PI * 2)});
      let warpY = cos((direction.z * warpFrequency + 0.17) * ${q(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${q(Math.PI * 2)});
      let warpZ = sin((direction.x * warpFrequency - 0.31) * ${q(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${q(Math.PI * 2)});
      fieldDirection = normalize(direction + vec3<f32>(warpX, warpY, warpZ) * warpScale);
    }
    ${bt("weightedColor", "vec3<f32>", "vec3<f32>(0.0)")}
    ${bt("weightSum", "f32", "0.0")}
    ${t}
    if (weightSum > 0.0) {
      effectColor = vec4<f32>(weightedColor / weightSum, 1.0);
    } else {
      effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
var Tn = {
	collect: Cn,
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
		return r ? wn(r) : St();
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
	createUniforms: xn,
	getTopologyKey: (e) => ({ anchorCount: e.params.anchors.length }),
	type: "field-gradient",
	updateUniforms: Sn
};
w({
	type: "field-gradient",
	sampleCpu: (e, t) => vn(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Tn,
	getTopologyKey: (e) => Tn.getTopologyKey(e)
});
//#endregion
//#region src/skybox/empty-texture.ts
var En = new N.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, N.RGBAFormat);
En.colorSpace = N.SRGBColorSpace, En.needsUpdate = !0;
//#endregion
//#region src/skybox/overlay.ts
var Dn = .18, On = .75, kn = 1.75, An = 1e-4, jn = .01;
//#endregion
//#region src/layer-addons/builtins/image.ts
function Mn(e, t) {
	let n = t.placement;
	if (!n || !t.pixels || t.width <= 0 || t.height <= 0) return [
		0,
		0,
		0,
		0
	];
	let r = rt(e, n);
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
	return p(p(M(t, c, l), M(t, u, l), f), p(M(t, c, d), M(t, u, d), f), m);
}
function Nn(e) {
	if (!e) return {
		centerDirection: new N.Vector3(0, 0, -1),
		halfSize: new N.Vector2(0, 0),
		tangentX: new N.Vector3(1, 0, 0),
		tangentY: new N.Vector3(0, 1, 0)
	};
	let t = Ye(e);
	return {
		centerDirection: new N.Vector3(...t.centerDirection),
		halfSize: new N.Vector2(Math.max(0, Math.tan(t.angularWidth / 2)), Math.max(0, Math.tan(t.angularHeight / 2))),
		tangentX: new N.Vector3(...t.tangentX),
		tangentY: new N.Vector3(...t.tangentY)
	};
}
function Pn(e) {
	return e.map((e) => {
		let t = Nn(e.layer.params.placement);
		return {
			centerDirection: H(t.centerDirection),
			halfSize: H(t.halfSize),
			layerId: e.layer.id,
			tangentX: H(t.tangentX),
			tangentY: H(t.tangentY)
		};
	});
}
function Fn(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = Nn(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function In(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function Ln(e) {
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
function Rn(e, t) {
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
      let imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${q(jn)});
      let imageHardInside = step(${q(An)}, imageDenom) *
        step(0.0, ${t.halfSize}.x) *
        step(0.0, ${t.halfSize}.y);
      let imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      let imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return vec4<f32>(imageU, imageV, imageValid, 0.0);
    `;
}
function zn(e) {
	return W(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${Rn(e, {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var Bn = W("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n");
function Vn(e, t) {
	return e.get(t.id) ?? En;
}
function Hn(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? En;
	});
}
function Un(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	return {
		sampleData: i,
		sampleNodes: Object.fromEntries(e.map((e) => {
			let a = r[e.index], o = zn(e)({
				direction: t,
				imageCenterDirection: a.centerDirection,
				imageHalfSize: a.halfSize,
				imageTangentX: a.tangentX,
				imageTangentY: a.tangentY
			}), s = Ee(o.x, o.y), c = we(Vn(n, e.layer), s).setName(`imageTexture${e.index}`);
			c.getUniformHash = () => `skybox-image-texture:${e.layer.id}`;
			let l = Bn({
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
var Wn = {
	collect: Ln,
	createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
	createSampleExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id);
		return r ? `effectColor = ${r.parameterName};` : St();
	},
	createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, uniforms: r }) => {
		let i = Un(e, t, n, r);
		return {
			editorProjectionByLayerId: new Map(Array.from(i.sampleData.entries()).map(([e, t]) => [e, {
				uv: Ee(t.sampleInfo.x, t.sampleInfo.y),
				valid: t.sampleInfo.z
			}])),
			sampleData: i.sampleData,
			sampleNodesByLayerId: Object.fromEntries(e.map((e) => [e.layer.id, i.sampleNodes[e.parameterName]])),
			sampleNodesByParameterName: i.sampleNodes,
			textureSlots: Object.fromEntries(Array.from(i.sampleData.entries()).map(([e, t]) => [e, t.textureNode]))
		};
	},
	createSampleParameters: (e, t, n) => n?.sampleNodesByParameterName ?? {},
	createUniforms: Pn,
	getTopologyKey: (e) => ({
		hasPlacement: !!e.params.placement,
		hasSrc: !!e.params.src,
		height: e.params.height,
		width: e.params.width
	}),
	type: "image",
	updateUniforms: (e, t) => Fn(e, t.id, t.params.placement)
};
w({
	type: "image",
	sampleCpu: (e, t) => Mn(e, t),
	updateLive: (e, t) => e.applyImagePlacement(t.id, t.params.placement),
	wgsl: Wn,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => Wn.getTopologyKey(e)
});
//#endregion
//#region src/layer-addons/builtins/moon.ts
function Gn(e) {
	let t = Ye(e);
	return {
		centerDirection: new N.Vector3(...t.centerDirection),
		halfSize: new N.Vector2(Math.max(0, Math.tan(t.angularWidth / 2)), Math.max(0, Math.tan(t.angularHeight / 2))),
		tangentX: new N.Vector3(...t.tangentX),
		tangentY: new N.Vector3(...t.tangentY)
	};
}
function Kn(e) {
	return e.map((e) => {
		let t = Gn(e.layer.params.placement);
		return {
			centerDirection: H(t.centerDirection),
			halfSize: H(t.halfSize),
			layerId: e.layer.id,
			tangentX: H(t.tangentX),
			tangentY: H(t.tangentY)
		};
	});
}
function qn(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = Gn(n);
	r.centerDirection.value.copy(i.centerDirection), r.halfSize.value.copy(i.halfSize), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY);
}
function Jn(e) {
	let t = [], n = (e) => {
		e.forEach((e) => {
			if (e.enabled) {
				if (e.type === "group") n(e.children);
				else if (e.type === "moon") {
					let n = t.length;
					t.push({
						index: n,
						layer: e,
						parameterName: `moonLayer${n}`
					});
				}
			}
		});
	};
	return n(e), t;
}
var Yn = W(`
  fn skyboxStudioMoonSampleInfo(
    direction: vec3<f32>,
    centerDirection: vec3<f32>,
    tangentX: vec3<f32>,
    tangentY: vec3<f32>,
    halfSize: vec2<f32>
  ) -> vec4<f32> {
    let sampleDirection = normalize(direction);
    let denom = dot(sampleDirection, centerDirection);
    let safeDenom = max(denom, 0.000001);
    let projectedX = dot(sampleDirection, tangentX) / safeDenom;
    let projectedY = dot(sampleDirection, tangentY) / safeDenom;
    let u = projectedX / max(halfSize.x * 2.0, 0.000001) + 0.5;
    let v = projectedY / max(halfSize.y * 2.0, 0.000001) + 0.5;
    let edgeDistance = min(min(u, 1.0 - u), min(v, 1.0 - v));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${q(.05)});
    let valid = step(0.000001, denom) *
      step(0.0, halfSize.x) *
      step(0.0, halfSize.y) *
      step(-edgeWidth, edgeDistance) *
      smoothstep(-edgeWidth, edgeWidth, edgeDistance);
    return vec4<f32>(u, v, valid, 0.0);
  }
`), Xn = W("\n  fn skyboxStudioApplyMoonMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n");
function Zn(e, t) {
	e?.sampleData.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? En;
	});
}
w({
	type: "moon",
	getTopologyKey: () => ({}),
	updateLive: (e, t) => {
		e.applyLayerParams(t), e.scheduleResourceBake(t.id, t.params);
	},
	wgsl: {
		collect: Jn,
		createParameterDeclarations: (e) => e.map((e) => `,\n      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : St();
		},
		createSampleNodes: ({ bindings: e, direction: t, resourceTextures: n, uniforms: r }) => {
			let i = /* @__PURE__ */ new Map(), a = Object.fromEntries(e.map((e) => {
				let a = r[e.index], o = Yn({
					centerDirection: a.centerDirection,
					direction: t,
					halfSize: a.halfSize,
					tangentX: a.tangentX,
					tangentY: a.tangentY
				}), s = we(n.get(e.layer.id) ?? En, Ee(o.x, o.y)).setName(`moonTexture${e.index}`);
				s.getUniformHash = () => `skybox-moon-texture:${e.layer.id}`;
				let c = Xn({
					color: s,
					valid: o.z
				});
				return i.set(e.layer.id, {
					sampleInfo: o,
					sampleNode: c,
					textureNode: s
				}), [e.parameterName, c];
			}));
			return {
				editorProjectionByLayerId: new Map(Array.from(i.entries()).map(([e, t]) => [e, {
					uv: Ee(t.sampleInfo.x, t.sampleInfo.y),
					valid: t.sampleInfo.z
				}])),
				sampleData: i,
				sampleNodesByParameterName: a,
				textureSlots: Object.fromEntries(Array.from(i.entries()).map(([e, t]) => [e, t.textureNode]))
			};
		},
		createSampleParameters: (e, t, n) => n?.sampleNodesByParameterName ?? {},
		createUniforms: Kn,
		getTopologyKey: () => ({}),
		type: "moon",
		updateUniforms: (e, t) => qn(e, t.id, t.params.placement)
	},
	wgslEditorOverlay: !0
});
//#endregion
//#region src/spot-transform.ts
var Qn = Math.PI / 12;
function J(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function $n(e) {
	return e * 180 / Math.PI;
}
function er(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function tr() {
	return {
		angularRadius: Qn,
		baseAngularRadius: Qn,
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
function nr(e) {
	let t = e, n = tr(), r = Math.max(1e-4, typeof t?.baseAngularRadius == "number" ? t.baseAngularRadius : n.baseAngularRadius);
	return {
		angularRadius: Math.max(1e-4, typeof t?.angularRadius == "number" ? t.angularRadius : r),
		baseAngularRadius: r,
		brightness: Math.max(0, typeof t?.brightness == "number" ? t.brightness : n.brightness),
		centerDirection: K(t?.centerDirection, n.centerDirection),
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
function rr(e) {
	let t = K(e.centerDirection);
	return {
		x: er($n(Math.atan2(t[0], -t[2]))),
		y: $n(Math.asin(J(t[1], -1, 1)))
	};
}
function ir(e, t) {
	return {
		...nr(e),
		centerDirection: Ze({
			x: t.x,
			y: J(t.y, -Fe, Fe)
		})
	};
}
function ar(e) {
	let t = nr(e);
	return t.angularRadius / t.baseAngularRadius;
}
function or(e, t) {
	let n = nr(e);
	return {
		...n,
		angularRadius: Math.max(1e-4, n.baseAngularRadius * Math.max(1e-4, t))
	};
}
function sr(e, t) {
	let n = nr(t), r = K(e), i = K(n.centerDirection), a = r[0] * i[0] + r[1] * i[1] + r[2] * i[2];
	return Math.acos(J(a, -1, 1)) <= n.angularRadius;
}
//#endregion
//#region src/skybox/editor-presentation.ts
var cr = {
	hoveredLayerId: null,
	selectedLayerId: null
};
function lr(e, t) {
	return +(t === e);
}
function ur(e, t) {
	return +(t === e);
}
function dr(e, t) {
	return Math.max(lr(e, t.hoveredLayerId), ur(e, t.selectedLayerId));
}
function fr(e, t) {
	return e.map((e) => ({
		active: H(dr(e.layer.id, t)),
		layerId: e.layer.id
	}));
}
function pr(e, t) {
	e.forEach((e) => {
		e.active.value = dr(e.layerId, t);
	});
}
function mr(e, t) {
	e.userData.applyEditorLayerState = t;
}
var hr = W(`
  fn skyboxStudioApplyImageEditorRectOverlay(
    color: vec4<f32>,
    uv: vec2<f32>,
    valid: f32,
    activeValue: f32
  ) -> vec4<f32> {
    let activeAmount = clamp(activeValue, 0.0, 1.0);
    let rectCoverage = valid * activeAmount;
    let edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${q(jn)});
    let bounds = rectCoverage * (
      1.0 - smoothstep(
        edgeWidth * ${q(On)},
        edgeWidth * ${q(kn)},
        edgeDistance
      )
    );
    let rectAlpha = rectCoverage * ${q(Dn)};
    let overlayAlpha = max(rectAlpha, bounds);
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), overlayAlpha),
      color.a
    );
  }
`), gr = W(`
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
    let spotEdgeWidth = clamp(fwidth(spotEdgeDistance), 0.000001, ${q(jn)});
    let spotValid = step(${q(An)}, spotDenom) *
      step(-spotEdgeWidth, spotEdgeDistance) *
      smoothstep(-spotEdgeWidth, spotEdgeWidth, spotEdgeDistance);

    return vec4<f32>(spotU, spotV, spotValid, 0.0);
  }
`);
//#endregion
//#region src/layer-addons/builtins/spot.ts
function _r(i, s) {
	let c = nr(s), u = r(i), f = r(c.centerDirection), p = t(u, f), m = Math.acos(O(p, -1, 1)), y = Math.max(c.angularRadius, 1e-4), b = m / y;
	if (c.colorMode === "gradient") return b > 1 ? [
		0,
		0,
		0,
		0
	] : h(o(c.stops), b);
	let x = l(i, f, y), S = x.d, C = e(c.lightColor), w = c.brightness, ee = O(1 - S / c.coreRadius) ** +c.coreSoftness, E = O(1 - S / c.glowSize) ** 2 * c.glowStrength, D = O(1 - S / c.glareSize) ** 1.15 * c.glareStrength, k = (ee + E + D) * w, A = _(C, k);
	A = n(A, [
		Math.max(k - 1, 0),
		Math.max(k - 1, 0),
		Math.max(k - 1, 0)
	]);
	let j = Math.max(c.haloInnerWidth, 1e-4), M = Math.max(c.haloOuterWidth, 1e-4), N = S - c.haloRadius, te = Math.exp(-v(N / (N < 0 ? j : M))), P = T(d([
		1,
		1,
		1
	], g(O((S - (c.haloRadius - j)) / (j + M))), c.dispersion), C), ne = te * c.haloStrength * w;
	A = n(A, _(P, ne)), A = n(A, _([
		1,
		1,
		1
	], Math.max(ne - 1.2, 0) * .22));
	let F = Math.abs(x.y), I = Math.abs(x.x), re = Math.exp(-v((I - c.haloRadius) / Math.max(c.dogSpread, 1e-4))) * Math.exp(-v(F / Math.max(c.dogSpread * .72, 1e-4))), ie = a(c.haloRadius, c.haloRadius + Math.max(c.dogStretch, 1e-4), I) * (1 - a(c.haloRadius + Math.max(c.dogStretch, 1e-4), c.haloRadius + Math.max(c.dogStretch * 2.2, 1e-4), I)) * Math.exp(-v(F / Math.max(c.dogSpread * .9, 1e-4))), ae = T(d([
		1,
		1,
		1
	], g(O((I - (c.haloRadius - c.dogSpread * 1.4)) / Math.max(c.dogSpread * 3.5, 1e-4))), c.dispersion), C), oe = (re + ie * .28) * c.dogStrength * w;
	A = n(A, _(ae, oe)), A = n(A, _([
		1,
		1,
		1
	], Math.max(oe - 1.1, 0) * .18));
	let se = O(Math.max(A[0], A[1], A[2]));
	return se <= 1e-5 ? [
		0,
		0,
		0,
		0
	] : [
		A[0] / se,
		A[1] / se,
		A[2] / se,
		se
	];
}
function vr(e) {
	return +(e === "gradient");
}
function yr(e) {
	let t = nr(e);
	return {
		brightness: Math.max(0, t.brightness),
		centerDirection: new N.Vector3(...t.centerDirection).normalize(),
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
		lightColor: _n(t.lightColor),
		mode: vr(t.colorMode),
		radius: Math.max(1e-4, t.angularRadius),
		stops: sn(t)
	};
}
function br(e) {
	return e.map((e) => {
		let t = yr(e.layer.params);
		return {
			brightness: H(t.brightness),
			centerDirection: H(t.centerDirection),
			coreRadius: H(t.coreRadius),
			coreSoftness: H(t.coreSoftness),
			dispersion: H(t.dispersion),
			dogSpread: H(t.dogSpread),
			dogStrength: H(t.dogStrength),
			dogStretch: H(t.dogStretch),
			glareSize: H(t.glareSize),
			glareStrength: H(t.glareStrength),
			glowSize: H(t.glowSize),
			glowStrength: H(t.glowStrength),
			haloInnerWidth: H(t.haloInnerWidth),
			haloOuterWidth: H(t.haloOuterWidth),
			haloRadius: H(t.haloRadius),
			haloStrength: H(t.haloStrength),
			layerId: e.layer.id,
			lightColor: H(t.lightColor),
			mode: H(t.mode),
			radius: H(t.radius),
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t.stops[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: H(cn(r)),
					midpoint: H(r.midpoint),
					t: H(r.t)
				};
			})
		};
	});
}
function xr(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = yr(t.params);
	n.brightness.value = r.brightness, n.centerDirection.value.copy(r.centerDirection), n.coreRadius.value = r.coreRadius, n.coreSoftness.value = r.coreSoftness, n.dispersion.value = r.dispersion, n.dogSpread.value = r.dogSpread, n.dogStrength.value = r.dogStrength, n.dogStretch.value = r.dogStretch, n.glareSize.value = r.glareSize, n.glareStrength.value = r.glareStrength, n.glowSize.value = r.glowSize, n.glowStrength.value = r.glowStrength, n.haloInnerWidth.value = r.haloInnerWidth, n.haloOuterWidth.value = r.haloOuterWidth, n.haloRadius.value = r.haloRadius, n.haloStrength.value = r.haloStrength, n.lightColor.value.copy(r.lightColor), n.mode.value = r.mode, n.radius.value = r.radius, n.stops.forEach((e, t) => {
		let n = r.stops[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(cn(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function Sr(e) {
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
function Cr(e) {
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
function wr(e) {
	let t = `${e.parameterPrefix}Mode > 0.5`, n = Cr(e);
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
      ${bt("spotColor", "vec3<f32>", `${e.parameterPrefix}LightColor * spotMonoLight + vec3<f32>(max(spotMonoLight - 1.0, 0.0))`)}

      let spotHaloInner = max(${e.parameterPrefix}HaloInnerWidth, 0.0001);
      let spotHaloOuter = max(${e.parameterPrefix}HaloOuterWidth, 0.0001);
      let spotHaloDelta = spotD - ${e.parameterPrefix}HaloRadius;
      let spotHaloWidth = select(spotHaloOuter, spotHaloInner, spotHaloDelta < 0.0);
      let spotHaloEnvelope = exp(-pow(spotHaloDelta / spotHaloWidth, 2.0));
      let spotHaloT = clamp((spotD - (${e.parameterPrefix}HaloRadius - spotHaloInner)) / (spotHaloInner + spotHaloOuter), 0.0, 1.0);
      ${bt("spotSpectrum", "vec3<f32>", "vec3<f32>(1.0, 0.12, 0.05)")}
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
      ${bt("spotDogSpectrum", "vec3<f32>", "vec3<f32>(1.0, 0.12, 0.05)")}
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
var Tr = {
	collect: Sr,
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
		return r ? wr(r) : St();
	},
	createSampleNodes: ({ bindings: e, direction: t, uniforms: n }) => ({ editorProjectionByLayerId: new Map(e.map((e) => {
		let r = n[e.index], i = gr({
			direction: t,
			spotCenterDirection: r.centerDirection,
			spotRadius: r.radius
		});
		return [e.layer.id, {
			uv: Ee(i.x, i.y),
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
	createUniforms: br,
	getTopologyKey: (e) => ({ stopCount: e.params.stops.length }),
	type: "spot",
	updateUniforms: xr
};
w({
	type: "spot",
	sampleCpu: (e, t) => _r(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Tr,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => Tr.getTopologyKey(e)
});
//#endregion
//#region src/layer-addons/builtins/starfield.ts
function Er(e) {
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
function Dr(e) {
	e.userData.starfieldRenderTarget || e.dispose();
}
function Or(e, t) {
	return e.get(t.id) ?? En;
}
function kr(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? En;
	});
}
function Ar(e, t) {
	e.forEach((e, n) => {
		e.screenTextureNode.value = t.get(n) ?? En;
	});
}
var jr = W("\n  fn skyboxStudioDirectionToSourceStarfieldUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let theta = atan2(normalizedDirection.x, normalizedDirection.z);\n    let u = fract(theta / 6.283185307179586 + 0.5);\n    let v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / 3.141592653589793;\n\n    return vec2<f32>(u, v);\n  }\n"), Mr = W("\n  fn skyboxStudioCombineStarfieldSample(\n    backdrop: vec4<f32>,\n    screenStars: vec4<f32>\n  ) -> vec4<f32> {\n    return vec4<f32>(backdrop.rgb + screenStars.rgb, max(backdrop.a, screenStars.a));\n  }\n");
w({
	type: "starfield",
	updateLive: (e, t) => {
		e.applyLayerParams(t), e.scheduleResourceBake(t.id, t.params);
	},
	wgsl: {
		collect: Er,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : St();
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, resourceTextures: r }) => {
			let i = n, a = /* @__PURE__ */ new Map(), o = Object.fromEntries(e.map((e) => {
				let n = jr({ direction: t }), o = we(Or(i, e.layer), n).setName(`starfieldTexture${e.index}`);
				o.getUniformHash = () => `skybox-starfield-texture:${e.layer.id}`;
				let s = we(r.get(e.layer.id) ?? En, ve).setName(`starfieldScreenTexture${e.index}`);
				s.getUniformHash = () => `skybox-starfield-screen-texture:${e.layer.id}`;
				let c = Mr({
					backdrop: o,
					screenStars: s
				});
				return a.set(e.layer.id, {
					sampleNode: c,
					screenTextureNode: s,
					textureNode: o
				}), [e.parameterName, c];
			}));
			return {
				sampleData: a,
				sampleNodesByLayerId: Object.fromEntries(e.map((e) => [e.layer.id, o[e.parameterName]])),
				sampleNodesByParameterName: o,
				textureSlots: Object.fromEntries(Array.from(a.entries()).map(([e, t]) => [e, t.textureNode]))
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
function Nr(e, t, n = {}) {
	let r = j(t.type);
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
function Pr(e, t, n = {}) {
	return t.filter((e) => e.enabled).reverse().reduce((t, r) => {
		let i = r.type === "group" ? [...Pr(e, r.children, n), 1] : Nr(e, r, n), a = O(i[3] * (r.opacity / 100));
		return b(t, [
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
function Fr(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = Fr(n.children, t);
		if (e) return e;
	}
	return null;
}
function Ir(e, t, n = {}) {
	let r = mt(e), i = n.targetGroupId ? Fr(r.nodes, n.targetGroupId) : null;
	return Pr(t, n.targetGroupId ? i ? [i] : [] : r.nodes, n);
}
//#endregion
//#region src/baking/bake.ts
var Lr = 1024, Rr = "0.1.1", zr = /* @__PURE__ */ new Map(), Br = /* @__PURE__ */ new Map();
function Vr(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function Hr(e, t) {
	return y(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: Rr
	}));
}
function Ur() {
	zr.clear(), Br.clear();
}
function Wr(e, t = []) {
	return e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Wr(e.children, t);
				return;
			}
			e.type === "starfield" && t.push(e);
		}
	}), t;
}
function Gr(e, t) {
	for (let n of e) {
		if (n.type !== "group") continue;
		if (n.id === t) return n;
		let e = Gr(n.children, t);
		if (e) return e;
	}
	return null;
}
function Kr(e) {
	return e.some((e) => e.enabled && (e.type === "moon" || e.type === "group" && Kr(e.children)));
}
function qr(e, t, n, r, i) {
	let a = Wr(r ? Gr(e.nodes, r)?.children ?? [] : e.nodes);
	if (a.length === 0) return;
	let o = /* @__PURE__ */ new Map();
	return a.forEach((e) => {
		let r = i?.get(e.id);
		if (r) {
			o.set(e.id, r);
			return;
		}
		let a = E(e.params, t, n), s = Br.get(a), c = s ?? S(e.params, t, n);
		s || Br.set(a, c), o.set(e.id, c);
	}), o;
}
function Jr(e, t = {}) {
	let n = mt(e), r = Vr(t);
	if (Kr(r.targetGroupId ? Gr(n.nodes, r.targetGroupId)?.children ?? [] : n.nodes)) throw Error("Moon layers require WebGPU compute and are not supported by the CPU baker.");
	let i = r.cache ? Hr(n, r) : null;
	if (i) {
		let e = zr.get(i);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: a, targetGroupId: o, width: s } = r, c = qr(n, s, a, o, t.starfieldBakes), l = new Uint8ClampedArray(s * a * 4);
	for (let e = 0; e < a; e += 1) {
		let t = (e + .5) / a;
		for (let r = 0; r < s; r += 1) {
			let [i, d, f] = m(Ir(n, u((r + .5) / s, t), {
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
	return i && zr.set(i, {
		...d,
		data: new Uint8ClampedArray(l)
	}), d;
}
//#endregion
//#region src/skybox/composition.ts
function Yr(e) {
	return e.filter((e) => e.enabled).reverse();
}
function Xr(e) {
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
function Zr(e) {
	return {
		blendMode: Xr(e.blendMode),
		opacity: O(e.opacity / 100)
	};
}
function Qr(e) {
	return `select(1.055 * pow(${e}, ${yt(1 / 2.4)}) - ${yt(.055)}, ${e} * 12.92, ${e} <= ${yt(.0031308)})`;
}
function $r(e) {
	return `select(pow((${e} + ${yt(.055)}) / ${yt(1.055)}, ${yt(2.4)}), ${e} / 12.92, ${e} <= ${yt(.04045)})`;
}
function ei(e) {
	let t = yt(1), n = yt(.5), r = yt(0), i = "blendSource", a = "blendBackdrop";
	switch (e) {
		case "darken": return `min(${a}, ${i})`;
		case "multiply": return `${a} * ${i}`;
		case "color-burn": return xt(`${a} == ${t}`, t, xt(`${i} == ${r}`, r, `${t} - min(${t}, (${t} - ${a}) / ${i})`));
		case "lighten": return `max(${a}, ${i})`;
		case "screen": return `${a} + ${i} - ${a} * ${i}`;
		case "color-dodge": return xt(`${a} == ${r}`, r, xt(`${i} == ${t}`, t, `min(${t}, ${a} / (${t} - ${i}))`));
		case "overlay": return xt(`${a} <= ${n}`, `2.0 * ${a} * ${i}`, `${t} - 2.0 * (${t} - ${a}) * (${t} - ${i})`);
		case "soft-light": return xt(`${i} <= ${n}`, `${a} - (${t} - 2.0 * ${i}) * ${a} * (${t} - ${a})`, `${a} + (2.0 * ${i} - ${t}) * (softLightD - ${a})`);
		case "hard-light": return xt(`${i} <= ${n}`, `2.0 * ${a} * ${i}`, `${a} + (2.0 * ${i} - ${t}) - ${a} * (2.0 * ${i} - ${t})`);
		case "difference": return `abs(${a} - ${i})`;
		case "exclusion": return `${a} + ${i} - 2.0 * ${a} * ${i}`;
		default: return i;
	}
}
function ti() {
	return `let softLightD = ${xt("blendBackdrop <= vec3<f32>(0.25)", "((16.0 * blendBackdrop - vec3<f32>(12.0)) * blendBackdrop + vec3<f32>(4.0)) * blendBackdrop", "sqrt(blendBackdrop)")};`;
}
function ni(e, t) {
	let n = Xr(t);
	return `${e} >= ${q(n - .5)} && ${e} < ${q(n + .5)}`;
}
function ri(e) {
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
	].map((t, n) => `${n === 0 ? "if" : "else if"} (${ni(e, t)}) {
            blendedSrgb = ${ei(t)};
          }`).join("\n");
	return `let blendSourceLinear = clamp(effectColor.rgb, vec3<f32>(0.0), vec3<f32>(1.0));
        ${bt("blendedColor", "vec3<f32>", "blendSourceLinear")}
        if (${e} >= ${q(.5)}) {
          let blendBackdropLinear = clamp(composedColor, vec3<f32>(0.0), vec3<f32>(1.0));
          let blendBackdrop = ${Qr("blendBackdropLinear")};
          let blendSource = ${Qr("blendSourceLinear")};
          ${ti()}
          ${bt("blendedSrgb", "vec3<f32>", "blendSource")}
          ${t}
          let blendedSrgbClamped = clamp(blendedSrgb, vec3<f32>(0.0), vec3<f32>(1.0));
          blendedColor = ${$r("blendedSrgbClamped")};
        }`;
}
function ii(e, t, n, r = 0) {
	return Yr(e).map((e, i) => {
		let a = e.type === "group" ? `effectColor = vec4<f32>(groupColor${r}_${i}, 1.0);` : oi(e, n), o = `groupColor${r}_${i}`, s = t.get(e.id), c = s ? `${s.parameterPrefix}Opacity` : q(e.opacity / 100), l = s ? `${s.parameterPrefix}BlendMode` : q(Xr(e.blendMode));
		return `{
        ${e.type === "group" ? `${bt(o, "vec3<f32>", "vec3<f32>(0.0)")}
        {
          ${bt("previousComposedColor", "vec3<f32>", "composedColor")}
          composedColor = vec3<f32>(0.0);
          ${ii(e.children, t, n, r + 1)}
          ${o} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${bt("effectColor", "vec4<f32>", "vec4<f32>(0.0)")}
        ${a}
        let sourceAlpha = clamp(effectColor.a * ${c}, 0.0, 1.0);
        ${ri(l)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          vec3<f32>(0.0),
          vec3<f32>(1.0)
        );
      }`;
	}).join("\n");
}
function ai(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function oi(e, t) {
	let n = t.adapters.get(e.type);
	return n ? n.adapter.createSampleExpression(e, "wgsl", { bindingsByLayerId: n.bindingsByLayerId }) : St();
}
//#endregion
//#region src/skybox/materials.ts
function si(e) {
	return e.map((e) => {
		let t = Zr(e.node);
		return {
			blendMode: H(t.blendMode),
			nodeId: e.node.id,
			opacity: H(t.opacity)
		};
	});
}
function ci(e, t) {
	for (let n of e) if (n.enabled) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = ci(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
function li(e, t) {
	e.forEach((e) => {
		let n = ci(t.nodes, e.nodeId);
		if (!n) return;
		let r = Zr(n);
		e.opacity.value = r.opacity, e.blendMode.value = r.blendMode;
	});
}
function ui(e, t) {
	let n = e.find((e) => e.nodeId === t.id);
	if (!n) return;
	let r = Zr(t);
	n.opacity.value = r.opacity, n.blendMode.value = r.blendMode;
}
function di(e, t) {
	e.userData.applyCompositionParams = t;
}
function fi(e, t) {
	e.userData.applyLayerComposition = t;
}
function pi(e) {
	let t = [];
	function n(e) {
		Yr(e).forEach((e) => {
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
function mi(e) {
	return new Map(e.map((e) => [e.node.id, e]));
}
function hi() {
	return D().map((e) => e.wgsl).filter((e) => !!e);
}
function gi(e, t, n, r, i, a, o, s) {
	let c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map(), u = {}, d = {};
	return hi().forEach((a) => {
		let f = a.collect(e.nodes), p = a.createUniforms(f), m = a.createSampleNodes?.({
			bindings: f,
			direction: t,
			imageTextures: a.type === "starfield" ? r : n,
			resourceTextures: a.type === "clouds" ? o : a.type === "moon" ? s : a.type === "starfield" ? i : /* @__PURE__ */ new Map(),
			uniforms: p
		}), h = {
			adapter: a,
			bindings: f,
			bindingsByLayerId: ai(f),
			samples: m,
			uniforms: p
		};
		m?.editorProjectionByLayerId && m.editorProjectionByLayerId.forEach((e, t) => {
			l.set(t, e);
		}), m?.textureSlots && Object.assign(d, m.textureSlots), Object.assign(u, a.createSampleParameters?.(f, p, m) ?? {}), c.set(a.type, h);
	}), {
		adapters: c,
		editorProjectionByLayerId: l,
		sampleParameters: u,
		textureSlotsByLayerId: d
	};
}
function _i(e, t) {
	return e.adapters.get(t);
}
function vi(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				vi(e.children, t);
				return;
			}
			t(e);
		}
	});
}
function yi(e, t) {
	let n = e.adapters.get(t.type);
	n && n.adapter.updateUniforms(n.uniforms, t);
}
function bi(e, t, n) {
	let r = mi(n), i = ii(e.nodes, r, t);
	return W(`
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
function xi(e, t, n, r, i, a, o, s) {
	let c = pi(e.nodes), l = si(c), u = gi(e, t, n, r, i, a, o, s), d = _i(u, "image"), f = d?.uniforms ?? [], p = d?.samples, m = _i(u, "starfield")?.samples;
	return {
		colorNode: bi(e, u, c)({
			direction: t,
			...u.sampleParameters,
			...Object.fromEntries(c.flatMap((e) => {
				let t = l[e.index];
				return [[`${e.parameterPrefix}Opacity`, t.opacity], [`${e.parameterPrefix}BlendMode`, t.blendMode]];
			}))
		}),
		compositionUniforms: l,
		imageSamples: p,
		imageUniforms: f,
		layerRuntime: u,
		starfieldSamples: m
	};
}
function Si() {
	let e = ve.mul(2).sub(1), t = re.mul(De(e.x, e.y.negate(), 1, 1)), n = t.xyz.div(t.w), r = ie.mul(De(n, 0)).xyz;
	return me(r);
}
function Ci(e, t, n, r, i, a, o, s, c) {
	let l = new ke(), u = P(() => {
		let e = pe;
		return e.z.assign(e.w), e;
	})();
	l.side = N.BackSide, l.depthTest = !1, l.depthWrite = !1, l.vertexNode = u;
	let { colorNode: d, compositionUniforms: f, imageSamples: p, imageUniforms: m, layerRuntime: h, starfieldSamples: g } = xi(e, Si(), n, r, i, a, o, s), _ = c ? D().flatMap((e) => {
		let n = h.adapters.get(e.type);
		if (!e.wgslEditorOverlay || !n) return [];
		let r = n.bindings;
		return [{
			bindings: r,
			editorUniforms: fr(r, t)
		}];
	}) : [], v = d;
	return _.forEach(({ bindings: e, editorUniforms: t }) => {
		e.forEach((e, n) => {
			let r = h.editorProjectionByLayerId.get(e.layer.id);
			r && (v = hr({
				color: v,
				activeValue: t[n].active,
				uv: r.uv,
				valid: r.valid
			}));
		});
	}), l.colorNode = v, _.length > 0 && mr(l, (e) => {
		_.forEach(({ editorUniforms: t }) => pr(t, e));
	}), l.userData.webGpuLayerRuntime = h, l.userData.applyLayerParams = (e) => yi(h, e), di(l, (e) => li(f, e)), fi(l, (e) => ui(f, e)), In(l, (e, t) => Fn(m, e, t)), l.userData.applyImageTextures = (e) => Hn(p?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.applyStarfieldTextures = (e) => kr(g?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.applyStarfieldScreenTextures = (e) => Ar(g?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.applyCloudFieldTextures = (e) => {
		Yt(h.adapters.get("clouds")?.samples, e);
	}, l.userData.applyMoonTextures = (e) => {
		Zn(h.adapters.get("moon")?.samples, e);
	}, l.userData.applyTime = (e) => {
		h.adapters.forEach((t) => {
			t.adapter.updateTime?.(t.uniforms, e);
		});
	}, l.userData.debugImageTextureSlots = h.textureSlotsByLayerId, l.userData.debugStarfieldScreenTextureSlots = Object.fromEntries(Array.from(g?.sampleData.entries() ?? []).map(([e, t]) => [e, t.screenTextureNode])), l.userData.debugStarfieldSampleNodes = Object.fromEntries(Array.from(g?.sampleData.entries() ?? []).map(([e, t]) => [e, t.sampleNode])), l;
}
var wi = W("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.x, -normalizedDirection.z);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n"), Ti = W("\n  fn skyboxStudioEquirectUvToDirection(uv: vec2<f32>) -> vec3<f32> {\n    let lambda = (uv.x - 0.5) * 6.283185307179586;\n    let phi = (uv.y - 0.5) * 3.141592653589793;\n    let cosPhi = cos(phi);\n\n    return normalize(vec3<f32>(cosPhi * sin(lambda), sin(phi), -cosPhi * cos(lambda)));\n  }\n");
function Ei(e, t, n, r, i, a = {}) {
	let o = new ke();
	o.side = N.DoubleSide, o.depthTest = !1, o.depthWrite = !1;
	let s = he.xy.mul(.5).add(.5), { colorNode: c } = xi(e, me(Ti({ uv: a.flipY ? Ee(s.x, s.y.oneMinus()) : s })), t, n, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), r, i);
	return o.colorNode = c, o;
}
function Di(e) {
	let t = new ke(), n = P(() => {
		let e = pe;
		return e.z.assign(e.w), e;
	})(), r = Si();
	return t.side = N.BackSide, t.depthTest = !1, t.depthWrite = !1, t.vertexNode = n, t.colorNode = we(e, wi({ direction: r })), t;
}
function Oi(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function ki(e, t = {}) {
	let n = Jr(e, t), r = Oi(n.width, n.height), i = r.getContext("2d");
	if (!i || !("putImageData" in i)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	i.putImageData(new ImageData(n.data, n.width, n.height), 0, 0);
	let a = new N.CanvasTexture(r);
	return a.mapping = N.EquirectangularReflectionMapping, a.wrapS = N.RepeatWrapping, a.wrapT = N.ClampToEdgeWrapping, a.colorSpace = N.SRGBColorSpace, a.flipY = !1, a.needsUpdate = !0, a;
}
function Ai(e) {
	return Di(e);
}
function ji(e) {
	return e === "baked-texture" ? "baked-texture" : "live-webgpu";
}
function Mi(e, t, n) {
	let r = (e) => e.type === "group" ? {
		children: e.children.map(r),
		enabled: e.enabled,
		id: e.id,
		type: e.type
	} : {
		enabled: e.enabled,
		id: e.id,
		topology: j(e.type)?.getTopologyKey?.(e) ?? null,
		type: e.type
	};
	return JSON.stringify({
		editorPresentationEnabled: n,
		geometry: e.geometry?.type ?? dt.type,
		nodes: e.nodes.map(r),
		renderMode: t
	});
}
function Ni(e, t) {
	for (let n of e) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = Ni(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
//#endregion
//#region src/layer-addons/builtins/moon/disc.ts
var Pi = .94, Fi = {
	b: .23,
	c: .37,
	oppositionAmplitude: 1.7,
	oppositionWidth: .08,
	singleScatteringAlbedo: .42
}, Ii = {
	b: .26,
	c: .08,
	oppositionAmplitude: 2,
	oppositionWidth: .05,
	singleScatteringAlbedo: .24
}, Li = {
	b: .24,
	c: .32,
	oppositionAmplitude: 1.7,
	oppositionWidth: .07,
	singleScatteringAlbedo: .38
}, Ri = 23.4 * Math.PI / 180, zi = .266 * Math.PI / 180, Bi = .434 * (6371 / 384400) ** 2, Y = 1e-10;
function Vi(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Hi(e, t) {
	return (1 + 2 * e) / (1 + 2 * e * t);
}
function Ui({ cosPhase: e, material: t, mu: n, mu0: r }) {
	if (r = Vi(r, 0, 1), n = Vi(n, 0, 1), r <= Y || n <= Y) return 0;
	let i = Math.acos(Vi(e, -1, 1)), a = Math.cos(i), o = Math.tan(i / 2), s = t.oppositionAmplitude / (1 + o / t.oppositionWidth), c = t.b * t.b, l = 1 - c, u = l / Math.max((1 - 2 * t.b * a + c) ** 1.5, Y), d = l / Math.max((1 + 2 * t.b * a + c) ** 1.5, Y), f = .5 * (1 + t.c) * u + .5 * (1 - t.c) * d, p = Ri, m = Math.cos(p), h = Math.sin(p), g = m / Math.max(h, Y), _ = g * g, v = h / Math.max(m, Y), y = Math.sqrt(1 + Math.PI * v * v), b = 1 / y, x = Math.sqrt(Math.max(1 - r * r, 0)), S = r / Math.max(x, Y), C = Math.exp(-_ * S * S / Math.PI), w = Math.exp(-2 * g * S / Math.PI), ee = b * (r + x * v * C / Math.max(2 - w, Y)), T = Math.sqrt(Math.max(1 - n * n, 0)), E = n / Math.max(T, Y), D = Math.exp(-_ * E * E / Math.PI), O = Math.exp(-2 * g * E / Math.PI), k = b * (n + T * v * D / Math.max(2 - O, Y)), A = x * T, j = A <= Y ? 1 : Vi((a - n * r) / A, -1, 1), M = Math.acos(j), N = M / 2, te = N >= Math.PI / 2 ? 0 : Math.exp(-2 * Math.tan(N)), P = Math.sin(N) ** 2, ne = M / Math.PI, F, I, re;
	if (r >= n) {
		re = b * r / Math.max(ee, Y);
		let e = Math.max(2 - O - ne * w, Y), t = P * C;
		F = b * (r + x * v * (j * D + t) / e), I = b * (n + T * v * (D - t) / e);
	} else {
		re = b * n / Math.max(k, Y);
		let e = Math.max(2 - w - ne * O, Y), t = P * D;
		F = b * (r + x * v * (C - t) / e), I = b * (n + T * v * (j * C + t) / e);
	}
	F = Math.max(F, Y), I = Math.max(I, Y);
	let ie = Math.sqrt(Math.max(1 - t.singleScatteringAlbedo, 0)), ae = Hi(F, ie) * Hi(I, ie), oe = (1 + s) * f - 1 + ae, se = t.singleScatteringAlbedo / 4 * F / (F + I) * oe, L = I * r / Math.max(k * ee * y * (1 - te + te * re), Y);
	return Math.max(se * L, 0);
}
var Wi = Ui({
	cosPhase: 1,
	material: Li,
	mu: 1,
	mu0: 1
}), { Fn: Gi, float: X, vec3: Ki, vec4: qi, Loop: Ji, floor: Yi, fract: Xi, sin: Zi, exp: Qi, dot: $i, length: ea, min: ta, max: na, mix: ra, smoothstep: ia, clamp: aa, pow: oa, mx_fractal_noise_float: sa, mx_noise_float: ca } = te, la = /* @__PURE__ */ Gi(([e]) => Xi(Zi(qi($i(e, Ki(127.1, 311.7, 74.7)), $i(e, Ki(269.5, 183.3, 246.1)), $i(e, Ki(113.5, 271.9, 124.6)), $i(e, Ki(419.2, 371.9, 168.2)))).mul(43758.5453123))), ua = /* @__PURE__ */ Gi(([e, t, n, r]) => {
	let i = e.mul(t).add(r), a = Yi(i), o = X(0).toVar(), s = X(0).toVar(), c = X(0).toVar(), l = X(0).toVar();
	return Ji(27, ({ i: e }) => {
		let t = X(e), r = Ki(t.mod(3).sub(1), t.div(3).floor().mod(3).sub(1), t.div(9).floor().sub(1)), u = a.add(r), d = la(u), f = u.add(d.xyz), p = ea(i.sub(f)), m = oa(d.w, X(2.2)).mul(.62).add(.14), h = Xi(d.x.mul(7.13).add(d.z.mul(3.71))), g = p.div(m), _ = aa(g, 0, 1), v = _.mul(_).oneMinus().negate(), y = g.sub(1), b = Qi(y.mul(y).mul(-26)).mul(ia(0, .45, g)), x = ia(2.6, 1.05, g).mul(ia(.95, 1.2, g)), S = n.mul(ra(X(.5), X(1), h));
		o.assign(ta(o, v.mul(S))), s.addAssign(b.mul(S).mul(.45)), c.addAssign(x.mul(S).mul(.1));
		let C = oa(ca(i.sub(f).div(na(p, 1e-4)).mul(9).add(u)).mul(.5).add(.5), X(4)).mul(ia(7, 1.1, g));
		l.addAssign(b.add(C.mul(.8)).mul(ia(.55, .95, h)));
	}), qi(o.add(s).add(c), s, l, X(0));
});
function da(e, t) {
	let n = ua(e, t.craterFreq, t.craterDepth, Ki(0, 0, 0)), r = ua(e, t.craterFreq.mul(2.7), t.craterDepth.mul(.45), Ki(11.3, 4.7, 19.1)), i = ua(e, t.craterFreq.mul(7.1), t.craterDepth.mul(.18), Ki(31.7, 23.9, 7.5)), a = sa(e.mul(1.7).add(Ki(5, 1.7, 9.3)), 4, 2, .55).mul(.5).add(.5), o = ra(X(.78), X(.18), t.maria), s = ia(o, o.add(.13), a), c = sa(e.mul(t.craterFreq.mul(16)), 4, 2, .5).mul(t.regolith).mul(t.craterDepth).mul(.28), l = n.x.add(r.x.mul(ra(X(1), X(.45), s))).add(i.x.mul(ra(X(1), X(.2), s))).add(c.mul(ra(X(1), X(.4), s))).sub(s.mul(t.mariaDepth)), u = n.z.add(r.z.mul(.7)).add(i.z.mul(.4));
	return qi(l, sa(e.mul(3.1).add(Ki(17, 3, 21)), 3, 2, .5).mul(.07), s, u);
}
function fa(e, t, n) {
	let r = t.cos(), i = t.sin(), a = Ki(e.x, e.y.mul(r).sub(e.z.mul(i)), e.y.mul(i).add(e.z.mul(r))), o = n.cos(), s = n.sin();
	return Ki(a.x.mul(o).add(a.z.mul(s)), a.y, a.z.mul(o).sub(a.x.mul(s)));
}
//#endregion
//#region src/layer-addons/builtins/moon/tsl/cartoon.ts
var { float: pa, vec2: ma, vec3: ha, vec4: ga, Loop: _a, acos: va, sqrt: ya, cos: ba, sin: xa, dot: Sa, abs: Ca, min: wa, max: Ta, mix: Ea, smoothstep: Da, clamp: Oa, normalize: ka, step: Aa, length: ja, pow: Ma, mx_fractal_noise_float: Na, mx_noise_float: Pa } = te, Fa = 2.399963229728653;
function Ia(e, t, n, r, i, a, o, s) {
	let c = Na(t.mul(2.3).add(ha(5, 1.7, 9.3)), 4, 2.2, .5).mul(.5).add(.5), l = Ea(pa(.7), pa(.34), s.maria), u = Da(l, l.add(.05), c), d = Ea(s.baseColor, s.mareColor, u), f = pa(0).toVar(), p = pa(0).toVar(), m = Ta(s.cartoonCraters, 1);
	_a(64, ({ i: e }) => {
		let n = pa(e), i = Aa(n, m.sub(.5)), o = n.mul(2).add(1).div(m).oneMinus(), c = ya(Ta(o.mul(o).oneMinus(), 0)), l = n.mul(Fa), u = ha(ba(l).mul(c), o, xa(l).mul(c)), d = la(ha(n, n.mul(.37), 3.1)), h = ka(u.add(d.xyz.sub(.5).mul(.22))), g = s.cartoonCraterSize.mul(Ma(d.w, pa(1.9)).mul(1.5).add(.16)), _ = ka(t.sub(h.mul(Sa(t, h))).add(1e-5)), v = va(Oa(Sa(t, h), -1, 1)), y = Pa(_.mul(1.15).add(h.mul(11))), b = g.mul(pa(1).add(y.mul(s.cartoonWobble))), x = Da(b.mul(.94), b, v).oneMinus(), S = r.sub(h.mul(Sa(r, h))), C = Sa(_, ka(Ea(a.sub(h.mul(Sa(a, h))), S, Da(.25, .8, ja(S)).mul(s.cartoonSunLean)).add(1e-5))), w = Da(b.mul(.25), b.mul(.72), v).mul(x), ee = w.mul(Da(-.5, .2, C).oneMinus()), T = w.mul(Da(-.2, .5, C)), E = x.mul(.3).add(ee.mul(.45)).sub(T.mul(1.1));
		f.addAssign(E.mul(s.cartoonRelief).mul(i));
		let D = b.mul(.05).add(.003), O = Ca(v.sub(b)).div(D).oneMinus().clamp(0, 1);
		p.addAssign(O.mul(i));
	});
	let h = Sa(n, o).mul(.5).add(.5), g = Ea(s.cartoonForm.oneMinus(), 1, Da(.1, .95, h)), _ = Ea(d.mul(pa(1).add(f.clamp(-.8, .8))).mul(g), s.mareColor.mul(.22), wa(p, 1).mul(s.cartoonOutline).clamp(0, 1)), v = s.cartoonSoftness.mul(.4).add(.012), y = Sa(n, i), b = ka(ma(i.x, i.y).add(1e-4)), x = Ta(s.cartoonShadowSize, .001), S = b.mul(Ea(x.sub(1), x.add(1), s.phaseT).negate()), C = Ea(y, ja(e.sub(S)).sub(x), Da(0, .15, s.cartoonShadowSize)), w = Da(v.negate(), v, C), ee = Da(v, v.add(.13), C).oneMinus().mul(w).mul(s.cartoonEdgeGlow), T = _.add(_.mul(ee)).mul(s.cartoonLightIntensity).add(_.mul(s.cartoonFill)), E = Ea(Ea(s.nightColor.mul(s.cartoonNightStrength), T, w), T, s.cartoonCrop), D = Ea(pa(1), w, s.cartoonCrop);
	return ga(E.mul(s.exposure), D);
}
//#endregion
//#region src/layer-addons/builtins/moon/tsl/hapke.ts
var { acos: La, clamp: Ra, cos: za, exp: Ba, float: Va, max: Z, min: Ha, mix: Ua, pow: Wa, select: Ga, sin: Ka, sqrt: qa, step: Ja, tan: Ya } = te, Xa = Math.PI, Q = 1e-6;
function Za(e, t) {
	return e.mul(2).add(1).div(e.mul(t).mul(2).add(1));
}
function Qa(e, t, n) {
	let r = (t, n) => Ua(Va(t), Va(n), e), i = Ra(n, 0, 1).mul(.25).add(1), a = r(Fi.singleScatteringAlbedo, Ii.singleScatteringAlbedo).mul(t.clamp(-.07, .07).add(1)).mul(i).clamp(.02, .95);
	return {
		b: r(Fi.b, Ii.b),
		c: r(Fi.c, Ii.c),
		oppositionAmplitude: r(Fi.oppositionAmplitude, Ii.oppositionAmplitude),
		oppositionWidth: r(Fi.oppositionWidth, Ii.oppositionWidth),
		singleScatteringAlbedo: a
	};
}
function $a({ cosPhase: e, material: t, mu: n, mu0: r }) {
	let i = Ra(r, 0, 1), a = Ra(n, 0, 1), o = Ra(e, -1, 1), s = La(o), c = t.oppositionAmplitude.div(Ya(s.mul(.5)).div(t.oppositionWidth).add(1)), l = t.b.mul(t.b), u = l.oneMinus(), d = u.div(Wa(Z(Va(1).sub(t.b.mul(o).mul(2)).add(l), Q), 1.5)), f = u.div(Wa(Z(Va(1).add(t.b.mul(o).mul(2)).add(l), Q), 1.5)), p = t.c.add(1).mul(.5).mul(d).add(t.c.oneMinus().mul(.5).mul(f)), m = Math.cos(Ri), h = Math.sin(Ri), g = m / h, _ = g * g, v = h / m, y = Math.sqrt(1 + Xa * v * v), b = 1 / y, x = qa(Z(i.mul(i).oneMinus(), 0)), S = i.div(Z(x, Q)), C = Ba(S.mul(S).mul(-_ / Xa)), w = Ba(S.mul(-2 * g / Xa)), ee = i.add(x.mul(v).mul(C).div(Z(w.oneMinus().add(1), Q))).mul(b), T = qa(Z(a.mul(a).oneMinus(), 0)), E = a.div(Z(T, Q)), D = Ba(E.mul(E).mul(-_ / Xa)), O = Ba(E.mul(-2 * g / Xa)), k = a.add(T.mul(v).mul(D).div(Z(O.oneMinus().add(1), Q))).mul(b), A = x.mul(T), j = Ga(A.lessThanEqual(Q), Va(1), Ra(o.sub(a.mul(i)).div(Z(A, Q)), -1, 1)), M = La(j), N = M.mul(.5), te = Ba(Ya(Ha(N, Xa / 2 - 1e-4)).mul(-2)), P = Ka(N), ne = P.mul(P), F = M.div(Xa), I = i.greaterThanEqual(a), re = Ga(I, i.mul(b).div(Z(ee, Q)), a.mul(b).div(Z(k, Q))), ie = Z(Va(2).sub(O).sub(F.mul(w)), Q), ae = ne.mul(C), oe = i.add(x.mul(v).mul(j.mul(D).add(ae)).div(ie)).mul(b), se = a.add(T.mul(v).mul(D.sub(ae)).div(ie)).mul(b), L = Z(Va(2).sub(w).sub(F.mul(O)), Q), R = ne.mul(D), z = i.add(x.mul(v).mul(C.sub(R)).div(L)).mul(b), ce = a.add(T.mul(v).mul(j.mul(C).add(R)).div(L)).mul(b), le = Z(Ga(I, oe, z), Q), ue = Z(Ga(I, se, ce), Q), B = qa(Z(t.singleScatteringAlbedo.oneMinus(), 0)), de = Za(le, B).mul(Za(ue, B)), fe = c.add(1).mul(p).sub(1).add(de), pe = t.singleScatteringAlbedo.mul(.25).mul(le.div(le.add(ue))).mul(fe), me = ue.mul(i).div(Z(k.mul(ee).mul(y).mul(te.oneMinus().add(te.mul(re))), Q)), he = Ja(Q, i).mul(Ja(Q, a));
	return Z(pe.mul(me), 0).mul(he);
}
function eo(e) {
	return e.div(Wi);
}
function to(e) {
	let t = Va(Xa).sub(e);
	return Z(Ka(t).add(Va(Xa).sub(t).mul(za(t))).div(Xa), 0).mul(Bi);
}
//#endregion
//#region src/layer-addons/builtins/moon/baker.ts
var { Fn: no, instanceIndex: ro, uniform: $, textureStore: io, textureLoad: ao, int: oo, float: so, vec2: co, vec3: lo, vec4: uo, ivec2: fo, floor: po, sqrt: mo, length: ho, dot: go, min: _o, max: vo, mix: yo, clamp: bo, smoothstep: xo, normalize: So, acos: Co } = te, wo = 24, To = .76 * 2.6, Eo = Math.tan(zi), Do = class {
	constructor(e, t) {
		this.realisticPasses = [], this.cartoonPasses = [], this.renderer = e, this.size = t.resolution, this.U = {
			craterFreq: $(t.craterFreq),
			craterDepth: $(t.craterDepth),
			maria: $(t.maria),
			mariaDepth: $(t.mariaDepth),
			regolith: $(t.regolith),
			rays: $(t.rays),
			tilt: $(t.bodyTilt),
			rotation: $(t.bodyRotation),
			exposure: $(t.exposure),
			sunDir: $(new G.Vector3(0, 0, 1)),
			phaseT: $(1),
			cartoonLightIntensity: $(t.cartoonLightIntensity),
			cartoonFill: $(t.cartoonFill),
			cartoonNightStrength: $(t.cartoonNightStrength),
			cartoonCraters: $(t.cartoonCraters),
			cartoonCraterSize: $(t.cartoonCraterSize),
			cartoonWobble: $(t.cartoonWobble),
			cartoonRelief: $(t.cartoonRelief),
			cartoonForm: $(t.cartoonForm),
			cartoonSunLean: $(t.cartoonSunLean),
			cartoonOutline: $(t.cartoonOutline),
			cartoonSoftness: $(t.cartoonSoftness),
			cartoonShadowSize: $(t.cartoonShadowSize),
			cartoonEdgeGlow: $(t.cartoonEdgeGlow),
			cartoonCrop: $(+!!t.cartoonCrop),
			baseColor: $(new G.Color(t.baseColor)),
			mareColor: $(new G.Color(t.mareColor)),
			nightColor: $(new G.Color(t.nightColor))
		}, this.build(), this.setSun(t);
	}
	build() {
		let e = this.size;
		this.terrainTex = new G.StorageTexture(e, e), this.terrainTex.type = G.FloatType, this.deriveTex = new G.StorageTexture(e, e), this.deriveTex.type = G.FloatType, this.outputTex = new G.StorageTexture(e, e), this.outputTex.type = G.HalfFloatType, this.outputTex.colorSpace = G.NoColorSpace, this.outputTex.minFilter = G.LinearFilter, this.outputTex.magFilter = G.LinearFilter, this.outputTex.wrapS = G.ClampToEdgeWrapping, this.outputTex.wrapT = G.ClampToEdgeWrapping;
		let t = this.U, n = (t, n) => co(t.add(.5).div(e), n.add(.5).div(e)).sub(.5).mul(2 / Pi), r = (t) => fo(bo(po(t.mul(Pi * .5).add(.5).mul(e)), co(0), co(e - 1))), i = (e) => ao(this.terrainTex, r(e)).x, a = (t, n) => fo(bo(t, oo(0), oo(e - 1)), bo(n, oo(0), oo(e - 1))), o = () => {
			let t = oo(ro.mod(e)), r = oo(ro.div(e)), i = n(so(t), so(r)), a = ho(i), o = i.div(vo(a, 1)), s = mo(vo(go(o, o).oneMinus(), 0));
			return {
				x: t,
				y: r,
				p: i,
				r: a,
				pc: o,
				z: s,
				n: lo(o.x, o.y, s)
			};
		}, s = no(() => {
			let { x: e, y: n, n: r } = o(), i = fa(r, t.tilt, t.rotation);
			io(this.terrainTex, fo(e, n), da(i, t)).toWriteOnly();
		})().compute(e * e), c = no(() => {
			let { x: t, y: n, pc: r, z: i, n: s } = o(), c = (e, t) => ao(this.terrainTex, a(e, t)).x, l = 2 / (e * Pi), u = c(t.add(1), n).sub(c(t.sub(1), n)).div(2 * l), d = c(t, n.add(1)).sub(c(t, n.sub(1))).div(2 * l), f = vo(i, .06), p = f.mul(f), m = r.x, h = r.y, g = p.add(h.mul(h)).mul(u).sub(m.mul(h).mul(d)), _ = p.add(m.mul(m)).mul(d).sub(m.mul(h).mul(u)), v = lo(g, _, g.mul(m).add(_.mul(h)).div(f).negate()), y = xo(0, .22, i), b = So(s.sub(v.mul(y)));
			io(this.deriveTex, fo(t, n), uo(b, 1)).toWriteOnly();
		})().compute(e * e), l = no(() => {
			let { x: n, y: r, r: a, pc: s, n: c } = o(), l = ao(this.terrainTex, fo(n, r)), u = ao(this.deriveTex, fo(n, r)), d = l.x, f = l.y, p = l.z, m = l.w.mul(t.rays), h = u.xyz, g = t.sunDir, _ = lo(0, 0, 1), v = go(h, g), y = go(c, g), b = go(h, _), x = bo(go(g, _), -1, 1), S = Co(x), C = Qa(p, f, m), w = So(g.sub(c.mul(y)).add(lo(1e-6, 0, 0))), ee = y.div(mo(vo(y.mul(y).oneMinus(), 1e-4))), T = bo(so(To).div(vo(t.craterFreq, .1)), .11, .4), E = so(1).toVar();
			for (let e = 1; e <= wo; e++) {
				let t = T.mul(e / wo), n = i(s.add(w.xy.mul(t))).sub(t.mul(t).mul(.5)), r = d.add(t.mul(ee)), a = vo(t.mul(Eo), 1e-5);
				E.assign(_o(E, xo(a.negate(), a, r.sub(n))));
			}
			let D = $a({
				cosPhase: x,
				material: C,
				mu: b,
				mu0: v
			}).mul(E), O = $a({
				cosPhase: 1,
				material: C,
				mu: b,
				mu0: b
			}).mul(to(S)), k = lo(eo(D.add(O)).mul(t.exposure)), A = xo(1, 1 - 2 / (e * Pi) * 1.5, a);
			io(this.outputTex, fo(n, r), uo(k, A)).toWriteOnly();
		})().compute(e * e), u = no(() => {
			let { x: n, y: r, p: i, r: a, n: s } = o(), c = fa(s, t.tilt, t.rotation), l = fa(t.sunDir, t.tilt, t.rotation), u = So(lo(-.48, .62, .62)), d = fa(u, t.tilt, t.rotation), f = Ia(i, c, s, l, t.sunDir, d, u, t), p = xo(.93, 1, a), m = yo(f.xyz, t.mareColor.mul(.22), p.mul(t.cartoonOutline)), h = xo(1, 1 - 2 / (e * Pi) * 1.5, a).mul(f.w);
			io(this.outputTex, fo(n, r), uo(m, h)).toWriteOnly();
		})().compute(e * e);
		this.realisticPasses = [
			s,
			c,
			l
		], this.cartoonPasses = [u];
	}
	setSun(e) {
		let t = (e.phase - .5) * Math.PI * 2;
		this.U.sunDir.value.set(Math.sin(t), e.sunTilt, Math.cos(t)).normalize(), this.U.phaseT.value = (1 - Math.cos(e.phase * Math.PI * 2)) * .5;
	}
	sync(e) {
		for (let t of Object.keys(this.U)) {
			if (t === "sunDir") continue;
			let n = e[t === "tilt" ? "bodyTilt" : t === "rotation" ? "bodyRotation" : t];
			typeof n == "number" ? this.U[t].value = n : typeof n == "boolean" ? this.U[t].value = +!!n : typeof n == "string" && this.U[t].value.set(n);
		}
		this.setSun(e);
	}
	setResolution(e) {
		e !== this.size && (this.dispose(), this.size = e, this.build());
	}
	async bake(e) {
		this.sync(e);
		let t = e.style === "cartoon" ? this.cartoonPasses : this.realisticPasses, n = performance.now();
		for (let e of t) await this.renderer.computeAsync(e);
		return performance.now() - n;
	}
	dispose() {
		this.terrainTex?.dispose(), this.deriveTex?.dispose(), this.outputTex?.dispose(), this.realisticPasses = [], this.cartoonPasses = [];
	}
};
//#endregion
//#region src/layer-addons/builtins/moon/service.ts
function Oo(e) {
	return !!(e && typeof e.computeAsync == "function");
}
function ko(e) {
	return 2 ** Math.ceil(Math.log2(Math.max(1, e)));
}
function Ao(e, t) {
	if (e.resolutionMode !== "auto") return Number(e.resolutionMode);
	let n = Math.max(e.placement.angularHeight, e.placement.angularWidth), r = ko((t.kind === "equirect" ? n / Math.PI * Math.max(1, t.height) : Math.tan(n / 2) / Math.max(Math.tan(t.verticalFovRadians / 2), 1e-6) * Math.max(1, t.renderHeight)) / Pi);
	return Math.min(at, Math.max(128, r));
}
function jo(e, t) {
	let { placement: n, resolutionMode: r, ...i } = ut(e);
	return JSON.stringify({
		appearance: i,
		resolution: t
	});
}
function Mo(e, t = []) {
	return e.forEach((e) => {
		e.enabled && (e.type === "group" ? Mo(e.children, t) : e.type === "moon" && t.push(e));
	}), t;
}
var No = class {
	#e;
	#t = /* @__PURE__ */ new Map();
	#n = !1;
	constructor(e) {
		if (!Oo(e)) throw Error("Moon layers require a WebGPU renderer with compute support.");
		this.#e = e;
	}
	canBake() {
		return !this.#n;
	}
	async bakeLayer(e, t, n) {
		if (this.#n) throw Error("Moon bake service has been disposed.");
		let r = ut(t), i = Ao(r, n), a = {
			key: jo(r, i),
			params: {
				...r,
				resolution: i
			},
			resolution: i
		}, o = this.#t.get(e);
		if (o ? (o.request = a, o.disposeRequested = !1) : (o = {
			baker: null,
			bakerResolution: 0,
			completedKey: "",
			disposeRequested: !1,
			request: a,
			running: null
		}, this.#t.set(e, o)), !o.running && o.completedKey !== a.key && (o.running = this.#r(e, o)), await o.running, !o.baker || o.disposeRequested) throw Error("Moon layer was disposed before its bake completed.");
		return o.baker.outputTex;
	}
	async bakeManifest(e, t) {
		let n = Mo(e), r = new Set(n.map((e) => e.id));
		this.#t.forEach((e, t) => {
			r.has(t) || this.disposeLayer(t);
		});
		let i = /* @__PURE__ */ new Map();
		for (let e of n) i.set(e.id, await this.bakeLayer(e.id, e.params, t));
		return i;
	}
	disposeLayer(e) {
		let t = this.#t.get(e);
		t && (t.disposeRequested = !0, t.running || (t.baker?.dispose(), this.#t.delete(e)));
	}
	dispose() {
		this.#n = !0, this.#t.forEach((e, t) => {
			e.disposeRequested = !0, e.running || (e.baker?.dispose(), this.#t.delete(t));
		});
	}
	async #r(e, t) {
		try {
			for (; !t.disposeRequested && t.completedKey !== t.request.key;) {
				let e = t.request, n = t.baker, r = null;
				if ((!n || t.bakerResolution !== e.resolution) && (r = new Do(this.#e, e.params), n = r), await n.bake(e.params), t.disposeRequested) {
					r?.dispose();
					break;
				}
				r && (t.baker?.dispose(), t.baker = r, t.bakerResolution = e.resolution), t.completedKey = e.key;
			}
		} finally {
			t.running = null, t.disposeRequested && (t.baker?.dispose(), this.#t.delete(e));
		}
	}
};
function Po(e) {
	return Oo(e) ? new No(e) : null;
}
//#endregion
//#region src/skybox.ts
var Fo = { starsOmitted: !0 }, Io = N.MathUtils.degToRad(50), Lo = 1024, Ro = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: dt,
	nodes: [],
	version: 2
}, zo = class extends N.Mesh {
	#e = {};
	#t = /* @__PURE__ */ new Map();
	#n = { ...cr };
	#r = !1;
	#i = dt;
	#a = /* @__PURE__ */ new Map();
	#o = /* @__PURE__ */ new Map();
	#s = {
		applyLayerParams: (e) => {
			this.material.userData.applyLayerParams?.(e);
		},
		applyImagePlacement: (e, t) => {
			this.#a.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t);
		},
		scheduleResourceBake: (e, t) => {
			let n = Ni(this.#c.nodes, e);
			n?.type === "starfield" ? this.scheduleStarfieldTextureBake(e, t) : n?.type === "moon" && this.scheduleMoonTextureBake(e, t);
		}
	};
	#c = Ro;
	#l = null;
	#u = /* @__PURE__ */ new Map();
	#d = null;
	#f = /* @__PURE__ */ new Map();
	#p = null;
	#m = "auto";
	#h = null;
	#g = null;
	#_ = null;
	#v = /* @__PURE__ */ new Map();
	#y = /* @__PURE__ */ new Map();
	#b = /* @__PURE__ */ new Map();
	#x = /* @__PURE__ */ new Map();
	#S = 0;
	#C = /* @__PURE__ */ new Map();
	#w = new N.Vector2();
	#T = new N.Quaternion();
	#E = new N.Color();
	constructor() {
		super(gt(dt), Ci(Ro, cr, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), !1)), this.frustumCulled = !1, this.renderOrder = -1, this.onBeforeRender = ((e, t, n) => {
			this.renderStarfieldGlintTargets(e, n);
		});
	}
	fromManifest(e) {
		return this.#c = mt(e), this.applyGeometry(this.#c.geometry ?? dt), this;
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
		return this.#h = e, this.#g?.dispose(), this.#g = A(e), this.disposeMoonTextures(), this.#d = Po(e), this.syncMoonTextures(), this.#C.forEach((e) => {
			e.dirty = !0;
		}), this;
	}
	setRenderMode(e) {
		return this.#m = e, this;
	}
	setTime(e) {
		return !Number.isFinite(e) || this.#S === e ? this : (this.#S = e, this.material.userData.applyTime?.(e), this);
	}
	setViewport(e) {
		let t = e && e.renderHeight > 0 && e.verticalFovRadians > 0 ? {
			renderHeight: e.renderHeight,
			verticalFovRadians: e.verticalFovRadians
		} : null, n = this.#_?.renderHeight !== t?.renderHeight || this.#_?.verticalFovRadians !== t?.verticalFovRadians;
		return this.#_ = t, n && (this.#C.forEach((e) => {
			e.handle.setViewport(t), e.dirty = !0;
		}), this.syncMoonTextures()), this;
	}
	setStarGlintViewport(e) {
		return this.setViewport(e);
	}
	setImageTexture(e, t) {
		return t ? this.#o.set(e, t) : this.#o.delete(e), this.material.userData.applyImageTextures?.(this.#o), this;
	}
	setImageTextures(e) {
		return this.#o.clear(), Object.entries(e).forEach(([e, t]) => {
			t && this.#o.set(e, t);
		}), this.material.userData.applyImageTextures?.(this.#o), this;
	}
	refreshImageTextureBindings() {
		return this.#l = null, this.setManifest(this.#c), this;
	}
	refreshStarfieldTextureBindings() {
		this.material.userData.applyStarfieldTextures?.(this.#b);
	}
	otherOverridingSetup() {
		return this;
	}
	load(e) {
		return e && (this.#h = e), this.setManifest(this.#c), this;
	}
	applyGeometry(e) {
		let t = ht(e);
		if (this.#i.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#i = t, this.geometry = gt(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#p?.dispose(), this.#p = null;
	}
	disposeStarfieldTextures() {
		this.#v.forEach((e) => {
			clearTimeout(e);
		}), this.#v.clear(), this.#b.forEach((e) => Dr(e)), this.#b.clear(), this.#y.clear(), this.#g?.dispose(), this.#g = null;
	}
	disposeMoonTextures() {
		this.#u.forEach((e) => {
			clearTimeout(e);
		}), this.#u.clear(), this.#f.clear(), this.#d?.dispose(), this.#d = null;
	}
	getMoonBakeTarget() {
		return {
			kind: "viewport",
			renderHeight: this.#_?.renderHeight ?? Lo,
			verticalFovRadians: this.#_?.verticalFovRadians ?? Io
		};
	}
	syncMoonTextures() {
		let e = /* @__PURE__ */ new Set();
		vi(this.#c.nodes, (t) => {
			t.type === "moon" && (e.add(t.id), this.scheduleMoonTextureBake(t.id, t.params));
		}), Array.from(this.#f.keys()).forEach((t) => {
			e.has(t) || (this.#d?.disposeLayer(t), this.#f.delete(t));
		}), Array.from(this.#u.entries()).forEach(([t, n]) => {
			e.has(t) || (clearTimeout(n), this.#u.delete(t));
		}), this.material.userData.applyMoonTextures?.(this.#f);
	}
	scheduleMoonTextureBake(e, t) {
		let n = this.#u.get(e);
		n && clearTimeout(n);
		let r = setTimeout(async () => {
			this.#u.delete(e);
			let t = Ni(this.#c.nodes, e);
			if (t?.type !== "moon") return;
			!this.#d && this.#h && (this.#d = Po(this.#h));
			let n = this.#d;
			if (n?.canBake()) try {
				let r = this.#f.get(e), i = await n.bakeLayer(e, t.params, this.getMoonBakeTarget());
				if (n !== this.#d) return;
				if (Ni(this.#c.nodes, e)?.type !== "moon") {
					n.disposeLayer(e);
					return;
				}
				this.#f.set(e, i), r ? this.material.userData.applyMoonTextures?.(this.#f) : (this.#l = null, this.setManifest(this.#c)), this.dispatchEvent({ type: "moontexturechange" });
			} catch (t) {
				n === this.#d && console.error(`Failed to bake Moon layer ${e}.`, t);
			}
		}, 150);
		this.#u.set(e, r);
	}
	disposeStarfieldGlints() {
		this.#C.forEach((e) => {
			e.scene.remove(e.handle.object), e.handle.dispose(), e.target.dispose();
		}), this.#C.clear(), this.#x.clear();
	}
	disposeStarfieldGlint(e) {
		let t = this.#C.get(e);
		t && (t.scene.remove(t.handle.object), t.handle.dispose(), t.target.dispose(), this.#C.delete(e), this.#x.delete(e), this.material.userData.applyStarfieldScreenTextures?.(this.#x));
	}
	createStarfieldGlintTarget(e) {
		let t = new N.RenderTarget(1, 1, {
			depthBuffer: !1,
			format: N.RGBAFormat,
			generateMipmaps: !1,
			magFilter: N.LinearFilter,
			minFilter: N.LinearFilter,
			stencilBuffer: !1,
			type: N.UnsignedByteType
		});
		return t.texture.colorSpace = N.SRGBColorSpace, t.texture.generateMipmaps = !1, t.texture.name = `Starfield screen target ${e}`, t;
	}
	syncStarfieldGlint(e, t) {
		let n = this.#g;
		if (!n?.createGlints || ji(this.#m) !== "live-webgpu") {
			this.disposeStarfieldGlint(e);
			return;
		}
		let r = n.glintGeometryKey(t), i = this.#C.get(e);
		if (i) {
			if (i.geometryKey === r) {
				i.handle.setParams(t), i.handle.setCoverageTexture(null), i.dirty = !0;
				return;
			}
			i.scene.remove(i.handle.object), i.handle.dispose();
			let e = n.createGlints(t);
			e.setViewport(this.#_), e.setCoverageTexture(null), i.scene.add(e.object), i.handle = e, i.geometryKey = r, i.dirty = !0;
			return;
		}
		let a = n.createGlints(t), o = new N.Scene(), s = this.createStarfieldGlintTarget(e);
		a.setViewport(this.#_), a.setCoverageTexture(null), o.add(a.object), this.#C.set(e, {
			cameraQuaternion: new N.Quaternion(),
			dirty: !0,
			geometryKey: r,
			handle: a,
			hasCameraState: !1,
			projectionMatrix: new N.Matrix4(),
			scene: o,
			target: s
		}), this.#x.set(e, s.texture), this.material.userData.applyStarfieldScreenTextures?.(this.#x);
	}
	renderStarfieldGlintTargets(e, t) {
		let n = e;
		if (this.#C.size === 0 || typeof n.setRenderTarget != "function") return;
		n.getDrawingBufferSize?.(this.#w);
		let r = this.#C.values().next().value?.target, i = Math.max(1, Math.floor(this.#w.x || r?.width || 1)), a = Math.max(1, Math.floor(this.#w.y || r?.height || 1));
		t.getWorldQuaternion(this.#T);
		let o = Array.from(this.#C.values()).filter((e) => ((e.target.width !== i || e.target.height !== a) && (e.target.setSize(i, a), e.dirty = !0), (!e.hasCameraState || !e.cameraQuaternion.equals(this.#T) || !e.projectionMatrix.equals(t.projectionMatrix)) && (e.dirty = !0), e.dirty));
		if (o.length === 0) return;
		let s = n.getRenderTarget(), c = n.autoClear, l = n.getClearAlpha?.() ?? 1, u = n.getClearColor?.(this.#E)?.clone();
		n.autoClear = !0, n.setClearColor?.(0, 0), o.forEach((e) => {
			n.setRenderTarget(e.target), n.render(e.scene, t), e.cameraQuaternion.copy(this.#T), e.projectionMatrix.copy(t.projectionMatrix), e.hasCameraState = !0, e.dirty = !1;
		}), n.setRenderTarget(s), u && n.setClearColor?.(u, l), n.autoClear = c;
	}
	syncStarfieldTextures() {
		let e = /* @__PURE__ */ new Set();
		vi(this.#c.nodes, (t) => {
			if (t.type !== "starfield") return;
			e.add(t.id), this.syncStarfieldGlint(t.id, t.params);
			let n = this.#g?.createBakeKey(t.params, void 0, null, Fo) ?? "";
			this.#y.get(t.id) !== n && this.scheduleStarfieldTextureBake(t.id, t.params);
		}), Array.from(this.#b.keys()).forEach((t) => {
			if (e.has(t)) return;
			let n = this.#b.get(t);
			n && Dr(n), this.#b.delete(t), this.#y.delete(t);
		}), Array.from(this.#C.keys()).forEach((t) => {
			e.has(t) || this.disposeStarfieldGlint(t);
		}), Array.from(this.#v.entries()).forEach(([t, n]) => {
			e.has(t) || (clearTimeout(n), this.#v.delete(t));
		});
	}
	scheduleStarfieldTextureBake(e, t) {
		this.syncStarfieldGlint(e, t);
		let n = this.#g?.createBakeKey(t, void 0, null, Fo) ?? "";
		if (this.#y.get(e) === n) return;
		let r = this.#v.get(e);
		r && clearTimeout(r);
		let i = setTimeout(() => {
			this.#v.delete(e);
			let t = Ni(this.#c.nodes, e);
			if (t?.type !== "starfield") return;
			let r = this.#g?.createBakeKey(t.params, void 0, null, Fo) ?? "";
			if (r !== n) {
				this.scheduleStarfieldTextureBake(e, t.params);
				return;
			}
			if (!this.#g && this.#h && (this.#g = A(this.#h)), !this.#g?.canBake()) return;
			let i = this.#g.bakeTexture(t.params, r, void 0, null, Fo), a = this.#b.get(e);
			a && a !== i && Dr(a), this.#b.set(e, i), this.#y.set(e, r), a ? this.refreshStarfieldTextureBindings() : (this.#l = null, this.setManifest(this.#c)), this.dispatchEvent({ type: "starfieldtexturechange" });
		}, 150);
		this.#v.set(e, i);
	}
	replaceMaterial(e, t = null) {
		let n = this.material;
		this.material = e, e.userData.applyEditorLayerState?.(this.#n), this.#a.forEach((t, n) => {
			e.userData.applyImageLayerPlacement?.(n, t);
		}), e.userData.applyStarfieldTextures?.(this.#b), e.userData.applyStarfieldScreenTextures?.(this.#x), e.userData.applyCloudFieldTextures?.(this.#t), e.userData.applyMoonTextures?.(this.#f), e.userData.applyTime?.(this.#S), n.dispose(), this.disposeOwnedTexture(), this.#p = t;
	}
	applyLiveManifestUniformUpdates() {
		this.material.userData.applyCompositionParams?.(this.#c), this.material.userData.applyLayerParams && vi(this.#c.nodes, this.material.userData.applyLayerParams), this.material.userData.applyImageTextures?.(this.#o), this.material.userData.applyStarfieldTextures?.(this.#b), this.material.userData.applyStarfieldScreenTextures?.(this.#x), this.material.userData.applyCloudFieldTextures?.(this.#t), this.material.userData.applyMoonTextures?.(this.#f), this.material.userData.applyTime?.(this.#S), this.material.userData.applyEditorLayerState?.(this.#n), this.#a.forEach((e, t) => {
			this.material.userData.applyImageLayerPlacement?.(t, e);
		});
	}
	setEditorPresentationEnabled(e) {
		return this.#r === e ? this : (this.#r = e, this.#l = null, this.setManifest(this.#c), this);
	}
	setEditorLayerState(e) {
		let t = {
			...this.#n,
			...e
		};
		return t.hoveredLayerId === this.#n.hoveredLayerId && t.selectedLayerId === this.#n.selectedLayerId ? this : (this.#n = t, this.material.userData.applyEditorLayerState?.(this.#n), this);
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
		let n = Ni(this.#c.nodes, e);
		return n?.type === "image" && (n.params = {
			...n.params,
			placement: t
		}), this.#a.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this.#c = pt(this.#c), vi(this.#c.nodes, (e) => {
			e.type === "clouds" && this.#s.applyLayerParams(e);
		}), this;
	}
	updateLayerComposition(e, t) {
		let n = Ni(this.#c.nodes, e);
		return n ? (t.blendMode !== void 0 && (n.blendMode = t.blendMode), t.opacity !== void 0 && (n.opacity = t.opacity), this.material.userData.applyLayerComposition?.(n), this) : this;
	}
	updateLayer(e, t) {
		let n = Ni(this.#c.nodes, e);
		if (!n || n.type === "group") return this;
		n.params = t, this.#c = pt(this.#c);
		let r = Ni(this.#c.nodes, e);
		return !r || r.type === "group" ? this : (qt(this.#c, this.#t) && this.material.userData.applyCloudFieldTextures?.(this.#t), j(r.type)?.updateLive?.(this.#s, r), (r.type === "image" || r.type === "spot") && vi(this.#c.nodes, (e) => {
			e.type === "clouds" && this.#s.applyLayerParams(e);
		}), this.material.userData.applyTime?.(this.#S), this);
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
	updateMoonLayer(e, t) {
		return this.updateLayer(e, t);
	}
	setManifest(e) {
		let t = mt(e);
		this.#c = t, this.applyGeometry(this.#c.geometry ?? this.#i), qt(this.#c, this.#t), this.syncStarfieldTextures(), this.syncMoonTextures();
		let n = ji(this.#m), r = Mi(this.#c, n, this.#r);
		if (this.#l === r && n === "live-webgpu") return this.applyLiveManifestUniformUpdates(), this;
		if (n === "live-webgpu") this.replaceMaterial(Ci(this.#c, this.#n, this.#o, this.#b, this.#x, /* @__PURE__ */ new Map(), this.#t, this.#f, this.#r));
		else {
			let e = ki(this.#c, this.#e);
			this.replaceMaterial(Ai(e), e);
		}
		return this.#l = r, this.material.userData.applyTime?.(this.#S), this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(Ai(e)), this.#l = null, this;
	}
	invalidateBakeCache() {
		return Ur(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture(), Jt(this.#t), this.disposeMoonTextures(), this.disposeStarfieldTextures(), this.disposeStarfieldGlints();
	}
};
//#endregion
//#region src/baking/skybox-gpu-bake.ts
function Bo(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function Vo(e) {
	return e.some((e) => e.enabled && (e.type === "moon" || e.type === "group" && Vo(e.children)));
}
function Ho(e, t, n, r) {
	let i = new N.RenderTarget(e, t, {
		depthBuffer: !1,
		format: N.RGBAFormat,
		generateMipmaps: !1,
		magFilter: N.LinearFilter,
		minFilter: N.LinearFilter,
		stencilBuffer: !1,
		type: n ? r ? N.FloatType : N.HalfFloatType : N.UnsignedByteType,
		wrapS: N.RepeatWrapping,
		wrapT: N.ClampToEdgeWrapping
	});
	return i.texture.name = "GPU baked skybox composition", i.texture.colorSpace = n ? N.LinearSRGBColorSpace : N.SRGBColorSpace, i.texture.generateMipmaps = !1, i;
}
var Uo = class {
	#e;
	#t = new N.Scene();
	#n = new N.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#r = new N.PlaneGeometry(2, 2);
	#i;
	constructor(e) {
		this.#e = e, this.#i = Po(e);
	}
	canBake() {
		return Bo(this.#e);
	}
	async prepareMoonTextures(e, t) {
		let n = mt(e);
		if (!Vo(n.nodes)) return /* @__PURE__ */ new Map();
		if (!this.#i) throw Error("Moon layers require WebGPU compute support for GPU export.");
		return this.#i.bakeManifest(n.nodes, {
			height: Math.max(1, Math.floor(t)),
			kind: "equirect"
		});
	}
	bakeRenderTarget(e, t) {
		let n = Math.max(1, Math.floor(t.width)), r = Math.max(1, Math.floor(t.height)), i = mt(e);
		if (Vo(i.nodes) && !t.moonTextures) throw Error("Moon textures are not prepared. Await prepareMoonTextures() before bakeRenderTarget().");
		let a = t.cloudFieldTextures ? null : /* @__PURE__ */ new Map(), o = t.cloudFieldTextures ?? a ?? /* @__PURE__ */ new Map();
		a && qt(i, a);
		let s = Ei(i, t.imageTextures ?? /* @__PURE__ */ new Map(), t.starfieldTextures ?? /* @__PURE__ */ new Map(), o, t.moonTextures ?? /* @__PURE__ */ new Map(), { flipY: t.flipY }), c = Ho(n, r, !!t.hdr, !!t.float), l = new N.Mesh(this.#r, s);
		l.frustumCulled = !1;
		let u = this.#e.getRenderTarget(), d = this.#e.autoClear, f = new N.Color(), p = this.#e.getClearAlpha();
		this.#e.getClearColor(f);
		try {
			this.#t.clear(), this.#t.add(l), this.#e.autoClear = !0, this.#e.setClearColor(0, 0), this.#e.setRenderTarget(c), this.#e.clear(), this.#e.render(this.#t, this.#n), this.#t.remove(l);
		} finally {
			this.#e.setRenderTarget(u), this.#e.autoClear = d, this.#e.setClearColor(f, p);
		}
		return {
			height: r,
			target: c,
			width: n,
			dispose: () => {
				s.dispose(), c.dispose(), a && Jt(a);
			}
		};
	}
	async bakeImageData(e, t) {
		let n = t.moonTextures ?? await this.prepareMoonTextures(e, t.height), { dispose: r, height: i, target: a, width: o } = this.bakeRenderTarget(e, {
			...t,
			hdr: !1,
			moonTextures: n
		});
		try {
			return {
				data: await this.#a(a, o, i),
				height: i,
				width: o
			};
		} finally {
			r();
		}
	}
	dispose() {
		this.#r.dispose(), this.#i?.dispose(), this.#i = null;
	}
	async #a(e, t, n) {
		let r = new Uint8Array(t * n * 4);
		if (this.#e.readRenderTargetPixelsAsync) {
			let i = await this.#e.readRenderTargetPixelsAsync(e, 0, 0, t, n);
			r.set(new Uint8Array(i.buffer, i.byteOffset, i.byteLength));
		} else if (this.#e.readRenderTargetPixels) this.#e.readRenderTargetPixels(e, 0, 0, t, n, r);
		else throw Error("GPU skybox bake readback is not available.");
		return new Uint8ClampedArray(r.buffer);
	}
};
function Wo(e) {
	return Bo(e) ? new Uo(e) : null;
}
//#endregion
//#region src/loader/loader.ts
var Go = class extends Error {
	constructor(e, t) {
		super(e), this.name = "LoaderAssetError", this.entry = t.entry ?? null, this.event = t.event, this.id = t.id, this.phase = t.phase, this.src = t.src;
	}
}, Ko = class {
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
			let e = this.#o.size === 0, n = new Go(e ? `No manifest loaded. Cannot resolve id: "${t}"` : `Manifest loaded but id not found: "${t}". Available ids: ${[...this.#o.keys()].join(", ")}`, {
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
		if (!this.#u(e)) throw new Go("Invalid manifest entry.", { phase: "manifest-parse-error" });
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
		if (!r) throw new Go(`No loader registered for type: ${e}`, {
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
function qo(e) {
	return e.colorSpace = N.SRGBColorSpace, e.wrapS = N.ClampToEdgeWrapping, e.wrapT = N.ClampToEdgeWrapping, e.flipY = !1, e.minFilter = N.LinearMipmapLinearFilter, e.magFilter = N.LinearFilter, e.generateMipmaps = !0, e.needsUpdate = !0, e;
}
var Jo = class {
	static {
		this.type = "texture";
	}
	#e = new N.TextureLoader();
	async load(e, t) {
		let n = Array.isArray(e) ? e : [e], r = null;
		for (let e of n) try {
			return qo(await this.#e.loadAsync(e));
		} catch (n) {
			r = new Go(`Failed to load texture: ${e}`, {
				entry: t,
				event: n,
				phase: "network-error",
				src: e
			});
		}
		throw r ?? new Go(`No texture sources for entry ${t?.id ?? "?"}`, {
			entry: t,
			phase: "network-error",
			src: e
		});
	}
}, Yo = "manifest.json";
function Xo(e) {
	let t = [], n = (e) => {
		for (let r of e) r.type === "group" ? n(r.children) : r.type === "image" && t.push(r);
	};
	return n(e.nodes), t;
}
function Zo(e) {
	switch (e.slice(e.lastIndexOf(".") + 1).toLowerCase()) {
		case "jpg":
		case "jpeg": return "image/jpeg";
		case "webp": return "image/webp";
		default: return "image/png";
	}
}
function Qo(e, t) {
	let n = e.slice();
	return URL.createObjectURL(new Blob([n], { type: t }));
}
async function $o(e) {
	if (typeof e == "string") {
		let t = await fetch(e);
		if (!t.ok) throw Error(`Could not fetch zip bundle (${t.status} ${t.statusText}).`);
		return new Uint8Array(await t.arrayBuffer());
	}
	return e instanceof Uint8Array ? e : e instanceof ArrayBuffer ? new Uint8Array(e) : new Uint8Array(await e.arrayBuffer());
}
async function es(e) {
	let t = e.slice(), n = new Blob([t]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
	return new Uint8Array(await new Response(n).arrayBuffer());
}
var ts = 101010256, ns = 33639248, rs = 67324752, is = 22, as = 65535;
function os(e) {
	let t = Math.max(0, e.byteLength - is - as);
	for (let n = e.byteLength - is; n >= t; --n) if (e.getUint32(n, !0) === ts) return n;
	return -1;
}
async function ss(e) {
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = os(t);
	if (n < 0) throw Error("Invalid zip bundle: end-of-central-directory record not found.");
	let r = t.getUint16(n + 10, !0), i = t.getUint32(n + 16, !0), a = new TextDecoder(), o = [];
	for (let n = 0; n < r; n += 1) {
		if (t.getUint32(i, !0) !== ns) throw Error("Invalid zip bundle: malformed central directory.");
		let n = t.getUint16(i + 10, !0), r = t.getUint32(i + 20, !0), s = t.getUint16(i + 28, !0), c = t.getUint16(i + 30, !0), l = t.getUint16(i + 32, !0), u = t.getUint32(i + 42, !0), d = a.decode(e.subarray(i + 46, i + 46 + s));
		if (t.getUint32(u, !0) !== rs) throw Error(`Invalid zip bundle: bad local header for "${d}".`);
		let f = t.getUint16(u + 26, !0), p = t.getUint16(u + 28, !0), m = u + 30 + f + p, h = e.subarray(m, m + r);
		if (n === 0) o.push(Promise.resolve([d, h]));
		else if (n === 8) o.push(es(h).then((e) => [d, e]));
		else throw Error(`Unsupported zip compression method ${n} for "${d}".`);
		i += 46 + s + c + l;
	}
	return Object.fromEntries(await Promise.all(o));
}
async function cs(e, t = {}) {
	let n = t.toAssetUrl ?? Qo, r = await ss(await $o(e)), i = r[Yo];
	if (!i) throw Error(`Zip bundle is missing ${Yo}.`);
	let a = JSON.parse(new TextDecoder().decode(i)), o = mt(a), s = a.assets ?? {}, c = /* @__PURE__ */ new Map(), l = [];
	for (let [e, t] of Object.entries(r)) {
		if (e === Yo) continue;
		let r = n(t, s[e]?.mimeType ?? Zo(e), e);
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
async function ls(e) {
	let t = await fetch(new URL(Yo, e).href);
	if (!t.ok) throw Error(`Could not load ${Yo} (${t.status}).`);
	return {
		manifest: mt(await t.json()),
		resolveAssetUrl: (t) => new URL(t, e).href,
		dispose: () => {}
	};
}
async function us(e, t) {
	let n = t.split("/").filter(Boolean), r = e;
	for (let e = 0; e < n.length - 1; e += 1) r = await r.getDirectoryHandle(n[e]);
	let i = await r.getFileHandle(n[n.length - 1]);
	return URL.createObjectURL(await i.getFile());
}
async function ds(e) {
	let t = await (await e.getFileHandle(Yo)).getFile(), n = mt(JSON.parse(await t.text())), r = /* @__PURE__ */ new Map();
	for (let t of Xo(n)) t.params.src && r.set(t.params.src, await us(e, t.params.src));
	return {
		manifest: n,
		resolveAssetUrl: (e) => r.get(e) ?? e,
		dispose: () => {
			for (let e of r.values()) typeof URL < "u" && URL.revokeObjectURL && URL.revokeObjectURL(e);
			r.clear();
		}
	};
}
async function fs(e) {
	let t = structuredClone(e.manifest);
	for (let n of Xo(t)) {
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
function ps() {
	let e = new Ko();
	return e.register(Jo.type, Jo), e;
}
async function ms(e, t = {}) {
	let n = t.loader ?? ps(), r = Xo(e.manifest).filter((e) => e.enabled && e.params.src), i = r.map((t) => ({
		id: t.id,
		src: e.resolveAssetUrl(t.params.src),
		type: Jo.type
	})), a = t.onProgress ? n.onProgress(t.onProgress) : null;
	try {
		await n.load(i);
	} finally {
		a?.();
	}
	let o = /* @__PURE__ */ new Map();
	return await Promise.all(r.map(async (e) => {
		try {
			o.set(e.id, await n.loadAsset(Jo.type, e.id));
		} catch {}
	})), o;
}
function hs(e) {
	return typeof e == "object" && !!e && "manifest" in e && typeof e.resolveAssetUrl == "function";
}
async function gs(e, t = {}) {
	let { onProgress: n, ...r } = t, i = !hs(e), a = hs(e) ? e : await cs(e, r), o = ps(), s = await ms(a, {
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
export { Lr as DEFAULT_BAKE_WIDTH, ot as DEFAULT_MOON_SPRITE_ANGULAR_SIZE, Vt as DEFAULT_SKYBOX_CLOUDS_PARAMS, Qn as DEFAULT_SPOT_BASE_ANGULAR_RADIUS, Ht as FULL_MOON_SKYBOX_CLOUDS_PARAMS, Fe as IMAGE_PLACEMENT_ELEVATION_LIMIT, Ko as Loader, Go as LoaderAssetError, at as MOON_RESOLUTION_MAX, it as MOON_RESOLUTION_MIN, st as MOON_STYLE_EXPOSURE, No as MoonGpuBakeService, zo as Skybox, Uo as SkyboxGpuBakeService, Jo as TextureLoaderExtension, Jr as bakeSkyboxImageData, c as blendChannel, O as clamp, Ut as cloneSkyboxCloudsParams, lt as cloneSkyboxMoonParams, Xo as collectImageLayers, s as compositeBlendChannel, b as compositeOver, qo as configureSkyboxImageTexture, Je as createAngularDecalPlacement, Hr as createBakeCacheKey, ki as createBakedSkyboxTexture, Wt as createDefaultSkyboxCloudsParams, ct as createDefaultSkyboxMoonParams, tr as createDefaultSpotParams, qe as createImagePlacementTangents, jo as createMoonBakeKey, Po as createMoonGpuBakeService, gt as createSkyboxGeometry, Wo as createSkyboxGpuBakeService, vt as createSkyboxWireGeometry, Ze as directionFromPosition, Ir as evaluateSkyboxDirection, j as getLayerRuntimeAdapter, D as getLayerRuntimeAdapters, Ur as invalidateBakeCache, k as isRegisteredLayerType, x as linearChannelToSrgb, m as linearRgbToSrgbBytes, ds as loadBundleFromDirectory, ls as loadBundleFromUrl, cs as loadBundleFromZip, gs as loadSkyboxBundle, ms as loadSkyboxImageTextures, mt as migrateManifestToV2, Ye as normalizeImagePlacement, ut as normalizeSkyboxMoonParams, nr as normalizeSpotParams, K as normalizeVector, e as parseHexColor, Qe as placementFromPosition, nt as placementFromRotation, et as placementFromScale, Xe as positionFromPlacement, rr as positionFromSpot, rt as projectDirectionToImageUv, ar as radiusScaleFromSpot, w as registerLayerRuntimeAdapter, fs as rehydrateImagePixels, Vr as resolveBakeOptions, pt as resolveCloudLightReferences, Ao as resolveMoonBakeResolution, tt as rotationFromPlacement, $e as scaleFromPlacement, sr as spotContainsDirection, ir as spotFromPosition, or as spotFromRadiusScale, C as srgbChannelToLinear };
