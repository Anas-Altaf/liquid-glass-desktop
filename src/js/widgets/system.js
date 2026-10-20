import { el } from "../core/util.js";
import { bus } from "../core/bus.js";

export function mountSystem(pane) {
  pane.innerHTML = `<div class="w-title">System</div><div class="sys-grid num">
    <div class="sys-cell"><div class="sys-k">Battery</div><div class="sys-v" data-k="bat">Not reported</div></div>
    <div class="sys-cell"><div class="sys-k">Network</div><div class="sys-v" data-k="net">Online</div></div>
    <div class="sys-cell"><div class="sys-k">Display</div><div class="sys-v" data-k="disp">-</div></div>
    <div class="sys-cell"><div class="sys-k">Session</div><div class="sys-v" data-k="up">0 min</div></div></div>`;
  const v = k => pane.querySelector(`[data-k="${k}"]`);
  const net = () => { const c = navigator.connection; v("net").textContent = navigator.onLine ? (c && c.effectiveType ? `Online, ${c.effectiveType.toUpperCase()}` : "Online") : "Offline"; bus.emit("net", navigator.onLine); };
  addEventListener("online", net); addEventListener("offline", net); net();
  const disp = () => { v("disp").textContent = `${screen.width}×${screen.height}`; }; disp(); addEventListener("resize", disp);
  if (navigator.getBattery) navigator.getBattery().then(b => {
    const upd = () => { v("bat").textContent = `${Math.round(b.level * 100)}%${b.charging ? ", charging" : ""}`; bus.emit("battery", { level: b.level, charging: b.charging }); };
    upd(); b.addEventListener("levelchange", upd); b.addEventListener("chargingchange", upd);
  }).catch(() => {});
  return { minute() { v("up").textContent = `${Math.floor(performance.now() / 60000)} min`; } };
}
