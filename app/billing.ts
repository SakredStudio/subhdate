// Google Play Billing through the Digital Goods API + Payment Request, available only inside the Play-installed TWA
// (Chrome 101+ with the androidbrowserhelper billing bridge). Everything is feature-detected; on the web nothing is
// sold and nothing links to a paywall (Play policy §4). `purchase()` is deliberately unfinished until Soul confirms
// the Play Console app and the two products exist (CHECKPOINT.md, "Steps only Soul can do" #5).
import { WORKER_URL, IS_PLACEHOLDER } from './config.ts';
import { getDeviceId, type Sku } from './entitlement.ts';

export const PLAY_BILLING_METHOD = 'https://play.google.com/billing';
export const SKUS: Sku[] = ['report_single', 'family_annual'];

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
/** Purchases Play still holds for this account (used by the refresh flow later). */
export async function listPurchases(): Promise<{ itemId: string; purchaseToken: string }[]> {
  const s = await service(); if (!s) return [];
  try { return await s.listPurchases(); } catch { return []; }
}

/**
 * Buy a SKU. Builds the PaymentRequest for the Play billing method and then STOPS: the show() / claim / consume
 * steps are not implemented until the Play Console app and products exist.
 *
 * Claim step (interface only, see worker/src/index.ts POST /v1/entitlement/claim):
 *   const res = await paymentRequest.show();            // { details: { purchaseToken } }
 *   await res.complete('success');
 *   POST `${WORKER_URL}/v1/entitlement/claim`
 *     body: { purchaseToken: string, sku: Sku, dev: getDeviceId(), packageName: 'com.sakredstudio.shubhdate' }
 *     200: { token: string (ES256 JWS, see entitlement.ts), entitlement: Entitlement }
 *     402: { error: 'not_purchased' | 'pending' }   409: { error: 'claimed_by_other_device' }   501: not implemented yet
 *   then cacheEntitlement(token, entitlement); for report_single the Worker consumes/acknowledges via the Play Developer API.
 */
export async function purchase(sku: Sku): Promise<never> {
  if (!(await isPlayBillingAvailable())) throw new Error('PlayBillingUnavailable');
  if (IS_PLACEHOLDER(WORKER_URL)) throw new Error('WorkerNotConfigured');
  const request = new PaymentRequest(
    [{ supportedMethods: PLAY_BILLING_METHOD, data: { sku } }],
    { total: { label: sku, amount: { currency: 'INR', value: '0' } } }, // Play ignores the total; it uses the Console price
  );
  void request; void getDeviceId;
  throw new Error('NotImplemented: purchase flow waits for the Play Console app and products (CHECKPOINT.md §Steps only Soul can do #5)');
}
