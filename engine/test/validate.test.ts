// Golden validation gate: engine vs Swiss Ephemeris fixtures (engine/test/golden/*.json) and vs the
// hand-read Drik Panchang sample (golden/drik-manual.json). Tolerances from docs/ENGINE-DESIGN.md §8.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { panchang, clearPanchangCache } from '../panchanga.ts';
import { hhmm, localMidnightUtc, parseIsoDate } from '../time.ts';
import { sunrise as sunriseAt, sunset as sunsetAt, moonriseGeocentric, moonsetGeocentric } from '../astro.ts';
import { civil } from '../time.ts';

const dir = new URL('./golden/', import.meta.url);
const TOL = { riseSec: 20, endSec: 60, lonArcsec: 30, drikRiseMin: 1, drikEndMin: 3 };

interface Row { pass: number; fail: number; notes: string[] }
const tally = (): Row => ({ pass: 0, fail: 0, notes: [] });
function check(r: Row, ok: boolean, note: string) { if (ok) r.pass++; else { r.fail++; r.notes.push(note); } }
const secDiff = (a: Date | null, b: string | null) => (a && b) ? Math.abs(a.getTime() - new Date(b).getTime()) / 1000 : (a === null && b === null ? 0 : 1e9);
const arcDiff = (a: number, b: number) => { let d = Math.abs(a - b) * 3600; if (d > 648000) d = 1296000 - d; return d; };

describe('golden: engine vs Swiss Ephemeris oracle', () => {
  const files = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'drik-manual.json');
  const totals: Record<string, Row> = {};
  for (const f of files) {
    const g = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    const city = g.city;
    const r = tally();
    totals[city.id] = r;
    it(`${city.name}: ${g.days.length} days`, () => {
      clearPanchangCache();
      for (const d of g.days) {
        const p = panchang(d.date, city, { sunrise: 'limb' });
        check(r, secDiff(p.sunrise, d.sunrise) <= TOL.riseSec, `${d.date} sunrise ${secDiff(p.sunrise, d.sunrise).toFixed(0)}s`);
        check(r, secDiff(p.sunset, d.sunset) <= TOL.riseSec, `${d.date} sunset ${secDiff(p.sunset, d.sunset).toFixed(0)}s`);
        // the oracle's moonrise is geocentric (swe_rise_trans default); the engine's shipped moonrise is topocentric (Drik)
        const mid0 = localMidnightUtc(parseIsoDate(d.date).y, parseIsoDate(d.date).m, parseIsoDate(d.date).d, city.tz);
        const mrG = moonriseGeocentric(city, mid0); const msG = moonsetGeocentric(city, mid0);
        const sameDay = (x: Date | null) => x && civil(x, city.tz).day === parseIsoDate(d.date).d ? x : null;
        check(r, secDiff(sameDay(mrG), d.moonrise) <= TOL.riseSec, `${d.date} moonrise(geo) ${mrG?.toISOString()} vs ${d.moonrise}`);
        check(r, secDiff(sameDay(msG), d.moonset) <= TOL.riseSec, `${d.date} moonset(geo) ${msG?.toISOString()} vs ${d.moonset}`);
        // topocentric must be later than geocentric for rise, earlier for set, by 2-8 minutes
        if (p.moonrise && sameDay(mrG)) check(r, (p.moonrise.getTime() - mrG!.getTime()) / 60000 > 2 && (p.moonrise.getTime() - mrG!.getTime()) / 60000 < 9, `${d.date} moonrise parallax shift`);
        // centre convention
        const { y, m, dd } = (() => { const q = parseIsoDate(d.date); return { y: q.y, m: q.m, dd: q.d }; })();
        const mid = localMidnightUtc(y, m, dd, city.tz);
        const srC = sunriseAt(city, mid, 'center'); const ssC = srC ? sunsetAt(city, srC, 'center') : null;
        check(r, secDiff(srC, d.sunriseCenter) <= TOL.riseSec, `${d.date} sunriseCenter ${secDiff(srC, d.sunriseCenter).toFixed(0)}s`);
        check(r, secDiff(ssC, d.sunsetCenter) <= TOL.riseSec, `${d.date} sunsetCenter ${secDiff(ssC, d.sunsetCenter).toFixed(0)}s`);
        check(r, arcDiff(p.ayanamsa, d.ayanamsa) <= 1, `${d.date} ayanamsa ${arcDiff(p.ayanamsa, d.ayanamsa).toFixed(2)}"`);
        check(r, arcDiff(p.sunLongitude, d.sunSidereal) <= TOL.lonArcsec, `${d.date} sunLon ${arcDiff(p.sunLongitude, d.sunSidereal).toFixed(1)}"`);
        check(r, arcDiff(p.moonLongitude, d.moonSidereal) <= TOL.lonArcsec, `${d.date} moonLon ${arcDiff(p.moonLongitude, d.moonSidereal).toFixed(1)}"`);
        check(r, p.tithi[0].num === d.tithi, `${d.date} tithi ${p.tithi[0].num} vs ${d.tithi}`);
        check(r, secDiff(p.tithi[0].end, d.tithiEnd) <= TOL.endSec, `${d.date} tithiEnd ${secDiff(p.tithi[0].end, d.tithiEnd).toFixed(0)}s`);
        if (d.tithi2End) check(r, p.tithi[1] != null && secDiff(p.tithi[1].end, d.tithi2End) <= TOL.endSec, `${d.date} tithi2End`);
        check(r, p.nakshatra[0].num === d.nakshatra, `${d.date} nakshatra ${p.nakshatra[0].num} vs ${d.nakshatra}`);
        check(r, secDiff(p.nakshatra[0].end, d.nakshatraEnd) <= TOL.endSec, `${d.date} nakEnd ${secDiff(p.nakshatra[0].end, d.nakshatraEnd).toFixed(0)}s`);
        if (d.nakshatra2End) check(r, p.nakshatra[1] != null && secDiff(p.nakshatra[1].end, d.nakshatra2End) <= TOL.endSec, `${d.date} nak2End`);
        check(r, p.yoga[0].num === d.yoga, `${d.date} yoga ${p.yoga[0].num} vs ${d.yoga}`);
        check(r, secDiff(p.yoga[0].end, d.yogaEnd) <= TOL.endSec, `${d.date} yogaEnd ${secDiff(p.yoga[0].end, d.yogaEnd).toFixed(0)}s`);
        check(r, p.karana[0].slot === d.karana, `${d.date} karana ${p.karana[0].slot} vs ${d.karana}`);
        check(r, p.sunRashi.index === d.sunRashi && p.moonRashi.index === d.moonRashi, `${d.date} rashi`);
      }
      const rate = r.pass / (r.pass + r.fail);
      console.log(`${city.name}: ${r.pass}/${r.pass + r.fail} checks pass (${(100 * rate).toFixed(2)}%)` + (r.notes.length ? '\n  ' + r.notes.slice(0, 12).join('\n  ') : ''));
      expect(rate).toBeGreaterThanOrEqual(0.95);
    });
  }
  it('overall oracle pass rate >= 95%', () => {
    const p = Object.values(totals).reduce((s, r) => s + r.pass, 0);
    const f = Object.values(totals).reduce((s, r) => s + r.fail, 0);
    console.log(`ORACLE TOTAL: ${p}/${p + f} = ${(100 * p / (p + f)).toFixed(2)}%`);
    expect(p / (p + f)).toBeGreaterThanOrEqual(0.95);
  });
});

describe('golden: engine vs hand-read Drik Panchang sample', () => {
  let rows: any[] = [];
  try { rows = JSON.parse(readFileSync(new URL('drik-manual.json', dir), 'utf8')).rows; } catch { rows = []; }
  const r = tally();
  const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const minDiff = (a: string, b: string) => { let d = Math.abs(toMin(a) - toMin(b)); if (d > 720) d = 1440 - d; return d; };
  it(`${rows.length} rows`, () => {
    for (const row of rows) {
      const p = panchang(row.date, row.place, { sunrise: 'limb' });
      const tz = row.place.tz;
      const tag = `${row.place.name} ${row.date}`;
      if (row.sunrise) check(r, minDiff(hhmm(p.sunrise, tz), row.sunrise) <= TOL.drikRiseMin, `${tag} sunrise ${hhmm(p.sunrise, tz)} vs ${row.sunrise}`);
      if (row.sunset) check(r, minDiff(hhmm(p.sunset, tz), row.sunset) <= TOL.drikRiseMin, `${tag} sunset ${hhmm(p.sunset, tz)} vs ${row.sunset}`);
      if (row.moonrise && p.moonrise) check(r, minDiff(hhmm(p.moonrise, tz), row.moonrise) <= TOL.drikRiseMin, `${tag} moonrise ${hhmm(p.moonrise, tz)} vs ${row.moonrise}`);
      if (row.moonset && p.moonset) check(r, minDiff(hhmm(p.moonset, tz), row.moonset) <= TOL.drikRiseMin, `${tag} moonset ${hhmm(p.moonset, tz)} vs ${row.moonset}`);
      if (row.moonrise === null) check(r, p.moonrise === null, `${tag} expected no moonrise, got ${p.moonrise && hhmm(p.moonrise, tz)}`);
      if (row.tithi) check(r, p.tithi[0].name === row.tithi, `${tag} tithi ${p.tithi[0].name} vs ${row.tithi}`);
      if (row.tithiEnd) check(r, minDiff(hhmm(p.tithi[0].end, tz), row.tithiEnd) <= TOL.drikEndMin, `${tag} tithiEnd ${hhmm(p.tithi[0].end, tz)} vs ${row.tithiEnd}`);
      if (row.nakshatra) check(r, p.nakshatra[0].name === row.nakshatra, `${tag} nakshatra ${p.nakshatra[0].name} vs ${row.nakshatra}`);
      if (row.nakshatraEnd) check(r, minDiff(hhmm(p.nakshatra[0].end, tz), row.nakshatraEnd) <= TOL.drikEndMin, `${tag} nakEnd ${hhmm(p.nakshatra[0].end, tz)} vs ${row.nakshatraEnd}`);
      if (row.yoga) check(r, p.yoga[0].name === row.yoga, `${tag} yoga ${p.yoga[0].name} vs ${row.yoga}`);
      if (row.yogaEnd) check(r, minDiff(hhmm(p.yoga[0].end, tz), row.yogaEnd) <= TOL.drikEndMin, `${tag} yogaEnd ${hhmm(p.yoga[0].end, tz)} vs ${row.yogaEnd}`);
      if (row.karana) check(r, p.karana[0].name === row.karana, `${tag} karana ${p.karana[0].name} vs ${row.karana}`);
      if (row.amanta) check(r, p.masa.amanta.name === row.amanta, `${tag} amanta ${p.masa.amanta.name} vs ${row.amanta}`);
      if (row.purnimanta) check(r, p.masa.purnimanta.name === row.purnimanta, `${tag} purnimanta ${p.masa.purnimanta.name} vs ${row.purnimanta}`);
      if (row.paksha) check(r, p.paksha === row.paksha, `${tag} paksha`);
      if (row.shaka) check(r, p.samvatsara.shaka === row.shaka, `${tag} shaka ${p.samvatsara.shaka}`);
      if (row.vikram) check(r, p.samvatsara.vikram === row.vikram, `${tag} vikram ${p.samvatsara.vikram}`);
      if (row.gujarati) check(r, p.samvatsara.vikramGujarati === row.gujarati, `${tag} gujarati ${p.samvatsara.vikramGujarati}`);
    }
    console.log(`DRIK MANUAL: ${r.pass}/${r.pass + r.fail} = ${r.pass + r.fail ? (100 * r.pass / (r.pass + r.fail)).toFixed(1) : 'n/a'}%` + (r.notes.length ? '\n  ' + r.notes.join('\n  ') : ''));
    if (rows.length) expect(r.pass / (r.pass + r.fail)).toBeGreaterThanOrEqual(0.9);
  });
});
