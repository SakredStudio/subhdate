// L6 explain: reason codes -> sentences per language; panchang terms per language; sankalpa line.
// Dictionaries live in i18n/. Missing codes fall back to English, then to the code itself.

import type { MuhurtaResult, Reason, DayResult } from './muhurta.ts';
import type { PanchangDay } from './panchanga.ts';
import { NAKSHATRA_NAMES, YOGA_NAMES, MASA_NAMES, RASHI_NAMES, SAMVATSARA_NAMES, RITU_NAMES, tithiName } from './names.ts';
import TERMS from '../i18n/terms.json' with { type: 'json' };
import EN from '../i18n/en/reasons.json' with { type: 'json' };
import HI from '../i18n/hi/reasons.json' with { type: 'json' };
import HINGLISH from '../i18n/hinglish/reasons.json' with { type: 'json' };

export type Lang = 'en' | 'hi' | 'hinglish' | 'gu' | 'mr' | 'ta' | 'te' | 'bn' | 'kn';
const DICT: Record<string, any> = { en: EN, hi: HI, hinglish: HINGLISH };
const T = TERMS as any;

/** Languages with full reason dictionaries. Others fall back to English sentences (UI strings may still be localised). */
export const REASON_LANGS: Lang[] = ['en', 'hi', 'hinglish'];

function termLang(lang: Lang): 'en' | 'hi' | 'gu' {
  return lang === 'hi' || lang === 'mr' ? 'hi' : lang === 'gu' ? 'gu' : 'en';
}

/** Localised panchang vocabulary. */
export function term(kind: 'tithi' | 'paksha' | 'nakshatra' | 'yoga' | 'karana' | 'vara' | 'rashi' | 'masa' | 'ritu' | 'ayana' | 'choghadiya' | 'planet', value: string | number, lang: Lang): string {
  const l = termLang(lang);
  const table = T[kind]?.[l];
  if (!table) return String(value);
  if (Array.isArray(table)) {
    const idx = typeof value === 'number' ? value - 1 : (kind === 'nakshatra' ? NAKSHATRA_NAMES.indexOf(value as any) : kind === 'yoga' ? YOGA_NAMES.indexOf(value as any) : kind === 'masa' ? MASA_NAMES.indexOf(value as any) : kind === 'rashi' ? RASHI_NAMES.indexOf(value as any) : kind === 'ritu' ? RITU_NAMES.indexOf(value as any) : kind === 'vara' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value as string) : -1);
    return idx >= 0 && table[idx] ? table[idx] : String(value);
  }
  return table[value as string] ?? String(value);
}

function fill(template: string, params: Record<string, any> | undefined, lang: Lang): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params?.[k];
    if (v == null) return '';
    if (k === 'nakshatra') return term('nakshatra', v, lang);
    if (k === 'tithi') return term('tithi', v, lang);
    if (k === 'yoga') return term('yoga', v, lang);
    if (k === 'masa') return term('masa', v, lang);
    if (k === 'sunRashi' || k === 'rashi' || k === 'moonRashi') return term('rashi', v, lang);
    if (k === 'choghadiya') return term('choghadiya', v, lang);
    if (k === 'vara') return term('vara', v, lang);
    return String(v);
  });
}

/** One reason as a sentence. */
export function renderReason(r: Reason, lang: Lang, ctx?: Partial<Record<string, any>>): string {
  const d = DICT[lang] ?? DICT.en;
  const tpl = d.reasons[r.code] ?? DICT.en.reasons[r.code] ?? r.code.replace(/_/g, ' ');
  return fill(tpl, { ...(ctx ?? {}), ...(r.params ?? {}) }, lang);
}
export function renderCaveat(code: string, lang: Lang): string {
  const d = DICT[lang] ?? DICT.en;
  return d.caveats[code] ?? DICT.en.caveats[code] ?? code.replace(/_/g, ' ');
}

export interface Explanation {
  lang: Lang; fallback: boolean;
  packName: string; invocation?: { deity: string; line: string; verseRef?: string };
  days: { date: string; score: number; headline: string; windows: { start: Date; end: Date; score: number; sentences: string[]; keep: string[]; avoid: string[] }[]; summary: string }[];
  rejected: { date: string; sentences: string[] }[];
  caveats: string[]; sources: string[]; confidence: string;
}

/** Render a MuhurtaResult in a language. Deterministic templates only (no LLM). */
export function explain(result: MuhurtaResult, lang: Lang): Explanation {
  const fallback = !REASON_LANGS.includes(lang);
  const L: Lang = fallback ? 'en' : lang;
  const name = result.pack.names[lang] ?? result.pack.names.en;
  const dayCtx = (d: DayResult) => ({ nakshatra: d.nakshatra, tithi: d.tithi.split(' ').slice(-1)[0], vara: d.vara, masa: d.masa.replace('Adhika ', '') });
  return {
    lang, fallback, packName: name, invocation: result.pack.invocation,
    days: result.days.map(d => ({
      date: d.date, score: d.score,
      headline: `${term('vara', d.vara, L)} · ${term('masa', d.masa.replace('Adhika ', ''), L)} ${term('paksha', d.paksha, L)} ${term('tithi', d.tithi.split(' ').slice(-1)[0], L)} · ${term('nakshatra', d.nakshatra, L)}`,
      windows: d.windows.map(w => {
        const pos = w.reasons.filter(r => r.weight > 0), neg = w.reasons.filter(r => r.weight < 0);
        return { start: w.start, end: w.end, score: w.score, sentences: w.reasons.map(r => renderReason(r, L, { ...dayCtx(d), nakshatra: w.nakshatra, tithi: w.tithi.split(' ').slice(-1)[0] })), keep: pos.map(r => renderReason(r, L, dayCtx(d))), avoid: neg.map(r => renderReason(r, L, dayCtx(d))) };
      }),
      summary: d.dayReasons.map(r => renderReason(r, L, dayCtx(d))).join(' '),
    })),
    rejected: result.rejectedDays.map(r => ({ date: r.date, sentences: r.reasons.map(x => renderReason(x, L)) })),
    caveats: result.caveats.map(c => renderCaveat(c, L)),
    sources: result.pack.sources, confidence: result.confidence,
  };
}

/** Desha-kala sankalpa for a day (research/02 §5.5). Returns IAST and Devanagari lines. The desha line is editable by the caller. */
export function sankalpa(day: PanchangDay, opts: { desha?: { iast: string; deva: string }; yearSystem?: 'shaka' | 'vikram' | 'gujarati'; at?: Date } = {}): { iast: string; devanagari: string; parts: Record<string, string> } {
  const inIndia = day.place.tz === 'Asia/Kolkata';
  const desha = opts.desha ?? (inIndia
    ? { iast: 'jambū-dvīpe bhārata-varṣe bharata-khaṇḍe', deva: 'जम्बूद्वीपे भारतवर्षे भरतखण्डे' }
    : { iast: `jambū-dvīpād anya-dvīpe ${(day.place.name ?? 'videśa').replace(/\s+/g, '-')}-deśe`, deva: `जम्बूद्वीपाद् अन्यद्वीपे ${(day.place.name ?? 'विदेश')}-देशे` });
  const ys = opts.yearSystem ?? (day.options.region === 'south' ? 'shaka' : day.options.region === 'west' ? 'gujarati' : 'vikram');
  const sv = day.samvatsara;
  const yearNum = ys === 'shaka' ? sv.shaka : ys === 'gujarati' ? sv.vikramGujarati : sv.vikram;
  const yearLabelIast = ys === 'shaka' ? 'śakābde' : 'vikramābde';
  const yearLabelDeva = ys === 'shaka' ? 'शकाब्दे' : 'विक्रमाब्दे';
  const svName = ys === 'shaka' ? sv.nameSouth : ys === 'gujarati' ? sv.nameGujarati : sv.nameNorth;
  const svIdx = SAMVATSARA_NAMES.indexOf(svName as any);
  const t = day.tithi[0], n = day.nakshatra[0], y = day.yoga[0], k = day.karana[0];
  const masaIdx = day.masa.display.index - 1;
  const adhikaIast = day.masa.display.adhika ? 'adhika-' : '';
  const adhikaDeva = day.masa.display.adhika ? 'अधिक' : '';
  const parts = {
    samvatsara: svName, ayana: day.ayana, ritu: day.ritu, masa: day.masa.display.name, paksha: day.paksha, tithi: t.name, vara: day.vara.short, nakshatra: n.name, yoga: y.name, karana: k.name,
  };
  const iast = [
    'oṃ tat sat | adya brahmaṇaḥ dvitīya-parārdhe | śrī-śveta-varāha-kalpe | vaivasvata-manvantare | aṣṭāviṃśatitame kali-yuge | prathama-pāde |',
    `${desha.iast} |`,
    `${yearLabelIast} ${yearNum} | prabhavādi-ṣaṣṭi-saṃvatsarāṇāṃ madhye ${T.iast.samvatsara[svIdx] ?? svName}-nāma-saṃvatsare |`,
    `${day.ayana === 'Uttarayana' ? 'uttarāyaṇe' : 'dakṣiṇāyane'} | ${T.sanskritRituIast[['Vasanta', 'Grishma', 'Varsha', 'Sharad', 'Hemanta', 'Shishira'].indexOf(day.ritu)]} | ${adhikaIast}${T.iast.masa[masaIdx]}-māse | ${day.paksha === 'Shukla' ? 'śukla' : 'kṛṣṇa'}-pakṣe |`,
    `${T.iast.tithi[t.name] ?? t.name}-tithau | ${T.sanskritVaraIast[day.vara.index]} | ${T.iast.nakshatra[n.num - 1]}-nakṣatre | ${T.iast.yoga[y.num - 1]}-yoge | ${T.iast.karana[k.name] ?? k.name}-karaṇe |`,
    'evaṃ-guṇa-viśeṣaṇa-viśiṣṭāyāṃ śubha-tithau | (gotra) (nāma) ahaṃ | (devatā)-prītyarthaṃ (karma) kariṣye ||',
  ].join('\n');
  const devanagari = [
    'ॐ तत्सत् । अद्य ब्रह्मणः द्वितीयपरार्धे । श्रीश्वेतवाराहकल्पे । वैवस्वतमन्वन्तरे । अष्टाविंशतितमे कलियुगे । प्रथमपादे ।',
    `${desha.deva} ।`,
    `${yearLabelDeva} ${yearNum} । प्रभवादिषष्टिसंवत्सराणां मध्ये ${T.samvatsaraDevanagari[svIdx] ?? svName}नामसंवत्सरे ।`,
    `${day.ayana === 'Uttarayana' ? 'उत्तरायणे' : 'दक्षिणायने'} । ${T.sanskritRitu[['Vasanta', 'Grishma', 'Varsha', 'Sharad', 'Hemanta', 'Shishira'].indexOf(day.ritu)]} । ${adhikaDeva}${T.masa.hi[masaIdx]}मासे । ${day.paksha === 'Shukla' ? 'शुक्ल' : 'कृष्ण'}पक्षे ।`,
    `${T.tithi.hi[t.name] ?? t.name}तिथौ । ${T.sanskritVara[day.vara.index]} । ${T.nakshatra.hi[n.num - 1]}नक्षत्रे । ${T.yoga.hi[y.num - 1]}योगे । ${(T.karana.hi[k.name] ?? k.name).replace(/ \(.*\)/, '')}करणे ।`,
    'एवंगुणविशेषणविशिष्टायां शुभतिथौ । (गोत्र) (नाम) अहम् । (देवता)प्रीत्यर्थं (कर्म) करिष्ये ॥',
  ].join('\n');
  return { iast, devanagari, parts };
}

export { tithiName };
