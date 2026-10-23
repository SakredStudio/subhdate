// Google Play Billing through the Digital Goods API + Payment Request, available only inside the Play-installed TWA
// (Chrome 101+ with the androidbrowserhelper billing bridge). Everything is feature-detected; on the web nothing is
// sold and nothing links to a paywall (Play policy §4). Flow: PaymentRequest.show() -> purchaseToken ->
// Worker /v1/entitlement/claim (verifies with the Play Developer API, acknowledges/consumes) -> signed token cached locally.
import { WORKER_URL, IS_PLACEHOLDER } from './config.ts';
import { getDeviceId, cacheEntitlement, verifyToken, loadEntitlement, type Sku, type Entitlement } from './entitlement.ts';

export const PLAY_BILLING_METHOD = 'https://play.google.com/billing';
export const PACKAGE_NAME = 'com.sakredstudio.shubhdate';
export const SKUS: Sku[] = ['report_single', 'family_annual', 'naam_report'];

export interface ProductDetails { itemId: Sku; title: string; description: string; price: { currency: string; value: string }; type?: string; subscriptionPeriod?: string; }
interface DigitalGoodsService { getDetails(ids: string[]): Promise<ProductDetails[]>; listPurchases(): Promise<{ itemId: string; purchaseToken: string }[]>; consume?(purchaseToken: string): Promise<void>; }

let svc: DigitalGoodsService | null | undefined;
async function service(): Promise<DigitalGoodsService | null> {
  if (svc !== undefined) return svc;
  try {
    const w = window as any;
    svc = 'getDigitalGoodsService' in w ? await w.getDigitalGoodsService(PLAY_BILLING_METHOD) : null;
  } catch { svc = null; }
  return svc ?? null;
}
/** True only inside the Play TWA with the billing bridge. */
export async function isPlayBillingAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !('getDigitalGoodsService' in window) || !('PaymentRequest' in window)) return false;
  return (await service()) !== null;
}
/** Play's localised prices for the two SKUs (empty when unavailable). */
export async function listProducts(): Promise<ProductDetails[]> {
  const s = await service(); if (!s) return [];
  try { return await s.getDetails(SKUS); } catch { return []; }
}
export async function listPurchases(): Promise<{ itemId: string; purchaseToken: string }[]> {
  const s = await service(); if (!s) return [];
  try { return await s.listPurchases(); } catch { return []; }
}
export function formatPrice(p: ProductDetails): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: p.price.currency }).format(Number(p.price.value)); } catch { return `${p.price.currency} ${p.price.value}`; }
}

export class PurchaseError extends Error { constructor(public code: string, message?: string) { super(message ?? code); } }

/** Send a purchase token to the Worker; returns the verified entitlement after caching its token. */
export async function claim(sku: Sku, purchaseToken: string): Promise<Entitlement> {
  if (IS_PLACEHOLDER(WORKER_URL)) throw new PurchaseError('WorkerNotConfigured');
  const res = await fetch(`${WORKER_URL}/v1/entitlement/claim`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ purchaseToken, sku, dev: getDeviceId(), packageName: PACKAGE_NAME }) });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new PurchaseError(body.error ?? `http_${res.status}`);
  const payload = await verifyToken(body.token);
  if (!payload) throw new PurchaseError('bad_token');
  await cacheEntitlement(body.token, payload);
  return payload;
}

/** Buy a SKU inside the Play app. Resolves with the entitlement once the Worker has verified the purchase. */
export async function purchase(sku: Sku): Promise<Entitlement> {
  if (!(await isPlayBillingAvailable())) throw new PurchaseError('PlayBillingUnavailable');
  if (IS_PLACEHOLDER(WORKER_URL)) throw new PurchaseError('WorkerNotConfigured');
  const request = new PaymentRequest(
    [{ supportedMethods: PLAY_BILLING_METHOD, data: { sku } }],
    { total: { label: sku, amount: { currency: 'INR', value: '0' } } }, // Play ignores the total; it uses the Console price
  );
  let response: PaymentResponse;
  try { response = await request.show(); }
  catch (e: any) { throw new PurchaseError(e?.name === 'AbortError' ? 'cancelled' : 'show_failed', e?.message); }
  const token: string | undefined = (response.details as any)?.purchaseToken ?? (response.details as any)?.token;
  if (!token) { await response.complete('fail'); throw new PurchaseError('no_token'); }
  try {
    const ent = await claim(sku, token);
    await response.complete('success');
    if (sku === 'report_single' || sku === 'naam_report') { const s = await service(); try { await s?.consume?.(token); } catch { /* the Worker already consumed it server-side */ } }
    return ent;
  } catch (e) {
    await response.complete('fail').catch(() => null);
    throw e;
  }
}

/** Re-claim purchases Play still holds for this Google account (new phone, reinstall). Returns how many were restored. */
export async function restorePurchases(): Promise<number> {
  const list = await listPurchases(); let n = 0;
  for (const p of list) {
    if (!SKUS.includes(p.itemId as Sku)) continue;
    try { await claim(p.itemId as Sku, p.purchaseToken); n++; } catch { /* already claimed by another device or voided */ }
  }
  return n;
}

/** When the cached token is older than the offline grace period and we are online, fetch a fresh one. */
export async function refreshIfStale(): Promise<void> {
  if (IS_PLACEHOLDER(WORKER_URL) || typeof navigator !== 'undefined' && !navigator.onLine) return;
  const cur = await loadEntitlement();
  if (!cur || !cur.stale) return;
  try {
    const res = await fetch(`${WORKER_URL}/v1/entitlement/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dev: getDeviceId() }) });
    if (!res.ok) return;
    const body: any = await res.json();
    const payload = await verifyToken(body.token);
    if (payload) await cacheEntitlement(body.token, payload);
  } catch { /* offline or Worker down: keep honouring the cached token until it expires */ }
}
