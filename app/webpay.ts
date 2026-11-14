// Website purchases through Stripe Checkout. Only ever offered outside the Play app: Google Play requires Play
// Billing for anything sold inside an app installed from Play (billing.ts), so main.ts builds a WebShop only when
// isPlayApp() is false. Flow: Worker /v1/web/checkout -> Stripe's hosted page -> back to "/?paid=<session>#/report"
// -> Worker /v1/web/claim checks the session with Stripe and returns the same signed token a Play purchase gets.
// Privacy: the Worker receives the anonymous device id and the product; card and e-mail stay with Stripe.
import { WORKER_URL, IS_PLACEHOLDER } from './config.ts';
import { getDeviceId, cacheEntitlement, verifyToken, type Sku, type Entitlement } from './entitlement.ts';
import { PurchaseError } from './billing.ts';

export interface WebOffer { enabled: boolean; prices: Partial<Record<Sku, string>>; }
/** What a report screen needs to sell on the website. null inside the Play app or while web checkout is not set up. */
export interface WebShop {
  prices: Partial<Record<Sku, string>>;
  /** Leaves the page for Stripe's checkout. `back` is the screen to return to. Rejects with PurchaseError if it cannot start. */
  buy: (sku: Sku, back: 'report' | 'naam') => Promise<void>;
  /** Unlock a Family plan bought on the website in another browser. */
  restore: (code: string) => Promise<Entitlement>;
}

const NONE: WebOffer = { enabled: false, prices: {} };
let offer: Promise<WebOffer> | null = null;
/** The Worker's current website offer (asked once per page load). Any failure means "nothing for sale". */
export function webOffer(fetchFn: typeof fetch = fetch): Promise<WebOffer> {
  if (IS_PLACEHOLDER(WORKER_URL)) return Promise.resolve(NONE);
  offer ??= fetchFn(`${WORKER_URL}/v1/web/config`).then(r => r.ok ? r.json() : NONE).then((o: any) => o && o.enabled === true && o.prices && typeof o.prices === 'object' ? { enabled: true, prices: o.prices } : NONE).catch(() => NONE);
  return offer;
}

async function post(path: string, body: unknown): Promise<any> {
  let res: Response;
  try { res = await fetch(`${WORKER_URL}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
  catch { throw new PurchaseError('offline'); }
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new PurchaseError(j.error ?? `http_${res.status}`);
  return j;
}
async function keep(body: any): Promise<Entitlement> {
  const payload = await verifyToken(body.token);
  if (!payload) throw new PurchaseError('bad_token');
  await cacheEntitlement(body.token, payload);
  return payload;
}

/** Ask the Worker for a Checkout page and go there. Resolves only if the browser somehow stays on the page. */
export async function startWebCheckout(sku: Sku, back: 'report' | 'naam'): Promise<void> {
  const j = await post('/v1/web/checkout', { sku, dev: getDeviceId(), back });
  if (typeof j.url !== 'string' || !/^https:\/\/checkout\.stripe\.com\//.test(j.url)) throw new PurchaseError('bad_checkout_url');
  location.assign(j.url);
}
/** Confirm a finished Checkout Session and cache its entitlement. `restoreCode` comes with a Family plan. */
export async function claimWebPurchase(session: string): Promise<{ entitlement: Entitlement; restoreCode: string | null }> {
  const j = await post('/v1/web/claim', { session, dev: getDeviceId() });
  return { entitlement: await keep(j), restoreCode: typeof j.restoreCode === 'string' ? j.restoreCode : null };
}
export async function restoreWebPurchase(code: string): Promise<Entitlement> {
  return keep(await post('/v1/web/restore', { code, dev: getDeviceId() }));
}

/** If the page was opened by Stripe's return link ("?paid=cs_..."), take the session id and clean the address bar. */
export function takePaidSession(loc: Location = location, hist: History = history): string | null {
  const q = new URLSearchParams(loc.search); const s = q.get('paid');
  if (!s) return null;
  q.delete('paid'); const rest = q.toString();
  try { hist.replaceState(null, '', `${loc.pathname}${rest ? `?${rest}` : ''}${loc.hash}`); } catch { /* keep the URL */ }
  return /^cs_(test|live)_[A-Za-z0-9]{8,250}$/.test(s) ? s : null;
}
