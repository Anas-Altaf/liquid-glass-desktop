import { el } from "../core/util.js";
import { store } from "../core/store.js";
import { bus } from "../core/bus.js";

const CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const X = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';

export function mountReminders(pane) {
  let items = store.get("reminders", [
    { id: 1, text: "Pick a wallpaper in Settings", done: false },
    { id: 2, text: "Right-click the desktop for more", done: false },
    { id: 3, text: "Turn on the Focus Timer widget", done: true },
  ]);
  const title = el("div", "w-title"), count = el("span", "faint num");
  title.append(el("span", "grow", "Reminders"), count);
  const list = el("ul", "rm-list");
  const form = el("form", "rm-add");
  form.innerHTML = `<label class="sr-only" for="rmIn">New reminder</label><input class="field" id="rmIn" placeholder="New reminder" autocomplete="off"><button class="pill" type="submit">Add</button>`;
  const weHint = el("p", "we-hint faint", "Add reminders in Wallpaper Engine’s properties panel; typing isn’t passed to wallpapers.");
  pane.append(title, list, form, weHint);
  const save = () => store.set("reminders", items);
  function render() {
    list.textContent = "";
    const open = items.filter(r => !r.done).length;
    count.textContent = open ? `${open} open` : "";
    if (!items.length) list.append(el("li", "empty", "All clear. Add a reminder below."));
    items.forEach(r => {
      const li = el("li", "rm-item" + (r.done ? " done" : ""));
      const chk = el("button", "rm-check"); chk.setAttribute("aria-label", `${r.done ? "Mark not done" : "Mark done"}: ${r.text}`); chk.innerHTML = r.done ? CHECK : "";
      chk.onclick = () => { r.done = !r.done; save(); render(); };
      const del = el("button", "icon-btn rm-del"); del.setAttribute("aria-label", `Delete: ${r.text}`); del.innerHTML = X;
      del.onclick = () => { items = items.filter(x => x !== r); save(); render(); };
      li.append(chk, el("span", "rm-text", r.text), del); list.append(li);
    });
    bus.emit("layout");
  }
  form.onsubmit = e => {
    e.preventDefault(); const inp = form.querySelector("input"), v = inp.value.trim(); if (!v) return;
    items.push({ id: Date.now(), text: v, done: false }); inp.value = ""; save(); render();
  };
  /* Wallpaper Engine has no keyboard input: reminders can come from its properties (one per line or separated by ;) */
  bus.on("reminders:set", text => {
    const want = String(text || "").split(/[;\n]/).map(x => x.trim()).filter(Boolean);
    want.forEach(w => { if (!items.some(i => i.text === w)) items.push({ id: Date.now() + Math.random(), text: w, done: false }); });
    save(); render();
  });
  render();
  return {};
}
