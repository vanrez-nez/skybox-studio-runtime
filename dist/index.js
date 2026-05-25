import * as e from "three";
import { NodeMaterial as t } from "three/webgpu";
import { Fn as n, cameraPosition as r, modelViewProjection as i, normalize as a, positionWorld as o, wgslFn as s } from "three/tsl";
//#region math.ts
function c(e, t = 0, n = 1) {
	return Math.min(n, Math.max(t, e));
}
function l(e) {
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
function u(e) {
	let t = c(e);
	return t <= .0031308 ? t * 12.92 : 1.055 * t ** (1 / 2.4) - .055;
}
function d(e) {
	let t = e.trim().replace(/^#/, ""), n = t.length === 3 ? t.split("").map((e) => `${e}${e}`).join("") : t;
	return /^[0-9a-fA-F]{6}$/.test(n) ? [
		0,
		2,
		4
	].map((e) => l(Number.parseInt(n.slice(e, e + 2), 16) / 255)) : [
		1,
		1,
		1
	];
}
function f(e) {
	return e.map((e) => Math.round(u(e) * 255));
}
function p(e) {
	return e <= .25 ? ((16 * e - 12) * e + 4) * e : Math.sqrt(e);
}
function m(e, t, n) {
	let r = c(t), i = c(n);
	switch (e) {
		case "multiply": return r * i;
		case "screen": return r + i - r * i;
		case "overlay": return r <= .5 ? 2 * r * i : 1 - 2 * (1 - r) * (1 - i);
		case "darken": return Math.min(r, i);
		case "lighten": return Math.max(r, i);
		case "color-dodge": return r === 0 ? 0 : i === 1 ? 1 : Math.min(1, r / (1 - i));
		case "color-burn": return r === 1 ? 1 : i === 0 ? 0 : 1 - Math.min(1, (1 - r) / i);
		case "hard-light": return i <= .5 ? 2 * r * i : r + (2 * i - 1) - r * (2 * i - 1);
		case "soft-light": return i <= .5 ? r - (1 - 2 * i) * r * (1 - r) : r + (2 * i - 1) * (p(r) - r);
		case "difference": return Math.abs(r - i);
		case "exclusion": return r + i - 2 * r * i;
		default: return i;
	}
}
function h(e, t, n, r) {
	let i = c(t), a = c(r);
	return c(c(m(e, i, n)) * a + i * (1 - a));
}
function g(e, t, n, r) {
	return [
		h(r, e[0], t[0], n),
		h(r, e[1], t[1], n),
		h(r, e[2], t[2], n)
	];
}
function _(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n += 1) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return (t >>> 0).toString(36);
}
//#endregion
//#region manifest.ts
function v(e) {
	return e.version === 2 ? e : {
		composition: e.composition,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	};
}
//#endregion
//#region evaluator.ts
var y = Math.PI * 2;
function b(e, t, n) {
	return e + (t - e) * n;
}
function x(e) {
	return e.map((e) => ({
		alpha: c(e.opacity / 100),
		color: d(e.color),
		t: c(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function S(e, t) {
	if (e.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = c(t), r = e[0], i = e[e.length - 1];
	if (n <= r.t) return [...r.color, r.alpha];
	if (n >= i.t) return [...i.color, i.alpha];
	for (let t = 0; t < e.length - 1; t += 1) {
		let r = e[t], i = e[t + 1];
		if (n < r.t || n > i.t) continue;
		let a = i.t - r.t, o = a <= 0 ? 0 : (n - r.t) / a;
		return [
			b(r.color[0], i.color[0], o),
			b(r.color[1], i.color[1], o),
			b(r.color[2], i.color[2], o),
			b(r.alpha, i.alpha, o)
		];
	}
	return [...i.color, i.alpha];
}
function ee(e) {
	let t = e * Math.PI / 180;
	return [
		Math.sin(t),
		Math.cos(t),
		0
	];
}
function te(e, t) {
	let n = ee(t.rotation), r = e[0] * n[0] + e[1] * n[1] + e[2] * n[2];
	return S(x(t.stops), r * .5 + .5);
}
function C(e, t) {
	let n = (e - .5) * y, r = (.5 - t) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function w(e, t) {
	let n = (e - .5) * y, r = (t - .5) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function T(e) {
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
function E(e, t, n) {
	if (t <= 0) return e;
	let r = Math.max(1e-4, n), i = [
		Math.sin((e[1] * r + .23) * y) * Math.cos((e[2] * r + .41) * y),
		Math.cos((e[2] * r + .17) * y) * Math.sin((e[0] * r + .37) * y),
		Math.sin((e[0] * r - .31) * y) * Math.cos((e[1] * r + .29) * y)
	];
	return T([
		e[0] + i[0] * t,
		e[1] + i[1] * t,
		e[2] + i[2] * t
	]);
}
function D(e, t) {
	return 1 - c(e[0] * t[0] + e[1] * t[1] + e[2] * t[2], -1, 1);
}
function ne(e, t) {
	if (t.anchors.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = E(e, c(t.amplitude, 0, .6), Math.max(1e-4, t.frequency)), r = 0, i = 0, a = 0, o = 0;
	return t.anchors.forEach((e) => {
		let s = D(n, C(e.x, e.y)), c = t.mode === "gaussian" ? Math.exp(-(s * s) / (2 * (.46 / t.power) ** 2)) : 1 / (s + 5e-4) ** t.power, l = d(e.color);
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
function re(e, t) {
	return t.type === "gradient" ? te(e, t.params) : ne(e, t.params);
}
function O(e, t) {
	return t.filter((e) => e.enabled).reverse().reduce((t, n) => {
		let r = n.type === "group" ? [...O(e, n.children), 1] : re(e, n), i = c(r[3] * (n.opacity / 100));
		return g(t, [
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
function k(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = k(n.children, t);
		if (e) return e;
	}
	return null;
}
function A(e, t, n = {}) {
	let r = v(e), i = n.targetGroupId ? k(r.nodes, n.targetGroupId) : null;
	return O(t, n.targetGroupId ? i ? [i] : [] : r.nodes);
}
//#endregion
//#region bake.ts
var j = 1024, M = "0.1.0", N = /* @__PURE__ */ new Map();
function P(e = {}) {
	let t = Math.max(.1, e.dpr ?? 1), n = Math.max(1, Math.floor((e.width ?? 1024) * t)), r = Math.max(1, Math.floor((e.height ?? n / 2) * t));
	return {
		cache: e.cache ?? !0,
		dpr: t,
		height: r,
		targetGroupId: e.targetGroupId,
		width: n
	};
}
function F(e, t) {
	return _(JSON.stringify({
		manifest: e,
		options: t,
		runtimeVersion: M
	}));
}
function I() {
	N.clear();
}
function L(e, t = {}) {
	let n = P(t), r = F(e, n);
	if (n.cache) {
		let e = N.get(r);
		if (e) return {
			...e,
			data: new Uint8ClampedArray(e.data)
		};
	}
	let { height: i, targetGroupId: a, width: o } = n, s = new Uint8ClampedArray(o * i * 4);
	for (let t = 0; t < i; t += 1) {
		let n = (t + .5) / i;
		for (let r = 0; r < o; r += 1) {
			let [i, c, l] = f(A(e, w((r + .5) / o, n), { targetGroupId: a })), u = (t * o + r) * 4;
			s[u] = i, s[u + 1] = c, s[u + 2] = l, s[u + 3] = 255;
		}
	}
	let c = {
		data: s,
		height: i,
		width: o
	};
	return n.cache && N.set(r, {
		...c,
		data: new Uint8ClampedArray(s)
	}), c;
}
//#endregion
//#region Skybox.ts
var R = {
	composition: {
		mode: "alpha-over",
		order: "bottom-to-top"
	},
	nodes: [],
	version: 2
};
function z(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function B(e, t) {
	let [n, r, i] = d(e);
	return `${t === "wgsl" ? "vec3<f32>" : "vec3"}(${z(n)}, ${z(r)}, ${z(i)})`;
}
function V(e, t, n) {
	return `${n === "wgsl" ? "vec4<f32>" : "vec4"}(${B(e, n)}, ${z(c(t))})`;
}
function H(e, t, n) {
	let r = (c(e) - .5) * Math.PI * 2, i = (.5 - c(t)) * Math.PI, a = Math.cos(i);
	return `${n === "wgsl" ? "vec3<f32>" : "vec3"}(${z(a * Math.cos(r))}, ${z(Math.sin(i))}, ${z(a * Math.sin(r))})`;
}
function U(e, t) {
	return t === "wgsl" ? `vec3<f32>(${z(e)})` : `vec3(${z(e)})`;
}
function W(e, t, n, r) {
	return r === "wgsl" ? `var ${e}: ${t} = ${n};` : `${t} ${e} = ${n};`;
}
function G(e) {
	return e.filter((e) => e.enabled).reverse();
}
function K(e, t) {
	let n = [...e.stops].map((e) => ({
		color: e.color,
		opacity: c(e.opacity / 100),
		t: c(e.location / 100)
	})).sort((e, t) => e.t - t.t), r = t === "wgsl" ? "vec4<f32>" : "vec4", i = t === "wgsl" ? "vec3<f32>" : "vec3";
	if (n.length === 0) return `effectColor = ${r}(0.0, 0.0, 0.0, 0.0);`;
	let a = e.rotation * Math.PI / 180, o = `${i}(${z(Math.sin(a))}, ${z(Math.cos(a))}, 0.0)`, s = n.slice(0, -1).map((e, r) => {
		let i = n[r + 1], a = Math.max(1e-5, i.t - e.t), o = `clamp((gradientT - ${z(e.t)}) / ${z(a)}, 0.0, 1.0)`;
		return `${r === 0 ? "if" : "else if"} (gradientT <= ${z(i.t)}) {
      effectColor = mix(${V(e.color, e.opacity, t)}, ${V(i.color, i.opacity, t)}, ${o});
    }`;
	}), l = n[n.length - 1];
	return `{
    ${t === "wgsl" ? "let" : "vec3"} gradientAxis = normalize(${o});
    ${t === "wgsl" ? "let" : "float"} gradientT = dot(direction, gradientAxis) * 0.5 + 0.5;
    ${s.join("\n")}
    ${s.length > 0 ? "else" : ""} {
      effectColor = ${V(l.color, l.opacity, t)};
    }
  }`;
}
function q(e, t) {
	let n = t === "wgsl" ? "vec4<f32>" : "vec4", r = t === "wgsl" ? "vec3<f32>" : "vec3", i = t === "wgsl" ? "let" : "float";
	if (e.anchors.length === 0) return `effectColor = ${n}(0.0, 0.0, 0.0, 0.0);`;
	let a = c(e.amplitude, 0, .6), o = Math.max(1e-4, e.frequency), s = Math.max(1e-4, e.power), l = .46 / s, u = e.anchors.map((n) => `{
        ${i} anchorDirection = normalize(${H(n.x, n.y, t)});
        ${i} anchorDistance = 1.0 - clamp(dot(fieldDirection, anchorDirection), -1.0, 1.0);
        ${i} weight = ${e.mode === "gaussian" ? `exp(-(anchorDistance * anchorDistance) / ${z(2 * l * l)})` : `1.0 / pow(anchorDistance + 0.0005, ${z(s)})`};
        weightedColor += ${B(n.color, t)} * weight;
        weightSum += weight;
      }`).join("\n");
	return `{
    ${i} warpAmplitude = ${z(a)};
    ${i} warpFrequency = ${z(o)};
    ${W("fieldDirection", r, "direction", t)}
    ${i} warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      ${i} warpX = sin((direction.y * warpFrequency + 0.23) * ${z(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${z(Math.PI * 2)});
      ${i} warpY = cos((direction.z * warpFrequency + 0.17) * ${z(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${z(Math.PI * 2)});
      ${i} warpZ = sin((direction.x * warpFrequency - 0.31) * ${z(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${z(Math.PI * 2)});
      fieldDirection = normalize(direction + ${r}(warpX, warpY, warpZ) * warpScale);
    }
    ${W("weightedColor", r, `${r}(0.0)`, t)}
    ${W("weightSum", t === "wgsl" ? "f32" : "float", "0.0", t)}
    ${u}
    if (weightSum > 0.0) {
      effectColor = ${n}(weightedColor / weightSum, 1.0);
    } else {
      effectColor = ${n}(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
function J(e, t) {
	return e.type === "gradient" ? K(e.params, t) : q(e.params, t);
}
function Y(e, t, n, r) {
	return r === "wgsl" ? `select(${n}, ${t}, ${e})` : `((${e}) ? ${t} : ${n})`;
}
function ie(e, t) {
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
	let n = U(1, t), r = U(.5, t), i = U(0, t), a = "effectColor.rgb", o = "composedColor";
	switch (e.blendMode) {
		case "darken": return `min(${o}, ${a})`;
		case "multiply": return `${o} * ${a}`;
		case "color-burn": return Y(`${o} == ${n}`, n, Y(`${a} == ${i}`, i, `${n} - min(${n}, (${n} - ${o}) / ${a})`, t), t);
		case "lighten": return `max(${o}, ${a})`;
		case "screen": return `${o} + ${a} - ${o} * ${a}`;
		case "color-dodge": return Y(`${o} == ${i}`, i, Y(`${a} == ${n}`, n, `min(${n}, ${o} / (${n} - ${a}))`, t), t);
		case "overlay": return Y(`${o} <= ${r}`, `2.0 * ${o} * ${a}`, `${n} - 2.0 * (${n} - ${o}) * (${n} - ${a})`, t);
		case "soft-light": return Y(`${a} <= ${r}`, `${o} - (${n} - 2.0 * ${a}) * ${o} * (${n} - ${o})`, `${o} + (2.0 * ${a} - ${n}) * (softLightD - ${o})`, t);
		case "hard-light": return Y(`${a} <= ${r}`, `2.0 * ${o} * ${a}`, `${o} + (2.0 * ${a} - ${n}) - ${o} * (2.0 * ${a} - ${n})`, t);
		case "difference": return `abs(${o} - ${a})`;
		case "exclusion": return `${o} + ${a} - 2.0 * ${o} * ${a}`;
		default: return a;
	}
}
function ae(e, t) {
	if (t === "glsl" || e.blendMode !== "soft-light") return "";
	let n = t === "wgsl" ? "vec3<f32>" : "vec3";
	return `${t === "wgsl" ? "let" : "vec3"} softLightD = ${Y(`composedColor <= ${n}(0.25)`, `((16.0 * composedColor - ${n}(12.0)) * composedColor + ${n}(4.0)) * composedColor`, "sqrt(composedColor)", t)};`;
}
function X(e, t, n = 0) {
	let r = t === "wgsl" ? "vec3<f32>" : "vec3", i = t === "wgsl" ? "vec4<f32>" : "vec4";
	return G(e).map((e, a) => {
		let o = e.type === "group" ? `effectColor = ${i}(${`groupColor${n}_${a}`}, 1.0);` : J(e, t), s = `groupColor${n}_${a}`;
		return `{
        ${e.type === "group" ? `${W(s, r, `${r}(0.0)`, t)}
        {
          ${W("previousComposedColor", r, "composedColor", t)}
          composedColor = ${r}(0.0);
          ${X(e.children, t, n + 1)}
          ${s} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${W("effectColor", i, `${i}(0.0)`, t)}
        ${o}
        ${t === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${z(e.opacity / 100)}, 0.0, 1.0);
        ${ae(e, t)}
        ${t === "wgsl" ? "let" : "vec3"} blendedColor = clamp(${ie(e, t)}, ${r}(0.0), ${r}(1.0));
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          ${r}(0.0),
          ${r}(1.0)
        );
      }`;
	}).join("\n");
}
function oe(e) {
	return s(`
    fn skyboxStudioSample(direction: vec3<f32>) -> vec4<f32> {
      var composedColor = vec3<f32>(0.0);
      ${X(e.nodes, "wgsl")}
      return vec4<f32>(composedColor, 1.0);
    }
  `);
}
function Z(s) {
	let c = new t(), l = oe(s), u = n(() => {
		let e = i;
		return e.z.assign(e.w), e;
	})();
	return c.side = e.BackSide, c.depthTest = !1, c.depthWrite = !1, c.vertexNode = u, c.colorNode = l({ direction: a(o.sub(r)) }), c;
}
function Q(t) {
	let n = X(t.nodes, "glsl");
	return new e.ShaderMaterial({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: `
      precision highp float;
      varying vec3 vDirection;

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
        ${n}
        gl_FragColor = vec4(composedColor, 1.0);
      }
    `
	});
}
function se(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function $(t, n = {}) {
	let r = L(t, n), i = se(r.width, r.height), a = i.getContext("2d");
	if (!a || !("putImageData" in a)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	a.putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
	let o = new e.CanvasTexture(i);
	return o.mapping = e.EquirectangularReflectionMapping, o.wrapS = e.RepeatWrapping, o.wrapT = e.ClampToEdgeWrapping, o.colorSpace = e.SRGBColorSpace, o.flipY = !1, o.needsUpdate = !0, o;
}
function ce(t, n) {
	return new e.MeshBasicMaterial({
		map: $(t, n),
		side: e.BackSide
	});
}
function le(e) {
	return !!(e && "isWebGPURenderer" in e && e.isWebGPURenderer);
}
function ue(e, t) {
	return e === "auto" ? le(t) ? "live-webgpu" : "live-webgl" : e;
}
var de = class extends e.Mesh {
	#e = {};
	#t = R;
	#n = "auto";
	#r = null;
	constructor() {
		super(new e.BoxGeometry(1, 1, 1), Z(R)), this.frustumCulled = !1, this.renderOrder = -1;
	}
	fromManifest(e) {
		return this.#t = v(e), this;
	}
	setBakeOptions(e) {
		return this.#e = {
			...this.#e,
			...e
		}, this;
	}
	setRenderer(e) {
		return this.#r = e, this;
	}
	setRenderMode(e) {
		return this.#n = e, this;
	}
	otherOverridingSetup() {
		return this;
	}
	load(e) {
		return e && (this.#r = e), this.setManifest(this.#t), this;
	}
	setManifest(e) {
		this.#t = v(e);
		let t = this.material, n = ue(this.#n, this.#r);
		n === "live-webgpu" ? this.material = Z(this.#t) : n === "live-webgl" ? this.material = Q(this.#t) : this.material = ce(this.#t, this.#e), t.dispose();
		let r = "map" in t ? t.map : null;
		return r && r.dispose(), this;
	}
	invalidateBakeCache() {
		return I(), this;
	}
	dispose() {
		let e = "map" in this.material ? this.material.map : null;
		this.geometry.dispose(), this.material.dispose(), e?.dispose();
	}
};
//#endregion
export { j as DEFAULT_BAKE_WIDTH, de as Skybox, L as bakeSkyboxImageData, m as blendChannel, c as clamp, h as compositeBlendChannel, g as compositeOver, F as createBakeCacheKey, $ as createBakedSkyboxTexture, C as equirectPointToDirection, w as equirectUvToDirection, A as evaluateSkyboxDirection, I as invalidateBakeCache, u as linearChannelToSrgb, f as linearRgbToSrgbBytes, v as migrateManifestToV2, d as parseHexColor, P as resolveBakeOptions, l as srgbChannelToLinear };
