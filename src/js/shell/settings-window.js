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
import { drawTheme } from "../wallpaper/wallpaper.js";
import { mediaItems, addMedia, removeMedia } from "../wallpaper/media.js";
import { gradient } from "../wallpaper/wallpaper.js";
import { searchCities, locateByIP } from "../widgets/weather.js";
import { LOOKS, SKINS, UI_FONTS, applyLook } from "../core/looks.js";
import { LAYOUTS, placeHeroAt } from "./layout.js";
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
import { keyboardOn } from "../components/keyboard.js";

const SECTIONS = [
  ["themes", "Themes", "#ff2d55"], ["widgets", "Widgets", "#0a84ff"], ["glass", "Glass", "#5e5ce6"], ["cards", "Cards", "#bf5af2"], ["wallpaper", "Wallpaper", "#ff9f0a"],
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
const GRADIENTS = [["#1f2a6b", "#e0707a"], ["#0f2027", "#2c5364"], ["#ff9a8b", "#ff6a88"], ["#355c7d", "#c06c84"], ["#11998e", "#38ef7d"], ["#232526", "#414345"], ["#fc5c7d", "#6a82fb"], ["#f7971e", "#ffd200"],
  ["#8e2de2", "#4a00e0"], ["#00c6ff", "#0072ff"], ["#f953c6", "#b91d73"], ["#a8e063", "#56ab2f"], ["#ffecd2", "#fcb69f"], ["#e0eafc", "#cfdef3"], ["#141e30", "#243b55"], ["#ee0979", "#ff6a00"]];
const ACCENTS = ["#0a84ff", "#5e5ce6", "#bf5af2", "#ff2d55", "#ff375f", "#ff9f0a", "#ffd60a", "#30d158", "#64d2ff", "#ff2bd6", "#c6ff00", "#111111"];
const CITIES = ["London", "New York", "Los Angeles", "Toronto", "São Paulo", "Paris", "Berlin", "Madrid", "Istanbul", "Dubai", "Karachi", "Lahore", "Islamabad", "Delhi", "Mumbai", "Singapore", "Tokyo", "Seoul", "Sydney", "Cairo", "Lagos", "Riyadh"];
/* what "Reset" at the end of each tab puts back */
const RESETS = { themes: ["look", "skin", "layoutMode", "accent", "uiFont"], widgets: ["widgets", "lockLayout", "positions"], glass: ["glass", "style"], cards: ["cards"], wallpaper: ["wallpaper"],
  island: ["island"], dock: ["dock"], clock: ["clock", "hero", "calendar", "cities"], music: ["music"], viz: ["viz"], weather: ["city", "unit", "geo"], access: ["reduce", "keyboard"] };

export function initSettings({ resetLayout }) {
  const win = $("#settings"), side = $("#setSide"), main = $("#setMain");
  let current_ = "themes", trigger = null, cardSel = "music", clockTarget = "hero", cleanup = [], cityResults = null, cityStatus = "";
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
  /** 3×3 grid of spots for the desktop clock, plus Auto (the layout's default) */
  const heroSpots = () => {
    const g = el("div", "spots"); g.setAttribute("aria-label", "Clock position");
    const cur = cfg.positions.hero;
    ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"].forEach(k => { const b = btn("", () => { placeHeroAt(k); g.querySelectorAll(".spot").forEach(x => x.setAttribute("aria-pressed", String(x === b))); }, "spot"); b.setAttribute("aria-label", { t: "Top", m: "Middle", b: "Bottom" }[k[0]] + " " + { l: "left", c: "centre", r: "right" }[k[1]]); b.setAttribute("aria-pressed", "false"); g.append(b); });
    const auto = btn("Auto", () => { placeHeroAt("auto"); g.querySelectorAll(".spot").forEach(x => x.setAttribute("aria-pressed", String(x === auto))); }, "spot auto"); auto.setAttribute("aria-pressed", String(!cur)); g.append(auto);
    return g;
  };

  const views = {
    widgets() {
      main.append(group("On the desktop", WIDGETS.map(([id, name, sub]) => sw(name, `widgets.${id}`, sub))));
      main.append(group("Arrange", [chipRow("Layout", "layoutMode", LAYOUTS, "Where cards go until you drag them"), sw("Lock layout", "lockLayout", "Stops cards and the clock from being dragged by accident")],
        "Drag any card to move it. It snaps to screen edges and to other cards, and stays where you leave it. Tidy up puts every card back into the layout."));
      const br = el("div", "btn-row"); br.append(btn("Tidy up", resetLayout), btn("Customize a card", () => render("cards"))); main.append(br);
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
          const c = el("canvas"); c.width = 160; c.height = 100; drawTheme(c.getContext("2d"), 160, 100, t, 3);
          b.append(c, th.name); b.onclick = () => { S("wallpaper.theme", t); walls.querySelectorAll(".wall-opt").forEach(x => x.setAttribute("aria-pressed", String(x === b))); }; walls.append(b);
        });
        main.append(el("div", "group-label", "Theme"), walls);
        main.append(group("Motion", [sw("Animate", "wallpaper.motion"), rng("Speed", "wallpaper.speed", 0.2, 3, 0.1, "×"), seg("Frame rate", "wallpaper.fps", [["30", "30"], ["60", "60"], ["120", "120"]]), sw("React to sound", "wallpaper.audioReactive", "Moves with the music")]));
      }
      if (k === "image" || k === "gif" || k === "video" || k === "slideshow") {
        const type = k === "slideshow" ? "slides" : k, items = mediaItems(type), noun = { image: "images", gif: "GIFs", video: "videos", slides: "images" }[type];
        const grid = el("div", "group media-grid");
        const chosen = cfg.wallpaper.media, active = items.find(i => i.id === chosen) || items[0];
        items.forEach(it => {
          const t = el("div", "media-tile"); t.setAttribute("role", k === "slideshow" ? "listitem" : "radio");
          if (k !== "slideshow") { t.setAttribute("aria-checked", String(it === active)); t.tabIndex = 0; t.onclick = () => { update({ wallpaper: { media: it.id } }, SRC); render("wallpaper", true); }; }
          const th = it.type === "video" ? Object.assign(el("video"), { muted: true, preload: "metadata", src: it.url + "#t=1" }) : Object.assign(el("img"), { src: it.url, alt: "", loading: "lazy" });
          t.append(th, el("span", "media-badge", it.type === "gif" ? "GIF" : it.type === "video" ? "Video" : it.source === "we" ? "Folder" : ""));
          t.title = it.name;
          if (it.source === "local") { const x = btn("✕", async e => { e.stopPropagation(); await removeMedia(it.id); render("wallpaper", true); }, "media-del"); x.setAttribute("aria-label", "Remove " + it.name); t.append(x); }
          grid.append(t);
        });
        if (!WE()) {
          const add = btn("", () => pickFile(k === "video" ? "video/*" : k === "gif" ? "image/gif" : "image/*", true, async l => { const added = await addMedia(l); const first = added.find(a => type === "slides" ? a.type !== "video" : a.type === type); if (first && k !== "slideshow") update({ wallpaper: { media: first.id } }, SRC); render("wallpaper", true); }), "media-tile add");
          add.innerHTML = `<span>＋</span><small>Add ${noun}</small>`; grid.append(add);
        }
        if (!items.length && WE()) grid.append(el("p", "group-note", `No ${noun} yet.`));
        main.append(el("div", "group-label", k === "slideshow" ? `Slideshow (${items.length} images)` : "Choose"), grid);
        main.append(el("p", "group-note", WE() ? "In Wallpaper Engine’s properties panel, choose a Wallpapers folder once. Every image, GIF and video in it shows up here." : "Files you add stay in this browser. You can also drop files anywhere on the desktop."));
        main.append(group("Options", [k === "slideshow" && rng("Change every", "wallpaper.slideEvery", 5, 600, 5, "s"), seg("Fit", "wallpaper.fit", [["cover", "Fill"], ["contain", "Fit"]])]));
      }
      if (k === "color") {
        const W = cfg.wallpaper, pre = el("div", "group grad-grid");
        GRADIENTS.forEach(([a, b]) => {
          const p = btn("", () => { update({ wallpaper: { colorA: a, colorB: b } }, SRC); render("wallpaper", true); }, "grad-tile");
          p.style.background = gradient({ ...W, colorA: a, colorB: b, gradFlow: false }); p.setAttribute("aria-label", `Gradient ${a} to ${b}`);
          p.setAttribute("aria-pressed", String(W.colorA === a && W.colorB === b)); pre.append(p);
        });
        main.append(el("div", "group-label", "Presets"), pre);
        main.append(group("Style", [seg("Shape", "wallpaper.gradStyle", [["linear", "Linear"], ["radial", "Radial"], ["mesh", "Mesh"], ["conic", "Conic"]], null, () => render("wallpaper", true)),
          W.gradStyle !== "radial" && rng("Angle", "wallpaper.gradAngle", 0, 360, 5, "°"), sw("Slow flow", "wallpaper.gradFlow", "The colours drift gently")]));
        main.append(group("Colours", [stack("From", null, swatches("From", "wallpaper.colorA", { colors: [...new Set([...GRADIENTS.map(g => g[0]), ...COLORS])].slice(0, 14) })), stack("To", null, swatches("To", "wallpaper.colorB", { colors: [...new Set([...GRADIENTS.map(g => g[1]), ...COLORS])].slice(0, 14) }))]));
      }
      main.append(group("Look", [rng("Dim", "wallpaper.dim", 0, 0.8, 0.02, "", pct)]));
    },
    island() {
      main.append(group("Top bar", [seg("Mode", "island.mode", [["island", "Island"], ["bar", "Full bar"], ["auto", "Auto-hide"], ["hidden", "Hidden"]]),
        sw("Expand on hover", "island.expandOnHover", "Shows now playing and quick actions")],
        "Auto-hide slides the island in when the pointer touches the top edge. When hidden, right-click the desktop for menus."));
      main.append(group("Show in the island", [
        sw("Time", "island.showTime"), sw("Seconds", "island.seconds"), sw("Weather", "island.showWeather"), sw("Now playing", "island.showNowPlaying"),
        sw("Network", "island.showNetwork"), sw("Control Center button", "island.showCC"), sw("Menu button (•••)", "island.showMenu", "Right-click the desktop for the same menu"),
        seg("Battery", "island.battery", [["off", "Off"], ["percent", "87%"], ["icon", "Icon"], ["both", "Both"], ["inside", "In icon"]], "Desktop PCs without a battery report 100%"),
      ], "Time and date format are in Clock."));
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
          seg("Text align", "hero.align", [["left", "Left"], ["center", "Centre"], ["right", "Right"]]),
          stack("Position", "Or drag the clock anywhere", heroSpots()),
        ]));
      } else if (clockTarget === "card") {
        main.append(group("Clock card", [sw("Show card", "widgets.clock"), ...styleRows("clock", [rng("Size", "clock.size", 0.6, 1.6, 0.05, "×"), seg("Align", "clock.align", [["left", "Left"], ["center", "Centre"], ["right", "Right"]])])],
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
      const cur = cfg.geo && cfg.geo.name === cfg.city ? cfg.geo.label : cfg.city;
      const form = el("form", "row");
      const inp = el("input", "field"); inp.id = "cityIn"; inp.autocomplete = "off"; inp.placeholder = "Search a city"; inp.setAttribute("aria-label", "City");
      form.append(el("span", "label", "Search"), inp, btn("Search", null)); form.lastChild.type = "submit";
      form.onsubmit = async e => {
        e.preventDefault(); const q = inp.value.trim(); if (!q) return;
        cityStatus = "Searching…"; cityResults = null; render("weather", true);
        try { cityResults = await searchCities(q); cityStatus = cityResults.length ? "" : `No city called “${q}”.`; } catch { cityStatus = "Search needs an internet connection."; }
        render("weather", true);
      };
      const pick = r => { cityResults = null; cityStatus = ""; update({ city: r.name, geo: r }, SRC); render("weather", true); };
      const results = el("div", "chips");
      (cityResults || []).forEach(r => { const b = btn(r.label, () => pick(r), "chip"); results.append(b); });
      const locate = btn("Use my location", async () => { cityStatus = "Finding you…"; render("weather", true); try { pick(await locateByIP()); } catch { cityStatus = "Couldn’t detect a location. Search or pick a city instead."; render("weather", true); } }, "pill small");
      main.append(group("Location", [
        row("Current", cur, locate), form,
        (cityResults && cityResults.length) ? stack("Results", "Pick the right one", results) : null,
        cityStatus ? row(cityStatus) : null,
        stack("Popular", null, chips("Popular cities", cfg.geo ? "" : cfg.city, CITIES.map(c => [c, c]), c => { update({ city: c, geo: null }, SRC); render("weather", true); })),
        seg("Units", "unit", [["c", "°C"], ["f", "°F"]]),
      ], keyboardOn() ? "Click the search box and type with the on-screen keyboard." : "Weather comes from Open-Meteo. “Use my location” looks up your approximate city from your internet connection."));
    },
    data() {
      main.append(el("p", "group-note", "Everything saves automatically: layout, settings, reminders, notes, playlist files and wallpaper files. It stays after closing the browser or Wallpaper Engine and after a restart, as long as that app’s storage isn’t cleared. Keep a backup to be safe."));
      const ta = el("textarea", "notes backup"); ta.setAttribute("aria-label", "Backup"); ta.placeholder = "Backup text appears here, or paste one to restore.";
      main.append(group("Backup", [row("Create backup", "Settings, layout, reminders and notes as text", btn("Create", () => { ta.value = exportAll(); ta.select(); try { navigator.clipboard.writeText(ta.value).catch(() => {}); } catch {} })),
        row("Restore", "Paste a backup above first", btn("Restore", () => { try { importAll(ta.value); } catch { ta.value = "That doesn’t look like a backup. Paste the whole text."; } }))]));
      main.append(ta);
      main.append(group("Start over", [row("Reset everything", "Settings and layout go back to defaults", confirmBtn("Reset", "Click again to reset", resetAll))]));
    },
    access() {
      main.append(group("Display", [sw("Reduce transparency", "reduce", "Solid surfaces instead of glass")], "Animations also calm down when your system asks for reduced motion."));
      main.append(group("Typing", [seg("On-screen keyboard", "keyboard", [["auto", "Auto"], ["on", "Always"], ["off", "Off"]], "Auto shows it in Wallpaper Engine, which doesn’t pass key presses to wallpapers")]));
    },
    themes() {
      const looks = el("div", "looks");
      LOOKS.forEach(L => {
        const b = el("button", "look-tile"); b.type = "button"; b.setAttribute("aria-pressed", String(cfg.look === L.id));
        const pv = el("div", "look-pv"); pv.dataset.skin = L.skin; pv.dataset.layout = L.layoutMode;
        if (L.accent !== "auto") pv.style.setProperty("--accent", L.accent);
        if (L.wallpaper.kind === "theme") { const c = el("canvas"); c.width = 200; c.height = 120; drawTheme(c.getContext("2d"), 200, 120, L.wallpaper.theme, 3); pv.append(c); }
        else pv.style.background = gradient({ ...DEFAULTS.wallpaper, ...L.wallpaper });
        const cards = el("div", "lp-cards"); for (let i = 0; i < 3; i++) cards.append(el("span", "lp-card"));
        pv.append(el("span", "lp-clock", L.hero.style === "words" ? "four" : L.hero.style === "analog" ? "◷" : "9:41"), cards);
        b.append(pv, el("b", null, L.name), el("small", null, L.sub));
        b.onclick = () => { applyLook(L.id); render("themes", true); };
        looks.append(b);
      });
      main.append(el("div", "group-label", "Presets"), looks, el("p", "group-note", "A preset sets the surface style, layout, wallpaper, clock and accent together. Fine-tune anything afterwards."));
      main.append(group("Mix your own", [
        chipRow("Surface style", "skin", SKINS, "Liquid Glass refracts the wallpaper; the others are solid styles"),
        chipRow("Layout", "layoutMode", LAYOUTS, "Where cards go until you drag them"),
        stack("Accent colour", "Calendar today, focus ring, switches, selections", swatches("Accent", "accent", { auto: true, colors: ACCENTS })),
        chipRow("Interface font", "uiFont", UI_FONTS.map(([v, n]) => [v, n, "font-" + v])),
      ]));
    },
  };

  function render(sec, keepScroll) {
    current_ = sec || current_;
    cleanup.forEach(f => f()); cleanup = [];
    $$(".set-nav", side).forEach(n => n.setAttribute("aria-selected", String(n.dataset.sec === current_)));
    const scroll = main.scrollTop; main.textContent = "";
    main.append(el("h3", null, SECTIONS.find(s => s[0] === current_)[1]));
    views[current_]();
    const keys = RESETS[current_];
    if (keys) {
      const name = SECTIONS.find(x => x[0] === current_)[1];
      const br = el("div", "btn-row tab-reset");
      br.append(confirmBtn(`Reset ${name}`, "Click again to reset", () => { keys.forEach(k => S(k, structuredClone(DEFAULTS[k]))); if (current_ === "music") setIncludeBuiltin(true); render(current_, true); }));
      main.append(br);
    }
    main.scrollTop = keepScroll ? scroll : 0;
  }
  function open(sec, from, card) { if (card) cardSel = card; trigger = from || trigger; render(sec || current_); if (win.hidden) liquidOpen(win, trigger); }
  const close = () => { cleanup.forEach(f => f()); cleanup = []; return liquidClose(win, trigger); };
  $("#setClose").onclick = close;
  let rt; bus.on("settings", ({ source }) => { if (win.hidden || source === "settings") return; clearTimeout(rt); rt = setTimeout(() => render(current_, true), 250); });
  return { open, close, get isOpen() { return !win.hidden; } };
}
