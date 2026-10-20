/* localStorage wrapper. Storage can be unavailable (private mode, some embeds), so every call is guarded. */
const PREFIX = "glassdesk:";
export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(PREFIX + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {} },
};
