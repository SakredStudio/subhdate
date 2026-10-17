# ShubhDate night build — CHECKPOINT

Updated: 2026-10-17 (run 2, in progress, branch `v2-night-2`). Status: **v1 live; v2 night build 2 running.**

## Run 2 progress (rewritten at every step boundary)
- Step 0 (setup): done. Baseline on `main` before any change: 64 unit tests, 8 golden tests, typecheck clean, build 185.5 kB worker + 90.6 kB app (29.2 kB gz). `app/config.ts` holds every deployment placeholder (`WAITLIST_URL`, `WORKER_URL`, `ENTITLEMENT_PUBLIC_KEY_JWK`, `VAPID_PUBLIC_KEY`, `PLAY_LISTING_URL`); `IS_PLACEHOLDER()` hides the waitlist button until Soul fills the Form link.
- Step 1 (Muhurta Report): done. `engine/report.ts` (`buildReport`, MIT, 4 tests), worker op `report`, screen `#/report` (`app/screens/report.ts`), print stylesheet `app/report.css` (A4, page-margin running head/footer, blurred preview). Entry buttons on the results header and the Result screen. Dev/QA flag: `localStorage['shubhdate.devReport']='1'` unlocks the full report (never shown in UI). Verified in headless Chromium: 21-page Hindi PDF (Devanagari + IAST shaped correctly), no console errors.
- Step 2 (GeoNames cities): done. `tools/dev/import-cities.mjs` (downloads cities15000.zip, or `--input` a local .zip/.txt; minimal zip reader in node:zlib) → `app/data/cities.json` (3,599 rows, 188 KB raw: all IN/NP/LK/BD/BT/MU/FJ/TT/GY/SR + ≥100k diaspora countries + the 369 curated v1 rows merged; native-script names for the top 200 Indian cities). `app/cities.ts` loads it; `engine/test/cities.test.ts` (4 tests). CC BY 4.0 line in About and README. **Sandbox note:** download.geonames.org is blocked by this sandbox's egress policy (403), so the JSON was built from the GeoNames file inside the npm package `cities15000@0.0.1` (vintage: latest row 2017-02-06). Soul: rerun `node tools/dev/import-cities.mjs` on the PC for a fresh list; the format is identical.
- Step 3 (Gujarati reasons): done. `i18n/gu/reasons.json` (78 reasons + 18 caveats, same `{param}` placeholders, verified by script), `'gu'` in `REASON_LANGS`, explain test covers gu. The report and Find Muhurta now speak Gujarati end to end.
- Next: Step 4, docs/PANDIT-REVIEW.md.

---

# ShubhDate night build — CHECKPOINT

Updated: 2026-10-16 ~06:10 Toronto (run 1, Claude Fable 5.1). Status: **v1 shipped and live.**

## Live
- https://sakredstudio.github.io/subhdate/ (GitHub Pages via Actions on every push to `main`; repo https://github.com/SakredStudio/subhdate, public).
- Verified on the live site: service worker registered at `/subhdate/`, cache `shubhdate-v1` holds the shell, both JS bundles, CSS, manifest, icons and fonts (offline after first load by construction); no console errors; Today for Toronto 2026-10-16 matches Drik Panchang (sunrise 07:33, sunset 18:32, moonrise 13:54, Shashthi till 20:24, Mula till 00:17, Shobhana till 12:35/36, Rahu 11:40–13:02/03, Abhijit 12:40–13:24; moonset 21:58 vs Drik 22:00). Mumbai Today renders with amanta naming.

## What was built (all committed + pushed)
- `engine/` (MIT): L0 astro (astronomy-engine, Lahiri calibrated to Swiss Ephemeris 0.02", nutation, topocentric moonrise), L1 panchanga (five limbs with end instants, amanta/purnimanta, adhika, samvatsara), L2 kala (`data/kala.json`), L3 flags (`data/yogas.json`), L4 personal, L5 muhurta scorer + `rules/{vivaha,griha_pravesh,general}.json` (12 events), festivals by rule (`data/festivals.json`), L6 explain + sankalpa. Every rule row has a `source` (research/02 section + confidence tag) or UNVERIFIED.
- `tools/oracle/` (dev-only, AGPL Swiss Ephemeris): golden generator, Moon histogram, ayanamsa calibration, sankranti check. Golden JSON committed; oracle never bundled.
- `i18n/`: reasons EN/HI/Hinglish; terms EN/HI/GU; UI strings EN/HI/GU/Hinglish full, MR/TA/TE/BN/KN beta.
- `app/` (proprietary): Today, Find Muhurta, Result (Save/Share/.ics), Festivals, Saved, Settings, About, Privacy, first-run screen; Web Worker, IndexedDB, hand-curated ~330-city list, SW, manifest, generated PNG icons.

## Validation numbers
- Oracle (6 cities × 60 days, Swiss Ephemeris): 7160/7161 checks = 99.99% (the one miss is a sanity check on the parallax shift at a sunrise edge, not an astronomical error).
- Moon longitude vs Swiss Ephemeris, hourly 2024–2030: p50 3.4", p99 5.6", max 6.4" (gate was 40"). Sun daily p99 1.4".
- Drik Panchang hand sample: 17 rows (6 cities; Oct 16/20/29, Nov 8/10, Dec 15, Jan 14): 248/248 = 100% (sunrise/sunset ±1 min, moonrise/moonset ±2 min, tithi/nakshatra/yoga ends ±3 min, names, months, samvats); kala windows (Rahu/Gulika/Yama/Abhijit/Durmuhurta/Varjyam/Amrit) 73/73 within 1 min.
- Festival anchors: Karwa Chauth 2026-10-29 Delhi (moonrise 20:17) / 10-28 Toronto; Dhanteras 11-06; Diwali 11-08 (pradosha 17:31–19:55 Delhi); Govardhan 11-10; Bhai Dooj 11-11; Devutthani Ekadashi 11-21 (kshaya Ekadashi, Smarta rule); Makar Sankranti 2027-01-15 Delhi / 01-14 Toronto.
- 72 unit + golden tests green; typecheck clean; CI runs tests + golden validation + build on every push.

## Top 5 next steps (for Sonnet)
1. Replace `WAITLIST_URL` in `app/main.ts` with Soul's Google Form link; add a short "beta" ribbon and a feedback link.
2. Lagna (ascendant) from sidereal time + sthira-lagna window for Diwali Lakshmi puja; then the 21-mahadosha lagna shuddhi for vivaha (research/02 §3.4).
3. GeoNames `cities15000` import (CC BY) to replace the hand-curated list; add Hindi/Gujarati alternate names for the top 200 Indian cities.
4. Pandit review of the UNVERIFIED rows (sagai/mundan/bhoomi lists, Monday 9th durmuhurta, Amrit-kaal offset, Bhai Dooj/Vasant Panchami day rules, Jovian name offsets beyond 2026) and tune the ten general-pack events into their own packs.
5. Lighthouse PWA audit on a phone, Play TWA via the Swaiyu recipe (minSdk 24, target 36, assetlinks on the Pages domain), then Play Billing for the Wedding Report.

## 3 questions for Soul
1. Default calendar for the app's first screen: keep "North (purnimanta)" for India timezones and "Diaspora" elsewhere, or default to Gujarati/amanta (your family) everywhere?
2. Drik's Lahiri runs ~16" ahead of Swiss Ephemeris (sankranti instants differ by ~4 min). Follow Swiss Ephemeris (current, documented in About) or match Drik numerically?
3. Should the Pushya-for-marriage penalty and the North-Indian Panchaka penalty be switched off automatically for the South preset (Tamil/Kannada practice differs), or stay as caveats?

## Known gaps / UNVERIFIED (also marked in data files)
- Drik Lahiri offset (above); Jovian samvatsara names beyond 2026; Amrit kaal = Varjyam + 24 ghatis beyond Swati/Bharani/Krittika; sagai/mundan/bhoomi nakshatra and month lists [M]; Monday 9th durmuhurta [S1]; Bhai Dooj aparahna and Vasant Panchami purvahna rules [M].
- Not in v1: night Rahu kaal (South), lagna and sthira lagna, Vakya mode, partner bala, Vaishnava/ISKCON Ekadashi, kshaya masa (untested path).
- Beta languages have ~30 UI strings; reason sentences fall back to English.
- Business docs (NIGHT-BUILD-BRIEF, ROADMAP, research/01) are gitignored and not in the public repo; flip `.gitignore` if you want them published.

## Morning report (Soul)
1. **Live:** https://sakredstudio.github.io/subhdate/ (installable PWA, works offline after the first open; source at github.com/SakredStudio/subhdate).
2. **What works:** Today panchang for any city (tithi/nakshatra/yoga/karana with end times, Rahu kaal and friends, Choghadiya with "now", Hora, yogas/doshas, festival of the day, your sankalpa in Devanagari/IAST), Find Muhurta for 12 events with reasons in EN/HI/Hinglish, Festivals Oct–Mar with diaspora notes, Save/Share/.ics, Settings with the Gujarati/amanta preset and on-device birth details.
3. **Validated:** 100% vs Swiss Ephemeris on 7,160 checks (Moon within 6", gate was 40") and 100% vs 17 hand-read Drik Panchang pages, including moonrise to the minute after fixing lunar parallax.
4. **Not done / unverified:** lagna (so no sthira-lagna Diwali window and no 21-dosha check), night Rahu kaal, pandit review of the rows marked UNVERIFIED, Play build, waitlist link is a placeholder; Drik's ayanamsa is 16" ahead of ours (4 min on sankranti).
5. **Tap first:** open the link on your phone, pick ગુજરાતી + Ahmedabad (region "Gujarat / Maharashtra (amanta)"), check Diwali on the Festivals tab (Nov 8, Ashwina Vad Amas, pradosha window), then Find Muhurta → Wedding → Nov 18 to Dec 15 → compare the top days with your family panchang.
