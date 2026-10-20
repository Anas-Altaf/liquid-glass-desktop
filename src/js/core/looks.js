/* One-click looks for Settings › Themes. Each combines a surface skin, a
 * layout, a wallpaper, a clock style and an accent. Applying one tidies the
 * layout (moved cards go back into the new arrangement). */
import { cfg, set, update } from "./settings.js";

export const SKINS = [["glass", "Liquid Glass"], ["brutal", "Brutalist"], ["neon", "Neon"], ["paper", "Paper"], ["retro", "Retro OS"], ["clay", "Clay"], ["bare", "Bare"]];
export const UI_FONTS = [["system", "System"], ["rounded", "Rounded"], ["serif", "Serif"], ["mono", "Mono"], ["condensed", "Condensed"]];

const hero = o => ({ hero: { color: "auto", font: "system", weight: "auto", plate: false, numerals: "four", align: "center", ...o } });
export const LOOKS = [
  { id: "liquid", name: "Liquid Glass", sub: "Clear glass, columns, Dusk", skin: "glass", layoutMode: "columns", accent: "auto", uiFont: "system", style: "clear",
    wallpaper: { kind: "theme", theme: "dusk" }, ...hero({ style: "digital" }), island: { mode: "island" } },
  { id: "brutal", name: "Brutalist", sub: "Hard edges on Bauhaus shapes", skin: "brutal", layoutMode: "bento", accent: "#ffd60a", uiFont: "system", style: "clear",
    wallpaper: { kind: "theme", theme: "bauhaus" }, ...hero({ style: "outline", font: "mono", weight: 800, color: "#111111" }), island: { mode: "bar" } },
  { id: "cyber", name: "Cyberpunk", sub: "Neon panels, Outrun sunset", skin: "neon", layoutMode: "right", accent: "#ff2bd6", uiFont: "system", style: "clear",
    wallpaper: { kind: "theme", theme: "outrun" }, ...hero({ style: "neon", font: "condensed" }), island: { mode: "island" } },
  { id: "paper", name: "Paper Desk", sub: "Sticky notes along the bottom", skin: "paper", layoutMode: "row", accent: "#e63946", uiFont: "system", style: "clear",
    wallpaper: { kind: "color", colorA: "#efe3c8", colorB: "#c9b28f", gradStyle: "radial", gradFlow: false }, ...hero({ style: "words", font: "serif", color: "#3a2f25", align: "left" }), island: { mode: "island" } },
  { id: "retro", name: "Retro OS", sub: "Bevels, title bars, LCD clock", skin: "retro", layoutMode: "left", accent: "#000080", uiFont: "system", style: "clear",
    wallpaper: { kind: "color", colorA: "#008080", colorB: "#006a6a", gradStyle: "linear", gradAngle: 180, gradFlow: false }, ...hero({ style: "lcd" }), island: { mode: "bar" } },
  { id: "clay", name: "Clay", sub: "Soft and puffy on pastel", skin: "clay", layoutMode: "bento", accent: "#7c5cff", uiFont: "system", style: "clear",
    wallpaper: { kind: "theme", theme: "pastel" }, ...hero({ style: "rings", font: "rounded" }), island: { mode: "island" } },
  { id: "zen", name: "Zen", sub: "No panels, just type", skin: "bare", layoutMode: "row", accent: "auto", uiFont: "system", style: "clear",
    wallpaper: { kind: "theme", theme: "topo" }, ...hero({ style: "minimal", font: "system" }), island: { mode: "auto" } },
  { id: "space", name: "Deep Space", sub: "Tinted glass in a nebula", skin: "glass", layoutMode: "right", accent: "#64d2ff", uiFont: "system", style: "tinted",
    wallpaper: { kind: "theme", theme: "nebula" }, ...hero({ style: "analog", numerals: "none" }), island: { mode: "island" } },
  { id: "acid", name: "Acid", sub: "Flip clock on plasma", skin: "neon", layoutMode: "bento", accent: "#c6ff00", uiFont: "mono", style: "clear",
    wallpaper: { kind: "theme", theme: "acid" }, ...hero({ style: "flip", font: "mono" }), island: { mode: "island" } },
  { id: "lava", name: "Lava Lamp", sub: "Glass sidebar, warm blobs", skin: "glass", layoutMode: "left", accent: "#ff9e00", uiFont: "rounded", style: "clear",
    wallpaper: { kind: "theme", theme: "lava" }, ...hero({ style: "stacked", font: "rounded", align: "left" }), island: { mode: "island" } },
];

export function applyLook(id) {
  const L = LOOKS.find(l => l.id === id); if (!L) return;
  const { id: _, name, sub, ...patch } = L;
  set("positions", {}, { silent: true });
  update({ ...patch, look: id });
}
export const currentLook = () => cfg.look || "";
