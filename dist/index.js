import * as e from "three";
import { NodeMaterial as t } from "three/webgpu";
import { Fn as n, cameraPosition as r, modelViewProjection as i, normalize as a, positionWorld as o, texture as s, wgslFn as c } from "three/tsl";
//#region math.ts
function l(e, t = 0, n = 1) {
	return Math.min(n, Math.max(t, e));
}
function u(e) {
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
function d(e) {
	let t = l(e);
	return t <= .0031308 ? t * 12.92 : 1.055 * t ** (1 / 2.4) - .055;
}
function f(e) {
	let t = e.trim().replace(/^#/, ""), n = t.length === 3 ? t.split("").map((e) => `${e}${e}`).join("") : t;
	return /^[0-9a-fA-F]{6}$/.test(n) ? [
		0,
		2,
		4
	].map((e) => u(Number.parseInt(n.slice(e, e + 2), 16) / 255)) : [
		1,
		1,
		1
	];
}
function p(e) {
	return e.map((e) => Math.round(d(e) * 255));
}
function ee(e) {
	return e <= .25 ? ((16 * e - 12) * e + 4) * e : Math.sqrt(e);
}
function m(e, t, n) {
	let r = l(t), i = l(n);
	switch (e) {
		case "multiply": return r * i;
		case "screen": return r + i - r * i;
		case "overlay": return r <= .5 ? 2 * r * i : 1 - 2 * (1 - r) * (1 - i);
		case "darken": return Math.min(r, i);
		case "lighten": return Math.max(r, i);
		case "color-dodge": return r === 0 ? 0 : i === 1 ? 1 : Math.min(1, r / (1 - i));
		case "color-burn": return r === 1 ? 1 : i === 0 ? 0 : 1 - Math.min(1, (1 - r) / i);
		case "hard-light": return i <= .5 ? 2 * r * i : r + (2 * i - 1) - r * (2 * i - 1);
		case "soft-light": return i <= .5 ? r - (1 - 2 * i) * r * (1 - r) : r + (2 * i - 1) * (ee(r) - r);
		case "difference": return Math.abs(r - i);
		case "exclusion": return r + i - 2 * r * i;
		default: return i;
	}
}
function h(e, t, n, r) {
	let i = l(t), a = l(r);
	return l(l(m(e, i, n)) * a + i * (1 - a));
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
var v = { type: "box" };
function y(e) {
	return e.version === 2 ? {
		...e,
		geometry: e.geometry ?? v
	} : {
		composition: e.composition,
		geometry: v,
		nodes: e.layers.map((e) => ({ ...e })),
		version: 2
	};
}
//#endregion
//#region evaluator.ts
var b = Math.PI * 2;
function x(e, t, n) {
	return e + (t - e) * n;
}
function S(e) {
	return e.map((e) => ({
		alpha: l(e.opacity / 100),
		color: f(e.color),
		t: l(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function C(e, t) {
	if (e.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = l(t), r = e[0], i = e[e.length - 1];
	if (n <= r.t) return [...r.color, r.alpha];
	if (n >= i.t) return [...i.color, i.alpha];
	for (let t = 0; t < e.length - 1; t += 1) {
		let r = e[t], i = e[t + 1];
		if (n < r.t || n > i.t) continue;
		let a = i.t - r.t, o = a <= 0 ? 0 : (n - r.t) / a;
		return [
			x(r.color[0], i.color[0], o),
			x(r.color[1], i.color[1], o),
			x(r.color[2], i.color[2], o),
			x(r.alpha, i.alpha, o)
		];
	}
	return [...i.color, i.alpha];
}
function te(e) {
	let t = e * Math.PI / 180;
	return [
		Math.sin(t),
		Math.cos(t),
		0
	];
}
function ne(e, t) {
	let n = te(t.rotation), r = e[0] * n[0] + e[1] * n[1] + e[2] * n[2];
	return C(S(t.stops), r * .5 + .5);
}
function w(e, t) {
	let n = (e - .5) * b, r = (.5 - t) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function T(e, t) {
	let n = (e - .5) * b, r = (t - .5) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function E(e) {
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
function D(e, t, n) {
	if (t <= 0) return e;
	let r = Math.max(1e-4, n), i = [
		Math.sin((e[1] * r + .23) * b) * Math.cos((e[2] * r + .41) * b),
		Math.cos((e[2] * r + .17) * b) * Math.sin((e[0] * r + .37) * b),
		Math.sin((e[0] * r - .31) * b) * Math.cos((e[1] * r + .29) * b)
	];
	return E([
		e[0] + i[0] * t,
		e[1] + i[1] * t,
		e[2] + i[2] * t
	]);
}
function re(e, t) {
	return 1 - l(e[0] * t[0] + e[1] * t[1] + e[2] * t[2], -1, 1);
}
function ie(e, t) {
	if (t.anchors.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = D(e, l(t.amplitude, 0, .6), Math.max(1e-4, t.frequency)), r = 0, i = 0, a = 0, o = 0;
	return t.anchors.forEach((e) => {
		let s = re(n, w(e.x, e.y)), c = t.mode === "gaussian" ? Math.exp(-(s * s) / (2 * (.46 / t.power) ** 2)) : 1 / (s + 5e-4) ** t.power, l = f(e.color);
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
function O(e, t) {
	return t.type === "gradient" ? ne(e, t.params) : ie(e, t.params);
}
function k(e, t) {
	return t.filter((e) => e.enabled).reverse().reduce((t, n) => {
		let r = n.type === "group" ? [...k(e, n.children), 1] : O(e, n), i = l(r[3] * (n.opacity / 100));
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
function A(e, t) {
	for (let n of e) if (n.type === "group") {
		if (n.id === t) return n;
		let e = A(n.children, t);
		if (e) return e;
	}
	return null;
}
function j(e, t, n = {}) {
	let r = y(e), i = n.targetGroupId ? A(r.nodes, n.targetGroupId) : null;
	return k(t, n.targetGroupId ? i ? [i] : [] : r.nodes);
}
//#endregion
//#region bake.ts
var ae = 1024, M = "0.1.0", N = /* @__PURE__ */ new Map();
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
			let [i, c, l] = p(j(e, T((r + .5) / o, n), { targetGroupId: a })), u = (t * o + r) * 4;
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
	geometry: v,
	nodes: [],
	version: 2
};
function z(e) {
	return e ?? v;
}
function B(t = v) {
	return z(t).type === "sphere" ? new e.SphereGeometry(1, 64, 32) : new e.BoxGeometry(1, 1, 1);
}
function V(t = v) {
	if (z(t).type === "sphere") {
		let t = new e.SphereGeometry(1, 32, 16), n = new e.WireframeGeometry(t);
		return t.dispose(), n;
	}
	let n = new e.BoxGeometry(1, 1, 1), r = new e.EdgesGeometry(n);
	return n.dispose(), r;
}
function H(e) {
	return Number.isFinite(e) ? e.toFixed(8) : "0.0";
}
function U(e, t) {
	let [n, r, i] = f(e);
	return `${t === "wgsl" ? "vec3<f32>" : "vec3"}(${H(n)}, ${H(r)}, ${H(i)})`;
}
function W(e, t, n) {
	return `${n === "wgsl" ? "vec4<f32>" : "vec4"}(${U(e, n)}, ${H(l(t))})`;
}
function G(e, t, n) {
	let r = (l(e) - .5) * Math.PI * 2, i = (.5 - l(t)) * Math.PI, a = Math.cos(i);
	return `${n === "wgsl" ? "vec3<f32>" : "vec3"}(${H(a * Math.cos(r))}, ${H(Math.sin(i))}, ${H(a * Math.sin(r))})`;
}
function K(e, t) {
	return t === "wgsl" ? `vec3<f32>(${H(e)})` : `vec3(${H(e)})`;
}
function q(e, t, n, r) {
	return r === "wgsl" ? `var ${e}: ${t} = ${n};` : `${t} ${e} = ${n};`;
}
function oe(e) {
	return e.filter((e) => e.enabled).reverse();
}
function se(e, t) {
	let n = [...e.stops].map((e) => ({
		color: e.color,
		opacity: l(e.opacity / 100),
		t: l(e.location / 100)
	})).sort((e, t) => e.t - t.t), r = t === "wgsl" ? "vec4<f32>" : "vec4", i = t === "wgsl" ? "vec3<f32>" : "vec3";
	if (n.length === 0) return `effectColor = ${r}(0.0, 0.0, 0.0, 0.0);`;
	let a = e.rotation * Math.PI / 180, o = `${i}(${H(Math.sin(a))}, ${H(Math.cos(a))}, 0.0)`, s = n.slice(0, -1).map((e, r) => {
		let i = n[r + 1], a = Math.max(1e-5, i.t - e.t), o = `clamp((gradientT - ${H(e.t)}) / ${H(a)}, 0.0, 1.0)`;
		return `${r === 0 ? "if" : "else if"} (gradientT <= ${H(i.t)}) {
      effectColor = mix(${W(e.color, e.opacity, t)}, ${W(i.color, i.opacity, t)}, ${o});
    }`;
	}), c = n[n.length - 1];
	return `{
    ${t === "wgsl" ? "let" : "vec3"} gradientAxis = normalize(${o});
    ${t === "wgsl" ? "let" : "float"} gradientT = dot(direction, gradientAxis) * 0.5 + 0.5;
    ${s.join("\n")}
    ${s.length > 0 ? "else" : ""} {
      effectColor = ${W(c.color, c.opacity, t)};
    }
  }`;
}
function ce(e, t) {
	let n = t === "wgsl" ? "vec4<f32>" : "vec4", r = t === "wgsl" ? "vec3<f32>" : "vec3", i = t === "wgsl" ? "let" : "float";
	if (e.anchors.length === 0) return `effectColor = ${n}(0.0, 0.0, 0.0, 0.0);`;
	let a = l(e.amplitude, 0, .6), o = Math.max(1e-4, e.frequency), s = Math.max(1e-4, e.power), c = .46 / s, u = e.anchors.map((n) => `{
        ${i} anchorDirection = normalize(${G(n.x, n.y, t)});
        ${i} anchorDistance = 1.0 - clamp(dot(fieldDirection, anchorDirection), -1.0, 1.0);
        ${i} weight = ${e.mode === "gaussian" ? `exp(-(anchorDistance * anchorDistance) / ${H(2 * c * c)})` : `1.0 / pow(anchorDistance + 0.0005, ${H(s)})`};
        weightedColor += ${U(n.color, t)} * weight;
        weightSum += weight;
      }`).join("\n");
	return `{
    ${i} warpAmplitude = ${H(a)};
    ${i} warpFrequency = ${H(o)};
    ${q("fieldDirection", r, "direction", t)}
    ${i} warpScale = warpAmplitude;
    if (warpScale > 0.0) {
      ${i} warpX = sin((direction.y * warpFrequency + 0.23) * ${H(Math.PI * 2)}) * cos((direction.z * warpFrequency + 0.41) * ${H(Math.PI * 2)});
      ${i} warpY = cos((direction.z * warpFrequency + 0.17) * ${H(Math.PI * 2)}) * sin((direction.x * warpFrequency + 0.37) * ${H(Math.PI * 2)});
      ${i} warpZ = sin((direction.x * warpFrequency - 0.31) * ${H(Math.PI * 2)}) * cos((direction.y * warpFrequency + 0.29) * ${H(Math.PI * 2)});
      fieldDirection = normalize(direction + ${r}(warpX, warpY, warpZ) * warpScale);
    }
    ${q("weightedColor", r, `${r}(0.0)`, t)}
    ${q("weightSum", t === "wgsl" ? "f32" : "float", "0.0", t)}
    ${u}
    if (weightSum > 0.0) {
      effectColor = ${n}(weightedColor / weightSum, 1.0);
    } else {
      effectColor = ${n}(0.0, 0.0, 0.0, 0.0);
    }
  }`;
}
function le(e, t) {
	return e.type === "gradient" ? se(e.params, t) : ce(e.params, t);
}
function J(e, t, n, r) {
	return r === "wgsl" ? `select(${n}, ${t}, ${e})` : `((${e}) ? ${t} : ${n})`;
}
function ue(e, t) {
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
	let n = K(1, t), r = K(.5, t), i = K(0, t), a = "effectColor.rgb", o = "composedColor";
	switch (e.blendMode) {
		case "darken": return `min(${o}, ${a})`;
		case "multiply": return `${o} * ${a}`;
		case "color-burn": return J(`${o} == ${n}`, n, J(`${a} == ${i}`, i, `${n} - min(${n}, (${n} - ${o}) / ${a})`, t), t);
		case "lighten": return `max(${o}, ${a})`;
		case "screen": return `${o} + ${a} - ${o} * ${a}`;
		case "color-dodge": return J(`${o} == ${i}`, i, J(`${a} == ${n}`, n, `min(${n}, ${o} / (${n} - ${a}))`, t), t);
		case "overlay": return J(`${o} <= ${r}`, `2.0 * ${o} * ${a}`, `${n} - 2.0 * (${n} - ${o}) * (${n} - ${a})`, t);
		case "soft-light": return J(`${a} <= ${r}`, `${o} - (${n} - 2.0 * ${a}) * ${o} * (${n} - ${o})`, `${o} + (2.0 * ${a} - ${n}) * (softLightD - ${o})`, t);
		case "hard-light": return J(`${a} <= ${r}`, `2.0 * ${o} * ${a}`, `${o} + (2.0 * ${a} - ${n}) - ${o} * (2.0 * ${a} - ${n})`, t);
		case "difference": return `abs(${o} - ${a})`;
		case "exclusion": return `${o} + ${a} - 2.0 * ${o} * ${a}`;
		default: return a;
	}
}
function de(e, t) {
	if (t === "glsl" || e.blendMode !== "soft-light") return "";
	let n = t === "wgsl" ? "vec3<f32>" : "vec3";
	return `${t === "wgsl" ? "let" : "vec3"} softLightD = ${J(`composedColor <= ${n}(0.25)`, `((16.0 * composedColor - ${n}(12.0)) * composedColor + ${n}(4.0)) * composedColor`, "sqrt(composedColor)", t)};`;
}
function Y(e, t, n = 0) {
	let r = t === "wgsl" ? "vec3<f32>" : "vec3", i = t === "wgsl" ? "vec4<f32>" : "vec4";
	return oe(e).map((e, a) => {
		let o = e.type === "group" ? `effectColor = ${i}(${`groupColor${n}_${a}`}, 1.0);` : le(e, t), s = `groupColor${n}_${a}`;
		return `{
        ${e.type === "group" ? `${q(s, r, `${r}(0.0)`, t)}
        {
          ${q("previousComposedColor", r, "composedColor", t)}
          composedColor = ${r}(0.0);
          ${Y(e.children, t, n + 1)}
          ${s} = composedColor;
          composedColor = previousComposedColor;
        }` : ""}
        ${q("effectColor", i, `${i}(0.0)`, t)}
        ${o}
        ${t === "wgsl" ? "let" : "float"} sourceAlpha = clamp(effectColor.a * ${H(e.opacity / 100)}, 0.0, 1.0);
        ${de(e, t)}
        ${t === "wgsl" ? "let" : "vec3"} blendedColor = clamp(${ue(e, t)}, ${r}(0.0), ${r}(1.0));
        composedColor = clamp(
          blendedColor * sourceAlpha + composedColor * (1.0 - sourceAlpha),
          ${r}(0.0),
          ${r}(1.0)
        );
      }`;
	}).join("\n");
}
function fe(e) {
	return c(`
    fn skyboxStudioSample(direction: vec3<f32>) -> vec4<f32> {
      var composedColor = vec3<f32>(0.0);
      ${Y(e.nodes, "wgsl")}
      return vec4<f32>(composedColor, 1.0);
    }
  `);
}
function X(s) {
	let c = new t(), l = fe(s), u = n(() => {
		let e = i;
		return e.z.assign(e.w), e;
	})();
	return c.side = e.BackSide, c.depthTest = !1, c.depthWrite = !1, c.vertexNode = u, c.colorNode = l({ direction: a(o.sub(r)) }), c;
}
var pe = c("\n  fn skyboxStudioDirectionToEquirectUv(direction: vec3<f32>) -> vec2<f32> {\n    let normalizedDirection = normalize(direction);\n    let longitude = atan2(normalizedDirection.z, normalizedDirection.x);\n    let latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n    return vec2<f32>(longitude / 6.283185307179586 + 0.5, latitude / 3.141592653589793 + 0.5);\n  }\n");
function me(c) {
	let l = new t(), u = n(() => {
		let e = i;
		return e.z.assign(e.w), e;
	})(), d = a(o.sub(r));
	return l.side = e.BackSide, l.depthTest = !1, l.depthWrite = !1, l.vertexNode = u, l.colorNode = s(c, pe({ direction: d })), l;
}
function he(t) {
	let n = Y(t.nodes, "glsl");
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
function ge(e, t) {
	if (typeof document < "u") {
		let n = document.createElement("canvas");
		return n.width = e, n.height = t, n;
	}
	return new OffscreenCanvas(e, t);
}
function Z(t, n = {}) {
	let r = L(t, n), i = ge(r.width, r.height), a = i.getContext("2d");
	if (!a || !("putImageData" in a)) throw Error("Skybox runtime: unable to create a 2D canvas context for baking.");
	a.putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
	let o = new e.CanvasTexture(i);
	return o.mapping = e.EquirectangularReflectionMapping, o.wrapS = e.RepeatWrapping, o.wrapT = e.ClampToEdgeWrapping, o.colorSpace = e.SRGBColorSpace, o.flipY = !1, o.needsUpdate = !0, o;
}
function _e(t) {
	return new e.ShaderMaterial({
		depthTest: !1,
		depthWrite: !1,
		side: e.BackSide,
		uniforms: { skyboxTexture: { value: t } },
		vertexShader: "\n      varying vec3 vDirection;\n      void main() {\n        vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n        vDirection = worldPosition.xyz - cameraPosition;\n        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        gl_Position = clipPosition.xyww;\n      }\n    ",
		fragmentShader: "\n      precision highp float;\n      uniform sampler2D skyboxTexture;\n      varying vec3 vDirection;\n\n      const float PI = 3.141592653589793;\n\n      vec2 directionToEquirectUv(vec3 direction) {\n        vec3 normalizedDirection = normalize(direction);\n        float longitude = atan(normalizedDirection.z, normalizedDirection.x);\n        float latitude = asin(clamp(normalizedDirection.y, -1.0, 1.0));\n\n        return vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);\n      }\n\n      void main() {\n        gl_FragColor = texture2D(skyboxTexture, directionToEquirectUv(vDirection));\n      }\n    "
	});
}
function Q(e, t) {
	return $(t) ? me(e) : _e(e);
}
function $(e) {
	return !!(e && "isWebGPURenderer" in e && e.isWebGPURenderer);
}
function ve(e, t) {
	return e === "auto" ? $(t) ? "live-webgpu" : "live-webgl" : e;
}
var ye = class extends e.Mesh {
	#e = {};
	#t = v;
	#n = R;
	#r = null;
	#i = "auto";
	#a = null;
	constructor() {
		super(B(v), X(R)), this.frustumCulled = !1, this.renderOrder = -1;
	}
	fromManifest(e) {
		return this.#n = y(e), this.applyGeometry(this.#n.geometry ?? v), this;
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
		return this.#a = e, this;
	}
	setRenderMode(e) {
		return this.#i = e, this;
	}
	otherOverridingSetup() {
		return this;
	}
	load(e) {
		return e && (this.#a = e), this.setManifest(this.#n), this;
	}
	applyGeometry(e) {
		let t = z(e);
		if (this.#t.type === t.type && this.geometry) return;
		let n = this.geometry;
		this.#t = t, this.geometry = B(t), n.dispose();
	}
	disposeOwnedTexture() {
		this.#r?.dispose(), this.#r = null;
	}
	replaceMaterial(e, t = null) {
		let n = this.material;
		this.material = e, n.dispose(), this.disposeOwnedTexture(), this.#r = t;
	}
	setManifest(e) {
		this.#n = y(e), this.applyGeometry(this.#n.geometry ?? this.#t);
		let t = ve(this.#i, this.#a);
		if (t === "live-webgpu") this.replaceMaterial(X(this.#n));
		else if (t === "live-webgl") this.replaceMaterial(he(this.#n));
		else {
			let e = Z(this.#n, this.#e);
			this.replaceMaterial(Q(e, this.#a), e);
		}
		return this;
	}
	setBakedTexture(e) {
		return this.replaceMaterial(Q(e, this.#a)), this;
	}
	invalidateBakeCache() {
		return I(), this;
	}
	dispose() {
		this.geometry.dispose(), this.material.dispose(), this.disposeOwnedTexture();
	}
};
//#endregion
export { ae as DEFAULT_BAKE_WIDTH, ye as Skybox, L as bakeSkyboxImageData, m as blendChannel, l as clamp, h as compositeBlendChannel, g as compositeOver, F as createBakeCacheKey, Z as createBakedSkyboxTexture, B as createSkyboxGeometry, V as createSkyboxWireGeometry, w as equirectPointToDirection, T as equirectUvToDirection, j as evaluateSkyboxDirection, I as invalidateBakeCache, d as linearChannelToSrgb, p as linearRgbToSrgbBytes, y as migrateManifestToV2, f as parseHexColor, P as resolveBakeOptions, u as srgbChannelToLinear };
