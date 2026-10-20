/* Clock faces shared by the Clock card and the desktop clock:
 * digital, analog, minimal and stacked. Font, weight, numerals and the
 * blinking colon are per face; the time format is shared (core/time.js). */
import { el } from "../core/util.js";
import { cfg } from "../core/settings.js";
import { timeParts, longDate } from "../core/time.js";

export const CLOCK_STYLES = [["digital", "Digital"], ["analog", "Analog"], ["minimal", "Minimal"], ["stacked", "Stacked"], ["flip", "Flip"], ["words", "Words"], ["rings", "Rings"], ["outline", "Outline"], ["neon", "Neon"], ["lcd", "LCD"]];
export const CLOCK_FONTS = [["system", "System"], ["rounded", "Rounded"], ["serif", "Serif"], ["mono", "Mono"], ["condensed", "Condensed"], ["pixel", "Pixel"]];
/* styles that reuse the digital markup and differ only in CSS */
const DIGITAL = ["digital", "minimal", "outline", "neon", "lcd"];

const ONES = ["twelve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty"];
const num = n => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
/** "It's", "four", "fifty-two" (always in words, 12-hour) */
export function timeWords(d) {
  const h = d.getHours() % 12, m = d.getMinutes();
  return ["It’s", h === 0 ? "twelve" : ONES[h], m === 0 ? "o’clock" : m < 10 ? "oh " + ONES[m] : num(m)];
}
const ring = (r, cls) => { const C = 2 * Math.PI * r; return `<circle cx="60" cy="60" r="${r}" fill="none" class="rg-track" stroke-width="7"/><circle cx="60" cy="60" r="${r}" fill="none" class="rg ${cls}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" data-c="${C.toFixed(1)}" transform="rotate(-90 60 60)"/>`; };
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
    else if (o.style === "flip") host.innerHTML = `<div class="cf-flip num"><span class="fl" data-i="0"></span><span class="fl" data-i="1"></span><span class="fl-sep"></span><span class="fl" data-i="2"></span><span class="fl" data-i="3"></span><span class="fl-s"><span class="fl sm" data-i="4"></span><span class="fl sm" data-i="5"></span></span><span class="cf-ap"></span></div><div class="cf-date"></div>`;
    else if (o.style === "words") host.innerHTML = `<div class="cf-words"><span class="w0"></span><b class="w1"></b><span class="w2"></span></div><div class="cf-date"></div>`;
    else if (o.style === "rings") host.innerHTML = `<div class="cf-rings"><svg viewBox="0 0 120 120" aria-hidden="true">${ring(54, "rg-h")}${ring(44, "rg-m")}${ring(34, "rg-s")}</svg><div class="cf-time num"><span class="cf-hh"></span><span class="cf-colon"></span><span class="cf-mm"></span></div></div><div class="cf-date"></div>`;
    else if (o.style === "lcd") host.innerHTML = `<div class="cf-lcd"><div class="cf-time num cf-ghost" aria-hidden="true"></div><div class="cf-time num"><span class="cf-hh"></span><span class="cf-colon"></span><span class="cf-mm"></span><span class="cf-sec"></span><span class="cf-ap"></span></div></div><div class="cf-date"></div>`;
    else host.innerHTML = `<div class="cf-time num"><span class="cf-hh"></span><span class="cf-colon"></span><span class="cf-mm"></span><span class="cf-sec"></span><span class="cf-ap"></span></div><div class="cf-date"></div>`;
    built = `${o.style}|${o.size || ""}|${o.numerals || ""}`;
  }
  return {
    tick(now) {
      const o = getOpts();
      if (built !== `${o.style}|${o.size || ""}|${o.numerals || ""}`) build(o);
      host.className = `clockface cf-${o.style}${o.blink ? " blink" : ""}${DIGITAL.includes(o.style) ? " cf-digitalish" : ""}`;
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
      if (o.style === "words") {
        const [a, b, c] = timeWords(now); q(".w0").textContent = a; q(".w1").textContent = b; q(".w2").textContent = c;
        return;
      }
      if (o.style === "flip") {
        const digits = (t.h.padStart(2, "0") + t.m + t.s).split("");
        host.querySelectorAll(".fl").forEach(f => {
          const v = digits[+f.dataset.i];
          if (f.textContent !== v) { const first = !f.textContent; f.textContent = v; if (!first && !matchMedia("(prefers-reduced-motion: reduce)").matches) f.animate([{ transform: "perspective(400px) rotateX(-90deg)" }, { transform: "perspective(400px) rotateX(0)" }], { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }); }
        });
        q(".fl-sep").textContent = t.sep; q(".fl-s").hidden = !o.seconds; q(".cf-ap").textContent = t.ap; q(".cf-ap").hidden = !t.ap;
        return;
      }
      if (o.style === "rings") {
        const H = now.getHours() % 12 + now.getMinutes() / 60, Mi = now.getMinutes() + now.getSeconds() / 60, Se = now.getSeconds();
        [[".rg-h", H / 12], [".rg-m", Mi / 60], [".rg-s", Se / 60]].forEach(([sel, f]) => { const c = q(sel), C = +c.dataset.c; c.setAttribute("stroke-dashoffset", (C * (1 - f)).toFixed(1)); });
        q(".rg-s").style.display = o.seconds ? "" : "none"; host.querySelectorAll(".rg-track")[2].style.display = o.seconds ? "" : "none";
        q(".cf-hh").textContent = t.h; q(".cf-colon").textContent = t.sep; q(".cf-mm").textContent = t.m;
        return;
      }
      if (o.style === "lcd") q(".cf-ghost").textContent = `88${t.sep}88${o.seconds ? "88" : ""}`;
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
  const card = pane.parentElement, face = clockFace(host, cardClockOpts);
  const look = () => { card.style.setProperty("--cf-scale", cfg.clock.size); card.style.setProperty("--cf-align", cfg.clock.align); card.style.setProperty("--cf-justify", { left: "start", right: "end" }[cfg.clock.align] || "center"); };
  look();
  return { tick(now) { look(); face.tick(now); } };
}
