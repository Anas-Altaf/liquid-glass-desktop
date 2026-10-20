/* Wallpaper themes. "glass" picks the adaptive material: light glass gets dark ink. */
export const THEMES = {
  dusk:   { name: "Dusk",   glass: "dark",  bg: "#141a45", bands: ["#1f2a6b", "#34389a", "#5b45b0", "#9a55a8", "#e0707a", "#ffad86"], sun: "#ffcf9e", amp: 0.07, tilt: -0.05, hero: "#ffffff" },
  lagoon: { name: "Lagoon", glass: "light", bg: "#eaf6f3", bands: ["#cdeee8", "#a3dfd9", "#6fc8c6", "#3aa9b0", "#178795", "#0c5f70"], sun: null, amp: 0.05, tilt: 0.04, hero: "#0c3f4a" },
  ember:  { name: "Ember",  glass: "dark",  bg: "#22081a", bands: ["#43102b", "#6f1736", "#a32437", "#d24d2f", "#f08a35", "#fbc65a"], sun: "#ffd27a", amp: 0.09, tilt: 0.03, hero: "#ffffff" },
  mist:   { name: "Mist",   glass: "light", bg: "#f4f2f8", bands: ["#e6e2f2", "#d4cdea", "#bdb3df", "#a397cf", "#8679bd", "#6b5ea6"], sun: null, amp: 0.06, tilt: -0.03, hero: "#2c2452" },
  aurora: { name: "Aurora", glass: "dark",  bg: "#04121c", bands: ["#062a3a", "#0a4150", "#0e5d63", "#147a70", "#1f9a7c", "#33b388"], sun: null, amp: 0.11, tilt: 0.06, hero: "#e9fff4" },
  image:  { name: "Your image", glass: "dark", bg: "#111", bands: [], sun: null, amp: 0, tilt: 0, hero: "#ffffff" },
};
