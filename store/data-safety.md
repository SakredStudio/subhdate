# Data safety, content rating and declarations (Play Console → App content)

Two versions of the Data safety form: **(a)** the v1.0 build as shipped (nothing collected), and **(b)** the same
form after festival reminders are switched on (needs the Worker + VAPID keys; the toggle is hidden until then) and
after Play Billing products exist. Submit (a) now; re-submit as (b) with the release that enables reminders.
Keep the app consistent with this file: it is the truth table (see also `docs/WORKER.md` and `privacy.html`).

## (a) Data safety for v1.0 (as shipped)

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | n/a (nothing collected). If the form insists: Yes (HTTPS only) |
| Do you provide a way for users to request that their data is deleted? | n/a; if asked: Yes (clear Settings / uninstall removes everything, which is on the device only) |
| Data types | none |

Why "No" is true for v1.0:
- The app has no server, no account, no analytics SDK and no ads SDK. The only network requests are the app's own
  static files from shubhdate.sakredstudio.ca (GitHub Pages) and the Google Fonts stylesheet (Google receives the usual request
  metadata for fonts, as for any website; Play's form does not count it as app data collection).
- Birth date, time and place (personal info) are entered optionally and stored only in the browser's local storage on
  the device; they are processed on the device (Tara bala / Chandra bala) and never transmitted. Play's definition of
  "collected" is "transmitted off the device"; on-device-only processing is explicitly out of scope.
- "Use my location" (optional) reads the device location once to pick the nearest city; it is not stored beyond the
  chosen coordinates and never transmitted.
- The Muhurta Report is rendered and printed on the device; names typed on the cover stay in local storage.

## (b) Data safety once reminders and Play Billing are live

**Collected:**

| Data type (Play category) | Collected | Shared | Optional | Purpose | Ephemeral | Deletable |
|---|---|---|---|---|---|---|
| Device or other IDs → the Web Push endpoint and keys (browser-issued, anonymous) | Yes | No | Yes (only if the user turns reminders on) | App functionality (delivering reminders) | No (stored until the user turns reminders off) | Yes: the Settings toggle deletes it from the server |
| Location → Approximate location (home-city coordinates rounded to 0.01°, with time zone; not GPS) | Yes | No | Yes | App functionality (festival dates depend on local sunrise) | No | Yes (same toggle) |
| App info and performance → none | No | | | | | |
| Personal info → none (no name, email, phone) | No | | | | | |
| Financial info → **Purchase history is handled by Google Play**, not collected by the app. The app sends the Play purchase token and an anonymous device UUID to the ShubhDate server to issue the entitlement; the server stores a hash of the token and the UUID | Yes (Device or other IDs: the anonymous device UUID) | No | Yes (only on purchase) | App functionality (unlocking the purchase) | No | On request (support email) |

Language, region preset and reminder topics are also sent with the subscription; they are app settings, not a Play data
category, and are listed in `privacy.html` anyway.

**Shared:** nothing is shared with third parties. Google Play (billing) and the push service (Google FCM for Chrome on
Android) act as processors for their own functions.

**Security practices:** encrypted in transit (HTTPS/TLS) · users can request deletion (Settings toggle; support email for
entitlements) · data is not collected for advertising · no account.

## Content rating (IARC questionnaire)

Category: **Utility, productivity, communication or other**. Answer **No** to every item below:

| Question | Answer |
|---|---|
| Violence, blood, gore | No |
| Sexuality, nudity | No |
| Profanity, crude humour | No |
| Drugs, alcohol, tobacco | No |
| Gambling (simulated or real) | No |
| Fear / horror themes | No |
| Does the app allow users to interact or exchange content with other users? | No (no chat, no user-generated content, no social) |
| Does the app share the user's location with other users? | No |
| Does the app allow users to purchase digital goods? | **Yes** (the Muhurta Report and the Family Annual plan, through Google Play Billing only) |
| Does the app allow real-money gambling or transactions outside Google Play? | No |
| Does the app contain ads? | No |
| Miscellaneous: is it a web browser or search engine? | No |

Expected rating: Everyone / PEGI 3 / IARC "all ages" (the app is still declared 18+ as its target audience, below).

## Target audience and content

- Target age groups: **18 and over** only. Not designed for children; not a "Designed for Families" app.
- "Could the app unintentionally appeal to children?" No (text-heavy calendar and almanac).
- Astrology: no outcome promises anywhere in the listing or the app; the copy says "shortlist, not a prediction".

## Other declarations

| Declaration | Answer |
|---|---|
| Ads | No, the app does not contain ads |
| Government app | No |
| News app | No |
| COVID-19 contact tracing or status | No |
| Financial features | None (no loans, no payments outside Play) |
| Health | Not a health app; no health data |
| Data deletion | Deletion available in-app (Settings) and by email (hello@sakredstudio.ca) |
| App access | All features available without login; no credentials needed for review |
| Privacy policy URL | https://shubhdate.sakredstudio.ca/privacy.html |
