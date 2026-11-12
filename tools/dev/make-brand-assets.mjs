// Cuts every brand image from Soul's three picks (2026-11-11), all 2000x2000 JPGs in design/candidates/:
//   logo-sun-moon.jpg      main logo: app icons, header mark, hero in the installed app
//   web-astrolabe.jpg      rotating hero, website only (display-mode: browser)
//   report-lotus-moon.jpg  cover of the paid Muhurta Report
// Run from the project root: node tools/dev/make-brand-assets.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const MAIN = 'design/candidates/logo-sun-moon.jpg';
const WEB = 'design/candidates/web-astrolabe.jpg';
const LOTUS = 'design/candidates/report-lotus-moon.jpg';
mkdirSync('public/icons', { recursive: true });

const box = (cx, cy, half) => ({ left: cx - half, top: cy - half, width: 2 * half, height: 2 * half });
const disc = (size, r) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="#fff"/></svg>`);
const round = (src, extract, size, r) => sharp(src).extract(extract).resize(size, size, { kernel: 'lanczos3' }).ensureAlpha().composite([{ input: disc(size, r), blend: 'dest-in' }]);

// ---- main logo: the mandala is centred at (1000,1000); outer ring r=768, sun-and-moon medallion r=258.
// Icons keep the artwork's own cream ground (launchers need an opaque square).
for (const size of [512, 192]) await sharp(MAIN).extract(box(1000, 1000, 830)).resize(size, size, { kernel: 'lanczos3' }).png().toFile(`public/icons/icon-${size}.png`);
// Maskable: the whole image, so the mandala (38% of the width from centre) stays inside the 40% safe zone.
await sharp(MAIN).resize(512, 512, { kernel: 'lanczos3' }).png().toFile('public/icons/icon-maskable-512.png');
// Header mark (28px CSS at 3x): only the sun-and-moon medallion, the full mandala is mush at that size.
await round(MAIN, box(1000, 1000, 262), 84, 41.4).png().toFile('public/icons/mark-84.png');
// Hero in the installed app: the whole mandala cut to its outer ring.
await round(MAIN, box(1000, 1000, 780), 720, 356.5).webp({ quality: 86 }).toFile('public/hero.webp');
await round(MAIN, box(1000, 1000, 780), 720, 356.5).png({ compressionLevel: 9 }).toFile('public/hero.png');

// ---- helpers for cut-outs. colourToAlpha is the classic "colour to alpha": a pixel equal to the ground becomes
// fully clear and everything else keeps the colour it would need to give the same result over that ground.
async function load(src, extract, size, denoise = false) {
  let img = sharp(src).extract(extract);
  if (denoise) img = img.median(3); // flatten JPEG block noise in the ground before it turns into stray alpha
  const { data } = await img.resize(size, size, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = [0, 1, 2].map(ch => Math.round((data[ch] + data[(size - 1) * 3 + ch] + data[(size * (size - 1)) * 3 + ch] + data[(size * size - 1) * 3 + ch]) / 4));
  return { data, bg };
}
function toAlpha(data, i, bg, out, o, floor, darkOnly = false) {
  let a = 0;
  for (let ch = 0; ch < 3; ch++) { const c = data[i + ch], b = bg[ch]; const ac = c > b ? (darkOnly ? 0 : (c - b) / (255 - b)) : c < b ? (b - c) / b : 0; if (ac > a) a = ac; }
  if (a <= floor) { out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0; return; }
  for (let ch = 0; ch < 3; ch++) out[o + ch] = Math.max(0, Math.min(255, Math.round((data[i + ch] - bg[ch]) / a + bg[ch])));
  out[o + 3] = Math.round(255 * Math.min(1, (a - floor) / (1 - floor)));
}

// ---- website hero: line art, so the whole ground goes clear. Centre of the drawing is (1000,964).
{
  const size = 600; const { data, bg } = await load(WEB, box(1000, 964, 770), size, true);
  const out = Buffer.alloc(size * size * 4);
  for (let p = 0; p < size * size; p++) toAlpha(data, p * 3, bg, out, p * 4, 0.08, true); // dark-only: the ground is paler in the middle, and nothing drawn is lighter than it
  await sharp(out, { raw: { width: size, height: size, channels: 4 } }).webp({ quality: 82, alphaQuality: 85 }).toFile('public/hero-web.webp');
  await sharp(out, { raw: { width: size, height: size, channels: 4 } }).png({ compressionLevel: 9 }).toFile('public/hero-web.png');
}

// ---- report lotus: only the ground connected to the edges goes clear (flood fill), so the pale moon and the
// petal highlights inside the outline stay solid. Edge pixels get partial alpha so there is no cream fringe.
{
  const size = 800; const { data, bg } = await load(LOTUS, box(1000, 1016, 770), size);
  const near = (p) => Math.max(Math.abs(data[p * 3] - bg[0]), Math.abs(data[p * 3 + 1] - bg[1]), Math.abs(data[p * 3 + 2] - bg[2])) < 44;
  const ground = new Uint8Array(size * size); const stack = [];
  const push = (x, y) => { if (x < 0 || y < 0 || x >= size || y >= size) return; const p = y * size + x; if (ground[p] || !near(p)) return; ground[p] = 1; stack.push(p); };
  for (let k = 0; k < size; k++) { push(k, 0); push(k, size - 1); push(0, k); push(size - 1, k); }
  while (stack.length) { const p = stack.pop(); const x = p % size, y = (p - x) / size; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const p = y * size + x; let edge = ground[p];
    for (let dy = -2; dy <= 2 && !edge; dy++) for (let dx = -2; dx <= 2 && !edge; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < size && yy < size && ground[yy * size + xx]) edge = 1; }
    if (edge) toAlpha(data, p * 3, bg, out, p * 4, 0.05);
    else { out[p * 4] = data[p * 3]; out[p * 4 + 1] = data[p * 3 + 1]; out[p * 4 + 2] = data[p * 3 + 2]; out[p * 4 + 3] = 255; }
  }
  await sharp(out, { raw: { width: size, height: size, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile('public/report-lotus.webp');
}
console.log('brand assets written');
