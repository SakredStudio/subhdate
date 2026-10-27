# ShubhDate — CHECKPOINT

Updated: 2026-10-18 (billing session, Claude on Soul's PC). Status: **v1 live on web + Play internal testing; production v1 submitted for review 2026-10-18; Play Billing code + Worker live, waiting on two Google-side steps only Soul can do.**

## Live
- Web app: https://sakredstudio.github.io/subhdate/ (GitHub Actions deploys `main` on every push; last push `c7aba85` carries the billing UI).
- **2026-10-19: v1 REJECTED (Broken Functionality: "does not open or load", evidence = stuck on splash). Rebuilt as 1.0.1 (versionCode 2) with TWA `fallbackType: webview` (was customtabs, which also needs Chrome); Soul signed, uploaded to Production, removed v1, resubmitted for review 2026-10-19.** TWA config backups: `shubhdate-twa/*.bak-v1`.
- Play: package `com.sakredstudio.shubhdate`, app id 4974689914396572445. Internal testing rolled out (opt-in https://play.google.com/apps/internaltest/4701723886498590184, 4 testers incl. sakredfamily@gmail.com). Production release v1 (versionCode 1, full rollout, 177 countries + rest of world) **in review** since 2026-10-18 (≤7 days; result mails sakredfamily@gmail.com). Managed publishing is OFF, so it goes live automatically the moment Google approves; nothing left to click. Rechecked 2026-10-19: no unsent changes. Billing verified end to end 2026-10-19 (test purchase OK, RTDN test row stored). Products: `report_single` (consumable, ₹99 / $4.99), `family_annual` (subscription, base plan `yearly`, ₹299 / $14.99).
- Worker: https://shubhdate-api.mihir86-mp.workers.dev (`/health` → `play:true, signing:true, push:true`). D1 `shubhdate` id `775e542c-d60d-4b38-905d-de84c57a9830`, schema applied (entitlements, rtdn_events, push_subscriptions, reminders_sent, claim_log). Secrets set: `ENTITLEMENT_PRIVATE_KEY_JWK`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `RTDN_TOKEN`. `PLAY_SERVICE_ACCOUNT` (uploaded 2026-10-18 after overriding the legacy org policy `iam.disableServiceAccountKeyCreation` on project `shubhdate`). Cron `0 */6 * * *` sends festival reminders.
- TWA project: `C:\sakred-os\projects\shubhdate-twa` (not a repo; keystore + signed AAB there; `SOUL-STEPS.md` holds the Soul-only runbook including the secret RTDN push URL).

## What was built this session (commit `c7aba85`)
- `app/billing.ts`: `isPlayBillingAvailable()` (Digital Goods API + PaymentRequest, Play TWA only), `listProducts()`, `purchase(sku)` = PaymentRequest(`https://play.google.com/billing`) → `show()` → purchase token → `claim()` → `complete('success')` → DGA `consume()` for `report_single`; `restorePurchases()` re-claims what Play still holds; `refreshIfStale()` (called at app start) re-issues a token older than 7 days when online.
- `app/screens/report.ts`: the locked card shows the two **real Play prices** with "Unlock this report", "Family plan / year" and "Restore purchases" only when the billing bridge exists; on the web it keeps the "coming in an update" line (no paywall, Play policy). Strings `report.buy*`, `report.restore*`, `report.unlocked`, `report.buyFailed`, `report.playNote` in EN/HI/GU/Hinglish.
- `app/config.ts`: real `WORKER_URL`, `ENTITLEMENT_PUBLIC_KEY_JWK`, `VAPID_PUBLIC_KEY`, `PLAY_LISTING_URL`. `WAITLIST_URL` still a placeholder (button hidden).
- Worker `src/`: `jws.ts` (base64url, ES256, RS256 from PKCS#8, sha256), `play.ts` (service-account JWT → OAuth token, `purchases.products.get/acknowledge/consume`, `subscriptionsv2.get`, `subscriptions.acknowledge`), `entitle.ts` (pure verdicts + token payload + RTDN mapping), `webpush.ts` (RFC 8291 aes128gcm + RFC 8292 VAPID in WebCrypto), `index.ts` routes:
  - `POST /v1/entitlement/claim` `{purchaseToken, sku, dev, packageName}` → validates, 20 claims/hour/device, same-device re-issue, 409 `token_claimed` for another device, 503 `play_api_not_configured` without the service account, verifies with Play, inserts, acknowledges (consumes `report_single`), returns `{token, sku, exp, credits?}`.
  - `POST /v1/entitlement/refresh` `{dev}` → 404 `none` or a fresh token from live rows (family plan wins, else report credits).
  - `POST /v1/rtdn?token=…` Pub/Sub push, 403 on bad token, idempotent by `messageId`; subscription 12/13 and voided purchases and one-time cancel → `revoked_at`; renewals → refetch `subscriptionsv2` and extend `expires_at`.
  - push subscribe/unsubscribe unchanged; cron now really delivers via `sendWebPush` and drops `gone` subscriptions.
- Tests: `worker/test/entitle.test.ts` (17) added to the vitest include. Full suite **100 tests** green, `npm run typecheck` (app + worker) clean, `npm run build` ok, Worker deployed and smoke-tested (health / claim 400+503 / refresh 404 / rtdn 403 all as designed).

## Steps only Soul can do (in order; 1 and 2 unblock real purchases)
1. [x] (done 2026-10-18 22:28; `/health` → `play:true`) **Play Developer API service account** (~15 min): Play Console → Setup → API access → link or create a Google Cloud project → "Create new service account" (follow the link to Cloud Console, role not needed there) → back in Play Console grant it access to ShubhDate with **"View financial data, orders and cancellation survey responses"** and **"Manage orders and subscriptions"** → in Cloud Console create a **JSON key** for it → in PowerShell:
   `cd C:\sakred-os\projects\subhdate\worker; Get-Content C:\path\to\key.json -Raw | npx wrangler secret put PLAY_SERVICE_ACCOUNT`
   then delete the JSON file. Check: `curl https://shubhdate-api.mihir86-mp.workers.dev/health` shows `"play":true`.
2. [x] (done 2026-10-18; Play test notification stored in rtdn_events) **RTDN** (~10 min): Cloud Console → Pub/Sub → create topic `shubhdate-rtdn`; on the topic add principal `google-play-developer-notifications@system.gserviceaccount.com` with role **Pub/Sub Publisher**; create a **push subscription** whose endpoint is the URL in `C:\sakred-os\projects\shubhdate-twa\SOUL-STEPS.md` §Billing (it contains the secret token; never paste it into the repo). Play Console → Monetize with Play → Monetization setup → Real-time developer notifications → topic name `projects/<project-id>/topics/shubhdate-rtdn` → Save → "Send test notification" → the Worker should log a row in `rtdn_events` (`npx wrangler d1 execute shubhdate --remote --command "select * from rtdn_events order by received_at desc limit 3"`).
3. [x] (done 2026-10-19; test purchase worked) **Licence tester**: Play Console → Setup → Licence testing → add sakredfamily@gmail.com (test purchases are free and auto-renew fast). Then on the phone, from the internal-testing build, run a wedding search → report → "Unlock this report": the card must unlock after the Play sheet; check `entitlements` has a row.
4. [ ] **Waitlist**: Google Form link into `app/config.ts` `WAITLIST_URL`, or leave hidden.
5. [ ] When Play approves production v1: nothing to do, the TWA wraps the live site, which already has the billing UI.

## Not done / UNVERIFIED
- No real purchase has been exercised yet (needs steps 1 and 3). The PaymentRequest `details.purchaseToken` shape follows the Digital Goods API spec and androidbrowserhelper 2.x; if the first test purchase fails with `no_token`, log `response.details` in `purchase()`.
- Subscription acknowledge uses the v1 endpoint (`purchases.subscriptions:acknowledge`), which Google still serves for subscriptionsv2 purchases.
- `rtdn_events` keeps raw envelopes forever; add a 90-day purge to the cron later.
- Everything in `docs/PANDIT-REVIEW.md` (20 UNVERIFIED rule rows) is unchanged.
- Store: screenshot reorder and HI/GU listing translations still pending; watch the review mail.

## Exact next step for the next run
After Soul's steps 1–3: do one test purchase of each SKU on the phone, read the `entitlements` + `rtdn_events` rows, fix anything the real Play payloads reveal, then re-run `tools/dev/store-shots.mjs` so screenshot 06 shows the price. Then the "finish early" list: household profiles, static SEO pages, Marathi.

## Namakarana (baby name by nakshatra) — LIVE on the web 2026-10-24
- Screen `#/naam` (new Naam tab + card on the Muhurta screen): birth date/time (unknown toggle)/city/gender → janma nakshatra, pada, rashi, lord, deity, Gand Mool note, ambiguous-time note, the four naming syllables (Devanagari/Gujarati, Shravana + U.Bhadrapada variants), curated names (521 EN/HI/GU + meanings), tap a name → 1080×1350 "Welcome, {name}" card (share sheet or PNG), top naming-ceremony dates (day 11–45 at the birth city, baby's own nakshatra avoided), printable 4-page report gated by the `naam_report` credit (free on the web only via the dev flag; Play Billing inside the TWA).
- Engine: `engine/namakarana.ts`, `engine/data/names.json`, Worker op `naam`; tests in `engine/test/namakarana.test.ts` (105 total green). Worker redeployed with `naam_report` as a second consumable credit (token field `naam`).
- Verified live at 360 px: result, card, report, no overflow. Service-worker cache v6.
- **Soul**: Play Console → Monetize → Products → In-app products → Create: product id `naam_report`, name "Namakarana report", one-time, ₹149 / US$9.99 (Play's price template for the rest), Activate. Then licence-test one purchase from the phone (Naam tab → report card → Unlock). Until the product exists the TWA shows the "optional purchase" line instead of a price.
- Open: Gujarati spellings of rarer names (native review), per-nakshatra static SEO pages (27) from the same data, Marathi/Tamil name lists, Play listing paragraph + screenshot for the new tab (no upload needed: the TWA loads the live site).

## Peace-of-mind features (2026-10-24)
- Naming report card offers the Family plan too; family subscribers see "Manage subscription" (Google Play subscriptions deep link `MANAGE_SUBSCRIPTIONS_URL` in `app/billing.ts`).
- Settings → Purchases: status line (family until date / credits), Restore purchases (Play app only), Manage subscription. Settings → Your data → Delete my data: confirm sheet → unsubscribe reminders → `POST /v1/device/forget` (Worker deletes entitlement + claim_log rows for the device id) → clear localStorage/IndexedDB/caches/SW → reload. Purchases return via Restore. Cache v7. Worker redeployed.

## Own origin (2026-10-25)
- ShubhDate now lives at **https://shubhdate.sakredstudio.ca** (Cloudflare CNAME → sakredstudio.github.io, DNS only; GitHub Pages custom domain, HTTPS enforced; `public/CNAME`; Vite base `/`). Old `sakredstudio.github.io/subhdate/*` 301-redirects. Google DAL API verifies the new origin for com.sakredstudio.shubhdate (both fingerprints).
- Why: five TWAs shared sakredstudio.github.io → Chrome routed Digital Goods calls to the wrong app → `ClientAppUnavailable`, no prices. One origin per Android app from now on.
- Worker `ALLOWED_ORIGIN` = comma list (new first, github.io kept until 1.0.2 is the only version in use), `Vary: Origin`.
- TWA 1.0.2 (versionCode 3) built for the new host, signed by Soul 2026-10-25; to upload to Production. Backups of the 1.0.1 config in `shubhdate-twa/*.bak-v2` and `shubhdate-twa/backups-v2/`.
- Play Console URLs to update: store listing website + privacy policy → shubhdate.sakredstudio.ca (old ones redirect, so not urgent).

## Billing root cause (2026-10-25 late)
- `clientAppUnavailable` = Chrome found no delegate app for the origin. Chrome registers a TWA as delegate only if the app's VIEW/BROWSABLE filter resolves the verified URL (`PermissionUpdater.appHandlesBrowsableIntent`). 1.0.2's AndroidManifest still had `android:pathPrefix="/subhdate/"` (hard-coded, not regenerated by our host change) → `resolve-activity` = "No activity found" for https://shubhdate.sakredstudio.ca/ → no delegate → every getDetails/listPurchases failed. Reproduced over wireless adb + Chrome DevTools on Soul's phone (nubia NX729J, Chrome 155).
- Fixed in 1.0.3 (versionCode 4): pathPrefix "/", raw web_app_manifest start_url "/". Same fix in Chanda 1.0.3, Kilat 1.1.2, FollowUp 1.1.2 (+ FollowUp shareTarget action "/"). Backups in each `*-twa/backups-pre-path/`.
- Test plan: upload ShubhDate 1.0.3 to Internal testing first, update the phone, check Settings → Purchases lists products, then promote to Production.

## Internal testing upload (2026-10-25 23:41–2026-10-26 00:05)
Uploaded and rolled out to Internal testing via Claude in Chrome (workflow, each verified read-only afterwards; Production untouched):
- ShubhDate 4 (1.0.3) — "Available to internal testers", 23:41. Production still 3 (1.0.2), live.
- Chanda Collector (app id 4973490662510939744) 4 (1.0.3) — available to internal testers, 23:53. Production 3 (1.0.2) went live 23:49.
- Kilat (app id 4974752108881894498) 4 (1.1.2) — available to internal testers, 23:58. Production not yet created.
- FollowUp Buddy 4 (1.1.2) — available to internal testers.
Release notes en-US: "Fixes in-app purchases and prices not loading." 8 AM backup task disabled.
Next (Soul, evening): update ShubhDate on the phone from Play (internal tester), Settings → Purchases should list report_single, family_annual, naam_report; then Internal testing → Promote release → Production → Send for review (ShubhDate, Chanda). Kilat/FollowUp stay paused until names/logos.

## Billing WORKING on 1.0.3 (2026-10-26 23:04, Soul's phone, verified over adb + DevTools)
Play returned all three products to the Play-installed TWA: report_single CAD 6.99, family_annual CAD 20.99/yr, naam_report CAD 13.99. Naam screen shows "Unlock the report · CA$13.99" and "Family plan · CA$20.99 / year".
What it took, in order:
1. 1.0.3 fixes the stale AndroidManifest pathPrefix ("/subhdate/" → "/"); without it Chrome never registers the app as delegate → clientAppUnavailable. Chrome caches that per process: force-stop Chrome after updating.
2. naam_report created + activated in Play Console 2026-10-26 (Buy option "buy", USD 9.99 base, INR 149).
3. The Play app must actually be installed and opened from its own icon. On 10-26 Chrome had installed its own WebAPK copy of shubhdate.sakredstudio.ca (org.chromium.webapk.*) after the Play app was uninstalled; that copy can never bill ("not available (web)"). Removed it; web manifest now declares the Play app in related_applications with prefer_related_applications (cache v12).
4. Installed from Play under sakredfamily@gmail.com (licence tester); Finsky logs "Billing preferred account via installer".
Debug recipe: wireless adb, `adb shell setprop log.tag V` (nubia ROM silences logs), `adb logcat -d | grep -E "BillingClient|TwaBilling"` → "Got unfetchedProduct ... statusCode=N" / "Got product details". billing 1.2.0 hides unfetched reasons from the page.
Note: Chanda's billing.js shows a hard-coded ₹149 fallback when Play returns nothing, so "Chanda shows a price" is NOT proof billing works.
Next: Soul promotes ShubhDate 1.0.3 (code 4) Internal → Production (Production 1.0.2 is broken for every user, incl. wife's phone).

## Production submission (2026-10-26 ~23:40)
ShubhDate 4 (1.0.3) promoted Internal → Production (100% rollout, notes "Fixes in-app purchases and prices not loading.", 1.0.2 not included) and submitted: Publishing overview shows "Changes in review — Production 4 (1.0.3) Start full rollout" (quick checks running, then Google review, typically ≤7 days). Managed publishing OFF → goes live automatically on approval. Production still serves 3 (1.0.2) until then. Play flagged 4 non-blocking recommendations (edge-to-edge x2, large-screen orientation/resizability, R8).
