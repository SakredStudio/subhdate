import { describe, it, expect } from 'vitest';
import { buildReport, isFlaggedSource } from '../report.ts';

const DELHI = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' };
const AHMEDABAD = { lat: 23.0225, lon: 72.5714, tz: 'Asia/Kolkata', name: 'Ahmedabad' };

describe('L7 report', () => {
  const m = buildReport({ event: 'vivaha', from: '2026-11-21', to: '2026-12-15', place: DELHI, region: 'north', strictness: 'standard' }, { lang: 'hi', names: { person1: 'A', person2: 'B' } });
  it('Delhi vivaha 2026-11-21..12-15: 5 days, each with a Vikram sankalpa, summary and full panchanga', () => {
    expect(m.days.length).toBe(5);
    expect(m.summary.length).toBe(5);
    expect(m.sankalpa.length).toBe(5);
    for (const s of m.sankalpa) { expect(s.devanagari).toContain('विक्रमाब्दे'); expect(s.yearSystem).toBe('vikram'); }
    for (const d of m.days) {
      expect(d.windows.length).toBeGreaterThan(0);
      expect(d.tithi.length).toBeGreaterThan(0); expect(d.nakshatra.length).toBeGreaterThan(0);
      expect(d.choghadiya.day.length).toBe(8); expect(d.choghadiya.night.length).toBe(8);
      expect(d.kala.rahuKaal.start < d.kala.rahuKaal.end).toBe(true);
      expect(d.headline).toMatch(/[ऀ-ॿ]/);
    }
    expect(m.cover.event.local).toBe('विवाह');
    expect(m.cover.names.person1).toBe('A');
    expect(m.cover.monthSystem).toBe('purnimanta');
  });
  it('pandit page: every fired rule has a source, flagged rows are marked, limbs carry Devanagari and IAST', () => {
    expect(m.pandit.rules.length).toBeGreaterThan(0);
    for (const r of m.pandit.rules) { expect(r.source.length).toBeGreaterThan(0); expect(r.flagged).toBe(isFlaggedSource(r.source)); }
    expect(m.pandit.moments.length).toBe(5);
    for (const mo of m.pandit.moments) { for (const l of mo.limbs) { expect(l.deva).toMatch(/[ऀ-ॿ]/); expect(l.iast.length).toBeGreaterThan(0); } }
    expect(m.pandit.caveats.some(c => /lagna|लग्न/.test(c))).toBe(true);
    expect(m.pandit.classicalSources.length).toBeGreaterThan(0);
    expect(m.pandit.conventions.ayanamsaByDay[0].degrees).toBeGreaterThan(24);
  });
  it('serialises without any undefined', () => {
    const s = JSON.stringify(m);
    expect(s).not.toContain('undefined');
    expect(s).not.toContain('NaN');
  });
  it('Ahmedabad griha_pravesh with region west uses the Gujarati Vikram Samvat and Gujarati labels', () => {
    const g = buildReport({ event: 'griha_pravesh', from: '2026-11-21', to: '2026-12-31', place: AHMEDABAD, region: 'west' }, { lang: 'gu' });
    expect(g.days.length).toBeGreaterThan(0);
    expect(g.cover.family).toBe('west');
    expect(g.cover.monthSystem).toBe('amanta');
    for (const s of g.sankalpa) { expect(s.yearSystem).toBe('gujarati'); expect(s.devanagari).toContain(`विक्रमाब्दे ${g.days[0].samvat.vikramGujarati}`); }
    expect(g.days[0].tithi[0].label).toMatch(/[઀-૿]/);
    expect(g.cover.event.local).toMatch(/[઀-૿]/);
    expect(JSON.stringify(g)).not.toContain('undefined');
  });
});
