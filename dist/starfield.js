import { B as e, C as t, E as n, P as r, S as i, T as a, Y as o, Z as s, _ as c, a as l, b as u, c as d, d as f, f as p, g as m, h, i as g, l as _, m as v, n as y, o as b, p as x, r as S, s as C, u as w, v as T, w as E, x as D, y as O } from "./starfield-bake-registry-QfLqfKWX.js";
import * as k from "three";
import { MeshBasicNodeMaterial as A } from "three/webgpu";
import { Fn as j, If as M, Loop as N, PI as P, acos as ee, attribute as F, clamp as I, cos as te, dot as ne, exp as L, float as R, floor as z, int as re, max as B, min as ie, mix as V, mod as ae, mx_fractal_noise_float as oe, normalize as se, positionGeometry as ce, pow as H, select as U, sin as le, smoothstep as W, step as G, texture as ue, uniform as de, uniformArray as fe, uniformTexture as pe, uv as me, varyingProperty as he, vec2 as K, vec3 as q, vec4 as J } from "three/tsl";
//#region starfield-gpu-bake.ts
Math.PI * 2;
var ge = 8, _e = _ / 2, ve = 1.75, ye = 3.25, be = 1, xe = 1.5, Se = 8, Ce = .1, we = 5, Te = 12, Ee = .35, De = .25, Oe = new Float32Array([
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
function ke(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function Ae(e) {
	let t = e.backend, n = t?.device, r = t?.gl;
	return typeof n?.limits?.maxTextureDimension2D == "number" ? n.limits.maxTextureDimension2D : r ? Number(r.getParameter(r.MAX_TEXTURE_SIZE)) : _;
}
function Y(e, t) {
	let n = e[t];
	if (n?.isUniformNode) return n;
	let r = de(Number(n?.value ?? 0));
	return e[t] = r, r;
}
function X(e, t) {
	let n = e[t], r = n?.value instanceof k.Vector2 ? n.value.clone() : new k.Vector2();
	if (n?.isUniformNode) return n;
	let i = de(r);
	return e[t] = i, i;
}
function je(e, t) {
	let n = e[t], r = n?.value instanceof k.Vector3 ? n.value.clone() : new k.Vector3();
	if (n?.isUniformNode) return n;
	let i = de(r);
	return e[t] = i, i;
}
function Me(e) {
	let t = e.x.sub(.5).mul(P).mul(2), n = e.y.mul(P), r = le(n);
	return se(q(r.mul(le(t)), te(n), r.mul(te(t))));
}
function Ne(e) {
	let t = ae(e.y, 2), n = G(1, t);
	return K(e.x.add(n.mul(.5)), V(t, R(2).sub(t), n));
}
function Pe(e) {
	return Me(Ne(e));
}
function Fe(e, t) {
	return P.mul(B(t.y, 1e-6)).div(B(e.y, 1));
}
function Ie(e, t) {
	return B(B(e.negate(), e.sub(t)), 0);
}
function Le(e, t, n) {
	let r = e.sub(t), i = r.add(1), a = r.sub(1), o = Ie(r, n), s = Ie(i, n), c = Ie(a, n);
	return U(s.lessThan(o).and(s.lessThanEqual(c)), i, U(c.lessThan(o).and(c.lessThan(s)), a, r));
}
function Re(e, t, n) {
	return K(Le(e.x, t.x, n.x).div(n.x), e.y.sub(t.y).div(n.y));
}
function ze(e) {
	return G(0, e.x).mul(G(e.x, 1)).mul(G(0, e.y)).mul(G(e.y, 1));
}
function Be(e) {
	let t = q(1, .55, .3), n = q(1, .96, .92), r = q(.7, .8, 1);
	return U(e.lessThan(.5), V(t, n, e.mul(2)), V(n, r, e.sub(.5).mul(2)));
}
function Ve(e, t, n) {
	let r = H(I(e, 0, 1), we), i = V(1, H(I(t, 0, 1), Te), n);
	return r.mul(i);
}
function He(e, t, n, r) {
	return V(1, V(Ce, 1, Ve(e, t, n)), r);
}
function Z(e, t, n, r) {
	let i = I(t, 1, 8), a = B(n, .001), o = I(r, .001, .999), s = q(e).toVar(), c = R(.5).toVar(), l = R(0).toVar(), u = R(0).toVar();
	return N(8, ({ i: e }) => {
		M(R(e).lessThan(i), () => {
			let e = oe(s, re(1), a, o).mul(.5).add(.5);
			l.addAssign(c.mul(e)), u.addAssign(c), s.mulAssign(a), c.mulAssign(o);
		});
	}), l.div(B(u, 1e-4));
}
function Ue(e, t) {
	let r = n(e.nebulaField), i = Array.from({ length: ge }, (e, t) => {
		let n = r.anchors[t];
		return new k.Vector3(...n?.dir ?? [
			0,
			1,
			0
		]);
	}), a = Array.from({ length: ge }, (e, t) => {
		let n = r.anchors[t];
		return new k.Vector3(...n?.color ?? [
			0,
			0,
			0
		]);
	}), o = e.nebula, s = {
		uAnchorCount: { value: Math.min(r.anchors.length, ge) },
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
	}, c = X(s, "uTileUvMin"), l = X(s, "uTileUvSize"), u = Y(s, "uAnchorCount"), d = Y(s, "uBlend"), f = Y(s, "uPower"), p = Y(s, "uSigma"), m = Y(s, "uColorWarpAmp"), h = Y(s, "uColorWarpFreq"), g = Y(s, "uSeed"), _ = Y(s, "uCoverage"), v = Y(s, "uDensity"), y = Y(s, "uSoftness"), b = Y(s, "uContrast"), x = Y(s, "uBaseScale"), S = Y(s, "uOctaves"), C = Y(s, "uOpacity"), w = Y(s, "uLightFocus"), T = Y(s, "uLightLining"), E = Y(s, "uLightIntensity");
	Y(s, "uNebulaExposure");
	let D = Y(s, "uNebulaStrength"), O = je(s, "uCloudShadow"), P = je(s, "uCloudHighlight"), ee = je(s, "uCloudCore"), F = fe(i, "vec3"), te = fe(a, "vec3"), z = new A({
		depthTest: !1,
		depthWrite: !1
	});
	return z.uniforms = s, z.colorNode = j(() => {
		let e = ce.xy.mul(.5).add(.5), t = Pe(c.add(e.mul(l))), n = I(S, 1, 8), r = t.mul(B(h, .001)).add(q(g, g.mul(.37), g.mul(-.21))), i = q(Z(r, n, 2.02, .52), Z(r.add(q(5.2, 1.3, 7.1)), n, 2.03, .5), Z(r.add(q(9.1, 8.4, 2.8)), n, 2.01, .51)).mul(2).sub(1), a = se(t.add(i.mul(B(m, 0)))), o = q(0).toVar(), s = R(0).toVar();
		N(ge, ({ i: e }) => {
			M(R(e).lessThan(u), () => {
				let t = se(F.element(e)), n = te.element(e), r = R(1).sub(ne(a, t)), i = R(1).div(H(r.add(1e-4), B(f, 1e-4))), c = L(r.mul(r).negate().div(B(1e-4, R(2).mul(p).mul(p)))), l = U(d.lessThan(.5), i, c);
				o.addAssign(n.mul(l)), s.addAssign(l);
			});
		}), o.assign(o.div(B(s, 1e-4)));
		let k = q(g.mul(13.17), g.mul(-7.31), g.mul(5.19)), A = t.mul(B(x, .001)).add(k), j = q(Z(A, n, 2.02, .5), Z(A.add(q(5.2, 1.3, 2.8)), n, 2.02, .5), Z(A.add(q(2.1, 4.7, 9.2)), n, 2.02, .5)), z = I(Z(A.add(j.mul(3)), n, 2.02, .5), 0, 1), re = H(I(W(_, _.add(B(y, .001)), z), 0, 1), B(b, .05)), ie = H(I(B(B(o.r, o.g), o.b).mul(B(E, 0)), 0, 1), B(w, .001)), ae = H(B(V(V(O, o.mul(P).mul(B(E, 0)), ie), ee, I(re.mul(.4), 0, 1)).add(o.mul(ie).mul(re.oneMinus()).mul(B(T, 0)).mul(B(E, 0))).mul(B(v, 0)), q(0)), q(.92)), oe = I(re.mul(C), 0, 1);
		return J(B(q(.004, .005, .011).add(ae.mul(oe).mul(B(D, 0))), q(0)), 1);
	})(), z;
}
function We(e, t, n) {
	let r = x(e.stars, t, n, { includeSeamCopies: !0 }), i = [], a = [], o = [], s = [], c = [];
	r.forEach((e) => {
		i.push(e.x, e.y, e.z), a.push(e.u, e.v), o.push(e.rSize, e.rBright, e.rGlare, e.rColor), s.push(e.rSizeGate), c.push(e.classId);
	});
	let l = new k.InstancedBufferGeometry();
	return l.setAttribute("position", new k.BufferAttribute(Oe, 3)), l.setAttribute("iDirection", new k.InstancedBufferAttribute(new Float32Array(i), 3)), l.setAttribute("iUv", new k.InstancedBufferAttribute(new Float32Array(a), 2)), l.setAttribute("iRandoms", new k.InstancedBufferAttribute(new Float32Array(o), 4)), l.setAttribute("iSizeGate", new k.InstancedBufferAttribute(new Float32Array(s), 1)), l.setAttribute("iClass", new k.InstancedBufferAttribute(new Float32Array(c), 1)), l.instanceCount = c.length, l;
}
function Ge(e, t, n = {}) {
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
		uDisplayPixelAngle: { value: n.displayPixelAngle ?? Math.PI / _e },
		uScreenPixelScale: { value: n.screenPixelScale ?? 1 },
		uSizeVar: { value: r.uSizeVar },
		uStarSize: { value: r.uStarSize },
		uTileUvMin: { value: new k.Vector2(t.storageUvMin.x, t.storageUvMin.y) },
		uTileUvSize: { value: new k.Vector2(t.storageUvSize.x, t.storageUvSize.y) }
	}, s = X(o, "uBakeSize"), c = X(o, "uTileUvMin"), l = X(o, "uTileUvSize"), u = Y(o, "uDisplayPixelAngle"), d = Y(o, "uScreenPixelScale"), f = Y(o, "uStarSize"), p = Y(o, "uSizeVar"), m = Y(o, "uLargeStarRarity"), h = Y(o, "uBright"), g = Y(o, "uBrightVar"), _ = Y(o, "uGlareSize"), v = Y(o, "uGlareStr"), y = Y(o, "uGlareVar"), b = Y(o, "uColorVar"), x = he("vec2", "vStarBakeUv"), S = he("vec3", "vStarBakeDirection"), C = he("vec4", "vStarBakeRandoms"), w = he("float", "vStarBakeSizeGate"), T = new A({
		blending: k.AdditiveBlending,
		depthTest: !1,
		depthWrite: !1,
		transparent: !0
	});
	return T.uniforms = o, T.vertexNode = j(() => {
		let e = F("iDirection", "vec3"), t = F("iUv", "vec2"), n = F("iRandoms", "vec4"), r = F("iSizeGate", "float"), i = Fe(s, l), a = He(n.x, r, m, p), o = f.mul(a).mul(u), h = W(be, xe, f.mul(a).mul(d)).oneMinus(), g = B(B(o, V(R(ve).mul(u), u.mul(.5), h)).mul(.45), u.mul(.5)), y = _.mul(V(1, a, p)).mul(u), b = B(B(g, B(B(o.add(y), R(ye).mul(u)).mul(.36), u.mul(.5)).mul(G(1e-6, _)).mul(G(1e-6, v))), i).mul(Se), T = B(le(t.y.mul(P)), .015), E = K(ie(1.5, b.div(P.mul(2).mul(T))), b.div(P)), D = t.add(ce.xy.mul(E)), O = D.sub(c).div(l);
		return x.assign(D), S.assign(e), C.assign(n), w.assign(r), J(O.mul(2).sub(1), 0, 1);
	})(), T.colorNode = j(() => {
		let e = ee(I(ne(Pe(x), se(S)), -1, 1)), t = Ve(C.x, w, m), n = He(C.x, w, m, p), r = f.mul(n).mul(u), i = f.mul(n).mul(d), a = W(be * .75, be, i).oneMinus(), o = W(xe, 1.75, i), s = B(r, u.mul(.1)), c = V(1, B(.08, W(0, be, i)), a), l = B(s.mul(.45), u.mul(.5)), T = L(e.mul(e).negate().div(B(l.mul(l).mul(2), 1e-10))).mul(c), E = _.mul(V(1, n, p)).mul(u), D = B(B(r.add(E), u.mul(.1)).mul(.36), u.mul(.5)), O = L(e.mul(e).negate().div(B(D.mul(D).mul(2), 1e-10))).mul(o).mul(G(1e-6, _)).mul(G(1e-6, v)), k = V(C.y, B(C.y, t), p.mul(Ee)), A = V(C.z, B(C.z, t), p.mul(De)), j = v.mul(V(1, H(A, 8), y)), M = h.mul(V(1, H(k, 3).mul(3), g));
		return J(Be(V(.5, C.w, b)).mul(T.add(O.mul(j))).mul(M), 1);
	})(), T;
}
function Ke(e, t, n, r, i, a) {
	let o = {
		uExposure: { value: 1 },
		uSourcePerTarget: { value: a },
		uSourceSize: { value: new k.Vector2(t, n) },
		uSourceTexture: { value: e },
		uTargetSize: { value: new k.Vector2(r, i) }
	}, s = pe(e), c = X(o, "uSourceSize"), l = X(o, "uTargetSize"), u = Y(o, "uSourcePerTarget"), d = Y(o, "uExposure"), f = new A({
		depthTest: !1,
		depthWrite: !1
	});
	return f.uniforms = {
		...o,
		uSourceTexture: s
	}, f.colorNode = j(() => {
		let e = z(me().mul(l)), t = z(u.add(.5)), n = J(0).toVar(), r = R(0).toVar();
		N(8, ({ i }) => {
			N(8, ({ i: a }) => {
				M(R(a).lessThan(t).and(R(i).lessThan(t)), () => {
					let t = e.mul(u).add(K(R(a), R(i))).add(.5);
					n.addAssign(ue(s, t.div(c))), r.addAssign(1);
				});
			});
		});
		let i = n.rgb.div(B(r, 1)), a = q(.004, .005, .011), o = q(1).sub(L(a.mul(d).negate())), f = B(q(1).sub(L(a.add(i).mul(d).negate())).sub(o), q(0));
		return J(f, I(B(B(f.r, f.g), f.b), 0, 1));
	})(), f;
}
function qe(e, t, n, r) {
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
	}, a = pe(e), o = pe(t), s = X(i, "uContentUvMin"), c = X(i, "uContentUvSize"), l = X(i, "uStorageUvMin"), u = X(i, "uStorageUvSize"), d = Y(i, "uHasLeftNeighbor"), f = Y(i, "uHasRightNeighbor"), p = Y(i, "uHasTopNeighbor"), m = Y(i, "uHasBottomNeighbor"), h = Y(i, "uNebulaExposure"), g = new A({
		depthTest: !1,
		depthWrite: !1,
		transparent: !0
	}), _ = +(n.uvSize.x >= .999), v = .28;
	return g.blending = k.CustomBlending, g.blendEquation = k.AddEquation, g.blendSrc = k.OneFactor, g.blendDst = k.OneFactor, g.blendEquationAlpha = k.AddEquation, g.blendSrcAlpha = k.OneFactor, g.blendDstAlpha = k.OneMinusSrcAlphaFactor, i.uNebulaTexture = a, i.uStarTexture = o, g.uniforms = i, g.colorNode = j(() => {
		let e = ce.xy.mul(.5).add(.5), t = K(e.x, R(1).sub(e.y)), n = B(R(1).sub(W(0, v, t.y)), R(1).sub(W(0, v, R(1).sub(t.y)))).mul(_), r = Re(t, l, u), i = I(r, 0, 1), g = ze(r), y = K(Le(t.x, s.x, c.x).div(c.x), t.y.sub(s.y).div(c.y)), b = B(u.sub(c).div(c.mul(2)), K(0)), x = B(b, K(1e-6)), S = U(d.greaterThan(.5), W(x.x.negate(), x.x, y.x), 1), C = U(f.greaterThan(.5), R(1).sub(W(R(1).sub(x.x), R(1).add(x.x), y.x)), 1), w = U(b.x.lessThanEqual(0), 1, S.mul(C)), T = U(p.greaterThan(.5), W(x.y.negate(), x.y, y.y), 1), E = U(m.greaterThan(.5), R(1).sub(W(R(1).sub(x.y), R(1).add(x.y), y.y)), 1), D = U(b.y.lessThanEqual(0), 1, T.mul(E)), O = I(w.mul(D).mul(g), 0, 1), k = ue(a, i).rgb, A = q(0).toVar(), j = R(0).toVar();
		N(32, ({ i: e }) => {
			let n = Re(K(R(e).add(.5).div(32), t.y), l, u), r = I(n, 0, 1), i = ze(n);
			A.addAssign(ue(a, r).rgb.mul(i)), j.addAssign(i);
		});
		let M = V(k, A.div(B(j, 1)), n), P = ue(o, i);
		return J(q(1).sub(L(M.mul(B(h, .001)).negate())).add(P.rgb), 1).mul(O);
	})(), g.name = `Starfield composite ${n.id}`, g;
}
function Je(e) {
	return Xe(e).map(({ end: t, offset: n, skyV0: r, skyV1: i, start: a }) => {
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
function Ye(e, t) {
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
function Xe(e) {
	let t = e.hasLeftNeighbor ? e.storageUvMin.x : e.uvMin.x, n = e.hasRightNeighbor ? e.storageUvMin.x + e.storageUvSize.x : e.uvMin.x + e.uvSize.x, r = e.hasTopNeighbor ? e.storageUvMin.y : e.uvMin.y, i = e.hasBottomNeighbor ? e.storageUvMin.y + e.storageUvSize.y : e.uvMin.y + e.uvSize.y, a = Math.max(0, r), o = Math.min(1, i);
	return o <= a ? [] : Ye(t, n - t).map((e) => ({
		...e,
		skyV0: a,
		skyV1: o
	}));
}
function Q(e) {
	return e === "repeat" ? k.RepeatWrapping : k.ClampToEdgeWrapping;
}
function $(e, t, n, r = {}) {
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
function Ze(e) {
	e.dispose();
}
function Qe(e) {
	return Math.max(1, Math.floor(e ?? 8192));
}
function $e(e, t) {
	return Math.max(1, Math.min(e, t));
}
var et = class {
	#e = /* @__PURE__ */ new Map();
	#t = /* @__PURE__ */ new Map();
	#n;
	#r;
	#i = new k.Scene();
	#a = new k.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#o = new k.PlaneGeometry(2, 2);
	constructor(e) {
		this.#r = e, this.#n = Ae(e);
	}
	createBakeKey(e, t) {
		let n = T(e), r = m(n.quality), i = Qe(t);
		return v(n, i, Math.floor(i / 2), {
			budgetBytes: r.budgetBytes,
			maxTextureSize: this.#n
		});
	}
	previewWidthFor(e) {
		return Math.max(1, Math.min(_, this.#n));
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
		return ke(this.#r);
	}
	dispose() {
		this.#e.forEach((e) => e.target.dispose()), this.#e.clear(), this.#t.forEach((e) => {
			e.targets.forEach((e) => e.dispose());
		}), this.#t.clear(), this.#o.dispose();
	}
	#s(e, t, n) {
		let r = T(e), i = m(r.quality), a = Qe(n), o = Math.floor(a / 2), s = t ?? this.createBakeKey(r, a), c = this.#t.get(s);
		if (c) return c;
		let l = h({
			budgetBytes: i.budgetBytes,
			clip: r.clip,
			height: o,
			maxTextureSize: this.#n,
			width: a
		}), u = this.#r.getRenderTarget(), d = this.#r.autoClear, f = Object.assign(new k.Color(), { a: 1 }), p = this.#r.getClearAlpha(), g = [], _ = [];
		this.#r.getClearColor(f), this.#r.autoClear = !0, this.#r.setClearColor(0, 0), l.descriptors.forEach((e) => {
			let t = $(e.storageSize.width, e.storageSize.height, `GPU baked starfield nebula ${e.id}`, {
				colorSpace: k.LinearSRGBColorSpace,
				type: k.HalfFloatType,
				wrapS: Q(e.wrapS),
				wrapT: Q(e.wrapT)
			}), n = $(e.storageSize.width, e.storageSize.height, `GPU baked starfield stars ${e.id}`, {
				colorSpace: k.SRGBColorSpace,
				type: k.UnsignedByteType,
				wrapS: Q(e.wrapS),
				wrapT: Q(e.wrapT)
			});
			this.#l(Ue(r, e), t), this.#u(r, e, n, o, l.supersample), g.push(t, n), _.push({
				descriptor: e,
				nebulaTexture: t.texture,
				starTexture: n.texture
			});
		}), this.#r.setRenderTarget(u), this.#r.autoClear = d, this.#r.setClearColor(f, p);
		let v = {
			key: s,
			patches: _,
			targets: g
		};
		return this.#t.set(s, v), v;
	}
	#c(e, t, n) {
		let r = T(e), i = m(r.quality), a = Qe(n), o = Math.floor(a / 2), s = $e(a, this.#n), c = Math.floor(s / 2), l = t ?? this.createBakeKey(r, a), u = this.#e.get(l);
		if (u && u.target.width === s && u.target.height === c) return u;
		let d = $(s, c, "GPU baked starfield layer", {
			colorSpace: k.SRGBColorSpace,
			type: k.UnsignedByteType,
			wrapS: k.RepeatWrapping,
			wrapT: k.ClampToEdgeWrapping
		}), f = h({
			budgetBytes: i.budgetBytes,
			clip: r.clip,
			height: o,
			maxTextureSize: this.#n,
			width: a
		}), p = this.#r.getRenderTarget(), g = this.#r.autoClear, _ = Object.assign(new k.Color(), { a: 1 }), v = this.#r.getClearAlpha();
		return this.#r.getClearColor(_), this.#r.autoClear = !0, this.#r.setClearColor(0, 0), this.#r.setRenderTarget(d), this.#r.clear(), f.descriptors.forEach((e) => {
			let t = $(e.storageSize.width, e.storageSize.height, `GPU baked starfield nebula ${e.id}`, {
				colorSpace: k.LinearSRGBColorSpace,
				type: k.HalfFloatType,
				wrapS: Q(e.wrapS),
				wrapT: Q(e.wrapT)
			}), n = $(e.storageSize.width, e.storageSize.height, `GPU baked starfield stars ${e.id}`, {
				colorSpace: k.SRGBColorSpace,
				type: k.UnsignedByteType,
				wrapS: Q(e.wrapS),
				wrapT: Q(e.wrapT)
			});
			this.#l(Ue(r, e), t), this.#u(r, e, n, o, f.supersample), this.#d(r, e, t.texture, n.texture, d), t.dispose(), n.dispose();
		}), this.#r.setRenderTarget(p), this.#r.autoClear = g, this.#r.setClearColor(_, v), d.texture.userData.starfieldRenderTarget = d, this.#e.get(l)?.target.dispose(), this.#e.set(l, {
			key: l,
			target: d,
			texture: d.texture
		}), {
			key: l,
			target: d,
			texture: d.texture
		};
	}
	#l(e, t) {
		let n = new k.Mesh(this.#o, e);
		n.frustumCulled = !1, this.#i.clear(), this.#i.add(n), this.#r.setRenderTarget(t), this.#r.clear(), this.#r.render(this.#i, this.#a), this.#i.remove(n), Ze(e);
	}
	#u(e, t, n, r, i) {
		let a = We(e, t, r), o = Math.max(1, Math.floor(i)), s = t.storageSize.width * o, c = t.storageSize.height * o, l = s / t.storageSize.width, u = Ge(e, t, {
			bakeHeight: c,
			bakeWidth: s,
			displayPixelAngle: Math.PI / _e,
			screenPixelScale: r / _e
		}), d = new k.Mesh(a, u), f = $(s, c, `GPU baked starfield stars accumulation ${t.id}`, {
			colorSpace: k.LinearSRGBColorSpace,
			type: k.HalfFloatType,
			wrapS: k.ClampToEdgeWrapping
		});
		d.frustumCulled = !1, this.#i.clear(), this.#i.add(d), this.#r.setRenderTarget(f), this.#r.clear(), this.#r.render(this.#i, this.#a), this.#i.remove(d), a.dispose(), Ze(u), this.#l(Ke(f.texture, s, c, t.storageSize.width, t.storageSize.height, l), n), f.dispose();
	}
	#d(e, t, n, r, i) {
		let a = qe(n, r, t, e), o = Je(t);
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
		}), this.#i.clear(), Ze(a);
	}
};
function tt(e) {
	return ke(e) ? new et(e) : null;
}
//#endregion
//#region starfield.ts
function nt(t, n, i, a = {}) {
	let o = a.starfieldBakes?.get(t);
	if (o) {
		let t = E(n), i = (t.u % 1 + 1) % 1 * o.width - .5, a = s(t.v, 0, 1) * o.height - .5, c = Math.floor(i), l = Math.floor(a), u = c + 1, d = l + 1, f = i - c, p = a - l;
		return r(r(e(o, c, l), e(o, u, l), f), r(e(o, c, d), e(o, u, d), f), p);
	}
	return D(n, i, { sampleHeight: a.sampleHeight });
}
y(tt), o({
	type: "starfield",
	sampleCpu: (e, t, n) => nt(n.layerId, e, t, {
		sampleHeight: n.sampleHeight,
		starfieldBakes: n.starfieldBakes
	})
});
//#endregion
export { S as DEFAULT_STARFIELD_CLIP, g as DEFAULT_STARFIELD_NEBULA, l as DEFAULT_STARFIELD_NEBULA_FIELD, b as DEFAULT_STARFIELD_PARAMS, C as DEFAULT_STARFIELD_QUALITY, d as DEFAULT_STARFIELD_STARS, _ as STARFIELD_PREVIEW_BAKE_WIDTH, w as STARFIELD_QUALITY_PRESETS, et as StarfieldGpuBakeService, f as bakeStarfieldImageData, p as createStarCatalogForCoverage, x as createStarCatalogForDescriptor, v as createStarfieldBakeCacheKey, tt as createStarfieldGpuBakeService, h as createStarfieldPatchLayout, m as getStarfieldQualityPreset, c as normalizeStarfieldCoverage, T as normalizeStarfieldParams, O as normalizeStarfieldQuality, u as qFromV, D as sampleStarfieldLayer, i as sourceDirectionFromUv, t as sourceFoldEquirectUv, E as sourceUvFromDirection, a as starfieldClipContainsDirection, n as starfieldFieldGradientToSourceField };
