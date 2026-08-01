//#region src/layer-addons/registry.ts
var e = /* @__PURE__ */ new Map();
function t(t) {
	let n = e.get(t.type);
	e.set(t.type, {
		...n ?? { type: t.type },
		...t
	});
}
function n(t) {
	return e.get(t);
}
function r() {
	return Array.from(e.values());
}
function i(t) {
	return e.has(t);
}
//#endregion
//#region src/math.ts
function a(e, t = 0, n = 1) {
	return Math.min(n, Math.max(t, e));
}
function o(e) {
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
function s(e) {
	let t = a(e);
	return t <= .0031308 ? t * 12.92 : 1.055 * t ** (1 / 2.4) - .055;
}
function c(e) {
	let t = e.trim().replace(/^#/, ""), n = t.length === 3 ? t.split("").map((e) => `${e}${e}`).join("") : t;
	return /^[0-9a-fA-F]{6}$/.test(n) ? [
		0,
		2,
		4
	].map((e) => o(Number.parseInt(n.slice(e, e + 2), 16) / 255)) : [
		1,
		1,
		1
	];
}
function l(e) {
	return e.map((e) => Math.round(s(e) * 255));
}
function u(e) {
	return e <= .25 ? ((16 * e - 12) * e + 4) * e : Math.sqrt(e);
}
function d(e, t, n) {
	let r = a(t), i = a(n);
	switch (e) {
		case "multiply": return r * i;
		case "screen": return r + i - r * i;
		case "overlay": return r <= .5 ? 2 * r * i : 1 - 2 * (1 - r) * (1 - i);
		case "darken": return Math.min(r, i);
		case "lighten": return Math.max(r, i);
		case "color-dodge": return r === 0 ? 0 : i === 1 ? 1 : Math.min(1, r / (1 - i));
		case "color-burn": return r === 1 ? 1 : i === 0 ? 0 : 1 - Math.min(1, (1 - r) / i);
		case "hard-light": return i <= .5 ? 2 * r * i : r + (2 * i - 1) - r * (2 * i - 1);
		case "soft-light": return i <= .5 ? r - (1 - 2 * i) * r * (1 - r) : r + (2 * i - 1) * (u(r) - r);
		case "difference": return Math.abs(r - i);
		case "exclusion": return r + i - 2 * r * i;
		default: return i;
	}
}
function f(e, t, n, r) {
	let i = a(t), o = a(r);
	return a(a(d(e, i, n)) * o + i * (1 - o));
}
function p(e, t, n, r) {
	let i = a(t), c = a(r);
	return a(e === "normal" ? a(n) * c + i * (1 - c) : o(a(d(e, s(i), s(a(n))))) * c + i * (1 - c));
}
function m(e, t, n, r) {
	return [
		p(r, e[0], t[0], n),
		p(r, e[1], t[1], n),
		p(r, e[2], t[2], n)
	];
}
function h(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n += 1) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return (t >>> 0).toString(36);
}
//#endregion
//#region src/layer-addons/cpu-sampling.ts
var g = Math.PI * 2;
function _(e, t, n) {
	return e + (t - e) * n;
}
function v(e) {
	return e.map((e) => ({
		alpha: a(e.opacity / 100),
		color: c(e.color),
		midpoint: a((e.midpoint ?? 50) / 100, .01, .99),
		t: a(e.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function y(e, t) {
	return e <= t ? e / Math.max(t * 2, 1e-5) : .5 + (e - t) / Math.max((1 - t) * 2, 1e-5);
}
function b(e, t) {
	if (e.length === 0) return [
		0,
		0,
		0,
		0
	];
	let n = a(t), r = e[0], i = e[e.length - 1];
	if (n <= r.t) return [...r.color, r.alpha];
	if (n >= i.t) return [...i.color, i.alpha];
	for (let t = 0; t < e.length - 1; t += 1) {
		let r = e[t], i = e[t + 1];
		if (n < r.t || n > i.t) continue;
		let a = i.t - r.t, o = y(a <= 0 ? 0 : (n - r.t) / a, r.midpoint);
		return [
			_(r.color[0], i.color[0], o),
			_(r.color[1], i.color[1], o),
			_(r.color[2], i.color[2], o),
			_(r.alpha, i.alpha, o)
		];
	}
	return [...i.color, i.alpha];
}
function x(e, t, n) {
	let r = a((n - e) / Math.max(t - e, 1e-5));
	return r * r * (3 - 2 * r);
}
function S(e) {
	return e * e;
}
function C(e, t, n) {
	return [
		_(e[0], t[0], n),
		_(e[1], t[1], n),
		_(e[2], t[2], n)
	];
}
function w(e) {
	let t = a(e), n = [
		1,
		.12,
		.05
	];
	return n = C(n, [
		1,
		.55,
		.1
	], x(0, .28, t)), n = C(n, [
		1,
		.93,
		.6
	], x(.22, .45, t)), n = C(n, [
		1,
		1,
		1
	], x(.42, .6, t)), n = C(n, [
		.55,
		.8,
		1
	], x(.62, .85, t)), n = C(n, [
		.35,
		.5,
		1
	], x(.85, 1, t)), n;
}
function ee(e, t) {
	return [
		e[0] * t[0],
		e[1] * t[1],
		e[2] * t[2]
	];
}
function te(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function T(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function ne(e, t) {
	return C(t, ee(e, C([
		1,
		1,
		1
	], t, .82)), .82);
}
function re(e, t) {
	let n = (e - .5) * g, r = (.5 - t) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function E(e, t) {
	let n = (e - .5) * g, r = (t - .5) * Math.PI, i = Math.cos(r);
	return [
		i * Math.sin(n),
		Math.sin(r),
		-i * Math.cos(n)
	];
}
function D(e) {
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
function O(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function ie(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function ae(e, t, n) {
	let r = D(e), i = D(t), a = D(ie([
		0,
		1,
		0
	], i)), o = D(ie(i, a)), s = Math.max(O(r, i), 1e-6), c = O(r, a) / s / Math.max(n, 1e-4), l = O(r, o) / s / Math.max(n, 1e-4);
	return {
		x: c,
		y: l,
		d: Math.hypot(c, l)
	};
}
function oe(e, t, n) {
	if (t <= 0) return e;
	let r = Math.max(1e-4, n), i = [
		Math.sin((e[1] * r + .23) * g) * Math.cos((e[2] * r + .41) * g),
		Math.cos((e[2] * r + .17) * g) * Math.sin((e[0] * r + .37) * g),
		Math.sin((e[0] * r - .31) * g) * Math.cos((e[1] * r + .29) * g)
	];
	return D([
		e[0] + i[0] * t,
		e[1] + i[1] * t,
		e[2] + i[2] * t
	]);
}
function se(e, t) {
	return 1 - a(e[0] * t[0] + e[1] * t[1] + e[2] * t[2], -1, 1);
}
function ce(e, t, n) {
	return [
		_(e[0], t[0], n),
		_(e[1], t[1], n),
		_(e[2], t[2], n),
		_(e[3], t[3], n)
	];
}
function le(e, t, n) {
	let r = (t % e.width + e.width) % e.width, i = (Math.min(e.height - 1, Math.max(0, n)) * e.width + r) * 4;
	return [
		o((e.data[i] ?? 0) / 255),
		o((e.data[i + 1] ?? 0) / 255),
		o((e.data[i + 2] ?? 0) / 255),
		(e.data[i + 3] ?? 0) / 255
	];
}
function ue(e, t, n) {
	let r = Math.min(e.width - 1, Math.max(0, t)), i = (Math.min(e.height - 1, Math.max(0, n)) * e.width + r) * 4, a = e.pixels?.[i] ?? 0, s = e.pixels?.[i + 1] ?? 0, c = e.pixels?.[i + 2] ?? 0, l = e.pixels?.[i + 3] ?? 255;
	return [
		o(a / 255),
		o(s / 255),
		o(c / 255),
		l / 255
	];
}
//#endregion
//#region src/starfield-static.ts
var k = Math.PI * 2, de = 8, fe = 1e3, A = 2, pe = 128, me = 64, he = 4, ge = 8, _e = 12, ve = 2048 * 1024 * 1024, ye = 512 * 1024 * 1024, be = 128 * 1024 * 1024, xe = 8, Se = 1.75, Ce = 3.25, j = 1, we = 1.5, Te = 8, Ee = 2048, De = 5, Oe = 12, ke = .35, Ae = .25, je = [
	1,
	2,
	4,
	8,
	16
], Me = 1024, Ne = 8192, Pe = "medium", Fe = {
	high: { budgetBytes: ve },
	low: { budgetBytes: be },
	medium: { budgetBytes: ye }
}, M = {
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
}, N = {
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
}, P = [
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
], F = {
	amplitude: .045,
	anchors: P.map((e) => ({
		color: Be(e.color),
		...B(e.dir)
	})),
	frequency: 2.2,
	mode: "inverse-distance",
	power: 2
}, I = {
	altitudeCenterDeg: 0,
	altitudeSpanDeg: 180,
	azimuthCenterDeg: 0,
	azimuthSpanDeg: 360
}, Ie = {
	clip: I,
	nebula: N,
	nebulaField: F,
	quality: Pe,
	stars: M
}, Le = /* @__PURE__ */ new Map();
function L(e, t, n = -Infinity, r = Infinity) {
	return a(Number.isFinite(Number(e)) ? Number(e) : t, n, r);
}
function Re(e) {
	return e === "high" ? "high" : e === "low" ? "low" : Pe;
}
function ze(e) {
	return Fe[Re(e)];
}
function R(e, t) {
	return Array.isArray(e) ? [
		L(e[0], t[0], 0, 1),
		L(e[1], t[1], 0, 1),
		L(e[2], t[2], 0, 1)
	] : [...t];
}
function Be(e) {
	return `#${e.map((e) => Math.round(a(e) * 255).toString(16).padStart(2, "0")).join("")}`;
}
function Ve(e) {
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
function z(e) {
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
function He(e, t) {
	return z(Array.isArray(e) ? [
		L(e[0], t[0]),
		L(e[1], t[1]),
		L(e[2], t[2])
	] : t);
}
function Ue(e, t) {
	let n = (e - .5) * k, r = a(t, 0, 1) * Math.PI, i = Math.sin(r);
	return z([
		i * Math.sin(n),
		Math.cos(r),
		i * Math.cos(n)
	]);
}
function We(e, t) {
	let n = (t % 2 + 2) % 2, r = +(n >= 1), i = e + r * .5, a = r ? 2 - n : n;
	return {
		u: i,
		v: a,
		x: i,
		y: a
	};
}
function B(e) {
	let t = z(e), n = ((Math.atan2(t[0], t[2]) / k + .5) % 1 + 1) % 1, r = Math.acos(a(t[1], -1, 1)) / Math.PI;
	return {
		u: n,
		v: r,
		x: n,
		y: r
	};
}
function Ge(e = {}) {
	let t = Number(e.azimuthCenterDeg) || 0, n = L(e.azimuthSpanDeg, I.azimuthSpanDeg, 1, 360), r = L(e.altitudeSpanDeg, I.altitudeSpanDeg, 1, 180), i = Math.max(0, 90 - r * .5);
	return {
		altitudeCenterDeg: L(e.altitudeCenterDeg, I.altitudeCenterDeg, -i, i),
		altitudeSpanDeg: r,
		azimuthCenterDeg: t,
		azimuthSpanDeg: n
	};
}
function V(e) {
	let t = Ge(e), n = t.altitudeCenterDeg + t.altitudeSpanDeg * .5, r = t.altitudeCenterDeg - t.altitudeSpanDeg * .5, i = t.azimuthSpanDeg >= 359.999, a = i ? 0 : .5 + (t.azimuthCenterDeg - t.azimuthSpanDeg * .5) / 360, o = i ? 1 : t.azimuthSpanDeg / 360, s = (90 - n) / 180, c = (n - r) / 180;
	return {
		altitudeSpanRad: c * Math.PI,
		azimuthSpanRad: o * k,
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
function Ke(e, t = pe) {
	return Math.max(t, Math.ceil(Math.max(1, e) / t) * t);
}
function qe(e, t) {
	return Math.max(1, Math.min(t, Ke(e)));
}
function Je(e, t, n) {
	return Math.max(0, Math.round(e) * Math.round(t) * n);
}
function Ye({ accumulationBytes: e, patchCount: t, residentBytesPerPixel: n = he, storageHeight: r, storageWidth: i, supersample: a }) {
	let o = Je(i, r, n) * t, s = Je(i * a, r * a, e);
	return {
		peakBytes: o + s,
		residentBytes: o,
		scratchBytes: s
	};
}
function Xe({ accumulationBytes: e, budgetBytes: t, maxTextureSize: n, patchCount: r, residentBytesPerPixel: i = he, storageHeight: a, storageWidth: o }) {
	let s = Math.max(1, Math.min(xe, Math.floor(n / Math.max(1, o)), Math.floor(n / Math.max(1, a))));
	for (let n = s; n >= 1; --n) {
		let s = Ye({
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
	let c = Ye({
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
function Ze({ accumulationBytes: e, budgetBytes: t, coverage: n, grid: r, idealVirtualHeight: i, idealVirtualWidth: a, maxQualityScale: o = 1, maxTextureSize: s, residentBytesPerPixel: c = he }) {
	let l = V(n), u = r === 1 ? 0 : me, d = Math.max(1, s - u * 2), f = Math.max(1, s - u * 2), p = Math.max(1, a / r), m = Math.max(1, i / r), h = Math.min(1, Math.max(.001, o), d / p, f / m), g = r * r, _ = Math.max(.001, h), v = null;
	for (let n = 0; n < 18; n += 1) {
		let n = qe(p * _, d), r = qe(m * _, f), i = n + u * 2, a = r + u * 2, o = Xe({
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
		if (Math.abs(l - _) < .001 || n <= pe || r <= pe) break;
		_ = Math.max(.001, l);
	}
	if (!v) {
		let n = qe(p * _, d), r = qe(m * _, f), i = n + u * 2, a = r + u * 2;
		v = {
			allocation: Xe({
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
function Qe(e, t, n) {
	return {
		x: e.coverageUvMin.x + t / e.columns * e.coverageUvSize.x,
		y: e.coverageUvMin.y + n / e.rows * e.coverageUvSize.y
	};
}
function $e(e) {
	return {
		x: e.coverageUvSize.x / e.columns,
		y: e.coverageUvSize.y / e.rows
	};
}
function et(e, t, n, r) {
	let i = Qe(e, t, n), a = $e(e), o = Math.min(r, Math.max(1, Math.round(e.contentWidth))), s = Math.min(r, Math.max(1, Math.round(e.contentHeight))), c = Math.min(r, o + e.guard * 2), l = Math.min(r, s + e.guard * 2), u = Math.max(0, (c - o) * .5), d = Math.max(0, (l - s) * .5), f = a.x * (u / o), p = a.y * (d / s), m = e.wrapsHorizontally && e.columns === 1;
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
function tt({ accumulationBytes: e = ge, budgetBytes: t = ve, clip: n, height: r, maxTextureSize: i = 4096, residentBytesPerPixel: a = _e, width: o }) {
	let s = V(n), c = Math.max(1, o * s.uvSize.x), l = Math.max(1, r * s.uvSize.y), u = Math.max(1, o), d = Math.max(1, r), f = (e, t) => je.find((n) => {
		let r = Math.max(1, i - (n === 1 ? 0 : me) * 2);
		return e / n <= r && t / n <= r;
	}) ?? je[je.length - 1], p = Ze({
		accumulationBytes: e,
		budgetBytes: t,
		grid: f(u, d),
		idealVirtualHeight: d,
		idealVirtualWidth: u,
		maxTextureSize: i,
		residentBytesPerPixel: a
	}), m = f(c, l), h = Ze({
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
	for (let e = 0; e < m; e += 1) for (let t = 0; t < m; t += 1) y.push(et(v, t, e, i));
	return {
		...v,
		descriptors: y
	};
}
function nt(e) {
	return !!(e && typeof e == "object" && "mode" in e && !("blend" in e));
}
function rt(e) {
	let t = Array.isArray(e?.anchors) && e.anchors.length ? e.anchors : P;
	return {
		amplitude: L(e?.warp?.amp, F.amplitude, 0, .6),
		anchors: t.slice(0, de).map((e, t) => {
			let n = P[t] ?? P[0], r = He(e?.dir, n.dir);
			return {
				color: Array.isArray(e?.color) ? Be(R(e.color, n.color)) : typeof e?.color == "string" ? e.color : Be(n.color),
				...B(r)
			};
		}),
		frequency: L(e?.warp?.freq, F.frequency, .3, 4),
		mode: e?.blend === "gaussian" ? "gaussian" : "inverse-distance",
		power: L(e?.power, F.power, .4, 6)
	};
}
function it(e) {
	if (!nt(e)) return rt(e);
	let t = Array.isArray(e.anchors) && e.anchors.length ? e.anchors : F.anchors;
	return {
		amplitude: L(e.amplitude, F.amplitude, 0, .6),
		anchors: t.slice(0, de).map((e, t) => ({
			color: typeof e?.color == "string" ? e.color : F.anchors[t]?.color ?? "#ffffff",
			x: L(e?.x, F.anchors[t]?.x ?? .5, 0, 1),
			y: L(e?.y, F.anchors[t]?.y ?? .5, 0, 1)
		})),
		frequency: L(e.frequency, F.frequency, .3, 4),
		mode: e.mode === "gaussian" ? "gaussian" : "inverse-distance",
		power: L(e.power, F.power, .4, 6)
	};
}
function at(e = {}) {
	let t = e.stars ?? M, n = e.nebula ?? N;
	return {
		clip: Ge(e.clip),
		nebula: {
			uBaseScale: L(n.uBaseScale, N.uBaseScale, .001, 100),
			uCloudCore: R(n.uCloudCore, N.uCloudCore),
			uCloudHighlight: R(n.uCloudHighlight, N.uCloudHighlight),
			uCloudShadow: R(n.uCloudShadow, N.uCloudShadow),
			uColorWarpAmp: L(n.uColorWarpAmp, N.uColorWarpAmp, 0, 1),
			uColorWarpFreq: L(n.uColorWarpFreq, N.uColorWarpFreq, .001, 20),
			uContrast: L(n.uContrast, N.uContrast, .05, 12),
			uCoverage: L(n.uCoverage, N.uCoverage, .02, .98),
			uDensity: L(n.uDensity, N.uDensity, 0, 10),
			uLightFocus: L(n.uLightFocus, N.uLightFocus, .001, 8),
			uLightIntensity: L(n.uLightIntensity, N.uLightIntensity, 0, 4),
			uLightLining: L(n.uLightLining, N.uLightLining, 0, 4),
			uNebulaExposure: L(n.uNebulaExposure, N.uNebulaExposure, .001, 4),
			uNebulaStrength: L(n.uNebulaStrength, N.uNebulaStrength, 0, 20),
			uOctaves: L(n.uOctaves, N.uOctaves, 1, 8),
			uOpacity: L(n.uOpacity, N.uOpacity, 0, 1),
			uSeed: L(n.uSeed, N.uSeed),
			uSoftness: L(n.uSoftness, N.uSoftness, .001, 2)
		},
		nebulaField: it(e.nebulaField),
		quality: Re(e.quality),
		stars: {
			uBright: L(t.uBright, M.uBright, 0, 8),
			uBrightVar: L(t.uBrightVar, M.uBrightVar, 0, 1),
			uColorVar: L(t.uColorVar, M.uColorVar, 0, 1),
			uDensity: L(t.uDensity, M.uDensity, 0, 2e3),
			uGlareSize: L(t.uGlareSize, M.uGlareSize, 0, 12),
			uGlareStr: L(t.uGlareStr, M.uGlareStr, 0, 4),
			uGlareVar: L(t.uGlareVar, M.uGlareVar, 0, 1),
			uLargeStarRarity: L(t.uLargeStarRarity, M.uLargeStarRarity, 0, 1),
			uSeed: L(t.uSeed, M.uSeed),
			uSizeVar: L(t.uSizeVar, M.uSizeVar, 0, 1),
			uStarSize: L(t.uStarSize, M.uStarSize, .01, 8)
		}
	};
}
function H(e, t, n) {
	return e + (t - e) * n;
}
function ot(e, t, n) {
	return [
		H(e[0], t[0], n),
		H(e[1], t[1], n),
		H(e[2], t[2], n)
	];
}
function U(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function W(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function st(e, t) {
	return [
		e[0] * t[0],
		e[1] * t[1],
		e[2] * t[2]
	];
}
function G(e, t, n) {
	let r = a((n - e) / Math.max(t - e, 1e-5));
	return r * r * (3 - 2 * r);
}
function ct(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function lt(e) {
	return Math.max(0, 2 * (1 - a(e, -1, 1)));
}
function ut(e, t) {
	return ((e - t) % 1 + 1.5) % 1 - .5;
}
function dt(e, t, n) {
	if (t < n.uvMin.y || t > n.uvMin.y + n.uvSize.y) return !1;
	if (n.wrapsHorizontally) return !0;
	let r = n.uvMin.x + n.uvSize.x * .5;
	return Math.abs(ut(e, r)) <= n.uvSize.x * .5;
}
function ft(e, t, n) {
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
function pt(e, t) {
	let n = V(t), r = B(e);
	return dt(r.u, r.v, n);
}
function mt(e) {
	return (Math.floor(e * 1000003) ^ 2654435769) >>> 0;
}
function ht(e) {
	let t = e >>> 0;
	return t = Math.imul(t ^ t >>> 16, 2146121005), t = Math.imul(t ^ t >>> 15, 2221713035), (t ^ t >>> 16) >>> 0;
}
function K(e, t, n, r) {
	let i = Math.imul(t + 2654435769 >>> 0, 2246822507), a = Math.imul(n + 3266489909 >>> 0, 668265263), o = Math.imul(r + 374761393 >>> 0, 2654435761);
	return ht((e ^ i ^ a ^ o) >>> 0) / 4294967296;
}
function gt(e, t) {
	return (e % t + t) % t;
}
function q(e) {
	return (1 - Math.cos(a(e, 0, 1) * Math.PI)) * .5;
}
function J(e) {
	let t = Math.max(1, Math.round(e.uDensity)), n = a(t / fe, 0, 1);
	return {
		activationThreshold: n * n,
		columns: fe,
		density: t,
		densityScale: n,
		rows: fe,
		seed: mt(e.uSeed)
	};
}
function _t(e, t = 1, n = 0) {
	return a(e, 0, 1) ** De * (1 + (a(t, 0, 1) ** Oe - 1) * a(n, 0, 1));
}
function vt(e, t, n, r, i) {
	let o = _t(e, t, n), s = r + (Math.max(r, o) - r) * ke, c = i + (Math.max(i, o) - i) * Ae, l = s ** 3, u = c ** 8, d = a(o * .3 + l * .55 + u * .15, 0, 1);
	return d >= .78 || l > .85 && (o > .65 || u > .35) ? 3 : d >= .52 || l > .62 || u > .65 && o > .45 ? 2 : d < .16 && o < .35 && l < .08 && u < .08 ? 0 : 1;
}
function yt(e, t, n, r = 0) {
	if (n < 0 || n >= e.rows) return null;
	let i = gt(t, e.columns);
	if (K(e.seed, i, n, 0) >= e.activationThreshold) return null;
	let o = (i + K(e.seed, i, n, 1)) / e.columns, s = 1 - (n + K(e.seed, i, n, 2)) / e.rows * 2, c = (o - .5) * k, l = Math.sqrt(Math.max(0, 1 - s * s)), u = K(e.seed, i, n, 3), d = K(e.seed, i, n, 4), f = K(e.seed, i, n, 5), p = K(e.seed, i, n, 6), m = K(e.seed, i, n, 7);
	return {
		classId: vt(u, m, r, d, f),
		column: i,
		rBright: d,
		rColor: p,
		rGlare: f,
		rSize: u,
		rSizeGate: m,
		row: n,
		u: o,
		v: Math.acos(a(s, -1, 1)) / Math.PI,
		x: l * Math.sin(c),
		y: s,
		z: l * Math.cos(c)
	};
}
function bt(e, t, n, r) {
	if (t - e >= 1) return !0;
	let i = n / r, a = (n + 1) / r;
	for (let n = -1; n <= 1; n += 1) if (a + n >= e && i + n <= t) return !0;
	return !1;
}
function xt(e, t) {
	let n = Math.PI / Math.max(1, t), r = Math.PI / Ee, i = Math.max(e.uStarSize * r, Se * Math.max(n, r)), a = Math.max((e.uStarSize + e.uGlareSize) * r, Ce * Math.max(n, r));
	return Math.max(i * .45, a * .36, n, r) * Te;
}
function St({ height: e, includeSeamCopies: t, rawVMax: n, rawVMin: r, seamCopies: i, stars: o, uMax: s, uMin: c, wrapsHorizontally: l }) {
	let u = J(o), d = xt(o, e) / Math.PI, f = a(r, 0, 1), p = a(n, 0, 1), m = q(f), h = q(p), g = Math.max(0, Math.floor(m * u.rows) - A), _ = Math.min(u.rows - 1, Math.floor(h * u.rows) + A), v = r <= d || n >= 1 - d, y = a(o.uLargeStarRarity, 0, 1), b = JSON.stringify({
		activationThreshold: u.activationThreshold,
		height: e,
		includeSeamCopies: t,
		largeStarRarity: y,
		poleWideQuery: v,
		rawVMax: n,
		rawVMin: r,
		seamCopies: i,
		seed: u.seed,
		uMax: s,
		uMin: c,
		vMax: p,
		vMin: f,
		wrapsHorizontally: l
	}), x = Le.get(b);
	if (x) return x.map((e) => ({ ...e }));
	let S = [];
	for (let e = g; e <= _; e += 1) for (let n = 0; n < u.columns; n += 1) {
		if (!v && !l && !bt(c, s, n, u.columns)) continue;
		let r = yt(u, n, e, y);
		if (r) {
			if (!t) {
				S.push(r);
				continue;
			}
			for (let e = -1; e <= 1; e += 1) {
				let t = r.u + e;
				(i === "all" || l || t >= c && t <= s) && S.push({
					...r,
					u: t
				});
			}
		}
	}
	return Le.set(b, S.map((e) => ({ ...e }))), S;
}
function Ct(e, t, n, r = {}) {
	let i = J(e), o = xt(e, n), s = o / Math.PI, c = t.uvMin.y - s, l = t.uvMin.y + t.uvSize.y + s, u = a(c, 0, 1), d = a(l, 0, 1), f = c <= s || l >= 1 - s, p = Math.max(Math.min(Math.sin(Math.max(u, .001) * Math.PI), Math.sin(Math.min(d, .999) * Math.PI)), .015), m = f ? 1 : Math.min(1, o / (k * p) + A / i.columns), h = t.wrapsHorizontally ? -m : t.uvMin.x - m, g = t.wrapsHorizontally ? 1 + m : t.uvMin.x + t.uvSize.x + m;
	return St({
		height: n,
		includeSeamCopies: r.includeSeamCopies ?? !0,
		rawVMax: l,
		rawVMin: c,
		seamCopies: "filtered",
		stars: e,
		uMax: g,
		uMin: h,
		wrapsHorizontally: t.wrapsHorizontally
	});
}
function wt(e, t, n, r = {}) {
	let i = J(e), o = xt(e, n), s = o / Math.PI, c = t.storageUvMin.y - s, l = t.storageUvMin.y + t.storageUvSize.y + s, u = a(c, 0, 1), d = a(l, 0, 1), f = c <= s || l >= 1 - s, p = Math.max(Math.min(Math.sin(Math.max(u, .001) * Math.PI), Math.sin(Math.min(d, .999) * Math.PI)), .015), m = f ? 1 : Math.min(1, o / (k * p) + A / i.columns);
	return St({
		height: n,
		includeSeamCopies: r.includeSeamCopies ?? !0,
		rawVMax: l,
		rawVMin: c,
		seamCopies: "all",
		stars: e,
		uMax: t.storageUvMin.x + t.storageUvSize.x + m,
		uMin: t.storageUvMin.x - m,
		wrapsHorizontally: !1
	});
}
function Y(e) {
	return e >>> 0;
}
function X(e, t) {
	let n = Y(e);
	return Y(n << t | n >>> 32 - t);
}
function Tt(e, t, n) {
	let r = Y(e), i = Y(t), a = Y(n);
	return a = Y(a ^ i), a = Y(a - X(i, 14)), r = Y(r ^ a), r = Y(r - X(a, 11)), i = Y(i ^ r), i = Y(i - X(r, 25)), a = Y(a ^ i), a = Y(a - X(i, 16)), r = Y(r ^ a), r = Y(r - X(a, 4)), i = Y(i ^ r), i = Y(i - X(r, 14)), a = Y(a ^ i), a = Y(a - X(i, 24)), a;
}
function Z(e, t, n) {
	let r = Y(3735928584);
	return Tt(Y(r + Y(e)), Y(r + Y(t)), Y(r + Y(n)));
}
function Et(e) {
	return e * e * e * (e * (e * 6 - 15) + 10);
}
function Q(e, t, n, r) {
	let i = e & 15, a = i < 8 ? t : n, o = i < 4 ? n : i === 12 || i === 14 ? t : r;
	return (i & 1 ? -a : a) + (i & 2 ? -o : o);
}
function Dt(e, t, n, r, i, a, o, s, c, l, u) {
	let d = 1 - c, f = 1 - l;
	return (1 - u) * (f * (e * d + t * c) + l * (n * d + r * c)) + u * (f * (i * d + a * c) + l * (o * d + s * c));
}
function Ot(e) {
	let t = Math.floor(e[0]), n = Math.floor(e[1]), r = Math.floor(e[2]), i = e[0] - t, a = e[1] - n, o = e[2] - r, s = Et(i), c = Et(a), l = Et(o);
	return Dt(Q(Z(t, n, r), i, a, o), Q(Z(t + 1, n, r), i - 1, a, o), Q(Z(t, n + 1, r), i, a - 1, o), Q(Z(t + 1, n + 1, r), i - 1, a - 1, o), Q(Z(t, n, r + 1), i, a, o - 1), Q(Z(t + 1, n, r + 1), i - 1, a, o - 1), Q(Z(t, n + 1, r + 1), i, a - 1, o - 1), Q(Z(t + 1, n + 1, r + 1), i - 1, a - 1, o - 1), s, c, l) * .982;
}
function $(e, t, n, r) {
	let i = 0, o = .5, s = 0, c = Math.floor(a(t, 1, 8)), l = Math.max(n, .001), u = a(r, .001, .999), d = [...e];
	for (let e = 0; e < c; e += 1) {
		let e = Ot(d) * .5 + .5;
		i += o * e, s += o, d = W(d, l), o *= u;
	}
	return s <= 0 ? 0 : i / s;
}
function kt(e, t, n) {
	return t <= 0 ? e : z([
		e[0] + Math.sin((e[1] * n + .23) * k) * Math.cos((e[2] * n + .41) * k) * t,
		e[1] + Math.cos((e[2] * n + .17) * k) * Math.sin((e[0] * n + .37) * k) * t,
		e[2] + Math.sin((e[0] * n - .31) * k) * Math.cos((e[1] * n + .29) * k) * t
	]);
}
function At(e) {
	let t = it(e);
	return {
		anchors: t.anchors.map((e) => ({
			color: Ve(e.color),
			dir: Ue(e.x, e.y)
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
function jt(e, t, n) {
	return 1 - G(e, t, n);
}
function Mt(e, t) {
	let n = At(t), r = kt(e, n.warp.amp, n.warp.freq), i = [
		0,
		0,
		0
	], o = 0;
	return n.anchors.forEach((e) => {
		let t = 1 - a(ct(r, e.dir), -1, 1), s = n.blend === "gaussian" ? Math.exp(-(t * t) / Math.max(2 * n.sigma * n.sigma, 1e-4)) : 1 / (t + 1e-4) ** Math.max(n.power, 1e-4);
		i = U(i, W(e.color, s)), o += s;
	}), o <= 0 ? [
		0,
		0,
		0
	] : W(i, 1 / o);
}
function Nt(e, t) {
	let n = t.nebula, r = a(n.uOctaves, 1, 8), i = U(W(e, Math.max(n.uColorWarpFreq, .001)), [
		n.uSeed,
		n.uSeed * .37,
		n.uSeed * -.21
	]), o = Mt(z(U(e, W([
		$(i, r, 2.02, .52) * 2 - 1,
		$(U(i, [
			5.2,
			1.3,
			7.1
		]), r, 2.03, .5) * 2 - 1,
		$(U(i, [
			9.1,
			8.4,
			2.8
		]), r, 2.01, .51) * 2 - 1
	], Math.max(n.uColorWarpAmp, 0)))), t.nebulaField), s = [
		n.uSeed * 13.17,
		n.uSeed * -7.31,
		n.uSeed * 5.19
	], c = U(W(e, Math.max(n.uBaseScale, .001)), s), l = a($(U(c, W([
		$(c, r, 2.02, .5),
		$(U(c, [
			5.2,
			1.3,
			2.8
		]), r, 2.02, .5),
		$(U(c, [
			2.1,
			4.7,
			9.2
		]), r, 2.02, .5)
	], 3)), r, 2.02, .5)), u = a(G(n.uCoverage, n.uCoverage + Math.max(n.uSoftness, .001), l)) ** Math.max(n.uContrast, .05), d = a(Math.max(o[0], o[1], o[2]) * Math.max(n.uLightIntensity, 0)) ** Math.max(n.uLightFocus, .001), f = W(st(o, n.uCloudHighlight), Math.max(n.uLightIntensity, 0));
	return U([
		.004,
		.005,
		.011
	], W(W(U(ot(ot(n.uCloudShadow, f, d), n.uCloudCore, a(u * .4)), W(o, d * (1 - u) * Math.max(n.uLightLining, 0) * Math.max(n.uLightIntensity, 0))), Math.max(n.uDensity, 0)).map((e) => Math.max(0, e) ** .92), a(u * n.uOpacity) * Math.max(n.uNebulaStrength, 0)));
}
function Pt(e) {
	return e < .5 ? ot([
		1,
		.55,
		.3
	], [
		1,
		.96,
		.92
	], e * 2) : ot([
		1,
		.96,
		.92
	], [
		.7,
		.8,
		1
	], (e - .5) * 2);
}
function Ft(e, t, n, r, i) {
	let a = (r * t + n) * 4;
	e[a] += i[0], e[a + 1] += i[1], e[a + 2] += i[2], e[a + 3] = Math.max(e[a + 3], Math.max(i[0], i[1], i[2]));
}
function It(e) {
	return e < 256 ? 1 : e < 2048 ? 2 : 1;
}
function Lt(e, t, n, r, i = r) {
	let a = V(t.clip), o = t.stars;
	if (o.uDensity <= 0 || o.uBright <= 0) return;
	let s = Ct(o, a, i, { includeSeamCopies: !1 }), c = Math.PI / Math.max(1, i), l = Math.PI / Ee, u = Math.PI / Math.max(1, r);
	s.forEach((t) => {
		let i = _t(t.rSize, t.rSizeGate, o.uLargeStarRarity), s = t.rBright + (Math.max(t.rBright, i) - t.rBright) * ke, d = t.rGlare + (Math.max(t.rGlare, i) - t.rGlare) * Ae, f = H(1, H(.1, 1, i), o.uSizeVar), p = o.uStarSize * f * l, m = o.uStarSize * f, h = jt(j, we, m), g = Se * Math.max(c, l), _ = Math.max(c, l * .5), v = Math.max(p, H(g, _, h)), y = Math.max(p, l * .1), b = H(1, Math.max(.08, G(0, j, m)), jt(j * .75, j, m)), x = Math.max(y * .45, u * .5), S = Math.max(v * .45, u), C = G(we, 1.75, m), w = o.uGlareSize * H(1, f, o.uSizeVar) * l, ee = Math.max(p + w, Ce * Math.max(c, l)), te = Math.max(p + w, l * .1), T = Math.max(te * .36, u * .5), ne = Math.max(ee * .36, u) * C * +(o.uGlareSize > 0 && o.uGlareStr > 0), re = Math.max(x, T) * Te, E = Math.ceil(Math.max(re, S * Te, ne * Te) / Math.PI * r), D = t.u * n, O = t.v * r, ie = o.uBright * H(1, s ** 3 * 3, o.uBrightVar), ae = o.uGlareStr * H(1, d ** 8, o.uGlareVar), oe = Pt(H(.5, t.rColor, o.uColorVar)), se = Math.floor(D - E), ce = Math.ceil(D + E), le = Math.max(0, Math.floor(O - E)), ue = Math.min(r - 1, Math.ceil(O + E)), de = Math.max(Math.sin(t.v * Math.PI), .015);
		for (let i = le; i <= ue; i += 1) for (let o = se; o <= ce; o += 1) {
			let s = gt(o, n), c = (s + .5) / n, l = (i + .5) / r;
			if (!dt(c, l, a)) continue;
			let u = ut(c, t.u) * k * de, d = (l - t.v) * Math.PI, f = u * u + d * d, p = (Math.exp(-f / Math.max(x * x * 2, 1e-10)) * b + Math.exp(-f / Math.max(T * T * 2, 1e-10)) * C * ae) * ie;
			p <= 1e-6 || Ft(e, n, s, i, W(oe, p));
		}
	});
}
function Rt(e, t, n, r) {
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
function zt(e, t, n) {
	if (t.uDensity <= 0 || t.uBright <= 0) return [
		0,
		0,
		0
	];
	let r = B(e), i = J(t), o = xt(t, n), s = o / Math.PI, c = a(r.v - s, 0, 1), l = a(r.v + s, 0, 1), u = q(c), d = q(l), f = Math.max(0, Math.floor(u * i.rows) - A), p = Math.min(i.rows - 1, Math.floor(d * i.rows) + A), m = Math.max(Math.sin(a(r.v, .001, .999) * Math.PI), .015), h = Math.min(1, o / (k * m) + A / i.columns), g = Math.floor((r.u - h) * i.columns) - A, _ = Math.ceil((r.u + h) * i.columns) + A, v = Math.PI / Math.max(1, n), y = Math.PI / Ee, b = [
		0,
		0,
		0
	];
	for (let n = f; n <= p; n += 1) for (let r = g; r <= _; r += 1) {
		let a = yt(i, r, n, t.uLargeStarRarity);
		if (!a) continue;
		let o = _t(a.rSize, a.rSizeGate, t.uLargeStarRarity), s = a.rBright + (Math.max(a.rBright, o) - a.rBright) * ke, c = a.rGlare + (Math.max(a.rGlare, o) - a.rGlare) * Ae, l = H(1, H(.1, 1, o), t.uSizeVar), u = t.uStarSize * l * y, d = t.uStarSize * l, f = Math.max(u, y * .1), p = Math.max(f * .45, v * .5), m = H(1, Math.max(.08, G(0, j, d)), jt(j * .75, j, d)), h = G(we, 1.75, d), g = t.uGlareSize * H(1, l, t.uSizeVar) * y, _ = Math.max(u + g, y * .1), x = Math.max(_ * .36, v * .5), S = lt(e[0] * a.x + e[1] * a.y + e[2] * a.z), C = Math.exp(-S / Math.max(p * p * 2, 1e-10)) * m, w = t.uGlareStr * H(1, c ** 8, t.uGlareVar), ee = Math.exp(-S / Math.max(x * x * 2, 1e-10)) * h * w, te = t.uBright * H(1, s ** 3 * 3, t.uBrightVar), T = (C + ee) * te;
		T <= 1e-6 || (b = U(b, W(Pt(H(.5, a.rColor, t.uColorVar)), T)));
	}
	return b;
}
function Bt(e, t, n = Math.floor(Ne / 2)) {
	let r = at(t);
	if (!pt(e, r.clip)) return [
		0,
		0,
		0,
		0
	];
	let i = Wt(Nt(e, r), zt(e, r.stars, n), r.nebula.uNebulaExposure);
	return [
		i[0],
		i[1],
		i[2],
		1
	];
}
function Vt(e, t, n = {}) {
	return Bt(e, t, n.sampleHeight);
}
function Ht(e, t, n, r = {}) {
	let i = at(e), a = ze(i.quality), o = Math.max(1, Math.floor(r.budgetBytes ?? a.budgetBytes)), s = Math.max(1, Math.floor(r.maxTextureSize ?? 8192)), c = tt({
		accumulationBytes: r.accumulationBytes,
		budgetBytes: o,
		clip: i.clip,
		height: n,
		maxTextureSize: s,
		residentBytesPerPixel: r.residentBytesPerPixel,
		width: t
	});
	return h(JSON.stringify({
		height: n,
		layout: {
			allocation: c.allocation,
			accumulationBytes: r.accumulationBytes ?? ge,
			columns: c.columns,
			contentHeight: c.contentHeight,
			contentWidth: c.contentWidth,
			coverage: c.coverage,
			guard: c.guard,
			maxTextureSize: s,
			qualityScale: c.qualityScale,
			rows: c.rows,
			residentBytesPerPixel: r.residentBytesPerPixel ?? _e,
			storageHeight: c.storageHeight,
			storageWidth: c.storageWidth,
			supersample: c.supersample
		},
		params: i,
		viewport: r.viewport ? {
			renderHeight: Math.round(r.viewport.renderHeight),
			verticalFovRadians: Math.round(r.viewport.verticalFovRadians * 1e3) / 1e3
		} : null,
		width: t
	}));
}
function Ut(e, t) {
	return e.map((e) => 1 - Math.exp(-Math.max(0, e) * Math.max(t, .001)));
}
function Wt(e, t, n) {
	let r = Ut(e, n), i = [
		.004,
		.005,
		.011
	], a = Ut(i, 1), o = Ut(U(i, t), 1);
	return U(r, [
		Math.max(o[0] - a[0], 0),
		Math.max(o[1] - a[1], 0),
		Math.max(o[2] - a[2], 0)
	]);
}
function Gt(e, t, n, r, i, a, o, s) {
	for (let c = 0; c < o; c += 1) {
		let u = (c + .5) / o * n - .5, d = Math.floor(u), f = Math.max(0, d), p = Math.min(n - 1, d + 1), m = u - d, h = f * t * 4, g = p * t * 4;
		for (let n = 0; n < a; n += 1) {
			let o = (c * a + n) * 4, u = (n + .5) / a * t - .5, d = Math.floor(u), f = d + 1, p = u - d, _ = gt(d, t) * 4, v = gt(f, t) * 4, y = h + _, b = h + v, x = g + _, S = g + v, C = H(H(e[y], e[b], p), H(e[x], e[S], p), m), w = H(H(e[y + 1], e[b + 1], p), H(e[x + 1], e[S + 1], p), m), ee = H(H(e[y + 2], e[b + 2], p), H(e[x + 2], e[S + 2], p), m), te = H(H(e[y + 3], e[b + 3], p), H(e[x + 3], e[S + 3], p), m), T = Math.max(r[o], r[o + 1], r[o + 2]);
			if (te <= 0 && T <= 0) {
				i[o] = 0, i[o + 1] = 0, i[o + 2] = 0, i[o + 3] = 0;
				continue;
			}
			let [ne, re, E] = l(Wt([
				C,
				w,
				ee
			], [
				r[o],
				r[o + 1],
				r[o + 2]
			], s.nebula.uNebulaExposure));
			i[o] = ne, i[o + 1] = re, i[o + 2] = E, i[o + 3] = 255;
		}
	}
}
function Kt(e, t = Ne, n = Math.floor(t / 2)) {
	let r = at(e), i = ze(r.quality), a = Math.min(t, Me), o = Math.max(1, Math.floor(a / 2)), s = tt({
		budgetBytes: i.budgetBytes,
		clip: r.clip,
		height: o,
		maxTextureSize: Ne,
		residentBytesPerPixel: he,
		width: a
	}), c = new Float32Array(a * o * 4), l = new Uint8ClampedArray(t * n * 4), u = V(r.clip), d = It(t), f = t * d, p = n * d, m = new Float32Array(f * p * 4);
	return s.descriptors.forEach((e) => {
		let t = ft(e.uvMin.x, e.uvSize.x, a), n = Math.max(0, Math.floor(e.uvMin.y * o)), i = Math.min(o - 1, Math.ceil((e.uvMin.y + e.uvSize.y) * o));
		for (let e = n; e <= i; e += 1) {
			let n = (e + .5) / o;
			t.forEach(({ end: t, start: i }) => {
				for (let o = i; o <= t; o += 1) {
					let t = (o + .5) / a;
					if (!dt(t, n, u)) continue;
					let i = Nt(Ue(t, n), r), s = (e * a + o) * 4;
					c[s] = i[0], c[s + 1] = i[1], c[s + 2] = i[2], c[s + 3] = 1;
				}
			});
		}
	}), Lt(m, r, f, p, n), Gt(c, a, o, Rt(m, f, p, d), l, t, n, r), {
		data: l,
		height: n,
		width: t
	};
}
//#endregion
//#region src/baking/starfield-bake-registry.ts
var qt = null;
function Jt(e) {
	qt = e;
}
function Yt(e) {
	return qt ? qt(e) : null;
}
//#endregion
export { c as $, O as A, le as B, We as C, T as D, At as E, D as F, oe as G, x as H, v as I, f as J, d as K, ae as L, E as M, C as N, se as O, ce as P, l as Q, b as R, Ue as S, pt as T, w as U, te as V, S as W, h as X, m as Y, s as Z, V as _, F as a, q as b, M as c, Kt as d, o as et, Ct as f, ze as g, tt as h, N as i, t as it, re as j, ne as k, Ne as l, Ht as m, Jt as n, r as nt, Ie as o, wt as p, a as q, I as r, i as rt, Pe as s, Yt as t, n as tt, Fe as u, at as v, B as w, Vt as x, Re as y, ue as z };
