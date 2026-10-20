/* Dynamic Island: a glass pill at the top centre. Compact it shows the time,
 * weather and what's playing; hovered or clicked it expands into a now-playing
 * panel with quick actions. Modes: island, bar (full width), auto (slides in
 * from the top edge), hidden. Visualizer bars can flank it. */
import { $, el } from "../core/util.js";
import { cfg, set } from "../core/settings.js";
import { bus } from "../core/bus.js";
import { fmtTime } from "../core/time.js";
import { player } from "../audio/player.js";
import { attach } from "../audio/visualizer.js";
import { paintCover } from "../widgets/music.js";

export function initIsland({ openMenu, openSettings, toggleCC }) {
  const wrap = $("#islandWrap"), isl = $("#island");
  const q = s => isl.querySelector(s);
  attach($("#ivL"), { align: "center", reverse: true, bars: 18 });
  attach($("#ivR"), { align: "center", bars: 18 });
  let pinned = false, hover = false, music = { playing: false }, wx = null;

  function mode() {
    const m = cfg.island.mode;
    wrap.dataset.mode = m;
    wrap.hidden = m === "hidden";
    sync();
  }
  function sync() {
    const expanded = cfg.island.mode !== "bar" && (pinned || (hover && cfg.island.expandOnHover));
    if (isl.classList.contains("expanded") !== expanded) {
      isl.classList.toggle("expanded", expanded);
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        isl.animate(expanded ? [{ transform: "scale(.72, .5)" }, { transform: "scale(1.02, 1.04)", offset: .6 }, { transform: "scale(1)" }] : [{ transform: "scale(1.25, 2.2)" }, { transform: "scale(.97, .94)", offset: .6 }, { transform: "scale(1)" }],
          { duration: 460, easing: "cubic-bezier(0.22, 1, 0.36, 1)", composite: "add" });
        const pn = isl.querySelector(".pane"); pn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 80, fill: "backwards" });
      }
    }
    isl.classList.toggle("playing", !!music.playing);
    q(".isl-time").hidden = !cfg.island.showTime;
    q(".isl-wx").hidden = !cfg.island.showWeather || !wx;
    wrap.classList.toggle("viz-on", cfg.viz.island && !!music.playing && cfg.island.mode !== "bar");
  }
  isl.addEventListener("pointerenter", () => { hover = true; sync(); });
  wrap.addEventListener("pointerleave", () => { hover = false; sync(); });
  q(".isl-compact").addEventListener("click", e => { if (e.target.closest("button")) return; pinned = !pinned; sync(); });
  addEventListener("pointerdown", e => { if (pinned && !e.target.closest("#islandWrap")) { pinned = false; sync(); } });
  /* auto mode: reveal when the pointer touches the top edge */
  addEventListener("pointermove", e => { if (cfg.island.mode === "auto") wrap.classList.toggle("revealed", e.clientY < 10 || wrap.matches(":hover")); }, { passive: true });

  q(".isl-menu").onclick = e => openMenu(e.currentTarget);
  q(".isl-cc").onclick = e => toggleCC(e.currentTarget);
  q(".isl-set").onclick = e => openSettings(null, e.currentTarget);
  q(".isl-play").onclick = () => player.toggle();
  q(".isl-next").onclick = () => player.next();
  q(".isl-prev").onclick = () => player.prev();
  q(".isl-shuffle").onclick = () => set("music.shuffle", !cfg.music.shuffle);

  bus.on("music", m => {
    music = m;
    q(".isl-title").textContent = m.title; q(".isl-artist").textContent = m.artist || "";
    q(".isl-np").textContent = m.playing ? m.title : "";
    const img = q(".isl-img"), cv = q(".isl-art"), img2 = q(".isl-img-s"), cv2 = q(".isl-art-s");
    if (m.thumb) { img.src = img2.src = m.thumb; img.hidden = img2.hidden = false; cv.hidden = cv2.hidden = true; }
    else { img.hidden = img2.hidden = true; cv.hidden = cv2.hidden = false; paintCover(cv, m.track, 64); paintCover(cv2, m.track, 24); }
    q(".isl-play path").setAttribute("d", m.playing ? "M6 4.5a1 1 0 0 1 1-1h2.6a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM13.4 4.5a1 1 0 0 1 1-1H17a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-2.6a1 1 0 0 1-1-1z" : "M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6Z");
    q(".isl-play").setAttribute("aria-label", m.playing ? "Pause" : "Play");
    q(".isl-ctrl").hidden = m.mode === "system";
    q(".isl-shuffle").setAttribute("aria-pressed", String(cfg.music.shuffle));
    sync();
  });
  bus.on("weather", w => { wx = w; q(".isl-wx").textContent = `${Math.round(w.temp)}°`; sync(); });
  bus.on("net", on => { q(".isl-net").style.opacity = on ? "1" : ".35"; });
  bus.on("battery", b => { const s = q(".isl-bat"); s.hidden = false; s.textContent = Math.round(b.level * 100) + "%"; });
  bus.on("settings", ({ patch }) => { if (patch.island || patch.viz) mode(); if (patch.music) q(".isl-shuffle").setAttribute("aria-pressed", String(cfg.music.shuffle)); });
  mode();
  return {
    tick(now) {
      q(".isl-time").textContent = fmtTime(now, cfg.clock.seconds ? { second: "2-digit" } : {});
      q(".isl-date").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(now);
    },
  };
}
