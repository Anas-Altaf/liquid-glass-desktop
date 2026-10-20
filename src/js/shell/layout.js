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
  node.style.top = clamp(top, 0, Math.max(0, H - h)) + "px";
}
const autoWidth = W => W >= 1800 ? 320 : W >= 760 ? 300 : Math.min(360, W - 24);

/* Layout modes: where cards you haven't moved go.
 *   columns  left and right edges (default)
 *   left / right  a sidebar on one side, the clock in the free space
 *   bento    a centred grid under the clock
 *   row      a row along the bottom, the clock top-left */
export const LAYOUTS = [["columns", "Columns"], ["left", "Sidebar left"], ["right", "Sidebar right"], ["bento", "Bento grid"], ["row", "Bottom row"]];

export function layout({ animate = false } = {}) {
  const W = innerWidth, H = innerHeight, gap = 14, bottom = H - (cfg.dock.mode === "always" ? 104 : 24);
  const before = new Map(); if (animate) $$(".widget").forEach(w => { if (!w.hidden) before.set(w, w.getBoundingClientRect()); });
  const vis = ORDER.filter(id => cfg.widgets[id] && widgetEl(id) && !widgetEl(id).dataset.closing);
  const cw = autoWidth(W);
  vis.forEach(id => { const n = widgetEl(id), own = cfg.cards[id] && cfg.cards[id].width; n.style.width = (own || cw) + "px"; });
  const free = vis.filter(id => !cfg.positions[id]);
  const mode = W < 700 ? "columns" : cfg.layoutMode;
  placeHero();
  /* cards you've moved stay put; the rest flow around them */
  const box = n => { const l = parseFloat(n.style.left) || 0, t = parseFloat(n.style.top) || 0; return { l, t, r: l + n.offsetWidth, b: t + n.offsetHeight }; };
  const hit = (occ, l, t, w, h) => occ.find(o => o.l < l + w + gap && o.r + gap > l && o.t < t + h + gap && o.b + gap > t);
  /* a moved card that grew (weather loading, a playlist opening) pushes the
   * moved cards it now overlaps further along its anchor, so they never stack */
  const saved = vis.filter(id => cfg.positions[id]).map(id => { const n = widgetEl(id); placeSaved(n, cfg.positions[id]); return { n, ay: cfg.positions[id].ay }; });
  const taken = [];
  [...saved.filter(c => c.ay !== "b").sort((a, b) => parseFloat(a.n.style.top) - parseFloat(b.n.style.top)),
   ...saved.filter(c => c.ay === "b").sort((a, b) => parseFloat(b.n.style.top) - parseFloat(a.n.style.top))].forEach(({ n, ay }) => {
    let r = box(n), o, guard = 0;
    const over = q => taken.find(o => o.l < q.r - 1 && o.r > q.l + 1 && o.t < q.b - 1 && o.b > q.t + 1);
    while ((o = over(r)) && guard++ < 20) {
      const top = ay === "b" ? o.t - gap - (r.b - r.t) : o.b + gap;
      if (top < 0 || top + (r.b - r.t) > H) break;
      n.style.top = top + "px"; r = box(n);
    }
    taken.push(r);
  });
  let place = {};

  if (mode === "row") {
    /* bottom-aligned rows, filled left to right, stacking upwards */
    const occ = [...taken]; let x = M, base = bottom, rowTop = bottom;
    free.forEach(id => {
      const n = widgetEl(id), w = n.offsetWidth, h = n.offsetHeight;
      if (x + w > W - M && x > M) { x = M; base = rowTop - gap; rowTop = base; }
      let o; while ((o = hit(occ, x, base - h, w, h)) && x + w <= W - M) x = o.r + gap;
      place[id] = [x, Math.max(TOP(), base - h)]; occ.push({ l: x, t: base - h, r: x + w, b: base });
      rowTop = Math.min(rowTop, base - h); x += w + gap;
    });
  } else {
    let cands = [], top = TOP();
    const col = i => M + i * (cw + gap), colR = i => W - M - cw - i * (cw + gap);
    if (mode === "left") cands = [[col(0)], [col(0), col(1)], [col(0), col(1), col(2)]];
    else if (mode === "right") cands = [[colR(0)], [colR(0), colR(1)], [colR(0), colR(1), colR(2)]];
    else if (mode === "bento") {
      const n = clamp(Math.floor((W - 2 * M + gap) / (cw + gap)), 1, 4);
      for (let k = Math.min(3, n); k <= n; k++) { const s0 = Math.round((W - (k * cw + (k - 1) * gap)) / 2); cands.push([...Array(k)].map((_, i) => s0 + i * (cw + gap))); }
      const hero = $("#hero");
      if (hero && !hero.hidden && !cfg.positions.hero) top = Math.max(top, (parseFloat(hero.style.top) || 0) + hero.offsetHeight + 28);
    } else {
      if (W >= 1000) cands.push([M, W - M - cw]);
      if (W >= 1240) cands.push([M, M + cw + gap, W - M - cw, W - M - 2 * cw - gap]);
      if (W >= 700 && W < 1000) cands.push([Math.round(W / 2 - cw - gap / 2), Math.round(W / 2 + gap / 2)]);
    }
    if (!cands.length) cands.push([Math.round((W - cw) / 2)]);
    for (const xs of cands) {
      const ys = xs.map(() => top), occ = [...taken]; place = {};
      free.forEach(id => {
        const n = widgetEl(id), w = n.offsetWidth, h = n.offsetHeight;
        let c = 0; ys.forEach((y, i) => { if (y < ys[c] - 1) c = i; });
        let y = ys[c], o;
        while ((o = hit(occ, xs[c], y, w, h))) y = o.b + gap;
        place[id] = [xs[c], y]; occ.push({ l: xs[c], t: y, r: xs[c] + w, b: y + h }); ys[c] = y + h + gap;
      });
      if (Math.max(...ys) - gap <= bottom) break;
    }
  }
  free.forEach(id => { const n = widgetEl(id); n.style.left = place[id][0] + "px"; n.style.top = place[id][1] + "px"; });
  if (animate) flip([...before.keys()].filter(n => !n.hidden), before);
}

/* the clock's default spot follows the layout mode */
export function placeHero() {
  const hero = $("#hero"); if (!hero || hero.hidden) return;
  const p = cfg.positions.hero, W = innerWidth, H = innerHeight, w = hero.offsetWidth, h = hero.offsetHeight, cw = autoWidth(W);
  hero.style.transform = "none";
  if (p) return placeSaved(hero, p);
  const mode = W < 700 ? "columns" : cfg.layoutMode;
  let x = (W - w) / 2, y = Math.round(H * 0.14);
  if (mode === "left") { x = M + cw + (W - M - cw - w) / 2; y = (H - h) / 2; }
  else if (mode === "right") { x = (W - M - cw - w) / 2; y = (H - h) / 2; }
  else if (mode === "row") { x = M + 12; y = TOP() + 12; }
  else if (mode === "bento") y = TOP() + 8;
  hero.style.left = clamp(Math.round(x), 0, Math.max(0, W - w)) + "px"; hero.style.top = clamp(Math.round(y), 0, Math.max(0, H - h)) + "px";
}

/** Put the desktop clock at one of nine spots: t/m/b + l/c/r, or "auto" for the layout's default. */
export function placeHeroAt(spot) {
  const hero = $("#hero"); if (!hero) return;
  if (spot === "auto") { const p = { ...cfg.positions }; delete p.hero; set("positions", p); return; }
  const W = innerWidth, H = innerHeight, w = hero.offsetWidth, h = hero.offsetHeight, pad = 40;
  const [v, hz] = spot;
  const left = hz === "l" ? pad : hz === "r" ? W - pad - w : (W - w) / 2;
  const top = v === "t" ? TOP() + 8 : v === "b" ? H - pad - h - (cfg.dock.mode === "always" ? 90 : 0) : (H - h) / 2;
  const ax = hz === "r" ? "r" : "l", ay = v === "b" ? "b" : "t";
  set("positions", { ...cfg.positions, hero: { ax, ay, x: Math.round(ax === "r" ? W - left - w : left), y: Math.round(ay === "b" ? H - top - h : top) } });
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
    if (e.button !== 0 || cfg.lockLayout) return;
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
    x = clamp(x, 0, Math.max(0, W - w)); y = clamp(y, 0, Math.max(0, H - h));
    d.node.style.left = x + "px"; d.node.style.top = y + "px";
    guideX.style.display = sx == null ? "none" : "block"; guideX.style.left = sx + "px";
    guideY.style.display = sy == null ? "none" : "block"; guideY.style.top = sy + "px";
  });
  const end = () => {
    if (!d) return;
    if (d.on) {
      /* use the laid-out position, not the on-screen rect: a card can be mid-animation */
      const W = innerWidth, H = innerHeight;
      const rect = n => { const left = parseFloat(n.style.left) || 0, top = parseFloat(n.style.top) || 0; return { left, top, width: n.offsetWidth, height: n.offsetHeight, right: left + n.offsetWidth, bottom: top + n.offsetHeight }; };
      const anchor = rr => { const ax = rr.left + rr.width / 2 > W / 2 ? "r" : "l", ay = rr.top + rr.height / 2 > H / 2 ? "b" : "t"; return { ax, ay, x: Math.round(ax === "r" ? W - rr.right : rr.left), y: Math.round(ay === "b" ? H - rr.bottom : rr.top) }; };
      /* first manual move freezes every other card where it is, so nothing else jumps */
      const pos = { ...cfg.positions };
      $$(".widget").forEach(w => { if (!w.hidden && !w.dataset.closing && w !== d.node && !pos[w.dataset.w]) pos[w.dataset.w] = anchor(rect(w)); });
      pos[d.id] = anchor(rect(d.node));
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
