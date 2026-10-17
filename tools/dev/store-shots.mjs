// Captures the raw Play Store screenshots (1080×1920 = 360×640 CSS @3x) from the built app served by
// `npx vite preview --port 4173`. Settings are seeded through localStorage before load; the clock is pinned so the
// shots are reproducible. Output: store/screenshots/raw/NN-slug.png. Then run store-frames.mjs.
//   npm run build && npx vite preview --port 4173 &   then   node tools/dev/store-shots.mjs
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs')); }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = resolve(ROOT, 'store/screenshots/raw'); mkdirSync(OUT, { recursive: true });
const BASE = process.env.SHOT_BASE || 'http://localhost:4173/subhdate/';
const CITY = {
  ahmedabad: { name: 'Ahmedabad', region: 'Gujarat', lat: 23.0225, lon: 72.5714, tz: 'Asia/Kolkata' },
  toronto: { name: 'Toronto', region: 'Ontario, Canada', lat: 43.6532, lon: -79.3832, tz: 'America/Toronto' },
  delhi: { name: 'New Delhi', region: 'Delhi', lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata' },
  mumbai: { name: 'Mumbai', region: 'Maharashtra', lat: 19.076, lon: 72.8777, tz: 'Asia/Kolkata' },
};
const settings = (o) => ({ lang: 'en', region: 'north', monthSystem: 'purnimanta', sunrise: 'limb', abhijitWed: false, city: CITY.delhi, birth: null, sankalpaScript: 'deva', onboarded: true, theme: 'paper', ...o });

export const SHOTS = [
  { id: '01-today-gu', settings: settings({ lang: 'gu', region: 'west', monthSystem: 'amanta', city: CITY.ahmedabad }), clock: '2026-11-08T09:30:00+05:30', route: '#/today', wait: '.card .row' },
  { id: '02-today-toronto', settings: settings({ lang: 'en', region: 'diaspora', city: CITY.toronto }), clock: '2026-11-08T09:30:00-05:00', route: '#/today', wait: '.banner' },
  { id: '03-muhurta-results', settings: settings({ lang: 'hi', city: CITY.delhi }), clock: '2026-10-20T10:00:00+05:30', route: '#/muhurta', wait: '#find', act: 'find' },
  { id: '04-result-detail', settings: settings({ lang: 'hi', city: CITY.delhi }), clock: '2026-10-20T10:00:00+05:30', route: '#/muhurta', wait: '#find', act: 'find+result' },
  { id: '05-festivals', settings: settings({ lang: 'en', region: 'diaspora', city: CITY.toronto }), clock: '2026-10-20T10:00:00-04:00', route: '#/festivals', wait: '.card h2', act: 'scroll-diwali' },
  { id: '06-report-preview', settings: settings({ lang: 'en', city: CITY.delhi }), clock: '2026-10-20T10:00:00+05:30', route: '#/muhurta', wait: '#find', act: 'find+report' },
  { id: '07-today-night', settings: settings({ lang: 'hi', region: 'west', monthSystem: 'amanta', city: CITY.mumbai, theme: 'night' }), clock: '2026-11-08T20:30:00+05:30', route: '#/today', wait: '.card .row' },
  { id: '08-settings', settings: settings({ lang: 'en', city: CITY.delhi }), clock: '2026-10-20T10:00:00+05:30', route: '#/settings', wait: '.lang-grid' },
];

const only = process.argv.slice(2);
const browser = await chromium.launch();
for (const s of SHOTS) {
  if (only.length && !only.some(o => s.id.startsWith(o))) continue;
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, locale: 'en-IN', timezoneId: s.settings.city.tz });
  await ctx.addInitScript((st) => { localStorage.setItem('shubhdate.settings', JSON.stringify(st)); }, s.settings);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(s.clock));
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + s.route); await page.waitForSelector(s.wait, { timeout: 120000 });
  if (s.act?.startsWith('find')) {
    await page.selectOption('#ev', 'vivaha'); await page.fill('#from', '2026-11-21'); await page.fill('#to', '2026-12-15'); await page.click('#find');
    await page.waitForSelector('[data-i="0"]', { timeout: 180000 });
    if (s.act === 'find+result') { await page.click('[data-i="0"]'); await page.waitForSelector('.window'); }
    if (s.act === 'find+report') { await page.click('a[href="#/report"]'); await page.waitForSelector('.rp-page', { timeout: 120000 }); }
    if (s.act === 'find') { await page.evaluate(() => document.querySelector('#results')?.scrollIntoView()); }
  }
  if (s.act === 'scroll-diwali') { await page.evaluate(() => { const h = [...document.querySelectorAll('.card h2')].find(x => /Diwali/.test(x.textContent)); h?.closest('.card')?.scrollIntoView({ block: 'start' }); window.scrollBy(0, -72); }); }
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(900);
  await page.screenshot({ path: resolve(OUT, `${s.id}.png`) });
  console.log(s.id, errs.length ? 'ERRORS ' + errs.join(' | ') : 'ok');
  await ctx.close();
}
await browser.close();
