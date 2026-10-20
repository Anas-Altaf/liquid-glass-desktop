/* Drag to scroll, with momentum. Wallpaper Engine doesn't pass the mouse
 * wheel to wallpapers, so Settings and card lists scroll by dragging their
 * content (the wheel still works where it's available). */
const SCROLLERS = "#setMain, .set-side, .mu-list, .rm-list";
const SKIP = ".slider, input, textarea, select, .seg, .switch, .kb";

export function initDragScroll() {
  let d = null, raf = 0;
  addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    const sc = e.target.closest(SCROLLERS);
    if (!sc || e.target.closest(SKIP)) return;
    const canY = sc.scrollHeight > sc.clientHeight + 1, canX = sc.scrollWidth > sc.clientWidth + 1;
    if (!canY && !canX) return;
    cancelAnimationFrame(raf);
    d = { sc, x: e.clientX, y: e.clientY, top: sc.scrollTop, left: sc.scrollLeft, canX, canY, on: false, v: 0, lt: performance.now(), lp: canY ? e.clientY : e.clientX };
  }, true);
  addEventListener("pointermove", e => {
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.on) {
      if (Math.hypot(dx, dy) < 6) return;
      d.on = true; d.sc.classList.add("drag-scrolling");
    }
    if (d.canY) d.sc.scrollTop = d.top - dy; else d.sc.scrollLeft = d.left - dx;
    const now = performance.now(), p = d.canY ? e.clientY : e.clientX, dt = Math.max(1, now - d.lt);
    d.v = 0.8 * ((d.lp - p) / dt) + 0.2 * d.v; d.lp = p; d.lt = now;
  }, true);
  const end = () => {
    if (!d) return;
    const { sc, on, canY } = d; let v = d.v * 16; d = null;
    if (!on) return;
    sc.classList.remove("drag-scrolling");
    /* the release isn't a click on whatever is under the pointer */
    const swallow = ev => { ev.stopPropagation(); ev.preventDefault(); };
    addEventListener("click", swallow, true); setTimeout(() => removeEventListener("click", swallow, true), 0);
    const glide = () => { if (Math.abs(v) < 0.4) return; if (canY) sc.scrollTop += v; else sc.scrollLeft += v; v *= 0.94; raf = requestAnimationFrame(glide); };
    raf = requestAnimationFrame(glide);
  };
  addEventListener("pointerup", end, true); addEventListener("pointercancel", end, true);
}
