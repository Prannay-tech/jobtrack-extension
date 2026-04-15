/**
 * Generates JobTrack extension icons (16, 48, 128px) as PNG files.
 * Pure Node.js — no native canvas module needed.
 * Uses raw PNG encoding with zlib.
 */

import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "extension", "icons");
mkdirSync(OUT_DIR, { recursive: true });

// ── Colours ────────────────────────────────────────────────────────────────────
const BG        = [26,  30,  60,  255]; // #1a1e3c  — deep navy
const CARD      = [35,  41,  80,  255]; // #232951  — card layer
const BLUE      = [79, 142, 247, 255];  // #4f8ef7  — electric blue
const WHITE     = [255,255,255, 255];
const TRANS     = [0,   0,   0,   0];

// ── Pixel helpers ──────────────────────────────────────────────────────────────
function makePixels(size) {
  return new Uint8Array(size * size * 4); // RGBA flat array
}

function setPixel(pixels, size, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  pixels[i]     = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

function getPixel(pixels, size, x, y) {
  if (x < 0 || y < 0 || x >= size || y >= size) return TRANS;
  const i = (y * size + x) * 4;
  return [pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]];
}

// Filled circle with anti-aliasing (distance field)
function fillCircle(pixels, size, cx, cy, r, color, soft = true) {
  const soft_px = soft ? 1.2 : 0;
  for (let y = Math.floor(cy - r - 2); y <= Math.ceil(cy + r + 2); y++) {
    for (let x = Math.floor(cx - r - 2); x <= Math.ceil(cx + r + 2); x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      let alpha = 1 - Math.max(0, Math.min(1, (dist - r + soft_px) / soft_px));
      if (alpha <= 0) continue;
      blendPixel(pixels, size, x, y, color, alpha);
    }
  }
}

// Rounded rectangle
function fillRoundRect(pixels, size, x0, y0, w, h, r, color) {
  const x1 = x0 + w, y1 = y0 + h;
  for (let y = Math.floor(y0 - 1); y <= Math.ceil(y1 + 1); y++) {
    for (let x = Math.floor(x0 - 1); x <= Math.ceil(x1 + 1); x++) {
      // Distance to nearest corner arc
      const cx = Math.max(x0 + r, Math.min(x1 - r, x));
      const cy = Math.max(y0 + r, Math.min(y1 - r, y));
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const alpha = 1 - Math.max(0, Math.min(1, dist - r + 1));
      if (alpha <= 0) continue;
      blendPixel(pixels, size, x, y, color, alpha);
    }
  }
}

function blendPixel(pixels, size, x, y, [r, g, b, a], alpha) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  const oa = (pixels[i + 3] / 255);
  const na = (a / 255) * alpha;
  const fa = na + oa * (1 - na);
  if (fa === 0) return;
  pixels[i]     = Math.round((r * na + pixels[i]     * oa * (1 - na)) / fa);
  pixels[i + 1] = Math.round((g * na + pixels[i + 1] * oa * (1 - na)) / fa);
  pixels[i + 2] = Math.round((b * na + pixels[i + 2] * oa * (1 - na)) / fa);
  pixels[i + 3] = Math.round(fa * 255);
}

// Thick line with AA
function drawLine(pixels, size, x0, y0, x1, y1, color, thickness) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.sqrt(dx*dx + dy*dy);
  const steps = Math.ceil(len * 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    fillCircle(pixels, size, px, py, thickness / 2, color, true);
  }
}

// ── Draw the icon at a given size ─────────────────────────────────────────────
function drawIcon(size) {
  const px = makePixels(size);
  const s = size;
  const pad = s * 0.05;

  // Background — rounded rect filling full icon
  fillRoundRect(px, s, 0, 0, s, s, s * 0.18, BG);

  // Briefcase body — centred, occupying ~60% of height
  const bx = s * 0.17, by = s * 0.33;
  const bw = s * 0.66, bh = s * 0.44;
  const br = s * 0.07;
  fillRoundRect(px, s, bx, by, bw, bh, br, CARD);

  // Briefcase handle — top arc
  const hx = s * 0.36, hy = s * 0.18;
  const hw = s * 0.28, hh = s * 0.17;
  const ht = Math.max(1.5, s * 0.05); // stroke thickness
  // top stroke: two verticals + top horizontal
  drawLine(px, s, hx + hw * 0.15, hy + hh, hx + hw * 0.15, hy, BLUE, ht);
  drawLine(px, s, hx + hw * 0.85, hy + hh, hx + hw * 0.85, hy, BLUE, ht);
  drawLine(px, s, hx + hw * 0.15, hy,       hx + hw * 0.85, hy, BLUE, ht);

  // Blue top stripe on briefcase body
  fillRoundRect(px, s, bx, by, bw, bh * 0.22, br, BLUE);

  // Checkmark inside briefcase body
  const ck_t = Math.max(1.8, s * 0.065); // stroke thickness
  const ck_cx = bx + bw * 0.5;
  const ck_cy = by + bh * 0.62;
  const ck_s  = bh * 0.28; // scale
  // left stroke of checkmark
  drawLine(px, s,
    ck_cx - ck_s * 0.62, ck_cy,
    ck_cx - ck_s * 0.18, ck_cy + ck_s * 0.52,
    WHITE, ck_t);
  // right long stroke
  drawLine(px, s,
    ck_cx - ck_s * 0.18, ck_cy + ck_s * 0.52,
    ck_cx + ck_s * 0.62, ck_cy - ck_s * 0.42,
    WHITE, ck_t);

  return px;
}

// ── PNG encoder ───────────────────────────────────────────────────────────────
function u32be(n) {
  return Buffer.from([(n>>>24)&0xff,(n>>>16)&0xff,(n>>>8)&0xff,n&0xff]);
}

function crc32(buf) {
  let c = 0xffffffff;
  const t = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[i]=c;}
    return t;
  })());
  for (const b of buf) c = t[(c^b)&0xff] ^ (c>>>8);
  return (c^0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeB = Buffer.from(type, "ascii");
  const len   = u32be(data.length);
  const crcB  = u32be(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcB]);
}

function encodePNG(pixels, size) {
  const PNG_SIG = Buffer.from([137,80,78,71,13,10,26,10]);

  // IHDR
  const ihdr = Buffer.concat([u32be(size), u32be(size),
    Buffer.from([8, 2, 0, 0, 0])]);  // 8-bit, RGB — we'll convert RGBA→RGB+filter
  // Actually let's do RGBA (color type 6)
  const ihdr2 = Buffer.concat([u32be(size), u32be(size),
    Buffer.from([8, 6, 0, 0, 0])]);  // 8-bit RGBA

  // IDAT — raw filtered scanlines
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const si = (y * size + x) * 4;
      const di = y * (size * 4 + 1) + 1 + x * 4;
      raw[di]     = pixels[si];
      raw[di + 1] = pixels[si + 1];
      raw[di + 2] = pixels[si + 2];
      raw[di + 3] = pixels[si + 3];
    }
  }
  const compressed = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIG,
    chunk("IHDR", ihdr2),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Generate & save ───────────────────────────────────────────────────────────
for (const size of [16, 48, 128]) {
  const pixels = drawIcon(size);
  const png    = encodePNG(pixels, size);
  const path   = join(OUT_DIR, `icon${size}.png`);
  writeFileSync(path, png);
  console.log(`✓ icon${size}.png  (${png.length} bytes)`);
}

console.log(`\nIcons saved to: extension/icons/`);
