/* Settings. Controls write straight to settings and update in place; the
 * window only re-renders for changes made elsewhere (no flicker).
 * Everything is clickable glass (no native dropdowns, colour or confirm
 * dialogs), because Wallpaper Engine passes clicks but not system pop-ups. */
import { $, $$, el } from "../core/util.js";
import { cfg, set, unset, update, WIDGETS, DEFAULTS, exportAll, importAll, resetAll } from "../core/settings.js";
import { bus } from "../core/bus.js";
import { toggle } from "../components/switch.js";
import { segmented } from "../components/segmented.js";
import { slider } from "../components/slider.js";
import { THEMES } from "../wallpaper/themes.js";
import { drawWaves } from "../wallpaper/wallpaper.js";
import { setMainFile, addSlides, clearSlides, wpMedia } from "../wallpaper/media.js";
import { ZONES } from "../widgets/world-clock.js";
import { clockFace, cardClockOpts, heroClockOpts, CLOCK_STYLES, CLOCK_FONTS, CLOCK_WEIGHTS, CLOCK_NUMERALS } from "../widgets/clock.js";
import { DATE_FORMATS, longDate } from "../core/time.js";
import { liquidOpen, liquidClose } from "../glass/motion.js";
import { inWallpaperEngine } from "../platform/wallpaper-engine.js";
import { refractionSupported } from "../glass/glass.js";
import { list as playlist, addFiles, removeTrack, setIncludeBuiltin } from "../audio/player.js";
import { store } from "../core/store.js";
import { GLYPHS, ACTIONS, PRESETS } from "./dock.js";
import { widgetEl } from "./layout.js";

const SECTIONS = [
  ["widgets", "Widgets", "#0a84ff"], ["glass", "Glass", "#5e5ce6"], ["cards", "Cards", "#bf5af2"], ["wallpaper", "Wallpaper", "#ff9f0a"],
  ["island", "Top Bar", "#30b0c7"], ["dock", "Shortcuts", "#34c759"], ["clock", "Clock", "#636366"], ["music", "Music", "#fa233b"],
  ["viz", "Visualizer", "#ff375f"], ["weather", "Weather", "#32ade6"], ["data", "Data & Backup", "#8e8e93"], ["access", "Accessibility", "#0a84ff"],
];
const SRC = { source: "settings" };
const S = (path, v) => set(path, v, SRC);
const U = path => unset(path, SRC);
const get = path => path.split(".").reduce((o, k) => o == null ? o : o[k], cfg);
const pct = v => Math.round(v * 100) + "%";
/* cards that have a title line ("Reminders", "Notes"…) */
const TITLED = ["world", "reminders", "notes", "focus", "system"];
const COLORS = ["#ffffff", "#1d1d1f", "#ffd60a", "#ff9f0a", "#ff375f", "#bf5af2", "#5e5ce6", "#0a84ff", "#64d2ff", "#30d158"];
const GRADIENTS = [["#1f2a6b", "#e0707a"], ["#0f2027", "#2c5364"], ["#ff9a8b", "#ff6a88"], ["#355c7d", "#c06c84"], ["#11998e", "#38ef7d"], ["#232526", "#414345"], ["#fc5c7d", "#6a82fb"], ["#f7971e", "#ffd200"]];

export function initSettings({ resetLayout }) {
  const win = $("#settings"), side = $("#setSide"), main = $("#setMain");
  let current_ = "widgets", trigger = null, cardSel = "music", clockTarget = "hero", cleanup = [];
  SECTIONS.forEach(([id, name, color]) => {
    const b = el("button", "set-nav"); b.setAttribute("role", "tab"); b.dataset.sec = id;
    b.append(Object.assign(el("span", "dot"), { style: `background:${color}` }), name); b.onclick = () => render(id); side.append(b);
  });
  /* control builders */
  const group = (label, rows, note) => { const f = document.createDocumentFragment(); if (label) f.append(el("div", "group-label", label)); const g = el("div", "group"); rows.filter(Boolean).forEach(r => g.append(r)); f.append(g); if (note) f.append(el("p", "group-note", note)); return f; };
  const row = (label, sub, control) => { const r = el("div", "row"), l = el("span", "label", label); if (sub) l.append(el("span", "sub", sub)); r.append(l); if (control) r.append(control); return r; };
  /* a row whose control sits on its own line below the label (chip lists, swatches) */
  const stack = (label, sub, control) => { const r = row(label, sub); r.classList.add("stack"); r.append(control); return r; };
  const sw = (label, path, sub, fn) => row(label, sub, toggle({ checked: !!get(path), label, onChange: v => { S(path, v); fn && fn(v); } }));
  const seg = (label, path, options, sub, fn) => row(label, sub, segmented({ label, options, value: String(get(path)), onChange: v => { S(path, isNaN(+v) || v === "" ? v : +v); fn && fn(v); } }));
  const rng = (label, path, min, max, step = 1, unit = "", fmt) => {
    const wrap = el("div", "row-slider"), out = el("span", "row-val num");
    const show = v => out.textContent = fmt ? fmt(v) : `${+v.toFixed(2)}${unit}`;
    const toV = t => +(Math.round((min + t * (max - min)) / step) * step).toFixed(4);
    slider(wrap, { label, value: (get(path) - min) / (max - min), step: step / (max - min), format: t => fmt ? fmt(toV(t)) : toV(t) + unit, onInput: t => { const v = toV(t); show(v); S(path, v); } });
    show(get(path)); const r = row(label, null, wrap); r.append(out); return r;
  };
  /** single-select pills that wrap; options [[value, label, extraClass]] */
  const chips = (label, value, options, onChange) => {
    const box = el("div", "chips"); box.setAttribute("role", "radiogroup"); box.setAttribute("aria-label", label);
    options.forEach(([v, text, cls]) => {
      const b = el("button", "chip" + (cls ? " " + cls : ""), text); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(String(v) === String(value)));
      b.onclick = () => { box.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-checked", String(x === b))); onChange(v); };
      box.append(b);
    });
    return box;
  };
  const chipRow = (label, path, options, sub, fn) => stack(label, sub, chips(label, get(path), options, v => { S(path, v); fn && fn(v); }));
  /** colour swatches; "auto" first when allowed; a custom picker only outside Wallpaper Engine */
  const swatches = (label, path, { auto = false, colors = COLORS } = {}) => {
    const box = el("div", "swatches"); box.setAttribute("role", "radiogroup"); box.setAttribute("aria-label", label);
    const cur = String(get(path)).toLowerCase(), all = [...(auto ? ["auto"] : []), ...colors];
    const mark = b => box.querySelectorAll(".swatch").forEach(x => x.setAttribute("aria-checked", String(x === b)));
    all.forEach(c => {
      const b = el("button", "swatch" + (c === "auto" ? " auto" : "")); b.type = "button"; b.setAttribute("role", "radio");
      b.setAttribute("aria-label", c === "auto" ? "Automatic" : c); b.title = c === "auto" ? "Follows the wallpaper" : c;
      if (c !== "auto") b.style.background = c; else b.textContent = "A";
      b.setAttribute("aria-checked", String(cur === c));
      b.onclick = () => { mark(b); S(path, c); }; box.append(b);
    });
    if (!inWallpaperEngine()) {
      const i = el("input", "swatch custom"); i.type = "color"; i.title = "Custom colour"; i.setAttribute("aria-label", "Custom colour");
      i.value = /^#[0-9a-f]{6}$/i.test(cur) ? cur : "#ffffff";
      if (!all.includes(cur)) i.setAttribute("aria-checked", "true");
      i.oninput = () => { mark(null); i.setAttribute("aria-checked", "true"); S(path, i.value); }; box.append(i);
    }
    return box;
  };
  /** a button that asks for a second click instead of a confirm() dialog */
  const confirmBtn = (text, ask, fn) => { const b = btn(text, () => { if (b.dataset.armed) return fn(); b.dataset.armed = "1"; b.textContent = ask; b.classList.add("danger"); setTimeout(() => { delete b.dataset.armed; b.textContent = text; b.classList.remove("danger"); }, 4000); }); return b; };
  const pickFile = (accept, multiple, cb) => { const i = el("input"); i.type = "file"; i.accept = accept; i.multiple = multiple; i.onchange = () => i.files.length && cb([...i.files]); i.click(); };
  const btn = (text, fn, cls = "pill") => { const b = el("button", cls, text); b.type = "button"; b.onclick = fn; return b; };
  const WE = inWallpaperEngine;

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
        rng("Light", "glass.bright", 0.6, 1.4, 0.02), rng("Tint", "glass.tint", 0, 0.6, 0.01, "", pct),
        rng("Refraction", "glass.refraction", 0, 2, 0.05, "", pct), rng("Shadow", "glass.shadow", 0, 0.6, 0.02, "", pct),
      ]));
      main.append(group("Shape & edge", [
        rng("Roundness", "glass.radius", 8, 44, 1, "px"), rng("Border", "glass.rim", 0, 1, 0.05, "", pct), rng("Shine", "glass.shine", 0, 1, 0.05, "", pct),
        seg("Light follows pointer", "glass.react", [["off", "Off"], ["near", "Nearby"], ["all", "All"]]),
        rng("Reach", "glass.reactRadius", 60, 600, 10, "px"),
      ]));
      const br = el("div", "btn-row"); br.append(btn("Restore glass defaults", () => { update({ glass: DEFAULTS.glass, style: "clear" }); render("glass"); }), btn("Customize a card", () => render("cards"))); main.append(br);
    },
    cards() {
      const id = WIDGETS.some(w => w[0] === cardSel) ? cardSel : "music";
      main.append(group(null, [stack("Card", "Changes apply to this card only", chips("Card", id, WIDGETS.map(([w, name]) => [w, name, cfg.widgets[w] ? "" : "off"]), v => { cardSel = v; render("cards", true); })),
        sw("Show on desktop", `widgets.${id}`)]));
      const base = `cards.${id}`, c = cfg.cards[id] || {};
      const dflt = { width: () => (widgetEl(id) && widgetEl(id).offsetWidth) || 300, zoom: () => 1, pad: () => 16 };
      const resetBtn = key => btn("Reset", () => { U(`${base}.${key}`); render("cards", true); }, "pill small");
      /* a slider once overridden; until then a note and an Adjust button */
      const ov = (label, key, min, max, step, unit, fmt, follows = "Follows Glass settings") => {
        if (c[key] == null) return row(label, follows, btn("Adjust", () => { const v = dflt[key] ? dflt[key]() : cfg.glass[key] ?? 1; S(`${base}.${key}`, Math.min(max, Math.max(min, v))); render("cards", true); }, "pill small"));
        const r = rng(label, `${base}.${key}`, min, max, step, unit, fmt); r.append(resetBtn(key)); return r;
      };
      /* choices where the first option means "not overridden" */
      const ovSeg = (label, key, options, sub) => row(label, sub, segmented({ label, options, value: String(c[key] ?? options[0][0]), onChange: v => v === options[0][0] ? U(`${base}.${key}`) : S(`${base}.${key}`, v) }));
      main.append(group("Size", [
        ov("Width", "width", 220, 560, 4, "px", null, "Automatic"), ov("Content size", "zoom", 0.7, 1.5, 0.05, "×", null, "Normal"), ov("Padding", "pad", 6, 32, 1, "px", null, "Normal"),
      ]));
      main.append(group("Glass", [
        ovSeg("Style", "style", [["auto", "Follow"], ["clear", "Clear"], ["tinted", "Tinted"]]),
        ovSeg("Quality", "quality", [["auto", "Follow"], ["high", "High"], ["balanced", "Balanced"], ["fast", "Fast"]]),
        ov("Blur", "blur", 0, 40, 1, "px"), ov("Saturation", "sat", 50, 250, 5, "%"), ov("Light", "bright", 0.6, 1.4, 0.02),
        ov("Tint", "tint", 0, 0.7, 0.01, "", pct), ov("Roundness", "radius", 8, 44, 1, "px"), ov("Border", "rim", 0, 1, 0.05, "", pct),
        ov("Shine", "shine", 0, 1, 0.05, "", pct), ov("Refraction", "refraction", 0, 2, 0.05, "", pct), ov("Shadow", "shadow", 0, 0.6, 0.02, "", pct),
      ]));
      main.append(group("Text", [
        ovSeg("Text colour", "ink", [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]], "Auto follows the wallpaper"),
        TITLED.includes(id) && ovSeg("Title", "title", [["show", "Show"], ["hide", "Hide"]]),
      ]));
      const br = el("div", "btn-row wrap");
      br.append(btn("Reset this card", () => { U(base); render("cards", true); }),
        btn("Apply to all cards", () => { const { width, ...look } = cfg.cards[id] || {}; S("cards", Object.fromEntries(WIDGETS.map(([w]) => { const own = (cfg.cards[w] || {}).width; return [w, { ...look, ...(own != null ? { width: own } : {}) }]; }))); render("cards", true); }),
        confirmBtn("Reset all cards", "Click again to reset all", () => { S("cards", {}); render("cards", true); }));
      main.append(br, el("p", "group-note", "Apply to all copies this card’s look (not its width) to every card. Right-click a card on the desktop to jump here."));
    },
    wallpaper() {
      main.append(group("Type", [seg("Wallpaper", "wallpaper.kind", [["theme", "Animated"], ["image", "Image"], ["gif", "GIF"], ["video", "Video"], ["color", "Gradient"], ["slideshow", "Slideshow"]], null, () => render("wallpaper", true))]));
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
        const name = k === "video" ? "Video" : k === "gif" ? "GIF" : "Image";
        main.append(group("File", [WE() ? row(name, "Choose it in Wallpaper Engine’s properties panel") : row(name, wpMedia.main ? "A file is set" : "No file yet",
          btn("Choose…", () => pickFile(k === "video" ? "video/*" : "image/*", false, async ([f]) => { const kind = await setMainFile(f); S("wallpaper.kind", kind); render("wallpaper"); }))),
          seg("Fit", "wallpaper.fit", [["cover", "Fill"], ["contain", "Fit"]])]));
      }
      if (k === "color") {
        const pre = el("div", "chips");
        GRADIENTS.forEach(([a, b]) => { const p = btn("", () => { update({ wallpaper: { colorA: a, colorB: b } }, SRC); render("wallpaper", true); }, "grad"); p.style.background = `linear-gradient(160deg, ${a}, ${b})`; p.setAttribute("aria-label", `Gradient ${a} to ${b}`); pre.append(p); });
        main.append(group("Colours", [stack("Presets", null, pre), stack("From", null, swatches("From", "wallpaper.colorA", { colors: [...new Set([...GRADIENTS.map(g => g[0]), ...COLORS])].slice(0, 12) })), stack("To", null, swatches("To", "wallpaper.colorB", { colors: [...new Set([...GRADIENTS.map(g => g[1]), ...COLORS])].slice(0, 12) }))]));
      }
      if (k === "slideshow") main.append(group("Slideshow", [
        WE() ? row("Images", "Choose a slideshow folder in Wallpaper Engine’s properties panel") : row("Images", `${wpMedia.slides.length} added`, btn("Add images…", () => pickFile("image/*", true, async l => { await addSlides(l); bus.emit("wallpaper:media"); render("wallpaper"); }))),
        !WE() && row("Clear images", null, btn("Clear", async () => { await clearSlides(); render("wallpaper"); })), rng("Change every", "wallpaper.slideEvery", 5, 600, 5, "s"), seg("Fit", "wallpaper.fit", [["cover", "Fill"], ["contain", "Fit"]])]));
      main.append(group("Look", [rng("Dim", "wallpaper.dim", 0, 0.8, 0.02, "", pct)]));
    },
    island() {
      main.append(group("Top bar", [seg("Mode", "island.mode", [["island", "Island"], ["bar", "Full bar"], ["auto", "Auto-hide"], ["hidden", "Hidden"]]),
        sw("Expand on hover", "island.expandOnHover", "Shows now playing and quick actions"), sw("Show time", "island.showTime"), sw("Show seconds", "island.seconds"), sw("Show weather", "island.showWeather")],
        "Auto-hide slides the island in when the pointer touches the top edge. When hidden, right-click the desktop for menus. Time and date format are in Clock."));
    },
    dock() {
      main.append(group("Shortcut bar", [seg("Show", "dock.mode", [["hidden", "Hidden"], ["auto", "Auto-hide"], ["always", "Always"]])]));
      const L = cfg.dock.shortcuts;
      main.append(el("div", "group-label", "Shortcuts"));
      const g = el("div", "group");
      if (!L.length) g.append(row("No shortcuts yet", "Add one below"));
      L.forEach((s, i) => {
        const r = row(s.name, `${s.kind === "action" ? ACTIONS[s.target] : s.target}`);
        const move = d => { const n = [...L]; [n[i + d], n[i]] = [n[i], n[i + d]]; S("dock.shortcuts", n); render("dock", true); };
        const up = btn("↑", () => move(-1), "pill small"); up.disabled = i === 0; up.setAttribute("aria-label", "Move up");
        const dn = btn("↓", () => move(1), "pill small"); dn.disabled = i === L.length - 1; dn.setAttribute("aria-label", "Move down");
        const rm = btn("Remove", () => { S("dock.shortcuts", L.filter(x => x !== s)); render("dock", true); }, "pill small");
        r.append(up, dn, rm); g.append(r);
      });
      main.append(g);
      /* new shortcut: glass pickers instead of <select>, so it works in Wallpaper Engine (built-in actions need no typing) */
      const draft = { kind: "action", action: "settings", icon: "gear" };
      const name = el("input", "field"); name.placeholder = "Name (optional)"; name.setAttribute("aria-label", "Name");
      const tgt = el("input", "field"); tgt.placeholder = "https://… , C:\\Users\\… , ms-settings:display"; tgt.setAttribute("aria-label", "Target");
      const actions = chips("Action", draft.action, Object.entries(ACTIONS), v => { draft.action = v; });
      const tRow = row("Target", null, tgt), aRow = stack("Action", null, actions);
      const showKind = () => { tRow.hidden = draft.kind === "action"; aRow.hidden = draft.kind !== "action"; };
      const icons = el("div", "chips icons"); icons.setAttribute("role", "radiogroup"); icons.setAttribute("aria-label", "Icon");
      [...Object.keys(GLYPHS), "letter"].forEach(k => {
        const b = el("button", "chip icon"); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-label", k); b.title = k; b.setAttribute("aria-checked", String(k === draft.icon));
        b.innerHTML = GLYPHS[k] ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[k]}</svg>` : "<b>A</b>";
        b.onclick = () => { draft.icon = k; icons.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-checked", String(x === b))); }; icons.append(b);
      });
      const add = () => {
        const target = draft.kind === "action" ? draft.action : tgt.value.trim(); if (!target) { tgt.focus(); return; }
        const n = name.value.trim() || (draft.kind === "action" ? ACTIONS[draft.action] : target);
        S("dock.shortcuts", [...cfg.dock.shortcuts, { id: "s" + Date.now(), name: n, kind: draft.kind, target, icon: draft.icon }]); if (cfg.dock.mode === "hidden") S("dock.mode", "always"); render("dock", true);
      };
      main.append(group("Add a shortcut", [
        row("Type", null, segmented({ label: "Type", value: draft.kind, options: [["action", "Action"], ["url", "Web page"], ["folder", "Folder"], ["uri", "App link"]], onChange: v => { draft.kind = v; showKind(); } })),
        aRow, tRow, row("Name", null, name), stack("Icon", null, icons), row("", null, btn("Add shortcut", add)),
      ], WE() ? "Wallpaper Engine doesn’t pass typing to wallpapers, so add built-in actions or use Quick add below." : null));
      showKind();
      const pre = el("div", "btn-row wrap"); PRESETS.forEach(([n, k, t, ic]) => pre.append(btn("+ " + n, () => { S("dock.shortcuts", [...cfg.dock.shortcuts, { id: "s" + Date.now(), name: n, kind: k, target: t, icon: ic }]); if (cfg.dock.mode === "hidden") S("dock.mode", "always"); render("dock", true); }, "pill small")));
      main.append(el("div", "group-label", "Quick add"), pre, el("p", "group-note", "Folders and app links open through your system. Browsers ask first; Wallpaper Engine may block links that leave the wallpaper."));
    },
    clock() {
      const now = new Date();
      main.append(group("Time format", [
        sw("24-hour time", "clock.h24", null, () => render("clock", true)),
        sw("Leading zero", "clock.leadingZero", "09:05 instead of 9:05"),
        !cfg.clock.h24 && sw("Show AM/PM", "clock.ampm"),
        sw("Blinking colon", "clock.blink"),
        chipRow("Date", "clock.dateFormat", DATE_FORMATS.map(f => [f, longDate(now, f)])),
      ], "Shared by the desktop clock, the Clock card, the top bar and World Clock."));

      /* which clock to edit, with a live preview */
      const pick = segmented({ label: "Clock", value: clockTarget, options: [["hero", "Desktop clock"], ["card", "Clock card"], ["island", "Top bar"]], onChange: v => { clockTarget = v; render("clock", true); } });
      const pickRow = el("div", "btn-row"); pickRow.append(pick); main.append(pickRow);
      if (clockTarget !== "island") {
        const prev = el("div", "clock-preview" + (clockTarget === "hero" ? " hero-prev" : "")), face = el("div"); prev.append(face);
        const opts = clockTarget === "hero" ? () => ({ ...heroClockOpts(), size: Math.round(150 * Math.min(1.3, cfg.hero.size)) }) : cardClockOpts;
        const look = () => {
          if (clockTarget === "hero") { prev.style.setProperty("--cf-scale", Math.min(1.3, cfg.hero.size)); prev.style.color = cfg.hero.color !== "auto" ? cfg.hero.color : ""; face.style.opacity = cfg.hero.opacity; prev.style.textAlign = cfg.hero.align; }
          else prev.style.setProperty("--cf-scale", cfg.clock.size);
        };
        const f = clockFace(face, opts), tick = () => { look(); f.tick(new Date()); }; tick();
        const iv = setInterval(tick, 1000), off = bus.on("settings", tick);
        cleanup.push(() => { clearInterval(iv); off(); });
        main.append(prev);
      }
      const styleRows = (p, extra) => [
        chipRow("Style", `${p}.style`, CLOCK_STYLES, null, () => render("clock", true)),
        chipRow("Font", `${p}.font`, CLOCK_FONTS.map(([v, n]) => [v, n, "font-" + v])),
        seg("Weight", `${p}.weight`, CLOCK_WEIGHTS, "Auto uses each style’s own weight"),
        ...extra,
        sw("Show seconds", `${p}.seconds`), sw("Show date", `${p}.date`),
        get(`${p}.style`) === "analog" && seg("Numerals", `${p}.numerals`, CLOCK_NUMERALS),
      ];
      if (clockTarget === "hero") {
        main.append(group("Desktop clock", [sw("Show on wallpaper", "hero.show"), ...styleRows("hero", [rng("Size", "hero.size", 0.4, 2.5, 0.05, "×")])], "Very large sizes shrink to fit the screen."));
        main.append(group("Look", [
          stack("Colour", "Automatic follows the wallpaper theme", swatches("Colour", "hero.color", { auto: true })),
          rng("Opacity", "hero.opacity", 0.2, 1, 0.05, "", pct), rng("Shadow", "hero.shadow", 0, 1, 0.05, "", pct),
          sw("Glass plate", "hero.plate", "Puts the clock on a pane of glass"),
          seg("Align", "hero.align", [["left", "Left"], ["center", "Centre"], ["right", "Right"]]),
          row("Position", "Drag the desktop clock to move it", btn("Centre it", () => U("positions.hero"), "pill small")),
        ]));
      } else if (clockTarget === "card") {
        main.append(group("Clock card", [sw("Show card", "widgets.clock"), ...styleRows("clock", [rng("Size", "clock.size", 0.6, 1.6, 0.05, "×")])],
          cfg.widgets.clock ? "Glass, width and text colour are in Cards." : "The card is hidden; turn on Show card to see it on the desktop."));
      } else {
        main.append(group("Top bar clock", [sw("Show time", "island.showTime"), sw("Show seconds", "island.seconds")], "The expanded island shows the date in the format above."));
      }
      main.append(group("Calendar", [seg("Week starts on", "calendar.weekStart", [["0", "Sunday"], ["1", "Monday"], ["6", "Saturday"]])]));
      const cities = el("div", "chips");
      ZONES.forEach(([tz, nm]) => {
        const b = el("button", "chip", nm); b.type = "button"; b.setAttribute("aria-pressed", String(cfg.cities.includes(tz)));
        b.onclick = () => { const on = !cfg.cities.includes(tz); b.setAttribute("aria-pressed", String(on)); S("cities", on ? [...cfg.cities, tz] : cfg.cities.filter(x => x !== tz)); };
        cities.append(b);
      });
      main.append(group("World Clock cities", [stack("Cities", "Shown in the order you pick them", cities)]));
    },
    music() {
      main.append(group("Playback", [
        seg("Repeat", "music.repeat", [["off", "Off"], ["all", "All"], ["one", "One"]]), sw("Shuffle", "music.shuffle"),
        sw("Play next automatically", "music.continuous", "Off stops after each track"),
        seg("Source", "music.source", [["auto", "Auto"], ["system", "System"], ["player", "Player"]], "System follows Spotify and other apps (Wallpaper Engine)"),
        rng("Volume", "music.volume", 0, 1, 0.01, "", pct),
      ]));
      const g = el("div", "group");
      g.append(row("Built-in mixtape", "Six synthesised tracks", toggle({ checked: store.get("includeBuiltin", true), label: "Built-in mixtape", onChange: v => { setIncludeBuiltin(v); render("music", true); } })));
      playlist().filter(t => t.kind === "file").forEach(t => { const r = row(t.title, t.artist || (t.id.startsWith("we:") ? "From your music folder" : "Added file")); if (!t.id.startsWith("we:")) r.append(btn("Remove", async () => { await removeTrack(t.id); render("music", true); }, "pill small")); g.append(r); });
      main.append(el("div", "group-label", "Playlist"), g);
      if (!WE()) { const br = el("div", "btn-row"); br.append(btn("Add audio files…", () => pickFile("audio/*", true, async l => { await addFiles(l); render("music", true); }))); main.append(br); }
      main.append(el("p", "group-note", WE() ? "In Wallpaper Engine, pick a Music folder in the properties panel; its tracks join this playlist." : "You can also drop audio files onto the Music card. Files stay in this browser’s storage."));
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
      main.append(group("Location", [form, seg("Units", "unit", [["c", "°C"], ["f", "°F"]])], WE() ? "Wallpaper Engine doesn’t pass typing to wallpapers; set the city in its properties panel." : "Weather comes from Open-Meteo."));
    },
    data() {
      main.append(el("p", "group-note", "Everything saves automatically: layout, settings, reminders, notes, playlist files and wallpaper files. It stays after closing the browser or Wallpaper Engine and after a restart, as long as that app’s storage isn’t cleared. Keep a backup to be safe."));
      const ta = el("textarea", "notes backup"); ta.setAttribute("aria-label", "Backup"); ta.placeholder = "Backup text appears here, or paste one to restore.";
      main.append(group("Backup", [row("Create backup", "Settings, layout, reminders and notes as text", btn("Create", () => { ta.value = exportAll(); ta.select(); try { navigator.clipboard.writeText(ta.value).catch(() => {}); } catch {} })),
        row("Restore", "Paste a backup above first", btn("Restore", () => { try { importAll(ta.value); } catch { ta.value = "That doesn’t look like a backup. Paste the whole text."; } }))]));
      main.append(ta);
      main.append(group("Start over", [row("Reset everything", "Settings and layout go back to defaults", confirmBtn("Reset", "Click again to reset", resetAll))]));
    },
    access() { main.append(group("Display", [sw("Reduce transparency", "reduce", "Solid surfaces instead of glass")], "Animations also calm down when your system asks for reduced motion.")); },
  };

  function render(sec, keepScroll) {
    current_ = sec || current_;
    cleanup.forEach(f => f()); cleanup = [];
    $$(".set-nav", side).forEach(n => n.setAttribute("aria-selected", String(n.dataset.sec === current_)));
    const scroll = main.scrollTop; main.textContent = "";
    main.append(el("h3", null, SECTIONS.find(s => s[0] === current_)[1]));
    views[current_]();
    main.scrollTop = keepScroll ? scroll : 0;
  }
  function open(sec, from, card) { if (card) cardSel = card; trigger = from || trigger; render(sec || current_); if (win.hidden) liquidOpen(win, trigger); }
  const close = () => { cleanup.forEach(f => f()); cleanup = []; return liquidClose(win, trigger); };
  $("#setClose").onclick = close;
  let rt; bus.on("settings", ({ source }) => { if (win.hidden || source === "settings") return; clearTimeout(rt); rt = setTimeout(() => render(current_, true), 250); });
  return { open, close, get isOpen() { return !win.hidden; } };
}
