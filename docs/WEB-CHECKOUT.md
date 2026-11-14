# Selling reports on the website (Stripe Checkout)

The Play app sells the reports through Google Play Billing. The **website** can sell the same three products
through Stripe, on the same Stripe account Sakred Graha uses. Until the steps below are done, the website shows
no buy buttons and behaves exactly as before.

| Product on the website | Internal name | What the buyer gets |
|---|---|---|
| Muhurta Report | `report_single` | one full Muhurta report, in the browser that paid |
| Namakarana Report | `naam_report` | one full Namakarana report, in the browser that paid |
| Family plan | `family_annual` | every report for one year; **one payment, does not renew** |

A product goes on sale only when it has **both** a Stripe price id and a display price. Leave either one empty and
that product is simply not offered on the website.

## How it works

1. A visitor on the website (never inside the Play app) taps a buy button on the locked report.
2. The ShubhDate server asks Stripe for a checkout page and the visitor pays there. ShubhDate never sees the card
   or the e-mail address.
3. Stripe sends the buyer back to the report. The server checks the payment with Stripe and unlocks the report in
   that browser, with the same signed token a Play purchase gets.
4. Stripe also tells the server directly (the webhook), which covers a buyer who closes the tab before coming
   back, and takes the purchase away again on a full refund or a dispute.

Things to know:

- **A purchase belongs to the browser that paid.** Single reports cannot be moved; the buyer should use
  Download PDF. The Family plan comes with a restore code (shown after payment and printed on the Stripe receipt)
  that moves the plan to another browser.
- **A website purchase does not unlock the Play app**, and a Play purchase does not unlock the website.
- A partial refund keeps the purchase; a full refund or a dispute removes it.

## Setup (Soul)

### 1. Decide the three prices

Whatever you choose is what Stripe charges. The display price is only the text on the button (for example `CA$9`).

### 2. Create the products in Stripe

Stripe Dashboard → Product catalogue → Add product, three times, each with a **one-off** price:

- `ShubhDate Muhurta Report`
- `ShubhDate Namakarana Report`
- `ShubhDate Family plan (one year)`

Copy each price id (it starts with `price_`).

### 3. Make a restricted key

Developers → API keys → Create restricted key. Name it `shubhdate-api`. Set **Checkout Sessions** to **Write**
and leave everything else at None. Copy the key (it starts with `rk_live_`).

### 4. Fill in the prices and deploy

Open `worker/wrangler.toml` and fill in the six lines under "Website purchases": the three `STRIPE_PRICE_...` ids
and the three `PRICE_...` display prices. Then:

```powershell
cd C:\sakred-os\projects\subhdate\worker
```

```powershell
npx wrangler secret put STRIPE_SECRET_KEY
```

Paste the restricted key when asked. Then:

```powershell
npx wrangler deploy
```

### 5. Add the webhook

Developers → Webhooks → Add endpoint.

- URL: `https://shubhdate-api.mihir86-mp.workers.dev/stripe/webhook`
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`,
  `charge.dispute.created`

Copy the signing secret (it starts with `whsec_`), then:

```powershell
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Checkout works without the webhook, but refunds would not remove the purchase and a buyer who closes the tab
right after paying would have to reload the page to get the report.

### 6. Check it

- `https://shubhdate-api.mihir86-mp.workers.dev/health` should show `"stripe": true`, `"stripeWebhook": true`
  and `"web": true`.
- `https://shubhdate-api.mihir86-mp.workers.dev/v1/web/config` should list your display prices.
- Open the website in a normal browser tab, find a muhurta, open the report: the locked card now has the buy
  buttons. Inside the Play app it must still show only the Google Play buttons.
- Make one real purchase, download the PDF, then refund it in Stripe and reload: the report locks again.

### Turning it off

Empty a product's two lines in `worker/wrangler.toml` and run `npx wrangler deploy`. To stop all website sales at
once: `npx wrangler secret delete STRIPE_SECRET_KEY`.

## Sakred Graha shares the Stripe account

Every webhook on the account receives every paid checkout. Graha's webhook must therefore answer 200 for
sessions that are not Graha orders, and ShubhDate's ignores sessions that are not its own (it recognises its
sessions by `metadata.app = "shubhdate"`). Both are covered by tests.

## For developers

- Server: `worker/src/web.ts` (decisions), `worker/src/stripe.ts` (Stripe calls, signature check), routes in
  `worker/src/index.ts`: `GET /v1/web/config`, `POST /v1/web/checkout`, `POST /v1/web/claim`,
  `POST /v1/web/restore`, `POST /stripe/webhook`. Tests: `worker/test/web.test.ts`.
- App: `app/webpay.ts`, `app/screens/web-buy.ts`, and `webShop()` in `app/main.ts`, which returns nothing inside
  the Play app. Tests: `engine/test/webpay.test.ts`.
- No database change: a website purchase is a row in `entitlements` with `source = 'stripe'`. Its
  `purchase_token_hash` is the hash of a purchase code made at checkout (the Family plan's restore code), and
  `order_id` is the Stripe payment intent.
