/* IndexedDB for files the user adds (music, wallpapers): they survive restarts. */
const DB = "glassdesk", STORE = "files";
let dbp;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    if (!("indexedDB" in window)) return rej(new Error("no idb"));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const r = fn(t.objectStore(STORE)); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };
export const files = {
  put: rec => tx("readwrite", s => s.put(rec)).catch(() => null),
  get: id => tx("readonly", s => s.get(id)).catch(() => null),
  all: () => tx("readonly", s => s.getAll()).catch(() => []),
  del: id => tx("readwrite", s => s.delete(id)).catch(() => null),
};
