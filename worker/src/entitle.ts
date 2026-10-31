// Entitlement logic, kept free of fetch/D1 so it can be unit-tested with recorded Play responses.
import { signES256 } from './jws.ts';
import { subscriptionActive, subscriptionExpiry, type ProductPurchase, type SubscriptionV2 } from './play.ts';

export type Sku = 'report_single' | 'family_annual' | 'naam_report' | 'shagun_pro';
export const SKUS: Sku[] = ['report_single', 'family_annual', 'naam_report', 'shagun_pro'];
/** One-time products verified with purchases.products.get; the consumable ones are also consumed so they can be bought again. */
export const ONE_TIME: Sku[] = ['report_single', 'naam_report', 'shagun_pro'];
export const CONSUMABLE: Sku[] = ['report_single', 'naam_report'];
export const FAR_FUTURE = 4102444800; // 2100-01-01, used as exp for consumable credits

export interface EntitlementPayload { sku: Sku; source: 'play'; exp: number; iat: number; dev: string; credits?: number; naam?: number; shagun?: boolean; }
export interface EntRow { id: string; sku: Sku; device_id: string; purchase_token_hash: string; order_id: string | null; expires_at: number | null; created_at: number; revoked_at: number | null; }

/** Decide what a verified one-time purchase means. */
export function judgeProduct(p: ProductPurchase): { ok: true } | { ok: false; error: 'not_purchased' | 'pending' } {
  if (p.purchaseState === 2) return { ok: false, error: 'pending' };
  if (p.purchaseState !== 0) return { ok: false, error: 'not_purchased' };
  return { ok: true };
}
/** Decide what a verified subscription means, and when it expires. */
export function judgeSubscription(s: SubscriptionV2, productId: string): { ok: true; expiresAt: number } | { ok: false; error: 'not_purchased' | 'pending' } {
  if (s.subscriptionState === 'SUBSCRIPTION_STATE_PENDING') return { ok: false, error: 'pending' };
  if (!subscriptionActive(s)) return { ok: false, error: 'not_purchased' };
  if (!s.lineItems?.some(l => l.productId === productId)) return { ok: false, error: 'not_purchased' };
  const exp = subscriptionExpiry(s);
  if (!exp || exp <= Math.floor(Date.now() / 1000)) return { ok: false, error: 'not_purchased' };
  return { ok: true, expiresAt: exp };
}

/** From a device's rows, build the token payload: an active family plan wins; otherwise unconsumed report credits. */
export function payloadFor(dev: string, rows: EntRow[], now: number): EntitlementPayload | null {
  const live = rows.filter(r => !r.revoked_at);
  const fam = live.filter(r => r.sku === 'family_annual' && (r.expires_at ?? 0) > now).sort((a, b) => (b.expires_at ?? 0) - (a.expires_at ?? 0))[0];
  if (fam) return { sku: 'family_annual', source: 'play', exp: fam.expires_at!, iat: now, dev };
  const credits = live.filter(r => r.sku === 'report_single').length;
  const naam = live.filter(r => r.sku === 'naam_report').length;
  const shagun = live.some(r => r.sku === 'shagun_pro');
  if (credits > 0 || naam > 0 || shagun) return { sku: credits > 0 ? 'report_single' : naam > 0 ? 'naam_report' : 'shagun_pro', source: 'play', exp: FAR_FUTURE, iat: now, dev, ...(credits > 0 ? { credits } : {}), ...(naam > 0 ? { naam } : {}), ...(shagun ? { shagun: true } : {}) };
  return null;
}
export async function issueToken(payload: EntitlementPayload, privateJwk: JsonWebKey): Promise<string> {
  return signES256(payload, privateJwk);
}

/** Map a Play RTDN notification to an action on the stored entitlement row. */
export type RtdnAction = { kind: 'refetch' } | { kind: 'revoke' } | { kind: 'none' };
export function rtdnAction(decoded: any): { purchaseToken: string | null; action: RtdnAction; type: number | null } {
  if (decoded?.voidedPurchaseNotification) return { purchaseToken: decoded.voidedPurchaseNotification.purchaseToken ?? null, action: { kind: 'revoke' }, type: -1 };
  const s = decoded?.subscriptionNotification;
  if (s) {
    const t = Number(s.notificationType);
    // 1 RECOVERED 2 RENEWED 4 PURCHASED 7 RESTARTED 9 DEFERRED 19 PRICE_CHANGE_UPDATED 20 PENDING_PURCHASE_CANCELED: re-read from Play
    // 3 CANCELED keeps access until expiry (re-read keeps the expiry); 5 ON_HOLD 6 IN_GRACE 10 PAUSED 11 PAUSE_SCHEDULE: re-read
    // 12 REVOKED 13 EXPIRED: revoke now
    if (t === 12 || t === 13) return { purchaseToken: s.purchaseToken ?? null, action: { kind: 'revoke' }, type: t };
    return { purchaseToken: s.purchaseToken ?? null, action: { kind: 'refetch' }, type: t };
  }
  const o = decoded?.oneTimeProductNotification;
  if (o) {
    const t = Number(o.notificationType); // 1 PURCHASED 2 CANCELED
    return { purchaseToken: o.purchaseToken ?? null, action: t === 2 ? { kind: 'revoke' } : { kind: 'none' }, type: t };
  }
  return { purchaseToken: null, action: { kind: 'none' }, type: null };
}
