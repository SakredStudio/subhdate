import { describe, it, expect } from 'vitest';
import * as A from 'astronomy-engine';
import { ayanamsa, ayanamsaAt, sunrise, sunset, moonrise, searchIncreasingAngle, moonSidereal, elongation, moonTropical, sunTropical } from '../astro.ts';
import { jdFromDate, localMidnightUtc, hhmm, tzOffsetMinutes, civil, isoDate } from '../time.ts';
import { nutation } from '../nutation.ts';

const TORONTO = { lat: 43.6532, lon: -79.3832, tz: 'America/Toronto', name: 'Toronto' };
const DELHI = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' };

const dms = (deg: number) => { const d = Math.floor(deg); const m = Math.floor((deg - d) * 60); const s = ((deg - d) * 60 - m) * 60; return `${d}°${m}'${s.toFixed(1)}"`; };

describe('L0 ayanamsa', () => {
  it('Lahiri 2000-01-01 ≈ 23°51′', () => {
    const a = ayanamsa(jdFromDate(new Date('2000-01-01T00:00:00Z')));
    expect(a).toBeCloseTo(23.853203, 3); // Swiss Ephemeris SE_SIDM_LAHIRI: 23.853203°
    expect(dms(a).startsWith("23°51'")).toBe(true);
  });
  it('Lahiri 2026-10-15 ≈ 24°13′–24°14′', () => {
    const a = ayanamsa(jdFromDate(new Date('2026-10-15T00:00:00Z')));
    expect(a).toBeCloseTo(24.233508, 3); // Swiss Ephemeris: 24.233508° = 24°14'00.6"
    expect(a).toBeGreaterThan(24 + 13 / 60);
    expect(a).toBeLessThan(24 + 15 / 60);
  });
  it('nutation at J2000 ≈ −13.9″', () => {
    expect(nutation(2451545.0).dpsi).toBeCloseTo(-13.9, 0);
  });
});

describe('L0 rise/set', () => {
  it('Toronto sunrise 2026-10-16 is 07:33 EDT (timeanddate 7:33)', () => {
    const start = localMidnightUtc(2026, 10, 16, TORONTO.tz);
    const r = sunrise(TORONTO, start)!;
    expect(hhmm(r, TORONTO.tz)).toBe('07:33');
    const s = sunset(TORONTO, start)!;
    expect(hhmm(s, TORONTO.tz)).toBe('18:32');
  });
  it('Delhi sunrise 2026-10-16 is 06:22 IST', () => {
    const start = localMidnightUtc(2026, 10, 16, DELHI.tz);
    expect(hhmm(sunrise(DELHI, start)!, DELHI.tz)).toBe('06:22');
  });
  it('center convention rises later than limb', () => {
    const start = localMidnightUtc(2026, 10, 16, DELHI.tz);
    const limb = sunrise(DELHI, start, 'limb')!; const ctr = sunrise(DELHI, start, 'center')!;
    expect(ctr.getTime() - limb.getTime()).toBeGreaterThan(120000);
    expect(ctr.getTime() - limb.getTime()).toBeLessThan(360000);
  });
  it('moonrise exists for Delhi 2026-10-16', () => {
    const start = localMidnightUtc(2026, 10, 16, DELHI.tz);
    expect(moonrise(DELHI, start)).not.toBeNull();
  });
});

describe('L0 root finding', () => {
  it('new moon instants Oct/Nov 2026: root of elongation = 0, within ~1 min of astronomy-engine SearchMoonPhase', () => {
    // SearchMoonPhase uses astronomy-engine's other Moon model (GeoMoon); EclipticGeoMoon is the one that
    // matches Swiss Ephemeris to a few arcseconds, so we only sanity-check against SearchMoonPhase here.
    for (const from of ['2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z']) {
      const ref = A.SearchMoonPhase(0, new Date(from), 40)!.date;
      const mine = searchIncreasingAngle(elongation, 360, new Date(from), 40)!;
      expect(Math.abs(mine.getTime() - ref.getTime())).toBeLessThan(90000);
      const e = elongation(mine); expect(Math.min(e, 360 - e)).toBeLessThan(0.0005);
    }
  });
  it('nakshatra boundary search converges', () => {
    const start = new Date('2026-10-20T00:00:00Z');
    const t = searchIncreasingAngle(moonSidereal, 40, start, 30)!; // 40° = start of Rohini
    expect(Math.abs(moonSidereal(t) - 40)).toBeLessThan(0.0005);
  });
});

describe('time helpers', () => {
  it('Toronto DST offsets', () => {
    expect(tzOffsetMinutes(new Date('2026-10-16T12:00:00Z'), 'America/Toronto')).toBe(-240);
    expect(tzOffsetMinutes(new Date('2026-12-16T12:00:00Z'), 'America/Toronto')).toBe(-300);
    expect(tzOffsetMinutes(new Date('2026-12-16T12:00:00Z'), 'Asia/Kolkata')).toBe(330);
  });
  it('local midnight and civil round-trip', () => {
    const m = localMidnightUtc(2026, 11, 1, 'America/Toronto'); // DST ends this day at 02:00
    const c = civil(m, 'America/Toronto');
    expect([c.year, c.month, c.day, c.hour]).toEqual([2026, 11, 1, 0]);
    expect(isoDate(m, 'America/Toronto')).toBe('2026-11-01');
  });
});
