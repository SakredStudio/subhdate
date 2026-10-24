import { describe, it, expect } from 'vitest';
import { PADA_SYLLABLES, naam, syllableFor, isGandMool, namesFor } from '../namakarana.ts';
import { janma } from '../personal.ts';

const TORONTO = { lat: 43.6532, lon: -79.3832, tz: 'America/Toronto', name: 'Toronto' };
const DELHI = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' };

describe('namakarana', () => {
  it('syllable table is 27 x 4 and non-empty', () => {
    expect(PADA_SYLLABLES.length).toBe(27);
    for (const row of PADA_SYLLABLES) { expect(row.length).toBe(4); for (const s of row) { expect(s.latin.length).toBeGreaterThan(0); expect(s.deva.length).toBeGreaterThan(0); expect(s.gu.length).toBeGreaterThan(0); } }
    expect(syllableFor(1, 1).latin).toBe('Chu'); expect(syllableFor(27, 4).latin).toBe('Chi');
    expect(isGandMool(19)).toBe(true); expect(isGandMool(4)).toBe(false);
  });
  it('a 3 am Toronto birth is computed for Toronto, not Delhi', () => {
    const tor = janma({ date: '2026-10-20', time: '03:00', place: TORONTO });
    const del = janma({ date: '2026-10-20', time: '03:00', place: DELHI });
    // 9.5 h apart: the Moon moves ~5 deg, so the pada (and often the nakshatra) differs
    expect(tor.primary.nakshatra * 10 + tor.primary.pada).not.toBe(del.primary.nakshatra * 10 + del.primary.pada);
  });
  it('full result: syllables, names, muhurta window from day 11 to 45', () => {
    const r = naam({ birth: { date: '2026-10-20', time: '03:00', place: TORONTO }, gender: 'any' });
    expect(r.candidates.length).toBe(1);
    const c = r.candidates[0];
    expect(c.syllables.length).toBe(4); expect(c.lord.length).toBeGreaterThan(0);
    expect(r.from).toBe('2026-10-31'); expect(r.to).toBe('2026-12-04');
    expect(r.muhurta.days.length).toBeGreaterThan(0);
    for (const d of r.muhurta.days) expect(d.date >= r.from && d.date <= r.to).toBe(true);
  });
  it('every curated name starts with its syllable letter', () => {
    for (const row of PADA_SYLLABLES) for (const s of row) {
      const { boys, girls } = namesFor(s, 'any');
      const firsts = [s.latin, s.alt?.latin].filter(Boolean).map(x => x === 'Jna' ? 'g' : x![0].toLowerCase());
      for (const n of [...boys, ...girls]) {
        expect(firsts, `${s.latin}: ${n.en}`).toContain(n.en[0].toLowerCase());
        expect(n.hi.length).toBeGreaterThan(0); expect(n.gu.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('namakarana result is JSON-safe for the Worker boundary', () => {
  it('serialises candidates and days', () => {
    const r = naam({ birth: { date: '2026-10-20', time: null, place: DELHI }, gender: 'girl' });
    const s = JSON.parse(JSON.stringify({ candidates: r.candidates, from: r.from }));
    expect(s.candidates[0].names.boys.length).toBe(0);
    expect(s.candidates[0].syllable.latin.length).toBeGreaterThan(0);
  });
});
