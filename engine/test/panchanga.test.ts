import { describe, it, expect } from 'vitest';
import { panchang, amantaMonth, limbsAt } from '../panchanga.ts';
import { hhmm } from '../time.ts';

const DELHI = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' };
const AHMEDABAD = { lat: 23.0225, lon: 72.5714, tz: 'Asia/Kolkata', name: 'Ahmedabad' };
const TORONTO = { lat: 43.6532, lon: -79.3832, tz: 'America/Toronto', name: 'Toronto' };

describe('L1 panchanga: known anchors (research/01 §3 festival dates)', () => {
  it('2026-10-20 Delhi: Dashami begins 12:50 IST and prevails in the afternoon (Vijaya Dashami)', () => {
    const p = panchang('2026-10-20', DELHI);
    expect(p.tithi[0].num).toBe(9);
    expect(p.tithi[1].num).toBe(10);
    expect(hhmm(p.tithi[1].start, DELHI.tz)).toBe('12:50');
    expect(p.paksha).toBe('Shukla');
    expect(p.masa.amanta.name).toBe('Ashwina');
    expect(p.masa.amanta.adhika).toBe(false);
  });
  it('2026-11-08 Delhi is Diwali: Amavasya from 11:28, amanta Ashwina (Gujarati) = purnimanta Kartika (North)', () => {
    const p = panchang('2026-11-08', DELHI);
    expect(p.tithi[1].num).toBe(30);
    expect(hhmm(p.tithi[1].start, DELHI.tz)).toBe('11:28');
    expect(p.masa.amanta.name).toBe('Ashwina');
    expect(p.masa.purnimanta.name).toBe('Kartika');
  });
  it('2026-10-29 Delhi is Kartika Krishna Chaturthi purnimanta = Ashwina Krishna 4 amanta (Karwa Chauth)', () => {
    const p = panchang('2026-10-29', DELHI);
    expect(p.tithi[0].num).toBe(19); // Krishna 4
    expect(p.masa.amanta.name).toBe('Ashwina');
    expect(p.masa.purnimanta.name).toBe('Kartika');
  });
  it('Adhika Jyeshtha 2026 (mid-May to mid-June) is detected, nija Jyeshtha follows', () => {
    const a = panchang('2026-05-25', DELHI);
    expect(a.masa.amanta.name).toBe('Jyeshtha');
    expect(a.masa.amanta.adhika).toBe(true);
    const b = panchang('2026-06-25', DELHI);
    expect(b.masa.amanta.name).toBe('Jyeshtha');
    expect(b.masa.amanta.adhika).toBe(false);
  });
  it('Gujarati Vikram Samvat rolls on Kartika Shukla 1 (2026-11-10 -> 2083), north Vikram already 2083', () => {
    const before = panchang('2026-11-09', AHMEDABAD); // still Amavasya at sunrise
    const after = panchang('2026-11-10', AHMEDABAD);
    expect(before.samvatsara.vikramGujarati).toBe(2082);
    expect(after.samvatsara.vikramGujarati).toBe(2083);
    expect(before.samvatsara.vikram).toBe(2083);
    expect(after.samvatsara.shaka).toBe(1948);
    expect(after.samvatsara.nameSouth).toBe('Parabhava');
    expect(after.masa.amanta.name).toBe('Kartika');
    expect(after.tithi[0].num).toBe(1);
  });
  it('vara is the weekday of the sunrise: 2026-10-16 is Friday', () => {
    expect(panchang('2026-10-16', DELHI).vara.short).toBe('Fri');
    expect(panchang('2026-10-16', TORONTO).vara.short).toBe('Fri');
  });
});

describe('L1 panchanga: structure and properties', () => {
  it('spans are contiguous, first holds at sunrise, last ends after next sunrise', () => {
    for (const d of ['2026-10-16', '2026-11-08', '2026-12-25']) {
      const p = panchang(d, DELHI);
      for (const list of [p.tithi, p.nakshatra, p.yoga, p.karana]) {
        expect(list[0].start.getTime()).toBeLessThanOrEqual(p.sunrise.getTime());
        expect(list[0].end.getTime()).toBeGreaterThan(p.sunrise.getTime());
        for (let i = 1; i < list.length; i++) expect(list[i].start.getTime()).toBe(list[i - 1].end.getTime());
        expect(list[list.length - 1].end.getTime()).toBeGreaterThanOrEqual(p.nextSunrise.getTime());
      }
    }
  });
  it('tithi numbers advance by one across spans; 30 tithis take ~29.53 days', () => {
    const p = panchang('2026-10-16', DELHI);
    for (let i = 1; i < p.tithi.length; i++) expect(p.tithi[i].num).toBe(p.tithi[i - 1].num % 30 + 1);
    const a = panchang('2026-10-20', DELHI).tithi[0]; // some tithi
    const b = panchang('2026-11-18', DELHI).tithi.find(t => t.num === a.num);
    if (b) {
      const days = (b.end.getTime() - a.end.getTime()) / 86400000;
      expect(Math.abs(days - 29.53)).toBeLessThan(1.2);
    }
  });
  it('ayana and ritu: mid-January is Uttarayana after Makara sankranti; October is Sharad', () => {
    expect(panchang('2027-01-20', DELHI).ayana).toBe('Uttarayana');
    expect(panchang('2026-12-20', DELHI).ayana).toBe('Dakshinayana');
    expect(panchang('2026-10-20', DELHI).ritu).toBe('Sharad');
  });
  it('Toronto day boundary: sunrise ~07:33 and the civil date of sunrise equals the requested date', () => {
    const p = panchang('2026-10-16', TORONTO);
    expect(hhmm(p.sunrise, TORONTO.tz)).toBe('07:33');
    expect(p.dayLength).toBeGreaterThan(10 * 3600000);
    expect(p.dayLength).toBeLessThan(12 * 3600000);
  });
  it('limbsAt agrees with the sunrise span', () => {
    const p = panchang('2026-10-16', DELHI);
    const l = limbsAt(p.sunrise);
    expect(l.tithi).toBe(p.tithi[0].num);
    expect(l.nakshatra).toBe(p.nakshatra[0].num);
    expect(l.yoga).toBe(p.yoga[0].num);
  });
  it('amantaMonth bounds contain the instant', () => {
    const t = new Date('2026-10-16T01:00:00Z');
    const m = amantaMonth(t);
    expect(m.start.getTime()).toBeLessThanOrEqual(t.getTime());
    expect(m.end.getTime()).toBeGreaterThan(t.getTime());
  });
});
