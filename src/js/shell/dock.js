/* Shortcut bar (hidden by default). Shortcuts can run built-in actions,
 * open web pages, folders, apps by URI, or Windows settings pages.
 * Modes: hidden, auto (slides up from the bottom edge), always. */
import { $, el } from "../core/util.js";
import { cfg, set } from "../core/settings.js";
import { bus } from "../core/bus.js";
import { press } from "../glass/motion.js";

export const GLYPHS = {
  gear: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  display: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18"/>',
  app: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 12h6M12 9v6"/>',
  music: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
};
export const ACTIONS = {
  settings: "Open Settings", cc: "Control Center", edit: "Customize this desktop", "next-wallpaper": "Next wallpaper", "play-pause": "Play / pause", "reset-layout": "Reset layout",
};
export const PRESETS = [
  ["Display settings", "uri", "ms-settings:display", "display"], ["Sound settings", "uri", "ms-settings:sound", "sliders"],
  ["Personalization", "uri", "ms-settings:personalization", "image"], ["Downloads folder", "folder", "%USERPROFILE%\\Downloads", "folder"],
  ["Spotify", "uri", "spotify:", "music"], ["Steam", "uri", "steam://open/main", "app"], ["Terminal", "uri", "wt:", "terminal"],
];

export function runShortcut(s, actions) {
  if (s.kind === "action") return actions[s.target] && actions[s.target]();
  let url = s.target.trim();
  if (s.kind === "folder" && !/^file:/i.test(url)) url = "file:///" + url.replace(/\\/g, "/");
  if (s.kind === "url" && !/^[a-z][a-z0-9+.-]*:/i.test(url)) url = "https://" + url;
  const a = document.createElement("a"); a.href = url; a.target = s.kind === "url" ? "_blank" : "_self"; a.rel = "noopener";
  try { a.click(); } catch { window.open(url, "_blank"); }
}

export function initDock(actions) {
  const dock = $("#dock"), row = dock.querySelector(".dock-row");
  function render() {
    dock.dataset.mode = cfg.dock.mode;
    dock.hidden = cfg.dock.mode === "hidden" || !cfg.dock.shortcuts.length;
    row.textContent = "";
    cfg.dock.shortcuts.forEach(s => {
      const b = el("button", "app"); b.title = s.name; b.setAttribute("aria-label", s.name);
      b.dataset.kind = s.kind;
      b.innerHTML = GLYPHS[s.icon] ? `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[s.icon]}</svg>` : `<b>${(s.name[0] || "?").toUpperCase()}</b>`;
      b.onclick = () => { press(b); runShortcut(s, actions); };
      row.append(b);
    });
  }
  /* auto mode: reveal at the bottom edge, hide only once the pointer has clearly left */
  let hideT = 0;
  addEventListener("pointermove", e => {
    if (cfg.dock.mode !== "auto") return;
    const shown = dock.classList.contains("revealed"), reach = innerHeight - dock.offsetHeight - 50;
    if (e.clientY > innerHeight - 12 || (shown && (e.clientY > reach || dock.matches(":hover")))) { clearTimeout(hideT); hideT = 0; if (!shown) dock.classList.add("revealed"); }
    else if (shown && !hideT) hideT = setTimeout(() => { hideT = 0; dock.classList.remove("revealed"); }, 450);
  }, { passive: true });
  /* magnify */
  let raf = 0, mx = null;
  dock.addEventListener("pointermove", e => { mx = e.clientX; if (!raf) raf = requestAnimationFrame(mag); });
  dock.addEventListener("pointerleave", () => { mx = null; if (!raf) raf = requestAnimationFrame(mag); });
  function mag() { raf = 0; row.querySelectorAll(".app").forEach(a => { if (mx == null) return a.style.setProperty("--mag", "1"); const r = a.getBoundingClientRect(), d = Math.abs(mx - (r.left + r.width / 2)); a.style.setProperty("--mag", (1 + 0.3 * Math.max(0, 1 - d / 120) ** 2).toFixed(3)); }); }
  bus.on("settings", ({ patch }) => { if (patch.dock) render(); });
  render();
  return { render };
}
