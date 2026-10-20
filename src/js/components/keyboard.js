/* On-screen glass keyboard. Wallpaper Engine passes clicks but not key
 * presses to wallpapers, so text fields (city, reminders, notes, shortcuts)
 * get this keyboard instead. Mode: auto (only in Wallpaper Engine), on, off. */
import { el } from "../core/util.js";
import { cfg } from "../core/settings.js";
import { glassify } from "../glass/glass.js";
import { liquidOpen, liquidClose } from "../glass/motion.js";
import { inWallpaperEngine } from "../platform/wallpaper-engine.js";

const LAYOUTS = {
  abc: [["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"], ["a", "s", "d", "f", "g", "h", "j", "k", "l"], ["shift", "z", "x", "c", "v", "b", "n", "m", "back"], ["num", ",", "space", ".", "enter", "done"]],
  num: [["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"], ["-", "/", ":", ";", "(", ")", "&", "@", "\""], ["#", "=", "+", "?", "!", "'", "_", "\\", "back"], ["abc", ",", "space", ".", "enter", "done"]],
};
const LABEL = { shift: "⇧", back: "⌫", num: "123", abc: "ABC", space: "space", enter: "return", done: "Done" };
const isText = t => t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && /^(text|search|url|email|)$/i.test(t.type))) && !t.readOnly && !t.disabled;

export const keyboardOn = () => cfg.keyboard === "on" || (cfg.keyboard !== "off" && inWallpaperEngine());

export function initKeyboard() {
  const kb = el("div", "glass kb"); kb.hidden = true; kb.setAttribute("role", "group"); kb.setAttribute("aria-label", "On-screen keyboard");
  const pane = el("div", "pane"); kb.append(pane); document.body.append(kb);
  glassify(kb, "panel");
  let target = null, layout = "abc", shift = false;

  function draw() {
    pane.textContent = "";
    LAYOUTS[layout].forEach(keys => {
      const r = el("div", "kb-row");
      keys.forEach(k => {
        const special = k in LABEL;
        const b = el("button", "kb-key" + (special ? " act k-" + k : ""), special ? LABEL[k] : shift ? k.toUpperCase() : k);
        b.type = "button"; b.dataset.k = k;
        if (k === "shift" && shift) b.classList.add("on");
        r.append(b);
      });
      pane.append(r);
    });
  }
  function insert(text) {
    const t = target; if (!t) return;
    const s = t.selectionStart ?? t.value.length, e = t.selectionEnd ?? s;
    t.setRangeText(text, s, e, "end");
    t.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function press(k) {
    const t = target; if (!t) return;
    if (k === "shift") { shift = !shift; return draw(); }
    if (k === "num" || k === "abc") { layout = k; shift = false; return draw(); }
    if (k === "done") return hide(true);
    if (k === "back") {
      const s = t.selectionStart ?? t.value.length, e = t.selectionEnd ?? s;
      if (s !== e) t.setRangeText("", s, e, "end"); else if (s > 0) t.setRangeText("", s - 1, s, "end");
      return t.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (k === "enter") {
      if (t.tagName === "TEXTAREA") return insert("\n");
      if (t.form) t.form.requestSubmit(); else t.dispatchEvent(new CustomEvent("kbenter", { bubbles: true }));
      return;
    }
    insert(k === "space" ? " " : shift ? k.toUpperCase() : k);
    if (shift) { shift = false; draw(); }
  }
  /* pointerdown keeps focus in the field; the key acts on click */
  kb.addEventListener("pointerdown", e => e.preventDefault());
  kb.addEventListener("click", e => { const b = e.target.closest(".kb-key"); if (b) press(b.dataset.k); });

  function show(t) {
    target = t; layout = "abc"; shift = !t.value; draw();
    if (kb.hidden) liquidOpen(kb, null);
    requestAnimationFrame(() => t.scrollIntoView({ block: "center", behavior: "smooth" }));
  }
  function hide(blur) { if (blur && target) target.blur(); target = null; if (!kb.hidden) liquidClose(kb, null); }
  addEventListener("focusin", e => { if (keyboardOn() && isText(e.target)) show(e.target); });
  addEventListener("focusout", () => setTimeout(() => { if (target && !isText(document.activeElement)) hide(false); }, 0));
  return { hide };
}
