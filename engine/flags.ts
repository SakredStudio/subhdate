// L3 flags: yogas, doshas and calendar windows for a PanchangDay. Pure data lookups over L1/L2.
// Tables and sources: data/yogas.json. See docs/ENGINE-DESIGN.md §5, research/02 §3.3 and §3.5.

import type { PanchangDay, Region } from './panchanga.ts';
import { type KalaTable, kala as kalaOf, type Window } from './kala.ts';
import { sunSidereal, sunTropical, planetTropical, isRetrograde, searchIncreasingAngle, nextLunarEclipse, nextGlobalSolarEclipse, nextLocalSolarEclipse, moonSidereal } from './astro.ts';
import { addDays } from './time.ts';
import { NAKSHATRA_NAMES, RASHI_NAMES, tithiGroup, MASA_NAMES } from './names.ts';
import Y from './data/yogas.json' with { type: 'json' };

export type FlagKind = 'auspicious' | 'inauspicious' | 'info';
export interface Flag {
  id: string;
  kind: FlagKind;
  /** 'day' = holds for the whole Vedic day (or month-level), 'window' = only inside `window` */
  scope: 'day' | 'window' | 'month';
  window?: Window;
  params?: Record<string, string | number | boolean | null>;
  source: string;
}

const T = Y as any;
const tithi15 = (n: number) => ((n - 1) % 15) + 1;
const ord = (masaIndex: number, tithi: number) => (masaIndex - 1) * 30 + tithi;

export interface FlagOptions { region?: Region; kala?: KalaTable; }

/** All flags for a day. Deterministic; every flag carries its data source. */
export function dayFlags(day: PanchangDay, opts: FlagOptions = {}): Flag[] {
  const out: Flag[] = [];
  const wd = day.vara.index;
  const t0 = day.tithi[0];
  const n0 = day.nakshatra[0];
  const sr = day.sunrise, nsr = day.nextSunrise;
  const kalaT = opts.kala ?? kalaOf(day);
  const push = (f: Flag) => out.push(f);

  // vara x nakshatra at sunrise (hold until the Moon leaves the nakshatra)
  const nakWin = (n = n0): Window => ({ start: sr, end: n.end });
  if (T.sarvarthaSiddhi.byWeekday[wd].includes(n0.num) || (T.sarvarthaSiddhi.optional[String(wd)] ?? []).includes(n0.num)) {
    push({ id: 'sarvartha_siddhi', kind: 'auspicious', scope: 'window', window: nakWin(), params: { nakshatra: n0.name, optional: !T.sarvarthaSiddhi.byWeekday[wd].includes(n0.num) }, source: T.sarvarthaSiddhi.source });
  }
  if (T.amritaSiddhi.byWeekday[wd] === n0.num) {
    const ex = T.amritaSiddhi.exceptions[String(wd)];
    push({ id: 'amrita_siddhi', kind: 'auspicious', scope: 'window', window: nakWin(), params: { nakshatra: n0.name, badFor: ex && ex.nakshatra === n0.num ? ex.badFor.join(',') : null }, source: T.amritaSiddhi.source });
  }
  if (wd === T.raviPushya.weekday && n0.num === T.raviPushya.nakshatra) push({ id: 'ravi_pushya', kind: 'auspicious', scope: 'window', window: nakWin(), source: T.raviPushya.source });
  if (wd === T.guruPushya.weekday && n0.num === T.guruPushya.nakshatra) push({ id: 'guru_pushya', kind: 'auspicious', scope: 'window', window: nakWin(), source: T.guruPushya.source });
  if (T.yamaghanta.byWeekday[wd] === n0.num) push({ id: 'yamaghanta', kind: 'inauspicious', scope: 'window', window: nakWin(), params: { nakshatra: n0.name }, source: T.yamaghanta.source });

  // vara x tithi at sunrise (hold until the tithi ends)
  const tithiWin: Window = { start: sr, end: t0.end };
  const t15 = tithi15(t0.num);
  const siddhaList: number[] = T.siddhaVaraTithi.byWeekday[wd];
  if (siddhaList.includes(t0.num) || siddhaList.includes(t15)) push({ id: 'siddha_yoga', kind: 'auspicious', scope: 'window', window: tithiWin, params: { tithi: t0.name }, source: T.siddhaVaraTithi.source });
  if (T.dagdhaTithi.byWeekday[wd] === t15) push({ id: 'dagdha_tithi', kind: 'inauspicious', scope: 'window', window: tithiWin, params: { tithi: t0.name }, source: T.dagdhaTithi.source });
  if (T.vishaTithi.byWeekday[wd] === t15) push({ id: 'visha_tithi', kind: 'inauspicious', scope: 'window', window: tithiWin, params: { tithi: t0.name }, source: T.vishaTithi.source });
  if (T.hutashanaTithi.byWeekday[wd] === t15) push({ id: 'hutashana_tithi', kind: 'inauspicious', scope: 'window', window: tithiWin, params: { tithi: t0.name }, source: T.hutashanaTithi.source });
  if (T.mrityuYogaVaraTithi.byWeekdayGroup[wd] === tithiGroup(t0.num)) push({ id: 'mrityu_yoga', kind: 'inauspicious', scope: 'window', window: tithiWin, params: { group: tithiGroup(t0.num) }, source: T.mrityuYogaVaraTithi.source });
  if (wd + 1 + t15 === 13) push({ id: 'krakacha', kind: 'inauspicious', scope: 'window', window: tithiWin, source: T.krakacha.source });
  if (T.pushkara.tithis.includes(t0.num) && T.pushkara.weekdays.includes(wd)) {
    if (T.pushkara.tripushkara.includes(n0.num)) push({ id: 'tripushkara', kind: 'info', scope: 'window', window: { start: sr, end: new Date(Math.min(t0.end.getTime(), n0.end.getTime())) }, source: T.pushkara.source });
    if (T.pushkara.dwipushkara.includes(n0.num)) push({ id: 'dwipushkara', kind: 'info', scope: 'window', window: { start: sr, end: new Date(Math.min(t0.end.getTime(), n0.end.getTime())) }, source: T.pushkara.source });
  }
  // Ravi yoga: Moon's nakshatra counted from the Sun's
  const sunNak = Math.floor(sunSidereal(sr) / (360 / 27)) + 1;
  const fromSun = ((n0.num - sunNak + 27) % 27) + 1;
  if (T.raviYoga.offsetsFromSunNakshatra.includes(fromSun)) push({ id: 'ravi_yoga', kind: 'auspicious', scope: 'window', window: nakWin(), params: { count: fromSun }, source: T.raviYoga.source });

  // tithi flags
  for (const t of day.tithi) {
    const w: Window = { start: new Date(Math.max(t.start.getTime(), sr.getTime())), end: t.end };
    if (T.tithiFlags.rikta.includes(t.num)) push({ id: 'rikta_tithi', kind: 'inauspicious', scope: 'window', window: w, params: { tithi: t.name }, source: T.tithiFlags.source });
    if (t.num === 30) push({ id: 'amavasya', kind: 'inauspicious', scope: 'window', window: w, source: T.tithiFlags.source });
    if (t.num === 15) push({ id: 'purnima', kind: 'info', scope: 'window', window: w, source: T.tithiFlags.source });
    if (t.kshaya) push({ id: 'kshaya_tithi', kind: 'info', scope: 'window', window: w, params: { tithi: t.name }, source: 'research/02 §2.1 [P] Wikipedia Tithi (kshaya/vriddhi)' });
    if (t.vriddhi) push({ id: 'vriddhi_tithi', kind: 'info', scope: 'window', window: w, params: { tithi: t.name }, source: 'research/02 §2.1 [P] Wikipedia Tithi (kshaya/vriddhi)' });
  }
  // yoga flags
  for (const y of day.yoga) {
    const w: Window = { start: new Date(Math.max(y.start.getTime(), sr.getTime())), end: y.end };
    if (T.yogaFlags.avoid.includes(y.num)) push({ id: y.num === 17 ? 'vyatipata' : 'vaidhriti', kind: 'inauspicious', scope: 'window', window: w, params: { yoga: y.name }, source: T.yogaFlags.source });
    else if (T.yogaFlags.bad.includes(y.num)) {
      const half = y.num === 19 && T.yogaFlags.parighaFirstHalfOnly ? { start: w.start, end: new Date(Math.min(w.end.getTime(), (y.start.getTime() + y.end.getTime()) / 2)) } : w;
      if (half.end.getTime() > half.start.getTime()) push({ id: 'inauspicious_yoga', kind: 'inauspicious', scope: 'window', window: half, params: { yoga: y.name, firstHalf: y.num === 19 }, source: T.yogaFlags.source });
    }
  }
  // nakshatra flags: gand mool, gandanta (first/last pada windows)
  for (const n of day.nakshatra) {
    const w: Window = { start: new Date(Math.max(n.start.getTime(), sr.getTime())), end: n.end };
    if (T.gandMool.nakshatras.includes(n.num)) push({ id: 'gand_mool', kind: 'inauspicious', scope: 'window', window: w, params: { nakshatra: n.name }, source: T.gandMool.source });
    const len = n.end.getTime() - n.start.getTime();
    if (T.gandanta.lastPadaOf.includes(n.num)) push({ id: 'gandanta', kind: 'inauspicious', scope: 'window', window: { start: new Date(n.end.getTime() - len / 4), end: n.end }, params: { nakshatra: n.name, pada: 4 }, source: T.gandanta.source });
    if (T.gandanta.firstPadaOf.includes(n.num)) push({ id: 'gandanta', kind: 'inauspicious', scope: 'window', window: { start: n.start, end: new Date(n.start.getTime() + len / 4) }, params: { nakshatra: n.name, pada: 1 }, source: T.gandanta.source });
  }
  // Panchaka: Moon from 300 deg (Dhanishtha 3rd pada) to the end of Revati
  {
    const lonAtSr = day.moonLongitude;
    let start: Date | null = null, end: Date | null = null;
    if (lonAtSr >= T.panchaka.startLongitude) { start = sr; end = searchIncreasingAngle(moonSidereal, 360, sr, 6); }
    else {
      const s = searchIncreasingAngle(moonSidereal, T.panchaka.startLongitude, sr, 1.2);
      if (s && s.getTime() < nsr.getTime()) { start = s; end = searchIncreasingAngle(moonSidereal, 360, s, 6); }
    }
    if (start && end) {
      const type = T.panchaka.typeByWeekday[wd];
      push({ id: 'panchaka', kind: T.panchaka.benignWeekdays.includes(wd) ? 'info' : 'inauspicious', scope: 'window', window: { start, end }, params: { type: type ?? 'none', benign: T.panchaka.benignWeekdays.includes(wd) }, source: T.panchaka.source });
    }
  }
  // Bhadra (Vishti karana) with loka by the Moon's rashi at its start
  for (const k of day.karana) {
    if (k.name !== 'Vishti') continue;
    const start = new Date(Math.max(k.start.getTime(), sr.getTime()));
    const rashi = Math.floor(moonSidereal(start) / 30) + 1;
    const loka = T.bhadra.martyaRashis.includes(rashi) ? 'martya' : T.bhadra.swargaRashis.includes(rashi) ? 'swarga' : 'patala';
    const bw: Window = { start, end: k.end };
    push({ id: 'bhadra', kind: loka === 'martya' ? 'inauspicious' : 'info', scope: 'window', window: bw, params: { loka, moonRashi: RASHI_NAMES[rashi - 1], byDay: k.start.getTime() < day.sunset.getTime() }, source: T.bhadra.source });
    if (loka === 'martya') push({ id: 'bhadra_martya', kind: 'inauspicious', scope: 'window', window: bw, params: { moonRashi: RASHI_NAMES[rashi - 1] }, source: T.bhadra.source });
  }
  // Calendar windows (amanta month ordinal)
  const am = day.masa.amanta;
  const o = ord(am.index, t0.num);
  if (am.adhika) push({ id: 'adhika_masa', kind: 'inauspicious', scope: 'month', params: { masa: am.name }, source: 'research/02 §2.3 [P] Wikipedia Adhika-masa; [S] panchangbodh: shubha karya barred' });
  if (am.kshaya) push({ id: 'kshaya_masa', kind: 'inauspicious', scope: 'month', params: { masa: am.name }, source: 'research/02 §2.3 [P] Wikipedia Adhika-masa' });
  if (T.kharmas.sunRashis.includes(day.sunRashi.index)) push({ id: 'kharmas', kind: 'inauspicious', scope: 'month', params: { sunRashi: day.sunRashi.name }, source: T.kharmas.source });
  const c = T.chaturmas; if (o >= ord(c.from.masa, c.from.tithi) && o < ord(c.to.masa, c.to.tithi)) push({ id: 'chaturmas', kind: 'inauspicious', scope: 'month', source: c.source });
  const h = T.holashtak; if (am.index === h.masa && t0.num >= h.fromTithi && t0.num <= h.toTithi) push({ id: 'holashtak', kind: 'inauspicious', scope: 'day', source: h.source });
  const pp = T.pitruPaksha; if (am.index === pp.masa && t0.num >= pp.fromTithi && t0.num <= pp.toTithi) push({ id: 'pitru_paksha', kind: 'inauspicious', scope: 'day', source: pp.source });
  for (const a of T.abujha.days) if (am.index === a.masa && !am.adhika && t0.num === a.tithi) push({ id: 'abujha_muhurta', kind: 'auspicious', scope: 'day', params: { day: a.id }, source: T.abujha.source });
  if (opts.region === 'west' && day.moonRashi.index === T.vinchudo.moonRashi) push({ id: 'vinchudo', kind: 'info', scope: 'day', source: T.vinchudo.source });

  // Sankranti: nearest Sun ingress (sidereal) within +-4 days
  {
    const from = addDays(sr, -4);
    const s0 = sunSidereal(from);
    const target = (Math.floor(s0 / 30) + 1) * 30;
    const t = searchIncreasingAngle(sunSidereal, target, from, 8, 24);
    if (t) {
      const rashi = (Math.round(target / 30) % 12) + 1;
      const days = (t.getTime() - sr.getTime()) / 86400000;
      const avoidDays = T.sankranti.avoidDaysByRashi[String(rashi)] ?? T.sankranti.avoidGhatisOther / 60;
      const inDay = t.getTime() >= sr.getTime() && t.getTime() < nsr.getTime();
      if (inDay) push({ id: 'sankranti_day', kind: 'info', scope: 'day', params: { rashi: RASHI_NAMES[rashi - 1], instant: t.toISOString(), masa: MASA_NAMES[rashi - 1] }, source: T.sankranti.source });
      const aw: Window = { start: addDays(t, -avoidDays), end: addDays(t, avoidDays) };
      if (aw.end.getTime() > sr.getTime() && aw.start.getTime() < nsr.getTime()) push({ id: 'sankranti_window', kind: 'inauspicious', scope: 'window', window: aw, params: { rashi: RASHI_NAMES[rashi - 1], days: Number(days.toFixed(2)) }, source: T.sankranti.source });
      if (inDay) push({ id: 'punya_kaal', kind: 'auspicious', scope: 'window', window: { start: t, end: new Date(t.getTime() + T.sankranti.punyaKaalGhatis * 24 * 60000) }, params: { rashi: RASHI_NAMES[rashi - 1] }, source: T.sankranti.source });
    }
  }
  // Eclipses: lunar (global) and solar (visible locally) with avoid window
  {
    const le = nextLunarEclipse(addDays(sr, -T.eclipse.daysAfter - 1));
    const checkEcl = (peak: Date, kind: 'lunar' | 'solar') => {
      const inDay = peak.getTime() >= sr.getTime() && peak.getTime() < nsr.getTime();
      if (inDay) push({ id: 'eclipse_day', kind: 'inauspicious', scope: 'day', params: { kind, peak: peak.toISOString() }, source: T.eclipse.source });
      const w: Window = { start: addDays(peak, -T.eclipse.daysBefore), end: addDays(peak, T.eclipse.daysAfter) };
      if (w.end.getTime() > sr.getTime() && w.start.getTime() < nsr.getTime() && !inDay) push({ id: 'eclipse_window', kind: 'inauspicious', scope: 'window', window: w, params: { kind, peak: peak.toISOString(), daysFromPeak: Number(((sr.getTime() - peak.getTime()) / 86400000).toFixed(1)) }, source: T.eclipse.source });
    };
    if (le.peak.getTime() < addDays(nsr, T.eclipse.daysBefore + 1).getTime()) checkEcl(le.peak, 'lunar');
    const ge = nextGlobalSolarEclipse(addDays(sr, -T.eclipse.daysAfter - 1));
    if (ge.peak.getTime() < addDays(nsr, T.eclipse.daysBefore + 1).getTime()) {
      // only count it if visible from this place (partial or better)
      try {
        const loc = nextLocalSolarEclipse(addDays(ge.peak, -1), day.place);
        if (Math.abs(loc.peak.getTime() - ge.peak.getTime()) < 86400000) checkEcl(loc.peak, 'solar');
      } catch { /* no local eclipse */ }
    }
  }
  // Combustion of Jupiter / Venus (classical degrees)
  {
    const s = sunTropical(sr);
    const sep = (lon: number) => { let d = Math.abs(lon - s); if (d > 180) d = 360 - d; return d; };
    const j = sep(planetTropical('Jupiter', sr));
    if (j < T.combustion.Jupiter) push({ id: 'guru_asta', kind: 'inauspicious', scope: 'day', params: { separation: Number(j.toFixed(2)) }, source: T.combustion.source });
    const vRetro = isRetrograde('Venus', sr);
    const v = sep(planetTropical('Venus', sr));
    if (v < (vRetro ? T.combustion.VenusRetrograde : T.combustion.Venus)) push({ id: 'shukra_asta', kind: 'inauspicious', scope: 'day', params: { separation: Number(v.toFixed(2)), retrograde: vRetro }, source: T.combustion.source });
  }
  // Kala-derived windows as flags so the scorer can treat everything uniformly
  push({ id: 'rahu_kaal', kind: 'inauspicious', scope: 'window', window: kalaT.rahuKaal, source: kalaT.sources.eighths });
  push({ id: 'yamaganda', kind: 'inauspicious', scope: 'window', window: kalaT.yamaganda, source: kalaT.sources.eighths });
  push({ id: 'gulika', kind: 'inauspicious', scope: 'window', window: kalaT.gulika, source: kalaT.sources.eighths });
  for (const w of kalaT.durmuhurta) push({ id: 'durmuhurta', kind: 'inauspicious', scope: 'window', window: w, source: kalaT.sources.durmuhurta });
  for (const w of kalaT.varjyam) push({ id: 'varjyam', kind: 'inauspicious', scope: 'window', window: w, source: kalaT.sources.varjyam });
  for (const w of kalaT.amritKaal) push({ id: 'amrit_kaal', kind: 'auspicious', scope: 'window', window: w, source: kalaT.sources.varjyam });
  if (kalaT.abhijit) push({ id: 'abhijit', kind: 'auspicious', scope: 'window', window: kalaT.abhijit, source: kalaT.sources.muhurtas });
  push({ id: 'brahma_muhurta', kind: 'auspicious', scope: 'window', window: kalaT.brahmaMuhurta, source: kalaT.sources.brahmaMuhurta });
  push({ id: 'pradosha', kind: 'info', scope: 'window', window: kalaT.pradosha, source: kalaT.sources.pradosha });
  return out;
}

/** Flags that apply at instant `t` (day/month flags always, window flags only when inside). */
export function flagsAt(flags: Flag[], t: Date): Flag[] {
  return flags.filter(f => f.scope !== 'window' || (f.window && t.getTime() >= f.window.start.getTime() && t.getTime() < f.window.end.getTime()));
}
export const hasFlag = (flags: Flag[], id: string) => flags.some(f => f.id === id);
export { NAKSHATRA_NAMES };
