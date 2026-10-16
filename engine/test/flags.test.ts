import { describe, it, expect } from 'vitest';
import { panchang } from '../panchanga.ts';
import { dayFlags, flagsAt, hasFlag } from '../flags.ts';
import { hhmm } from '../time.ts';

const DELHI = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' };
const AHMEDABAD = { lat: 23.0225, lon: 72.5714, tz: 'Asia/Kolkata', name: 'Ahmedabad' };
const ids = (d: string, place = DELHI, region?: any) => dayFlags(panchang(d, place), { region }).map(f => f.id);

describe('L3 flags: calendar windows computed from L1, never hard-coded dates', () => {
  it('Makara sankranti 2027-01-14 at 21:14 IST (Drik: Sun leaves Dhanu 09:14 PM)', () => {
    const f = dayFlags(panchang('2027-01-14', DELHI)).find(x => x.id === 'sankranti_day')!;
    expect(f).toBeDefined();
    expect(f.params!.rashi).toBe('Makara');
    // Swiss Ephemeris (SE_SIDM_LAHIRI) puts the ingress at 21:10 IST; Drik prints 21:14 because its Lahiri value runs ~10-17" ahead of SE's.
    // 4 minutes of sankranti = 10" of ayanamsa. We follow SE and say so in About. Tolerance here: +-8 min.
    const inst = new Date(f.params!.instant as string);
    const target = new Date('2027-01-14T15:44:00Z'); // 21:14 IST
    expect(Math.abs(inst.getTime() - target.getTime())).toBeLessThan(8 * 60000);
    expect(ids('2027-01-14')).toContain('sankranti_window');
    expect(ids('2027-01-14')).toContain('kharmas'); // Sun still in Dhanu at sunrise
    expect(ids('2027-01-16')).not.toContain('kharmas');
  });
  it('Kharmas: Sun in Dhanu from mid-December; not in November', () => {
    expect(ids('2026-12-25')).toContain('kharmas');
    expect(ids('2026-11-25')).not.toContain('kharmas');
  });
  it('Chaturmas runs from Devshayani Ekadashi to Devutthani Ekadashi (2026-11-20/21), Pitru paksha in Sept', () => {
    expect(ids('2026-10-20')).toContain('chaturmas');
    expect(ids('2026-11-25')).not.toContain('chaturmas');
    expect(ids('2026-10-01')).toContain('pitru_paksha'); // Pitru paksha 2026: Sept 27 - Oct 10
    expect(ids('2026-10-20')).not.toContain('pitru_paksha');
  });
  it('Adhika masa flag in Adhika Jyeshtha 2026', () => {
    expect(ids('2026-05-25')).toContain('adhika_masa');
    expect(ids('2026-06-25')).not.toContain('adhika_masa');
  });
  it('Diwali 2026-11-08: amavasya window present, Vijaya Dashami 2026-10-20 is an abujha day (Dashami prevails)', () => {
    const f = dayFlags(panchang('2026-11-08', DELHI)).find(x => x.id === 'amavasya')!;
    expect(f).toBeDefined();
    expect(hhmm(f.window!.start, DELHI.tz)).toBe('11:28');
    // 2026-10-21 has Dashami at sunrise in Delhi (udaya); 10-20 has Navami at sunrise
    expect(ids('2026-10-21')).toContain('abujha_muhurta');
  });
  it('Vinchudo (Moon in Vrishchika) is reported for the west preset only', () => {
    // Drik Ahmedabad 2026-11-10 lists Vinchudo; Moon in Vishakha/Anuradha -> Vrishchika
    expect(ids('2026-11-10', AHMEDABAD, 'west')).toContain('vinchudo');
    expect(ids('2026-11-10', AHMEDABAD, 'north')).not.toContain('vinchudo');
  });
});

describe('L3 flags: vara x nakshatra / tithi tables', () => {
  it('2026-10-20 (Tue, Navami at sunrise, Shravana): checks Dagdha/Visha/Hutashana logic consistency', () => {
    const f = dayFlags(panchang('2026-10-20', DELHI));
    // Tuesday tables: Dagdha 5, Visha 7, Hutashana 7 -> none for Navami
    expect(f.map(x => x.id)).not.toContain('dagdha_tithi');
    expect(f.map(x => x.id)).toContain('rahu_kaal');
    expect(f.map(x => x.id)).toContain('rikta_tithi'); // Navami is Rikta
  });
  it('Sarvartha Siddhi: Monday + Rohini/Mrigashira/Pushya/Hasta/Anuradha/Shravana', () => {
    // find a Monday with one of those nakshatras at sunrise in Oct 2026 - Dec 2026
    let found = false;
    for (let i = 0; i < 90 && !found; i++) {
      const d = new Date(Date.UTC(2026, 9, 19 + i)).toISOString().slice(0, 10);
      const p = panchang(d, DELHI);
      if (p.vara.short !== 'Mon') continue;
      if ([4, 5, 8, 13, 17, 22].includes(p.nakshatra[0].num)) { expect(ids(d)).toContain('sarvartha_siddhi'); found = true; }
      else expect(ids(d)).not.toContain('sarvartha_siddhi');
    }
    expect(found).toBe(true);
  });
  it('Bhadra flags carry a loka and Vishti timing; panchaka windows end at the end of Revati', () => {
    let bhadra = 0, panchaka = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.UTC(2026, 9, 20 + i)).toISOString().slice(0, 10);
      const f = dayFlags(panchang(d, DELHI));
      for (const x of f) {
        if (x.id === 'bhadra') { bhadra++; expect(['martya', 'swarga', 'patala']).toContain(x.params!.loka); }
        if (x.id === 'panchaka') { panchaka++; expect(x.window!.end.getTime()).toBeGreaterThan(x.window!.start.getTime()); }
      }
    }
    expect(bhadra).toBeGreaterThanOrEqual(6); // ~8 Vishti karanas per lunar month
    expect(panchaka).toBeGreaterThanOrEqual(4); // ~5 days per month
  });
  it('flagsAt filters window flags by instant', () => {
    const p = panchang('2026-10-20', DELHI);
    const f = dayFlags(p);
    const rahu = f.find(x => x.id === 'rahu_kaal')!;
    const inside = new Date((rahu.window!.start.getTime() + rahu.window!.end.getTime()) / 2);
    expect(hasFlag(flagsAt(f, inside), 'rahu_kaal')).toBe(true);
    expect(hasFlag(flagsAt(f, p.sunrise), 'rahu_kaal')).toBe(false);
  });
  it('eclipse: 2026-08-28 lunar eclipse day is flagged for Delhi (partial lunar eclipse, Aug 28 2026)', () => {
    const f = ids('2026-08-28');
    expect(f.some(x => x === 'eclipse_day' || x === 'eclipse_window')).toBe(true);
  });
});
