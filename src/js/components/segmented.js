/* Segmented control whose selection is a glass droplet that slides and
 * stretches between options. */
import { glassify } from "../glass/glass.js";
import { reducedMotion } from "../core/util.js";

export function segmented({ options, value, label, onChange }) {
  const root = document.createElement("div");
  root.className = "seg"; root.setAttribute("role", "radiogroup"); root.setAttribute("aria-label", label);
  const drop = document.createElement("span"); drop.className = "seg-drop"; drop.innerHTML = `<span class="pane"></span>`;
  root.append(drop);
  const buttons = options.map(([v, text]) => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = text;
    b.setAttribute("role", "radio"); b.dataset.v = v; b.setAttribute("aria-checked", String(v === value));
    b.onclick = () => select(v, true);
    root.append(b); return b;
  });
  root.addEventListener("keydown", e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = buttons.findIndex(b => b.dataset.v === value), n = buttons[(i + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length];
    select(n.dataset.v, true); n.focus(); e.preventDefault();
  });
  let placed = false;
  function place(animate) {
    const b = buttons.find(x => x.dataset.v === value); if (!b || !b.offsetWidth) return;
    const from = { l: drop.offsetLeft, w: drop.offsetWidth };
    drop.style.left = b.offsetLeft + "px"; drop.style.width = b.offsetWidth + "px";
    if (animate && placed && !reducedMotion() && from.w) {
      const dx = from.l - b.offsetLeft;
      drop.animate([
        { transform: `translateX(${dx}px) scale(${from.w / b.offsetWidth}, 1)` },
        { transform: `translateX(${dx * 0.35}px) scale(1.18, 0.82)`, offset: 0.45 },
        { transform: "translateX(0) scale(1)" },
      ], { duration: 460, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    }
    placed = true;
  }
  function select(v, user) {
    if (v === value && placed) return;
    value = v;
    buttons.forEach(b => b.setAttribute("aria-checked", String(b.dataset.v === v)));
    place(true);
    if (user && onChange) onChange(v);
  }
  requestAnimationFrame(() => { glassify(drop, "control"); place(false); });
  new ResizeObserver(() => place(false)).observe(root);
  return root;
}
