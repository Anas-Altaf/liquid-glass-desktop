/* All user settings live here, saved on every change and broadcast on the bus.
 * update() takes a patch; set("a.b.c", v) changes one nested value. */
import { store } from "./store.js";
import { bus } from "./bus.js";

export const WIDGETS = [
  ["clock", "Clock", "Digital, analog and more"],
  ["weather", "Weather", "Conditions and the next hours"],
  ["music", "Music", "Player with playlist"],
  ["calendar", "Calendar", "This month at a glance"],
  ["world", "World Clock", "Time in other cities"],
  ["reminders", "Reminders", "A short to-do list"],
  ["notes", "Notes", "A scratch pad that saves itself"],
  ["focus", "Focus Timer", "Timed focus sessions"],
  ["system", "System", "Battery, network and display"],
  ["visualizer", "Visualizer", "Free-standing music visualizer"],
];

export const DEFAULTS = {
  widgets: { clock: false, weather: true, music: true, calendar: true, world: false, reminders: true, notes: false, focus: false, system: false, visualizer: false },
  positions: {},                 // id -> {ax:"l"|"r", ay:"t"|"b", x, y} px from the anchored edges
  cards: {},                     // id -> per-card overrides {blur, sat, bright, tint, radius, rim, shine, refraction, width}
  glass: { blur: 14, sat: 180, bright: 1, tint: 0.06, radius: 26, rim: 0.45, shine: 0.5, refraction: 1, quality: "balanced", react: "near", reactRadius: 220, shadow: 0.24 },
  wallpaper: { kind: "theme", theme: "dusk", motion: true, speed: 1, fps: 60, colorA: "#1f2a6b", colorB: "#e0707a", fit: "cover", slideEvery: 60, dim: 0, audioReactive: true },
  island: { mode: "island", expandOnHover: true, showTime: true, showWeather: true },
  dock: { mode: "hidden", shortcuts: [
    { id: "s1", name: "Settings", kind: "action", target: "settings", icon: "gear" },
    { id: "s2", name: "Edit layout", kind: "action", target: "edit", icon: "grid" },
    { id: "s3", name: "Display settings", kind: "uri", target: "ms-settings:display", icon: "display" },
  ] },
  clock: { style: "digital", seconds: false, date: true, h24: !new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12 },
  hero: { show: true, style: "digital", size: 1, date: true, weight: 700 },
  music: { source: "auto", repeat: "all", shuffle: false, continuous: true, volume: 0.8, order: [] },
  viz: { card: true, island: true, edge: false, style: "bars", color: "ink", sensitivity: 1, bars: 48, edgeHeight: 90 },
  style: "clear",
  reduce: false,
  focusMode: false,
  city: "London", unit: "c",
  cities: ["Europe/London", "America/New_York", "Asia/Tokyo"],
  weLast: {},                    // last values seen from Wallpaper Engine's properties
};

const isObj = v => v && typeof v === "object" && !Array.isArray(v);
function merge(base, over) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  if (!isObj(over)) return out;
  for (const k of Object.keys(over)) out[k] = isObj(base[k]) && isObj(over[k]) ? merge(base[k], over[k]) : over[k];
  return out;
}

export const cfg = merge(DEFAULTS, store.get("settings", {}));

let t;
const persist = () => { clearTimeout(t); t = setTimeout(() => saving && store.set("settings", cfg), 120); };
let saving = true;
addEventListener("pagehide", () => { if (saving) store.set("settings", cfg); });

/** patch: top-level keys; nested objects are merged. opts.source lets a UI ignore its own changes. */
export function update(patch, { silent = false, source = "" } = {}) {
  for (const [k, v] of Object.entries(patch)) cfg[k] = isObj(cfg[k]) && isObj(v) && !Array.isArray(v) ? merge(cfg[k], v) : v;
  persist();
  if (!silent) bus.emit("settings", { patch, source });
}
export function set(path, value, opts) {
  const keys = path.split("."), top = keys[0];
  if (keys.length === 1) return update({ [top]: value }, opts);
  const obj = structuredClone(cfg[top] ?? {});
  let o = obj; keys.slice(1, -1).forEach(k => { o[k] = isObj(o[k]) ? o[k] : {}; o = o[k]; });
  o[keys[keys.length - 1]] = value;
  cfg[top] = obj; persist();
  if (!(opts && opts.silent)) bus.emit("settings", { patch: { [top]: obj }, source: opts && opts.source || "", path });
}
export const setWidget = (id, on) => set(`widgets.${id}`, on);
export function resetAll() { saving = false; clearTimeout(t); store.set("settings", {}); location.reload(); }
export function exportAll() { return JSON.stringify({ settings: cfg, reminders: store.get("reminders", []), notes: store.get("notes", "") }, null, 2); }
export function importAll(json) {
  const d = JSON.parse(json);
  saving = false; clearTimeout(t);
  if (d.settings) store.set("settings", d.settings);
  if (d.reminders) store.set("reminders", d.reminders);
  if (typeof d.notes === "string") store.set("notes", d.notes);
  location.reload();
}
