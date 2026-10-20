/* Wallpaper library: images, GIFs and videos the user can pick in Settings.
 * In a browser they're added files kept in IndexedDB; in Wallpaper Engine
 * they come from the "Wallpapers folder" property (plus the single image and
 * video file properties). Slideshows cycle through every image in the library. */
import { files } from "../core/idb.js";
import { bus } from "../core/bus.js";

const urls = new Map();
const url = rec => { if (!urls.has(rec.id)) urls.set(rec.id, URL.createObjectURL(rec.blob)); return urls.get(rec.id); };
export const typeOf = (name, mime = "") => /gif$/i.test(mime) || /\.gif$/i.test(name) ? "gif" : /^video\//.test(mime) || /\.(mp4|webm|mov|m4v|ogv)$/i.test(name) ? "video" : "image";
const MEDIA_RE = /\.(jpe?g|png|webp|gif|bmp|avif|mp4|webm|mov|m4v|ogv)$/i;

/* local: [{id, url, type, name, source:"local"}]; we.folder: same shape, source "we" */
export const wpMedia = { local: [], we: { image: "", video: "", folder: [] } };

/** every item, newest local files first, then the Wallpaper Engine folder */
export function mediaItems(type) {
  const we = [];
  if (wpMedia.we.image) we.push({ id: "we:image", url: wpMedia.we.image, type: typeOf(wpMedia.we.image), name: "Image property", source: "we" });
  if (wpMedia.we.video) we.push({ id: "we:video", url: wpMedia.we.video, type: "video", name: "Video property", source: "we" });
  const all = [...wpMedia.local, ...we, ...wpMedia.we.folder];
  return type ? all.filter(i => type === "slides" ? i.type !== "video" : i.type === type) : all;
}
export const findMedia = id => mediaItems().find(i => i.id === id);

export async function loadWallpaperMedia() {
  const all = await files.all();
  /* wp:main and wp:slide:* are from earlier versions; they're library items now */
  wpMedia.local = all.filter(r => r.type === "wallpaper").sort((a, b) => b.added - a.added).map(r => ({ id: r.id, url: url(r), type: typeOf(r.name || "", r.mime), name: r.name || "File", source: "local" }));
  bus.emit("wallpaper:media");
}
export function setWEFolder(paths) {
  wpMedia.we.folder = paths.filter(p => MEDIA_RE.test(p)).map(p => ({ id: "we:" + p, url: "file:///" + p.replace(/\\/g, "/"), type: typeOf(p), name: p.split(/[\\/]/).pop(), source: "we" }));
  bus.emit("wallpaper:media");
}
/** add files to the library; returns the new items */
export async function addMedia(list) {
  const ids = [];
  for (const f of list) {
    if (!/^(image|video)\//.test(f.type) && !MEDIA_RE.test(f.name)) continue;
    const id = "wp:lib:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await files.put({ id, type: "wallpaper", mime: f.type, name: f.name, blob: f, added: Date.now() });
    ids.push(id);
  }
  await loadWallpaperMedia();
  return ids.map(findMedia).filter(Boolean);
}
export async function removeMedia(id) { await files.del(id); if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); } await loadWallpaperMedia(); }
