# ShubhDate night build — CHECKPOINT

Updated: 2026-10-16 ~05:50 Toronto (run 1, Claude Fable 5.1)

## Done (committed + pushed to https://github.com/SakredStudio/subhdate)
- Steps 0–7 complete: scaffold, L0 astro, L1 panchanga, golden gate, L2 kala, L3 flags, L4 personal, L5 muhurta (12 packs), festivals by rule, L6 explain + i18n (EN/HI/Hinglish reasons; EN/HI/GU terms; sankalpa IAST + Devanagari).
- Step 8 PWA in `app/`: Today (panchang, kala, choghadiya with "now", hora, flags, festival of the day, sankalpa, diaspora banner, personal bala), Find Muhurta (12 events, range, city, strictness, birth toggle), Result detail (windows, in-favour/against sentences, caveats, sources, Save / Share / .ics), Festivals (6 months, puja windows, moonrise, diaspora notes), Saved (IndexedDB), Settings (9 languages, region, month naming, sunrise convention, Abhijit-on-Wednesday, birth details with janma nakshatra, waitlist link), About/How we calculate, Privacy, first-run language+city screen. Engine runs in a Web Worker; day payloads cached in IndexedDB; service worker offline shell; manifest + generated PNG icons.
- Verified in the browser (dev server): Today for Toronto 2026-10-16 (sunrise 07:33, tithi Shashthi till 20:24, Rahu 11:40–13:02 etc.), muhurta search Nov 18–Dec 15 Toronto vivaha (28 days, first wedding day Nov 20/21 after Devutthani), result detail, festivals list with diaspora notes, settings.
- GitHub Pages enabled (build_type = workflow via gh api). Workflow `.github/workflows/deploy.yml`: tests + golden validation + typecheck + build + deploy. First run failed only because Pages was not yet enabled; second run triggered by the latest push.

## Verified numbers
- Oracle 7160/7161 (99.99%); Moon histogram p99 5.6"; Drik manual 220/220 (100%); kala vs Drik 65/65; 72 unit/golden tests green; typecheck clean; `vite build` OK (app 90 KB, worker 185 KB raw).

## Next step
1. Confirm the Pages deploy (`gh run list`), load https://sakredstudio.github.io/subhdate/, check SW registration + offline reload, Today for Toronto and Mumbai vs Drik.
2. Append the shipped line to C:\sakred-os\LIVE-GO-PLAN.md §4.1.
3. Final CHECKPOINT with the morning report.

## Known gaps / UNVERIFIED (also marked in data files)
- Service worker: in the Vite dev server the registration logs "unknown error fetching the script"; to be confirmed on the production build / live site.
- Drik's Lahiri runs ~16" ahead of SE's; sankranti instants differ by ~4 min (Makara 2027: SE 21:10 IST, Drik 21:14).
- Jovian samvatsara names beyond 2026, Amrit kaal offset, sagai/mundan/bhoomi lists, Monday 9th durmuhurta, Bhai Dooj/Vasant Panchami day rules: UNVERIFIED.
- Night Rahu kaal, lagna/sthira-lagna, Vakya mode, partner bala: not in v1.
- Waitlist URL is a placeholder constant `WAITLIST_URL` in app/main.ts (Soul to replace with the Google Form link).
- City list is hand-curated (~330 cities); GeoNames import planned.
- Beta languages (MR/TA/TE/BN/KN) have ~30 UI strings each; reasons fall back to English.
