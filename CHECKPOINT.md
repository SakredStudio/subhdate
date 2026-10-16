# ShubhDate night build — CHECKPOINT

Updated: 2026-10-16 ~05:05 Toronto (run 1, Claude Fable 5.1)

## Done (committed + pushed to https://github.com/SakredStudio/subhdate)
- Step 0 scaffold (Vite 8, TS 5.9, vitest 5, astronomy-engine 2.1.19; @swisseph/node dev-only oracle). Engine MIT, app proprietary.
- Step 1 L0 `engine/astro.ts`: calibrated Lahiri ayanamsa (matches SE to 0.02"), nutation, Sun/Moon/planets, rise/set limb + centre, topocentric moonrise, root finder, tz helpers.
- Step 2 L1 `engine/panchanga.ts`: five limbs with end instants, vara, amanta + purnimanta masa, adhika, samvatsara (Vikram/Gujarati/Shaka + Jovian names), ritu, ayana, rashis.
- Step 3 golden gate: **oracle 7160/7161 = 99.99%** (the one miss is a parallax-shift sanity check at the Nov 9 sunrise edge, not an astronomical error); **Moon histogram p99 5.6"** (gate 40"); **Drik manual 15 rows, 220/220 = 100%**; **kala vs Drik 65/65**.
- Step 4 L2 `engine/kala.ts` + `data/kala.json` (rahu/yama/gulika, abhijit, brahma, 30 muhurtas, durmuhurta, choghadiya day+night, hora, pradosha, varjyam/amrit kaal, sandhya). L3 `engine/flags.ts` + `data/yogas.json` (sarvartha/amrita/siddha/ravi-guru pushya/pushkara/ravi yoga, dagdha/visha/hutashana/yamaghanta/mrityu/krakacha, rikta/amavasya, bad yogas, gand mool, gandanta, panchaka+type, bhadra+loka, adhika/kshaya/kharmas/chaturmas/holashtak/pitru paksha, abujha days, sankranti day + avoid window + punya kaal, eclipse day/window (local solar), guru/shukra asta, vinchudo (west)).
- Step 5 L4 `engine/personal.ts` (janma, tara bala, chandra bala, unknown-time ambiguity), L5 `engine/muhurta.ts` + `rules/{vivaha,griha_pravesh,general}.json` (12 events; hard/soft; strictness family/standard/relaxed; reason codes; windows; confidence; caveats).
- Step 6 `engine/festivals.ts` + `data/festivals.json`: rules not dates; diaspora note vs Delhi. Anchors verified: Karwa Chauth 2026-10-29 (Delhi, moonrise 20:17; Toronto 10-28), Dhanteras 11-06, Diwali 11-08 (pradosha 17:31–19:55 Delhi), Govardhan 11-10, Bhai Dooj 11-11, Devutthani Ekadashi 11-20/21, Makar Sankranti 2027-01-15.
- Tests: 60 passing (`npm test`), typecheck clean.

## In progress
- Step 7 L6 explain + i18n (reason dictionaries EN/HI/Hinglish, terms EN/HI/GU, sankalpa generator).

## Next step
1. Finish L6 (`engine/explain.ts`, `i18n/*`), test, commit.
2. Step 8 PWA in `app/` (vanilla ES modules + Vite): Today, Find Muhurta, Result detail, Saved, Festivals, Settings, About, Privacy; worker + IndexedDB; service worker; manifest; design tokens from the handoff.
3. Step 9 GitHub Actions → Pages; verify live; append LIVE-GO-PLAN §4.1; final CHECKPOINT + morning report.

## Known gaps / UNVERIFIED (also marked in data files)
- Drik's Lahiri runs ~16" ahead of Swiss Ephemeris SE_SIDM_LAHIRI (Drik ayanamsha 24.238203 vs SE 24.233762 on 2026-10-20). Effect: sankranti instants differ by ~4 min (Makara 2027: SE 21:10 IST, Drik 21:14); tithi/nakshatra ends unaffected at minute resolution. We follow SE and say so.
- Jovian samvatsara names: south (Shaka+11) mod 60 ✓ Drik; north = south+13 ✓ Drik (Siddharthi); Gujarati lags north by one ✓ Drik (Pingala/Kalayukta). Beyond 2026 UNVERIFIED.
- Amrit kaal = Varjyam start + 24 ghatis: UNVERIFIED beyond Swati/Bharani/Krittika.
- Packs: sagai (vagdana) and mundan nakshatra lists are [M]/UNVERIFIED; bhoomi_puja month list [M]; Monday 9th durmuhurta [S1]; Bhai Dooj/Vasant Panchami day-rules [M].
- Night Rahu kaal (South) not implemented. Lagna/sthira-lagna windows not implemented (v3). Kshaya masa path untested.
- Moon rise/set vs Drik within 1 min on 14 rows, 2 min on one (Toronto 2026-10-29 moonset).
