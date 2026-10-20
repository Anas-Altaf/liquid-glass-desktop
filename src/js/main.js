/* Glass Desktop entry point. */
import { startWallpaperEngine, inWallpaperEngine } from "./platform/wallpaper-engine.js";
import { $, $$, reducedMotion } from "./core/util.js";
import { cfg, set, unset, update } from "./core/settings.js";
import { bus } from "./core/bus.js";
import { glassify, setOverrides, setGlobal, refresh, repaintLight } from "./glass/glass.js";
import { Wallpaper } from "./wallpaper/wallpaper.js";
import { THEMES } from "./wallpaper/themes.js";
import { loadWallpaperMedia, wpMedia } from "./wallpaper/media.js";
import { showMenu, closeMenus } from "./components/menu.js";
import { mountClock, clockFace, heroClockOpts } from "./widgets/clock.js";
import { mountWeather } from "./widgets/weather.js";
import { mountMusic } from "./widgets/music.js";
import { mountCalendar } from "./widgets/calendar.js";
import { mountWorld } from "./widgets/world-clock.js";
import { mountReminders } from "./widgets/reminders.js";
import { mountNotes } from "./widgets/notes.js";
import { mountFocus } from "./widgets/focus.js";
import { mountSystem } from "./widgets/system.js";
import { player, loadLibrary, setWEFolder } from "./audio/player.js";
import { attach, frame as vizFrame, feedWE, level } from "./audio/visualizer.js";
import { layout, placeHero, setWidgetVisible, enableDragging, resetLayout, ORDER, widgetEl } from "./shell/layout.js";
import { initIsland } from "./shell/island.js";
import { initDock } from "./shell/dock.js";
import { initControlCenter } from "./shell/control-center.js";
import { initSettings } from "./shell/settings-window.js";

const wall = new Wallpaper($("#wall"));
const pane = id => $(`.widget[data-w="${id}"] .pane`);

/* glass surfaces */
glassify($("#island"), "bar");
glassify($("#dock"), "bar");
$$(".widget").forEach(w => glassify(w, "panel"));
glassify($("#cc"), "menu");
glassify($("#settings"), "panel");
glassify($("#hero"), "panel");
$$("#cc .tile").forEach(t => { glassify(t, "control"); setOverrides(t, { blur: 6, sat: 120 }); });

/* widgets */
const W = {
  clock: mountClock(pane("clock")), weather: mountWeather(pane("weather")), music: mountMusic(pane("music"), widgetEl("music")),
  calendar: mountCalendar(pane("calendar")), world: mountWorld(pane("world")), reminders: mountReminders(pane("reminders")),
  notes: mountNotes(pane("notes")), focus: mountFocus(pane("focus")), system: mountSystem(pane("system")),
};
attach($("#vizCard"), {}); attach($("#edgeViz"), { align: "bottom" });
const hero = clockFace($("#heroFace"), heroClockOpts);

/* shell */
const settings = initSettings({ resetLayout });
const cc = initControlCenter();
const openSettings = (sec, from, card) => { if (cc.isOpen) cc.close(); closeMenus(); settings.open(sec, from, card); };
const themeKeys = Object.keys(THEMES).filter(k => k !== "image");
const actions = {
  settings: () => openSettings(), cc: () => cc.toggle(document.querySelector("#dock")), edit: () => openSettings("widgets"),
  "next-wallpaper": () => { set("wallpaper.kind", "theme"); set("wallpaper.theme", themeKeys[(themeKeys.indexOf(cfg.wallpaper.theme) + 1) % themeKeys.length]); },
  "play-pause": () => player.toggle(), "reset-layout": resetLayout,
};
function mainMenu(at) {
  showMenu([
    { label: "Settings…", hint: "Ctrl ,", action: () => openSettings(null, at instanceof Element ? at : null) },
    { label: "Glass…", action: () => openSettings("glass") },
    { label: "Wallpaper…", action: () => openSettings("wallpaper") },
    "-",
    ...themeKeys.map(k => ({ label: THEMES[k].name, checked: cfg.wallpaper.kind === "theme" && cfg.wallpaper.theme === k, action: () => update({ wallpaper: { kind: "theme", theme: k } }) })),
    "-",
    { label: "Island", checked: cfg.island.mode === "island", action: () => set("island.mode", "island") },
    { label: "Full Bar", checked: cfg.island.mode === "bar", action: () => set("island.mode", "bar") },
    { label: "Auto-hide Top Bar", checked: cfg.island.mode === "auto", action: () => set("island.mode", "auto") },
    { label: "Shortcut Bar", checked: cfg.dock.mode !== "hidden", action: () => set("dock.mode", cfg.dock.mode === "hidden" ? "always" : "hidden") },
    { label: "Desktop Clock", checked: cfg.hero.show, action: () => set("hero.show", !cfg.hero.show) },
    "-",
    { label: "Reset Layout", action: resetLayout },
  ], at, "Desktop");
}
const island = initIsland({ openMenu: mainMenu, openSettings, toggleCC: from => cc.toggle(from) });
initDock(actions);
enableDragging();

addEventListener("contextmenu", e => {
  if (e.target.closest("input, textarea, .menu, #settings, #cc")) return;
  e.preventDefault();
  const card = e.target.closest(".widget");
  if (card) {
    const id = card.dataset.w;
    return showMenu([
      { label: "Customize This Card…", action: () => openSettings("cards", card, id) },
      { label: "Reset Position", action: () => { unset(`positions.${id}`, { silent: true }); layout({ animate: true }); } },
      { label: "Hide Card", action: () => set(`widgets.${id}`, false) },
    ], { x: e.clientX, y: e.clientY }, "Card");
  }
  if (e.target.closest("#hero")) return showMenu([{ label: "Clock Settings…", action: () => openSettings("clock") }, { label: "Centre", action: () => { unset("positions.hero", { silent: true }); placeHero(); } }, { label: "Hide", action: () => set("hero.show", false) }], { x: e.clientX, y: e.clientY }, "Clock");
  mainMenu({ x: e.clientX, y: e.clientY });
});
addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === ",") { e.preventDefault(); openSettings(); }
  if (e.key === "Escape") { closeMenus(); if (cc.isOpen) cc.close(); else if (settings.isOpen) settings.close(); }
});
/* files dropped anywhere: audio joins the playlist, images/videos become the wallpaper */
addEventListener("dragover", e => e.preventDefault());
addEventListener("drop", async e => {
  e.preventDefault(); const fl = [...e.dataTransfer.files]; if (!fl.length) return;
  const media = fl.find(f => /^(image|video)\//.test(f.type));
  if (media) { const { setMainFile } = await import("./wallpaper/media.js"); const kind = await setMainFile(media); set("wallpaper.kind", kind); }
  if (fl.some(f => f.type.startsWith("audio/"))) { const { addFiles } = await import("./audio/player.js"); await addFiles(fl); }
});

/* appearance */
function applyGlass() {
  const g = cfg.glass, r = document.documentElement.style;
  r.setProperty("--lg-blur", g.blur + "px"); r.setProperty("--lg-sat", g.sat + "%"); r.setProperty("--lg-bright", g.bright);
  r.setProperty("--lg-tint", g.tint); r.setProperty("--lg-radius", g.radius + "px"); r.setProperty("--lg-rim", g.rim); r.setProperty("--lg-shine", g.shine); r.setProperty("--lg-shadow", g.shadow);
  setGlobal({ quality: cfg.reduce ? "fast" : g.quality, strength: cfg.reduce ? 0 : g.refraction, react: g.react, reactRadius: g.reactRadius });
  applyCards();
  /* windows sit over busy content: give them a heavier frost so text stays readable */
  setOverrides($("#settings"), { blur: Math.max(24, g.blur * 2), tint: Math.min(0.6, g.tint + 0.1) });
  setOverrides($("#cc"), { blur: Math.max(20, g.blur * 1.6), tint: Math.min(0.6, g.tint + 0.06) });
}
/* per-card look: glass keys go to the glass engine, the rest are attributes/variables */
const CARD_LOOK = ["width", "style", "ink", "zoom", "pad", "title"];
function applyCards() {
  ORDER.forEach(id => {
    const n = widgetEl(id); if (!n) return;
    const c = cfg.cards[id] || {}, o = {};
    for (const k in c) if (!CARD_LOOK.includes(k)) o[k] = c[k];
    setOverrides(n, o);
    const attr = (k, v) => v ? n.setAttribute(k, v) : n.removeAttribute(k), prop = (k, v) => v != null ? n.style.setProperty(k, v) : n.style.removeProperty(k);
    attr("data-style", c.style); attr("data-ink", c.ink); attr("data-title", c.title);
    prop("--card-zoom", c.zoom); prop("--card-pad", c.pad != null ? c.pad + "px" : null);
  });
}
function applyWallpaper() {
  const w = cfg.wallpaper, root = document.documentElement;
  const th = THEMES[w.theme] || THEMES.dusk;
  root.dataset.glass = w.kind === "theme" ? th.glass : "dark";
  root.style.setProperty("--page", w.kind === "theme" ? th.bg : "#111");
  root.style.setProperty("--hero-ink", w.kind === "theme" ? th.hero : "#fff");
  wall.set({ ...w, motion: w.motion && !reducedMotion() });
  if (w.kind === "image" || w.kind === "gif") wall.media("image", wpMedia.main && !wpMedia.mainType.startsWith("video") ? wpMedia.main : wpMedia.we.image);
  if (w.kind === "video") wall.media("video", wpMedia.main && wpMedia.mainType.startsWith("video") ? wpMedia.main : wpMedia.we.video);
  if (w.kind === "slideshow") wall.setSlides(wpMedia.slides.length ? wpMedia.slides : wpMedia.we.folder);
  $("#dim").style.opacity = String(w.dim);
}
function applyMisc() {
  const root = document.documentElement;
  root.dataset.style = cfg.style; root.dataset.reduce = String(cfg.reduce);
  const h = $("#hero"), hc = cfg.hero;
  h.hidden = !hc.show;
  h.classList.toggle("plate", !!hc.plate);
  h.style.setProperty("--hero-size", hc.size);
  h.style.setProperty("--hero-opacity", hc.opacity); h.style.setProperty("--hero-shadow", hc.shadow);
  h.style.setProperty("--hero-align", hc.align); h.style.setProperty("--hero-justify", { left: "start", right: "end" }[hc.align] || "center");
  if (hc.color && hc.color !== "auto") h.style.setProperty("--hero-color", hc.color); else h.style.removeProperty("--hero-color");
  $("#edgeViz").hidden = !cfg.viz.edge; $("#edgeViz").style.height = cfg.viz.edgeHeight + "px";
}
/* keep the desktop clock on screen at any size */
function fitHero() {
  const h = $("#hero"); if (h.hidden) return;
  h.style.setProperty("--hero-fit", "1");
  const k = Math.min(1, (innerWidth - 32) / h.offsetWidth, (innerHeight - 120) / h.offsetHeight);
  if (k < 1) h.style.setProperty("--hero-fit", k.toFixed(3));
}
const heroRefresh = () => { fitHero(); placeHero(); };
function syncWidgets() { ORDER.forEach(id => { const n = widgetEl(id); if (n && n.hidden === !!cfg.widgets[id]) setWidgetVisible(id, !!cfg.widgets[id]); }); }

bus.on("settings", ({ patch }) => {
  if (patch.glass || "reduce" in patch || patch.cards) applyGlass();
  if (patch.wallpaper) applyWallpaper();
  if (patch.hero || patch.viz || "style" in patch || "reduce" in patch) { applyMisc(); tick(true); requestAnimationFrame(heroRefresh); }
  if (patch.widgets) syncWidgets();
  if (patch.cards || patch.dock) layout({ animate: true });
  if (patch.positions) layout({ animate: true });
  if (patch.clock) { tick(true); W.world.render(); W.weather.render(); layout(); requestAnimationFrame(heroRefresh); }
  if (patch.calendar) W.calendar.render();
  if ("city" in patch || "unit" in patch) W.weather.load();
  if (patch.cities) { W.world.render(); layout({ animate: true }); }
});
bus.on("wallpaper:media", applyWallpaper);
let lt; bus.on("layout", () => { clearTimeout(lt); lt = setTimeout(() => layout({ animate: true }), 40); });

/* Wallpaper Engine: apply only properties that changed since last time, so
 * choices made inside the wallpaper survive restarts */
const WE = {
  theme: v => ({ wallpaper: { kind: "theme", theme: v } }), motion: v => ({ wallpaper: { motion: !!v } }), speed: v => ({ wallpaper: { speed: +v / 100 } }),
  audioreactive: v => ({ wallpaper: { audioReactive: !!v } }), glassstyle: v => ({ style: v }), quality: v => ({ glass: { quality: v } }),
  refraction: v => ({ glass: { refraction: +v / 100 } }), blur: v => ({ glass: { blur: +v } }), roundness: v => ({ glass: { radius: +v } }), border: v => ({ glass: { rim: +v / 100 } }),
  topbar: v => ({ island: { mode: v } }), shortcutbar: v => ({ dock: { mode: v } }), desktopclock: v => ({ hero: { show: !!v } }), clockstyle: v => ({ hero: { style: v } }),
  clocksize: v => ({ hero: { size: +v / 100 } }), clockfont: v => ({ hero: { font: v } }), clockseconds: v => ({ hero: { seconds: !!v } }), clockplate: v => ({ hero: { plate: !!v } }),
  clock24: v => ({ clock: { h24: !!v } }), city: v => ({ city: String(v || "London") }), units: v => ({ unit: v }), musicsource: v => ({ music: { source: v } }),
  reducetransparency: v => ({ reduce: !!v }),
};
bus.on("we:props", props => {
  const changed = Object.entries(props).filter(([k, v]) => JSON.stringify(cfg.weLast[k]) !== JSON.stringify(v));
  if (!changed.length) return;
  const patch = {};
  const merge = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...(a[k] || cfg[k]), ...v } : v; };
  changed.forEach(([k, v]) => {
    if (WE[k]) merge(patch, WE[k](v));
    else if (k.startsWith("show") && k.slice(4) in cfg.widgets) merge(patch, { widgets: { [k.slice(4)]: !!v } });
    else if (k === "customimage") { wpMedia.we.image = v ? "file:///" + v : ""; if (v) merge(patch, { wallpaper: { kind: /\.gif$/i.test(v) ? "gif" : "image" } }); }
    else if (k === "customvideo") { wpMedia.we.video = v ? "file:///" + v : ""; if (v) merge(patch, { wallpaper: { kind: "video" } }); }
    else if (k === "reminders") bus.emit("reminders:set", v);
    else if (k === "notes") { if (v || cfg.weLast.notes) bus.emit("notes:set", String(v || "")); }
    else if (k === "wallpaperfolder" && v) merge(patch, { wallpaper: { kind: "slideshow" } });
  });
  merge(patch, { weLast: { ...cfg.weLast, ...Object.fromEntries(changed) } });
  update(patch);
  /* keep file paths even when unchanged */
  if (props.customimage) wpMedia.we.image = "file:///" + props.customimage;
  if (props.customvideo) wpMedia.we.video = "file:///" + props.customvideo;
  applyWallpaper();
});
bus.on("we:dir", ({ name, files }) => {
  if (name === "musicfolder") setWEFolder(files);
  /* the folder only switches to Slideshow when it is chosen (see we:props), not on every start */
  if (name === "wallpaperfolder") { wpMedia.we.folder = files.filter(f => /\.(jpe?g|png|webp|gif|bmp)$/i.test(f)).map(f => "file:///" + f); applyWallpaper(); }
});
bus.on("we:fps", fps => set("wallpaper.fps", Math.max(10, Math.min(144, fps)), { silent: true }));
bus.on("we:paused", p => { wall.paused = p; });
bus.on("we:audio", arr => feedWE(arr));
document.documentElement.classList.toggle("in-we", inWallpaperEngine());

/* clocks and frame loop */
let lastMin = -1;
function tick(force) {
  const now = new Date();
  if (cfg.widgets.clock) W.clock.tick(now);
  if (cfg.hero.show) hero.tick(now);
  island.tick(now); W.focus.tick();
  if (force || now.getMinutes() !== lastMin) { lastMin = now.getMinutes(); W.calendar.minute(); W.world.minute(); W.system.minute(); if (!force) heroRefresh(); }
}
setInterval(tick, 1000);
(function loop() {
  W.music.frame(); vizFrame();
  wall.audio(cfg.wallpaper.audioReactive ? level() : 0);
  requestAnimationFrame(loop);
})();
let rs; addEventListener("resize", () => { wall.resize(); clearTimeout(rs); rs = setTimeout(() => { layout(); heroRefresh(); refresh(); }, 60); });

/* boot */
ORDER.forEach(id => { const n = widgetEl(id); if (n) n.hidden = !cfg.widgets[id]; });
applyGlass(); applyWallpaper(); applyMisc(); tick(true); layout(); heroRefresh();
startWallpaperEngine();
loadLibrary(); loadWallpaperMedia();
document.fonts && document.fonts.ready.then(() => { layout(); heroRefresh(); refresh(); repaintLight(); });
requestAnimationFrame(() => document.documentElement.classList.add("ready"));
