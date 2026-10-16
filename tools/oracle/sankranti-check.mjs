// Dev-only: Swiss Ephemeris instant of the Makara sankranti (sidereal Sun = 270 deg, Lahiri) in Jan 2027.
import * as S from '@swisseph/node';
S.setSiderealMode(1);
const FSID = S.CalculationFlag.SwissEphemeris | S.CalculationFlag.Sidereal;
const sun = jd => S.calculatePosition(jd, S.Planet.Sun, FSID).longitude;
let lo = S.julianDay(2027, 1, 13, 0), hi = S.julianDay(2027, 1, 16, 0);
while ((hi - lo) * 86400 > 0.5) { const mid = (lo + hi) / 2; if (sun(mid) >= 270) hi = mid; else lo = mid; }
const d = new Date(((lo + hi) / 2 - 2440587.5) * 86400000);
console.log('SE Makara sankranti 2027 UTC', d.toISOString(), 'IST', new Date(d.getTime() + 330 * 60000).toISOString().slice(11, 19));
console.log('SE Lahiri ayanamsa 2026-10-20 0h UT', S.getAyanamsaExUt(S.julianDay(2026, 10, 20, 0), S.CalculationFlag.SwissEphemeris), '(Drik page shows 24.238203)');
