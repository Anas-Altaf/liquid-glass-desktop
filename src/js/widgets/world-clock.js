import { el } from "../core/util.js";
import { cfg } from "../core/settings.js";
import { fmtTime } from "../core/time.js";

export const ZONES = [
  ["Pacific/Honolulu", "Honolulu"], ["America/Los_Angeles", "Los Angeles"], ["America/Denver", "Denver"], ["America/Chicago", "Chicago"], ["America/Mexico_City", "Mexico City"],
  ["America/New_York", "New York"], ["America/Toronto", "Toronto"], ["America/Sao_Paulo", "São Paulo"], ["Europe/London", "London"], ["Europe/Lisbon", "Lisbon"],
  ["Europe/Paris", "Paris"], ["Europe/Berlin", "Berlin"], ["Europe/Madrid", "Madrid"], ["Europe/Rome", "Rome"], ["Africa/Cairo", "Cairo"], ["Africa/Lagos", "Lagos"],
  ["Africa/Johannesburg", "Johannesburg"], ["Europe/Istanbul", "Istanbul"], ["Europe/Moscow", "Moscow"], ["Asia/Riyadh", "Riyadh"], ["Asia/Dubai", "Dubai"],
  ["Asia/Karachi", "Karachi"], ["Asia/Kolkata", "Kolkata"], ["Asia/Dhaka", "Dhaka"], ["Asia/Bangkok", "Bangkok"], ["Asia/Singapore", "Singapore"], ["Asia/Shanghai", "Shanghai"],
  ["Asia/Hong_Kong", "Hong Kong"], ["Asia/Seoul", "Seoul"], ["Asia/Tokyo", "Tokyo"], ["Australia/Sydney", "Sydney"], ["Pacific/Auckland", "Auckland"],
];
const nameOf = tz => (ZONES.find(z => z[0] === tz) || [0, tz.split("/").pop().replace(/_/g, " ")])[1];

function offsetMinutes(tz, now) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }).formatToParts(now);
  const g = t => +p.find(x => x.type === t).value;
  const asUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"));
  return Math.round((asUTC - (now.getTime() - now.getSeconds() * 1000 - now.getMilliseconds())) / 60000);
}

export function mountWorld(pane) {
  pane.append(el("div", "w-title", "World Clock"));
  const list = el("div"); pane.append(list);
  const render = () => {
    const now = new Date(), local = -now.getTimezoneOffset();
    list.textContent = "";
    if (!cfg.cities.length) { list.append(el("div", "empty", "No cities yet. Pick some in Settings › Clock.")); return; }
    cfg.cities.forEach(tz => {
      let off; try { off = offsetMinutes(tz, now); } catch { return; }
      const diff = (off - local) / 60;
      const day = +new Intl.DateTimeFormat("en-CA", { timeZone: tz, day: "numeric" }).format(now) - now.getDate();
      const row = el("div", "wc-row"), left = el("div");
      left.append(el("div", "wc-city", nameOf(tz)), el("div", "wc-off", `${day > 0 ? "Tomorrow" : day < 0 ? "Yesterday" : "Today"}, ${diff === 0 ? "same time" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} h`}`));
      row.append(left, el("div", "wc-time num", fmtTime(now, { timeZone: tz })));
      list.append(row);
    });
  };
  render();
  return { minute: render, render };
}
