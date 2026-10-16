# ShubhDate night build — CHECKPOINT

Updated: 2026-10-16 ~04:25 Toronto (run 1, Claude Fable 5.1)

## Done (committed + pushed to https://github.com/SakredStudio/subhdate)
- Step 0 scaffold: Vite 8 + TS 5.9 + vitest 5; astronomy-engine 2.1.19 runtime; @swisseph/node 1.4.0 dev-only oracle (prebuilt win32 binary, bundled ephemeris). Engine MIT, app proprietary. Business docs gitignored.
- Step 1 L0 astro (`engine/astro.ts`, `nutation.ts`, `time.ts`): Lahiri ayanamsa = fitted mean cubic + IAU-1980 nutation, matches SE to 0.02" over 1900–2100; Sun/Moon/planet true-of-date longitudes; rise/set limb + centre; topocentric moonrise (parallax); generic hourly-bracket + bisection root finder; Intl tz helpers.
- Step 2 L1 panchanga (`engine/panchanga.ts`, `names.ts`): tithi/nakshatra/yoga/karana spans with start/end, vara, amanta + purnimanta masa, adhika (Adhika Jyeshtha 2026 detected), samvatsara (Vikram, Gujarati Kartikadi, Shaka, Jovian names), ritu, ayana, rashis. 12 unit tests.
- Step 3 golden gate: `npm run golden` (6 cities × 60 days from SE), `npm run histogram`, `npm run validate`.

## Verified
- Oracle: **7160/7160 checks = 100%** (rise/set ±20 s both conventions, ayanamsa ±1", longitudes ±30", tithi/nakshatra/yoga names + ends ±60 s, karana, rashis).
- Moon histogram 2024–2030 hourly (61,368 samples): p50 3.4", p90 4.6", **p99 5.6"**, max 6.4" (gate < 40"). Sun daily p99 1.4".
- Drik Panchang hand sample: 15 rows (6 cities, Oct 20 / Oct 29 / Nov 8 / Nov 10 / Dec 15 / Jan 14): **all sunrise/sunset ±1 min, all tithi/nakshatra/yoga ends ±1 min, names exact, months, samvats; moonrise/moonset to the minute after the parallax fix**. Toronto Diwali amavasya ends 02:01 EST = Delhi 12:31 IST, same instant.
- Two conventions learned from Drik and encoded: (1) moonrise/moonset shown are the ones inside the Vedic day (sunrise → next sunrise); (2) Drik's moonrise is topocentric (upper limb + parallax), ~4–6 min later than the geocentric value both ephemerides give by default.

## In progress
- Step 4 L2 kala (`engine/kala.ts`, `data/kala.json`, `test/kala.test.ts` written, not yet run): Rahu/Yama/Gulika, Abhijit, Brahma, 30 muhurtas, Durmuhurta, Choghadiya, Hora, Pradosha, Varjyam/Amrit kaal, Sandhya.

## Next step
1. Run `npx vitest run engine/test/kala.test.ts`, fix, commit "L2 kala".
2. L3 flags (`engine/flags.ts` + `data/yogas.json`): vara×nakshatra, vara×tithi, panchaka, bhadra+loka, gand mool, yoga flags, calendar windows (kharmas, adhika, chaturmas, holashtak, pitru paksha), sankranti (test: Makara 2027-01-14 21:14 IST per Drik), eclipse day, Guru/Shukra asta.
3. L4 personal + L5 scorer + packs; festivals; explain/i18n; PWA; deploy.

## Known gaps / UNVERIFIED
- Jovian samvatsara names: south = (Shaka+11) mod 60 (Drik: Shaka 1948 Parabhava), north = south+13 (Drik: VS 2083 Siddharthi), Gujarati lags north by one (Drik: 2082 Pingala, 2083 Kalayukta). Rule beyond 2026 UNVERIFIED.
- Amrit kaal = Varjyam start + 24 ghatis: derived from one Drik row, UNVERIFIED.
- Drik's "Ayanamsha" line (24.238203 on 2026-10-20) is ~17" above our value at sunrise; tithi/nakshatra ends still match to the minute. Probably a mean vs true difference; harmless, note in About.
- Kshaya masa path untested (none in 2026–27).
