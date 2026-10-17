# ShubhDate: rows awaiting pandit review

Every rule in the ShubhDate engine is a data row with a `source` string. The research behind the engine
(`research/02-vedic-knowledge.md`) tags each source with a confidence level: `[P]` primary text, `[S]` two
independent secondaries, `[S1]` a single secondary, `[M]` from memory / unverified, `[CONFLICT]` sources disagree,
or `UNVERIFIED`. The engine does not hide any of this: the Muhurta Report's "For your pandit" page prints the
`source` of every rule that applied and marks the `[M]`/`UNVERIFIED` ones with ⚠.

This document lists every such row, what the engine does today, the exact question a purohit or a jyotishi
should answer, and what would change in the code. Nothing here was changed in the v2 build: research/02 cannot
settle any of these by itself, so a human who knows the texts has to.

How to answer: reply per section number with (a) the ruling, (b) the text and verse or the panchang you rely on,
(c) which regional tradition it applies to. Open an issue at https://github.com/SakredStudio/subhdate/issues or
write to Soul (Sakred Studio). Rows are referenced as `file › key` so the fix is a one-line data edit.

---

## 1. Amrit kaal offset (all events)

- **Rows:** `engine/data/kala.json › varjyam.amritOffsetGhatis` (24); `engine/rules/vivaha.json › soft amrit_kaal` (+5); `engine/rules/general.json › soft amrit_kaal` (+4).
- **What the engine does:** Varjyam (tyajya) starts at the Drik/Tamil table ghati of the running nakshatra and lasts 4 ghatis. Amrit kaal is placed **24 ghatis after the Varjyam start**, also 4 ghatis long. This matches Drik Panchang for Swati, and the Prashnamarga Amrita column for Bharani and Krittika, but **not for Rohini** (Prashnamarga says 52, the offset rule gives 41 + 24 = 65 → 5 of the next nakshatra).
- **Question for the pandit:** Is Amrit kaal a fixed offset from Varjyam (if so, which: 24 ghatis as Drik appears to use, or another), or is it the per-nakshatra Amrita-ghati column of Prashnamarga / Madhaviya (we have only 4 of 27 values: Ashwini 42, Bharani 48, Krittika 54, Rohini 52)? Which does your tradition (Tamil / Telugu / Kannada) follow?
- **What would change:** either keep the offset, or add a 27-entry `amritStartGhati` array to `kala.json` and read it in `engine/kala.ts` (the code path already handles roll-over into the next nakshatra). The weight (+4/+5) is small and would not change.

## 2. Sagai / vagdana nakshatra list

- **Row:** `engine/rules/general.json › events.sagai` (source `UNVERIFIED`).
- **What the engine does:** uses the eleven vivaha nakshatras (Rohini, Mrigashira, Magha, U.Phalguni, Hasta, Swati, Anuradha, Mula, U.Ashadha, U.Bhadrapada, Revati) **plus** Chitra, Shravana, Dhanishtha, Ashwini and Pushya, on the reasoning that the "Pushya curse" applies to the wedding itself, not to the engagement; avoids the fierce/sharp nakshatras; prefers Mon/Wed/Thu/Fri.
- **Question:** Muhurta Martanda and Muhurta Chintamani (Vivaha prakarana) treat vagdana separately. Which nakshatras do they give for vagdana / sagai? Is Pushya in or out? Is a tithi list given (we use the general Shukla preference only)?
- **What would change:** the `nakshatras.good` / `avoid` arrays and possibly a `tithisOverride`; the source string becomes the verse reference.

## 3. Mundan / chudakarana lists

- **Row:** `engine/rules/general.json › events.mundan` (source `UNVERIFIED`).
- **What the engine does:** nakshatras Ashwini, Mrigashira, Punarvasu, Pushya, Hasta, Chitra, Swati, Jyeshtha, Shravana, Dhanishtha, Shatabhisha, Revati; months Chaitra, Vaishakha, Jyeshtha, Ashadha, Magha, Phalguna; tithis 2, 3, 5, 7, 10, 11, 13; Mon/Wed/Thu/Fri; +5 for Uttarayana. The Samskara prakarana of Muhurta Chintamani was not located online, so this is reconstructed from memory.
- **Question:** please check the list against Muhurta Chintamani, Samskara prakarana (chudakarana verses) or Dharmasindhu. Is Jyeshtha really in the list (it is "sharp" elsewhere)? Does the month list exclude the child's birth month or Chaturmas in your tradition? Is the mother's pregnancy a bar (some families)?
- **What would change:** the arrays above; possibly a new `extraHard` row.

## 4. Bhoomi puja / griharambha month list

- **Row:** `engine/rules/general.json › events.bhoomi_puja` (source `[M]`, property purchase `[S]/[M]`).
- **What the engine does:** months Vaishakha, Shravana, Margashirsha, Magha, Phalguna (+8); nakshatras Rohini, Mrigashira, Pushya, U.Phalguni, Hasta, Chitra, Swati, Anuradha, U.Ashadha, Shravana, Dhanishtha, Shatabhisha, U.Bhadrapada, Revati; Adhika masa is a hard block; Panchaka −12 (pillars and roofing).
- **Question:** Muhurta Chintamani, Vastu prakarana: which months are approved for griharambha (laying the foundation) as opposed to griha pravesha? Is Shravana approved (it is inside Chaturmas, which bars pravesha but not necessarily arambha)? Is the Vastu-purusha "sleeping" direction rule (which sides may be dug in which months) something you want applied?
- **What would change:** `masas.good`, possibly a direction note per month in `directions`.

## 5. Monday's 9th durmuhurta

- **Row:** `engine/data/kala.json › durmuhurta.byWeekday[1]` = [9, 12] (Monday), source `[P-via-Raman] … Monday 9th [S1]`.
- **What the engine does:** on Monday, muhurtas 9 (Satamukhi/Vidhata) and 12 (Nirriti) are durmuhurta. The 12th is attested; the 9th rests on one secondary source, and research/02 §2.6.4 notes a conflict (some lists give Monday's second durmuhurta as the 7th or omit it).
- **Question:** Muhurta Chintamani (Shubhashubha prakarana, dosha 7/13 per Raman): which two muhurtas are durmuhurta on Monday? Please also confirm Wednesday (8th = Abhijit) and Saturday (1st, 2nd), which are rarely printed.
- **What would change:** one array entry. Drik Panchang "Dur Muhurtam" rows for a Monday would also settle it empirically (we matched Tue and Thu only).

## 6. Bhai Dooj: aparahna-vyapini rule

- **Row:** `engine/data/festivals.json › bhai_dooj` (rule `aparahna`, source `[M] … UNVERIFIED rule text`).
- **What the engine does:** Kartika Shukla 2 is celebrated on the civil day whose aparahna (the 4th of the five day-parts: sunrise + 3/5 to 4/5 of daylight) contains the tithi; Yama puja window = that aparahna.
- **Question:** Dharmasindhu / Nirnayasindhu on Yama Dwitiya: is it aparahna-vyapini, or is the tithi at the time of the meal (madhyahna) decisive? What happens when the tithi covers aparahna on two days or neither?
- **What would change:** the `rule` string (`aparahna` → `madhyahna` or a two-day rule) and the puja window label.

## 7. Vasant Panchami: purvahna-vyapini rule

- **Row:** `engine/data/festivals.json › vasant_panchami` (rule `purvahna`, source `[M] UNVERIFIED`).
- **What the engine does:** Magha Shukla 5 on the day whose purvahna (sunrise to sunrise + 2/5 of daylight) holds the tithi; Saraswati puja window = purvahna.
- **Question:** Is Vasant Panchami purvahna-vyapini (Dharmasindhu) or madhyahna-vyapini (some Bengal usage)? When Panchami starts after purvahna on day 1 and ends before purvahna on day 2, which day is it?
- **What would change:** the `rule` string; the Festivals screen and reminders follow it automatically.

## 8. Vinchudo (Gujarati: Moon in Vrishchika)

- **Row:** `engine/data/yogas.json › vinchudo` (source `[S1] UNVERIFIED rule text`).
- **What the engine does:** flags the days the sidereal Moon is in Vrishchika as "Vinchudo" (informational flag only; no rule pack penalises it). The flag exists because Drik Panchang's Ahmedabad page lists it.
- **Question:** In Gujarati practice, which works does Vinchudo bar (shubh karya generally? travel? only new ventures?) and is the whole Vrishchika transit (≈ 2¼ days) avoided or only the Jyeshtha portion (the gandanta end)? Is it observed in Saurashtra and Kutch as in Ahmedabad?
- **What would change:** a soft row (−5 to −15) in the packs for the west region, or nothing if it is only a calendar note.

## 9. Ravi yoga offsets

- **Rows:** `engine/data/yogas.json › raviYoga.offsetsFromSunNakshatra` = [4, 6, 9, 10, 13, 20] (source `[M]`); `vivaha.json` / `general.json › soft ravi_yoga` (+5).
- **What the engine does:** counts the Moon's nakshatra from the Sun's; when the count is 4, 6, 9, 10, 13 or 20, Ravi yoga holds and overrides minor doshas (+5).
- **Question:** please confirm the count list (Muhurta Chintamani, Shubhashubha prakarana: "4, 6, 9, 10, 13, 20 from the Sun's nakshatra") and whether it is counted inclusively from the Sun's nakshatra.
- **What would change:** the array; the weight is small.

## 10. Amrita Siddhi exceptions

- **Row:** `engine/data/yogas.json › amritaSiddhi.exceptions` (Tue + Ashwini bad for griha pravesha; Thu + Pushya bad for vivaha; Sat + Rohini bad for yatra), source `exceptions [M]`; `griha_pravesh.json › soft amrita_siddhi` carries the note.
- **What the engine does:** the pairs (Sun Hasta, Mon Mrigashira, Tue Ashwini, Wed Anuradha, Thu Pushya, Fri Revati, Sat Rohini) are Amrita Siddhi (+10 / +5). The three exceptions are stored but **not applied** (the data is there; the scorer does not read `badFor` yet).
- **Question:** are these exceptions correct and complete? Some lists also make Mon + Mrigashira bad for a journey. Also: hindu-blog gives Wednesday Vishakha rather than Anuradha; which is right?
- **What would change:** `engine/flags.ts` would apply `badFor`, turning the +10 into a −10 for that event; the Wednesday pair might change.

## 11. Chaturmas and Tamil practice

- **Row:** `engine/rules/vivaha.json › hard chaturmas` (relaxable), source `[S]; no Chaturmas bar in Tamil practice [M]`.
- **What the engine does:** Devshayani to Devutthani Ekadashi blocks weddings and house entry for every region; "Relaxed" strictness turns it into −30.
- **Question:** confirm that Tamil (and Kerala / Telugu?) muhurta practice does not observe the Chaturmas bar on weddings, so the South preset can switch the row off automatically rather than via "Relaxed".
- **What would change:** a `regions` filter on the row (the pack loader does not have one yet; a one-line addition).

## 12. Abujha (self-proven) muhurta days

- **Row:** `engine/data/yogas.json › abujha.days` (Akshaya Tritiya, Vijaya Dashami, Devutthani Ekadashi, Vasant Panchami, Phulera Dooj, Bhadali Navami), source `[M]`.
- **What the engine does:** flags those days; the vyapara pack gives +15; other packs ignore the flag.
- **Question:** which days are abujha in your tradition, and for which works (weddings on Phulera Dooj and Devutthani Ekadashi in UP/Rajasthan; business on Akshaya Tritiya and Dhanteras)? Should an abujha day override Guru/Shukra asta (most pandits say no)?
- **What would change:** the day list and per-event weights; never the asta blocks.

## 13. Sankranti punya kaal and the avoided window

- **Row:** `engine/data/yogas.json › sankranti` (Makara/Karka 3 days either side, Mesha/Tula 1 day, others 30 ghatis; punya kaal 16 ghatis after ingress `[M]`); `festivals.json › makar_sankranti` window.
- **What the engine does:** blocks beginnings inside the window (relaxable) and shows a 16-ghati punya kaal after the Makara ingress (next civil day when the ingress is after sunset).
- **Question:** is the punya kaal 16 ghatis (jyotishkalpadrum) or 6 hours 24 minutes as some printed panchangs use, and does it start at the ingress or at the following sunrise when the ingress is at night? Raman gives 16 ghatis either side for every sankranti; Dharmasindhu differs by rashi; which do you follow?
- **What would change:** `punyaKaalGhatis` and the `avoidGhatisOther` / `avoidDaysByRashi` table.

## 14. Eclipse sutak hours and local visibility

- **Row:** `engine/data/yogas.json › eclipse` (3 days before, 7 after; sutak 12 h solar / 9 h lunar; only locally visible solar eclipses `[M]`).
- **What the engine does:** `eclipse_day` is a hard block; the ±3/7-day window is relaxable; sutak hours are stored but not yet shown.
- **Question:** confirm the sutak lengths (Dharmasindhu: solar 4 prahara, lunar 3 prahara) and that an eclipse not visible at the place has no sutak and no window. Should the 3/7-day window apply to lunar eclipses too?
- **What would change:** the numbers and the visibility test in `engine/flags.ts` (the local-visibility search already exists in `engine/astro.ts`).

## 15. Pradosha length

- **Row:** `engine/data/kala.json › pradosha` (festival window 6 ghatis after sunset, vrata window 3 ghatis), source `[CONFLICT] … [M]`.
- **What the engine does:** Diwali Lakshmi puja and Dhanteras use the 6-ghati window (sunset + 2 h 24 min, which matches Drik); Pradosha vrata uses 3 ghatis.
- **Question:** Nirnayasindhu gives 3 ghatis for pradosha; digests give 6. Which applies to Lakshmi puja, and should the vrata window be 3 ghatis before and after sunset (some texts) rather than 3 after?
- **What would change:** `festivalGhatis` / `vrataGhatis`.

## 16. Sandhya kaalas

- **Row:** `engine/data/kala.json › sandhya` (1 ghati either side of sunrise, noon and sunset), source `[M]`.
- **What the engine does:** computed and listed as informational windows; no pack penalises them.
- **Question:** should sandhya be a soft penalty for beginnings (Dharmasindhu), and is it 1 ghati, 2 ghatis or 3 ghatis each side?
- **What would change:** the ghati count and an optional soft row.

## 17. Parigha first half and the nine avoided yogas

- **Row:** `engine/data/yogas.json › yogaFlags` (avoid Vyatipata 17 and Vaidhriti 27; bad Vishkambha 1, Atiganda 6, Shula 9, Ganda 10, Vyaghata 13, Vajra 15, Parigha 19 first half), source `[S] … Parigha first half bad [M]`.
- **What the engine does:** Vyatipata/Vaidhriti are hard blocks for vivaha; the others are −10; Parigha counts only in its first half.
- **Question:** confirm the first-half rule for Parigha, and whether Vishkambha, Vajra and Vyaghata are bad only in their first 3, 5 and 9 ghatis respectively (as several panchangs print) rather than throughout.
- **What would change:** per-yoga "bad ghatis" in the table instead of the boolean.

## 18. Gujarati samvatsara name

- **Row:** `engine/panchanga.ts › samvatsara()` (Gujarati name = north name − 1, and a further −1 while the Gujarati year number lags), comment `UNVERIFIED past 2026`; `engine/names.ts › SAMVATSARA_NAMES`.
- **What the engine does:** VS 2082 (Gujarati, until Diwali 2026) = Pingala and VS 2083 (north) = Siddharthi, both matching Drik Panchang for 2026; the offset is extrapolated for other years.
- **Question:** which Jovian name does a Gujarati (Kartikadi) panchang print for VS 2083 (from Bestu Varas 2026) and VS 2084? Any printed Kalnirnay/Janmabhoomi panchang settles this.
- **What would change:** the offset formula; the sankalpa line for the west preset.

## 19. Yatra: Wednesday in the north and Chandra vasa

- **Row:** `engine/rules/general.json › events.yatra` source `… (Wed north [CONFLICT]); Chandra vasa [M]`.
- **What the engine does:** Wednesday is a good day for travel; direction rules (Yogini, Chandra vasa) are stored in `directions` and shown as a caveat, not scored.
- **Question:** is travel north on Wednesday barred (Disha shula says Wednesday = north), and do you want Chandra vasa (Moon's direction by rashi) applied as a penalty for the travel direction?
- **What would change:** scored direction rules (needs a direction input in the app).

## 20. Govardhan / Bestu Varas as the Gujarati new year

- **Row:** `engine/data/festivals.json › govardhan` note `gujarati_new_year`, source `[M]` for the Kartikadi year; `panchanga.ts` Kartikadi roll-over.
- **What the engine does:** the Gujarati Vikram Samvat number increments on Kartika Shukla 1 (amanta), the udaya tithi.
- **Question:** confirm Kartika Shukla 1 (not Diwali itself) and the udaya rule when Pratipada is a kshaya tithi.
- **What would change:** nothing unless the kshaya case is handled differently.

---

### Also unverified but outside a single row

- Drik Panchang's printed Lahiri ayanamsa runs about 16″ ahead of Swiss Ephemeris `SE_SIDM_LAHIRI`; sankranti instants differ by ≈ 4 minutes. The engine follows Swiss Ephemeris (documented in About). A jyotishi who prefers Drik's value can say so; it is a one-number change in `engine/astro.ts`.
- Lagna (ascendant), the 21 mahadoshas of the wedding lagna, sthira lagna for Diwali, night Rahu kaal (South), partner bala, Vaishnava Ekadashi, and Vakya/Thirukanitha modes are **not computed** yet. The report says so on its caveats list.

Thank you. Every answer here improves a row that thousands of families will read, and the engine is MIT so the
change is public and attributable.
