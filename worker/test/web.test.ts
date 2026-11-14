// Website purchases (Stripe Checkout): the pure decisions in web.ts, the signature check in stripe.ts, and the
// four routes end to end against an in-memory stand-in for D1 and a stubbed Stripe API.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import worker, { type Env } from '../src/index.ts';
import { payloadFor, type EntRow } from '../src/entitle.ts';
import { webOffer, newPurchaseCode, normaliseCode, judgeSession, webhookAction, isSessionId, FAMILY_WEB_SECONDS } from '../src/web.ts';
import { signPayload, verifyWebhook, toForm } from '../src/stripe.ts';
import { sha256b64u } from '../src/jws.ts';
import { verifyToken } from '../../app/entitlement.ts';

const DEV = '11111111-2222-4333-8444-555555555555', DEV2 = '99999999-2222-4333-8444-555555555555';
const SITE = 'https://shubhdate.sakredstudio.ca';
const now = Math.floor(Date.now() / 1000);
const session = (o: any = {}) => ({ id: 'cs_test_abc12345678', object: 'checkout.session', status: 'complete', payment_status: 'paid', payment_intent: 'pi_1', created: now, ...o, metadata: { app: 'shubhdate', sku: 'report_single', dev: DEV, code: 'ABCD-EFGH-JKMN', ...(o.metadata ?? {}) } });

describe('what the website may sell', () => {
  const full = { STRIPE_SECRET_KEY: 'rk_test_x', STRIPE_PRICE_REPORT_SINGLE: 'price_1', PRICE_REPORT_SINGLE: 'CA$9', STRIPE_PRICE_FAMILY_ANNUAL: 'price_2', PRICE_FAMILY_ANNUAL: '' };
  it('needs a price id and a display price per product', () => expect(webOffer(full, true)).toEqual({ enabled: true, prices: { report_single: 'CA$9' } }));
  it('nothing without the Stripe key', () => expect(webOffer({ ...full, STRIPE_SECRET_KEY: '' }, true)).toEqual({ enabled: false, prices: {} }));
  it('nothing without the token-signing key', () => expect(webOffer(full, false).enabled).toBe(false));
  it('nothing by default (fresh deploy)', () => expect(webOffer({}, true)).toEqual({ enabled: false, prices: {} }));
});

describe('purchase codes', () => {
  it('are 12 unambiguous characters in three groups', () => { for (let i = 0; i < 50; i++) expect(newPurchaseCode()).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/); });
  it('survive how people type them', () => {
    expect(normaliseCode('abcd efgh jkmn')).toBe('ABCD-EFGH-JKMN');
    expect(normaliseCode('O1L0-IIII-0000')).toBe('0110-1111-0000'); // O -> 0, I and L -> 1
    expect(normaliseCode(newPurchaseCode().toLowerCase().replace(/-/g, ''))).not.toBeNull();
  });
  it('reject what cannot be a code', () => { expect(normaliseCode('ABCD-EFGH')).toBeNull(); expect(normaliseCode('UUUU-UUUU-UUUU')).toBeNull(); expect(normaliseCode(42)).toBeNull(); });
});

describe('reading a Checkout Session', () => {
  it('a paid single report', () => expect(judgeSession(session(), now)).toEqual({ ok: true, sku: 'report_single', dev: DEV, code: 'ABCD-EFGH-JKMN', orderId: 'pi_1', expiresAt: null }));
  it('a paid Family plan lasts one year from payment', () => { const v = judgeSession(session({ metadata: { sku: 'family_annual' } }), now); expect(v.ok && v.expiresAt).toBe(now + FAMILY_WEB_SECONDS); });
  it('unpaid and still open', () => expect(judgeSession(session({ payment_status: 'unpaid', status: 'open' }), now)).toEqual({ ok: false, error: 'not_paid' }));
  it('a delayed payment still clearing', () => expect(judgeSession(session({ payment_status: 'unpaid' }), now)).toEqual({ ok: false, error: 'pending' }));
  it("another product's session on the same Stripe account (Sakred Graha)", () => expect(judgeSession({ object: 'checkout.session', payment_status: 'paid', metadata: { order_id: 'g1' } }, now)).toEqual({ ok: false, error: 'not_ours' }));
  it('tampered metadata', () => { expect(judgeSession(session({ metadata: { sku: 'everything' } }), now).ok).toBe(false); expect(judgeSession(session({ metadata: { dev: 'x' } }), now).ok).toBe(false); });
  it('session ids', () => { expect(isSessionId('cs_live_a1B2c3D4e5')).toBe(true); expect(isSessionId('cs_x_123')).toBe(false); expect(isSessionId("cs_test_abc'; DROP")).toBe(false); });
});

describe('Stripe events', () => {
  it('payment completed -> grant', () => expect(webhookAction({ type: 'checkout.session.completed', data: { object: session() } }).kind).toBe('grant'));
  it('full refund -> revoke by payment intent', () => expect(webhookAction({ type: 'charge.refunded', data: { object: { refunded: true, payment_intent: 'pi_1' } } })).toEqual({ kind: 'revoke', orderId: 'pi_1' }));
  it('partial refund keeps the purchase', () => expect(webhookAction({ type: 'charge.refunded', data: { object: { refunded: false, payment_intent: 'pi_1' } } })).toEqual({ kind: 'none' }));
  it('dispute -> revoke', () => expect(webhookAction({ type: 'charge.dispute.created', data: { object: { payment_intent: 'pi_1' } } })).toEqual({ kind: 'revoke', orderId: 'pi_1' }));
  it('anything else is ignored', () => expect(webhookAction({ type: 'customer.created', data: { object: {} } })).toEqual({ kind: 'none' }));
});

describe('webhook signature', () => {
  const body = JSON.stringify({ type: 'checkout.session.completed' });
  it('accepts a correct signature', async () => expect(await verifyWebhook('whsec_x', body, await signPayload('whsec_x', body))).toEqual({ type: 'checkout.session.completed' }));
  it('rejects a wrong secret, a changed body, an old timestamp and no header', async () => {
    expect(await verifyWebhook('whsec_y', body, await signPayload('whsec_x', body))).toBeNull();
    expect(await verifyWebhook('whsec_x', body + ' ', await signPayload('whsec_x', body))).toBeNull();
    expect(await verifyWebhook('whsec_x', body, await signPayload('whsec_x', body, now - 3600))).toBeNull();
    expect(await verifyWebhook('whsec_x', body, null)).toBeNull();
  });
  it('form-encodes nested Checkout fields', () => expect(toForm({ mode: 'payment', line_items: [{ price: 'price_1', quantity: 1 }], metadata: { a: 'b c' } })).toBe('mode=payment&line_items%5B0%5D%5Bprice%5D=price_1&line_items%5B0%5D%5Bquantity%5D=1&metadata%5Ba%5D=b%20c'));
});

describe('the token says where it was bought', () => {
  const row = (o: Partial<EntRow>): EntRow => ({ id: 'x', sku: 'report_single', source: 'play', device_id: DEV, purchase_token_hash: 'h', order_id: null, expires_at: null, created_at: now, revoked_at: null, ...o });
  it('website rows only -> stripe', () => expect(payloadFor(DEV, [row({ source: 'stripe' })], now)!.source).toBe('stripe'));
  it('a Play row, or a mix -> play', () => { expect(payloadFor(DEV, [row({})], now)!.source).toBe('play'); expect(payloadFor(DEV, [row({}), row({ id: 'y', source: 'stripe' })], now)!.source).toBe('play'); });
  it('a website Family plan', () => expect(payloadFor(DEV, [row({ sku: 'family_annual', source: 'stripe', expires_at: now + 100 })], now)).toMatchObject({ sku: 'family_annual', source: 'stripe', exp: now + 100 }));
});

// ---------- the routes, against a stand-in for D1 that understands exactly the statements they use ----------
function fakeDb() {
  const ents: any[] = [], log: { device_id: string; at: number }[] = [];
  const exec = (sql: string, a: any[]): { first?: any; all?: any[] } => {
    if (sql.startsWith('SELECT COUNT(*) AS c FROM claim_log')) return { first: { c: log.filter(l => l.device_id === a[0] && l.at > a[1]).length } };
    if (sql.startsWith('INSERT INTO claim_log')) { log.push({ device_id: a[0], at: a[1] }); return {}; }
    if (sql.startsWith('INSERT OR IGNORE INTO entitlements')) { if (!ents.some(e => e.purchase_token_hash === a[4])) ents.push({ id: a[0], sku: a[1], source: a[2], device_id: a[3], purchase_token_hash: a[4], order_id: a[5], expires_at: a[6], created_at: a[7], revoked_at: null }); return {}; }
    if (sql.startsWith('SELECT device_id FROM entitlements WHERE purchase_token_hash')) return { first: ents.find(e => e.purchase_token_hash === a[0]) ?? null };
    if (sql.startsWith("SELECT * FROM entitlements WHERE purchase_token_hash = ? AND source = 'stripe'")) return { first: ents.find(e => e.purchase_token_hash === a[0] && e.source === 'stripe') ?? null };
    if (sql.startsWith('SELECT * FROM entitlements WHERE device_id')) return { all: ents.filter(e => e.device_id === a[0]) };
    if (sql.startsWith('UPDATE entitlements SET device_id')) { ents.find(e => e.id === a[1]).device_id = a[0]; return {}; }
    if (sql.startsWith('UPDATE entitlements SET revoked_at = ? WHERE order_id')) { ents.filter(e => e.order_id === a[1] && e.source === 'stripe' && !e.revoked_at).forEach(e => { e.revoked_at = a[0]; }); return {}; }
    throw new Error(`fakeDb: unexpected SQL: ${sql}`);
  };
  const db = { prepare: (sql: string) => ({ bind: (...a: any[]) => ({ first: async () => exec(sql, a).first ?? null, all: async () => ({ results: exec(sql, a).all ?? [] }), run: async () => { exec(sql, a); return { meta: { changes: 1 } }; } }) }) };
  return { db: db as unknown as Env['DB'], ents, log };
}

describe('website purchase routes', () => {
  let publicJwk: JsonWebKey, privateJwk: string;
  beforeAll(async () => {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
    publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey); privateJwk = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey));
  });
  afterEach(() => vi.unstubAllGlobals());
  const env = (db: Env['DB'], o: Partial<Env> = {}): Env => ({ DB: db, PACKAGE_NAME: 'com.sakredstudio.shubhdate', ALLOWED_ORIGIN: `${SITE},https://sakredstudio.github.io`, ENTITLEMENT_PRIVATE_KEY_JWK: privateJwk,
    STRIPE_SECRET_KEY: 'rk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_x', STRIPE_PRICE_REPORT_SINGLE: 'price_r', PRICE_REPORT_SINGLE: 'CA$9', STRIPE_PRICE_FAMILY_ANNUAL: 'price_f', PRICE_FAMILY_ANNUAL: 'CA$29', ...o });
  const call = (e: Env, path: string, body?: unknown, headers: Record<string, string> = {}) => worker.fetch(new Request(`https://api.test${path}`, body === undefined ? { headers: { origin: SITE } } : { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { origin: SITE, 'content-type': 'application/json', ...headers } }), e);
  /** Stripe stand-in: remembers created sessions and serves them back as paid. */
  function stripe(paid = true) {
    const created: any[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: any) => {
      if (init?.method === 'POST' && url.endsWith('/v1/checkout/sessions')) {
        const f = new URLSearchParams(init.body); const id = `cs_test_${'a'.repeat(8)}${created.length}`;
        const s = { id, object: 'checkout.session', status: paid ? 'complete' : 'open', payment_status: paid ? 'paid' : 'unpaid', payment_intent: `pi_${created.length}`, created: now, url: `https://checkout.stripe.com/c/pay/${id}`,
          success_url: f.get('success_url'), cancel_url: f.get('cancel_url'), price: f.get('line_items[0][price]'), description: f.get('payment_intent_data[description]'), auth: init.headers.authorization,
          metadata: { app: f.get('metadata[app]'), sku: f.get('metadata[sku]'), dev: f.get('metadata[dev]'), code: f.get('metadata[code]') } };
        created.push(s); return new Response(JSON.stringify(s), { status: 200 });
      }
      const s = created.find(x => url.endsWith(`/v1/checkout/sessions/${x.id}`));
      return s ? new Response(JSON.stringify(s), { status: 200 }) : new Response(JSON.stringify({ error: { message: 'No such checkout.session' } }), { status: 404 });
    }));
    return created;
  }

  it('config: prices when set up, nothing on a fresh deploy', async () => {
    const { db } = fakeDb();
    expect(await (await call(env(db), '/v1/web/config')).json()).toEqual({ enabled: true, prices: { report_single: 'CA$9', family_annual: 'CA$29' } });
    expect(await (await call(env(db, { STRIPE_SECRET_KEY: undefined }), '/v1/web/config')).json()).toEqual({ enabled: false, prices: {} });
  });

  it('checkout -> pay -> claim unlocks the report on that browser, once', async () => {
    const { db, ents } = fakeDb(); const e = env(db); const made = stripe();
    const co = await call(e, '/v1/web/checkout', { sku: 'report_single', dev: DEV, back: 'report' });
    expect(co.status).toBe(200); expect((await co.json() as any).url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(made[0]).toMatchObject({ price: 'price_r', auth: 'Bearer rk_test_x', success_url: `${SITE}/?paid={CHECKOUT_SESSION_ID}#/report`, cancel_url: `${SITE}/#/report`, description: 'ShubhDate Muhurta Report' });
    const claim = await call(e, '/v1/web/claim', { session: made[0].id, dev: DEV }); const body: any = await claim.json();
    expect(claim.status).toBe(200); expect(body.restoreCode).toBeUndefined();
    expect(await verifyToken(body.token, publicJwk)).toMatchObject({ sku: 'report_single', source: 'stripe', dev: DEV, credits: 1 });
    await call(e, '/v1/web/claim', { session: made[0].id, dev: DEV }); // landing back twice must not double the credit
    expect(ents).toHaveLength(1); expect(ents[0]).toMatchObject({ source: 'stripe', order_id: 'pi_0', expires_at: null });
    expect(ents[0].purchase_token_hash).toBe(await sha256b64u(made[0].metadata.code)); // the code itself is never stored
  });

  it('claim refuses an unpaid session, an unknown one, and another browser', async () => {
    const { db, ents } = fakeDb(); const e = env(db); const made = stripe(false);
    await call(e, '/v1/web/checkout', { sku: 'report_single', dev: DEV, back: 'report' });
    expect((await call(e, '/v1/web/claim', { session: made[0].id, dev: DEV })).status).toBe(402);
    expect((await call(e, '/v1/web/claim', { session: 'cs_test_doesnotexist1', dev: DEV })).status).toBe(402);
    made[0].payment_status = 'paid'; made[0].status = 'complete';
    expect((await call(e, '/v1/web/claim', { session: made[0].id, dev: DEV2 })).status).toBe(409);
    expect(ents).toHaveLength(0);
  });

  it('nothing is sold when a product has no price, or with bad input', async () => {
    const { db } = fakeDb(); stripe();
    expect((await call(env(db), '/v1/web/checkout', { sku: 'naam_report', dev: DEV, back: 'naam' })).status).toBe(503);
    expect((await call(env(db), '/v1/web/checkout', { sku: 'report_single', dev: 'nope', back: 'report' })).status).toBe(400);
    expect((await call(env(db), '/v1/web/checkout', { sku: 'report_single', dev: DEV, back: 'https://evil.example' })).status).toBe(400);
  });

  it('Family plan: one year, a restore code, and it moves to another browser with that code', async () => {
    const { db, ents } = fakeDb(); const e = env(db); const made = stripe();
    await call(e, '/v1/web/checkout', { sku: 'family_annual', dev: DEV, back: 'report' });
    expect(made[0].description).toBe(`ShubhDate Family plan, one year · restore code ${made[0].metadata.code}`);
    const body: any = await (await call(e, '/v1/web/claim', { session: made[0].id, dev: DEV })).json();
    expect(body.restoreCode).toBe(made[0].metadata.code);
    expect(await verifyToken(body.token, publicJwk)).toMatchObject({ sku: 'family_annual', source: 'stripe', exp: now + FAMILY_WEB_SECONDS });
    const typed = body.restoreCode.toLowerCase().replace(/-/g, ' ');
    const res = await call(e, '/v1/web/restore', { code: typed, dev: DEV2 });
    expect(res.status).toBe(200); expect(await verifyToken((await res.json() as any).token, publicJwk)).toMatchObject({ sku: 'family_annual', dev: DEV2 });
    expect(ents).toHaveLength(1); expect(ents[0].device_id).toBe(DEV2);
    expect((await call(e, '/v1/entitlement/refresh', { dev: DEV })).status).toBe(404); // the first browser no longer holds it
    expect((await call(e, '/v1/web/restore', { code: 'ZZZZ-ZZZZ-ZZZZ', dev: DEV2 })).status).toBe(404);
  });

  it('a single report cannot be restored into another browser', async () => {
    const { db } = fakeDb(); const e = env(db); const made = stripe();
    await call(e, '/v1/web/checkout', { sku: 'report_single', dev: DEV, back: 'report' });
    await call(e, '/v1/web/claim', { session: made[0].id, dev: DEV });
    expect((await call(e, '/v1/web/restore', { code: made[0].metadata.code, dev: DEV2 })).status).toBe(404);
  });

  it('webhook: grants when the buyer never comes back, ignores Graha, revokes on refund, checks the signature', async () => {
    const { db, ents } = fakeDb(); const e = env(db);
    const send = async (event: unknown, secret = 'whsec_x') => { const p = JSON.stringify(event); return call(e, '/stripe/webhook', p, { 'stripe-signature': await signPayload(secret, p) }); };
    expect((await send({ type: 'checkout.session.completed', data: { object: session() } }, 'whsec_wrong')).status).toBe(400);
    expect(await (await send({ type: 'checkout.session.completed', data: { object: { object: 'checkout.session', payment_status: 'paid', metadata: { order_id: 'graha-1' } } } })).json()).toEqual({ received: true, ignored: 'not_ours' });
    expect(ents).toHaveLength(0);
    expect(await (await send({ type: 'checkout.session.completed', data: { object: session() } })).json()).toEqual({ received: true, granted: true });
    await send({ type: 'checkout.session.completed', data: { object: session() } }); // Stripe retries
    expect(ents).toHaveLength(1);
    expect((await call(e, '/v1/entitlement/refresh', { dev: DEV })).status).toBe(200);
    await send({ type: 'charge.refunded', data: { object: { refunded: true, payment_intent: 'pi_1' } } });
    expect(ents[0].revoked_at).toBeGreaterThan(0);
    expect((await call(e, '/v1/entitlement/refresh', { dev: DEV })).status).toBe(404);
  });

  it('rate limit: 20 purchase calls per browser per hour', async () => {
    const { db } = fakeDb(); const e = env(db); stripe();
    for (let i = 0; i < 20; i++) expect((await call(e, '/v1/web/checkout', { sku: 'report_single', dev: DEV, back: 'report' })).status).toBe(200);
    expect((await call(e, '/v1/web/checkout', { sku: 'report_single', dev: DEV, back: 'report' })).status).toBe(429);
  });
});
