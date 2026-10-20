/* Wallpaper themes. "style" picks the renderer in wallpaper.js; "glass" picks
 * the adaptive material (light glass gets dark ink); "hero" is the clock colour. */
export const THEMES = {
  dusk:    { name: "Dusk",    style: "waves", glass: "dark",  bg: "#141a45", bands: ["#1f2a6b", "#34389a", "#5b45b0", "#9a55a8", "#e0707a", "#ffad86"], sun: "#ffcf9e", amp: 0.07, tilt: -0.05, hero: "#ffffff" },
  lagoon:  { name: "Lagoon",  style: "waves", glass: "light", bg: "#eaf6f3", bands: ["#cdeee8", "#a3dfd9", "#6fc8c6", "#3aa9b0", "#178795", "#0c5f70"], sun: null, amp: 0.05, tilt: 0.04, hero: "#0c3f4a" },
  ember:   { name: "Ember",   style: "waves", glass: "dark",  bg: "#22081a", bands: ["#43102b", "#6f1736", "#a32437", "#d24d2f", "#f08a35", "#fbc65a"], sun: "#ffd27a", amp: 0.09, tilt: 0.03, hero: "#ffffff" },
  mist:    { name: "Mist",    style: "waves", glass: "light", bg: "#f4f2f8", bands: ["#e6e2f2", "#d4cdea", "#bdb3df", "#a397cf", "#8679bd", "#6b5ea6"], sun: null, amp: 0.06, tilt: -0.03, hero: "#2c2452" },
  aurora:  { name: "Aurora",  style: "waves", glass: "dark",  bg: "#04121c", bands: ["#062a3a", "#0a4150", "#0e5d63", "#147a70", "#1f9a7c", "#33b388"], sun: null, amp: 0.11, tilt: 0.06, hero: "#e9fff4" },
  lava:    { name: "Lava Lamp", style: "blobs", glass: "dark", bg: "#160433", colors: ["#ff4d6d", "#ff9e00", "#7b2cbf", "#3a0ca3", "#f72585"], hero: "#ffffff" },
  pastel:  { name: "Pastel",  style: "blobs", glass: "light", bg: "#fbf4ff", colors: ["#ffc8dd", "#bde0fe", "#cdb4db", "#a2d2ff", "#fff1a8"], hero: "#3d2c5c" },
  outrun:  { name: "Outrun",  style: "synth", glass: "dark",  bg: "#12002b", sky: ["#12002b", "#5a0f6e", "#ff2bd6"], sunA: "#ffe25c", sunB: "#ff2b8a", grid: "#ff2bd6", ground: "#0b0018", hero: "#fff2fb" },
  nebula:  { name: "Nebula",  style: "stars", glass: "dark",  bg: "#03010d", colors: ["#5b2a86", "#1b4b8f", "#a3195b"], hero: "#ffffff" },
  bauhaus: { name: "Bauhaus", style: "bauhaus", glass: "light", bg: "#f1e9d6", colors: ["#e63946", "#1d3557", "#f4a261", "#2a9d8f", "#111111"], hero: "#111111" },
  topo:    { name: "Topography", style: "contour", glass: "dark", bg: "#0d2520", line: "#3ddc97", hero: "#e8fff5" },
  acid:    { name: "Acid",    style: "plasma", glass: "dark",  bg: "#000000", hue: 280, hero: "#ffffff" },
  image:   { name: "Your image", style: "none", glass: "dark", bg: "#111", hero: "#ffffff" },
};
