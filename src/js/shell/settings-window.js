/* Settings. Controls write straight to settings and update in place; the
 * window only re-renders for changes made elsewhere (no flicker). */
import { $, $$, el } from "../core/util.js";
import { cfg, set, update, WIDGETS, DEFAULTS, exportAll, importAll, resetAll } from "../core/settings.js";
import { bus } from "../core/bus.js";
import { toggle } from "../components/switch.js";
import { segmented } from "../components/segmented.js";
import { slider } from "../components/slider.js";
import { THEMES } from "../wallpaper/themes.js";
import { drawWaves } from "../wallpaper/wallpaper.js";
import { setMainFile, addSlides, clearSlides, wpMedia } from "../wallpaper/media.js";
import { ZONES } from "../widgets/world-clock.js";
import { liquidOpen, liquidClose } from "../glass/motion.js";
import { inWallpaperEngine } from "../platform/wallpaper-engine.js";
import { refractionSupported } from "../glass/glass.js";
import { list as playlist, addFiles, removeTrack, setIncludeBuiltin, current } from "../audio/player.js";
import { store } from "../core/store.js";
import { GLYPHS, ACTIONS, PRESETS } from "./dock.js";

const SECTIONS = [
  ["widgets", "Widgets", "#0a84ff"], ["glass", "Glass", "#5e5ce6"], ["cards", "Cards", "#bf5af2"], ["wallpaper", "Wallpaper", "#ff9f0a"],
  ["island", "Top Bar", "#30b0c7"], ["dock", "Shortcuts", "#34c759"], ["clock", "Clock", "#636366"], ["music", "Music", "#fa233b"],
  ["viz", "Visualizer", "#ff375f"], ["weather", "Weather", "#32ade6"], ["data", "Data & Backup", "#8e8e93"], ["access", "Accessibility", "#0a84ff"],
];
const SRC = { source: "settings" };
const S = (path, v) => set(path, v, SRC);
const get = path => path.split(".").reduce((o, k) => o == null ? o : o[k], cfg);

export function initSettings({ resetLayout }) {
  const win = $("#settings"), side = $("#setSide"), main = $("#setMain");
  let current_ = "widgets", trigger = null, cardSel = "music";
  SECTIONS.forEach(([id, name, color]) => {
    const b = el("button", "set-nav"); b.setAttribute("role", "tab"); b.dataset.sec = id;
    b.append(Object.assign(el("span", "dot"), { style: `background:${color}` }), name); b.onclick = () => render(id); side.append(b);
  });
  /* control builders */
  const group = (label, rows, note) => { const f = document.createDocumentFragment(); if (label) f.append(el("div", "group-label", label)); const g = el("div", "group"); rows.filter(Boolean).forEach(r => g.append(r)); f.append(g); if (note) f.append(el("p", "group-note", note)); return f; };
  const row = (label, sub, control) => { const r = el("div", "row"), l = el("span", "label", label); if (sub) l.append(el("span", "sub", sub)); r.append(l); if (control) r.append(control); return r; };
  const sw = (label, path, sub, fn) => row(label, sub, toggle({ checked: !!get(path), label, onChange: v => { S(path, v); fn && fn(v); } }));
  const seg = (label, path, options, sub) => row(label, sub, segmented({ label, options, value: String(get(path)), onChange: v => S(path, isNaN(+v) || v === "" ? v : +v) }));
  const rng = (label, path, min, max, step = 1, unit = "", fmt) => {
    const wrap = el("div", "row-slider"), out = el("span", "row-val num");
    const show = v => out.textContent = fmt ? fmt(v) : `${+v.toFixed(2)}${unit}`;
    const toV = t => Math.round((min + t * (max - min)) / step) * step;
    slider(wrap, { label, value: (get(path) - min) / (max - min), step: step / (max - min), format: t => fmt ? fmt(toV(t)) : toV(t) + unit, onInput: t => { const v = toV(t); show(v); S(path, v); } });
    show(get(path)); const r = row(label, null, wrap); r.append(out); return r;
  };
  const pickFile = (accept, multiple, cb) => { const i = el("input"); i.type = "file"; i.accept = accept; i.multiple = multiple; i.onchange = () => i.files.length && cb([...i.files]); i.click(); };
  const btn = (text, fn, cls = "pill") => { const b = el("button", cls, text); b.type = "button"; b.onclick = fn; return b; };

  const views = {
    widgets() {
      main.append(group("On the desktop", WIDGETS.map(([id, name, sub]) => sw(name, `widgets.${id}`, sub))));
      main.append(el("p", "group-note", "Drag any card to move it. It snaps to screen edges and to other cards, and stays where you leave it."));
      const br = el("div", "btn-row"); br.append(btn("Reset layout", resetLayout), btn("Customize a card", () => render("cards"))); main.append(br);
    },
    glass() {
      main.append(group("Material", [
        seg("Style", "style", [["clear", "Clear"], ["tinted", "Tinted"]]),
        seg("Quality", "glass.quality", [["high", "High"], ["balanced", "Balanced"], ["fast", "Fast"]], refractionSupported ? "High adds the colour-split rim; Fast is blur only" : "Refraction shows in Chromium browsers and Wallpaper Engine"),
        rng("Blur", "glass.blur", 0, 40, 1, "px"), rng("Saturation", "glass.sat", 50, 250, 5, "%"),
        rng("Light", "glass.bright", 0.6, 1.4, 0.02), rng("Tint", "glass.tint", 0, 0.6, 0.01, "", v => Math.round(v * 100) + "%"),
        rng("Refraction", "glass.refraction", 0, 2, 0.05, "", v => Math.round(v * 100) + "%"), rng("Shadow", "glass.shadow", 0, 0.6, 0.02, "", v => Math.round(v * 100) + "%"),
      ]));
      main.append(group("Shape & edge", [
        rng("Roundness", "glass.radius", 8, 44, 1, "px"), rng("Border", "glass.rim", 0, 1, 0.05, "", v => Math.round(v * 100) + "%"), rng("Shine", "glass.shine", 0, 1, 0.05, "", v => Math.round(v * 100) + "%"),
        seg("Light follows pointer", "glass.react", [["off", "Off"], ["near", "Nearby"], ["all", "All"]]),
        rng("Reach", "glass.reactRadius", 60, 600, 10, "px"),
      ]));
      const br = el("div", "btn-row"); br.append(btn("Restore glass defaults", () => { update({ glass: DEFAULTS.glass, style: "clear" }); render("glass"); })); main.append(br);
    },
    cards() {
      const ids = WIDGETS.map(w => w[0]);
      const pick = el("select", "field"); pick.setAttribute("aria-label", "Card");
      WIDGETS.forEach(([id, name]) => { const o = el("option", null, name); o.value = id; pick.append(o); });
      pick.value = ids.includes(cardSel) ? cardSel : "music"; pick.onchange = () => { cardSel = pick.value; render("cards"); };
      main.append(group(null, [row("Card", "Changes apply to this card only", pick)]));
      const base = `cards.${cardSel}`, c = cfg.cards[cardSel] || {};
      const ov = (label, key, min, max, step, unit, fmt) => {
        if (c[key] == null) { const r = row(label, "Follows Glass settings", btn("Adjust", () => { S(`${base}.${key}`, key === "width" ? 300 : cfg.glass[key] ?? 1); render("cards"); }, "pill small")); return r; }
        const r = rng(label, `${base}.${key}`, min, max, step, unit, fmt); r.append(btn("Reset", () => { const n = { ...cfg.cards[cardSel] }; delete n[key]; update({ cards: { ...cfg.cards, [cardSel]: n } }, SRC); render("cards"); }, "pill small")); return r;
      };
      main.append(group("This card", [
        ov("Width", "width", 220, 520, 4, "px"), ov("Blur", "blur", 0, 40, 1, "px"), ov("Saturation", "sat", 50, 250, 5, "%"), ov("Light", "bright", 0.6, 1.4, 0.02),
        ov("Tint", "tint", 0, 0.7, 0.01, "", v => Math.round(v * 100) + "%"), ov("Roundness", "radius", 8, 44, 1, "px"), ov("Border", "rim", 0, 1, 0.05, "", v => Math.round(v * 100) + "%"),
        ov("Shine", "shine", 0, 1, 0.05, "", v => Math.round(v * 100) + "%"), ov("Refraction", "refraction", 0, 2, 0.05, "", v => Math.round(v * 100) + "%"),
      ]));
      const br = el("div", "btn-row"); br.append(btn("Reset this card", () => { const n = { ...cfg.cards }; delete n[cardSel]; update({ cards: n }); render("cards"); })); main.append(br);
    },
    wallpaper() {
      main.append(group("Type", [seg("Wallpaper", "wallpaper.kind", [["theme", "Animated"], ["image", "Image"], ["gif", "GIF"], ["video", "Video"], ["color", "Gradient"], ["slideshow", "Slideshow"]])]));
      const k = cfg.wallpaper.kind;
      if (k === "theme") {
        const walls = el("div", "group walls");
        Object.entries(THEMES).filter(([t]) => t !== "image").forEach(([t, th]) => {
          const b = el("button", "wall-opt"); b.setAttribute("aria-pressed", String(cfg.wallpaper.theme === t));
          const c = el("canvas"); c.width = 160; c.height = 100; drawWaves(c.getContext("2d"), 160, 100, t, 0);
          b.append(c, th.name); b.onclick = () => { S("wallpaper.theme", t); walls.querySelectorAll(".wall-opt").forEach(x => x.setAttribute("aria-pressed", String(x === b))); }; walls.append(b);
        });
        main.append(el("div", "group-label", "Theme"), walls);
        main.append(group("Motion", [sw("Animate", "wallpaper.motion"), rng("Speed", "wallpaper.speed", 0.2, 3, 0.1, "×"), seg("Frame rate", "wallpaper.fps", [["30", "30"], ["60", "60"], ["120", "120"]]), sw("React to sound", "wallpaper.audioReactive", "Waves move with the music")]));
      }
      if (k === "image" || k === "gif" || k === "video") {
        const have = wpMedia.main ? "A file is set" : "No file yet";
        main.append(group("File", [row(k === "video" ? "Video" : k === "gif" ? "GIF" : "Image", inWallpaperEngine() ? "Or choose it in Wallpaper Engine’s properties" : have,
          btn("Choose…", () => pickFile(k === "video" ? "video/*" : "image/*", false, async ([f]) => { const kind = await setMainFile(f); S("wallpaper.kind", kind); render("wallpaper"); }))),
          seg("Fit", "wallpaper.fit", [["cover", "Fill"], ["contain", "Fit"]])]));
      }
      if (k === "color") main.append(group("Colours", [row("From", null, colorIn("wallpaper.colorA")), row("To", null, colorIn("wallpaper.colorB"))]));
      if (k === "slideshow") main.append(group("Slideshow", [row("Images", `${wpMedia.slides.length} added`, btn("Add images…", () => pickFile("image/*", true, async l => { await addSlides(l); bus.emit("wallpaper:media"); render("wallpaper"); }))),
        row("Clear images", null, btn("Clear", async () => { await clearSlides(); render("wallpaper"); })), rng("Change every", "wallpaper.slideEvery", 5, 600, 5, "s"), seg("Fit", "wallpaper.fit", [["cover", "Fill"], ["contain", "Fit"]])]));
      main.append(group("Look", [rng("Dim", "wallpaper.dim", 0, 0.8, 0.02, "", v => Math.round(v * 100) + "%")]));
    },
    island() {
      main.append(group("Top bar", [seg("Mode", "island.mode", [["island", "Island"], ["bar", "Full bar"], ["auto", "Auto-hide"], ["hidden", "Hidden"]]),
        sw("Expand on hover", "island.expandOnHover", "Shows now playing and quick actions"), sw("Show time", "island.showTime"), sw("Show weather", "island.showWeather")],
        "Auto-hide slides the island in when the pointer touches the top edge. When hidden, right-click the desktop for menus."));
    },
    dock() {
      main.append(group("Shortcut bar", [seg("Show", "dock.mode", [["hidden", "Hidden"], ["auto", "Auto-hide"], ["always", "Always"]])]));
      const L = cfg.dock.shortcuts;
      main.append(el("div", "group-label", "Shortcuts"));
      const g = el("div", "group");
      if (!L.length) g.append(row("No shortcuts yet", "Add one below"));
      L.forEach((s, i) => {
        const r = row(s.name, `${s.kind === "action" ? ACTIONS[s.target] : s.target}`);
        const up = btn("↑", () => { const n = [...L]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; S("dock.shortcuts", n); render("dock"); }, "pill small"); up.disabled = i === 0; up.setAttribute("aria-label", "Move up");
        const rm = btn("Remove", () => { S("dock.shortcuts", L.filter(x => x !== s)); render("dock"); }, "pill small");
        r.append(up, rm); g.append(r);
      });
      main.append(g);
      const form = el("form", "add-sc");
      form.innerHTML = `<div class="row"><label class="label" for="scName">Name</label><input class="field" id="scName" placeholder="e.g. Projects"></div>
        <div class="row"><label class="label" for="scKind">Type</label><select class="field" id="scKind"><option value="action">Built-in action</option><option value="url">Web page</option><option value="folder">Folder</option><option value="uri">App or system link</option></select></div>
        <div class="row"><label class="label" for="scTarget">Target</label><input class="field" id="scTarget" placeholder="https://… , C:\\Users\\… , ms-settings:display"><select class="field" id="scAction" hidden>${Object.entries(ACTIONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
        <div class="row"><label class="label" for="scIcon">Icon</label><select class="field" id="scIcon">${Object.keys(GLYPHS).map(k => `<option>${k}</option>`).join("")}<option value="letter">First letter</option></select><button class="pill" type="submit">Add</button></div>`;
      const kind = form.querySelector("#scKind"), tgt = form.querySelector("#scTarget"), act = form.querySelector("#scAction");
      kind.onchange = () => { tgt.hidden = kind.value === "action"; act.hidden = kind.value !== "action"; };
      tgt.hidden = true; act.hidden = false;
      form.onsubmit = e => { e.preventDefault(); const name = form.querySelector("#scName").value.trim() || (kind.value === "action" ? ACTIONS[act.value] : tgt.value.trim()); const target = kind.value === "action" ? act.value : tgt.value.trim(); if (!target) return;
        S("dock.shortcuts", [...cfg.dock.shortcuts, { id: "s" + Date.now(), name, kind: kind.value, target, icon: form.querySelector("#scIcon").value }]); if (cfg.dock.mode === "hidden") S("dock.mode", "always"); render("dock"); };
      const fg = el("div", "group"); fg.append(form); main.append(el("div", "group-label", "Add a shortcut"), fg);
      const pre = el("div", "btn-row wrap"); PRESETS.forEach(([n, k, t, ic]) => pre.append(btn("+ " + n, () => { S("dock.shortcuts", [...cfg.dock.shortcuts, { id: "s" + Date.now(), name: n, kind: k, target: t, icon: ic }]); if (cfg.dock.mode === "hidden") S("dock.mode", "always"); render("dock"); }, "pill small")));
      main.append(el("div", "group-label", "Quick add"), pre, el("p", "group-note", "Folders and app links open through your system. Browsers ask first; Wallpaper Engine may block links that leave the wallpaper."));
    },
    clock() {
      const styles = [["digital", "Digital"], ["analog", "Analog"], ["minimal", "Minimal"], ["stacked", "Stacked"]];
      main.append(group("Format", [sw("24-hour time", "clock.h24"), sw("Show seconds", "clock.seconds")]));
      main.append(group("Clock card", [sw("Show card", "widgets.clock"), seg("Style", "clock.style", styles), sw("Show date", "clock.date")]));
      main.append(group("Desktop clock", [sw("Show on wallpaper", "hero.show"), seg("Style", "hero.style", styles), rng("Size", "hero.size", 0.4, 2, 0.05, "×"), seg("Weight", "hero.weight", [["300", "Light"], ["500", "Medium"], ["700", "Bold"], ["800", "Heavy"]]), sw("Show date", "hero.date"),
        row("Position", "Drag the desktop clock to move it", btn("Centre it", () => { const p = { ...cfg.positions }; delete p.hero; update({ positions: p }); }, "pill small"))]));
      main.append(group("World Clock cities", ZONES.map(([tz, nm]) => row(nm, null, toggle({ checked: cfg.cities.includes(tz), label: nm, onChange: v => update({ cities: v ? [...cfg.cities, tz] : cfg.cities.filter(x => x !== tz) }, SRC) })))));
    },
    music() {
      main.append(group("Playback", [
        seg("Repeat", "music.repeat", [["off", "Off"], ["all", "All"], ["one", "One"]]), sw("Shuffle", "music.shuffle"),
        sw("Play next automatically", "music.continuous", "Off stops after each track"),
        seg("Source", "music.source", [["auto", "Auto"], ["system", "System"], ["player", "Player"]], "System follows Spotify and other apps (Wallpaper Engine)"),
        rng("Volume", "music.volume", 0, 1, 0.01, "", v => Math.round(v * 100) + "%"),
      ]));
      const g = el("div", "group");
      g.append(row("Built-in mixtape", "Six synthesised tracks", toggle({ checked: store.get("includeBuiltin", true), label: "Built-in mixtape", onChange: v => { setIncludeBuiltin(v); render("music"); } })));
      playlist().filter(t => t.kind === "file").forEach(t => { const r = row(t.title, t.artist || (t.id.startsWith("we:") ? "From your music folder" : "Added file")); if (!t.id.startsWith("we:")) r.append(btn("Remove", async () => { await removeTrack(t.id); render("music"); }, "pill small")); g.append(r); });
      main.append(el("div", "group-label", "Playlist"), g);
      const br = el("div", "btn-row"); br.append(btn("Add audio files…", () => pickFile("audio/*", true, async l => { await addFiles(l); render("music"); }))); main.append(br);
      main.append(el("p", "group-note", inWallpaperEngine() ? "In Wallpaper Engine, pick a Music folder in the properties panel; its tracks join this playlist." : "You can also drop audio files onto the Music card. Files stay in this browser’s storage."));
    },
    viz() {
      main.append(group("Show it", [sw("In the Music card", "viz.card"), sw("Beside the island", "viz.island", "Bars on both sides of the Dynamic Island"), sw("Along the screen bottom", "viz.edge", "Drawn on the wallpaper, so the glass refracts it"), sw("As its own card", "widgets.visualizer", "Drag it anywhere")]));
      main.append(group("Look", [seg("Style", "viz.style", [["bars", "Bars"], ["mirror", "Mirror"], ["wave", "Wave"], ["dots", "Dots"], ["ring", "Ring"]]),
        seg("Colour", "viz.color", [["ink", "Text"], ["white", "White"], ["accent", "Accent"], ["rainbow", "Rainbow"]]),
        rng("Sensitivity", "viz.sensitivity", 0.3, 2.5, 0.05, "×"), rng("Bars", "viz.bars", 12, 64, 1), rng("Bottom height", "viz.edgeHeight", 30, 260, 5, "px")]));
    },
    weather() {
      const form = el("form", "row");
      form.innerHTML = `<label class="label" for="cityIn">City</label><input class="field" id="cityIn" autocomplete="off" style="max-width:220px"><button class="pill" type="submit">Update</button>`;
      form.querySelector("input").value = cfg.city;
      form.onsubmit = e => { e.preventDefault(); const v = form.querySelector("input").value.trim(); if (v) update({ city: v }); };
      main.append(group("Location", [form, seg("Units", "unit", [["c", "°C"], ["f", "°F"]])], inWallpaperEngine() ? "Wallpaper Engine doesn’t pass typing to wallpapers; set the city in its properties panel." : "Weather comes from Open-Meteo."));
    },
    data() {
      main.append(el("p", "group-note", "Everything saves automatically: layout, settings, reminders, notes, playlist files and wallpaper files. It stays after closing the browser or Wallpaper Engine and after a restart, as long as that app’s storage isn’t cleared. Keep a backup to be safe."));
      const ta = el("textarea", "notes backup"); ta.setAttribute("aria-label", "Backup"); ta.placeholder = "Backup text appears here, or paste one to restore.";
      main.append(group("Backup", [row("Create backup", "Settings, layout, reminders and notes as text", btn("Create", () => { ta.value = exportAll(); ta.select(); try { navigator.clipboard.writeText(ta.value); } catch {} })),
        row("Restore", "Paste a backup above first", btn("Restore", () => { try { importAll(ta.value); } catch { ta.value = "That doesn’t look like a backup. Paste the whole text."; } }))]));
      main.append(ta);
      main.append(group("Start over", [row("Reset everything", "Settings and layout go back to defaults", btn("Reset", () => { if (confirm("Reset all settings and layout?")) resetAll(); }))]));
    },
    access() { main.append(group("Display", [sw("Reduce transparency", "reduce", "Solid surfaces instead of glass")], "Animations also calm down when your system asks for reduced motion.")); },
  };
  function colorIn(path) { const i = el("input"); i.type = "color"; i.value = get(path); i.oninput = () => S(path, i.value); i.className = "color-in"; return i; }

  function render(sec, keepScroll) {
    current_ = sec || current_;
    $$(".set-nav", side).forEach(n => n.setAttribute("aria-selected", String(n.dataset.sec === current_)));
    const scroll = main.scrollTop; main.textContent = "";
    main.append(el("h3", null, SECTIONS.find(s => s[0] === current_)[1]));
    views[current_]();
    if (keepScroll) main.scrollTop = scroll;
  }
  function open(sec, from, card) { if (card) cardSel = card; trigger = from || trigger; render(sec || current_); if (win.hidden) liquidOpen(win, trigger); }
  const close = () => liquidClose(win, trigger);
  $("#setClose").onclick = close;
  let rt; bus.on("settings", ({ source }) => { if (win.hidden || source === "settings") return; clearTimeout(rt); rt = setTimeout(() => render(current_, true), 250); });
  return { open, close, get isOpen() { return !win.hidden; } };
}
