import { describe, it, expect } from 'vitest';
import { festivals } from '../festivals.ts';
import { hhmm } from '../time.ts';

const DELHI = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' };
const TORONTO = { lat: 43.6532, lon: -79.3832, tz: 'America/Toronto', name: 'Toronto' };
const AHMEDABAD = { lat: 23.0225, lon: 72.5714, tz: 'Asia/Kolkata', name: 'Ahmedabad' };

describe('festivals computed by rule (anchors from research/01 §3 and Drik pages read 2026-10-16)', () => {
  const delhi = festivals('2026-10-15', '2027-03-31', DELHI);
  const byId = (id: string) => delhi.find(f => f.id === id)!;
  it('Karwa Chauth 2026-10-29 (Delhi), moonrise 20:17', () => {
    const f = byId('karwa_chauth');
    expect(f.date).toBe('2026-10-29');
    expect(hhmm(f.moonrise!, DELHI.tz)).toBe('20:17');
  });
  it('Dhanteras 2026-11-06, Diwali 2026-11-08 with pradosha Lakshmi puja window inside Amavasya', () => {
    expect(byId('dhanteras').date).toBe('2026-11-06');
    const d = byId('diwali');
    expect(d.date).toBe('2026-11-08');
    expect(hhmm(d.window!.start, DELHI.tz)).toBe('17:31'); // sunset
    expect(hhmm(d.window!.end, DELHI.tz)).toBe('19:55');   // sunset + 2h24
  });
  it('Govardhan 2026-11-10 (Kartika Shukla 1 at sunrise), Bhai Dooj 2026-11-11, Devutthani Ekadashi 2026-11-20', () => {
    expect(byId('govardhan').date).toBe('2026-11-10');
    expect(byId('bhai_dooj').date).toBe('2026-11-11');
    expect(['2026-11-20', '2026-11-21']).toContain(byId('devutthani_ekadashi').date);
  });
  it('Makar Sankranti 2027-01-15 (ingress 21:10 IST on Jan 14 is after sunset)', () => {
    expect(byId('makar_sankranti').date).toBe('2027-01-15');
  });
  it('Vasant Panchami, Maha Shivaratri, Holika Dahan and Holi fall in Feb/Mar 2027 in that order', () => {
    const ids = ['vasant_panchami', 'maha_shivaratri', 'holika_dahan', 'holi'].map(byId);
    for (const f of ids) expect(f).toBeDefined();
    for (let i = 1; i < ids.length; i++) expect(ids[i].date > ids[i - 1].date).toBe(true);
    expect(ids[3].date > ids[2].date).toBe(true);
    expect(ids[0].date.startsWith('2027-02')).toBe(true);
  });
  it('Ekadashi recurs about twice a month', () => {
    const ek = delhi.filter(f => f.id === 'ekadashi');
    expect(ek.length).toBeGreaterThanOrEqual(10);
    expect(ek.length).toBeLessThanOrEqual(12);
  });
  it('diaspora: Karwa Chauth in Toronto is 2026-10-28 (Chaturthi ends 12:39 on the 29th, before moonrise) with a note', () => {
    const t = festivals('2026-10-15', '2026-11-15', TORONTO);
    const kc = t.find(f => f.id === 'karwa_chauth')!;
    expect(kc.date).toBe('2026-10-28');
    expect(kc.diaspora?.differs).toBe(true);
    expect(kc.diaspora?.delhiDate).toBe('2026-10-29');
    const dw = t.find(f => f.id === 'diwali')!;
    expect(dw.date).toBe('2026-11-08');
    expect(dw.diaspora?.differs).toBe(false);
  });
  it('Gujarati new year note on Govardhan for Ahmedabad', () => {
    const a = festivals('2026-11-01', '2026-11-15', AHMEDABAD, { region: 'west' });
    expect(a.find(f => f.id === 'govardhan')!.note).toBe('gujarati_new_year');
  });
});
