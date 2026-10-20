/* Layout: automatic columns for cards you haven't moved, free dragging with
 * magnetic snapping (screen edges, other cards' edges, an 8px grid), and
 * positions anchored to the nearest screen corner so they stay put across
 * resolutions. Works for cards and the desktop clock. */
import { $, $$, clamp } from "../core/util.js";
import { cfg, set, update } from "../core/settings.js";
import { flip, liquidOpen, liquidClose } from "../glass/motion.js";
import { refresh } from "../glass/glass.js";

export const ORDER = ["clock", "weather", "music", "calendar", "visualizer", "world", "reminders", "notes", "focus", "system"];
export const widgetEl = id => $(`.widget[data-w="${id}"]`);
const TOP = () => 64 + (parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0);
const M = 16;

function placeSaved(node, p) {
  const W = innerWidth, H = innerHeight, w = node.offsetWidth, h = node.offsetHeight;
  const left = p.ax === "r" ? W - p.x - w : p.x, top = p.ay === "b" ? H - p.y - h : p.y;
  node.style.left = clamp(left, 0, Math.max(0, W - w)) + "px";
  node.style.top = clamp(top, 0, Math.max(0, H - Math.min(h, 60))) + "px";
}

export function layout({ animate = false } = {}) {
  const W = innerWidth, H = innerHeight, gap = 14, top = TOP(), bottom = H - (cfg.dock.mode === "always" ? 104 : 24);
  const before = new Map(); if (animate) $$(".widget").forEach(w => { if (!w.hidden) before.set(w, w.getBoundingClientRect()); });
  const vis = ORDER.filter(id => cfg.widgets[id] && widgetEl(id) && !widgetEl(id).dataset.closing);
  vis.forEach(id => { const n = widgetEl(id), cw = cfg.cards[id] && cfg.cards[id].width; n.style.width = (cw || (W >= 1800 ? 320 : W >= 760 ? 300 : Math.min(360, W - 24))) + "px"; });
  const free = vis.filter(id => !cfg.positions[id]);
  const cw = W >= 1800 ? 320 : W >= 760 ? 300 : Math.min(360, W - 24);
  const cands = [];
  if (W >= 1000) cands.push([M, W - M - cw]);
  if (W >= 1240) cands.push([M, M + cw + gap, W - M - cw, W - M - 2 * cw - gap]);
  if (W >= 700 && W < 1000) cands.push([Math.round(W / 2 - cw - gap / 2), Math.round(W / 2 + gap / 2)]);
  if (!cands.length) cands.push([Math.round((W - cw) / 2)]);
  /* cards you've moved stay put; the rest flow into columns around them */
  const box = n => { const l = parseFloat(n.style.left) || 0, t = parseFloat(n.style.top) || 0; return { l, t, r: l + n.offsetWidth, b: t + n.offsetHeight }; };
  const taken = vis.filter(id => cfg.positions[id]).map(id => { const n = widgetEl(id); placeSaved(n, cfg.positions[id]); return box(n); });
  let place = {};
  for (const xs of cands) {
    const ys = xs.map(() => top), occ = [...taken]; place = {};
    free.forEach(id => {
      const n = widgetEl(id), w = n.offsetWidth, h = n.offsetHeight;
      let c = 0; ys.forEach((y, i) => { if (y < ys[c] - 1) c = i; });
      let y = ys[c], hit;
      while ((hit = occ.find(o => o.l < xs[c] + w && o.r > xs[c] && o.t < y + h + gap && o.b + gap > y))) y = hit.b + gap;
      place[id] = [xs[c], y]; occ.push({ l: xs[c], t: y, r: xs[c] + w, b: y + h }); ys[c] = y + h + gap;
    });
    if (Math.max(...ys) - gap <= bottom) break;
  }
  free.forEach(id => { const n = widgetEl(id); n.style.left = place[id][0] + "px"; n.style.top = place[id][1] + "px"; });
  placeHero();
  if (animate) flip([...before.keys()].filter(n => !n.hidden), before);
}

export function placeHero() {
  const hero = $("#hero"); if (!hero || hero.hidden) return;
  const p = cfg.positions.hero;
  if (p) { hero.style.transform = "none"; placeSaved(hero, p); }
  else { hero.style.left = (innerWidth - hero.offsetWidth) / 2 + "px"; hero.style.top = Math.round(innerHeight * 0.14) + "px"; }
}

export function setWidgetVisible(id, on) {
  const n = widgetEl(id); if (!n) return;
  if (on && n.hidden) { n.hidden = false; layout({ animate: true }); refresh(n); liquidOpen(n); }
  else if (!on && !n.hidden) { n.dataset.closing = "1"; liquidClose(n).then(() => { delete n.dataset.closing; layout({ animate: true }); }); }
}

/* ---- dragging with snapping ---- */
const guideX = document.createElement("div"), guideY = document.createElement("div");
guideX.className = "snap-guide gx"; guideY.className = "snap-guide gy";
export function enableDragging() {
  document.body.append(guideX, guideY);
  let d = null;
  const blocked = t => t.closest("button, input, textarea, select, a, .slider, .seg, .mu-list, .rm-list, [contenteditable]");
  addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    const node = e.target.closest(".widget, #hero"); if (!node || blocked(e.target)) return;
    const r = node.getBoundingClientRect();
    d = { node, id: node.id === "hero" ? "hero" : node.dataset.w, sx: e.clientX, sy: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, on: false, pid: e.pointerId };
  });
  addEventListener("pointermove", e => {
    if (!d) return;
    if (!d.on) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
      d.on = true; d.node.classList.add("dragging"); d.node.style.transform = "none"; document.documentElement.classList.add("is-dragging");
      try { d.node.setPointerCapture(d.pid); } catch {}
      d.others = $$(".widget").filter(w => !w.hidden && w !== d.node).map(w => w.getBoundingClientRect());
    }
    const w = d.node.offsetWidth, h = d.node.offsetHeight, W = innerWidth, H = innerHeight;
    let x = e.clientX - d.dx, y = e.clientY - d.dy, sx = null, sy = null;
    const T = 10, xs = [[M, M], [W - M - w, W - M]], ys = [[TOP(), TOP()], [H - M - h, H - M]];
    d.others.forEach(o => { xs.push([o.left, o.left], [o.right - w, o.right], [o.right + 14, o.right + 14], [o.left - w - 14, o.left - 14]); ys.push([o.top, o.top], [o.bottom - h, o.bottom], [o.bottom + 14, o.bottom + 14], [o.top - h - 14, o.top - 14]); });
    for (const [v, line] of xs) if (Math.abs(x - v) < T) { x = v; sx = line; break; }
    for (const [v, line] of ys) if (Math.abs(y - v) < T) { y = v; sy = line; break; }
    if (sx == null) x = Math.round(x / 8) * 8; if (sy == null) y = Math.round(y / 8) * 8;
    x = clamp(x, 0, W - w); y = clamp(y, 0, H - Math.min(h, 60));
    d.node.style.left = x + "px"; d.node.style.top = y + "px";
    guideX.style.display = sx == null ? "none" : "block"; guideX.style.left = sx + "px";
    guideY.style.display = sy == null ? "none" : "block"; guideY.style.top = sy + "px";
  });
  const end = () => {
    if (!d) return;
    if (d.on) {
      const r = d.node.getBoundingClientRect(), W = innerWidth, H = innerHeight;
      const ax = r.left + r.width / 2 > W / 2 ? "r" : "l", ay = r.top + r.height / 2 > H / 2 ? "b" : "t";
      const anchor = rr => { const ax = rr.left + rr.width / 2 > W / 2 ? "r" : "l", ay = rr.top + rr.height / 2 > H / 2 ? "b" : "t"; return { ax, ay, x: Math.round(ax === "r" ? W - rr.right : rr.left), y: Math.round(ay === "b" ? H - rr.bottom : rr.top) }; };
      /* first manual move freezes every other card where it is, so nothing else jumps */
      const pos = { ...cfg.positions };
      $$(".widget").forEach(w => { if (!w.hidden && w !== d.node && !pos[w.dataset.w]) pos[w.dataset.w] = anchor(w.getBoundingClientRect()); });
      pos[d.id] = anchor(r);
      update({ positions: pos }, { silent: true });
      d.node.classList.remove("dragging"); document.documentElement.classList.remove("is-dragging");
      guideX.style.display = guideY.style.display = "none";
      const swallow = ev => { ev.stopPropagation(); ev.preventDefault(); };
      addEventListener("click", swallow, true); setTimeout(() => removeEventListener("click", swallow, true), 0);

    }
    d = null;
  };
  addEventListener("pointerup", end); addEventListener("pointercancel", end);
}
export function resetLayout() { set("positions", {}, { silent: true }); layout({ animate: true }); }
