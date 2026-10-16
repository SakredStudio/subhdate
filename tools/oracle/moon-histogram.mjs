// Dev-only. Histogram of astronomy-engine vs Swiss Ephemeris Moon and Sun sidereal longitude at
// hourly steps over a year range (default 2024-2030). Gate from docs/ENGINE-DESIGN.md §8: p99 < 40".
// Run: npm run histogram [-- 2026 2027]
import * as S from '@swisseph/node';
import { moonSidereal, sunSidereal } from '../../engine/astro.ts';

const [y0 = 2024, y1 = 2030] = process.argv.slice(2).map(Number);
const FSID = S.CalculationFlag.SwissEphemeris | S.CalculationFlag.Sidereal;
S.setSiderealMode(1);
const diffs = [], sdiffs = [];
const start = Date.UTC(y0, 0, 1), end = Date.UTC(y1 + 1, 0, 1);
let worst = { d: 0, t: 0 };
for (let t = start; t < end; t += 3600000) {
  const d = new Date(t); const jd = t / 86400000 + 2440587.5;
  const se = S.calculatePosition(jd, S.Planet.Moon, FSID).longitude;
  let diff = (moonSidereal(d) - se) * 3600; if (diff > 648000) diff -= 1296000; if (diff < -648000) diff += 1296000;
  diffs.push(Math.abs(diff));
  if (Math.abs(diff) > worst.d) worst = { d: Math.abs(diff), t };
  if (diffs.length % 24 === 0) { // Sun daily
    const ses = S.calculatePosition(jd, S.Planet.Sun, FSID).longitude;
    let sd = (sunSidereal(d) - ses) * 3600; if (sd > 648000) sd -= 1296000; if (sd < -648000) sd += 1296000;
    sdiffs.push(Math.abs(sd));
  }
}
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
console.log(`Moon |AE - SE| sidereal longitude, hourly ${y0}-${y1}: n=${diffs.length}`);
console.log(`  p50=${pct(diffs, 0.5).toFixed(1)}"  p90=${pct(diffs, 0.9).toFixed(1)}"  p99=${pct(diffs, 0.99).toFixed(1)}"  max=${worst.d.toFixed(1)}" at ${new Date(worst.t).toISOString()}`);
const bins = [5, 10, 20, 30, 40, 60, 120];
let prev = 0; for (const b of bins) { const n = diffs.filter(x => x >= prev && x < b).length; console.log(`  [${prev},${b})": ${n} (${(100 * n / diffs.length).toFixed(2)}%)`); prev = b; }
console.log(`  >=${prev}": ${diffs.filter(x => x >= prev).length}`);
console.log(`Sun |AE - SE| daily: p50=${pct(sdiffs, 0.5).toFixed(2)}" p99=${pct(sdiffs, 0.99).toFixed(2)}" max=${Math.max(...sdiffs).toFixed(2)}"`);
console.log(pct(diffs, 0.99) < 40 ? 'GATE PASS: p99 < 40"' : 'GATE FAIL: p99 >= 40"');
