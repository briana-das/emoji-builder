#!/usr/bin/env node
// Pure Node.js PNG generator — no external dependencies required.
// Generates placeholder component PNGs for testing.

import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── CRC32 ────────────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(d.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, d])), 0);
  return Buffer.concat([len, t, d, crcBuf]);
}

// ─── PNG writer ───────────────────────────────────────────────────────────────
function createPNG(width, height, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA

  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      raw.push(r, g, b, a);
    }
  }

  const idat = zlib.deflateSync(Buffer.from(raw));
  return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', idat), makeChunk('IEND', Buffer.alloc(0))]);
}

// ─── Pixel helpers ────────────────────────────────────────────────────────────
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const inRect = (x, y, x1, y1, x2, y2) => x >= x1 && x <= x2 && y >= y1 && y <= y2;

// Anti-alias helper: returns alpha 0–255 based on distance from edge
function circleAlpha(x, y, cx, cy, r) {
  const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  if (d <= r - 1) return 255;
  if (d >= r + 1) return 0;
  return Math.round((r + 1 - d) * 127.5);
}

// ─── Component draw functions ─────────────────────────────────────────────────

// base/circle-yellow.png — big yellow circle (emoji face base)
function drawBase(x, y, w, h) {
  const cx = w / 2, cy = h / 2, r = w * 0.46;
  const a = circleAlpha(x, y, cx, cy, r);
  if (a === 0) return [0, 0, 0, 0];
  // Slight gradient: lighter at top-left
  const bright = Math.round(255 - (x / w + y / h) * 8);
  return [bright, Math.round(bright * 0.86), 20, a];
}

// eyes/eyes-default.png — two dark eyes with white sclera
function drawEyes(x, y, w, h) {
  const r = w * 0.10;
  const eyes = [
    [w * 0.33, h * 0.44],
    [w * 0.67, h * 0.44],
  ];
  for (const [cx, cy] of eyes) {
    const aWhite = circleAlpha(x, y, cx, cy, r * 1.6);
    if (aWhite > 0) return [255, 255, 255, aWhite];
  }
  for (const [cx, cy] of eyes) {
    const aPupil = circleAlpha(x, y, cx, cy, r * 0.9);
    if (aPupil > 0) return [25, 25, 25, aPupil];
  }
  for (const [cx, cy] of eyes) {
    // shine
    if (inCircle(x, y, cx - r * 0.3, cy - r * 0.3, r * 0.28)) return [255, 255, 255, 200];
  }
  return [0, 0, 0, 0];
}

// mouth/smile.png — classic smile arc
function drawSmile(x, y, w, h) {
  const cx = w * 0.5, cy = h * 0.46;
  const r = w * 0.31;
  const thick = w * 0.065;
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (Math.abs(dist - r) < thick + 1) {
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle >= 18 && angle <= 162) {
      const edge = Math.abs(dist - r) / thick;
      const a = edge > 1 ? Math.round((2 - edge) * 127.5) : 255;
      return [28, 28, 28, Math.max(0, Math.min(255, a))];
    }
  }
  return [0, 0, 0, 0];
}

// hands/wave-hand.png — orange waving hand
function drawHand(x, y, w, h) {
  const palmX1 = w * 0.28, palmY1 = h * 0.34, palmX2 = w * 0.72, palmY2 = h * 0.88;
  const thumbX1 = w * 0.60, thumbY1 = h * 0.18, thumbX2 = w * 0.82, thumbY2 = h * 0.44;

  if (inRect(x, y, palmX1, palmY1, palmX2, palmY2)) {
    // rounded corners approximation via circle cuts
    const corners = [[palmX1 + 8, palmY1 + 8], [palmX2 - 8, palmY1 + 8],
                     [palmX1 + 8, palmY2 - 8], [palmX2 - 8, palmY2 - 8]];
    for (const [cx, cy] of corners) {
      const isCornerRegion =
        (x < palmX1 + 8 || x > palmX2 - 8) && (y < palmY1 + 8 || y > palmY2 - 8);
      if (isCornerRegion && !inCircle(x, y, cx, cy, 8)) return [0, 0, 0, 0];
    }
    return [255, 160, 30, 255];
  }
  if (inRect(x, y, thumbX1, thumbY1, thumbX2, thumbY2)) return [255, 160, 30, 255];

  // Knuckle dividers
  for (let i = 1; i <= 3; i++) {
    const kx = palmX1 + ((palmX2 - palmX1) / 4) * i;
    if (Math.abs(x - kx) < 1.5 && y > palmY1 + 4 && y < palmY1 + 16) return [220, 120, 10, 255];
  }
  return [0, 0, 0, 0];
}

// accessories/top-hat.png — classic top hat
function drawHat(x, y, w, h) {
  const crownX1 = w * 0.28, crownX2 = w * 0.72;
  const crownY1 = h * 0.08, crownY2 = h * 0.73;
  const brimX1 = w * 0.08, brimX2 = w * 0.92;
  const brimY1 = h * 0.73, brimY2 = h * 0.88;
  const bandY1 = h * 0.64, bandY2 = h * 0.74;

  if (inRect(x, y, brimX1, brimY1, brimX2, brimY2)) return [32, 32, 32, 255];
  if (inRect(x, y, crownX1, crownY1, crownX2, crownY2)) {
    if (inRect(x, y, crownX1, bandY1, crownX2, bandY2)) return [180, 60, 60, 255];
    return [32, 32, 32, 255];
  }
  return [0, 0, 0, 0];
}

// extras/sparkle.png — 4-pointed star sparkle
function drawSparkle(x, y, w, h) {
  const cx = w / 2, cy = h / 2;
  const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
  const maxR = w * 0.44;
  const beamW = w * 0.08;

  // Vertical beam
  if (dx <= beamW && dy <= maxR - dx * 1.8) return [255, 220, 0, 255];
  // Horizontal beam
  if (dy <= beamW && dx <= maxR - dy * 1.8) return [255, 220, 0, 255];
  // Diagonal beams (softer, shorter)
  if (Math.abs(dx - dy) <= beamW * 0.7 && dx + dy <= maxR * 0.58) return [255, 200, 60, 220];
  // Center glow
  const dist = Math.sqrt(dx * dx + dy * dy);
  const a = circleAlpha(x, y, cx, cy, beamW * 1.5);
  if (a > 0) return [255, 255, 180, a];
  return [0, 0, 0, 0];
}

// ─── Generate files ───────────────────────────────────────────────────────────
const SIZE = 128;
const baseDir = path.join(__dirname, '..', 'public', 'components');

const specs = [
  { relPath: 'base/circle-yellow.png', fn: drawBase },
  { relPath: 'eyes/eyes-default.png', fn: drawEyes },
  { relPath: 'mouth/smile.png', fn: drawSmile },
  { relPath: 'hands/wave-hand.png', fn: drawHand },
  { relPath: 'accessories/top-hat.png', fn: drawHat },
  { relPath: 'extras/sparkle.png', fn: drawSparkle },
];

let generated = 0;
for (const { relPath, fn } of specs) {
  const filePath = path.join(baseDir, relPath);
  if (fs.existsSync(filePath)) {
    console.log(`  skip  ${relPath}`);
    continue;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const png = createPNG(SIZE, SIZE, fn);
  fs.writeFileSync(filePath, png);
  console.log(`  wrote ${relPath}`);
  generated++;
}

if (generated === 0) {
  console.log('Placeholder assets already exist — skipping generation.');
} else {
  console.log(`Generated ${generated} placeholder PNG(s) in public/components/`);
}
