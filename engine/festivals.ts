// Festivals computed from L1 by rule (data/festivals.json), never from a date table.
// Each result carries the local date, the puja window where the tradition defines one, and a
// diaspora note when the local date differs from Delhi's.

import type { Place } from './astro.ts';
import { sunSidereal, searchIncreasingAngle } from './astro.ts';
import { panchang, spanAt, type PanchangDay, type Region } from './panchanga.ts';
import { kala } from './kala.ts';
import { dayFlags } from './flags.ts';
import { isoDate, addDays, parseIsoDate, localMidnightUtc } from './time.ts';
import { MASA_NAMES, tithiName } from './names.ts';
import F from './data/festivals.json' with { type: 'json' };

export interface FestivalDef {
  id: string; names: Record<string, string>; masa?: number; tithi?: number | number[]; rule: string; rashi?: number;
  deity?: string; purnimantaName?: string; window?: string; note?: string; source: string; recurring?: boolean;
}
export interface FestivalResult {
  id: string; names: Record<string, string>; date: string; deity?: string; rule: string; source: string;
  window?: { start: Date; end: Date; label: string } | null;
  moonrise?: Date | null;
  tithiLabel?: string;
  note?: string;
  diaspora?: { delhiDate: string; differs: boolean } | null;
  bhadraNote?: { until: Date } | null;
}

const DELHI: Place = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' };
const DEFS = (F as any).festivals as FestivalDef[];

function prevailsAt(p: PanchangDay, t: Date, tithi: number): boolean {
  const s = spanAt(p.tithi, t);
  return s.num === tithi && t.getTime() >= s.start.getTime() && t.getTime() < s.end.getTime();
}
function occursInDay(p: PanchangDay, tithi: number) {
  return p.tithi.some(s => s.num === tithi && s.start.getTime() < p.nextSunrise.getTime() && s.end.getTime() > p.sunrise.getTime());
}
const frac = (p: PanchangDay, f: number) => new Date(p.sunrise.getTime() + f * p.dayLength);

/** Does `p` qualify as the festival day under `rule` for `tithi`? Returns a score (higher = better) or 0. */
function qualifies(p: PanchangDay, def: FestivalDef, tithi: number, prev: PanchangDay | null): number {
  if (!occursInDay(p, tithi)) return 0;
  switch (def.rule) {
    case 'udaya': return p.tithi[0].num === tithi ? 2 : 1;
    case 'pradosha': { const k = kala(p); const mid = new Date((k.pradosha.start.getTime() + k.pradosha.end.getTime()) / 2); return prevailsAt(p, mid, tithi) ? 2 : (p.tithi.some(s => s.num === tithi && s.start.getTime() < k.pradosha.end.getTime() && s.end.getTime() > k.pradosha.start.getTime()) ? 1 : 0); }
    case 'moonrise': return p.moonrise && prevailsAt(p, p.moonrise, tithi) ? 2 : 0;
    case 'aparahna': return prevailsAt(p, frac(p, 0.7), tithi) ? 2 : (prevailsAt(p, frac(p, 0.6), tithi) || prevailsAt(p, frac(p, 0.8), tithi) ? 1 : 0);
    case 'purvahna': return prevailsAt(p, frac(p, 0.3), tithi) ? 2 : (p.tithi[0].num === tithi ? 1 : 0);
    case 'nishita': { const mid = new Date(p.sunset.getTime() + p.nightLength / 2); return prevailsAt(p, mid, tithi) ? 2 : 0; }
    case 'ekadashi': {
      if (p.tithi[0].num !== tithi) return 0;
      // Smarta: if Dashami still ran at arunodaya (sunrise - 96 min) the fast moves to the next day
      const arunodaya = new Date(p.sunrise.getTime() - 96 * 60000);
      const dashamiAtArunodaya = p.tithi[0].start.getTime() > arunodaya.getTime();
      return dashamiAtArunodaya ? 0 : 2;
    }
    default: return p.tithi[0].num === tithi ? 2 : 1;
  }
}

function windowFor(p: PanchangDay, def: FestivalDef, tithi: number | null): FestivalResult['window'] {
  const k = kala(p);
  const clip = (w: { start: Date; end: Date }, label: string) => {
    if (tithi == null) return { ...w, label };
    const s = p.tithi.find(x => x.num === tithi); if (!s) return { ...w, label };
    const start = new Date(Math.max(w.start.getTime(), s.start.getTime())); const end = new Date(Math.min(w.end.getTime(), s.end.getTime()));
    return end > start ? { start, end, label } : { ...w, label };
  };
  switch (def.window) {
    case 'pradosha': return clip(k.pradosha, 'pradosha');
    case 'pradosha_no_bhadra': return clip(k.pradosha, 'pradosha');
    case 'aparahna': return clip({ start: frac(p, 0.6), end: frac(p, 0.8) }, 'aparahna');
    case 'purvahna': return clip({ start: frac(p, 0.2), end: frac(p, 0.4) }, 'purvahna');
    case 'nishita': { const mid = p.sunset.getTime() + p.nightLength / 2; const half = p.nightLength / 30; return { start: new Date(mid - half), end: new Date(mid + half), label: 'nishita' }; }
    case 'moonrise': return p.moonrise ? { start: p.moonrise, end: new Date(p.moonrise.getTime() + 60 * 60000), label: 'moonrise' } : null;
    case 'day': return { start: p.sunrise, end: p.sunset, label: 'day' };
    default: return null;
  }
}

/** Festivals falling between two civil dates (inclusive) at `place`. Ekadashi recurs; others appear once per lunar year. */
export function festivals(from: string, to: string, place: Place, opts: { region?: Region; withDiaspora?: boolean } = {}): FestivalResult[] {
  const out: FestivalResult[] = [];
  const region = opts.region ?? 'north';
  const { y, m, d } = parseIsoDate(from);
  const end = parseIsoDate(to);
  const endUtc = localMidnightUtc(end.y, end.m, end.d, place.tz);
  // scan days once
  const days: PanchangDay[] = [];
  for (let c = localMidnightUtc(y, m, d, place.tz), i = 0; c.getTime() <= endUtc.getTime() && i < 400; c = addDays(c, 1), i++) days.push(panchang(isoDate(c, place.tz), place, { region }));
  const seen = new Set<string>();
  for (const def of DEFS) {
    if (def.rule === 'sankranti') {
      // Sun's sidereal ingress into def.rashi within the range
      const target = (def.rashi! - 1) * 30;
      let s = days[0].sunrise;
      for (let guard = 0; guard < 3; guard++) {
        const t = searchIncreasingAngle(sunSidereal, target, s, Math.min(400, (endUtc.getTime() - s.getTime()) / 86400000 + 2), 24);
        if (!t || t.getTime() > endUtc.getTime() + 86400000) break;
        // day assignment: ingress after sunset -> next day (punya kaal in the morning)
        let day = days.find(p => t.getTime() >= p.sunrise.getTime() && t.getTime() < p.nextSunrise.getTime());
        if (day && t.getTime() >= day.sunset.getTime()) day = days.find(p => p.date > day!.date) ?? day;
        if (day) {
          const punyaEnd = new Date(t.getTime() + 16 * 24 * 60000);
          const win = t.getTime() >= day.sunset.getTime() || t.getTime() < day.sunrise.getTime()
            ? { start: day.sunrise, end: new Date(Math.min(day.sunset.getTime(), Math.max(punyaEnd.getTime(), day.sunrise.getTime() + 2 * 3600000))), label: 'punya_kaal' }
            : { start: t, end: new Date(Math.min(punyaEnd.getTime(), day.sunset.getTime())), label: 'punya_kaal' };
          out.push({ id: def.id, names: def.names, date: day.date, deity: def.deity, rule: def.rule, source: def.source, window: win, note: def.note, tithiLabel: `${day.sunRashi.name} sankranti ${t.toISOString()}` });
        }
        s = addDays(t, 300);
      }
      continue;
    }
    const tithis = Array.isArray(def.tithi) ? def.tithi : [def.tithi!];
    for (const tithi of tithis) {
      for (let i = 0; i < days.length; i++) {
        const p = days[i];
        if (def.masa != null && p.masa.amanta.index !== def.masa) continue;
        if (def.masa != null && p.masa.amanta.adhika) continue;
        const q = qualifies(p, def, tithi, days[i - 1] ?? null);
        if (!q) continue;
        // among consecutive qualifying days keep the best (score 2 beats 1); for score 1 ties take the first
        const next = days[i + 1];
        if (q === 1 && next && next.masa.amanta.index === p.masa.amanta.index && qualifies(next, def, tithi, p) === 2) continue;
        // aparahna-vyapini festivals (Yama Dwitiya): when the tithi covers the afternoon on both days, the later day is taken (para-viddha)
        if (q === 2 && def.rule === 'aparahna' && next && next.masa.amanta.index === p.masa.amanta.index && qualifies(next, def, tithi, p) === 2) continue;
        const key = `${def.id}|${p.masa.amanta.index}|${tithi}|${p.masa.amanta.start.toISOString()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const res: FestivalResult = {
          id: def.id, names: def.names, date: p.date, deity: def.deity, rule: def.rule, source: def.source,
          window: windowFor(p, def, tithi), moonrise: def.rule === 'moonrise' ? p.moonrise : undefined,
          tithiLabel: `${MASA_NAMES[(def.masa ?? p.masa.amanta.index) - 1]} ${tithi > 15 ? 'Krishna' : 'Shukla'} ${tithiName(tithi)}`,
          note: def.note,
        };
        if (def.window === 'pradosha_no_bhadra' && res.window) {
          const b = dayFlags(p).find(f => f.id === 'bhadra' && f.window && f.window.start < res.window!.end && f.window.end > res.window!.start);
          if (b) { res.bhadraNote = { until: b.window!.end }; if (b.window!.end < res.window.end) res.window.start = new Date(Math.max(res.window.start.getTime(), b.window!.end.getTime())); }
        }
        out.push(res);
        if (!def.recurring) break;
      }
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  if (opts.withDiaspora !== false && place.tz !== DELHI.tz) {
    const delhi = festivals(from, to, DELHI, { region, withDiaspora: false });
    for (const r of out) {
      const d0 = delhi.find(x => x.id === r.id && Math.abs(new Date(x.date).getTime() - new Date(r.date).getTime()) < 3 * 86400000);
      r.diaspora = d0 ? { delhiDate: d0.date, differs: d0.date !== r.date } : null;
    }
  }
  return out;
}

export function festivalDefs(): FestivalDef[] { return DEFS; }
