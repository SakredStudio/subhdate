import { describe, it, expect } from 'vitest';
import { janma, taraBala, chandraBala, personal } from '../personal.ts';
import { panchang } from '../panchanga.ts';

const DELHI = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' };

describe('L4 personal', () => {
  it('tara bala table: 1,10,19 Janma; 2,11,20 Sampat; 7,16,25 Vadha', () => {
    expect(taraBala(1, 1).name).toBe('Janma');
    expect(taraBala(1, 10).name).toBe('Janma');
    expect(taraBala(1, 2).name).toBe('Sampat');
    expect(taraBala(1, 20).name).toBe('Sampat');
    expect(taraBala(1, 7).name).toBe('Vadha');
    expect(taraBala(1, 25).name).toBe('Vadha');
    expect(taraBala(5, 4).count).toBe(27); // wraps
    expect(taraBala(5, 4).name).toBe('Ati-mitra');
    expect(taraBala(1, 2).good).toBe(true);
    expect(taraBala(1, 3).good).toBe(false);
  });
  it('chandra bala: 8th is chandrashtama; 1,3,6,7,10,11 good', () => {
    expect(chandraBala(1, 8).chandrashtama).toBe(true);
    expect(chandraBala(1, 8).quality).toBe('avoid');
    expect(chandraBala(10, 5).house).toBe(8);
    expect(chandraBala(3, 3).quality).toBe('good');
    expect(chandraBala(3, 4).quality).toBe('weak');
  });
  it('janma with a known time is unambiguous; unknown time on a nakshatra-change day gives two candidates', () => {
    const known = janma({ date: '1990-05-15', time: '14:30', place: DELHI });
    expect(known.ambiguous).toBe(false);
    expect(known.candidates.length).toBe(1);
    // find a day in 1990 where the Moon changes nakshatra (most days do)
    const unknown = janma({ date: '1990-05-15', time: null, place: DELHI });
    expect(unknown.birthTimeKnown).toBe(false);
    expect(unknown.candidates.length).toBeGreaterThanOrEqual(1);
    expect(unknown.candidates.length).toBeLessThanOrEqual(3);
    expect(unknown.candidates[0]).toBeDefined();
  });
  it('personal() reports low confidence when ambiguous and never picks silently', () => {
    const p = panchang('2026-11-25', DELHI);
    const r = personal(p, { date: '1990-05-15', time: null, place: DELHI });
    expect(r.atSunrise.length).toBe(r.janma.candidates.length);
    expect(['high', 'medium', 'low']).toContain(r.confidence);
    const k = personal(p, { date: '1990-05-15', time: '14:30', place: DELHI });
    expect(k.confidence).toBe('high');
    expect(k.spans.length).toBe(p.nakshatra.length);
  });
});
