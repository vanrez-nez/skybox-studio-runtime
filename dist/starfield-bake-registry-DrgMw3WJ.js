//#region src/math.ts
function e(e, t = 0, n = 1) {
	return Math.min(n, Math.max(t, e));
}
function t(e) {
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
function n(t) {
	let n = e(t);
	return n <= .0031308 ? n * 12.92 : 1.055 * n ** (1 / 2.4) - .055;
}
function r(e) {
	let n = e.trim().replace(/^#/, ""), r = n.length === 3 ? n.split("").map((e) => `${e}${e}`).join("") : n;
	return /^[0-9a-fA-F]{6}$/.test(r) ? [
		0,
		2,
		4
	].map((e) => t(Number.parseInt(r.slice(e, e + 2), 16) / 255)) : [
		1,
		1,
		1
	];
}
function i(e) {
	return e.map((e) => Math.round(n(e) * 255));
}
function a(e) {
	return e <= .25 ? ((16 * e - 12) * e + 4) * e : Math.sqrt(e);
}
function o(t, n, r) {
	let i = e(n), o = e(r);
	switch (t) {
		case "multiply": return i * o;
		case "screen": return i + o - i * o;
		case "overlay": return i <= .5 ? 2 * i * o : 1 - 2 * (1 - i) * (1 - o);
		case "darken": return Math.min(i, o);
		case "lighten": return Math.max(i, o);
		case "color-dodge": return i === 0 ? 0 : o === 1 ? 1 : Math.min(1, i / (1 - o));
		case "color-burn": return i === 1 ? 1 : o === 0 ? 0 : 1 - Math.min(1, (1 - i) / o);
		case "hard-light": return o <= .5 ? 2 * i * o : i + (2 * o - 1) - i * (2 * o - 1);
		case "soft-light": return o <= .5 ? i - (1 - 2 * o) * i * (1 - i) : i + (2 * o - 1) * (a(i) - i);
		case "difference": return Math.abs(i - o);
		case "exclusion": return i + o - 2 * i * o;
		default: return o;
	}
}
function s(t, n, r, i) {
	let a = e(n), s = e(i);
	return e(e(o(t, a, r)) * s + a * (1 - s));
}
function c(e, t, n, r) {
	return [
		s(r, e[0], t[0], n),
		s(r, e[1], t[1], n),
		s(r, e[2], t[2], n)
	];
}
function l(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n += 1) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return (t >>> 0).toString(36);
}
//#endregion
//#region src/layer-addons/registry.ts
var u = /* @__PURE__ */ new Map();
function d(e) {
	let t = u.get(e.type);
	u.set(e.type, {
		...t ?? { type: e.type },
		...e
	});
}
function f(e) {
	return u.get(e);
}
function p() {
	return Array.from(u.values());
}
function m(e) {
	return u.has(e);
}
//#endregion
//#region src/layer-addons/cpu-sampling.ts
var h = Math.PI * 2;
function g(e, t, n) {
	return e + (t - e) * n;
}
function _(t) {
	return t.map((t) => ({
		alpha: e(t.opacity / 100),
		color: r(t.color),
		midpoint: e((t.midpoint ?? 50) / 100, .01, .99),
		t: e(t.location / 100)
	})).sort((e, t) => e.t - t.t);
}
function v(e, t) {
	return e <= t ? e / Math.max(t * 2, 1e-5) : .5 + (e - t) / Math.max((1 - t) * 2, 1e-5);
}
function y(t, n) {
	if (t.length === 0) return [
		0,
		0,
		0,
		0
	];
	let r = e(n), i = t[0], a = t[t.length - 1];
	if (r <= i.t) return [...i.color, i.alpha];
	if (r >= a.t) return [...a.color, a.alpha];
	for (let e = 0; e < t.length - 1; e += 1) {
		let n = t[e], i = t[e + 1];
		if (r < n.t || r > i.t) continue;
		let a = i.t - n.t, o = v(a <= 0 ? 0 : (r - n.t) / a, n.midpoint);
		return [
			g(n.color[0], i.color[0], o),
			g(n.color[1], i.color[1], o),
			g(n.color[2], i.color[2], o),
			g(n.alpha, i.alpha, o)
		];
	}
	return [...a.color, a.alpha];
}
function b(t, n, r) {
	let i = e((r - t) / Math.max(n - t, 1e-5));
	return i * i * (3 - 2 * i);
}
function x(e) {
	return e * e;
}
function S(e, t, n) {
	return [
		g(e[0], t[0], n),
		g(e[1], t[1], n),
		g(e[2], t[2], n)
	];
}
function C(t) {
	let n = e(t), r = [
		1,
		.12,
		.05
	];
	return r = S(r, [
		1,
		.55,
		.1
	], b(0, .28, n)), r = S(r, [
		1,
		.93,
		.6
	], b(.22, .45, n)), r = S(r, [
		1,
		1,
		1
	], b(.42, .6, n)), r = S(r, [
		.55,
		.8,
		1
	], b(.62, .85, n)), r = S(r, [
		.35,
		.5,
		1
	], b(.85, 1, n)), r;
}
function w(e, t) {
	return [
		e[0] * t[0],
		e[1] * t[1],
		e[2] * t[2]
	];
}
function ee(e, t) {
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
function E(e, t) {
	return S(t, w(e, S([
		1,
		1,
		1
	], t, .82)), .82);
}
function te(e, t) {
	let n = (e - .5) * h, r = (.5 - t) * Math.PI, i = Math.cos(r);
	return [
		i * Math.cos(n),
		Math.sin(r),
		i * Math.sin(n)
	];
}
function ne(e, t) {
	let n = (e - .5) * h, r = (t - .5) * Math.PI, i = Math.cos(r);
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
function re(e, t) {
	return [
		e[1] * t[2] - e[2] * t[1],
		e[2] * t[0] - e[0] * t[2],
		e[0] * t[1] - e[1] * t[0]
	];
}
function ie(e, t, n) {
	let r = D(e), i = D(t), a = D(re([
		0,
		1,
		0
	], i)), o = D(re(i, a)), s = Math.max(O(r, i), 1e-6), c = O(r, a) / s / Math.max(n, 1e-4), l = O(r, o) / s / Math.max(n, 1e-4);
	return {
		x: c,
		y: l,
		d: Math.hypot(c, l)
	};
}
function ae(e, t, n) {
	if (t <= 0) return e;
	let r = Math.max(1e-4, n), i = [
		Math.sin((e[1] * r + .23) * h) * Math.cos((e[2] * r + .41) * h),
		Math.cos((e[2] * r + .17) * h) * Math.sin((e[0] * r + .37) * h),
		Math.sin((e[0] * r - .31) * h) * Math.cos((e[1] * r + .29) * h)
	];
	return D([
		e[0] + i[0] * t,
		e[1] + i[1] * t,
		e[2] + i[2] * t
	]);
}
function oe(t, n) {
	return 1 - e(t[0] * n[0] + t[1] * n[1] + t[2] * n[2], -1, 1);
}
function se(e, t, n) {
	return [
		g(e[0], t[0], n),
		g(e[1], t[1], n),
		g(e[2], t[2], n),
		g(e[3], t[3], n)
	];
}
function ce(e, n, r) {
	let i = (n % e.width + e.width) % e.width, a = (Math.min(e.height - 1, Math.max(0, r)) * e.width + i) * 4;
	return [
		t((e.data[a] ?? 0) / 255),
		t((e.data[a + 1] ?? 0) / 255),
		t((e.data[a + 2] ?? 0) / 255),
		(e.data[a + 3] ?? 0) / 255
	];
}
function le(e, n, r) {
	let i = Math.min(e.width - 1, Math.max(0, n)), a = (Math.min(e.height - 1, Math.max(0, r)) * e.width + i) * 4, o = e.pixels?.[a] ?? 0, s = e.pixels?.[a + 1] ?? 0, c = e.pixels?.[a + 2] ?? 0, l = e.pixels?.[a + 3] ?? 255;
	return [
		t(o / 255),
		t(s / 255),
		t(c / 255),
		l / 255
	];
}
//#endregion
//#region src/starfield-static.ts
var k = Math.PI * 2, ue = 8, de = 1e3, A = 2, fe = 128, pe = 64, me = 4, he = 8, ge = 12, _e = 2048 * 1024 * 1024, ve = 512 * 1024 * 1024, ye = 128 * 1024 * 1024, be = 8, xe = 1.75, Se = 3.25, j = 1, Ce = 1.5, M = 8, we = 2048, Te = 5, Ee = 12, De = .35, Oe = .25, ke = [
	1,
	2,
	4,
	8,
	16
], Ae = 1024, N = 8192, je = "medium", Me = {
	high: { budgetBytes: _e },
	low: { budgetBytes: ye },
	medium: { budgetBytes: ve }
}, P = {
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
}, F = {
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
}, I = [
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
], L = {
	amplitude: .045,
	anchors: I.map((e) => ({
		color: Re(e.color),
		...V(e.dir)
	})),
	frequency: 2.2,
	mode: "inverse-distance",
	power: 2
}, R = {
	altitudeCenterDeg: 0,
	altitudeSpanDeg: 180,
	azimuthCenterDeg: 0,
	azimuthSpanDeg: 360
}, Ne = {
	clip: R,
	nebula: F,
	nebulaField: L,
	quality: je,
	stars: P
}, Pe = /* @__PURE__ */ new Map();
function z(t, n, r = -Infinity, i = Infinity) {
	return e(Number.isFinite(Number(t)) ? Number(t) : n, r, i);
}
function Fe(e) {
	return e === "high" ? "high" : e === "low" ? "low" : je;
}
function Ie(e) {
	return Me[Fe(e)];
}
function Le(e, t) {
	return Array.isArray(e) ? [
		z(e[0], t[0], 0, 1),
		z(e[1], t[1], 0, 1),
		z(e[2], t[2], 0, 1)
	] : [...t];
}
function Re(t) {
	return `#${t.map((t) => Math.round(e(t) * 255).toString(16).padStart(2, "0")).join("")}`;
}
function ze(e) {
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
function B(e) {
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
function Be(e, t) {
	return B(Array.isArray(e) ? [
		z(e[0], t[0]),
		z(e[1], t[1]),
		z(e[2], t[2])
	] : t);
}
function Ve(t, n) {
	let r = (t - .5) * k, i = e(n, 0, 1) * Math.PI, a = Math.sin(i);
	return B([
		a * Math.sin(r),
		Math.cos(i),
		a * Math.cos(r)
	]);
}
function He(e, t) {
	let n = (t % 2 + 2) % 2, r = +(n >= 1), i = e + r * .5, a = r ? 2 - n : n;
	return {
		u: i,
		v: a,
		x: i,
		y: a
	};
}
function V(t) {
	let n = B(t), r = ((Math.atan2(n[0], n[2]) / k + .5) % 1 + 1) % 1, i = Math.acos(e(n[1], -1, 1)) / Math.PI;
	return {
		u: r,
		v: i,
		x: r,
		y: i
	};
}
function Ue(e = {}) {
	let t = Number(e.azimuthCenterDeg) || 0, n = z(e.azimuthSpanDeg, R.azimuthSpanDeg, 1, 360), r = z(e.altitudeSpanDeg, R.altitudeSpanDeg, 1, 180), i = Math.max(0, 90 - r * .5);
	return {
		altitudeCenterDeg: z(e.altitudeCenterDeg, R.altitudeCenterDeg, -i, i),
		altitudeSpanDeg: r,
		azimuthCenterDeg: t,
		azimuthSpanDeg: n
	};
}
function H(e) {
	let t = Ue(e), n = t.altitudeCenterDeg + t.altitudeSpanDeg * .5, r = t.altitudeCenterDeg - t.altitudeSpanDeg * .5, i = t.azimuthSpanDeg >= 359.999, a = i ? 0 : .5 + (t.azimuthCenterDeg - t.azimuthSpanDeg * .5) / 360, o = i ? 1 : t.azimuthSpanDeg / 360, s = (90 - n) / 180, c = (n - r) / 180;
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
function We(e, t = fe) {
	return Math.max(t, Math.ceil(Math.max(1, e) / t) * t);
}
function Ge(e, t) {
	return Math.max(1, Math.min(t, We(e)));
}
function Ke(e, t, n) {
	return Math.max(0, Math.round(e) * Math.round(t) * n);
}
function qe({ accumulationBytes: e, patchCount: t, residentBytesPerPixel: n = me, storageHeight: r, storageWidth: i, supersample: a }) {
	let o = Ke(i, r, n) * t, s = Ke(i * a, r * a, e);
	return {
		peakBytes: o + s,
		residentBytes: o,
		scratchBytes: s
	};
}
function Je({ accumulationBytes: e, budgetBytes: t, maxTextureSize: n, patchCount: r, residentBytesPerPixel: i = me, storageHeight: a, storageWidth: o }) {
	let s = Math.max(1, Math.min(be, Math.floor(n / Math.max(1, o)), Math.floor(n / Math.max(1, a))));
	for (let n = s; n >= 1; --n) {
		let s = qe({
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
	let c = qe({
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
function Ye({ accumulationBytes: e, budgetBytes: t, coverage: n, grid: r, idealVirtualHeight: i, idealVirtualWidth: a, maxQualityScale: o = 1, maxTextureSize: s, residentBytesPerPixel: c = me }) {
	let l = H(n), u = r === 1 ? 0 : pe, d = Math.max(1, s - u * 2), f = Math.max(1, s - u * 2), p = Math.max(1, a / r), m = Math.max(1, i / r), h = Math.min(1, Math.max(.001, o), d / p, f / m), g = r * r, _ = Math.max(.001, h), v = null;
	for (let n = 0; n < 18; n += 1) {
		let n = Ge(p * _, d), r = Ge(m * _, f), i = n + u * 2, a = r + u * 2, o = Je({
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
		if (Math.abs(l - _) < .001 || n <= fe || r <= fe) break;
		_ = Math.max(.001, l);
	}
	if (!v) {
		let n = Ge(p * _, d), r = Ge(m * _, f), i = n + u * 2, a = r + u * 2;
		v = {
			allocation: Je({
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
function Xe(e, t, n) {
	return {
		x: e.coverageUvMin.x + t / e.columns * e.coverageUvSize.x,
		y: e.coverageUvMin.y + n / e.rows * e.coverageUvSize.y
	};
}
function Ze(e) {
	return {
		x: e.coverageUvSize.x / e.columns,
		y: e.coverageUvSize.y / e.rows
	};
}
function Qe(e, t, n, r) {
	let i = Xe(e, t, n), a = Ze(e), o = Math.min(r, Math.max(1, Math.round(e.contentWidth))), s = Math.min(r, Math.max(1, Math.round(e.contentHeight))), c = Math.min(r, o + e.guard * 2), l = Math.min(r, s + e.guard * 2), u = Math.max(0, (c - o) * .5), d = Math.max(0, (l - s) * .5), f = a.x * (u / o), p = a.y * (d / s), m = e.wrapsHorizontally && e.columns === 1;
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
function $e({ accumulationBytes: e = he, budgetBytes: t = _e, clip: n, height: r, maxTextureSize: i = 4096, residentBytesPerPixel: a = ge, width: o }) {
	let s = H(n), c = Math.max(1, o * s.uvSize.x), l = Math.max(1, r * s.uvSize.y), u = Math.max(1, o), d = Math.max(1, r), f = (e, t) => ke.find((n) => {
		let r = Math.max(1, i - (n === 1 ? 0 : pe) * 2);
		return e / n <= r && t / n <= r;
	}) ?? ke[ke.length - 1], p = Ye({
		accumulationBytes: e,
		budgetBytes: t,
		grid: f(u, d),
		idealVirtualHeight: d,
		idealVirtualWidth: u,
		maxTextureSize: i,
		residentBytesPerPixel: a
	}), m = f(c, l), h = Ye({
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
	for (let e = 0; e < m; e += 1) for (let t = 0; t < m; t += 1) y.push(Qe(v, t, e, i));
	return {
		...v,
		descriptors: y
	};
}
function et(e) {
	return !!(e && typeof e == "object" && "mode" in e && !("blend" in e));
}
function tt(e) {
	let t = Array.isArray(e?.anchors) && e.anchors.length ? e.anchors : I;
	return {
		amplitude: z(e?.warp?.amp, L.amplitude, 0, .6),
		anchors: t.slice(0, ue).map((e, t) => {
			let n = I[t] ?? I[0], r = Be(e?.dir, n.dir);
			return {
				color: Array.isArray(e?.color) ? Re(Le(e.color, n.color)) : typeof e?.color == "string" ? e.color : Re(n.color),
				...V(r)
			};
		}),
		frequency: z(e?.warp?.freq, L.frequency, .3, 4),
		mode: e?.blend === "gaussian" ? "gaussian" : "inverse-distance",
		power: z(e?.power, L.power, .4, 6)
	};
}
function nt(e) {
	if (!et(e)) return tt(e);
	let t = Array.isArray(e.anchors) && e.anchors.length ? e.anchors : L.anchors;
	return {
		amplitude: z(e.amplitude, L.amplitude, 0, .6),
		anchors: t.slice(0, ue).map((e, t) => ({
			color: typeof e?.color == "string" ? e.color : L.anchors[t]?.color ?? "#ffffff",
			x: z(e?.x, L.anchors[t]?.x ?? .5, 0, 1),
			y: z(e?.y, L.anchors[t]?.y ?? .5, 0, 1)
		})),
		frequency: z(e.frequency, L.frequency, .3, 4),
		mode: e.mode === "gaussian" ? "gaussian" : "inverse-distance",
		power: z(e.power, L.power, .4, 6)
	};
}
function rt(e = {}) {
	let t = e.stars ?? P, n = e.nebula ?? F;
	return {
		clip: Ue(e.clip),
		nebula: {
			uBaseScale: z(n.uBaseScale, F.uBaseScale, .001, 100),
			uCloudCore: Le(n.uCloudCore, F.uCloudCore),
			uCloudHighlight: Le(n.uCloudHighlight, F.uCloudHighlight),
			uCloudShadow: Le(n.uCloudShadow, F.uCloudShadow),
			uColorWarpAmp: z(n.uColorWarpAmp, F.uColorWarpAmp, 0, 1),
			uColorWarpFreq: z(n.uColorWarpFreq, F.uColorWarpFreq, .001, 20),
			uContrast: z(n.uContrast, F.uContrast, .05, 12),
			uCoverage: z(n.uCoverage, F.uCoverage, .02, .98),
			uDensity: z(n.uDensity, F.uDensity, 0, 10),
			uLightFocus: z(n.uLightFocus, F.uLightFocus, .001, 8),
			uLightIntensity: z(n.uLightIntensity, F.uLightIntensity, 0, 4),
			uLightLining: z(n.uLightLining, F.uLightLining, 0, 4),
			uNebulaExposure: z(n.uNebulaExposure, F.uNebulaExposure, .001, 4),
			uNebulaStrength: z(n.uNebulaStrength, F.uNebulaStrength, 0, 20),
			uOctaves: z(n.uOctaves, F.uOctaves, 1, 8),
			uOpacity: z(n.uOpacity, F.uOpacity, 0, 1),
			uSeed: z(n.uSeed, F.uSeed),
			uSoftness: z(n.uSoftness, F.uSoftness, .001, 2)
		},
		nebulaField: nt(e.nebulaField),
		quality: Fe(e.quality),
		stars: {
			uBright: z(t.uBright, P.uBright, 0, 8),
			uBrightVar: z(t.uBrightVar, P.uBrightVar, 0, 1),
			uColorVar: z(t.uColorVar, P.uColorVar, 0, 1),
			uDensity: z(t.uDensity, P.uDensity, 0, 2e3),
			uGlareSize: z(t.uGlareSize, P.uGlareSize, 0, 12),
			uGlareStr: z(t.uGlareStr, P.uGlareStr, 0, 4),
			uGlareVar: z(t.uGlareVar, P.uGlareVar, 0, 1),
			uLargeStarRarity: z(t.uLargeStarRarity, P.uLargeStarRarity, 0, 1),
			uSeed: z(t.uSeed, P.uSeed),
			uSizeVar: z(t.uSizeVar, P.uSizeVar, 0, 1),
			uStarSize: z(t.uStarSize, P.uStarSize, .01, 8)
		}
	};
}
function U(e, t, n) {
	return e + (t - e) * n;
}
function it(e, t, n) {
	return [
		U(e[0], t[0], n),
		U(e[1], t[1], n),
		U(e[2], t[2], n)
	];
}
function W(e, t) {
	return [
		e[0] + t[0],
		e[1] + t[1],
		e[2] + t[2]
	];
}
function G(e, t) {
	return [
		e[0] * t,
		e[1] * t,
		e[2] * t
	];
}
function at(e, t) {
	return [
		e[0] * t[0],
		e[1] * t[1],
		e[2] * t[2]
	];
}
function K(t, n, r) {
	let i = e((r - t) / Math.max(n - t, 1e-5));
	return i * i * (3 - 2 * i);
}
function ot(e, t) {
	return e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
}
function st(t) {
	return Math.max(0, 2 * (1 - e(t, -1, 1)));
}
function ct(e, t) {
	return ((e - t) % 1 + 1.5) % 1 - .5;
}
function lt(e, t, n) {
	if (t < n.uvMin.y || t > n.uvMin.y + n.uvSize.y) return !1;
	if (n.wrapsHorizontally) return !0;
	let r = n.uvMin.x + n.uvSize.x * .5;
	return Math.abs(ct(e, r)) <= n.uvSize.x * .5;
}
function ut(e, t, n) {
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
function dt(e, t) {
	let n = H(t), r = V(e);
	return lt(r.u, r.v, n);
}
function ft(e) {
	return (Math.floor(e * 1000003) ^ 2654435769) >>> 0;
}
function pt(e) {
	let t = e >>> 0;
	return t = Math.imul(t ^ t >>> 16, 2146121005), t = Math.imul(t ^ t >>> 15, 2221713035), (t ^ t >>> 16) >>> 0;
}
function q(e, t, n, r) {
	let i = Math.imul(t + 2654435769 >>> 0, 2246822507), a = Math.imul(n + 3266489909 >>> 0, 668265263), o = Math.imul(r + 374761393 >>> 0, 2654435761);
	return pt((e ^ i ^ a ^ o) >>> 0) / 4294967296;
}
function mt(e, t) {
	return (e % t + t) % t;
}
function J(t) {
	return (1 - Math.cos(e(t, 0, 1) * Math.PI)) * .5;
}
function ht(t) {
	let n = Math.max(1, Math.round(t.uDensity)), r = e(n / de, 0, 1);
	return {
		activationThreshold: r * r,
		columns: de,
		density: n,
		densityScale: r,
		rows: de,
		seed: ft(t.uSeed)
	};
}
function gt(t, n = 1, r = 0) {
	return e(t, 0, 1) ** Te * (1 + (e(n, 0, 1) ** Ee - 1) * e(r, 0, 1));
}
function _t(t, n, r, i, a) {
	let o = gt(t, n, r), s = i + (Math.max(i, o) - i) * De, c = a + (Math.max(a, o) - a) * Oe, l = s ** 3, u = c ** 8, d = e(o * .3 + l * .55 + u * .15, 0, 1);
	return d >= .78 || l > .85 && (o > .65 || u > .35) ? 3 : d >= .52 || l > .62 || u > .65 && o > .45 ? 2 : d < .16 && o < .35 && l < .08 && u < .08 ? 0 : 1;
}
function vt(t, n, r, i = 0) {
	if (r < 0 || r >= t.rows) return null;
	let a = mt(n, t.columns);
	if (q(t.seed, a, r, 0) >= t.activationThreshold) return null;
	let o = (a + q(t.seed, a, r, 1)) / t.columns, s = 1 - (r + q(t.seed, a, r, 2)) / t.rows * 2, c = (o - .5) * k, l = Math.sqrt(Math.max(0, 1 - s * s)), u = q(t.seed, a, r, 3), d = q(t.seed, a, r, 4), f = q(t.seed, a, r, 5), p = q(t.seed, a, r, 6), m = q(t.seed, a, r, 7);
	return {
		classId: _t(u, m, i, d, f),
		column: a,
		rBright: d,
		rColor: p,
		rGlare: f,
		rSize: u,
		rSizeGate: m,
		row: r,
		u: o,
		v: Math.acos(e(s, -1, 1)) / Math.PI,
		x: l * Math.sin(c),
		y: s,
		z: l * Math.cos(c)
	};
}
function yt(e, t, n, r) {
	if (t - e >= 1) return !0;
	let i = n / r, a = (n + 1) / r;
	for (let n = -1; n <= 1; n += 1) if (a + n >= e && i + n <= t) return !0;
	return !1;
}
function bt(e, t) {
	let n = Math.PI / Math.max(1, t), r = Math.PI / we, i = Math.max(e.uStarSize * r, xe * Math.max(n, r)), a = Math.max((e.uStarSize + e.uGlareSize) * r, Se * Math.max(n, r));
	return Math.max(i * .45, a * .36, n, r) * M;
}
function xt({ height: t, includeSeamCopies: n, rawVMax: r, rawVMin: i, seamCopies: a, stars: o, uMax: s, uMin: c, wrapsHorizontally: l }) {
	let u = ht(o), d = bt(o, t) / Math.PI, f = e(i, 0, 1), p = e(r, 0, 1), m = J(f), h = J(p), g = Math.max(0, Math.floor(m * u.rows) - A), _ = Math.min(u.rows - 1, Math.floor(h * u.rows) + A), v = i <= d || r >= 1 - d, y = e(o.uLargeStarRarity, 0, 1), b = JSON.stringify({
		activationThreshold: u.activationThreshold,
		height: t,
		includeSeamCopies: n,
		largeStarRarity: y,
		poleWideQuery: v,
		rawVMax: r,
		rawVMin: i,
		seamCopies: a,
		seed: u.seed,
		uMax: s,
		uMin: c,
		vMax: p,
		vMin: f,
		wrapsHorizontally: l
	}), x = Pe.get(b);
	if (x) return x.map((e) => ({ ...e }));
	let S = [];
	for (let e = g; e <= _; e += 1) for (let t = 0; t < u.columns; t += 1) {
		if (!v && !l && !yt(c, s, t, u.columns)) continue;
		let r = vt(u, t, e, y);
		if (r) {
			if (!n) {
				S.push(r);
				continue;
			}
			for (let e = -1; e <= 1; e += 1) {
				let t = r.u + e;
				(a === "all" || l || t >= c && t <= s) && S.push({
					...r,
					u: t
				});
			}
		}
	}
	return Pe.set(b, S.map((e) => ({ ...e }))), S;
}
function St(t, n, r, i = {}) {
	let a = ht(t), o = bt(t, r), s = o / Math.PI, c = n.uvMin.y - s, l = n.uvMin.y + n.uvSize.y + s, u = e(c, 0, 1), d = e(l, 0, 1), f = c <= s || l >= 1 - s, p = Math.max(Math.min(Math.sin(Math.max(u, .001) * Math.PI), Math.sin(Math.min(d, .999) * Math.PI)), .015), m = f ? 1 : Math.min(1, o / (k * p) + A / a.columns), h = n.wrapsHorizontally ? -m : n.uvMin.x - m, g = n.wrapsHorizontally ? 1 + m : n.uvMin.x + n.uvSize.x + m;
	return xt({
		height: r,
		includeSeamCopies: i.includeSeamCopies ?? !0,
		rawVMax: l,
		rawVMin: c,
		seamCopies: "filtered",
		stars: t,
		uMax: g,
		uMin: h,
		wrapsHorizontally: n.wrapsHorizontally
	});
}
function Ct(t, n, r, i = {}) {
	let a = ht(t), o = bt(t, r), s = o / Math.PI, c = n.storageUvMin.y - s, l = n.storageUvMin.y + n.storageUvSize.y + s, u = e(c, 0, 1), d = e(l, 0, 1), f = c <= s || l >= 1 - s, p = Math.max(Math.min(Math.sin(Math.max(u, .001) * Math.PI), Math.sin(Math.min(d, .999) * Math.PI)), .015), m = f ? 1 : Math.min(1, o / (k * p) + A / a.columns);
	return xt({
		height: r,
		includeSeamCopies: i.includeSeamCopies ?? !0,
		rawVMax: l,
		rawVMin: c,
		seamCopies: "all",
		stars: t,
		uMax: n.storageUvMin.x + n.storageUvSize.x + m,
		uMin: n.storageUvMin.x - m,
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
function wt(e, t, n) {
	let r = Y(e), i = Y(t), a = Y(n);
	return a = Y(a ^ i), a = Y(a - X(i, 14)), r = Y(r ^ a), r = Y(r - X(a, 11)), i = Y(i ^ r), i = Y(i - X(r, 25)), a = Y(a ^ i), a = Y(a - X(i, 16)), r = Y(r ^ a), r = Y(r - X(a, 4)), i = Y(i ^ r), i = Y(i - X(r, 14)), a = Y(a ^ i), a = Y(a - X(i, 24)), a;
}
function Z(e, t, n) {
	let r = Y(3735928584);
	return wt(Y(r + Y(e)), Y(r + Y(t)), Y(r + Y(n)));
}
function Tt(e) {
	return e * e * e * (e * (e * 6 - 15) + 10);
}
function Q(e, t, n, r) {
	let i = e & 15, a = i < 8 ? t : n, o = i < 4 ? n : i === 12 || i === 14 ? t : r;
	return (i & 1 ? -a : a) + (i & 2 ? -o : o);
}
function Et(e, t, n, r, i, a, o, s, c, l, u) {
	let d = 1 - c, f = 1 - l;
	return (1 - u) * (f * (e * d + t * c) + l * (n * d + r * c)) + u * (f * (i * d + a * c) + l * (o * d + s * c));
}
function Dt(e) {
	let t = Math.floor(e[0]), n = Math.floor(e[1]), r = Math.floor(e[2]), i = e[0] - t, a = e[1] - n, o = e[2] - r, s = Tt(i), c = Tt(a), l = Tt(o);
	return Et(Q(Z(t, n, r), i, a, o), Q(Z(t + 1, n, r), i - 1, a, o), Q(Z(t, n + 1, r), i, a - 1, o), Q(Z(t + 1, n + 1, r), i - 1, a - 1, o), Q(Z(t, n, r + 1), i, a, o - 1), Q(Z(t + 1, n, r + 1), i - 1, a, o - 1), Q(Z(t, n + 1, r + 1), i, a - 1, o - 1), Q(Z(t + 1, n + 1, r + 1), i - 1, a - 1, o - 1), s, c, l) * .982;
}
function $(t, n, r, i) {
	let a = 0, o = .5, s = 0, c = Math.floor(e(n, 1, 8)), l = Math.max(r, .001), u = e(i, .001, .999), d = [...t];
	for (let e = 0; e < c; e += 1) {
		let e = Dt(d) * .5 + .5;
		a += o * e, s += o, d = G(d, l), o *= u;
	}
	return s <= 0 ? 0 : a / s;
}
function Ot(e, t, n) {
	return t <= 0 ? e : B([
		e[0] + Math.sin((e[1] * n + .23) * k) * Math.cos((e[2] * n + .41) * k) * t,
		e[1] + Math.cos((e[2] * n + .17) * k) * Math.sin((e[0] * n + .37) * k) * t,
		e[2] + Math.sin((e[0] * n - .31) * k) * Math.cos((e[1] * n + .29) * k) * t
	]);
}
function kt(e) {
	let t = nt(e);
	return {
		anchors: t.anchors.map((e) => ({
			color: ze(e.color),
			dir: Ve(e.x, e.y)
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
function At(e, t, n) {
	return 1 - K(e, t, n);
}
function jt(t, n) {
	let r = kt(n), i = Ot(t, r.warp.amp, r.warp.freq), a = [
		0,
		0,
		0
	], o = 0;
	return r.anchors.forEach((t) => {
		let n = 1 - e(ot(i, t.dir), -1, 1), s = r.blend === "gaussian" ? Math.exp(-(n * n) / Math.max(2 * r.sigma * r.sigma, 1e-4)) : 1 / (n + 1e-4) ** Math.max(r.power, 1e-4);
		a = W(a, G(t.color, s)), o += s;
	}), o <= 0 ? [
		0,
		0,
		0
	] : G(a, 1 / o);
}
function Mt(t, n) {
	let r = n.nebula, i = e(r.uOctaves, 1, 8), a = W(G(t, Math.max(r.uColorWarpFreq, .001)), [
		r.uSeed,
		r.uSeed * .37,
		r.uSeed * -.21
	]), o = jt(B(W(t, G([
		$(a, i, 2.02, .52) * 2 - 1,
		$(W(a, [
			5.2,
			1.3,
			7.1
		]), i, 2.03, .5) * 2 - 1,
		$(W(a, [
			9.1,
			8.4,
			2.8
		]), i, 2.01, .51) * 2 - 1
	], Math.max(r.uColorWarpAmp, 0)))), n.nebulaField), s = [
		r.uSeed * 13.17,
		r.uSeed * -7.31,
		r.uSeed * 5.19
	], c = W(G(t, Math.max(r.uBaseScale, .001)), s), l = e($(W(c, G([
		$(c, i, 2.02, .5),
		$(W(c, [
			5.2,
			1.3,
			2.8
		]), i, 2.02, .5),
		$(W(c, [
			2.1,
			4.7,
			9.2
		]), i, 2.02, .5)
	], 3)), i, 2.02, .5)), u = e(K(r.uCoverage, r.uCoverage + Math.max(r.uSoftness, .001), l)) ** Math.max(r.uContrast, .05), d = e(Math.max(o[0], o[1], o[2]) * Math.max(r.uLightIntensity, 0)) ** Math.max(r.uLightFocus, .001), f = G(at(o, r.uCloudHighlight), Math.max(r.uLightIntensity, 0));
	return W([
		.004,
		.005,
		.011
	], G(G(W(it(it(r.uCloudShadow, f, d), r.uCloudCore, e(u * .4)), G(o, d * (1 - u) * Math.max(r.uLightLining, 0) * Math.max(r.uLightIntensity, 0))), Math.max(r.uDensity, 0)).map((e) => Math.max(0, e) ** .92), e(u * r.uOpacity) * Math.max(r.uNebulaStrength, 0)));
}
function Nt(e) {
	return e < .5 ? it([
		1,
		.55,
		.3
	], [
		1,
		.96,
		.92
	], e * 2) : it([
		1,
		.96,
		.92
	], [
		.7,
		.8,
		1
	], (e - .5) * 2);
}
function Pt(e, t, n, r, i) {
	let a = (r * t + n) * 4;
	e[a] += i[0], e[a + 1] += i[1], e[a + 2] += i[2], e[a + 3] = Math.max(e[a + 3], Math.max(i[0], i[1], i[2]));
}
function Ft(e) {
	return e < 256 ? 1 : e < 2048 ? 2 : 1;
}
function It(e, t, n, r, i = r) {
	let a = H(t.clip), o = t.stars;
	if (o.uDensity <= 0 || o.uBright <= 0) return;
	let s = St(o, a, i, { includeSeamCopies: !1 }), c = Math.PI / Math.max(1, i), l = Math.PI / we, u = Math.PI / Math.max(1, r);
	s.forEach((t) => {
		let i = gt(t.rSize, t.rSizeGate, o.uLargeStarRarity), s = t.rBright + (Math.max(t.rBright, i) - t.rBright) * De, d = t.rGlare + (Math.max(t.rGlare, i) - t.rGlare) * Oe, f = U(1, U(.1, 1, i), o.uSizeVar), p = o.uStarSize * f * l, m = o.uStarSize * f, h = At(j, Ce, m), g = xe * Math.max(c, l), _ = Math.max(c, l * .5), v = Math.max(p, U(g, _, h)), y = Math.max(p, l * .1), b = U(1, Math.max(.08, K(0, j, m)), At(j * .75, j, m)), x = Math.max(y * .45, u * .5), S = Math.max(v * .45, u), C = K(Ce, 1.75, m), w = o.uGlareSize * U(1, f, o.uSizeVar) * l, ee = Math.max(p + w, Se * Math.max(c, l)), T = Math.max(p + w, l * .1), E = Math.max(T * .36, u * .5), te = Math.max(ee * .36, u) * C * +(o.uGlareSize > 0 && o.uGlareStr > 0), ne = Math.max(x, E) * M, D = Math.ceil(Math.max(ne, S * M, te * M) / Math.PI * r), O = t.u * n, re = t.v * r, ie = o.uBright * U(1, s ** 3 * 3, o.uBrightVar), ae = o.uGlareStr * U(1, d ** 8, o.uGlareVar), oe = Nt(U(.5, t.rColor, o.uColorVar)), se = Math.floor(O - D), ce = Math.ceil(O + D), le = Math.max(0, Math.floor(re - D)), ue = Math.min(r - 1, Math.ceil(re + D)), de = Math.max(Math.sin(t.v * Math.PI), .015);
		for (let i = le; i <= ue; i += 1) for (let o = se; o <= ce; o += 1) {
			let s = mt(o, n), c = (s + .5) / n, l = (i + .5) / r;
			if (!lt(c, l, a)) continue;
			let u = ct(c, t.u) * k * de, d = (l - t.v) * Math.PI, f = u * u + d * d, p = (Math.exp(-f / Math.max(x * x * 2, 1e-10)) * b + Math.exp(-f / Math.max(E * E * 2, 1e-10)) * C * ae) * ie;
			p <= 1e-6 || Pt(e, n, s, i, G(oe, p));
		}
	});
}
function Lt(e, t, n, r) {
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
function Rt(t, n, r) {
	if (n.uDensity <= 0 || n.uBright <= 0) return [
		0,
		0,
		0
	];
	let i = V(t), a = ht(n), o = bt(n, r), s = o / Math.PI, c = e(i.v - s, 0, 1), l = e(i.v + s, 0, 1), u = J(c), d = J(l), f = Math.max(0, Math.floor(u * a.rows) - A), p = Math.min(a.rows - 1, Math.floor(d * a.rows) + A), m = Math.max(Math.sin(e(i.v, .001, .999) * Math.PI), .015), h = Math.min(1, o / (k * m) + A / a.columns), g = Math.floor((i.u - h) * a.columns) - A, _ = Math.ceil((i.u + h) * a.columns) + A, v = Math.PI / Math.max(1, r), y = Math.PI / we, b = [
		0,
		0,
		0
	];
	for (let e = f; e <= p; e += 1) for (let r = g; r <= _; r += 1) {
		let i = vt(a, r, e, n.uLargeStarRarity);
		if (!i) continue;
		let o = gt(i.rSize, i.rSizeGate, n.uLargeStarRarity), s = i.rBright + (Math.max(i.rBright, o) - i.rBright) * De, c = i.rGlare + (Math.max(i.rGlare, o) - i.rGlare) * Oe, l = U(1, U(.1, 1, o), n.uSizeVar), u = n.uStarSize * l * y, d = n.uStarSize * l, f = Math.max(u, y * .1), p = Math.max(f * .45, v * .5), m = U(1, Math.max(.08, K(0, j, d)), At(j * .75, j, d)), h = K(Ce, 1.75, d), g = n.uGlareSize * U(1, l, n.uSizeVar) * y, _ = Math.max(u + g, y * .1), x = Math.max(_ * .36, v * .5), S = st(t[0] * i.x + t[1] * i.y + t[2] * i.z), C = Math.exp(-S / Math.max(p * p * 2, 1e-10)) * m, w = n.uGlareStr * U(1, c ** 8, n.uGlareVar), ee = Math.exp(-S / Math.max(x * x * 2, 1e-10)) * h * w, T = n.uBright * U(1, s ** 3 * 3, n.uBrightVar), E = (C + ee) * T;
		E <= 1e-6 || (b = W(b, G(Nt(U(.5, i.rColor, n.uColorVar)), E)));
	}
	return b;
}
function zt(e, t, n = Math.floor(N / 2)) {
	let r = rt(t);
	if (!dt(e, r.clip)) return [
		0,
		0,
		0,
		0
	];
	let i = Ut(Mt(e, r), Rt(e, r.stars, n), r.nebula.uNebulaExposure);
	return [
		i[0],
		i[1],
		i[2],
		1
	];
}
function Bt(e, t, n = {}) {
	return zt(e, t, n.sampleHeight);
}
function Vt(e, t, n, r = {}) {
	let i = rt(e), a = Ie(i.quality), o = Math.max(1, Math.floor(r.budgetBytes ?? a.budgetBytes)), s = Math.max(1, Math.floor(r.maxTextureSize ?? 8192)), c = $e({
		accumulationBytes: r.accumulationBytes,
		budgetBytes: o,
		clip: i.clip,
		height: n,
		maxTextureSize: s,
		residentBytesPerPixel: r.residentBytesPerPixel,
		width: t
	});
	return l(JSON.stringify({
		height: n,
		layout: {
			allocation: c.allocation,
			accumulationBytes: r.accumulationBytes ?? he,
			columns: c.columns,
			contentHeight: c.contentHeight,
			contentWidth: c.contentWidth,
			coverage: c.coverage,
			guard: c.guard,
			maxTextureSize: s,
			qualityScale: c.qualityScale,
			rows: c.rows,
			residentBytesPerPixel: r.residentBytesPerPixel ?? ge,
			storageHeight: c.storageHeight,
			storageWidth: c.storageWidth,
			supersample: c.supersample
		},
		params: i,
		width: t
	}));
}
function Ht(e, t) {
	return e.map((e) => 1 - Math.exp(-Math.max(0, e) * Math.max(t, .001)));
}
function Ut(e, t, n) {
	let r = Ht(e, n), i = [
		.004,
		.005,
		.011
	], a = Ht(i, 1), o = Ht(W(i, t), 1);
	return W(r, [
		Math.max(o[0] - a[0], 0),
		Math.max(o[1] - a[1], 0),
		Math.max(o[2] - a[2], 0)
	]);
}
function Wt(e, t, n, r, a, o, s, c) {
	for (let l = 0; l < s; l += 1) {
		let u = (l + .5) / s * n - .5, d = Math.floor(u), f = Math.max(0, d), p = Math.min(n - 1, d + 1), m = u - d, h = f * t * 4, g = p * t * 4;
		for (let n = 0; n < o; n += 1) {
			let s = (l * o + n) * 4, u = (n + .5) / o * t - .5, d = Math.floor(u), f = d + 1, p = u - d, _ = mt(d, t) * 4, v = mt(f, t) * 4, y = h + _, b = h + v, x = g + _, S = g + v, C = U(U(e[y], e[b], p), U(e[x], e[S], p), m), w = U(U(e[y + 1], e[b + 1], p), U(e[x + 1], e[S + 1], p), m), ee = U(U(e[y + 2], e[b + 2], p), U(e[x + 2], e[S + 2], p), m), T = U(U(e[y + 3], e[b + 3], p), U(e[x + 3], e[S + 3], p), m), E = Math.max(r[s], r[s + 1], r[s + 2]);
			if (T <= 0 && E <= 0) {
				a[s] = 0, a[s + 1] = 0, a[s + 2] = 0, a[s + 3] = 0;
				continue;
			}
			let [te, ne, D] = i(Ut([
				C,
				w,
				ee
			], [
				r[s],
				r[s + 1],
				r[s + 2]
			], c.nebula.uNebulaExposure));
			a[s] = te, a[s + 1] = ne, a[s + 2] = D, a[s + 3] = 255;
		}
	}
}
function Gt(e, t = N, n = Math.floor(t / 2)) {
	let r = rt(e), i = Ie(r.quality), a = Math.min(t, Ae), o = Math.max(1, Math.floor(a / 2)), s = $e({
		budgetBytes: i.budgetBytes,
		clip: r.clip,
		height: o,
		maxTextureSize: N,
		residentBytesPerPixel: me,
		width: a
	}), c = new Float32Array(a * o * 4), l = new Uint8ClampedArray(t * n * 4), u = H(r.clip), d = Ft(t), f = t * d, p = n * d, m = new Float32Array(f * p * 4);
	return s.descriptors.forEach((e) => {
		let t = ut(e.uvMin.x, e.uvSize.x, a), n = Math.max(0, Math.floor(e.uvMin.y * o)), i = Math.min(o - 1, Math.ceil((e.uvMin.y + e.uvSize.y) * o));
		for (let e = n; e <= i; e += 1) {
			let n = (e + .5) / o;
			t.forEach(({ end: t, start: i }) => {
				for (let o = i; o <= t; o += 1) {
					let t = (o + .5) / a;
					if (!lt(t, n, u)) continue;
					let i = Mt(Ve(t, n), r), s = (e * a + o) * 4;
					c[s] = i[0], c[s + 1] = i[1], c[s + 2] = i[2], c[s + 3] = 1;
				}
			});
		}
	}), It(m, r, f, p, n), Wt(c, a, o, Lt(m, f, p, d), l, t, n, r), {
		data: l,
		height: n,
		width: t
	};
}
//#endregion
//#region src/baking/starfield-bake-registry.ts
var Kt = null;
function qt(e) {
	Kt = e;
}
function Jt(e) {
	return Kt ? Kt(e) : null;
}
//#endregion
export { c as $, O as A, ce as B, He as C, T as D, kt as E, D as F, ae as G, b as H, _ as I, m as J, f as K, ie as L, ne as M, S as N, oe as O, se as P, s as Q, y as R, Ve as S, dt as T, C as U, ee as V, x as W, o as X, d as Y, e as Z, H as _, L as a, J as b, P as c, Gt as d, l as et, St as f, Ie as g, $e as h, F as i, t as it, te as j, E as k, N as l, Vt as m, qt as n, i as nt, Ne as o, Ct as p, p as q, R as r, r as rt, je as s, Jt as t, n as tt, Me as u, rt as v, V as w, Bt as x, Fe as y, le as z };
