/* Music visualizer: one spectrum source, many placements and styles.
 * Source: Wallpaper Engine's system-audio array when available, otherwise
 * the player's analyser. */
import { cfg } from "../core/settings.js";

const N = 64;
const spec = new Float32Array(N);
let weAt = 0, analyser = null, buf = null;
export function feedWE(arr) { for (let i = 0; i < N; i++) spec[i] = spec[i] * 0.4 + ((arr[i] + arr[64 + i]) / 2) * 0.6; weAt = performance.now(); }
export function useAnalyser(a) { analyser = a; buf = a ? new Uint8Array(a.frequencyBinCount) : null; }
export function level() { let s = 0; for (let i = 0; i < 10; i++) s += spec[i]; return Math.min(1, s / 10 * 1.4); }

function sample() {
  if (performance.now() - weAt < 500) return;
  if (!analyser) { for (let i = 0; i < N; i++) spec[i] *= 0.9; return; }
  analyser.getByteFrequencyData(buf);
  for (let i = 0; i < N; i++) { const idx = Math.floor(Math.pow(i / N, 1.7) * buf.length * 0.75); spec[i] = spec[i] * 0.35 + (buf[idx] / 255) * 0.65; }
}

const views = new Set();
/** Register a canvas. opts: {style, align:"bottom"|"center"|"top", mirror, bars, color} (missing keys follow settings). */
export function attach(canvas, opts = {}) { const v = { canvas, opts }; views.add(v); return () => views.delete(v); }

function colorFor(i, n, ink) {
  const c = cfg.viz.color;
  if (c === "rainbow") return `hsl(${(i / n) * 300 + 200}, 85%, 62%)`;
  if (c === "white") return "#fff";
  if (c === "accent") return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#5e5ce6";
  return ink;
}

function draw(v, ink) {
  const c = v.canvas; if (!c.isConnected || c.offsetParent === null && getComputedStyle(c).position !== "fixed") return;
  const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
  const dpr = Math.min(2, devicePixelRatio || 1);
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  const style = v.opts.style || cfg.viz.style, n = Math.max(8, Math.min(N, v.opts.bars || cfg.viz.bars)), sens = cfg.viz.sensitivity;
  const align = v.opts.align || "bottom", rev = v.opts.reverse;
  const val = i => Math.min(1, spec[Math.floor((rev ? n - 1 - i : i) / n * N)] * sens);
  if (style === "wave") {
    x.lineWidth = 2.2; x.lineJoin = "round"; x.strokeStyle = colorFor(0, 1, ink); x.beginPath();
    for (let i = 0; i < n; i++) { const px = i / (n - 1) * w, a = val(i) * h * 0.45, y = h / 2 + Math.sin(i * 0.9 + performance.now() / 180) * a; i ? x.lineTo(px, y) : x.moveTo(px, y); }
    x.stroke(); return;
  }
  if (style === "ring") {
    const cx = w / 2, cy = h / 2, r0 = Math.min(w, h) * 0.26;
    for (let i = 0; i < n; i++) { const a = i / n * 6.2832, l = r0 * 0.15 + val(i) * r0 * 0.9; x.strokeStyle = colorFor(i, n, ink); x.lineWidth = Math.max(2, 6.2832 * r0 / n * 0.5); x.lineCap = "round"; x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a) * (r0 + l), cy + Math.sin(a) * (r0 + l)); x.stroke(); }
    return;
  }
  const gap = w / n, bw = Math.min(style === "dots" ? 7 : 9, Math.max(1.5, gap * (style === "dots" ? 0.5 : 0.56)));
  for (let i = 0; i < n; i++) {
    const v2 = val(i), px = i * gap + (gap - bw) / 2;
    x.fillStyle = colorFor(i, n, ink);
    if (style === "dots") { const k = Math.round(v2 * 6); for (let j = 0; j <= k; j++) { x.beginPath(); x.arc(px + bw / 2, h - bw / 2 - j * (bw + 2), bw / 2, 0, 6.2832); x.fill(); } continue; }
    const bh = Math.max(2, v2 * h * (style === "mirror" ? 0.95 : 1));
    const y = style === "mirror" || align === "center" ? (h - bh) / 2 : align === "top" ? 0 : h - bh;
    x.beginPath(); x.roundRect ? x.roundRect(px, y, bw, bh, Math.min(bw, bh) / 2) : x.rect(px, y, bw, bh); x.fill();
  }
}

export function frame() {
  if (!views.size) return;
  sample();
  const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#fff";
  views.forEach(v => draw(v, ink));
}
