import { el } from "../core/util.js";
import { bus } from "../core/bus.js";
import { cfg } from "../core/settings.js";

const chevron = d => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

export function mountCalendar(pane) {
  const now0 = new Date(), view = { y: now0.getFullYear(), m: now0.getMonth() };
  const head = el("div", "cal-head"), month = el("div", "cal-month");
  const prev = el("button", "icon-btn"); prev.setAttribute("aria-label", "Previous month"); prev.innerHTML = chevron("M15 5l-7 7 7 7");
  const next = el("button", "icon-btn"); next.setAttribute("aria-label", "Next month"); next.innerHTML = chevron("M9 5l7 7-7 7");
  const grid = el("div", "cal-grid num");
  head.append(month, prev, next); pane.append(head, grid);
  const render = () => {
    const now = new Date(), { y, m } = view, first = new Date(y, m, 1);
    const ws = cfg.calendar.weekStart || 0, start = (first.getDay() - ws + 7) % 7, days = new Date(y, m + 1, 0).getDate(), prevDays = new Date(y, m, 0).getDate();
    month.textContent = "";
    month.append(el("b", null, new Intl.DateTimeFormat(undefined, { month: "long" }).format(first)), y !== now.getFullYear() ? ` ${y}` : "");
    grid.textContent = "";
    const dow = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });
    for (let i = 0; i < 7; i++) grid.append(el("div", "dow", dow.format(new Date(2024, 8, 1 + ((i + ws) % 7)))));
    const cells = Math.ceil((start + days) / 7) * 7;
    for (let i = 0; i < cells; i++) {
      let day, out = false;
      if (i < start) { day = prevDays - start + i + 1; out = true; } else if (i >= start + days) { day = i - start - days + 1; out = true; } else day = i - start + 1;
      const c = el("div", "d" + (out ? " out" : "") + ([0, 6].includes((i + ws) % 7) ? " wknd" : ""), day);
      if (!out && y === now.getFullYear() && m === now.getMonth() && day === now.getDate()) { c.classList.add("today"); c.setAttribute("aria-current", "date"); }
      grid.append(c);
    }
    bus.emit("layout");
  };
  prev.onclick = () => { view.m--; if (view.m < 0) { view.m = 11; view.y--; } render(); };
  next.onclick = () => { view.m++; if (view.m > 11) { view.m = 0; view.y++; } render(); };
  render();
  /* only redraw when the date changes, not every minute */
  let day = now0.toDateString();
  return { render, minute() { const d = new Date().toDateString(); if (d !== day) { day = d; render(); } } };
}
