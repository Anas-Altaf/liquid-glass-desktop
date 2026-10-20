/* Wallpaper Engine bridge (installed on import so no early event is missed).
 * Docs: docs.wallpaperengine.io/en/web/api/propertylistener.html, /web/audio/media.html */
import { bus } from "../core/bus.js";

export const inWallpaperEngine = () => !!(window.wallpaperRegisterAudioListener || window.__weProps);
let queue = [], ready = false;
const dirs = {};
const send = (type, data) => ready ? bus.emit(type, data) : queue.push([type, data]);

window.wallpaperPropertyListener = {
  applyUserProperties(props) {
    window.__weProps = true;
    const out = {}; for (const [k, v] of Object.entries(props)) out[k] = v && typeof v === "object" && "value" in v ? v.value : v;
    send("we:props", out);
  },
  applyGeneralProperties(p) { if (p.fps) send("we:fps", p.fps); },
  setPaused(p) { send("we:paused", p); },
  userDirectoryFilesAddedOrChanged(name, list) { dirs[name] = [...new Set([...(dirs[name] || []), ...list])]; send("we:dir", { name, files: dirs[name] }); },
  userDirectoryFilesRemoved(name, list) { dirs[name] = (dirs[name] || []).filter(f => !list.includes(f)); send("we:dir", { name, files: dirs[name] }); },
};

export function startWallpaperEngine() {
  ready = true; queue.forEach(([t, d]) => bus.emit(t, d)); queue = [];
  const M = window;
  if (M.wallpaperRegisterAudioListener) M.wallpaperRegisterAudioListener(arr => bus.emit("we:audio", arr));
  if (M.wallpaperRegisterMediaPropertiesListener) {
    M.wallpaperRegisterMediaStatusListener && M.wallpaperRegisterMediaStatusListener(e => bus.emit("media:status", e.enabled));
    M.wallpaperRegisterMediaPropertiesListener(e => bus.emit("media:props", e));
    M.wallpaperRegisterMediaThumbnailListener && M.wallpaperRegisterMediaThumbnailListener(e => bus.emit("media:thumb", e));
    M.wallpaperRegisterMediaPlaybackListener && M.wallpaperRegisterMediaPlaybackListener(e => {
      const P = M.wallpaperMediaIntegration || {};
      bus.emit("media:state", e.state === P.PLAYBACK_PLAYING ? "playing" : e.state === P.PLAYBACK_PAUSED ? "paused" : "stopped");
    });
    M.wallpaperRegisterMediaTimelineListener && M.wallpaperRegisterMediaTimelineListener(e => bus.emit("media:timeline", e));
  }
}
