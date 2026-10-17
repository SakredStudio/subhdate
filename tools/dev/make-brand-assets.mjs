// Cuts the app icon, header mark and hero image out of design/candidates/hero-A-skywheel.png (Soul's pick, 2026-10-16).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
const SRC = 'design/candidates/hero-A-skywheel.png';
const CREAM = { r: 247, g: 240, b: 227, alpha: 1 };
mkdirSync('public/icons', { recursive: true });
const img = sharp(SRC); const { width } = await img.metadata(); const c = width / 2;
const crop = (half) => ({ left: Math.round(c - half), top: Math.round(c - half), width: Math.round(2 * half), height: Math.round(2 * half) });
// Centre lotus (sun + moon + petals) ≈ radius 172px in the 1024 source.
await sharp(SRC).extract(crop(178)).resize(512, 512, { kernel: 'lanczos3' }).flatten({ background: CREAM }).png().toFile('public/icons/icon-512.png');
await sharp(SRC).extract(crop(178)).resize(192, 192, { kernel: 'lanczos3' }).flatten({ background: CREAM }).png().toFile('public/icons/icon-192.png');
// Maskable: wider crop so the lotus stays inside the 80% safe zone.
await sharp(SRC).extract(crop(236)).resize(512, 512, { kernel: 'lanczos3' }).flatten({ background: CREAM }).png().toFile('public/icons/icon-maskable-512.png');
// Header mark (28px CSS, 2x and 3x).
await sharp(SRC).extract(crop(178)).resize(84, 84, { kernel: 'lanczos3' }).flatten({ background: CREAM }).png().toFile('public/icons/mark-84.png');
// Hero: the whole wheel, trimmed to the glow, square.
await sharp(SRC).extract(crop(500)).resize(720, 720, { kernel: 'lanczos3' }).webp({ quality: 82 }).toFile('public/hero.webp');
await sharp(SRC).extract(crop(500)).resize(720, 720, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile('public/hero.png');
console.log('brand assets written');
