/* Procedural cover art painted on canvas. */
import { rng } from "../core/util.js";
/* =========================================================
   Cover art
   ========================================================= */
function fitFont(ctx, text, maxW, maxSize, weight = 800) {
  let size = maxSize;
  ctx.font = `${weight} ${size}px Unbounded, "Arial Black", sans-serif`;
  const w = ctx.measureText(text).width;
  if (w > maxW) size = Math.floor(size * maxW / w);
  ctx.font = `${weight} ${size}px Unbounded, "Arial Black", sans-serif`;
  return size;
}
function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }

// layout: where the big album title sits, kept clear of the panes on wide screens
function titleBox(W, H) {
  const wide = W > 900;
  return wide
    ? { x: W * 0.045, y: H * 0.17, w: Math.min(W - 460, W * 0.6), size: H * 0.2 }
    : { x: W * 0.06, y: H * 0.14, w: W * 0.88, size: H * 0.13 };
}
function drawTitle(ctx, W, H, text, color) {
  const box = titleBox(W, H);
  const size = fitFont(ctx, text, box.w, box.size);
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.fillText(text, box.x, box.y);
  return size;
}

const ART = {
  salt(ctx, W, H, t, title) {
    const m = Math.min(W, H), p = t.pal;
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
    const sx = W * (W > 900 ? 0.58 : 0.62), sy = H * 0.5, sr = m * 0.26;
    circle(ctx, sx, sy, sr, p.a);
    const sea = H * 0.6;
    ctx.fillStyle = p.bg; ctx.fillRect(0, sea, W, H - sea);
    let y = sea, i = 0;
    while (y < H) {
      const th = m * (0.006 + i * 0.0042), gap = th * 0.8;
      ctx.fillStyle = p.b; ctx.fillRect(0, y, W, th);
      const rw = sr * 1.6 * Math.max(0.12, 1 - i * 0.075);
      ctx.fillStyle = p.a; ctx.fillRect(sx - rw / 2, y + th, rw, gap);
      y += th + gap; i++;
    }
    if (title) drawTitle(ctx, W, H, t.album, p.b);
  },
  lanterns(ctx, W, H, t, title) {
    const m = Math.min(W, H), p = t.pal;
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
    const cell = Math.max(m * 0.15, 18), cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
    const r = rng(7);
    const colors = [p.a, p.b, p.c];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const cx = i * cell + (j % 2 ? cell / 2 : 0), cy = j * cell + cell * 0.5;
      const k = r(), rad = cell * (0.14 + 0.26 * k);
      ctx.strokeStyle = "rgba(247,230,210,0.35)"; ctx.lineWidth = Math.max(1, cell * 0.012);
      ctx.beginPath(); ctx.moveTo(cx, cy - cell * 0.5); ctx.lineTo(cx, cy - rad); ctx.stroke();
      circle(ctx, cx, cy, rad, colors[Math.floor(r() * 3)]);
    }
    if (title) {
      const box = titleBox(W, H);
      const size = fitFont(ctx, t.album, box.w, box.size);
      ctx.fillStyle = p.bg; ctx.fillRect(box.x - size * 0.25, box.y - size * 0.18, ctx.measureText(t.album).width + size * 0.5, size * 1.32);
      drawTitle(ctx, W, H, t.album, p.c);
    }
  },
  orbit(ctx, W, H, t, title) {
    const m = Math.min(W, H), p = t.pal;
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.42);
    const d = Math.hypot(W, H), step = m * 0.07;
    ctx.fillStyle = "rgba(158,240,220,0.55)";
    for (let x = -d; x < d; x += step) ctx.fillRect(x, -d, Math.max(1, m * 0.012), d * 2);
    ctx.restore();
    const px = W * (W > 900 ? 0.56 : 0.6), py = H * 0.6, pr = m * 0.27;
    const ring = (front) => {
      ctx.save(); ctx.translate(px, py); ctx.rotate(-0.28);
      ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.strokeStyle = p.b; ctx.lineWidth = m * 0.03; ctx.stroke(); ctx.restore();
    };
    ring(false);
    circle(ctx, px, py, pr, p.a);
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.clip();
    circle(ctx, px + pr * 0.55, py + pr * 0.2, pr, p.c); ctx.restore();
    ring(true);
    if (title) drawTitle(ctx, W, H, t.album, p.b);
  },
  ostia(ctx, W, H, t, title) {
    const m = Math.min(W, H), p = t.pal;
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
    const s = Math.max(m * 0.065, 8), top = H * 0.58, rows = 3;
    for (let j = 0; j < rows; j++) for (let i = 0; i * s < W; i++) {
      if ((i + j) % 2 === 0) { ctx.fillStyle = p.a; ctx.fillRect(i * s, top + j * s, s, s); }
    }
    ctx.fillStyle = p.b; ctx.fillRect(0, top + rows * s + s * 0.5, W, s * 0.35);
    ctx.fillStyle = p.b; ctx.textBaseline = "alphabetic";
    ctx.font = `800 ${H * 1.05}px Unbounded, "Arial Black", sans-serif`;
    ctx.fillText("7", W * (W > 900 ? 0.5 : 0.52), H * 0.98);
    if (title) drawTitle(ctx, W, H, t.album, p.c);
  },
  glasshouse(ctx, W, H, t, title) {
    const m = Math.min(W, H), p = t.pal;
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
    const n = W > 900 ? 7 : 4, w = W / n, base = H, archH = H * 0.6;
    const cols = [p.a, p.b, p.c];
    for (let i = 0; i < n; i++) {
      const x = i * w, r = w * 0.42, cx = x + w / 2, topY = base - archH;
      ctx.fillStyle = cols[i % 3];
      ctx.beginPath(); ctx.moveTo(cx - r, base); ctx.lineTo(cx - r, topY + r); ctx.arc(cx, topY + r, r, Math.PI, 0); ctx.lineTo(cx + r, base); ctx.closePath(); ctx.fill();
      const r2 = r * 0.55;
      ctx.fillStyle = p.bg;
      ctx.beginPath(); ctx.moveTo(cx - r2, base); ctx.lineTo(cx - r2, topY + r + r * 0.5); ctx.arc(cx, topY + r + r * 0.5, r2, Math.PI, 0); ctx.lineTo(cx + r2, base); ctx.closePath(); ctx.fill();
    }
    if (title) drawTitle(ctx, W, H, t.album, p.a);
  },
  signal(ctx, W, H, t, title) {
    const m = Math.min(W, H), p = t.pal;
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
    const rings = (cx, cy, max, step) => {
      for (let r = max, k = 0; r > 0; r -= step, k++) circle(ctx, cx, cy, r, k % 2 ? p.bg : (k % 4 === 0 ? p.a : p.b));
    };
    rings(W * 0.3, H * 0.78, m * 0.62, m * 0.055);
    rings(W * (W > 900 ? 0.6 : 0.85), H * 0.3, m * 0.2, m * 0.04);
    if (title) drawTitle(ctx, W, H, t.album, p.a);
  },
};
export function paintArt(canvas, track, W, H, title) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ART[track.id](ctx, W, H, track, title);
}

