/* Liquid motion. Fades are applied to the glass layers individually, never to
 * the .lg element (opacity there would blank its backdrop-filter). */
import { reducedMotion } from "../core/util.js";

export const SPRING = "cubic-bezier(0.2, 1.3, 0.32, 1)";
export const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const parts = el => [...el.children].filter(c => !c.matches("svg"));

/** Open a glass surface, growing out of the element that triggered it. */
export function liquidOpen(el, from) {
  el.hidden = false;
  if (reducedMotion()) return Promise.resolve();
  const r = el.getBoundingClientRect();
  let ox = "50%", oy = "0%";
  if (from) {
    const f = from.getBoundingClientRect();
    ox = `${((f.left + f.width / 2 - r.left) / r.width * 100).toFixed(1)}%`;
    oy = `${((f.top + f.height / 2 - r.top) / r.height * 100).toFixed(1)}%`;
  }
  el.style.transformOrigin = `${ox} ${oy}`;
  const base = getComputedStyle(el).translate === "none" ? "" : "";
  el.getAnimations().forEach(a => a.cancel());
  const a = el.animate([
    { transform: `${base} scale(0.82, 0.7)` },
    { transform: `${base} scale(1.015, 1.03)`, offset: 0.62 },
    { transform: `${base} scale(1)` },
  ], { duration: 480, easing: EASE_OUT, composite: "add" });
  parts(el).forEach((p, i) => p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: i === parts(el).length - 1 ? 300 : 200, delay: i === parts(el).length - 1 ? 60 : 0, easing: "ease-out", fill: "backwards" }));
  return a.finished.catch(() => {});
}

/** Close a glass surface back towards its trigger, then hide it. */
export function liquidClose(el, to) {
  if (el.hidden) return Promise.resolve();
  if (reducedMotion()) { el.hidden = true; return Promise.resolve(); }
  if (to) {
    const r = el.getBoundingClientRect(), f = to.getBoundingClientRect();
    el.style.transformOrigin = `${((f.left + f.width / 2 - r.left) / r.width * 100).toFixed(1)}% ${((f.top + f.height / 2 - r.top) / r.height * 100).toFixed(1)}%`;
  }
  el.getAnimations().forEach(a => a.cancel());
  const a = el.animate([{ transform: "scale(1)" }, { transform: "scale(0.86, 0.76)" }], { duration: 220, easing: "cubic-bezier(0.4, 0, 1, 1)", composite: "add" });
  parts(el).forEach(p => p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-in", fill: "forwards" }));
  return a.finished.catch(() => {}).then(() => {
    el.hidden = true;
    parts(el).forEach(p => p.getAnimations().forEach(x => x.cancel()));
  });
}

/** FLIP: animate elements from their previous rects to their current ones. */
export function flip(els, before) {
  if (reducedMotion()) return;
  els.forEach(el => {
    const a = before.get(el); if (!a) return;
    const b = el.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration: 520, easing: SPRING, composite: "add" });
  });
}

/** A short squash on press, the "liquid" response Apple's controls have. */
export function press(el) {
  if (reducedMotion()) return;
  el.animate([{ transform: "scale(1)" }, { transform: "scale(0.94, 0.9)" }, { transform: "scale(1.02, 1.04)" }, { transform: "scale(1)" }], { duration: 380, easing: EASE_OUT, composite: "add" });
}
