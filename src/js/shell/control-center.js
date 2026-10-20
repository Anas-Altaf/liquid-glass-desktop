import { $ } from "../core/util.js";
import { cfg, set, update } from "../core/settings.js";
import { bus } from "../core/bus.js";
import { slider } from "../components/slider.js";
import { liquidOpen, liquidClose, press } from "../glass/motion.js";
import { player } from "../audio/player.js";
import { paintCover } from "../widgets/music.js";

export function initControlCenter() {
  const cc = $("#cc"); let trigger = null;
  const pct = v => Math.round(v * 100) + "%";
  const bri = slider($("#ccBri"), { label: "Wallpaper brightness", value: 1 - cfg.wallpaper.dim / 0.8, onInput: v => { $("#ccBriV").textContent = pct(v); set("wallpaper.dim", +((1 - v) * 0.8).toFixed(3)); } });
  const vol = slider($("#ccVol"), { label: "Volume", value: cfg.music.volume, onInput: v => { $("#ccVolV").textContent = pct(v); set("music.volume", +v.toFixed(3)); } });
  const tiles = [
    ["#ccFocus", () => update({ focusMode: !cfg.focusMode }), () => cfg.focusMode, ["On", "Off"]],
    ["#ccStyle", () => update({ style: cfg.style === "tinted" ? "clear" : "tinted" }), () => cfg.style === "tinted", ["Tinted", "Clear"]],
    ["#ccMotion", () => set("wallpaper.motion", !cfg.wallpaper.motion), () => cfg.wallpaper.motion, ["On", "Off"]],
    ["#ccIsland", () => set("island.mode", cfg.island.mode === "island" ? "auto" : "island"), () => cfg.island.mode === "island", ["Island", "Auto-hide"]],
  ];
  tiles.forEach(([sel, act]) => { const b = $(sel); b.onclick = () => { press(b); act(); }; });
  const sync = () => {
    tiles.forEach(([sel, , on, txt]) => { const b = $(sel), v = on(); b.setAttribute("aria-pressed", String(v)); b.querySelector(".tile-v").textContent = v ? txt[0] : txt[1]; });
    bri.set(1 - cfg.wallpaper.dim / 0.8); vol.set(cfg.music.volume);
    $("#ccBriV").textContent = pct(1 - cfg.wallpaper.dim / 0.8); $("#ccVolV").textContent = pct(cfg.music.volume);
  };
  bus.on("settings", sync);
  $("#ccPlay").onclick = () => player.toggle(); $("#ccNext").onclick = () => player.next();
  bus.on("music", m => {
    $("#ccTitle").textContent = m.title; $("#ccArtist").textContent = m.artist || "";
    const img = $("#ccImg"), cv = $("#ccThumb");
    if (m.thumb) { img.src = m.thumb; img.hidden = false; cv.hidden = true; } else { img.hidden = true; cv.hidden = false; paintCover(cv, m.track, 44); }
    $("#ccPlay path").setAttribute("d", m.playing ? "M6 4.5a1 1 0 0 1 1-1h2.6a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM13.4 4.5a1 1 0 0 1 1-1H17a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-2.6a1 1 0 0 1-1-1z" : "M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6Z");
    $("#ccPlay").hidden = $("#ccNext").hidden = m.mode === "system";
  });
  sync();
  const api = {
    open(from) { trigger = from; liquidOpen(cc, trigger); },
    close() { return liquidClose(cc, trigger); },
    toggle(from) { cc.hidden ? api.open(from) : api.close(); },
    get isOpen() { return !cc.hidden; },
  };
  addEventListener("pointerdown", e => { if (!cc.hidden && !e.target.closest("#cc, .isl-cc, .app")) api.close(); });
  return api;
}
