import { B as e, C as t, E as n, P as r, S as i, T as a, Y as o, Z as s, _ as c, a as l, b as u, c as d, d as f, f as p, g as m, h, i as g, l as _, m as v, n as y, o as b, p as x, r as S, s as C, u as w, v as T, w as E, x as D, y as O } from "./starfield-bake-registry-BWrHxpvc.js";
import * as k from "three";
import { MeshBasicNodeMaterial as A } from "three/webgpu";
import { Fn as j, If as M, Loop as ee, PI as N, acos as te, attribute as P, cameraProjectionMatrix as ne, cameraViewMatrix as re, clamp as F, cos as ie, dot as ae, exp as I, float as L, floor as oe, int as se, length as ce, max as R, min as le, mix as z, mod as ue, modelWorldMatrix as de, mx_fractal_noise_float as fe, normalize as pe, positionGeometry as me, pow as B, screenSize as he, screenUV as ge, select as V, sin as _e, smoothstep as H, step as U, texture as ve, uniform as ye, uniformArray as be, uniformTexture as xe, uv as Se, varyingProperty as W, vec2 as G, vec3 as K, vec4 as q } from "three/tsl";
//#region src/baking/starfield-gpu-bake.ts
Math.PI * 2;
var Ce = 8, J = _ / 2, we = 1.75, Te = 3.25, Y = 1, Ee = 1.5, De = 8, Oe = .1, ke = 5, Ae = 12, je = .35, Me = .25;
function Ne(e, t) {
	return e && e.renderHeight > 0 && e.verticalFovRadians > 0 ? {
		displayPixelAngle: 2 * Math.tan(e.verticalFovRadians / 2) / e.renderHeight,
		screenPixelScale: 1
	} : {
		displayPixelAngle: Math.PI / J,
		screenPixelScale: t / J
	};
}
var Pe = new Float32Array([
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
function Fe(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function Ie(e) {
	let t = e.backend, n = t?.device, r = t?.gl;
	return typeof n?.limits?.maxTextureDimension2D == "number" ? n.limits.maxTextureDimension2D : r ? Number(r.getParameter(r.MAX_TEXTURE_SIZE)) : _;
}
function X(e, t) {
	let n = e[t];
	if (n?.isUniformNode) return n;
	let r = ye(Number(n?.value ?? 0));
	return e[t] = r, r;
}
function Z(e, t) {
	let n = e[t], r = n?.value instanceof k.Vector2 ? n.value.clone() : new k.Vector2();
	if (n?.isUniformNode) return n;
	let i = ye(r);
	return e[t] = i, i;
}
function Le(e, t) {
	let n = e[t], r = n?.value instanceof k.Vector3 ? n.value.clone() : new k.Vector3();
	if (n?.isUniformNode) return n;
	let i = ye(r);
	return e[t] = i, i;
}
function Re(e) {
	let t = e.x.sub(.5).mul(N).mul(2), n = e.y.mul(N), r = _e(n);
	return pe(K(r.mul(_e(t)), ie(n), r.mul(ie(t))));
}
function ze(e) {
	let t = ue(e.y, 2), n = U(1, t);
	return G(e.x.add(n.mul(.5)), z(t, L(2).sub(t), n));
}
function Be(e) {
	return Re(ze(e));
}
function Ve(e, t) {
	return N.mul(R(t.y, 1e-6)).div(R(e.y, 1));
}
function He(e, t) {
	return R(R(e.negate(), e.sub(t)), 0);
}
function Ue(e, t, n) {
	let r = e.sub(t), i = r.add(1), a = r.sub(1), o = He(r, n), s = He(i, n), c = He(a, n);
	return V(s.lessThan(o).and(s.lessThanEqual(c)), i, V(c.lessThan(o).and(c.lessThan(s)), a, r));
}
function We(e, t, n) {
	return G(Ue(e.x, t.x, n.x).div(n.x), e.y.sub(t.y).div(n.y));
}
function Ge(e) {
	return U(0, e.x).mul(U(e.x, 1)).mul(U(0, e.y)).mul(U(e.y, 1));
}
function Ke(e) {
	let t = K(1, .55, .3), n = K(1, .96, .92), r = K(.7, .8, 1);
	return V(e.lessThan(.5), z(t, n, e.mul(2)), z(n, r, e.sub(.5).mul(2)));
}
function qe(e, t, n) {
	let r = B(F(e, 0, 1), ke), i = z(1, B(F(t, 0, 1), Ae), n);
	return r.mul(i);
}
function Je(e, t, n, r) {
	return z(1, z(Oe, 1, qe(e, t, n)), r);
}
function Q(e, t, n, r) {
	let i = F(t, 1, 8), a = R(n, .001), o = F(r, .001, .999), s = K(e).toVar(), c = L(.5).toVar(), l = L(0).toVar(), u = L(0).toVar();
	return ee(8, ({ i: e }) => {
		M(L(e).lessThan(i), () => {
			let e = fe(s, se(1), a, o).mul(.5).add(.5);
			l.addAssign(c.mul(e)), u.addAssign(c), s.mulAssign(a), c.mulAssign(o);
		});
	}), l.div(R(u, 1e-4));
}
function Ye(e, t) {
	let r = n(e.nebulaField), i = Array.from({ length: Ce }, (e, t) => {
		let n = r.anchors[t];
		return new k.Vector3(...n?.dir ?? [
			0,
			1,
			0
		]);
	}), a = Array.from({ length: Ce }, (e, t) => {
		let n = r.anchors[t];
		return new k.Vector3(...n?.color ?? [
			0,
			0,
			0
		]);
	}), o = e.nebula, s = {
		uAnchorCount: { value: Math.min(r.anchors.length, Ce) },
		uBaseScale: { value: o.uBaseScale },
		uBlend: { value: +(r.blend === "gaussian") },
		uCloudCore: { value: new k.Vector3(...o.uCloudCore) },
		uCloudHighlight: { value: new k.Vector3(...o.uCloudHighlight) },
		uCloudShadow: { value: new k.Vector3(...o.uCloudShadow) },
		uColorWarpAmp: { value: o.uColorWarpAmp },
		uColorWarpFreq: { value: o.uColorWarpFreq },
		uContrast: { value: o.uContrast },
		uCoverage: { value: o.uCoverage },
		uDensity: { value: o.uDensity },
		uLightFocus: { value: o.uLightFocus },
		uLightIntensity: { value: o.uLightIntensity },
		uLightLining: { value: o.uLightLining },
		uNebulaExposure: { value: o.uNebulaExposure },
		uNebulaStrength: { value: o.uNebulaStrength },
		uOctaves: { value: o.uOctaves },
		uOpacity: { value: o.uOpacity },
		uPower: { value: r.power },
		uSeed: { value: o.uSeed },
		uSigma: { value: r.sigma },
		uSoftness: { value: o.uSoftness },
		uTileUvMin: { value: new k.Vector2(t.storageUvMin.x, t.storageUvMin.y) },
		uTileUvSize: { value: new k.Vector2(t.storageUvSize.x, t.storageUvSize.y) }
	}, c = Z(s, "uTileUvMin"), l = Z(s, "uTileUvSize"), u = X(s, "uAnchorCount"), d = X(s, "uBlend"), f = X(s, "uPower"), p = X(s, "uSigma"), m = X(s, "uColorWarpAmp"), h = X(s, "uColorWarpFreq"), g = X(s, "uSeed"), _ = X(s, "uCoverage"), v = X(s, "uDensity"), y = X(s, "uSoftness"), b = X(s, "uContrast"), x = X(s, "uBaseScale"), S = X(s, "uOctaves"), C = X(s, "uOpacity"), w = X(s, "uLightFocus"), T = X(s, "uLightLining"), E = X(s, "uLightIntensity");
	X(s, "uNebulaExposure");
	let D = X(s, "uNebulaStrength"), O = Le(s, "uCloudShadow"), N = Le(s, "uCloudHighlight"), te = Le(s, "uCloudCore"), P = be(i, "vec3"), ne = be(a, "vec3"), re = new A({
		depthTest: !1,
		depthWrite: !1
	});
	return re.uniforms = s, re.colorNode = j(() => {
		let e = me.xy.mul(.5).add(.5), t = Be(c.add(e.mul(l))), n = F(S, 1, 8), r = t.mul(R(h, .001)).add(K(g, g.mul(.37), g.mul(-.21))), i = K(Q(r, n, 2.02, .52), Q(r.add(K(5.2, 1.3, 7.1)), n, 2.03, .5), Q(r.add(K(9.1, 8.4, 2.8)), n, 2.01, .51)).mul(2).sub(1), a = pe(t.add(i.mul(R(m, 0)))), o = K(0).toVar(), s = L(0).toVar();
		ee(Ce, ({ i: e }) => {
			M(L(e).lessThan(u), () => {
				let t = pe(P.element(e)), n = ne.element(e), r = L(1).sub(ae(a, t)), i = L(1).div(B(r.add(1e-4), R(f, 1e-4))), c = I(r.mul(r).negate().div(R(1e-4, L(2).mul(p).mul(p)))), l = V(d.lessThan(.5), i, c);
				o.addAssign(n.mul(l)), s.addAssign(l);
			});
		}), o.assign(o.div(R(s, 1e-4)));
		let k = K(g.mul(13.17), g.mul(-7.31), g.mul(5.19)), A = t.mul(R(x, .001)).add(k), j = K(Q(A, n, 2.02, .5), Q(A.add(K(5.2, 1.3, 2.8)), n, 2.02, .5), Q(A.add(K(2.1, 4.7, 9.2)), n, 2.02, .5)), re = F(Q(A.add(j.mul(3)), n, 2.02, .5), 0, 1), ie = B(F(H(_, _.add(R(y, .001)), re), 0, 1), R(b, .05)), oe = B(F(R(R(o.r, o.g), o.b).mul(R(E, 0)), 0, 1), R(w, .001)), se = B(R(z(z(O, o.mul(N).mul(R(E, 0)), oe), te, F(ie.mul(.4), 0, 1)).add(o.mul(oe).mul(ie.oneMinus()).mul(R(T, 0)).mul(R(E, 0))).mul(R(v, 0)), K(0)), K(.92)), ce = F(ie.mul(C), 0, 1);
		return q(R(K(.004, .005, .011).add(se.mul(ce).mul(R(D, 0))), K(0)), 1);
	})(), re;
}
function Xe(e, t, n) {
	let r = x(e.stars, t, n, { includeSeamCopies: !0 }), i = [], a = [], o = [], s = [], c = [];
	r.forEach((e) => {
		i.push(e.x, e.y, e.z), a.push(e.u, e.v), o.push(e.rSize, e.rBright, e.rGlare, e.rColor), s.push(e.rSizeGate), c.push(e.classId);
	});
	let l = new k.InstancedBufferGeometry();
	return l.setAttribute("position", new k.BufferAttribute(Pe, 3)), l.setAttribute("iDirection", new k.InstancedBufferAttribute(new Float32Array(i), 3)), l.setAttribute("iUv", new k.InstancedBufferAttribute(new Float32Array(a), 2)), l.setAttribute("iRandoms", new k.InstancedBufferAttribute(new Float32Array(o), 4)), l.setAttribute("iSizeGate", new k.InstancedBufferAttribute(new Float32Array(s), 1)), l.setAttribute("iClass", new k.InstancedBufferAttribute(new Float32Array(c), 1)), l.instanceCount = c.length, l;
}
function Ze(e, t, n = {}) {
	let r = e.stars, i = n.bakeWidth ?? t.storageSize.width, a = n.bakeHeight ?? t.storageSize.height, o = {
		uBakeSize: { value: new k.Vector2(i, a) },
		uBright: { value: r.uBright },
		uBrightVar: { value: r.uBrightVar },
		uColorVar: { value: r.uColorVar },
		uGlareSize: { value: r.uGlareSize },
		uGlareStr: { value: r.uGlareStr },
		uGlareVar: { value: r.uGlareVar },
		uLargeStarRarity: { value: r.uLargeStarRarity },
		uOutputSize: { value: new k.Vector2(t.storageSize.width, t.storageSize.height) },
		uDisplayPixelAngle: { value: n.displayPixelAngle ?? Math.PI / J },
		uScreenPixelScale: { value: n.screenPixelScale ?? 1 },
		uSizeVar: { value: r.uSizeVar },
		uStarSize: { value: r.uStarSize },
		uTileUvMin: { value: new k.Vector2(t.storageUvMin.x, t.storageUvMin.y) },
		uTileUvSize: { value: new k.Vector2(t.storageUvSize.x, t.storageUvSize.y) }
	}, s = Z(o, "uBakeSize"), c = Z(o, "uTileUvMin"), l = Z(o, "uTileUvSize"), u = X(o, "uDisplayPixelAngle"), d = X(o, "uScreenPixelScale"), f = X(o, "uStarSize"), p = X(o, "uSizeVar"), m = X(o, "uLargeStarRarity"), h = X(o, "uBright"), g = X(o, "uBrightVar"), _ = X(o, "uGlareSize"), v = X(o, "uGlareStr"), y = X(o, "uGlareVar"), b = X(o, "uColorVar"), x = W("vec2", "vStarBakeUv"), S = W("vec3", "vStarBakeDirection"), C = W("vec4", "vStarBakeRandoms"), w = W("float", "vStarBakeSizeGate"), T = new A({
		blending: k.AdditiveBlending,
		depthTest: !1,
		depthWrite: !1,
		transparent: !0
	});
	return T.uniforms = o, T.vertexNode = j(() => {
		let e = P("iDirection", "vec3"), t = P("iUv", "vec2"), n = P("iRandoms", "vec4"), r = P("iSizeGate", "float"), i = Ve(s, l), a = Je(n.x, r, m, p), o = f.mul(a).mul(u), h = H(Y, Ee, f.mul(a).mul(d)).oneMinus(), g = R(R(o, z(L(we).mul(u), u.mul(.5), h)).mul(.45), u.mul(.5)), y = _.mul(z(1, a, p)).mul(u), b = R(R(g, R(R(o.add(y), L(Te).mul(u)).mul(.36), u.mul(.5)).mul(U(1e-6, _)).mul(U(1e-6, v))), i).mul(De), T = R(_e(t.y.mul(N)), .015), E = G(le(1.5, b.div(N.mul(2).mul(T))), b.div(N)), D = t.add(me.xy.mul(E)), O = D.sub(c).div(l);
		return x.assign(D), S.assign(e), C.assign(n), w.assign(r), q(O.mul(2).sub(1), 0, 1);
	})(), T.colorNode = j(() => {
		let e = te(F(ae(Be(x), pe(S)), -1, 1)), t = qe(C.x, w, m), n = Je(C.x, w, m, p), r = f.mul(n).mul(u), i = f.mul(n).mul(d), a = H(Y * .75, Y, i).oneMinus(), o = H(Ee, 1.75, i), s = R(r, u.mul(.1)), c = z(1, R(.08, H(0, Y, i)), a), l = R(s.mul(.45), u.mul(.5)), T = I(e.mul(e).negate().div(R(l.mul(l).mul(2), 1e-10))).mul(c), E = _.mul(z(1, n, p)).mul(u), D = R(R(r.add(E), u.mul(.1)).mul(.36), u.mul(.5)), O = I(e.mul(e).negate().div(R(D.mul(D).mul(2), 1e-10))).mul(o).mul(U(1e-6, _)).mul(U(1e-6, v)), k = z(C.y, R(C.y, t), p.mul(je)), A = z(C.z, R(C.z, t), p.mul(Me)), j = v.mul(z(1, B(A, 8), y)), M = h.mul(z(1, B(k, 3).mul(3), g));
		return q(Ke(z(.5, C.w, b)).mul(T.add(O.mul(j))).mul(M), 1);
	})(), T;
}
function Qe(e) {
	let t = e.stars;
	return JSON.stringify({
		density: t.uDensity,
		largeStarRarity: t.uLargeStarRarity,
		seed: t.uSeed,
		clip: e.clip
	});
}
function $e(e) {
	let t = c(e.clip), n = p(e.stars, t, J, { includeSeamCopies: !1 }), r = [], i = [], o = [];
	n.forEach((t) => {
		a([
			t.x,
			t.y,
			t.z
		], e.clip) && (r.push(t.x, t.y, t.z), i.push(t.rSize, t.rBright, t.rGlare, t.rColor), o.push(t.rSizeGate));
	});
	let s = new k.InstancedBufferGeometry();
	return s.setAttribute("position", new k.BufferAttribute(Pe, 3)), s.setAttribute("iDirection", new k.InstancedBufferAttribute(new Float32Array(r), 3)), s.setAttribute("iRandoms", new k.InstancedBufferAttribute(new Float32Array(i), 4)), s.setAttribute("iSizeGate", new k.InstancedBufferAttribute(new Float32Array(o), 1)), s.instanceCount = o.length, s.boundingSphere = new k.Sphere(new k.Vector3(0, 0, 0), Infinity), s;
}
function et(e) {
	let t = e.stars;
	return {
		uBright: t.uBright,
		uBrightVar: t.uBrightVar,
		uColorVar: t.uColorVar,
		uGlareSize: t.uGlareSize,
		uGlareStr: t.uGlareStr,
		uGlareVar: t.uGlareVar,
		uLargeStarRarity: t.uLargeStarRarity,
		uSizeVar: t.uSizeVar,
		uStarSize: t.uStarSize
	};
}
function tt(e) {
	let t = et(e), n = {
		uBright: { value: t.uBright },
		uBrightVar: { value: t.uBrightVar },
		uColorVar: { value: t.uColorVar },
		uGlareSize: { value: t.uGlareSize },
		uGlareStr: { value: t.uGlareStr },
		uGlareVar: { value: t.uGlareVar },
		uCoverageEnabled: { value: 0 },
		uCoverageTexture: { value: dt() },
		uLargeStarRarity: { value: t.uLargeStarRarity },
		uRenderHeight: { value: J },
		uSizeVar: { value: t.uSizeVar },
		uStarSize: { value: t.uStarSize }
	}, r = X(n, "uCoverageEnabled"), i = xe(dt());
	n.uCoverageTexture = i;
	let a = X(n, "uStarSize"), o = X(n, "uSizeVar"), s = X(n, "uLargeStarRarity"), c = X(n, "uBright"), l = X(n, "uBrightVar"), u = X(n, "uGlareSize"), d = X(n, "uGlareStr"), f = X(n, "uGlareVar"), p = X(n, "uColorVar"), m = X(n, "uRenderHeight"), h = W("vec2", "vStarGlintLocalPx"), g = W("vec4", "vStarGlintRandoms"), _ = W("float", "vStarGlintSizeGate"), v = new A({
		blending: k.AdditiveBlending,
		depthTest: !1,
		depthWrite: !1,
		toneMapped: !1,
		transparent: !0
	});
	return v.uniforms = n, v.vertexNode = j(() => {
		let e = P("iDirection", "vec3"), t = P("iRandoms", "vec4"), n = P("iSizeGate", "float"), r = Je(t.x, n, s, o), i = a.mul(r), c = H(Y, Ee, i).oneMinus(), l = R(R(i, z(L(we), L(.5), c)).mul(.45), L(.5)), f = u.mul(z(1, r, o)), p = R(R(l, R(R(i.add(f), L(Te)).mul(.36), L(.5)).mul(U(1e-6, u)).mul(U(1e-6, d))), L(.5)).mul(De), v = me.xy, y = he, b = de.mul(q(pe(e), 0)).xyz, x = re.mul(q(b, 0)).xyz, S = ne.mul(q(x, 1)), C = y.y.div(R(m, 1)), w = q(v.mul(p).mul(C).div(y.mul(.5)).mul(S.w), 0, 0);
		return h.assign(v.mul(p)), g.assign(t), _.assign(n), V(S.w.greaterThan(0), S.add(w), q(2, 2, 2, 1));
	})(), v.colorNode = j(() => {
		let e = ce(h), t = qe(g.x, _, s), n = Je(g.x, _, s, o), m = a.mul(n), v = H(Y * .75, Y, m).oneMinus(), y = H(Ee, 1.75, m), b = R(m, L(.1)), x = z(1, R(.08, H(0, Y, m)), v), S = R(b.mul(.45), L(.5)), C = I(e.mul(e).negate().div(R(S.mul(S).mul(2), 1e-10))).mul(x), w = u.mul(z(1, n, o)), T = R(R(m.add(w), L(.1)).mul(.36), L(.5)), E = I(e.mul(e).negate().div(R(T.mul(T).mul(2), 1e-10))).mul(y).mul(U(1e-6, u)).mul(U(1e-6, d)), D = z(g.y, R(g.y, t), o.mul(je)), O = z(g.z, R(g.z, t), o.mul(Me)), k = d.mul(z(1, B(O, 8), f)), A = c.mul(z(1, B(D, 3).mul(3), l)), j = Ke(z(.5, g.w, p)).mul(C.add(E.mul(k))).mul(A), M = ve(i, ge).r;
		return q(j.mul(z(1, M, r)), 1);
	})(), {
		material: v,
		uniforms: n
	};
}
function nt(e) {
	let t = T(e), n = $e(t), { material: r, uniforms: i } = tt(t), a = new k.Mesh(n, r);
	return a.name = "Starfield glints", a.frustumCulled = !1, a.renderOrder = 1, {
		object: a,
		setViewport: (e) => {
			i.uRenderHeight.value = e && e.renderHeight > 0 ? e.renderHeight : J;
		},
		setParams: (e) => {
			let t = et(T(e));
			Object.entries(t).forEach(([e, t]) => {
				i[e].value = t;
			});
		},
		setCoverageTexture: (e) => {
			i.uCoverageTexture.value = e ?? dt(), i.uCoverageEnabled.value = +!!e;
		},
		dispose: () => {
			n.dispose(), r.dispose();
		}
	};
}
function rt(e, t, n, r, i, a) {
	let o = {
		uExposure: { value: 1 },
		uSourcePerTarget: { value: a },
		uSourceSize: { value: new k.Vector2(t, n) },
		uSourceTexture: { value: e },
		uTargetSize: { value: new k.Vector2(r, i) }
	}, s = xe(e), c = Z(o, "uSourceSize"), l = Z(o, "uTargetSize"), u = X(o, "uSourcePerTarget"), d = X(o, "uExposure"), f = new A({
		depthTest: !1,
		depthWrite: !1
	});
	return f.uniforms = {
		...o,
		uSourceTexture: s
	}, f.colorNode = j(() => {
		let e = oe(Se().mul(l)), t = oe(u.add(.5)), n = q(0).toVar(), r = L(0).toVar();
		ee(8, ({ i }) => {
			ee(8, ({ i: a }) => {
				M(L(a).lessThan(t).and(L(i).lessThan(t)), () => {
					let t = e.mul(u).add(G(L(a), L(i))).add(.5);
					n.addAssign(ve(s, t.div(c))), r.addAssign(1);
				});
			});
		});
		let i = n.rgb.div(R(r, 1)), a = K(.004, .005, .011), o = K(1).sub(I(a.mul(d).negate())), f = R(K(1).sub(I(a.add(i).mul(d).negate())).sub(o), K(0));
		return q(f, F(R(R(f.r, f.g), f.b), 0, 1));
	})(), f;
}
function it(e, t, n, r) {
	let i = {
		uContentUvMin: { value: new k.Vector2(n.uvMin.x, n.uvMin.y) },
		uContentUvSize: { value: new k.Vector2(n.uvSize.x, n.uvSize.y) },
		uHasBottomNeighbor: { value: +!!n.hasBottomNeighbor },
		uHasLeftNeighbor: { value: +!!n.hasLeftNeighbor },
		uHasRightNeighbor: { value: +!!n.hasRightNeighbor },
		uHasTopNeighbor: { value: +!!n.hasTopNeighbor },
		uNebulaExposure: { value: r.nebula.uNebulaExposure },
		uNebulaTexture: { value: e },
		uStorageUvMin: { value: new k.Vector2(n.storageUvMin.x, n.storageUvMin.y) },
		uStorageUvSize: { value: new k.Vector2(n.storageUvSize.x, n.storageUvSize.y) },
		uStarTexture: { value: t }
	}, a = xe(e), o = xe(t), s = Z(i, "uContentUvMin"), c = Z(i, "uContentUvSize"), l = Z(i, "uStorageUvMin"), u = Z(i, "uStorageUvSize"), d = X(i, "uHasLeftNeighbor"), f = X(i, "uHasRightNeighbor"), p = X(i, "uHasTopNeighbor"), m = X(i, "uHasBottomNeighbor"), h = X(i, "uNebulaExposure"), g = new A({
		depthTest: !1,
		depthWrite: !1,
		transparent: !0
	}), _ = +(n.uvSize.x >= .999), v = .28;
	return g.blending = k.CustomBlending, g.blendEquation = k.AddEquation, g.blendSrc = k.OneFactor, g.blendDst = k.OneFactor, g.blendEquationAlpha = k.AddEquation, g.blendSrcAlpha = k.OneFactor, g.blendDstAlpha = k.OneMinusSrcAlphaFactor, i.uNebulaTexture = a, i.uStarTexture = o, g.uniforms = i, g.colorNode = j(() => {
		let e = me.xy.mul(.5).add(.5), t = G(e.x, L(1).sub(e.y)), n = R(L(1).sub(H(0, v, t.y)), L(1).sub(H(0, v, L(1).sub(t.y)))).mul(_), r = We(t, l, u), i = F(r, 0, 1), g = Ge(r), y = G(Ue(t.x, s.x, c.x).div(c.x), t.y.sub(s.y).div(c.y)), b = R(u.sub(c).div(c.mul(2)), G(0)), x = R(b, G(1e-6)), S = V(d.greaterThan(.5), H(x.x.negate(), x.x, y.x), 1), C = V(f.greaterThan(.5), L(1).sub(H(L(1).sub(x.x), L(1).add(x.x), y.x)), 1), w = V(b.x.lessThanEqual(0), 1, S.mul(C)), T = V(p.greaterThan(.5), H(x.y.negate(), x.y, y.y), 1), E = V(m.greaterThan(.5), L(1).sub(H(L(1).sub(x.y), L(1).add(x.y), y.y)), 1), D = V(b.y.lessThanEqual(0), 1, T.mul(E)), O = F(w.mul(D).mul(g), 0, 1), k = ve(a, i).rgb, A = K(0).toVar(), j = L(0).toVar();
		ee(32, ({ i: e }) => {
			let n = We(G(L(e).add(.5).div(32), t.y), l, u), r = F(n, 0, 1), i = Ge(n);
			A.addAssign(ve(a, r).rgb.mul(i)), j.addAssign(i);
		});
		let M = z(k, A.div(R(j, 1)), n), N = ve(o, i);
		return q(K(1).sub(I(M.mul(R(h, .001)).negate())).add(N.rgb), 1).mul(O);
	})(), g.name = `Starfield composite ${n.id}`, g;
}
function at(e) {
	return st(e).map(({ end: t, offset: n, skyV0: r, skyV1: i, start: a }) => {
		let o = (a + n - e.storageUvMin.x) / e.storageUvSize.x, s = (t + n - e.storageUvMin.x) / e.storageUvSize.x, c = (r - e.storageUvMin.y) / e.storageUvSize.y, l = (i - e.storageUvMin.y) / e.storageUvSize.y, u = a * 2 - 1, d = t * 2 - 1, f = 1 - r * 2, p = 1 - i * 2, m = new k.BufferGeometry();
		return m.setAttribute("position", new k.BufferAttribute(new Float32Array([
			u,
			p,
			0,
			d,
			p,
			0,
			u,
			f,
			0,
			d,
			p,
			0,
			d,
			f,
			0,
			u,
			f,
			0
		]), 3)), m.setAttribute("uv", new k.BufferAttribute(new Float32Array([
			o,
			l,
			s,
			l,
			o,
			c,
			s,
			l,
			s,
			c,
			o,
			c
		]), 2)), m;
	});
}
function ot(e, t) {
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
function st(e) {
	let t = e.hasLeftNeighbor ? e.storageUvMin.x : e.uvMin.x, n = e.hasRightNeighbor ? e.storageUvMin.x + e.storageUvSize.x : e.uvMin.x + e.uvSize.x, r = e.hasTopNeighbor ? e.storageUvMin.y : e.uvMin.y, i = e.hasBottomNeighbor ? e.storageUvMin.y + e.storageUvSize.y : e.uvMin.y + e.uvSize.y, a = Math.max(0, r), o = Math.min(1, i);
	return o <= a ? [] : ot(t, n - t).map((e) => ({
		...e,
		skyV0: a,
		skyV1: o
	}));
}
function $(e) {
	return e === "repeat" ? k.RepeatWrapping : k.ClampToEdgeWrapping;
}
function ct(e, t, n, r = {}) {
	let i = new k.RenderTarget(e, t, {
		depthBuffer: !1,
		format: k.RGBAFormat,
		generateMipmaps: !1,
		magFilter: k.LinearFilter,
		minFilter: k.LinearFilter,
		stencilBuffer: !1,
		type: r.type ?? k.UnsignedByteType,
		wrapS: r.wrapS ?? k.ClampToEdgeWrapping,
		wrapT: r.wrapT ?? k.ClampToEdgeWrapping
	});
	return i.texture.name = n, i.texture.colorSpace = r.colorSpace ?? k.SRGBColorSpace, i.texture.generateMipmaps = !1, i;
}
function lt(e) {
	e.dispose();
}
var ut = null;
function dt() {
	if (!ut) {
		let e = new k.DataTexture(new Uint8Array([
			255,
			255,
			255,
			255
		]), 1, 1, k.RGBAFormat);
		e.needsUpdate = !0, ut = e;
	}
	return ut;
}
var ft = null;
function pt() {
	if (!ft) {
		let e = new k.DataTexture(new Uint8Array([
			0,
			0,
			0,
			255
		]), 1, 1, k.RGBAFormat);
		e.colorSpace = k.SRGBColorSpace, e.needsUpdate = !0, ft = e;
	}
	return ft;
}
function mt(e) {
	return Math.max(1, Math.floor(e ?? 8192));
}
function ht(e, t) {
	return Math.max(1, Math.min(e, t));
}
var gt = class {
	#e = /* @__PURE__ */ new Map();
	#t = /* @__PURE__ */ new Map();
	#n;
	#r;
	#i = new k.Scene();
	#a = new k.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#o = new k.PlaneGeometry(2, 2);
	constructor(e) {
		this.#r = e, this.#n = Ie(e);
	}
	createBakeKey(e, t, n, r) {
		let i = T(e), a = m(i.quality), o = mt(t), s = v(i, o, Math.floor(o / 2), {
			budgetBytes: a.budgetBytes,
			maxTextureSize: this.#n,
			viewport: n
		});
		return r?.starsOmitted ? `nebula-only:${s}` : s;
	}
	previewWidthFor(e) {
		return Math.max(1, Math.min(_, this.#n));
	}
	bakeTexture(e, t, n, r, i) {
		return this.#c(e, t, n, r, i).texture;
	}
	createGlints(e) {
		return nt(e);
	}
	glintGeometryKey(e) {
		return Qe(T(e));
	}
	bakePatchTextures(e, t, n, r) {
		return this.#s(e, t, n, r);
	}
	async bakeImageData(e, t, n, r) {
		let i = this.#c(e, t, n, r), { height: a, width: o } = i.target, s = i.target, c = this.#r.readRenderTargetPixelsAsync ? await this.#r.readRenderTargetPixelsAsync(s, 0, 0, o, a) : null, l = new Uint8Array(o * a * 4);
		if (c) l.set(new Uint8Array(c.buffer, c.byteOffset, c.byteLength));
		else if (this.#r.readRenderTargetPixels) this.#r.readRenderTargetPixels(s, 0, 0, o, a, l);
		else throw Error("GPU Starfield bake readback is not available.");
		return {
			data: new Uint8ClampedArray(l.buffer),
			height: a,
			width: o
		};
	}
	canBake() {
		return Fe(this.#r);
	}
	dispose() {
		this.#e.forEach((e) => e.target.dispose()), this.#e.clear(), this.#t.forEach((e) => {
			e.targets.forEach((e) => e.dispose());
		}), this.#t.clear(), this.#o.dispose();
	}
	#s(e, t, n, r) {
		let i = T(e), a = m(i.quality), o = mt(n), s = Math.floor(o / 2), c = t ?? this.createBakeKey(i, o, r), l = this.#t.get(c);
		if (l) return l;
		let u = h({
			budgetBytes: a.budgetBytes,
			clip: i.clip,
			height: s,
			maxTextureSize: this.#n,
			width: o
		}), d = this.#r.getRenderTarget(), f = this.#r.autoClear, p = Object.assign(new k.Color(), { a: 1 }), g = this.#r.getClearAlpha(), _ = [], v = [];
		this.#r.getClearColor(p), this.#r.autoClear = !0, this.#r.setClearColor(0, 0), u.descriptors.forEach((e) => {
			let t = ct(e.storageSize.width, e.storageSize.height, `GPU baked starfield nebula ${e.id}`, {
				colorSpace: k.LinearSRGBColorSpace,
				type: k.HalfFloatType,
				wrapS: $(e.wrapS),
				wrapT: $(e.wrapT)
			}), n = ct(e.storageSize.width, e.storageSize.height, `GPU baked starfield stars ${e.id}`, {
				colorSpace: k.SRGBColorSpace,
				type: k.UnsignedByteType,
				wrapS: $(e.wrapS),
				wrapT: $(e.wrapT)
			});
			this.#l(Ye(i, e), t), this.#u(i, e, n, s, u.supersample, r ?? null), _.push(t, n), v.push({
				descriptor: e,
				nebulaTexture: t.texture,
				starTexture: n.texture
			});
		}), this.#r.setRenderTarget(d), this.#r.autoClear = f, this.#r.setClearColor(p, g);
		let y = {
			key: c,
			patches: v,
			targets: _
		};
		return this.#t.set(c, y), y;
	}
	#c(e, t, n, r, i) {
		let a = T(e), o = m(a.quality), s = mt(n), c = Math.floor(s / 2), l = ht(s, this.#n), u = Math.floor(l / 2), d = i?.starsOmitted ?? !1, f = t ?? this.createBakeKey(a, s, r, i), p = this.#e.get(f);
		if (p && p.target.width === l && p.target.height === u) return p;
		let g = ct(l, u, "GPU baked starfield layer", {
			colorSpace: k.SRGBColorSpace,
			type: k.UnsignedByteType,
			wrapS: k.RepeatWrapping,
			wrapT: k.ClampToEdgeWrapping
		}), _ = h({
			budgetBytes: o.budgetBytes,
			clip: a.clip,
			height: c,
			maxTextureSize: this.#n,
			width: s
		}), v = this.#r.getRenderTarget(), y = this.#r.autoClear, b = Object.assign(new k.Color(), { a: 1 }), x = this.#r.getClearAlpha();
		return this.#r.getClearColor(b), this.#r.autoClear = !0, this.#r.setClearColor(0, 0), this.#r.setRenderTarget(g), this.#r.clear(), _.descriptors.forEach((e) => {
			let t = ct(e.storageSize.width, e.storageSize.height, `GPU baked starfield nebula ${e.id}`, {
				colorSpace: k.LinearSRGBColorSpace,
				type: k.HalfFloatType,
				wrapS: $(e.wrapS),
				wrapT: $(e.wrapT)
			});
			if (this.#l(Ye(a, e), t), d) {
				this.#d(a, e, t.texture, pt(), g), t.dispose();
				return;
			}
			let n = ct(e.storageSize.width, e.storageSize.height, `GPU baked starfield stars ${e.id}`, {
				colorSpace: k.SRGBColorSpace,
				type: k.UnsignedByteType,
				wrapS: $(e.wrapS),
				wrapT: $(e.wrapT)
			});
			this.#u(a, e, n, c, _.supersample, r ?? null), this.#d(a, e, t.texture, n.texture, g), t.dispose(), n.dispose();
		}), this.#r.setRenderTarget(v), this.#r.autoClear = y, this.#r.setClearColor(b, x), g.texture.userData.starfieldRenderTarget = g, this.#e.get(f)?.target.dispose(), this.#e.set(f, {
			key: f,
			target: g,
			texture: g.texture
		}), {
			key: f,
			target: g,
			texture: g.texture
		};
	}
	#l(e, t) {
		let n = new k.Mesh(this.#o, e);
		n.frustumCulled = !1, this.#i.clear(), this.#i.add(n), this.#r.setRenderTarget(t), this.#r.clear(), this.#r.render(this.#i, this.#a), this.#i.remove(n), lt(e);
	}
	#u(e, t, n, r, i, a) {
		let o = Xe(e, t, r), s = Math.max(1, Math.floor(i)), c = t.storageSize.width * s, l = t.storageSize.height * s, u = c / t.storageSize.width, { displayPixelAngle: d, screenPixelScale: f } = Ne(a, r), p = Ze(e, t, {
			bakeHeight: l,
			bakeWidth: c,
			displayPixelAngle: d,
			screenPixelScale: f
		}), m = new k.Mesh(o, p), h = ct(c, l, `GPU baked starfield stars accumulation ${t.id}`, {
			colorSpace: k.LinearSRGBColorSpace,
			type: k.HalfFloatType,
			wrapS: k.ClampToEdgeWrapping
		});
		m.frustumCulled = !1, this.#i.clear(), this.#i.add(m), this.#r.setRenderTarget(h), this.#r.clear(), this.#r.render(this.#i, this.#a), this.#i.remove(m), o.dispose(), lt(p), this.#l(rt(h.texture, c, l, t.storageSize.width, t.storageSize.height, u), n), h.dispose();
	}
	#d(e, t, n, r, i) {
		let a = it(n, r, t, e), o = at(t);
		this.#i.clear(), o.forEach((e) => {
			let t = new k.Mesh(e, a);
			t.frustumCulled = !1, this.#i.add(t);
		});
		let s = this.#r.autoClear;
		try {
			this.#r.autoClear = !1, this.#r.setRenderTarget(i), this.#r.render(this.#i, this.#a);
		} finally {
			this.#r.autoClear = s;
		}
		this.#i.children.forEach((e) => {
			e instanceof k.Mesh && e.geometry.dispose();
		}), this.#i.clear(), lt(a);
	}
};
function _t(e) {
	return Fe(e) ? new gt(e) : null;
}
//#endregion
//#region src/starfield.ts
function vt(t, n, i, a = {}) {
	let o = a.starfieldBakes?.get(t);
	if (o) {
		let t = E(n), i = (t.u % 1 + 1) % 1 * o.width - .5, a = s(t.v, 0, 1) * o.height - .5, c = Math.floor(i), l = Math.floor(a), u = c + 1, d = l + 1, f = i - c, p = a - l;
		return r(r(e(o, c, l), e(o, u, l), f), r(e(o, c, d), e(o, u, d), f), p);
	}
	return D(n, i, { sampleHeight: a.sampleHeight });
}
y(_t), o({
	type: "starfield",
	sampleCpu: (e, t, n) => vt(n.layerId, e, t, {
		sampleHeight: n.sampleHeight,
		starfieldBakes: n.starfieldBakes
	})
});
//#endregion
export { S as DEFAULT_STARFIELD_CLIP, g as DEFAULT_STARFIELD_NEBULA, l as DEFAULT_STARFIELD_NEBULA_FIELD, b as DEFAULT_STARFIELD_PARAMS, C as DEFAULT_STARFIELD_QUALITY, d as DEFAULT_STARFIELD_STARS, _ as STARFIELD_PREVIEW_BAKE_WIDTH, w as STARFIELD_QUALITY_PRESETS, gt as StarfieldGpuBakeService, f as bakeStarfieldImageData, p as createStarCatalogForCoverage, x as createStarCatalogForDescriptor, v as createStarfieldBakeCacheKey, nt as createStarfieldGlints, _t as createStarfieldGpuBakeService, h as createStarfieldPatchLayout, m as getStarfieldQualityPreset, c as normalizeStarfieldCoverage, T as normalizeStarfieldParams, O as normalizeStarfieldQuality, u as qFromV, D as sampleStarfieldLayer, i as sourceDirectionFromUv, t as sourceFoldEquirectUv, E as sourceUvFromDirection, a as starfieldClipContainsDirection, n as starfieldFieldGradientToSourceField, Qe as starfieldGlintGeometryKey };
