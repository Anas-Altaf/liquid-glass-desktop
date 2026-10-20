/* Clock faces shared by the Clock card and the desktop clock:
 * digital, analog, minimal and stacked. */
import { el } from "../core/util.js";
import { cfg } from "../core/settings.js";
import { timeParts, longDate } from "../core/time.js";

function analogSVG(size) {
  let ticks = "";
  for (let i = 0; i < 60; i++) {
    const a = i * 6 * Math.PI / 180, major = i % 5 === 0, r1 = major ? 40 : 43, r2 = 46;
    ticks += `<line x1="${50 + Math.sin(a) * r1}" y1="${50 - Math.cos(a) * r1}" x2="${50 + Math.sin(a) * r2}" y2="${50 - Math.cos(a) * r2}" stroke="currentColor" stroke-opacity="${major ? 0.9 : 0.35}" stroke-width="${major ? 2.2 : 0.9}" stroke-linecap="round"/>`;
  }
  let nums = "";
  [12, 3, 6, 9].forEach((n, i) => { const a = i * 90 * Math.PI / 180; nums += `<text x="${50 + Math.sin(a) * 31}" y="${50 - Math.cos(a) * 31 + 4.2}" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">${n}</text>`; });
  return `<svg class="analog" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="50" cy="50" r="48" fill="var(--wash)" stroke="currentColor" stroke-opacity=".15"/>${ticks}${nums}
    <line class="h-h" x1="50" y1="54" x2="50" y2="27" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>
    <line class="h-m" x1="50" y1="56" x2="50" y2="14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <line class="h-s" x1="50" y1="60" x2="50" y2="10" stroke="#ff9f0a" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="2.6" fill="#ff9f0a" stroke="currentColor" stroke-width="1"/></svg>`;
}

/** Renders a face into host; returns {tick(now)}. o: {style, seconds, date, size} */
export function clockFace(host, getOpts) {
  let built = "";
  function build(o) {
    host.textContent = ""; host.className = `clockface cf-${o.style}`;
    if (o.style === "analog") { host.innerHTML = analogSVG(o.size || 140) + `<div class="cf-date"></div>`; }
    else if (o.style === "stacked") host.innerHTML = `<div class="cf-h num"></div><div class="cf-m num"></div><div class="cf-date"></div>`;
    else host.innerHTML = `<div class="cf-time num"></div><div class="cf-date"></div>`;
    built = o.style + (o.size || "");
  }
  return {
    tick(now) {
      const o = getOpts();
      if (built !== o.style + (o.size || "")) build(o);
      const d = host.querySelector(".cf-date"); d.hidden = !o.date; if (o.date) d.textContent = longDate(now);
      if (o.style === "analog") {
        const s = now.getSeconds(), m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
        host.querySelector(".h-h").setAttribute("transform", `rotate(${h * 30} 50 50)`);
        host.querySelector(".h-m").setAttribute("transform", `rotate(${m * 6} 50 50)`);
        const sh = host.querySelector(".h-s"); sh.style.display = o.seconds ? "" : "none"; sh.setAttribute("transform", `rotate(${s * 6} 50 50)`);
        return;
      }
      const { main, ap } = timeParts(now);
      if (o.style === "stacked") {
        const [hh, mm] = main.split(/[:.]/);
        host.querySelector(".cf-h").textContent = hh.padStart(2, "0"); host.querySelector(".cf-m").textContent = mm;
        return;
      }
      const t = host.querySelector(".cf-time"); t.textContent = main;
      if (o.seconds) t.append(el("span", "cf-sec", String(now.getSeconds()).padStart(2, "0")));
      if (ap) t.append(el("span", "cf-ap", ap));
    },
  };
}

export function mountClock(pane) {
  const host = el("div"); pane.append(host);
  return clockFace(host, () => ({ style: cfg.clock.style, seconds: cfg.clock.seconds, date: cfg.clock.date, size: 150 }));
}
