import * as e from "three";
import { MeshBasicNodeMaterial as t, NodeMaterial as n } from "three/webgpu";
import { Fn as r, If as i, Loop as a, PI as o, acos as s, atan as c, attribute as l, cameraProjectionMatrixInverse as u, cameraWorldMatrix as d, clamp as f, cos as p, dot as m, exp as h, float as g, floor as _, int as v, max as y, min as b, mix as x, mod as S, modelViewProjection as C, mx_fractal_noise_float as ee, normalize as w, positionGeometry as te, pow as T, screenUV as ne, select as E, sin as D, smoothstep as O, step as k, texture as A, uniform as j, uniformArray as re, uniformTexture as M, uv as ie, varyingProperty as ae, vec2 as N, vec3 as P, vec4 as oe, wgslFn as F } from "three/tsl";
//#region manifest.ts
var I = { type: "box" };
function L(e) {
	return e.version === 2 ? {
		...e,
		geometry: e.geometry ?? I
	} : {
		composition: e.composition,
		geometry: I,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	};
}
//#endregion
//#region skybox/geometry.ts
function R(e) {
	return e ?? I;
}
function se(t = I) {
	return R(t).type === "sphere" ? new e.SphereGeometry(1, 64, 32) : new e.BoxGeometry(1, 1, 1);
}
function ce(t = 1, n = 25, r = 25) {
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
function le(t = I) {
	if (R(t).type === "sphere") return ce();
	let n = new e.BoxGeometry(1, 1, 1), r = new e.EdgesGeometry(n);
	return n.dispose(), r;
}
//#endregion
//#region math.ts
function z(e, t = 0, n = 1) {
	return Math.min(n, Math.max(t, e));
}
function ue(e) {
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
function de(e) {
	let t = z(e);
	return t <= .0031308 ? t * 12.92 : 1.055 * t ** (1 / 2.4) - .055;
}
function fe(e) {
	let t = e.trim().replace(/^#/, ""), n = t.length === 3 ? t.split("").map((e) => `${e}${e}`).join("") : t;
	return /^[0-9a-fA-F]{6}$/.test(n) ? [
		0,
		2,
		4
	].map((e) => ue(Number.parseInt(n.slice(e, e + 2), 16) / 255)) : [
		1,
		1,
		1
	];
}
function pe(e) {
	return e.map((e) => Math.round(de(e) * 255));
}
function me(e) {
	return e <= .25 ? ((16 * e - 12) * e + 4) * e : Math.sqrt(e);
}
function he(e, t, n) {
	let r = z(t), i = z(n);
	switch (e) {
		case "multiply": return r * i;
		case "screen": return r + i - r * i;
		case "overlay": return r <= .5 ? 2 * r * i : 1 - 2 * (1 - r) * (1 - i);
		case "darken": return Math.min(r, i);
		case "lighten": return Math.max(r, i);
		case "color-dodge": return r === 0 ? 0 : i === 1 ? 1 : Math.min(1, r / (1 - i));
		case "color-burn": return r === 1 ? 1 : i === 0 ? 0 : 1 - Math.min(1, (1 - r) / i);
		case "hard-light": return i <= .5 ? 2 * r * i : r + (2 * i - 1) - r * (2 * i - 1);
		case "soft-light": return i <= .5 ? r - (1 - 2 * i) * r * (1 - r) : r + (2 * i - 1) * (me(r) - r);
		case "difference": return Math.abs(r - i);
		case "exclusion": return r + i - 2 * r * i;
		default: return i;
	}
}
function ge(e, t, n, r) {
	let i = z(t), a = z(r);
	return z(z(he(e, i, n)) * a + i * (1 - a));
}
function _e(e, t, n, r) {
	return [
		ge(r, e[0], t[0], n),
		ge(r, e[1], t[1], n),
		ge(r, e[2], t[2], n)
	];
}
function ve(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n += 1) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return (t >>> 0).toString(36);
}
//#endregion
//#region layer-addons/registry.ts
var ye = /* @__PURE__ */ new Map();
function be(e) {
	let t = ye.get(e.type);
	ye.set(e.type, {
		...t ?? { type: e.type },
		...e
	});
}
function xe(e) {
	return ye.get(e);
}
function Se() {
	return Array.from(ye.values());
}
function Ce(e) {
	return ye.has(e);
}
//#endregion
//#region layer-addons/cpu-sampling.ts
var we = Math.PI * 2;
function Te(e, t, n) {
	return e + (t - e) * n;
}
function Ee(e, t) {
	let n = (e - .5) * we, r = (t - .5) * Math.PI, i = Math.cos(r);
	return [
		i * Math.sin(n),
		Math.sin(r),
		-i * Math.cos(n)
	];
}
function De(e, t, n) {
	return [
		Te(e[0], t[0], n),
		Te(e[1], t[1], n),
		Te(e[2], t[2], n),
		Te(e[3], t[3], n)
	];
}
function Oe(e, t, n) {
	let r = (t % e.width + e.width) % e.width, i = (Math.min(e.height - 1, Math.max(0, n)) * e.width + r) * 4;
	return [
		ue((e.data[i] ?? 0) / 255),
		ue((e.data[i + 1] ?? 0) / 255),
		ue((e.data[i + 2] ?? 0) / 255),
		(e.data[i + 3] ?? 0) / 255
	];
}
function ke(e, t, n) {
	let r = Math.min(e.width - 1, Math.max(0, t)), i = (Math.min(e.height - 1, Math.max(0, n)) * e.width + r) * 4, a = e.pixels?.[i] ?? 0, o = e.pixels?.[i + 1] ?? 0, s = e.pixels?.[i + 2] ?? 0, c = e.pixels?.[i + 3] ?? 255;
	return [
		ue(a / 255),
		ue(o / 255),
		ue(s / 255),
		c / 255
	];
}
//#endregion
//#region layer-addons/shader-codegen.ts
function B(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function Ae(e, t) {
	return t === "wgsl" ? `vec3<f32>(${B(e)})` : `vec3(${B(e)})`;
}
function je(e, t, n, r) {
	return r === "wgsl" ? `var ${e}: ${t} = ${n};` : `${t} ${e} = ${n};`;
}
function Me(e, t, n, r) {
	return r === "wgsl" ? `select(${n}, ${t}, ${e})` : `((${e}) ? ${t} : ${n})`;
}
function Ne(e) {
	return `effectColor = ${e === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
//#endregion
//#region image-placement-transform.ts
var Pe = [
	0,
	1,
	0
], Fe = [
	0,
	0,
	-1
], Ie = [
	1,
	0,
	0
], Le = [
	0,
	1,
	0
], Re = 89.9;
function ze(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Be(e) {
	return e * Math.PI / 180;
}
function Ve(e) {
	return e * 180 / Math.PI;
}
function He(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Ue(e) {
	return (Math.round(e) % 360 + 360) % 360;
}
function We(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function Ge(e, t) {
	return [
		e[0] - t[0],
		e[1] - t[1],
		e[2] - t[2]
	];
}
function Ke(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function qe(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function Je(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function V(e, t = Fe) {
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
function Ye(e, t, n) {
	let r = Be(n), i = Math.cos(r), a = Math.sin(r), o = V(t);
	return V(qe(qe(Ke(e, i), Ke(Je(o, e), a)), Ke(o, We(o, e) * (1 - i))), e);
}
function Xe(e, t = Pe, n = 0) {
	let r = V(e), i = Ge(V(t, Pe), Ke(r, We(V(t, Pe), r)));
	if (Math.hypot(i[0], i[1], i[2]) < 1e-6) {
		let e = Math.abs(r[1]) > .98 ? [
			0,
			0,
			1
		] : Pe;
		i = Ge(e, Ke(r, We(e, r)));
	}
	return i = V(i, Le), {
		tangentX: Ye(V(Je(r, i), Ie), r, n),
		tangentY: Ye(i, r, n)
	};
}
function Ze({ angularHeight: e, angularWidth: t, baseAngularHeight: n, baseAngularWidth: r, centerDirection: i, rotation: a = 0, upDirection: o = Pe }) {
	let s = V(i), c = Ue(a), { tangentX: l, tangentY: u } = Xe(s, o, c), d = Math.max(1e-4, e), f = Math.max(1e-4, t);
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
function Qe(e) {
	let t = e, n = V(t?.centerDirection ?? t?.normal ?? t?.center, Fe), r = Array.isArray(t?.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, i = typeof t?.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t?.width ?? .4) / (2 * r)), a = typeof t?.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t?.height ?? .3) / (2 * r));
	return Ze({
		angularHeight: a,
		angularWidth: i,
		baseAngularHeight: typeof t?.baseAngularHeight == "number" ? t.baseAngularHeight : a,
		baseAngularWidth: typeof t?.baseAngularWidth == "number" ? t.baseAngularWidth : i,
		centerDirection: n,
		rotation: typeof t?.rotation == "number" ? t.rotation : 0
	});
}
function $e(e) {
	let t = V(e.centerDirection);
	return {
		x: He(Ve(Math.atan2(t[0], -t[2]))),
		y: Ve(Math.asin(ze(t[1], -1, 1)))
	};
}
function et(e) {
	let t = Be(e.x), n = Be(ze(e.y, -89.9, Re)), r = Math.cos(n);
	return V([
		Math.sin(t) * r,
		Math.sin(n),
		-Math.cos(t) * r
	]);
}
function tt(e, t, n) {
	let r = Qe(e);
	return Ze({
		angularHeight: r.angularHeight,
		angularWidth: r.angularWidth,
		baseAngularHeight: r.baseAngularHeight,
		baseAngularWidth: r.baseAngularWidth,
		centerDirection: et(t),
		rotation: r.rotation,
		upDirection: n?.upDirection
	});
}
function nt(e) {
	let t = Qe(e);
	return {
		x: t.angularWidth / t.baseAngularWidth,
		y: t.angularHeight / t.baseAngularHeight
	};
}
function rt(e, t) {
	let n = Qe(e);
	return {
		...n,
		angularHeight: Math.max(1e-4, n.baseAngularHeight * Math.max(1e-4, t.y)),
		angularWidth: Math.max(1e-4, n.baseAngularWidth * Math.max(1e-4, t.x))
	};
}
function it(e) {
	return Qe(e).rotation;
}
function at(e, t) {
	let n = Qe(e);
	return Ze({
		angularHeight: n.angularHeight,
		angularWidth: n.angularWidth,
		baseAngularHeight: n.baseAngularHeight,
		baseAngularWidth: n.baseAngularWidth,
		centerDirection: n.centerDirection,
		rotation: t
	});
}
function ot(e, t) {
	let n = Qe(t), r = V(e), i = We(r, n.centerDirection);
	if (i <= 0) return null;
	let a = We(r, n.tangentX) / i, o = We(r, n.tangentY) / i, s = Math.tan(n.angularWidth / 2), c = Math.tan(n.angularHeight / 2);
	return s <= 0 || c <= 0 || a < -s || a > s || o < -c || o > c ? null : {
		u: a / (2 * s) + .5,
		v: .5 - o / (2 * c)
	};
}
//#endregion
//#region skybox/overlay.ts
var st = .18, ct = .75, lt = 1.75, ut = 1e-4, dt = .01, ft = {
	hoveredLayerId: null,
	selectedLayerId: null
};
function pt(e, t) {
	return +(t === e);
}
function mt(e, t) {
	return +(t === e);
}
function ht(e, t) {
	return Math.max(pt(e, t.hoveredLayerId), mt(e, t.selectedLayerId));
}
function gt(e, t) {
	return e.map((e) => ({
		active: j(ht(e.layer.id, t)),
		layerId: e.layer.id
	}));
}
function _t(e, t) {
	e.forEach((e) => {
		e.active.value = ht(e.layerId, t);
	});
}
function vt(e, t) {
	return Object.fromEntries(e.map((e) => [`imageActive${e.index}`, { value: ht(e.layer.id, t) }]));
}
function yt(e, t, n, r) {
	t.forEach((t) => {
		let n = `imageActive${t.index}`;
		e.uniforms[n] && (e.uniforms[n].value = ht(t.layer.id, r));
	}), n.forEach((t) => {
		let n = `spotActive${t.index}`;
		e.uniforms[n] && (e.uniforms[n].value = ht(t.layer.id, r));
	});
}
function bt(e, t) {
	e.userData.applyEditorLayerState = t;
}
var xt = F(`
  fn skyboxStudioApplyImageEditorRectOverlay(
    color: vec4<f32>,
    uv: vec2<f32>,
    valid: f32,
    activeValue: f32
  ) -> vec4<f32> {
    let activeAmount = clamp(activeValue, 0.0, 1.0);
    let rectCoverage = valid * activeAmount;
    let edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    let edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${B(dt)});
    let bounds = rectCoverage * (
      1.0 - smoothstep(
        edgeWidth * ${B(ct)},
        edgeWidth * ${B(lt)},
        edgeDistance
      )
    );
    let rectAlpha = rectCoverage * ${B(st)};
    let overlayAlpha = max(rectAlpha, bounds);
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), overlayAlpha),
      color.a
    );
  }
`);
F(`
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
    let spotEdgeWidth = clamp(fwidth(spotEdgeDistance), 0.000001, ${B(dt)});
    let spotValid = step(${B(ut)}, spotDenom) *
      step(-spotEdgeWidth, spotEdgeDistance) *
      smoothstep(-spotEdgeWidth, spotEdgeWidth, spotEdgeDistance);

    return vec4<f32>(spotU, spotV, spotValid, 0.0);
  }
`);
function St(e) {
	return e.map((e) => `
        {
          vec4 imageEditorInfo = skyboxStudioImageSampleInfo${e.index}(direction);
          float activeAmount = clamp(imageActive${e.index}, 0.0, 1.0);
          float rectCoverage = imageEditorInfo.z * activeAmount;
          float edgeDistance = min(min(imageEditorInfo.x, 1.0 - imageEditorInfo.x), min(imageEditorInfo.y, 1.0 - imageEditorInfo.y));
          float edgeWidth = clamp(fwidth(edgeDistance), 0.000001, ${B(dt)});
          float bounds = rectCoverage * (
            1.0 - smoothstep(
              edgeWidth * ${B(ct)},
              edgeWidth * ${B(lt)},
              edgeDistance
            )
          );
          float rectAlpha = rectCoverage * ${B(st)};
          float overlayAlpha = max(rectAlpha, bounds);
          composedColor = mix(composedColor, vec3(1.0, 0.0, 0.0), overlayAlpha);
        }
      `).join("\n");
}
//#endregion
//#region skybox/empty-texture.ts
var Ct = new e.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, e.RGBAFormat);
Ct.colorSpace = e.SRGBColorSpace, Ct.needsUpdate = !0;
//#endregion
//#region layer-addons/builtins/image.ts
function wt(e, t) {
	let n = t.placement;
	if (!n || !t.pixels || t.width <= 0 || t.height <= 0) return [
		0,
		0,
		0,
		0
	];
	let r = ot(e, n);
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
	return De(De(ke(t, c, l), ke(t, u, l), f), De(ke(t, c, d), ke(t, u, d), f), p);
}
function Tt(t) {
	if (!t) return {
		centerDirection: new e.Vector3(0, 0, -1),
		halfSize: new e.Vector2(0, 0),
		tangentX: new e.Vector3(1, 0, 0),
		tangentY: new e.Vector3(0, 1, 0)
	};
	let n = Qe(t);
	return {
		centerDirection: new e.Vector3(...n.centerDirection),
		halfSize: new e.Vector2(Math.max(0, Math.tan(n.angularWidth / 2)), Math.max(0, Math.tan(n.angularHeight / 2))),
		tangentX: new e.Vector3(...n.tangentX),
		tangentY: new e.Vector3(...n.tangentY)
	};
}
function Et(e) {
	return e.map((e) => {
		let t = Tt(e.layer.params.placement);
		return {
			centerDirection: j(t.centerDirection),
			halfSize: j(t.halfSize),
			layerId: e.layer.id,
			tangentX: j(t.tangentX),
			tangentY: j(t.tangentY)
		};
	});
}
function Dt(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = Tt(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function Ot(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = Tt(e.layer.params.placement);
		return [
			[`imageCenterDirection${e.index}`, { value: t.centerDirection }],
			[`imageTangentX${e.index}`, { value: t.tangentX }],
			[`imageTangentY${e.index}`, { value: t.tangentY }],
			[`imageHalfSize${e.index}`, { value: t.halfSize }]
		];
	}));
}
function kt(e, t, n, r) {
	let i = t.find((e) => e.layer.id === n);
	if (!i) return;
	let a = Tt(r);
	e.uniforms[`imageCenterDirection${i.index}`]?.value.copy(a.centerDirection), e.uniforms[`imageTangentX${i.index}`]?.value.copy(a.tangentX), e.uniforms[`imageTangentY${i.index}`]?.value.copy(a.tangentY), e.uniforms[`imageHalfSize${i.index}`]?.value.copy(a.halfSize);
}
function At(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function jt(e) {
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
function Mt(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Nt(e, t, n) {
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
      ${o} imageEdgeWidth = clamp(fwidth(imageEdgeDistance), 0.000001, ${B(dt)});
      ${o} imageHardInside = step(${B(ut)}, imageDenom) *
        step(0.0, ${n.halfSize}.x) *
        step(0.0, ${n.halfSize}.y);
      ${o} imageNearRect = step(-imageEdgeWidth, imageEdgeDistance);
      ${s} imageValid = imageHardInside *
        imageNearRect *
        smoothstep(-imageEdgeWidth, imageEdgeWidth, imageEdgeDistance);
      return ${a}(imageU, imageV, imageValid, 0.0);
    `;
}
function Pt(e, t, n) {
	let r = t.get(e.id);
	return r ? n === "wgsl" ? `effectColor = ${r.parameterName};` : `{
    vec4 imageSampleInfo = skyboxStudioImageSampleInfo${r.index}(direction);
    vec4 imageSampleColor = texture2D(imageTexture${r.index}, imageSampleInfo.xy);
    effectColor = vec4(imageSampleColor.rgb, imageSampleColor.a * imageSampleInfo.z);
  }` : `effectColor = ${n === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function Ft(e) {
	return F(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${Nt(e, "wgsl", {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var It = F("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n");
function Lt(e) {
	return e.map((e) => `
        vec4 skyboxStudioImageSampleInfo${e.index}(vec3 direction) {
          ${Nt(e, "glsl", {
		centerDirection: `imageCenterDirection${e.index}`,
		halfSize: `imageHalfSize${e.index}`,
		tangentX: `imageTangentX${e.index}`,
		tangentY: `imageTangentY${e.index}`
	})}
        }
      `).join("\n");
}
function Rt(e, t) {
	return e.map((e) => `uniform sampler2D imageTexture${e.index};
      uniform vec3 imageCenterDirection${e.index};
      uniform vec3 imageTangentX${e.index};
      uniform vec3 imageTangentY${e.index};
      uniform vec2 imageHalfSize${e.index};${t ? `
      uniform float imageActive${e.index};` : ""}`).join("\n");
}
function zt(e, t) {
	return e.get(t.id) ?? Ct;
}
function Bt(e, t) {
	return Object.fromEntries(e.map((e) => [`imageTexture${e.index}`, { value: zt(t, e.layer) }]));
}
function Vt(e, t, n) {
	t.forEach((t) => {
		let r = `imageTexture${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = zt(n, t.layer));
	});
}
function Ht(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? Ct;
	});
}
function Ut(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	return {
		sampleData: i,
		sampleNodes: Object.fromEntries(e.map((e) => {
			let a = r[e.index], o = Ft(e)({
				direction: t,
				imageCenterDirection: a.centerDirection,
				imageHalfSize: a.halfSize,
				imageTangentX: a.tangentX,
				imageTangentY: a.tangentY
			}), s = N(o.x, o.y), c = A(zt(n, e.layer), s).setName(`imageTexture${e.index}`);
			c.getUniformHash = () => `skybox-image-texture:${e.layer.id}`;
			let l = It({
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
var Wt = {
	collect: jt,
	createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
	createSampleExpression: (e, t, n) => {
		let r = n.bindingsByLayerId.get(e.id);
		return r ? `effectColor = ${r.parameterName};` : Ne(t);
	},
	createSampleNodes: ({ bindings: e, direction: t, imageTextures: n, uniforms: r }) => {
		let i = Ut(e, t, n, r);
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
	createUniforms: Et,
	getTopologyKey: (e) => ({
		hasPlacement: !!e.params.placement,
		hasSrc: !!e.params.src,
		height: e.params.height,
		width: e.params.width
	}),
	type: "image",
	updateUniforms: (e, t) => Dt(e, t.id, t.params.placement)
};
be({
	type: "image",
	sampleCpu: (e, t) => wt(e, t),
	updateLive: (e, t) => e.applyImagePlacement(t.id, t.params.placement),
	wgsl: Wt,
	wgslEditorOverlay: !0,
	getTopologyKey: (e) => Wt.getTopologyKey(e),
	glsl: {
		collectBindings: (e) => jt(e),
		createBindingMap: (e) => Mt(e),
		uniformDeclarations: (e, t) => Rt(e, t.editorPresentationEnabled),
		fragmentHelpers: (e) => Lt(e),
		shaderUniforms: (e, t) => ({
			...Ot(e),
			...Bt(e, t.imageTextures),
			...t.editorPresentationEnabled ? vt(e, t.editorLayerState) : {}
		}),
		editorOverlayExpression: (e) => St(e),
		sampleExpression: (e, t, n) => Pt(e, t, n)
	}
});
//#endregion
//#region spot-transform.ts
var Gt = Math.PI / 12;
function H(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Kt(e) {
	return e * 180 / Math.PI;
}
function qt(e) {
	return ((e + 180) % 360 + 360) % 360 - 180;
}
function Jt() {
	return {
		angularRadius: Gt,
		baseAngularRadius: Gt,
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
function Yt(e) {
	let t = e, n = Jt(), r = Math.max(1e-4, typeof t?.baseAngularRadius == "number" ? t.baseAngularRadius : n.baseAngularRadius);
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
function Xt(e) {
	let t = V(e.centerDirection);
	return {
		x: qt(Kt(Math.atan2(t[0], -t[2]))),
		y: Kt(Math.asin(H(t[1], -1, 1)))
	};
}
function Zt(e, t) {
	return {
		...Yt(e),
		centerDirection: et({
			x: t.x,
			y: H(t.y, -Re, Re)
		})
	};
}
function Qt(e) {
	let t = Yt(e);
	return t.angularRadius / t.baseAngularRadius;
}
function $t(e, t) {
	let n = Yt(e);
	return {
		...n,
		angularRadius: Math.max(1e-4, n.baseAngularRadius * Math.max(1e-4, t))
	};
}
function en(e, t) {
	let n = Yt(t), r = V(e), i = V(n.centerDirection), a = r[0] * i[0] + r[1] * i[1] + r[2] * i[2];
	return Math.acos(H(a, -1, 1)) <= n.angularRadius;
}
//#endregion
//#region starfield-static.ts
var U = Math.PI * 2, tn = 8, nn = 1e3, rn = 2, an = 128, on = 64, sn = 4, cn = 8, ln = 12, un = 2048 * 1024 * 1024, dn = 512 * 1024 * 1024, fn = 128 * 1024 * 1024, pn = 8, mn = 1.75, hn = 3.25, gn = 1, _n = 1.5, vn = 8, yn = 2048, bn = 5, xn = 12, Sn = .35, Cn = .25, wn = [
	1,
	2,
	4,
	8,
	16
], Tn = 1024, En = 8192, Dn = "medium", On = {
	high: { budgetBytes: un },
	low: { budgetBytes: fn },
	medium: { budgetBytes: dn }
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
}, kn = [
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
	anchors: kn.map((e) => ({
		color: In(e.color),
		...Hn(e.dir)
	})),
	frequency: 2.2,
	mode: "inverse-distance",
	power: 2
}, An = {
	altitudeCenterDeg: 0,
	altitudeSpanDeg: 180,
	azimuthCenterDeg: 0,
	azimuthSpanDeg: 360
}, jn = {
	clip: An,
	nebula: G,
	nebulaField: K,
	quality: Dn,
	stars: W
}, Mn = /* @__PURE__ */ new Map();
function q(e, t, n = -Infinity, r = Infinity) {
	return z(Number.isFinite(Number(e)) ? Number(e) : t, n, r);
}
function Nn(e) {
	return e === "high" ? "high" : e === "low" ? "low" : Dn;
}
function Pn(e) {
	return On[Nn(e)];
}
function Fn(e, t) {
	return Array.isArray(e) ? [
		q(e[0], t[0], 0, 1),
		q(e[1], t[1], 0, 1),
		q(e[2], t[2], 0, 1)
	] : [...t];
}
function In(e) {
	return `#${e.map((e) => Math.round(z(e) * 255).toString(16).padStart(2, "0")).join("")}`;
}
function Ln(e) {
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
function Rn(e) {
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
function zn(e, t) {
	return Rn(Array.isArray(e) ? [
		q(e[0], t[0]),
		q(e[1], t[1]),
		q(e[2], t[2])
	] : t);
}
function Bn(e, t) {
	let n = (e - .5) * U, r = z(t, 0, 1) * Math.PI, i = Math.sin(r);
	return Rn([
		i * Math.sin(n),
		Math.cos(r),
		i * Math.cos(n)
	]);
}
function Vn(e, t) {
	let n = (t % 2 + 2) % 2, r = +(n >= 1), i = e + r * .5, a = r ? 2 - n : n;
	return {
		u: i,
		v: a,
		x: i,
		y: a
	};
}
function Hn(e) {
	let t = Rn(e), n = ((Math.atan2(t[0], t[2]) / U + .5) % 1 + 1) % 1, r = Math.acos(z(t[1], -1, 1)) / Math.PI;
	return {
		u: n,
		v: r,
		x: n,
		y: r
	};
}
function Un(e = {}) {
	let t = Number(e.azimuthCenterDeg) || 0, n = q(e.azimuthSpanDeg, An.azimuthSpanDeg, 1, 360), r = q(e.altitudeSpanDeg, An.altitudeSpanDeg, 1, 180), i = Math.max(0, 90 - r * .5);
	return {
		altitudeCenterDeg: q(e.altitudeCenterDeg, An.altitudeCenterDeg, -i, i),
		altitudeSpanDeg: r,
		azimuthCenterDeg: t,
		azimuthSpanDeg: n
	};
}
function Wn(e) {
	let t = Un(e), n = t.altitudeCenterDeg + t.altitudeSpanDeg * .5, r = t.altitudeCenterDeg - t.altitudeSpanDeg * .5, i = t.azimuthSpanDeg >= 359.999, a = i ? 0 : .5 + (t.azimuthCenterDeg - t.azimuthSpanDeg * .5) / 360, o = i ? 1 : t.azimuthSpanDeg / 360, s = (90 - n) / 180, c = (n - r) / 180;
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
function Gn(e, t = an) {
	return Math.max(t, Math.ceil(Math.max(1, e) / t) * t);
}
function Kn(e, t) {
	return Math.max(1, Math.min(t, Gn(e)));
}
function qn(e, t, n) {
	return Math.max(0, Math.round(e) * Math.round(t) * n);
}
function Jn({ accumulationBytes: e, patchCount: t, residentBytesPerPixel: n = sn, storageHeight: r, storageWidth: i, supersample: a }) {
	let o = qn(i, r, n) * t, s = qn(i * a, r * a, e);
	return {
		peakBytes: o + s,
		residentBytes: o,
		scratchBytes: s
	};
}
function Yn({ accumulationBytes: e, budgetBytes: t, maxTextureSize: n, patchCount: r, residentBytesPerPixel: i = sn, storageHeight: a, storageWidth: o }) {
	let s = Math.max(1, Math.min(pn, Math.floor(n / Math.max(1, o)), Math.floor(n / Math.max(1, a))));
	for (let n = s; n >= 1; --n) {
		let s = Jn({
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
	let c = Jn({
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
function Xn({ accumulationBytes: e, budgetBytes: t, coverage: n, grid: r, idealVirtualHeight: i, idealVirtualWidth: a, maxQualityScale: o = 1, maxTextureSize: s, residentBytesPerPixel: c = sn }) {
	let l = Wn(n), u = r === 1 ? 0 : on, d = Math.max(1, s - u * 2), f = Math.max(1, s - u * 2), p = Math.max(1, a / r), m = Math.max(1, i / r), h = Math.min(1, Math.max(.001, o), d / p, f / m), g = r * r, _ = Math.max(.001, h), v = null;
	for (let n = 0; n < 18; n += 1) {
		let n = Kn(p * _, d), r = Kn(m * _, f), i = n + u * 2, a = r + u * 2, o = Yn({
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
		if (Math.abs(l - _) < .001 || n <= an || r <= an) break;
		_ = Math.max(.001, l);
	}
	if (!v) {
		let n = Kn(p * _, d), r = Kn(m * _, f), i = n + u * 2, a = r + u * 2;
		v = {
			allocation: Yn({
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
function Zn(e, t, n) {
	return {
		x: e.coverageUvMin.x + t / e.columns * e.coverageUvSize.x,
		y: e.coverageUvMin.y + n / e.rows * e.coverageUvSize.y
	};
}
function Qn(e) {
	return {
		x: e.coverageUvSize.x / e.columns,
		y: e.coverageUvSize.y / e.rows
	};
}
function $n(e, t, n, r) {
	let i = Zn(e, t, n), a = Qn(e), o = Math.min(r, Math.max(1, Math.round(e.contentWidth))), s = Math.min(r, Math.max(1, Math.round(e.contentHeight))), c = Math.min(r, o + e.guard * 2), l = Math.min(r, s + e.guard * 2), u = Math.max(0, (c - o) * .5), d = Math.max(0, (l - s) * .5), f = a.x * (u / o), p = a.y * (d / s), m = e.wrapsHorizontally && e.columns === 1;
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
function er({ accumulationBytes: e = cn, budgetBytes: t = un, clip: n, height: r, maxTextureSize: i = 4096, residentBytesPerPixel: a = ln, width: o }) {
	let s = Wn(n), c = Math.max(1, o * s.uvSize.x), l = Math.max(1, r * s.uvSize.y), u = Math.max(1, o), d = Math.max(1, r), f = (e, t) => wn.find((n) => {
		let r = Math.max(1, i - (n === 1 ? 0 : on) * 2);
		return e / n <= r && t / n <= r;
	}) ?? wn[wn.length - 1], p = Xn({
		accumulationBytes: e,
		budgetBytes: t,
		grid: f(u, d),
		idealVirtualHeight: d,
		idealVirtualWidth: u,
		maxTextureSize: i,
		residentBytesPerPixel: a
	}), m = f(c, l), h = Xn({
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
	for (let e = 0; e < m; e += 1) for (let t = 0; t < m; t += 1) y.push($n(v, t, e, i));
	return {
		...v,
		descriptors: y
	};
}
function tr(e) {
	return !!(e && typeof e == "object" && "mode" in e && !("blend" in e));
}
function nr(e) {
	let t = Array.isArray(e?.anchors) && e.anchors.length ? e.anchors : kn;
	return {
		amplitude: q(e?.warp?.amp, K.amplitude, 0, .6),
		anchors: t.slice(0, tn).map((e, t) => {
			let n = kn[t] ?? kn[0], r = zn(e?.dir, n.dir);
			return {
				color: Array.isArray(e?.color) ? In(Fn(e.color, n.color)) : typeof e?.color == "string" ? e.color : In(n.color),
				...Hn(r)
			};
		}),
		frequency: q(e?.warp?.freq, K.frequency, .3, 4),
		mode: e?.blend === "gaussian" ? "gaussian" : "inverse-distance",
		power: q(e?.power, K.power, .4, 6)
	};
}
function rr(e) {
	if (!tr(e)) return nr(e);
	let t = Array.isArray(e.anchors) && e.anchors.length ? e.anchors : K.anchors;
	return {
		amplitude: q(e.amplitude, K.amplitude, 0, .6),
		anchors: t.slice(0, tn).map((e, t) => ({
			color: typeof e?.color == "string" ? e.color : K.anchors[t]?.color ?? "#ffffff",
			x: q(e?.x, K.anchors[t]?.x ?? .5, 0, 1),
			y: q(e?.y, K.anchors[t]?.y ?? .5, 0, 1)
		})),
		frequency: q(e.frequency, K.frequency, .3, 4),
		mode: e.mode === "gaussian" ? "gaussian" : "inverse-distance",
		power: q(e.power, K.power, .4, 6)
	};
}
function ir(e = {}) {
	let t = e.stars ?? W, n = e.nebula ?? G;
	return {
		clip: Un(e.clip),
		nebula: {
			uBaseScale: q(n.uBaseScale, G.uBaseScale, .001, 100),
			uCloudCore: Fn(n.uCloudCore, G.uCloudCore),
			uCloudHighlight: Fn(n.uCloudHighlight, G.uCloudHighlight),
			uCloudShadow: Fn(n.uCloudShadow, G.uCloudShadow),
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
		nebulaField: rr(e.nebulaField),
		quality: Nn(e.quality),
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
function ar(e, t, n) {
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
function or(e, t) {
	return [
		e[0] * t[0],
		e[1] * t[1],
		e[2] * t[2]
	];
}
function sr(e, t, n) {
	let r = z((n - e) / Math.max(t - e, 1e-5));
	return r * r * (3 - 2 * r);
}
function cr(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function lr(e) {
	return Math.max(0, 2 * (1 - z(e, -1, 1)));
}
function ur(e, t) {
	return ((e - t) % 1 + 1.5) % 1 - .5;
}
function dr(e, t, n) {
	if (t < n.uvMin.y || t > n.uvMin.y + n.uvSize.y) return !1;
	if (n.wrapsHorizontally) return !0;
	let r = n.uvMin.x + n.uvSize.x * .5;
	return Math.abs(ur(e, r)) <= n.uvSize.x * .5;
}
function fr(e, t, n) {
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
function pr(e, t) {
	let n = Wn(t), r = Hn(e);
	return dr(r.u, r.v, n);
}
function mr(e) {
	return (Math.floor(e * 1000003) ^ 2654435769) >>> 0;
}
function hr(e) {
	let t = e >>> 0;
	return t = Math.imul(t ^ t >>> 16, 2146121005), t = Math.imul(t ^ t >>> 15, 2221713035), (t ^ t >>> 16) >>> 0;
}
function gr(e, t, n, r) {
	let i = Math.imul(t + 2654435769 >>> 0, 2246822507), a = Math.imul(n + 3266489909 >>> 0, 668265263), o = Math.imul(r + 374761393 >>> 0, 2654435761);
	return hr((e ^ i ^ a ^ o) >>> 0) / 4294967296;
}
function _r(e, t) {
	return (e % t + t) % t;
}
function vr(e) {
	return (1 - Math.cos(z(e, 0, 1) * Math.PI)) * .5;
}
function yr(e) {
	let t = Math.max(1, Math.round(e.uDensity)), n = z(t / nn, 0, 1);
	return {
		activationThreshold: n * n,
		columns: nn,
		density: t,
		densityScale: n,
		rows: nn,
		seed: mr(e.uSeed)
	};
}
function br(e, t = 1, n = 0) {
	return z(e, 0, 1) ** bn * (1 + (z(t, 0, 1) ** xn - 1) * z(n, 0, 1));
}
function xr(e, t, n, r, i) {
	let a = br(e, t, n), o = r + (Math.max(r, a) - r) * Sn, s = i + (Math.max(i, a) - i) * Cn, c = o ** 3, l = s ** 8, u = z(a * .3 + c * .55 + l * .15, 0, 1);
	return u >= .78 || c > .85 && (a > .65 || l > .35) ? 3 : u >= .52 || c > .62 || l > .65 && a > .45 ? 2 : u < .16 && a < .35 && c < .08 && l < .08 ? 0 : 1;
}
function Sr(e, t, n, r = 0) {
	if (n < 0 || n >= e.rows) return null;
	let i = _r(t, e.columns);
	if (gr(e.seed, i, n, 0) >= e.activationThreshold) return null;
	let a = (i + gr(e.seed, i, n, 1)) / e.columns, o = 1 - (n + gr(e.seed, i, n, 2)) / e.rows * 2, s = (a - .5) * U, c = Math.sqrt(Math.max(0, 1 - o * o)), l = gr(e.seed, i, n, 3), u = gr(e.seed, i, n, 4), d = gr(e.seed, i, n, 5), f = gr(e.seed, i, n, 6), p = gr(e.seed, i, n, 7);
	return {
		classId: xr(l, p, r, u, d),
		column: i,
		rBright: u,
		rColor: f,
		rGlare: d,
		rSize: l,
		rSizeGate: p,
		row: n,
		u: a,
		v: Math.acos(z(o, -1, 1)) / Math.PI,
		x: c * Math.sin(s),
		y: o,
		z: c * Math.cos(s)
	};
}
function Cr(e, t, n, r) {
	if (t - e >= 1) return !0;
	let i = n / r, a = (n + 1) / r;
	for (let n = -1; n <= 1; n += 1) if (a + n >= e && i + n <= t) return !0;
	return !1;
}
function wr(e, t) {
	let n = Math.PI / Math.max(1, t), r = Math.PI / yn, i = Math.max(e.uStarSize * r, mn * Math.max(n, r)), a = Math.max((e.uStarSize + e.uGlareSize) * r, hn * Math.max(n, r));
	return Math.max(i * .45, a * .36, n, r) * vn;
}
function Tr({ height: e, includeSeamCopies: t, rawVMax: n, rawVMin: r, seamCopies: i, stars: a, uMax: o, uMin: s, wrapsHorizontally: c }) {
	let l = yr(a), u = wr(a, e) / Math.PI, d = z(r, 0, 1), f = z(n, 0, 1), p = vr(d), m = vr(f), h = Math.max(0, Math.floor(p * l.rows) - rn), g = Math.min(l.rows - 1, Math.floor(m * l.rows) + rn), _ = r <= u || n >= 1 - u, v = z(a.uLargeStarRarity, 0, 1), y = JSON.stringify({
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
	}), b = Mn.get(y);
	if (b) return b.map((e) => ({ ...e }));
	let x = [];
	for (let e = h; e <= g; e += 1) for (let n = 0; n < l.columns; n += 1) {
		if (!_ && !c && !Cr(s, o, n, l.columns)) continue;
		let r = Sr(l, n, e, v);
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
	return Mn.set(y, x.map((e) => ({ ...e }))), x;
}
function Er(e, t, n, r = {}) {
	let i = yr(e), a = wr(e, n), o = a / Math.PI, s = t.uvMin.y - o, c = t.uvMin.y + t.uvSize.y + o, l = z(s, 0, 1), u = z(c, 0, 1), d = s <= o || c >= 1 - o, f = Math.max(Math.min(Math.sin(Math.max(l, .001) * Math.PI), Math.sin(Math.min(u, .999) * Math.PI)), .015), p = d ? 1 : Math.min(1, a / (U * f) + rn / i.columns), m = t.wrapsHorizontally ? -p : t.uvMin.x - p, h = t.wrapsHorizontally ? 1 + p : t.uvMin.x + t.uvSize.x + p;
	return Tr({
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
function Dr(e, t, n, r = {}) {
	let i = yr(e), a = wr(e, n), o = a / Math.PI, s = t.storageUvMin.y - o, c = t.storageUvMin.y + t.storageUvSize.y + o, l = z(s, 0, 1), u = z(c, 0, 1), d = s <= o || c >= 1 - o, f = Math.max(Math.min(Math.sin(Math.max(l, .001) * Math.PI), Math.sin(Math.min(u, .999) * Math.PI)), .015), p = d ? 1 : Math.min(1, a / (U * f) + rn / i.columns);
	return Tr({
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
function Or(e, t) {
	let n = Z(e);
	return Z(n << t | n >>> 32 - t);
}
function kr(e, t, n) {
	let r = Z(e), i = Z(t), a = Z(n);
	return a = Z(a ^ i), a = Z(a - Or(i, 14)), r = Z(r ^ a), r = Z(r - Or(a, 11)), i = Z(i ^ r), i = Z(i - Or(r, 25)), a = Z(a ^ i), a = Z(a - Or(i, 16)), r = Z(r ^ a), r = Z(r - Or(a, 4)), i = Z(i ^ r), i = Z(i - Or(r, 14)), a = Z(a ^ i), a = Z(a - Or(i, 24)), a;
}
function Ar(e, t, n) {
	let r = Z(3735928584);
	return kr(Z(r + Z(e)), Z(r + Z(t)), Z(r + Z(n)));
}
function jr(e) {
	return e * e * e * (e * (e * 6 - 15) + 10);
}
function Mr(e, t, n, r) {
	let i = e & 15, a = i < 8 ? t : n, o = i < 4 ? n : i === 12 || i === 14 ? t : r;
	return (i & 1 ? -a : a) + (i & 2 ? -o : o);
}
function Nr(e, t, n, r, i, a, o, s, c, l, u) {
	let d = 1 - c, f = 1 - l;
	return (1 - u) * (f * (e * d + t * c) + l * (n * d + r * c)) + u * (f * (i * d + a * c) + l * (o * d + s * c));
}
function Pr(e) {
	let t = Math.floor(e[0]), n = Math.floor(e[1]), r = Math.floor(e[2]), i = e[0] - t, a = e[1] - n, o = e[2] - r, s = jr(i), c = jr(a), l = jr(o);
	return Nr(Mr(Ar(t, n, r), i, a, o), Mr(Ar(t + 1, n, r), i - 1, a, o), Mr(Ar(t, n + 1, r), i, a - 1, o), Mr(Ar(t + 1, n + 1, r), i - 1, a - 1, o), Mr(Ar(t, n, r + 1), i, a, o - 1), Mr(Ar(t + 1, n, r + 1), i - 1, a, o - 1), Mr(Ar(t, n + 1, r + 1), i, a - 1, o - 1), Mr(Ar(t + 1, n + 1, r + 1), i - 1, a - 1, o - 1), s, c, l) * .982;
}
function Fr(e, t, n, r) {
	let i = 0, a = .5, o = 0, s = Math.floor(z(t, 1, 8)), c = Math.max(n, .001), l = z(r, .001, .999), u = [...e];
	for (let e = 0; e < s; e += 1) {
		let e = Pr(u) * .5 + .5;
		i += a * e, o += a, u = X(u, c), a *= l;
	}
	return o <= 0 ? 0 : i / o;
}
function Ir(e, t, n) {
	return t <= 0 ? e : Rn([
		e[0] + Math.sin((e[1] * n + .23) * U) * Math.cos((e[2] * n + .41) * U) * t,
		e[1] + Math.cos((e[2] * n + .17) * U) * Math.sin((e[0] * n + .37) * U) * t,
		e[2] + Math.sin((e[0] * n - .31) * U) * Math.cos((e[1] * n + .29) * U) * t
	]);
}
function Lr(e) {
	let t = rr(e);
	return {
		anchors: t.anchors.map((e) => ({
			color: Ln(e.color),
			dir: Bn(e.x, e.y)
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
function Rr(e, t, n) {
	return 1 - sr(e, t, n);
}
function zr(e, t) {
	let n = Lr(t), r = Ir(e, n.warp.amp, n.warp.freq), i = [
		0,
		0,
		0
	], a = 0;
	return n.anchors.forEach((e) => {
		let t = 1 - z(cr(r, e.dir), -1, 1), o = n.blend === "gaussian" ? Math.exp(-(t * t) / Math.max(2 * n.sigma * n.sigma, 1e-4)) : 1 / (t + 1e-4) ** Math.max(n.power, 1e-4);
		i = Y(i, X(e.color, o)), a += o;
	}), a <= 0 ? [
		0,
		0,
		0
	] : X(i, 1 / a);
}
function Br(e, t) {
	let n = t.nebula, r = z(n.uOctaves, 1, 8), i = Y(X(e, Math.max(n.uColorWarpFreq, .001)), [
		n.uSeed,
		n.uSeed * .37,
		n.uSeed * -.21
	]), a = zr(Rn(Y(e, X([
		Fr(i, r, 2.02, .52) * 2 - 1,
		Fr(Y(i, [
			5.2,
			1.3,
			7.1
		]), r, 2.03, .5) * 2 - 1,
		Fr(Y(i, [
			9.1,
			8.4,
			2.8
		]), r, 2.01, .51) * 2 - 1
	], Math.max(n.uColorWarpAmp, 0)))), t.nebulaField), o = [
		n.uSeed * 13.17,
		n.uSeed * -7.31,
		n.uSeed * 5.19
	], s = Y(X(e, Math.max(n.uBaseScale, .001)), o), c = z(Fr(Y(s, X([
		Fr(s, r, 2.02, .5),
		Fr(Y(s, [
			5.2,
			1.3,
			2.8
		]), r, 2.02, .5),
		Fr(Y(s, [
			2.1,
			4.7,
			9.2
		]), r, 2.02, .5)
	], 3)), r, 2.02, .5)), l = z(sr(n.uCoverage, n.uCoverage + Math.max(n.uSoftness, .001), c)) ** Math.max(n.uContrast, .05), u = z(Math.max(a[0], a[1], a[2]) * Math.max(n.uLightIntensity, 0)) ** Math.max(n.uLightFocus, .001), d = X(or(a, n.uCloudHighlight), Math.max(n.uLightIntensity, 0));
	return Y([
		.004,
		.005,
		.011
	], X(X(Y(ar(ar(n.uCloudShadow, d, u), n.uCloudCore, z(l * .4)), X(a, u * (1 - l) * Math.max(n.uLightLining, 0) * Math.max(n.uLightIntensity, 0))), Math.max(n.uDensity, 0)).map((e) => Math.max(0, e) ** .92), z(l * n.uOpacity) * Math.max(n.uNebulaStrength, 0)));
}
function Vr(e) {
	return e < .5 ? ar([
		1,
		.55,
		.3
	], [
		1,
		.96,
		.92
	], e * 2) : ar([
		1,
		.96,
		.92
	], [
		.7,
		.8,
		1
	], (e - .5) * 2);
}
function Hr(e, t, n, r, i) {
	let a = (r * t + n) * 4;
	e[a] += i[0], e[a + 1] += i[1], e[a + 2] += i[2], e[a + 3] = Math.max(e[a + 3], Math.max(i[0], i[1], i[2]));
}
function Ur(e) {
	return e < 256 ? 1 : e < 2048 ? 2 : 1;
}
function Wr(e, t, n, r, i = r) {
	let a = Wn(t.clip), o = t.stars;
	if (o.uDensity <= 0 || o.uBright <= 0) return;
	let s = Er(o, a, i, { includeSeamCopies: !1 }), c = Math.PI / Math.max(1, i), l = Math.PI / yn, u = Math.PI / Math.max(1, r);
	s.forEach((t) => {
		let i = br(t.rSize, t.rSizeGate, o.uLargeStarRarity), s = t.rBright + (Math.max(t.rBright, i) - t.rBright) * Sn, d = t.rGlare + (Math.max(t.rGlare, i) - t.rGlare) * Cn, f = J(1, J(.1, 1, i), o.uSizeVar), p = o.uStarSize * f * l, m = o.uStarSize * f, h = Rr(gn, _n, m), g = mn * Math.max(c, l), _ = Math.max(c, l * .5), v = Math.max(p, J(g, _, h)), y = Math.max(p, l * .1), b = J(1, Math.max(.08, sr(0, gn, m)), Rr(gn * .75, gn, m)), x = Math.max(y * .45, u * .5), S = Math.max(v * .45, u), C = sr(_n, 1.75, m), ee = o.uGlareSize * J(1, f, o.uSizeVar) * l, w = Math.max(p + ee, hn * Math.max(c, l)), te = Math.max(p + ee, l * .1), T = Math.max(te * .36, u * .5), ne = Math.max(w * .36, u) * C * +(o.uGlareSize > 0 && o.uGlareStr > 0), E = Math.max(x, T) * vn, D = Math.ceil(Math.max(E, S * vn, ne * vn) / Math.PI * r), O = t.u * n, k = t.v * r, A = o.uBright * J(1, s ** 3 * 3, o.uBrightVar), j = o.uGlareStr * J(1, d ** 8, o.uGlareVar), re = Vr(J(.5, t.rColor, o.uColorVar)), M = Math.floor(O - D), ie = Math.ceil(O + D), ae = Math.max(0, Math.floor(k - D)), N = Math.min(r - 1, Math.ceil(k + D)), P = Math.max(Math.sin(t.v * Math.PI), .015);
		for (let i = ae; i <= N; i += 1) for (let o = M; o <= ie; o += 1) {
			let s = _r(o, n), c = (s + .5) / n, l = (i + .5) / r;
			if (!dr(c, l, a)) continue;
			let u = ur(c, t.u) * U * P, d = (l - t.v) * Math.PI, f = u * u + d * d, p = (Math.exp(-f / Math.max(x * x * 2, 1e-10)) * b + Math.exp(-f / Math.max(T * T * 2, 1e-10)) * C * j) * A;
			p <= 1e-6 || Hr(e, n, s, i, X(re, p));
		}
	});
}
function Gr(e, t, n, r) {
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
function Kr(e, t, n) {
	if (t.uDensity <= 0 || t.uBright <= 0) return [
		0,
		0,
		0
	];
	let r = Hn(e), i = yr(t), a = wr(t, n), o = a / Math.PI, s = z(r.v - o, 0, 1), c = z(r.v + o, 0, 1), l = vr(s), u = vr(c), d = Math.max(0, Math.floor(l * i.rows) - rn), f = Math.min(i.rows - 1, Math.floor(u * i.rows) + rn), p = Math.max(Math.sin(z(r.v, .001, .999) * Math.PI), .015), m = Math.min(1, a / (U * p) + rn / i.columns), h = Math.floor((r.u - m) * i.columns) - rn, g = Math.ceil((r.u + m) * i.columns) + rn, _ = Math.PI / Math.max(1, n), v = Math.PI / yn, y = [
		0,
		0,
		0
	];
	for (let n = d; n <= f; n += 1) for (let r = h; r <= g; r += 1) {
		let a = Sr(i, r, n, t.uLargeStarRarity);
		if (!a) continue;
		let o = br(a.rSize, a.rSizeGate, t.uLargeStarRarity), s = a.rBright + (Math.max(a.rBright, o) - a.rBright) * Sn, c = a.rGlare + (Math.max(a.rGlare, o) - a.rGlare) * Cn, l = J(1, J(.1, 1, o), t.uSizeVar), u = t.uStarSize * l * v, d = t.uStarSize * l, f = Math.max(u, v * .1), p = Math.max(f * .45, _ * .5), m = J(1, Math.max(.08, sr(0, gn, d)), Rr(gn * .75, gn, d)), h = sr(_n, 1.75, d), g = t.uGlareSize * J(1, l, t.uSizeVar) * v, b = Math.max(u + g, v * .1), x = Math.max(b * .36, _ * .5), S = lr(e[0] * a.x + e[1] * a.y + e[2] * a.z), C = Math.exp(-S / Math.max(p * p * 2, 1e-10)) * m, ee = t.uGlareStr * J(1, c ** 8, t.uGlareVar), w = Math.exp(-S / Math.max(x * x * 2, 1e-10)) * h * ee, te = t.uBright * J(1, s ** 3 * 3, t.uBrightVar), T = (C + w) * te;
		T <= 1e-6 || (y = Y(y, X(Vr(J(.5, a.rColor, t.uColorVar)), T)));
	}
	return y;
}
function qr(e, t, n = Math.floor(En / 2)) {
	let r = ir(t);
	if (!pr(e, r.clip)) return [
		0,
		0,
		0,
		0
	];
	let i = Zr(Br(e, r), Kr(e, r.stars, n), r.nebula.uNebulaExposure);
	return [
		i[0],
		i[1],
		i[2],
		1
	];
}
function Jr(e, t, n = {}) {
	return qr(e, t, n.sampleHeight);
}
function Yr(e, t, n, r = {}) {
	let i = ir(e), a = Pn(i.quality), o = Math.max(1, Math.floor(r.budgetBytes ?? a.budgetBytes)), s = Math.max(1, Math.floor(r.maxTextureSize ?? 8192)), c = er({
		accumulationBytes: r.accumulationBytes,
		budgetBytes: o,
		clip: i.clip,
		height: n,
		maxTextureSize: s,
		residentBytesPerPixel: r.residentBytesPerPixel,
		width: t
	});
	return ve(JSON.stringify({
		height: n,
		layout: {
			allocation: c.allocation,
			accumulationBytes: r.accumulationBytes ?? cn,
			columns: c.columns,
			contentHeight: c.contentHeight,
			contentWidth: c.contentWidth,
			coverage: c.coverage,
			guard: c.guard,
			maxTextureSize: s,
			qualityScale: c.qualityScale,
			rows: c.rows,
			residentBytesPerPixel: r.residentBytesPerPixel ?? ln,
			storageHeight: c.storageHeight,
			storageWidth: c.storageWidth,
			supersample: c.supersample
		},
		params: i,
		width: t
	}));
}
function Xr(e, t) {
	return e.map((e) => 1 - Math.exp(-Math.max(0, e) * Math.max(t, .001)));
}
function Zr(e, t, n) {
	let r = Xr(e, n), i = [
		.004,
		.005,
		.011
	], a = Xr(i, 1), o = Xr(Y(i, t), 1);
	return Y(r, [
		Math.max(o[0] - a[0], 0),
		Math.max(o[1] - a[1], 0),
		Math.max(o[2] - a[2], 0)
	]);
}
function Qr(e, t, n, r, i, a, o, s) {
	for (let c = 0; c < o; c += 1) {
		let l = (c + .5) / o * n - .5, u = Math.floor(l), d = Math.max(0, u), f = Math.min(n - 1, u + 1), p = l - u, m = d * t * 4, h = f * t * 4;
		for (let n = 0; n < a; n += 1) {
			let o = (c * a + n) * 4, l = (n + .5) / a * t - .5, u = Math.floor(l), d = u + 1, f = l - u, g = _r(u, t) * 4, _ = _r(d, t) * 4, v = m + g, y = m + _, b = h + g, x = h + _, S = J(J(e[v], e[y], f), J(e[b], e[x], f), p), C = J(J(e[v + 1], e[y + 1], f), J(e[b + 1], e[x + 1], f), p), ee = J(J(e[v + 2], e[y + 2], f), J(e[b + 2], e[x + 2], f), p), w = J(J(e[v + 3], e[y + 3], f), J(e[b + 3], e[x + 3], f), p), te = Math.max(r[o], r[o + 1], r[o + 2]);
			if (w <= 0 && te <= 0) {
				i[o] = 0, i[o + 1] = 0, i[o + 2] = 0, i[o + 3] = 0;
				continue;
			}
			let [T, ne, E] = pe(Zr([
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
function $r(e, t = En, n = Math.floor(t / 2)) {
	let r = ir(e), i = Pn(r.quality), a = Math.min(t, Tn), o = Math.max(1, Math.floor(a / 2)), s = er({
		budgetBytes: i.budgetBytes,
		clip: r.clip,
		height: o,
		maxTextureSize: En,
		residentBytesPerPixel: sn,
		width: a
	}), c = new Float32Array(a * o * 4), l = new Uint8ClampedArray(t * n * 4), u = Wn(r.clip), d = Ur(t), f = t * d, p = n * d, m = new Float32Array(f * p * 4);
	return s.descriptors.forEach((e) => {
		let t = fr(e.uvMin.x, e.uvSize.x, a), n = Math.max(0, Math.floor(e.uvMin.y * o)), i = Math.min(o - 1, Math.ceil((e.uvMin.y + e.uvSize.y) * o));
		for (let e = n; e <= i; e += 1) {
			let n = (e + .5) / o;
			t.forEach(({ end: t, start: i }) => {
				for (let o = i; o <= t; o += 1) {
					let t = (o + .5) / a;
					if (!dr(t, n, u)) continue;
					let i = Br(Bn(t, n), r), s = (e * a + o) * 4;
					c[s] = i[0], c[s + 1] = i[1], c[s + 2] = i[2], c[s + 3] = 1;
				}
			});
		}
	}), Wr(m, r, f, p, n), Qr(c, a, o, Gr(m, f, p, d), l, t, n, r), {
		data: l,
		height: n,
		width: t
	};
}
//#endregion
//#region layer-addons/builtins/starfield.ts
function ei(e, t, n, r = {}) {
	let i = r.starfieldBakes?.get(e);
	if (i) {
		let e = Hn(t), n = (e.u % 1 + 1) % 1 * i.width - .5, r = z(e.v, 0, 1) * i.height - .5, a = Math.floor(n), o = Math.floor(r), s = a + 1, c = o + 1, l = n - a, u = r - o;
		return De(De(Oe(i, a, o), Oe(i, s, o), l), De(Oe(i, a, c), Oe(i, s, c), l), u);
	}
	return Jr(t, n, { sampleHeight: r.sampleHeight });
}
function ti(e) {
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
function ni(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function ri(e, t, n) {
	let r = t.get(e.id);
	return r ? n === "wgsl" ? `effectColor = ${r.parameterName};` : `effectColor = texture2D(starfieldTexture${r.index}, directionToSourceStarfieldUv(direction));` : `effectColor = ${n === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function ii(e) {
	return e.map((e) => `uniform sampler2D starfieldTexture${e.index};`).join("\n");
}
function ai(e) {
	e.userData.starfieldRenderTarget || e.dispose();
}
function oi(e, t) {
	return e.get(t.id) ?? Ct;
}
function si(e, t) {
	return Object.fromEntries(e.map((e) => [`starfieldTexture${e.index}`, { value: oi(t, e.layer) }]));
}
function ci(e, t, n) {
	t.forEach((t) => {
		let r = `starfieldTexture${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = oi(n, t.layer));
	});
}
function li(e, t) {
	e.forEach((e, n) => {
		e.textureNode.value = t.get(n) ?? Ct;
	});
}
var ui = F("\n  fn skyboxStudioDirectionToSourceStarfieldUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let theta = atan2(normalizedDirection.x, normalizedDirection.z);\n    let u = fract(theta / 6.283185307179586 + 0.5);\n    let v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / 3.141592653589793;\n\n    return vec2<f32>(u, v);\n  }\n");
be({
	type: "starfield",
	sampleCpu: (e, t, n) => ei(n.layerId, e, t, {
		sampleHeight: n.sampleHeight,
		starfieldBakes: n.starfieldBakes
	}),
	updateLive: (e, t) => {
		e.applyLayerParams(t), e.scheduleResourceBake(t.id, t.params);
	},
	wgsl: {
		collect: ti,
		createParameterDeclarations: (e) => e.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join(""),
		createSampleExpression: (e, t, n) => {
			let r = n.bindingsByLayerId.get(e.id);
			return r ? `effectColor = ${r.parameterName};` : Ne(t);
		},
		createSampleNodes: ({ bindings: e, direction: t, imageTextures: n }) => {
			let r = n, i = /* @__PURE__ */ new Map(), a = Object.fromEntries(e.map((e) => {
				let n = ui({ direction: t }), a = A(oi(r, e.layer), n).setName(`starfieldTexture${e.index}`);
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
	},
	getTopologyKey: () => ({}),
	glsl: {
		collectBindings: (e) => ti(e),
		createBindingMap: (e) => ni(e),
		uniformDeclarations: (e) => ii(e),
		shaderUniforms: (e, t) => si(e, t.starfieldTextures),
		sampleExpression: (e, t, n) => ri(e, t, n)
	}
});
//#endregion
//#region evaluator.ts
function di(e, t, n = {}) {
	let r = xe(t.type);
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
function fi(e, t, n = {}) {
	return t.filter((e) => e.enabled).reverse().reduce((t, r) => {
		let i = r.type === "group" ? [...fi(e, r.children, n), 1] : di(e, r, n), a = z(i[3] * (r.opacity / 100));
		return _e(t, [
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
function pi(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = pi(n.children, t);
		if (e) return e;
	}
	return null;
}
function mi(e, t, n = {}) {
	let r = L(e), i = n.targetGroupId ? pi(r.nodes, n.targetGroupId) : null;
	return fi(t, n.targetGroupId ? i ? [i] : [] : r.nodes, n);
}
//#endregion
//#region bake.ts
var hi = 1024, gi = "0.1.0", _i = /* @__PURE__ */ new Map(), vi = /* @__PURE__ */ new Map();
function yi(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function bi(e, t) {
	return ve(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: gi
	}));
}
function xi() {
	_i.clear(), vi.clear();
}
function Si(e, t = []) {
	return e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				Si(e.children, t);
				return;
			}
			e.type === "starfield" && t.push(e);
		}
	}), t;
}
function Ci(e, t) {
	for (let n of e) {
		if (n.type !== "group") continue;
		if (n.id === t) return n;
		let e = Ci(n.children, t);
		if (e) return e;
	}
	return null;
}
function wi(e, t, n, r, i) {
	let a = Si(r ? Ci(e.nodes, r)?.children ?? [] : e.nodes);
	if (a.length === 0) return;
	let o = /* @__PURE__ */ new Map();
	return a.forEach((e) => {
		let r = i?.get(e.id);
		if (r) {
			o.set(e.id, r);
			return;
		}
		let a = Yr(e.params, t, n), s = vi.get(a), c = s ?? $r(e.params, t, n);
		s || vi.set(a, c), o.set(e.id, c);
	}), o;
}
function Ti(e, t = {}) {
	let n = L(e), r = yi(t), i = r.cache ? bi(n, r) : null;
	if (i) {
		let e = _i.get(i);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: a, targetGroupId: o, width: s } = r, c = wi(n, s, a, o, t.starfieldBakes), l = new Uint8ClampedArray(s * a * 4);
	for (let e = 0; e < a; e += 1) {
		let t = (e + .5) / a;
		for (let r = 0; r < s; r += 1) {
			let [i, u, d] = pe(mi(n, Ee((r + .5) / s, t), {
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
	return i && _i.set(i, {
		...u,
		data: new Uint8ClampedArray(l)
	}), u;
}
//#endregion
//#region skybox/composition.ts
function Ei(e) {
	return e.filter((e) => e.enabled).reverse();
}
function Di(e) {
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
function Oi(e) {
	return {
		blendMode: Di(e.blendMode),
		opacity: z(e.opacity / 100)
	};
}
var ki = /* @__PURE__ */ new Map();
function Ai(e, t, n) {
	let r = xe(e.type);
	return r?.glsl ? r.glsl.sampleExpression(e, n.get(e.type) ?? ki, t) : Ne(t);
}
function ji(e, t) {
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
	let n = Ae(1, t), r = Ae(.5, t), i = Ae(0, t), a = "effectColor.rgb", o = "composedColor";
	switch (e) {
		case "darken": return `min(${o}, ${a})`;
		case "multiply": return `${o} * ${a}`;
		case "color-burn": return Me(`${o} == ${n}`, n, Me(`${a} == ${i}`, i, `${n} - min(${n}, (${n} - ${o}) / ${a})`, t), t);
		case "lighten": return `max(${o}, ${a})`;
		case "screen": return `${o} + ${a} - ${o} * ${a}`;
		case "color-dodge": return Me(`${o} == ${i}`, i, Me(`${a} == ${n}`, n, `min(${n}, ${o} / (${n} - ${a}))`, t), t);
		case "overlay": return Me(`${o} <= ${r}`, `2.0 * ${o} * ${a}`, `${n} - 2.0 * (${n} - ${o}) * (${n} - ${a})`, t);
		case "soft-light": return Me(`${a} <= ${r}`, `${o} - (${n} - 2.0 * ${a}) * ${o} * (${n} - ${o})`, `${o} + (2.0 * ${a} - ${n}) * (softLightD - ${o})`, t);
		case "hard-light": return Me(`${a} <= ${r}`, `2.0 * ${o} * ${a}`, `${o} + (2.0 * ${a} - ${n}) - ${o} * (2.0 * ${a} - ${n})`, t);
		case "difference": return `abs(${o} - ${a})`;
		case "exclusion": return `${o} + ${a} - 2.0 * ${o} * ${a}`;
		default: return a;
	}
}
function Mi(e) {
	if (e === "glsl") return "";
	let t = e === "wgsl" ? "vec3<f32>" : "vec3";
	return `${e === "wgsl" ? "let" : "vec3"} softLightD = ${Me(`composedColor <= ${t}(0.25)`, `((16.0 * composedColor - ${t}(12.0)) * composedColor + ${t}(4.0)) * composedColor`, "sqrt(composedColor)", e)};`;
}
function Ni(e, t) {
	let n = Di(t);
	return `${e} >= ${B(n - .5)} && ${e} < ${B(n + .5)}`;
}
function Pi(e, t) {
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
	].map((n, r) => `${r === 0 ? "if" : "else if"} (${Ni(e, n)}) {
          blendedColor = ${ji(n, t)};
        }`).join("\n");
	return `${Mi(t)}
        ${je("blendedColor", n, "effectColor.rgb", t)}
        ${r}
        blendedColor = clamp(blendedColor, ${n}(0.0), ${n}(1.0));`;
}
function Fi(e, t, n, r, i, a = 0) {
	let o = t === "wgsl" ? "vec3<f32>" : "vec3", s = t === "wgsl" ? "vec4<f32>" : "vec4";
	return Ei(e).map((e, c) => {
		let l = e.type === "group" ? `effectColor = ${s}(${`groupColor${a}_${c}`}, 1.0);` : t === "wgsl" && i ? Li(e, i) : Ai(e, t, n), u = `groupColor${a}_${c}`, d = r.get(e.id), f = d ? `${d.parameterPrefix}Opacity` : B(e.opacity / 100), p = d ? `${d.parameterPrefix}BlendMode` : B(Di(e.blendMode));
		return `{
        ${e.type === "group" ? `${je(u, o, `${o}(0.0)`, t)}
        {
          ${je("previousComposedColor", o, "composedColor", t)}
          composedColor = ${o}(0.0);
          ${Fi(e.children, t, n, r, i, a + 1)}
          ${u} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${je("effectColor", s, `${s}(0.0)`, t)}
        ${l}
        ${t === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${f}, 0.0, 1.0);
        ${Pi(p, t)}
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          ${o}(0.0),
          ${o}(1.0)
        );
      }`;
	}).join("\n");
}
function Ii(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function Li(e, t) {
	let n = t.adapters.get(e.type);
	return n ? n.adapter.createSampleExpression(e, "wgsl", { bindingsByLayerId: n.bindingsByLayerId }) : Ne("wgsl");
}
//#endregion
//#region skybox/equirect.ts
function Ri() {
	return "\n      const float SKYBOX_STUDIO_PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.x, -normalizedDirection.z);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * SKYBOX_STUDIO_PI) + 0.5, latitude / SKYBOX_STUDIO_PI + 0.5);\n      }\n\n      vec2 directionToSourceStarfieldUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float theta = atan(normalizedDirection.x, normalizedDirection.z);\n        float u = fract(theta / (2.0 * SKYBOX_STUDIO_PI) + 0.5);\n        float v = acos(clamp(normalizedDirection.y, -1.0, 1.0)) / SKYBOX_STUDIO_PI;\n\n        return vec2(u, v);\n      }\n    ";
}
//#endregion
//#region skybox/materials.ts
function zi(e) {
	return e.map((e) => {
		let t = Oi(e.node);
		return {
			blendMode: j(t.blendMode),
			nodeId: e.node.id,
			opacity: j(t.opacity)
		};
	});
}
function Bi(e, t) {
	for (let n of e) if (n.enabled) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = Bi(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
function Vi(e, t) {
	e.forEach((e) => {
		let n = Bi(t.nodes, e.nodeId);
		if (!n) return;
		let r = Oi(n);
		e.opacity.value = r.opacity, e.blendMode.value = r.blendMode;
	});
}
function Hi(e, t) {
	let n = e.find((e) => e.nodeId === t.id);
	if (!n) return;
	let r = Oi(t);
	n.opacity.value = r.opacity, n.blendMode.value = r.blendMode;
}
function Ui(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = Oi(e.node);
		return [[`${e.parameterPrefix}Opacity`, { value: t.opacity }], [`${e.parameterPrefix}BlendMode`, { value: t.blendMode }]];
	}));
}
function Wi(e, t, n) {
	t.forEach((t) => {
		let r = Bi(n.nodes, t.node.id);
		if (!r) return;
		let i = Oi(r), a = e.uniforms[`${t.parameterPrefix}Opacity`], o = e.uniforms[`${t.parameterPrefix}BlendMode`];
		a && (a.value = i.opacity), o && (o.value = i.blendMode);
	});
}
function Gi(e, t, n) {
	let r = t.find((e) => e.node.id === n.id);
	if (!r) return;
	let i = Oi(n), a = e.uniforms[`${r.parameterPrefix}Opacity`], o = e.uniforms[`${r.parameterPrefix}BlendMode`];
	a && (a.value = i.opacity), o && (o.value = i.blendMode);
}
function Ki(e, t) {
	e.userData.applyCompositionParams = t;
}
function qi(e, t) {
	e.userData.applyLayerComposition = t;
}
function Ji(e) {
	let t = [];
	function n(e) {
		Ei(e).forEach((e) => {
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
function Yi(e) {
	return new Map(e.map((e) => [e.node.id, e]));
}
function Xi() {
	return Se().map((e) => e.wgsl).filter((e) => !!e);
}
function Zi(e, t, n, r, i) {
	let a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = {}, c = {};
	return Xi().forEach((i) => {
		let l = i.collect(e.nodes), u = i.createUniforms(l), d = i.createSampleNodes?.({
			bindings: l,
			direction: t,
			imageTextures: i.type === "starfield" ? r : n,
			uniforms: u
		}), f = {
			adapter: i,
			bindings: l,
			bindingsByLayerId: Ii(l),
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
function Qi(e, t) {
	return e.adapters.get(t);
}
function $i(e, t) {
	e.forEach((e) => {
		if (e.enabled) {
			if (e.type === "group") {
				$i(e.children, t);
				return;
			}
			t(e);
		}
	});
}
function ea(e, t) {
	let n = e.adapters.get(t.type);
	n && n.adapter.updateUniforms(n.uniforms, t);
}
function ta(e, t, n) {
	let r = Yi(n), i = Fi(e.nodes, "wgsl", /* @__PURE__ */ new Map(), r, t);
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
function na(e, t, n, r, i) {
	let a = Ji(e.nodes), o = zi(a), s = Zi(e, t, n, r, i), c = Qi(s, "image"), l = c?.uniforms ?? [], u = c?.samples, d = Qi(s, "starfield")?.samples;
	return {
		colorNode: ta(e, s, a)({
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
function ra() {
	let e = ne.mul(2).sub(1), t = u.mul(oe(e.x, e.y.negate(), 1, 1)), n = t.xyz.div(t.w), r = d.mul(oe(n, 0)).xyz;
	return w(r);
}
function ia(t, i, a, o, s, c) {
	let l = new n(), u = r(() => {
		let e = C;
		return e.z.assign(e.w), e;
	})();
	l.side = e.BackSide, l.depthTest = !1, l.depthWrite = !1, l.vertexNode = u;
	let { colorNode: d, compositionUniforms: f, imageSamples: p, imageUniforms: m, layerRuntime: h, starfieldSamples: g } = na(t, ra(), a, o, s), _ = c ? Se().flatMap((e) => {
		let t = h.adapters.get(e.type);
		if (!e.wgslEditorOverlay || !t) return [];
		let n = t.bindings;
		return [{
			bindings: n,
			editorUniforms: gt(n, i)
		}];
	}) : [], v = d;
	return _.forEach(({ bindings: e, editorUniforms: t }) => {
		e.forEach((e, n) => {
			let r = h.editorProjectionByLayerId.get(e.layer.id);
			r && (v = xt({
				color: v,
				activeValue: t[n].active,
				uv: r.uv,
				valid: r.valid
			}));
		});
	}), l.colorNode = v, _.length > 0 && bt(l, (e) => {
		_.forEach(({ editorUniforms: t }) => _t(t, e));
	}), l.userData.webGpuLayerRuntime = h, l.userData.applyLayerParams = (e) => ea(h, e), Ki(l, (e) => Vi(f, e)), qi(l, (e) => Hi(f, e)), At(l, (e, t) => Dt(m, e, t)), l.userData.applyImageTextures = (e) => Ht(p?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.applyStarfieldTextures = (e) => li(g?.sampleData ?? /* @__PURE__ */ new Map(), e), l.userData.debugImageTextureSlots = h.textureSlotsByLayerId, l;
}
var aa = F("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.x, -normalizedDirection.z);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n"), oa = F("\n  fn skyboxStudioEquirectUvToDirection(uv: vec2<f32>) -> vec3<f32> {\n    let lambda = (uv.x - 0.5) * 6.283185307179586;\n    let phi = (uv.y - 0.5) * 3.141592653589793;\n    let cosPhi = cos(phi);\n\n    return normalize(vec3<f32>(cosPhi * sin(lambda), sin(phi), -cosPhi * cos(lambda)));\n  }\n");
function sa(t, r, i, a = {}) {
	let o = new n();
	o.side = e.DoubleSide, o.depthTest = !1, o.depthWrite = !1;
	let s = te.xy.mul(.5).add(.5), { colorNode: c } = na(t, w(oa({ uv: a.flipY ? N(s.x, s.y.oneMinus()) : s })), r, i, /* @__PURE__ */ new Map());
	return o.colorNode = c, o;
}
function ca(t) {
	let i = new n(), a = r(() => {
		let e = C;
		return e.z.assign(e.w), e;
	})(), o = ra();
	return i.side = e.BackSide, i.depthTest = !1, i.depthWrite = !1, i.vertexNode = a, i.colorNode = A(t, aa({ direction: o })), i;
}
function la(t, n, r, i, a) {
	let o = Ji(t.nodes), s = Yi(o), c = {
		editorPresentationEnabled: a,
		editorLayerState: n,
		imageTextures: r,
		starfieldTextures: i
	}, l = Se().flatMap((e) => e.glsl ? [{
		type: e.type,
		glsl: e.glsl,
		bindings: e.glsl.collectBindings(t.nodes)
	}] : []), u = l.find((e) => e.type === "image")?.bindings ?? [], d = l.find((e) => e.type === "spot")?.bindings ?? [], f = l.find((e) => e.type === "starfield")?.bindings ?? [], p = new Map(l.map((e) => [e.type, e.glsl.createBindingMap(e.bindings)])), m = Object.assign({}, ...l.map((e) => e.glsl.shaderUniforms(e.bindings, c))), h = l.map((e) => e.glsl.uniformDeclarations(e.bindings, c)).join("\n"), g = l.map((e) => e.glsl.fragmentHelpers?.(e.bindings) ?? "").join("\n"), _ = a ? l.map((e) => e.glsl.editorOverlayExpression?.(e.bindings, c) ?? "").join("\n") : "", v = l.some((e) => !!e.glsl.fragmentHelpers && e.bindings.length > 0 || a && !!e.glsl.editorOverlayExpression && e.bindings.length > 0), y = Fi(t.nodes, "glsl", p, s), b = new e.ShaderMaterial({
		uniforms: {
			...m,
			...Ui(o)
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
      ${Ri()}
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
	return v && (b.extensions.derivatives = !0), a && bt(b, (e) => yt(b, u, d, e)), Ki(b, (e) => Wi(b, o, e)), qi(b, (e) => Gi(b, o, e)), At(b, (e, t) => kt(b, u, e, t)), b.userData.applyImageTextures = (e) => Vt(b, u, e), b.userData.applyStarfieldTextures = (e) => ci(b, f, e), b.userData.applyLayerParams = (e) => {
		let t = l.find((t) => t.type === e.type);
		t?.glsl.applyParams?.(b, e, t.bindings);
	}, b;
}
function ua(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function da(t, n = {}) {
	let r = Ti(t, n), i = ua(r.width, r.height), a = i.getContext("2d");
	if (!a || !("putImageData" in a)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	a.putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
	let o = new e.CanvasTexture(i);
	return o.mapping = e.EquirectangularReflectionMapping, o.wrapS = e.RepeatWrapping, o.wrapT = e.ClampToEdgeWrapping, o.colorSpace = e.SRGBColorSpace, o.flipY = !1, o.needsUpdate = !0, o;
}
function fa(t) {
	return new e.ShaderMaterial({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		uniforms: { skyboxTexture: { value: t } },
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: "\n      precision highp float;\n      uniform sampler2D skyboxTexture;\n      varying vec3 vDirection;\n\n      const float PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.x, -normalizedDirection.z);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);\n      }\n\n      void main() {\n        vec3 direction = normalize(vDirection);\n        vec4 sampledColor = texture2D(skyboxTexture, directionToEquirectUv(direction));\n        gl_FragColor = vec4(sampledColor.rgb, sampledColor.a);\n      }\n    "
	});
}
function pa(e, t) {
	return ma(t) ? ca(e) : fa(e);
}
function ma(e) {
	return !!(e && "isWebGPURenderer" in e && e.isWebGPURenderer);
}
function ha(e, t) {
	return e === "auto" ? ma(t) ? "live-webgpu" : "live-webgl" : e;
}
function ga(e, t, n) {
	let r = (e) => e.type === "group" ? {
		children: e.children.map(r),
		enabled: e.enabled,
		id: e.id,
		type: e.type
	} : {
		enabled: e.enabled,
		id: e.id,
		topology: xe(e.type)?.getTopologyKey?.(e) ?? null,
		type: e.type
	};
	return JSON.stringify({
		editorPresentationEnabled: n,
		geometry: e.geometry?.type ?? I.type,
		nodes: e.nodes.map(r),
		renderMode: t
	});
}
function _a(e, t) {
	for (let n of e) {
		if (n.id === t) return n;
		if (n.type === "group") {
			let e = _a(n.children, t);
			if (e) return e;
		}
	}
	return null;
}
//#endregion
//#region starfield-gpu-bake.ts
Math.PI * 2;
var va = 8, ya = En / 2, ba = 1.75, xa = 3.25, Sa = 1, Ca = 1.5, wa = 8, Ta = .1, Ea = 5, Da = 12, Oa = .35, ka = .25, Aa = 1.0005, ja = 32, Ma = new Float32Array([
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
function Na(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function Pa(e) {
	let t = e.backend, n = t?.device, r = t?.gl;
	return typeof n?.limits?.maxTextureDimension2D == "number" ? n.limits.maxTextureDimension2D : r ? Number(r.getParameter(r.MAX_TEXTURE_SIZE)) : En;
}
function Q(e, t) {
	let n = e[t];
	if (n?.isUniformNode) return n;
	let r = j(Number(n?.value ?? 0));
	return e[t] = r, r;
}
function $(t, n) {
	let r = t[n], i = r?.value instanceof e.Vector2 ? r.value.clone() : new e.Vector2();
	if (r?.isUniformNode) return r;
	let a = j(i);
	return t[n] = a, a;
}
function Fa(t, n) {
	let r = t[n], i = r?.value instanceof e.Vector3 ? r.value.clone() : new e.Vector3();
	if (r?.isUniformNode) return r;
	let a = j(i);
	return t[n] = a, a;
}
function Ia(e) {
	let t = e.x.sub(.5).mul(o).mul(2), n = e.y.mul(o), r = D(n);
	return w(P(r.mul(D(t)), p(n), r.mul(p(t))));
}
function La(e) {
	let t = S(e.y, 2), n = k(1, t);
	return N(e.x.add(n.mul(.5)), x(t, g(2).sub(t), n));
}
function Ra(e) {
	return Ia(La(e));
}
function za(e) {
	let t = w(e);
	return N(c(t.x, t.z).div(o.mul(2)).add(.5), s(f(t.y, -1, 1)).div(o));
}
function Ba(e, t) {
	return o.mul(y(t.y, 1e-6)).div(y(e.y, 1));
}
function Va(e, t) {
	return y(y(e.negate(), e.sub(t)), 0);
}
function Ha(e, t, n) {
	let r = e.sub(t), i = r.add(1), a = r.sub(1), o = Va(r, n), s = Va(i, n), c = Va(a, n);
	return E(s.lessThan(o).and(s.lessThanEqual(c)), i, E(c.lessThan(o).and(c.lessThan(s)), a, r));
}
function Ua(e, t, n) {
	return N(Ha(e.x, t.x, n.x).div(n.x), e.y.sub(t.y).div(n.y));
}
function Wa(e) {
	return k(0, e.x).mul(k(e.x, 1)).mul(k(0, e.y)).mul(k(e.y, 1));
}
function Ga(e) {
	let t = P(1, .55, .3), n = P(1, .96, .92), r = P(.7, .8, 1);
	return E(e.lessThan(.5), x(t, n, e.mul(2)), x(n, r, e.sub(.5).mul(2)));
}
function Ka(e, t, n) {
	let r = T(f(e, 0, 1), Ea), i = x(1, T(f(t, 0, 1), Da), n);
	return r.mul(i);
}
function qa(e, t, n, r) {
	return x(1, x(Ta, 1, Ka(e, t, n)), r);
}
function Ja(e, t, n, r) {
	let o = f(t, 1, 8), s = y(n, .001), c = f(r, .001, .999), l = P(e).toVar(), u = g(.5).toVar(), d = g(0).toVar(), p = g(0).toVar();
	return a(8, ({ i: e }) => {
		i(g(e).lessThan(o), () => {
			let e = ee(l, v(1), s, c).mul(.5).add(.5);
			d.addAssign(u.mul(e)), p.addAssign(u), l.mulAssign(s), u.mulAssign(c);
		});
	}), d.div(y(p, 1e-4));
}
function Ya(n, o) {
	let s = Lr(n.nebulaField), c = Array.from({ length: va }, (t, n) => {
		let r = s.anchors[n];
		return new e.Vector3(...r?.dir ?? [
			0,
			1,
			0
		]);
	}), l = Array.from({ length: va }, (t, n) => {
		let r = s.anchors[n];
		return new e.Vector3(...r?.color ?? [
			0,
			0,
			0
		]);
	}), u = n.nebula, d = {
		uAnchorCount: { value: Math.min(s.anchors.length, va) },
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
	}, p = $(d, "uTileUvMin"), _ = $(d, "uTileUvSize"), v = Q(d, "uAnchorCount"), b = Q(d, "uBlend"), S = Q(d, "uPower"), C = Q(d, "uSigma"), ee = Q(d, "uColorWarpAmp"), ne = Q(d, "uColorWarpFreq"), D = Q(d, "uSeed"), k = Q(d, "uCoverage"), A = Q(d, "uDensity"), j = Q(d, "uSoftness"), M = Q(d, "uContrast"), ie = Q(d, "uBaseScale"), ae = Q(d, "uOctaves"), N = Q(d, "uOpacity"), F = Q(d, "uLightFocus"), I = Q(d, "uLightLining"), L = Q(d, "uLightIntensity");
	Q(d, "uNebulaExposure");
	let R = Q(d, "uNebulaStrength"), se = Fa(d, "uCloudShadow"), ce = Fa(d, "uCloudHighlight"), le = Fa(d, "uCloudCore"), z = re(c, "vec3"), ue = re(l, "vec3"), de = new t({
		depthTest: !1,
		depthWrite: !1
	});
	return de.uniforms = d, de.colorNode = r(() => {
		let e = te.xy.mul(.5).add(.5), t = Ra(p.add(e.mul(_))), n = f(ae, 1, 8), r = t.mul(y(ne, .001)).add(P(D, D.mul(.37), D.mul(-.21))), o = P(Ja(r, n, 2.02, .52), Ja(r.add(P(5.2, 1.3, 7.1)), n, 2.03, .5), Ja(r.add(P(9.1, 8.4, 2.8)), n, 2.01, .51)).mul(2).sub(1), s = w(t.add(o.mul(y(ee, 0)))), c = P(0).toVar(), l = g(0).toVar();
		a(va, ({ i: e }) => {
			i(g(e).lessThan(v), () => {
				let t = w(z.element(e)), n = ue.element(e), r = g(1).sub(m(s, t)), i = g(1).div(T(r.add(1e-4), y(S, 1e-4))), a = h(r.mul(r).negate().div(y(1e-4, g(2).mul(C).mul(C)))), o = E(b.lessThan(.5), i, a);
				c.addAssign(n.mul(o)), l.addAssign(o);
			});
		}), c.assign(c.div(y(l, 1e-4)));
		let u = P(D.mul(13.17), D.mul(-7.31), D.mul(5.19)), d = t.mul(y(ie, .001)).add(u), re = P(Ja(d, n, 2.02, .5), Ja(d.add(P(5.2, 1.3, 2.8)), n, 2.02, .5), Ja(d.add(P(2.1, 4.7, 9.2)), n, 2.02, .5)), de = f(Ja(d.add(re.mul(3)), n, 2.02, .5), 0, 1), fe = T(f(O(k, k.add(y(j, .001)), de), 0, 1), y(M, .05)), pe = T(f(y(y(c.r, c.g), c.b).mul(y(L, 0)), 0, 1), y(F, .001)), me = T(y(x(x(se, c.mul(ce).mul(y(L, 0)), pe), le, f(fe.mul(.4), 0, 1)).add(c.mul(pe).mul(fe.oneMinus()).mul(y(I, 0)).mul(y(L, 0))).mul(y(A, 0)), P(0)), P(.92)), he = f(fe.mul(N), 0, 1);
		return oe(y(P(.004, .005, .011).add(me.mul(he).mul(y(R, 0))), P(0)), 1);
	})(), de;
}
function Xa(t, n, r) {
	let i = Dr(t.stars, n, r, { includeSeamCopies: !0 }), a = [], o = [], s = [], c = [], l = [];
	i.forEach((e) => {
		a.push(e.x, e.y, e.z), o.push(e.u, e.v), s.push(e.rSize, e.rBright, e.rGlare, e.rColor), c.push(e.rSizeGate), l.push(e.classId);
	});
	let u = new e.InstancedBufferGeometry();
	return u.setAttribute("position", new e.BufferAttribute(Ma, 3)), u.setAttribute("iDirection", new e.InstancedBufferAttribute(new Float32Array(a), 3)), u.setAttribute("iUv", new e.InstancedBufferAttribute(new Float32Array(o), 2)), u.setAttribute("iRandoms", new e.InstancedBufferAttribute(new Float32Array(s), 4)), u.setAttribute("iSizeGate", new e.InstancedBufferAttribute(new Float32Array(c), 1)), u.setAttribute("iClass", new e.InstancedBufferAttribute(new Float32Array(l), 1)), u.instanceCount = l.length, u;
}
function Za(n, i, a = {}) {
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
		uDisplayPixelAngle: { value: a.displayPixelAngle ?? Math.PI / ya },
		uScreenPixelScale: { value: a.screenPixelScale ?? 1 },
		uSizeVar: { value: c.uSizeVar },
		uStarSize: { value: c.uStarSize },
		uTileUvMin: { value: new e.Vector2(i.storageUvMin.x, i.storageUvMin.y) },
		uTileUvSize: { value: new e.Vector2(i.storageUvSize.x, i.storageUvSize.y) }
	}, _ = $(p, "uBakeSize"), v = $(p, "uTileUvMin"), S = $(p, "uTileUvSize"), C = Q(p, "uDisplayPixelAngle"), ee = Q(p, "uScreenPixelScale"), ne = Q(p, "uStarSize"), E = Q(p, "uSizeVar"), A = Q(p, "uLargeStarRarity"), j = Q(p, "uBright"), re = Q(p, "uBrightVar"), M = Q(p, "uGlareSize"), ie = Q(p, "uGlareStr"), P = Q(p, "uGlareVar"), F = Q(p, "uColorVar"), I = ae("vec2", "vStarBakeUv"), L = ae("vec3", "vStarBakeDirection"), R = ae("vec4", "vStarBakeRandoms"), se = ae("float", "vStarBakeSizeGate"), ce = new t({
		blending: e.AdditiveBlending,
		depthTest: !1,
		depthWrite: !1,
		transparent: !0
	});
	return ce.uniforms = p, ce.vertexNode = r(() => {
		let e = l("iDirection", "vec3"), t = l("iUv", "vec2"), n = l("iRandoms", "vec4"), r = l("iSizeGate", "float"), i = Ba(_, S), a = qa(n.x, r, A, E), s = ne.mul(a).mul(C), c = O(Sa, Ca, ne.mul(a).mul(ee)).oneMinus(), u = y(y(s, x(g(ba).mul(C), C.mul(.5), c)).mul(.45), C.mul(.5)), d = M.mul(x(1, a, E)).mul(C), f = y(y(u, y(y(s.add(d), g(xa).mul(C)).mul(.36), C.mul(.5)).mul(k(1e-6, M)).mul(k(1e-6, ie))), i).mul(wa), p = y(D(t.y.mul(o)), .015), m = N(b(1.5, f.div(o.mul(2).mul(p))), f.div(o)), h = t.add(te.xy.mul(m)), w = h.sub(v).div(S);
		return I.assign(h), L.assign(e), R.assign(n), se.assign(r), oe(w.mul(2).sub(1), 0, 1);
	})(), ce.colorNode = r(() => {
		let e = s(f(m(Ra(I), w(L)), -1, 1)), t = Ka(R.x, se, A), n = qa(R.x, se, A, E), r = ne.mul(n).mul(C), i = ne.mul(n).mul(ee), a = O(Sa * .75, Sa, i).oneMinus(), o = O(Ca, 1.75, i), c = y(r, C.mul(.1)), l = x(1, y(.08, O(0, Sa, i)), a), u = y(c.mul(.45), C.mul(.5)), d = h(e.mul(e).negate().div(y(u.mul(u).mul(2), 1e-10))).mul(l), p = M.mul(x(1, n, E)).mul(C), g = y(y(r.add(p), C.mul(.1)).mul(.36), C.mul(.5)), _ = h(e.mul(e).negate().div(y(g.mul(g).mul(2), 1e-10))).mul(o).mul(k(1e-6, M)).mul(k(1e-6, ie)), v = x(R.y, y(R.y, t), E.mul(Oa)), b = x(R.z, y(R.z, t), E.mul(ka)), S = ie.mul(x(1, T(b, 8), P)), te = j.mul(x(1, T(v, 3).mul(3), re));
		return oe(Ga(x(.5, R.w, F)).mul(d.add(_.mul(S))).mul(te), 1);
	})(), ce;
}
function Qa(n, o, s, c, l, u) {
	let d = {
		uExposure: { value: 1 },
		uSourcePerTarget: { value: u },
		uSourceSize: { value: new e.Vector2(o, s) },
		uSourceTexture: { value: n },
		uTargetSize: { value: new e.Vector2(c, l) }
	}, p = M(n), m = $(d, "uSourceSize"), v = $(d, "uTargetSize"), b = Q(d, "uSourcePerTarget"), x = Q(d, "uExposure"), S = new t({
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
function $a(n, i, o, s) {
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
	}, l = M(n), u = M(i), d = $(c, "uContentUvMin"), p = $(c, "uContentUvSize"), m = $(c, "uStorageUvMin"), _ = $(c, "uStorageUvSize"), v = Q(c, "uHasLeftNeighbor"), b = Q(c, "uHasRightNeighbor"), S = Q(c, "uHasTopNeighbor"), C = Q(c, "uHasBottomNeighbor"), ee = Q(c, "uNebulaExposure"), w = new t({
		depthTest: !1,
		depthWrite: !1,
		transparent: !0
	}), T = +(o.uvSize.x >= .999), ne = .28;
	return w.blending = e.CustomBlending, w.blendEquation = e.AddEquation, w.blendSrc = e.OneFactor, w.blendDst = e.OneFactor, w.blendEquationAlpha = e.AddEquation, w.blendSrcAlpha = e.OneFactor, w.blendDstAlpha = e.OneMinusSrcAlphaFactor, c.uNebulaTexture = l, c.uStarTexture = u, w.uniforms = c, w.colorNode = r(() => {
		let e = te.xy.mul(.5).add(.5), t = N(e.x, g(1).sub(e.y)), n = y(g(1).sub(O(0, ne, t.y)), g(1).sub(O(0, ne, g(1).sub(t.y)))).mul(T), r = Ua(t, m, _), i = f(r, 0, 1), o = Wa(r), s = N(Ha(t.x, d.x, p.x).div(p.x), t.y.sub(d.y).div(p.y)), c = y(_.sub(p).div(p.mul(2)), N(0)), w = y(c, N(1e-6)), D = E(v.greaterThan(.5), O(w.x.negate(), w.x, s.x), 1), k = E(b.greaterThan(.5), g(1).sub(O(g(1).sub(w.x), g(1).add(w.x), s.x)), 1), j = E(c.x.lessThanEqual(0), 1, D.mul(k)), re = E(S.greaterThan(.5), O(w.y.negate(), w.y, s.y), 1), M = E(C.greaterThan(.5), g(1).sub(O(g(1).sub(w.y), g(1).add(w.y), s.y)), 1), ie = E(c.y.lessThanEqual(0), 1, re.mul(M)), ae = f(j.mul(ie).mul(o), 0, 1), F = A(l, i).rgb, I = P(0).toVar(), L = g(0).toVar();
		a(32, ({ i: e }) => {
			let n = Ua(N(g(e).add(.5).div(32), t.y), m, _), r = f(n, 0, 1), i = Wa(n);
			I.addAssign(A(l, r).rgb.mul(i)), L.addAssign(i);
		});
		let R = x(F, I.div(y(L, 1)), n), se = A(u, i);
		return oe(P(1).sub(h(R.mul(y(ee, .001)).negate())).add(se.rgb), 1).mul(ae);
	})(), w.name = `Starfield composite ${o.id}`, w;
}
function eo(t) {
	return lo(t).map(({ end: n, offset: r, skyV0: i, skyV1: a, start: o }) => {
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
function to(e) {
	return Math.max(8, Math.floor(e / 2));
}
function no(t, n) {
	let r = to(ja), i = n.uvMin, a = n.uvSize, o = Math.max(0, Math.min(1, i.y)), s = Math.max(0, Math.min(1, i.y + a.y)), c = Math.max(s - o, 1e-4), l = Math.max(3, Math.ceil(ja * Math.max(a.x, .001))), u = Math.max(2, Math.ceil(r * Math.max(c, .001))), d = (i.x - .25) * Math.PI * 2, f = a.x * Math.PI * 2, p = o * Math.PI, m = c * Math.PI;
	return new e.SphereGeometry(Aa, l, u, d, f, p, m);
}
function ro(t) {
	let n = t.uvMin.x, r = t.uvMin.y, i = t.uvMin.x + t.uvSize.x, a = t.uvMin.y + t.uvSize.y, o = t.storageUvMin.x, s = t.storageUvMin.y, c = t.storageUvMin.x + t.storageUvSize.x, l = t.storageUvMin.y + t.storageUvSize.y, u = t.hasLeftNeighbor ? o : n, d = t.hasRightNeighbor ? c : i, f = t.hasTopNeighbor ? s : r, p = t.hasBottomNeighbor ? l : a;
	return {
		uvMin: new e.Vector2(u, f),
		uvSize: new e.Vector2(d - u, p - f)
	};
}
function io(n, i, a) {
	let o = M(n), s = j(new e.Vector2(i.uvMin.x, i.uvMin.y)), c = j(new e.Vector2(i.uvSize.x, i.uvSize.y)), l = j(new e.Vector2(i.storageUvMin.x, i.storageUvMin.y)), u = j(new e.Vector2(i.storageUvSize.x, i.storageUvSize.y)), d = j(Math.max(.001, a)), p = new t({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide
	});
	return p.colorNode = r(() => {
		let e = A(o, f(Ua(s.add(ie().mul(c)), l, u), 0, 1));
		return oe(P(1).sub(h(y(e.rgb, P(0)).mul(d).negate())), 1);
	})(), p.name = `Starfield live nebula patch ${i.id}`, p;
}
function ao(n, i) {
	let a = M(n), o = j(new e.Vector2(i.uvMin.x, i.uvMin.y)), s = j(new e.Vector2(i.uvSize.x, i.uvSize.y)), c = j(new e.Vector2(i.storageUvMin.x, i.storageUvMin.y)), l = j(new e.Vector2(i.storageUvSize.x, i.storageUvSize.y)), u = j(+!!i.hasLeftNeighbor), d = j(+!!i.hasRightNeighbor), p = j(+!!i.hasTopNeighbor), m = j(+!!i.hasBottomNeighbor), h = ae("vec3", `vStarfieldPatchDirection${i.x}_${i.y}`), _ = new t({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		transparent: !0
	});
	return _.blending = e.CustomBlending, _.blendEquation = e.AddEquation, _.blendSrc = e.OneFactor, _.blendDst = e.OneFactor, _.blendEquationAlpha = e.AddEquation, _.blendSrcAlpha = e.OneFactor, _.blendDstAlpha = e.OneMinusSrcAlphaFactor, _.vertexNode = r(() => (h.assign(te), C))(), _.colorNode = r(() => {
		let e = za(h), t = N(Ha(e.x, o.x, s.x).div(s.x), e.y.sub(o.y).div(s.y)), n = Ua(e, c, l), r = f(n, 0, 1), i = Wa(n), _ = y(l.sub(s).div(s.mul(2)), N(0)), v = y(_, N(1e-6)), b = E(u.greaterThan(.5), O(v.x.negate(), v.x, t.x), 1), x = E(d.greaterThan(.5), g(1).sub(O(g(1).sub(v.x), g(1).add(v.x), t.x)), 1), S = E(_.x.lessThanEqual(0), 1, b.mul(x)), C = E(p.greaterThan(.5), O(v.y.negate(), v.y, t.y), 1), ee = E(m.greaterThan(.5), g(1).sub(O(g(1).sub(v.y), g(1).add(v.y), t.y)), 1), w = E(_.y.lessThanEqual(0), 1, C.mul(ee)), te = f(S.mul(w), 0, 1);
		return A(a, r).mul(i).mul(te);
	})(), _.name = `Starfield live stars patch ${i.id}`, _;
}
function oo(t, n) {
	let r = new e.Group();
	return r.name = `Starfield live patch group ${t.key}`, t.patches.forEach((t) => {
		let i = t.descriptor, a = no(i, {
			uvMin: i.uvMin,
			uvSize: i.uvSize
		}), o = io(t.nebulaTexture, i, n.nebula.uNebulaExposure), s = new e.Mesh(a, o);
		s.frustumCulled = !1, s.renderOrder = 0, r.add(s);
	}), t.patches.forEach((t) => {
		let n = t.descriptor, i = no(n, ro(n)), a = ao(t.starTexture, n), o = new e.Mesh(i, a);
		o.frustumCulled = !1, o.renderOrder = .01, r.add(o);
	}), r;
}
function so(t) {
	t.traverse((t) => {
		t instanceof e.Mesh && (t.geometry.dispose(), (Array.isArray(t.material) ? t.material : [t.material]).forEach((e) => {
			e.dispose();
		}));
	}), t.clear();
}
function co(e, t) {
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
function lo(e) {
	let t = e.hasLeftNeighbor ? e.storageUvMin.x : e.uvMin.x, n = e.hasRightNeighbor ? e.storageUvMin.x + e.storageUvSize.x : e.uvMin.x + e.uvSize.x, r = e.hasTopNeighbor ? e.storageUvMin.y : e.uvMin.y, i = e.hasBottomNeighbor ? e.storageUvMin.y + e.storageUvSize.y : e.uvMin.y + e.uvSize.y, a = Math.max(0, r), o = Math.min(1, i);
	return o <= a ? [] : co(t, n - t).map((e) => ({
		...e,
		skyV0: a,
		skyV1: o
	}));
}
function uo(t) {
	return t === "repeat" ? e.RepeatWrapping : e.ClampToEdgeWrapping;
}
function fo(t, n, r, i = {}) {
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
function po(e) {
	e.dispose();
}
function mo(e) {
	return Math.max(1, Math.floor(e ?? 8192));
}
function ho(e, t) {
	return Math.max(1, Math.min(e, t));
}
var go = class {
	#e = /* @__PURE__ */ new Map();
	#t = /* @__PURE__ */ new Map();
	#n;
	#r;
	#i = new e.Scene();
	#a = new e.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#o = new e.PlaneGeometry(2, 2);
	constructor(e) {
		this.#r = e, this.#n = Pa(e);
	}
	createBakeKey(e, t) {
		let n = ir(e), r = Pn(n.quality), i = mo(t);
		return Yr(n, i, Math.floor(i / 2), {
			budgetBytes: r.budgetBytes,
			maxTextureSize: this.#n
		});
	}
	previewWidthFor(e) {
		return Math.max(1, Math.min(En, this.#n));
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
		return Na(this.#r);
	}
	dispose() {
		this.#e.forEach((e) => e.target.dispose()), this.#e.clear(), this.#t.forEach((e) => {
			e.targets.forEach((e) => e.dispose());
		}), this.#t.clear(), this.#o.dispose();
	}
	#s(t, n, r) {
		let i = ir(t), a = Pn(i.quality), o = mo(r), s = Math.floor(o / 2), c = n ?? this.createBakeKey(i, o), l = this.#t.get(c);
		if (l) return l;
		let u = er({
			budgetBytes: a.budgetBytes,
			clip: i.clip,
			height: s,
			maxTextureSize: this.#n,
			width: o
		}), d = this.#r.getRenderTarget(), f = this.#r.autoClear, p = Object.assign(new e.Color(), { a: 1 }), m = this.#r.getClearAlpha(), h = [], g = [];
		this.#r.getClearColor(p), this.#r.autoClear = !0, this.#r.setClearColor(0, 0), u.descriptors.forEach((t) => {
			let n = fo(t.storageSize.width, t.storageSize.height, `GPU baked starfield nebula ${t.id}`, {
				colorSpace: e.LinearSRGBColorSpace,
				type: e.HalfFloatType,
				wrapS: uo(t.wrapS),
				wrapT: uo(t.wrapT)
			}), r = fo(t.storageSize.width, t.storageSize.height, `GPU baked starfield stars ${t.id}`, {
				colorSpace: e.SRGBColorSpace,
				type: e.UnsignedByteType,
				wrapS: uo(t.wrapS),
				wrapT: uo(t.wrapT)
			});
			this.#l(Ya(i, t), n), this.#u(i, t, r, s, u.supersample), h.push(n, r), g.push({
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
		let i = ir(t), a = Pn(i.quality), o = mo(r), s = Math.floor(o / 2), c = ho(o, this.#n), l = Math.floor(c / 2), u = n ?? this.createBakeKey(i, o), d = this.#e.get(u);
		if (d && d.target.width === c && d.target.height === l) return d;
		let f = fo(c, l, "GPU baked starfield layer", {
			colorSpace: e.SRGBColorSpace,
			type: e.UnsignedByteType,
			wrapS: e.RepeatWrapping,
			wrapT: e.ClampToEdgeWrapping
		}), p = er({
			budgetBytes: a.budgetBytes,
			clip: i.clip,
			height: s,
			maxTextureSize: this.#n,
			width: o
		}), m = this.#r.getRenderTarget(), h = this.#r.autoClear, g = Object.assign(new e.Color(), { a: 1 }), _ = this.#r.getClearAlpha();
		return this.#r.getClearColor(g), this.#r.autoClear = !0, this.#r.setClearColor(0, 0), this.#r.setRenderTarget(f), this.#r.clear(), p.descriptors.forEach((t) => {
			let n = fo(t.storageSize.width, t.storageSize.height, `GPU baked starfield nebula ${t.id}`, {
				colorSpace: e.LinearSRGBColorSpace,
				type: e.HalfFloatType,
				wrapS: uo(t.wrapS),
				wrapT: uo(t.wrapT)
			}), r = fo(t.storageSize.width, t.storageSize.height, `GPU baked starfield stars ${t.id}`, {
				colorSpace: e.SRGBColorSpace,
				type: e.UnsignedByteType,
				wrapS: uo(t.wrapS),
				wrapT: uo(t.wrapT)
			});
			this.#l(Ya(i, t), n), this.#u(i, t, r, s, p.supersample), this.#d(i, t, n.texture, r.texture, f), n.dispose(), r.dispose();
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
		r.frustumCulled = !1, this.#i.clear(), this.#i.add(r), this.#r.setRenderTarget(n), this.#r.clear(), this.#r.render(this.#i, this.#a), this.#i.remove(r), po(t);
	}
	#u(t, n, r, i, a) {
		let o = Xa(t, n, i), s = Math.max(1, Math.floor(a)), c = n.storageSize.width * s, l = n.storageSize.height * s, u = c / n.storageSize.width, d = Za(t, n, {
			bakeHeight: l,
			bakeWidth: c,
			displayPixelAngle: Math.PI / ya,
			screenPixelScale: i / ya
		}), f = new e.Mesh(o, d), p = fo(c, l, `GPU baked starfield stars accumulation ${n.id}`, {
			colorSpace: e.LinearSRGBColorSpace,
			type: e.HalfFloatType,
			wrapS: e.ClampToEdgeWrapping
		});
		f.frustumCulled = !1, this.#i.clear(), this.#i.add(f), this.#r.setRenderTarget(p), this.#r.clear(), this.#r.render(this.#i, this.#a), this.#i.remove(f), o.dispose(), po(d), this.#l(Qa(p.texture, c, l, n.storageSize.width, n.storageSize.height, u), r), p.dispose();
	}
	#d(t, n, r, i, a) {
		let o = $a(r, i, n, t), s = eo(n);
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
		}), this.#i.clear(), po(o);
	}
};
function _o(e) {
	return Na(e) ? new go(e) : null;
}
//#endregion
//#region Skybox.ts
var vo = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: I,
	nodes: [],
	version: 2
}, yo = class extends e.Mesh {
	#e = {};
	#t = { ...ft };
	#n = !1;
	#r = I;
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
	#s = vo;
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
		super(se(I), ia(vo, ft, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), !1)), this.frustumCulled = !1, this.renderOrder = -1, this.#m.name = "Skybox live starfield patches", this.add(this.#m);
	}
	fromManifest(e) {
		return this.#s = L(e), this.applyGeometry(this.#s.geometry ?? I), this;
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
		return this.#d = e, this.#f?.dispose(), this.#f = _o(e), this;
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
		let t = R(e);
		if (this.#r.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#r = t, this.geometry = se(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#l?.dispose(), this.#l = null;
	}
	clearStarfieldPatchOverlay() {
		this.#m.children.forEach((t) => {
			t instanceof e.Group && so(t);
		}), this.#m.clear();
	}
	syncStarfieldPatchOverlay() {
		this.clearStarfieldPatchOverlay();
		let e = this.material.userData.debugImageTextureSlots;
		ha(this.#u, this.#d) === "live-webgpu" && $i(this.#s.nodes, (t) => {
			if (t.type !== "starfield") return;
			let n = this.#h.get(t.id);
			if (!n) return;
			e && (e[t.id] = { value: n });
			let r = oo(n, t.params);
			r.renderOrder = 0, this.#m.add(r);
		});
	}
	disposeStarfieldTextures() {
		this.#p.forEach((e) => {
			clearTimeout(e);
		}), this.#p.clear(), this.#_.forEach((e) => ai(e)), this.#_.clear(), this.clearStarfieldPatchOverlay(), this.#h.clear(), this.#g.clear(), this.#f?.dispose(), this.#f = null;
	}
	syncStarfieldTextures() {
		let e = /* @__PURE__ */ new Set();
		$i(this.#s.nodes, (t) => {
			if (t.type !== "starfield") return;
			e.add(t.id);
			let n = this.#f?.createBakeKey(t.params) ?? Yr(t.params, 8192, 4096);
			this.#g.get(t.id) !== n && this.scheduleStarfieldTextureBake(t.id, t.params);
		}), Array.from(this.#_.keys()).forEach((t) => {
			if (e.has(t)) return;
			let n = this.#_.get(t);
			n && ai(n), this.#_.delete(t), this.#h.delete(t), this.#g.delete(t);
		}), Array.from(this.#p.entries()).forEach(([t, n]) => {
			e.has(t) || (clearTimeout(n), this.#p.delete(t));
		}), this.syncStarfieldPatchOverlay();
	}
	scheduleStarfieldTextureBake(e, t) {
		let n = this.#f?.createBakeKey(t) ?? Yr(t, 8192, 4096);
		if (this.#g.get(e) === n) return;
		let r = this.#p.get(e);
		r && clearTimeout(r);
		let i = setTimeout(() => {
			this.#p.delete(e);
			let t = _a(this.#s.nodes, e);
			if (t?.type !== "starfield") return;
			let r = this.#f?.createBakeKey(t.params) ?? Yr(t.params, 8192, 4096);
			if (r !== n) {
				this.scheduleStarfieldTextureBake(e, t.params);
				return;
			}
			if (!this.#f?.canBake()) return;
			let i = this.#f.bakeTexture(t.params, r), a = this.#_.get(e);
			a && a !== i && ai(a), this.#_.set(e, i), this.#g.set(e, r), a ? this.refreshStarfieldTextureBindings() : (this.#c = null, this.setManifest(this.#s)), this.dispatchEvent({ type: "starfieldtexturechange" });
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
		this.material.userData.applyCompositionParams?.(this.#s), this.material.userData.applyLayerParams && $i(this.#s.nodes, this.material.userData.applyLayerParams), this.material.userData.applyImageTextures?.(this.#a), this.material.userData.applyStarfieldTextures?.(this.#_), this.material.userData.applyEditorLayerState?.(this.#t), this.#i.forEach((e, t) => {
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
		let n = _a(this.#s.nodes, e);
		return n?.type === "image" && (n.params = {
			...n.params,
			placement: t
		}), this.#i.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this;
	}
	updateLayerComposition(e, t) {
		let n = _a(this.#s.nodes, e);
		return n ? (t.blendMode !== void 0 && (n.blendMode = t.blendMode), t.opacity !== void 0 && (n.opacity = t.opacity), this.material.userData.applyLayerComposition?.(n), this) : this;
	}
	updateLayer(e, t) {
		let n = _a(this.#s.nodes, e);
		return !n || n.type === "group" ? this : (n.params = t, xe(n.type)?.updateLive?.(this.#o, n), this);
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
		let t = L(e);
		this.#s = t, this.applyGeometry(this.#s.geometry ?? this.#r), this.syncStarfieldTextures();
		let n = ha(this.#u, this.#d), r = ga(this.#s, n, this.#n);
		if (this.#c === r && (n === "live-webgpu" || n === "live-webgl")) return this.applyLiveManifestUniformUpdates(), this;
		if (n === "live-webgpu") this.replaceMaterial(ia(this.#s, this.#t, this.#a, this.#_, this.#h, this.#n));
		else if (n === "live-webgl") this.replaceMaterial(la(this.#s, this.#t, this.#a, this.#_, this.#n));
		else {
			let e = da(this.#s, this.#e);
			this.replaceMaterial(pa(e, this.#d), e);
		}
		return this.#c = r, this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(pa(e, this.#d)), this.#c = null, this;
	}
	invalidateBakeCache() {
		return xi(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture(), this.disposeStarfieldTextures();
	}
};
//#endregion
//#region skybox-gpu-bake.ts
function bo(e) {
	let t = e;
	return !!(t && typeof t.render == "function" && typeof t.setRenderTarget == "function" && typeof t.getRenderTarget == "function");
}
function xo(t, n, r, i) {
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
var So = class {
	#e;
	#t = new e.Scene();
	#n = new e.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#r = new e.PlaneGeometry(2, 2);
	constructor(e) {
		this.#e = e;
	}
	canBake() {
		return bo(this.#e);
	}
	bakeRenderTarget(t, n) {
		let r = Math.max(1, Math.floor(n.width)), i = Math.max(1, Math.floor(n.height)), a = sa(L(t), n.imageTextures ?? /* @__PURE__ */ new Map(), n.starfieldTextures ?? /* @__PURE__ */ new Map(), { flipY: n.flipY }), o = xo(r, i, !!n.hdr, !!n.float), s = new e.Mesh(this.#r, a);
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
function Co(e) {
	return bo(e) ? new So(e) : null;
}
//#endregion
//#region loader/loader.ts
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
//#region loader/extensions/texture.ts
function Eo(t) {
	return t.colorSpace = e.SRGBColorSpace, t.wrapS = e.ClampToEdgeWrapping, t.wrapT = e.ClampToEdgeWrapping, t.flipY = !1, t.minFilter = e.LinearMipmapLinearFilter, t.magFilter = e.LinearFilter, t.generateMipmaps = !0, t.needsUpdate = !0, t;
}
var Do = class {
	static {
		this.type = "texture";
	}
	#e = new e.TextureLoader();
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
	let a = JSON.parse(new TextDecoder().decode(i)), o = L(a), s = a.assets ?? {}, c = /* @__PURE__ */ new Map(), l = [];
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
		manifest: L(await t.json()),
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
	let t = await (await e.getFileHandle(Oo)).getFile(), n = L(JSON.parse(await t.text())), r = /* @__PURE__ */ new Map();
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
//#region loader/skybox-bundle.ts
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
export { hi as DEFAULT_BAKE_WIDTH, Gt as DEFAULT_SPOT_BASE_ANGULAR_RADIUS, An as DEFAULT_STARFIELD_CLIP, G as DEFAULT_STARFIELD_NEBULA, K as DEFAULT_STARFIELD_NEBULA_FIELD, jn as DEFAULT_STARFIELD_PARAMS, Dn as DEFAULT_STARFIELD_QUALITY, W as DEFAULT_STARFIELD_STARS, Re as IMAGE_PLACEMENT_ELEVATION_LIMIT, To as Loader, wo as LoaderAssetError, En as STARFIELD_PREVIEW_BAKE_WIDTH, On as STARFIELD_QUALITY_PRESETS, yo as Skybox, So as SkyboxGpuBakeService, go as StarfieldGpuBakeService, Do as TextureLoaderExtension, Ti as bakeSkyboxImageData, $r as bakeStarfieldImageData, he as blendChannel, z as clamp, ko as collectImageLayers, ge as compositeBlendChannel, _e as compositeOver, Eo as configureSkyboxImageTexture, Ze as createAngularDecalPlacement, bi as createBakeCacheKey, da as createBakedSkyboxTexture, Jt as createDefaultSpotParams, Xe as createImagePlacementTangents, se as createSkyboxGeometry, Co as createSkyboxGpuBakeService, le as createSkyboxWireGeometry, Er as createStarCatalogForCoverage, Dr as createStarCatalogForDescriptor, Yr as createStarfieldBakeCacheKey, _o as createStarfieldGpuBakeService, er as createStarfieldPatchLayout, et as directionFromPosition, mi as evaluateSkyboxDirection, xe as getLayerRuntimeAdapter, Se as getLayerRuntimeAdapters, Pn as getStarfieldQualityPreset, xi as invalidateBakeCache, Ce as isRegisteredLayerType, de as linearChannelToSrgb, pe as linearRgbToSrgbBytes, Wo as loadBundleFromDirectory, Ho as loadBundleFromUrl, Vo as loadBundleFromZip, Yo as loadSkyboxBundle, qo as loadSkyboxImageTextures, L as migrateManifestToV2, Qe as normalizeImagePlacement, Yt as normalizeSpotParams, Wn as normalizeStarfieldCoverage, ir as normalizeStarfieldParams, Nn as normalizeStarfieldQuality, V as normalizeVector, fe as parseHexColor, tt as placementFromPosition, at as placementFromRotation, rt as placementFromScale, $e as positionFromPlacement, Xt as positionFromSpot, ot as projectDirectionToImageUv, vr as qFromV, Qt as radiusScaleFromSpot, be as registerLayerRuntimeAdapter, Go as rehydrateImagePixels, yi as resolveBakeOptions, it as rotationFromPlacement, Jr as sampleStarfieldLayer, nt as scaleFromPlacement, Bn as sourceDirectionFromUv, Vn as sourceFoldEquirectUv, Hn as sourceUvFromDirection, en as spotContainsDirection, Zt as spotFromPosition, $t as spotFromRadiusScale, ue as srgbChannelToLinear, pr as starfieldClipContainsDirection, Lr as starfieldFieldGradientToSourceField };
