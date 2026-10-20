/* Weather from Open-Meteo (free, no key). When the network is blocked (for
 * example a sandboxed preview) the widget shows a clearly labelled sample. */
import { el } from "../core/util.js";
import { cfg } from "../core/settings.js";
import { fmtTime } from "../core/time.js";
import { bus } from "../core/bus.js";

const ICONS = {
  sun: '<circle cx="12" cy="12" r="5" fill="#ffd60a"/><g stroke="#ffd60a" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g>',
  moon: '<path d="M20 15.3A8.5 8.5 0 0 1 8.7 4a8.5 8.5 0 1 0 11.3 11.3Z" fill="#f2f2f7"/>',
  partly: '<circle cx="9" cy="9" r="4" fill="#ffd60a"/><path d="M8 20h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.6A2.9 2.9 0 0 0 8 20Z" fill="#f2f2f7" stroke="rgba(0,0,0,.08)"/>',
  cloud: '<path d="M7 19h10.5a4 4 0 0 0 0-8 6 6 0 0 0-11.4 1.8A3.2 3.2 0 0 0 7 19Z" fill="#e5e5ea" stroke="rgba(0,0,0,.08)"/>',
  fog: '<g stroke="#c7c7cc" stroke-width="2.2" stroke-linecap="round"><path d="M4 9h16M6 13h14M4 17h12"/></g>',
  rain: '<path d="M7 15h10.5a3.6 3.6 0 0 0 0-7.2 5.6 5.6 0 0 0-10.6 1.6A2.8 2.8 0 0 0 7 15Z" fill="#e5e5ea" stroke="rgba(0,0,0,.08)"/><g stroke="#40c8e0" stroke-width="2" stroke-linecap="round"><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/></g>',
  snow: '<path d="M7 15h10.5a3.6 3.6 0 0 0 0-7.2 5.6 5.6 0 0 0-10.6 1.6A2.8 2.8 0 0 0 7 15Z" fill="#e5e5ea" stroke="rgba(0,0,0,.08)"/><g fill="#8fd3ff"><circle cx="8.5" cy="19" r="1.2"/><circle cx="12.5" cy="20" r="1.2"/><circle cx="16.5" cy="19" r="1.2"/></g>',
  storm: '<path d="M7 14h10.5a3.6 3.6 0 0 0 0-7.2 5.6 5.6 0 0 0-10.6 1.6A2.8 2.8 0 0 0 7 14Z" fill="#c7c7cc"/><path d="M12.5 14l-2.5 4h3l-2 4" fill="none" stroke="#ffd60a" stroke-width="2" stroke-linejoin="round"/>',
};
const icon = (k, s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
export function codeInfo(code, day = true) {
  if (code === 0) return [day ? "sun" : "moon", "Clear"];
  if (code <= 2) return [day ? "partly" : "moon", code === 1 ? "Mostly Clear" : "Partly Cloudy"];
  if (code === 3) return ["cloud", "Cloudy"];
  if (code === 45 || code === 48) return ["fog", "Fog"];
  if (code >= 51 && code <= 67) return ["rain", code < 61 ? "Drizzle" : "Rain"];
  if (code >= 71 && code <= 77) return ["snow", "Snow"];
  if (code >= 80 && code <= 82) return ["rain", "Showers"];
  if (code >= 85 && code <= 86) return ["snow", "Snow Showers"];
  if (code >= 95) return ["storm", "Thunderstorms"];
  return ["cloud", "Cloudy"];
}

/** City search for Settings: [{name, latitude, longitude, label}] */
export async function searchCities(q) {
  const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8`).then(r => r.json());
  return (g.results || []).map(r => ({ name: r.name, latitude: r.latitude, longitude: r.longitude, label: [r.name, r.admin1, r.country_code].filter(Boolean).join(", ") }));
}
/** Approximate location from the network (no permission prompt; works in Wallpaper Engine). */
export async function locateByIP() {
  const r = await fetch("https://ipapi.co/json/").then(r => r.json());
  if (!r || !r.city) throw new Error("unknown");
  return { name: r.city, latitude: r.latitude, longitude: r.longitude, label: [r.city, r.region, r.country_code].filter(Boolean).join(", ") };
}

export function mountWeather(pane) {
  pane.innerHTML = `<div class="wx-top"><div><div class="wx-city"></div><div class="wx-temp num"></div></div>
    <div class="wx-cond"><span class="wx-icon"></span><span class="wx-label">Loading</span><div class="soft num wx-hilo"></div></div></div>
    <div class="wx-hours num"></div><div class="wx-note"></div>`;
  const q = s => pane.querySelector(s);
  let timer, last = null;
  const render = (d, live, reason) => {
    last = [d, live, reason];
    q(".wx-city").textContent = d.city; q(".wx-temp").textContent = Math.round(d.temp) + "°";
    const [ic, label] = codeInfo(d.code, d.isDay);
    q(".wx-icon").innerHTML = icon(ic, 30); q(".wx-label").textContent = label;
    q(".wx-hilo").textContent = `H:${Math.round(d.hi)}°  L:${Math.round(d.lo)}°`;
    const hrs = q(".wx-hours"); hrs.textContent = "";
    d.hours.slice(0, 6).forEach((h, i) => {
      const c = el("div");
      c.append(el("div", "soft", i === 0 ? "Now" : new Intl.DateTimeFormat(undefined, { hour: "numeric", hour12: !cfg.clock.h24 }).format(h.time)));
      const ico = el("div"); ico.innerHTML = icon(codeInfo(h.code, h.isDay)[0], 20); c.append(ico, el("div", null, Math.round(h.temp) + "°"));
      hrs.append(c);
    });
    const note = q(".wx-note");
    note.textContent = live ? `Updated ${fmtTime(new Date())} · Open-Meteo` : reason === "city" ? `Couldn’t find “${cfg.city}”. Pick a city in Settings › Weather. Showing a sample.` : "Sample forecast. Live weather can’t load right now (offline?). It retries every few minutes.";
    note.classList.toggle("warn", !live);
    bus.emit("weather", { temp: d.temp, code: d.code, isDay: d.isDay, live });
    bus.emit("layout");
  };
  const sample = () => {
    const now = new Date(), base = cfg.unit === "f" ? 61 : 16, isDay = t => t.getHours() > 6 && t.getHours() < 19;
    return { city: cfg.city, temp: base, code: 2, isDay: isDay(now), hi: base + 3, lo: base - 5,
      hours: [2, 2, 3, 61, 3, 1].map((c, i) => { const t = new Date(now.getTime() + i * 3600e3); return { time: t, temp: base + [0, 1, 1, -1, -2, -3][i], code: c, isDay: isDay(t) }; }) };
  };
  async function load() {
    clearTimeout(timer);
    let notFound = false;
    try {
      const ctl = new AbortController(); setTimeout(() => ctl.abort(), 7000);
      /* a city picked from search results carries its coordinates; a typed name is looked up */
      let p = cfg.geo && cfg.geo.name === cfg.city ? cfg.geo : null;
      if (!p) {
        const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cfg.city)}&count=1`, { signal: ctl.signal }).then(r => r.json());
        if (!g.results || !g.results.length) { notFound = true; throw new Error("No such city"); }
        p = { name: g.results[0].name, latitude: g.results[0].latitude, longitude: g.results[0].longitude };
      }
      const u = cfg.unit === "f" ? "&temperature_unit=fahrenheit" : "";
      const f = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&forecast_days=2&timezone=auto${u}`, { signal: ctl.signal }).then(r => r.json());
      let idx = f.hourly.time.findIndex(t => t.slice(0, 13) === f.current.time.slice(0, 13)); if (idx < 0) idx = 0;
      const hours = [0, 1, 2, 3, 4, 5].map(i => ({ time: new Date(Date.now() + i * 3600e3), temp: f.hourly.temperature_2m[idx + i], code: f.hourly.weather_code[idx + i], isDay: !!f.hourly.is_day[idx + i] }));
      render({ city: p.name, temp: f.current.temperature_2m, code: f.current.weather_code, isDay: !!f.current.is_day, hi: f.daily.temperature_2m_max[0], lo: f.daily.temperature_2m_min[0], hours }, true);
      timer = setTimeout(load, 15 * 60e3);
    } catch { render(sample(), false, notFound ? "city" : "net"); timer = setTimeout(load, 5 * 60e3); }
  }
  load();
  return { load, render: () => last && render(...last) };
}
