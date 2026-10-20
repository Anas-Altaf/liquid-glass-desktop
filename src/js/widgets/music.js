/* Music card: player, playlist, play modes, drag-and-drop, card visualizer.
 * In Wallpaper Engine it can follow what Windows is playing instead. */
import { el, fmt } from "../core/util.js";
import { cfg, set } from "../core/settings.js";
import { bus } from "../core/bus.js";
import { paintArt } from "../audio/cover-art.js";
import { slider } from "../components/slider.js";
import { player, list, current, addFiles } from "../audio/player.js";
import { attach } from "../audio/visualizer.js";

const PLAY = "M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6Z";
const PAUSE = "M6 4.5a1 1 0 0 1 1-1h2.6a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM13.4 4.5a1 1 0 0 1 1-1H17a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-2.6a1 1 0 0 1-1-1z";
const SKIP = `<svg width="26" height="26" viewBox="0 0 32 32" fill="currentColor"><path d="M4 9.2v13.6a1 1 0 0 0 1.55.83l9.55-6.6a1.2 1.2 0 0 0 0-2.06L5.55 8.37A1 1 0 0 0 4 9.2Z"/><path d="M17 9.2v13.6a1 1 0 0 0 1.55.83l9.55-6.6a1.2 1.2 0 0 0 0-2.06l-9.55-6.6A1 1 0 0 0 17 9.2Z"/></svg>`;
const ICON = {
  shuffle: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h4v4M4 20 20 4M20 16v4h-4M15 15l5 5M4 4l5 5"/></svg>',
  repeat: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
  list: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>',
};
export const sys = { title: "", artist: "", state: "stopped", pos: 0, dur: 0, at: 0, thumb: null, enabled: false };

export function paintCover(canvas, t, size) {
  if (t && t.kind === "synth") return paintArt(canvas, t.synth, size, size, false);
  const dpr = 2; canvas.width = canvas.height = size * dpr; const x = canvas.getContext("2d"); x.scale(dpr, dpr);
  let h = 0; for (const c of (t ? t.title : "?")) h = (h * 31 + c.charCodeAt(0)) % 360;
  const g = x.createLinearGradient(0, 0, size, size); g.addColorStop(0, `hsl(${h},70%,55%)`); g.addColorStop(1, `hsl(${(h + 60) % 360},75%,40%)`);
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  x.fillStyle = "rgba(255,255,255,.9)"; x.font = `700 ${size * 0.42}px -apple-system, "Inter Tight", sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText((t ? t.title : "?").trim().charAt(0).toUpperCase(), size / 2, size / 2 + 1);
}

export function mountMusic(pane, card) {
  pane.innerHTML = `<div class="mu-row"><span class="mu-art"><canvas class="mu-thumb" aria-hidden="true"></canvas><img class="mu-img" alt="" hidden></span>
      <div class="mu-meta"><div class="mu-title"></div><div class="mu-artist"></div></div>
      <button class="icon-btn mu-listbtn" aria-label="Playlist" aria-expanded="false">${ICON.list}</button></div>
    <canvas class="mu-viz" aria-hidden="true"></canvas>
    <div class="mu-scrub"><div class="mu-seek"></div><div class="mu-times num"><span class="mu-el">0:00</span><span class="mu-rem"></span></div></div>
    <div class="mu-ctrl">
      <button class="icon-btn mu-mode mu-shuffle" aria-label="Shuffle" aria-pressed="false">${ICON.shuffle}</button>
      <button class="icon-btn mu-prev" aria-label="Previous track"><span style="display:inline-flex;transform:scaleX(-1)">${SKIP}</span></button>
      <button class="icon-btn mu-play" aria-label="Play"><svg width="34" height="34" viewBox="0 0 24 24"><path fill="currentColor" d="${PLAY}"/></svg></button>
      <button class="icon-btn mu-next" aria-label="Next track">${SKIP}</button>
      <button class="icon-btn mu-mode mu-repeat" aria-label="Repeat">${ICON.repeat}<span class="mu-one" hidden>1</span></button>
    </div>
    <div class="mu-src faint" hidden>Playing on your PC</div>
    <ol class="mu-list" hidden></ol>
    <div class="mu-drop" aria-hidden="true">Drop to add to playlist</div>`;
  const q = s => pane.querySelector(s);
  const mode = () => (cfg.music.source === "system" || (cfg.music.source === "auto" && sys.enabled && sys.title)) ? "system" : "player";
  const duration = () => mode() === "system" ? sys.dur : player.duration;
  const position = () => mode() === "system" ? Math.min(sys.dur, sys.pos + (sys.state === "playing" ? (performance.now() - sys.at) / 1000 : 0)) : player.position;
  const playing = () => mode() === "system" ? sys.state === "playing" : player.playing;
  const seek = slider(q(".mu-seek"), { label: "Seek", knob: false, step: 0.03, format: v => fmt(v * duration()),
    onInput: v => { q(".mu-el").textContent = fmt(v * duration()); }, onChange: v => { if (mode() === "player") player.seek(v * duration()); } });
  attach(q(".mu-viz"), { align: "bottom" });

  function render() {
    const s = mode() === "system", t = current();
    q(".mu-src").hidden = !s; q(".mu-ctrl").hidden = s; q(".mu-listbtn").hidden = s;
    q(".mu-seek").classList.toggle("readonly", s);
    q(".mu-viz").hidden = !cfg.viz.card;
    q(".mu-title").textContent = s ? sys.title || "Nothing playing" : t ? t.title : "No tracks";
    q(".mu-artist").textContent = s ? sys.artist : t ? t.artist || "Unknown artist" : "Drop audio files here";
    const img = q(".mu-img"), cv = q(".mu-thumb");
    if (s && sys.thumb) { img.src = sys.thumb; img.hidden = false; cv.hidden = true; } else { img.hidden = true; cv.hidden = false; paintCover(cv, t, 52); }
    q(".mu-play path").setAttribute("d", playing() ? PAUSE : PLAY); q(".mu-play").setAttribute("aria-label", playing() ? "Pause" : "Play");
    q(".mu-shuffle").setAttribute("aria-pressed", String(cfg.music.shuffle));
    const r = cfg.music.repeat; q(".mu-repeat").setAttribute("aria-pressed", String(r !== "off")); q(".mu-one").hidden = r !== "one";
    q(".mu-repeat").setAttribute("aria-label", `Repeat: ${r === "one" ? "one" : r === "all" ? "all" : "off"}`);
    renderList(); progress(true);
    bus.emit("music", { title: q(".mu-title").textContent, artist: q(".mu-artist").textContent, playing: playing(), thumb: s ? sys.thumb : null, track: t, mode: s ? "system" : "player" });
  }
  function renderList() {
    const ol = q(".mu-list"); if (ol.hidden) return; ol.textContent = "";
    const L = list(), cur = current();
    if (!L.length) ol.append(el("li", "empty", "Playlist is empty. Drop audio files on this card."));
    L.forEach((t, i) => {
      const li = el("li"), b = el("button", "mu-li" + (t === cur ? " on" : ""));
      b.append(el("span", "mu-li-n num", t === cur && playing() ? "♪" : String(i + 1)), el("span", "mu-li-t", t.title), el("span", "mu-li-a", t.artist || ""));
      b.onclick = () => player.go(i, true); li.append(b); ol.append(li);
    });
  }
  let lastQ = -1;
  function progress(force) {
    const d = duration() || 0, p = position(), qn = Math.floor(p * 2);
    if (!force && qn === lastQ) return; lastQ = qn;
    seek.set(d ? p / d : 0); if (!seek.dragging) q(".mu-el").textContent = fmt(p);
    q(".mu-rem").textContent = d ? "-" + fmt(d - p) : "";
  }
  q(".mu-play").onclick = () => player.toggle();
  q(".mu-next").onclick = () => player.next(false);
  q(".mu-prev").onclick = () => player.prev();
  q(".mu-shuffle").onclick = () => set("music.shuffle", !cfg.music.shuffle);
  q(".mu-repeat").onclick = () => set("music.repeat", { off: "all", all: "one", one: "off" }[cfg.music.repeat]);
  q(".mu-listbtn").onclick = () => { const ol = q(".mu-list"); ol.hidden = !ol.hidden; q(".mu-listbtn").setAttribute("aria-expanded", String(!ol.hidden)); renderList(); bus.emit("layout"); };

  /* drag audio files onto the card */
  let depth = 0;
  card.addEventListener("dragenter", e => { if ([...(e.dataTransfer.items || [])].some(i => i.kind === "file")) { depth++; card.classList.add("dropping"); e.preventDefault(); } });
  card.addEventListener("dragover", e => { if (card.classList.contains("dropping")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } });
  card.addEventListener("dragleave", () => { if (--depth <= 0) { depth = 0; card.classList.remove("dropping"); } });
  card.addEventListener("drop", async e => {
    e.preventDefault(); e.stopPropagation(); depth = 0; card.classList.remove("dropping");
    const added = await addFiles(e.dataTransfer.files);
    if (added.length) { const i = list().findIndex(t => t.id === added[0].id); player.go(i, true); }
  });

  bus.on("player", render); bus.on("playlist", render);
  bus.on("settings", ({ patch }) => { if (patch.music || patch.viz) render(); });
  bus.on("media:status", on => { sys.enabled = on; render(); });
  bus.on("media:props", e => { sys.title = e.title || ""; sys.artist = e.artist || ""; sys.enabled = true; render(); });
  bus.on("media:thumb", e => { sys.thumb = e.thumbnail || null; render(); });
  bus.on("media:state", s => { sys.state = s; sys.at = performance.now(); if (s === "stopped") sys.title = ""; render(); });
  bus.on("media:timeline", e => { sys.pos = e.position || 0; sys.dur = e.duration || 0; sys.at = performance.now(); progress(true); });
  if ("mediaSession" in navigator) { const s = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch {} }; s("play", () => player.play()); s("pause", () => player.pause()); s("nexttrack", () => player.next()); s("previoustrack", () => player.prev()); }
  render();
  return { frame() { if (playing()) progress(false); }, render };
}
