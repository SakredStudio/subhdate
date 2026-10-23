// L4b Namakarana: janma nakshatra + pada -> traditional naming syllables (nama-akshara), curated names,
// Gand Mool note, and the naming-ceremony muhurta search on the existing `namakarana` rule pack.
// Birth data is an input only; nothing is stored here. MIT like the rest of the engine.
//
// Sources
//  - Pada syllable table: the standard 108-syllable "avakahada" table printed in every panchang and in
//    Wikipedia "List of Nakshatras" (Pada syllables column) [P]. Variants: Shravana is printed as
//    Khi/Khu/Khe/Kho (Varahamihira tradition) and as Ju/Je/Jo/Gha in some Hindi panchangs; both given.
//    Uttara Bhadrapada pada 4 is printed as Jna (ज्ञ) or Da; both given. [M] for the transliterations.
//  - Gand Mool nakshatras: research/02 §3.3 (Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati) [S].
//  - Namakarana day: 11th/12th/16th day or later; rule pack `namakarana` in rules/general.json
//    (research/02 §3.5 namakarana [S]).
//  - Name lists: engine/data/names.json, curated by Sakred Studio (editorial, not scriptural); every
//    entry's starting syllable was matched by hand. Meanings are dictionary glosses.
import type { Place } from './astro.ts';
import { janma, type Birth, type JanmaResult, type Janma } from './personal.ts';
import { findMuhurta, type MuhurtaResult, type Strictness } from './muhurta.ts';
import type { Region } from './panchanga.ts';
import { NAKSHATRA_NAMES, RASHI_NAMES } from './names.ts';
import NAMES from './data/names.json' with { type: 'json' };

export interface Syllable { latin: string; deva: string; gu: string; alt?: { latin: string; deva: string; gu: string } }

/** 27 x 4 naming syllables. Index [nakshatra-1][pada-1]. */
export const PADA_SYLLABLES: Syllable[][] = [
  [{ latin: 'Chu', deva: 'चू', gu: 'ચૂ' }, { latin: 'Che', deva: 'चे', gu: 'ચે' }, { latin: 'Cho', deva: 'चो', gu: 'ચો' }, { latin: 'La', deva: 'ला', gu: 'લા' }],
  [{ latin: 'Li', deva: 'ली', gu: 'લી' }, { latin: 'Lu', deva: 'लू', gu: 'લૂ' }, { latin: 'Le', deva: 'ले', gu: 'લે' }, { latin: 'Lo', deva: 'लो', gu: 'લો' }],
  [{ latin: 'A', deva: 'अ', gu: 'અ' }, { latin: 'I', deva: 'ई', gu: 'ઈ' }, { latin: 'U', deva: 'उ', gu: 'ઉ' }, { latin: 'E', deva: 'ए', gu: 'એ' }],
  [{ latin: 'O', deva: 'ओ', gu: 'ઓ' }, { latin: 'Va', deva: 'वा', gu: 'વા' }, { latin: 'Vi', deva: 'वी', gu: 'વી' }, { latin: 'Vu', deva: 'वू', gu: 'વૂ' }],
  [{ latin: 'Ve', deva: 'वे', gu: 'વે' }, { latin: 'Vo', deva: 'वो', gu: 'વો' }, { latin: 'Ka', deva: 'का', gu: 'કા' }, { latin: 'Ki', deva: 'की', gu: 'કી' }],
  [{ latin: 'Ku', deva: 'कू', gu: 'કૂ' }, { latin: 'Gha', deva: 'घ', gu: 'ઘ' }, { latin: 'Nga', deva: 'ङ', gu: 'ઙ' }, { latin: 'Chha', deva: 'छ', gu: 'છ' }],
  [{ latin: 'Ke', deva: 'के', gu: 'કે' }, { latin: 'Ko', deva: 'को', gu: 'કો' }, { latin: 'Ha', deva: 'हा', gu: 'હા' }, { latin: 'Hi', deva: 'ही', gu: 'હી' }],
  [{ latin: 'Hu', deva: 'हू', gu: 'હૂ' }, { latin: 'He', deva: 'हे', gu: 'હે' }, { latin: 'Ho', deva: 'हो', gu: 'હો' }, { latin: 'Da', deva: 'डा', gu: 'ડા' }],
  [{ latin: 'Di', deva: 'डी', gu: 'ડી' }, { latin: 'Du', deva: 'डू', gu: 'ડૂ' }, { latin: 'De', deva: 'डे', gu: 'ડે' }, { latin: 'Do', deva: 'डो', gu: 'ડો' }],
  [{ latin: 'Ma', deva: 'मा', gu: 'મા' }, { latin: 'Mi', deva: 'मी', gu: 'મી' }, { latin: 'Mu', deva: 'मू', gu: 'મૂ' }, { latin: 'Me', deva: 'मे', gu: 'મે' }],
  [{ latin: 'Mo', deva: 'मो', gu: 'મો' }, { latin: 'Ta', deva: 'टा', gu: 'ટા' }, { latin: 'Ti', deva: 'टी', gu: 'ટી' }, { latin: 'Tu', deva: 'टू', gu: 'ટૂ' }],
  [{ latin: 'Te', deva: 'टे', gu: 'ટે' }, { latin: 'To', deva: 'टो', gu: 'ટો' }, { latin: 'Pa', deva: 'पा', gu: 'પા' }, { latin: 'Pi', deva: 'पी', gu: 'પી' }],
  [{ latin: 'Pu', deva: 'पू', gu: 'પૂ' }, { latin: 'Sha', deva: 'ष', gu: 'ષ' }, { latin: 'Na', deva: 'ण', gu: 'ણ' }, { latin: 'Tha', deva: 'ठ', gu: 'ઠ' }],
  [{ latin: 'Pe', deva: 'पे', gu: 'પે' }, { latin: 'Po', deva: 'पो', gu: 'પો' }, { latin: 'Ra', deva: 'रा', gu: 'રા' }, { latin: 'Ri', deva: 'री', gu: 'રી' }],
  [{ latin: 'Ru', deva: 'रू', gu: 'રૂ' }, { latin: 'Re', deva: 'रे', gu: 'રે' }, { latin: 'Ro', deva: 'रो', gu: 'રો' }, { latin: 'Ta', deva: 'ता', gu: 'તા' }],
  [{ latin: 'Ti', deva: 'ती', gu: 'તી' }, { latin: 'Tu', deva: 'तू', gu: 'તૂ' }, { latin: 'Te', deva: 'ते', gu: 'તે' }, { latin: 'To', deva: 'तो', gu: 'તો' }],
  [{ latin: 'Na', deva: 'ना', gu: 'ના' }, { latin: 'Ni', deva: 'नी', gu: 'ની' }, { latin: 'Nu', deva: 'नू', gu: 'નૂ' }, { latin: 'Ne', deva: 'ने', gu: 'ને' }],
  [{ latin: 'No', deva: 'नो', gu: 'નો' }, { latin: 'Ya', deva: 'या', gu: 'યા' }, { latin: 'Yi', deva: 'यी', gu: 'યી' }, { latin: 'Yu', deva: 'यू', gu: 'યૂ' }],
  [{ latin: 'Ye', deva: 'ये', gu: 'યે' }, { latin: 'Yo', deva: 'यो', gu: 'યો' }, { latin: 'Bha', deva: 'भा', gu: 'ભા' }, { latin: 'Bhi', deva: 'भी', gu: 'ભી' }],
  [{ latin: 'Bhu', deva: 'भू', gu: 'ભૂ' }, { latin: 'Dha', deva: 'धा', gu: 'ધા' }, { latin: 'Pha', deva: 'फा', gu: 'ફા' }, { latin: 'Dha', deva: 'ढा', gu: 'ઢા' }],
  [{ latin: 'Bhe', deva: 'भे', gu: 'ભે' }, { latin: 'Bho', deva: 'भो', gu: 'ભો' }, { latin: 'Ja', deva: 'जा', gu: 'જા' }, { latin: 'Ji', deva: 'जी', gu: 'જી' }],
  [{ latin: 'Khi', deva: 'खी', gu: 'ખી', alt: { latin: 'Ju', deva: 'जू', gu: 'જૂ' } }, { latin: 'Khu', deva: 'खू', gu: 'ખૂ', alt: { latin: 'Je', deva: 'जे', gu: 'જે' } }, { latin: 'Khe', deva: 'खे', gu: 'ખે', alt: { latin: 'Jo', deva: 'जो', gu: 'જો' } }, { latin: 'Kho', deva: 'खो', gu: 'ખો', alt: { latin: 'Gha', deva: 'घा', gu: 'ઘા' } }],
  [{ latin: 'Ga', deva: 'गा', gu: 'ગા' }, { latin: 'Gi', deva: 'गी', gu: 'ગી' }, { latin: 'Gu', deva: 'गू', gu: 'ગૂ' }, { latin: 'Ge', deva: 'गे', gu: 'ગે' }],
  [{ latin: 'Go', deva: 'गो', gu: 'ગો' }, { latin: 'Sa', deva: 'सा', gu: 'સા' }, { latin: 'Si', deva: 'सी', gu: 'સી' }, { latin: 'Su', deva: 'सू', gu: 'સૂ' }],
  [{ latin: 'Se', deva: 'से', gu: 'સે' }, { latin: 'So', deva: 'सो', gu: 'સો' }, { latin: 'Da', deva: 'दा', gu: 'દા' }, { latin: 'Di', deva: 'दी', gu: 'દી' }],
  [{ latin: 'Du', deva: 'दू', gu: 'દૂ' }, { latin: 'Tha', deva: 'थ', gu: 'થ' }, { latin: 'Jha', deva: 'झ', gu: 'ઝ' }, { latin: 'Jna', deva: 'ज्ञ', gu: 'જ્ઞ', alt: { latin: 'Da', deva: 'दा', gu: 'દા' } }],
  [{ latin: 'De', deva: 'दे', gu: 'દે' }, { latin: 'Do', deva: 'दो', gu: 'દો' }, { latin: 'Cha', deva: 'चा', gu: 'ચા' }, { latin: 'Chi', deva: 'ची', gu: 'ચી' }],
];
export const SYLLABLE_SOURCE = 'research/02 §2.1 nakshatra/pada formula [P]; pada syllables: Wikipedia List of Nakshatras + printed panchang avakahada table [P]/[M]';

export const GAND_MOOL = [1, 9, 10, 18, 19, 27];
export const GAND_MOOL_SOURCE = 'research/02 §3.3 Gand Mool [S]';

/** Nakshatra lords (Vimshottari) and presiding deities, for the card and report. research/02 §2 tables [P]. */
export const NAK_LORD = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
export const NAK_DEITY = ['Ashvini Kumaras', 'Yama', 'Agni', 'Brahma (Prajapati)', 'Soma', 'Rudra', 'Aditi', 'Brihaspati', 'Nagas', 'Pitris', 'Bhaga', 'Aryaman', 'Savitr', 'Tvashtr', 'Vayu', 'Indra-Agni', 'Mitra', 'Indra', 'Nirriti', 'Apah', 'Vishvedevas', 'Vishnu', 'Vasus', 'Varuna', 'Aja Ekapada', 'Ahirbudhnya', 'Pushan'];

export type Gender = 'boy' | 'girl' | 'any';
export interface NameEntry { en: string; hi: string; gu: string; m: string; }
interface NamesFile { _about: string; boys: Record<string, NameEntry[]>; girls: Record<string, NameEntry[]>; }
const DATA = NAMES as unknown as NamesFile;

export function syllableFor(nakshatra: number, pada: number): Syllable { return PADA_SYLLABLES[nakshatra - 1][pada - 1]; }
export function isGandMool(nakshatra: number): boolean { return GAND_MOOL.includes(nakshatra); }

/** Curated names for a syllable key (latin, e.g. 'Chu'), by gender. */
export function namesFor(syllable: Syllable, gender: Gender = 'any'): { boys: NameEntry[]; girls: NameEntry[] } {
  const keys = [syllable.latin, syllable.alt?.latin].filter(Boolean) as string[];
  const pick = (table: Record<string, NameEntry[]>) => keys.flatMap(k => table[k] ?? []);
  return { boys: gender === 'girl' ? [] : pick(DATA.boys), girls: gender === 'boy' ? [] : pick(DATA.girls) };
}

export interface NaamRequest { birth: Birth; gender?: Gender; region?: Region; strictness?: Strictness; }
export interface NaamCandidate extends Janma {
  syllable: Syllable; syllables: Syllable[]; lord: string; deity: string; gandMool: boolean;
  names: { boys: NameEntry[]; girls: NameEntry[] };
}
export interface NaamResult {
  janma: JanmaResult;
  candidates: NaamCandidate[];
  /** windows for the naming ceremony: 11th day after birth through the 45th; personal Tara avoids the baby's own nakshatra */
  muhurta: MuhurtaResult;
  from: string; to: string;
  sources: string[];
}

function addDays(iso: string, n: number): string { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }

/** Everything the Namakarana screen needs. */
export function naam(req: NaamRequest): NaamResult {
  const j = janma(req.birth);
  const candidates: NaamCandidate[] = j.candidates.map(c => {
    const syl = syllableFor(c.nakshatra, c.pada);
    const all = PADA_SYLLABLES[c.nakshatra - 1];
    return { ...c, syllable: syl, syllables: all, lord: NAK_LORD[c.nakshatra - 1], deity: NAK_DEITY[c.nakshatra - 1], gandMool: isGandMool(c.nakshatra), names: namesFor(syl, req.gender ?? 'any') };
  });
  // Traditional window: the 11th or 12th day (some families the 16th, or the first month). We search day 11..45.
  const from = addDays(req.birth.date, 11), to = addDays(req.birth.date, 45);
  const muhurta = findMuhurta({ event: 'namakarana', from, to, place: req.birth.place as Place, birth: req.birth, region: req.region ?? 'north', strictness: req.strictness ?? 'standard', maxDays: 8, windowsPerDay: 2 });
  return { janma: j, candidates, muhurta, from, to, sources: [SYLLABLE_SOURCE, GAND_MOOL_SOURCE, 'research/02 §3.5 namakarana [S]: 11th/12th/16th day; nakshatras, tithis, varas as in rules/general.json', DATA._about] };
}

export const NAK_NAMES = NAKSHATRA_NAMES; export const RASHI = RASHI_NAMES;
