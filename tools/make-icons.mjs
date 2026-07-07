// Generates icon-192.png and icon-512.png (cream crescent on deep green).
// Pure Node: builds RGBA pixels and encodes a PNG with zlib. Run: node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const GREEN = [15, 61, 46, 255];
const CREAM = [244, 239, 228, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const s = size / 512;
  const oc = [256 * s, 236 * s], or = 150 * s;   // outer circle
  const ic = [300 * s, 214 * s], ir = 128 * s;   // inner (subtracted) circle
  const star = [352 * s, 150 * s], sr = 20 * s;
  const d = (p, c) => Math.hypot(p[0] - c[0], p[1] - c[1]);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const p = [x + 0.5, y + 0.5];
      const crescent = d(p, oc) <= or && d(p, ic) > ir;
      const px = crescent || d(p, star) <= sr ? CREAM : GREEN;
      raw[o++] = px[0]; raw[o++] = px[1]; raw[o++] = px[2]; raw[o++] = px[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../icon-${size}.png`, import.meta.url), png(size));
  console.log(`wrote icon-${size}.png`);
}
