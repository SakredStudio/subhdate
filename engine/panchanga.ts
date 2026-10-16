// L1 panchanga: the five limbs with start/end instants, anchored on the local sunrise, plus month,
// paksha, year, season and ayana. See docs/ENGINE-DESIGN.md §3 and research/02 §2.
//
// "Panchang for a date" = the values at sunrise of that civil date at (lat, lon), plus every
// boundary that falls before the next sunrise, so a day can list "Panchami till 14:07, then Shashthi".

import {
  type Place, type SunriseConvention, sunrise as sunriseAt, sunset as sunsetAt, moonrise as moonriseAt,
  moonset as moonsetAt, elongation, moonSidereal, sunSidereal, yogaAngle, ayanamsaAt, searchIncreasingAngle,
} from './astro.ts';
import { localMidnightUtc, parseIsoDate, civil, addDays, jdFromDate } from './time.ts';
import {
  tithiName, tithiGroup, NAKSHATRA_NAMES, YOGA_NAMES, karanaName, VARA_NAMES, VARA_SHORT, VARA_LORD,
  RASHI_NAMES, MASA_NAMES, RITU_NAMES, SAMVATSARA_NAMES,
} from './names.ts';

export type Region = 'north' | 'west' | 'south' | 'east' | 'diaspora';
export type MonthSystem = 'amanta' | 'purnimanta';

export interface PanchangOptions {
  sunrise?: SunriseConvention;      // default 'limb'
  monthSystem?: MonthSystem;        // default by region
  region?: Region;                  // default 'north'
}

export interface Span {
  /** 1-based classical number (tithi 1..30, nakshatra 1..27, yoga 1..27); karana uses slot 0..59 in `slot` */
  num: number;
  name: string;
  /** null when the start precedes the search window (never for the first span in practice) */
  start: Date;
  end: Date;
  /** true for the span that holds at sunrise */
  atSunrise: boolean;
}
export interface TithiSpan extends Span { paksha: 'Shukla' | 'Krishna'; group: ReturnType<typeof tithiGroup>; kshaya?: boolean; vriddhi?: boolean; }
export interface NakshatraSpan extends Span { pada: number; lord: string; }
export interface KaranaSpan extends Span { slot: number; }

export interface MasaInfo { index: number; name: string; adhika: boolean; kshaya: boolean; start: Date; end: Date; }

export interface PanchangDay {
  date: string;                 // civil date 'YYYY-MM-DD' in place.tz
  place: Place;
  options: Required<PanchangOptions>;
  sunrise: Date; sunset: Date; nextSunrise: Date;
  moonrise: Date | null; moonset: Date | null;
  dayLength: number;            // ms, sunset - sunrise
  nightLength: number;          // ms, nextSunrise - sunset
  vara: { index: number; name: string; short: string; lord: string };
  tithi: TithiSpan[];
  nakshatra: NakshatraSpan[];
  yoga: Span[];
  karana: KaranaSpan[];
  paksha: 'Shukla' | 'Krishna';
  masa: { amanta: MasaInfo; purnimanta: MasaInfo; display: MasaInfo; system: MonthSystem };
  samvatsara: { vikram: number; vikramGujarati: number; shaka: number; nameSouth: string; nameNorth: string };
  ritu: string;
  ayana: 'Uttarayana' | 'Dakshinayana';
  moonRashi: { index: number; name: string };
  sunRashi: { index: number; name: string };
  moonLongitude: number;        // sidereal, at sunrise
  sunLongitude: number;         // sidereal, at sunrise
  ayanamsa: number;             // degrees at sunrise
}

const NAK_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

function defaultMonthSystem(region: Region): MonthSystem {
  return region === 'north' ? 'purnimanta' : 'amanta';
}

/** Build the list of spans of an angle-based limb between sunrise and next sunrise. */
function spans(f: (d: Date) => number, width: number, count: number, sunrise: Date, nextSunrise: Date,
  nameOf: (idx0: number) => string): Span[] {
  const out: Span[] = [];
  const a = f(sunrise);
  let idx0 = Math.floor(a / width) % count; // 0-based index of the limb at sunrise
  // start of the first span: previous boundary (search backward from a day before)
  const startTarget = idx0 * width;
  const start = searchIncreasingAngle(f, startTarget, addDays(sunrise, -1.3), 1.3) ?? addDays(sunrise, -1);
  let cursor = start;
  let guard = 0;
  while (guard++ < 5) {
    const endTarget = ((idx0 + 1) % count) * width;
    const end = searchIncreasingAngle(f, endTarget, cursor, 2.2) ?? addDays(cursor, 1.5);
    out.push({ num: idx0 + 1, name: nameOf(idx0), start: cursor, end, atSunrise: out.length === 0 });
    if (end.getTime() >= nextSunrise.getTime()) break;
    cursor = end;
    idx0 = (idx0 + 1) % count;
  }
  return out;
}

/** Previous new moon at or before `t`, and the next one after it. */
function lunarMonthBounds(t: Date): { nm1: Date; nm2: Date } {
  let nm1 = searchIncreasingAngle(elongation, 360, addDays(t, -31), 31)!;
  let nm2 = searchIncreasingAngle(elongation, 360, addDays(nm1, 1), 31)!;
  while (nm2.getTime() <= t.getTime()) { nm1 = nm2; nm2 = searchIncreasingAngle(elongation, 360, addDays(nm1, 1), 31)!; }
  return { nm1, nm2 };
}
/** Previous full moon at or before `t`, and the next one after it. */
function purnimantaBounds(t: Date): { fm1: Date; fm2: Date } {
  let fm1 = searchIncreasingAngle(elongation, 180, addDays(t, -31), 31)!;
  let fm2 = searchIncreasingAngle(elongation, 180, addDays(fm1, 1), 31)!;
  while (fm2.getTime() <= t.getTime()) { fm1 = fm2; fm2 = searchIncreasingAngle(elongation, 180, addDays(fm1, 1), 31)!; }
  return { fm1, fm2 };
}

/** Number of sidereal sankrantis (Sun rashi ingresses) in [a, b). */
function sankrantisBetween(a: Date, b: Date): number {
  const ra = Math.floor(sunSidereal(a) / 30);
  const rb = Math.floor(sunSidereal(b) / 30);
  return ((rb - ra) % 12 + 12) % 12;
}

/** Amanta month that contains instant `t` (research/02 §2.3; adhika = no sankranti in the month). */
export function amantaMonth(t: Date): MasaInfo {
  const { nm1, nm2 } = lunarMonthBounds(t);
  const n = sankrantisBetween(nm1, nm2);
  const sunRashi0 = Math.floor(sunSidereal(nm1) / 30); // 0-based rashi at month start
  const index = (sunRashi0 + 1) % 12; // 0-based month index: next rashi's month
  return { index: index + 1, name: MASA_NAMES[index], adhika: n === 0, kshaya: n >= 2, start: nm1, end: nm2 };
}

/** Purnimanta month for instant `t`, derived from the amanta month (research/02 §2.3). */
export function purnimantaMonth(t: Date, am: MasaInfo, paksha: 'Shukla' | 'Krishna'): MasaInfo {
  const { fm1, fm2 } = purnimantaBounds(t);
  if (paksha === 'Shukla') return { ...am, start: fm1, end: fm2 };
  if (am.adhika) return { ...am, start: fm1, end: fm2 }; // the adhika month keeps its name through its krishna half
  const index = am.index % 12; // next name, 1-based wrap
  return { index: index + 1, name: MASA_NAMES[index], adhika: false, kshaya: false, start: fm1, end: fm2 };
}

function samvatsara(gregYear: number, gregMonth: number, amantaIndex: number) {
  const early = gregMonth <= 4; // Jan..Apr
  // Chaitradi (Vikram north, Shaka): year rolls at Chaitra Shukla 1
  const chaitradiBase = amantaIndex >= 10 && early ? gregYear - 1 : gregYear;
  // Kartikadi (Gujarati Vikram): year rolls at Kartika Shukla 1 (day after Diwali)
  const kartikadiBase = amantaIndex >= 8 ? (early ? gregYear - 1 : gregYear) : gregYear - 1;
  const vikram = chaitradiBase + 57;
  const vikramGujarati = kartikadiBase + 57;
  const shaka = chaitradiBase - 78;
  // Jovian names: south index = (shaka + 11) mod 60; north = south + 14 (UNVERIFIED offset, see data/calendar.json)
  const south = ((shaka + 11) % 60 + 60) % 60;
  const north = (south + 14) % 60;
  return { vikram, vikramGujarati, shaka, nameSouth: SAMVATSARA_NAMES[south], nameNorth: SAMVATSARA_NAMES[north] };
}

const cache = new Map<string, PanchangDay>();

/** The panchang of civil date `date` ('YYYY-MM-DD') at `place`. Cached per (date, place, options). */
export function panchang(date: string, place: Place, opts: PanchangOptions = {}): PanchangDay {
  const options: Required<PanchangOptions> = {
    sunrise: opts.sunrise ?? 'limb',
    region: opts.region ?? 'north',
    monthSystem: opts.monthSystem ?? defaultMonthSystem(opts.region ?? 'north'),
  };
  const key = `${date}|${place.lat.toFixed(4)}|${place.lon.toFixed(4)}|${place.tz}|${options.sunrise}|${options.monthSystem}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { y, m, d } = parseIsoDate(date);
  const midnight = localMidnightUtc(y, m, d, place.tz);
  const conv = options.sunrise;
  let sr = sunriseAt(place, midnight, conv);
  if (!sr) throw new Error(`No sunrise at ${place.name ?? place.lat + ',' + place.lon} on ${date} (polar?)`);
  // guard: the first sunrise after local midnight must be on this civil date
  if (civil(sr, place.tz).day !== d) sr = sunriseAt(place, addDays(midnight, 0.5), conv) ?? sr;
  const ss = sunsetAt(place, sr, conv)!;
  const nextSr = sunriseAt(place, addDays(sr, 0.5), conv)!;
  const mr = moonriseAt(place, midnight);
  const ms = moonsetAt(place, midnight);
  const moonriseToday = mr && civil(mr, place.tz).day === d ? mr : null;
  const moonsetToday = ms && civil(ms, place.tz).day === d ? ms : null;

  const wd = civil(sr, place.tz).weekday;
  const tithiSpans = spans(elongation, 12, 30, sr, nextSr, i => tithiName(i + 1)) as TithiSpan[];
  for (const t of tithiSpans) {
    t.paksha = t.num <= 15 ? 'Shukla' : 'Krishna';
    t.group = tithiGroup(t.num);
  }
  // kshaya: a tithi that starts and ends between two sunrises (never holds at a sunrise)
  for (let i = 1; i < tithiSpans.length; i++) if (tithiSpans[i].end.getTime() < nextSr.getTime()) tithiSpans[i].kshaya = true;
  // vriddhi: the sunrise tithi still holds at the next sunrise
  if (tithiSpans[0].end.getTime() >= nextSr.getTime()) {
    // only a true vriddhi if it also held at the previous sunrise; approximate: span length > 1 day
    if (tithiSpans[0].end.getTime() - tithiSpans[0].start.getTime() > 86400000 * 1.0 &&
      tithiSpans[0].start.getTime() < addDays(sr, -1).getTime()) tithiSpans[0].vriddhi = true;
  }

  const nakSpans = spans(moonSidereal, 360 / 27, 27, sr, nextSr, i => NAKSHATRA_NAMES[i]) as NakshatraSpan[];
  const moonLon = moonSidereal(sr);
  for (const n of nakSpans) {
    n.lord = NAK_LORDS[(n.num - 1) % 9];
    n.pada = n.atSunrise ? Math.floor((moonLon % (360 / 27)) / (360 / 108)) + 1 : 1;
  }
  const yogaSpans = spans(yogaAngle, 360 / 27, 27, sr, nextSr, i => YOGA_NAMES[i]);
  const karanaSpans = spans(elongation, 6, 60, sr, nextSr, i => karanaName(i)) as KaranaSpan[];
  for (const k of karanaSpans) { k.slot = k.num - 1; }

  const paksha = tithiSpans[0].paksha;
  const am = amantaMonth(sr);
  const pm = purnimantaMonth(sr, am, paksha);
  const sunLon = sunSidereal(sr);
  const sunRashi0 = Math.floor(sunLon / 30);
  const moonRashi0 = Math.floor(moonLon / 30);
  const ritu = RITU_NAMES[Math.floor((am.index - 1) / 2)];
  const ayana: 'Uttarayana' | 'Dakshinayana' = (sunLon >= 270 || sunLon < 90) ? 'Uttarayana' : 'Dakshinayana';

  const day: PanchangDay = {
    date, place, options,
    sunrise: sr, sunset: ss, nextSunrise: nextSr, moonrise: moonriseToday, moonset: moonsetToday,
    dayLength: ss.getTime() - sr.getTime(), nightLength: nextSr.getTime() - ss.getTime(),
    vara: { index: wd, name: VARA_NAMES[wd], short: VARA_SHORT[wd], lord: VARA_LORD[wd] },
    tithi: tithiSpans, nakshatra: nakSpans, yoga: yogaSpans, karana: karanaSpans,
    paksha,
    masa: { amanta: am, purnimanta: pm, display: options.monthSystem === 'amanta' ? am : pm, system: options.monthSystem },
    samvatsara: samvatsara(y, m, am.index),
    ritu, ayana,
    moonRashi: { index: moonRashi0 + 1, name: RASHI_NAMES[moonRashi0] },
    sunRashi: { index: sunRashi0 + 1, name: RASHI_NAMES[sunRashi0] },
    moonLongitude: moonLon, sunLongitude: sunLon, ayanamsa: ayanamsaAt(sr),
  };
  if (cache.size > 2000) cache.clear();
  cache.set(key, day);
  return day;
}

/** Which span of `list` holds at instant `t` (falls back to the last one). */
export function spanAt<T extends Span>(list: T[], t: Date): T {
  for (const s of list) if (t.getTime() < s.end.getTime()) return s;
  return list[list.length - 1];
}

/** Instantaneous values (no sunrise anchoring) for a moment: used by L4 birth data and L5 slot scoring. */
export function limbsAt(t: Date) {
  const e = elongation(t);
  const ml = moonSidereal(t);
  const ya = yogaAngle(t);
  const tithi = Math.floor(e / 12) + 1;
  const nak = Math.floor(ml / (360 / 27)) + 1;
  return {
    tithi, tithiName: tithiName(tithi), paksha: tithi <= 15 ? 'Shukla' as const : 'Krishna' as const,
    nakshatra: nak, nakshatraName: NAKSHATRA_NAMES[nak - 1], pada: Math.floor((ml % (360 / 27)) / (360 / 108)) + 1,
    yoga: Math.floor(ya / (360 / 27)) + 1, karanaSlot: Math.floor(e / 6),
    moonRashi: Math.floor(ml / 30) + 1, sunRashi: Math.floor(sunSidereal(t) / 30) + 1,
    moonLongitude: ml, jd: jdFromDate(t),
  };
}

export function clearPanchangCache() { cache.clear(); }
