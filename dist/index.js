import { $ as e, A as t, D as n, F as r, G as i, H as a, I as o, J as s, K as c, L as l, M as u, N as d, O as f, P as p, Q as m, R as h, U as g, V as _, W as v, X as y, Y as ee, Z as b, d as x, et as te, it as S, j as ne, k as C, m as re, nt as w, q as T, rt as E, t as D, tt as O, z as k } from "./starfield-bake-registry-D5mi0bgU.js";
import * as A from "three";
import { Fn as j, If as ie, Loop as ae, cameraPosition as oe, cameraProjectionMatrixInverse as M, cameraWorldMatrix as se, cos as ce, dFdx as le, dFdy as ue, dot as N, exp as P, float as F, int as de, length as fe, log2 as pe, max as I, min as me, mix as he, modelViewProjection as ge, normalize as _e, positionGeometry as ve, positionWorld as ye, pow as be, screenUV as xe, select as Se, sin as Ce, smoothstep as we, sqrt as Te, struct as Ee, sub as L, texture as De, time as Oe, uniform as R, vec2 as z, vec3 as B, vec4 as ke, wgslFn as V } from "three/tsl";
import * as H from "three/webgpu";
import { Color as Ae, NodeMaterial as U, Vector3 as je } from "three/webgpu";
//#region src/manifest.ts
var W = { type: "box" };
function Me(e) {
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
function Ne(e) {
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
			direction: Me(r ?? e.direction),
			directionLayerId: r ? e.directionLayerId : null
		};
	}, i = (e) => e.map((e) => e.type === "group" ? {
		...e,
		children: i(e.children)
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
function G(e) {
	return e.version === 2 ? Ne({
		...e,
		geometry: e.geometry ?? W
	}) : Ne({
		composition: e.composition,
		geometry: W,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	});
}
//#endregion
//#region src/skybox/geometry.ts
function Pe(e) {
	return e ?? W;
}
function Fe(e = W) {
	return Pe(e).type === "sphere" ? new A.SphereGeometry(1, 64, 32) : new A.BoxGeometry(1, 1, 1);
}
function Ie(e = 1, t = 25, n = 25) {
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
	return new A.BufferGeometry().setAttribute("position", new A.Float32BufferAttribute(r, 3));
}
function Le(e = W) {
	if (Pe(e).type === "sphere") return Ie();
	let t = new A.BoxGeometry(1, 1, 1), n = new A.EdgesGeometry(t);
	return t.dispose(), n;
}
//#endregion
//#region src/layer-addons/shader-codegen.ts
function K(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function q(e) {
	return `vec3<f32>(${K(e)})`;
}
function J(e, t, n) {
	return `var ${e}: ${t} = ${n};`;
}
function Y(e, t, n) {
	return `select(${n}, ${t}, ${e})`;
}
function Re() {
	return "effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);";
}
//#endregion
//#region src/layer-addons/builtins/clouds/mipped-texture.ts
function ze(e, t, n, r) {
	let i = new H.DataTexture(e, t, n);
	return i.format = H.RedFormat, i.type = H.UnsignedByteType, i.wrapS = r, i.wrapT = r, i.minFilter = H.LinearMipmapLinearFilter, i.magFilter = H.LinearFilter, i.generateMipmaps = !0, i.unpackAlignment = 1, i.needsUpdate = !0, i;
}
//#endregion
//#region src/layer-addons/builtins/clouds/cloud-field.ts
var Be = {
	size: 512,
	tiles: 6,
	octaves: 5,
	persistence: .5,
	seed: 11
};
function Ve(e, t) {
	return Math.max(1, Math.floor(Math.log2(e / (4 * t))) + 1);
}
function He(e) {
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
var Ue = [
	1,
	-1,
	1,
	-1,
	1,
	-1,
	0,
	0
], We = [
	1,
	1,
	-1,
	-1,
	0,
	0,
	1,
	-1
], Ge = (e) => e * e * e * (e * (e * 6 - 15) + 10), Ke = (e, t, n) => e + (t - e) * n;
function qe(e, t, n, r) {
	let i = Math.floor(t), a = Math.floor(n), o = t - i, s = n - a, c = (e) => (e % r + r) % r, l = c(i), u = c(i + 1), d = c(a), f = c(a + 1), p = (t, n, r, i) => {
		let a = e[e[t & 255] + n & 255] & 7;
		return Ue[a] * r + We[a] * i;
	}, m = Ge(o), h = Ge(s);
	return Ke(Ke(p(l, d, o, s), p(u, d, o - 1, s), m), Ke(p(l, f, o, s - 1), p(u, f, o - 1, s - 1), m), h);
}
function Je(e) {
	let { size: t, tiles: n, persistence: r, seed: i } = e, a = Math.min(e.octaves, Ve(t, n)), o = He(i), s = new Float32Array(t * t), c = Infinity, l = -Infinity, u = 0;
	for (let e = 0; e < t; e += 1) {
		let i = e / t;
		for (let e = 0; e < t; e += 1) {
			let d = e / t, f = n, p = 1, m = 0, h = 0;
			for (let e = 0; e < a; e += 1) m += qe(o, d * f, i * f, f) * p, h += p, f *= 2, p *= r;
			let g = m / h;
			g < c && (c = g), g > l && (l = g), s[u] = g, u += 1;
		}
	}
	let d = l - c || 1, f = new Uint8Array(t * t);
	for (let e = 0; e < s.length; e += 1) f[e] = Math.round((s[e] - c) / d * 255);
	return ze(f, t, t, H.RepeatWrapping);
}
//#endregion
//#region src/layer-addons/builtins/clouds/custom-sky-model.ts
var Ye = j(([e]) => F(.75).mul(F(1).add(e.mul(e)))), Xe = j(([e, t]) => {
	let n = e.mul(e);
	return F(1.5).mul(F(1).sub(n).div(F(2).add(n))).mul(F(1).add(t.mul(t))).div(be(I(F(1).add(n).sub(F(2).mul(e).mul(t)), 1e-4), 1.5));
});
function Ze(e) {
	return {
		direction: R(new je(0, 1, 0)),
		intensity: R(e.intensity),
		tint: R(new Ae(e.tint)),
		showDisc: R(+!!e.showDisc)
	};
}
function Qe(e) {
	return {
		enabled: R(1),
		altitude: R(e.altitude),
		featureSize: R(e.featureSize),
		speed: R(e.speed),
		morphBlend: R(e.morphBlend),
		morphScale: R(e.morphScale),
		morphSpeed: R(e.morphSpeed),
		coverage: R(e.coverage),
		density: R(e.density),
		phaseG: R(e.phaseG),
		seed: R(e.seed)
	};
}
var $e = Ee({
	debugColor: "vec3",
	radiance: "vec3",
	transmission: "vec3"
}, "CustomSkySample");
function et(e, t = {}) {
	let n = {
		kr: R(.0025),
		km: R(.001),
		sun: Ze({
			intensity: 20,
			tint: "#ffffff",
			showDisc: !0
		}),
		moon: Ze({
			intensity: .2,
			tint: "#fff2e0",
			showDisc: !0
		}),
		mieDirectionalG: R(-.99),
		wavelength: R(new je(.65, .57, .475)),
		eyeHeight: R(.001),
		mistDensity: R(.04),
		mistHeight: R(.003),
		samples: R(de(5)),
		exposure: R(2),
		up: R(new je(0, 1, 0)),
		cloudLow: Qe({
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
		cloudHigh: Qe({
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
		fieldSize: R(512),
		debugLayers: R(0)
	}, r = [n.sun, n.moon], i = 10.25, a = 4 * Math.PI, o = .08, s = 1.9, c = Math.cos(s), l = Math.sin(s), u = De(e), d = j(([e]) => {
		let t = F(1).sub(e), n = F(-.00287).add(t.mul(F(.459).add(t.mul(F(3.83).add(t.mul(F(-6.8).add(t.mul(5.25))))))));
		return F(.25).mul(P(me(n, 12)));
	}), f = j(() => {
		let e = ge;
		return e.z.assign(e.w), e;
	})(), p = j(() => {
		let e = B(1).div(be(n.wavelength, B(4))), f = e.mul(n.kr.mul(a)).add(n.km.mul(a)), p = _e(t.direction ?? ye.sub(oe)), m = t.time ?? Oe, h = F(10).add(n.eyeHeight), g = n.up.mul(h), _ = B(p.x, I(p.y, 0), p.z), v = _.div(I(fe(_), 1e-4)), y = F(2).mul(N(g, v)), ee = N(g, g).sub(i * i), b = F(.5).mul(y.negate().add(Te(I(y.mul(y).sub(ee.mul(4)), 0)))), x = P(F(16).mul(F(10).sub(h))), te = N(v, g).div(h), S = x.mul(d(te));
		function ne(e) {
			let t = _e(e.direction), r = e.tint.mul(e.intensity), i = N(p, t), a = i.negate(), o = N(t, n.up), s = F(1).div(t.y.abs().add(.15)), c = z(t.x, t.z).mul(s), l = s, u = P(f.mul(x.mul(d(o))).negate()), m = I(I(u.r, u.g), u.b);
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
				frontColor: B(0).toVar()
			};
		}
		let C = r.map(ne), re = F(n.samples), w = b.div(re), T = w.mul(4), E = v.mul(w), D = g.add(E.mul(.5)).toVar();
		ae({
			start: de(0),
			end: n.samples
		}, () => {
			let e = I(fe(D), 1e-4), t = P(F(16).mul(F(10).sub(e))), n = d(N(v, D).div(e));
			for (let r of C) {
				let i = N(r.dir, D).div(e), a = S.add(t.mul(d(i).sub(n))), o = P(f.mul(I(a, 0)).negate());
				r.frontColor.addAssign(o.mul(t.mul(T)));
			}
			D.addAssign(E);
		});
		let O = B(0).toVar(), k = B(0).toVar();
		for (let t of C) {
			let r = t.frontColor.mul(e.mul(n.kr)).mul(t.irradiance), i = t.frontColor.mul(n.km).mul(t.irradiance), a = Ye(t.phaseCos).mul(r);
			k.addAssign(a), O.addAssign(a.add(Xe(n.mieDirectionalG, t.phaseCos).mul(i)));
		}
		let A = P(f.mul(x.mul(d(N(p, g).div(h)))).negate()), j = C.reduce((e, t) => e.add(t.irradiance.mul(we(.9999566769464484, .9999766769464484, t.cosTheta).mul(t.light.showDisc))), B(0)).mul(A).mul(we(F(-.0093), F(0), p.y));
		function M(e, t, n, r, i) {
			let a = u.sample(e).level(n).r, o = u.sample(t).level(r).r;
			return {
				a,
				b: o,
				level: he(a, o, i.blend).mul(i.norm).add(i.bias)
			};
		}
		function se(e, t, n, r, i, a, o) {
			let { a: s, b: c, level: l } = M(e, t, n, r, a), d = z(s.sub(.5), c.sub(.5)).mul(1), f = u.sample(e.mul(5).add(.37).add(d)).level(i).r, p = I(l.sub(L(1, o.coverage)), 0), m = o.density.mul(10), h = P(p.mul(m).negate());
			return I(p.sub(f.mul(.12).mul(h)), 0).mul(m);
		}
		function ge(e, t, n, r, i, a) {
			let { level: o } = M(e, t, n.add(2), r.add(2), i);
			return I(o.sub(L(1, a)), 0);
		}
		function ve(e) {
			return pe(I(I(fe(le(e)), fe(ue(e))).mul(n.fieldSize), 1e-6));
		}
		function xe(e) {
			let t = I(F(10).add(e), h.add(1e-4)), n = F(2).mul(N(g, p)), r = N(g, g).sub(t.mul(t)), i = F(.5).mul(n.negate().add(Te(I(n.mul(n).sub(r.mul(4)), 0))));
			return {
				worldXZ: g.add(p.mul(i)).xz,
				t: i,
				shellRadius: t
			};
		}
		function Ee(e, t, n, r, i) {
			let a = ce(t), o = Ce(t);
			return z(e.x.mul(a).sub(e.y.mul(o)), e.x.mul(o).add(e.y.mul(a))).add(m.mul(n)).div(r).add(i);
		}
		function De(e, t) {
			return {
				uvA: Ee(e, t.seed, t.speed, t.featureSize, t.seed),
				uvB: Ee(e, t.seed.add(s), t.morphSpeed, t.featureSize.mul(t.morphScale), t.seed.add(17.31))
			};
		}
		function R(e) {
			let { worldXZ: t, t: n, shellRadius: r } = xe(e.altitude), { uvA: i, uvB: a } = De(t, e), o = e.morphBlend, s = F(1).div(Te(L(1, o).mul(L(1, o)).add(o.mul(o)))), c = {
				blend: o,
				norm: s,
				bias: F(.5).mul(L(1, s))
			}, l = P(F(16).mul(F(10).sub(r))), u = N(g, p).add(n).div(r), m = I(S.sub(l.mul(d(u))), 0), h = P(f.mul(m).negate()), _ = ve(i), v = ve(a);
			return {
				worldXZ: t,
				uvA: i,
				uvB: a,
				lodA: I(_, 0),
				lodB: I(v, 0),
				lodDetail: I(_.add(Math.log2(7)), 0),
				morph: c,
				shellDensity: l,
				airTransmit: h
			};
		}
		function ke(e, t, n, r) {
			let { worldXZ: i, uvA: a, uvB: s, lodA: u, lodB: p, lodDetail: m, morph: h, shellDensity: g, airTransmit: _ } = t, v = se(a, s, u, p, m, h, e), y = L(1, P(v.negate())).toVar(), ee = y.mul(L(2, y)), b = n.altitude.sub(e.altitude), x = I(b, 0), te = we(F(0), F(.01), b).mul(n.enabled), S = u.add(pe(e.featureSize.div(n.featureSize))), ne = S.sub(pe(n.morphScale)), re = B(0).toVar();
			for (let t of C) ie(t.relevant, () => {
				let m = t.slope.div(e.featureSize).mul(o), _ = z(t.slope.x.mul(c).sub(t.slope.y.mul(l)), t.slope.x.mul(l).add(t.slope.y.mul(c))).div(e.featureSize.mul(e.morphScale)).mul(o), v = z(a).toVar(), y = z(s).toVar(), b = F(0).toVar();
				ae(4, () => {
					v.addAssign(m), y.addAssign(_), b.addAssign(ge(v, y, u, p, h, e.coverage));
				});
				let C = b.mul(1 / 4).mul(e.density).mul(10).mul(t.pathLength).toVar(), w = De(i.add(t.slope.mul(x)), n);
				C.addAssign(ge(w.uvA, w.uvB, S, ne, r.morph, n.coverage).mul(n.density).mul(10).mul(.2).mul(t.pathLength).mul(te));
				let T = t.irradiance.mul(P(f.mul(g.mul(d(t.cosZenith))).negate())), E = F(0);
				for (let n = 0; n < 3; n += 1) E = E.add(F(.6 ** n).mul(Xe(e.phaseG.mul(.75 ** n), t.cosTheta)).mul(P(C.mul(.5 ** n).negate())));
				let D = we(e.phaseG.sub(.3), me(e.phaseG.add(.2), .98), t.cosTheta);
				re.addAssign(T.mul(.06).mul(E).mul(he(ee, F(1), D)));
			});
			let w = k.mul(.9).mul(P(v.mul(.25).negate()));
			return {
				color: re.add(w).mul(_).add(k.mul(L(1, _))),
				alpha: y
			};
		}
		let V = R(n.cloudLow), H = R(n.cloudHigh), Ae = F(0).toVar(), U = F(0).toVar(), je = B(0).toVar(), W = B(0).toVar();
		ie(p.y.greaterThan(0).and(n.cloudHigh.enabled.greaterThan(0)).and(n.cloudHigh.coverage.greaterThan(0)), () => {
			let e = ke(n.cloudHigh, H, n.cloudLow, V);
			U.assign(e.alpha), W.assign(e.color);
		}), ie(p.y.greaterThan(0).and(n.cloudLow.enabled.greaterThan(0)).and(n.cloudLow.coverage.greaterThan(0)), () => {
			let e = ke(n.cloudLow, V, n.cloudHigh, H);
			Ae.assign(e.alpha), je.assign(e.color);
		});
		let Me = n.cloudHigh.altitude.greaterThanEqual(n.cloudLow.altitude), Ne = Se(Me, W, je), G = Se(Me, U, Ae), Pe = Se(Me, je, W), Fe = Se(Me, Ae, U);
		O.assign(he(O, Ne, G)), O.assign(he(O, Pe, Fe)), O.addAssign(j.mul(L(1, G)).mul(L(1, Fe)));
		let Ie = P(n.mistDensity.mul(P(n.eyeHeight.div(n.mistHeight).negate())).div(I(p.y, .015)).negate()), Le = C.reduce((e, t) => e.add(t.irradiance.mul(t.groundTransmit).mul(F(.05).add(Xe(F(-.5), t.phaseCos).mul(.02)))), B(0));
		O.assign(O.mul(Ie).add(Le.mul(L(1, Ie))));
		let K = B(Ae, U, Ae.mul(U)), q = L(1, G).mul(L(1, Fe));
		return $e(K, O, A.mul(q).mul(Ie));
	})(), m = j(() => {
		let e = p;
		return ke(he(L(1, P(e.get("radiance").mul(n.exposure).negate())), e.get("debugColor"), n.debugLayers), 1);
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
function tt(e, t) {
	let n = A.MathUtils.degToRad(90 - e), r = A.MathUtils.degToRad(t), i = new A.Vector3().setFromSphericalCoords(1, n, r);
	return [
		i.x,
		i.y,
		i.z
	];
}
var nt = {
	direction: tt(18, 180),
	directionLayerId: null,
	disc: !0,
	intensity: 20,
	tint: "#ffffff"
}, rt = {
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
	field: Be,
	km: .001,
	kr: .0025,
	mieDirectionalG: -.99,
	mistDensity: .04,
	mistHeight: .003,
	moon: {
		direction: tt(-30, 0),
		directionLayerId: null,
		disc: !0,
		intensity: .2,
		tint: "#fff2e0"
	},
	motionMode: "static",
	samples: 5,
	sun: nt,
	time: 0
}, it = {
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
	field: Be,
	km: .0104,
	kr: 7e-4,
	mieDirectionalG: -.956,
	mistDensity: .12,
	mistHeight: .004,
	moon: {
		direction: tt(11.1, 180),
		directionLayerId: null,
		disc: !1,
		intensity: 1.1,
		tint: "#bbdafb"
	},
	motionMode: "static",
	samples: 9,
	sun: {
		direction: tt(-12.8, 180),
		directionLayerId: null,
		disc: !1,
		intensity: 0,
		tint: "#ffffff"
	},
	time: 0
};
function at(e) {
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
function ot() {
	return at(rt);
}
function st(e) {
	return [
		e.size,
		e.tiles,
		e.octaves,
		e.persistence,
		e.seed
	].join(":");
}
function ct(e) {
	return {
		octaves: e.octaves,
		persistence: e.persistence,
		seed: e.seed,
		size: e.size,
		tiles: e.tiles
	};
}
function lt(e, t) {
	let n = /* @__PURE__ */ new Set(), r = !1, i = (e) => {
		e.forEach((e) => {
			if (e.type === "group") {
				i(e.children);
				return;
			}
			if (e.type !== "clouds") return;
			n.add(e.id);
			let a = st(e.params.field), o = t.get(e.id);
			if (o?.userData.cloudFieldKey === a || !e.enabled) return;
			let s = Je(ct(e.params.field));
			s.name = `Cloud field ${e.id}`, s.userData.cloudFieldKey = a, t.set(e.id, s), o?.dispose(), r = !0;
		});
	};
	return i(e.nodes), Array.from(t.entries()).forEach(([e, i]) => {
		n.has(e) || (i.dispose(), t.delete(e), r = !0);
	}), r;
}
function ut(e) {
	e.forEach((e) => e.dispose()), e.clear();
}
function dt(e, t) {
	e?.sampleData.forEach((e, n) => {
		let r = t.get(n);
		r && e.model.setFieldTexture(r);
	});
}
function ft(e, t) {
	t.direction.value.set(...e.direction).normalize(), t.intensity.value = e.intensity, t.tint.value.set(e.tint), t.showDisc.value = +!!e.disc;
}
function pt(e, t) {
	t.enabled.value = +!!e.enabled, t.altitude.value = e.altitude, t.featureSize.value = e.featureSize, t.speed.value = e.speed, t.morphBlend.value = e.morphBlend, t.morphScale.value = e.morphScale, t.morphSpeed.value = e.morphSpeed, t.coverage.value = e.coverage, t.density.value = e.density, t.phaseG.value = e.phaseG;
}
function mt(e, t) {
	e.uniforms.kr.value = t.kr, e.uniforms.km.value = t.km, e.uniforms.mieDirectionalG.value = t.mieDirectionalG, e.uniforms.samples.value = Math.round(t.samples), e.uniforms.eyeHeight.value = t.eyeHeight, e.uniforms.mistDensity.value = t.mistDensity, e.uniforms.mistHeight.value = t.mistHeight, e.uniforms.exposure.value = t.exposure, e.uniforms.fieldSize.value = t.field.size, e.uniforms.debugLayers.value = +!!t.debugLayers, ft(t.sun, e.uniforms.sun), ft(t.moon, e.uniforms.moon), pt(t.cloudLow, e.uniforms.cloudLow), pt(t.cloudHigh, e.uniforms.cloudHigh);
}
function ht(e) {
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
function gt(e) {
	return e.map((e) => ({
		layerId: e.layer.id,
		model: null,
		motionMode: e.layer.params.motionMode,
		time: null
	}));
}
function _t({ bindings: e, direction: t, resourceTextures: n, uniforms: r }) {
	let i = /* @__PURE__ */ new Map(), a = {}, o = {};
	return e.forEach((e, s) => {
		let c = e.layer.params, l = n.get(e.layer.id);
		if (!l) return;
		let u = R(c.time), d = et(l, {
			direction: t,
			time: u
		});
		mt(d, c), r[s].model = d, r[s].time = u;
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
function vt(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n?.model && (mt(n.model, t.params), n.motionMode = t.params.motionMode, t.params.motionMode === "static" && n.time && (n.time.value = t.params.time));
}
function yt(e, t) {
	e.forEach((e) => {
		e.time && e.motionMode === "dynamic" && (e.time.value = t);
	});
}
function bt(e) {
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
var xt = {
	collect: ht,
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
		return r ? bt(r) : Re();
	},
	createSampleNodes: _t,
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
	createUniforms: gt,
	getTopologyKey: () => ({}),
	type: "clouds",
	updateTime: yt,
	updateUniforms: vt
};
S({
	type: "clouds",
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: xt,
	getTopologyKey: (e) => xt.getTopologyKey(e)
});
//#endregion
//#region src/skybox/stops.ts
function St(e) {
	return [...e.stops].map((e) => ({
		color: e.color,
		midpoint: T((e.midpoint ?? 50) / 100, .01, .99),
		opacity: T(e.opacity / 100),
		t: T(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function Ct(t) {
	let [n, r, i] = e(t.color);
	return new A.Vector4(n, r, i, t.opacity);
}
//#endregion
//#region src/layer-addons/builtins/gradient.ts
function wt(e) {
	let t = e * Math.PI / 180;
	return [
		Math.sin(t),
		Math.cos(t),
		0
	];
}
function Tt(e, t) {
	let n = wt(t.rotation), r = e[0] * n[0] + e[1] * n[1] + e[2] * n[2];
	return h(o(t.stops), r * .5 + .5);
}
function Et(e) {
	let t = e * Math.PI / 180;
	return new A.Vector3(Math.sin(t), Math.cos(t), 0).normalize();
}
function Dt(e) {
	return e.map((e) => {
		let t = St(e.layer.params);
		return {
			axis: R(Et(e.layer.params.rotation)),
			layerId: e.layer.id,
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: R(Ct(r)),
					midpoint: R(r.midpoint),
					t: R(r.t)
				};
			})
		};
	});
}
function Ot(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = St(t.params);
	n.axis.value.copy(Et(t.params.rotation)), n.stops.forEach((e, t) => {
		let n = r[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(Ct(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
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
function At(e) {
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
var jt = {
	collect: kt,
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
		return r ? At(r) : Re();
	},
	createSampleParameters: (e, t) => Object.fromEntries(e.flatMap((e) => {
		let n = t[e.index];
		return [[`${e.parameterPrefix}Axis`, n.axis], ...Array.from({ length: e.stopCount }, (t, r) => [
			[`${e.parameterPrefix}StopColor${r}`, n.stops[r].color],
			[`${e.parameterPrefix}StopMidpoint${r}`, n.stops[r].midpoint],
			[`${e.parameterPrefix}StopT${r}`, n.stops[r].t]
		]).flat()];
	})),
	createUniforms: Dt,
	getTopologyKey: (e) => ({
		mode: e.params.mode,
		stopCount: e.params.stops.length
	}),
	type: "gradient",
	updateUniforms: Ot
};
S({
	type: "gradient",
	sampleCpu: (e, t) => Tt(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: jt,
	getTopologyKey: (e) => jt.getTopologyKey(e)
});
//#endregion
//#region src/skybox/colors.ts
function Mt(t) {
	let [n, r, i] = e(t);
	return new A.Vector3(n, r, i);
}
//#endregion
//#region src/layer-addons/builtins/field-gradient.ts
function Nt(t, n) {
	if (n.anchors.length === 0) return [
		0,
		0,
		0,
		0
	];
	let r = i(t, T(n.amplitude, 0, .6), Math.max(1e-4, n.frequency)), a = 0, o = 0, s = 0, c = 0;
	return n.anchors.forEach((t) => {
		let i = f(r, ne(t.x, t.y)), l = n.mode === "gaussian" ? Math.exp(-(i * i) / (2 * (.46 / n.power) ** 2)) : 1 / (i + 5e-4) ** n.power, u = e(t.color);
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
function Pt(e) {
	return +(e === "gaussian");
}
function Ft(e, t) {
	let n = (T(e) - .5) * Math.PI * 2, r = (.5 - T(t)) * Math.PI, i = Math.cos(r);
	return new A.Vector3(i * Math.cos(n), Math.sin(r), i * Math.sin(n)).normalize();
}
function It(e) {
	return e.map((e) => ({
		amplitude: R(T(e.layer.params.amplitude, 0, .6)),
		anchors: Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return {
				color: R(Mt(r.color)),
				direction: R(Ft(r.x, r.y))
			};
		}),
		frequency: R(Math.max(1e-4, e.layer.params.frequency)),
		layerId: e.layer.id,
		mode: R(Pt(e.layer.params.mode)),
		power: R(Math.max(1e-4, e.layer.params.power))
	}));
}
function Lt(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n && (n.amplitude.value = T(t.params.amplitude, 0, .6), n.frequency.value = Math.max(1e-4, t.params.frequency), n.mode.value = Pt(t.params.mode), n.power.value = Math.max(1e-4, t.params.power), n.anchors.forEach((e, n) => {
		let r = t.params.anchors[n] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.color.value.copy(Mt(r.color)), e.direction.value.copy(Ft(r.x, r.y));
	}));
}
function Rt(e) {
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
function zt(e) {
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
    ${J("fieldDirection", "vec3<f32>", "direction")}
    let warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      let warpX = sin((direction.y * warpFrequency + 0.23) * ${K(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${K(Math.PI * 2)});
      let warpY = cos((direction.z * warpFrequency + 0.17) * ${K(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${K(Math.PI * 2)});
      let warpZ = sin((direction.x * warpFrequency - 0.31) * ${K(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${K(Math.PI * 2)});
      fieldDirection = normalize(direction + vec3<f32>(warpX, warpY, warpZ) * warpScale);
    }
    ${J("weightedColor", "vec3<f32>", "vec3<f32>(0.0)")}
    ${J("weightSum", "f32", "0.0")}
    ${t}
    if (weightSum > 0.0) {
      effectColor = vec4<f32>(weightedColor / weightSum, 1.0);
    } else {
      effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
var Bt = {
	collect: Rt,
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
		return r ? zt(r) : Re();
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
	createUniforms: It,
	getTopologyKey: (e) => ({ anchorCount: e.params.anchors.length }),
	type: "field-gradient",
	updateUniforms: Lt
};
S({
	type: "field-gradient",
	sampleCpu: (e, t) => Nt(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Bt,
	getTopologyKey: (e) => Bt.getTopologyKey(e)
});
//#endregion
//#region src/image-placement-transform.ts
var Vt = [
	0,
	1,
	0
], Ht = [
	0,
	0,
	-1
], Ut = [
	1,
	0,
	0
], Wt = [
	0,
	1,
	0
], Gt = 89.9;
function Kt(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function qt(e) {
	return e * Math.PI / 180;
}
function Jt(e) {
	return e * 180 / Math.PI;
}
function Yt(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Xt(e) {
	return (Math.round(e) % 360 + 360) % 360;
}
function Zt(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function Qt(e, t) {
	return [
		e[0] - t[0],
		e[1] - t[1],
		e[2] - t[2]
	];
}
function $t(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function en(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function tn(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function X(e, t = Ht) {
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
function nn(e, t, n) {
	let r = qt(n), i = Math.cos(r), a = Math.sin(r), o = X(t);
	return X(en(en($t(e, i), $t(tn(o, e), a)), $t(o, Zt(o, e) * (1 - i))), e);
}
function rn(e, t = Vt, n = 0) {
	let r = X(e), i = Qt(X(t, Vt), $t(r, Zt(X(t, Vt), r)));
	if (Math.hypot(i[0], i[1], i[2]) < 1e-6) {
		let e = Math.abs(r[1]) > .98 ? [
			0,
			0,
			1
		] : Vt;
		i = Qt(e, $t(r, Zt(e, r)));
	}
	return i = X(i, Wt), {
		tangentX: nn(X(tn(r, i), Ut), r, n),
		tangentY: nn(i, r, n)
	};
}
function an({ angularHeight: e, angularWidth: t, baseAngularHeight: n, baseAngularWidth: r, centerDirection: i, rotation: a = 0, upDirection: o = Vt }) {
	let s = X(i), c = Xt(a), { tangentX: l, tangentY: u } = rn(s, o, c), d = Math.max(1e-4, e), f = Math.max(1e-4, t);
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
function Z(e) {
	let t = e, n = X(t?.centerDirection ?? t?.normal ?? t?.center, Ht), r = Array.isArray(t?.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, i = typeof t?.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t?.width ?? .4) / (2 * r)), a = typeof t?.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t?.height ?? .3) / (2 * r));
	return an({
		angularHeight: a,
		angularWidth: i,
		baseAngularHeight: typeof t?.baseAngularHeight == "number" ? t.baseAngularHeight : a,
		baseAngularWidth: typeof t?.baseAngularWidth == "number" ? t.baseAngularWidth : i,
		centerDirection: n,
		rotation: typeof t?.rotation == "number" ? t.rotation : 0
	});
}
function on(e) {
	let t = X(e.centerDirection);
	return {
		x: Yt(Jt(Math.atan2(t[0], -t[2]))),
		y: Jt(Math.asin(Kt(t[1], -1, 1)))
	};
}
function sn(e) {
	let t = qt(e.x), n = qt(Kt(e.y, -89.9, Gt)), r = Math.cos(n);
	return X([
		Math.sin(t) * r,
		Math.sin(n),
		-Math.cos(t) * r
	]);
}
function cn(e, t, n) {
	let r = Z(e);
	return an({
		angularHeight: r.angularHeight,
		angularWidth: r.angularWidth,
		baseAngularHeight: r.baseAngularHeight,
		baseAngularWidth: r.baseAngularWidth,
		centerDirection: sn(t),
		rotation: r.rotation,
		upDirection: n?.upDirection
	});
}
function ln(e) {
	let t = Z(e);
	return {
		x: t.angularWidth / t.baseAngularWidth,
		y: t.angularHeight / t.baseAngularHeight
	};
}
function un(e, t) {
	let n = Z(e);
	return {
		...n,
		angularHeight: Math.max(1e-4, n.baseAngularHeight * Math.max(1e-4, t.y)),
		angularWidth: Math.max(1e-4, n.baseAngularWidth * Math.max(1e-4, t.x))
	};
}
function dn(e) {
	return Z(e).rotation;
}
function fn(e, t) {
	let n = Z(e);
	return an({
		angularHeight: n.angularHeight,
		angularWidth: n.angularWidth,
		baseAngularHeight: n.baseAngularHeight,
		baseAngularWidth: n.baseAngularWidth,
		centerDirection: n.centerDirection,
		rotation: t
	});
}
function pn(e, t) {
	let n = Z(t), r = X(e), i = Zt(r, n.centerDirection);
	if (i <= 0) return null;
	let a = Zt(r, n.tangentX) / i, o = Zt(r, n.tangentY) / i, s = Math.tan(n.angularWidth / 2), c = Math.tan(n.angularHeight / 2);
	return s <= 0 || c <= 0 || a < -s || a > s || o < -c || o > c ? null : {
		u: a / (2 * s) + .5,
		v: .5 - o / (2 * c)
	};
}
//#endregion
//#region src/skybox/empty-texture.ts
var Q = new A.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, A.RGBAFormat);
Q.colorSpace = A.SRGBColorSpace, Q.needsUpdate = !0;
//#endregion
//#region src/skybox/overlay.ts
var mn = .18, hn = .75, gn = 1.75, _n = 1e-4, vn = .01;
//#endregion
//#region src/layer-addons/builtins/image.ts
function yn(e, t) {
	let n = t.placement;
	if (!n || !t.pixels || t.width <= 0 || t.height <= 0) return [
		0,
		0,
		0,
		0
	];
	let r = pn(e, n);
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
	return p(p(k(t, c, l), k(t, u, l), f), p(k(t, c, d), k(t, u, d), f), m);
}
function bn(e) {
	if (!e) return {
		centerDirection: new A.Vector3(0, 0, -1),
		halfSize: new A.Vector2(0, 0),
		tangentX: new A.Vector3(1, 0, 0),
		tangentY: new A.Vector3(0, 1, 0)
	};
	let t = Z(e);
	return {
		centerDirection: new A.Vector3(...t.centerDirection),
		halfSize: new A.Vector2(Math.max(0, Math.tan(t.angularWidth / 2)), Math.max(0, Math.tan(t.angularHeight / 2))),
		tangentX: new A.Vector3(...t.tangentX),
		tangentY: new A.Vector3(...t.tangentY)
	};
}
function xn(e) {
	return e.map((e) => {
		let t = bn(e.layer.params.placement);
		return {
			centerDirection: R(t.centerDirection),
			halfSize: R(t.halfSize),
			layerId: e.layer.id,
			tangentX: R(t.tangentX),
			tangentY: R(t.tangentY)
		};
	});
}
function Sn(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = bn(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function Cn(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function wn(e) {
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
function Tn(e, t) {
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
      let imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${K(vn)});
      let imageHardInside = step(${K(_n)}, imageDenom) *
        step(0.0, ${t.halfSize}.x) *
        step(0.0, ${t.halfSize}.y);
      let imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      let imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return vec4<f32>(imageU, imageV, imageValid, 0.0);
    `;
}
function En(e) {
	return V(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${Tn(e, {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var Dn = V("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n");
function On(e, t) {
	return e.get(t.id) ?? Q;
}
function kn(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? Q;
	});
}
function An(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	return {
		sampleData: i,
		sampleNodes: Object.fromEntries(e.map((e) => {
			let a = r[e.index], o = En(e)({
				direction: t,
				imageCenterDirection: a.centerDirection,
				imageHalfSize: a.halfSize,
				imageTangentX: a.tangentX,
				imageTangentY: a.tangentY
			}), s = z(o.x, o.y), c = De(On(n, e.layer), s).setName(`imageTexture${e.index}`);
			c.getUniformHash = () => `skybox-image-texture:${e.layer.id}`;
			let l = Dn({
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
var jn = {
	collect: wn,
	createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
	createSampleExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id);
		return r ? `effectColor = ${r.parameterName};` : Re();
	},
	createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, uniforms: r }) => {
		let i = An(e, t, n, r);
		return {
			editorProjectionByLayerId: new Map(Array.from(i.sampleData.entries()).map(([e, t]) => [e, {
				uv: z(t.sampleInfo.x, t.sampleInfo.y),
				valid: t.sampleInfo.z
			}])),
			sampleData: i.sampleData,
			sampleNodesByLayerId: Object.fromEntries(e.map((e) => [e.layer.id, i.sampleNodes[e.parameterName]])),
			sampleNodesByParameterName: i.sampleNodes,
			textureSlots: Object.fromEntries(Array.from(i.sampleData.entries()).map(([e, t]) => [e, t.textureNode]))
		};
	},
	createSampleParameters: (e, t, n) => n?.sampleNodesByParameterName ?? {},
	createUniforms: xn,
	getTopologyKey: (e) => ({
		hasPlacement: !!e.params.placement,
		hasSrc: !!e.params.src,
		height: e.params.height,
		width: e.params.width
	}),
	type: "image",
	updateUniforms: (e, t) => Sn(e, t.id, t.params.placement)
};
S({
	type: "image",
	sampleCpu: (e, t) => yn(e, t),
	updateLive: (e, t) => e.applyImagePlacement(t.id, t.params.placement),
	wgsl: jn,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => jn.getTopologyKey(e)
});
//#endregion
//#region src/spot-transform.ts
var Mn = Math.PI / 12;
function $(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Nn(e) {
	return e * 180 / Math.PI;
}
function Pn(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Fn() {
	return {
		angularRadius: Mn,
		baseAngularRadius: Mn,
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
function In(e) {
	let t = e, n = Fn(), r = Math.max(1e-4, typeof t?.baseAngularRadius == "number" ? t.baseAngularRadius : n.baseAngularRadius);
	return {
		angularRadius: Math.max(1e-4, typeof t?.angularRadius == "number" ? t.angularRadius : r),
		baseAngularRadius: r,
		brightness: Math.max(0, typeof t?.brightness == "number" ? t.brightness : n.brightness),
		centerDirection: X(t?.centerDirection, n.centerDirection),
		colorMode: t?.colorMode === "gradient" ? "gradient" : "light",
		coreRadius: $(typeof t?.coreRadius == "number" ? t.coreRadius : n.coreRadius, .01, .7),
		coreSoftness: $(typeof t?.coreSoftness == "number" ? t.coreSoftness : n.coreSoftness, .4, 6),
		dispersion: $(typeof t?.dispersion == "number" ? t.dispersion : n.dispersion, 0, 1),
		dogSpread: $(typeof t?.dogSpread == "number" ? t.dogSpread : n.dogSpread, .015, .18),
		dogStrength: $(typeof t?.dogStrength == "number" ? t.dogStrength : n.dogStrength, 0, 1.8),
		dogStretch: $(typeof t?.dogStretch == "number" ? t.dogStretch : n.dogStretch, 0, .55),
		glareSize: $(typeof t?.glareSize == "number" ? t.glareSize : n.glareSize, .03, 1.1),
		glareStrength: $(typeof t?.glareStrength == "number" ? t.glareStrength : n.glareStrength, 0, 1.4),
		glow: $(typeof t?.glow == "number" ? t.glow : n.glow, 0, 1),
		glowSize: $(typeof t?.glowSize == "number" ? t.glowSize : n.glowSize, .05, 1.4),
		glowStrength: $(typeof t?.glowStrength == "number" ? t.glowStrength : n.glowStrength, 0, 1),
		halo: $(typeof t?.halo == "number" ? t.halo : n.halo, 0, 1),
		haloInnerWidth: $(typeof t?.haloInnerWidth == "number" ? t.haloInnerWidth : n.haloInnerWidth, .003, .09),
		haloOuterWidth: $(typeof t?.haloOuterWidth == "number" ? t.haloOuterWidth : n.haloOuterWidth, .01, .24),
		haloRadius: $(typeof t?.haloRadius == "number" ? t.haloRadius : n.haloRadius, .04, 1),
		haloStrength: $(typeof t?.haloStrength == "number" ? t.haloStrength : n.haloStrength, 0, 1.4),
		lightColor: typeof t?.lightColor == "string" ? t.lightColor : n.lightColor,
		stops: (t?.stops?.length ? t.stops : n.stops).map((e) => ({
			color: e.color,
			location: $(e.location, 0, 100),
			midpoint: $(e.midpoint ?? 50, 1, 99),
			opacity: $(e.opacity, 0, 100)
		}))
	};
}
function Ln(e) {
	let t = X(e.centerDirection);
	return {
		x: Pn(Nn(Math.atan2(t[0], -t[2]))),
		y: Nn(Math.asin($(t[1], -1, 1)))
	};
}
function Rn(e, t) {
	return {
		...In(e),
		centerDirection: sn({
			x: t.x,
			y: $(t.y, -Gt, Gt)
		})
	};
}
function zn(e) {
	let t = In(e);
	return t.angularRadius / t.baseAngularRadius;
}
function Bn(e, t) {
	let n = In(e);
	return {
		...n,
		angularRadius: Math.max(1e-4, n.baseAngularRadius * Math.max(1e-4, t))
	};
}
function Vn(e, t) {
	let n = In(t), r = X(e), i = X(n.centerDirection), a = r[0] * i[0] + r[1] * i[1] + r[2] * i[2];
	return Math.acos($(a, -1, 1)) <= n.angularRadius;
}
//#endregion
//#region src/skybox/editor-presentation.ts
var Hn = {
	hoveredLayerId: null,
	selectedLayerId: null
};
function Un(e, t) {
	return +(t === e);
}
function Wn(e, t) {
	return +(t === e);
}
function Gn(e, t) {
	return Math.max(Un(e, t.hoveredLayerId), Wn(e, t.selectedLayerId));
}
function Kn(e, t) {
	return e.map((e) => ({
		active: R(Gn(e.layer.id, t)),
		layerId: e.layer.id
	}));
}
function qn(e, t) {
	e.forEach((e) => {
		e.active.value = Gn(e.layerId, t);
	});
}
function Jn(e, t) {
	e.userData.applyEditorLayerState = t;
}
var Yn = V(`
  fn skyboxStudioApplyImageEditorRectOverlay(
    color: vec4<f32>,
    uv: vec2<f32>,
    valid: f32,
    activeValue: f32
  ) -> vec4<f32> {
    let activeAmount = clamp(activeValue, 0.0, 1.0);
    let rectCoverage = valid * activeAmount;
    let edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${K(vn)});
    let bounds = rectCoverage * (
      1.0 - smoothstep(
        edgeWidth * ${K(hn)},
        edgeWidth * ${K(gn)},
        edgeDistance
      )
    );
    let rectAlpha = rectCoverage * ${K(mn)};
    let overlayAlpha = max(rectAlpha, bounds);
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), overlayAlpha),
      color.a
    );
  }
`), Xn = V(`
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
    let spotEdgeWidth = clamp(fwidth(spotEdgeDistance), 0.000001, ${K(vn)});
    let spotValid = step(${K(_n)}, spotDenom) *
      step(-spotEdgeWidth, spotEdgeDistance) *
      smoothstep(-spotEdgeWidth, spotEdgeWidth, spotEdgeDistance);

    return vec4<f32>(spotU, spotV, spotValid, 0.0);
  }
`);
//#endregion
//#region src/layer-addons/builtins/spot.ts
function Zn(i, s) {
	let c = In(s), u = r(i), f = r(c.centerDirection), p = t(u, f), m = Math.acos(T(p, -1, 1)), y = Math.max(c.angularRadius, 1e-4), ee = m / y;
	if (c.colorMode === "gradient") return ee > 1 ? [
		0,
		0,
		0,
		0
	] : h(o(c.stops), ee);
	let b = l(i, f, y), x = b.d, te = e(c.lightColor), S = c.brightness, ne = T(1 - x / c.coreRadius) ** +c.coreSoftness, re = T(1 - x / c.glowSize) ** 2 * c.glowStrength, w = T(1 - x / c.glareSize) ** 1.15 * c.glareStrength, E = (ne + re + w) * S, D = _(te, E);
	D = n(D, [
		Math.max(E - 1, 0),
		Math.max(E - 1, 0),
		Math.max(E - 1, 0)
	]);
	let O = Math.max(c.haloInnerWidth, 1e-4), k = Math.max(c.haloOuterWidth, 1e-4), A = x - c.haloRadius, j = Math.exp(-v(A / (A < 0 ? O : k))), ie = C(d([
		1,
		1,
		1
	], g(T((x - (c.haloRadius - O)) / (O + k))), c.dispersion), te), ae = j * c.haloStrength * S;
	D = n(D, _(ie, ae)), D = n(D, _([
		1,
		1,
		1
	], Math.max(ae - 1.2, 0) * .22));
	let oe = Math.abs(b.y), M = Math.abs(b.x), se = Math.exp(-v((M - c.haloRadius) / Math.max(c.dogSpread, 1e-4))) * Math.exp(-v(oe / Math.max(c.dogSpread * .72, 1e-4))), ce = a(c.haloRadius, c.haloRadius + Math.max(c.dogStretch, 1e-4), M) * (1 - a(c.haloRadius + Math.max(c.dogStretch, 1e-4), c.haloRadius + Math.max(c.dogStretch * 2.2, 1e-4), M)) * Math.exp(-v(oe / Math.max(c.dogSpread * .9, 1e-4))), le = C(d([
		1,
		1,
		1
	], g(T((M - (c.haloRadius - c.dogSpread * 1.4)) / Math.max(c.dogSpread * 3.5, 1e-4))), c.dispersion), te), ue = (se + ce * .28) * c.dogStrength * S;
	D = n(D, _(le, ue)), D = n(D, _([
		1,
		1,
		1
	], Math.max(ue - 1.1, 0) * .18));
	let N = T(Math.max(D[0], D[1], D[2]));
	return N <= 1e-5 ? [
		0,
		0,
		0,
		0
	] : [
		D[0] / N,
		D[1] / N,
		D[2] / N,
		N
	];
}
function Qn(e) {
	return +(e === "gradient");
}
function $n(e) {
	let t = In(e);
	return {
		brightness: Math.max(0, t.brightness),
		centerDirection: new A.Vector3(...t.centerDirection).normalize(),
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
		lightColor: Mt(t.lightColor),
		mode: Qn(t.colorMode),
		radius: Math.max(1e-4, t.angularRadius),
		stops: St(t)
	};
}
function er(e) {
	return e.map((e) => {
		let t = $n(e.layer.params);
		return {
			brightness: R(t.brightness),
			centerDirection: R(t.centerDirection),
			coreRadius: R(t.coreRadius),
			coreSoftness: R(t.coreSoftness),
			dispersion: R(t.dispersion),
			dogSpread: R(t.dogSpread),
			dogStrength: R(t.dogStrength),
			dogStretch: R(t.dogStretch),
			glareSize: R(t.glareSize),
			glareStrength: R(t.glareStrength),
			glowSize: R(t.glowSize),
			glowStrength: R(t.glowStrength),
			haloInnerWidth: R(t.haloInnerWidth),
			haloOuterWidth: R(t.haloOuterWidth),
			haloRadius: R(t.haloRadius),
			haloStrength: R(t.haloStrength),
			layerId: e.layer.id,
			lightColor: R(t.lightColor),
			mode: R(t.mode),
			radius: R(t.radius),
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t.stops[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: R(Ct(r)),
					midpoint: R(r.midpoint),
					t: R(r.t)
				};
			})
		};
	});
}
function tr(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = $n(t.params);
	n.brightness.value = r.brightness, n.centerDirection.value.copy(r.centerDirection), n.coreRadius.value = r.coreRadius, n.coreSoftness.value = r.coreSoftness, n.dispersion.value = r.dispersion, n.dogSpread.value = r.dogSpread, n.dogStrength.value = r.dogStrength, n.dogStretch.value = r.dogStretch, n.glareSize.value = r.glareSize, n.glareStrength.value = r.glareStrength, n.glowSize.value = r.glowSize, n.glowStrength.value = r.glowStrength, n.haloInnerWidth.value = r.haloInnerWidth, n.haloOuterWidth.value = r.haloOuterWidth, n.haloRadius.value = r.haloRadius, n.haloStrength.value = r.haloStrength, n.lightColor.value.copy(r.lightColor), n.mode.value = r.mode, n.radius.value = r.radius, n.stops.forEach((e, t) => {
		let n = r.stops[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(Ct(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function nr(e) {
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
function rr(e) {
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
function ir(e) {
	let t = `${e.parameterPrefix}Mode > 0.5`, n = rr(e);
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
      ${J("spotColor", "vec3<f32>", `${e.parameterPrefix}LightColor * spotMonoLight + vec3<f32>(max(spotMonoLight - 1.0, 0.0))`)}

      let spotHaloInner = max(${e.parameterPrefix}HaloInnerWidth, 0.0001);
      let spotHaloOuter = max(${e.parameterPrefix}HaloOuterWidth, 0.0001);
      let spotHaloDelta = spotD - ${e.parameterPrefix}HaloRadius;
      let spotHaloWidth = select(spotHaloOuter, spotHaloInner, spotHaloDelta < 0.0);
      let spotHaloEnvelope = exp(-pow(spotHaloDelta / spotHaloWidth, 2.0));
      let spotHaloT = clamp((spotD - (${e.parameterPrefix}HaloRadius - spotHaloInner)) / (spotHaloInner + spotHaloOuter), 0.0, 1.0);
      ${J("spotSpectrum", "vec3<f32>", "vec3<f32>(1.0, 0.12, 0.05)")}
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
      ${J("spotDogSpectrum", "vec3<f32>", "vec3<f32>(1.0, 0.12, 0.05)")}
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
var ar = {
	collect: nr,
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
		return r ? ir(r) : Re();
	},
	createSampleNodes: ({ bindings: e, direction: t, uniforms: n }) => ({ editorProjectionByLayerId: new Map(e.map((e) => {
		let r = n[e.index], i = Xn({
			direction: t,
			spotCenterDirection: r.centerDirection,
			spotRadius: r.radius
		});
		return [e.layer.id, {
			uv: z(i.x, i.y),
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
	createUniforms: er,
	getTopologyKey: (e) => ({ stopCount: e.params.stops.length }),
	type: "spot",
	updateUniforms: tr
};
S({
	type: "spot",
	sampleCpu: (e, t) => Zn(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: ar,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => ar.getTopologyKey(e)
});
//#endregion
//#region src/layer-addons/builtins/starfield.ts
function or(e) {
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
function sr(e) {
	e.userData.starfieldRenderTarget || e.dispose();
}
function cr(e, t) {
	return e.get(t.id) ?? Q;
}
function lr(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? Q;
	});
}
function ur(e, t) {
	e.forEach((e, n) => {
		e.screenTextureNode.value = t.get(n) ?? Q;
	});
}
var dr = V("\n  fn skyboxStudioDirectionToSourceStarfieldUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let theta = atan2(normalizedDirection.x, normalizedDirection.z);\n    let u = fract(theta / 6.283185307179586 + 0.5);\n    let v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / 3.141592653589793;\n\n    return vec2<f32>(u, v);\n  }\n"), fr = V("\n  fn skyboxStudioCombineStarfieldSample(\n    backdrop: vec4<f32>,\n    screenStars: vec4<f32>\n  ) -> vec4<f32> {\n    return vec4<f32>(backdrop.rgb + screenStars.rgb, max(backdrop.a, screenStars.a));\n  }\n");
S({
	type: "starfield",
	updateLive: (e, t) => {
		e.applyLayerParams(t), e.scheduleResourceBake(t.id, t.params);
	},
	wgsl: {
		collect: or,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : Re();
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, resourceTextures: r }) => {
			let i = n, a = /* @__PURE__ */ new Map(), o = Object.fromEntries(e.map((e) => {
				let n = dr({ direction: t }), o = De(cr(i, e.layer), n).setName(`starfieldTexture${e.index}`);
				o.getUniformHash = () => `skybox-starfield-texture:${e.layer.id}`;
				let s = De(r.get(e.layer.id) ?? Q, xe).setName(`starfieldScreenTexture${e.index}`);
				s.getUniformHash = () => `skybox-starfield-screen-texture:${e.layer.id}`;
				let c = fr({
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
function pr(e, t, n = {}) {
	let r = O(t.type);
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
function mr(e, t, n = {}) {
	return t.filter((e) => e.enabled).reverse().reduce((t, r) => {
		let i = r.type === "group" ? [...mr(e, r.children, n), 1] : pr(e, r, n), a = T(i[3] * (r.opacity / 100));
		return ee(t, [
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
function hr(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = hr(n.children, t);
		if (e) return e;
	}
	return null;
}
function gr(e, t, n = {}) {
	let r = G(e), i = n.targetGroupId ? hr(r.nodes, n.targetGroupId) : null;
	return mr(t, n.targetGroupId ? i ? [i] : [] : r.nodes, n);
}
//#endregion
//#region src/baking/bake.ts
var _r = 1024, vr = "0.1.1", yr = /* @__PURE__ */ new Map(), br = /* @__PURE__ */ new Map();
function xr(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function Sr(e, t) {
	return y(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: vr
	}));
}
function Cr() {
	yr.clear(), br.clear();
}
function wr(e, t = []) {
	return e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				wr(e.children, t);
				return;
			}
			e.type === "starfield" && t.push(e);
		}
	}), t;
}
function Tr(e, t) {
	for (let n of e) {
		if (n.type !== "group") continue;
		if (n.id === t) return n;
		let e = Tr(n.children, t);
		if (e) return e;
	}
	return null;
}
function Er(e, t, n, r, i) {
	let a = wr(r ? Tr(e.nodes, r)?.children ?? [] : e.nodes);
	if (a.length === 0) return;
	let o = /* @__PURE__ */ new Map();
	return a.forEach((e) => {
		let r = i?.get(e.id);
		if (r) {
			o.set(e.id, r);
			return;
		}
		let a = re(e.params, t, n), s = br.get(a), c = s ?? x(e.params, t, n);
		s || br.set(a, c), o.set(e.id, c);
	}), o;
}
function Dr(e, t = {}) {
	let n = G(e), r = xr(t), i = r.cache ? Sr(n, r) : null;
	if (i) {
		let e = yr.get(i);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: a, targetGroupId: o, width: s } = r, c = Er(n, s, a, o, t.starfieldBakes), l = new Uint8ClampedArray(s * a * 4);
	for (let e = 0; e < a; e += 1) {
		let t = (e + .5) / a;
		for (let r = 0; r < s; r += 1) {
			let [i, d, f] = m(gr(n, u((r + .5) / s, t), {
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
	return i && yr.set(i, {
		...d,
		data: new Uint8ClampedArray(l)
	}), d;
}
//#endregion
//#region src/skybox/composition.ts
function Or(e) {
	return e.filter((e) => e.enabled).reverse();
}
function kr(e) {
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
function Ar(e) {
	return {
		blendMode: kr(e.blendMode),
		opacity: T(e.opacity / 100)
	};
}
function jr(e) {
	return `select(1.055 * pow(${e}, ${q(1 / 2.4)}) - ${q(.055)}, ${e} * 12.92, ${e} <= ${q(.0031308)})`;
}
function Mr(e) {
	return `select(pow((${e} + ${q(.055)}) / ${q(1.055)}, ${q(2.4)}), ${e} / 12.92, ${e} <= ${q(.04045)})`;
}
function Nr(e) {
	let t = q(1), n = q(.5), r = q(0), i = "blendSource", a = "blendBackdrop";
	switch (e) {
		case "darken": return `min(${a}, ${i})`;
		case "multiply": return `${a} * ${i}`;
		case "color-burn": return Y(`${a} == ${t}`, t, Y(`${i} == ${r}`, r, `${t} - min(${t}, (${t} - ${a}) / ${i})`));
		case "lighten": return `max(${a}, ${i})`;
		case "screen": return `${a} + ${i} - ${a} * ${i}`;
		case "color-dodge": return Y(`${a} == ${r}`, r, Y(`${i} == ${t}`, t, `min(${t}, ${a} / (${t} - ${i}))`));
		case "overlay": return Y(`${a} <= ${n}`, `2.0 * ${a} * ${i}`, `${t} - 2.0 * (${t} - ${a}) * (${t} - ${i})`);
		case "soft-light": return Y(`${i} <= ${n}`, `${a} - (${t} - 2.0 * ${i}) * ${a} * (${t} - ${a})`, `${a} + (2.0 * ${i} - ${t}) * (softLightD - ${a})`);
		case "hard-light": return Y(`${i} <= ${n}`, `2.0 * ${a} * ${i}`, `${a} + (2.0 * ${i} - ${t}) - ${a} * (2.0 * ${i} - ${t})`);
		case "difference": return `abs(${a} - ${i})`;
		case "exclusion": return `${a} + ${i} - 2.0 * ${a} * ${i}`;
		default: return i;
	}
}
function Pr() {
	return `let softLightD = ${Y("blendBackdrop <= vec3<f32>(0.25)", "((16.0 * blendBackdrop - vec3<f32>(12.0)) * blendBackdrop + vec3<f32>(4.0)) * blendBackdrop", "sqrt(blendBackdrop)")};`;
}
function Fr(e, t) {
	let n = kr(t);
	return `${e} >= ${K(n - .5)} && ${e} < ${K(n + .5)}`;
}
function Ir(e) {
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
	].map((t, n) => `${n === 0 ? "if" : "else if"} (${Fr(e, t)}) {
            blendedSrgb = ${Nr(t)};
          }`).join("\n");
	return `let blendSourceLinear = clamp(effectColor.rgb, vec3<f32>(0.0), vec3<f32>(1.0));
        ${J("blendedColor", "vec3<f32>", "blendSourceLinear")}
        if (${e} >= ${K(.5)}) {
          let blendBackdropLinear = clamp(composedColor, vec3<f32>(0.0), vec3<f32>(1.0));
          let blendBackdrop = ${jr("blendBackdropLinear")};
          let blendSource = ${jr("blendSourceLinear")};
          ${Pr()}
          ${J("blendedSrgb", "vec3<f32>", "blendSource")}
          ${t}
          let blendedSrgbClamped = clamp(blendedSrgb, vec3<f32>(0.0), vec3<f32>(1.0));
          blendedColor = ${Mr("blendedSrgbClamped")};
        }`;
}
function Lr(e, t, n, r = 0) {
	return Or(e).map((e, i) => {
		let a = e.type === "group" ? `effectColor = vec4<f32>(groupColor${r}_${i}, 1.0);` : zr(e, n), o = `groupColor${r}_${i}`, s = t.get(e.id), c = s ? `${s.parameterPrefix}Opacity` : K(e.opacity / 100), l = s ? `${s.parameterPrefix}BlendMode` : K(kr(e.blendMode));
		return `{
        ${e.type === "group" ? `${J(o, "vec3<f32>", "vec3<f32>(0.0)")}
        {
          ${J("previousComposedColor", "vec3<f32>", "composedColor")}
          composedColor = vec3<f32>(0.0);
          ${Lr(e.children, t, n, r + 1)}
          ${o} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${J("effectColor", "vec4<f32>", "vec4<f32>(0.0)")}
        ${a}
        let sourceAlpha = clamp(effectColor.a * ${c}, 0.0, 1.0);
        ${Ir(l)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          vec3<f32>(0.0),
          vec3<f32>(1.0)
        );
      }`;
	}).join("\n");
}
function Rr(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function zr(e, t) {
	let n = t.adapters.get(e.type);
	return n ? n.adapter.createSampleExpression(e, "wgsl", { bindingsByLayerId: n.bindingsByLayerId }) : Re();
}
//#endregion
//#region src/skybox/materials.ts
function Br(e) {
	return e.map((e) => {
		let t = Ar(e.node);
		return {
			blendMode: R(t.blendMode),
			nodeId: e.node.id,
			opacity: R(t.opacity)
		};
	});
}
function Vr(e, t) {
	for (let n of e) if (n.enabled) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = Vr(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
function Hr(e, t) {
	e.forEach((e) => {
		let n = Vr(t.nodes, e.nodeId);
		if (!n) return;
		let r = Ar(n);
		e.opacity.value = r.opacity, e.blendMode.value = r.blendMode;
	});
}
function Ur(e, t) {
	let n = e.find((e) => e.nodeId === t.id);
	if (!n) return;
	let r = Ar(t);
	n.opacity.value = r.opacity, n.blendMode.value = r.blendMode;
}
function Wr(e, t) {
	e.userData.applyCompositionParams = t;
}
function Gr(e, t) {
	e.userData.applyLayerComposition = t;
}
function Kr(e) {
	let t = [];
	function n(e) {
		Or(e).forEach((e) => {
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
function qr(e) {
	return new Map(e.map((e) => [e.node.id, e]));
}
function Jr() {
	return w().map((e) => e.wgsl).filter((e) => !!e);
}
function Yr(e, t, n, r, i, a, o) {
	let s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map(), l = {}, u = {};
	return Jr().forEach((a) => {
		let d = a.collect(e.nodes), f = a.createUniforms(d), p = a.createSampleNodes?.({
			bindings: d,
			direction: t,
			imageTextures: a.type === "starfield" ? r : n,
			resourceTextures: a.type === "clouds" ? o : a.type === "starfield" ? i : /* @__PURE__ */ new Map(),
			uniforms: f
		}), m = {
			adapter: a,
			bindings: d,
			bindingsByLayerId: Rr(d),
			samples: p,
			uniforms: f
		};
		p?.editorProjectionByLayerId && p.editorProjectionByLayerId.forEach((e, t) => {
			c.set(t, e);
		}), p?.textureSlots && Object.assign(u, p.textureSlots), Object.assign(l, a.createSampleParameters?.(d, f, p) ?? {}), s.set(a.type, m);
	}), {
		adapters: s,
		editorProjectionByLayerId: c,
		sampleParameters: l,
		textureSlotsByLayerId: u
	};
}
function Xr(e, t) {
	return e.adapters.get(t);
}
function Zr(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Zr(e.children, t);
				return;
			}
			t(e);
		}
	});
}
function Qr(e, t) {
	let n = e.adapters.get(t.type);
	n && n.adapter.updateUniforms(n.uniforms, t);
}
function $r(e, t, n) {
	let r = qr(n), i = Lr(e.nodes, r, t);
	return V(`
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
function ei(e, t, n, r, i, a, o) {
	let s = Kr(e.nodes), c = Br(s), l = Yr(e, t, n, r, i, a, o), u = Xr(l, "image"), d = u?.uniforms ?? [], f = u?.samples, p = Xr(l, "starfield")?.samples;
	return {
		colorNode: $r(e, l, s)({
			direction: t,
			...l.sampleParameters,
			...Object.fromEntries(s.flatMap((e) => {
				let t = c[e.index];
				return [[`${e.parameterPrefix}Opacity`, t.opacity], [`${e.parameterPrefix}BlendMode`, t.blendMode]];
			}))
		}),
		compositionUniforms: c,
		imageSamples: f,
		imageUniforms: d,
		layerRuntime: l,
		starfieldSamples: p
	};
}
function ti() {
	let e = xe.mul(2).sub(1), t = M.mul(ke(e.x, e.y.negate(), 1, 1)), n = t.xyz.div(t.w), r = se.mul(ke(n, 0)).xyz;
	return _e(r);
}
function ni(e, t, n, r, i, a, o, s) {
	let c = new U(), l = j(() => {
		let e = ge;
		return e.z.assign(e.w), e;
	})();
	c.side = A.BackSide, c.depthTest = !1, c.depthWrite = !1, c.vertexNode = l;
	let { colorNode: u, compositionUniforms: d, imageSamples: f, imageUniforms: p, layerRuntime: m, starfieldSamples: h } = ei(e, ti(), n, r, i, a, o), g = s ? w().flatMap((e) => {
		let n = m.adapters.get(e.type);
		if (!e.wgslEditorOverlay || !n) return [];
		let r = n.bindings;
		return [{
			bindings: r,
			editorUniforms: Kn(r, t)
		}];
	}) : [], _ = u;
	return g.forEach(({ bindings: e, editorUniforms: t }) => {
		e.forEach((e, n) => {
			let r = m.editorProjectionByLayerId.get(e.layer.id);
			r && (_ = Yn({
				color: _,
				activeValue: t[n].active,
				uv: r.uv,
				valid: r.valid
			}));
		});
	}), c.colorNode = _, g.length > 0 && Jn(c, (e) => {
		g.forEach(({ editorUniforms: t }) => qn(t, e));
	}), c.userData.webGpuLayerRuntime = m, c.userData.applyLayerParams = (e) => Qr(m, e), Wr(c, (e) => Hr(d, e)), Gr(c, (e) => Ur(d, e)), Cn(c, (e, t) => Sn(p, e, t)), c.userData.applyImageTextures = (e) => kn(f?.sampleData ?? /* @__PURE__ */ new Map(), e), c.userData.applyStarfieldTextures = (e) => lr(h?.sampleData ?? /* @__PURE__ */ new Map(), e), c.userData.applyStarfieldScreenTextures = (e) => ur(h?.sampleData ?? /* @__PURE__ */ new Map(), e), c.userData.applyCloudFieldTextures = (e) => {
		dt(m.adapters.get("clouds")?.samples, e);
	}, c.userData.applyTime = (e) => {
		m.adapters.forEach((t) => {
			t.adapter.updateTime?.(t.uniforms, e);
		});
	}, c.userData.debugImageTextureSlots = m.textureSlotsByLayerId, c.userData.debugStarfieldScreenTextureSlots = Object.fromEntries(Array.from(h?.sampleData.entries() ?? []).map(([e, t]) => [e, t.screenTextureNode])), c.userData.debugStarfieldSampleNodes = Object.fromEntries(Array.from(h?.sampleData.entries() ?? []).map(([e, t]) => [e, t.sampleNode])), c;
}
var ri = V("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.x, -normalizedDirection.z);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n"), ii = V("\n  fn skyboxStudioEquirectUvToDirection(uv: vec2<f32>) -> vec3<f32> {\n    let lambda = (uv.x - 0.5) * 6.283185307179586;\n    let phi = (uv.y - 0.5) * 3.141592653589793;\n    let cosPhi = cos(phi);\n\n    return normalize(vec3<f32>(cosPhi * sin(lambda), sin(phi), -cosPhi * cos(lambda)));\n  }\n");
function ai(e, t, n, r, i = {}) {
	let a = new U();
	a.side = A.DoubleSide, a.depthTest = !1, a.depthWrite = !1;
	let o = ve.xy.mul(.5).add(.5), { colorNode: s } = ei(e, _e(ii({ uv: i.flipY ? z(o.x, o.y.oneMinus()) : o })), t, n, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), r);
	return a.colorNode = s, a;
}
function oi(e) {
	let t = new U(), n = j(() => {
		let e = ge;
		return e.z.assign(e.w), e;
	})(), r = ti();
	return t.side = A.BackSide, t.depthTest = !1, t.depthWrite = !1, t.vertexNode = n, t.colorNode = De(e, ri({ direction: r })), t;
}
function si(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function ci(e, t = {}) {
	let n = Dr(e, t), r = si(n.width, n.height), i = r.getContext("2d");
	if (!i || !("putImageData" in i)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	i.putImageData(new ImageData(n.data, n.width, n.height), 0, 0);
	let a = new A.CanvasTexture(r);
	return a.mapping = A.EquirectangularReflectionMapping, a.wrapS = A.RepeatWrapping, a.wrapT = A.ClampToEdgeWrapping, a.colorSpace = A.SRGBColorSpace, a.flipY = !1, a.needsUpdate = !0, a;
}
function li(e) {
	return oi(e);
}
function ui(e) {
	return e === "baked-texture" ? "baked-texture" : "live-webgpu";
}
function di(e, t, n) {
	let r = (e) => e.type === "group" ? {
		children: e.children.map(r),
		enabled: e.enabled,
		id: e.id,
		type: e.type
	} : {
		enabled: e.enabled,
		id: e.id,
		topology: O(e.type)?.getTopologyKey?.(e) ?? null,
		type: e.type
	};
	return JSON.stringify({
		editorPresentationEnabled: n,
		geometry: e.geometry?.type ?? W.type,
		nodes: e.nodes.map(r),
		renderMode: t
	});
}
function fi(e, t) {
	for (let n of e) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = fi(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
//#endregion
//#region src/skybox.ts
var pi = { starsOmitted: !0 }, mi = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: W,
	nodes: [],
	version: 2
}, hi = class extends A.Mesh {
	#e = {};
	#t = /* @__PURE__ */ new Map();
	#n = { ...Hn };
	#r = !1;
	#i = W;
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
			this.scheduleStarfieldTextureBake(e, t);
		}
	};
	#c = mi;
	#l = null;
	#u = null;
	#d = "auto";
	#f = null;
	#p = null;
	#m = null;
	#h = /* @__PURE__ */ new Map();
	#g = /* @__PURE__ */ new Map();
	#_ = /* @__PURE__ */ new Map();
	#v = /* @__PURE__ */ new Map();
	#y = 0;
	#b = /* @__PURE__ */ new Map();
	#x = new A.Vector2();
	#S = new A.Quaternion();
	#C = new A.Color();
	constructor() {
		super(Fe(W), ni(mi, Hn, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), !1)), this.frustumCulled = !1, this.renderOrder = -1, this.onBeforeRender = ((e, t, n) => {
			this.renderStarfieldGlintTargets(e, n);
		});
	}
	fromManifest(e) {
		return this.#c = G(e), this.applyGeometry(this.#c.geometry ?? W), this;
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
		return this.#f = e, this.#p?.dispose(), this.#p = D(e), this.#b.forEach((e) => {
			e.dirty = !0;
		}), this;
	}
	setRenderMode(e) {
		return this.#d = e, this;
	}
	setTime(e) {
		return !Number.isFinite(e) || this.#y === e ? this : (this.#y = e, this.material.userData.applyTime?.(e), this);
	}
	setStarGlintViewport(e) {
		let t = e && e.renderHeight > 0 && e.verticalFovRadians > 0 ? {
			renderHeight: e.renderHeight,
			verticalFovRadians: e.verticalFovRadians
		} : null, n = this.#m?.renderHeight !== t?.renderHeight;
		return this.#m = t, n && this.#b.forEach((e) => {
			e.handle.setViewport(t), e.dirty = !0;
		}), this;
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
		this.material.userData.applyStarfieldTextures?.(this.#_);
	}
	otherOverridingSetup() {
		return this;
	}
	load(e) {
		return e && (this.#f = e), this.setManifest(this.#c), this;
	}
	applyGeometry(e) {
		let t = Pe(e);
		if (this.#i.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#i = t, this.geometry = Fe(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#u?.dispose(), this.#u = null;
	}
	disposeStarfieldTextures() {
		this.#h.forEach((e) => {
			clearTimeout(e);
		}), this.#h.clear(), this.#_.forEach((e) => sr(e)), this.#_.clear(), this.#g.clear(), this.#p?.dispose(), this.#p = null;
	}
	disposeStarfieldGlints() {
		this.#b.forEach((e) => {
			e.scene.remove(e.handle.object), e.handle.dispose(), e.target.dispose();
		}), this.#b.clear(), this.#v.clear();
	}
	disposeStarfieldGlint(e) {
		let t = this.#b.get(e);
		t && (t.scene.remove(t.handle.object), t.handle.dispose(), t.target.dispose(), this.#b.delete(e), this.#v.delete(e), this.material.userData.applyStarfieldScreenTextures?.(this.#v));
	}
	createStarfieldGlintTarget(e) {
		let t = new A.RenderTarget(1, 1, {
			depthBuffer: !1,
			format: A.RGBAFormat,
			generateMipmaps: !1,
			magFilter: A.LinearFilter,
			minFilter: A.LinearFilter,
			stencilBuffer: !1,
			type: A.UnsignedByteType
		});
		return t.texture.colorSpace = A.SRGBColorSpace, t.texture.generateMipmaps = !1, t.texture.name = `Starfield screen target ${e}`, t;
	}
	syncStarfieldGlint(e, t) {
		let n = this.#p;
		if (!n?.createGlints || ui(this.#d) !== "live-webgpu") {
			this.disposeStarfieldGlint(e);
			return;
		}
		let r = n.glintGeometryKey(t), i = this.#b.get(e);
		if (i) {
			if (i.geometryKey === r) {
				i.handle.setParams(t), i.handle.setCoverageTexture(null), i.dirty = !0;
				return;
			}
			i.scene.remove(i.handle.object), i.handle.dispose();
			let e = n.createGlints(t);
			e.setViewport(this.#m), e.setCoverageTexture(null), i.scene.add(e.object), i.handle = e, i.geometryKey = r, i.dirty = !0;
			return;
		}
		let a = n.createGlints(t), o = new A.Scene(), s = this.createStarfieldGlintTarget(e);
		a.setViewport(this.#m), a.setCoverageTexture(null), o.add(a.object), this.#b.set(e, {
			cameraQuaternion: new A.Quaternion(),
			dirty: !0,
			geometryKey: r,
			handle: a,
			hasCameraState: !1,
			projectionMatrix: new A.Matrix4(),
			scene: o,
			target: s
		}), this.#v.set(e, s.texture), this.material.userData.applyStarfieldScreenTextures?.(this.#v);
	}
	renderStarfieldGlintTargets(e, t) {
		let n = e;
		if (this.#b.size === 0 || typeof n.setRenderTarget != "function") return;
		n.getDrawingBufferSize?.(this.#x);
		let r = this.#b.values().next().value?.target, i = Math.max(1, Math.floor(this.#x.x || r?.width || 1)), a = Math.max(1, Math.floor(this.#x.y || r?.height || 1));
		t.getWorldQuaternion(this.#S);
		let o = Array.from(this.#b.values()).filter((e) => ((e.target.width !== i || e.target.height !== a) && (e.target.setSize(i, a), e.dirty = !0), (!e.hasCameraState || !e.cameraQuaternion.equals(this.#S) || !e.projectionMatrix.equals(t.projectionMatrix)) && (e.dirty = !0), e.dirty));
		if (o.length === 0) return;
		let s = n.getRenderTarget(), c = n.autoClear, l = n.getClearAlpha?.() ?? 1, u = n.getClearColor?.(this.#C)?.clone();
		n.autoClear = !0, n.setClearColor?.(0, 0), o.forEach((e) => {
			n.setRenderTarget(e.target), n.render(e.scene, t), e.cameraQuaternion.copy(this.#S), e.projectionMatrix.copy(t.projectionMatrix), e.hasCameraState = !0, e.dirty = !1;
		}), n.setRenderTarget(s), u && n.setClearColor?.(u, l), n.autoClear = c;
	}
	syncStarfieldTextures() {
		let e = /* @__PURE__ */ new Set();
		Zr(this.#c.nodes, (t) => {
			if (t.type !== "starfield") return;
			e.add(t.id), this.syncStarfieldGlint(t.id, t.params);
			let n = this.#p?.createBakeKey(t.params, void 0, null, pi) ?? "";
			this.#g.get(t.id) !== n && this.scheduleStarfieldTextureBake(t.id, t.params);
		}), Array.from(this.#_.keys()).forEach((t) => {
			if (e.has(t)) return;
			let n = this.#_.get(t);
			n && sr(n), this.#_.delete(t), this.#g.delete(t);
		}), Array.from(this.#b.keys()).forEach((t) => {
			e.has(t) || this.disposeStarfieldGlint(t);
		}), Array.from(this.#h.entries()).forEach(([t, n]) => {
			e.has(t) || (clearTimeout(n), this.#h.delete(t));
		});
	}
	scheduleStarfieldTextureBake(e, t) {
		this.syncStarfieldGlint(e, t);
		let n = this.#p?.createBakeKey(t, void 0, null, pi) ?? "";
		if (this.#g.get(e) === n) return;
		let r = this.#h.get(e);
		r && clearTimeout(r);
		let i = setTimeout(() => {
			this.#h.delete(e);
			let t = fi(this.#c.nodes, e);
			if (t?.type !== "starfield") return;
			let r = this.#p?.createBakeKey(t.params, void 0, null, pi) ?? "";
			if (r !== n) {
				this.scheduleStarfieldTextureBake(e, t.params);
				return;
			}
			if (!this.#p && this.#f && (this.#p = D(this.#f)), !this.#p?.canBake()) return;
			let i = this.#p.bakeTexture(t.params, r, void 0, null, pi), a = this.#_.get(e);
			a && a !== i && sr(a), this.#_.set(e, i), this.#g.set(e, r), a ? this.refreshStarfieldTextureBindings() : (this.#l = null, this.setManifest(this.#c)), this.dispatchEvent({ type: "starfieldtexturechange" });
		}, 150);
		this.#h.set(e, i);
	}
	replaceMaterial(e, t = null) {
		let n = this.material;
		this.material = e, e.userData.applyEditorLayerState?.(this.#n), this.#a.forEach((t, n) => {
			e.userData.applyImageLayerPlacement?.(n, t);
		}), e.userData.applyStarfieldTextures?.(this.#_), e.userData.applyStarfieldScreenTextures?.(this.#v), e.userData.applyCloudFieldTextures?.(this.#t), e.userData.applyTime?.(this.#y), n.dispose(), this.disposeOwnedTexture(), this.#u = t;
	}
	applyLiveManifestUniformUpdates() {
		this.material.userData.applyCompositionParams?.(this.#c), this.material.userData.applyLayerParams && Zr(this.#c.nodes, this.material.userData.applyLayerParams), this.material.userData.applyImageTextures?.(this.#o), this.material.userData.applyStarfieldTextures?.(this.#_), this.material.userData.applyStarfieldScreenTextures?.(this.#v), this.material.userData.applyCloudFieldTextures?.(this.#t), this.material.userData.applyTime?.(this.#y), this.material.userData.applyEditorLayerState?.(this.#n), this.#a.forEach((e, t) => {
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
		let n = fi(this.#c.nodes, e);
		return n?.type === "image" && (n.params = {
			...n.params,
			placement: t
		}), this.#a.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this.#c = Ne(this.#c), Zr(this.#c.nodes, (e) => {
			e.type === "clouds" && this.#s.applyLayerParams(e);
		}), this;
	}
	updateLayerComposition(e, t) {
		let n = fi(this.#c.nodes, e);
		return n ? (t.blendMode !== void 0 && (n.blendMode = t.blendMode), t.opacity !== void 0 && (n.opacity = t.opacity), this.material.userData.applyLayerComposition?.(n), this) : this;
	}
	updateLayer(e, t) {
		let n = fi(this.#c.nodes, e);
		if (!n || n.type === "group") return this;
		n.params = t, this.#c = Ne(this.#c);
		let r = fi(this.#c.nodes, e);
		return !r || r.type === "group" ? this : (lt(this.#c, this.#t) && this.material.userData.applyCloudFieldTextures?.(this.#t), O(r.type)?.updateLive?.(this.#s, r), (r.type === "image" || r.type === "spot") && Zr(this.#c.nodes, (e) => {
			e.type === "clouds" && this.#s.applyLayerParams(e);
		}), this.material.userData.applyTime?.(this.#y), this);
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
		let t = G(e);
		this.#c = t, this.applyGeometry(this.#c.geometry ?? this.#i), lt(this.#c, this.#t), this.syncStarfieldTextures();
		let n = ui(this.#d), r = di(this.#c, n, this.#r);
		if (this.#l === r && n === "live-webgpu") return this.applyLiveManifestUniformUpdates(), this;
		if (n === "live-webgpu") this.replaceMaterial(ni(this.#c, this.#n, this.#o, this.#_, this.#v, /* @__PURE__ */ new Map(), this.#t, this.#r));
		else {
			let e = ci(this.#c, this.#e);
			this.replaceMaterial(li(e), e);
		}
		return this.#l = r, this.material.userData.applyTime?.(this.#y), this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(li(e)), this.#l = null, this;
	}
	invalidateBakeCache() {
		return Cr(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture(), ut(this.#t), this.disposeStarfieldTextures(), this.disposeStarfieldGlints();
	}
};
//#endregion
//#region src/baking/skybox-gpu-bake.ts
function gi(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function _i(e, t, n, r) {
	let i = new A.RenderTarget(e, t, {
		depthBuffer: !1,
		format: A.RGBAFormat,
		generateMipmaps: !1,
		magFilter: A.LinearFilter,
		minFilter: A.LinearFilter,
		stencilBuffer: !1,
		type: n ? r ? A.FloatType : A.HalfFloatType : A.UnsignedByteType,
		wrapS: A.RepeatWrapping,
		wrapT: A.ClampToEdgeWrapping
	});
	return i.texture.name = "GPU baked skybox composition", i.texture.colorSpace = n ? A.LinearSRGBColorSpace : A.SRGBColorSpace, i.texture.generateMipmaps = !1, i;
}
var vi = class {
	#e;
	#t = new A.Scene();
	#n = new A.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#r = new A.PlaneGeometry(2, 2);
	constructor(e) {
		this.#e = e;
	}
	canBake() {
		return gi(this.#e);
	}
	bakeRenderTarget(e, t) {
		let n = Math.max(1, Math.floor(t.width)), r = Math.max(1, Math.floor(t.height)), i = G(e), a = t.cloudFieldTextures ? null : /* @__PURE__ */ new Map(), o = t.cloudFieldTextures ?? a ?? /* @__PURE__ */ new Map();
		a && lt(i, a);
		let s = ai(i, t.imageTextures ?? /* @__PURE__ */ new Map(), t.starfieldTextures ?? /* @__PURE__ */ new Map(), o, { flipY: t.flipY }), c = _i(n, r, !!t.hdr, !!t.float), l = new A.Mesh(this.#r, s);
		l.frustumCulled = !1;
		let u = this.#e.getRenderTarget(), d = this.#e.autoClear, f = new A.Color(), p = this.#e.getClearAlpha();
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
				s.dispose(), c.dispose(), a && ut(a);
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
function yi(e) {
	return gi(e) ? new vi(e) : null;
}
//#endregion
//#region src/loader/loader.ts
var bi = class extends Error {
	constructor(e, t) {
		super(e), this.name = "LoaderAssetError", this.entry = t.entry ?? null, this.event = t.event, this.id = t.id, this.phase = t.phase, this.src = t.src;
	}
}, xi = class {
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
			let e = this.#o.size === 0, n = new bi(e ? `No manifest loaded. Cannot resolve id: "${t}"` : `Manifest loaded but id not found: "${t}". Available ids: ${[...this.#o.keys()].join(", ")}`, {
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
		if (!this.#u(e)) throw new bi("Invalid manifest entry.", { phase: "manifest-parse-error" });
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
		if (!r) throw new bi(`No loader registered for type: ${e}`, {
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
function Si(e) {
	return e.colorSpace = A.SRGBColorSpace, e.wrapS = A.ClampToEdgeWrapping, e.wrapT = A.ClampToEdgeWrapping, e.flipY = !1, e.minFilter = A.LinearMipmapLinearFilter, e.magFilter = A.LinearFilter, e.generateMipmaps = !0, e.needsUpdate = !0, e;
}
var Ci = class {
	static {
		this.type = "texture";
	}
	#e = new A.TextureLoader();
	async load(e, t) {
		let n = Array.isArray(e) ? e : [e], r = null;
		for (let e of n) try {
			return Si(await this.#e.loadAsync(e));
		} catch (n) {
			r = new bi(`Failed to load texture: ${e}`, {
				entry: t,
				event: n,
				phase: "network-error",
				src: e
			});
		}
		throw r ?? new bi(`No texture sources for entry ${t?.id ?? "?"}`, {
			entry: t,
			phase: "network-error",
			src: e
		});
	}
}, wi = "manifest.json";
function Ti(e) {
	let t = [], n = (e) => {
		for (let r of e) r.type === "group" ? n(r.children) : r.type === "image" && t.push(r);
	};
	return n(e.nodes), t;
}
function Ei(e) {
	switch (e.slice(e.lastIndexOf(".") + 1).toLowerCase()) {
		case "jpg":
		case "jpeg": return "image/jpeg";
		case "webp": return "image/webp";
		default: return "image/png";
	}
}
function Di(e, t) {
	let n = e.slice();
	return URL.createObjectURL(new Blob([n], { type: t }));
}
async function Oi(e) {
	if (typeof e == "string") {
		let t = await fetch(e);
		if (!t.ok) throw Error(`Could not fetch zip bundle (${t.status} ${t.statusText}).`);
		return new Uint8Array(await t.arrayBuffer());
	}
	return e instanceof Uint8Array ? e : e instanceof ArrayBuffer ? new Uint8Array(e) : new Uint8Array(await e.arrayBuffer());
}
async function ki(e) {
	let t = e.slice(), n = new Blob([t]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
	return new Uint8Array(await new Response(n).arrayBuffer());
}
var Ai = 101010256, ji = 33639248, Mi = 67324752, Ni = 22, Pi = 65535;
function Fi(e) {
	let t = Math.max(0, e.byteLength - Ni - Pi);
	for (let n = e.byteLength - Ni; n >= t; --n) if (e.getUint32(n, !0) === Ai) return n;
	return -1;
}
async function Ii(e) {
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = Fi(t);
	if (n < 0) throw Error("Invalid zip bundle: end-of-central-directory record not found.");
	let r = t.getUint16(n + 10, !0), i = t.getUint32(n + 16, !0), a = new TextDecoder(), o = [];
	for (let n = 0; n < r; n += 1) {
		if (t.getUint32(i, !0) !== ji) throw Error("Invalid zip bundle: malformed central directory.");
		let n = t.getUint16(i + 10, !0), r = t.getUint32(i + 20, !0), s = t.getUint16(i + 28, !0), c = t.getUint16(i + 30, !0), l = t.getUint16(i + 32, !0), u = t.getUint32(i + 42, !0), d = a.decode(e.subarray(i + 46, i + 46 + s));
		if (t.getUint32(u, !0) !== Mi) throw Error(`Invalid zip bundle: bad local header for "${d}".`);
		let f = t.getUint16(u + 26, !0), p = t.getUint16(u + 28, !0), m = u + 30 + f + p, h = e.subarray(m, m + r);
		if (n === 0) o.push(Promise.resolve([d, h]));
		else if (n === 8) o.push(ki(h).then((e) => [d, e]));
		else throw Error(`Unsupported zip compression method ${n} for "${d}".`);
		i += 46 + s + c + l;
	}
	return Object.fromEntries(await Promise.all(o));
}
async function Li(e, t = {}) {
	let n = t.toAssetUrl ?? Di, r = await Ii(await Oi(e)), i = r[wi];
	if (!i) throw Error(`Zip bundle is missing ${wi}.`);
	let a = JSON.parse(new TextDecoder().decode(i)), o = G(a), s = a.assets ?? {}, c = /* @__PURE__ */ new Map(), l = [];
	for (let [e, t] of Object.entries(r)) {
		if (e === wi) continue;
		let r = n(t, s[e]?.mimeType ?? Ei(e), e);
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
async function Ri(e) {
	let t = await fetch(new URL(wi, e).href);
	if (!t.ok) throw Error(`Could not load ${wi} (${t.status}).`);
	return {
		manifest: G(await t.json()),
		resolveAssetUrl: (t) => new URL(t, e).href,
		dispose: () => {}
	};
}
async function zi(e, t) {
	let n = t.split("/").filter(Boolean), r = e;
	for (let e = 0; e < n.length - 1; e += 1) r = await r.getDirectoryHandle(n[e]);
	let i = await r.getFileHandle(n[n.length - 1]);
	return URL.createObjectURL(await i.getFile());
}
async function Bi(e) {
	let t = await (await e.getFileHandle(wi)).getFile(), n = G(JSON.parse(await t.text())), r = /* @__PURE__ */ new Map();
	for (let t of Ti(n)) t.params.src && r.set(t.params.src, await zi(e, t.params.src));
	return {
		manifest: n,
		resolveAssetUrl: (e) => r.get(e) ?? e,
		dispose: () => {
			for (let e of r.values()) typeof URL < "u" && URL.revokeObjectURL && URL.revokeObjectURL(e);
			r.clear();
		}
	};
}
async function Vi(e) {
	let t = structuredClone(e.manifest);
	for (let n of Ti(t)) {
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
function Hi() {
	let e = new xi();
	return e.register(Ci.type, Ci), e;
}
async function Ui(e, t = {}) {
	let n = t.loader ?? Hi(), r = Ti(e.manifest).filter((e) => e.enabled && e.params.src), i = r.map((t) => ({
		id: t.id,
		src: e.resolveAssetUrl(t.params.src),
		type: Ci.type
	})), a = t.onProgress ? n.onProgress(t.onProgress) : null;
	try {
		await n.load(i);
	} finally {
		a?.();
	}
	let o = /* @__PURE__ */ new Map();
	return await Promise.all(r.map(async (e) => {
		try {
			o.set(e.id, await n.loadAsset(Ci.type, e.id));
		} catch {}
	})), o;
}
function Wi(e) {
	return typeof e == "object" && !!e && "manifest" in e && typeof e.resolveAssetUrl == "function";
}
async function Gi(e, t = {}) {
	let { onProgress: n, ...r } = t, i = !Wi(e), a = Wi(e) ? e : await Li(e, r), o = Hi(), s = await Ui(a, {
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
export { _r as DEFAULT_BAKE_WIDTH, rt as DEFAULT_SKYBOX_CLOUDS_PARAMS, Mn as DEFAULT_SPOT_BASE_ANGULAR_RADIUS, it as FULL_MOON_SKYBOX_CLOUDS_PARAMS, Gt as IMAGE_PLACEMENT_ELEVATION_LIMIT, xi as Loader, bi as LoaderAssetError, hi as Skybox, vi as SkyboxGpuBakeService, Ci as TextureLoaderExtension, Dr as bakeSkyboxImageData, c as blendChannel, T as clamp, at as cloneSkyboxCloudsParams, Ti as collectImageLayers, s as compositeBlendChannel, ee as compositeOver, Si as configureSkyboxImageTexture, an as createAngularDecalPlacement, Sr as createBakeCacheKey, ci as createBakedSkyboxTexture, ot as createDefaultSkyboxCloudsParams, Fn as createDefaultSpotParams, rn as createImagePlacementTangents, Fe as createSkyboxGeometry, yi as createSkyboxGpuBakeService, Le as createSkyboxWireGeometry, sn as directionFromPosition, gr as evaluateSkyboxDirection, O as getLayerRuntimeAdapter, w as getLayerRuntimeAdapters, Cr as invalidateBakeCache, E as isRegisteredLayerType, b as linearChannelToSrgb, m as linearRgbToSrgbBytes, Bi as loadBundleFromDirectory, Ri as loadBundleFromUrl, Li as loadBundleFromZip, Gi as loadSkyboxBundle, Ui as loadSkyboxImageTextures, G as migrateManifestToV2, Z as normalizeImagePlacement, In as normalizeSpotParams, X as normalizeVector, e as parseHexColor, cn as placementFromPosition, fn as placementFromRotation, un as placementFromScale, on as positionFromPlacement, Ln as positionFromSpot, pn as projectDirectionToImageUv, zn as radiusScaleFromSpot, S as registerLayerRuntimeAdapter, Vi as rehydrateImagePixels, xr as resolveBakeOptions, Ne as resolveCloudLightReferences, dn as rotationFromPlacement, ln as scaleFromPlacement, Vn as spotContainsDirection, Rn as spotFromPosition, Bn as spotFromRadiusScale, te as srgbChannelToLinear };
