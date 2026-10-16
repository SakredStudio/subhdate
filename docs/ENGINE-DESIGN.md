# SubhDate Engine Design (v1 → v3)

Status: design pass 2026-10-15 (Fable). Implementation: overnight Opus run, then Sonnet.
Scope: the deterministic Vedic calculation core. Nothing in here calls an LLM. The LLM only
*verbalises* engine output (see §9). The engine must run fully offline in the browser.

Cross-check every rule table below against `research/02-vedic-knowledge.md` before coding.
Where the two disagree, the research file wins and this file gets corrected.

---

## 0. What the old "engine" was

`ShubhDate_v2.html` → `generateResults(name, city, eventIdx)`: a seeded pseudo-random that
returns five hard-coded May–June 2026 dates with made-up scores. `codex-first-mvp/lib/recommendation/engine.ts`
is the same idea in TypeScript (hash → offsets → fixed time windows). Neither computes a
single astronomical quantity. There is no astronomy, no panchanga, no muhurta logic to salvage.
What *is* salvageable: the screen flow, the design tokens, the share-card copy, the event list,
the translation layer shape, and the i18n intent. Everything below is new.

## 1. Layering (take-apart / reassemble)

```
 L0  astro        Sun/Moon ecliptic longitudes (tropical, true of date), sunrise/sunset/moonrise,
                  Julian day, ΔT, ayanamsa. Pure math. No tables of dates.
 L1  panchanga    tithi, vara, nakshatra(+pada), yoga, karana with START/END instants;
                  sunrise-anchored "Vedic day"; masa (amanta + purnimanta), paksha, adhika masa,
                  samvatsara, ayana, ritu; rashi of Moon/Sun.
 L2  kala         day-divisions: Rahu kaal, Gulika, Yamaganda, Abhijit, Brahma muhurta,
                  30 muhurtas, 8+8 Choghadiya, 24 hora, Durmuhurta, Varjyam, Amrit kaal, Pradosh.
 L3  yogas/dosha  derived flags for the day/instant: Sarvartha Siddhi, Amrita Siddhi, Ravi/Guru
                  Pushya, Tripushkara/Dwipushkara, Siddha, Mrityu/Dagdha/Visha, Panchaka,
                  Bhadra (+loka), Gand Mool, Vyatipata/Vaidhriti, Sankranti day, eclipse day,
                  Guru/Shukra asta (combust), Kharmas/Malamasa, Chaturmas, Holashtak, Pitru paksha.
 L4  personal     Tara bala (9), Chandra bala (12), Chandrashtama, janma nakshatra/rashi
                  from birth data; "unknown birth time" degrades gracefully (Moon rashi
                  ambiguity window shown, never guessed).
 L5  muhurta      per-event rule packs (JSON) → scorer → ranked windows with reason codes.
 L6  explain      reason codes → human sentences (per language) + optional LLM polish.
```

Each layer is a pure function of (instant, lat, lon, tz, options) and the layer below.
No layer imports from a layer above it. L0–L5 ship as one ESM bundle `engine/` with zero
runtime deps except the ephemeris library.

## 2. L0 astro

- Library: **astronomy-engine** (MIT, ~120 KB min). Use `SunPosition(date)` (true ecliptic of date)
  and `EclipticGeoMoon(date)` (geocentric ecliptic of date). *Verify these two function names and
  their "of date" semantics against the installed version (see research/03 §1).* Stated accuracy
  ≈ 1 arcmin for the Moon → tithi/nakshatra boundaries within ~2 min of time. That is inside Drik Panchang's own rounding.
- Fallback option if accuracy proves insufficient: swisseph via WASM (AGPL → forces open-sourcing
  the engine; acceptable only if Soul agrees). Keep L0 behind an interface `Ephemeris` so the swap is one file.
- Ayanamsa: **Lahiri (Chitrapaksha)**, Swiss-Eph definition: 23°15′00.658″ at JD 2435553.5
  (1956-03-21 0h ET), advanced by general precession in longitude. Implementation: IAU-2006
  precession polynomial in ecliptic longitude from t0 to t (not a fixed 50.29″/yr constant).
  Sanity: 2026-10-15 ≈ 24°13′ (check vs Drik Panchang "Ayanamsha" line). Expose `ayanamsa(jd)`.
- Sidereal longitude = tropical true-of-date longitude − ayanamsa, normalised 0–360.
- Sunrise/sunset: **upper limb with refraction** (altitude −0.833°). Drik Panchang's default is
  also the upper-limb convention (confirm in research/03). Offer `sunriseConvention: 'limb'|'center'`
  because Tamil Vakya and some Kerala panchangams use the Sun's centre.
- Moonrise/moonset for Karwa Chauth, Sankashti, Pradosh.
- Time: all internal math in UTC JD; `tz` (IANA) only for display and for finding the local
  civil date → sunrise instant. Use `Intl.DateTimeFormat` for offsets (no moment/luxon).
- ΔT: astronomy-engine handles it internally.

## 3. L1 panchanga

Definitions (sidereal longitudes λm Moon, λs Sun, in degrees):

| limb | formula | count | end-time |
|---|---|---|---|
| tithi | floor(((λm−λs) mod 360)/12)+1 | 30 | root of (λm−λs) = 12k |
| nakshatra | floor(λm/13.3333)+1, pada = floor((λm mod 13.3333)/3.3333)+1 | 27×4 | root of λm = 13.333k |
| yoga | floor(((λm+λs) mod 360)/13.3333)+1 | 27 | root of (λm+λs) = 13.333k |
| karana | floor(((λm−λs) mod 360)/6)+1 → name by table (Kimstughna, then 7 movable ×8, Shakuni, Chatushpada, Naga) | 60 → 11 names | root at 6k |
| vara | weekday of the **sunrise** that starts the Vedic day | 7 | next sunrise |

- Root-finding: bracket on an hourly grid, then bisection/Brent to 1 s. Moon moves ≤ 0.6°/h,
  so an hourly grid never skips a boundary.
- "Panchang for a date" = values **at sunrise** of that civil date at (lat,lon), plus every
  boundary that falls before the *next* sunrise (so a day can list two tithis, e.g. "Panchami till 14:07, then Shashthi").
- Masa: the lunar month takes the name of the solar month (sankranti) that occurs within it; a lunar
  month with no sankranti is **adhika** (same name, prefixed); two sankrantis → kshaya (rare, handle).
  Purnimanta = amanta shifted by one paksha (Krishna paksha belongs to the following month name).
  Default per region: North India purnimanta display; Gujarat/Maharashtra/South amanta. User can toggle.
- Samvatsara: Vikram (+57), Shaka (+78), plus the 60-name Jovian cycle (show, do not compute from Jupiter in v1: use the table keyed by Shaka year, note the north/south offset).
- Solar calendars (Tamil/Malayalam/Bengali) v2: sankranti-based month start rules differ (Tamil: sankranti before sunset → that day; Bengali: rule of midnight; Malayalam: aparahna). Put the rule behind `solarMonthRule`.
- Ritu, ayana (uttarayana from Makar sankranti in the sidereal convention the pandits use; note the tropical solstice as "astronomical" in the explain layer).

## 4. L2 kala (day divisions)

Let R = sunrise, S = sunset, D = S−R, N = next R − S. All segments are fractions of **this**
day's D or N (never fixed clock times).

- 8 day segments of D/8. Rahu kaal segment index by weekday (1-based): Sun 8, Mon 2, Tue 7, Wed 5, Thu 6, Fri 4, Sat 3 (mnemonic: Mother Saw Father Wearing The Turban on Sunday = Mon 2, Sat 3, Fri 4, Wed 5, Thu 6, Tue 7, Sun 8).
  Yamaganda: Sun 5, Mon 4, Tue 3, Wed 2, Thu 1, Fri 7, Sat 6. Gulika: Sun 7, Mon 6, Tue 5, Wed 4, Thu 3, Fri 2, Sat 1.
- 15 day muhurtas of D/15, 15 night muhurtas of N/15; names + lords from the research table.
  **Abhijit** = 8th day muhurta (centre at local noon of the Vedic day). Not used on Wednesdays in many lineages → flag `abhijitOnWednesday:false` default, reason shown.
- Brahma muhurta = [R − 96 min, R − 48 min].
- Choghadiya: derive, do not hard-code. Chaldean hora chain Sun→Venus→Mercury→Moon→Saturn→Jupiter→Mars (repeat).
  Planet→choghadiya: Sun Udveg, Venus Chal, Mercury Labh, Moon Amrit, Saturn Kaal, Jupiter Shubh, Mars Rog.
  Day: 8 slots of D/8 starting with the weekday lord. Night: 8 slots of N/8 starting with the lord 5th in the chain from the weekday lord (Sun→Jupiter=Shubh, Mon→Venus=Chal …). Quality: Amrit/Shubh/Labh good, Chal neutral, Udveg/Rog/Kaal avoid. Test against the standard tables (both match if the derivation is right).
- Hora: 12 of D/12 + 12 of N/12, same chain starting with the weekday lord.
- Durmuhurta (per weekday, by muhurta index), Varjyam/Vishagati and Amrit kaal (per nakshatra, as a fraction of that nakshatra's own duration; exact ghati table in research/02), Pradosh = [S, S + 2×48 min].

## 5. L3 yogas and doshas (day flags)

Encoded as JSON tables in `engine/data/*.json`, each row with `{id, source, text}` where
`source` cites the classical text (Muhurta Chintamani etc.) from research/02. Minimum set:

- vara×nakshatra: Sarvartha Siddhi, Amrita Siddhi, Siddha, Ravi Pushya (Sun+Pushya), Guru Pushya (Thu+Pushya), Mrityu yoga, Dagdha/Visha/Hutashana yogas (penalties), Yamaghanta, Kantaka.
- vara×tithi: Siddha (Nanda-Fri, Bhadra-Wed, Jaya-Tue, Rikta-Sat, Purna-Thu); Dagdha tithis per weekday (Sun 12, Mon 11, Tue 5, Wed 3, Thu 6, Fri 8, Sat 9 — verify).
- Tripushkara / Dwipushkara (verify lists in research/02). Good for gains and purchases, bad for losses and surgery.
- Panchaka: Moon from Dhanishtha second half (λm ≥ 300°) to end of Revati. Type by weekday: Sun Rog, Mon Raj, Tue Agni, Sat Mrityu, Fri Chor; Wed/Thu benign. Avoid: roof/house-work, travel south, bedding purchase, cremation-related.
- Bhadra (Vishti karana) with loka: Moon rashi Ar/Ta/Ge/Sc → swarga; Vi/Li/Sg/Cp → patala; Cn/Le/Aq/Pi → martya (the harmful one). Only martya Bhadra blocks auspicious work; others allowed with a note.
- Gand Mool: Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati (mostly avoid for namakarana / first outings).
- Yoga flags: Vyatipata (17), Vaidhriti (27) = avoid; Parigha first half avoid; Vishkambha/Atiganda/Shula/Ganda/Vyaghata/Vajra first N ghatis avoid (table).
- Tithi flags: Rikta (4,9,14), Amavasya, Purnima for some events; Shukla preferred for beginnings.
- Calendar-window flags (computed from L1, never hard-coded dates): Kharmas (Sun in sidereal Sagittarius / Pisces), Adhika masa, Chaturmas (Devshayani Ekadashi → Devutthani Ekadashi), Holashtak (Phalguna Shukla 8 → Holi), Pitru paksha (Bhadrapada Krishna, amanta), Sankranti day, eclipse days (astronomy-engine `SearchLunarEclipse` / `SearchGlobalSolarEclipse`; apply local-visibility for solar).
- Planetary: Guru asta / Shukra asta (combustion): |λ−λsun| < 11° (Jupiter) / 10° (Venus; 8° retrograde) — classical values; confirm vs Drik. Needs Jupiter/Venus longitudes (astronomy-engine has them). Blocks vivaha, upanayana, griha pravesh in the strict pack.

## 6. L4 personal

Input: birth date, time (nullable), place → sidereal Moon longitude at birth → janma nakshatra, pada, rashi.
If birth time unknown: compute Moon longitude at 00:00 and 23:59 local; if the same nakshatra → use it; if it spans two → show both and compute Tara bala for both, mark the result "approximate (birth time unknown)". Never pick silently.

- Tara bala: n = ((dayNak − janmaNak) mod 27) mod 9 + 1 → 1 Janma, 2 Sampat, 3 Vipat, 4 Kshema, 5 Pratyari, 6 Sadhaka, 7 Vadha, 8 Mitra, 9 Ati-mitra. Good: 2,4,6,8,9. Vipat/Pratyari/Vadha avoid.
- Chandra bala: house = ((dayRashi − janmaRashi) mod 12) + 1. Good 1,3,6,7,10,11; weak 2,5,9; avoid 4,8,12; 8 = Chandrashtama hard-avoid.
- For couples (vivaha): both partners' tara/chandra bala; the bride's takes precedence in most texts (confirm).
- v3: Lagna (ascendant) of the event instant and lagna shuddhi (the 21 mahadoshas) → ascendant from sidereal time (astronomy-engine provides it), no full chart library needed.

## 7. L5 muhurta rule packs and scorer

One JSON file per event: `engine/rules/<event>.json`:

```json
{
  "id": "vivaha",
  "names": {"en":"Wedding","hi":"विवाह"},
  "hard": [
    {"when":"flag:guru_asta"}, {"when":"flag:shukra_asta"}, {"when":"flag:adhika_masa"},
    {"when":"flag:kharmas"}, {"when":"flag:chaturmas"}, {"when":"flag:holashtak"},
    {"when":"flag:pitru_paksha"}, {"when":"flag:eclipse_day"}, {"when":"tithi in [30]"},
    {"when":"kala:rahu_kaal"}, {"when":"flag:bhadra_martya"}, {"when":"personal:chandrashtama"}
  ],
  "soft": [
    {"when":"nakshatra in [Rohini,Mrigashira,Magha,U.Phalguni,Hasta,Swati,Anuradha,Mula,U.Ashadha,U.Bhadrapada,Revati]","w":30,"else":-25},
    {"when":"tithi in [2,3,5,7,10,11,12,13]","w":15}, {"when":"tithi in [4,9,14]","w":-30},
    {"when":"vara in [Mon,Wed,Thu,Fri]","w":10}, {"when":"vara in [Tue,Sat]","w":-10},
    {"when":"masa in [Magha,Phalguna,Vaishakha,Jyeshtha,Ashadha,Margashirsha]","w":10},
    {"when":"flag:sarvartha_siddhi","w":10}, {"when":"flag:amrita_siddhi","w":10},
    {"when":"personal:tara in [2,4,6,8,9]","w":10,"else":-15},
    {"when":"personal:chandra_bala good","w":10,"else":-10},
    {"when":"kala:choghadiya in [Amrit,Shubh,Labh]","w":8}, {"when":"kala:abhijit","w":5},
    {"when":"flag:panchaka","w":-10}, {"when":"flag:vyatipata|vaidhriti","w":-20}
  ],
  "windowMinutes": 90,
  "preferDaytime": true,
  "sources": ["Muhurta Chintamani, Vivaha Prakarana", "Kalaprakashika ch. 20"]
}
```

Scorer: for each candidate day in range → compute L1–L4 once → reject on hard rules → for
each 30-min slot from sunrise to sunset (and night if `preferDaytime:false`) compute L2/L3
slot-flags → score = 50 + Σw, clamp 0–100 → merge adjacent slots with the same score into
windows → return top N windows per day, top K days. Deterministic. Every emitted reason is a
`{code, params}` pair, never free text, so L6 can render it in 8 languages and the tests can assert on codes.

Event packs for v1 (12): vivaha, roka/engagement (sagai), griha_pravesh, vahana (vehicle), vyapara (business/shop opening), namakarana, annaprashana, mundan, yatra (travel: Disha shula by weekday + Yogini + Chandra vasa direction rules), new job / joining, exam/interview, bhoomi puja / property registration. v2 adds: upanayana, vidyarambha, seemantha, karnavedha, gold purchase, surgery (Moon not in the body part's nakshatra), festival packs (Lakshmi puja on Diwali with Pradosh + sthira lagna, Dhanteras, Ghatasthapana, Karwa Chauth moonrise). v3: couple inputs for vivaha, full lagna shuddhi.

Honesty rules baked into output: (1) `confidence: 'high'|'medium'|'low'` — low when birth time is unknown or the event is more than a year out; (2) the pack id and the source list are always included; (3) a `caveats[]` list ("your family may follow purnimanta; the month name differs", "Wednesday Abhijit is not used in some traditions").

## 8. Validation (the engine is worthless if it does not match the pandit's panchang)

- **Oracle = Swiss Ephemeris, dev-side only** (research/03 §3.4): `tools/oracle/` uses `sweph-wasm` or `@swisseph/browser` (AGPL) in a Node script that is never bundled or served; it generates `engine/test/golden/*.json` (sidereal Sun/Moon longitudes with `SE_SIDM_LAHIRI`, rise/set in both conventions, `swe_get_ayanamsa_ex_ut`). Commit the JSON, not the oracle output of every run. Tolerances vs oracle: rise/set ±20 s, end times ±60 s, longitudes ±30″.
- Golden grid: 5 cities (Delhi, Mumbai, Chennai, Kolkata, Ahmedabad, Toronto) × two 30-day blocks (2026-10-20 → 2026-11-18 for Diwali/wedding season; 2026-12-15 → 2027-01-13 for Makara sankranti, Toronto DST-off, year rollover) = 360 day-records with {sunrise, sunset, moonrise, tithi+end, nakshatra+end, yoga+end, karana, rahu/yama/gulika, abhijit, choghadiya, amanta/purnimanta month, paksha, adhika flag, ayanamsa}.
- **Drik Panchang is copyrighted and has no API** (research/03 §3.1). Do not scrape it. Hand-enter a small verification sample (5 cities × 6 dates) read from its pages into `golden/drik-manual.json` with the URL and read date per row. Tolerance vs Drik: rise/set ±1 min, end times ±3 min, names exact. This is ordinary verification, not data extraction.
- Machine second opinion: Prokerala API free tier (5,000 credits/month, no card) or FreeAstrologyAPI for ~30 calls/day in CI, end times ±2 min.
- Ayanamsa: calibrate the J2000 constant once so `ayanTrue(jd)` matches `swe_get_ayanamsa_ex_ut(jd, SE_SIDM_LAHIRI)` to < 0.5″ over 1900–2100; add nutation in longitude (±17″) consistently because astronomy-engine longitudes are true-of-date (recipe in research/03 §1.3).
- Week-1 risk gate: histogram astronomy-engine vs oracle Moon longitude at hourly steps 2024–2030; p99 must be < 40″ (≈ 1.2 min of tithi time). If not, swap the Moon to `astronomia.moonposition` behind the `Ephemeris` interface.
- Extra trust sources: Government of India Rashtriya Panchang (nirayana longitudes for 1–2 dates), and one printed regional panchang photo from Soul's family.
- Property tests: tithi number monotonic with (λm−λs); 27 nakshatras over one sidereal month ≈ 27.32 d; 30 tithis ≈ 29.53 d; choghadiya derivation equals the published table for all 7 weekdays; Rahu kaal tables for all 7 weekdays; ayanamsa(2000-01-01) ≈ 23°51′; ayanamsa(2026-10-15) ≈ 24°13′.
- A `npm run validate` command prints a diff table vs golden and fails CI on any name mismatch or >3-min drift.

## 9. L6 explain

- Reason codes → sentences from `i18n/<lang>/reasons.json`. English + Hindi + Hinglish ship first; the other six languages get UI strings first and reason strings in v2.
- Optional LLM polish (v2): Worker endpoint `/api/explain` with the engine JSON as the only input, system prompt forbids inventing astrology, cache key = sha(event, date, region, lang) in KV, Haiku, max 180 output tokens, daily cap. If the Worker is unreachable the app shows the template sentences. The LLM is never on the critical path.
- Devotional layer (Vanamali's voice): each event pack carries an `invocation` (Ganesha for beginnings, Lakshmi for Diwali/business, Saraswati for vidyarambha, Vishnu/Krishna for vivaha), a one-line Gita/Vedic verse reference (text in research/02 §5), and the day's *sankalpa* line auto-filled from L1 (samvatsara, ayana, ritu, masa, paksha, tithi, vara, nakshatra). No competitor writes your sankalpa for you.

## 10. Public API of the engine package

```ts
panchang(date: Date, place: Place, opts?: PanchangOptions): PanchangDay
kala(day: PanchangDay): KalaTable                       // rahu, gulika, yama, abhijit, choghadiya, hora, muhurtas
dayFlags(day: PanchangDay): Flag[]                      // L3
personal(day: PanchangDay, birth: Birth): PersonalBala  // L4
findMuhurta(req: {event, from, to, place, birth?, partnerBirth?, region, strictness}): MuhurtaResult // L5
explain(result: MuhurtaResult, lang: Lang): Explanation // L6
```

`Place = {lat, lon, tz, name}`. `region = 'north'|'west'|'south'|'east'|'diaspora'` picks amanta/purnimanta, sunrise convention and default language. `strictness = 'family'|'standard'|'relaxed'` controls whether soft penalties become hard rejects.

## 11. Performance budget

Panchang for one day ≈ a few dozen Sun/Moon evaluations → < 2 ms. A 90-day muhurta search with
30-min slots → < 300 ms on a mid-range Android phone. Run in a Web Worker anyway; cache
PanchangDay per (date, place) in IndexedDB.

## 12. Tests first, UI second

Build order: L0 → L1 → golden validation → L2 → L3 → L5 (two packs) → UI.
If usage limits cut the run short, a validated panchang core with tests is worth more than
an unvalidated app with every screen. Commit after every layer.
