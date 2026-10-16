// Generates public/icons/*.png (a gold mandala on the app's navy) with no image dependencies:
// rasterises rings/spokes mathematically and encodes PNG with node:zlib. Run: node tools/dev/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0x0B, 0x10, 0x20], GOLD = [0xD4, 0xA8, 0x4F], LIGHT = [0xE6, 0xC9, 0x7A];
function render(size, maskable) {
  const px = new Uint8Array(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const R = maskable ? size * 0.32 : size * 0.42; // maskable: keep art inside the safe zone
  const rings = [1.0, 0.82, 0.64, 0.46, 0.2];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy; const r = Math.hypot(dx, dy) / R; const a = Math.atan2(dy, dx);
    let col = BG, alpha = 1;
    // concentric rings
    for (let i = 0; i < rings.length; i++) { const w = i % 2 ? 0.035 : 0.025; if (Math.abs(r - rings[i]) < w) col = i % 2 ? LIGHT : GOLD; }
    // 12 spokes between ring 2 and ring 1
    const spoke = Math.abs(((a / (Math.PI / 6)) % 1 + 1) % 1 - 0.5);
    if (r > 0.46 && r < 1.0 && spoke > 0.485) col = GOLD;
    // 8 petals (diamonds) between ring 3 and 4
    const pet = Math.abs((((a + Math.PI / 8) / (Math.PI / 4)) % 1 + 1) % 1 - 0.5);
    const petalR = 0.2 + 0.26 * (1 - pet * 2);
    if (r > 0.2 && r < petalR && Math.abs(r - petalR) < 0.03) col = LIGHT;
    // centre dot
    if (r < 0.09) col = GOLD;
    // dots at spoke ends
    const spokeEnd = Math.hypot(dx - R * Math.cos(Math.round(a / (Math.PI / 6)) * Math.PI / 6), dy - R * Math.sin(Math.round(a / (Math.PI / 6)) * Math.PI / 6)) / R;
    if (spokeEnd < 0.045) col = LIGHT;
    // soft gold glow
    if (col === BG && r < 1.3) { const g = Math.max(0, 1 - r / 1.3) * 0.18; col = [BG[0] + (GOLD[0] - BG[0]) * g, BG[1] + (GOLD[1] - BG[1]) * g, BG[2] + (GOLD[2] - BG[2]) * g]; }
    if (!maskable) { const rr = Math.hypot(dx, dy) / (size / 2); if (rr > 1) alpha = 0; else if (rr > 0.98) alpha = (1 - rr) / 0.02; }
    const i = (y * size + x) * 4; px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = Math.round(alpha * 255);
  }
  return px;
}
const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
mkdirSync('public/icons', { recursive: true });
for (const [name, size, maskable] of [['icon-192', 192, false], ['icon-512', 512, false], ['icon-maskable-512', 512, true]]) {
  writeFileSync(`public/icons/${name}.png`, png(size, render(size, maskable)));
  console.log('wrote', name);
}
