/* Dynamic Island: a glass pill at the top centre. Compact it shows the time,
 * weather and what's playing; hovered or clicked it expands into a now-playing
 * panel with quick actions. Modes: island, bar (full width), auto (slides in
 * from the top edge), hidden. Visualizer bars can flank it. */
import { $, el } from "../core/util.js";
import { cfg, set } from "../core/settings.js";
import { bus } from "../core/bus.js";
import { timeParts, longDate } from "../core/time.js";
import { player } from "../audio/player.js";
import { attach } from "../audio/visualizer.js";
import { paintCover } from "../widgets/music.js";

export function initIsland({ openMenu, openSettings, toggleCC }) {
  const wrap = $("#islandWrap"), isl = $("#island");
  const q = s => isl.querySelector(s);
  attach($("#ivL"), { align: "center", reverse: true, bars: 18 });
  attach($("#ivR"), { align: "center", bars: 18 });
  let pinned = false, hover = false, music = { playing: false }, wx = null, battery = null;

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
    const I = cfg.island;
    q(".isl-time").hidden = !I.showTime;
    q(".isl-wx").hidden = !I.showWeather || !wx;
    q(".isl-net").style.display = I.showNetwork ? "" : "none";
    q(".isl-np-wrap").hidden = !I.showNowPlaying;
    q(".isl-cc").hidden = !I.showCC; q(".isl-menu").hidden = !I.showMenu;
    drawBattery();
    wrap.classList.toggle("viz-on", cfg.viz.island && !!music.playing && cfg.island.mode !== "bar");
  }
  /* hover with a short delay both ways: the expand/collapse animation changes the
   * island's size under the pointer, which used to start an enter/leave loop */
  let hoverT = 0;
  isl.addEventListener("pointerenter", () => { clearTimeout(hoverT); hoverT = setTimeout(() => { hover = true; sync(); }, 120); });
  wrap.addEventListener("pointerleave", () => { clearTimeout(hoverT); hoverT = setTimeout(() => { if (!wrap.matches(":hover")) { hover = false; sync(); } }, 320); });
  q(".isl-compact").addEventListener("click", e => { if (e.target.closest("button")) return; pinned = !pinned; sync(); });
  addEventListener("pointerdown", e => { if (pinned && !e.target.closest("#islandWrap")) { pinned = false; sync(); } });
  /* auto mode: reveal when the pointer touches the top edge, and stay until it
   * has clearly moved away (below the island plus a margin), so it can't flicker */
  let hideT = 0;
  addEventListener("pointermove", e => {
    if (cfg.island.mode !== "auto") return;
    const shown = wrap.classList.contains("revealed"), reach = 10 + isl.offsetHeight + 40;
    if (e.clientY < 10 || (shown && (e.clientY < reach || pinned || wrap.matches(":hover, :focus-within")))) { clearTimeout(hideT); hideT = 0; if (!shown) wrap.classList.add("revealed"); }
    else if (shown && !hideT) hideT = setTimeout(() => { hideT = 0; wrap.classList.remove("revealed"); }, 450);
  }, { passive: true });

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
  bus.on("battery", b => { battery = b; drawBattery(); });
  /* battery: off, percent, icon, both, or the percentage inside the icon */
  function drawBattery() {
    const s = q(".isl-bat"), m = cfg.island.battery;
    s.hidden = !battery || m === "off"; if (s.hidden) return;
    const pctN = Math.round(battery.level * 100), low = battery.level <= 0.2 && !battery.charging;
    const fill = low ? "#ff453a" : battery.charging ? "#30d158" : "currentColor";
    const bolt = battery.charging ? '<path d="M13.6 2.2 9.4 7.3h3l-1.2 4.5 4.3-5.4h-3z" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width=".5"/>' : "";
    const icon = inside => inside
      ? `<svg class="bat-ic big" width="34" height="16" viewBox="0 0 34 16" aria-hidden="true"><rect x=".75" y=".75" width="29" height="14.5" rx="4.2" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1.5"/><rect x="31" y="5.2" width="2.2" height="5.6" rx="1.1" fill="currentColor" fill-opacity=".5"/><rect x="2.5" y="2.5" width="${(25.5 * battery.level).toFixed(1)}" height="11" rx="2.6" fill="${fill}" fill-opacity="${low || battery.charging ? .9 : .35}"/><text x="15.2" y="11.6" text-anchor="middle" font-size="9.5" font-weight="800" fill="currentColor">${pctN}</text></svg>`
      : `<svg class="bat-ic" width="25" height="13" viewBox="0 0 25 13" aria-hidden="true"><rect x=".75" y=".75" width="21" height="11.5" rx="3.4" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1.5"/><rect x="22.8" y="4.3" width="1.8" height="4.4" rx=".9" fill="currentColor" fill-opacity=".5"/><rect x="2.5" y="2.5" width="${(17.5 * battery.level).toFixed(1)}" height="8" rx="1.8" fill="${fill}"/>${bolt}</svg>`;
    s.innerHTML = m === "inside" ? icon(true) : m === "icon" ? icon(false) : m === "both" ? `${pctN}% ${icon(false)}` : `${pctN}%`;
    s.setAttribute("aria-label", `Battery ${pctN}%${battery.charging ? ", charging" : ""}`);
  }
  bus.on("settings", ({ patch }) => { if (patch.island || patch.viz) mode(); if (patch.music) q(".isl-shuffle").setAttribute("aria-pressed", String(cfg.music.shuffle)); });
  mode();
  return {
    tick(now) {
      const t = timeParts(now);
      q(".isl-time").textContent = `${t.h}${t.sep}${t.m}${cfg.island.seconds ? t.sep + t.s : ""}${t.ap ? " " + t.ap : ""}`;
      q(".isl-date").textContent = longDate(now);
    },
  };
}
