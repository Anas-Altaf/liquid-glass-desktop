/* Approach 3 Liquid Glass (SVG displacement over backdrop-filter).
 * Filter chain and pill map from liquid-glass-react by rdev (MIT).
 *
 * Performance and stability:
 *  - each element owns one <filter>; on resize only its attributes change
 *    (no node swaps, so no flash of unfiltered glass);
 *  - quality "high" = R/G/B split (chromatic rim), "balanced" = one
 *    displacement pass, "fast" = blur only;
 *  - pointer light only touches elements near the pointer.
 *
 * Never put opacity/filter/mix-blend-mode on the .lg element or its children
 * beside the warp: that isolates it and blanks the backdrop. */
import { lensMap, magnifyMap } from "./displacement.js";

const UA = navigator.userAgent;
export const refractionSupported = /Chrome\/|Chromium|CefSharp|Wallpaper ?Engine/i.test(UA) && !/Firefox\//.test(UA);

export const PRESETS = {
  panel:   { map: "lens", scale: -64, aberration: 2 },
  bar:     { map: "lens", scale: -44, aberration: 1.6 },
  menu:    { map: "lens", scale: -56, aberration: 2 },
  control: { map: "lens", scale: -26, aberration: 1.2 },
  droplet: { map: "magnify", scale: 38, aberration: 2.4, zoom: 0.32 },
};

const NS = "http://www.w3.org/2000/svg";
let defs = null, seq = 0;
const G = { quality: "balanced", strength: 1, react: "near", reactRadius: 220 };
const state = new WeakMap();
const live = new Set();

function ensureDefs() {
  if (defs) return defs;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true"); svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  svg.innerHTML = "<defs></defs>"; document.body.prepend(svg);
  return (defs = svg.firstChild);
}
const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

function makeFilter(id, quality, a) {
  const f = mk("filter", { id, x: "-35%", y: "-35%", width: "170%", height: "170%", "color-interpolation-filters": "sRGB" });
  const img = mk("feImage", { x: 0, y: 0, width: 1, height: 1, result: "MAP", preserveAspectRatio: "none" });
  f.append(img);
  const disp = [];
  if (quality === "high") {
    f.append(mk("feColorMatrix", { in: "MAP", type: "matrix", values: "0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0 0 0 1 0", result: "EI" }));
    const ct = mk("feComponentTransfer", { in: "EI", result: "EM" }); ct.append(mk("feFuncA", { type: "discrete", tableValues: `0 ${a * 0.05} 1` })); f.append(ct);
    f.append(mk("feOffset", { in: "SourceGraphic", dx: 0, dy: 0, result: "C0" }));
    [["R", "1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0", 1], ["G", "0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0", 1 - a * 0.05], ["B", "0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0", 1 - a * 0.1]].forEach(([n, m, k]) => {
      const d = mk("feDisplacementMap", { in: "SourceGraphic", in2: "MAP", xChannelSelector: "R", yChannelSelector: "B", result: n + "D" }); d.dataset.k = k; disp.push(d); f.append(d);
      f.append(mk("feColorMatrix", { in: n + "D", type: "matrix", values: m, result: n }));
    });
    f.append(mk("feBlend", { in: "G", in2: "B", mode: "screen", result: "GB" }));
    f.append(mk("feBlend", { in: "R", in2: "GB", mode: "screen", result: "RGB" }));
    f.append(mk("feGaussianBlur", { in: "RGB", stdDeviation: Math.max(0.1, 0.5 - a * 0.1), result: "AB" }));
    f.append(mk("feComposite", { in: "AB", in2: "EM", operator: "in", result: "E" }));
    const inv = mk("feComponentTransfer", { in: "EM", result: "INV" }); inv.append(mk("feFuncA", { type: "table", tableValues: "1 0" })); f.append(inv);
    f.append(mk("feComposite", { in: "C0", in2: "INV", operator: "in", result: "C" }));
    f.append(mk("feComposite", { in: "E", in2: "C", operator: "over" }));
  } else {
    const d = mk("feDisplacementMap", { in: "SourceGraphic", in2: "MAP", xChannelSelector: "R", yChannelSelector: "B" }); d.dataset.k = 1; disp.push(d); f.append(d);
  }
  return { f, img, disp };
}

function build(el, force) {
  const s = state.get(el); if (!s) return;
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return;
  const q = s.over.quality || G.quality, str = (s.over.refraction ?? 1) * G.strength;
  if (!force && Math.abs(w - s.w) < 2 && Math.abs(h - s.h) < 2 && q === s.q && str === s.str) return;
  const sizeChanged = Math.abs(w - s.w) >= 2 || Math.abs(h - s.h) >= 2;
  s.w = w; s.h = h;
  if (!refractionSupported || q === "fast" || str <= 0) { s.warp.style.filter = ""; s.q = q; s.str = str; return; }
  const host = ensureDefs();
  if (!s.filter || s.q !== q) {
    const nf = makeFilter(s.id + (q === "high" ? "h" : "b"), q, s.p.aberration);
    if (s.filter) s.filter.f.replaceWith(nf.f); else host.append(nf.f);
    s.filter = nf; s.mapKey = "";
  }
  s.q = q; s.str = str;
  const href = s.p.map === "magnify" ? magnifyMap(w, h, s.p.zoom) : lensMap(w, h);
  if (href !== s.mapKey || sizeChanged) { s.filter.img.setAttribute("href", href); s.mapKey = href; }
  s.filter.img.setAttribute("width", w); s.filter.img.setAttribute("height", h);
  s.filter.disp.forEach(d => d.setAttribute("scale", String(s.p.scale * str * d.dataset.k)));
  const url = `url(#${s.filter.f.id})`;
  if (s.warp.style.filter !== url) s.warp.style.filter = url;
}

let roQueue = new Set(), roRaf = 0;
const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(entries => {
  entries.forEach(e => roQueue.add(e.target));
  if (!roRaf) roRaf = requestAnimationFrame(() => { roRaf = 0; roQueue.forEach(el => build(el)); roQueue.clear(); });
}) : null;

/** Turn an element into Liquid Glass. Content goes in a ".pane" child. */
export function glassify(el, preset = "panel", over = {}) {
  if (state.has(el)) return el;
  const warp = document.createElement("span"); warp.className = "lg-warp";
  const sheen = document.createElement("span"); sheen.className = "lg-sheen";
  const rim = document.createElement("span"); rim.className = "lg-rim";
  el.prepend(warp, sheen, rim);
  el.classList.add("lg", `lg-${preset}`);
  state.set(el, { id: `lg${++seq}`, p: { ...PRESETS[preset], ...over }, over: {}, warp, w: 0, h: 0, q: "", str: -1, glow: -1 });
  live.add(el);
  build(el);
  ro && ro.observe(el);
  return el;
}

/** Per-element overrides: blur, sat, bright, tint, radius, rim, shine, refraction, quality. Missing keys follow the global setting. */
export function setOverrides(el, o = {}) {
  const s = state.get(el); if (!s) return;
  s.over = { ...o };
  const map = { blur: ["--lg-blur", "px"], sat: ["--lg-sat", "%"], bright: ["--lg-bright", ""], tint: ["--lg-tint", ""], radius: ["--lg-radius", "px"], rim: ["--lg-rim", ""], shine: ["--lg-shine", ""], shadow: ["--lg-shadow", ""] };
  for (const [k, [v, u]] of Object.entries(map)) { if (o[k] != null) el.style.setProperty(v, o[k] + u); else el.style.removeProperty(v); }
  build(el, true);
}
export function setGlobal(g) { Object.assign(G, g); live.forEach(el => build(el, true)); light(true); }
export function refresh(el) { (el ? [el] : [...live]).forEach(e => build(e, true)); }

/* pointer light */
let px = -9999, py = -9999, raf = 0;
function light(all) {
  raf = 0;
  const R = G.reactRadius;
  for (const el of live) {
    const s = state.get(el);
    if (!el.isConnected) { live.delete(el); continue; }
    if (G.react === "off") { if (s.glow !== 0) { el.style.setProperty("--lg-glow", "0"); s.glow = 0; } continue; }
    const r = el.getBoundingClientRect(); if (!r.width) continue;
    const dx = Math.max(r.left - px, 0, px - r.right), dy = Math.max(r.top - py, 0, py - r.bottom), d = Math.hypot(dx, dy);
    const g = G.react === "all" ? 1 : Math.max(0, 1 - d / R);
    if (g === 0 && s.glow === 0 && !all) continue;
    s.glow = +g.toFixed(2);
    el.style.setProperty("--lg-glow", s.glow);
    if (g > 0) {
      const ang = Math.atan2(py - (r.top + r.height / 2), px - (r.left + r.width / 2)) * 57.3 + 90;
      el.style.setProperty("--lg-angle", ang.toFixed(0) + "deg");
      el.style.setProperty("--lg-mx", ((px - r.left) / r.width * 100).toFixed(0) + "%");
      el.style.setProperty("--lg-my", ((py - r.top) / r.height * 100).toFixed(0) + "%");
    }
  }
}
addEventListener("pointermove", e => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(() => light(false)); }, { passive: true });
document.addEventListener("pointerleave", () => { px = py = -9999; if (!raf) raf = requestAnimationFrame(() => light(false)); });
export const repaintLight = () => light(true);
