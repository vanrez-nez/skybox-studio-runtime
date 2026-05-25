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
function ee(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n += 1) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return (t >>> 0).toString(36);
}
//#endregion
//#region manifest.ts
var b = { type: "box" };
function x(e) {
	return e.version === 2 ? {
		...e,
		geometry: e.geometry ?? b
	} : {
		composition: e.composition,
		geometry: b,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	};
}
//#endregion
//#region evaluator.ts
var S = Math.PI * 2;
function C(e, t, n) {
	return e + (t - e) * n;
}
function te(e) {
	return e.map((e) => ({
		alpha: d(e.opacity / 100),
		color: m(e.color),
		t: d(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function ne(e, t) {
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
		let a = i.t - r.t, o = a <= 0 ? 0 : (n - r.t) / a;
		return [
			C(r.color[0], i.color[0], o),
			C(r.color[1], i.color[1], o),
			C(r.color[2], i.color[2], o),
			C(r.alpha, i.alpha, o)
		];
	}
	return [...i.color, i.alpha];
}
function re(e) {
	let t = e * Math.PI / 180;
	return [
		Math.sin(t),
		Math.cos(t),
		0
	];
}
function ie(e, t) {
	let n = re(t.rotation), r = e[0] * n[0] + e[1] * n[1] + e[2] * n[2];
	return ne(te(t.stops), r * .5 + .5);
}
function ae(e, t) {
	let n = (e - .5) * S, r = (.5 - t) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function oe(e, t) {
	let n = (e - .5) * S, r = (t - .5) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function w(e) {
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
function se(e, t, n) {
	if (t <= 0) return e;
	let r = Math.max(1e-4, n), i = [
		Math.sin((e[1] * r + .23) * S) * Math.cos((e[2] * r + .41) * S),
		Math.cos((e[2] * r + .17) * S) * Math.sin((e[0] * r + .37) * S),
		Math.sin((e[0] * r - .31) * S) * Math.cos((e[1] * r + .29) * S)
	];
	return w([
		e[0] + i[0] * t,
		e[1] + i[1] * t,
		e[2] + i[2] * t
	]);
}
function ce(e, t) {
	return 1 - d(e[0] * t[0] + e[1] * t[1] + e[2] * t[2], -1, 1);
}
function le(e, t) {
	if (t.anchors.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = se(e, d(t.amplitude, 0, .6), Math.max(1e-4, t.frequency)), r = 0, i = 0, a = 0, o = 0;
	return t.anchors.forEach((e) => {
		let s = ce(n, ae(e.x, e.y)), c = t.mode === "gaussian" ? Math.exp(-(s * s) / (2 * (.46 / t.power) ** 2)) : 1 / (s + 5e-4) ** t.power, l = m(e.color);
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
function T(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function E(e, t, n) {
	return [
		C(e[0], t[0], n),
		C(e[1], t[1], n),
		C(e[2], t[2], n),
		C(e[3], t[3], n)
	];
}
function D(e, t, n) {
	let r = Math.min(e.width - 1, Math.max(0, t)), i = (Math.min(e.height - 1, Math.max(0, n)) * e.width + r) * 4, a = e.pixels?.[i] ?? 0, o = e.pixels?.[i + 1] ?? 0, s = e.pixels?.[i + 2] ?? 0, c = e.pixels?.[i + 3] ?? 255;
	return [
		f(a / 255),
		f(o / 255),
		f(s / 255),
		c / 255
	];
}
function ue(e) {
	let t = e, n = w(t.centerDirection ?? t.normal ?? t.center ?? [
		0,
		0,
		-1
	]), r = w(t.tangentX ?? [
		1,
		0,
		0
	]), i = w(t.tangentY ?? [
		0,
		1,
		0
	]), a = t.center ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, o = typeof t.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t.width ?? .4) / (2 * a));
	return {
		angularHeight: typeof t.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t.height ?? .3) / (2 * a)),
		angularWidth: o,
		centerDirection: n,
		tangentX: r,
		tangentY: i
	};
}
function de(e, t) {
	let n = t.placement;
	if (!n || !t.pixels || t.width <= 0 || t.height <= 0) return [
		0,
		0,
		0,
		0
	];
	let r = ue(n), i = w(e), a = T(i, r.centerDirection);
	if (a <= 0) return [
		0,
		0,
		0,
		0
	];
	let o = T(i, r.tangentX) / a, s = T(i, r.tangentY) / a, c = Math.tan(r.angularWidth / 2), l = Math.tan(r.angularHeight / 2);
	if (c <= 0 || l <= 0 || o < -c || o > c || s < -l || s > l) return [
		0,
		0,
		0,
		0
	];
	let u = o / (2 * c) + .5, d = .5 - s / (2 * l);
	if (u < 0 || u > 1 || d < 0 || d > 1) return [
		0,
		0,
		0,
		0
	];
	let f = u * (t.width - 1), p = d * (t.height - 1), m = Math.floor(f), h = Math.floor(p), g = m + 1, _ = h + 1, v = f - m, y = p - h;
	return E(E(D(t, m, h), D(t, g, h), v), E(D(t, m, _), D(t, g, _), v), y);
}
function fe(e, t) {
	return t.type === "gradient" ? ie(e, t.params) : t.type === "field-gradient" ? le(e, t.params) : de(e, t.params);
}
function O(e, t) {
	return t.filter((e) => e.enabled).reverse().reduce((t, n) => {
		let r = n.type === "group" ? [...O(e, n.children), 1] : fe(e, n), i = d(r[3] * (n.opacity / 100));
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
function pe(e, t, n) {
	if (!n || n.opacity <= 0 || n.radius <= 0 || 1 - d(T(t, n.direction), -1, 1) > n.radius) return e;
	let r = m(n.color), i = d(n.opacity);
	return [
		r[0] * i + e[0] * (1 - i),
		r[1] * i + e[1] * (1 - i),
		r[2] * i + e[2] * (1 - i)
	];
}
function k(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = k(n.children, t);
		if (e) return e;
	}
	return null;
}
function A(e, t, n = {}) {
	let r = x(e), i = n.targetGroupId ? k(r.nodes, n.targetGroupId) : null;
	return pe(O(t, n.targetGroupId ? i ? [i] : [] : r.nodes), t, r.selectionDot);
}
//#endregion
//#region bake.ts
var me = 1024, he = "0.1.0", j = /* @__PURE__ */ new Map();
function M(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function N(e, t) {
	return ee(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: he
	}));
}
function P() {
	j.clear();
}
function F(e, t = {}) {
	let n = M(t), r = N(e, n);
	if (n.cache) {
		let e = j.get(r);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: i, targetGroupId: a, width: o } = n, s = new Uint8ClampedArray(o * i * 4);
	for (let t = 0; t < i; t += 1) {
		let n = (t + .5) / i;
		for (let r = 0; r < o; r += 1) {
			let [i, c, l] = h(A(e, oe((r + .5) / o, n), { targetGroupId: a })), u = (t * o + r) * 4;
			s[u] = i, s[u + 1] = c, s[u + 2] = l, s[u + 3] = 255;
		}
	}
	let c = {
		data: s,
		height: i,
		width: o
	};
	return n.cache && j.set(r, {
		...c,
		data: new Uint8ClampedArray(s)
	}), c;
}
//#endregion
//#region Skybox.ts
var I = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	geometry: b,
	nodes: [],
	version: 2
}, L = .8, R = new e.DataTexture(new Uint8Array([
	0,
	0,
	0,
	0
]), 1, 1, e.RGBAFormat);
R.colorSpace = e.SRGBColorSpace, R.needsUpdate = !0;
function z(e, t) {
	return +(t === e);
}
function ge(e, t) {
	return e.map((e) => ({
		layerId: e.layer.id,
		node: c(z(e.layer.id, t))
	}));
}
function _e(e, t) {
	e.forEach((e) => {
		e.node.value = z(e.layerId, t);
	});
}
function ve(e, t) {
	return Object.fromEntries(e.map((e) => [`imageHover${e.index}`, { value: z(e.layer.id, t) }]));
}
function ye(e, t, n) {
	t.forEach((t) => {
		let r = `imageHover${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = z(t.layer.id, n));
	});
}
function B(e, t) {
	e.userData.applyHoveredImageLayerId = t;
}
function V(t) {
	if (!t) return {
		centerDirection: new e.Vector3(0, 0, -1),
		halfSize: new e.Vector2(0, 0),
		tangentX: new e.Vector3(1, 0, 0),
		tangentY: new e.Vector3(0, 1, 0)
	};
	let n = ke(t);
	return {
		centerDirection: new e.Vector3(...n.centerDirection),
		halfSize: new e.Vector2(Math.max(0, Math.tan(n.angularWidth / 2)), Math.max(0, Math.tan(n.angularHeight / 2))),
		tangentX: new e.Vector3(...n.tangentX),
		tangentY: new e.Vector3(...n.tangentY)
	};
}
function be(e) {
	return e.map((e) => {
		let t = V(e.layer.params.placement);
		return {
			centerDirection: c(t.centerDirection),
			halfSize: c(t.halfSize),
			layerId: e.layer.id,
			tangentX: c(t.tangentX),
			tangentY: c(t.tangentY)
		};
	});
}
function xe(e, t, n) {
	let r = e.find((e) => e.layerId === t);
	if (!r) return;
	let i = V(n);
	r.centerDirection.value.copy(i.centerDirection), r.tangentX.value.copy(i.tangentX), r.tangentY.value.copy(i.tangentY), r.halfSize.value.copy(i.halfSize);
}
function Se(e) {
	return Object.fromEntries(e.flatMap((e) => {
		let t = V(e.layer.params.placement);
		return [
			[`imageCenterDirection${e.index}`, { value: t.centerDirection }],
			[`imageTangentX${e.index}`, { value: t.tangentX }],
			[`imageTangentY${e.index}`, { value: t.tangentY }],
			[`imageHalfSize${e.index}`, { value: t.halfSize }]
		];
	}));
}
function Ce(e, t, n, r) {
	let i = t.find((e) => e.layer.id === n);
	if (!i) return;
	let a = V(r);
	e.uniforms[`imageCenterDirection${i.index}`]?.value.copy(a.centerDirection), e.uniforms[`imageTangentX${i.index}`]?.value.copy(a.tangentX), e.uniforms[`imageTangentY${i.index}`]?.value.copy(a.tangentY), e.uniforms[`imageHalfSize${i.index}`]?.value.copy(a.halfSize);
}
function H(e, t) {
	e.userData.applyImageLayerPlacement = t;
}
function U(e) {
	return e ?? b;
}
function W(t = b) {
	return U(t).type === "sphere" ? new e.SphereGeometry(1, 64, 32) : new e.BoxGeometry(1, 1, 1);
}
function we(t = b) {
	if (U(t).type === "sphere") {
		let t = new e.SphereGeometry(1, 32, 16), n = new e.WireframeGeometry(t);
		return t.dispose(), n;
	}
	let n = new e.BoxGeometry(1, 1, 1), r = new e.EdgesGeometry(n);
	return n.dispose(), r;
}
function G(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function K(e, t) {
	let [n, r, i] = m(e);
	return `${t === "wgsl" ? "vec3<f32>" : "vec3"}(${G(n)}, ${G(r)}, ${G(i)})`;
}
function q(e, t, n) {
	return `${n === "wgsl" ? "vec4<f32>" : "vec4"}(${K(e, n)}, ${G(d(t))})`;
}
function Te(e, t, n) {
	let r = (d(e) - .5) * Math.PI * 2, i = (.5 - d(t)) * Math.PI, a = Math.cos(i);
	return `${n === "wgsl" ? "vec3<f32>" : "vec3"}(${G(a * Math.cos(r))}, ${G(Math.sin(i))}, ${G(a * Math.sin(r))})`;
}
function J(e, t) {
	return t === "wgsl" ? `vec3<f32>(${G(e)})` : `vec3(${G(e)})`;
}
function Y(e, t, n, r) {
	return r === "wgsl" ? `var ${e}: ${t} = ${n};` : `${t} ${e} = ${n};`;
}
function Ee(e) {
	return e.filter((e) => e.enabled).reverse();
}
function De(e) {
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
function Oe(e) {
	return new Map(e.map((e) => [e.layer.id, e]));
}
function X(e, t) {
	if (Array.isArray(e) && e.length === 3 && e.every((e) => typeof e == "number" && Number.isFinite(e))) {
		let t = Math.hypot(e[0], e[1], e[2]);
		if (t > 0) return [
			e[0] / t,
			e[1] / t,
			e[2] / t
		];
	}
	return t;
}
function ke(e) {
	let t = e, n = X(t.centerDirection ?? t.normal ?? t.center, [
		0,
		0,
		-1
	]), r = X(t.tangentX, [
		1,
		0,
		0
	]), i = X(t.tangentY, [
		0,
		1,
		0
	]), a = Array.isArray(t.center) ? Math.max(1e-4, Math.hypot(t.center[0], t.center[1], t.center[2])) : 1, o = typeof t.angularWidth == "number" ? t.angularWidth : 2 * Math.atan(Math.max(1e-4, t.width ?? .4) / (2 * a));
	return {
		angularHeight: typeof t.angularHeight == "number" ? t.angularHeight : 2 * Math.atan(Math.max(1e-4, t.height ?? .3) / (2 * a)),
		angularWidth: o,
		centerDirection: n,
		tangentX: r,
		tangentY: i
	};
}
function Ae(e, t, n) {
	let { placement: r, src: i, width: a, height: o } = e.layer.params, s = t === "wgsl" ? "vec4<f32>" : "vec4", c = t === "wgsl" ? "f32" : "float", l = t === "wgsl" ? "let" : "float";
	return !i || !r || a <= 0 || o <= 0 ? `return ${s}(0.0, 0.0, 0.0, 0.0);` : `
      ${t === "wgsl" ? "let" : "vec3"} imageDirection = normalize(direction);
      ${l} imageDenom = dot(imageDirection, ${n.centerDirection});
      ${l} safeImageDenom = max(imageDenom, 0.000001);
      ${l} projectedX = dot(imageDirection, ${n.tangentX}) / safeImageDenom;
      ${l} projectedY = dot(imageDirection, ${n.tangentY}) / safeImageDenom;
      ${l} imageU = projectedX / max(${n.halfSize}.x * 2.0, 0.000001) + 0.5;
      ${l} imageV = 0.5 - projectedY / max(${n.halfSize}.y * 2.0, 0.000001);
      ${Y("imageValid", c, "0.0", t)}
      if (imageDenom > 0.0 &&
        ${n.halfSize}.x > 0.0 &&
        ${n.halfSize}.y > 0.0 &&
        projectedX >= -${n.halfSize}.x &&
        projectedX <= ${n.halfSize}.x &&
        projectedY >= -${n.halfSize}.y &&
        projectedY <= ${n.halfSize}.y &&
        imageU >= 0.0 &&
        imageU <= 1.0 &&
        imageV >= 0.0 &&
        imageV <= 1.0) {
        imageValid = 1.0;
      }
      return ${s}(imageU, imageV, imageValid, 0.0);
    `;
}
function je(e, t, n) {
	let r = t.get(e.id);
	return r ? n === "wgsl" ? `effectColor = ${r.parameterName};` : `{
    vec4 imageSampleInfo = skyboxStudioImageSampleInfo${r.index}(direction);
    vec4 imageSampleColor = texture2D(imageTexture${r.index}, imageSampleInfo.xy);
    imageSampleColor = vec4(
      mix(imageSampleColor.rgb, vec3(1.0, 0.0, 0.0), imageHover${r.index} * ${G(L)}),
      imageSampleColor.a
    );
    effectColor = vec4(imageSampleColor.rgb, imageSampleColor.a * imageSampleInfo.z);
  }` : `effectColor = ${n === "wgsl" ? "vec4<f32>" : "vec4"}(0.0, 0.0, 0.0, 0.0);`;
}
function Me(e) {
	return u(`
    fn skyboxStudioImageSampleInfo${e.index}(
      direction: vec3<f32>,
      imageCenterDirection: vec3<f32>,
      imageTangentX: vec3<f32>,
      imageTangentY: vec3<f32>,
      imageHalfSize: vec2<f32>
    ) -> vec4<f32> {
      ${Ae(e, "wgsl", {
		centerDirection: "imageCenterDirection",
		halfSize: "imageHalfSize",
		tangentX: "imageTangentX",
		tangentY: "imageTangentY"
	})}
    }
  `);
}
var Ne = u("\n  fn skyboxStudioApplyImageMask(color: vec4<f32>, valid: f32) -> vec4<f32> {\n    return vec4<f32>(color.rgb, color.a * valid);\n  }\n"), Pe = u(`
  fn skyboxStudioApplyImageHover(color: vec4<f32>, hover: f32) -> vec4<f32> {
    return vec4<f32>(
      mix(color.rgb, vec3<f32>(1.0, 0.0, 0.0), clamp(hover, 0.0, 1.0) * ${G(L)}),
      color.a
    );
  }
`);
function Fe(e) {
	return e.map((e) => `
        vec4 skyboxStudioImageSampleInfo${e.index}(vec3 direction) {
          ${Ae(e, "glsl", {
		centerDirection: `imageCenterDirection${e.index}`,
		halfSize: `imageHalfSize${e.index}`,
		tangentX: `imageTangentX${e.index}`,
		tangentY: `imageTangentY${e.index}`
	})}
        }
      `).join("\n");
}
function Z(e, t) {
	return t.params.src ? e.get(t.id) ?? R : R;
}
function Ie(e, t) {
	return Object.fromEntries(e.map((e) => [`imageTexture${e.index}`, { value: Z(t, e.layer) }]));
}
function Le(e, t, n) {
	t.forEach((t) => {
		let r = `imageTexture${t.index}`;
		e.uniforms[r] && (e.uniforms[r].value = Z(n, t.layer));
	});
}
function Re(e, t) {
	let n = [...e.stops].map((e) => ({
		color: e.color,
		opacity: d(e.opacity / 100),
		t: d(e.location / 100)
	})).sort((e, t) => e.t - t.t), r = t === "wgsl" ? "vec4<f32>" : "vec4", i = t === "wgsl" ? "vec3<f32>" : "vec3";
	if (n.length === 0) return `effectColor = ${r}(0.0, 0.0, 0.0, 0.0);`;
	let a = e.rotation * Math.PI / 180, o = `${i}(${G(Math.sin(a))}, ${G(Math.cos(a))}, 0.0)`, s = n.slice(0, -1).map((e, r) => {
		let i = n[r + 1], a = Math.max(1e-5, i.t - e.t), o = `clamp((gradientT - ${G(e.t)}) / ${G(a)}, 0.0, 1.0)`;
		return `${r === 0 ? "if" : "else if"} (gradientT <= ${G(i.t)}) {
      effectColor = mix(${q(e.color, e.opacity, t)}, ${q(i.color, i.opacity, t)}, ${o});
    }`;
	}), c = n[n.length - 1];
	return `{
    ${t === "wgsl" ? "let" : "vec3"} gradientAxis = normalize(${o});
    ${t === "wgsl" ? "let" : "float"} gradientT = dot(direction, gradientAxis) * 0.5 + 0.5;
    ${s.join("\n")}
    ${s.length > 0 ? "else" : ""} {
      effectColor = ${q(c.color, c.opacity, t)};
    }
  }`;
}
function ze(e, t) {
	let n = t === "wgsl" ? "vec4<f32>" : "vec4", r = t === "wgsl" ? "vec3<f32>" : "vec3", i = t === "wgsl" ? "let" : "float";
	if (e.anchors.length === 0) return `effectColor = ${n}(0.0, 0.0, 0.0, 0.0);`;
	let a = d(e.amplitude, 0, .6), o = Math.max(1e-4, e.frequency), s = Math.max(1e-4, e.power), c = .46 / s, l = e.anchors.map((n) => `{
        ${i} anchorDirection = normalize(${Te(n.x, n.y, t)});
        ${i} anchorDistance = 1.0 - clamp(dot(fieldDirection, anchorDirection), -1.0, 1.0);
        ${i} weight = ${e.mode === "gaussian" ? `exp(-(anchorDistance * anchorDistance) / ${G(2 * c * c)})` : `1.0 / pow(anchorDistance + 0.0005, ${G(s)})`};
        weightedColor += ${K(n.color, t)} * weight;
        weightSum += weight;
      }`).join("\n");
	return `{
    ${i} warpAmplitude = ${G(a)};
    ${i} warpFrequency = ${G(o)};
    ${Y("fieldDirection", r, "direction", t)}
    ${i} warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      ${i} warpX = sin((direction.y * warpFrequency + 0.23) * ${G(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${G(Math.PI * 2)});
      ${i} warpY = cos((direction.z * warpFrequency + 0.17) * ${G(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${G(Math.PI * 2)});
      ${i} warpZ = sin((direction.x * warpFrequency - 0.31) * ${G(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${G(Math.PI * 2)});
      fieldDirection = normalize(direction + ${r}(warpX, warpY, warpZ) * warpScale);
    }
    ${Y("weightedColor", r, `${r}(0.0)`, t)}
    ${Y("weightSum", t === "wgsl" ? "f32" : "float", "0.0", t)}
    ${l}
    if (weightSum > 0.0) {
      effectColor = ${n}(weightedColor / weightSum, 1.0);
    } else {
      effectColor = ${n}(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
function Be(e, t, n) {
	return e.type === "gradient" ? Re(e.params, t) : e.type === "field-gradient" ? ze(e.params, t) : je(e, n, t);
}
function Q(e, t, n, r) {
	return r === "wgsl" ? `select(${n}, ${t}, ${e})` : `((${e}) ? ${t} : ${n})`;
}
function Ve(e, t) {
	if (t === "glsl") switch (e.blendMode) {
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
	let n = J(1, t), r = J(.5, t), i = J(0, t), a = "effectColor.rgb", o = "composedColor";
	switch (e.blendMode) {
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
function He(e, t) {
	if (t === "glsl" || e.blendMode !== "soft-light") return "";
	let n = t === "wgsl" ? "vec3<f32>" : "vec3";
	return `${t === "wgsl" ? "let" : "vec3"} softLightD = ${Q(`composedColor <= ${n}(0.25)`, `((16.0 * composedColor - ${n}(12.0)) * composedColor + ${n}(4.0)) * composedColor`, "sqrt(composedColor)", t)};`;
}
function $(e, t, n, r = 0) {
	let i = t === "wgsl" ? "vec3<f32>" : "vec3", a = t === "wgsl" ? "vec4<f32>" : "vec4";
	return Ee(e).map((e, o) => {
		let s = e.type === "group" ? `effectColor = ${a}(${`groupColor${r}_${o}`}, 1.0);` : Be(e, t, n), c = `groupColor${r}_${o}`;
		return `{
        ${e.type === "group" ? `${Y(c, i, `${i}(0.0)`, t)}
        {
          ${Y("previousComposedColor", i, "composedColor", t)}
          composedColor = ${i}(0.0);
          ${$(e.children, t, n, r + 1)}
          ${c} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${Y("effectColor", a, `${a}(0.0)`, t)}
        ${s}
        ${t === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${G(e.opacity / 100)}, 0.0, 1.0);
        ${He(e, t)}
        ${t === "wgsl" ? "let" : "vec3"} blendedColor = clamp(${Ve(e, t)}, ${i}(0.0), ${i}(1.0));
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          ${i}(0.0),
          ${i}(1.0)
        );
      }`;
	}).join("\n");
}
function Ue(e, t) {
	let n = Oe(t), r = $(e.nodes, "wgsl", n);
	return u(`
    fn skyboxStudioSample(
      direction: vec3<f32>${t.map((e) => `,
      ${e.parameterName}: vec4<f32>`).join("")}
    ) -> vec4<f32> {
      var composedColor = vec3<f32>(0.0);
      ${r}
      return vec4<f32>(composedColor, 1.0);
    }
  `);
}
function We(e, t, n, r, i) {
	return Object.fromEntries(e.map((e) => {
		let a = i[e.index], o = Me(e)({
			direction: t,
			imageCenterDirection: a.centerDirection,
			imageHalfSize: a.halfSize,
			imageTangentX: a.tangentX,
			imageTangentY: a.tangentY
		}), c = l(o.x, o.y), u = Ne({
			color: Pe({
				color: s(Z(n, e.layer), c),
				hover: r[e.index].node
			}),
			valid: o.z
		});
		return [e.parameterName, u];
	}));
}
function Ge(s, c, l) {
	let u = new t(), d = De(s.nodes), f = Ue(s, d), p = ge(d, c), m = be(d), h = n(() => {
		let e = i;
		return e.z.assign(e.w), e;
	})();
	u.side = e.BackSide, u.depthTest = !1, u.depthWrite = !1, u.vertexNode = h;
	let g = a(o.sub(r));
	return u.colorNode = f({
		direction: g,
		...We(d, g, l, p, m)
	}), B(u, (e) => _e(p, e)), H(u, (e, t) => xe(m, e, t)), u;
}
var Ke = u("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.z, normalizedDirection.x);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n");
function qe(c) {
	let l = new t(), u = n(() => {
		let e = i;
		return e.z.assign(e.w), e;
	})(), d = a(o.sub(r));
	return l.side = e.BackSide, l.depthTest = !1, l.depthWrite = !1, l.vertexNode = u, l.colorNode = s(c, Ke({ direction: d })), l;
}
function Je(t, n, r) {
	let i = De(t.nodes), a = Oe(i), o = $(t.nodes, "glsl", a), s = new e.ShaderMaterial({
		uniforms: {
			...ve(i, n),
			...Se(i),
			...Ie(i, r)
		},
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: `
      precision highp float;
      ${i.map((e) => `uniform sampler2D imageTexture${e.index};
      uniform vec3 imageCenterDirection${e.index};
      uniform vec3 imageTangentX${e.index};
      uniform vec3 imageTangentY${e.index};
      uniform vec2 imageHalfSize${e.index};
      uniform float imageHover${e.index};`).join("\n")}
      varying vec3 vDirection;
      ${Fe(i)}

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
        ${o}
        gl_FragColor = vec4(composedColor, 1.0);
      }
    `
	});
	return B(s, (e) => ye(s, i, e)), H(s, (e, t) => Ce(s, i, e, t)), s.userData.applyImageTextures = (e) => Le(s, i, e), s;
}
function Ye(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function Xe(t, n = {}) {
	let r = F(t, n), i = Ye(r.width, r.height), a = i.getContext("2d");
	if (!a || !("putImageData" in a)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	a.putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
	let o = new e.CanvasTexture(i);
	return o.mapping = e.EquirectangularReflectionMapping, o.wrapS = e.RepeatWrapping, o.wrapT = e.ClampToEdgeWrapping, o.colorSpace = e.SRGBColorSpace, o.flipY = !1, o.needsUpdate = !0, o;
}
function Ze(t) {
	return new e.ShaderMaterial({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		uniforms: { skyboxTexture: { value: t } },
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: "\n      precision highp float;\n      uniform sampler2D skyboxTexture;\n      varying vec3 vDirection;\n\n      const float PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.z, normalizedDirection.x);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);\n      }\n\n      void main() {\n        vec3 direction = normalize(vDirection);\n        vec4 sampledColor = texture2D(skyboxTexture, directionToEquirectUv(direction));\n        gl_FragColor = vec4(sampledColor.rgb, sampledColor.a);\n      }\n    "
	});
}
function Qe(e, t) {
	return $e(t) ? qe(e) : Ze(e);
}
function $e(e) {
	return !!(e && "isWebGPURenderer" in e && e.isWebGPURenderer);
}
function et(e, t) {
	return e === "auto" ? $e(t) ? "live-webgpu" : "live-webgl" : e;
}
var tt = class extends e.Mesh {
	#e = {};
	#t = b;
	#n = null;
	#r = /* @__PURE__ */ new Map();
	#i = /* @__PURE__ */ new Map();
	#a = I;
	#o = null;
	#s = "auto";
	#c = null;
	constructor() {
		super(W(b), Ge(I, null, /* @__PURE__ */ new Map())), this.frustumCulled = !1, this.renderOrder = -1;
	}
	fromManifest(e) {
		return this.#a = x(e), this.applyGeometry(this.#a.geometry ?? b), this;
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
		return this.#c = e, this;
	}
	setRenderMode(e) {
		return this.#s = e, this;
	}
	setImageTexture(e, t) {
		return t ? this.#i.set(e, t) : this.#i.delete(e), this.setManifest(this.#a), this;
	}
	setImageTextures(e) {
		return this.#i.clear(), Object.entries(e).forEach(([e, t]) => {
			t && this.#i.set(e, t);
		}), this.setManifest(this.#a), this;
	}
	otherOverridingSetup() {
		return this;
	}
	load(e) {
		return e && (this.#c = e), this.setManifest(this.#a), this;
	}
	applyGeometry(e) {
		let t = U(e);
		if (this.#t.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#t = t, this.geometry = W(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#o?.dispose(), this.#o = null;
	}
	replaceMaterial(e, t = null) {
		let n = this.material;
		this.material = e, e.userData.applyHoveredImageLayerId?.(this.#n), this.#r.forEach((t, n) => {
			e.userData.applyImageLayerPlacement?.(n, t);
		}), n.dispose(), this.disposeOwnedTexture(), this.#o = t;
	}
	setHoveredImageLayerId(e) {
		return this.#n === e ? this : (this.#n = e, this.material.userData.applyHoveredImageLayerId?.(this.#n), this);
	}
	setImageLayerPlacement(e, t) {
		return this.#r.set(e, t), this.material.userData.applyImageLayerPlacement?.(e, t), this;
	}
	setManifest(e) {
		this.#a = x(e), this.applyGeometry(this.#a.geometry ?? this.#t);
		let t = et(this.#s, this.#c);
		if (t === "live-webgpu") this.replaceMaterial(Ge(this.#a, this.#n, this.#i));
		else if (t === "live-webgl") this.replaceMaterial(Je(this.#a, this.#n, this.#i));
		else {
			let e = Xe(this.#a, this.#e);
			this.replaceMaterial(Qe(e, this.#c), e);
		}
		return this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(Qe(e, this.#c)), this;
	}
	invalidateBakeCache() {
		return P(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture();
	}
};
//#endregion
export { me as DEFAULT_BAKE_WIDTH, tt as Skybox, F as bakeSkyboxImageData, _ as blendChannel, d as clamp, v as compositeBlendChannel, y as compositeOver, N as createBakeCacheKey, Xe as createBakedSkyboxTexture, W as createSkyboxGeometry, we as createSkyboxWireGeometry, ae as equirectPointToDirection, oe as equirectUvToDirection, A as evaluateSkyboxDirection, P as invalidateBakeCache, p as linearChannelToSrgb, h as linearRgbToSrgbBytes, x as migrateManifestToV2, m as parseHexColor, M as resolveBakeOptions, f as srgbChannelToLinear };
