// L0 astro: positions, ayanamsa, rise/set. Pure math on top of astronomy-engine (MIT).
// See docs/ENGINE-DESIGN.md §2 and research/03-engine-tech-rails.md §1.
//
// Conventions
// - Longitudes from astronomy-engine are apparent, geocentric, true ecliptic OF DATE (nutation included).
// - Lahiri ayanamsa here is the Swiss Ephemeris SE_SIDM_LAHIRI "true" value: mean part (cubic fitted once
//   against swe_get_ayanamsa_ex_ut over 1900-2100, residual < 0.02") plus nutation in longitude.
// - Sidereal longitude = tropical true-of-date minus ayanamsa(true), normalised 0-360.
// - Sunrise 'limb' = upper limb with 34' refraction (SearchRiseSet; Drik Panchang default).
//   'center' = disc centre on the geometric horizon, no refraction (SearchAltitude at 0 deg).

import * as A from 'astronomy-engine';
import { nutation } from './nutation.ts';
import { jdFromDate, norm360, addDays } from './time.ts';

export type SunriseConvention = 'limb' | 'center';

export interface Place {
  /** degrees, north positive */
  lat: number;
  /** degrees, east positive */
  lon: number;
  /** IANA zone, e.g. 'Asia/Kolkata' */
  tz: string;
  name?: string;
  /** metres above sea level; ignored for rise/set by default (Drik convention) */
  elevation?: number;
}

// Fitted mean Lahiri ayanamsa, arcseconds, T = Julian centuries from J2000.0 (tools/oracle/calibrate-ayanamsa.mjs)
const AYAN_MEAN = [85885.5312204, 5028.79679446, 1.10460226241, -0.000712615179742];

/** Lahiri (Chitrapaksha) ayanamsa in degrees, true (nutation-inclusive), at Julian Day `jd` (UT). */
export function ayanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const mean = AYAN_MEAN[0] + AYAN_MEAN[1] * T + AYAN_MEAN[2] * T * T + AYAN_MEAN[3] * T * T * T;
  return (mean + nutation(jd).dpsi) / 3600;
}
export function ayanamsaAt(d: Date): number {
  return ayanamsa(jdFromDate(d));
}

/** Tropical (true ecliptic of date) longitudes in degrees. */
export function sunTropical(d: Date): number {
  return norm360(A.SunPosition(d).elon);
}
export function moonTropical(d: Date): number {
  return norm360(A.EclipticGeoMoon(d).lon);
}
export type PlanetName = 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn';
const BODY: Record<PlanetName, A.Body> = {
  Mercury: A.Body.Mercury, Venus: A.Body.Venus, Mars: A.Body.Mars, Jupiter: A.Body.Jupiter, Saturn: A.Body.Saturn,
};
export function planetTropical(p: PlanetName, d: Date): number {
  return norm360(A.Ecliptic(A.GeoVector(BODY[p], d, true)).elon);
}

/** Sidereal (Lahiri) longitudes in degrees. */
export function sunSidereal(d: Date): number {
  return norm360(sunTropical(d) - ayanamsaAt(d));
}
export function moonSidereal(d: Date): number {
  return norm360(moonTropical(d) - ayanamsaAt(d));
}
export function planetSidereal(p: PlanetName, d: Date): number {
  return norm360(planetTropical(p, d) - ayanamsaAt(d));
}
/** Moon minus Sun elongation in degrees [0, 360). Ayanamsa cancels. This is the tithi angle. */
export function elongation(d: Date): number {
  return norm360(moonTropical(d) - sunTropical(d));
}
/** Sidereal Moon + Sun, mod 360: the nitya-yoga angle. */
export function yogaAngle(d: Date): number {
  return norm360(moonSidereal(d) + sunSidereal(d));
}

/** Is the planet retrograde (apparent geocentric longitude decreasing) at `d`? */
export function isRetrograde(p: PlanetName, d: Date): boolean {
  const a = planetTropical(p, addDays(d, -0.5));
  const b = planetTropical(p, addDays(d, 0.5));
  let diff = b - a; if (diff > 180) diff -= 360; if (diff < -180) diff += 360;
  return diff < 0;
}

function observer(place: Place): A.Observer {
  return new A.Observer(place.lat, place.lon, place.elevation ?? 0);
}

type Body = 'Sun' | 'Moon';
const AB: Record<Body, A.Body> = { Sun: A.Body.Sun, Moon: A.Body.Moon };

/**
 * First rise (direction +1) or set (-1) of `body` at or after `start`, within `limitDays`.
 * Returns null if none (polar day/night, or a day with no moonrise).
 */
export function riseSet(body: Body, place: Place, direction: 1 | -1, start: Date, limitDays = 1.2,
  convention: SunriseConvention = 'limb'): Date | null {
  const obs = observer(place);
  const r = convention === 'limb'
    ? A.SearchRiseSet(AB[body], obs, direction, start, limitDays)
    : A.SearchAltitude(AB[body], obs, direction, start, limitDays, 0);
  return r ? r.date : null;
}
export const sunrise = (place: Place, start: Date, conv: SunriseConvention = 'limb') => riseSet('Sun', place, 1, start, 1.2, conv);
export const sunset = (place: Place, start: Date, conv: SunriseConvention = 'limb') => riseSet('Sun', place, -1, start, 1.2, conv);
export const moonrise = (place: Place, start: Date) => riseSet('Moon', place, 1, start, 1.2, 'limb');
export const moonset = (place: Place, start: Date) => riseSet('Moon', place, -1, start, 1.2, 'limb');

/** Instant when the Sun's tropical longitude reaches `lon` (degrees), searching forward from `start`. */
export function searchSunLongitude(lon: number, start: Date, limitDays = 400): Date | null {
  const t = A.SearchSunLongitude(norm360(lon), start, limitDays);
  return t ? t.date : null;
}

/**
 * Generic root finder: first instant t in [start, start+limitDays] where the increasing angle f(t)
 * passes `target` (mod 360). Brackets on an hourly grid then bisects to `tolSec`.
 * Works for the Moon's longitude (<= 0.6 deg/h) and Moon+Sun (<= 0.65 deg/h); an hourly grid never
 * skips a boundary because every boundary is 12 or 13.33 deg apart.
 * Returns null if no crossing in range.
 */
export function searchIncreasingAngle(f: (d: Date) => number, target: number, start: Date, limitDays: number,
  stepHours = 1, tolSec = 0.5): Date | null {
  const tgt = norm360(target);
  // gap = how far f still has to travel to reach target, in [0, 360)
  const gap = (d: Date) => norm360(tgt - f(d));
  let t0 = start.getTime();
  const tEnd = t0 + limitDays * 86400000;
  let g0 = gap(new Date(t0));
  const step = stepHours * 3600000;
  while (t0 < tEnd) {
    const t1 = Math.min(t0 + step, tEnd);
    const g1 = gap(new Date(t1));
    // the gap shrinks steadily; a jump UP means we crossed the target inside (t0, t1]
    if (g1 > g0 + 180) {
      let lo = t0, hi = t1;
      while (hi - lo > tolSec * 1000) {
        const mid = (lo + hi) / 2;
        if (gap(new Date(mid)) > 180) hi = mid; else lo = mid;
      }
      return new Date((lo + hi) / 2);
    }
    if (g1 === 0) return new Date(t1);
    t0 = t1; g0 = g1;
  }
  return null;
}

/** Midpoint of two instants (local apparent noon = midpoint of sunrise and sunset). */
export function midpoint(a: Date, b: Date): Date {
  return new Date((a.getTime() + b.getTime()) / 2);
}

export interface EclipseEvent { kind: 'solar' | 'lunar'; peak: Date; }
/** Next lunar eclipse (any kind, global) after `start`. */
export function nextLunarEclipse(start: Date): EclipseEvent {
  const e = A.SearchLunarEclipse(start);
  return { kind: 'lunar', peak: e.peak.date };
}
/** Next solar eclipse anywhere on Earth after `start`. */
export function nextGlobalSolarEclipse(start: Date): EclipseEvent {
  const e = A.SearchGlobalSolarEclipse(start);
  return { kind: 'solar', peak: e.peak.date };
}
/** Next solar eclipse visible from `place` (partial or better). */
export function nextLocalSolarEclipse(start: Date, place: Place): EclipseEvent {
  const e = A.SearchLocalSolarEclipse(start, observer(place));
  return { kind: 'solar', peak: e.peak.time.date };
}
