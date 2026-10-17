# ShubhDate

**An honest Vedic panchang and muhurta app.** It tells you the right moment, shows you why,
and writes your sankalpa, for your city, your calendar and your family's tradition.
No ads, no fake pandits, no account. Everything is computed on your device.

Live: https://sakredstudio.github.io/subhdate/

## What is in this repo

| Folder | What | Licence |
|---|---|---|
| `engine/` | The calculation core: astronomy (L0), panchanga (L1), day divisions (L2), yogas and doshas (L3), personal bala (L4), muhurta rule packs and scorer (L5), festivals, explain layer (L6). Pure TypeScript, runs in any browser or in Node. Only runtime dependency: [astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT). | **MIT** (`engine/LICENSE`) |
| `engine/data/*.json`, `engine/rules/*.json` | Every astrological rule as data. Each row carries a `source` pointing to the classical text or the research note it came from, or is marked `UNVERIFIED`. | MIT |
| `engine/test/golden/` | Golden fixtures generated once from Swiss Ephemeris (dev-side only) and a small hand-read Drik Panchang sample. | MIT |
| `tools/oracle/` | Dev-only validation harness around Swiss Ephemeris (`@swisseph/node`, AGPL). **Never bundled, never served.** It only writes the golden JSON. | tool, not shipped |
| `app/` | The ShubhDate PWA (screens, copy, artwork, service worker). | **Proprietary** (`app/LICENSE`) |
| `i18n/` | UI strings and reason-code dictionaries (EN, HI, Hinglish, GU first). | Proprietary |
| `docs/ENGINE-DESIGN.md`, `research/02-*.md`, `research/03-*.md` | The design spec and the sourced knowledge base the rules are encoded from. | CC BY 4.0 |
| `app/data/cities.json` | City list derived from [GeoNames](https://www.geonames.org/) cities15000 via `tools/dev/import-cities.mjs`, plus hand-curated rows. | CC BY 4.0 (GeoNames) |

The engine is MIT so that anyone (including the pandit checking your date) can read exactly how
a tithi or a muhurta was computed. The app folder is proprietary.

## How it calculates (short version)

- Positions: astronomy-engine, true ecliptic of date, geocentric.
- Ayanamsa: Lahiri (Chitrapaksha), calibrated against Swiss Ephemeris `SE_SIDM_LAHIRI`.
- Sunrise: upper limb with refraction by default (the Drik Panchang convention); disc-centre option in Settings.
- The Vedic day runs sunrise to sunrise. Tithi, nakshatra, yoga and karana are reported as they stand at sunrise, with end instants found by root-finding to the second.
- Months: amanta and purnimanta both computed; adhika masa detected from sankranti; region presets choose the default.
- Rules: Muhurta Chintamani, Dharmasindhu, Kalaprakashika (via Raman), Brihat Samhita, as tabulated in `research/02-vedic-knowledge.md`.

Regional disagreement is normal. Where traditions legitimately differ the app shows both and names the rule.
Treat results as a shortlist and let your family purohit make the final call.

## Run it

```bash
npm install
npm test            # engine unit + golden validation
npm run dev         # app at http://localhost:5173
npm run build       # static site in dist/
```

Regenerating the golden fixtures needs the dev oracle (installed as a devDependency):

```bash
npm run golden      # writes engine/test/golden/*.json from Swiss Ephemeris
npm run histogram   # astronomy-engine vs Swiss Ephemeris Moon-longitude histogram
npm run validate    # engine vs golden, with tolerances
```

## Privacy

Birth details, saved dates and settings live in your browser (IndexedDB / localStorage) and are never sent anywhere.
There is no server, no analytics and no account.

## Status

v1 (night build of 2026-10-16). See `CHECKPOINT.md` for what is validated and what is not.
