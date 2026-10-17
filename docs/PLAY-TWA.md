# ShubhDate on Google Play: the TWA recipe (for Soul, Windows PC)

Everything below runs on your PC; nothing here is in the cloud build. Package `com.sakredstudio.shubhdate`,
minSdk 24, target/compile SDK 36 (Bubblewrap ≥ 1.25), Play Billing enabled, notification delegation on.
The ready manifest is `twa/twa-manifest.json` in this repo.

## 0. One-time prerequisites (you already have these from Swaiyu)

- Node 18+ and `npx @bubblewrap/cli` (1.27+). Bubblewrap downloads its own JDK 17 and Android cmdline-tools into
  `~/.bubblewrap/` on first run; say yes.
- `keytool`, `zipalign` and `apksigner`: `keytool` is in `%USERPROFILE%\.bubblewrap\jdk\bin`; `zipalign` and
  `apksigner` are in `%USERPROFILE%\.bubblewrap\android_sdk\build-tools\<version>\`.

## 1. Keystore (once, never commit it)

```bat
mkdir C:\sakred-os\projects\shubhdate-twa
keytool -genkeypair -v -keystore C:\sakred-os\projects\shubhdate-twa\android.keystore -alias shubhdate -keyalg RSA -keysize 2048 -validity 10000
```

Use a fresh password and put it in your password manager. Back the keystore up to F:. This is the **upload key**
only; Play App Signing generates the app-signing key on Google's side (step 4 needs its fingerprint, not this one).

## 2. Init the project from the live web manifest, then drop in the prepared manifest

```bat
cd C:\sakred-os\projects\shubhdate-twa
npx @bubblewrap/cli init --manifest https://sakredstudio.github.io/subhdate/manifest.webmanifest
```

Accept the defaults (they are overwritten in the next step), point the signing key at the keystore above when
asked. Then overwrite the generated `twa-manifest.json` with the one from the repo:

```bat
copy /Y C:\sakred-os\projects\subhdate\twa\twa-manifest.json C:\sakred-os\projects\shubhdate-twa\twa-manifest.json
npx @bubblewrap/cli update
```

`bubblewrap update` regenerates the Android project (`app/build.gradle`, `AndroidManifest.xml`, icons, shortcuts,
the Play Billing dependency `com.google.androidbrowserhelper:billing`) from the manifest.

## 3. Build (the manual recipe; `bubblewrap build` has broken Gradle caches on this PC before)

```bat
set JAVA_HOME=%USERPROFILE%\.bubblewrap\jdk
cd C:\sakred-os\projects\shubhdate-twa
gradlew.bat bundleRelease
```

Output: `app\build\outputs\bundle\release\app-release.aab`. If Gradle is signed-config-less (it usually is after
`bubblewrap update`), sign the bundle for upload:

```bat
set BT=%USERPROFILE%\.bubblewrap\android_sdk\build-tools
dir %BT%
rem pick the newest version folder, e.g. 36.0.0
"%BT%\36.0.0\apksigner" sign --ks C:\sakred-os\projects\shubhdate-twa\android.keystore --ks-key-alias shubhdate --min-sdk-version 24 app\build\outputs\bundle\release\app-release.aab
```

(apksigner signs AABs with `--min-sdk-version`; if your build-tools version refuses, use `jarsigner` from the JDK:
`jarsigner -keystore C:\sakred-os\projects\shubhdate-twa\android.keystore app\build\outputs\bundle\release\app-release.aab shubhdate`.)

For a sideload test APK instead: `gradlew.bat assembleRelease`, then
`"%BT%\36.0.0\zipalign" -v -p 4 app\build\outputs\apk\release\app-release-unsigned.apk app-aligned.apk` and
`"%BT%\36.0.0\apksigner" sign --ks C:\sakred-os\projects\shubhdate-twa\android.keystore --ks-key-alias shubhdate --out ShubhDate-1.0.apk app-aligned.apk`.

Later versions: bump `appVersionCode` (and `appVersionName`) in `twa-manifest.json` → `npx @bubblewrap/cli update`
→ `gradlew.bat bundleRelease` → sign → upload.

## 4. Play Console

1. Create the app: name **ShubhDate**, default language English (India) or English (United Kingdom), app (not game),
   **free**, "contains in-app purchases" yes. Category **Lifestyle**.
2. Fill the store listing from `store/listing-en.md` (+ `listing-hi.md`, `listing-gu.md` as translations), upload
   `store/icon-512.png`, `store/feature-graphic.png`, and the screenshots in `store/screenshots/en/` (then `hi/`, `gu/`
   under their languages). Checklist of every field: `store/README.md`.
3. App content: privacy policy URL `https://sakredstudio.github.io/subhdate/privacy.html`; Data safety answers from
   `store/data-safety.md` section (a); content rating questionnaire answers in the same file; Ads: no; target audience 18+.
4. **Setup → App integrity → App signing**: enable Play App Signing (default for new apps) and copy the
   **App signing key certificate SHA-256** (not the upload key certificate). This is the fingerprint for step 5.
5. Release → Testing → **Internal testing** → create release → upload `app-release.aab` → add your Google account as a
   tester → roll out. The internal-testing link installs within minutes.

## 5. Digital Asset Links (the one thing outside this repo)

Android checks asset links **per origin**: `https://sakredstudio.github.io/.well-known/assetlinks.json`. That file lives in
the `SakredStudio/SakredStudio.github.io` repo (local folder `C:\sakred-os\projects\k-pop-fiesta`, file
`public\.well-known\assetlinks.json`) and currently holds Swaiyu's entry. A file under `/subhdate/.well-known/` is
**never consulted**, so the one in this repo is only a placeholder.

Append this element to the root file (it must stay **one JSON array** containing both apps):

```json
{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.sakredstudio.shubhdate",
    "sha256_cert_fingerprints": ["<Play App Signing SHA-256 from Play Console → Setup → App integrity>"]
  }
}
```

- The fingerprint is the **Play App Signing** key's (Google re-signs the AAB), not the upload keystore's. If you also
  sideload a locally signed APK for testing, add the upload key's SHA-256 as a second string in the same array
  (`keytool -list -v -keystore C:\sakred-os\projects\shubhdate-twa\android.keystore -alias shubhdate`).
- Push the k-pop-fiesta repo, wait for Pages, then verify:
  `curl https://sakredstudio.github.io/.well-known/assetlinks.json` (must be valid JSON, `content-type: application/json`).
  Google's checker: https://developers.google.com/digital-asset-links/tools/generator
- Until the file is live, the installed TWA shows Chrome's URL bar at the top. Harmless for internal testing; it
  disappears on the next app start after the file is live (Chrome caches the verification for a while; clearing
  Chrome's storage for the site forces a re-check).

## 6. Play Billing and notifications (what the manifest already turns on)

- `features.playBilling.enabled: true` adds the Digital Goods API bridge. The web app feature-detects it
  (`app/billing.ts`); nothing is sold until the products exist (`report_single` consumable ₹99 / $4.99,
  `family_annual` subscription ₹299/yr / $14.99/yr) and the Worker claim endpoint is implemented. The web build
  never links to a paywall (Play policy §4).
- `enableNotifications: true` turns on notification delegation so Web Push notifications show under the ShubhDate
  app name and icon. They are only sent once `VAPID_PUBLIC_KEY` and the Worker exist (`docs/WORKER.md`).
