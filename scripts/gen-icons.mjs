// Dependency-free PNG icon generator. Renders a rounded-corner radial
// gradient tile (brand violet) with a simple four-quadrant glyph — the
// "Quadrante" mark. Produces the icons referenced by the web manifest.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(size, draw) {
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y);
      const o = (y * size + x) * 4;
      px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = a;
    }
  }
  // add filter byte 0 per scanline
  const raw = Buffer.alloc(size * size * 4 + size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

function draw(size, x, y) {
  const cx = size / 2, cy = size / 2;
  const radius = size * 0.235; // rounded-corner radius
  // rounded square mask
  const dx = Math.max(Math.abs(x - cx) - (cx - radius), 0);
  const dy = Math.max(Math.abs(y - cy) - (cy - radius), 0);
  if (Math.sqrt(dx * dx + dy * dy) > radius) return [0, 0, 0, 0];

  // diagonal gradient violet -> indigo
  const t = (x + y) / (2 * size);
  let r = lerp(0x8b, 0x5a, t);
  let g = lerp(0x7f, 0x5a, t);
  let b = lerp(0xd6, 0xc8, t);

  // four-quadrant glyph: a thin cross gap + brighter dots
  const gap = size * 0.045;
  const nearV = Math.abs(x - cx) < gap;
  const nearH = Math.abs(y - cy) < gap;
  if (nearV || nearH) {
    r = lerp(r, 255, 0.28); g = lerp(g, 255, 0.28); b = lerp(b, 255, 0.28);
  }
  // quadrant dots
  const off = size * 0.22, dotR = size * 0.052;
  for (const [qx, qy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const ddx = x - (cx + qx * off), ddy = y - (cy + qy * off);
    if (Math.sqrt(ddx * ddx + ddy * ddy) < dotR) return [255, 255, 255, 255];
  }
  return [r, g, b, 255];
}

mkdirSync(new URL("../public/icons/", import.meta.url), { recursive: true });
for (const size of [192, 512, 180]) {
  const buf = png(size, (x, y) => draw(size, x, y));
  const name = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
  writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), buf);
  console.log("wrote", name, buf.length, "bytes");
}
