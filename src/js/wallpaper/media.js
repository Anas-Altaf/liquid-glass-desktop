/* Wallpaper files the user picks (image, GIF, video, slideshow images), kept in IndexedDB. */
import { files } from "../core/idb.js";
import { bus } from "../core/bus.js";

const urls = new Map();
const url = rec => { if (!urls.has(rec.id)) urls.set(rec.id, URL.createObjectURL(rec.blob)); return urls.get(rec.id); };
export const wpMedia = { main: null, mainType: "", slides: [], we: { image: "", video: "", folder: [] } };

export async function loadWallpaperMedia() {
  const all = await files.all();
  const main = all.find(r => r.id === "wp:main");
  if (main) { wpMedia.main = url(main); wpMedia.mainType = main.mime || ""; }
  wpMedia.slides = all.filter(r => r.id.startsWith("wp:slide:")).sort((a, b) => a.added - b.added).map(url);
  bus.emit("wallpaper:media");
}
export async function setMainFile(f) {
  await files.put({ id: "wp:main", type: "wallpaper", mime: f.type, name: f.name, blob: f, added: Date.now() });
  urls.delete("wp:main"); await loadWallpaperMedia();
  return f.type.startsWith("video/") ? "video" : f.type === "image/gif" ? "gif" : "image";
}
export async function addSlides(list) {
  for (const f of list) if (f.type.startsWith("image/")) await files.put({ id: "wp:slide:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: "wallpaper", mime: f.type, name: f.name, blob: f, added: Date.now() });
  await loadWallpaperMedia();
}
export async function clearSlides() { for (const r of await files.all()) if (r.id.startsWith("wp:slide:")) await files.del(r.id); urls.clear(); await loadWallpaperMedia(); }
