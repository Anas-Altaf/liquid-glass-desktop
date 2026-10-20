import { el } from "../core/util.js";
import { segmented } from "../components/segmented.js";

export function mountFocus(pane) {
  const C = 2 * Math.PI * 48;
  pane.innerHTML = `<div class="w-title">Focus Timer</div><div class="fc-body"><div class="fc-ring">
    <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden="true"><circle cx="55" cy="55" r="48" fill="none" stroke="var(--track-bg)" stroke-width="9"/><circle class="fc-arc" cx="55" cy="55" r="48" fill="none" stroke="#bf5af2" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
    <span class="t num" role="timer" aria-live="off"></span></div><div class="fc-btns"><button class="pill fc-start">Start</button><button class="pill fc-reset">Reset</button></div></div>`;
  const q = s => pane.querySelector(s);
  const s = { total: 1500, left: 1500, running: false, endAt: 0 };
  const seg = segmented({ label: "Session length", options: [["15", "15m"], ["25", "25m"], ["50", "50m"]], value: "25", onChange: v => { s.total = s.left = +v * 60; s.running = false; render(); } });
  q(".fc-btns").append(seg);
  function render() {
    q(".t").textContent = `${Math.floor(s.left / 60)}:${String(Math.floor(s.left % 60)).padStart(2, "0")}`;
    q(".fc-arc").setAttribute("stroke-dashoffset", String(C * (1 - s.left / s.total)));
    q(".fc-start").textContent = s.running ? "Pause" : s.left < s.total ? "Resume" : "Start";
  }
  function chime() {
    /* its own short-lived context, so a paused song doesn't resume with the chime */
    try { const c = new (window.AudioContext || window.webkitAudioContext)(); setTimeout(() => c.close(), 1500); [880, 1175, 1568].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.18; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.7); }); } catch {}
  }
  q(".fc-start").onclick = () => { if (s.running) s.running = false; else { s.running = true; s.endAt = Date.now() + s.left * 1000; } render(); };
  q(".fc-reset").onclick = () => { s.running = false; s.left = s.total; render(); };
  render();
  return { tick() { if (!s.running) return; s.left = Math.max(0, (s.endAt - Date.now()) / 1000); if (s.left <= 0) { s.running = false; chime(); s.left = s.total; } render(); } };
}
