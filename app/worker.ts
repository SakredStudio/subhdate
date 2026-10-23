// Web Worker: runs the engine off the main thread. Messages: { id, op, args } -> { id, ok, result | error }.
// Dates cross the boundary as ISO strings.
import { panchang } from '../engine/panchanga.ts';
import { kala } from '../engine/kala.ts';
import { dayFlags } from '../engine/flags.ts';
import { findMuhurta, scoreDay, loadPack, EVENT_IDS, type MuhurtaRequest } from '../engine/muhurta.ts';
import { explain, sankalpa, renderReason, renderCaveat, term, type Lang } from '../engine/explain.ts';
import { festivals } from '../engine/festivals.ts';
import { personal, janma } from '../engine/personal.ts';
import { ayanamsaAt } from '../engine/astro.ts';
import { buildReport } from '../engine/report.ts';
import { naam } from '../engine/namakarana.ts';

const iso = (d: Date | null | undefined) => d ? d.toISOString() : null;
const win = (w: { start: Date; end: Date } | null | undefined) => w ? { start: w.start.toISOString(), end: w.end.toISOString() } : null;

function dayPayload(date: string, place: any, opts: any, lang: Lang, birth?: any) {
  const p = panchang(date, place, opts);
  const k = kala(p);
  const flags = dayFlags(p, { region: opts.region, kala: k });
  const named = (list: any[]) => list.map(x => ({ ...x, start: iso(x.start), end: iso(x.end) }));
  const L = (kind: any, v: any) => term(kind, v, lang);
  const pers = birth ? personal(p, birth) : null;
  return {
    date, vara: { ...p.vara, label: L('vara', p.vara.short) },
    sunrise: iso(p.sunrise), sunset: iso(p.sunset), nextSunrise: iso(p.nextSunrise), moonrise: iso(p.moonrise), moonset: iso(p.moonset),
    tithi: p.tithi.map(t => ({ num: t.num, name: t.name, label: `${L('paksha', t.paksha)} ${L('tithi', t.name)}`, paksha: t.paksha, start: iso(t.start), end: iso(t.end), kshaya: !!t.kshaya, vriddhi: !!t.vriddhi })),
    nakshatra: p.nakshatra.map(n => ({ num: n.num, name: n.name, label: L('nakshatra', n.name), pada: n.pada, lord: n.lord, start: iso(n.start), end: iso(n.end) })),
    yoga: p.yoga.map(y => ({ num: y.num, name: y.name, label: L('yoga', y.name), start: iso(y.start), end: iso(y.end) })),
    karana: p.karana.map(c => ({ name: c.name, label: L('karana', c.name), start: iso(c.start), end: iso(c.end) })),
    paksha: p.paksha, pakshaLabel: L('paksha', p.paksha),
    masa: { amanta: { ...p.masa.amanta, label: (p.masa.amanta.adhika ? 'Adhika ' : '') + L('masa', p.masa.amanta.name), start: iso(p.masa.amanta.start), end: iso(p.masa.amanta.end) }, purnimanta: { ...p.masa.purnimanta, label: (p.masa.purnimanta.adhika ? 'Adhika ' : '') + L('masa', p.masa.purnimanta.name), start: iso(p.masa.purnimanta.start), end: iso(p.masa.purnimanta.end) }, system: p.masa.system },
    samvatsara: p.samvatsara, ritu: p.ritu, rituLabel: L('ritu', p.ritu), ayana: p.ayana, ayanaLabel: L('ayana', p.ayana),
    moonRashi: { ...p.moonRashi, label: L('rashi', p.moonRashi.name) }, sunRashi: { ...p.sunRashi, label: L('rashi', p.sunRashi.name) },
    ayanamsa: ayanamsaAt(p.sunrise),
    kala: {
      rahuKaal: win(k.rahuKaal), yamaganda: win(k.yamaganda), gulika: win(k.gulika), abhijit: win(k.abhijit), abhijitSuppressed: k.abhijitSuppressedOnWednesday,
      brahmaMuhurta: win(k.brahmaMuhurta), pradosha: win(k.pradosha), durmuhurta: k.durmuhurta.map(win), varjyam: k.varjyam.map(win), amritKaal: k.amritKaal.map(win),
      choghadiya: { day: named(k.choghadiya.day).map(c => ({ ...c, label: L('choghadiya', c.name) })), night: named(k.choghadiya.night).map(c => ({ ...c, label: L('choghadiya', c.name) })) },
      hora: { day: named(k.hora.day).map(h => ({ ...h, label: L('planet', h.lord) })), night: named(k.hora.night).map(h => ({ ...h, label: L('planet', h.lord) })) },
      sources: k.sources,
    },
    flags: flags.map(f => ({ id: f.id, kind: f.kind, scope: f.scope, window: win(f.window), params: f.params, source: f.source, text: renderReason({ code: f.id, weight: 0, params: f.params }, lang) })),
    personal: pers ? { confidence: pers.confidence, ambiguous: pers.janma.ambiguous, candidates: pers.janma.candidates.map(c => ({ nakshatra: L('nakshatra', c.nakshatraName), rashi: L('rashi', c.rashiName), pada: c.pada })), atSunrise: pers.atSunrise.map(a => ({ tara: a.tara, chandra: a.chandra })) } : null,
    sankalpa: sankalpa(p),
  };
}

const ops: Record<string, (a: any) => any> = {
  ping: () => 'pong',
  day: ({ date, place, opts, lang, birth }) => dayPayload(date, place, opts ?? {}, lang ?? 'en', birth),
  muhurta: ({ req, lang }: { req: MuhurtaRequest; lang: Lang }) => {
    const r = findMuhurta(req);
    const ex = explain(r, lang);
    return {
      pack: r.pack, confidence: r.confidence, evaluatedDays: r.evaluatedDays, engineVersion: r.engineVersion,
      caveats: ex.caveats, sources: r.pack.sources, fallback: ex.fallback, packName: ex.packName, invocation: ex.invocation,
      days: r.days.map((d, i) => ({
        date: d.date, score: d.score, vara: d.vara, tithi: d.tithi, nakshatra: d.nakshatra, masa: d.masa, headline: ex.days[i].headline, summary: ex.days[i].summary, flags: d.flagsSummary,
        windows: d.windows.map((w, j) => ({ start: iso(w.start), end: iso(w.end), score: w.score, choghadiya: w.choghadiya, hora: w.hora, nakshatra: w.nakshatra, tithi: w.tithi, keep: ex.days[i].windows[j].keep, avoid: ex.days[i].windows[j].avoid, codes: w.reasons.map(x => x.code) })),
      })),
      rejected: ex.rejected.slice(0, 60),
    };
  },
  festivals: ({ from, to, place, opts, lang }) => festivals(from, to, place, opts).map(f => ({ ...f, name: f.names[lang] ?? f.names.en, window: f.window ? { ...f.window, start: iso(f.window.start), end: iso(f.window.end) } : null, moonrise: iso(f.moonrise ?? null), bhadraNote: f.bhadraNote ? { until: iso(f.bhadraNote.until) } : null, instant: iso(f.instant ?? null), noteText: f.note ? renderCaveat(f.note, lang) : null })),
  packs: ({ lang }) => EVENT_IDS.map(id => { const p = loadPack(id); return { id, name: p.names[lang] ?? p.names.en, invocation: p.invocation, sources: p.sources }; }),
  janma: ({ birth, lang }) => { const j = janma(birth); return { ...j, candidates: j.candidates.map(c => ({ ...c, nakshatraLabel: term('nakshatra', c.nakshatraName, lang), rashiLabel: term('rashi', c.rashiName, lang) })) }; },
  naam: ({ req, lang }) => {
    const r = naam(req);
    const ex = explain(r.muhurta, lang);
    return {
      janma: { ambiguous: r.janma.ambiguous, birthTimeKnown: r.janma.birthTimeKnown },
      candidates: r.candidates.map(c => ({ ...c, nakshatraLabel: term('nakshatra', c.nakshatraName, lang), rashiLabel: term('rashi', c.rashiName, lang) })),
      from: r.from, to: r.to, sources: r.sources, engineVersion: r.muhurta.engineVersion, confidence: r.muhurta.confidence, packName: ex.packName, caveats: ex.caveats,
      days: r.muhurta.days.map((d, i) => ({ date: d.date, score: d.score, vara: d.vara, tithi: d.tithi, nakshatra: d.nakshatra, headline: ex.days[i].headline, summary: ex.days[i].summary,
        windows: d.windows.map((w, j) => ({ start: iso(w.start), end: iso(w.end), score: w.score, choghadiya: w.choghadiya, nakshatra: w.nakshatra, tithi: w.tithi, keep: ex.days[i].windows[j].keep, avoid: ex.days[i].windows[j].avoid })) })),
    };
  },
  report: ({ req, lang, family, names }) => buildReport(req, { lang: lang ?? 'en', family, names }),
  scoreToday: ({ event, date, req }) => { const r = scoreDay(loadPack(event), date, req); return { score: r.score, windows: r.windows.map(w => ({ start: iso(w.start), end: iso(w.end), score: w.score })) }; },
};

self.onmessage = (e: MessageEvent) => {
  const { id, op, args } = e.data;
  try { const result = ops[op](args); (self as any).postMessage({ id, ok: true, result }); }
  catch (err: any) { (self as any).postMessage({ id, ok: false, error: String(err?.message ?? err) }); }
};
