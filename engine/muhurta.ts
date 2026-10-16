// L5 muhurta: rule-pack loader + deterministic scorer. See docs/ENGINE-DESIGN.md §7.
// Every emitted reason is a {code, params} pair (never free text) so L6 can render it in any language
// and tests can assert on codes. Every rule carries a `source`.

import type { Place, SunriseConvention } from './astro.ts';
import { panchang, spanAt, type PanchangDay, type Region } from './panchanga.ts';
import { kala, windowAt, type KalaTable } from './kala.ts';
import { dayFlags, flagsAt, type Flag } from './flags.ts';
import { personal, type Birth, type PersonalBala } from './personal.ts';
import { isoDate, addDays, parseIsoDate, localMidnightUtc } from './time.ts';
import { MASA_NAMES, VARA_SHORT } from './names.ts';
import VIVAHA from './rules/vivaha.json' with { type: 'json' };
import GRIHA from './rules/griha_pravesh.json' with { type: 'json' };
import GENERAL from './rules/general.json' with { type: 'json' };

export const ENGINE_VERSION = '0.1.0';
export type Strictness = 'family' | 'standard' | 'relaxed';
export type EventId = 'vivaha' | 'griha_pravesh' | 'sagai' | 'vahana' | 'vyapara' | 'namakarana' | 'annaprashana' | 'mundan' | 'yatra' | 'new_job' | 'exam_interview' | 'bhoomi_puja';
export const EVENT_IDS: EventId[] = ['vivaha', 'griha_pravesh', 'sagai', 'vahana', 'vyapara', 'namakarana', 'annaprashana', 'mundan', 'yatra', 'new_job', 'exam_interview', 'bhoomi_puja'];

export interface Rule { when: string; code: string; w?: number; else?: number; elseCode?: string; relaxable?: boolean; source?: string; }
export interface Pack {
  id: EventId; names: Record<string, string>; invocation?: { deity: string; line: string; verseRef?: string; source?: string };
  windowMinutes: number; preferDaytime: boolean; hard: Rule[]; soft: Rule[]; caveats: string[]; sources: string[]; note?: string;
  directions?: any;
}

export interface MuhurtaRequest {
  event: EventId; from: string; to: string; place: Place;
  birth?: Birth | null; partnerBirth?: Birth | null;
  region?: Region; strictness?: Strictness; sunrise?: SunriseConvention;
  slotMinutes?: number; maxDays?: number; windowsPerDay?: number; includeNight?: boolean;
}
export interface Reason { code: string; weight: number; params?: Record<string, string | number | boolean | null>; source?: string; }
export interface MuhurtaWindow {
  date: string; start: Date; end: Date; score: number; reasons: Reason[];
  choghadiya?: string; hora?: string; nakshatra: string; tithi: string;
}
export interface DayResult {
  date: string; vara: string; tithi: string; nakshatra: string; masa: string; paksha: string;
  score: number; windows: MuhurtaWindow[]; rejected: Reason[];
  dayReasons: Reason[];
  flagsSummary: string[];
}
export interface MuhurtaResult {
  request: MuhurtaRequest; pack: { id: string; names: Record<string, string>; sources: string[]; invocation?: Pack['invocation'] };
  days: DayResult[]; rejectedDays: { date: string; reasons: Reason[] }[];
  caveats: string[]; confidence: 'high' | 'medium' | 'low'; engineVersion: string; evaluatedDays: number;
}

/** Build the effective pack for an event (general.json events are merged into the shared skeleton). */
export function loadPack(event: EventId): Pack {
  if (event === 'vivaha') return VIVAHA as unknown as Pack;
  if (event === 'griha_pravesh') return GRIHA as unknown as Pack;
  const G = GENERAL as any;
  const ev = G.events[event];
  if (!ev) throw new Error(`unknown event ${event}`);
  const soft: Rule[] = [...G.soft];
  soft.push({ when: `nakshatra in [${ev.nakshatras.good.join(',')}]`, w: 25, else: -15, code: 'nakshatra_good', elseCode: 'nakshatra_unlisted', source: ev.source });
  soft.push({ when: `nakshatra in [${ev.nakshatras.avoid.join(',')}]`, w: -20, code: 'nakshatra_avoid', source: ev.source });
  if (ev.tithisOverride) {
    const i = soft.findIndex(r => r.code === 'tithi_good'); if (i >= 0) soft.splice(i, 1);
    soft.push({ when: `tithi in [${ev.tithisOverride.good.join(',')}]`, w: 12, code: 'tithi_good', source: ev.source });
    if (ev.tithisOverride.avoid) soft.push({ when: `tithi in [${ev.tithisOverride.avoid.join(',')}]`, w: -15, code: 'tithi_avoid_event', source: ev.source });
  }
  if (ev.tithisExtra) soft.push({ when: `tithi in [${ev.tithisExtra.good.join(',')}]`, w: 8, code: 'tithi_good', source: ev.source });
  if (ev.varas?.good) soft.push({ when: `vara in [${ev.varas.good.join(',')}]`, w: 8, code: 'vara_good', source: ev.source });
  if (ev.varas?.avoid) soft.push({ when: `vara in [${ev.varas.avoid.join(',')}]`, w: -8, code: 'vara_avoid', source: ev.source });
  if (ev.masas?.good) soft.push({ when: `masa in [${ev.masas.good.join(',')}]`, w: 8, code: 'masa_good', source: ev.source });
  for (const r of ev.extraSoft ?? []) soft.push({ ...r, source: r.source ?? ev.source });
  const hard: Rule[] = [...G.hard, ...(ev.extraHard ?? [])];
  return {
    id: event, names: ev.names, invocation: ev.invocation, windowMinutes: G.windowMinutes, preferDaytime: G.preferDaytime,
    hard, soft, caveats: [...G.caveats, ...(ev.note ? [ev.note] : [])], sources: [ev.source, ...G.sources], directions: ev.directions,
  };
}

interface Ctx {
  flags: Set<string>; flagList: Flag[];
  nakshatra: number; pada: number; tithi15: number; tithiNum: number; paksha: string; vara: string; masa: string; ayana: string;
  choghadiya?: string; hora?: string;
  tara?: number | null; chandra?: 'good' | 'weak' | 'avoid' | null; chandrashtama?: boolean | null;
}

const list = (s: string) => s.replace(/^\[|\]$/g, '').split(',').map(x => x.trim()).filter(Boolean);

/** Evaluate one condition. Returns true/false, or null when the condition needs data that is absent (personal without birth). */
export function evalCond(cond: string, c: Ctx): boolean | null {
  cond = cond.trim();
  if (cond.startsWith('flag:')) return cond.slice(5).split('|').some(id => c.flags.has(id.trim()));
  if (cond.startsWith('personal:')) {
    const rest = cond.slice(9).trim();
    if (rest === 'chandrashtama') return c.chandrashtama == null ? null : c.chandrashtama;
    if (rest.startsWith('chandra ')) return c.chandra == null ? null : c.chandra === rest.slice(8).trim();
    if (rest.startsWith('tara in')) return c.tara == null ? null : list(rest.slice(rest.indexOf('['))).map(Number).includes(c.tara);
    return null;
  }
  if (cond.startsWith('kala:')) {
    const rest = cond.slice(5).trim();
    if (rest === 'abhijit') return c.flags.has('abhijit');
    if (rest.startsWith('choghadiya in')) return c.choghadiya != null && list(rest.slice(rest.indexOf('['))).includes(c.choghadiya);
    if (rest.startsWith('hora in')) return c.hora != null && list(rest.slice(rest.indexOf('['))).includes(c.hora);
    return null;
  }
  const mIn = cond.match(/^(\w+) in (\[.*\])$/);
  if (mIn) {
    const vals = list(mIn[2]);
    switch (mIn[1]) {
      case 'nakshatra': return vals.map(Number).includes(c.nakshatra);
      case 'nakshatraPada': return vals.includes(`${c.nakshatra}.${c.pada}`);
      case 'tithi': return vals.map(Number).includes(c.tithi15);
      case 'tithiNum': return vals.map(Number).includes(c.tithiNum);
      case 'vara': return vals.includes(c.vara);
      case 'masa': return vals.includes(c.masa);
      default: return null;
    }
  }
  const mEq = cond.match(/^(\w+) == (\w+)$/);
  if (mEq) {
    switch (mEq[1]) {
      case 'paksha': return c.paksha === mEq[2];
      case 'ayana': return c.ayana === mEq[2];
      case 'vara': return c.vara === mEq[2];
      default: return null;
    }
  }
  return null;
}

function daySummary(p: PanchangDay) {
  return { vara: p.vara.short, tithi: `${p.paksha} ${p.tithi[0].name}`, nakshatra: p.nakshatra[0].name, masa: `${p.masa.display.adhika ? 'Adhika ' : ''}${p.masa.display.name}`, paksha: p.paksha };
}

/** Score one day and return its windows. Exposed for tests and for the Today screen ("how good is today for X"). */
export function scoreDay(pack: Pack, date: string, req: MuhurtaRequest, pers?: PersonalBala | null): DayResult {
  const region = req.region ?? 'north';
  const strict = req.strictness ?? 'standard';
  const p = panchang(date, req.place, { sunrise: req.sunrise, region });
  const k = kala(p);
  const flags = dayFlags(p, { region, kala: k });
  const slotMin = req.slotMinutes ?? 30;
  const dayEnd = (req.includeNight ?? !pack.preferDaytime) ? p.nextSunrise : p.sunset;
  const hard = pack.hard.filter(r => !(strict === 'relaxed' && r.relaxable));
  const relaxed = strict === 'relaxed' ? pack.hard.filter(r => r.relaxable).map(r => ({ ...r, w: -30 })) : [];
  const softAll = [...pack.soft, ...relaxed];
  // in family mode, strong soft penalties become hard
  const familyHard = strict === 'family' ? pack.soft.filter(r => (r.w ?? 0) <= -20) : [];

  const slots: { start: Date; end: Date; score: number; reasons: Reason[]; rejected: Reason[]; chog?: string; hora?: string; nak: string; tithi: string }[] = [];
  const dayRejectCounts = new Map<string, Reason>();
  for (let t = p.sunrise.getTime(); t < dayEnd.getTime(); t += slotMin * 60000) {
    const start = new Date(t); const end = new Date(Math.min(t + slotMin * 60000, dayEnd.getTime()));
    const mid = new Date((start.getTime() + end.getTime()) / 2);
    const nak = spanAt(p.nakshatra, mid); const ti = spanAt(p.tithi, mid);
    const active = flagsAt(flags, mid);
    const chog = windowAt([...k.choghadiya.day, ...k.choghadiya.night], mid);
    const hr = windowAt([...k.hora.day, ...k.hora.night], mid);
    const pada = nak.atSunrise ? nak.pada : Math.floor((((mid.getTime() - nak.start.getTime()) / (nak.end.getTime() - nak.start.getTime())) * 4)) + 1;
    const ctx: Ctx = {
      flags: new Set(active.map(f => f.id)), flagList: active,
      nakshatra: nak.num, pada, tithi15: ((ti.num - 1) % 15) + 1, tithiNum: ti.num, paksha: ti.paksha, vara: p.vara.short,
      masa: p.masa.amanta.name, ayana: p.ayana, choghadiya: chog?.name, hora: hr?.lord,
    };
    if (pers) {
      const prim = pers.janma.primary;
      const taraForNak = pers.spans.find(s => s.nakshatra === nak.num)?.tara[0] ?? null;
      ctx.tara = taraForNak ? taraForNak.tara : null;
      const cb = pers.atSunrise[0]?.chandra;
      ctx.chandra = cb ? cb.quality : null;
      ctx.chandrashtama = cb ? cb.chandrashtama : null;
      void prim;
    }
    const base = { nakshatra: nak.name, tithi: ti.name, vara: p.vara.short, masa: p.masa.amanta.name, choghadiya: chog?.name ?? null, hora: hr?.lord ?? null };
    const paramsFor = (when: string) => { const fl = active.find(f => when.includes(f.id)); return { ...base, ...(fl?.params ?? {}) }; };
    const rejected: Reason[] = [];
    for (const r of [...hard, ...familyHard]) {
      if (evalCond(r.when, ctx) === true) rejected.push({ code: r.code, weight: -100, params: paramsFor(r.when), source: r.source });
    }
    for (const r of rejected) if (!dayRejectCounts.has(r.code)) dayRejectCounts.set(r.code, r);
    let score = 0; const reasons: Reason[] = [];
    if (rejected.length === 0) {
      for (const r of softAll) {
        const v = evalCond(r.when, ctx);
        if (v === true && r.w) { score += r.w; reasons.push({ code: r.code, weight: r.w, params: paramsFor(r.when), source: r.source }); }
        else if (v === false && r.else) { score += r.else; reasons.push({ code: r.elseCode ?? `not_${r.code}`, weight: r.else, params: base, source: r.source }); }
      }
    }
    score = rejected.length ? 0 : Math.round(50 + 50 * Math.tanh(score / 60));
    slots.push({ start, end, score, reasons, rejected, chog: chog?.name, hora: hr?.lord, nak: nak.name, tithi: `${ti.paksha} ${ti.name}` });
  }
  // merge adjacent accepted slots with the same score and reason codes
  const windows: MuhurtaWindow[] = [];
  for (const s of slots) {
    if (s.rejected.length) continue;
    const key = String(s.score);
    const last = windows[windows.length - 1];
    if (last && (last as any)._key === key && last.end.getTime() === s.start.getTime()) { last.end = s.end; continue; }
    const w: MuhurtaWindow & { _key?: string } = { date, start: s.start, end: s.end, score: s.score, reasons: s.reasons, choghadiya: s.chog, hora: s.hora, nakshatra: s.nak, tithi: s.tithi, _key: key };
    windows.push(w);
  }
  for (const w of windows) delete (w as any)._key;
  windows.sort((a, b) => b.score - a.score || a.start.getTime() - b.start.getTime());
  const top = windows.slice(0, req.windowsPerDay ?? 3).sort((a, b) => a.start.getTime() - b.start.getTime());
  // day-level reasons: the rules that held at sunrise (nakshatra, tithi, vara, masa, calendar flags)
  const dayReasons = top[0]?.reasons.filter(r => /nakshatra|tithi|vara|masa|paksha|pushya|sarvartha|amrita|siddha|tara|chandra|adhika|kharmas|pitru|panchaka/.test(r.code)) ?? [];
  const allRejected = windows.length === 0;
  const sm = daySummary(p);
  return {
    date, ...sm, score: top.length ? Math.max(...windows.map(w => w.score)) : 0, windows: top,
    rejected: allRejected ? [...dayRejectCounts.values()] : [], dayReasons,
    flagsSummary: [...new Set(flags.filter(f => f.scope !== 'window' || f.kind !== 'info').map(f => f.id))],
  };
}

/** Find ranked muhurta windows for an event in a date range. Deterministic. */
export function findMuhurta(req: MuhurtaRequest): MuhurtaResult {
  const pack = loadPack(req.event);
  const region = req.region ?? 'north';
  const { y, m, d } = parseIsoDate(req.from);
  let cursor = localMidnightUtc(y, m, d, req.place.tz);
  const endParts = parseIsoDate(req.to);
  const endUtc = localMidnightUtc(endParts.y, endParts.m, endParts.d, req.place.tz);
  const days: DayResult[] = []; const rejectedDays: { date: string; reasons: Reason[] }[] = [];
  let pers: PersonalBala | null = null;
  let evaluated = 0;
  while (cursor.getTime() <= endUtc.getTime() && evaluated < 400) {
    const date = isoDate(cursor, req.place.tz);
    const p = panchang(date, req.place, { sunrise: req.sunrise, region });
    if (req.birth) pers = personal(p, req.birth);
    const r = scoreDay(pack, date, req, pers);
    if (r.windows.length) days.push(r); else rejectedDays.push({ date, reasons: r.rejected });
    cursor = addDays(cursor, 1); evaluated++;
  }
  days.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  const caveats = [...pack.caveats];
  if (region === 'north') caveats.push('purnimanta_month_name');
  if (req.birth && pers && !pers.janma.birthTimeKnown) caveats.push(pers.janma.ambiguous ? 'birth_time_unknown_ambiguous' : 'birth_time_unknown');
  if (!req.birth) caveats.push('no_birth_details');
  if (req.partnerBirth) caveats.push('partner_bala_v3');
  const horizonDays = (endUtc.getTime() - Date.now()) / 86400000;
  const confidence: MuhurtaResult['confidence'] = horizonDays > 365 || (pers && pers.confidence === 'low') ? 'low' : req.birth && pers?.confidence === 'high' ? 'high' : 'medium';
  return {
    request: req, pack: { id: pack.id, names: pack.names, sources: pack.sources, invocation: pack.invocation },
    days: days.slice(0, req.maxDays ?? 10), rejectedDays, caveats: [...new Set(caveats)], confidence, engineVersion: ENGINE_VERSION, evaluatedDays: evaluated,
  };
}

export { MASA_NAMES, VARA_SHORT };
