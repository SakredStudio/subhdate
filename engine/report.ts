// L7 report: assembles the Muhurta Report model (one event, top 5 days, full panchanga per day, sankalpa,
// "for your pandit" page). Pure and serialisable: every instant is an ISO string, every label is already
// localised, so the app (or a test) only has to lay it out. Nothing here predicts anything; it lists what
// the tradition's rules say about each moment and where each rule comes from.

import { findMuhurta, ENGINE_VERSION, type MuhurtaRequest, type MuhurtaResult, type DayResult, type MuhurtaWindow, type Reason } from './muhurta.ts';
import { panchang, spanAt, type PanchangDay } from './panchanga.ts';
import { kala, type Window, type NamedWindow } from './kala.ts';
import { dayFlags, type Flag } from './flags.ts';
import { explain, sankalpa, renderReason, renderCaveat, term, type Lang } from './explain.ts';
import { moonSidereal, sunSidereal } from './astro.ts';
import { RASHI_NAMES, NAKSHATRA_NAMES, YOGA_NAMES, MASA_NAMES, RITU_NAMES, SAMVATSARA_NAMES } from './names.ts';
import TERMS from '../i18n/terms.json' with { type: 'json' };

export type Family = 'west' | 'north' | 'south';
export interface ReportOptions { lang: Lang; names?: { person1?: string; person2?: string }; family?: Family; }

export interface RWin { start: string; end: string; }
export interface RSpan { name: string; label: string; start: string; end: string; }
export interface ReportRule { code: string; weight: number; source: string; flagged: boolean; sentence: string; }
export interface ReportWindow {
  start: string; end: string; score: number;
  nakshatra: string; tithi: string; choghadiya: string | null; hora: string | null;
  keep: string[]; avoid: string[]; rules: ReportRule[];
}
export interface ReportDay {
  date: string; vara: string; headline: string; summary: string; score: number;
  sunrise: string; sunset: string; nextSunrise: string; moonrise: string | null; moonset: string | null;
  tithi: RSpan[]; nakshatra: RSpan[]; yoga: RSpan[]; karana: RSpan[];
  masa: { amanta: string; purnimanta: string }; paksha: string;
  samvat: { vikram: number; vikramGujarati: number; shaka: number; nameNorth: string; nameSouth: string; nameGujarati: string };
  ritu: string; ayana: string; moonRashi: string; sunRashi: string; ayanamsa: number;
  kala: { rahuKaal: RWin; yamaganda: RWin; gulika: RWin; abhijit: RWin | null; brahmaMuhurta: RWin; pradosha: RWin; durmuhurta: RWin[]; varjyam: RWin[]; amritKaal: RWin[] };
  choghadiya: { day: (RWin & { name: string; label: string; quality: string })[]; night: (RWin & { name: string; label: string; quality: string })[] };
  windows: ReportWindow[];
  flags: { id: string; kind: string; text: string; window: RWin | null }[];
}
export interface ReportLimb { kind: string; en: string; deva: string; iast: string; }
export interface ReportModel {
  lang: Lang; fallback: boolean; engineVersion: string; generatedAt: string;
  cover: {
    event: { id: string; en: string; hi: string; gu: string; local: string };
    city: string; place: { lat: number; lon: number; tz: string };
    from: string; to: string; strictness: string; region: string; family: Family; monthSystem: 'amanta' | 'purnimanta';
    sunrise: 'limb' | 'center'; names: { person1: string | null; person2: string | null };
    invocation: { deity: string; line: string; verseRef: string | null } | null;
    confidence: string; evaluatedDays: number;
  };
  summary: { date: string; start: string; end: string; score: number; nakshatra: string; tithi: string; choghadiya: string | null; headline: string }[];
  days: ReportDay[];
  sankalpa: { date: string; yearSystem: 'shaka' | 'vikram' | 'gujarati'; devanagari: string; iast: string }[];
  pandit: {
    moments: { date: string; start: string; end: string; limbs: ReportLimb[] }[];
    rules: (ReportRule & { date: string })[];
    unverified: (ReportRule & { date: string })[];
    conventions: { ayanamsa: string; ayanamsaByDay: { date: string; degrees: number }[]; sunrise: string; dayDefinition: string; monthSystem: string; ephemeris: string; yearSystem: string };
    caveats: string[];
    classicalSources: string[];
    reviewDoc: string;
  };
  footer: { engineUrl: string; license: string; line: string };
}

const T = TERMS as any;
const iso = (d: Date | null | undefined): string | null => d ? d.toISOString() : null;
const win = (w: Window | null | undefined): RWin | null => w ? { start: w.start.toISOString(), end: w.end.toISOString() } : null;
const winReq = (w: Window): RWin => ({ start: w.start.toISOString(), end: w.end.toISOString() });
const RASHI_IAST = ['meṣa', 'vṛṣabha', 'mithuna', 'karka', 'siṃha', 'kanyā', 'tulā', 'vṛścika', 'dhanu', 'makara', 'kumbha', 'mīna'];
const AYANA_IAST: Record<string, string> = { Uttarayana: 'uttarāyaṇa', Dakshinayana: 'dakṣiṇāyana' };
const UNVERIFIED_RE = /UNVERIFIED|\[M\]/;

export const isFlaggedSource = (source: string | undefined) => UNVERIFIED_RE.test(source ?? '');

function familyOf(req: MuhurtaRequest, opt?: Family): Family {
  if (opt) return opt;
  return req.region === 'west' ? 'west' : req.region === 'south' ? 'south' : 'north';
}

function ruleRow(r: Reason, lang: Lang, ctx: Record<string, any>): ReportRule {
  return { code: r.code, weight: r.weight, source: r.source ?? 'UNVERIFIED: no source recorded', flagged: isFlaggedSource(r.source), sentence: renderReason(r, lang, ctx) };
}

function limbsAt(p: PanchangDay, at: Date): ReportLimb[] {
  const ti = spanAt(p.tithi, at), na = spanAt(p.nakshatra, at), yo = spanAt(p.yoga, at), ka = spanAt(p.karana, at);
  const moonR = Math.floor(moonSidereal(at) / 30), sunR = Math.floor(sunSidereal(at) / 30);
  const masa = p.masa.display;
  const svName = p.samvatsara.nameNorth; const svIdx = SAMVATSARA_NAMES.indexOf(svName as any);
  const rituIdx = RITU_NAMES.indexOf(p.ritu as any);
  const H = (kind: any, v: any) => term(kind, v, 'hi');
  return [
    { kind: 'vara', en: p.vara.name, deva: T.sanskritVara[p.vara.index], iast: T.sanskritVaraIast[p.vara.index] },
    { kind: 'tithi', en: `${ti.paksha} ${ti.name}`, deva: `${H('paksha', ti.paksha)} ${H('tithi', ti.name)}`, iast: `${ti.paksha === 'Shukla' ? 'śukla' : 'kṛṣṇa'} ${T.iast.tithi[ti.name] ?? ti.name}` },
    { kind: 'nakshatra', en: `${na.name} (pada ${na.pada})`, deva: `${H('nakshatra', na.name)} (${na.pada})`, iast: `${T.iast.nakshatra[NAKSHATRA_NAMES.indexOf(na.name as any)] ?? na.name} (pāda ${na.pada})` },
    { kind: 'yoga', en: yo.name, deva: H('yoga', yo.name), iast: T.iast.yoga[YOGA_NAMES.indexOf(yo.name as any)] ?? yo.name },
    { kind: 'karana', en: ka.name, deva: H('karana', ka.name), iast: T.iast.karana[ka.name] ?? ka.name },
    { kind: 'masa', en: `${masa.adhika ? 'Adhika ' : ''}${masa.name} (${p.masa.system})`, deva: `${masa.adhika ? 'अधिक ' : ''}${H('masa', masa.name)}`, iast: `${masa.adhika ? 'adhika-' : ''}${T.iast.masa[MASA_NAMES.indexOf(masa.name as any)] ?? masa.name}` },
    { kind: 'moonRashi', en: RASHI_NAMES[moonR], deva: T.rashi.hi[moonR], iast: RASHI_IAST[moonR] },
    { kind: 'sunRashi', en: RASHI_NAMES[sunR], deva: T.rashi.hi[sunR], iast: RASHI_IAST[sunR] },
    { kind: 'ritu', en: p.ritu, deva: T.ritu.hi[rituIdx] ?? p.ritu, iast: T.sanskritRituIast[rituIdx] ?? p.ritu },
    { kind: 'ayana', en: p.ayana, deva: T.ayana.hi[p.ayana] ?? p.ayana, iast: AYANA_IAST[p.ayana] ?? p.ayana },
    { kind: 'samvatsara', en: `${svName} (Vikram ${p.samvatsara.vikram}, Shaka ${p.samvatsara.shaka})`, deva: `${T.samvatsaraDevanagari[svIdx] ?? svName} (विक्रम ${p.samvatsara.vikram}, शक ${p.samvatsara.shaka})`, iast: `${T.iast.samvatsara[svIdx] ?? svName}` },
  ];
}

function reportDay(d: DayResult, r: MuhurtaResult, ex: ReturnType<typeof explain>, idx: number, lang: Lang): { day: ReportDay; p: PanchangDay } {
  const req = r.request; const region = req.region ?? 'north';
  const p = panchang(d.date, req.place, { sunrise: req.sunrise, region });
  const k = kala(p);
  const flags: Flag[] = dayFlags(p, { region, kala: k });
  const L = (kind: any, v: any) => term(kind, v, lang);
  const span = (list: { name: string; start: Date; end: Date }[], kind: any, labelOf?: (x: any) => string): RSpan[] =>
    list.map(x => ({ name: x.name, label: labelOf ? labelOf(x) : L(kind, x.name), start: x.start.toISOString(), end: x.end.toISOString() }));
  const named = (list: NamedWindow[]) => list.map(c => ({ ...winReq(c), name: c.name, label: L('choghadiya', c.name), quality: c.quality }));
  const exd = ex.days[idx];
  const dayCtx = { nakshatra: d.nakshatra, tithi: d.tithi.split(' ').slice(-1)[0], vara: d.vara, masa: d.masa.replace('Adhika ', '') };
  const windows: ReportWindow[] = d.windows.map((w: MuhurtaWindow, j: number) => ({
    start: w.start.toISOString(), end: w.end.toISOString(), score: w.score,
    nakshatra: L('nakshatra', w.nakshatra), tithi: `${L('paksha', w.tithi.split(' ')[0])} ${L('tithi', w.tithi.split(' ').slice(-1)[0])}`,
    choghadiya: w.choghadiya ? L('choghadiya', w.choghadiya) : null, hora: w.hora ? L('planet', w.hora) : null,
    keep: exd.windows[j].keep, avoid: exd.windows[j].avoid,
    rules: w.reasons.map(x => ruleRow(x, lang, { ...dayCtx, nakshatra: w.nakshatra, tithi: w.tithi.split(' ').slice(-1)[0] })),
  }));
  const day: ReportDay = {
    date: d.date, vara: L('vara', p.vara.short), headline: exd.headline, summary: exd.summary, score: d.score,
    sunrise: p.sunrise.toISOString(), sunset: p.sunset.toISOString(), nextSunrise: p.nextSunrise.toISOString(), moonrise: iso(p.moonrise), moonset: iso(p.moonset),
    tithi: span(p.tithi, 'tithi', (t: any) => `${L('paksha', t.paksha)} ${L('tithi', t.name)}`), nakshatra: span(p.nakshatra, 'nakshatra'), yoga: span(p.yoga, 'yoga'), karana: span(p.karana, 'karana'),
    masa: { amanta: `${p.masa.amanta.adhika ? 'Adhika ' : ''}${L('masa', p.masa.amanta.name)}`, purnimanta: `${p.masa.purnimanta.adhika ? 'Adhika ' : ''}${L('masa', p.masa.purnimanta.name)}` },
    paksha: L('paksha', p.paksha),
    samvat: { ...p.samvatsara },
    ritu: L('ritu', p.ritu), ayana: L('ayana', p.ayana), moonRashi: L('rashi', p.moonRashi.name), sunRashi: L('rashi', p.sunRashi.name), ayanamsa: Math.round(p.ayanamsa * 10000) / 10000,
    kala: { rahuKaal: winReq(k.rahuKaal), yamaganda: winReq(k.yamaganda), gulika: winReq(k.gulika), abhijit: win(k.abhijit), brahmaMuhurta: winReq(k.brahmaMuhurta), pradosha: winReq(k.pradosha), durmuhurta: k.durmuhurta.map(winReq), varjyam: k.varjyam.map(winReq), amritKaal: k.amritKaal.map(winReq) },
    choghadiya: { day: named(k.choghadiya.day), night: named(k.choghadiya.night) },
    windows,
    flags: flags.filter(f => !['rahu_kaal', 'yamaganda', 'gulika', 'durmuhurta', 'varjyam', 'amrit_kaal', 'abhijit', 'brahma_muhurta', 'pradosha'].includes(f.id))
      .map(f => ({ id: f.id, kind: f.kind, text: renderReason({ code: f.id, weight: 0, params: f.params }, lang), window: win(f.window) })),
  };
  return { day, p };
}

/** Build the full report model for an event. Runs findMuhurta (top 5 days, 3 windows each) and expands each day. */
export function buildReport(req: MuhurtaRequest, opts: ReportOptions): ReportModel {
  const lang = opts.lang;
  const r = findMuhurta({ ...req, maxDays: 5, windowsPerDay: 3 });
  const ex = explain(r, lang);
  const family = familyOf(req, opts.family);
  const yearSystem: 'shaka' | 'vikram' | 'gujarati' = family === 'west' ? 'gujarati' : family === 'south' ? 'shaka' : 'vikram';
  const region = req.region ?? 'north';
  const monthSystem: 'amanta' | 'purnimanta' = region === 'north' ? 'purnimanta' : 'amanta';
  const days: ReportDay[] = []; const pds: PanchangDay[] = [];
  r.days.forEach((d, i) => { const { day, p } = reportDay(d, r, ex, i, lang); days.push(day); pds.push(p); });
  const best = (d: ReportDay) => d.windows.reduce((a, b) => (b.score > a.score ? b : a), d.windows[0]);
  const summary = days.map(d => { const w = best(d); return { date: d.date, start: w.start, end: w.end, score: w.score, nakshatra: w.nakshatra, tithi: w.tithi, choghadiya: w.choghadiya, headline: d.headline }; });
  const sank = pds.map(p => { const s = sankalpa(p, { yearSystem }); return { date: p.date, yearSystem, devanagari: s.devanagari, iast: s.iast }; });
  const moments = days.map((d, i) => { const w = best(d); const mid = new Date((Date.parse(w.start) + Date.parse(w.end)) / 2); return { date: d.date, start: w.start, end: w.end, limbs: limbsAt(pds[i], mid) }; });
  const rules: (ReportRule & { date: string })[] = [];
  days.forEach(d => { const w = best(d); const seen = new Set<string>(); for (const x of w.rules) { if (seen.has(x.code)) continue; seen.add(x.code); rules.push({ ...x, date: d.date }); } });
  const caveatCodes = [...r.caveats]; if (!caveatCodes.includes('lagna_shuddhi_v3')) caveatCodes.push('lagna_shuddhi_v3'); if (!caveatCodes.includes('family_pandit')) caveatCodes.push('family_pandit');
  const names = r.pack.names as Record<string, string>;
  return {
    lang, fallback: ex.fallback, engineVersion: ENGINE_VERSION, generatedAt: new Date().toISOString(),
    cover: {
      event: { id: r.pack.id, en: names.en, hi: names.hi ?? names.en, gu: names.gu ?? names.en, local: names[lang] ?? names.en },
      city: req.place.name ?? `${req.place.lat.toFixed(2)}, ${req.place.lon.toFixed(2)}`, place: { lat: req.place.lat, lon: req.place.lon, tz: req.place.tz },
      from: req.from, to: req.to, strictness: req.strictness ?? 'standard', region, family, monthSystem, sunrise: req.sunrise ?? 'limb',
      names: { person1: opts.names?.person1 ?? null, person2: opts.names?.person2 ?? null },
      invocation: r.pack.invocation ? { deity: r.pack.invocation.deity, line: r.pack.invocation.line, verseRef: r.pack.invocation.verseRef ?? null } : null,
      confidence: r.confidence, evaluatedDays: r.evaluatedDays,
    },
    summary, days, sankalpa: sank,
    pandit: {
      moments, rules, unverified: rules.filter(x => x.flagged),
      conventions: {
        ayanamsa: 'Lahiri (Chitrapaksha), calibrated to Swiss Ephemeris SE_SIDM_LAHIRI',
        ayanamsaByDay: days.map(d => ({ date: d.date, degrees: d.ayanamsa })),
        sunrise: (req.sunrise ?? 'limb') === 'limb' ? 'upper limb with 34′ refraction (Drik Panchang convention)' : 'disc centre, no refraction (traditional)',
        dayDefinition: 'sunrise to sunrise; limbs reported as they stand at sunrise, end instants by root-finding',
        monthSystem: monthSystem === 'purnimanta' ? 'purnimanta month names (North Indian); amanta also listed' : 'amanta month names; purnimanta also listed',
        ephemeris: 'astronomy-engine (MIT), apparent geocentric, true ecliptic of date; moonrise topocentric',
        yearSystem: yearSystem === 'gujarati' ? 'Gujarati Vikram Samvat (Kartika Shukla 1 new year)' : yearSystem === 'shaka' ? 'Shaka Samvat' : 'Vikram Samvat (Chaitra Shukla 1 new year)',
      },
      caveats: caveatCodes.map(c => renderCaveat(c, ex.fallback ? 'en' : lang)),
      classicalSources: r.pack.sources,
      reviewDoc: 'https://github.com/SakredStudio/subhdate/blob/main/docs/PANDIT-REVIEW.md',
    },
    footer: { engineUrl: 'https://github.com/SakredStudio/subhdate', license: 'MIT', line: 'This is a shortlist computed on your device from the panchang rules, not a prediction. Please confirm with your family purohit.' },
  };
}
