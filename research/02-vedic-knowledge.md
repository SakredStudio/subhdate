# SubhDate research 02: Vedic knowledge base for a muhurta engine

Compiled 2026-10-15 from ~60 web lookups (archive.org, wisdomlib, Wikipedia, Drik Panchang, Dekho Panchang, Kamakoti Dharmasindhu digest, Heidelberg EJVS, arXiv, mailing-list archives, blogs quoting B.V. Raman and Muhurta Chintamani). Written for the developer who will encode rules. Precision over prose.

## 0. How to read this document

Confidence tags used on every rule:

- `[P]` primary or near-primary text located online (Sanskrit text, a scholarly translation, or a site quoting the verse).
- `[S]` secondary (panchang sites, blogs). Two or more independent secondary sources agreeing.
- `[S1]` a single secondary source. Encode behind a feature flag; verify with a pandit before shipping as a hard block.
- `[M]` from the researcher's own prior knowledge, not re-verified in this pass. Treat as a hypothesis; verify against Muhurta Chintamani (Sanskrit text on archive.org, link in section 1) before encoding.
- `[CONFLICT]` sources disagree; both readings are given, pick one and expose it as a "tradition" setting.

Two design principles that fall out of the research:

1. Almost every rule has a regional variant (North/Purnimanta vs South/Amanta, Vakya vs Drik, Raman vs Muhurta Chintamani numbering). Encode rules as data (JSON tables keyed by `tradition`), never as hard-coded conditionals.
2. The tradition itself ranks factors. For marriage the texts explicitly say weekday matters least; Guru/Shukra asta and Bhadra are the hardest blocks. Score, do not just filter.

---

## 1. Lineage of the knowledge

### 1.1 Vedanga Jyotisha (Lagadha), c. 1400-1200 BCE internal date, extant text last centuries BCE

What it is: the oldest surviving Indian astronomical text, two recensions (Rig, 36 verses; Yajur, 43/44 verses). Purpose is purely calendrical: fix the time of yajnas. Uses mean (average) motions only. `[P]` https://en.wikipedia.org/wiki/Vedanga_Jyotisha ; https://arxiv.org/pdf/physics/0101063 (Abhyankar, "Birth and Early Development of Indian Astronomy").

What it says about time:
- A yuga = 5 solar years = 62 synodic months (2 intercalary) = 1830 civil days = 1860 tithis. `[P]` (Wikipedia; arXiv)
- Yuga begins at new moon in Dhanishtha (Shravishtha) at winter solstice, first day of Magha. `[P]`
- Tithi = 1/30 of a lunar month; one tithi dropped every 61 days (kshaya); an extra nakshatra added every 3,279 days. `[P]`
- The Yajur recension lists the nakshatras from Krittika and gives their deities (the same list that Taittiriya texts use). `[S]`
- Famous verse on jyotisha being the "eye"/crest of the Vedas: RVJ 35-36 / YVJ 3-4 (numbering varies). A 2021 AAV paper (Monkiewicz) quotes RJV "jyotisa distinguishes itself among the limbs of the Veda, as do the crests of peacocks and the jewels on the heads of nagas". `[P]` https://archive.aav.iksio.pan.pl/aav_2021_34_09_Monkiewicz.pdf
- The preceding verse (from memory, `[M]`, verify in T.S. Kuppanna Sastry's 1985 INSA edition): "vedā hi yajñārtham abhipravṛttāḥ kālānupūrvyā vihitāś ca yajñāḥ / tasmād idaṃ kālavidhānaśāstraṃ yo jyotiṣaṃ veda sa veda yajñān" -- the Vedas exist for yajna, yajnas are ordained by time-sequence, therefore this science of time-ordinance; one who knows jyotisha knows the yajnas. This is the single best "why muhurta exists" line for app copy.

What is unique: it is the proof that the five-limbed panchanga (tithi, nakshatra, parvan) is the original purpose of Indian astronomy. No planets, no horoscopes.

### 1.2 Rig Veda, Atharva Veda, Taittiriya Samhita/Brahmana, Shatapatha Brahmana

- Rig Veda uses "muhurta" only as "moment" (RV 3.33.5, 3.53.8). `[P]` https://en.wikipedia.org/wiki/Muhurta
- RV 10.85 (Surya's bridal hymn) names the wedding stars Agha (= Magha) for the cattle-gift and Arjuni (= Phalguni) for the bride's departure (RV 10.85.13). `[M]` Wedding-star symbolism goes back to the Rig Veda itself; the Uttara Phalguni wedding of Rama (below) continues it.
- Atharva Veda 19.7 gives a 28-nakshatra list beginning with Krittika (spring equinox then in Krittika), with Abhijit as the 28th. `[P]` https://en.wikipedia.org/wiki/Nakshatra ; arXiv physics/0101063
- Taittiriya Samhita 4.4.10 and Taittiriya Brahmana 1.5.1 and 3.1.1-3.1.4 give the nakshatras with presiding deities, Krittika first. TB 3.1 is the "Nakshatra Sukta" (Nakshatreshti) still chanted; the devata assignments in section 4 come from it. Deity variants: TB 1.5.1 gives Indra for both Chitra and Shatabhisha where TB 3.1 gives Tvashtar and Varuna. `[P]` https://hasp.ub.uni-heidelberg.de/journals/ejvs/article/download/1522/10436/23236 (EJVS table) ; https://vedicmarga.com/nakshatra-mantras/
- Taittiriya Brahmana lists 15 muhurta names (samjnanam ... bhutam); Shatapatha Brahmana 10.4.2.18 defines a muhurta as 1/15 of a day (older), Manusmriti 1.64 as 1/30 of a day-night (the convention used today). `[P]` https://en.wikipedia.org/wiki/Muhurta
- Shatapatha Brahmana 2.1.2.3: the Krittikas "rise in the east" (hence the Krittika-first order). `[P]` https://sacred-texts.com/hin/sbr/sbe12/sbe1241.htm

### 1.3 Surya Siddhanta (c. 4th-5th c. CE core, revised to ~1000 CE)

Astronomy, not muhurta: mean motions, true places, ahargana (day-count from epoch), tithi/nakshatra/yoga/karana as defined fractions of longitude, eclipses, rising/setting, declination (kranti), Vyatipata/Vaidhriti (Sun and Moon at equal declination). English: Burgess 1860 (American Oriental Society, JAOS vol. 6), reprinted Calcutta 1935 ed. Gangooly with Sengupta intro. `[P]` https://bibbase.org/network/publication/burgess-translationofthesryasiddhntaatextbookofhinduastronomywithnotesandanappendix-1860 ; sacred-texts hosts the Burgess text (not fetched this pass).

Developer note: Surya Siddhanta constants are what printed Vakya/Siddhanta panchangams still use; Drik panchangams keep its *definitions* but take positions from modern ephemerides. The Surya Siddhanta ayanamsa zero is at 499 CE (Mesha Sankranti), which conflicts with Lahiri's 285 CE epoch; this is the root of the Vakya-vs-Drik date differences. `[S]` https://github.com/webresh/drik-panchanga (README); https://www.scribd.com/document/411316280/a

### 1.4 Brihat Samhita (Varahamihira, 6th c. CE)

Encyclopaedic "samhita" branch: omens, architecture, gems, and the chapters that muhurta later systematised: nakshatra qualities and activities (Nakshatra-karma-guna, ch. 98 in Bhat's numbering), tithi-karma (ch. 99), karana (ch. 100), rules on weekday activities, Sun's transit. Bhat says marriages avoid Sunday and Tuesday; Sunday = gold, medicine, fire, weapons, sovereign business; Monday = water, flowers, gems, clothes, women, auspicious ceremonies. `[S]` (quoted at https://dekhopanchang.com/en/learn/vara ). Full English: M. Ramakrishna Bhat (MLBD) and Chidambaram Iyer on archive.org; Sanskrit with Bhattotpala commentary also on archive.org. `[P]` https://archive.org/details/brihatsamhitawithenglishtranslationramakrishnabhattm.part1mlbd_305_s ; https://archive.org/details/brihatsamhitaenglishtranslationchidambaramiyersatgurupublications_567_i ; https://www.wisdomlib.org/hinduism/book/brihat-samhita

Unique: the seven-fold nakshatra nature classification (Dhruva/Chara/Ugra/Mishra/Kshipra/Mridu/Tikshna) in the form every later text copies.

### 1.5 Muhurta Chintamani (Rama Daivajna, 1600 CE, Varanasi) -- THE standard

Twelve prakaranas: Shubhashubha (good/bad panchanga elements), Samskara (childhood rites: jatakarma, namakarana, annaprashana, chudakarana), Upanayana, Vivaha, Pratishtha, Griharambha/Griha-pravesha, Yatra, Rajyabhisheka, Vastu, etc. Rama's own commentary Piyusha-dhara; brother Nilakantha Daivajna wrote Tajika Nilakanthi. `[S]` https://en.wikipedia.org/wiki/Nilakantha_Daivajna ; https://paramarsh.app/patrika/muhurta-timing/muhurta-complete-guide

Online text: Sanskrit with Hindi commentary by Mahidhar Sharma: https://archive.org/details/muhurta-chintamani-of-daivagya-ramacharya-mahidhar-sharma `[P]`. English: "Daivagya Acharya Shriram's Muhurta Chintamani" (Girish Chand Sharma, Sagar) https://openlibrary.org/books/OL641457M/ `[S]`.

Unique and load-bearing for the app: the Vivaha prakarana's Ekavimshati Mahadoshas (21 great evils), the Siddha-yoga tithi-vara table, Sarvartha-siddhi vara-nakshatra table, Bhadra residence (swarga/patala/martya), and the Lagna-shuddhi rules. The Kashinath Upadhyaya Dharmasindhu and later panchangs cite it as authority.

### 1.6 Muhurta Martanda (Narayana Daivajna / Narayana Bhatta son of Ananta, 1572 CE)

Eleven prakaranas; first chapter lists days to avoid for auspicious work; covers samskaras including the pre-marriage vagdana and vivaha. Commentary Martanda-vallabha. Scans: https://archive.org/details/muhurta-martanda ; https://archive.org/details/in.ernet.dli.2015.406100 `[P]`. https://www.wisdomlib.org/definition/muhurtamartanda `[S]`. Unique: slightly earlier than Chintamani and often quoted where Chintamani is silent (e.g. Kharmas/Dhanur-masa, Adhika-masa prohibitions).

### 1.7 Muhurta Ganapati

Authorship uncertain: listings give Keshava Daivajna or Harishankar Suri. `[CONFLICT]` https://www.exoticindiaart.com/book/details/muhurta-ganapati-nai673/ . Used by North Indian pandits as a third opinion. Treat as corroborating, not primary.

### 1.8 Kalaprakashika (Nrisimha Suri / Nrisimhadeva Shastri; South Indian, 40-53 adhyayas in manuscripts)

"The standard book on the election (muhurtha) system" per its English edition by N.P. Subramania Iyer (Asian Educational Services 1982 reprint). The South Indian counterpart of Muhurta Chintamani; heavy use of Tarabala, Chandrabala, Lagna-tyajya and the 21 doshas. `[P]` https://find.library.upenn.edu/catalog/99549573503681 ; manuscripts at IFP Pondicherry https://digitalcollections.ifpindia.org/s/manuscripts/item/396969 . No free scan located; B.V. Raman's "Muhurtha" (1936) is essentially a digest of Kalaprakashika and is online: http://www.panchanga.lv/wp-content/uploads/2020/06/Muhurta_Raman.pdf `[P]`.

### 1.9 Vivaha Patala

A marriage-specific muhurta tract (attributed variously to Pitamaha or to a Jain author). Not located online in this pass. `[M]` Treat as a name to cite, not a source to encode from.

### 1.10 Dharmasindhu (Kashinatha Upadhyaya, 1790) and Nirnayasindhu (Kamalakara Bhatta, 1612)

Ritual-calendar law (dharmashastra), not jyotisha: when a festival or rite is observed given tithi overlap, the nine classical day-windows (arunodaya, pratah, sangava, madhyahna, aparahna, sayahna, pradosha, nishita, etc.), purva-viddha vs para-viddha rules, Ekadashi anchored at arunodaya, Janmashtami at nishita, Dhanteras' Yamadeepa in pradosha. Dharmasindhu is a condensed derivative of Nirnayasindhu and is binding for Maharashtra/Deccan smartas. `[S]` https://advaita-vedanta.org/archives/advaita-l/2010-March/023832.html ; https://dekhopanchang.com/learn/modules/5-3 ; https://r-astro.com/blog/dhanteras-nirnaya-pradosha . English digest of Dharmasindhu chapter by chapter: https://www.kamakoti.org/kamakoti/dharmasindhu/bookview.php?chapnum=21 (Vivaha) `[P-digest]`. Unique: this is where festival-date logic lives (the app's "festival" layer should follow Dharmasindhu, not muhurta texts).

### 1.11 Rajamartanda (Bhoja, 11th c.)

Warning: the text indexed under this name online is Bhoja's Ayurvedic Rajamartanda. A jyotisha Rajamartanda by Bhoja is cited in muhurta commentaries (Piyushadhara quotes "Rajamartanda" for tithi rules) but no digital copy located. `[CONFLICT]` https://en.wikipedia.org/wiki/R%C4%81jam%C4%81rta%E1%B9%87%E1%B8%8Da . Cite only via Muhurta Chintamani commentary.

### 1.12 Jyotisha Ratnamala (Shripati, c. 1039 CE)

A muhurta compendium of 20 chapters by the mathematician-astrologer Shripati; manuscript at Raghunath Temple Jammu, scan via eGangotri. `[P-scan]` https://archive.org/details/JyotishRatnaMalaShripatiBhat859GhaAlm4Shlf5DevanagariJyotish . Unique: the earliest systematic muhurta text after Varahamihira; source for the Nanda/Bhadra/Jaya/Rikta/Purna tithi grouping (Indology list could not find an older classical reference). `[S]` https://list.indology.info/pipermail/indology/2022-March/055883.html

### 1.13 Brihat Parashara Hora Shastra

Natal (hora) text, 97 chapters in Santhanam's edition. It has no electional chapter; relevant chapters are "Evils at Birth" and "Antidotes" (gandanta, Moola birth, Amavasya birth shanti). `[S]` https://en.wikipedia.org/wiki/Brihat_Parashara_Hora_Shastra ; https://archive.org/stream/ParasharaHoraSastra/BrihatParasharaHoraSastraVedicAstrologyEbook_djvu.txt . Use BPHS for: janma nakshatra/rashi derivation, the nine-planet nakshatra lordship (Vimshottari) sequence, Gandanta definitions. Do not cite it for muhurta rules.

---

## 2. The panchanga machine

### 2.1 Core definitions (all sidereal unless noted)

Let `Ls` = Sun's sidereal longitude, `Lm` = Moon's sidereal longitude (degrees, 0-360), computed from an ephemeris minus ayanamsa.

| Limb | Definition | Formula | Count | Source |
|---|---|---|---|---|
| Tithi | Time for Moon-Sun elongation to grow 12 deg | `tithi = floor(((Lm - Ls) mod 360) / 12) + 1` (1..30; 1-15 Shukla, 16-30 Krishna; 15 = Purnima, 30 = Amavasya) | 30 | `[P]` https://en.wikipedia.org/wiki/Tithi |
| Nakshatra | Moon's 13 deg 20' arc | `nak = floor(Lm / (360/27)) + 1`; pada = `floor((Lm mod 13.3333)/3.3333)+1` | 27 (28 with Abhijit 276 deg 40' - 280 deg 53' 20") | `[P]` https://en.wikipedia.org/wiki/List_of_Nakshatras |
| Yoga (nitya yoga) | Sum of longitudes in 13 deg 20' arcs | `yoga = floor(((Lm + Ls) mod 360) / 13.3333) + 1` | 27 | `[M]` standard; see yoga names below |
| Karana | Half a tithi (6 deg) | `k = floor(((Lm - Ls) mod 360) / 6)` (0..59) then table below | 11 names, 60 slots | `[M]` standard |
| Vara | Weekday, sunrise to sunrise | weekday of the civil date on which that sunrise falls | 7 | `[P]` Drik FAQ |

Tithi duration ranges 19h59m to 26h47m (mean 23h37m), so kshaya (skipped) and vriddhi (repeated) tithis occur. `[P]` Wikipedia Tithi; https://dekhopanchang.com/learn/tithis

27 yoga names in order `[M]`: 1 Vishkambha, 2 Priti, 3 Ayushman, 4 Saubhagya, 5 Shobhana, 6 Atiganda, 7 Sukarma, 8 Dhriti, 9 Shula, 10 Ganda, 11 Vriddhi, 12 Dhruva, 13 Vyaghata, 14 Harshana, 15 Vajra, 16 Siddhi, 17 Vyatipata, 18 Variyan, 19 Parigha, 20 Shiva, 21 Siddha, 22 Sadhya, 23 Shubha, 24 Shukla, 25 Brahma, 26 Indra, 27 Vaidhriti. Inauspicious for beginnings: 1, 6, 9, 10, 13, 15, 17, 19, 27 (Raman's list: 6, 9, 10, 17, 27 "extremely bad"; the nine-yoga Ekargala list adds 1, 13, 15, 19). `[S]` https://www.astroshastra.com/Muhurta/muhurta.php ; http://www.panchanga.lv/wp-content/uploads/2020/06/Muhurta_Raman.pdf . Also Parigha: first half bad, second half acceptable `[M]`.

Karana mapping (`k` = 0..59 from the formula above) `[M]`, consistent with all panchang outputs checked:

```
k == 0        -> Kimstughna      (fixed; 1st half of Shukla Pratipada)
1 <= k <= 56  -> movable[(k-1) mod 7] where movable = [Bava, Balava, Kaulava, Taitila, Gara, Vanija, Vishti]
k == 57       -> Shakuni         (fixed; 2nd half of Krishna Chaturdashi)
k == 58       -> Chatushpada     (fixed; 1st half of Amavasya)
k == 59       -> Naga            (fixed; 2nd half of Amavasya)
```

Vishti (Bhadra) therefore falls at k = 7, 14, 21, 28, 35, 42, 49, 56, i.e. second half of Shukla 4, first half of Shukla 8, second half of Shukla 11, first half of Purnima, second half of Krishna 3, first half of Krishna 7, second half of Krishna 10, first half of Krishna 14. Encode this as derived, not as a lookup.

### 2.2 Sunrise-based day and the udaya rule

- The Hindu day (vara) runs sunrise to sunrise. The tithi, nakshatra, yoga, karana "of the day" is whichever prevails at sunrise (udaya-vyapini); panchangs print *end* times. `[P]` https://www.drikpanchang.com/faq/faq-ans1.html
- Drik Panchang default sunrise: upper limb of the Sun with atmospheric refraction, no elevation; it offers a "middle limb" setting and notes there is no consensus among panchang makers; Varahamihira: "visibility of the sun's limb is the rising time". `[P]` https://www.drikpanchang.com/panchang/sunrise/panchang-sunrise.html . Ottawa example 2026-10-15: edge 07:19 / 18:17, middle limb 07:21 / 18:16.
- Older Drik FAQ (Hindi) describes the "Hindu sunrise" as geometric center on horizon ignoring refraction (adds 16' semidiameter and 34' refraction to the observed time). `[CONFLICT]` between Drik pages; the live site uses upper-edge-with-refraction. Expose `sunriseModel: "upperLimbRefracted" | "centerNoRefraction"`.
- Swiss Ephemeris: use `swe_rise_trans` with `SE_CALC_RISE | SE_BIT_DISC_CENTER` (center) or default (upper limb), `SE_BIT_NO_REFRACTION` to toggle. `[M]`

### 2.3 Months: Amanta vs Purnimanta, Adhika and Kshaya masa

- Amanta: month ends at Amavasya (South and West India: Gujarat, Maharashtra, Karnataka, Andhra, Tamil lunar reckoning, also Bengal's lunar months, Nepal's lunar months). Purnimanta: month ends at Purnima (UP, Bihar, MP, Rajasthan, Himachal, Punjab plains). Both agree on the Shukla paksha name; a Krishna paksha has the *next* month's name in Purnimanta (Janmashtami = Bhadrapada Krishna 8 in Purnimanta, Shravana Krishna 8 in Amanta). `[S]` https://hindutone.com/festivals/amanta-vs-purnimanta-explained/ ; https://www.muhuratam.in/blog/amanta-vs-purnimanta
- Month name rule (Amanta): the lunar month is named for the solar rashi the Sun enters (sankranti) during it: Mesha sankranti -> Chaitra ... Meena sankranti -> Phalguna. `[S]` https://dekhopanchang.com/en/learn/masa
- Adhika masa: an Amanta lunar month containing *no* sankranti. It takes the name of the following regular month with prefix Adhika (e.g. Adhika Shravana precedes Nija Shravana). In Purnimanta reckoning the extra month is inserted as: first half of month X, Adhika X, second half of X. `[P]` https://en.wikipedia.org/wiki/Adhika-masa ; https://dekhopanchang.com/en/learn/masa
- Kshaya masa: a lunar month containing two sankrantis (only possible near perihelion, Nov-Feb); always accompanied by two adhika months, one before, one after, in the same year. Rare (c. every 19-141 years). `[P]` Wikipedia Adhika-masa.
- Adhika masa is called Mala masa / Purushottama masa; all shubha karya (marriage, upanayana, griha pravesha) are barred; vratas and dana encouraged. `[S]` https://panchangbodh.com/hi/adhika-masa-guide . Dharmasindhu: a Chaitra marriage in Mala masa is "risky for the husband", a Kshaya masa marriage "risky for the bride". `[P-digest]` kamakoti ch. 21.

Algorithm (Amanta): for each Amavasya-to-Amavasya interval compute rashi of Sun at each end; if same rashi -> adhika, name = rashi+1's month; if two rashi boundaries crossed -> kshaya handling. `[M]`

### 2.4 Ayanamsa and sidereal vs tropical

- Lahiri (Chitrapaksha): Spica (Chitra) fixed at 180 deg 00' sidereal (0 deg Libra). Calendar Reform Committee (CSIR, chaired by Meghnad Saha, set up 1952, report 1955; N.C. Lahiri member) adopted 23 deg 15' 00" as the ayanamsa (for 21 March 1956 per the Indian Ephemeris; verify exact epoch). Zero-ayanamsa epoch c. 285 CE. Value for 2026 is about 24 deg 13', growing ~50.3"/yr. `[S]` https://dekhopanchang.com/en/learn/modules/4-2 ; https://r-astro.com/blog/lahiri-ayanamsa ; https://cahc.jainuniversity.ac.in/assets/ijhs/Vol45_4_2_ASharan.pdf
- Swiss Ephemeris: `swe_set_sid_mode(SE_SIDM_LAHIRI)`; Drik Panchang states it uses Lahiri (Chitrapaksha). Other options the app may need to expose: Raman, KP (Krishnamurti), True Chitra, Surya Siddhanta (Vakya). `[M]`
- Tropical (sayana) is used only for: sunrise/sunset geometry, Sankranti in the *national* calendar (Saka calendar is tropical) and for the Uttarayana/Dakshinayana astronomical solstice. Everything in muhurta is nirayana. Makara Sankranti (nirayana) therefore drifts ~1 day per 72 years from the solstice. `[S]` arXiv 1007.0062 "Calendars of India".

### 2.5 Regional systems (what the app must switch on)

| Region / system | Year | Month type | Month-start rule | Notes / source |
|---|---|---|---|---|
| North India (UP, Bihar, MP, Rajasthan, HP, Punjab) | Vikram Samvat, Chaitradi | Lunar Purnimanta | Krishna Pratipada after Purnima | Festivals from Dharmasindhu/Nirnayasindhu; Panchak strictly observed. `[S]` |
| Gujarat | Vikram Samvat, Kartikadi (new year day after Diwali) | Lunar Amanta | Shukla Pratipada | Choghadiya culture; Gujarati "Vikram" year number is one less than North's between Chaitra and Kartik. `[M]` |
| Maharashtra, Karnataka, Andhra, Telangana | Shalivahana Shaka, Chaitradi (Gudi Padwa / Ugadi) | Lunar Amanta | Shukla Pratipada | Date-Panchang (Marathi), Ontikoppal (Kannada), Gantala (Telugu). `[S]` |
| Tamil Nadu | Tamil solar year (Chithirai 1 = Mesha sankranti); 60-year Prabhava cycle | Solar | Drik Panchang rule: sankranti after sunrise and before sunset -> same day; after sunset -> next day. `[P]` https://www.drikpanchang.com/festivals/puthandu/tamil-newyear-date-time.html | Vakya vs Thirukanitha split (see 6.1). |
| Kerala | Kollam era (Chingam 1 = Simha sankranti) | Solar | Month begins the same day if sankranti is before aparahna (traditionally the first 3/5 of daylight, `[M]` for the fraction); otherwise next day. `[S]` https://en.wikipedia.org/wiki/Malayalam_calendar | Mathrubhumi and Deepika panchangams. |
| Bengal, Assam, Tripura | Bangabda (Pohela Boishakh = Mesha sankranti) | Solar (Surya Siddhanta based) | Sankranti ends a month; next day begins the new one (Bangladesh uses a reformed fixed calendar). `[S]` https://en.wikipedia.org/wiki/Bengali_calendar | Beni Madhab Sil / Gupta Press / Vishuddha Siddhanta panjikas; Vishuddha Siddhanta is Drik-based, the others Surya Siddhanta. https://en.wikipedia.org/wiki/Vishuddha_Siddhanta_Panjika |
| Odisha | Solar (Pana Sankranti) with Purnimanta lunar | Mixed | sankranti-based | `[S]` https://en.wikipedia.org/wiki/Pana_Sankranti |
| Nepal | Bikram Sambat, Baisakh 1 = Mesha sankranti | Solar civil + Amanta lunar for festivals | Gazette-published; no simple cutoff hour reproduces it exactly (one open-source test found gazette dates off by a day from a Surya-Siddhanta model). `[S]` https://github.com/kitsuyui/hyper-calendar/pull/95 | Use the government gazette table, not a formula. |
| Punjab (Sikh) | Nanakshahi (tropical, fixed) | Solar | fixed dates | Out of scope. `[M]` |

### 2.6 Day divisions

All formulas use `D = sunset - sunrise` (day length) and `N = nextSunrise - sunset` (night length) for the location.

#### 2.6.1 Rahu Kaal, Yamaganda, Gulika Kaal (1/8 divisions)

Daytime segment (1 = first eighth after sunrise). `[S]` https://hindutone.com/astrology/rahu-kalam-yamagandam-gulika-kalam-explained/ ; https://dekhopanchang.com/en/learn/rahu-kaal

| Weekday | Rahu Kaal | Yamaganda | Gulika |
|---|---|---|---|
| Sunday | 8 | 5 | 7 |
| Monday | 2 | 4 | 6 |
| Tuesday | 7 | 3 | 5 |
| Wednesday | 5 | 2 | 4 |
| Thursday | 6 | 1 | 3 |
| Friday | 4 | 7 | 2 |
| Saturday | 3 | 6 | 1 |

Mnemonic for Rahu: "Mother Saw Father Wearing The Turban Suddenly" = Mon 2, Sat 3, Fri 4, Wed 5, Thu 6, Tue 7, Sun 8. Night Rahu kaal exists in some South Indian panchangs (night divided into 8, different table) `[S1]`; most apps show day only. Underlying logic `[P]` (Wikipedia Upagraha, Phaladeepika ch. 25): the eight day-parts are lorded in order starting from the weekday lord through Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn; the 8th part is lordless. Gulika = Saturn's part; Yamaganda = Jupiter's part; Rahu kaal is the folk extension.

Upagraha longitudes (for Lagna-level checks): Gulika/Mandi lagna = ascendant at start of Saturn's part (day) or at start of Saturn's part counted from the 5th weekday lord (night); Kala = Sun's part, Mrityu = Mars', Ardhaprahara = Mercury's, Yamaghantaka = Jupiter's. `[P]` https://en.wikipedia.org/wiki/Upagraha ; Mandi vs Gulika night computation differs between schools `[CONFLICT]`.

#### 2.6.2 Abhijit muhurta

8th of the 15 day-muhurtas: `noon = (sunrise + sunset)/2`, window = `noon - D/30` to `noon + D/30` (about 24 min each side). Deity Vishnu. Not used on Wednesday (Budhavara). `[S]` https://dekhopanchang.com/en/learn/muhurtas . Also treated as the 28th nakshatra (276 deg 40' - 280 deg 53' 20", last quarter of Uttarashadha plus first 1/15 of Shravana), lord Vishnu, used in Kshipra class and in the Ekargala count. `[P]` Wikipedia List of Nakshatras.

#### 2.6.3 Brahma muhurta

The 29th of 30 muhurtas, i.e. the second-last muhurta of night: starts `nextSunrise - 2*(N/15)` (about 96 min before sunrise) and lasts one night-muhurta (48 min at equinox); some sites extend to sunrise. `[S]` Wikipedia Muhurta; dekhopanchang muhurtas.

#### 2.6.4 The 30 muhurtas (15 day, 15 night), names, lords, quality

Length: `D/15` by day, `N/15` by night. Names per Wikipedia (Muhurta) and dekhopanchang, lords per dekhopanchang and the Taittiriya tradition. `[S]`

| # | Name | Lord | Quality |
|---|---|---|---|
| 1 | Rudra | Rudra | bad |
| 2 | Ahi | Sarpa | bad |
| 3 | Mitra | Mitra | good |
| 4 | Pitri | Pitris | bad |
| 5 | Vasu | Vasus | good |
| 6 | Varaha (Vara/Ambu) | Varaha/Apah | good |
| 7 | Vishvedeva | Vishvedevas | good |
| 8 | Vidhi / Abhijit | Brahma (Vishnu) | good except Wed |
| 9 | Satamukhi (Sutamukhi) | -- | good |
| 10 | Puruhuta | Indra | bad (Raman) / good (dekho) `[CONFLICT]` |
| 11 | Vahini | Agni | bad |
| 12 | Naktanakara / Nirriti | Nirriti | bad |
| 13 | Varuna | Varuna | good |
| 14 | Aryaman | Aryaman | good except Sunday |
| 15 | Bhaga | Bhaga | bad (Raman) / good (dekho) `[CONFLICT]` |
| 16 | Girisha | Shiva | bad |
| 17 | Ajapada | Aja Ekapada | bad |
| 18 | Ahirbudhnya | Ahirbudhnya | good |
| 19 | Pushya / Pusha | Pushan | good |
| 20 | Ashvini | Ashvins | good |
| 21 | Yama | Yama | bad |
| 22 | Agni | Agni | bad (Raman) / good (dekho) `[CONFLICT]` |
| 23 | Vidhatri | Vidhata | good |
| 24 | Kanda | -- | good |
| 25 | Aditi | Aditi | good |
| 26 | Jiva / Amrita | Brihaspati | very good |
| 27 | Vishnu | Vishnu | good |
| 28 | Dyumadgadyuti | -- | good |
| 29 | Brahma | Brahma | very good (Brahma muhurta) |
| 30 | Samudra | Samudra | good |

Durmuhurta (Muhurta Chintamani via Raman, dosha #7/#13): generally bad = Rudra, Ahi, Pitri, Puruhuta, Vahni, Nirriti, Bhaga, Girisha, Ajapada, Yama, Agni; plus weekday-specific: Sun + 14th (Aryaman); Mon + 12th (Nirriti) and 9th (Vidhata; sic, see conflict); Tue + 4th (Pitri) and 11th (Vahni); Wed + 8th (Abhijit); Thu + 6th (Ambu) and 12th (Nirriti); Fri + 4th (Pitri) and 9th (Vidhata); Sat + 1st (Rudra) and 2nd (Ahi). `[P-via-Raman]` https://jyotishkalpadrum.blogspot.com/2013/01/21-great-evils-ekavimsati-mahadoshas-21.html . Drik Panchang's daily "Dur Muhurtam" uses exactly this weekday table (two windows on Mon/Tue/Thu/Fri/Sat, one on Sun/Wed). `[M]`

#### 2.6.5 Choghadiya (8 per day, 8 per night; Gujarat/Rajasthan/Maharashtra)

Each = `D/8` or `N/8` (about 4 ghati, hence "chaturghatika"). `[P]` https://www.drikpanchang.com/tutorials/muhurat/daily/choghadiya-muhurat.html

Planet -> name: Sun Udveg (bad; govt work), Moon Amrit (good; all), Mars Rog (bad; war/debate), Mercury Labh (good; business/education), Jupiter Shubh (good; marriage/religious), Venus Char (good; travel), Saturn Kaal (bad; wealth-accumulation only).

Day table (slot 1 = first after sunrise; cyclic order Udveg, Char, Labh, Amrit, Kaal, Shubh, Rog; first slot = weekday lord; slot 8 = slot 1):

| Slot | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|---|---|---|---|---|---|---|---|
| 1 | Udveg | Amrit | Rog | Labh | Shubh | Char | Kaal |
| 2 | Char | Kaal | Udveg | Amrit | Rog | Labh | Shubh |
| 3 | Labh | Shubh | Char | Kaal | Udveg | Amrit | Rog |
| 4 | Amrit | Rog | Labh | Shubh | Char | Kaal | Udveg |
| 5 | Kaal | Udveg | Amrit | Rog | Labh | Shubh | Char |
| 6 | Shubh | Char | Kaal | Udveg | Amrit | Rog | Labh |
| 7 | Rog | Labh | Shubh | Char | Kaal | Udveg | Amrit |
| 8 | Udveg | Amrit | Rog | Labh | Shubh | Char | Kaal |

Night table (slot 1 = first after sunset; first slot = lord of the 5th weekday counted from today, i.e. the hora-sequence continuation):

| Slot | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|---|---|---|---|---|---|---|---|
| 1 | Shubh | Char | Kaal | Udveg | Amrit | Rog | Labh |
| 2 | Amrit | Rog | Labh | Shubh | Char | Kaal | Udveg |
| 3 | Char | Kaal | Udveg | Amrit | Rog | Labh | Shubh |
| 4 | Rog | Labh | Shubh | Char | Kaal | Udveg | Amrit |
| 5 | Kaal | Udveg | Amrit | Rog | Labh | Shubh | Char |
| 6 | Labh | Shubh | Char | Kaal | Udveg | Amrit | Rog |
| 7 | Udveg | Amrit | Rog | Labh | Shubh | Char | Kaal |
| 8 | Shubh | Char | Kaal | Udveg | Amrit | Rog | Labh |

Implementation: `daySeq = ["Udveg","Char","Labh","Amrit","Kaal","Shubh","Rog"]`; `dayStart = {Sun:0,Mon:3,Tue:6,Wed:2,Thu:5,Fri:1,Sat:4}`; day slot i (0..7) = `daySeq[(dayStart+i) mod 7]`; night slot i = `daySeq[(dayStart+5+i) mod 7]` (Sun night -> index 5 = Shubh, matches). Drik also says reject Vaar Vela, Kaal Vela, Kaal Ratri within a Choghadiya. `[P]`

#### 2.6.6 Hora (planetary hours)

12 day horas of `D/12`, 12 night horas of `N/12`. First hora of the day = weekday lord; then the Chaldean sequence Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars, repeating; the 25th hora is the next day's lord (which is why weekdays are in that order). `[S]` https://dekhopanchang.com/en/learn/modules/7-3 ; https://shubhpanchang.com/hora . Use: Jupiter/Moon/Mercury/Venus horas good, Sun for government, Mars/Saturn avoided except for their own matters.

#### 2.6.7 Varjyam / Vishaghatika / Tyajya and Amrit Kaal (South Indian)

Nakshatra-based, not weekday-based; can fall at night; a day can have 0, 1 or 2 windows. For the nakshatra currently running, with total duration `T` (from its start to end, found from ephemeris), 1 ghati = `T/60`; Varjyam = the 4 ghatis starting at the table value. `[P]` https://www.drikpanchang.com/tutorials/panchang-utilities/nakshatra-thyajyam.html (Tamil tradition table):

| Nakshatra | Tyajya start ghati (Drik/Tamil) | Visha start (Prashnamarga/Telugu table) | Amrita start (Prashnamarga) |
|---|---|---|---|
| Ashwini | 51 | 50 | 42 |
| Bharani | 25 | 24 | 48 |
| Krittika | 31 | 30 | 54 |
| Rohini | 41 | 40 | 52 |
| Mrigashira | 15 | 14 | -- |
| Ardra | 22 | 21 | -- |
| Punarvasu | 31 | 30 | -- |
| Pushya | 21 | 20 | -- |
| Ashlesha | 33 | 32 | -- |
| Magha | 31 | 30 | -- |
| P.Phalguni | 21 | 20 | -- |
| U.Phalguni | 19 | 18 | -- |
| Hasta | 22 | 21 | -- |
| Chitra | 21 | 20 | -- |
| Swati | 15 | 14 | -- |
| Vishakha | 15 | 14 | -- |
| Anuradha | 11 | 10 | -- |
| Jyeshtha | 15 | 14 | -- |
| Mula | 57 | 56 | -- |
| P.Ashadha | 25 | 24 | -- |
| U.Ashadha | 21 | 20 | -- |
| Shravana | 11 | 10 | -- |
| Dhanishtha | 11 | 10 | -- |
| Shatabhisha | 19 | 18 | -- |
| P.Bhadrapada | 17 | 16 | -- |
| U.Bhadrapada | 25 | 24 | -- |
| Revati | 31 | 30 | -- |

The two traditions differ by exactly one ghati (Drik counts the 51st ghati as "51 to 54", the Telugu table as "50-54"); this is an off-by-one in counting convention, not a different rule. `[CONFLICT]` https://www.wisdomlib.org/hinduism/essay/significance-of-the-moon-in-ancient-civilizations/d/doc1187665.html (Prashnamarga and Madhaviya Amrita columns; fetch for the remaining 23 Amrita values). Amrit Kaal = 4 ghatis from the Amrita start. Varjyam is strictly observed in Telugu/Tamil/Kannada practice, barely in the North. `[S]` https://bhaktibharat.org/panchangam/what-is-varjyam/

#### 2.6.8 Pradosha kaal

Nirnayasindhu: 3 ghatikas (72 min) after sunset per one quotation; other digests say 6 ghatis / 3 muhurtas (2h24m); popular sites use 1.5 h or 45 min either side of sunset. `[CONFLICT]` https://r-astro.com/blog/dhanteras-nirnaya-pradosha ; https://dekhopanchang.com/en/puja/pradosham ; Drik's "Pradosh Kaal" for Dhanteras/Diwali Lakshmi puja is sunset + 2h24m (6 ghati) `[M]`. Expose as setting, default 6 ghati for festival pujas, 3 ghati for Pradosha vrata.

#### 2.6.9 Other daily windows found in panchangs

- Kuhu: last 4 ghatis of Amavasya. `[S1]` onlinejyotish.
- Vara-vela, Kala-vela, Kala-ratri (Choghadiya rejects) and Gulika/Yamaganda above.
- Sandhya kaalas (pratah, madhyahna, sayam) are avoided for beginnings in Dharmasindhu; use sunrise +- 1 ghati, noon +- 1 ghati, sunset +- 1 ghati. `[M]`

---

## 3. Muhurta rule engine

### 3.1 General screening order (as practised; Raman, Kalaprakashika, Muhurta Chintamani)

1. Calendar blocks (month-level): Adhika/Mala masa, Kharmas (Dhanu/Meena), Chaturmas, Pitru paksha, Holashtak, eclipse windows, Guru/Shukra asta. `[S]`
2. Panchanga shuddhi (day-level): tithi, vara, nakshatra, yoga, karana each acceptable for the event. `[P]`
3. Personal: Tarabala and Chandrabala from the native's janma nakshatra/rashi (bride and groom both for marriage; head of household for griha pravesha). `[S]`
4. Time-of-day: Rahu kaal, Gulika, Yamaganda, Durmuhurta, Varjyam, Bhadra, Panchaka (some), Abhijit bonus. `[S]`
5. Lagna shuddhi (minute-level): the 21 mahadoshas; lagna in fixed/dual sign; benefics in kendra/trikona; 7th/8th clean. `[P]`
6. Bonuses: Sarvartha Siddhi, Amrita Siddhi, Siddha, Ravi/Guru Pushya, Tripushkara (double-edged), Abhijit.

### 3.2 Balas (personal factors)

**Tarabala (9 taras).** `n = ((moonNak - janmaNak) mod 27) + 1; tara = ((n - 1) mod 9) + 1`. `[S]` https://dekhopanchang.com/en/learn/tarabalam ; https://shubhpanchang.com/panchang/tara-balam

| Tara | Name | Quality | Nakshatra numbers from janma (1-based) |
|---|---|---|---|
| 1 | Janma | bad (danger to body; mild for 2nd/3rd cycle per some) | 1, 10, 19 |
| 2 | Sampat | good (wealth) | 2, 11, 20 |
| 3 | Vipat | bad | 3, 12, 21 |
| 4 | Kshema | good | 4, 13, 22 |
| 5 | Pratyari | bad | 5, 14, 23 |
| 6 | Sadhaka | good | 6, 15, 24 |
| 7 | Vadha (Naidhana) | bad, worst | 7, 16, 25 |
| 8 | Mitra | good | 8, 17, 26 |
| 9 | Ati/Parama Mitra | best | 9, 18, 27 |

Kalaprakashika/Raman refinement `[M]`: in the second and third cycles (nakshatras 10-27) the bad taras are milder; Vipat/Pratyari/Vadha of the first cycle (3, 5, 7) are the serious ones. Remedy for weak tarabala is dana of the tara's item.

**Chandrabala.** `h = ((moonRashi - janmaRashi) mod 12) + 1`. Good: 1, 3, 6, 7, 10, 11. Bad: 4, 8, 12 (8th worst, "ashtama chandra" is a hard block for travel and marriage). 2, 5, 9: neutral/acceptable. `[S]` dekhopanchang travel module 17-3; Raman. Dharmasindhu's Griha-pravesha list repeats "avoid 6, 8, 12 from janma rashi" for lagna. Janma-rashi here = Moon sign at birth.

**Guru bala / Surya bala for marriage (Dharmasindhu ch. 21)** `[P-digest]`: for the bride, transit Jupiter in 2, 5, 7, 11 from her janma rashi is propitious; 3, 6, 10 medium with shanti; 4 passable with homa; 8, 12 negative (remedy doubled). For the groom, transit Sun in 3, 6, 11 good, else Graha-makha puja.

### 3.3 Doshas and blocks (tables)

**Bhadra / Vishti karana.** Occurrence derived in 2.1. Residence by Moon's rashi (attributed to Muhurta Chintamani): Moon in Karka, Simha, Kumbha, Meena -> Bhadra in Martya/Prithvi loka (harmful, block); Moon in Mesha, Vrishabha, Mithuna, Vrishchika -> Swarga (harmless); Moon in Kanya, Tula, Dhanu, Makara -> Patala (harmless, some say beneficial). `[S1]` https://astrobix.com/astrosight/188-bhadra-vichaar-and-parihaar.html ; Drik agrees on the loka effect without listing signs: https://www.drikpanchang.com/panchang/info/bhadravasa/bhadravasa.html . Banned under Bhadra: marriage, mundan, griha pravesha, yatra, business start. Allowed: litigation, fights, surgery, fire works, Holika dahan is *required* to avoid Bhadra. Bhadra mukha/puccha refinement (the first 5 ghatis "mouth" worst, last 3 ghatis "tail" acceptable) `[M]`. Also: day Bhadra counts when it falls by day and night Bhadra by night ("diva bhadra, ratri bhadra" rule) `[M]`.

**Panchaka.** Moon in Dhanishtha (3rd pada per one source, whole nakshatra per Drik `[CONFLICT]`) through Revati, sidereal 293 deg 20' (or 300 deg) to 360 deg; about 5 days each month. Prohibited: travel south, building/repairing a bed or cot, roofing/collecting wood or grass, cremation (five effigies "putla" remedy, Panchaka shanti), raising a pillar. Per-nakshatra flavour: Dhanishtha death, Shatabhisha disease, P.Bhadra fire, U.Bhadra financial loss, Revati travel danger. Weekday-typed Panchaka (North Indian): Sun = Roga, Mon = Raja (benign), Tue = Agni, Fri = Chora, Sat = Mrityu; Wed/Thu Panchaka treated as dosha-free by many; `[CONFLICT]` r-astro swaps Sun/Mon. `[S]` https://dekhopanchang.com/en/learn/panchak ; https://shubhpanchang.com/panchang/panchak . Source texts: Dharmasindhu, Nirnayasindhu. Note Panchaka is *not* a bar to marriage or griha pravesha in most South Indian practice; it is a bar in UP/Bihar/Rajasthan/MP. The older "Panchaka" of Muhurta Chintamani (Roga/Raja/Agni/Chora/Mrityu from `(tithi + vara + nakshatra + lagna) mod 9` = 1,2,4,6,8) is a different, lagna-level rule `[M]`; expose both as `panchaka.nakshatra` and `panchaka.lagna`.

**Gandanta / Gand Mool.** Gand Mool nakshatras: Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati (junctions of water and fire signs; lords Ketu and Mercury). Gandanta proper (dosha #7): Moon in last pada of Ashlesha, Jyeshtha, Revati or first pada of Ashwini, Magha, Mula; tithi gandanta = last 2 ghatis of Purna tithis (5, 10, 15) and first 2 ghatis of Nanda tithis (1, 6, 11) i.e. elongation within about 24' of 0, 60, 120, 180, 240, 300 deg; lagna gandanta = last 3 deg of Karka/Vrishchika/Meena and first 3 deg of Mesha/Simha/Dhanu. Shorter 4-ghati or 2-ghati nakshatra-gandanta allowed when nothing better. `[P-via-Raman]` jyotishkalpadrum; `[S]` https://www.drikpanchang.com/panchang/gandamool-dates-timings.html . Birth in Gand Mool -> shanti on the 27th day when Moon returns; Namakarana avoids the first pada. `[S]`

**Dagdha / Visha / Hutashana (tithi + vara)** `[S]` https://www.onlinejyotish.com/astrology-tools/monthly-special-yogas.php ; https://ganeshmitra.co.in/dagdha-yoga/

| Weekday | Dagdha tithi | Visha tithi | Hutashana tithi |
|---|---|---|---|
| Sun | 12 | 4 | 12 |
| Mon | 11 | 6 | 6 |
| Tue | 5 | 7 | 7 |
| Wed | 3 (some: 2) | 2 | 8 |
| Thu | 6 | 8 | 9 |
| Fri | 8 | 9 | 10 |
| Sat | 9 | 7 | 11 |

**Yamaghanta (vara + nakshatra)** `[S]` Ernst Wilhelm Muhurta-Yogas summary via search: Sun Magha, Mon Vishakha, Tue Ardra, Wed Mula, Thu Krittika, Fri Rohini, Sat Hasta. Avoid especially for travel.

**Krakacha**: `weekdayNumber(Sun=1) + tithiNumber == 13`. **Khachara** (Moon's nakshatra 3rd, 4th, 5th or 9th from Sun's). **Latta dosha**: Moon's nakshatra "kicked" by a planet counted from that planet's nakshatra: Sun 12th, Mars 3rd, Jupiter 6th, Saturn 8th (forward), Mercury 22nd, Rahu 20th, Venus 24th, Full Moon 7th (backward). `[S1]` onlinejyotish. **Kulika** appears as "Vara Kulika" in Dharmasindhu's avoid-list and as a rejectable lagna in Kalaprakashika; in practice it is Saturn's 1/8 day-part (= Gulika) `[M]`. **Kantaka / Yamakantaka** = Jupiter's 1/8 part as an upagraha; benefic in lagna context, but its *time* is the Yamaganda window. `[P]` Wikipedia Upagraha.

**Mrityu yoga (vara + tithi group)**: Sun or Tue with Nanda tithis (1, 6, 11); Mon or Fri with Bhadra (2, 7, 12); Wed with Jaya (3, 8, 13); Thu with Rikta (4, 9, 14); Sat with Purna (5, 10, 15). `[S]` onlinejyotish. Mrityu yoga (vara + nakshatra) variant `[M]`: Sun Anuradha, Mon U.Ashadha, Tue Shatabhisha, Wed Ashwini, Thu Mrigashira, Fri Ashlesha, Sat Hasta -- verify.

**Vyatipata and Vaidhriti.** Two meanings: (a) the 17th and 27th nitya yogas (sum-of-longitudes), avoided for all beginnings; (b) the Mahapata events: Vyatipata = Sun and Moon in different ayanas, same side of equator, equal declination, longitudes summing to 180 deg; Vaidhriti = same ayana, opposite sides, equal declination, longitudes summing to 360 deg (Surya Siddhanta ch. 11). These coincide roughly with the yogas of the same name but the Mahapata window is computed from declination (Drik lists "Mahapata Vyatipata/Vaidhriti" separately, few hours). `[P]` https://en.wikipedia.org/wiki/Vyatip%C4%81ta ; https://www.drikpanchang.com/astrology/mahapata/kranti-samya-dosha.html . Krantisamya (dosha #20 in Narada's list, "more detrimental than eclipse" per Drik) = same declination condition; Drik prescribes Shanti for children born then. Meditation/japa allowed, weddings prohibited in the window.

**Ekargala.** When one of the nine bad yogas (Vishkambha, Atiganda, Shula, Ganda, Vyaghata, Vajra, Vyatipata, Parigha, Vaidhriti) is running and the count from Sun's nakshatra to Moon's (including Abhijit, 28-count) is odd; equivalently Sun and Moon equidistant on either side of the yoga's nakshatra. Applies by day only (per Raman; another source says ignore at night `[CONFLICT]`). Cancelled if Moon in Ashwini, Mrigashira, Punarvasu, Pushya, Hasta, Chitra, Dhanishtha or Revati, or benefics in kendra/trikona, or malefics in 3/6/11. `[P-via-Raman]` jyotishkalpadrum; https://saptarishisshop.com/the-evil-of-ekargala-in-marriage-muhurtha-by-iranganti-rangacharya/

**Sankranti.** Avoid around the Sun's ingress: Makara and Karka sankranti 3 days before and after (ayana change), Mesha and Tula 1 day before and after (vishuva), other eight 30 ghatis (or 16 ghatis per Raman `[CONFLICT]`) before and after. `[P-via-Raman]` jyotishkalpadrum. The "punya kaal" window for *bathing/dana* is a different, positive window (Drik: 16 ghatis after the ingress, or before if ingress after sunset). `[M]`

**Grahana (eclipse).** Avoid the eclipse day plus 3 days before and 7 (some say 3) after; the eclipsed nakshatra for 6 months (total), 3 (half), 1 (quarter); Graha-shula of 7 nakshatras either side; sutak begins 12 h (solar) / 9 h (lunar) before. `[P-via-Raman]` jyotishkalpadrum; `[M]` sutak hours. Only eclipses *visible at the location* count for sutak (Dharmasindhu) `[M]`.

**Tripushkara / Dwipushkara.** Tithi in Bhadra group (2, 7, 12) + weekday Sun/Tue/Sat + nakshatra: Dwipushkara if Mrigashira, Chitra, Dhanishtha (doubling); Tripushkara if Krittika, Punarvasu, Vishakha, U.Bhadrapada (dekho) or Krittika, Punarvasu, U.Ashadha (vedpanchang) `[CONFLICT]` -- the classical set is the four "dvi-rashi" nakshatras straddling two signs (Krittika, Punarvasu, Vishakha, U.Ashadha, U.Bhadra... actually five), so follow dekho. Effect: whatever happens repeats x2 / x3. Good for buying property/gold, bad for loss events, funerals, illness onset. `[S]` https://dekhopanchang.com/en/learn/tripushkar-yoga ; https://vedpanchang.com/yoga/tripushkar/2024

**Sarvartha Siddhi yoga (vara + nakshatra at sunrise; lasts till Moon leaves nakshatra).** Sources: Muhurta Chintamani, Nirnayasindhu. `[S]` https://dekhopanchang.com/en/learn/sarvartha-siddhi-yoga

| Weekday | Nakshatras |
|---|---|
| Sun | Ashwini, Pushya, U.Phalguni, Hasta, Mula, U.Ashadha, U.Bhadrapada |
| Mon | Rohini, Mrigashira, Pushya, Hasta, Anuradha, Shravana |
| Tue | Ashwini, Krittika, U.Phalguni, U.Ashadha, U.Bhadrapada (some add Ashlesha) |
| Wed | Rohini, Mrigashira, Hasta, Anuradha, Jyeshtha, Revati (some: Krittika) |
| Thu | Ashwini, Punarvasu, Pushya, Anuradha, Shravana, Revati |
| Fri | Ashwini, Punarvasu, Pushya, Anuradha, Shravana, Revati |
| Sat | Rohini, Swati, Shravana, Revati |

Cancelled by Rahu kaal (suspended), Bhadra (void), eclipse (void), weakened in Panchaka nakshatras.

**Amrita Siddhi yoga (vara + nakshatra)**: Sun Hasta, Mon Mrigashira, Tue Ashwini, Wed Anuradha, Thu Pushya, Fri Revati, Sat Rohini. `[S]` https://dekhopanchang.com/en/learn/amrit-siddhi-yoga ; hindu-blog gives Wed Vishakha `[CONFLICT]`, dekho (Muhurta Deepika) is the usual. Exceptions `[M]`: Tue+Ashwini bad for griha pravesha, Sat+Rohini bad for yatra, Thu+Pushya bad for marriage, Sun+Hasta bad for ... (verify in Muhurta Chintamani Shubhashubha prakarana).

**Siddha yoga (vara + tithi; Muhurta Chintamani)** `[S]` https://dekhopanchang.com/en/learn/siddha-yoga : Sun 4, 9, 14; Mon 6, 11, 15; Tue 3, 8, 13; Wed 5, 10, 30; Thu 2, 7, 12; Fri 1, 6, 11; Sat 3, 7, 12. Note the Rikta tithis become *siddha* on Sunday (and Tuesday for 8/13): the tradition rehabilitates "bad" tithis with the right weekday.

**Ravi Pushya / Guru Pushya**: Pushya nakshatra on Sunday / Thursday; gold, business, vidya, medicine; the classical exception is that Pushya is never used for marriage (Brahma's curse story). `[S]` Drik seven-category page; `[M]` for the story.

**Vara + tithi auspicious combos (Siddha above) and "Vara + nakshatra + tithi" compound yogas** (Sarvartha-amrita, Ravi-yoga: Moon's nakshatra 4, 6, 9, 10, 13, 20 from Sun's `[M]`), Ravi-yoga overrides many minor doshas.

### 3.4 The 21 Mahadoshas (Ekavimshati Mahadosha) of marriage lagna

Two numberings exist. Raman's (Kalaprakashika-based) and the Narada/Muhurta Chintamani ordering. `[P-via-Raman]` https://sanjayprabhakaran.blogspot.com/2015/04/muhurtha-21-great-evils-ekavimsati.html ; https://jyotishkalpadrum.blogspot.com/2013/01/21-great-evils-ekavimsati-mahadoshas-21.html ; http://www.panchanga.lv/wp-content/uploads/2020/06/Muhurta_Raman.pdf . The verse quoted (attributed to Narada, "tallagnam ca shubhais tribhir yutam api svocca-sthitaih svalaya...") says a lagna with these doshas is fatal even if three benefics sit in it exalted and in own house.

| # (Narada) | # (Raman) | Dosha | Rule (encode) | Exception |
|---|---|---|---|---|
| 1 | 1 | Panchanga-shuddhi-rahita | tithi/vara/nakshatra/yoga/karana all acceptable and their lords well placed | Sun or Moon in 11th from lagna sanctifies the five limbs |
| 2 | 6 | Udayasta-shuddhi | no malefic in lagna or 7th (ideally not aspecting) | lagna lord or 7th lord in/aspecting own house; Vargottama lagna ignores malefic aspect |
| 3 | 2 | Surya Sankranti | see 3.3 Sankranti windows | none |
| 4 | 9 | Papa-shadvarga | lagna must not be in more malefic than benefic vargas among rashi, hora, drekkana, navamsa, dvadashamsa, trimshamsa | Jupiter or Venus in/aspecting lagna |
| 5 | 10 | Bhrigu-shataka | Venus not in 6th | none (even exalted) |
| 6 | 11 | Kuja-ashtama | Mars not in 8th | none |
| 7 | 8 | Gandanta | see 3.3 | Moon in friendly/own/exalted sign and benefic aspect |
| 8 | 3 | Kartari | malefics in 2nd and 12th from lagna (or from 7th) | -- ; retrograde malefic in 2nd + direct in 12th is worst |
| 9 | 4 | Shashtashta-ripha Chandra | Moon not in 6, 8, 12 from lagna (8 worst) | -- |
| 10 | 5 | Sagraha Chandra | Moon not conjunct any planet (malefic worst) | -- |
| 11 | 12 | Dampatyor Ashtama Lagna | muhurta lagna not the 8th from natal lagna or natal Moon of bride or groom | lords of natal rashi and its 8th identical or friends |
| 12 | 13 | Rashi Vishanadi (Lagna tyajya) | Bhujanga: 1st navamsa of Mesha/Vrishabha/Kanya/Dhanu (only Wed, Sat); Gridhra: 5th navamsa of Mithuna/Simha/Tula/Kumbha (only Mon, Fri); Varaha: 9th navamsa of Karka/Vrishchika/Makara/Meena (only Sun, Tue, Thu) | strong Moon, Jupiter in kendra, benefic in lagna |
| 13 | 7 | Durmuhurta | table in 2.6.4 | Jupiter strong in kendra; Moon in 11th |
| 14 | 15 | Vara-dosha | bad vara+tithi / vara+nakshatra combos (Dagdha, Visha, Hutashana, Yamaghanta, Mrityu) | "beyond repair" |
| 15 | 17 | Ekargala | see 3.3 | by day only; listed nakshatras cancel |
| 16 | 16 | Grahanotpata | eclipse rules in 3.3 | 4th-7th day after eclipse if unavoidable |
| 17 | 19 | Krura-vid-vriksha / Akala-garjita | portents: planetary war, comet, out-of-season thunder/rain, earthquake, halo; 7 days after, nakshatra for 6 months | Jupiter strong in kendra |
| 18 | 18 | Krura-samyuta | Moon and the lords of nakshatra/lagna/karana/tithi/yoga/vara not conjunct a malefic or a debilitated planet | none |
| 19 | 14 | Kunavamsha | lagna (and panchanga lords) not in debilitated/inimical navamsa | Vargottama |
| 20 | 20 | Vyatipata / Mahapata | declination rule | none |
| 21 | 21 | Vaidhriti | declination rule | none |

Narada's list also folds in Kunavamsha and Papashadvarga differently from Raman; the *set* is the same 21 concepts. Muhurta Chintamani's own Vivaha prakarana enumerates them in verses 49-ff with "Latta, Pata, Yuti, Vedha, Jamitra, Bana, Upagraha, Kranti-samya, Dagdha-tithi, ..." as sub-items under Lagna-shuddhi; Jamitra = malefic in 7th from lagna or Moon, Bana = Lagna degree hit by Roga/Agni/Raja/Chora/Mrityu bana arcs, Vedha = planetary vedha of lagna, Upagraha = Sun's nakshatra +- 5/8/10/14/15/18/19/21/22/23/24 positions (Moon there is upagraha-hata). `[M]` -- these sub-doshas are in the Sanskrit text on archive.org; have a Sanskrit-reading pandit extract verses 49-62 of the Vivaha prakarana before encoding Latta/Pata/Bana/Upagraha.

### 3.5 Per-event rules

Format: approved nakshatras / tithis / varas / months / lagna / hard blocks / notes. Nakshatra class references point to section 4.

#### Vivaha (marriage)

- Nakshatras `[S]` (11 standard; Muhurta Chintamani via multiple panchangs): Rohini, Mrigashira, Magha (not 1st pada), U.Phalguni, Hasta, Swati, Anuradha, Mula (not 1st pada), U.Ashadha, U.Bhadrapada, Revati. Dharmasindhu adds Chitra, Shravana, Dhanishtha, Ashwini as "superior but rejected if malefic-afflicted" (Haradatta). Rejected: Bharani, Krittika, Ardra, Ashlesha, Jyeshtha, Vishakha, Pushya (curse), Shatabhisha, P.Bhadra, all Purvas (Ugra). `[P-digest]` kamakoti ch.21; https://www.vedkosh.com/muhurat/vivah-muhurat
- Tithis: 2, 3, 5, 7, 10, 11, 12, 13 good; avoid Rikta 4, 9, 14; avoid 8, Purnima, Amavasya (Raman); Krishna 13 medium, Krishna 6 and 8 minimal. `[S]`/`[P-digest]`
- Varas: Mon, Wed, Thu, Fri best; Sun acceptable (Chintamani) / not (Raman) `[CONFLICT]`; Tue and Sat avoided. Weekday is explicitly "least weight". `[S]` dekhopanchang vara.
- Months `[P-digest]` Dharmasindhu: Magha, Phalguna, Vaishakha, Jyeshtha excellent (Jyeshtha not if both born in Jyeshtha, or for the eldest child in some customs `[M]`); Margashirsha medium; Ashadha (Sun in Mithuna only) and Kartika (Sun in Vrishchika only) by local custom; Pausha with Sun in Makara and Chaitra with Sun in Mesha accepted by some. In practice North India marries Nov-Jul except Kharmas; South marries also in Shravana/Bhadrapada (no Chaturmas bar in Tamil practice) `[M]`.
- Hard blocks: Guru asta and Shukra asta (combust): within 11 deg (Jupiter) / 10 deg (Venus), 8 deg when Venus retrograde; also Guru/Shukra balya (first 3 days after heliacal rise) and vriddha (last 3 days before setting) `[S]` https://dekhopanchang.com/gu/learn/muhurta-selection ; https://panditjionway.com/choose-auspicious-marriage-date/ . Adhika/Mala masa; Kshaya masa; Kharmas = Sun in Dhanu (mid-Dec to mid-Jan) and Sun in Meena (mid-Mar to mid-Apr) `[S]`; Chaturmas = Devshayani Ekadashi (Ashadha Shukla 11) to Devutthani/Prabodhini Ekadashi (Kartika Shukla 11) `[S]`; Holashtak = Phalguna Shukla 8 to Purnima (8-9 days; strongest in Punjab/HP/UP) `[S]` https://dekhopanchang.com/en/learn/holashtak ; Pitru paksha = Bhadrapada Krishna 1 to Amavasya (Purnimanta Ashwina Krishna) `[S]`; Shraddha tithis of either family between Nandi-shraddha and mandapa-removal; bride's menses dates; Bhadra; Panchaka (North); eclipses; Vyatipata/Vaidhriti; Sankranti; Tithi kshaya/vriddhi days (Dharmasindhu's "Mrityu yoga" list). `[P-digest]`
- Lagna: fixed (Vrishabha, Simha, Vrishchika, Kumbha) or dual signs preferred; Mithuna, Kanya, Tula, Dhanu, Meena also used; avoid Mesha/Karka/Makara/Tula by some; Godhuli lagna (sunset) is the folk fallback. The 21 doshas apply. Dharmasindhu planetary placements: Sun good in 3, 6, 8 (not lagna); Moon good 2, 3, 4 (not 1, 6, 8); Mars 3, 6 (not 10); Mercury/Jupiter not in 8 (or 12); Venus 2, 5, 9, 10 (not 3, 6, 8); Saturn 3, 6, 8 (not lagna); Rahu/Ketu 11; lagna lord not 6/8; *no planet in 7th*. `[P-digest]`
- Personal: Tarabala and Chandrabala for both; Guru bala for bride, Surya bala for groom (3.2); muhurta lagna not 8th from either natal lagna/Moon (dosha 11).
- Story anchor: Rama's wedding was fixed for Uttara Phalguni (Valmiki Ramayana 1.71.24: "Magha is today; the wedding under Uttara Phalguni, three days hence"; Bhaga as lord). `[P]` https://vedapath.app/en/ramayana/bala-kanda/71/24 ; https://sanskritdocuments.org/sites/valmikiramayan/baala/sarga71/bala_71_prose.htm

#### Griha pravesha (house entry)

- Months `[S]`/`[P-digest]`: Magha, Phalguna, Vaishakha, Jyeshtha best; Kartika, Margashirsha medium; avoid Chaitra, Ashadha, Shravana, Bhadrapada, Ashwina, Pausha (Chaturmas, Kharmas, Pitru paksha reasons). Dharmasindhu's post-wedding Dwitiya-pravesha has separate relaxations.
- Nakshatras: Dhruva class (Rohini, U.Phalguni, U.Ashadha, U.Bhadra) plus Mrigashira, Chitra, Anuradha, Revati, Pushya, Shatabhisha, Punarvasu, Shravana, Dhanishtha (Dharmasindhu list: Ashwini, Rohini, Mrigashira, Pushya, Magha, three Uttaras, Hasta, Chitra, Swati, Anuradha, Mula, Shravana, Dhanishtha, Revati). `[P-digest]`
- Tithis: 2, 3, 5, 7, 10, 11, 13 (Dharmasindhu: all except 4, 9, 14, Purnima; Amavasya also excluded in practice). Shukla paksha preferred.
- Varas: all except Sunday and Tuesday (Dharmasindhu); Saturday also skipped in North. `[P-digest]`
- Blocks: Bhadra, Panchaka (North), Rahu kaal for the actual door-crossing, eclipses, Chaturmas, Kharmas, Adhika masa, Pitru paksha.
- Lagna: fixed sign, benefics in kendra, 8th empty; Vastu: enter right foot first, kalasha, Vastu-shanti homa before; Vastu purusha "sleeps" direction by month (Vastu chakra: head direction rotates by season) used for Bhoomi puja/digging, not for entry `[M]`. Vastu element rules belong to Vastu-shastra texts (Mayamata, Manasara), not muhurta.

#### Griharambha / Bhoomi puja (foundation)

- Dhruva and Mridu classes plus Kshipra: Rohini, Mrigashira, Pushya, U.Phalguni, Hasta, Chitra, Swati, Anuradha, U.Ashadha, Shravana, Dhanishtha, Shatabhisha, U.Bhadra, Revati `[M]`; tithis 2, 3, 5, 6, 7, 10, 11, 12, 13; Mon, Wed, Thu, Fri; months Vaishakha, Shravana, Margashirsha, Magha, Phalguna (Chintamani Vastu prakarana) `[M]`; avoid Sun in Simha/Vrishchika/Kumbha/Vrishabha? (the "Vastu-chakra" month rule varies) `[M]`; Panchaka forbids raising pillars and roofing. Dig in the direction given by the Vastu-purusha head rule for the solar month `[M]`.

#### Vahana kraya (vehicle purchase)

- Nakshatras `[S]`: Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Hasta, Chitra, Swati, Anuradha, Shravana, Dhanishtha, Shatabhisha, Revati (Chara + Kshipra + Mridu). Tithis 2, 3, 5, 6, 7, 10, 11, 12, 13, Purnima. Varas Mon, Wed, Thu, Fri (Sun ok for some). Avoid Rahu kaal, Yamaganda, Gulika; drive first toward east or north. https://dekhopanchang.com/en/muhurta/vehicle-purchase ; https://shubhpanchang.com/muhurat/vehicle-purchase

#### Vyapara arambha (business / shop opening)

- Pushya first; Ashwini, Rohini, Mrigashira, Punarvasu, Hasta, Chitra, Anuradha, Revati, U. nakshatras. Tithis 1, 2, 3, 5, 6, 10, 11, 13; varas Wed, Thu, Fri (Mon ok); lagna fixed or dual; avoid Mercury retrograde (modern), Pitru paksha, eclipses. Labh/Amrit/Shubh Choghadiya. Dhanteras and Diwali Lakshmi puja pradosha as cultural anchors; Akshaya Tritiya and Gudi Padwa/Ugadi "abujha" (no-muhurta-needed) days `[S]` https://dekhopanchang.com/en/muhurta/business-start . The abujha (self-proven) muhurta days in North India: Akshaya Tritiya, Vijaya Dashami, Devutthani Ekadashi, Basant Panchami, Phulera Dooj, Bhadali Navami `[M]`.

#### Namakarana (naming; 11th/12th/16th day or later)

- Avoid janma nakshatra (janma dosha) and first padas of Gand Mool; nakshatras: Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Hasta, Chitra, Swati, Anuradha, three Uttaras, Shravana, Dhanishtha, Shatabhisha, Revati; tithis 2, 3, 5, 6, 7, 10, 11, 12, 13; avoid Rikta, 8, Amavasya; varas Mon, Wed, Thu, Fri; Sun acceptable to some. `[S]` https://www.vedicnakshatra.com/muhurat/namakarana ; https://vedastro.org/blog/Muhurtha-Chapter-8-Post-Natal-Ceremonies.html . Name's first syllable from janma nakshatra pada (the 108 pada-aksharas table) `[M]`.

#### Annaprashana (first solid food; 6th month boys, 5th month girls)

- Nakshatras: Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Hasta, Chitra, Swati, Anuradha, three Uttaras, Shravana, Dhanishtha, Shatabhisha, Revati; tithis 2, 3, 5, 7, 10, 13 (avoid Rikta, 6, 8, 12, Amavasya); varas Mon, Wed, Thu, Fri; Shukla paksha; avoid Bharani, Krittika, Ardra, Ashlesha, Jyeshtha, Mula; even months for boys, odd for girls `[S]` https://dekhopanchang.com/en/muhurta/annaprashan ; https://nepaljyotish.org/en/blog/annaprashan-muhurta-guide/

#### Chudakarana / Mundana (first tonsure; 1st or 3rd year, odd years)

- Nakshatras `[M]` (Muhurta Chintamani Samskara prakarana): Ashwini, Mrigashira, Punarvasu, Pushya, Hasta, Chitra, Swati, Jyeshtha, Shravana, Dhanishtha, Shatabhisha, Revati (Kshipra, Mridu, Chara); tithis 2, 3, 5, 7, 10, 11, 13; varas Mon, Wed, Thu, Fri; months Chaitra (not for the eldest), Vaishakha, Jyeshtha, Ashadha (before Devshayani), Magha, Phalguna; not in the child's birth month or janma nakshatra; not when mother is pregnant beyond 5 months (folk); Sun in Uttarayana preferred. Search did not surface a clean online table: verify.

#### Karnavedha (ear piercing; 6th/7th/8th month or odd years)

- Nakshatras `[M]`: Mrigashira, Punarvasu, Pushya, Hasta, Chitra, Anuradha, Shravana, Dhanishtha, Revati, Ashwini; tithis as Chudakarana; varas Mon, Wed, Thu, Fri; Uttarayana; Chintamani says the Moon and Jupiter should be strong and the child's lagna 8th house empty. Verify.

#### Vidyarambha / Akshararambha (start of learning; age 5, or Vijaya Dashami / Vasant Panchami)

- Nakshatras `[S]`/`[M]`: Ashwini, Punarvasu, Pushya, Hasta, Chitra, Swati, Anuradha, Shravana, Dhanishtha, Revati, Mrigashira, three Uttaras; tithis 2, 3, 5, 6, 10, 11, 12; varas Wed, Thu, Fri, Sun; avoid Chaturmas in North; Vijaya Dashami and Vasant Panchami are abujha. Education tithis per dekho: good 1, 2, 3, 5, 10, 11; avoid 4, 9, 14, Amavasya.

#### Upanayana (sacred thread; age 8 Brahmana, 11 Kshatriya, 12 Vaishya; Uttarayana)

- Months: Magha to Ashadha (Sun in Makara to Mithuna), Uttarayana; Chaitra and Vaishakha most common. Nakshatras: Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Hasta, Chitra, Swati, Anuradha, Shravana, Dhanishtha, Shatabhisha, Revati, three Uttaras; tithis Shukla 2, 3, 5, 10, 11, 12 and Krishna 2, 3, 5 (one source); varas Sun, Mon, Wed, Thu, Fri; janma nakshatra acceptable; Jupiter and Sun strong; boy's lagna not 8th. `[S]` https://www.shreekundli.com/vedic-astrology/samskara ; pdfcoffee "Muhurtha notes".

#### Garbhadhana (conception) and Seemantha / Pumsavana

- Garbhadhana `[M]` (Muhurta Chintamani, Samskara prakarana): even nights from the 4th to 16th after menses (not 11th, 13th); nakshatras Rohini, Mrigashira, Hasta, Anuradha, Swati, Shravana, Dhanishtha, Shatabhisha, three Uttaras; avoid Moola, Magha, Revati(?) and the janma nakshatra; tithis 2, 3, 5, 7, 10, 12, 13; varas Mon, Wed, Thu, Fri; Moon and Jupiter strong, lagna in a benefic navamsa. Verify.
- Seemanthonnayana `[S1]`/`[M]`: 6th or 8th month of pregnancy (some say 4th, 6th, 8th); nakshatras Mrigashira, Punarvasu, Pushya, Hasta, Mula, Shravana, three Uttaras, Revati; male nakshatras preferred; lord of the pregnancy month strong; tithis 2, 3, 5, 7, 10, 13; Sun/Mon/Thu/Fri.

#### Yatra (travel)

- Disha shula (do not travel toward): Mon and Sat east; Thu south; Sun and Fri west; Tue and Wed north (dekho says Wed is free, astromedha and others say Wed north) `[CONFLICT]` https://dekhopanchang.com/en/learn/modules/17-3 ; https://astromedha.in/insights/muhurat/travel-muhurat . Remedy: first walk a short distance in a non-shula direction, pause, then proceed; or eat the weekday item (Sun ghee, Mon milk, Tue jaggery, Wed sesame, Thu curd, Fri barley, Sat urad) `[S1]`.
- Yogini (do not travel toward, or keep her behind/left `[CONFLICT]` on side rule): tithi 1, 9 east; 3, 11 south-east (Agneya); 5, 13 south; 4, 12 south-west (Nairritya); 6, 14 west; 7, 15 (Purnima) north-west (Vayavya); 2, 10 north; 8, 30 (Amavasya) north-east (Ishanya). `[S]` ficino.sourcelibrary manuscript translation; https://sourcelibrary.org/book/hoda-chakram/page/69907e20b91bcb2db3f6e51c
- Chandra vasa (Moon's rashi as direction; the Moon "in front" or "to the right" is good, "behind" or "left" bad; Moon in 1, 3, 6, 7, 10, 11 from janma rashi required): Mesha, Simha, Dhanu = east; Vrishabha, Kanya, Makara = south; Mithuna, Tula, Kumbha = west; Karka, Vrishchika, Meena = north. `[M]` (standard table; the search found only a nakshatra-pada "Chandra vaas" variant on panchang sites). Sammukha (facing) Chandra gives wealth, Dakshina (right) comfort, Prishtha (behind) loss, Vama (left) harm `[M]`.
- Nakshatras: Chara class (Punarvasu, Swati, Shravana, Dhanishtha, Shatabhisha) plus Kshipra (Ashwini, Pushya, Hasta) and Mridu (Mrigashira, Anuradha, Revati); avoid Bharani, Krittika, Ardra, Ashlesha, Magha, Vishakha, Jyeshtha, Mula, Purvas `[S]` Drik seven-category. Tithis avoid Rikta, 6, 8, 12, Amavasya (Chintamani's "yatra varjya" list `[M]`). Varas: Mon, Wed, Thu, Fri; Sat for return journeys. Avoid Rahu kaal, Yamaghanta nakshatra for the day, Panchaka for southward travel, Bhadra, Ghata chandra (Dharmasindhu forbids for travel and battle; Ghata rashi by month `[M]`).
- Short trips need only Disha shula; long trips need Tarabala + Chandrabala + Disha shula. `[S]` dekho module 17-3.

#### Shalya chikitsa (surgery)

- Rikta tithis 4, 9, 14 are *preferred*; avoid 8, Amavasya, Purnima `[S]` dekho tithis. Nakshatras: Ugra and Tikshna classes (Bharani, Magha, Purvas, Ardra, Ashlesha, Jyeshtha, Mula) classically for cutting; modern practice prefers Mridu/Kshipra for recovery (Ashwini, Pushya, Hasta, Mrigashira, Anuradha, Revati, Shatabhisha "hundred physicians") `[S]` Drik seven-category. Avoid Moon in the sign ruling the body part being operated (Mesha head ... Meena feet), and Moon's own nakshatra; avoid Shatabhisha Panchaka days for *starting* treatment (dekho Panchak page). Tue (Mars) and Sat acceptable for incision per Ugra logic `[M]`.

#### Gold / jewellery purchase

- Pushya (especially Guru Pushya, Ravi Pushya), Akshaya Tritiya, Dhanteras (Trayodashi Krishna of Kartika, pradosha), Rohini, Punarvasu, Hasta, Chitra, Anuradha, three Uttaras, Shravana, Revati; Kshipra class covers ornaments; Thu/Fri/Mon/Wed; Labh/Amrit Choghadiya; avoid Rikta, Rahu kaal, Bhadra; Tripushkara avoided by some for purchases that could be "lost thrice" but favoured by others for assets that "multiply" `[CONFLICT]`. `[S]` Drik seven-category; dekho tripushkar.

#### Starting a job / joining service

- Dhruva class ("starting of service" is explicitly listed under Dhruva): Rohini, U.Phalguni, U.Ashadha, U.Bhadra, plus Ashwini, Pushya, Hasta, Anuradha, Shravana, Revati; tithis 2, 3, 5, 7, 10, 11, 13; varas Mon, Wed, Thu, Fri; avoid Rahu kaal for the first entry, Bhadra, Amavasya, Panchaka (North). `[S]` Drik seven-category.

#### Examinations / interviews / learning displays

- Kshipra (Ashwini, Pushya, Hasta) and Mridu (Mrigashira, Chitra, Anuradha, Revati) classes "learning and display of arts"; Wed and Thu; Mercury/Jupiter horas; Labh/Shubh/Amrit Choghadiya; Sarasvati-anchored tithis Panchami; avoid Rahu kaal for sitting down. `[S]` Drik seven-category.

#### Property purchase / registration

- Dhruva class + Mridu; tithis Bhadra group 2, 7, 12 and 3, 5, 10, 11, 13; Thu/Fri/Mon/Wed; Tripushkara/Dwipushkara favoured (asset multiplies); avoid Rikta, Bhadra, Rahu kaal, Chora Panchaka, Adhika masa `[S]`/`[M]`.

---

## 4. The 27 nakshatras, 15 tithis, 7 varas

### 4.1 Nakshatra master table

Lord = Vimshottari lord (repeats Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury). Deity per TB 3.1 / Wikipedia. Nature per Drik seven-category page. Gana per dekhopanchang. Nadi, Yoni (animal, sex) are `[M]` from the standard Ashta-koota tables (verify against any Kundali-milan reference; they are stable across traditions). Direction `[M]` = the 28-nakshatra Disha chakra (7 per quarter: 1-7 E, 8-14 S, 15-21 W, 22-28 N incl. Abhijit) used in some yatra texts; low priority. Meanings `[M]`.

| # | Nakshatra | Deity | Lord | Symbol | Nature | Gana | Nadi | Yoni | Dir | One-line meaning |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Ashwini | Ashvins | Ketu | horse's head | Kshipra | Deva | Adi | horse M | E | swift healing start |
| 2 | Bharani | Yama | Venus | yoni | Ugra | Manushya | Madhya | elephant M | E | bearing, restraint, the womb |
| 3 | Krittika | Agni | Sun | knife / flame | Mishra | Rakshasa | Antya | sheep F | E | the cutter, purifying fire |
| 4 | Rohini | Prajapati / Brahma | Moon | cart, banyan | Dhruva | Manushya | Antya | serpent M | E | the red one, growth, fertility |
| 5 | Mrigashira | Soma | Mars | deer's head | Mridu | Deva | Madhya | serpent F | E | the seeking deer |
| 6 | Ardra | Rudra | Rahu | teardrop / gem | Tikshna | Manushya | Adi | dog F | E | the moist one, storm |
| 7 | Punarvasu | Aditi | Jupiter | bow and quiver | Chara | Deva | Adi | cat F | E | return of the light |
| 8 | Pushya | Brihaspati | Saturn | cow's udder, lotus | Kshipra | Deva | Madhya | sheep M | S | nourisher, most auspicious |
| 9 | Ashlesha | Sarpas / Nagas | Mercury | coiled serpent | Tikshna | Rakshasa | Antya | cat M | S | the embrace, entwining |
| 10 | Magha | Pitris | Ketu | throne | Ugra | Rakshasa | Antya | rat M | S | the mighty, ancestral authority |
| 11 | Purva Phalguni | Bhaga | Venus | front legs of bed | Ugra | Manushya | Madhya | rat F | S | enjoyment, the former red one |
| 12 | Uttara Phalguni | Aryaman | Sun | back legs of bed | Dhruva | Manushya | Adi | cow M | S | contracts, patronage, marriage |
| 13 | Hasta | Savitar | Moon | hand | Kshipra | Deva | Adi | buffalo F | S | the hand, skill |
| 14 | Chitra | Tvashtar | Mars | bright jewel | Mridu | Rakshasa | Madhya | tiger F | S | the brilliant, craft |
| 15 | Swati | Vayu | Rahu | young shoot / coral | Chara | Deva | Antya | buffalo M | W | the independent, wind |
| 16 | Vishakha | Indra-Agni | Jupiter | triumphal arch | Mishra | Rakshasa | Antya | tiger M | W | forked, purposeful |
| 17 | Anuradha | Mitra | Saturn | lotus / arch | Mridu | Deva | Madhya | deer F | W | following Radha, friendship |
| 18 | Jyeshtha | Indra | Mercury | earring / umbrella | Tikshna | Rakshasa | Adi | deer M | W | the eldest, chief |
| 19 | Mula | Nirriti | Ketu | tied roots | Tikshna | Rakshasa | Adi | dog M | W | the root |
| 20 | Purva Ashadha | Apah | Venus | fan / tusk | Ugra | Manushya | Madhya | monkey M | W | the former invincible |
| 21 | Uttara Ashadha | Vishvedevas | Sun | tusk / small bed | Dhruva | Manushya | Antya | mongoose M | W | the latter invincible |
| 22 | Shravana | Vishnu | Moon | ear / three steps | Chara | Deva | Antya | monkey F | N | hearing, learning |
| 23 | Dhanishtha | Vasus | Mars | drum | Chara | Rakshasa | Madhya | lion F | N | the wealthiest, rhythm |
| 24 | Shatabhisha | Varuna | Rahu | empty circle | Chara | Rakshasa | Adi | horse F | N | hundred healers |
| 25 | Purva Bhadrapada | Aja Ekapada | Jupiter | sword / front funeral cot | Ugra | Manushya | Adi | lion M | N | the former blessed feet |
| 26 | Uttara Bhadrapada | Ahirbudhnya | Saturn | twins / back cot | Dhruva | Manushya | Madhya | cow F | N | the latter blessed feet, depth |
| 27 | Revati | Pushan | Mercury | fish / drum | Mridu | Deva | Antya | elephant F | N | the wealthy, safe journey |
| 28 | Abhijit | Brahma / Vishnu | -- | -- | Kshipra | -- | -- | -- | N | the victorious (276 deg 40'-280 deg 53'20") |

Sources: deity/lord/symbol https://en.wikipedia.org/wiki/List_of_Nakshatras `[P]`; nature https://www.drikpanchang.com/panchang/nakshatra/classification/nakshatra-seven-category.html `[P]`; gana https://dekhopanchang.com/learn/nakshatras `[S]`; TB deity variants https://hasp.ub.uni-heidelberg.de/journals/ejvs/article/download/1522/10436/23236 `[P]`.

### 4.2 The seven natures and what each is for (the heart of the engine)

Verbatim-close from Drik Panchang (which reproduces Brihat Samhita 98 / Muhurta Chintamani 1): `[P]`

| Class | Members | Use for |
|---|---|---|
| Dhruva / Sthira (fixed) | Rohini, U.Phalguni, U.Ashadha, U.Bhadrapada (+ Sunday for some) | foundation laying, well digging, house building, Upanayana, agriculture/sowing, coronation, starting service, expiatory rituals, Griha pravesha, anything meant to last |
| Chara / Chala (movable) | Punarvasu, Swati, Shravana, Dhanishtha, Shatabhisha (+ Monday) | riding vehicles, journeys, anything involving motion; buying vehicles |
| Ugra / Krura (fierce) | Bharani, Magha, P.Phalguni, P.Ashadha, P.Bhadrapada (+ Tuesday) | destructive/forceful acts: demolition, weapons, fire works, poison research, surgery, litigation, confronting enemies; never for shubha karya |
| Mishra / Sadharana (mixed) | Krittika, Vishakha (+ Wednesday) | fire-related work, welding, melting, fabrication, preparing medicines, Agnihotra, routine mixed work |
| Kshipra / Laghu (swift) | Ashwini, Pushya, Hasta, Abhijit (+ Thursday) | trade, opening a shop, selling, starting education, ornaments, fine arts, medicine, short tasks; also anything in Chara; Pushya not for marriage |
| Mridu / Maitra (gentle) | Mrigashira, Chitra, Anuradha, Revati (+ Friday) | marriage, music and arts, new clothes and jewellery, making friends, auspicious ceremonies; also anything in Dhruva |
| Tikshna / Daruna (sharp) | Ardra, Ashlesha, Jyeshtha, Mula (+ Saturday) | tantra, black magic, separation, taming animals, incisive/aggressive acts, hatha-yoga sadhana; also anything in Ugra |

Rule of thumb for scoring: match event class -> nature; +2 for primary class, +1 for the "also" class, -2 for Ugra/Tikshna on a shubha event.

### 4.3 Tithis: deities and groups

Deities per dekhopanchang (matches the Agni-first list in most North Indian panchangs; one Wikipedia-derived table puts Brahma first) `[S]`/`[CONFLICT]`. Groups per Jyotisha Ratnamala tradition. `[S]` https://dekhopanchang.com/learn/tithis

| Tithi | Deity | Group | Good for | Avoid for |
|---|---|---|---|---|
| 1 Pratipada | Agni | Nanda | starts, education, celebrations | heavy commitments (Krishna 1 after Purnima weak) |
| 2 Dwitiya | Brahma | Bhadra | building, property, investments, marriage | -- |
| 3 Tritiya | Gauri | Jaya | competition, legal, marriage, griha pravesha | -- |
| 4 Chaturthi | Ganesha | Rikta | demolition, debts, surgery, tantra, Ganesha puja | all shubha karya |
| 5 Panchami | Nagas (Lakshmi in devotional use) | Purna | completion, charity, marriage, learning, medicine | -- |
| 6 Shashthi | Kartikeya | Nanda | starts, celebrations | travel (yatra varjya), Krishna 6 weak |
| 7 Saptami | Surya | Bhadra | property, travel, marriage | -- |
| 8 Ashtami | Rudra (Durga in devotional use) | Jaya | victory, weapons, Durga puja, fasting | marriage, griha pravesha (Raman), surgery |
| 9 Navami | Durga | Rikta | demolition, surgery, Durga puja | shubha karya |
| 10 Dashami | Dharma (Yama) | Purna | completion, charity, marriage | -- |
| 11 Ekadashi | Vishnu (Vishvedevas) | Nanda | fasting, starts, religious work | eating grain; travel for some |
| 12 Dwadashi | Vishnu | Bhadra | property, marriage, parana | yatra (some) |
| 13 Trayodashi | Kamadeva (Shiva in devotional use: Pradosha) | Jaya | victory, marriage, griha pravesha, Dhanteras buying | -- |
| 14 Chaturdashi | Shiva | Rikta | Shiva puja, surgery, tantra | shubha karya |
| 15 Purnima | Chandra | Purna | puja, charity, satyanarayana, completion | marriage (Raman), surgery |
| 30 Amavasya | Pitris | Purna | shraddha, tarpana, Lakshmi puja (Diwali) | all beginnings, travel |

Paksha rule: Shukla tithis are strong; Krishna tithis up to 8 are acceptable, 9-14 weak; a tithi "of medium quality" in Shukla is "good" in Krishna reversed order per one Indology post `[S1]`. Dagdha/Visha/Hutashana tithi-vara table in 3.3. Kshaya/Vriddhi: observances on vriddhi Ekadashi take the second day, others the first `[S]` dekho.

Devotional tithi associations (section 5): Chaturthi Ganesha (Sankashti/Vinayaka), Panchami Lakshmi/Sarasvati (Vasant Panchami, Naga Panchami for Nagas), Shashthi Kartikeya (Skanda Shashthi), Saptami Surya (Ratha Saptami), Ashtami Durga/Krishna (Durgashtami, Janmashtami), Navami Rama/Durga, Ekadashi Vishnu, Trayodashi Shiva (Pradosha), Chaturdashi Shiva (Shivaratri), Purnima Chandra/Guru/Satyanarayana, Amavasya Pitris/Lakshmi (Diwali). `[S]` dekho dates pages; Wikipedia List of Hindu festivals.

### 4.4 Varas: lords and deeds

| Vara | Lord | Nature | Classical deeds (Brihat Samhita 103/104 via dekho; Raman) | Modern panchang summary |
|---|---|---|---|---|
| Sunday (Ravi) | Sun | krura / fixed | gold, copper, medicine, fire, weapons, sovereign/government business, cattle; coronation | leadership, health, govt work, starting service (Dhruva day); no marriage (Raman) |
| Monday (Soma) | Moon | saumya / movable | water, flowers, fruits, gems, clothes, women's matters, auspicious ceremonies, agriculture | home, travel, marriage, griha pravesha, planting |
| Tuesday (Mangala) | Mars | krura / fierce | fire, weapons, surgery, litigation, metals, confrontation | property deals, debt recovery, Hanuman puja; no shubha karya, no travel |
| Wednesday (Budha) | Mercury | saumya / mixed | education, writing, accounts, trade, art, mediation | business, study, commerce, exams; no Abhijit on Wednesday |
| Thursday (Guru) | Jupiter | saumya / swift | religious rites, teaching, marriage, vidyarambha, gold, finance | marriage, puja, guru-related, finance; Guru Pushya |
| Friday (Shukra) | Venus | saumya / gentle | marriage, music, dance, perfumes, ornaments, vehicles, women | weddings, luxury purchases, arts, vehicles |
| Saturday (Shani) | Saturn | krura / sharp | iron, oil, servants, long-lasting construction, finishing jobs, prisons | property, iron/oil, completion; avoid new starts; Shani puja |

`[S]` https://dekhopanchang.com/en/learn/vara ; https://astromedha.in/insights/concepts/what-is-vara ; Raman's Muhurtha. Vara-dosha combos are in 3.3. Weekday is the lowest-weighted limb for marriage.

---

## 5. The devotional layer (Vanamali's voice)

Note on sourcing: Vanamali Mataji's books (Inner Traditions) are not freely available online; the search located the ashram site, publisher descriptions, a Goodreads quote from *Hanuman*, a TOC line from *Shiva* ("Shiva is the remover of tears" vs Ganesha "the remover of obstacles"), and her Instagram/Uddhava Gita discourse schedule. Everything attributed to her below is paraphrase of her published framing, not quotation, unless marked. `[S]` https://vanamaliashram.org/ ; https://archive.org/details/shivastoriesteac0000vana ; https://www.goodreads.com/work/quotes/15499230 . The founder should pull exact passages from his own copies for app copy.

### 5.1 Time as a face of God

- Gita 11.32: "kālo 'smi loka-kṣaya-kṛt pravṛddho" -- Prabhupada: "Time I am, the great destroyer of the worlds" (under 15 words, attributed). `[P]` https://vedabase.io/en/library/bg/11/32/ . Mukundananda notes kāla derives from kalayati = gaṇayati, "to count". `[P]` https://www.holy-bhagavad-gita.org/chapter/11/verse/32/
- Gita 10.30 "kālaḥ kalayatām aham" -- "among subduers I am time"; 10.33 "aham evākṣayaḥ kālo dhātā" -- "I am inexhaustible time, and the creator facing everywhere". `[P]` https://www.holy-bhagavad-gita.org/w/kalah
- Gita 8.23-26: the shukla and krishna paths (Uttarayana/day/bright fortnight vs Dakshinayana/night/dark fortnight) for the yogi's departure -- the one place the Gita itself ranks times, and then 8.27 says the devotee who knows this is not deluded by either: the devotional position in one verse. `[M]` (verse numbers standard; translation not re-fetched).
- Mahabharata: "kālaḥ pacati bhūtāni" (Adi 1.188 / Shanti 231.25, 309.90) -- Time cooks all beings; Yudhishthira's Yaksha-prashna answer: the Sun is the fire, days and nights the fuel, months and seasons the ladle. `[P]` https://enjoylearningsanskrit.com/scriptures/mahabharata/book-1/chapter-1/verse-188 ; https://ramakrishna.org/timeandspirituallife1.html
- Bhagavata 3.11 lays out the time ladder (paramanu, anu, trasarenu, truti, vedha, lava, nimesha, kshana, kashtha, laghu, nadika, muhurta, prahara/yama, day) -- a muhurta is 2 nadikas (ghatis) = 1/30 day. `[M]` (SB 3.11.5-10; verify on vedabase).
- Vanamali's framing (paraphrase, from the Krishna and Shiva books' publisher descriptions and her Gita teaching): Krishna is the lila-purushottama who *plays* in time; Shiva is Mahakala, the one who stands beyond time; Shakti is Kali, time's own energy. For her, choosing a muhurta is not fear of time but courtesy toward it: aligning one's small rhythm with the cosmic one (ritu, ayana) before acting. `[S]` paraphrase.

### 5.2 The sacredness of beginnings; Ganesha first

- Every muhurta rite opens with Ganapati puja / smarana ("vakratunda mahakaya ..."), then Punyahavachana, then sankalpa. Ganesha is Vighnaharta, the remover of obstacles, and Vighnakarta, their placer, which is why he is propitiated *before* the auspicious moment rather than relied on instead of it. The Ozar/Mudgala Purana myth: Kala himself takes the form of Vighnasura, the obstacle-demon, and only Ganesha subdues him -- the mythic statement that Ganesha outranks the clock. `[S]` https://en.wikipedia.org/wiki/Vigneshwara_Temple,_Ozar ; https://en.wikipedia.org/wiki/Vighnaharta_Ganesha
- Vanamali: "while Ganesha is known as the remover of obstacles, Shiva is the remover of tears" (Shiva, Inner Traditions; Barnes & Noble excerpt). `[S]` https://www.barnesandnoble.com/w/shiva-vanamali/1114315435
- Chaturthi (4th tithi, a Rikta "void" tithi in muhurta) is Ganesha's day: the tradition deliberately gives the god of beginnings a tithi that muhurta rejects for beginnings. Good copy: "even the empty tithi is full when it is His."

### 5.3 Bhava and shraddha outrank mechanics

- Gita 17.3 "śraddhāmayo 'yaṃ puruṣaḥ, yo yac-chraddhaḥ sa eva saḥ" -- a person is made of faith; 17.28 "aśraddhayā hutaṃ dattaṃ ... asad ity ucyate" -- without shraddha, rite, gift and tapas are asat. `[M]` (verse numbers standard).
- Garuda Purana (Vishnu-bhakti chapter, Dutt tr. ch. 236): what use is a sacrifice to one who every moment performs the sacrifice of remembering Hari. `[P]` https://www.wisdomlib.org/hinduism/book/the-garuda-purana-dutt/d/doc122716.html
- The muhurta texts themselves open with the mangala-charana to Ganesha, Sarasvati and the guru before a single rule; Muhurta Chintamani 1.1 invokes Ganesha and the Sun. `[M]`

### 5.4 Ritu and the festival wheel

Six ritus of two solar months: Vasanta (Chaitra-Vaishakha; Meena-Mesha nirayana ~mid-Mar to mid-May), Grishma (Jyeshtha-Ashadha), Varsha (Shravana-Bhadrapada), Sharad (Ashwina-Kartika), Hemanta (Margashirsha-Pausha), Shishira (Magha-Phalguna). Ayana: Uttarayana from Makara sankranti (nirayana, ~14 Jan) to Karka sankranti (~16 Jul); Dakshinayana the rest. `[P]` https://en.wikipedia.org/wiki/Ritu_(season) . Dharmic rhythm: Uttarayana for upanayana, marriage, griha pravesha; Dakshinayana (Chaturmas within it) for vrata, pilgrimage, study, pitru karma. Festival anchors by tithi are in 4.3; festival date *determination* follows Dharmasindhu/Nirnayasindhu (section 1.10), not muhurta.

### 5.5 Desha-kala sankalpa (what the app should be able to recite)

Template (Smarta, Drik Panchang's and the Advaita-l text, Shuddha Sanskrit; spelling varies) `[P]` https://www.drikpanchang.com/panchang/sankalpa/sankalpa.html ; https://advaita-vedanta.org/archives/advaita-l/2011-May/027296.html :

```
oṃ tat sat | adya brahmaṇaḥ dvitīya-parārdhe | śrī-śveta-varāha-kalpe |
vaivasvata-manvantare | kali-yuge | prathama-pāde |
jambū-dvīpe | bhārata-varṣe | bharata-khaṇḍe | (āryāvarta/dakṣiṇāpatha...) |
(śakābde / vikramābde) ... | prabhavādi-ṣaṣṭi-saṃvatsarāṇāṃ madhye <X>-nāma-saṃvatsare |
<uttara/dakṣiṇa>-ayane | <ṛtu>-ṛtau | <māsa>-māse | <śukla/kṛṣṇa>-pakṣe |
<tithi>-tithau | <vāra>-vāsare | <nakṣatra>-nakṣatre | <yoga>-yoge | <karaṇa>-karaṇe |
evaṃ-guṇa-viśeṣaṇa-viśiṣṭāyāṃ śubha-tithau |
<gotra>-gotraḥ <nāma>-śarmā/varmā/guptaḥ ahaṃ |
<devatā>-prītyarthaṃ / <kāmya> siddhyarthaṃ <karma> kariṣye ||
```

Notes: "aṣṭāviṃśatitame kali-yuge" (28th chaturyuga's Kali) is the correct form, not "aṣṭāvigumśati" (thread correction). Fields the engine must supply: samvatsara name (60-year Jovian cycle; North and South differ by name-drift since the North stopped dropping kshaya samvatsaras: Drik shows both), ayana, ritu, masa (with Amanta/Purnimanta and adhika flag), paksha, tithi, vara, nakshatra, yoga, karana at the moment of sankalpa. Overseas: "krauñca-dvīpe" or "amerikā-khaṇḍe" conventions vary; let the user edit the desha line. `[S]`

### 5.6 Shanti mantras suitable for opening the app

- "oṃ saha nāv avatu | saha nau bhunaktu | saha vīryaṃ karavāvahai | tejasvi nāv adhītam astu mā vidviṣāvahai | oṃ śāntiḥ śāntiḥ śāntiḥ" -- Taittiriya Upanishad 2.2.2 (also Katha); the teacher-student peace. `[P]` https://sanskritimagazine.com/shanti-mantra-for-guru-and-disciple
- "oṃ bhadraṃ karṇebhiḥ śṛṇuyāma devāḥ ..." -- Mundaka/Mandukya/Prashna opening (Atharva tradition); "may we hear and see what is auspicious". `[P]` https://shlokam.org/?p=112729
- "oṃ pūrṇam adaḥ pūrṇam idam ..." -- Isha Upanishad invocation (Shukla Yajurveda; Brihadaranyaka 5.1.1). `[P]` https://en.wikipedia.org/wiki/Shanti_Mantras
- "oṃ asato mā sad gamaya | tamaso mā jyotir gamaya | mṛtyor mā amṛtaṃ gamaya" -- Brihadaranyaka 1.3.28. `[M]` for the citation.
- "oṃ dyauḥ śāntir antarikṣaṃ śāntiḥ pṛthivī śāntir āpaḥ śāntir ..." -- Shukla Yajurveda 36.17; the peace of each world, fitting for a time-app ("may the heavens, the sky, the earth be at peace"). `[M]` for the citation.
- "oṃ svasti na indro vṛddhaśravāḥ ..." -- Rig Veda 1.89.6, the svasti-vachana recited at every muhurta rite. `[M]`
- Short Krishna line for Vanamali's audience: "oṃ namo bhagavate vāsudevāya" (12-syllable Vasudeva mantra, Bhagavata). `[P]` https://mahakatha.com/mantras/krishna/om-namo-bhagavate-vasudevaya/

---

## 6. Lesser-known and regional sources

### 6.1 Tamil: Vakya vs Thirukanitha (Drik)

Vakya panchangam computes from Surya-Siddhanta-era mnemonic sentences (vākyas; Vararuchi's Chandra-vakyas, Pancha-bodha), with its own ayanamsa; Thirukanitha uses observed/ephemeris positions with Lahiri. Differences: tithi/nakshatra ends shift by minutes to hours, sankranti instant differs by 2-6 h so solar month start can differ by a day; Vakya Pambu Panchangam is still followed by many Tamil temples and Vaishnava sampradayas; Thirukanitha by most families and all apps. `[S]` https://en.wikipedia.org/wiki/V%C4%81kyapa%C3%B1c%C4%81%E1%B9%85ga ; https://thirukanitham.com/drik-vs-vakya ; https://astroyogam.in/guides/vakya-vs-thirukanitha-panchangam . App implication: offer `tradition: "vakya"` only as an informational overlay (can be approximated by using Surya Siddhanta ayanamsa and mean elements), default Drik.

### 6.2 Telugu, Kannada, Malayalam, Bengali almanacs

- Telugu Gantala Panchangam (Mulugu, Pidaparti, Sringeri-approved panchangams): Drik-based since the 1980s, strong on Varjyam, Durmuhurtam, Amrita-ghadiyalu, Rahu/Yama/Gulika with *night* tables; Ugadi panchanga-shravanam fixes the year's Navanayaka (planetary cabinet). `[S]` https://www.prokerala.com/astrology/telugu-panchangam/
- Kannada Ontikoppal Panchanga (Mysore): Drik, Shalivahana Shaka Amanta; the reference for Karnataka marriages. `[M]`
- Malayalam Mathrubhumi and Deepika Panchangam: Kollam era solar months; Malayalam tradition stresses nakshatra (nal) above tithi, "Muhurtha-padavi" and Panchaka differently; Thiruvathira, Vishu (Mesha sankranti), Onam (Thiruvonam nakshatra in Chingam). `[M]`
- Bengali: Beni Madhab Sil's "Phool Panjika" and Gupta Press follow Surya Siddhanta constants (hence differ from Drik by up to a day for sankranti and tithi); the Vishuddha Siddhanta Panjika (Madhab Chandra Chattopadhyay, 1890) follows Drik and is used by a minority and by Bangladesh's reformed calendar. `[P]` https://en.wikipedia.org/wiki/Vishuddha_Siddhanta_Panjika ; https://en.wikipedia.org/wiki/Panjika . Bengali marriage months and the "Dik-shul", "Jog" usage differ; Bengal observes Purnimanta names for some festivals via Smriti (Raghunandana's Tithitattva, 16th c., is the Bengali Dharmasindhu equivalent) `[M]`.
- Nepal: the Nepal Panchanga Nirnayak Samiti publishes the official Bikram Sambat and festival dates in the gazette; no simple algorithm reproduces it. `[S]` https://github.com/kitsuyui/hyper-calendar/pull/95

### 6.3 Digital libraries

- Internet Archive: Muhurta Chintamani (Mahidhar Sharma ed.), Muhurta Martanda (two scans), Brihat Samhita (Bhat, Iyer, Bhattotpala), Jyotisha Ratnamala (eGangotri scan), Panchangam Calculations (Karanam L. Ramakumar, CC0; tiny but exact worked examples for tithi, nakshatra, durmuhurtam, yogas) https://archive.org/details/PanchangamCalculations `[P]`; Raman's Muhurtha http://www.panchanga.lv/wp-content/uploads/2020/06/Muhurta_Raman.pdf `[P]`.
- Wisdomlib: Brihat Samhita English, Garuda/Skanda Puranas, the Prashnamarga Amrita-ghatika essay. https://www.wisdomlib.org/hinduism/book/brihat-samhita
- Vedic Heritage Portal (IGNCA, launched 2023): Vedangas section lists Jyotisha; the page itself admits no Jyotisha work is yet mounted ("there is no work available at present dealing with ancient Vedic astronomy"). `[P]` https://vedicheritage.gov.in/vedangas/ . Useful for Taittiriya audio and Nakshatra-sukta recitation, not for muhurta.
- Muktabodha Digital Library: 3,000+ texts; its Vedic holdings are ritual manuals (Apastamba, Baudhayana, Hiranyakeshi, 238 Gokarna manuscripts) which contain the actual sankalpa and samskara procedures; no dedicated Jyotisha collection found. `[P]` https://muktabodha.org/digital-library/ ; https://muktabodha.org/digital-vedic-texts-from-gokarna/
- GRETIL (Gottingen) hosts e-texts of Surya Siddhanta and Brihat Samhita in transliteration `[M]`; sanskritdocuments.org hosts Nakshatra Sukta and Valmiki Ramayana with word-by-word translation `[P]` https://sanskritdocuments.org/sites/valmikiramayan/baala/sarga71/bala_71_prose.htm
- IFP Pondicherry manuscript catalogue: Kalaprakashika witnesses. https://digitalcollections.ifpindia.org/s/manuscripts/item/396969
- Academic: S. Balachandra Rao, *Indian Astronomy: An Introduction* (2000) and *Indian Astronomy: Concepts and Procedures* (2014) -- worked panchanga procedures from Siddhantic parameters; https://www.cse.iitk.ac.in/users/amit/books/rao-2000-indian-astronomy-introduction.html ; INSA review https://insa.nic.in/writereaddata/UpLoadedFiles/IJHS/Vol50_2015_2_Art13.pdf . Vinod Mishra, "The Calendars of India" https://arxiv.org/pdf/1007.0062 . Abhyankar, "Birth and early development of Indian astronomy" https://arxiv.org/pdf/physics/0101063 . Ganesha Daivajna's Grahalaghava (1520) is the karana most printed panchangs still derive from https://en.wikipedia.org/wiki/Grahalaghava .
- University departments: Sampurnanand Sanskrit University (Varanasi) Jyotish faculty publishes the "Vishva Panchangam" (the reference panchang for Kashi tradition); BHU's Jyotish department publishes a Drik-based panchang and the "Kashi Vishwanath" festival calendar. Neither surfaced in search this pass; `[M]` for existence, confirm URLs.

### 6.4 Open code and data

- No public JSON/CSV panchang *dataset* with a license was found. What exists:
  - webresh/drik-panchanga (Python, pyswisseph, Lahiri; the canonical open reference; README explains Drik vs Surya Siddhanta) https://github.com/webresh/drik-panchanga `[P]`
  - rahulyhg/drik-panchanga-skaligotla (fork) https://github.com/rahulyhg/drik-panchanga-skaligotla
  - @fusionstrings/panchangam (JSR, TypeScript, Swiss Ephemeris 2.10.03, runs on Cloudflare Workers; sunrise-based day) https://jsr.io/@fusionstrings/panchangam `[P]` -- relevant to the Sakred stack.
  - A zero-dependency MIT TypeScript sky engine (46" accuracy) to avoid Swiss Ephemeris' AGPL https://dev.to/svarbhanu/i-built-a-zero-dependency-sky-engine-in-typescript-verified-to-46-arcseconds-317h `[S]`
  - Swiss Ephemeris licence: AGPL-3 or paid; Moshier fallback is accurate enough for panchanga (arc-second level for Sun/Moon over +-3000 years). `[S]`
- Drik Panchang publishes no accuracy document; its stated method is: Swiss-Ephemeris-class positions, Lahiri, upper-limb-refracted sunrise by default, udaya-vyapini element assignment, end-times printed. `[P]` Drik sunrise + FAQ pages. Reconcile your engine against Drik for 3 cities x 365 days before launch; expect disagreement only at (a) sunrise-limb choice, (b) events within +-2 minutes of sunrise, (c) Varjyam off-by-one ghati conventions.

---

## 7. Ethics and humility: what the tradition itself says

1. The Vedanga Jyotisha's self-definition is "kāla-vidhāna-śāstra", the science of ordaining time *for yajna*. It never claims to control outcomes; it claims to sequence offerings. The honest frame for the app is "this is a calendar of courtesy toward time", not a fate machine. `[P]` section 1.1.
2. The classical lists carry their own exceptions. Nearly every one of the 21 mahadoshas has a cancelling condition ("Jupiter in kendra overcomes it", "Moon in 11th removes it", "when no better time exists the 4th-7th day after an eclipse is acceptable"). The texts expect the practitioner to find a workable time, not to declare all days closed. `[P-via-Raman]` jyotishkalpadrum.
3. Dharmasindhu contains apad-dharma: in distress, the Asura form of marriage may be held "at any time"; brothers' samskaras may be held together by changing the mandapa or officiant; exchange marriages are allowed under compulsion. Law itself bends for need. `[P-digest]` kamakoti ch. 21.
4. Weekday is explicitly the weakest limb; Guru/Shukra asta and Bhadra the strongest. Any app that shows a red "inauspicious" for a Tuesday but ignores Shukra-asta inverts the tradition's own priorities. `[S]` dekho vara page.
5. Devotional override, stated in the texts: Garuda Purana (ch. 236) says constant remembrance of Hari outranks ritual sacrifice; Gita 17.28 says a rite without shraddha is asat; 8.27 says the devotee is not deluded by the two paths of time. The popular saying "shubh muhurat is when the guru says begin" is widespread oral tradition but no scriptural verse for it was found -- do not print it as a quotation. `[S]`
6. Regional disagreement is normal. Vakya vs Drik, Amanta vs Purnimanta, Raman vs Chintamani numbering, Drik vs Telugu Varjyam ghati: the same family may get two different answers from two panchangs printed in the same city. The "confirm with your family pandit" line is not a disclaimer, it is how the system actually works: the panchang proposes, the kula-purohita disposes, taking into account gotra, sutaka, family custom (kula-achara), which no app can know. `[S]`
7. Abujha muhurtas (Akshaya Tritiya, Vijaya Dashami, Vasant Panchami, Devutthani Ekadashi, Gudi Padwa) exist precisely so that the poor and the hurried could marry without a jyotishi; a kind app surfaces these. `[M]`
8. What the tradition says *not* to do: it never prescribes muhurta for pitru-karma (death rites happen when they must, with Panchaka-shanti effigies if needed), never for medical emergencies (Ugra nakshatras exist so surgery can always be timed, not postponed), and never over the guru's or elders' word. `[S]` dekho Panchak page.

Suggested copy stance: "SubhDate reads the panchanga the way a careful pandit would, following Muhurta Chintamani and Dharmasindhu, with Drik (observed) positions and Lahiri ayanamsa. It cannot know your family's customs. Treat its suggestions as a shortlist, and let your purohita or elders make the final call. The tradition itself says the best muhurta is the one begun with shraddha."

---

## Appendix A: Encoding checklist (derived)

- [ ] Ephemeris: Swiss Ephemeris or Moshier; sidereal Lahiri; geocentric apparent longitudes.
- [ ] Sunrise model setting: upperLimbRefracted (default, Drik) | centerNoRefraction | centerRefracted.
- [ ] Panchanga limbs per 2.1 with end-times; udaya assignment; kshaya/vriddhi flags.
- [ ] Month engine: Amanta/Purnimanta/solar(Tamil/Kollam/Bengali/BS) per region; adhika/kshaya; samvatsara (North and South names).
- [ ] Day windows: Rahu/Yama/Gulika (day; optional night), Abhijit (not Wed), Brahma, 30 muhurtas + Durmuhurta table, Choghadiya day/night, Hora, Varjyam (Tamil vs Telugu offset), Amrit kaal, Pradosha (3 vs 6 ghati setting), Sandhya.
- [ ] Calendar blocks: Adhika masa, Kharmas (Sun in Dhanu/Meena), Chaturmas (Devshayani to Prabodhini Ekadashi), Holashtak (Phalguna Shukla 8 to Purnima), Pitru paksha, Guru/Shukra asta (11/10 deg, 8 deg retro; +3-day balya/vriddha), eclipses (+sutak), Sankranti windows (3 d / 1 d / 30 or 16 ghati), Vyatipata/Vaidhriti yoga and Mahapata windows.
- [ ] Personal: Tarabala (9), Chandrabala (1,3,6,7,10,11), Guru bala (bride), Surya bala (groom), 8th-lagna check, Gand Mool birth flags.
- [ ] Yogas: Sarvartha Siddhi, Amrita Siddhi (+ exceptions), Siddha (tithi-vara), Ravi/Guru Pushya, Tripushkara/Dwipushkara, Ravi yoga; doshas: Dagdha, Visha, Hutashana, Yamaghanta, Mrityu, Krakacha, Kuhu, Bhadra (with loka by Moon sign), Panchaka (nakshatra, weekday type; region flag), Gandanta (3 kinds).
- [ ] Lagna shuddhi: 21 mahadoshas as a scored list with cancellations; lagna-tyajya navamsas by weekday.
- [ ] Event profiles (3.5) as JSON: allowedNakshatras, allowedTithis, allowedVaras, allowedMonths, lagnaPref, hardBlocks, softPenalties, personalChecks.
- [ ] Sankalpa generator (5.5) with editable desha line.
- [ ] Tradition presets: north-purnimanta, gujarati, marathi-kannada-telugu, tamil-drik, tamil-vakya(info), kerala, bengali, nepal, diaspora (user picks home tradition; location from device).
- [ ] Every rule row carries `source`, `confidence` ([P]/[S]/[S1]/[M]) and `region` so the UI can show "why".

## Appendix B: Items still unverified (ask a Sanskrit-reading pandit or buy the book)

1. Muhurta Chintamani Vivaha prakarana verses on Latta, Pata, Yuti, Vedha, Jamitra, Bana, Upagraha (exact counts).
2. Amrita Siddhi exceptions per weekday.
3. Chudakarana, Karnavedha, Garbhadhana, Seemantha nakshatra lists from the Samskara prakarana.
4. Remaining 23 Amrita-ghati values (wisdomlib Prashnamarga essay has them).
5. Night Rahu/Yama/Gulika table used by Telugu panchangams.
6. Bhadra mukha/puccha ghatis.
7. Lahiri 1956 epoch wording of the Calendar Reform Committee.
8. Kollam 3/5-day aparahna fraction; Bengali midnight rule.
9. Vanamali verbatim passages on Kala (Complete Life of Krishna, ch. on Vishvarupa; Shiva, ch. on Mahakala) for app copy.
10. Vedanga Jyotisha verse numbering in Kuppanna Sastry's edition for the "kala-vidhana-shastra" line.
