// Website purchases (Stripe Checkout): the decisions, kept free of fetch and D1 so they can be unit-tested.
// The Play app never uses any of this; Play Billing is the only rail there (see app/billing.ts).
//
// How a web purchase is identified: at checkout the Worker makes up a purchase code (12 characters) and stores it in
// the Checkout Session's metadata. Its SHA-256 goes in `purchase_token_hash`, exactly where a Play purchase token's
// hash goes, so one paid session can only ever create one entitlement row. For the Family plan the code is also the
// buyer's restore code (shown after payment and printed on the Stripe receipt): it moves the plan to another browser.
import { SKUS, type Sku } from './entitle.ts';

export interface WebEnv {
  STRIPE_SECRET_KEY?: string; STRIPE_WEBHOOK_SECRET?: string;
  /** Stripe price ids (price_...). A product is on sale on the website only when its id AND its display price are set. */
  STRIPE_PRICE_REPORT_SINGLE?: string; STRIPE_PRICE_FAMILY_ANNUAL?: string; STRIPE_PRICE_NAAM_REPORT?: string;
  /** Display prices, e.g. "CA$9". Display only: the Stripe price is what is charged. */
  PRICE_REPORT_SINGLE?: string; PRICE_FAMILY_ANNUAL?: string; PRICE_NAAM_REPORT?: string;
}
/** A Family plan bought on the website is one payment for one year. It does not renew. */
export const FAMILY_WEB_SECONDS = 365 * 86400;
export const PRODUCT_LABEL: Record<Sku, string> = { report_single: 'Muhurta Report', family_annual: 'Family plan, one year', naam_report: 'Namakarana Report' };

const val = (env: WebEnv, name: string): string | undefined => { const v = (env as any)[name]; return typeof v === 'string' && v.trim() ? v.trim() : undefined; };
export const priceIdFor = (env: WebEnv, sku: Sku) => val(env, `STRIPE_PRICE_${sku.toUpperCase()}`);
export const displayPriceFor = (env: WebEnv, sku: Sku) => val(env, `PRICE_${sku.toUpperCase()}`);

export interface WebOffer { enabled: boolean; prices: Partial<Record<Sku, string>>; }
/** What the website may sell right now. Nothing is offered until Stripe and the token-signing key are both set. */
export function webOffer(env: WebEnv, signingConfigured: boolean): WebOffer {
  const prices: Partial<Record<Sku, string>> = {};
  if (val(env, 'STRIPE_SECRET_KEY') && signingConfigured) for (const sku of SKUS) { const d = displayPriceFor(env, sku); if (d && priceIdFor(env, sku)) prices[sku] = d; }
  return { enabled: Object.keys(prices).length > 0, prices };
}

// Crockford base32 without I, L, O, U: nothing in a code can be misread.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** A fresh purchase code, "XXXX-XXXX-XXXX" (60 bits). */
export function newPurchaseCode(bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(12))): string {
  const chars = [...bytes.slice(0, 12)].map(b => ALPHABET[b & 31]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
/** Canonical form of a code as typed by a person: upper case, look-alikes folded, separators dropped. null when it cannot be one. */
export function normaliseCode(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const c = s.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  if (c.length !== 12 || [...c].some(ch => !ALPHABET.includes(ch))) return null;
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}

const isUuid = (s: unknown) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export const isSessionId = (s: unknown) => typeof s === 'string' && /^cs_(test|live)_[A-Za-z0-9]{8,250}$/.test(s);

export type SessionVerdict =
  | { ok: true; sku: Sku; dev: string; code: string; orderId: string | null; expiresAt: number | null }
  | { ok: false; error: 'not_ours' | 'not_paid' | 'pending' };
/** Read a Stripe Checkout Session and decide what it grants. Sessions made by another product on the same Stripe
 *  account (Sakred Graha) are 'not_ours'. */
export function judgeSession(s: any, now: number): SessionVerdict {
  const m = s?.metadata ?? {};
  const code = normaliseCode(m.code);
  if (s?.object !== 'checkout.session' || m.app !== 'shubhdate' || !SKUS.includes(m.sku) || !isUuid(m.dev) || !code) return { ok: false, error: 'not_ours' };
  if (s.payment_status !== 'paid') return { ok: false, error: s.status === 'complete' ? 'pending' : 'not_paid' }; // complete + unpaid = a delayed payment method still clearing
  const sku = m.sku as Sku;
  const orderId = typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent?.id ?? null);
  const paidAt = Number.isFinite(s.created) ? Number(s.created) : now;
  return { ok: true, sku, dev: String(m.dev).toLowerCase(), code, orderId, expiresAt: sku === 'family_annual' ? paidAt + FAMILY_WEB_SECONDS : null };
}

export type WebhookAction = { kind: 'grant'; session: any } | { kind: 'revoke'; orderId: string } | { kind: 'none' };
/** Map a Stripe event to what the entitlement table should do. A full refund or a dispute takes the purchase back. */
export function webhookAction(event: any): WebhookAction {
  const o = event?.data?.object ?? {};
  const pi = typeof o.payment_intent === 'string' ? o.payment_intent : (o.payment_intent?.id ?? null);
  switch (event?.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': return { kind: 'grant', session: o };
    case 'charge.refunded': return o.refunded === true && pi ? { kind: 'revoke', orderId: pi } : { kind: 'none' };
    case 'charge.dispute.created': return pi ? { kind: 'revoke', orderId: pi } : { kind: 'none' };
    default: return { kind: 'none' };
  }
}
