/* Wallpaper: animated themes, image, GIF, video, gradient or slideshow.
 * The glass refracts it live. Themes render every frame (time-based, so
 * motion stays fluid at any frame rate) at a reduced internal resolution. */
import { THEMES } from "./themes.js";

export function drawWaves(ctx, W, H, key, t = 0, energy = 0) {
  const w = THEMES[key] || THEMES.dusk;
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
    this.img.hidden = !(k === "image" || k === "slideshow"); this.img2.hidden = k !== "slideshow";
    this.video.hidden = k !== "video";
    if (k !== "video") { this.video.pause(); }
    [this.img, this.img2, this.video].forEach(e => e.style.objectFit = this.o.fit);
    this.root.style.background = k === "color" ? `linear-gradient(160deg, ${this.o.colorA}, ${this.o.colorB})` : "";
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
  draw() { if (this.o.kind === "theme") drawWaves(this.ctx, this.W, this.H, this.o.theme, this.t, this.energy); }
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
