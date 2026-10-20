/* Wallpaper: animated themes, image, GIF, video, gradient or slideshow.
 * The glass refracts it live. Themes render every frame (time-based, so
 * motion stays fluid at any frame rate) at a reduced internal resolution.
 * Each theme names a style: waves, blobs, synth, stars, bauhaus, contour, plasma. */
import { THEMES } from "./themes.js";
import { rng } from "../core/util.js";

const TAU = Math.PI * 2;
function waves(ctx, W, H, w, t, energy) {
  ctx.fillStyle = w.bg; ctx.fillRect(0, 0, W, H);
  if (w.sun) {
    ctx.fillStyle = w.sun; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(W * 0.66, H * (0.42 + Math.sin(t * 0.2) * 0.012), Math.min(W, H) * 0.16 * (1 + energy * 0.08), 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 1;
  }
  const step = Math.max(6, W / 120);
  w.bands.forEach((col, i) => {
    const base = H * (0.34 + i * 0.105), amp = H * w.amp * (1 - i * 0.08) * (1 + energy * 0.6);
    const f = 1.1 + i * 0.22, ph = i * 1.7 + t * (0.35 + i * 0.09) * (i % 2 ? -1 : 1);
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + step; x += step) {
      const u = x / W;
      ctx.lineTo(x, base + Math.sin(u * 6.2832 * f + ph) * amp + Math.sin(u * 16.65 + ph * 2) * amp * 0.22 + (x - W / 2) * w.tilt);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  });
}

/* soft colour fields drifting like a lava lamp / mesh gradient */
function blobs(ctx, W, H, w, t, energy) {
  ctx.fillStyle = w.bg; ctx.fillRect(0, 0, W, H);
  const m = Math.max(W, H), light = w.glass === "light";
  w.colors.forEach((c, i) => {
    const x = W * (0.5 + 0.38 * Math.sin(t * (0.11 + i * 0.03) + i * 2.1)), y = H * (0.5 + 0.36 * Math.cos(t * (0.09 + i * 0.025) + i * 1.3));
    const r = m * (0.34 + 0.08 * Math.sin(t * 0.2 + i) + energy * 0.08);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c); g.addColorStop(1, c + "00");
    ctx.globalAlpha = light ? 0.85 : 0.9; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  });
  ctx.globalAlpha = 1;
}

/* retro sunset over a scrolling neon grid */
function synth(ctx, W, H, w, t, energy) {
  const hz = H * 0.62, sky = ctx.createLinearGradient(0, 0, 0, hz);
  w.sky.forEach((c, i) => sky.addColorStop(i / (w.sky.length - 1), c));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz);
  const R = Math.min(W, H) * 0.24 * (1 + energy * 0.05), cx = W / 2, cy = hz - R * 0.32;
  const sun = ctx.createLinearGradient(0, cy - R, 0, cy + R); sun.addColorStop(0, w.sunA); sun.addColorStop(1, w.sunB);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  ctx.fillStyle = sun; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.fillStyle = w.sky[1];
  for (let i = 0; i < 7; i++) { const yy = cy + R * (0.05 + i * 0.14), hh = R * (0.02 + i * 0.016); ctx.fillRect(cx - R, yy, R * 2, hh); }
  ctx.restore();
  ctx.fillStyle = w.ground; ctx.fillRect(0, hz, W, H - hz);
  ctx.strokeStyle = w.grid; ctx.lineWidth = Math.max(1, H / 500); ctx.shadowColor = w.grid; ctx.shadowBlur = 8 + energy * 14;
  ctx.globalAlpha = 0.75 + energy * 0.25;
  ctx.beginPath();
  for (let i = -24; i <= 24; i++) { ctx.moveTo(cx + i * W * 0.012, hz); ctx.lineTo(cx + i * W * 0.11, H); }
  const N = 14, ph = (t * 0.6) % 1;
  for (let k = 0; k < N; k++) { const f = (k + ph) / N, y = hz + (H - hz) * f * f; ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.moveTo(0, hz); ctx.lineTo(W, hz);
  ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

/* nebula clouds and twinkling stars */
const starCache = new Map();
function stars(ctx, W, H, w, t, energy) {
  ctx.fillStyle = w.bg; ctx.fillRect(0, 0, W, H);
  const m = Math.max(W, H);
  w.colors.forEach((c, i) => {
    const x = W * (0.3 + 0.4 * ((i * 0.37) % 1) + 0.04 * Math.sin(t * 0.05 + i)), y = H * (0.3 + 0.4 * ((i * 0.61) % 1) + 0.04 * Math.cos(t * 0.04 + i));
    const g = ctx.createRadialGradient(x, y, 0, x, y, m * 0.45); g.addColorStop(0, c + "aa"); g.addColorStop(1, c + "00");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  });
  const key = 260; if (!starCache.has(key)) { const r = rng(42); starCache.set(key, [...Array(key)].map(() => [r(), r(), r(), r() * TAU])); }
  ctx.fillStyle = "#fff";
  starCache.get(key).forEach(([x, y, z, p]) => {
    const px = ((x + t * 0.004 * (0.3 + z)) % 1) * W, py = y * H;
    ctx.globalAlpha = Math.min(1, (0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + z) + p))) * (0.5 + z * 0.5) + energy * 0.3);
    ctx.fillRect(px, py, 0.6 + z * 1.6, 0.6 + z * 1.6);
  });
  ctx.globalAlpha = 1;
}

/* flat geometric shapes that turn slowly on a grid */
function bauhaus(ctx, W, H, w, t, energy) {
  ctx.fillStyle = w.bg; ctx.fillRect(0, 0, W, H);
  const cols = W > H ? 5 : 3, rows = Math.ceil(H / (W / cols)), s = W / cols, r = rng(7);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const kind = Math.floor(r() * 5), c = w.colors[Math.floor(r() * w.colors.length)], c2 = w.colors[Math.floor(r() * w.colors.length)], dir = r() < 0.5 ? -1 : 1;
    const x = i * s + s / 2, y = j * s + s / 2, rot = Math.round(r() * 4) * Math.PI / 2 + Math.sin(t * 0.25 + i + j) * 0.5 * dir;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1 + energy * 0.06, 1 + energy * 0.06); ctx.fillStyle = c;
    const h = s * 0.42;
    if (kind === 0) { ctx.beginPath(); ctx.arc(0, 0, h, 0, TAU); ctx.fill(); ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(0, 0, h * 0.45, 0, TAU); ctx.fill(); }
    else if (kind === 1) { ctx.beginPath(); ctx.arc(0, h * 0.4, h, Math.PI, TAU); ctx.fill(); }
    else if (kind === 2) { ctx.beginPath(); ctx.moveTo(-h, -h); ctx.arc(-h, -h, h * 2, 0, Math.PI / 2); ctx.closePath(); ctx.fill(); }
    else if (kind === 3) { ctx.fillRect(-h, -h * 0.35, h * 2, h * 0.7); ctx.fillStyle = c2; ctx.fillRect(-h * 0.35, -h, h * 0.7, h * 2); }
    else { ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(h, h); ctx.lineTo(-h, h); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
}

/* topographic contour lines that breathe */
function contour(ctx, W, H, w, t, energy) {
  ctx.fillStyle = w.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = w.line; ctx.lineWidth = Math.max(1, H / 700);
  const m = Math.max(W, H), centers = [[0.28, 0.4, 1], [0.76, 0.66, 1.4]];
  centers.forEach(([cx, cy, k], ci) => {
    for (let ring = 1; ring <= 18; ring++) {
      const base = ring * m * 0.03 * k;
      ctx.globalAlpha = (0.15 + 0.5 * (1 - ring / 18)) * (0.8 + energy * 0.4);
      ctx.beginPath();
      for (let a = 0; a <= 96; a++) {
        const ang = a / 96 * TAU, rr = base * (1 + 0.13 * Math.sin(ang * 3 + t * 0.3 + ring * 0.35 + ci) + 0.06 * Math.sin(ang * 7 - t * 0.22 + ring * 0.2));
        const x = cx * W + Math.cos(ang) * rr, y = cy * H + Math.sin(ang) * rr * 0.8;
        a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  });
  ctx.globalAlpha = 1;
}

/* psychedelic plasma, computed small and scaled up */
const plasmaCv = typeof document !== "undefined" ? document.createElement("canvas") : null;
function plasma(ctx, W, H, w, t, energy) {
  const pw = 96, ph = Math.max(24, Math.round(96 * H / W)); plasmaCv.width = pw; plasmaCv.height = ph;
  const p = plasmaCv.getContext("2d"), img = p.createImageData(pw, ph), d = img.data;
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const v = Math.sin(x * 0.07 + t) + Math.sin(y * 0.09 - t * 0.7) + Math.sin((x + y) * 0.05 + t * 0.5) + Math.sin(Math.hypot(x - pw / 2, y - ph / 2) * 0.12 - t);
    const hue = (w.hue + v * 50 + t * 12) % 360, l = 0.45 + 0.1 * Math.sin(v * 2) + energy * 0.08;
    const [r, g, b] = hsl(hue / 360, 0.85, l), i = (y * pw + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  p.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(plasmaCv, 0, 0, W, H);
}
function hsl(h, s, l) {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p); };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

/** CSS background for the Gradient wallpaper: linear, radial, mesh or conic */
export function gradient({ colorA: a, colorB: b, gradStyle = "linear", gradAngle = 160, gradFlow = false }) {
  if (gradStyle === "radial") return `radial-gradient(circle at 30% 25%, ${a}, ${b} 75%)`;
  if (gradStyle === "conic") return `conic-gradient(from ${gradAngle}deg at 50% 50%, ${a}, ${b}, ${a})`;
  if (gradStyle === "mesh") return `radial-gradient(at 15% 20%, ${a} 0, transparent 55%), radial-gradient(at 85% 15%, ${b} 0, transparent 50%), radial-gradient(at 70% 85%, ${a} 0, transparent 55%), radial-gradient(at 20% 90%, ${b} 0, transparent 55%), linear-gradient(${gradAngle}deg, ${a}, ${b})`;
  return `linear-gradient(${gradAngle}deg, ${a}, ${b}${gradFlow ? ", " + a : ""})`;
}
const STYLES = { waves, blobs, synth, stars, bauhaus, contour, plasma };
export function drawTheme(ctx, W, H, key, t = 0, energy = 0) {
  const w = THEMES[key] || THEMES.dusk;
  (STYLES[w.style] || waves)(ctx, W, H, w, t, energy);
}
export const drawWaves = drawTheme;

export class Wallpaper {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector("#wallpaper"); this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.img = root.querySelector("#wpImage"); this.img2 = root.querySelector("#wpImage2"); this.video = root.querySelector("#wpVideo");
    this.o = { kind: "theme", theme: "dusk", motion: true, speed: 1, fps: 60, colorA: "#1f2a6b", colorB: "#e0707a", fit: "cover", slideEvery: 60 };
    this.t = 0; this.last = 0; this.energy = 0; this.target = 0; this.paused = false; this.slides = []; this.slideIdx = 0; this.slideTimer = 0;
    this.resize(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  resize() {
    const scale = Math.min(1.25, devicePixelRatio || 1) * 0.8;
    this.W = innerWidth; this.H = innerHeight;
    this.canvas.width = Math.round(this.W * scale); this.canvas.height = Math.round(this.H * scale);
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.draw();
  }
  set(o) {
    Object.assign(this.o, o);
    const k = this.o.kind;
    this.canvas.hidden = k !== "theme";
    this.img.hidden = !(k === "image" || k === "gif" || k === "slideshow"); this.img2.hidden = k !== "slideshow";
    this.video.hidden = k !== "video";
    if (k !== "video") { this.video.pause(); }
    [this.img, this.img2, this.video].forEach(e => e.style.objectFit = this.o.fit);
    this.root.style.background = k === "color" ? gradient(this.o) : "";
    this.root.classList.toggle("flow", k === "color" && !!this.o.gradFlow && this.o.motion !== false);
    clearInterval(this.slideTimer);
    if (k === "slideshow" && this.slides.length > 1) this.slideTimer = setInterval(() => this.nextSlide(), Math.max(5, this.o.slideEvery) * 1000);
    this.draw();
  }
  media(kind, src) {
    if (kind === "video") { if (this.video.src !== src) { this.video.src = src; } this.video.play().catch(() => {}); }
    else if (src) { this.img.src = src; }
  }
  setSlides(list) { this.slides = list; this.slideIdx = 0; if (list[0]) this.img.src = list[0]; this.set({}); }
  nextSlide() {
    if (!this.slides.length) return;
    this.slideIdx = (this.slideIdx + 1) % this.slides.length;
    const [a, b] = [this.img, this.img2];
    b.src = this.slides[this.slideIdx]; b.style.opacity = "0"; b.hidden = false;
    b.onload = () => { b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1200, fill: "forwards" }).finished.then(() => { a.src = b.src; b.style.opacity = "0"; b.getAnimations().forEach(x => x.cancel()); }); };
  }
  audio(level) { this.target = level; }
  draw() { if (this.o.kind === "theme") drawTheme(this.ctx, this.W, this.H, this.o.theme, this.t, this.energy); }
  loop(now) {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
    if (this.paused || document.hidden || this.o.kind !== "theme") { this.last = now; return; }
    const min = 1000 / Math.max(10, this.o.fps) - 2;
    if (now - this.last < min) return;
    this.last = now;
    const moving = this.o.motion;
    this.energy += (this.target - this.energy) * 0.18;
    if (!moving && Math.abs(this.target - this.energy) < 0.003) return;
    if (moving) this.t += dt * 0.25 * this.o.speed;
    this.draw();
  }
}
