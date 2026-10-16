// Dev-only golden generator. Uses Swiss Ephemeris (@swisseph/node, AGPL, never bundled or served)
// to write engine/test/golden/<city>.json. Run: npm run golden
//
// Per day-record: sunrise/sunset (upper limb + refraction at 1013.25 hPa / 15 C, and disc-centre
// no-refraction), moonrise/moonset, Lahiri ayanamsa, sidereal Sun/Moon longitude at sunrise,
// tithi / nakshatra / yoga at sunrise with end instants (own hourly-bracket + bisection on SE
// positions, independent of the engine), karana slot, and the Sun's sidereal rashi.
import * as S from '@swisseph/node';
import { writeFileSync, mkdirSync } from 'node:fs';

const CITIES = [
  { id: 'delhi', name: 'New Delhi', lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata' },
  { id: 'mumbai', name: 'Mumbai', lat: 19.076, lon: 72.8777, tz: 'Asia/Kolkata' },
  { id: 'chennai', name: 'Chennai', lat: 13.0827, lon: 80.2707, tz: 'Asia/Kolkata' },
  { id: 'kolkata', name: 'Kolkata', lat: 22.5726, lon: 88.3639, tz: 'Asia/Kolkata' },
  { id: 'ahmedabad', name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, tz: 'Asia/Kolkata' },
  { id: 'toronto', name: 'Toronto', lat: 43.6532, lon: -79.3832, tz: 'America/Toronto' },
];
const BLOCKS = [['2026-10-20', 30], ['2026-12-15', 30]];

const F = S.CalculationFlag.SwissEphemeris;
const FSID = F | S.CalculationFlag.Sidereal;
S.setSiderealMode(1); // SE_SIDM_LAHIRI
const SE_BIT_DISC_CENTER = 256, SE_BIT_NO_REFRACTION = 512;
const PRESS = 1013.25, TEMP = 15;

const jdToDate = jd => new Date((jd - 2440587.5) * 86400000);
const dateToJd = d => d.getTime() / 86400000 + 2440587.5;
const norm = x => ((x % 360) + 360) % 360;

function tzOffsetMin(d, tz) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(d);
  const g = t => parseInt(p.find(x => x.type === t).value, 10);
  let h = g('hour'); if (h === 24) h = 0;
  return Math.round((Date.UTC(g('year'), g('month') - 1, g('day'), h, g('minute'), g('second')) - d.getTime()) / 60000);
}
function localMidnightJd(y, m, d, tz) {
  let guess = new Date(Date.UTC(y, m - 1, d));
  for (let i = 0; i < 3; i++) { const off = tzOffsetMin(guess, tz); const n = new Date(Date.UTC(y, m - 1, d) - off * 60000); if (n.getTime() === guess.getTime()) break; guess = n; }
  return dateToJd(guess);
}
const localDay = (jd, tz) => { const d = jdToDate(jd); const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, day: 'numeric' }).formatToParts(d); return parseInt(p.find(x => x.type === 'day').value, 10); };

const sunSid = jd => S.calculatePosition(jd, S.Planet.Sun, FSID).longitude;
const moonSid = jd => S.calculatePosition(jd, S.Planet.Moon, FSID).longitude;
const elong = jd => norm(moonSid(jd) - sunSid(jd));
const yogaAng = jd => norm(moonSid(jd) + sunSid(jd));

// first jd >= start where increasing angle f crosses target (mod 360); hourly bracket + bisection to 0.2 s
function cross(f, target, startJd, limitDays) {
  const gap = jd => norm(target - f(jd));
  let t0 = startJd, g0 = gap(t0); const end = startJd + limitDays; const step = 1 / 24;
  while (t0 < end) {
    const t1 = Math.min(t0 + step, end); const g1 = gap(t1);
    if (g1 > g0 + 180) { let lo = t0, hi = t1; while ((hi - lo) * 86400 > 0.2) { const mid = (lo + hi) / 2; if (gap(mid) > 180) hi = mid; else lo = mid; } return (lo + hi) / 2; }
    t0 = t1; g0 = g1;
  }
  return null;
}
function rise(jd, body, bits, lon, lat) {
  const r = S.calculateRiseTransitSet(jd, body, bits, lon, lat, 0, F, PRESS, TEMP);
  return r && r.time > 0 ? r.time : null;
}

const NAK = 360 / 27;
mkdirSync('engine/test/golden', { recursive: true });
for (const c of CITIES) {
  const days = [];
  for (const [startIso, n] of BLOCKS) {
    const [y0, m0, d0] = startIso.split('-').map(Number);
    for (let i = 0; i < n; i++) {
      const dt = new Date(Date.UTC(y0, m0 - 1, d0 + i));
      const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const jd0 = localMidnightJd(y, m, d, c.tz);
      let sr = rise(jd0, S.Planet.Sun, S.RiseTransitFlag.Rise, c.lon, c.lat);
      if (sr && localDay(sr, c.tz) !== d) sr = rise(jd0 + 0.5, S.Planet.Sun, S.RiseTransitFlag.Rise, c.lon, c.lat);
      const ss = rise(sr, S.Planet.Sun, S.RiseTransitFlag.Set, c.lon, c.lat);
      const srC = rise(jd0, S.Planet.Sun, S.RiseTransitFlag.Rise | SE_BIT_DISC_CENTER | SE_BIT_NO_REFRACTION, c.lon, c.lat);
      const ssC = rise(srC, S.Planet.Sun, S.RiseTransitFlag.Set | SE_BIT_DISC_CENTER | SE_BIT_NO_REFRACTION, c.lon, c.lat);
      const nextSr = rise(sr + 0.5, S.Planet.Sun, S.RiseTransitFlag.Rise, c.lon, c.lat);
      let mr = rise(jd0, S.Planet.Moon, S.RiseTransitFlag.Rise, c.lon, c.lat); if (mr && localDay(mr, c.tz) !== d) mr = null;
      let ms = rise(jd0, S.Planet.Moon, S.RiseTransitFlag.Set, c.lon, c.lat); if (ms && localDay(ms, c.tz) !== d) ms = null;

      const e = elong(sr), ml = moonSid(sr), sl = sunSid(sr), ya = yogaAng(sr);
      const tithi = Math.floor(e / 12) + 1;
      const nak = Math.floor(ml / NAK) + 1;
      const yoga = Math.floor(ya / NAK) + 1;
      const karana = Math.floor(e / 6);
      const tithiEnd = cross(elong, (tithi % 30) * 12, sr, 2.2);
      const nakEnd = cross(moonSid, (nak % 27) * NAK, sr, 2.2);
      const yogaEnd = cross(yogaAng, (yoga % 27) * NAK, sr, 2.2);
      // second tithi/nakshatra if the next boundary also falls before next sunrise
      const tithi2End = tithiEnd < nextSr ? cross(elong, ((tithi + 1) % 30) * 12, tithiEnd, 2.2) : null;
      const nak2End = nakEnd < nextSr ? cross(moonSid, ((nak + 1) % 27) * NAK, nakEnd, 2.2) : null;
      const iso8 = jd => jd == null ? null : jdToDate(jd).toISOString();
      days.push({
        date: iso, sunrise: iso8(sr), sunset: iso8(ss), sunriseCenter: iso8(srC), sunsetCenter: iso8(ssC), nextSunrise: iso8(nextSr),
        moonrise: iso8(mr), moonset: iso8(ms),
        ayanamsa: S.getAyanamsaExUt(sr, F), sunSidereal: sl, moonSidereal: ml,
        tithi, tithiEnd: iso8(tithiEnd), tithi2End: iso8(tithi2End),
        nakshatra: nak, nakshatraEnd: iso8(nakEnd), nakshatra2End: iso8(nak2End),
        yoga, yogaEnd: iso8(yogaEnd), karana, sunRashi: Math.floor(sl / 30) + 1, moonRashi: Math.floor(ml / 30) + 1,
      });
    }
  }
  const out = { city: c, generated: new Date().toISOString(), oracle: '@swisseph/node 1.4.0 (Swiss Ephemeris, SE_SIDM_LAHIRI, rise: upper limb + refraction 1013.25 hPa / 15 C; center: disc centre, no refraction)', days };
  writeFileSync(`engine/test/golden/${c.id}.json`, JSON.stringify(out, null, 1));
  console.log(c.id, days.length, 'days');
}
