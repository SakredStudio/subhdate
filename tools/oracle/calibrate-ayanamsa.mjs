// Dev-only. Compares engine/nutation.ts with Swiss Ephemeris (SEFLG_NONUT difference) and fits the
// mean part of the Lahiri ayanamsa as a cubic in Julian centuries so that
//   ayanTrue(jd) = mean(T) + dpsi(jd)   matches   swe_get_ayanamsa_ex_ut(jd, SE_SIDM_LAHIRI)
// to < 0.5" over 1900-2100. Prints the coefficients to paste into engine/astro.ts.
import * as S from '@swisseph/node';
import { nutation } from '../../engine/nutation.ts';

const F = S.CalculationFlag.SwissEphemeris;
S.setSiderealMode(S.SiderealMode.Lahiri ?? 1);

// 1. nutation check
let worst = 0;
for (let y = 1900; y <= 2100; y += 0.37) {
  const jd = 2451545.0 + (y - 2000) * 365.25;
  const t = S.calculatePosition(jd, S.Planet.Sun, F).longitude;
  const m = S.calculatePosition(jd, S.Planet.Sun, F | S.CalculationFlag.NoNutation).longitude;
  let d = (t - m) * 3600; if (d > 180*3600) d -= 360*3600; if (d < -180*3600) d += 360*3600;
  const mine = nutation(jd).dpsi;
  worst = Math.max(worst, Math.abs(d - mine));
}
console.log('nutation Δψ max |SE - engine| over 1900-2100 =', worst.toFixed(4), 'arcsec');

// 2. fit mean ayanamsa: samples every ~37 days
const xs = [], ys = [];
for (let jd = 2415020.5; jd <= 2488070.5; jd += 37.3) {
  const ayan = S.getAyanamsaExUt(jd, F) * 3600;
  const dpsi = nutation(jd).dpsi;
  xs.push((jd - 2451545.0) / 36525);
  ys.push(ayan - dpsi);
}
// least squares cubic via normal equations
const n = xs.length; const deg = 3;
const A = Array.from({length: deg+1}, () => Array(deg+1).fill(0));
const b = Array(deg+1).fill(0);
for (let i = 0; i < n; i++) {
  const p = []; for (let k = 0; k <= deg; k++) p.push(xs[i] ** k);
  for (let r = 0; r <= deg; r++) { b[r] += p[r] * ys[i]; for (let c = 0; c <= deg; c++) A[r][c] += p[r] * p[c]; }
}
// gaussian elimination
for (let i = 0; i <= deg; i++) {
  let piv = i; for (let r = i+1; r <= deg; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
  [A[i], A[piv]] = [A[piv], A[i]]; [b[i], b[piv]] = [b[piv], b[i]];
  for (let r = i+1; r <= deg; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c <= deg; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
}
const coef = Array(deg+1).fill(0);
for (let i = deg; i >= 0; i--) { let s = b[i]; for (let c = i+1; c <= deg; c++) s -= A[i][c] * coef[c]; coef[i] = s / A[i][i]; }
let maxRes = 0, maxAt = 0;
for (let i = 0; i < n; i++) { const fit = coef.reduce((s, c, k) => s + c * xs[i] ** k, 0); const r = Math.abs(fit - ys[i]); if (r > maxRes) { maxRes = r; maxAt = xs[i]; } }
console.log('mean ayanamsa (arcsec) = a0 + a1 T + a2 T^2 + a3 T^3, T = Julian centuries from J2000');
console.log(coef.map(c => c.toPrecision(12)).join(', '));
console.log('max residual', maxRes.toFixed(4), '" at T =', maxAt.toFixed(2));
console.log('check 2000-01-01:', (coef[0] + nutation(2451544.5).dpsi) / 3600, 'SE', S.getAyanamsaExUt(2451544.5, F));
