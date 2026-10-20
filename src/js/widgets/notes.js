import { el } from "../core/util.js";
import { store } from "../core/store.js";
import { bus } from "../core/bus.js";

export function mountNotes(pane) {
  const title = el("div", "w-title"), status = el("span", "faint", "Saved");
  title.append(el("span", "grow", "Notes"), status);
  const ta = el("textarea", "notes"); ta.placeholder = "Jot something down. It stays on this device."; ta.setAttribute("aria-label", "Note");
  ta.value = store.get("notes", "");
  let t; ta.addEventListener("input", () => { status.textContent = "Saving"; clearTimeout(t); t = setTimeout(() => { store.set("notes", ta.value); status.textContent = "Saved"; }, 500); });
  bus.on("notes:set", v => { if (v && v !== ta.value) { ta.value = v; store.set("notes", v); } });
  pane.append(title, ta);
  return {};
}
