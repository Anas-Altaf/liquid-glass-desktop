/* Displacement maps for SVG feDisplacementMap.
 * R channel = horizontal shift, G/B = vertical shift, 0.5 = no shift.
 *
 * lensMap(): the liquid-glass-react map (MIT, rdev), a pill-shaped
 *   field that pushes the backdrop inward towards the rim. This is the
 *   look the whole desktop is built around.
 * magnifyMap(): a dome that samples towards the centre (magnifies),
 *   used for slider thumbs and the loupe-style droplets.
 */
const cache = new Map();

function smoothStep(a, b, t) { t = Math.max(0, Math.min(1, (t - a) / (b - a))); return t * t * (3 - 2 * t); }
function roundedRectSDF(x, y, w, h, r) {
  const qx = Math.abs(x) - w + r, qy = Math.abs(y) - h + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

function encode(w, h, field) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d"), raw = new Float32Array(w * h * 2);
  let max = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [dx, dy] = field(x, y);
    const i = (y * w + x) * 2; raw[i] = dx; raw[i + 1] = dy;
    max = Math.max(max, Math.abs(dx), Math.abs(dy));
  }
  max = Math.max(max, 1e-6);
  const img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, edge = Math.min(1, Math.min(x, y, w - x - 1, h - y - 1) / 2);
    const r = raw[i * 2] * edge / max + 0.5, g = raw[i * 2 + 1] * edge / max + 0.5;
    d[i * 4] = r * 255; d[i * 4 + 1] = g * 255; d[i * 4 + 2] = g * 255; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

/* Large panes are computed at reduced resolution; the filter stretches the map. */
function res(w, h, limit = 320) {
  const s = Math.min(1, limit / Math.max(w, h));
  return [Math.max(8, Math.round(w * s)), Math.max(8, Math.round(h * s))];
}

export function lensMap(w, h) {
  const [mw, mh] = res(w, h);
  const key = `lens:${mw}x${mh}`;
  if (!cache.has(key)) {
    cache.set(key, encode(mw, mh, (x, y) => {
      const ix = x / mw - 0.5, iy = y / mh - 0.5;
      const d = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
      const s = smoothStep(0, 1, smoothStep(0.8, 0, d - 0.15));
      return [(ix * s + 0.5) * mw - x, (iy * s + 0.5) * mh - y];
    }));
  }
  return cache.get(key);
}

export function magnifyMap(w, h, zoom = 0.35) {
  const [mw, mh] = res(w, h, 160);
  const key = `mag:${mw}x${mh}:${zoom}`;
  if (!cache.has(key)) {
    cache.set(key, encode(mw, mh, (x, y) => {
      const nx = (x + 0.5) / mw * 2 - 1, ny = (y + 0.5) / mh * 2 - 1;
      const r = Math.min(1, Math.hypot(nx, ny));
      // centre: gentle magnification; rim: strong inward bend, like a droplet
      const rim = Math.pow(r, 6);
      const k = zoom * (1 - rim) + rim * 1.2;
      return [-nx * k * mw * 0.5, -ny * k * mh * 0.5];
    }));
  }
  return cache.get(key);
}
