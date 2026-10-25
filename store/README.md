# Play Store listing package for ShubhDate

Everything the Play Console asks for, and which file holds each answer. Fill the Console top to bottom with this
table open; nothing else needs thinking. Build/upload steps are in `docs/PLAY-TWA.md`.

## Play Console checklist

| Console section | Field | Value / file |
|---|---|---|
| Create app | App name | `ShubhDate` (store title is set per language below) |
| | Default language | English (United Kingdom) (`en-GB`) |
| | App or game | App |
| | Free or paid | Free (contains in-app purchases) |
| | Declarations | Developer Program Policies: yes · US export laws: yes |
| Main store listing (en-GB) | App name (≤ 30) | `store/listing-en.md` → App name |
| | Short description (≤ 80) | `store/listing-en.md` |
| | Full description (≤ 4000) | `store/listing-en.md` |
| | App icon 512×512 PNG, 32-bit, ≤ 1 MB | `store/icon-512.png` (opaque, no alpha) |
| | Feature graphic 1024×500 PNG/JPG | `store/feature-graphic.png` |
| | Phone screenshots 2–8, 16:9 or 9:16, 320–3840 px | `store/screenshots/en/01…08.png` (1080×1920, 9:16) |
| | 7-inch / 10-inch tablet screenshots | optional; the phone set is accepted (upload the same PNGs if the Console insists) |
| | Video | none |
| Translations | Hindi (hi-IN) | `store/listing-hi.md` + `store/screenshots/hi/01…06.png` |
| | Gujarati (gu-IN) | `store/listing-gu.md` + `store/screenshots/gu/01…06.png` |
| Store settings | App category | Lifestyle |
| | Tags | Calendar, Astrology, Hinduism, Festivals, Indian (pick up to 5 that the Console offers) |
| | Contact email | `hello@sakredstudio.ca` (placeholder: confirm it exists and receives mail) |
| | Website | `https://shubhdate.sakredstudio.ca/` |
| | Phone | optional, leave blank |
| App content → Privacy policy | URL | `https://shubhdate.sakredstudio.ca/privacy.html` |
| App content → Ads | Contains ads? | No |
| App content → App access | All functionality available without special access? | Yes (no login) |
| App content → Content rating | Questionnaire | `store/data-safety.md` § Content rating (IARC) |
| App content → Target audience | Age groups | 18 and over; not designed for children |
| App content → News app | Is this a news app? | No |
| App content → COVID-19 | | No |
| App content → Data safety | Form | `store/data-safety.md` § (a) for the v1.0 build; switch to § (b) when reminders ship |
| App content → Government apps | | No |
| App content → Financial features | | No financial features |
| App content → Health | | Not a health app |
| Monetise → Products | In-app products | `report_single`: one-time, consumable, ₹99 / US$4.99 · `family_annual`: subscription, yearly, ₹299 / US$14.99 (use Play's price templates for other currencies; set up only after the first AAB is uploaded) |
| Release → Internal testing | AAB | built on Soul's PC per `docs/PLAY-TWA.md`; release notes from `store/listing-en.md` § Release notes |

## Image rules (as of 2026)

- App icon: 512×512 PNG, 32-bit, **no transparency** (Play adds its own rounding), ≤ 1 MB. `store/icon-512.png` is opaque.
- Feature graphic: 1024×500, PNG or JPEG, ≤ 15 MB, no transparency. Shown at the top of the listing and in promotions.
- Phone screenshots: 2 to 8, JPEG or 24-bit PNG (no alpha), each side 320–3840 px, aspect 16:9 or 9:16. Ours are 1080×1920 (9:16), framed with a headline in the listing language.
- Tablet 7-inch: up to 8, 320–3840 px; 10-inch: up to 8, 1080–7680 px. Optional unless you want the "designed for tablets" badge.
- Keep every PNG under 8 MB (ours are < 200 KB after palette compression).

## Regenerating the images

```bash
npm run build && npx vite preview --port 4173 &
node tools/dev/store-shots.mjs     # raw 1080×1920 captures -> store/screenshots/raw/
node tools/dev/store-frames.mjs    # framed EN/HI/GU shots + feature graphic
```

Headlines live in `tools/dev/store-frames.mjs` (`COPY`); shot settings (city, language, pinned date) in `tools/dev/store-shots.mjs`.
