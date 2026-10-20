/* Clock faces shared by the Clock card and the desktop clock:
 * digital, analog, minimal and stacked. Font, weight, numerals and the
 * blinking colon are per face; the time format is shared (core/time.js). */
import { el } from "../core/util.js";
import { cfg } from "../core/settings.js";
import { timeParts, longDate } from "../core/time.js";

export const CLOCK_STYLES = [["digital", "Digital"], ["analog", "Analog"], ["minimal", "Minimal"], ["stacked", "Stacked"]];
export const CLOCK_FONTS = [["system", "System"], ["rounded", "Rounded"], ["serif", "Serif"], ["mono", "Mono"], ["condensed", "Condensed"]];
export const CLOCK_WEIGHTS = [["auto", "Auto"], ["300", "Light"], ["500", "Medium"], ["700", "Bold"], ["800", "Heavy"]];
export const CLOCK_NUMERALS = [["four", "12 · 3 · 6 · 9"], ["all", "All"], ["none", "None"]];

function analogSVG(size, numerals) {
  let ticks = "";
  for (let i = 0; i < 60; i++) {
    const a = i * 6 * Math.PI / 180, major = i % 5 === 0, r1 = major ? 40 : 43, r2 = 46;
    ticks += `<line x1="${50 + Math.sin(a) * r1}" y1="${50 - Math.cos(a) * r1}" x2="${50 + Math.sin(a) * r2}" y2="${50 - Math.cos(a) * r2}" stroke="currentColor" stroke-opacity="${major ? 0.9 : 0.35}" class="${major ? "tk-major" : "tk-minor"}" stroke-linecap="round"/>`;
  }
  const list = numerals === "all" ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : numerals === "none" ? [] : [12, 3, 6, 9];
  let nums = "";
  list.forEach(n => { const a = (n % 12) * 30 * Math.PI / 180, r = numerals === "all" ? 32 : 31; nums += `<text x="${50 + Math.sin(a) * r}" y="${50 - Math.cos(a) * r + 4.2}" text-anchor="middle" font-size="${numerals === "all" ? 10 : 12}" fill="currentColor">${n}</text>`; });
  return `<svg class="analog" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="50" cy="50" r="48" fill="var(--wash)" stroke="currentColor" stroke-opacity=".15"/>${ticks}${nums}
    <line class="h-h" x1="50" y1="54" x2="50" y2="27" stroke="currentColor" stroke-linecap="round"/>
    <line class="h-m" x1="50" y1="56" x2="50" y2="14" stroke="currentColor" stroke-linecap="round"/>
    <line class="h-s" x1="50" y1="60" x2="50" y2="10" stroke="#ff9f0a" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="2.6" fill="#ff9f0a" stroke="currentColor" stroke-width="1"/></svg>`;
}

/** Renders a face into host; returns {tick(now)}.
 * o: {style, seconds, date, size, font, weight, numerals, blink} */
export function clockFace(host, getOpts) {
  let built = "";
  const q = s => host.querySelector(s);
  function build(o) {
    host.textContent = "";
    if (o.style === "analog") host.innerHTML = analogSVG(o.size || 140, o.numerals) + `<div class="cf-date"></div>`;
    else if (o.style === "stacked") host.innerHTML = `<div class="cf-h num"></div><div class="cf-m num"><span class="cf-mm"></span><span class="cf-ap"></span></div><div class="cf-s num"></div><div class="cf-date"></div>`;
    else host.innerHTML = `<div class="cf-time num"><span class="cf-hh"></span><span class="cf-colon"></span><span class="cf-mm"></span><span class="cf-sec"></span><span class="cf-ap"></span></div><div class="cf-date"></div>`;
    built = `${o.style}|${o.size || ""}|${o.numerals || ""}`;
  }
  return {
    tick(now) {
      const o = getOpts();
      if (built !== `${o.style}|${o.size || ""}|${o.numerals || ""}`) build(o);
      host.className = `clockface cf-${o.style}${o.blink ? " blink" : ""}`;
      host.dataset.font = o.font || "system";
      const w = o.weight && o.weight !== "auto" ? +o.weight : 0;
      if (w) { host.style.setProperty("--cf-weight", w); host.style.setProperty("--cf-wf", (w / 600).toFixed(2)); }
      else { host.style.removeProperty("--cf-weight"); host.style.removeProperty("--cf-wf"); }
      const d = q(".cf-date"); d.hidden = !o.date; if (o.date) d.textContent = longDate(now);
      if (o.style === "analog") {
        const s = now.getSeconds(), m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
        q(".h-h").setAttribute("transform", `rotate(${h * 30} 50 50)`);
        q(".h-m").setAttribute("transform", `rotate(${m * 6} 50 50)`);
        const sh = q(".h-s"); sh.style.display = o.seconds ? "" : "none"; sh.setAttribute("transform", `rotate(${s * 6} 50 50)`);
        return;
      }
      const t = timeParts(now);
      if (o.style === "stacked") {
        q(".cf-h").textContent = t.h.padStart(2, "0"); q(".cf-mm").textContent = t.m;
        q(".cf-ap").textContent = t.ap; q(".cf-ap").hidden = !t.ap;
        q(".cf-s").textContent = t.s; q(".cf-s").hidden = !o.seconds;
        return;
      }
      q(".cf-hh").textContent = t.h; q(".cf-colon").textContent = t.sep; q(".cf-mm").textContent = t.m;
      q(".cf-sec").textContent = t.s; q(".cf-sec").hidden = !o.seconds;
      q(".cf-ap").textContent = t.ap; q(".cf-ap").hidden = !t.ap;
    },
  };
}

export const cardClockOpts = () => ({ style: cfg.clock.style, seconds: cfg.clock.seconds, date: cfg.clock.date, size: Math.round(150 * cfg.clock.size), font: cfg.clock.font, weight: cfg.clock.weight, numerals: cfg.clock.numerals, blink: cfg.clock.blink });
export const heroClockOpts = () => ({ style: cfg.hero.style, seconds: cfg.hero.seconds, date: cfg.hero.date, size: Math.round(260 * cfg.hero.size), font: cfg.hero.font, weight: cfg.hero.weight, numerals: cfg.hero.numerals, blink: cfg.clock.blink });

export function mountClock(pane) {
  const host = el("div"); pane.append(host);
  pane.parentElement.style.setProperty("--cf-scale", cfg.clock.size);
  const face = clockFace(host, cardClockOpts);
  return { tick(now) { pane.parentElement.style.setProperty("--cf-scale", cfg.clock.size); face.tick(now); } };
}
