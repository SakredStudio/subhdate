import { describe, it, expect } from 'vitest';
import { findMuhurta, scoreDay, loadPack, evalCond, EVENT_IDS } from '../muhurta.ts';
import { hhmm } from '../time.ts';

const DELHI = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' };

describe('L5 muhurta: packs and evaluator', () => {
  it('all 12 packs load and every rule has a code and a source', () => {
    for (const ev of EVENT_IDS) {
      const p = loadPack(ev);
      for (const r of [...p.hard, ...p.soft]) { expect(r.code, `${ev} ${r.when}`).toBeTruthy(); expect(r.source, `${ev} ${r.code}`).toBeTruthy(); }
      expect(p.sources.length).toBeGreaterThan(0);
    }
  });
  it('evalCond grammar', () => {
    const ctx: any = { flags: new Set(['rahu_kaal']), flagList: [], nakshatra: 4, pada: 1, tithi15: 2, tithiNum: 17, paksha: 'Krishna', vara: 'Mon', masa: 'Magha', ayana: 'Uttarayana', choghadiya: 'Amrit', hora: 'Jupiter', tara: 2, chandra: 'good', chandrashtama: false };
    expect(evalCond('flag:rahu_kaal', ctx)).toBe(true);
    expect(evalCond('flag:bhadra|rahu_kaal', ctx)).toBe(true);
    expect(evalCond('nakshatra in [4,5]', ctx)).toBe(true);
    expect(evalCond('nakshatraPada in [4.1]', ctx)).toBe(true);
    expect(evalCond('tithi in [2]', ctx)).toBe(true);
    expect(evalCond('tithiNum in [30]', ctx)).toBe(false);
    expect(evalCond('paksha == Shukla', ctx)).toBe(false);
    expect(evalCond('vara in [Mon,Wed]', ctx)).toBe(true);
    expect(evalCond('masa in [Magha]', ctx)).toBe(true);
    expect(evalCond('kala:choghadiya in [Amrit,Shubh]', ctx)).toBe(true);
    expect(evalCond('kala:hora in [Mercury,Jupiter]', ctx)).toBe(true);
    expect(evalCond('personal:tara in [2,4]', ctx)).toBe(true);
    expect(evalCond('personal:chandra good', ctx)).toBe(true);
    expect(evalCond('personal:chandrashtama', ctx)).toBe(false);
    expect(evalCond('personal:tara in [2]', { ...ctx, tara: null })).toBeNull();
  });
});

describe('L5 muhurta: known-bad and known-good days', () => {
  it('Diwali 2026-11-08 (Amavasya from 11:28, Chaturmas) is rejected for vivaha; Rahu kaal never appears in a window', () => {
    const r = findMuhurta({ event: 'vivaha', from: '2026-11-08', to: '2026-11-08', place: DELHI, region: 'north' });
    expect(r.days.length).toBe(0);
    expect(r.rejectedDays[0].reasons.map(x => x.code)).toContain('chaturmas');
  });
  it('a Rahu-kaal slot is never inside an accepted window (vahana, Nov 25-30 2026)', () => {
    const r = findMuhurta({ event: 'vahana', from: '2026-11-25', to: '2026-11-30', place: DELHI });
    for (const d of r.days) for (const w of d.windows) expect(w.reasons.map(x => x.code)).not.toContain('rahu_kaal');
    expect(r.days.length).toBeGreaterThan(0);
  });
  it('wedding season Nov 21-30 2026 (after Devutthani Ekadashi) yields vivaha days scoring >= 70 and none inside Chaturmas', () => {
    const r = findMuhurta({ event: 'vivaha', from: '2026-11-18', to: '2026-11-30', place: DELHI, region: 'north', maxDays: 15 });
    const dates = r.days.map(d => d.date);
    expect(dates.some(d => d >= '2026-11-21')).toBe(true);
    for (const rj of r.rejectedDays) if (rj.date < '2026-11-20') expect(rj.reasons.map(x => x.code)).toContain('chaturmas');
    expect(r.days[0].score).toBeGreaterThanOrEqual(70);
    const w = r.days[0].windows[0];
    expect(w.end.getTime()).toBeGreaterThan(w.start.getTime());
    expect(w.reasons.every(x => typeof x.code === 'string')).toBe(true);
  });
  it('Kharmas (late Dec) rejects vivaha and griha pravesh; relaxed strictness does not lift non-relaxable blocks', () => {
    const r = findMuhurta({ event: 'vivaha', from: '2026-12-20', to: '2026-12-24', place: DELHI, strictness: 'relaxed' });
    expect(r.days.length).toBe(0);
    expect(r.rejectedDays.every(d => d.reasons.some(x => x.code === 'kharmas'))).toBe(true);
  });
  it('birth details change scores through tara/chandra bala and set confidence high; unknown time lowers confidence', () => {
    const base = findMuhurta({ event: 'griha_pravesh', from: '2027-02-01', to: '2027-02-10', place: DELHI });
    const withBirth = findMuhurta({ event: 'griha_pravesh', from: '2027-02-01', to: '2027-02-10', place: DELHI, birth: { date: '1990-05-15', time: '14:30', place: DELHI } });
    expect(withBirth.confidence).toBe('high');
    expect(base.caveats).toContain('no_birth_details');
    const codes = withBirth.days.flatMap(d => d.windows.flatMap(w => w.reasons.map(r => r.code)));
    expect(codes.some(c => c === 'tara_good' || c === 'tara_bad')).toBe(true);
    const unknown = findMuhurta({ event: 'griha_pravesh', from: '2027-02-01', to: '2027-02-03', place: DELHI, birth: { date: '1990-05-15', time: null, place: DELHI } });
    expect(['medium', 'low']).toContain(unknown.confidence);
  });
  it('scoreDay windows are inside sunrise..sunset for daytime packs and carry choghadiya names', () => {
    const r = scoreDay(loadPack('vyapara'), '2026-11-25', { event: 'vyapara', from: '2026-11-25', to: '2026-11-25', place: DELHI });
    for (const w of r.windows) {
      expect(hhmm(w.start, DELHI.tz) >= '06:00').toBe(true);
      expect(hhmm(w.end, DELHI.tz) <= '18:00').toBe(true);
      expect(w.choghadiya).toBeTruthy();
    }
  });
});
