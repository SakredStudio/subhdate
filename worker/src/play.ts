// Google Play Developer API client for purchase verification (androidpublisher v3), authenticated with a
// service account (RS256 JWT -> OAuth2 access token). Pure fetch + WebCrypto; no SDK.
// Docs: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products
//       https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2
import { signRS256 } from './jws.ts';

export interface ServiceAccount { client_email: string; private_key: string; token_uri?: string; }
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

let cached: { token: string; exp: number } | null = null;
export async function accessToken(sa: ServiceAccount, now = Math.floor(Date.now() / 1000)): Promise<string> {
  if (cached && cached.exp - 60 > now) return cached.token;
  const assertion = await signRS256({ iss: sa.client_email, scope: SCOPE, aud: sa.token_uri ?? 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }, sa.private_key);
  const res = await fetch(sa.token_uri ?? 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  if (!res.ok) throw new Error(`google_token_${res.status}`);
  const j: any = await res.json();
  cached = { token: j.access_token, exp: now + Number(j.expires_in ?? 3600) };
  return cached.token;
}

async function call(sa: ServiceAccount, method: 'GET' | 'POST', path: string, body?: unknown): Promise<{ status: number; json: any }> {
  const token = await accessToken(sa);
  const res = await fetch(`${API}/${path}`, { method, headers: { authorization: `Bearer ${token}`, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json: any = null; try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: res.status, json };
}

// ---- one-time products ----
export interface ProductPurchase { purchaseState: 0 | 1 | 2; consumptionState: 0 | 1; acknowledgementState: 0 | 1; orderId?: string; purchaseTimeMillis?: string; purchaseType?: number; regionCode?: string; }
/** purchaseState: 0 purchased, 1 canceled, 2 pending. consumptionState: 0 yet to be consumed, 1 consumed. */
export async function getProduct(sa: ServiceAccount, pkg: string, productId: string, token: string): Promise<{ status: number; purchase: ProductPurchase | null; error?: string }> {
  const r = await call(sa, 'GET', `${encodeURIComponent(pkg)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`);
  if (r.status !== 200) return { status: r.status, purchase: null, error: r.json?.error?.message ?? String(r.status) };
  return { status: 200, purchase: r.json as ProductPurchase };
}
export async function acknowledgeProduct(sa: ServiceAccount, pkg: string, productId: string, token: string): Promise<boolean> {
  const r = await call(sa, 'POST', `${encodeURIComponent(pkg)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`, {});
  return r.status === 200 || r.status === 204;
}
export async function consumeProduct(sa: ServiceAccount, pkg: string, productId: string, token: string): Promise<boolean> {
  const r = await call(sa, 'POST', `${encodeURIComponent(pkg)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:consume`, {});
  return r.status === 200 || r.status === 204;
}

// ---- subscriptions (v2) ----
export type SubState = 'SUBSCRIPTION_STATE_UNSPECIFIED' | 'SUBSCRIPTION_STATE_PENDING' | 'SUBSCRIPTION_STATE_ACTIVE' | 'SUBSCRIPTION_STATE_PAUSED' | 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' | 'SUBSCRIPTION_STATE_ON_HOLD' | 'SUBSCRIPTION_STATE_CANCELED' | 'SUBSCRIPTION_STATE_EXPIRED' | 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED';
export interface SubscriptionV2 { subscriptionState: SubState; latestOrderId?: string; acknowledgementState?: 'ACKNOWLEDGEMENT_STATE_PENDING' | 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'; lineItems?: { productId: string; expiryTime?: string; autoRenewingPlan?: { autoRenewEnabled?: boolean } }[]; linkedPurchaseToken?: string; testPurchase?: object; }
export async function getSubscription(sa: ServiceAccount, pkg: string, token: string): Promise<{ status: number; sub: SubscriptionV2 | null; error?: string }> {
  const r = await call(sa, 'GET', `${encodeURIComponent(pkg)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`);
  if (r.status !== 200) return { status: r.status, sub: null, error: r.json?.error?.message ?? String(r.status) };
  return { status: 200, sub: r.json as SubscriptionV2 };
}
/** v1 acknowledge endpoint still applies to subscriptions bought through Play Billing. */
export async function acknowledgeSubscription(sa: ServiceAccount, pkg: string, subscriptionId: string, token: string): Promise<boolean> {
  const r = await call(sa, 'POST', `${encodeURIComponent(pkg)}/purchases/subscriptions/${encodeURIComponent(subscriptionId)}/tokens/${encodeURIComponent(token)}:acknowledge`, {});
  return r.status === 200 || r.status === 204;
}
/** Active = entitled now. Grace period keeps access (Play's recommendation); on-hold, paused, canceled-and-expired do not. */
export function subscriptionActive(s: SubscriptionV2): boolean {
  return s.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE' || s.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' || s.subscriptionState === 'SUBSCRIPTION_STATE_CANCELED';
}
export function subscriptionExpiry(s: SubscriptionV2): number | null {
  const t = s.lineItems?.map(l => l.expiryTime).filter(Boolean).sort().pop();
  return t ? Math.floor(Date.parse(t) / 1000) : null;
}
