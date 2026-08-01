import { $ as e, A as t, D as n, F as r, G as i, H as a, I as o, J as s, K as c, L as l, M as u, N as d, O as f, P as p, Q as m, R as h, U as g, V as _, W as v, X as y, Y as b, Z as x, d as S, et as C, it as w, j as ee, k as T, m as te, nt as E, q as D, rt as O, t as k, tt as A, z as j } from "./starfield-bake-registry-D5mi0bgU.js";
import * as M from "three";
import * as ne from "three/tsl";
import { Fn as N, If as re, Loop as ie, cameraPosition as ae, cameraProjectionMatrixInverse as oe, cameraWorldMatrix as se, cos as ce, dFdx as le, dFdy as ue, dot as P, exp as F, float as I, int as de, length as fe, log2 as pe, max as L, min as me, mix as he, modelViewProjection as ge, normalize as _e, positionGeometry as ve, positionWorld as ye, pow as be, screenUV as xe, select as Se, sin as Ce, smoothstep as we, sqrt as Te, struct as Ee, sub as R, texture as De, time as Oe, uniform as z, vec2 as B, vec3 as V, vec4 as ke, wgslFn as H } from "three/tsl";
import * as U from "three/webgpu";
import { Color as Ae, NodeMaterial as je, Vector3 as Me } from "three/webgpu";
//#region src/manifest.ts
var W = { type: "box" };
function Ne(e) {
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
function Pe(e) {
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
			direction: Ne(r ?? e.direction),
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
	return e.version === 2 ? Pe({
		...e,
		geometry: e.geometry ?? W
	}) : Pe({
		composition: e.composition,
		geometry: W,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	});
}
//#endregion
//#region src/skybox/geometry.ts
function Fe(e) {
	return e ?? W;
}
function Ie(e = W) {
	return Fe(e).type === "sphere" ? new M.SphereGeometry(1, 64, 32) : new M.BoxGeometry(1, 1, 1);
}
function Le(e = 1, t = 25, n = 25) {
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
	return new M.BufferGeometry().setAttribute("position", new M.Float32BufferAttribute(r, 3));
}
function Re(e = W) {
	if (Fe(e).type === "sphere") return Le();
	let t = new M.BoxGeometry(1, 1, 1), n = new M.EdgesGeometry(t);
	return t.dispose(), n;
}
//#endregion
//#region src/layer-addons/shader-codegen.ts
function K(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function ze(e) {
	return `vec3<f32>(${K(e)})`;
}
function q(e, t, n) {
	return `var ${e}: ${t} = ${n};`;
}
function Be(e, t, n) {
	return `select(${n}, ${t}, ${e})`;
}
function Ve() {
	return "effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);";
}
//#endregion
//#region src/layer-addons/builtins/clouds/mipped-texture.ts
function He(e, t, n, r) {
	let i = new U.DataTexture(e, t, n);
	return i.format = U.RedFormat, i.type = U.UnsignedByteType, i.wrapS = r, i.wrapT = r, i.minFilter = U.LinearMipmapLinearFilter, i.magFilter = U.LinearFilter, i.generateMipmaps = !0, i.unpackAlignment = 1, i.needsUpdate = !0, i;
}
//#endregion
//#region src/layer-addons/builtins/clouds/cloud-field.ts
var Ue = {
	size: 512,
	tiles: 6,
	octaves: 5,
	persistence: .5,
	seed: 11
};
function We(e, t) {
	return Math.max(1, Math.floor(Math.log2(e / (4 * t))) + 1);
}
function Ge(e) {
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
var Ke = [
	1,
	-1,
	1,
	-1,
	1,
	-1,
	0,
	0
], qe = [
	1,
	1,
	-1,
	-1,
	0,
	0,
	1,
	-1
], Je = (e) => e * e * e * (e * (e * 6 - 15) + 10), Ye = (e, t, n) => e + (t - e) * n;
function Xe(e, t, n, r) {
	let i = Math.floor(t), a = Math.floor(n), o = t - i, s = n - a, c = (e) => (e % r + r) % r, l = c(i), u = c(i + 1), d = c(a), f = c(a + 1), p = (t, n, r, i) => {
		let a = e[e[t & 255] + n & 255] & 7;
		return Ke[a] * r + qe[a] * i;
	}, m = Je(o), h = Je(s);
	return Ye(Ye(p(l, d, o, s), p(u, d, o - 1, s), m), Ye(p(l, f, o, s - 1), p(u, f, o - 1, s - 1), m), h);
}
function Ze(e) {
	let { size: t, tiles: n, persistence: r, seed: i } = e, a = Math.min(e.octaves, We(t, n)), o = Ge(i), s = new Float32Array(t * t), c = Infinity, l = -Infinity, u = 0;
	for (let e = 0; e < t; e += 1) {
		let i = e / t;
		for (let e = 0; e < t; e += 1) {
			let d = e / t, f = n, p = 1, m = 0, h = 0;
			for (let e = 0; e < a; e += 1) m += Xe(o, d * f, i * f, f) * p, h += p, f *= 2, p *= r;
			let g = m / h;
			g < c && (c = g), g > l && (l = g), s[u] = g, u += 1;
		}
	}
	let d = l - c || 1, f = new Uint8Array(t * t);
	for (let e = 0; e < s.length; e += 1) f[e] = Math.round((s[e] - c) / d * 255);
	return He(f, t, t, U.RepeatWrapping);
}
//#endregion
//#region src/layer-addons/builtins/clouds/custom-sky-model.ts
var Qe = N(([e]) => I(.75).mul(I(1).add(e.mul(e)))), $e = N(([e, t]) => {
	let n = e.mul(e);
	return I(1.5).mul(I(1).sub(n).div(I(2).add(n))).mul(I(1).add(t.mul(t))).div(be(L(I(1).add(n).sub(I(2).mul(e).mul(t)), 1e-4), 1.5));
});
function et(e) {
	return {
		direction: z(new Me(0, 1, 0)),
		intensity: z(e.intensity),
		tint: z(new Ae(e.tint)),
		showDisc: z(+!!e.showDisc)
	};
}
function tt(e) {
	return {
		enabled: z(1),
		altitude: z(e.altitude),
		featureSize: z(e.featureSize),
		speed: z(e.speed),
		morphBlend: z(e.morphBlend),
		morphScale: z(e.morphScale),
		morphSpeed: z(e.morphSpeed),
		coverage: z(e.coverage),
		density: z(e.density),
		phaseG: z(e.phaseG),
		seed: z(e.seed)
	};
}
var nt = Ee({
	debugColor: "vec3",
	radiance: "vec3",
	transmission: "vec3"
}, "CustomSkySample");
function rt(e, t = {}) {
	let n = {
		kr: z(.0025),
		km: z(.001),
		sun: et({
			intensity: 20,
			tint: "#ffffff",
			showDisc: !0
		}),
		moon: et({
			intensity: .2,
			tint: "#fff2e0",
			showDisc: !0
		}),
		mieDirectionalG: z(-.99),
		wavelength: z(new Me(.65, .57, .475)),
		eyeHeight: z(.001),
		mistDensity: z(.04),
		mistHeight: z(.003),
		samples: z(de(5)),
		exposure: z(2),
		up: z(new Me(0, 1, 0)),
		cloudLow: tt({
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
		cloudHigh: tt({
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
		fieldSize: z(512),
		debugLayers: z(0)
	}, r = [n.sun, n.moon], i = 10.25, a = 4 * Math.PI, o = .08, s = 1.9, c = Math.cos(s), l = Math.sin(s), u = De(e), d = N(([e]) => {
		let t = I(1).sub(e), n = I(-.00287).add(t.mul(I(.459).add(t.mul(I(3.83).add(t.mul(I(-6.8).add(t.mul(5.25))))))));
		return I(.25).mul(F(me(n, 12)));
	}), f = N(() => {
		let e = ge;
		return e.z.assign(e.w), e;
	})(), p = N(() => {
		let e = V(1).div(be(n.wavelength, V(4))), f = e.mul(n.kr.mul(a)).add(n.km.mul(a)), p = _e(t.direction ?? ye.sub(ae)), m = t.time ?? Oe, h = I(10).add(n.eyeHeight), g = n.up.mul(h), _ = V(p.x, L(p.y, 0), p.z), v = _.div(L(fe(_), 1e-4)), y = I(2).mul(P(g, v)), b = P(g, g).sub(i * i), x = I(.5).mul(y.negate().add(Te(L(y.mul(y).sub(b.mul(4)), 0)))), S = F(I(16).mul(I(10).sub(h))), C = P(v, g).div(h), w = S.mul(d(C));
		function ee(e) {
			let t = _e(e.direction), r = e.tint.mul(e.intensity), i = P(p, t), a = i.negate(), o = P(t, n.up), s = I(1).div(t.y.abs().add(.15)), c = B(t.x, t.z).mul(s), l = s, u = F(f.mul(S.mul(d(o))).negate()), m = L(L(u.r, u.g), u.b);
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
				frontColor: V(0).toVar()
			};
		}
		let T = r.map(ee), te = I(n.samples), E = x.div(te), D = E.mul(4), O = v.mul(E), k = g.add(O.mul(.5)).toVar();
		ie({
			start: de(0),
			end: n.samples
		}, () => {
			let e = L(fe(k), 1e-4), t = F(I(16).mul(I(10).sub(e))), n = d(P(v, k).div(e));
			for (let r of T) {
				let i = P(r.dir, k).div(e), a = w.add(t.mul(d(i).sub(n))), o = F(f.mul(L(a, 0)).negate());
				r.frontColor.addAssign(o.mul(t.mul(D)));
			}
			k.addAssign(O);
		});
		let A = V(0).toVar(), j = V(0).toVar();
		for (let t of T) {
			let r = t.frontColor.mul(e.mul(n.kr)).mul(t.irradiance), i = t.frontColor.mul(n.km).mul(t.irradiance), a = Qe(t.phaseCos).mul(r);
			j.addAssign(a), A.addAssign(a.add($e(n.mieDirectionalG, t.phaseCos).mul(i)));
		}
		let M = F(f.mul(S.mul(d(P(p, g).div(h)))).negate()), ne = T.reduce((e, t) => e.add(t.irradiance.mul(we(.9999566769464484, .9999766769464484, t.cosTheta).mul(t.light.showDisc))), V(0)).mul(M).mul(we(I(-.0093), I(0), p.y));
		function N(e, t, n, r, i) {
			let a = u.sample(e).level(n).r, o = u.sample(t).level(r).r;
			return {
				a,
				b: o,
				level: he(a, o, i.blend).mul(i.norm).add(i.bias)
			};
		}
		function oe(e, t, n, r, i, a, o) {
			let { a: s, b: c, level: l } = N(e, t, n, r, a), d = B(s.sub(.5), c.sub(.5)).mul(1), f = u.sample(e.mul(5).add(.37).add(d)).level(i).r, p = L(l.sub(R(1, o.coverage)), 0), m = o.density.mul(10), h = F(p.mul(m).negate());
			return L(p.sub(f.mul(.12).mul(h)), 0).mul(m);
		}
		function se(e, t, n, r, i, a) {
			let { level: o } = N(e, t, n.add(2), r.add(2), i);
			return L(o.sub(R(1, a)), 0);
		}
		function ge(e) {
			return pe(L(L(fe(le(e)), fe(ue(e))).mul(n.fieldSize), 1e-6));
		}
		function ve(e) {
			let t = L(I(10).add(e), h.add(1e-4)), n = I(2).mul(P(g, p)), r = P(g, g).sub(t.mul(t)), i = I(.5).mul(n.negate().add(Te(L(n.mul(n).sub(r.mul(4)), 0))));
			return {
				worldXZ: g.add(p.mul(i)).xz,
				t: i,
				shellRadius: t
			};
		}
		function xe(e, t, n, r, i) {
			let a = ce(t), o = Ce(t);
			return B(e.x.mul(a).sub(e.y.mul(o)), e.x.mul(o).add(e.y.mul(a))).add(m.mul(n)).div(r).add(i);
		}
		function Ee(e, t) {
			return {
				uvA: xe(e, t.seed, t.speed, t.featureSize, t.seed),
				uvB: xe(e, t.seed.add(s), t.morphSpeed, t.featureSize.mul(t.morphScale), t.seed.add(17.31))
			};
		}
		function De(e) {
			let { worldXZ: t, t: n, shellRadius: r } = ve(e.altitude), { uvA: i, uvB: a } = Ee(t, e), o = e.morphBlend, s = I(1).div(Te(R(1, o).mul(R(1, o)).add(o.mul(o)))), c = {
				blend: o,
				norm: s,
				bias: I(.5).mul(R(1, s))
			}, l = F(I(16).mul(I(10).sub(r))), u = P(g, p).add(n).div(r), m = L(w.sub(l.mul(d(u))), 0), h = F(f.mul(m).negate()), _ = ge(i), v = ge(a);
			return {
				worldXZ: t,
				uvA: i,
				uvB: a,
				lodA: L(_, 0),
				lodB: L(v, 0),
				lodDetail: L(_.add(Math.log2(7)), 0),
				morph: c,
				shellDensity: l,
				airTransmit: h
			};
		}
		function z(e, t, n, r) {
			let { worldXZ: i, uvA: a, uvB: s, lodA: u, lodB: p, lodDetail: m, morph: h, shellDensity: g, airTransmit: _ } = t, v = oe(a, s, u, p, m, h, e), y = R(1, F(v.negate())).toVar(), b = y.mul(R(2, y)), x = n.altitude.sub(e.altitude), S = L(x, 0), C = we(I(0), I(.01), x).mul(n.enabled), w = u.add(pe(e.featureSize.div(n.featureSize))), ee = w.sub(pe(n.morphScale)), te = V(0).toVar();
			for (let t of T) re(t.relevant, () => {
				let m = t.slope.div(e.featureSize).mul(o), _ = B(t.slope.x.mul(c).sub(t.slope.y.mul(l)), t.slope.x.mul(l).add(t.slope.y.mul(c))).div(e.featureSize.mul(e.morphScale)).mul(o), v = B(a).toVar(), y = B(s).toVar(), x = I(0).toVar();
				ie(4, () => {
					v.addAssign(m), y.addAssign(_), x.addAssign(se(v, y, u, p, h, e.coverage));
				});
				let T = x.mul(1 / 4).mul(e.density).mul(10).mul(t.pathLength).toVar(), E = Ee(i.add(t.slope.mul(S)), n);
				T.addAssign(se(E.uvA, E.uvB, w, ee, r.morph, n.coverage).mul(n.density).mul(10).mul(.2).mul(t.pathLength).mul(C));
				let D = t.irradiance.mul(F(f.mul(g.mul(d(t.cosZenith))).negate())), O = I(0);
				for (let n = 0; n < 3; n += 1) O = O.add(I(.6 ** n).mul($e(e.phaseG.mul(.75 ** n), t.cosTheta)).mul(F(T.mul(.5 ** n).negate())));
				let k = we(e.phaseG.sub(.3), me(e.phaseG.add(.2), .98), t.cosTheta);
				te.addAssign(D.mul(.06).mul(O).mul(he(b, I(1), k)));
			});
			let E = j.mul(.9).mul(F(v.mul(.25).negate()));
			return {
				color: te.add(E).mul(_).add(j.mul(R(1, _))),
				alpha: y
			};
		}
		let ke = De(n.cloudLow), H = De(n.cloudHigh), U = I(0).toVar(), Ae = I(0).toVar(), je = V(0).toVar(), Me = V(0).toVar();
		re(p.y.greaterThan(0).and(n.cloudHigh.enabled.greaterThan(0)).and(n.cloudHigh.coverage.greaterThan(0)), () => {
			let e = z(n.cloudHigh, H, n.cloudLow, ke);
			Ae.assign(e.alpha), Me.assign(e.color);
		}), re(p.y.greaterThan(0).and(n.cloudLow.enabled.greaterThan(0)).and(n.cloudLow.coverage.greaterThan(0)), () => {
			let e = z(n.cloudLow, ke, n.cloudHigh, H);
			U.assign(e.alpha), je.assign(e.color);
		});
		let W = n.cloudHigh.altitude.greaterThanEqual(n.cloudLow.altitude), Ne = Se(W, Me, je), Pe = Se(W, Ae, U), G = Se(W, je, Me), Fe = Se(W, U, Ae);
		A.assign(he(A, Ne, Pe)), A.assign(he(A, G, Fe)), A.addAssign(ne.mul(R(1, Pe)).mul(R(1, Fe)));
		let Ie = F(n.mistDensity.mul(F(n.eyeHeight.div(n.mistHeight).negate())).div(L(p.y, .015)).negate()), Le = T.reduce((e, t) => e.add(t.irradiance.mul(t.groundTransmit).mul(I(.05).add($e(I(-.5), t.phaseCos).mul(.02)))), V(0));
		A.assign(A.mul(Ie).add(Le.mul(R(1, Ie))));
		let Re = V(U, Ae, U.mul(Ae)), K = R(1, Pe).mul(R(1, Fe));
		return nt(Re, A, M.mul(K).mul(Ie));
	})(), m = N(() => {
		let e = p;
		return ke(he(R(1, F(e.get("radiance").mul(n.exposure).negate())), e.get("debugColor"), n.debugLayers), 1);
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
function it(e, t) {
	let n = M.MathUtils.degToRad(90 - e), r = M.MathUtils.degToRad(t), i = new M.Vector3().setFromSphericalCoords(1, n, r);
	return [
		i.x,
		i.y,
		i.z
	];
}
var at = {
	direction: it(18, 180),
	directionLayerId: null,
	disc: !0,
	intensity: 20,
	tint: "#ffffff"
}, ot = {
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
	field: Ue,
	km: .001,
	kr: .0025,
	mieDirectionalG: -.99,
	mistDensity: .04,
	mistHeight: .003,
	moon: {
		direction: it(-30, 0),
		directionLayerId: null,
		disc: !0,
		intensity: .2,
		tint: "#fff2e0"
	},
	motionMode: "static",
	samples: 5,
	sun: at,
	time: 0
}, st = {
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
	field: Ue,
	km: .0104,
	kr: 7e-4,
	mieDirectionalG: -.956,
	mistDensity: .12,
	mistHeight: .004,
	moon: {
		direction: it(11.1, 180),
		directionLayerId: null,
		disc: !1,
		intensity: 1.1,
		tint: "#bbdafb"
	},
	motionMode: "static",
	samples: 9,
	sun: {
		direction: it(-12.8, 180),
		directionLayerId: null,
		disc: !1,
		intensity: 0,
		tint: "#ffffff"
	},
	time: 0
};
function ct(e) {
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
function lt() {
	return ct(ot);
}
function ut(e) {
	return [
		e.size,
		e.tiles,
		e.octaves,
		e.persistence,
		e.seed
	].join(":");
}
function dt(e) {
	return {
		octaves: e.octaves,
		persistence: e.persistence,
		seed: e.seed,
		size: e.size,
		tiles: e.tiles
	};
}
function ft(e, t) {
	let n = /* @__PURE__ */ new Set(), r = !1, i = (e) => {
		e.forEach((e) => {
			if (e.type === "group") {
				i(e.children);
				return;
			}
			if (e.type !== "clouds") return;
			n.add(e.id);
			let a = ut(e.params.field), o = t.get(e.id);
			if (o?.userData.cloudFieldKey === a || !e.enabled) return;
			let s = Ze(dt(e.params.field));
			s.name = `Cloud field ${e.id}`, s.userData.cloudFieldKey = a, t.set(e.id, s), o?.dispose(), r = !0;
		});
	};
	return i(e.nodes), Array.from(t.entries()).forEach(([e, i]) => {
		n.has(e) || (i.dispose(), t.delete(e), r = !0);
	}), r;
}
function pt(e) {
	e.forEach((e) => e.dispose()), e.clear();
}
function mt(e, t) {
	e?.sampleData.forEach((e, n) => {
		let r = t.get(n);
		r && e.model.setFieldTexture(r);
	});
}
function ht(e, t) {
	t.direction.value.set(...e.direction).normalize(), t.intensity.value = e.intensity, t.tint.value.set(e.tint), t.showDisc.value = +!!e.disc;
}
function gt(e, t) {
	t.enabled.value = +!!e.enabled, t.altitude.value = e.altitude, t.featureSize.value = e.featureSize, t.speed.value = e.speed, t.morphBlend.value = e.morphBlend, t.morphScale.value = e.morphScale, t.morphSpeed.value = e.morphSpeed, t.coverage.value = e.coverage, t.density.value = e.density, t.phaseG.value = e.phaseG;
}
function _t(e, t) {
	e.uniforms.kr.value = t.kr, e.uniforms.km.value = t.km, e.uniforms.mieDirectionalG.value = t.mieDirectionalG, e.uniforms.samples.value = Math.round(t.samples), e.uniforms.eyeHeight.value = t.eyeHeight, e.uniforms.mistDensity.value = t.mistDensity, e.uniforms.mistHeight.value = t.mistHeight, e.uniforms.exposure.value = t.exposure, e.uniforms.fieldSize.value = t.field.size, e.uniforms.debugLayers.value = +!!t.debugLayers, ht(t.sun, e.uniforms.sun), ht(t.moon, e.uniforms.moon), gt(t.cloudLow, e.uniforms.cloudLow), gt(t.cloudHigh, e.uniforms.cloudHigh);
}
function vt(e) {
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
function yt(e) {
	return e.map((e) => ({
		layerId: e.layer.id,
		model: null,
		motionMode: e.layer.params.motionMode,
		time: null
	}));
}
function bt({ bindings: e, direction: t, resourceTextures: n, uniforms: r }) {
	let i = /* @__PURE__ */ new Map(), a = {}, o = {};
	return e.forEach((e, s) => {
		let c = e.layer.params, l = n.get(e.layer.id);
		if (!l) return;
		let u = z(c.time), d = rt(l, {
			direction: t,
			time: u
		});
		_t(d, c), r[s].model = d, r[s].time = u;
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
function xt(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n?.model && (_t(n.model, t.params), n.motionMode = t.params.motionMode, t.params.motionMode === "static" && n.time && (n.time.value = t.params.time));
}
function St(e, t) {
	e.forEach((e) => {
		e.time && e.motionMode === "dynamic" && (e.time.value = t);
	});
}
function Ct(e) {
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
var wt = {
	collect: vt,
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
		return r ? Ct(r) : Ve();
	},
	createSampleNodes: bt,
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
	createUniforms: yt,
	getTopologyKey: () => ({}),
	type: "clouds",
	updateTime: St,
	updateUniforms: xt
};
w({
	type: "clouds",
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: wt,
	getTopologyKey: (e) => wt.getTopologyKey(e)
});
//#endregion
//#region src/skybox/stops.ts
function Tt(e) {
	return [...e.stops].map((e) => ({
		color: e.color,
		midpoint: D((e.midpoint ?? 50) / 100, .01, .99),
		opacity: D(e.opacity / 100),
		t: D(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function Et(t) {
	let [n, r, i] = e(t.color);
	return new M.Vector4(n, r, i, t.opacity);
}
//#endregion
//#region src/layer-addons/builtins/gradient.ts
function Dt(e) {
	let t = e * Math.PI / 180;
	return [
		Math.sin(t),
		Math.cos(t),
		0
	];
}
function Ot(e, t) {
	let n = Dt(t.rotation), r = e[0] * n[0] + e[1] * n[1] + e[2] * n[2];
	return h(o(t.stops), r * .5 + .5);
}
function kt(e) {
	let t = e * Math.PI / 180;
	return new M.Vector3(Math.sin(t), Math.cos(t), 0).normalize();
}
function At(e) {
	return e.map((e) => {
		let t = Tt(e.layer.params);
		return {
			axis: z(kt(e.layer.params.rotation)),
			layerId: e.layer.id,
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: z(Et(r)),
					midpoint: z(r.midpoint),
					t: z(r.t)
				};
			})
		};
	});
}
function jt(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = Tt(t.params);
	n.axis.value.copy(kt(t.params.rotation)), n.stops.forEach((e, t) => {
		let n = r[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(Et(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function Mt(e) {
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
function Nt(e) {
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
var Pt = {
	collect: Mt,
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
		return r ? Nt(r) : Ve();
	},
	createSampleParameters: (e, t) => Object.fromEntries(e.flatMap((e) => {
		let n = t[e.index];
		return [[`${e.parameterPrefix}Axis`, n.axis], ...Array.from({ length: e.stopCount }, (t, r) => [
			[`${e.parameterPrefix}StopColor${r}`, n.stops[r].color],
			[`${e.parameterPrefix}StopMidpoint${r}`, n.stops[r].midpoint],
			[`${e.parameterPrefix}StopT${r}`, n.stops[r].t]
		]).flat()];
	})),
	createUniforms: At,
	getTopologyKey: (e) => ({
		mode: e.params.mode,
		stopCount: e.params.stops.length
	}),
	type: "gradient",
	updateUniforms: jt
};
w({
	type: "gradient",
	sampleCpu: (e, t) => Ot(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Pt,
	getTopologyKey: (e) => Pt.getTopologyKey(e)
});
//#endregion
//#region src/skybox/colors.ts
function Ft(t) {
	let [n, r, i] = e(t);
	return new M.Vector3(n, r, i);
}
//#endregion
//#region src/layer-addons/builtins/field-gradient.ts
function It(t, n) {
	if (n.anchors.length === 0) return [
		0,
		0,
		0,
		0
	];
	let r = i(t, D(n.amplitude, 0, .6), Math.max(1e-4, n.frequency)), a = 0, o = 0, s = 0, c = 0;
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
function Lt(e) {
	return +(e === "gaussian");
}
function Rt(e, t) {
	let n = (D(e) - .5) * Math.PI * 2, r = (.5 - D(t)) * Math.PI, i = Math.cos(r);
	return new M.Vector3(i * Math.cos(n), Math.sin(r), i * Math.sin(n)).normalize();
}
function zt(e) {
	return e.map((e) => ({
		amplitude: z(D(e.layer.params.amplitude, 0, .6)),
		anchors: Array.from({ length: e.anchorCount }, (t, n) => {
			let r = e.layer.params.anchors[n] ?? {
				color: "#000000",
				x: .5,
				y: .5
			};
			return {
				color: z(Ft(r.color)),
				direction: z(Rt(r.x, r.y))
			};
		}),
		frequency: z(Math.max(1e-4, e.layer.params.frequency)),
		layerId: e.layer.id,
		mode: z(Lt(e.layer.params.mode)),
		power: z(Math.max(1e-4, e.layer.params.power))
	}));
}
function Bt(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	n && (n.amplitude.value = D(t.params.amplitude, 0, .6), n.frequency.value = Math.max(1e-4, t.params.frequency), n.mode.value = Lt(t.params.mode), n.power.value = Math.max(1e-4, t.params.power), n.anchors.forEach((e, n) => {
		let r = t.params.anchors[n] ?? {
			color: "#000000",
			x: .5,
			y: .5
		};
		e.color.value.copy(Ft(r.color)), e.direction.value.copy(Rt(r.x, r.y));
	}));
}
function Vt(e) {
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
function Ht(e) {
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
    ${q("fieldDirection", "vec3<f32>", "direction")}
    let warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      let warpX = sin((direction.y * warpFrequency + 0.23) * ${K(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${K(Math.PI * 2)});
      let warpY = cos((direction.z * warpFrequency + 0.17) * ${K(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${K(Math.PI * 2)});
      let warpZ = sin((direction.x * warpFrequency - 0.31) * ${K(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${K(Math.PI * 2)});
      fieldDirection = normalize(direction + vec3<f32>(warpX, warpY, warpZ) * warpScale);
    }
    ${q("weightedColor", "vec3<f32>", "vec3<f32>(0.0)")}
    ${q("weightSum", "f32", "0.0")}
    ${t}
    if (weightSum > 0.0) {
      effectColor = vec4<f32>(weightedColor / weightSum, 1.0);
    } else {
      effectColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
var Ut = {
	collect: Vt,
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
		return r ? Ht(r) : Ve();
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
	createUniforms: zt,
	getTopologyKey: (e) => ({ anchorCount: e.params.anchors.length }),
	type: "field-gradient",
	updateUniforms: Bt
};
w({
	type: "field-gradient",
	sampleCpu: (e, t) => It(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: Ut,
	getTopologyKey: (e) => Ut.getTopologyKey(e)
});
//#endregion
//#region src/image-placement-transform.ts
var Wt = [
	0,
	1,
	0
], Gt = [
	0,
	0,
	-1
], Kt = [
	1,
	0,
	0
], qt = [
	0,
	1,
	0
], Jt = 89.9;
function Yt(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Xt(e) {
	return e * Math.PI / 180;
}
function Zt(e) {
	return e * 180 / Math.PI;
}
function Qt(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function $t(e) {
	return (Math.round(e) % 360 + 360) % 360;
}
function en(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function tn(e, t) {
	return [
		e[0] - t[0],
		e[1] - t[1],
		e[2] - t[2]
	];
}
function nn(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function rn(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function an(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function J(e, t = Gt) {
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
function on(e, t, n) {
	let r = Xt(n), i = Math.cos(r), a = Math.sin(r), o = J(t);
	return J(rn(rn(nn(e, i), nn(an(o, e), a)), nn(o, en(o, e) * (1 - i))), e);
}
function sn(e, t = Wt, n = 0) {
	let r = J(e), i = tn(J(t, Wt), nn(r, en(J(t, Wt), r)));
	if (Math.hypot(i[0], i[1], i[2]) < 1e-6) {
		let e = Math.abs(r[1]) > .98 ? [
			0,
			0,
			1
		] : Wt;
		i = tn(e, nn(r, en(e, r)));
	}
	return i = J(i, qt), {
		tangentX: on(J(an(r, i), Kt), r, n),
		tangentY: on(i, r, n)
	};
}
function cn({ angularHeight: e, angularWidth: t, baseAngularHeight: n, baseAngularWidth: r, centerDirection: i, rotation: a = 0, upDirection: o = Wt }) {
	let s = J(i), c = $t(a), { tangentX: l, tangentY: u } = sn(s, o, c), d = Math.max(1e-4, e), f = Math.max(1e-4, t);
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
function Y(e) {
	let t = e, n = J(t?.centerDirection ?? t?.normal ?? t?.center, Gt), r = Array.isArray(t?.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, i = typeof t?.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t?.width ?? .4) / (2 * r)), a = typeof t?.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t?.height ?? .3) / (2 * r));
	return cn({
		angularHeight: a,
		angularWidth: i,
		baseAngularHeight: typeof t?.baseAngularHeight == "number" ? t.baseAngularHeight : a,
		baseAngularWidth: typeof t?.baseAngularWidth == "number" ? t.baseAngularWidth : i,
		centerDirection: n,
		rotation: typeof t?.rotation == "number" ? t.rotation : 0
	});
}
function ln(e) {
	let t = J(e.centerDirection);
	return {
		x: Qt(Zt(Math.atan2(t[0], -t[2]))),
		y: Zt(Math.asin(Yt(t[1], -1, 1)))
	};
}
function un(e) {
	let t = Xt(e.x), n = Xt(Yt(e.y, -89.9, Jt)), r = Math.cos(n);
	return J([
		Math.sin(t) * r,
		Math.sin(n),
		-Math.cos(t) * r
	]);
}
function dn(e, t, n) {
	let r = Y(e);
	return cn({
		angularHeight: r.angularHeight,
		angularWidth: r.angularWidth,
		baseAngularHeight: r.baseAngularHeight,
		baseAngularWidth: r.baseAngularWidth,
		centerDirection: un(t),
		rotation: r.rotation,
		upDirection: n?.upDirection
	});
}
function fn(e) {
	let t = Y(e);
	return {
		x: t.angularWidth / t.baseAngularWidth,
		y: t.angularHeight / t.baseAngularHeight
	};
}
function pn(e, t) {
	let n = Y(e);
	return {
		...n,
		angularHeight: Math.max(1e-4, n.baseAngularHeight * Math.max(1e-4, t.y)),
		angularWidth: Math.max(1e-4, n.baseAngularWidth * Math.max(1e-4, t.x))
	};
}
function mn(e) {
	return Y(e).rotation;
}
function hn(e, t) {
	let n = Y(e);
	return cn({
		angularHeight: n.angularHeight,
		angularWidth: n.angularWidth,
		baseAngularHeight: n.baseAngularHeight,
		baseAngularWidth: n.baseAngularWidth,
		centerDirection: n.centerDirection,
		rotation: t
	});
}
function gn(e, t) {
	let n = Y(t), r = J(e), i = en(r, n.centerDirection);
	if (i <= 0) return null;
	let a = en(r, n.tangentX) / i, o = en(r, n.tangentY) / i, s = Math.tan(n.angularWidth / 2), c = Math.tan(n.angularHeight / 2);
	return s <= 0 || c <= 0 || a < -s || a > s || o < -c || o > c ? null : {
		u: a / (2 * s) + .5,
		v: .5 - o / (2 * c)
	};
}
//#endregion
//#region src/skybox/empty-texture.ts
var _n = new M.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, M.RGBAFormat);
_n.colorSpace = M.SRGBColorSpace, _n.needsUpdate = !0;
//#endregion
//#region src/skybox/overlay.ts
var vn = .18, yn = .75, bn = 1.75, xn = 1e-4, Sn = .01;
//#endregion
//#region src/layer-addons/builtins/image.ts
function Cn(e, t) {
	let n = t.placement;
	if (!n || !t.pixels || t.width <= 0 || t.height <= 0) return [
		0,
		0,
		0,
		0
	];
	let r = gn(e, n);
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
	return p(p(j(t, c, l), j(t, u, l), f), p(j(t, c, d), j(t, u, d), f), m);
}
function wn(e) {
	if (!e) return {
		centerDirection: new M.Vector3(0, 0, -1),
		halfSize: new M.Vector2(0, 0),
		tangentX: new M.Vector3(1, 0, 0),
		tangentY: new M.Vector3(0, 1, 0)
	};
	let t = Y(e);
	return {
		centerDirection: new M.Vector3(...t.centerDirection),
		halfSize: new M.Vector2(Math.max(0, Math.tan(t.angularWidth / 2)), Math.max(0, Math.tan(t.angularHeight / 2))),
		tangentX: new M.Vector3(...t.tangentX),
		tangentY: new M.Vector3(...t.tangentY)
	};
}
function Tn(e) {
	return e.map((e) => {
		let t = wn(e.layer.params.placement);
		return {
			centerDirection: z(t.centerDirection),
			halfSize: z(t.halfSize),
			layerId: e.layer.id,
			tangentX: z(t.tangentX),
			tangentY: z(t.tangentY)
		};
	});
}
function En(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = wn(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function Dn(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function On(e) {
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
function kn(e, t) {
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
      let imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${K(Sn)});
      let imageHardInside = step(${K(xn)}, imageDenom) *
        step(0.0, ${t.halfSize}.x) *
        step(0.0, ${t.halfSize}.y);
      let imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      let imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return vec4<f32>(imageU, imageV, imageValid, 0.0);
    `;
}
function An(e) {
	return H(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${kn(e, {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var jn = H("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n");
function Mn(e, t) {
	return e.get(t.id) ?? _n;
}
function Nn(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? _n;
	});
}
function Pn(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	return {
		sampleData: i,
		sampleNodes: Object.fromEntries(e.map((e) => {
			let a = r[e.index], o = An(e)({
				direction: t,
				imageCenterDirection: a.centerDirection,
				imageHalfSize: a.halfSize,
				imageTangentX: a.tangentX,
				imageTangentY: a.tangentY
			}), s = B(o.x, o.y), c = De(Mn(n, e.layer), s).setName(`imageTexture${e.index}`);
			c.getUniformHash = () => `skybox-image-texture:${e.layer.id}`;
			let l = jn({
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
var Fn = {
	collect: On,
	createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
	createSampleExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id);
		return r ? `effectColor = ${r.parameterName};` : Ve();
	},
	createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, uniforms: r }) => {
		let i = Pn(e, t, n, r);
		return {
			editorProjectionByLayerId: new Map(Array.from(i.sampleData.entries()).map(([e, t]) => [e, {
				uv: B(t.sampleInfo.x, t.sampleInfo.y),
				valid: t.sampleInfo.z
			}])),
			sampleData: i.sampleData,
			sampleNodesByLayerId: Object.fromEntries(e.map((e) => [e.layer.id, i.sampleNodes[e.parameterName]])),
			sampleNodesByParameterName: i.sampleNodes,
			textureSlots: Object.fromEntries(Array.from(i.sampleData.entries()).map(([e, t]) => [e, t.textureNode]))
		};
	},
	createSampleParameters: (e, t, n) => n?.sampleNodesByParameterName ?? {},
	createUniforms: Tn,
	getTopologyKey: (e) => ({
		hasPlacement: !!e.params.placement,
		hasSrc: !!e.params.src,
		height: e.params.height,
		width: e.params.width
	}),
	type: "image",
	updateUniforms: (e, t) => En(e, t.id, t.params.placement)
};
w({
	type: "image",
	sampleCpu: (e, t) => Cn(e, t),
	updateLive: (e, t) => e.applyImagePlacement(t.id, t.params.placement),
	wgsl: Fn,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => Fn.getTopologyKey(e)
});
//#endregion
//#region src/layer-addons/builtins/moon.ts
function In(e) {
	let t = Y(e);
	return {
		centerDirection: new M.Vector3(...t.centerDirection),
		halfSize: new M.Vector2(Math.max(0, Math.tan(t.angularWidth / 2)), Math.max(0, Math.tan(t.angularHeight / 2))),
		tangentX: new M.Vector3(...t.tangentX),
		tangentY: new M.Vector3(...t.tangentY)
	};
}
function Ln(e) {
	return e.map((e) => {
		let t = In(e.layer.params.placement);
		return {
			centerDirection: z(t.centerDirection),
			halfSize: z(t.halfSize),
			layerId: e.layer.id,
			tangentX: z(t.tangentX),
			tangentY: z(t.tangentY)
		};
	});
}
function Rn(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = In(n);
	r.centerDirection.value.copy(i.centerDirection), r.halfSize.value.copy(i.halfSize), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY);
}
function zn(e) {
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
var Bn = H(`
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
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${K(.05)});
    let valid = step(0.000001, denom) *
      step(0.0, halfSize.x) *
      step(0.0, halfSize.y) *
      step(-edgeWidth, edgeDistance) *
      smoothstep(-edgeWidth, edgeWidth, edgeDistance);
    return vec4<f32>(u, v, valid, 0.0);
  }
`), Vn = H("\n  fn skyboxStudioApplyMoonMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n");
function Hn(e, t) {
	e?.sampleData.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? _n;
	});
}
w({
	type: "moon",
	getTopologyKey: () => ({}),
	updateLive: (e, t) => {
		e.applyLayerParams(t), e.scheduleResourceBake(t.id, t.params);
	},
	wgsl: {
		collect: zn,
		createParameterDeclarations: (e) => e.map((e) => `,\n      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : Ve();
		},
		createSampleNodes: ({ bindings: e, direction: t, resourceTextures: n, uniforms: r }) => {
			let i = /* @__PURE__ */ new Map(), a = Object.fromEntries(e.map((e) => {
				let a = r[e.index], o = Bn({
					centerDirection: a.centerDirection,
					direction: t,
					halfSize: a.halfSize,
					tangentX: a.tangentX,
					tangentY: a.tangentY
				}), s = De(n.get(e.layer.id) ?? _n, B(o.x, o.y)).setName(`moonTexture${e.index}`);
				s.getUniformHash = () => `skybox-moon-texture:${e.layer.id}`;
				let c = Vn({
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
					uv: B(t.sampleInfo.x, t.sampleInfo.y),
					valid: t.sampleInfo.z
				}])),
				sampleData: i,
				sampleNodesByParameterName: a,
				textureSlots: Object.fromEntries(Array.from(i.entries()).map(([e, t]) => [e, t.textureNode]))
			};
		},
		createSampleParameters: (e, t, n) => n?.sampleNodesByParameterName ?? {},
		createUniforms: Ln,
		getTopologyKey: () => ({}),
		type: "moon",
		updateUniforms: (e, t) => Rn(e, t.id, t.params.placement)
	},
	wgslEditorOverlay: !0
});
//#endregion
//#region src/spot-transform.ts
var Un = Math.PI / 12;
function X(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Wn(e) {
	return e * 180 / Math.PI;
}
function Gn(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Kn() {
	return {
		angularRadius: Un,
		baseAngularRadius: Un,
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
function qn(e) {
	let t = e, n = Kn(), r = Math.max(1e-4, typeof t?.baseAngularRadius == "number" ? t.baseAngularRadius : n.baseAngularRadius);
	return {
		angularRadius: Math.max(1e-4, typeof t?.angularRadius == "number" ? t.angularRadius : r),
		baseAngularRadius: r,
		brightness: Math.max(0, typeof t?.brightness == "number" ? t.brightness : n.brightness),
		centerDirection: J(t?.centerDirection, n.centerDirection),
		colorMode: t?.colorMode === "gradient" ? "gradient" : "light",
		coreRadius: X(typeof t?.coreRadius == "number" ? t.coreRadius : n.coreRadius, .01, .7),
		coreSoftness: X(typeof t?.coreSoftness == "number" ? t.coreSoftness : n.coreSoftness, .4, 6),
		dispersion: X(typeof t?.dispersion == "number" ? t.dispersion : n.dispersion, 0, 1),
		dogSpread: X(typeof t?.dogSpread == "number" ? t.dogSpread : n.dogSpread, .015, .18),
		dogStrength: X(typeof t?.dogStrength == "number" ? t.dogStrength : n.dogStrength, 0, 1.8),
		dogStretch: X(typeof t?.dogStretch == "number" ? t.dogStretch : n.dogStretch, 0, .55),
		glareSize: X(typeof t?.glareSize == "number" ? t.glareSize : n.glareSize, .03, 1.1),
		glareStrength: X(typeof t?.glareStrength == "number" ? t.glareStrength : n.glareStrength, 0, 1.4),
		glow: X(typeof t?.glow == "number" ? t.glow : n.glow, 0, 1),
		glowSize: X(typeof t?.glowSize == "number" ? t.glowSize : n.glowSize, .05, 1.4),
		glowStrength: X(typeof t?.glowStrength == "number" ? t.glowStrength : n.glowStrength, 0, 1),
		halo: X(typeof t?.halo == "number" ? t.halo : n.halo, 0, 1),
		haloInnerWidth: X(typeof t?.haloInnerWidth == "number" ? t.haloInnerWidth : n.haloInnerWidth, .003, .09),
		haloOuterWidth: X(typeof t?.haloOuterWidth == "number" ? t.haloOuterWidth : n.haloOuterWidth, .01, .24),
		haloRadius: X(typeof t?.haloRadius == "number" ? t.haloRadius : n.haloRadius, .04, 1),
		haloStrength: X(typeof t?.haloStrength == "number" ? t.haloStrength : n.haloStrength, 0, 1.4),
		lightColor: typeof t?.lightColor == "string" ? t.lightColor : n.lightColor,
		stops: (t?.stops?.length ? t.stops : n.stops).map((e) => ({
			color: e.color,
			location: X(e.location, 0, 100),
			midpoint: X(e.midpoint ?? 50, 1, 99),
			opacity: X(e.opacity, 0, 100)
		}))
	};
}
function Jn(e) {
	let t = J(e.centerDirection);
	return {
		x: Gn(Wn(Math.atan2(t[0], -t[2]))),
		y: Wn(Math.asin(X(t[1], -1, 1)))
	};
}
function Yn(e, t) {
	return {
		...qn(e),
		centerDirection: un({
			x: t.x,
			y: X(t.y, -Jt, Jt)
		})
	};
}
function Xn(e) {
	let t = qn(e);
	return t.angularRadius / t.baseAngularRadius;
}
function Zn(e, t) {
	let n = qn(e);
	return {
		...n,
		angularRadius: Math.max(1e-4, n.baseAngularRadius * Math.max(1e-4, t))
	};
}
function Qn(e, t) {
	let n = qn(t), r = J(e), i = J(n.centerDirection), a = r[0] * i[0] + r[1] * i[1] + r[2] * i[2];
	return Math.acos(X(a, -1, 1)) <= n.angularRadius;
}
//#endregion
//#region src/skybox/editor-presentation.ts
var $n = {
	hoveredLayerId: null,
	selectedLayerId: null
};
function er(e, t) {
	return +(t === e);
}
function tr(e, t) {
	return +(t === e);
}
function nr(e, t) {
	return Math.max(er(e, t.hoveredLayerId), tr(e, t.selectedLayerId));
}
function rr(e, t) {
	return e.map((e) => ({
		active: z(nr(e.layer.id, t)),
		layerId: e.layer.id
	}));
}
function ir(e, t) {
	e.forEach((e) => {
		e.active.value = nr(e.layerId, t);
	});
}
function ar(e, t) {
	e.userData.applyEditorLayerState = t;
}
var or = H(`
  fn skyboxStudioApplyImageEditorRectOverlay(
    color: vec4<f32>,
    uv: vec2<f32>,
    valid: f32,
    activeValue: f32
  ) -> vec4<f32> {
    let activeAmount = clamp(activeValue, 0.0, 1.0);
    let rectCoverage = valid * activeAmount;
    let edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${K(Sn)});
    let bounds = rectCoverage * (
      1.0 - smoothstep(
        edgeWidth * ${K(yn)},
        edgeWidth * ${K(bn)},
        edgeDistance
      )
    );
    let rectAlpha = rectCoverage * ${K(vn)};
    let overlayAlpha = max(rectAlpha, bounds);
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), overlayAlpha),
      color.a
    );
  }
`), sr = H(`
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
    let spotEdgeWidth = clamp(fwidth(spotEdgeDistance), 0.000001, ${K(Sn)});
    let spotValid = step(${K(xn)}, spotDenom) *
      step(-spotEdgeWidth, spotEdgeDistance) *
      smoothstep(-spotEdgeWidth, spotEdgeWidth, spotEdgeDistance);

    return vec4<f32>(spotU, spotV, spotValid, 0.0);
  }
`);
//#endregion
//#region src/layer-addons/builtins/spot.ts
function cr(i, s) {
	let c = qn(s), u = r(i), f = r(c.centerDirection), p = t(u, f), m = Math.acos(D(p, -1, 1)), y = Math.max(c.angularRadius, 1e-4), b = m / y;
	if (c.colorMode === "gradient") return b > 1 ? [
		0,
		0,
		0,
		0
	] : h(o(c.stops), b);
	let x = l(i, f, y), S = x.d, C = e(c.lightColor), w = c.brightness, ee = D(1 - S / c.coreRadius) ** +c.coreSoftness, te = D(1 - S / c.glowSize) ** 2 * c.glowStrength, E = D(1 - S / c.glareSize) ** 1.15 * c.glareStrength, O = (ee + te + E) * w, k = _(C, O);
	k = n(k, [
		Math.max(O - 1, 0),
		Math.max(O - 1, 0),
		Math.max(O - 1, 0)
	]);
	let A = Math.max(c.haloInnerWidth, 1e-4), j = Math.max(c.haloOuterWidth, 1e-4), M = S - c.haloRadius, ne = Math.exp(-v(M / (M < 0 ? A : j))), N = T(d([
		1,
		1,
		1
	], g(D((S - (c.haloRadius - A)) / (A + j))), c.dispersion), C), re = ne * c.haloStrength * w;
	k = n(k, _(N, re)), k = n(k, _([
		1,
		1,
		1
	], Math.max(re - 1.2, 0) * .22));
	let ie = Math.abs(x.y), ae = Math.abs(x.x), oe = Math.exp(-v((ae - c.haloRadius) / Math.max(c.dogSpread, 1e-4))) * Math.exp(-v(ie / Math.max(c.dogSpread * .72, 1e-4))), se = a(c.haloRadius, c.haloRadius + Math.max(c.dogStretch, 1e-4), ae) * (1 - a(c.haloRadius + Math.max(c.dogStretch, 1e-4), c.haloRadius + Math.max(c.dogStretch * 2.2, 1e-4), ae)) * Math.exp(-v(ie / Math.max(c.dogSpread * .9, 1e-4))), ce = T(d([
		1,
		1,
		1
	], g(D((ae - (c.haloRadius - c.dogSpread * 1.4)) / Math.max(c.dogSpread * 3.5, 1e-4))), c.dispersion), C), le = (oe + se * .28) * c.dogStrength * w;
	k = n(k, _(ce, le)), k = n(k, _([
		1,
		1,
		1
	], Math.max(le - 1.1, 0) * .18));
	let ue = D(Math.max(k[0], k[1], k[2]));
	return ue <= 1e-5 ? [
		0,
		0,
		0,
		0
	] : [
		k[0] / ue,
		k[1] / ue,
		k[2] / ue,
		ue
	];
}
function lr(e) {
	return +(e === "gradient");
}
function ur(e) {
	let t = qn(e);
	return {
		brightness: Math.max(0, t.brightness),
		centerDirection: new M.Vector3(...t.centerDirection).normalize(),
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
		lightColor: Ft(t.lightColor),
		mode: lr(t.colorMode),
		radius: Math.max(1e-4, t.angularRadius),
		stops: Tt(t)
	};
}
function dr(e) {
	return e.map((e) => {
		let t = ur(e.layer.params);
		return {
			brightness: z(t.brightness),
			centerDirection: z(t.centerDirection),
			coreRadius: z(t.coreRadius),
			coreSoftness: z(t.coreSoftness),
			dispersion: z(t.dispersion),
			dogSpread: z(t.dogSpread),
			dogStrength: z(t.dogStrength),
			dogStretch: z(t.dogStretch),
			glareSize: z(t.glareSize),
			glareStrength: z(t.glareStrength),
			glowSize: z(t.glowSize),
			glowStrength: z(t.glowStrength),
			haloInnerWidth: z(t.haloInnerWidth),
			haloOuterWidth: z(t.haloOuterWidth),
			haloRadius: z(t.haloRadius),
			haloStrength: z(t.haloStrength),
			layerId: e.layer.id,
			lightColor: z(t.lightColor),
			mode: z(t.mode),
			radius: z(t.radius),
			stops: Array.from({ length: e.stopCount }, (e, n) => {
				let r = t.stops[n] ?? {
					color: "#000000",
					midpoint: .5,
					opacity: 0,
					t: 0
				};
				return {
					color: z(Et(r)),
					midpoint: z(r.midpoint),
					t: z(r.t)
				};
			})
		};
	});
}
function fr(e, t) {
	let n = e.find((e) => e.layerId === t.id);
	if (!n) return;
	let r = ur(t.params);
	n.brightness.value = r.brightness, n.centerDirection.value.copy(r.centerDirection), n.coreRadius.value = r.coreRadius, n.coreSoftness.value = r.coreSoftness, n.dispersion.value = r.dispersion, n.dogSpread.value = r.dogSpread, n.dogStrength.value = r.dogStrength, n.dogStretch.value = r.dogStretch, n.glareSize.value = r.glareSize, n.glareStrength.value = r.glareStrength, n.glowSize.value = r.glowSize, n.glowStrength.value = r.glowStrength, n.haloInnerWidth.value = r.haloInnerWidth, n.haloOuterWidth.value = r.haloOuterWidth, n.haloRadius.value = r.haloRadius, n.haloStrength.value = r.haloStrength, n.lightColor.value.copy(r.lightColor), n.mode.value = r.mode, n.radius.value = r.radius, n.stops.forEach((e, t) => {
		let n = r.stops[t] ?? {
			color: "#000000",
			midpoint: .5,
			opacity: 0,
			t: 0
		};
		e.color.value.copy(Et(n)), e.midpoint.value = n.midpoint, e.t.value = n.t;
	});
}
function pr(e) {
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
function mr(e) {
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
function hr(e) {
	let t = `${e.parameterPrefix}Mode > 0.5`, n = mr(e);
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
      ${q("spotColor", "vec3<f32>", `${e.parameterPrefix}LightColor * spotMonoLight + vec3<f32>(max(spotMonoLight - 1.0, 0.0))`)}

      let spotHaloInner = max(${e.parameterPrefix}HaloInnerWidth, 0.0001);
      let spotHaloOuter = max(${e.parameterPrefix}HaloOuterWidth, 0.0001);
      let spotHaloDelta = spotD - ${e.parameterPrefix}HaloRadius;
      let spotHaloWidth = select(spotHaloOuter, spotHaloInner, spotHaloDelta < 0.0);
      let spotHaloEnvelope = exp(-pow(spotHaloDelta / spotHaloWidth, 2.0));
      let spotHaloT = clamp((spotD - (${e.parameterPrefix}HaloRadius - spotHaloInner)) / (spotHaloInner + spotHaloOuter), 0.0, 1.0);
      ${q("spotSpectrum", "vec3<f32>", "vec3<f32>(1.0, 0.12, 0.05)")}
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
      ${q("spotDogSpectrum", "vec3<f32>", "vec3<f32>(1.0, 0.12, 0.05)")}
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
var gr = {
	collect: pr,
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
		return r ? hr(r) : Ve();
	},
	createSampleNodes: ({ bindings: e, direction: t, uniforms: n }) => ({ editorProjectionByLayerId: new Map(e.map((e) => {
		let r = n[e.index], i = sr({
			direction: t,
			spotCenterDirection: r.centerDirection,
			spotRadius: r.radius
		});
		return [e.layer.id, {
			uv: B(i.x, i.y),
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
	createUniforms: dr,
	getTopologyKey: (e) => ({ stopCount: e.params.stops.length }),
	type: "spot",
	updateUniforms: fr
};
w({
	type: "spot",
	sampleCpu: (e, t) => cr(e, t),
	updateLive: (e, t) => e.applyLayerParams(t),
	wgsl: gr,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => gr.getTopologyKey(e)
});
//#endregion
//#region src/layer-addons/builtins/starfield.ts
function _r(e) {
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
function vr(e) {
	e.userData.starfieldRenderTarget || e.dispose();
}
function yr(e, t) {
	return e.get(t.id) ?? _n;
}
function br(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? _n;
	});
}
function xr(e, t) {
	e.forEach((e, n) => {
		e.screenTextureNode.value = t.get(n) ?? _n;
	});
}
var Sr = H("\n  fn skyboxStudioDirectionToSourceStarfieldUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let theta = atan2(normalizedDirection.x, normalizedDirection.z);\n    let u = fract(theta / 6.283185307179586 + 0.5);\n    let v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / 3.141592653589793;\n\n    return vec2<f32>(u, v);\n  }\n"), Cr = H("\n  fn skyboxStudioCombineStarfieldSample(\n    backdrop: vec4<f32>,\n    screenStars: vec4<f32>\n  ) -> vec4<f32> {\n    return vec4<f32>(backdrop.rgb + screenStars.rgb, max(backdrop.a, screenStars.a));\n  }\n");
w({
	type: "starfield",
	updateLive: (e, t) => {
		e.applyLayerParams(t), e.scheduleResourceBake(t.id, t.params);
	},
	wgsl: {
		collect: _r,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : Ve();
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, resourceTextures: r }) => {
			let i = n, a = /* @__PURE__ */ new Map(), o = Object.fromEntries(e.map((e) => {
				let n = Sr({ direction: t }), o = De(yr(i, e.layer), n).setName(`starfieldTexture${e.index}`);
				o.getUniformHash = () => `skybox-starfield-texture:${e.layer.id}`;
				let s = De(r.get(e.layer.id) ?? _n, xe).setName(`starfieldScreenTexture${e.index}`);
				s.getUniformHash = () => `skybox-starfield-screen-texture:${e.layer.id}`;
				let c = Cr({
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
function wr(e, t, n = {}) {
	let r = A(t.type);
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
function Tr(e, t, n = {}) {
	return t.filter((e) => e.enabled).reverse().reduce((t, r) => {
		let i = r.type === "group" ? [...Tr(e, r.children, n), 1] : wr(e, r, n), a = D(i[3] * (r.opacity / 100));
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
function Er(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = Er(n.children, t);
		if (e) return e;
	}
	return null;
}
function Dr(e, t, n = {}) {
	let r = G(e), i = n.targetGroupId ? Er(r.nodes, n.targetGroupId) : null;
	return Tr(t, n.targetGroupId ? i ? [i] : [] : r.nodes, n);
}
//#endregion
//#region src/baking/bake.ts
var Or = 1024, kr = "0.1.1", Ar = /* @__PURE__ */ new Map(), jr = /* @__PURE__ */ new Map();
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
	return y(JSON.stringify({
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
function Lr(e) {
	return e.some((e) => e.enabled && (e.type === "moon" || e.type === "group" && Lr(e.children)));
}
function Rr(e, t, n, r, i) {
	let a = Fr(r ? Ir(e.nodes, r)?.children ?? [] : e.nodes);
	if (a.length === 0) return;
	let o = /* @__PURE__ */ new Map();
	return a.forEach((e) => {
		let r = i?.get(e.id);
		if (r) {
			o.set(e.id, r);
			return;
		}
		let a = te(e.params, t, n), s = jr.get(a), c = s ?? S(e.params, t, n);
		s || jr.set(a, c), o.set(e.id, c);
	}), o;
}
function zr(e, t = {}) {
	let n = G(e), r = Mr(t);
	if (Lr(r.targetGroupId ? Ir(n.nodes, r.targetGroupId)?.children ?? [] : n.nodes)) throw Error("Moon layers require WebGPU compute and are not supported by the CPU baker.");
	let i = r.cache ? Nr(n, r) : null;
	if (i) {
		let e = Ar.get(i);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: a, targetGroupId: o, width: s } = r, c = Rr(n, s, a, o, t.starfieldBakes), l = new Uint8ClampedArray(s * a * 4);
	for (let e = 0; e < a; e += 1) {
		let t = (e + .5) / a;
		for (let r = 0; r < s; r += 1) {
			let [i, d, f] = m(Dr(n, u((r + .5) / s, t), {
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
	return i && Ar.set(i, {
		...d,
		data: new Uint8ClampedArray(l)
	}), d;
}
//#endregion
//#region src/skybox/composition.ts
function Br(e) {
	return e.filter((e) => e.enabled).reverse();
}
function Vr(e) {
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
function Hr(e) {
	return {
		blendMode: Vr(e.blendMode),
		opacity: D(e.opacity / 100)
	};
}
function Ur(e) {
	return `select(1.055 * pow(${e}, ${ze(1 / 2.4)}) - ${ze(.055)}, ${e} * 12.92, ${e} <= ${ze(.0031308)})`;
}
function Wr(e) {
	return `select(pow((${e} + ${ze(.055)}) / ${ze(1.055)}, ${ze(2.4)}), ${e} / 12.92, ${e} <= ${ze(.04045)})`;
}
function Gr(e) {
	let t = ze(1), n = ze(.5), r = ze(0), i = "blendSource", a = "blendBackdrop";
	switch (e) {
		case "darken": return `min(${a}, ${i})`;
		case "multiply": return `${a} * ${i}`;
		case "color-burn": return Be(`${a} == ${t}`, t, Be(`${i} == ${r}`, r, `${t} - min(${t}, (${t} - ${a}) / ${i})`));
		case "lighten": return `max(${a}, ${i})`;
		case "screen": return `${a} + ${i} - ${a} * ${i}`;
		case "color-dodge": return Be(`${a} == ${r}`, r, Be(`${i} == ${t}`, t, `min(${t}, ${a} / (${t} - ${i}))`));
		case "overlay": return Be(`${a} <= ${n}`, `2.0 * ${a} * ${i}`, `${t} - 2.0 * (${t} - ${a}) * (${t} - ${i})`);
		case "soft-light": return Be(`${i} <= ${n}`, `${a} - (${t} - 2.0 * ${i}) * ${a} * (${t} - ${a})`, `${a} + (2.0 * ${i} - ${t}) * (softLightD - ${a})`);
		case "hard-light": return Be(`${i} <= ${n}`, `2.0 * ${a} * ${i}`, `${a} + (2.0 * ${i} - ${t}) - ${a} * (2.0 * ${i} - ${t})`);
		case "difference": return `abs(${a} - ${i})`;
		case "exclusion": return `${a} + ${i} - 2.0 * ${a} * ${i}`;
		default: return i;
	}
}
function Kr() {
	return `let softLightD = ${Be("blendBackdrop <= vec3<f32>(0.25)", "((16.0 * blendBackdrop - vec3<f32>(12.0)) * blendBackdrop + vec3<f32>(4.0)) * blendBackdrop", "sqrt(blendBackdrop)")};`;
}
function qr(e, t) {
	let n = Vr(t);
	return `${e} >= ${K(n - .5)} && ${e} < ${K(n + .5)}`;
}
function Jr(e) {
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
	].map((t, n) => `${n === 0 ? "if" : "else if"} (${qr(e, t)}) {
            blendedSrgb = ${Gr(t)};
          }`).join("\n");
	return `let blendSourceLinear = clamp(effectColor.rgb, vec3<f32>(0.0), vec3<f32>(1.0));
        ${q("blendedColor", "vec3<f32>", "blendSourceLinear")}
        if (${e} >= ${K(.5)}) {
          let blendBackdropLinear = clamp(composedColor, vec3<f32>(0.0), vec3<f32>(1.0));
          let blendBackdrop = ${Ur("blendBackdropLinear")};
          let blendSource = ${Ur("blendSourceLinear")};
          ${Kr()}
          ${q("blendedSrgb", "vec3<f32>", "blendSource")}
          ${t}
          let blendedSrgbClamped = clamp(blendedSrgb, vec3<f32>(0.0), vec3<f32>(1.0));
          blendedColor = ${Wr("blendedSrgbClamped")};
        }`;
}
function Yr(e, t, n, r = 0) {
	return Br(e).map((e, i) => {
		let a = e.type === "group" ? `effectColor = vec4<f32>(groupColor${r}_${i}, 1.0);` : Zr(e, n), o = `groupColor${r}_${i}`, s = t.get(e.id), c = s ? `${s.parameterPrefix}Opacity` : K(e.opacity / 100), l = s ? `${s.parameterPrefix}BlendMode` : K(Vr(e.blendMode));
		return `{
        ${e.type === "group" ? `${q(o, "vec3<f32>", "vec3<f32>(0.0)")}
        {
          ${q("previousComposedColor", "vec3<f32>", "composedColor")}
          composedColor = vec3<f32>(0.0);
          ${Yr(e.children, t, n, r + 1)}
          ${o} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${q("effectColor", "vec4<f32>", "vec4<f32>(0.0)")}
        ${a}
        let sourceAlpha = clamp(effectColor.a * ${c}, 0.0, 1.0);
        ${Jr(l)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          vec3<f32>(0.0),
          vec3<f32>(1.0)
        );
      }`;
	}).join("\n");
}
function Xr(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Zr(e, t) {
	let n = t.adapters.get(e.type);
	return n ? n.adapter.createSampleExpression(e, "wgsl", { bindingsByLayerId: n.bindingsByLayerId }) : Ve();
}
//#endregion
//#region src/skybox/materials.ts
function Qr(e) {
	return e.map((e) => {
		let t = Hr(e.node);
		return {
			blendMode: z(t.blendMode),
			nodeId: e.node.id,
			opacity: z(t.opacity)
		};
	});
}
function $r(e, t) {
	for (let n of e) if (n.enabled) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = $r(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
function ei(e, t) {
	e.forEach((e) => {
		let n = $r(t.nodes, e.nodeId);
		if (!n) return;
		let r = Hr(n);
		e.opacity.value = r.opacity, e.blendMode.value = r.blendMode;
	});
}
function ti(e, t) {
	let n = e.find((e) => e.nodeId === t.id);
	if (!n) return;
	let r = Hr(t);
	n.opacity.value = r.opacity, n.blendMode.value = r.blendMode;
}
function ni(e, t) {
	e.userData.applyCompositionParams = t;
}
function ri(e, t) {
	e.userData.applyLayerComposition = t;
}
function ii(e) {
	let t = [];
	function n(e) {
		Br(e).forEach((e) => {
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
function ai(e) {
	return new Map(e.map((e) => [e.node.id, e]));
}
function oi() {
	return E().map((e) => e.wgsl).filter((e) => !!e);
}
function si(e, t, n, r, i, a, o, s) {
	let c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map(), u = {}, d = {};
	return oi().forEach((a) => {
		let f = a.collect(e.nodes), p = a.createUniforms(f), m = a.createSampleNodes?.({
			bindings: f,
			direction: t,
			imageTextures: a.type === "starfield" ? r : n,
			resourceTextures: a.type === "clouds" ? o : a.type === "moon" ? s : a.type === "starfield" ? i : /* @__PURE__ */ new Map(),
			uniforms: p
		}), h = {
			adapter: a,
			bindings: f,
			bindingsByLayerId: Xr(f),
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
function ci(e, t) {
	return e.adapters.get(t);
}
function li(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				li(e.children, t);
				return;
			}
			t(e);
		}
	});
}
function ui(e, t) {
	let n = e.adapters.get(t.type);
	n && n.adapter.updateUniforms(n.uniforms, t);
}
function di(e, t, n) {
	let r = ai(n), i = Yr(e.nodes, r, t);
	return H(`
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
function fi(e, t, n, r, i, a, o, s) {
	let c = ii(e.nodes), l = Qr(c), u = si(e, t, n, r, i, a, o, s), d = ci(u, "image"), f = d?.uniforms ?? [], p = d?.samples, m = ci(u, "starfield")?.samples;
	return {
		colorNode: di(e, u, c)({
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
function pi() {
	let e = xe.mul(2).sub(1), t = oe.mul(ke(e.x, e.y.negate(), 1, 1)), n = t.xyz.div(t.w), r = se.mul(ke(n, 0)).xyz;
	return _e(r);
}
function mi(e, t, n, r, i, a, o, s, c) {
	let l = new je(), u = N(() => {
		let e = ge;
		return e.z.assign(e.w), e;
	})();
	l.side = M.BackSide, l.depthTest = !1, l.depthWrite = !1, l.vertexNode = u;
	let { colorNode: d, compositionUniforms: f, imageSamples: p, imageUniforms: m, layerRuntime: h, starfieldSamples: g } = fi(e, pi(), n, r, i, a, o, s), _ = c ? E().flatMap((e) => {
		let n = h.adapters.get(e.type);
		if (!e.wgslEditorOverlay || !n) return [];
		let r = n.bindings;
		return [{
			bindings: r,
			editorUniforms: rr(r, t)
		}];
	}) : [], v = d;
	return _.forEach(({ bindings: e, editorUniforms: t }) => {
		e.forEach((e, n) => {
			let r = h.editorProjectionByLayerId.get(e.layer.id);
			r && (v = or({
				color: v,
				activeValue: t[n].active,
				uv: r.uv,
				valid: r.valid
			}));
		});
	}), l.colorNode = v, _.length > 0 && ar(l, (e) => {
		_.forEach(({ editorUniforms: t }) => ir(t, e));
	}), l.userData.webGpuLayerRuntime = h, l.userData.applyLayerParams = (e) => ui(h, e), ni(l, (e) => ei(f, e)), ri(l, (e) => ti(f, e)), Dn(l, (e, t) => En(m, e, t)), l.userData.applyImageTextures = (e) => Nn(p?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.applyStarfieldTextures = (e) => br(g?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.applyStarfieldScreenTextures = (e) => xr(g?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.applyCloudFieldTextures = (e) => {
		mt(h.adapters.get("clouds")?.samples, e);
	}, l.userData.applyMoonTextures = (e) => {
		Hn(h.adapters.get("moon")?.samples, e);
	}, l.userData.applyTime = (e) => {
		h.adapters.forEach((t) => {
			t.adapter.updateTime?.(t.uniforms, e);
		});
	}, l.userData.debugImageTextureSlots = h.textureSlotsByLayerId, l.userData.debugStarfieldScreenTextureSlots = Object.fromEntries(Array.from(g?.sampleData.entries() ?? []).map(([e, t]) => [e, t.screenTextureNode])), l.userData.debugStarfieldSampleNodes = Object.fromEntries(Array.from(g?.sampleData.entries() ?? []).map(([e, t]) => [e, t.sampleNode])), l;
}
var hi = H("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.x, -normalizedDirection.z);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n"), gi = H("\n  fn skyboxStudioEquirectUvToDirection(uv: vec2<f32>) -> vec3<f32> {\n    let lambda = (uv.x - 0.5) * 6.283185307179586;\n    let phi = (uv.y - 0.5) * 3.141592653589793;\n    let cosPhi = cos(phi);\n\n    return normalize(vec3<f32>(cosPhi * sin(lambda), sin(phi), -cosPhi * cos(lambda)));\n  }\n");
function _i(e, t, n, r, i, a = {}) {
	let o = new je();
	o.side = M.DoubleSide, o.depthTest = !1, o.depthWrite = !1;
	let s = ve.xy.mul(.5).add(.5), { colorNode: c } = fi(e, _e(gi({ uv: a.flipY ? B(s.x, s.y.oneMinus()) : s })), t, n, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), r, i);
	return o.colorNode = c, o;
}
function vi(e) {
	let t = new je(), n = N(() => {
		let e = ge;
		return e.z.assign(e.w), e;
	})(), r = pi();
	return t.side = M.BackSide, t.depthTest = !1, t.depthWrite = !1, t.vertexNode = n, t.colorNode = De(e, hi({ direction: r })), t;
}
function yi(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function bi(e, t = {}) {
	let n = zr(e, t), r = yi(n.width, n.height), i = r.getContext("2d");
	if (!i || !("putImageData" in i)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	i.putImageData(new ImageData(n.data, n.width, n.height), 0, 0);
	let a = new M.CanvasTexture(r);
	return a.mapping = M.EquirectangularReflectionMapping, a.wrapS = M.RepeatWrapping, a.wrapT = M.ClampToEdgeWrapping, a.colorSpace = M.SRGBColorSpace, a.flipY = !1, a.needsUpdate = !0, a;
}
function xi(e) {
	return vi(e);
}
function Si(e) {
	return e === "baked-texture" ? "baked-texture" : "live-webgpu";
}
function Ci(e, t, n) {
	let r = (e) => e.type === "group" ? {
		children: e.children.map(r),
		enabled: e.enabled,
		id: e.id,
		type: e.type
	} : {
		enabled: e.enabled,
		id: e.id,
		topology: A(e.type)?.getTopologyKey?.(e) ?? null,
		type: e.type
	};
	return JSON.stringify({
		editorPresentationEnabled: n,
		geometry: e.geometry?.type ?? W.type,
		nodes: e.nodes.map(r),
		renderMode: t
	});
}
function wi(e, t) {
	for (let n of e) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = wi(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
//#endregion
//#region src/layer-addons/builtins/moon/disc.ts
var Ti = .72, Ei = 1 / Ti - 1, { Fn: Di, float: Z, vec3: Q, vec4: Oi, Loop: ki, floor: Ai, fract: ji, sin: Mi, exp: Ni, dot: Pi, length: Fi, min: Ii, max: Li, mix: Ri, smoothstep: zi, clamp: Bi, pow: Vi, mx_fractal_noise_float: Hi, mx_noise_float: Ui } = ne, Wi = /* @__PURE__ */ Di(([e]) => ji(Mi(Oi(Pi(e, Q(127.1, 311.7, 74.7)), Pi(e, Q(269.5, 183.3, 246.1)), Pi(e, Q(113.5, 271.9, 124.6)), Pi(e, Q(419.2, 371.9, 168.2)))).mul(43758.5453123))), Gi = /* @__PURE__ */ Di(([e, t, n, r]) => {
	let i = e.mul(t).add(r), a = Ai(i), o = Z(0).toVar(), s = Z(0).toVar(), c = Z(0).toVar(), l = Z(0).toVar();
	return ki(27, ({ i: e }) => {
		let t = Z(e), r = Q(t.mod(3).sub(1), t.div(3).floor().mod(3).sub(1), t.div(9).floor().sub(1)), u = a.add(r), d = Wi(u), f = u.add(d.xyz), p = Fi(i.sub(f)), m = Vi(d.w, Z(2.2)).mul(.62).add(.14), h = ji(d.x.mul(7.13).add(d.z.mul(3.71))), g = p.div(m), _ = Bi(g, 0, 1), v = _.mul(_).oneMinus().negate(), y = g.sub(1), b = Ni(y.mul(y).mul(-26)).mul(zi(0, .45, g)), x = zi(2.6, 1.05, g).mul(zi(.95, 1.2, g)), S = n.mul(Ri(Z(.5), Z(1), h));
		o.assign(Ii(o, v.mul(S))), s.addAssign(b.mul(S).mul(.45)), c.addAssign(x.mul(S).mul(.1));
		let C = Vi(Ui(i.sub(f).div(Li(p, 1e-4)).mul(9).add(u)).mul(.5).add(.5), Z(4)).mul(zi(7, 1.1, g));
		l.addAssign(b.add(C.mul(.8)).mul(zi(.55, .95, h)));
	}), Oi(o.add(s).add(c), s, l, Z(0));
});
function Ki(e, t) {
	let n = Gi(e, t.craterFreq, t.craterDepth, Q(0, 0, 0)), r = Gi(e, t.craterFreq.mul(2.7), t.craterDepth.mul(.45), Q(11.3, 4.7, 19.1)), i = Gi(e, t.craterFreq.mul(7.1), t.craterDepth.mul(.18), Q(31.7, 23.9, 7.5)), a = Hi(e.mul(1.7).add(Q(5, 1.7, 9.3)), 4, 2, .55).mul(.5).add(.5), o = Ri(Z(.78), Z(.18), t.maria), s = zi(o, o.add(.13), a), c = Hi(e.mul(t.craterFreq.mul(16)), 4, 2, .5).mul(t.regolith).mul(t.craterDepth).mul(.28), l = n.x.add(r.x.mul(Ri(Z(1), Z(.45), s))).add(i.x.mul(Ri(Z(1), Z(.2), s))).add(c.mul(Ri(Z(1), Z(.4), s))).sub(s.mul(t.mariaDepth)), u = n.z.add(r.z.mul(.7)).add(i.z.mul(.4)), d = Hi(e.mul(3.1).add(Q(17, 3, 21)), 3, 2, .5).mul(.07);
	return Oi(l, Ri(t.albedo, t.albedo.mul(t.mariaDarkness), s).mul(Z(1).add(d)).add(u.mul(t.rays).mul(t.albedo).mul(.55)).clamp(0, 1), s, u);
}
function qi(e, t, n) {
	let r = t.cos(), i = t.sin(), a = Q(e.x, e.y.mul(r).sub(e.z.mul(i)), e.y.mul(i).add(e.z.mul(r))), o = n.cos(), s = n.sin();
	return Q(a.x.mul(o).add(a.z.mul(s)), a.y, a.z.mul(o).sub(a.x.mul(s)));
}
//#endregion
//#region src/layer-addons/builtins/moon/tsl/light.ts
var { float: Ji, vec3: Yi, dot: Xi, max: Zi, mix: Qi, pow: $i, smoothstep: ea, clamp: ta } = ne;
function na(e, t, n) {
	return Qi(Zi(Xi(Yi(e.x, e.y, 0), t), 0), Ji(1), n.glowWrap);
}
function ra(e, t, n) {
	let r = Qi(t, Ji(1), n.glowWrap);
	return $i(ta(e.oneMinus(), 0, 1), n.rimPower).mul(n.rimStrength).mul(r);
}
function ia(e, t, n, r) {
	let i = Zi(r.glowWidth, .001).mul(Ei), a = $i(ta(Zi(e.sub(1), 0).div(i), 0, 1).oneMinus(), Ji(2.2));
	return ea(Ji(1).sub(i.mul(.35)).sub(.02), 1, e).mul(a).mul(r.glowStrength).mul(na(t, n, r));
}
//#endregion
//#region src/layer-addons/builtins/moon/tsl/cartoon.ts
var { float: aa, vec2: oa, vec3: sa, vec4: ca, Loop: la, acos: ua, sqrt: da, cos: fa, sin: pa, dot: ma, abs: ha, min: ga, max: _a, mix: va, smoothstep: ya, clamp: ba, normalize: xa, step: Sa, length: Ca, pow: wa, mx_fractal_noise_float: Ta, mx_noise_float: Ea } = ne, Da = 2.399963229728653;
function Oa(e, t, n, r, i, a, o, s) {
	let c = Ta(t.mul(2.3).add(sa(5, 1.7, 9.3)), 4, 2.2, .5).mul(.5).add(.5), l = va(aa(.7), aa(.34), s.maria), u = ya(l, l.add(.05), c), d = va(s.baseColor, s.mareColor, u), f = aa(0).toVar(), p = aa(0).toVar(), m = _a(s.cartoonCraters, 1);
	la(64, ({ i: e }) => {
		let n = aa(e), i = Sa(n, m.sub(.5)), o = n.mul(2).add(1).div(m).oneMinus(), c = da(_a(o.mul(o).oneMinus(), 0)), l = n.mul(Da), u = sa(fa(l).mul(c), o, pa(l).mul(c)), d = Wi(sa(n, n.mul(.37), 3.1)), h = xa(u.add(d.xyz.sub(.5).mul(.22))), g = s.cartoonCraterSize.mul(wa(d.w, aa(1.9)).mul(1.5).add(.16)), _ = xa(t.sub(h.mul(ma(t, h))).add(1e-5)), v = ua(ba(ma(t, h), -1, 1)), y = Ea(_.mul(1.15).add(h.mul(11))), b = g.mul(aa(1).add(y.mul(s.cartoonWobble))), x = ya(b.mul(.94), b, v).oneMinus(), S = r.sub(h.mul(ma(r, h))), C = ma(_, xa(va(a.sub(h.mul(ma(a, h))), S, ya(.25, .8, Ca(S)).mul(s.cartoonSunLean)).add(1e-5))), w = ya(b.mul(.25), b.mul(.72), v).mul(x), ee = w.mul(ya(-.5, .2, C).oneMinus()), T = w.mul(ya(-.2, .5, C)), te = x.mul(.3).add(ee.mul(.45)).sub(T.mul(1.1));
		f.addAssign(te.mul(s.cartoonRelief).mul(i));
		let E = b.mul(.05).add(.003), D = ha(v.sub(b)).div(E).oneMinus().clamp(0, 1);
		p.addAssign(D.mul(i));
	});
	let h = ma(n, o).mul(.5).add(.5), g = va(s.cartoonForm.oneMinus(), 1, ya(.1, .95, h)), _ = va(d.mul(aa(1).add(f.clamp(-.8, .8))).mul(g), s.mareColor.mul(.22), ga(p, 1).mul(s.cartoonOutline).clamp(0, 1)), v = s.cartoonSoftness.mul(.4).add(.012), y = ma(n, i), b = xa(oa(i.x, i.y).add(1e-4)), x = _a(s.cartoonShadowSize, .001), S = b.mul(va(x.sub(1), x.add(1), s.phaseT).negate()), C = va(y, Ca(e.sub(S)).sub(x), ya(0, .15, s.cartoonShadowSize)), w = ya(v.negate(), v, C), ee = ya(v, v.add(.13), C).oneMinus().mul(w).mul(s.cartoonEdgeGlow), T = ra(n.z, w, s), te = _.add(_.mul(ee)).mul(s.lightIntensity).add(_.mul(s.ambient)).add(s.rimColor.mul(T)), E = va(va(s.nightColor.mul(s.earthshine.mul(6)), te, w), te, s.cartoonCrop), D = va(aa(1), w, s.cartoonCrop);
	return ca(E.mul(s.exposure), D);
}
//#endregion
//#region src/layer-addons/builtins/moon/baker.ts
var { Fn: ka, instanceIndex: Aa, uniform: $, textureStore: ja, textureLoad: Ma, int: Na, float: Pa, vec2: Fa, vec3: Ia, vec4: La, ivec2: Ra, floor: za, sqrt: Ba, length: Va, dot: Ha, min: Ua, max: Wa, mix: Ga, clamp: Ka, smoothstep: qa, normalize: Ja } = ne, Ya = 6, Xa = 4, Za = 14, Qa = class {
	constructor(e, t) {
		this.realisticPasses = [], this.cartoonPasses = [], this.renderer = e, this.size = t.resolution, this.U = {
			craterFreq: $(t.craterFreq),
			craterDepth: $(t.craterDepth),
			maria: $(t.maria),
			mariaDarkness: $(t.mariaDarkness),
			mariaDepth: $(t.mariaDepth),
			regolith: $(t.regolith),
			rays: $(t.rays),
			albedo: $(t.albedo),
			tilt: $(t.bodyTilt),
			rotation: $(t.bodyRotation),
			bumpStrength: $(t.bumpStrength),
			ao: $(t.ao),
			shadowStrength: $(t.shadowStrength),
			shadowReach: $(t.shadowReach),
			backscatter: $(t.backscatter),
			earthshine: $(t.earthshine),
			exposure: $(t.exposure),
			lightIntensity: $(t.lightIntensity),
			ambient: $(t.ambient),
			rimStrength: $(t.rimStrength),
			rimPower: $(t.rimPower),
			rimColor: $(new U.Color(t.rimColor)),
			glowStrength: $(t.glowStrength),
			glowWidth: $(t.glowWidth),
			glowWrap: $(t.glowWrap),
			glowColor: $(new U.Color(t.glowColor)),
			sunDir: $(new U.Vector3(0, 0, 1)),
			phaseT: $(1),
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
			baseColor: $(new U.Color(t.baseColor)),
			mareColor: $(new U.Color(t.mareColor)),
			nightColor: $(new U.Color(t.nightColor))
		}, this.build(), this.setSun(t);
	}
	build() {
		let e = this.size;
		this.terrainTex = new U.StorageTexture(e, e), this.terrainTex.type = U.FloatType, this.deriveTex = new U.StorageTexture(e, e), this.deriveTex.type = U.FloatType, this.outputTex = new U.StorageTexture(e, e), this.outputTex.type = U.HalfFloatType, this.outputTex.colorSpace = U.NoColorSpace, this.outputTex.minFilter = U.LinearFilter, this.outputTex.magFilter = U.LinearFilter, this.outputTex.wrapS = U.ClampToEdgeWrapping, this.outputTex.wrapT = U.ClampToEdgeWrapping;
		let t = this.U, n = (t, n) => Fa(t.add(.5).div(e), n.add(.5).div(e)).sub(.5).mul(2 / Ti), r = (t) => Ra(Ka(za(t.mul(Ti * .5).add(.5).mul(e)), Fa(0), Fa(e - 1))), i = (e) => Ma(this.terrainTex, r(e)).x, a = (t, n) => Ra(Ka(t, Na(0), Na(e - 1)), Ka(n, Na(0), Na(e - 1))), o = () => {
			let t = Na(Aa.mod(e)), r = Na(Aa.div(e)), i = n(Pa(t), Pa(r)), a = Va(i), o = i.div(Wa(a, 1)), s = Ba(Wa(Ha(o, o).oneMinus(), 0));
			return {
				x: t,
				y: r,
				p: i,
				r: a,
				pc: o,
				z: s,
				n: Ia(o.x, o.y, s)
			};
		}, s = ka(() => {
			let { x: e, y: n, n: r } = o(), i = qi(r, t.tilt, t.rotation);
			ja(this.terrainTex, Ra(e, n), Ki(i, t)).toWriteOnly();
		})().compute(e * e), c = ka(() => {
			let { x: n, y: r, pc: s, z: c, n: l } = o(), u = (e, t) => Ma(this.terrainTex, a(e, t)).x, d = u(n, r), f = 2 / (e * Ti), p = u(n.add(1), r).sub(u(n.sub(1), r)).div(2 * f), m = u(n, r.add(1)).sub(u(n, r.sub(1))).div(2 * f), h = Wa(c, .06), g = h.mul(h), _ = s.x, v = s.y, y = g.add(v.mul(v)).mul(p).sub(_.mul(v).mul(m)), b = g.add(_.mul(_)).mul(m).sub(_.mul(v).mul(p)), x = Ia(y, b, y.mul(_).add(b.mul(v)).div(h).negate()), S = qa(0, .22, c), C = Ja(l.sub(x.mul(t.bumpStrength.mul(S)))), w = Pa(0).toVar();
			for (let e = 0; e < Ya; e++) {
				let n = e / Ya * Math.PI * 2, r = Fa(Math.cos(n), Math.sin(n)), a = Pa(0).toVar();
				for (let e = 1; e <= Xa; e++) {
					let n = t.shadowReach.mul(e / Xa), o = Wa(i(s.add(r.mul(n))).sub(d).sub(n.mul(n).mul(.5)).div(n), 0);
					a.assign(Wa(a, o.div(Ba(o.mul(o).add(1)))));
				}
				w.addAssign(a);
			}
			let ee = w.div(Ya).mul(t.ao).oneMinus().clamp(0, 1);
			ja(this.deriveTex, Ra(n, r), La(C, ee)).toWriteOnly();
		})().compute(e * e), l = ka(() => {
			let { x: n, y: r, r: a, pc: s, z: c, n: l } = o(), u = Ma(this.terrainTex, Ra(n, r)), d = Ma(this.deriveTex, Ra(n, r)), f = u.x, p = u.y, m = d.xyz, h = d.w, g = t.sunDir, _ = Wa(Ha(m, g), 0), v = Ha(l, g), y = Wa(c, 0), b = Ja(g.sub(l.mul(v))), x = v.div(Ba(Wa(v.mul(v).oneMinus(), 1e-4))), S = Pa(1).toVar();
			for (let e = 1; e <= Za; e++) {
				let n = t.shadowReach.mul(e / Za), r = i(s.add(b.xy.mul(n))).sub(n.mul(n).mul(.5)), a = f.add(n.mul(x));
				S.assign(Ua(S, qa(0, t.craterDepth.mul(.3), a.sub(r))));
			}
			let C = Ga(Pa(1), S, t.shadowStrength.mul(qa(0, .18, v))), w = Ga(_, _.div(_.add(y).add(1e-4)).mul(2), t.backscatter).clamp(0, 2), ee = Ia(1, .97, .92), T = Ia(.35, .5, .9), te = w.oneMinus().clamp(0, 1).mul(y).mul(t.earthshine), E = w.mul(C).mul(h).mul(t.lightIntensity), D = ra(c, qa(0, .25, v), t), O = Ia(p).mul(E.add(t.ambient)).mul(ee).add(Ia(p).mul(te).mul(T)).add(t.rimColor.mul(D)).mul(t.exposure), k = qa(1, 1 - 2 / (e * Ti) * 1.5, a), A = ia(a, s, g, t).mul(t.exposure), j = Ga(t.glowColor.mul(A), O, k), M = Ka(k.add(A), 0, 1);
			ja(this.outputTex, Ra(n, r), La(j, M)).toWriteOnly();
		})().compute(e * e), u = ka(() => {
			let { x: n, y: r, p: i, r: a, pc: s, n: c } = o(), l = qi(c, t.tilt, t.rotation), u = qi(t.sunDir, t.tilt, t.rotation), d = Ja(Ia(-.48, .62, .62)), f = qi(d, t.tilt, t.rotation), p = Oa(i, l, c, u, t.sunDir, f, d, t), m = qa(.93, 1, a), h = Ga(p.xyz, t.mareColor.mul(.22), m.mul(t.cartoonOutline)), g = qa(1, 1 - 2 / (e * Ti) * 1.5, a).mul(p.w), _ = ia(a, s, t.sunDir, t).mul(t.exposure).mul(p.w), v = Ga(t.glowColor.mul(_), h, g), y = Ka(g.add(_), 0, 1);
			ja(this.outputTex, Ra(n, r), La(v, y)).toWriteOnly();
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
}, $a = 128, eo = 2048, to = 2 * Math.atan(1 / 4), no = {
	realistic: 2.6,
	cartoon: 1
};
function ro(e = [
	0,
	0,
	-1
]) {
	return {
		placement: cn({
			angularHeight: to,
			angularWidth: to,
			centerDirection: J(e)
		}),
		resolutionMode: "auto",
		phase: .5,
		sunTilt: .12,
		bodyRotation: 0,
		bodyTilt: 0,
		craterFreq: 7,
		craterDepth: .012,
		maria: .42,
		mariaDarkness: .5,
		mariaDepth: .004,
		regolith: .5,
		rays: 1,
		albedo: .13,
		bumpStrength: 1,
		ao: .8,
		shadowStrength: .9,
		shadowReach: .055,
		backscatter: .75,
		earthshine: .05,
		exposure: no.realistic,
		lightIntensity: 1,
		ambient: 0,
		rimStrength: .35,
		rimPower: 3,
		rimColor: "#ffffff",
		glowStrength: .5,
		glowWidth: .22,
		glowWrap: .25,
		glowColor: "#cfe2ff",
		style: "realistic",
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
function io(e) {
	return {
		...e,
		placement: Y(e.placement)
	};
}
function ao(e) {
	let t = {
		...ro(e?.placement?.centerDirection),
		...e ?? {}
	};
	return io({
		...t,
		placement: Y(t.placement)
	});
}
//#endregion
//#region src/layer-addons/builtins/moon/service.ts
function oo(e) {
	return !!(e && typeof e.computeAsync == "function");
}
function so(e) {
	return 2 ** Math.ceil(Math.log2(Math.max(1, e)));
}
function co(e, t) {
	if (e.resolutionMode !== "auto") return Number(e.resolutionMode);
	let n = Math.max(e.placement.angularHeight, e.placement.angularWidth), r = so((t.kind === "equirect" ? n / Math.PI * Math.max(1, t.height) : Math.tan(n / 2) / Math.max(Math.tan(t.verticalFovRadians / 2), 1e-6) * Math.max(1, t.renderHeight)) / Ti);
	return Math.min(eo, Math.max(128, r));
}
function lo(e, t) {
	let { placement: n, resolutionMode: r, ...i } = e;
	return JSON.stringify({
		appearance: i,
		resolution: t
	});
}
function uo(e, t = []) {
	return e.forEach((e) => {
		e.enabled && (e.type === "group" ? uo(e.children, t) : e.type === "moon" && t.push(e));
	}), t;
}
var fo = class {
	#e;
	#t = /* @__PURE__ */ new Map();
	#n = !1;
	constructor(e) {
		if (!oo(e)) throw Error("Moon layers require a WebGPU renderer with compute support.");
		this.#e = e;
	}
	canBake() {
		return !this.#n;
	}
	async bakeLayer(e, t, n) {
		if (this.#n) throw Error("Moon bake service has been disposed.");
		let r = co(t, n), i = {
			key: lo(t, r),
			params: {
				...t,
				resolution: r
			},
			resolution: r
		}, a = this.#t.get(e);
		if (a ? (a.request = i, a.disposeRequested = !1) : (a = {
			baker: null,
			bakerResolution: 0,
			completedKey: "",
			disposeRequested: !1,
			request: i,
			running: null
		}, this.#t.set(e, a)), !a.running && a.completedKey !== i.key && (a.running = this.#r(e, a)), await a.running, !a.baker || a.disposeRequested) throw Error("Moon layer was disposed before its bake completed.");
		return a.baker.outputTex;
	}
	async bakeManifest(e, t) {
		let n = uo(e), r = new Set(n.map((e) => e.id));
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
				if ((!n || t.bakerResolution !== e.resolution) && (r = new Qa(this.#e, e.params), n = r), await n.bake(e.params), t.disposeRequested) {
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
function po(e) {
	return oo(e) ? new fo(e) : null;
}
//#endregion
//#region src/skybox.ts
var mo = { starsOmitted: !0 }, ho = M.MathUtils.degToRad(50), go = 1024, _o = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: W,
	nodes: [],
	version: 2
}, vo = class extends M.Mesh {
	#e = {};
	#t = /* @__PURE__ */ new Map();
	#n = { ...$n };
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
			let n = wi(this.#c.nodes, e);
			n?.type === "starfield" ? this.scheduleStarfieldTextureBake(e, t) : n?.type === "moon" && this.scheduleMoonTextureBake(e, t);
		}
	};
	#c = _o;
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
	#w = new M.Vector2();
	#T = new M.Quaternion();
	#E = new M.Color();
	constructor() {
		super(Ie(W), mi(_o, $n, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), !1)), this.frustumCulled = !1, this.renderOrder = -1, this.onBeforeRender = ((e, t, n) => {
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
		return this.#h = e, this.#g?.dispose(), this.#g = k(e), this.disposeMoonTextures(), this.#d = po(e), this.syncMoonTextures(), this.#C.forEach((e) => {
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
		let t = Fe(e);
		if (this.#i.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#i = t, this.geometry = Ie(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#p?.dispose(), this.#p = null;
	}
	disposeStarfieldTextures() {
		this.#v.forEach((e) => {
			clearTimeout(e);
		}), this.#v.clear(), this.#b.forEach((e) => vr(e)), this.#b.clear(), this.#y.clear(), this.#g?.dispose(), this.#g = null;
	}
	disposeMoonTextures() {
		this.#u.forEach((e) => {
			clearTimeout(e);
		}), this.#u.clear(), this.#f.clear(), this.#d?.dispose(), this.#d = null;
	}
	getMoonBakeTarget() {
		return {
			kind: "viewport",
			renderHeight: this.#_?.renderHeight ?? go,
			verticalFovRadians: this.#_?.verticalFovRadians ?? ho
		};
	}
	syncMoonTextures() {
		let e = /* @__PURE__ */ new Set();
		li(this.#c.nodes, (t) => {
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
			let t = wi(this.#c.nodes, e);
			if (t?.type !== "moon") return;
			!this.#d && this.#h && (this.#d = po(this.#h));
			let n = this.#d;
			if (n?.canBake()) try {
				let r = this.#f.get(e), i = await n.bakeLayer(e, t.params, this.getMoonBakeTarget());
				if (n !== this.#d) return;
				if (wi(this.#c.nodes, e)?.type !== "moon") {
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
		let t = new M.RenderTarget(1, 1, {
			depthBuffer: !1,
			format: M.RGBAFormat,
			generateMipmaps: !1,
			magFilter: M.LinearFilter,
			minFilter: M.LinearFilter,
			stencilBuffer: !1,
			type: M.UnsignedByteType
		});
		return t.texture.colorSpace = M.SRGBColorSpace, t.texture.generateMipmaps = !1, t.texture.name = `Starfield screen target ${e}`, t;
	}
	syncStarfieldGlint(e, t) {
		let n = this.#g;
		if (!n?.createGlints || Si(this.#m) !== "live-webgpu") {
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
		let a = n.createGlints(t), o = new M.Scene(), s = this.createStarfieldGlintTarget(e);
		a.setViewport(this.#_), a.setCoverageTexture(null), o.add(a.object), this.#C.set(e, {
			cameraQuaternion: new M.Quaternion(),
			dirty: !0,
			geometryKey: r,
			handle: a,
			hasCameraState: !1,
			projectionMatrix: new M.Matrix4(),
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
		li(this.#c.nodes, (t) => {
			if (t.type !== "starfield") return;
			e.add(t.id), this.syncStarfieldGlint(t.id, t.params);
			let n = this.#g?.createBakeKey(t.params, void 0, null, mo) ?? "";
			this.#y.get(t.id) !== n && this.scheduleStarfieldTextureBake(t.id, t.params);
		}), Array.from(this.#b.keys()).forEach((t) => {
			if (e.has(t)) return;
			let n = this.#b.get(t);
			n && vr(n), this.#b.delete(t), this.#y.delete(t);
		}), Array.from(this.#C.keys()).forEach((t) => {
			e.has(t) || this.disposeStarfieldGlint(t);
		}), Array.from(this.#v.entries()).forEach(([t, n]) => {
			e.has(t) || (clearTimeout(n), this.#v.delete(t));
		});
	}
	scheduleStarfieldTextureBake(e, t) {
		this.syncStarfieldGlint(e, t);
		let n = this.#g?.createBakeKey(t, void 0, null, mo) ?? "";
		if (this.#y.get(e) === n) return;
		let r = this.#v.get(e);
		r && clearTimeout(r);
		let i = setTimeout(() => {
			this.#v.delete(e);
			let t = wi(this.#c.nodes, e);
			if (t?.type !== "starfield") return;
			let r = this.#g?.createBakeKey(t.params, void 0, null, mo) ?? "";
			if (r !== n) {
				this.scheduleStarfieldTextureBake(e, t.params);
				return;
			}
			if (!this.#g && this.#h && (this.#g = k(this.#h)), !this.#g?.canBake()) return;
			let i = this.#g.bakeTexture(t.params, r, void 0, null, mo), a = this.#b.get(e);
			a && a !== i && vr(a), this.#b.set(e, i), this.#y.set(e, r), a ? this.refreshStarfieldTextureBindings() : (this.#l = null, this.setManifest(this.#c)), this.dispatchEvent({ type: "starfieldtexturechange" });
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
		this.material.userData.applyCompositionParams?.(this.#c), this.material.userData.applyLayerParams && li(this.#c.nodes, this.material.userData.applyLayerParams), this.material.userData.applyImageTextures?.(this.#o), this.material.userData.applyStarfieldTextures?.(this.#b), this.material.userData.applyStarfieldScreenTextures?.(this.#x), this.material.userData.applyCloudFieldTextures?.(this.#t), this.material.userData.applyMoonTextures?.(this.#f), this.material.userData.applyTime?.(this.#S), this.material.userData.applyEditorLayerState?.(this.#n), this.#a.forEach((e, t) => {
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
		let n = wi(this.#c.nodes, e);
		return n?.type === "image" && (n.params = {
			...n.params,
			placement: t
		}), this.#a.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this.#c = Pe(this.#c), li(this.#c.nodes, (e) => {
			e.type === "clouds" && this.#s.applyLayerParams(e);
		}), this;
	}
	updateLayerComposition(e, t) {
		let n = wi(this.#c.nodes, e);
		return n ? (t.blendMode !== void 0 && (n.blendMode = t.blendMode), t.opacity !== void 0 && (n.opacity = t.opacity), this.material.userData.applyLayerComposition?.(n), this) : this;
	}
	updateLayer(e, t) {
		let n = wi(this.#c.nodes, e);
		if (!n || n.type === "group") return this;
		n.params = t, this.#c = Pe(this.#c);
		let r = wi(this.#c.nodes, e);
		return !r || r.type === "group" ? this : (ft(this.#c, this.#t) && this.material.userData.applyCloudFieldTextures?.(this.#t), A(r.type)?.updateLive?.(this.#s, r), (r.type === "image" || r.type === "spot") && li(this.#c.nodes, (e) => {
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
		let t = G(e);
		this.#c = t, this.applyGeometry(this.#c.geometry ?? this.#i), ft(this.#c, this.#t), this.syncStarfieldTextures(), this.syncMoonTextures();
		let n = Si(this.#m), r = Ci(this.#c, n, this.#r);
		if (this.#l === r && n === "live-webgpu") return this.applyLiveManifestUniformUpdates(), this;
		if (n === "live-webgpu") this.replaceMaterial(mi(this.#c, this.#n, this.#o, this.#b, this.#x, /* @__PURE__ */ new Map(), this.#t, this.#f, this.#r));
		else {
			let e = bi(this.#c, this.#e);
			this.replaceMaterial(xi(e), e);
		}
		return this.#l = r, this.material.userData.applyTime?.(this.#S), this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(xi(e)), this.#l = null, this;
	}
	invalidateBakeCache() {
		return Pr(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture(), pt(this.#t), this.disposeMoonTextures(), this.disposeStarfieldTextures(), this.disposeStarfieldGlints();
	}
};
//#endregion
//#region src/baking/skybox-gpu-bake.ts
function yo(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function bo(e) {
	return e.some((e) => e.enabled && (e.type === "moon" || e.type === "group" && bo(e.children)));
}
function xo(e, t, n, r) {
	let i = new M.RenderTarget(e, t, {
		depthBuffer: !1,
		format: M.RGBAFormat,
		generateMipmaps: !1,
		magFilter: M.LinearFilter,
		minFilter: M.LinearFilter,
		stencilBuffer: !1,
		type: n ? r ? M.FloatType : M.HalfFloatType : M.UnsignedByteType,
		wrapS: M.RepeatWrapping,
		wrapT: M.ClampToEdgeWrapping
	});
	return i.texture.name = "GPU baked skybox composition", i.texture.colorSpace = n ? M.LinearSRGBColorSpace : M.SRGBColorSpace, i.texture.generateMipmaps = !1, i;
}
var So = class {
	#e;
	#t = new M.Scene();
	#n = new M.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#r = new M.PlaneGeometry(2, 2);
	#i;
	constructor(e) {
		this.#e = e, this.#i = po(e);
	}
	canBake() {
		return yo(this.#e);
	}
	async prepareMoonTextures(e, t) {
		let n = G(e);
		if (!bo(n.nodes)) return /* @__PURE__ */ new Map();
		if (!this.#i) throw Error("Moon layers require WebGPU compute support for GPU export.");
		return this.#i.bakeManifest(n.nodes, {
			height: Math.max(1, Math.floor(t)),
			kind: "equirect"
		});
	}
	bakeRenderTarget(e, t) {
		let n = Math.max(1, Math.floor(t.width)), r = Math.max(1, Math.floor(t.height)), i = G(e);
		if (bo(i.nodes) && !t.moonTextures) throw Error("Moon textures are not prepared. Await prepareMoonTextures() before bakeRenderTarget().");
		let a = t.cloudFieldTextures ? null : /* @__PURE__ */ new Map(), o = t.cloudFieldTextures ?? a ?? /* @__PURE__ */ new Map();
		a && ft(i, a);
		let s = _i(i, t.imageTextures ?? /* @__PURE__ */ new Map(), t.starfieldTextures ?? /* @__PURE__ */ new Map(), o, t.moonTextures ?? /* @__PURE__ */ new Map(), { flipY: t.flipY }), c = xo(n, r, !!t.hdr, !!t.float), l = new M.Mesh(this.#r, s);
		l.frustumCulled = !1;
		let u = this.#e.getRenderTarget(), d = this.#e.autoClear, f = new M.Color(), p = this.#e.getClearAlpha();
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
				s.dispose(), c.dispose(), a && pt(a);
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
function Co(e) {
	return yo(e) ? new So(e) : null;
}
//#endregion
//#region src/loader/loader.ts
var wo = class extends Error {
	constructor(e, t) {
		super(e), this.name = "LoaderAssetError", this.entry = t.entry ?? null, this.event = t.event, this.id = t.id, this.phase = t.phase, this.src = t.src;
	}
}, To = class {
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
			let e = this.#o.size === 0, n = new wo(e ? `No manifest loaded. Cannot resolve id: "${t}"` : `Manifest loaded but id not found: "${t}". Available ids: ${[...this.#o.keys()].join(", ")}`, {
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
		if (!this.#u(e)) throw new wo("Invalid manifest entry.", { phase: "manifest-parse-error" });
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
		if (!r) throw new wo(`No loader registered for type: ${e}`, {
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
function Eo(e) {
	return e.colorSpace = M.SRGBColorSpace, e.wrapS = M.ClampToEdgeWrapping, e.wrapT = M.ClampToEdgeWrapping, e.flipY = !1, e.minFilter = M.LinearMipmapLinearFilter, e.magFilter = M.LinearFilter, e.generateMipmaps = !0, e.needsUpdate = !0, e;
}
var Do = class {
	static {
		this.type = "texture";
	}
	#e = new M.TextureLoader();
	async load(e, t) {
		let n = Array.isArray(e) ? e : [e], r = null;
		for (let e of n) try {
			return Eo(await this.#e.loadAsync(e));
		} catch (n) {
			r = new wo(`Failed to load texture: ${e}`, {
				entry: t,
				event: n,
				phase: "network-error",
				src: e
			});
		}
		throw r ?? new wo(`No texture sources for entry ${t?.id ?? "?"}`, {
			entry: t,
			phase: "network-error",
			src: e
		});
	}
}, Oo = "manifest.json";
function ko(e) {
	let t = [], n = (e) => {
		for (let r of e) r.type === "group" ? n(r.children) : r.type === "image" && t.push(r);
	};
	return n(e.nodes), t;
}
function Ao(e) {
	switch (e.slice(e.lastIndexOf(".") + 1).toLowerCase()) {
		case "jpg":
		case "jpeg": return "image/jpeg";
		case "webp": return "image/webp";
		default: return "image/png";
	}
}
function jo(e, t) {
	let n = e.slice();
	return URL.createObjectURL(new Blob([n], { type: t }));
}
async function Mo(e) {
	if (typeof e == "string") {
		let t = await fetch(e);
		if (!t.ok) throw Error(`Could not fetch zip bundle (${t.status} ${t.statusText}).`);
		return new Uint8Array(await t.arrayBuffer());
	}
	return e instanceof Uint8Array ? e : e instanceof ArrayBuffer ? new Uint8Array(e) : new Uint8Array(await e.arrayBuffer());
}
async function No(e) {
	let t = e.slice(), n = new Blob([t]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
	return new Uint8Array(await new Response(n).arrayBuffer());
}
var Po = 101010256, Fo = 33639248, Io = 67324752, Lo = 22, Ro = 65535;
function zo(e) {
	let t = Math.max(0, e.byteLength - Lo - Ro);
	for (let n = e.byteLength - Lo; n >= t; --n) if (e.getUint32(n, !0) === Po) return n;
	return -1;
}
async function Bo(e) {
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = zo(t);
	if (n < 0) throw Error("Invalid zip bundle: end-of-central-directory record not found.");
	let r = t.getUint16(n + 10, !0), i = t.getUint32(n + 16, !0), a = new TextDecoder(), o = [];
	for (let n = 0; n < r; n += 1) {
		if (t.getUint32(i, !0) !== Fo) throw Error("Invalid zip bundle: malformed central directory.");
		let n = t.getUint16(i + 10, !0), r = t.getUint32(i + 20, !0), s = t.getUint16(i + 28, !0), c = t.getUint16(i + 30, !0), l = t.getUint16(i + 32, !0), u = t.getUint32(i + 42, !0), d = a.decode(e.subarray(i + 46, i + 46 + s));
		if (t.getUint32(u, !0) !== Io) throw Error(`Invalid zip bundle: bad local header for "${d}".`);
		let f = t.getUint16(u + 26, !0), p = t.getUint16(u + 28, !0), m = u + 30 + f + p, h = e.subarray(m, m + r);
		if (n === 0) o.push(Promise.resolve([d, h]));
		else if (n === 8) o.push(No(h).then((e) => [d, e]));
		else throw Error(`Unsupported zip compression method ${n} for "${d}".`);
		i += 46 + s + c + l;
	}
	return Object.fromEntries(await Promise.all(o));
}
async function Vo(e, t = {}) {
	let n = t.toAssetUrl ?? jo, r = await Bo(await Mo(e)), i = r[Oo];
	if (!i) throw Error(`Zip bundle is missing ${Oo}.`);
	let a = JSON.parse(new TextDecoder().decode(i)), o = G(a), s = a.assets ?? {}, c = /* @__PURE__ */ new Map(), l = [];
	for (let [e, t] of Object.entries(r)) {
		if (e === Oo) continue;
		let r = n(t, s[e]?.mimeType ?? Ao(e), e);
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
async function Ho(e) {
	let t = await fetch(new URL(Oo, e).href);
	if (!t.ok) throw Error(`Could not load ${Oo} (${t.status}).`);
	return {
		manifest: G(await t.json()),
		resolveAssetUrl: (t) => new URL(t, e).href,
		dispose: () => {}
	};
}
async function Uo(e, t) {
	let n = t.split("/").filter(Boolean), r = e;
	for (let e = 0; e < n.length - 1; e += 1) r = await r.getDirectoryHandle(n[e]);
	let i = await r.getFileHandle(n[n.length - 1]);
	return URL.createObjectURL(await i.getFile());
}
async function Wo(e) {
	let t = await (await e.getFileHandle(Oo)).getFile(), n = G(JSON.parse(await t.text())), r = /* @__PURE__ */ new Map();
	for (let t of ko(n)) t.params.src && r.set(t.params.src, await Uo(e, t.params.src));
	return {
		manifest: n,
		resolveAssetUrl: (e) => r.get(e) ?? e,
		dispose: () => {
			for (let e of r.values()) typeof URL < "u" && URL.revokeObjectURL && URL.revokeObjectURL(e);
			r.clear();
		}
	};
}
async function Go(e) {
	let t = structuredClone(e.manifest);
	for (let n of ko(t)) {
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
function Ko() {
	let e = new To();
	return e.register(Do.type, Do), e;
}
async function qo(e, t = {}) {
	let n = t.loader ?? Ko(), r = ko(e.manifest).filter((e) => e.enabled && e.params.src), i = r.map((t) => ({
		id: t.id,
		src: e.resolveAssetUrl(t.params.src),
		type: Do.type
	})), a = t.onProgress ? n.onProgress(t.onProgress) : null;
	try {
		await n.load(i);
	} finally {
		a?.();
	}
	let o = /* @__PURE__ */ new Map();
	return await Promise.all(r.map(async (e) => {
		try {
			o.set(e.id, await n.loadAsset(Do.type, e.id));
		} catch {}
	})), o;
}
function Jo(e) {
	return typeof e == "object" && !!e && "manifest" in e && typeof e.resolveAssetUrl == "function";
}
async function Yo(e, t = {}) {
	let { onProgress: n, ...r } = t, i = !Jo(e), a = Jo(e) ? e : await Vo(e, r), o = Ko(), s = await qo(a, {
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
export { Or as DEFAULT_BAKE_WIDTH, to as DEFAULT_MOON_SPRITE_ANGULAR_SIZE, ot as DEFAULT_SKYBOX_CLOUDS_PARAMS, Un as DEFAULT_SPOT_BASE_ANGULAR_RADIUS, st as FULL_MOON_SKYBOX_CLOUDS_PARAMS, Jt as IMAGE_PLACEMENT_ELEVATION_LIMIT, To as Loader, wo as LoaderAssetError, eo as MOON_RESOLUTION_MAX, $a as MOON_RESOLUTION_MIN, no as MOON_STYLE_EXPOSURE, fo as MoonGpuBakeService, vo as Skybox, So as SkyboxGpuBakeService, Do as TextureLoaderExtension, zr as bakeSkyboxImageData, c as blendChannel, D as clamp, ct as cloneSkyboxCloudsParams, io as cloneSkyboxMoonParams, ko as collectImageLayers, s as compositeBlendChannel, b as compositeOver, Eo as configureSkyboxImageTexture, cn as createAngularDecalPlacement, Nr as createBakeCacheKey, bi as createBakedSkyboxTexture, lt as createDefaultSkyboxCloudsParams, ro as createDefaultSkyboxMoonParams, Kn as createDefaultSpotParams, sn as createImagePlacementTangents, lo as createMoonBakeKey, po as createMoonGpuBakeService, Ie as createSkyboxGeometry, Co as createSkyboxGpuBakeService, Re as createSkyboxWireGeometry, un as directionFromPosition, Dr as evaluateSkyboxDirection, A as getLayerRuntimeAdapter, E as getLayerRuntimeAdapters, Pr as invalidateBakeCache, O as isRegisteredLayerType, x as linearChannelToSrgb, m as linearRgbToSrgbBytes, Wo as loadBundleFromDirectory, Ho as loadBundleFromUrl, Vo as loadBundleFromZip, Yo as loadSkyboxBundle, qo as loadSkyboxImageTextures, G as migrateManifestToV2, Y as normalizeImagePlacement, ao as normalizeSkyboxMoonParams, qn as normalizeSpotParams, J as normalizeVector, e as parseHexColor, dn as placementFromPosition, hn as placementFromRotation, pn as placementFromScale, ln as positionFromPlacement, Jn as positionFromSpot, gn as projectDirectionToImageUv, Xn as radiusScaleFromSpot, w as registerLayerRuntimeAdapter, Go as rehydrateImagePixels, Mr as resolveBakeOptions, Pe as resolveCloudLightReferences, co as resolveMoonBakeResolution, mn as rotationFromPlacement, fn as scaleFromPlacement, Qn as spotContainsDirection, Yn as spotFromPosition, Zn as spotFromRadiusScale, C as srgbChannelToLinear };
