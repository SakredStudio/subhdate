import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { panchang } from '../panchanga.ts';
import { kala } from '../kala.ts';
import { hhmm } from '../time.ts';

const DELHI = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' };

// Published Choghadiya tables (research/02 §2.6.5, Drik tutorial), slot 1..8 by weekday Sun..Sat
const DAY_TABLE: Record<string, string[]> = {
  Sun: ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg'],
  Mon: ['Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit'],
  Tue: ['Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'],
  Wed: ['Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh'],
  Thu: ['Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh'],
  Fri: ['Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char'],
  Sat: ['Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal'],
};
const NIGHT_TABLE: Record<string, string[]> = {
  Sun: ['Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh'],
  Mon: ['Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char'],
  Tue: ['Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal'],
  Wed: ['Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg'],
  Thu: ['Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit'],
  Fri: ['Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog'],
  Sat: ['Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh'],
};
// 2026-10-18 is a Sunday
const WEEK = ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'];

describe('L2 kala: derived tables equal the published ones for all 7 weekdays', () => {
  it('choghadiya day + night', () => {
    for (const d of WEEK) {
      const p = panchang(d, DELHI); const k = kala(p);
      expect(k.choghadiya.day.map(c => c.name)).toEqual(DAY_TABLE[p.vara.short]);
      expect(k.choghadiya.night.map(c => c.name)).toEqual(NIGHT_TABLE[p.vara.short]);
      expect(k.choghadiya.day[0].start.getTime()).toBe(p.sunrise.getTime());
      expect(k.choghadiya.night[7].end.getTime()).toBe(p.nextSunrise.getTime());
    }
  });
  it('rahu kaal segment by weekday (Sun 8, Mon 2, Tue 7, Wed 5, Thu 6, Fri 4, Sat 3)', () => {
    const want = [8, 2, 7, 5, 6, 4, 3];
    for (const d of WEEK) {
      const p = panchang(d, DELHI); const k = kala(p);
      const seg = p.dayLength / 8;
      expect(Math.round((k.rahuKaal.start.getTime() - p.sunrise.getTime()) / seg) + 1).toBe(want[p.vara.index]);
    }
  });
  it('hora: first hora is the weekday lord, 25th would be the next weekday lord', () => {
    const p = panchang('2026-10-20', DELHI); const k = kala(p); // Tuesday
    expect(k.hora.day[0].lord).toBe('Mars');
    // 24 horas later the chain lands on Mercury (Wednesday's lord)
    const chain = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];
    expect(chain[(chain.indexOf('Mars') + 24) % 7]).toBe('Mercury');
    expect(k.hora.night[11].lord).toBe(chain[(chain.indexOf('Mars') + 23) % 7]);
  });
  it('abhijit is the 8th day muhurta centred on local noon, suppressed on Wednesday', () => {
    const p = panchang('2026-10-20', DELHI); const k = kala(p);
    const noon = (p.sunrise.getTime() + p.sunset.getTime()) / 2;
    expect(Math.abs((k.abhijit!.start.getTime() + k.abhijit!.end.getTime()) / 2 - noon)).toBeLessThan(1000);
    expect(kala(panchang('2026-10-21', DELHI)).abhijit).toBeNull();
    expect(kala(panchang('2026-10-21', DELHI), { abhijitOnWednesday: true }).abhijit).not.toBeNull();
  });
  it('brahma muhurta ends one night-muhurta before next sunrise', () => {
    const p = panchang('2026-10-20', DELHI); const k = kala(p);
    const mN = p.nightLength / 15;
    expect(Math.abs(k.brahmaMuhurta.end.getTime() - (p.nextSunrise.getTime() - mN))).toBeLessThan(1000);
    expect(Math.abs(k.brahmaMuhurta.start.getTime() - (p.nextSunrise.getTime() - 2 * mN))).toBeLessThan(1000);
  });
});

describe('L2 kala vs Drik Panchang rows (±1 min)', () => {
  const rows = JSON.parse(readFileSync(new URL('./golden/drik-manual.json', import.meta.url), 'utf8')).rows;
  const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const close = (d: Date, tz: string, s: string) => Math.abs(toMin(hhmm(d, tz)) - toMin(s)) <= 1;
  const checkWin = (w: { start: Date; end: Date } | null, tz: string, s: string | undefined) => {
    if (!s || !w) return true;
    const [a, b] = s.split('-');
    return close(w.start, tz, a) && close(w.end, tz, b);
  };
  it('rahu kaal, gulika, yamaganda, abhijit, durmuhurta, varjyam, amrit kaal', () => {
    const fails: string[] = []; let n = 0;
    for (const r of rows) {
      const p = panchang(r.date, r.place); const k = kala(p); const tz = r.place.tz;
      const tag = `${r.place.name} ${r.date}`;
      for (const [name, w, s] of [['rahu', k.rahuKaal, r.rahuKaal], ['gulika', k.gulika, r.gulika], ['yama', k.yamaganda, r.yamaganda], ['abhijit', k.abhijit, r.abhijit]] as const) {
        if (!s) continue; n++;
        if (!checkWin(w as any, tz, s)) fails.push(`${tag} ${name} engine ${w ? hhmm((w as any).start, tz) + '-' + hhmm((w as any).end, tz) : 'null'} drik ${s}`);
      }
      if (r.durmuhurta) for (let i = 0; i < r.durmuhurta.length; i++) { n++; if (!checkWin(k.durmuhurta[i], tz, r.durmuhurta[i])) fails.push(`${tag} durmuhurta ${i} engine ${k.durmuhurta[i] ? hhmm(k.durmuhurta[i].start, tz) + '-' + hhmm(k.durmuhurta[i].end, tz) : 'none'} drik ${r.durmuhurta[i]}`); }
      if (r.varjyam) { n++; if (!k.varjyam.some(w => checkWin(w, tz, r.varjyam))) fails.push(`${tag} varjyam engine ${k.varjyam.map(w => hhmm(w.start, tz) + '-' + hhmm(w.end, tz)).join(',')} drik ${r.varjyam}`); }
      if (r.amritKalam) { n++; if (!k.amritKaal.some(w => checkWin(w, tz, r.amritKalam))) fails.push(`${tag} amrit engine ${k.amritKaal.map(w => hhmm(w.start, tz) + '-' + hhmm(w.end, tz)).join(',')} drik ${r.amritKalam}`); }
    }
    console.log(`KALA vs DRIK: ${n - fails.length}/${n}` + (fails.length ? '\n  ' + fails.join('\n  ') : ''));
    expect(fails).toEqual([]);
  });
});
