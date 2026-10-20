/* Toggle: the knob stretches while pressed and becomes glass, as on iOS 26. */
import { glassify } from "../glass/glass.js";

export function toggle({ checked = false, label, onChange }) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "switch"; b.setAttribute("role", "switch");
  b.setAttribute("aria-checked", String(checked)); b.setAttribute("aria-label", label);
  const knob = document.createElement("span"); knob.className = "sw-knob";
  knob.innerHTML = `<span class="pane"></span>`;
  b.append(knob);
  glassify(knob, "droplet", { zoom: 0.2, scale: 26 });
  b.addEventListener("pointerdown", () => b.classList.add("pressing"));
  const up = () => b.classList.remove("pressing");
  b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up); b.addEventListener("pointercancel", up);
  b.addEventListener("click", () => {
    const v = b.getAttribute("aria-checked") !== "true";
    b.setAttribute("aria-checked", String(v));
    onChange && onChange(v);
  });
  return b;
}
