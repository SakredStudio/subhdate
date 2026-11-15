import { describe, it, expect } from 'vitest';
import { judgeProduct, judgeSubscription, payloadFor, rtdnAction, issueToken, FAR_FUTURE, type EntRow } from '../src/entitle.ts';
import { verifyToken } from '../../app/entitlement.ts';

const now = 1_760_000_000;
const row = (o: Partial<EntRow>): EntRow => ({ id: 'x', sku: 'report_single', device_id: 'd', purchase_token_hash: 'h', order_id: null, expires_at: null, created_at: now, revoked_at: null, ...o });

describe('one-time product verdicts (recorded Play shapes)', () => {
  it('purchased', () => expect(judgeProduct({ purchaseState: 0, consumptionState: 0, acknowledgementState: 0, orderId: 'GPA.1' })).toEqual({ ok: true }));
  it('pending', () => expect(judgeProduct({ purchaseState: 2, consumptionState: 0, acknowledgementState: 0 })).toEqual({ ok: false, error: 'pending' }));
  it('canceled', () => expect(judgeProduct({ purchaseState: 1, consumptionState: 0, acknowledgementState: 0 })).toEqual({ ok: false, error: 'not_purchased' }));
});

describe('subscription verdicts', () => {
  const future = new Date((Math.floor(Date.now() / 1000) + 86400 * 300) * 1000).toISOString(); // relative to the real clock: the verdict rejects expired plans
  it('active with expiry', () => {
    const r = judgeSubscription({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [{ productId: 'family_annual', expiryTime: future }] }, 'family_annual');
    expect(r.ok).toBe(true); if (r.ok) expect(r.expiresAt).toBe(Math.floor(Date.parse(future) / 1000));
  });
  it('grace period still entitled', () => expect(judgeSubscription({ subscriptionState: 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', lineItems: [{ productId: 'family_annual', expiryTime: future }] }, 'family_annual').ok).toBe(true));
  it('on hold is not', () => expect(judgeSubscription({ subscriptionState: 'SUBSCRIPTION_STATE_ON_HOLD', lineItems: [{ productId: 'family_annual', expiryTime: future }] }, 'family_annual')).toEqual({ ok: false, error: 'not_purchased' }));
  it('wrong product id', () => expect(judgeSubscription({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [{ productId: 'other', expiryTime: future }] }, 'family_annual').ok).toBe(false));
  it('pending purchase', () => expect(judgeSubscription({ subscriptionState: 'SUBSCRIPTION_STATE_PENDING' }, 'family_annual')).toEqual({ ok: false, error: 'pending' }));
});

describe('token payload from rows', () => {
  it('family plan wins and carries its expiry', () => {
    const p = payloadFor('d', [row({ sku: 'report_single' }), row({ id: 'f', sku: 'family_annual', expires_at: now + 1000 })], now)!;
    expect(p.sku).toBe('family_annual'); expect(p.exp).toBe(now + 1000); expect(p.dev).toBe('d');
  });
  it('expired or revoked family plan falls back to report credits', () => {
    const p = payloadFor('d', [row({ id: 'a' }), row({ id: 'b' }), row({ id: 'f', sku: 'family_annual', expires_at: now - 1 }), row({ id: 'r', sku: 'family_annual', expires_at: now + 99, revoked_at: now })], now)!;
    expect(p.sku).toBe('report_single'); expect(p.credits).toBe(2); expect(p.exp).toBe(FAR_FUTURE);
  });
  it('nothing live -> null', () => expect(payloadFor('d', [row({ revoked_at: now })], now)).toBeNull());
});

describe('RTDN mapping', () => {
  it('subscription expired/revoked -> revoke', () => {
    expect(rtdnAction({ subscriptionNotification: { notificationType: 13, purchaseToken: 't' } }).action.kind).toBe('revoke');
    expect(rtdnAction({ subscriptionNotification: { notificationType: 12, purchaseToken: 't' } }).action.kind).toBe('revoke');
  });
  it('renewed -> refetch', () => expect(rtdnAction({ subscriptionNotification: { notificationType: 2, purchaseToken: 't' } }).action.kind).toBe('refetch'));
  it('voided purchase -> revoke', () => expect(rtdnAction({ voidedPurchaseNotification: { purchaseToken: 't', orderId: 'GPA.1' } }).action.kind).toBe('revoke'));
  it('one-time canceled -> revoke, purchased -> none', () => {
    expect(rtdnAction({ oneTimeProductNotification: { notificationType: 2, purchaseToken: 't' } }).action.kind).toBe('revoke');
    expect(rtdnAction({ oneTimeProductNotification: { notificationType: 1, purchaseToken: 't' } }).action.kind).toBe('none');
  });
  it('test notification -> none', () => expect(rtdnAction({ testNotification: { version: '1.0' } }).action.kind).toBe('none'));
});

describe('token round trip', () => {
  it('Worker-signed token verifies in the app with the public half', async () => {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const priv = await crypto.subtle.exportKey('jwk', kp.privateKey); const pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
    const tok = await issueToken({ sku: 'family_annual', source: 'play', exp: now + 10, iat: now, dev: '00000000-0000-4000-8000-000000000000' }, priv);
    const p = await verifyToken(tok, { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y });
    expect(p?.sku).toBe('family_annual');
    expect(await verifyToken(tok.slice(0, -2) + 'AA', { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y })).toBeNull();
  });
});

describe('shagun_pro rows', () => {
  it('a live shagun_pro row sets the shagun flag; alone it is the sku; credits still win the sku slot', () => {
    const p = payloadFor('d', [row({ id: 's', sku: 'shagun_pro' })], now)!;
    expect(p.sku).toBe('shagun_pro'); expect(p.shagun).toBe(true); expect(p.exp).toBe(FAR_FUTURE); expect(p.credits).toBeUndefined();
    const q = payloadFor('d', [row({ id: 's', sku: 'shagun_pro' }), row({ id: 'n', sku: 'naam_report' })], now)!;
    expect(q.sku).toBe('naam_report'); expect(q.naam).toBe(1); expect(q.shagun).toBe(true);
    expect(payloadFor('d', [row({ id: 's', sku: 'shagun_pro', revoked_at: now })], now)).toBeNull();
  });
});
