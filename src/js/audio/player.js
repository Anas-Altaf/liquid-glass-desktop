/* Player: built-in synthesised tracks plus the user's own audio files.
 * Files added in a browser are kept in IndexedDB; in Wallpaper Engine a
 * music folder can be chosen in the properties panel. */
import { TRACKS } from "./tracks.js";
import { Engine } from "./engine.js";
import { cfg, set } from "../core/settings.js";
import { bus } from "../core/bus.js";
import { store } from "../core/store.js";
import { files } from "../core/idb.js";
import { useAnalyser } from "./visualizer.js";

export const engine = new Engine();
const audio = new Audio(); audio.preload = "auto";
let mediaNode = null;
/* once the element is routed through the engine, its volume is applied there (not twice) */
function wireAudio() { engine.ensure(); if (!mediaNode) { try { mediaNode = engine.ctx.createMediaElementSource(audio); mediaNode.connect(engine.out); audio.volume = 1; } catch {} } useAnalyser(engine.analyser); }

const builtin = TRACKS.map((t, i) => ({ id: "synth:" + t.id, kind: "synth", title: t.title, artist: t.artist, album: t.album, synth: t }));
let user = [];           // {id, kind:"file", title, artist, src}
let weFolder = [];        // from Wallpaper Engine directory property
export const list = () => [...builtin.filter(() => store.get("includeBuiltin", true)), ...user, ...weFolder];

let idx = Math.max(0, list().findIndex(t => t.id === store.get("current", "")));
let history = [];
export const current = () => list()[idx] || list()[0];
export const isFile = () => current() && current().kind === "file";

export const player = {
  get playing() { return isFile() ? !audio.paused : engine.playing; },
  get position() { return isFile() ? audio.currentTime || 0 : (engine.track ? engine.position : 0); },
  get duration() { return isFile() ? (isFinite(audio.duration) ? audio.duration : 0) : (current() ? current().synth.duration : 0); },
  async toggle() { player.playing ? await player.pause() : await player.play(); },
  async play() {
    const t = current(); if (!t) return;
    if (t.kind === "file") { if (engine.playing) await engine.pause(); wireAudio(); if (engine.ctx.state !== "running") await engine.ctx.resume(); if (!audio.src) audio.src = t.src; await audio.play().catch(() => {}); }
    else { audio.pause(); if (!engine.track || engine.track !== t.synth) engine.load(t.synth, 0); await engine.play(); useAnalyser(engine.analyser); }
    emit();
  },
  async pause() { audio.pause(); if (engine.playing) await engine.pause(); emit(); },
  seek(sec) { if (isFile()) audio.currentTime = sec; else { const t = current(); if (!engine.track) engine.load(t.synth, 0); engine.seek(sec); } emit(); },
  async go(i, autoplay, back) {
    const L = list(); if (!L.length) return;
    const was = autoplay ?? player.playing;
    if (!back) history.push(idx); idx = (i + L.length) % L.length; store.set("current", current().id);
    audio.pause(); audio.removeAttribute("src");
    const t = current();
    if (t.kind === "synth") engine.load(t.synth, 0); else { if (engine.playing) await engine.pause(); audio.src = t.src; }
    emit();
    if (was) await player.play();
  },
  next(auto) {
    const L = list();
    if (cfg.music.shuffle && L.length > 1) { let j; do { j = Math.floor(Math.random() * L.length); } while (j === idx); return player.go(j, true); }
    if (auto && idx === L.length - 1 && cfg.music.repeat === "off") { player.pause(); return player.go(0, false); }
    return player.go(idx + 1, auto ? true : undefined);
  },
  prev() { if (player.position > 3) return player.seek(0); if (cfg.music.shuffle && history.length) return player.go(history.pop(), undefined, true); return player.go(idx - 1); },
  setVolume(v) { engine.setVolume(v); audio.volume = mediaNode ? 1 : v; },
  index: () => idx,
};

function ended() {
  if (cfg.music.repeat === "one") { player.seek(0); player.play(); return; }
  if (!cfg.music.continuous) { player.pause(); player.seek(0); return; }
  player.next(true);
}
engine.onended = ended;
audio.addEventListener("ended", ended);
audio.addEventListener("loadedmetadata", () => emit());
audio.addEventListener("play", () => emit()); audio.addEventListener("pause", () => emit());

function emit() { bus.emit("player", { track: current(), playing: player.playing }); }

/* adding files */
const nice = name => name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ");
function split(name) { const n = nice(name), m = n.split(/\s+-\s+/); return m.length > 1 ? { artist: m[0], title: m.slice(1).join(" - ") } : { artist: "", title: n }; }
export async function addFiles(fileList) {
  const added = [];
  for (const f of fileList) {
    if (!f.type.startsWith("audio/") && !/\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i.test(f.name)) continue;
    const id = "file:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await files.put({ id, type: "audio", name: f.name, blob: f, added: Date.now() });
    const { title, artist } = split(f.name);
    const t = { id, kind: "file", title, artist, src: URL.createObjectURL(f) };
    user.push(t); added.push(t);
  }
  bus.emit("playlist"); return added;
}
export async function removeTrack(id) {
  if (id.startsWith("synth:")) return;
  const cur = current(), wasCurrent = cur && cur.id === id, i = list().findIndex(t => t.id === id);
  await files.del(id); user = user.filter(t => t.id !== id);
  history = [];
  if (i >= 0 && i < idx) idx--;
  if (idx >= list().length) idx = 0;
  if (wasCurrent) { audio.pause(); audio.removeAttribute("src"); const t = current(); if (t && t.kind === "file") audio.src = t.src; else if (t) engine.load(t.synth, 0); }
  bus.emit("playlist"); emit();
}
export function setIncludeBuiltin(on) { store.set("includeBuiltin", on); idx = 0; bus.emit("playlist"); emit(); }
export function setWEFolder(paths) {
  weFolder = paths.filter(p => /\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i.test(p)).map(p => { const name = p.split(/[\\/]/).pop(); return { id: "we:" + p, kind: "file", ...split(name), src: "file:///" + p }; });
  bus.emit("playlist");
}
export async function loadLibrary() {
  const recs = (await files.all()).filter(r => r.type === "audio").sort((a, b) => a.added - b.added);
  user = recs.map(r => ({ id: r.id, kind: "file", ...split(r.name), src: URL.createObjectURL(r.blob) }));
  const want = store.get("current", ""); const j = list().findIndex(t => t.id === want); if (j >= 0) idx = j;
  const t = current(); if (t && t.kind === "file") audio.src = t.src; else if (t) engine.load(t.synth, 0);
  bus.emit("playlist"); emit();
}
player.setVolume(cfg.music.volume);
bus.on("settings", ({ patch }) => { if (patch.music) player.setVolume(cfg.music.volume); });
