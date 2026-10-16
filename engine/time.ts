// Time and timezone helpers. All engine math runs on UTC Date objects / Julian Day (UT).
// IANA timezone handling uses Intl only (no moment/luxon), per docs/ENGINE-DESIGN.md §2.

export const MS_PER_DAY = 86400000;
export const JD_UNIX_EPOCH = 2440587.5;

export function jdFromDate(d: Date): number {
  return d.getTime() / MS_PER_DAY + JD_UNIX_EPOCH;
}
export function dateFromJd(jd: number): Date {
  return new Date((jd - JD_UNIX_EPOCH) * MS_PER_DAY);
}
export function addMinutes(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60000);
}
export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY);
}

export interface CivilParts {
  year: number; month: number; day: number; hour: number; minute: number; second: number;
  weekday: number; // 0 = Sunday .. 6 = Saturday (local)
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short',
    });
    fmtCache.set(tz, f);
  }
  return f;
}
const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Local civil date/time parts of a UTC instant in an IANA zone. */
export function civil(d: Date, tz: string): CivilParts {
  const parts = fmt(tz).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '0';
  let hour = parseInt(get('hour'), 10); if (hour === 24) hour = 0;
  return {
    year: parseInt(get('year'), 10), month: parseInt(get('month'), 10), day: parseInt(get('day'), 10),
    hour, minute: parseInt(get('minute'), 10), second: parseInt(get('second'), 10),
    weekday: WD[get('weekday')] ?? 0,
  };
}

/** UTC offset in minutes (east positive) of zone `tz` at instant `d`. */
export function tzOffsetMinutes(d: Date, tz: string): number {
  const c = civil(d, tz);
  const asUtc = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second);
  return Math.round((asUtc - d.getTime()) / 60000);
}

/** The UTC instant of local midnight that starts civil date (y, m, d) in `tz`. Handles DST. */
export function localMidnightUtc(y: number, m: number, d: number, tz: string): Date {
  let guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  for (let i = 0; i < 3; i++) {
    const off = tzOffsetMinutes(guess, tz);
    const next = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - off * 60000);
    if (next.getTime() === guess.getTime()) break;
    guess = next;
  }
  return guess;
}

/** 'YYYY-MM-DD' of the local civil date of instant `d` in `tz`. */
export function isoDate(d: Date, tz: string): string {
  const c = civil(d, tz);
  return `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;
}

export function parseIsoDate(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

/** 'HH:MM' local time of an instant. */
export function hhmm(d: Date, tz: string): string {
  const c = civil(d, tz);
  return `${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
}
export function hhmmss(d: Date, tz: string): string {
  const c = civil(d, tz);
  return `${hhmm(d, tz)}:${String(c.second).padStart(2, '0')}`;
}

export function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}
