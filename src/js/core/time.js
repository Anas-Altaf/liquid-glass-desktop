/* Locale-aware time helpers that honour the 24-hour setting. */
import { cfg } from "./settings.js";
export const fmtTime = (d, opts = {}) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: !cfg.clock.h24, ...opts }).format(d);
export function timeParts(d) {
  const parts = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: !cfg.clock.h24 }).formatToParts(d);
  return { main: parts.filter(p => p.type !== "dayPeriod").map(p => p.value).join("").trim(), ap: (parts.find(p => p.type === "dayPeriod") || {}).value || "" };
}
export const longDate = d => new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(d);
