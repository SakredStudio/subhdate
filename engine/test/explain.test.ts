import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { explain, renderReason, sankalpa, term } from '../explain.ts';
import { findMuhurta, loadPack, EVENT_IDS } from '../muhurta.ts';
import { panchang } from '../panchanga.ts';

const DELHI = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' };
const AHMEDABAD = { lat: 23.0225, lon: 72.5714, tz: 'Asia/Kolkata', name: 'Ahmedabad' };

describe('L6 explain', () => {
  it('every rule code in every pack has an EN, HI, Hinglish and GU sentence', () => {
    const codes = new Set<string>();
    for (const ev of EVENT_IDS) for (const r of [...loadPack(ev).hard, ...loadPack(ev).soft]) { codes.add(r.code); if (r.elseCode) codes.add(r.elseCode); }
    for (const lang of ['en', 'hi', 'hinglish', 'gu'] as const) {
      const d = JSON.parse(readFileSync(new URL(`../../i18n/${lang}/reasons.json`, import.meta.url), 'utf8'));
      for (const c of codes) expect(d.reasons[c], `${lang}:${c}`).toBeTruthy();
    }
  });
  it('renders params with localised terms', () => {
    const r = { code: 'nakshatra_vivaha', weight: 30, params: { nakshatra: 'Rohini' } };
    expect(renderReason(r, 'en')).toContain('Rohini');
    expect(renderReason(r, 'hi')).toContain('रोहिणी');
    expect(renderReason({ code: 'kharmas', weight: -100, params: { sunRashi: 'Dhanu' } }, 'hi')).toContain('धनु');
    expect(term('tithi', 'Ekadashi', 'gu')).toBe('અગિયારસ');
    expect(term('masa', 'Kartika', 'gu')).toBe('કારતક');
  });
  it('explains a vivaha result in Hindi with headline, sentences and caveats; falls back for Tamil', () => {
    const r = findMuhurta({ event: 'vivaha', from: '2026-11-21', to: '2026-11-26', place: DELHI, region: 'north', maxDays: 3 });
    const hi = explain(r, 'hi');
    expect(hi.days.length).toBeGreaterThan(0);
    expect(hi.days[0].headline).toMatch(/[ऀ-ॿ]/);
    expect(hi.days[0].windows[0].sentences.length).toBeGreaterThan(0);
    expect(hi.caveats.length).toBeGreaterThan(0);
    const gu = explain(r, 'gu');
    expect(gu.fallback).toBe(false);
    expect(gu.days[0].windows[0].sentences[0]).toMatch(/[\u0A80-\u0AFF]/);
    const ta = explain(r, 'ta');
    expect(ta.fallback).toBe(true);
    expect(ta.days[0].windows[0].sentences[0]).toMatch(/[A-Za-z]/);
  });
  it('sankalpa for Diwali 2026 in Ahmedabad (west: Gujarati year, amanta Ashwina) and Delhi (north: Kartika)', () => {
    const a = sankalpa(panchang('2026-11-08', AHMEDABAD, { region: 'west' }));
    expect(a.devanagari).toContain('विक्रमाब्दे 2082');
    expect(a.devanagari).toContain('आश्विनमासे');
    expect(a.devanagari).toContain('कृष्णपक्षे');
    expect(a.iast).toContain('āśvina-māse');
    expect(a.iast).toContain('bhānu-vāsare'); // Sunday
    const d = sankalpa(panchang('2026-11-08', DELHI, { region: 'north' }));
    expect(d.devanagari).toContain('कार्तिकमासे');
    expect(d.devanagari).toContain('विक्रमाब्दे 2083');
    expect(d.devanagari).toContain('सिद्धार्थीनामसंवत्सरे');
    expect(d.parts.nakshatra).toBe('Swati');
  });
});
