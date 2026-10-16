// Nutation in longitude (Δψ) and obliquity (Δε), IAU 1980 series (Meeus, Astronomical
// Algorithms ch. 22, Table 22.A). The leading 30 terms give Δψ to better than 0.01".
// Used only to convert the Lahiri ayanamsa between its "mean" and "true" (nutation-inclusive)
// forms so it is consistent with astronomy-engine's true-ecliptic-of-date longitudes.

const DEG = Math.PI / 180;

// [D, M, M', F, Ω, Δψ coeff (0.0001"), Δψ T-coeff, Δε coeff (0.0001"), Δε T-coeff]
const TERMS: ReadonlyArray<readonly number[]> = [
  [0, 0, 0, 0, 1, -171996, -174.2, 92025, 8.9],
  [-2, 0, 0, 2, 2, -13187, -1.6, 5736, -3.1],
  [0, 0, 0, 2, 2, -2274, -0.2, 977, -0.5],
  [0, 0, 0, 0, 2, 2062, 0.2, -895, 0.5],
  [0, 1, 0, 0, 0, 1426, -3.4, 54, -0.1],
  [0, 0, 1, 0, 0, 712, 0.1, -7, 0],
  [-2, 1, 0, 2, 2, -517, 1.2, 224, -0.6],
  [0, 0, 0, 2, 1, -386, -0.4, 200, 0],
  [0, 0, 1, 2, 2, -301, 0, 129, -0.1],
  [-2, -1, 0, 2, 2, 217, -0.5, -95, 0.3],
  [-2, 0, 1, 0, 0, -158, 0, 0, 0],
  [-2, 0, 0, 2, 1, 129, 0.1, -70, 0],
  [0, 0, -1, 2, 2, 123, 0, -53, 0],
  [2, 0, 0, 0, 0, 63, 0, 0, 0],
  [0, 0, 1, 0, 1, 63, 0.1, -33, 0],
  [2, 0, -1, 2, 2, -59, 0, 26, 0],
  [0, 0, -1, 0, 1, -58, -0.1, 32, 0],
  [0, 0, 1, 2, 1, -51, 0, 27, 0],
  [-2, 0, 2, 0, 0, 48, 0, 0, 0],
  [0, 0, -2, 2, 1, 46, 0, -24, 0],
  [2, 0, 0, 2, 2, -38, 0, 16, 0],
  [0, 0, 2, 2, 2, -31, 0, 13, 0],
  [0, 0, 2, 0, 0, 29, 0, 0, 0],
  [-2, 0, 1, 2, 2, 29, 0, -12, 0],
  [0, 0, 0, 2, 0, 26, 0, 0, 0],
  [-2, 0, 0, 2, 0, -22, 0, 0, 0],
  [0, 0, -1, 2, 1, 21, 0, -10, 0],
  [0, 2, 0, 0, 0, 17, -0.1, 0, 0],
  [2, 0, -1, 0, 1, 16, 0, -8, 0],
  [-2, 2, 0, 2, 2, -16, 0.1, 7, 0],
  [0, 1, 0, 0, 1, -15, 0, 9, 0],
  [-2, 0, 1, 0, 1, -13, 0, 7, 0],
  [0, -1, 0, 0, 1, -12, 0, 6, 0],
  [0, 0, 2, -2, 0, 11, 0, 0, 0],
  [2, 0, -1, 2, 1, -10, 0, 5, 0],
  [2, 0, 1, 2, 2, -7, 0, 3, 0],
  [0, 1, 0, 2, 2, -7, 0, 3, 0],
  [-2, 1, 1, 0, 0, -7, 0, 0, 0],
  [0, -1, 0, 2, 2, -7, 0, 3, 0],
  [2, 0, 0, 2, 1, -8, 0, 3, 0],
  [2, 0, 1, 0, 0, 6, 0, 0, 0],
  [-2, 0, 2, 2, 2, 6, 0, -3, 0],
  [-2, 0, 1, 2, 1, 6, 0, -3, 0],
  [2, 0, -2, 0, 1, -6, 0, 3, 0],
  [2, 0, 0, 0, 1, -6, 0, 3, 0],
  [0, -1, 1, 0, 0, 5, 0, 0, 0],
  [-2, -1, 0, 2, 1, -5, 0, 3, 0],
  [-2, 0, 0, 0, 1, -5, 0, 3, 0],
  [0, 0, 2, 2, 1, -5, 0, 3, 0],
];

/** Julian centuries of TT from J2000.0. astronomy-engine treats UT≈TT differences internally; for
 *  nutation a 70-second ΔT error is irrelevant (< 0.001"). */
function centuries(jd: number): number {
  return (jd - 2451545.0) / 36525;
}

/** Nutation in longitude Δψ (arcseconds) and obliquity Δε (arcseconds) at Julian Day `jd`. */
export function nutation(jd: number): { dpsi: number; deps: number } {
  const T = centuries(jd);
  const T2 = T * T;
  const T3 = T2 * T;
  const D = (297.85036 + 445267.11148 * T - 0.0019142 * T2 + T3 / 189474) * DEG;
  const M = (357.52772 + 35999.05034 * T - 0.0001603 * T2 - T3 / 300000) * DEG;
  const Mp = (134.96298 + 477198.867398 * T + 0.0086972 * T2 + T3 / 56250) * DEG;
  const F = (93.27191 + 483202.017538 * T - 0.0036825 * T2 + T3 / 327270) * DEG;
  const Om = (125.04452 - 1934.136261 * T + 0.0020708 * T2 + T3 / 450000) * DEG;
  let dpsi = 0;
  let deps = 0;
  for (const t of TERMS) {
    const arg = t[0] * D + t[1] * M + t[2] * Mp + t[3] * F + t[4] * Om;
    dpsi += (t[5] + t[6] * T) * Math.sin(arg);
    deps += (t[7] + t[8] * T) * Math.cos(arg);
  }
  return { dpsi: dpsi * 1e-4, deps: deps * 1e-4 };
}
