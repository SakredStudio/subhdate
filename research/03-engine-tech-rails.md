# SubhDate rebuild — research 03: engine, validation, rails, platform

Date: 2026-10-15. Researcher: Claude (Fable 5.1 subagent). Scope: technical foundations for a $0-infra panchang + muhurta PWA → Play TWA, built by a solo founder on Windows (Node 26 / npm 11, no Python), company = 1789918 CANADA INC., market = India + diaspora.

Legend: **[VERIFIED]** = read from a primary page or measured locally this session. **[SECONDARY]** = from a comparison blog / news / vendor. **[UNVERIFIED]** = my recollection or inference; check before relying on it.

---

## 0. Decisions this research supports (TL;DR)

| Question | Recommendation | Confidence |
|---|---|---|
| Browser ephemeris | `astronomy-engine` 2.1.19 (MIT, **113.7 KB min / 45.7 KB gz**, measured). Validate it against Swiss Ephemeris in a Node-only dev harness. | High |
| Ayanamsa | Lahiri (SE_SIDM_LAHIRI = 1), reference 23°15'00".658 at 1956-03-21 0:00 TDT, "true" (includes nutation). Oct-2026 value ≈ 24°13'50" ± 20". | High on definition, medium on 2026 arcsecond value |
| Sunrise convention | Default = upper limb + 34' refraction (Drik Panchang's default, newspapers). Offer "Hindu/middle-limb" (disc centre, no refraction) as a setting. | High |
| Validation oracle | Swiss Ephemeris (`@swisseph/browser`/`sweph-wasm`, AGPL — fine as a **dev-only, non-distributed** harness) + Prokerala free tier (5,000 credits/mo) + hand-entered Drik Panchang + Rashtriya Panchang spot checks. Do not scrape Drik. | High |
| Geocoding/tz | Bundle a GeoNames `cities15000` subset (CC BY 4.0) with its `timezone` column; `@photostructure/tz-lookup` (CC0, 88 KB) only for GPS points. No Open-Meteo (CC BY-NC) in a paid app. | High |
| Play packaging | Bubblewrap 1.27.0 (targetSdk 36 since 1.25.0; ABH 2.7.4). Play requires target 36 from 2026-08-31. | High |
| Selling in the TWA | Play Billing via Digital Goods API is mandatory for digital goods in the Play build; a web paywall linked from the app violates Payments policy §4. Sell on the open web separately (Paddle/Gumroad as MoR). | High |
| Payment rail (web) | Merchant-of-record first: **Paddle** (UPI + UPI Autopay live, INR, MoR handles 18% OIDAR GST) → fallback **Gumroad** (MoR since 2025-01-01, UPI reported). Razorpay "Import Flow" works for foreign entities but drags in PAN collection, invoices, purpose codes and self-managed GST. | Medium (Paddle approval is strict) |
| LLM explanations | Haiku 5.5 ($0.10/$0.50 per MTok) behind a token-gated Worker, cache by (date,event,region,lang,engine_version). ≈ $2–5/month per 1,000 daily-active users. LLM verbalises only. | High |
| Notifications | Web Push works in TWAs (Chrome); no client-side scheduled notifications on the web (Notification Triggers never shipped) → server cron (Workers Cron) sends push. iOS: home-screen PWA only. | High |
| i18n | Rely on Android's built-in Noto Indic fonts; don't ship Indic webfonts for Android. Curate per-language term tables (Tamil/Telugu use regional names, not transliterations). Use the government Rashtriya Panchang PDFs (12 languages) as the terminology authority. | High |

---

## 1. Ephemeris in JavaScript

### 1.1 Accuracy budget (why ~1 arcmin on the Moon matters)

The Moon's geocentric longitude advances ≈ 13.18°/day ≈ 0.55 arcsec per second of time, i.e. **1 arcmin of Moon error ≈ 1.8 minutes of tithi/nakshatra end-time error**. The Sun moves ≈ 1°/day, so Sun errors matter ~13× less for tithi but matter for sankranti (rashi ingress) timing: 1' of Sun ≈ 24 minutes of sankranti timing. Targets for SubhDate:

- Tithi/nakshatra/yoga end times within **±2 min** of Swiss Ephemeris → need Moon longitude ≤ ~1', Sun ≤ ~1'.
- Sunrise/sunset within **±1 min** → need the right altitude convention more than ephemeris precision (see §2.5).
- Sankranti within ±15 min → Sun ≤ ~0.6'. Astronomy Engine's Sun (VSOP87-based) is far better than that.

### 1.2 Candidates (all sizes measured with `npm view` / `npm pack` on 2026-10-15 unless noted)

| Package | Version / date | Licence | Size | Sun/Moon model & accuracy | Verdict |
|---|---|---|---|---|---|
| `astronomy-engine` (Don Cross) | 2.1.19, published 2023-12-14 (stable, low churn) | MIT | unpacked 1.84 MB (includes .d.ts, README, ESM); **`astronomy.browser.min.js` = 113.7 KB raw, 45.7 KB gzipped** [VERIFIED by `npm pack` + gzip] | Project claim: "accurate to within ±1 arcminute", models VSOP87 + NOVAS C 3.1, unit-tested against NOVAS and JPL Horizons. Moon: `GeoMoon` is "Based on the Nautical Almanac Office's Improved Lunar Ephemeris of 1954" (Brown's theory); `EclipticGeoMoon` is "adapted from Turbo Pascal code in Montenbruck and Pfleger's book Astronomy on the Personal Computer" and returns lon/lat "measured in the true ecliptic of date" [VERIFIED from README]. | **Primary choice.** Only candidate that is MIT, < 50 KB gz, no data files, and has built-in root-finders (`SearchMoonPhase`, `SearchRiseSet`, `SearchAltitude`). |
| `@swisseph/browser` | 1.4.0, 2026-09-28 | **AGPL-3.0** | unpacked 689 KB; README claims "~250KB gzipped" with built-in Moshier, "sub-arcsecond" (optional 2 MB JPL files from CDN) | Swiss Ephemeris doc §2.1.1: Moshier deviation "below 1 arc second with the planets and a few arc seconds with the Moon" [VERIFIED]. | Best accuracy, but AGPL → you must open-source the whole app or buy Astrodienst's professional licence. Use it only as the **dev-side oracle** (Node test harness, not shipped). |
| `sweph-wasm` | 2.6.9, 2025-09-09 | AGPL-3.0-or-later | unpacked **110.6 MB** (bundles .se1 files) | Full Swiss Ephemeris | Node oracle only. |
| `astronomia` | 4.2.0, 2025-08-30 | MIT | unpacked 18.7 MB (full VSOP87 data tables; tree-shakable) | JS port of Meeus (via Go `meeus`): `moonposition` = Meeus ch. 47 (truncated ELP-2000/82; Meeus quotes ~10" in longitude) [UNVERIFIED that the port matches], `planetposition` full VSOP87 | Viable backup; you'd import only `moonposition`, `solar`, `nutation`, `julian`, `sidereal`. Fewer helpers; you write your own root-finders. |
| `meeusjs` | 1.0.4, 2022 | MIT | 162 KB | Meeus Sun/Moon, tests vs JPL Horizons [SECONDARY] | Small, unmaintained; no rise/set search helpers. |
| `suncalc` | 2.1.1 (npm shows a 2026-10-05 2.x release; 1.9.0 was the long-lived classic) | BSD-2-Clause (1.x) [UNVERIFIED for 2.x] | 56 KB | README (2.x) claims ~0.08° Sun, **~0.09° Moon** (≈ 5.4' → ≈ 10 min tithi error), rise/set ±15 s [SECONDARY] | **Not usable** for tithi/nakshatra boundaries. Fine for a sunrise widget only. |
| `orbits.js` (vsr83) | GitHub | MIT [SECONDARY] | large | ELP2000-82B, "< 200 m vs Horizons 1900–2100" [SECONDARY] | Overkill; heavy. |

Sources: Astronomy Engine README (https://github.com/cosinekitty/astronomy and https://raw.githubusercontent.com/cosinekitty/astronomy/master/source/js/README.md), `@swisseph/browser` README (https://cdn.jsdelivr.net/npm/@swisseph/browser@1.1.1/README.md), monorepo https://github.com/swisseph-js/swisseph, sweph-wasm https://www.jsdelivr.com/package/npm/sweph-wasm, astronomia https://www.npmjs.com/package/astronomia, meeusjs https://www.npmjs.com/package/meeusjs, suncalc https://github.com/mourner/suncalc, Swiss Ephemeris programmer docs https://www.astro.com/swisseph/swisseph.htm.

**Astronomy Engine API you will actually use** [VERIFIED from README]:
- `SunPosition(date)` → "apparent geocentric true ecliptic coordinates of date" (`elon`). Includes aberration, precession and nutation.
- `EclipticGeoMoon(date)` → `{lat, lon, dist}` in the **true ecliptic of date** (so nutation is already in `lon`).
- `MoonPhase(date)` → (Moon − Sun) ecliptic longitude difference in [0,360). This *is* the tithi angle.
- `SearchMoonPhase(targetLon, dateStart, limitDays)` → time when Moon−Sun = `targetLon`. Call with `targetLon = 12·k` to get tithi end times directly; the library does the root-finding.
- `SearchRiseSet(body, observer, direction, dateStart, limitDays, metersAboveGround=0)` → "adjusts for the apparent angular radius of the observed body" and "uses a correction of 34 arcminutes" of refraction; i.e. **upper limb at −(34' + semi-diameter)** — exactly Drik Panchang's default convention. Works for `Body.Moon` too (moonrise/moonset). Returns `null` when no event in the window (polar/diaspora edge cases — handle it).
- `SearchAltitude(body, observer, direction, dateStart, limitDays, altitude)` → body **centre** crossing a given altitude, "not corrected for atmospheric refraction". Use `altitude = 0` for the "Hindu sunrise = centre on horizon, no refraction" variant.
- `Refraction("normal", alt)` → Meeus-based correction, if you want to build custom conventions.
- Frames: EQJ (J2000 mean), EQD (equator of date, precession + nutation), ECT (true ecliptic of date). The library "approximates UT1 and UTC as being the same thing" (fine: ΔT handled internally; sub-second UT1-UTC irrelevant here).

**Open risk to measure in week 1:** the Montenbruck–Pfleger Moon series behind `EclipticGeoMoon` is typically quoted at ~1' but is not independently specified for the ecliptic-longitude path; the project's ±1' figure is a design target, not a per-function bound. Build the Node harness (§3.5) first and histogram `astronomy-engine` vs Swiss Ephemeris Moon longitude over 2024–2030 at 1-hour steps. If p99 < 40" you are comfortably inside ±2 min; if not, fall back to `astronomia.moonposition` for the Moon only, or precompute daily Moon longitude corrections server-side and ship them as a tiny table.

### 1.3 Lahiri ayanamsa — definition, formula, 2026 value

Swiss Ephemeris documentation §2.8.5 [VERIFIED]:
- **Standard Lahiri (IAE 1985, ID 1 = `SE_SIDM_LAHIRI`)**: ayanamsha = **23°15'00".658 on 21 March 1956, 0:00 TDT**; Spica (2000) at 179°58'58". The doc states this value is "true, not mean" — it "includes nutation and is relative to the true equinox of date".
- **Lahiri ICRC / pre-1985 (ID 46)**: 23°15'00".0 on the same date.
- **Lahiri 1940 (Panchanga Darpan)**: 22°26'45".50 at J1900.0.
- **Lahiri VP285 (ID 44)**: zero at the mean equinox of 22 March 285 CE; differs from standard by 5".8 (Newcomb) or 23" (IAU 2006/Vondrák).
- Spica's longitude under standard Lahiri in 2000 = 179°59'04" (i.e. Lahiri is ~56" "ahead" of a true-Spica zodiac).
- **True Chitrapaksha (`SE_SIDM_TRUE_CITRA` = 27)**: "Spica is always exactly at 180° or 0° Libra in ecliptic longitude". Difference from Lahiri ≈ 1' and drifting with Spica's proper motion → ≈ 2 minutes of tithi timing. Drik Panchang labels its default "Chitra Paksha" but it matches Lahiri [UNVERIFIED — check one date against both in the harness].
- General warning from the doc: ayanamsha is "measured on the ecliptic of the start date but applied to positions on the ecliptic of the end date", and "the same precession model should be used for ayanamsha as was used for the creation of the underlying tropical ephemeris".

**Kerykeion's LibEphemeris reference** (https://kerykeion.net/libephemeris/docs/reference/ayanamsha) [SECONDARY]: J2000 value 23.8571° (23°51'25.5") with rate 5027.8"/century; IAU 2006 general precession in longitude p(T) = 5028.796195″·T + 1.1054348″·T² + 0.00007964″·T³ (T = Julian centuries from J2000.0).

**Practical JS recipe (consistent, within ~1"):**

```js
// All inputs from astronomy-engine: lon_true = apparent/true-ecliptic-of-date longitude.
// Lahiri "true" ayanamsa = mean part + nutation in longitude (Δψ).
// Because astronomy-engine's SunPosition/EclipticGeoMoon already include Δψ,
// you can either (a) add Δψ to the mean ayanamsa, or (b) subtract Δψ from the
// tropical longitude and use the mean ayanamsa. Pick (a):
const T = (jdTT - 2451545.0) / 36525;                       // Julian centuries TT from J2000
const pArcsec = 5028.796195*T + 1.1054348*T*T + 0.00007964*T*T*T;  // IAU 2006 general precession in longitude
const AYAN_J2000_MEAN_ARCSEC = 23*3600 + 51*60 + 25.5 - DPSI_J2000; // 23°51'25.5" is a *true* value at J2000 per most tables; subtract Δψ(J2000)≈ -13.9" to get the mean part  [UNVERIFIED sign/magnitude — calibrate against swe_get_ayanamsa_ex in the harness]
const ayanMean = (AYAN_J2000_MEAN_ARCSEC + pArcsec) / 3600; // degrees
const ayanTrue = ayanMean + dpsi(jdTT) / 3600;              // add nutation in longitude (deg); dpsi from IAU 1980/2000B short series (≈ 10 terms, ±0.1")
const siderealLon = ((lon_true - ayanTrue) % 360 + 360) % 360;
```

Do **not** hand-tune constants: fit `AYAN_J2000_MEAN_ARCSEC` once so that your `ayanTrue(jd)` matches `swe_get_ayanamsa_ex_ut(jd, SE_SIDM_LAHIRI)` over 1900–2100 to < 0.5". Nutation amplitude is ±17" (Swiss doc §2.1.3), i.e. ±0.5 min of tithi time — small but systematic if you mix "mean" and "true" conventions, so be consistent.

**Value for 2026:** from the 1956 reference + 70.57 years × ≈50.29"/yr ≈ +59'09" → **≈ 24°14'10"**; from the J2000 table value + 26.79 × 50.29" ≈ **24°13'53"**. The ~17" spread is nutation/rounding. So "≈ 24°13'–24°14'" is right for 2026; Drik Panchang-style displays show 24°13'xx" for most of 2026 [SECONDARY: https://r-astro.com/blog/lahiri-ayanamsa, https://en.wikipedia.org/wiki/Ayan%C4%81%E1%B9%83%C5%9Ba]. Calibrate the exact arcseconds in the harness.

### 1.4 Tithi/nakshatra/yoga/karana from longitudes (the equations)

Let λ☉ and λ☾ be **sidereal** longitudes (tropical true-of-date minus true Lahiri ayanamsa). For tithi the ayanamsa cancels, so use the tropical difference directly.

- Elongation D = (λ☾ − λ☉) mod 360. **Tithi index** = ⌊D / 12⌋ + 1 (1–30; 1–15 Shukla, 16–30 Krishna; 15 = Purnima, 30 = Amavasya). End time = root of D = 12·k → `SearchMoonPhase(12*k, t0, 2)`.
- **Nakshatra** = ⌊λ☾_sid / 13°20'⌋ + 1 (1–27; each 13.3333°). End time = root of λ☾_sid = 13.3333·k; solve by bracketing + Brent/secant on `EclipticGeoMoon().lon − ayanTrue` (Moon moves monotonically; 2 iterations of secant from a linear guess converge to < 1 s). Pada = ⌊(λ mod 13.3333)/3.3333⌋ + 1.
- **Yoga** = ⌊((λ☉_sid + λ☾_sid) mod 360) / 13°20'⌋ + 1 (1–27). End time = root of the sum = 13.3333·k (sum advances ≈ 14.2°/day).
- **Karana**: half-tithi, 60 per lunar month. Karana index k = ⌊D / 6⌋ (0–59). Fixed: k=0 → Kimstughna; k=57,58,59 → Shakuni, Chatushpada, Naga. Movable (k=1..56): cycle Bava, Balava, Kaulava, Taitila, Gara, Vanija, Vishti(Bhadra) → name = movable[(k−1) mod 7].
- **Masa (amanta)**: a lunar month (new moon → new moon) takes the name of the solar sankranti (Sun's sidereal rashi ingress) that occurs within it; a month containing **no** sankranti is **Adhika** (name of the following month, prefixed Adhika); a month with two sankrantis causes a **Kshaya** month (rare, ~every 19–141 yrs). Purnimanta months (North India) run full moon → full moon; the Krishna paksha belongs to the *next* purnimanta month name. 2026 is expected to contain an adhika month (Adhika Jyeshtha, mid-May → mid-June 2026) [UNVERIFIED — confirm in harness; good golden-set window].
- **Samvatsara**: 60-name Jovian cycle; North Indian (Vikram, Chaitra Shukla 1) and South Indian (Shalivahana Shaka) conventions differ in both epoch and in some years the name (southern uses mean-Jupiter / "Telugu" list). Store both.
- **Ritu**: six seasons of two (amanta) months each starting Chaitra (Vasanta). **Ayana**: Uttarayana from Makara sankranti (sidereal, ≈ Jan 14/15) in the drik tradition; tropical winter solstice (Dec 21/22) is the astronomical alternative — expose as an informational note, not a switch.

Reference algorithms to crib from: bdsatish's `drik-panchanga` (`panchanga.py`, inverse-Lagrange interpolation to find end times), PyJHora `drik.py`, and Reingold–Dershowitz "Calendrical Calculations" chapter 20 (modern Hindu lunisolar: `hindu-lunar-from-fixed`, `hindu-lunar-new-year`, adhika detection) — see §2.

---

## 2. Open-source panchanga implementations (what to learn from, licences)

| Project | Lang | Licence | Implements | Notes |
|---|---|---|---|---|
| **drik-panchanga** (bdsatish; many forks e.g. webresh/) https://github.com/webresh/drik-panchanga | Python + pyswisseph | **AGPL-3.0-or-later** [VERIFIED] | Tithi, nakshatra, yoga, karana, vaara **with end times**; sunrise/sunset/moonrise/moonset; amanta month default; samvatsara. TODO list still has "Rahukaala, Yamaganda kaala" and festivals. | "accuracy generally good 5000 BCE–5000 CE". The canonical small reference (≈ 600 lines). Read it for structure; **re-derive, don't copy** (AGPL). |
| **PyJHora** (naturalstupid) https://github.com/naturalstupid/PyJHora | Python + pyswisseph | **AGPL-3.0** [VERIFIED] | Five limbs with end times; Rahu kaal, Yamaganda, Gulika; Choghadiya/Gauri panchanga; Abhijit, Durmuhurta, Brahma/Godhuli/Vijaya/Nishita muhurtas; amanta & purnimanta; adhika/nija masa booleans; samvatsara; ritu; 20 ayanamsa modes (**default changed to TRUE_PUSHYA in 4.6.0; tests assume LAHIRI**). | "Verified against the examples in PVR Narasimha Rao's book" and "closest to JHora"; ~6,800 tests. Most complete behavioural spec available. Shadbala known to mismatch JHora. |
| **VedAstro** https://github.com/VedAstro | C# | Python wrapper is MIT; core repo licence **not confirmed** [UNVERIFIED] | Planet positions, D1–D60, dasas, yogas, "muhurtha event" calculator, 47 ayanamsas | Huge event-rule XML corpus (useful for muhurta rule ideas). Check the LICENSE before reading code. |
| **mhah-panchang** https://www.jsdelivr.com/package/npm/mhah-panchang | JS (npm 1.2.0, 2024-01) | **MPL-2.0** [VERIFIED via npm] | Tithi, nakshatra, karana, yoga, rashi, ayanamsa, masa, ritu (values at an instant; **no sunrise-based day logic or end times**) | 568 KB unpacked. Useful as a cross-check, not as the engine. |
| **@fusionstrings/panchangam** https://jsr.io/@fusionstrings/panchangam | Rust→WASM | npm says MIT, **but it wraps Swiss Ephemeris (AGPL)** — licence conflict [VERIFIED npm field; conflict is my inference] | Panchangam via SE | Avoid shipping. |
| **kalagana** https://pypi.org/project/kalagana/ | Python stdlib only | MIT | Tithi, vara, nakshatra, yoga, karana, sunrise/sunset, muhurat, festivals | Pure-formula implementation; good for reading a dependency-free approach, accuracy unknown. |
| **jyotishganit** https://github.com/northtara/jyotishganit | Python + Skyfield DE421 | MIT | Five-limb panchanga | Modern, JPL-backed. |
| **jyotipy** https://pypi.org/project/jyotipy/ | Python | MIT | Panchanga, dashas, transits, Ashtakavarga, Shadbala | "Permissive alternative to pyswisseph". |
| **kerykeion** https://pypi.org/project/kerykeion/ | Python | AGPL-3.0 | Western charts + sidereal modes; good ayanamsha docs | Not panchanga. |
| **jyotish (PHP)** / **AstroKit** | — | — | Not found in this session's searches | [UNVERIFIED] |
| **Calendrical Calculations** (Reingold & Dershowitz) https://reingold.co/cc2-paper.pdf , https://www.reingold.co/hindu-paper.pdf | Lisp (CALENDRICA 4.0) | Book text: personal-use licence; **CALENDRICA 4.0 Lisp code: Apache-2.0** [SECONDARY via Lua port] | Old Hindu (Surya Siddhanta mean motions) and modern Hindu lunisolar: month naming, adhika/kshaya detection, new year, Hindu sunrise (their own simplified model), festivals | The authoritative *calendar-structure* reference; its astronomy is deliberately simplified, so use its month/adhika logic with *your* longitudes. Burkardt's test dates file is handy: https://people.math.sc.edu/Burkardt/datasets/dates/dates.html |
| **ICU** | C/Java | Unicode | `IndianCalendar` = Saka civil (solar) calendar only; **no Hindu lunisolar calendar** in ICU [UNVERIFIED but long-standing] | `Intl.DateTimeFormat(..., {calendar:'indian'})` gives Saka dates in browsers — useful for the Rashtriya Panchang civil date, not for tithi. |

Commercial references worth reading for conventions (not code): Drik Panchang tutorials (https://www.drikpanchang.com/tutorials/muhurat/daily/choghadiya-muhurat.html), DekhoPanchang "methodology"/"accuracy" pages (https://dekhopanchang.com/en/learn/modules/22-4, https://dekhopanchang.com/bn/accuracy), ShubhPanchang methodology (https://shubhpanchang.com/en/methodology).

### 2.5 Sunrise convention — why Drik Panchang differs from others

[VERIFIED from https://www.drikpanchang.com/panchang/sunrise/panchang-sunrise.html]:
- "Drik Panchang uses upper edge of sun along with refraction to mark the time of sunrise" — this is its **default**, labelled "currently used and suggested by Drik Panchang", and "Most newspapers publish astronomical value of sunrise which consider upper edge of the Sun".
- It offers a setting "to change sunrise time between 'Upper Edge' and 'Middle Limb'" and an elevation toggle ("by default we don't consider elevation").
- Example shown (Ottawa, 2026-10-15): Edge 7:19 / Middle limb 7:21 / Edge+elevation 7:17 / Middle+elevation 7:19 → differences of 1–2 min at mid-latitudes; "could be up to few minutes".
- Drik's FAQ (https://www.drikpanchang.com/faq/faq-ans2.html) describes the *traditional* "Hindu sunrise" as disc centre **without** refraction, with ~16' semi-diameter and ~34' refraction being the two corrections astronomers add. [SECONDARY summary]

So: **Upper-limb + refraction** = centre altitude −50' (−0.833°) — this is `SearchRiseSet`. **Middle limb (Hindu)** = centre altitude 0° without refraction — `SearchAltitude(body, obs, dir, t, 1, 0)`. Centre-with-refraction (some software) = −34'. The three differ by ≈ 1.3–2.5 min in India (more at high latitudes) and that, plus ayanamsa choice (Lahiri vs True Chitra ≈ 2 min) and ΔT/ephemeris differences (< 0.5 min), explains nearly all disagreements between panchang apps. Day-boundary effects: a tithi ending 1 min before vs after sunrise changes the *date's* tithi label — so always display the convention in Settings → About.

### 2.6 Rahu kaal, Yamaganda, Gulika (eight equal daytime parts from sunrise to sunset)

[VERIFIED table from https://hindutone.com/astrology/rahu-kalam-yamagandam-gulika-kalam-explained/ ; Rahu row cross-checked with https://dekhopanchang.com/en/rahu-kaal and https://astromedha.in/insights/muhurat/rahu-kaal]

| Weekday | Rahu kaal | Yamaganda | Gulika |
|---|---|---|---|
| Sun | 8 | 5 | 7 |
| Mon | 2 | 4 | 6 |
| Tue | 7 | 3 | 5 |
| Wed | 5 | 2 | 4 |
| Thu | 6 | 1 | 3 |
| Fri | 4 | 7 | 2 |
| Sat | 3 | 6 | 1 |

Note: the brief said "Sat 1st" for Rahu kaal; every source read gives **Saturday = 3rd segment** for Rahu (1st is Gulika). One DekhoPanchang Telugu page says "6th" for Saturday Rahu — treat as a site error. Night Rahu kaal (eight parts of night) exists in South-Indian practice; the night table is a different permutation [UNVERIFIED — PyJHora implements it; use it as the spec].

### 2.7 Choghadiya (eight parts of day and eight of night)

[VERIFIED from Drik's tutorial]: the lords cycle in the order **Sun → Venus → Mercury → Moon → Saturn → Jupiter → Mars** (same as hora order), mapping to **Udveg, Char, Labh, Amrit, Kaal, Shubh, Rog**. First **day** choghadiya = weekday lord: Sun Udveg, Mon Amrit, Tue Rog, Wed Labh, Thu Shubh, Fri Char, Sat Kaal. First **night** choghadiya (from Drik's night table): Sun Shubh, Mon Char, Tue Kaal, Wed Udveg, Thu Amrit, Fri Rog, Sat Labh (equivalently: night starts with the lord of the 5th weekday after today). Each = (sunset − sunrise)/8 or (next sunrise − sunset)/8. The 8th slot repeats the 1st lord.

### 2.8 Hora

24 unequal hours: 12 of day (sunrise→sunset)/12 and 12 of night. First hora = weekday lord; then the same Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars cycle (Chaldean order read every 24th step). [VERIFIED https://dekhopanchang.com/hora, https://performance.shubhpanchang.com/hora]

### 2.9 Abhijit muhurta

Daytime split into **15 muhurtas** of (sunset − sunrise)/15; **Abhijit = the 8th**, i.e. centred on local apparent noon (midpoint of sunrise and sunset), lasting ≈ 48 min at the equinox. Tradition: not used on Wednesdays (PyJHora follows this). The 30-muhurta day (15 day + 15 night) also gives Brahma muhurta = the 29th (second-last night muhurta, ≈ 96→48 min before sunrise).

---

## 3. Validation

### 3.1 Drik Panchang
- **No public API or developer programme** found. Site pages carry "all images and data are copyrighted by www.drikpanchang.com"; the app T&C forbid copying/derivatives (https://www.drikpanchang.com/contactus/privacy-policy/app/dp-apps-terms-and-conditions.html, https://www.drikpanchang.com/apps/apps.html). A `/terms-of-use.html` URL 404s. [VERIFIED]
- Pages are server-rendered HTML with stable query params (`?geoname-id=…&date=dd/mm/yyyy`) so they are *technically* scrapeable, but doing so for a competing commercial product is a copyright/ToS risk. **Recommendation:** hand-enter a small golden sample (5 cities × 6 dates, both sunrise conventions) into a JSON fixture with a `source: "drikpanchang manual 2026-10-xx"` field — that is ordinary verification, not data extraction.

### 3.2 APIs
- **Prokerala** (https://api.prokerala.com/pricing) [VERIFIED]: Free **5,000 credits/month, 5 req/min, no card**; Ruby $19/mo 100k credits (60 rpm); Emerald $49/mo 350k; Sapphire $99/mo 1M; +100k credits for $49. Panchang credits-per-call not published on the pricing page — read `/docs` or make one call and read the `X-Credits` headers. Good machine oracle for a nightly CI job (≈ 30 calls/day fits the free tier if a panchang call ≤ 5 credits).
- **AstrologyAPI / VedicRishi** (https://astrologyapi.com/pricing) [VERIFIED]: Indian Astrology suite "Kundli, panchang, muhurta & matchmaking APIs" from **₹1,500/month**; 150 free sandbox credits, no card.
- **FreeAstrologyAPI.com** (https://freeastrologyapi.com/) [VERIFIED]: "Free Forever Plan", 21 panchang endpoints (sunrise/sunset, tithi, nakshatra durations, yoga durations…), `ayanamsha: "lahiri"` param; per-day limits not on the landing page.
- (RoxyAPI buyer guides at https://roxyapi.com/blogs/... are competitor marketing; ignore for facts.)

### 3.3 Rashtriya Panchang (Government of India, Positional Astronomy Centre, Kolkata)
- Published "since 1879 Saka Era (1957-58 A.D.)", "the standardized Panchang for the country", in Hindi, English + 12 languages. Contents: sunrise/sunset/moonrise/moonset "for 4 metropolitan cities", tithis/nakshatras/yogas, Sun/Moon/planet transits into **nirayana** rashis and nakshatras, nirayana longitudes, Kali Ahargana, festivals. [VERIFIED https://mausam.imd.gov.in/imd_latest/contents/rashtriy_panchang.php]
- Downloads: that IMD page links **ZIP archives** (PDF inside, presumably) for 2017-18…2019-20 per language, e.g. `http://www.packolkata.gov.in/download/HindiRP1920.zip`. The 2026-27 (Saka 1948) editions are listed on https://packolkata.imd.gov.in/rashtriya-panchang-others.php; both packolkata domains currently fail TLS chain validation from here ("unable to verify the first certificate") — open them in a browser. Printed price listed as Rs. 225 on a cached page. [VERIFIED/SECONDARY]
- It uses the Calendar Reform Committee's Chitrapaksha (Lahiri) ayanamsa by definition and IST (82°30'E) for timings [UNVERIFIED from the page itself; it is the historical basis of the Lahiri ayanamsa].
- Use: ground truth for **nirayana longitudes** (direct check of your ayanamsa) and 4-metro rise/set times, a handful per month.

### 3.4 Swiss Ephemeris as the oracle (recommended)
`npm i -D sweph-wasm` or `@swisseph/browser` in a `tools/oracle/` folder that is never bundled. AGPL obligations attach to *distribution* and *network service*; an internal test harness triggers neither. Generate `golden/*.json` with `swe_calc_ut` (SEFLG_SWIEPH|SEFLG_SIDEREAL after `swe_set_sid_mode(SE_SIDM_LAHIRI)`), `swe_rise_trans` with `SE_CALC_RISE` (default = upper limb with refraction; add `SE_BIT_DISC_CENTER|SE_BIT_NO_REFRACTION` for the Hindu variant), and `swe_get_ayanamsa_ex_ut`. Commit the JSON, not the oracle output of every run.

### 3.5 Proposed golden test set (5 cities × 30 days)
- **Cities**: New Delhi (28.61N 77.21E), Mumbai (19.08N 72.88E), Chennai (13.08N 80.27E), Kolkata (22.57N 88.36E), **Toronto** (43.65N −79.38W; DST, western longitude, late sunrise → tests day-boundary logic and tz handling). Optional 6th: Guwahati (early sunrise, IST skew) or Dubai (diaspora, +04).
- **Dates**: 2026-05-10 → 2026-06-08 (should straddle the expected Adhika Jyeshtha start and an amavasya; verify), plus a second 30-day block 2026-12-15 → 2027-01-13 (Makara sankranti, Toronto DST-off, year rollover). 60 days × 5 cities = 300 day-records.
- **Fields per record**: sunrise/sunset (edge+refraction, centre-no-refraction), moonrise/moonset, tithi at sunrise + end time (+ next tithi if two), nakshatra + end, yoga + end, karana 1 & 2, vara, Rahu/Yama/Gulika windows, Abhijit, 16 choghadiya, amanta & purnimanta month, paksha, adhika flag, samvatsara (N & S), ritu, ayana, ayanamsa value.
- **Tolerances**: vs Swiss oracle — rise/set ±20 s, end times ±60 s, longitudes ±30"; vs Prokerala — end times ±2 min; vs hand-entered Drik — rise/set ±1 min (same convention), end times ±3 min; vs Rashtriya Panchang — nirayana longitudes ±1'.
- Run as `vitest` in CI (GitHub Actions free) on every engine change; fail on any tolerance breach; print a histogram.

---

## 4. Geocoding & timezones, offline-first

- **Bundled city list**: GeoNames `cities15000.txt` ≈ 20–24k rows, ≈ 1.2 MB zip / 3.3 MB raw (older figures) [SECONDARY], licence **CC BY 4.0** (attribution in About screen). Columns include `latitude, longitude, timezone, population, alternatenames`. Filter to India (country IN, ~ 1,000+ rows at 15k pop), Nepal/Sri Lanka/Bangladesh/Mauritius/Fiji/Gulf + top diaspora cities (CA/US/UK/AU/SG/MY/ZA/NZ, pop > 100k) → ≈ 3–4k rows; store `[name, lat*1e4, lon*1e4, tzIndex, pop]` as a compact JSON → ≈ 150–250 KB raw, ≈ 50–80 KB gzipped [UNVERIFIED estimate; measure]. Add Hindi/Tamil/… names from `alternatenames` for ~200 big Indian cities only. Source: http://download.geonames.org/export/dump/ (readme documents the format).
- **Open-Meteo geocoding** (https://github.com/open-meteo/geocoding-api): no key, but **"free for open-source developer and non-commercial use"**, data CC BY-NC 4.0, > 10k req/day must contact them; commercial use requires a paid key. **Not suitable for a paid app.** [VERIFIED]
- **Nominatim** (https://operations.osmfoundation.org/policies/nominatim/): public instance "mainly there to power the search bar on openstreetmap.org", "very limited capacity"; periodic app requests = bulk geocoding, "strongly discouraged"; must cache, identify the app, attribute, ≈ 1 req/s [VERIFIED policy + SECONDARY rate]. OK as a *rare* fallback for a city not in your bundle; never for every search keystroke.
- **Timezone from lat/lon in browser**: `@photostructure/tz-lookup` 11.7.0, **CC0**, 88 KB unpacked (≈ 72 KB JS), works in browsers; "~10% of inhabited points differ from geo-tz" (border fuzz) [VERIFIED npm + README]. `geo-tz` 8.1.10 MIT is **74.5 MB** (Node only). Since GeoNames rows already carry an IANA `timezone`, you only need tz-lookup for GPS/"use my location" and map-pin inputs. Border risk for India is low (one zone) except near Nepal (+05:45), Bangladesh (+06), Pakistan (+05).
- **Intl & DST**: `Intl.DateTimeFormat(locale, {timeZone, …}).formatToParts()` and `Temporal` (Chrome shipped Temporal in 2025–26 behind/without flag — [UNVERIFIED current status]; polyfill `temporal-polyfill` ≈ 30 KB gz if needed) give correct offsets for any IANA zone incl. DST, using the browser's bundled ICU tzdata. Compute panchang in UTC, convert only for display and for "local civil day" boundaries.
- **Historical offsets for birth data (tz database `Asia/Kolkata`)**: LMT +05:53:28 → HMT +05:53:20 (Calcutta) → +06:30 "war time" 1941-10-01→1942-05-15 → +05:30 → +06:30 1942-09-01→1945-10-15 → **+05:30 since 1945-10-15** [SECONDARY: timeanddate + tz list; exact instants in the tz `asia` file]. tzdb deliberately models one zone for all of India (pre-1970 regional times — Bombay time until 1955, Calcutta time until 1948 — are **not** represented). For pre-1946 Indian births, offer an explicit "time standard" override (IST / Bombay +04:51 / Calcutta +05:53:20 / war time +06:30) — this is what JHora does. Browser `Intl` is generally reliable for post-1900 transitions but a few engines historically clamped pre-1970 data; test 1942 dates in Chrome Android.

---

## 5. PWA → Google Play (TWA)

- **Bubblewrap**: latest **v1.27.0** (Oct 9; bumps android-browser-helper to **2.7.4**, Node engine 18+); **"Bump targetSdkVersion to 36"** landed in v1.25.0 (Jul 31). Play Billing dependency `com.google.androidbrowserhelper:billing:1.1.0` (v1.23.0). [VERIFIED https://github.com/GoogleChromeLabs/bubblewrap/releases] Run `bubblewrap update` on an existing project. Default minSdk in the template is 19 [UNVERIFIED]; set `minSdkVersion 24` (Play's automatic integrity protection targets Android 6+/API 23+ [UNVERIFIED]; Chrome TWA needs Chrome 72+ anyway). Build with JDK 17 + Android SDK cmdline-tools on Windows; Bubblewrap can download both.
- **Play target-SDK deadline**: new apps and updates must target **API 36 (Android 16) from 2026-08-31**, extension to 2026-11-01 on request [SECONDARY: https://www.appsonair.com/blogs/android-16-api-level-36-target-sdk-requirement-what-you-need-to-do-before-august-31 ; PWABuilder issue https://github.com/pwa-builder/pwabuilder/issues/6160]. You are already compliant with Bubblewrap ≥ 1.25.
- **Digital Asset Links**: `https://<domain>/.well-known/assetlinks.json` listing the **Play App Signing** SHA-256 (not just your upload key) or the TWA shows the Chrome URL bar. Serve from Cloudflare Pages with `content-type: application/json`.
- **Payments policy** (https://support.google.com/googleplay/android-developer/answer/9858738) [VERIFIED quotes]: apps charging for in-app features/content "must use Google Play's billing system for those transactions unless Section 3, 8, or 9 applies"; subscriptions and consumable "Items" are explicitly covered. §3 exemptions are physical goods, physical services, bill remittances, P2P, auctions, donations, gambling — **there is no "consumed outside the app" exemption**. §4: "apps may not lead users to a payment method other than Google Play's billing system" including "In-app webviews, buttons, links, messaging, advertisements, or other calls to action". **So a web paywall opened inside the TWA is a violation.** Allowed pattern: the Play build either (a) sells via Play Billing, or (b) sells nothing and merely honours entitlements bought on the web, *without linking to the purchase page*.
- **Play Billing inside a TWA**: Chrome 101+ supports Payment Request + **Digital Goods API** (https://developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing); must feature-detect and fall back; Google required DGA apps to move to Play Billing Library 7 (ABH billing 1.1.0 does) [VERIFIED/SECONDARY]. Server-side: verify purchases with the Play Developer API from a Worker (service account JWT) and subscribe to RTDN (Pub/Sub → HTTPS push to a Worker).
- **India alternative billing** (https://support.google.com/googleplay/android-developer/answer/13306652) [VERIFIED]: available to apps *and* games for mobile/tablet users in India, **only alongside Play billing**, service fee **standard − 4%**; must certify **PCI DSS**, report transactions via API within 24 h, give users a fraud-report path. Not worth it for a solo app at 15% → 11%.
- **Fees**: 15% on the first $1M/yr (small-business tier) and 15% on subscriptions remain for India/"Rest of World" until **2027-09-30**; US/UK/EEA move to 10% + 5% billing fee from 2026-06-30 [SECONDARY: https://ecorpit.com/google-play-service-fee-split-2026-app-economics/ , https://pricepush.app/blog/google-play-subscription-fees-2026-real-math ; confirm in Play Console]. **Canada is a supported developer *and* merchant country (CAD)** (https://support.google.com/googleplay/android-developer/answer/9306917) [VERIFIED]. Play Billing in India supports **UPI** (since 2019) and **UPI Autopay** for subscriptions [VERIFIED news]; Paytm UPI handles stopped 2025-08-31. RBI rule effect: subscriptions ≥ ₹5,000 are sold as non-renewing in India [SECONDARY RevenueCat]. **INR minimum price: not confirmed this session** (historically ₹10, lowered for emerging markets; check the Play Console price table) [UNVERIFIED].
- **Astrology / "fortune-telling" policy**: no Play policy singles out astrology; relevant rules are **Misleading Claims** (don't claim functionality the app can't perform; correct category) and **Metadata** — the 2020 Co-Star removal was a metadata enforcement, reinstated within hours [VERIFIED search summary; policy pages https://support.google.com/googleplay/android-developer/answer/9887877 , https://support.google.com/googleplay/android-developer/answer/9898842]. Practical guardrails: category Lifestyle, no health/financial *outcome* promises ("guaranteed success", "cures"), label content as traditional/cultural guidance, make the LLM text avoid predictions (see §7). Also complete the Data Safety form (birth date/time + location = personal data).

---

## 6. Payment rails for a Canadian corporation selling to Indian consumers

### 6.1 Direct gateways
- **Razorpay — "Accept international payments from Indian customers" (Import Flow)** (https://razorpay.com/docs/payments/international-payments/accept-international-payments-from-indian-customers.md) [VERIFIED]: for "international businesses without an Indian entity"; Indian customers pay by **UPI, netbanking, cards (Visa/MC/RuPay/Amex…)**; also lists UPI Autopay, card recurring, eMandate; settlement to your **overseas bank in local currency (CAD listed)**, SWIFT account mandatory; max **USD 30k per transaction**; pricing "case by case" (expect ~3%+ plus FX) [UNVERIFIED fee]; onboarding needs KYC, activation request, **purpose code**, board resolution naming Razorpay, POA, "collecting customer PAN details is required", invoices per transaction; Chargebee notes it is on-request/private-beta. Razorpay is RBI-authorised as PA-CB (cross-border) [VERIFIED blog]. Legally viable, operationally heavy (PAN collection kills conversion for a ₹99 product; you remain the GST/OIDAR taxpayer).
- **Stripe India**: still **invite-only** for Indian entities (https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india) [VERIFIED]; irrelevant for a Canadian Stripe account, which can take Indian *cards* in INR-less (CAD/USD) pricing but **no UPI** (Stripe's UPI exists only for India-domiciled accounts / Link) [UNVERIFIED]. As of 2026 Stripe also sells "Managed Payments" (MoR) for Checkout/Payment Links [SECONDARY]; UPI coverage unknown.
- **PayU, Cashfree, Instamojo**: Indian PA licences generally require an Indian entity/bank account; Cashfree/PayU have cross-border products for *Indian* exporters, not inbound for foreign sellers [UNVERIFIED — not researched in depth this session; low priority given the MoR options].

### 6.2 Merchant-of-record options (they become the seller: handle 18% GST/OIDAR, RBI mandates, refunds)
- **Paddle** (https://developer.paddle.com/concepts/payment-methods/upi , changelog https://developer.paddle.com/changelog/2026/upi-autopay) [VERIFIED]: **UPI for one-time and subscriptions, INR, UPI Autopay (June 2026)**, max **₹15,000 per renewal** (RBI AFA limit); "UPI International" (USD pricing) needs Paddle approval. Fee 5% + $0.50 (+3% non-domestic currency) [SECONDARY]. Onboarding/eligibility is strict and slow; SaaS/digital-content friendly; astrology may trigger extra review [UNVERIFIED]. Payout to a Canadian bank in CAD/USD.
- **Lemon Squeezy** (https://docs.lemonsqueezy.com/help/checkout/payment-methods): cards, PayPal, Apple/Google Pay, Alipay, WeChat, Cash App, bank debits — **no UPI** [VERIFIED]. 5% + 50¢. Now Stripe-owned [SECONDARY]. Indian buyers pay by card only → poor fit.
- **Gumroad**: MoR since 2025-01-01 (handles VAT/GST), fee **10% + $0.50** (30% via Discover); help centre reportedly lists "local methods such as UPI in India" [SECONDARY, competitor page — verify at gumroad.com/help]. Fastest to set up; weakest for subscriptions UX.
- **FastSpring** supports UPI [SECONDARY]; enterprise-leaning. **Dodo Payments** (Indian-founded MoR) advertises UPI [vendor claim].
- **Google Play Billing** (Play build only): UPI + UPI Autopay native, 15% fee, CAD payouts; Google is the seller of record for tax in India for non-Indian developers — Google "is responsible for determining, charging, and remitting" GST on Play purchases by Indian customers [UNVERIFIED — confirm in Play Console tax help].

### 6.3 Regulatory facts
- **RBI recurring payments**: one-time e-mandate registration with AFA; subsequent debits without AFA up to **₹15,000** (₹1 lakh for mutual funds, insurance, credit-card bills; raised Dec 2023); pre-debit notification ≥ 24 h, opt-out, mandate validity period; consolidated as "Digital Payments – E-Mandate Framework, 2026" [SECONDARY news: https://www.businesstoday.in/amp/personal-finance/banking/story/now-control-your-auto-debit-payments-rbis-new-rules-explained-526860-2026-04-22 , https://business-standard.com/finance/news/automatic-payment-limit-through-upi-raised-to-rs-1-lakh-says-rbi-123121201097_1.html]. Keep plans ≤ ₹15,000/yr → no issue.
- **GST on OIDAR** (foreign supplier → Indian consumer): **18% IGST**, **no turnover threshold**, B2C exemption removed from **2023-10-01** (Finance Act 2023 also deleted "essentially automated" from the definition); registration via simplified **Form GST REG-10**, monthly **GSTR-5A** (even nil), Indian authorised representative required, no ITC [VERIFIED/SECONDARY: https://india-briefing.com/news/tax-digital-services-oidar-in-india-gst-applicability-and-compliance-22465.html , https://www.bdo.in/getmedia/8436a53c-befa-474b-8fd0-313b92d43a46/Online-Information-Database-Access-And-Retrieval-(OIDAR)_BDO-India-2024.pdf , https://cleartax.in/s/gst-registration-oidar-online-gaming]. Advisory firms report enforcement rising via payment-gateway data sharing [SECONDARY]. **A MoR removes this entirely** — that is the decisive argument.
- Canada side: GST/HST does not apply to exports of digital services to non-residents; keep evidence of customer location (MoR reports suffice) [UNVERIFIED — accountant].

### 6.4 Lowest-friction legal path (recommendation)
1. **Web (PWA) sales → Paddle** (UPI + Autopay + MoR). Apply early (2–4 weeks). If rejected/slow → **Gumroad** for one-time "annual pass" products (10%, UPI reported) while re-applying.
2. **Play build → Play Billing** via Digital Goods API (mandatory anyway). Same SKUs, same entitlement table.
3. **Entitlements**: single identity (email magic link or Google Sign-In) → D1 table `(user_id, sku, source: paddle|play|gumroad, expires_at)`; Worker webhooks for Paddle + Play RTDN; the PWA checks a signed entitlement JWT offline (cache 7 days). Price parity rule: show the same INR price in both.
4. **Avoid** Razorpay Import unless you later form an Indian subsidiary; avoid self-registering for OIDAR GST at this scale.

---

## 7. LLM "why this date" explanations

- **Pricing (claude-api skill table, cached 2026-10-06)**: **Haiku 5.5 `claude-haiku-5-5` $0.10 in / $0.50 out per MTok** (≤100K-token prompts); **Sonnet 5.5 `claude-sonnet-5-5` $2 / $10**, cache reads $0.20/MTok. Cache-read price for Haiku 5.5 not in the table (assume 10% of input = $0.01/MTok) [UNVERIFIED]. Founder constraint "Sonnet/Haiku only" is satisfied; use **Haiku 5.5** for this task — it is pure verbalisation.
- **Token shape**: system prompt + glossary + style rules ≈ 700 tokens (cacheable; note the minimum cacheable prefix is model-dependent, 512–4096 tokens — may need padding or just accept no cache on Haiku), engine JSON for one date/event ≈ 250–400 tokens, output 120–180 tokens (2–3 sentences in Hindi/English). Per call ≈ 1,100 in + 150 out → **≈ $0.00019 on Haiku** (≈ $0.0037 on Sonnet).
- **Per 1,000 users**: at 1 explanation/user/day → 30k calls/month ≈ **$5.6 on Haiku** uncached; with a response cache keyed by `(date, event_type, region_bucket, lang, engine_version, rules_version)` — most users in a region ask about the same few dates — expect ≥ 60% hits → **≈ $2/month**. Sonnet would be ≈ $110 → $45. Cloudflare Workers free tier (100k req/day) and KV (100k reads/day, 1k writes/day free — writes are the tighter limit; use D1 for the cache table instead, 100k rows writes/day free) hold at this scale [UNVERIFIED current CF free limits — check dash].
- **Pattern**: `POST /explain` on a Worker → verify entitlement JWT (or Turnstile for anonymous, 3/day cap per device hash) → look up cache in D1 → on miss call Anthropic Messages API with **structured output** (`output_config.format` JSON schema: `{sentences: [{text, fact_ids: [..]}], disclaimer}`) → validate every `fact_id` exists in the engine JSON you sent → store → return. Timeout 10 s; on failure return a template sentence built from the same facts (deterministic fallback — the app must never depend on the LLM).
- **Risk rules** (put in the system prompt *and* enforce in code): the model "never computes astronomy or astrology; every statement must cite a provided fact id"; no dates, times, degrees or names that are not in the JSON; no outcome predictions ("will succeed", "will marry"), no health/finance advice; neutral register ("traditionally considered favourable because…"); language = user's; max 60 words; include the fixed disclaimer. Reject/regenerate once if validation fails, then fall back. Log prompts hashed, not raw birth data (privacy; Play Data Safety).
- Model drift: pin `claude-haiku-5-5`; bump `rules_version` to invalidate cache when prompts change.

---

## 8. Notifications & offline

- **Web Push on Android**: TWAs run in Chrome, so standard Web Push (VAPID) works; android-browser-helper's `DelegationService` provides **notification delegation** so notifications appear under the app's own name/icon (Bubblewrap `enableNotifications: true`) [VERIFIED README mention of DelegationService; behaviour SECONDARY from Chrome docs https://developer.chrome.com/docs/android/trusted-web-activity]. Android 13+ shows the runtime notification permission prompt; ask after value is shown (first saved date).
- **iOS**: Web Push only for **Home Screen web apps on iOS/iPadOS 16.4+**, permission request must follow a user tap (https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados) [VERIFIED]. EU-specific iOS 17.4 PWA limitations reported [SECONDARY]. Treat iOS push as best-effort.
- **Scheduled local notifications**: the **Notification Triggers API never shipped** — Chrome docs: origin trial complete, "launch not started" (https://developer.chrome.com/docs/web-platform/notification-triggers) [VERIFIED]. So "remind me at 6:40 am before Rahu kaal" must be **server-sent**: Workers **Cron Trigger** every 5–15 min → query D1 for due reminders (store user tz + local time → compute UTC) → send Web Push. Pure-JS VAPID signing works in Workers via WebCrypto (e.g. `@block65/webcrypto-web-push`) [UNVERIFIED package choice]. Free plan allows cron triggers (limit per account ~5 crons) [UNVERIFIED].
- **Periodic Background Sync**: Chrome/Edge 80+ Android only, requires installed PWA, browser decides timing by engagement (≥ 12 h typical) (https://developer.chrome.com/docs/capabilities/periodic-background-sync) [VERIFIED/SECONDARY]. Use it only to prefetch tomorrow's LLM blurb/festival list; never for alerts.
- **Offline data**: the ephemeris is *code* (astronomy-engine, no data files) so panchang works fully offline after first load. Service worker (Workbox) precaches the shell; **IndexedDB** (via `idb`, ~1 KB) for profile, saved dates, cached explanations, city subset (or ship as a static JSON precached by SW). Call `navigator.storage.persist()` after install to avoid eviction. App shell + engine + city list ≈ 250–350 KB gz total — inside the "< 300 KB engine" budget for the engine itself (46 KB).

---

## 9. i18n (Devanagari, Tamil, Telugu, Bengali, Gujarati, Kannada)

- **Fonts**: Android ships **Noto Sans** for every Indic script as system fallback ("Noto has been the default for languages not covered by Roboto"; Devanagari ships Regular + Bold) [VERIFIED Android noto-fonts README https://android.googlesource.com/platform/external/noto-fonts/+/4b3eb17/README]. iOS ships Devanagari/Tamil/Telugu/Bengali/Gujarati/Kannada "Sangam MN" families. So: **don't ship Indic webfonts for mobile**; use `font-family: system-ui, "Noto Sans <Script>", "Noto Sans", sans-serif;` and set `lang="hi"/"ta"/…` on `<html>` so Chrome picks the right shaping. For Windows desktop Chrome (Nirmala UI present, OK) and Linux (often missing), lazily load Google Fonts subsets only when `document.fonts.check()` fails. Full Noto Sans Devanagari is heavy (the FreeBSD package archive is ~37 MB with all weights) — only ever load script-subset woff2 (~60–150 KB each) [UNVERIFIED sizes; check Google Fonts CSS response].
- **Rendering gotchas**: Chrome on Android handles conjuncts/matras correctly with Noto; avoid `letter-spacing` and `text-transform` on Indic text; use `font-synthesis: none` to avoid faux-bold distortions; test Tamil long words with `overflow-wrap: anywhere`.
- **Numbers**: `Intl.NumberFormat('hi-IN')` → Latin digits with lakh/crore grouping ("1,00,000"); `'hi-IN-u-nu-deva'` → Devanagari digits ("१,००,०००"); similarly `-u-nu-tamldec`, `-u-nu-telu`, `-u-nu-beng`, `-u-nu-gujr`, `-u-nu-knda`. Most Indian apps (and Drik) keep **Latin digits for times** and use native digits only decoratively — make it a setting, default Latin.
- **Times**: `Intl.DateTimeFormat('hi-IN', {hour:'numeric', minute:'2-digit', hour12:true, timeZone})` gives "6:12 am"-style with locale day periods; for panchang tables prefer 24-h or "06:12 AM" fixed format to match printed panchangs. Dates in the Saka civil calendar: `{calendar:'indian'}`.
- **Hindi UI copy patterns**: respectful plural imperative ("चुनें", "देखें"), Hinglish for tech nouns ("लॉगिन", "सेटिंग्स"), avoid Sanskritised neologisms in UI chrome but keep Sanskrit terms for panchang nouns; action buttons short (≤ 12 chars). Use `lang` + `translate="no"` on proper nouns (tithi names) so Chrome's auto-translate doesn't mangle them.
- **Terminology is not transliteration**: Tamil and Telugu use regional names (Tamil tithi "Prathamai", nakshatra "Poosam" for Pushya, "Thiruvonam" for Shravana; Telugu "Padyami" for Pratipada), Bengali/Odia use local spellings, Gujarati/Marathi/Kannada mostly Sanskrit-derived. Build a **27+30+27+11+12+60 term table per language** by hand from authoritative sources: the **Rashtriya Panchang language editions** (free ZIP/PDF per language, §3.3) are the government-standard vocabulary; Drik Panchang's 9-language app is a de-facto reference. No open JSON translation set was found this session (PyJHora has multi-language resource files but is AGPL — read, don't copy) [VERIFIED search]. Keep terms in ICU MessageFormat JSON per locale; no RTL needed (Urdu would be the only RTL — out of scope).

---

## 10. Open items / things I could not verify

1. astronomy-engine Moon error distribution (needs the §3.4 harness) — the single most important week-1 task.
2. Exact Lahiri ayanamsa arcseconds for 2026 and whether Drik's "Chitra Paksha" = SE Lahiri or True Citra.
3. Prokerala credits per panchang call; FreeAstrologyAPI daily limits.
4. Rashtriya Panchang 2026-27 download URLs (TLS error on packolkata domains from this machine).
5. Bubblewrap template default minSdk; Play "automatic integrity protection" minimum API.
6. Play INR minimum price for in-app products/subscriptions.
7. Whether Google Play acts as seller of record for GST on Indian purchases from a Canadian developer account.
8. Gumroad UPI support (only a competitor page quotes Gumroad's help centre); Paddle's stance on astrology products.
9. Cloudflare free-tier numbers for Cron Triggers / KV writes / D1 writes (dashboard check).
10. Haiku 5.5 cache-read price; whether a ~700-token system prompt meets Haiku's minimum cacheable prefix.
11. Calendrical Calculations: confirm the Apache-2.0 CALENDRICA 4.0 code covers the modern Hindu lunisolar functions you need.
12. Temporal availability in Chrome Android stable (affects whether to ship a polyfill).
