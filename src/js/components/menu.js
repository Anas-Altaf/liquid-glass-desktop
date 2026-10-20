/* Glass menus: menu-bar drop-downs and the desktop context menu share this. */
import { el } from "../core/util.js";
import { glassify } from "../glass/glass.js";
import { liquidOpen, liquidClose } from "../glass/motion.js";

let open = null;
const CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

export function closeMenus() { if (open) { const m = open; open = null; m.trigger && m.trigger.setAttribute("aria-expanded", "false"); liquidClose(m.node, m.trigger).then(() => m.node.remove()); } }

/** items: [{label, hint, checked, disabled, action} | "-"] ; at: {x, y} or a trigger element */
export function showMenu(items, at, label = "Menu") {
  closeMenus();
  const node = el("div", "glass menu"); node.setAttribute("role", "menu"); node.setAttribute("aria-label", label);
  const pane = el("div", "pane");
  items.forEach(it => {
    if (it === "-") { pane.append(el("div", "menu-sep")); return; }
    const b = el("button", "menu-item"); b.setAttribute("role", it.checked != null ? "menuitemcheckbox" : "menuitem");
    if (it.checked != null) b.setAttribute("aria-checked", String(!!it.checked));
    if (it.disabled) b.disabled = true;
    const chk = el("span", "menu-check"); chk.innerHTML = it.checked ? CHECK : "";
    b.append(chk, el("span", "menu-label", it.label));
    if (it.hint) b.append(el("span", "menu-hint", it.hint));
    b.onclick = () => { closeMenus(); it.action && it.action(); };
    pane.append(b);
  });
  node.append(pane); document.body.append(node);
  glassify(node, "menu");
  const trigger = at instanceof Element ? at : null;
  let x, y;
  if (trigger) { const r = trigger.getBoundingClientRect(); x = r.left; y = r.bottom + 8; trigger.setAttribute("aria-expanded", "true"); }
  else { x = at.x; y = at.y; }
  node.style.left = "0px"; node.style.top = "0px";
  const w = node.offsetWidth, h = node.offsetHeight;
  node.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + "px";
  node.style.top = Math.max(8, Math.min(innerHeight - h - 8, y)) + "px";
  open = { node, trigger };
  liquidOpen(node, trigger || null);
  const first = node.querySelector(".menu-item:not(:disabled)"); first && first.focus({ preventScroll: true });
  node.addEventListener("keydown", e => {
    const list = [...node.querySelectorAll(".menu-item:not(:disabled)")], i = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { list[(i + 1) % list.length].focus(); e.preventDefault(); }
    if (e.key === "ArrowUp") { list[(i - 1 + list.length) % list.length].focus(); e.preventDefault(); }
    if (e.key === "Escape") { closeMenus(); trigger && trigger.focus(); }
  });
  return node;
}

addEventListener("pointerdown", e => { if (open && !e.target.closest(".menu") && e.target !== open.trigger && !(open.trigger && open.trigger.contains(e.target))) closeMenus(); }, true);
addEventListener("blur", closeMenus);
