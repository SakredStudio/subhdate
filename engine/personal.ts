// L4 personal: janma nakshatra / rashi from birth data, Tara bala, Chandra bala, Chandrashtama.
// Birth data never leaves this function's inputs; nothing is stored here.
// Sources: research/02 §3.2 (Tarabala [S] dekhopanchang/shubhpanchang; Chandrabala [S] dekho 17-3, Raman).
// Unknown birth time: docs/ENGINE-DESIGN.md §6 — show both candidates, never guess.

import type { Place } from './astro.ts';
import { moonSidereal } from './astro.ts';
import { localMidnightUtc, parseIsoDate, addMinutes } from './time.ts';
import { NAKSHATRA_NAMES, RASHI_NAMES } from './names.ts';
import type { PanchangDay } from './panchanga.ts';

export interface Birth {
  date: string;            // 'YYYY-MM-DD' local civil date at `place`
  time?: string | null;    // 'HH:MM' local, null/undefined when unknown
  place: Place;
}
export interface Janma {
  nakshatra: number; nakshatraName: string; pada: number;
  rashi: number; rashiName: string;
  moonLongitude: number;
}
export interface JanmaResult {
  /** best candidate (the one at the known time, or the one holding for most of the day) */
  primary: Janma;
  /** true when the birth time is unknown and the Moon changed nakshatra or rashi that day */
  ambiguous: boolean;
  candidates: Janma[];
  birthTimeKnown: boolean;
}

function janmaAt(t: Date): Janma {
  const ml = moonSidereal(t);
  const nak = Math.floor(ml / (360 / 27)) + 1;
  const rashi = Math.floor(ml / 30) + 1;
  return { nakshatra: nak, nakshatraName: NAKSHATRA_NAMES[nak - 1], pada: Math.floor((ml % (360 / 27)) / (360 / 108)) + 1, rashi, rashiName: RASHI_NAMES[rashi - 1], moonLongitude: ml };
}

/** Janma nakshatra and rashi from birth data. */
export function janma(birth: Birth): JanmaResult {
  const { y, m, d } = parseIsoDate(birth.date);
  const midnight = localMidnightUtc(y, m, d, birth.place.tz);
  if (birth.time) {
    const [hh, mm] = birth.time.split(':').map(Number);
    const t = addMinutes(midnight, hh * 60 + mm);
    const j = janmaAt(t);
    return { primary: j, ambiguous: false, candidates: [j], birthTimeKnown: true };
  }
  // unknown time: sample the day; collect distinct (nakshatra, rashi) pairs with their share of the day
  const samples = 24 * 4;
  const counts = new Map<string, { j: Janma; n: number }>();
  for (let i = 0; i < samples; i++) {
    const j = janmaAt(addMinutes(midnight, i * 15));
    const key = `${j.nakshatra}-${j.rashi}`;
    const c = counts.get(key); if (c) c.n++; else counts.set(key, { j, n: 1 });
  }
  const cands = [...counts.values()].sort((a, b) => b.n - a.n).map(c => c.j);
  return { primary: cands[0], ambiguous: cands.length > 1, candidates: cands, birthTimeKnown: false };
}

export const TARA_NAMES = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhaka', 'Vadha', 'Mitra', 'Ati-mitra'] as const;
const TARA_GOOD = new Set([2, 4, 6, 8, 9]);
export interface TaraBala { count: number; tara: number; name: string; good: boolean; cycle: 1 | 2 | 3; source: string; }
/** Tara bala of day-nakshatra `dayNak` for a person born in `janmaNak` (both 1..27). */
export function taraBala(janmaNak: number, dayNak: number): TaraBala {
  const count = ((dayNak - janmaNak + 27) % 27) + 1;
  const tara = ((count - 1) % 9) + 1;
  return { count, tara, name: TARA_NAMES[tara - 1], good: TARA_GOOD.has(tara), cycle: (Math.ceil(count / 9)) as 1 | 2 | 3, source: 'research/02 §3.2 Tarabala [S] dekhopanchang, shubhpanchang; bad taras milder in cycles 2-3 [M]' };
}

export interface ChandraBala { house: number; quality: 'good' | 'weak' | 'avoid'; chandrashtama: boolean; source: string; }
/** Chandra bala: house of the day's Moon rashi counted from the janma rashi (1..12). */
export function chandraBala(janmaRashi: number, dayRashi: number): ChandraBala {
  const house = ((dayRashi - janmaRashi + 12) % 12) + 1;
  const quality = [1, 3, 6, 7, 10, 11].includes(house) ? 'good' : [4, 8, 12].includes(house) ? 'avoid' : 'weak';
  return { house, quality, chandrashtama: house === 8, source: 'research/02 §3.2 Chandrabala [S] dekhopanchang 17-3, Raman; 8th = Chandrashtama hard block' };
}

export interface PersonalBala {
  janma: JanmaResult;
  /** per candidate janma, the bala for the nakshatra/rashi holding at sunrise and for each nakshatra span of the day */
  atSunrise: { janma: Janma; tara: TaraBala; chandra: ChandraBala }[];
  spans: { nakshatra: number; start: Date; end: Date; tara: TaraBala[] }[];
  confidence: 'high' | 'medium' | 'low';
}

/** L4 for a day and a birth. */
export function personal(day: PanchangDay, birth: Birth): PersonalBala {
  const j = janma(birth);
  const atSunrise = j.candidates.map(c => ({ janma: c, tara: taraBala(c.nakshatra, day.nakshatra[0].num), chandra: chandraBala(c.rashi, day.moonRashi.index) }));
  const spans = day.nakshatra.map(n => ({ nakshatra: n.num, start: n.start, end: n.end, tara: j.candidates.map(c => taraBala(c.nakshatra, n.num)) }));
  return { janma: j, atSunrise, spans, confidence: j.birthTimeKnown ? 'high' : j.ambiguous ? 'low' : 'medium' };
}
