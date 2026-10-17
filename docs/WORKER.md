# ShubhDate API Worker (Cloudflare Workers + D1)

One Worker, one D1 database, $0: entitlements for Play purchases and festival/vrat reminders by Web Push.
Code: `worker/src/index.ts`, schema `worker/schema.sql`, config `worker/wrangler.toml`. The PWA side is
`app/entitlement.ts` (token verification, cache) and `app/billing.ts` (Digital Goods API), `public/sw.js` (push).

## Status (v2 night build 2)

| Route / job | State |
|---|---|
| `GET /health` | works |
| `POST /v1/push/subscribe`, `DELETE /v1/push/subscribe` | implemented (validate, upsert by endpoint, delete) |
| `POST /v1/rtdn?token=…` | stores the Pub/Sub envelope in `rtdn_events`, no processing |
| `POST /v1/entitlement/claim` | 501; body shape validated and documented in the source |
| `POST /v1/entitlement/refresh` | 501 |
| cron `0 */6 * * *` → `runReminders()` | selects due festivals per subscription with the engine's `festivals()`; `sendPush()` is a stub (`skipped`) |

The entitlement work waits for the Play Console app and the two products (CHECKPOINT.md "Steps only Soul can do" #5–#7).

## Setup (Soul, once)

```bash
cd worker
npm i                         # wrangler
npx wrangler login
npx wrangler d1 create shubhdate          # paste the database_id into wrangler.toml
npx wrangler d1 execute shubhdate --file schema.sql
```

### Secrets (`npx wrangler secret put NAME`, never in git)

| Name | What | How to make it |
|---|---|---|
| `ENTITLEMENT_PRIVATE_KEY_JWK` | ES256 private key (JWK JSON) that signs entitlement tokens | `node tools/dev/gen-keys.mjs` prints a P-256 pair: the private JWK goes here, the **public JWK** goes into `app/config.ts` `ENTITLEMENT_PUBLIC_KEY_JWK` |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key (base64url, 32 bytes) | same script prints a VAPID pair; the **public** key (base64url, 65 bytes) goes into `app/config.ts` `VAPID_PUBLIC_KEY` |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key | same |
| `PLAY_SERVICE_ACCOUNT` | Google service-account JSON with "View financial data" + "Manage orders" on the app | Play Console → Users and permissions / Google Cloud → service account key (needed only when claim is implemented) |
| `RTDN_TOKEN` | random string; Pub/Sub push URL is `https://shubhdate-api.<account>.workers.dev/v1/rtdn?token=<RTDN_TOKEN>` | `openssl rand -base64 24` |

Then `npx wrangler deploy`, copy the Worker URL into `app/config.ts` `WORKER_URL`, and commit `app/config.ts`
(only public values live there).

## Data (privacy truth table)

- `push_subscriptions`: endpoint + keys (anonymous, browser-issued), home-city coordinates rounded to 0.01°, time zone,
  language, region, topics. Deleted on unsubscribe. No birth data ever.
- `entitlements`: sku, anonymous device UUID, sha256 of the Play purchase token, Play order id, expiry. No name/email.
- `rtdn_events`: raw Play notifications keyed by Pub/Sub messageId (idempotent).
- `reminders_sent`: (subscription, festival|date) pairs so a reminder is sent once.

## Next implementation steps (next overnight run, once Play products exist)

1. `claim`: verify with Play Developer API (`purchases.products.get` for `report_single`, `purchases.subscriptionsv2.get`
   for `family_annual`) using a service-account JWT (WebCrypto RS256), check `packageName`, `purchaseState`, insert,
   acknowledge, sign the token (format = `app/entitlement.ts` `signToken`), return it.
2. `refresh`: look up by device id, re-check subscription state (cached from RTDN), re-sign with a new `iat`.
3. RTDN processing: on `SUBSCRIPTION_CANCELED/EXPIRED/REVOKED` or a voided purchase set `revoked_at`; on renewals extend `expires_at`.
4. `sendPush`: RFC 8291/8292 with WebCrypto; delete subscriptions on 404/410.
5. Rate-limit `claim` per device id (D1 count per hour) and log nothing personal.
