/* Slider with an iOS 26-style thumb: a small white knob at rest that turns
 * into a clear glass droplet (magnifying the track) while it is dragged. */
import { clamp } from "../core/util.js";
import { glassify } from "../glass/glass.js";

export function slider(root, { value = 0, label, step = 0.05, format = v => `${Math.round(v * 100)}%`, onInput, onChange, knob = true } = {}) {
  root.classList.add("slider");
  root.setAttribute("role", "slider"); root.tabIndex = 0;
  root.setAttribute("aria-label", label); root.setAttribute("aria-valuemin", "0"); root.setAttribute("aria-valuemax", "100");
  root.innerHTML = `<span class="sl-track"><span class="sl-fill"></span></span>`;
  const fill = root.querySelector(".sl-fill");
  let thumb = null;
  if (knob) {
    thumb = document.createElement("span"); thumb.className = "sl-thumb";
    thumb.innerHTML = `<span class="pane"><span class="sl-knob"></span></span>`;
    root.append(thumb);
    glassify(thumb, "droplet");
  }
  let v = clamp(value, 0, 1), drag = false;
  const draw = () => {
    fill.style.width = v * 100 + "%";
    if (thumb) thumb.style.left = v * 100 + "%";
    root.setAttribute("aria-valuenow", String(Math.round(v * 100)));
    root.setAttribute("aria-valuetext", format(v));
  };
  const at = e => { const r = root.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); };
  root.addEventListener("pointerdown", e => { drag = true; root.classList.add("active"); root.setPointerCapture(e.pointerId); v = at(e); draw(); onInput && onInput(v); e.preventDefault(); });
  root.addEventListener("pointermove", e => { if (!drag) return; v = at(e); draw(); onInput && onInput(v); });
  const end = () => { if (!drag) return; drag = false; root.classList.remove("active"); onChange && onChange(v); };
  root.addEventListener("pointerup", end); root.addEventListener("pointercancel", end);
  root.addEventListener("keydown", e => {
    const map = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: step * 4, PageDown: -step * 4 };
    if (e.key in map) v = clamp(v + map[e.key], 0, 1); else if (e.key === "Home") v = 0; else if (e.key === "End") v = 1; else return;
    e.preventDefault(); draw(); onInput && onInput(v); onChange && onChange(v);
  });
  draw();
  return { set(nv) { if (!drag) { v = clamp(nv, 0, 1); draw(); } }, get value() { return v; }, get dragging() { return drag; } };
}
