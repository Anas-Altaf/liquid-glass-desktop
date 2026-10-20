/* Locale-aware time helpers that honour the clock format settings. */
import { cfg } from "./settings.js";
export const fmtTime = (d, opts = {}) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: !cfg.clock.h24, ...opts }).format(d);
/** The clock time split for display: hours, minutes, seconds and the AM/PM mark. */
export function timeParts(d) {
  const parts = new Intl.DateTimeFormat(undefined, { hour: cfg.clock.leadingZero ? "2-digit" : "numeric", minute: "2-digit", second: "2-digit", hour12: !cfg.clock.h24 }).formatToParts(d);
  const v = t => (parts.find(p => p.type === t) || {}).value || "";
  let h = v("hour");
  /* some locales print midnight as 24 in 24-hour mode */
  if (cfg.clock.h24 && h === "24") h = "00";
  if (cfg.clock.leadingZero && h.length < 2) h = h.padStart(2, "0");
  const sep = (parts.find((p, i) => p.type === "literal" && parts[i - 1] && parts[i - 1].type === "hour") || {}).value || ":";
  return { h, m: v("minute"), s: v("second"), sep: sep.trim() || ":", ap: cfg.clock.ampm ? v("dayPeriod") : "" };
}
const DATE = {
  long: { weekday: "long", day: "numeric", month: "long" },
  medium: { weekday: "short", day: "numeric", month: "short" },
  short: { day: "numeric", month: "short" },
  numeric: { year: "numeric", month: "numeric", day: "numeric" },
  weekday: { weekday: "long" },
};
export const DATE_FORMATS = Object.keys(DATE);
export const longDate = (d, f = cfg.clock.dateFormat) => new Intl.DateTimeFormat(undefined, DATE[f] || DATE.long).format(d);
