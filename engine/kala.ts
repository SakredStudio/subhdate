// L2 kala: divisions of the Vedic day. Every window is a fraction of THIS day's daylight (D) or
// night (N), never a fixed clock time. Tables live in data/kala.json with their sources.
// See docs/ENGINE-DESIGN.md §4 and research/02 §2.6.

import type { PanchangDay, NakshatraSpan } from './panchanga.ts';
import KALA from './data/kala.json' with { type: 'json' };

export interface Window { start: Date; end: Date; }
export interface NamedWindow extends Window { name: string; quality: 'good' | 'verygood' | 'neutral' | 'avoid' | 'bad' | 'conflict'; lord?: string; index: number; }

export interface KalaTable {
  rahuKaal: Window; yamaganda: Window; gulika: Window;
  abhijit: Window | null;            // null on Wednesday (configurable)
  abhijitSuppressedOnWednesday: boolean;
  brahmaMuhurta: Window;
  muhurtas: NamedWindow[];           // 30: 15 day + 15 night
  durmuhurta: Window[];
  choghadiya: { day: NamedWindow[]; night: NamedWindow[] };
  hora: { day: NamedWindow[]; night: NamedWindow[] };
  pradosha: Window;                  // sunset + 6 ghatis (festival puja)
  pradoshaVrata: Window;             // sunset + 3 ghatis
  varjyam: Window[];                 // 0..2 windows of this Vedic day
  amritKaal: Window[];
  sandhya: Window[];                 // sunrise, noon, sunset +- 1 ghati
  sources: Record<string, string>;
}

const win = (start: number, end: number): Window => ({ start: new Date(start), end: new Date(end) });

function eighth(day: PanchangDay, idx1: number): Window {
  const seg = day.dayLength / 8;
  const s = day.sunrise.getTime() + (idx1 - 1) * seg;
  return win(s, s + seg);
}

export interface KalaOptions { abhijitOnWednesday?: boolean; }

/** The kala table for a PanchangDay. */
export function kala(day: PanchangDay, opts: KalaOptions = {}): KalaTable {
  const wd = day.vara.index;
  const R = day.sunrise.getTime(), S = day.sunset.getTime(), R2 = day.nextSunrise.getTime();
  const D = S - R, N = R2 - S;
  const K = KALA as any;

  // 30 muhurtas
  const mD = D / 15, mN = N / 15;
  const muhurtas: NamedWindow[] = [];
  for (let i = 0; i < 30; i++) {
    const s = i < 15 ? R + i * mD : S + (i - 15) * mN;
    const e = i < 15 ? s + mD : s + mN;
    muhurtas.push({ start: new Date(s), end: new Date(e), name: K.muhurtas.names[i], quality: K.muhurtas.quality[i], index: i + 1 });
  }
  const abhijitSuppressed = K.muhurtas.abhijitNotOnWeekday.includes(wd) && !opts.abhijitOnWednesday;
  const abhijitWin = muhurtas[K.muhurtas.abhijitIndex - 1];
  const brahma = muhurtas[K.muhurtas.brahmaIndex - 1];
  const durmuhurta: Window[] = (K.durmuhurta.byWeekday[wd] as number[]).map(i => ({ start: muhurtas[i - 1].start, end: muhurtas[i - 1].end }));

  // Choghadiya: 8 of D/8 by day, 8 of N/8 by night
  const seq: string[] = K.choghadiya.sequence; const lords: string[] = K.choghadiya.lords;
  const start = K.choghadiya.dayStart[wd];
  // day: +1 through the sequence from the weekday's start; night: first = start+5, then -2 each slot (published table)
  const chog = (base: number, len: number, offset: number, step: number): NamedWindow[] => Array.from({ length: 8 }, (_, i) => {
    const k = ((start + offset + step * i) % 7 + 7) % 7;
    return { start: new Date(base + i * len), end: new Date(base + (i + 1) * len), name: seq[k], lord: lords[k], quality: K.choghadiya.quality[seq[k]], index: i + 1 };
  });
  const choghadiya = { day: chog(R, D / 8, 0, 1), night: chog(S, N / 8, K.choghadiya.nightOffset, K.choghadiya.nightStep) };

  // Hora: 12 of D/12 by day, 12 of N/12 by night; chain starts at the weekday lord
  const chain: string[] = K.hora.chain;
  const lordIdx = chain.indexOf(day.vara.lord);
  const hora = (base: number, len: number, offset: number): NamedWindow[] => Array.from({ length: 12 }, (_, i) => {
    const lord = chain[(lordIdx + offset + i) % 7];
    return { start: new Date(base + i * len), end: new Date(base + (i + 1) * len), name: lord, lord, quality: K.hora.quality[lord], index: i + 1 };
  });

  // Pradosha
  const ghatiFestival = 24 * 60000; // 1 ghati = 24 min (clock ghati, used by Drik for pradosha)
  const pradosha = win(S, S + K.pradosha.festivalGhatis * ghatiFestival);
  const pradoshaVrata = win(S, S + K.pradosha.vrataGhatis * ghatiFestival);

  // Varjyam / Amrit kaal from the nakshatra's own duration (1 ghati = T/60)
  const varjyam: Window[] = []; const amritKaal: Window[] = [];
  const addNakWindows = (n: NakshatraSpan, next: NakshatraSpan | undefined) => {
    const T = n.end.getTime() - n.start.getTime(); const g = T / 60;
    const vs = n.start.getTime() + (K.varjyam.startGhati[n.num - 1] - 1) * g; // Drik counts "51" as the 51st ghati = 50 ghatis elapsed
    const ve = vs + K.varjyam.lengthGhatis * g;
    if (ve > R && vs < R2) varjyam.push(win(Math.max(vs, R), Math.min(ve, R2)));
    // Amrit kaal = varjyam start + 24 ghatis; may roll into the next nakshatra (use its ghati there)
    let as = vs + K.varjyam.amritOffsetGhatis * g, ag = g;
    if (as >= n.end.getTime()) {
      if (!next) return;
      const over = (as - n.end.getTime()) / g; // ghatis past the end, in this nakshatra's ghati
      ag = (next.end.getTime() - next.start.getTime()) / 60;
      as = next.start.getTime() + over * ag;
    }
    const ae = as + K.varjyam.lengthGhatis * ag;
    if (ae > R && as < R2) amritKaal.push(win(Math.max(as, R), Math.min(ae, R2)));
  };
  // consider the nakshatra holding at sunrise, the ones ending before next sunrise, and the previous one (its windows may reach into today)
  const naks = day.nakshatra;
  for (let i = 0; i < naks.length; i++) addNakWindows(naks[i], naks[i + 1]);

  const g1 = D / 30; // 1 ghati of this day's daylight (sandhya uses day-based ghati)
  const noon = (R + S) / 2;
  const sandhya = [win(R - g1, R + g1), win(noon - g1, noon + g1), win(S - g1, S + g1)];

  return {
    rahuKaal: eighth(day, K.eighths.rahuKaal[wd]),
    yamaganda: eighth(day, K.eighths.yamaganda[wd]),
    gulika: eighth(day, K.eighths.gulika[wd]),
    abhijit: abhijitSuppressed ? null : { start: abhijitWin.start, end: abhijitWin.end },
    abhijitSuppressedOnWednesday: abhijitSuppressed,
    brahmaMuhurta: { start: brahma.start, end: brahma.end },
    muhurtas, durmuhurta, choghadiya,
    hora: { day: hora(R, D / 12, 0), night: hora(S, N / 12, 12) },
    pradosha, pradoshaVrata, varjyam, amritKaal, sandhya,
    sources: {
      eighths: K.eighths.source, choghadiya: K.choghadiya.source, hora: K.hora.source, muhurtas: K.muhurtas.source,
      durmuhurta: K.durmuhurta.source, brahmaMuhurta: K.brahmaMuhurta.source, pradosha: K.pradosha.source, varjyam: K.varjyam.source, sandhya: K.sandhya.source,
    },
  };
}

export const inWindow = (t: Date, w: Window | null | undefined) => !!w && t.getTime() >= w.start.getTime() && t.getTime() < w.end.getTime();
export const windowAt = <T extends Window>(list: T[], t: Date): T | undefined => list.find(w => inWindow(t, w));
