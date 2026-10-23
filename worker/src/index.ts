// ShubhDate API (Cloudflare Worker + D1): Play purchase verification -> signed entitlement tokens, RTDN processing,
// and festival/vrat reminders by Web Push. Nothing here stores a name, email or phone; purchase tokens are hashed.
import { festivals } from '../../engine/festivals.ts';
import { sha256b64u } from './jws.ts';
import { acknowledgeProduct, acknowledgeSubscription, consumeProduct, getProduct, getSubscription, subscriptionExpiry, type ServiceAccount } from './play.ts';
import { SKUS, CONSUMABLE, issueToken, judgeProduct, judgeSubscription, payloadFor, rtdnAction, type EntRow, type Sku } from './entitle.ts';
import { sendWebPush } from './webpush.ts';

export interface Env {
  DB: D1Database;
  PACKAGE_NAME: string;
  ALLOWED_ORIGIN: string;
  ENTITLEMENT_PRIVATE_KEY_JWK?: string; // secret: ES256 private JWK (JSON)
  VAPID_PRIVATE_KEY?: string;           // secret: base64url d
  VAPID_PUBLIC_KEY?: string;            // secret: base64url raw 65-byte point
  PLAY_SERVICE_ACCOUNT?: string;        // secret: service-account JSON
  RTDN_TOKEN?: string;                  // secret: ?token= on the Pub/Sub push URL
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const cors = (env: Env) => ({ 'access-control-allow-origin': env.ALLOWED_ORIGIN, 'access-control-allow-methods': 'POST, DELETE, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' });
const nowS = () => Math.floor(Date.now() / 1000);
const isUuid = (s: unknown) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const validTz = (tz: unknown) => { try { new Intl.DateTimeFormat('en', { timeZone: String(tz) }); return typeof tz === 'string'; } catch { return false; } };
const serviceAccount = (env: Env): ServiceAccount | null => { try { return env.PLAY_SERVICE_ACCOUNT ? JSON.parse(env.PLAY_SERVICE_ACCOUNT) : null; } catch { return null; } };
const signingKey = (env: Env): JsonWebKey | null => { try { return env.ENTITLEMENT_PRIVATE_KEY_JWK ? JSON.parse(env.ENTITLEMENT_PRIVATE_KEY_JWK) : null; } catch { return null; } };

async function rowsFor(env: Env, dev: string): Promise<EntRow[]> {
  return (await env.DB.prepare('SELECT * FROM entitlements WHERE device_id = ?').bind(dev).all<EntRow>()).results;
}
async function tokenResponse(env: Env, dev: string, status = 200): Promise<Response> {
  const key = signingKey(env); if (!key) return json({ error: 'signing_not_configured' }, 503, cors(env));
  const payload = payloadFor(dev, await rowsFor(env, dev), nowS());
  if (!payload) return json({ error: 'none' }, 404, cors(env));
  return json({ token: await issueToken(payload, key), entitlement: payload }, status, cors(env));
}

// ---------- POST /v1/entitlement/claim ----------
/**
 * body: { purchaseToken, sku, dev (uuid), packageName }
 * 200 { token, entitlement } | 402 { error: 'not_purchased' | 'pending' } | 409 { error: 'claimed_by_other_device' }
 * 429 too many claims | 502 Play API unreachable | 503 not configured yet
 */
async function claim(req: Request, env: Env): Promise<Response> {
  const b: any = await req.json().catch(() => null);
  if (!b || typeof b.purchaseToken !== 'string' || b.purchaseToken.length < 20 || b.purchaseToken.length > 4096 || !SKUS.includes(b.sku) || !isUuid(b.dev) || b.packageName !== env.PACKAGE_NAME) return json({ error: 'bad_request' }, 400, cors(env));
  const sku = b.sku as Sku, dev = String(b.dev).toLowerCase(), now = nowS();
  // rate limit: 20 claims per device per hour
  const n = await env.DB.prepare('SELECT COUNT(*) AS c FROM claim_log WHERE device_id = ? AND at > ?').bind(dev, now - 3600).first<{ c: number }>();
  if ((n?.c ?? 0) >= 20) return json({ error: 'too_many_claims' }, 429, cors(env));
  await env.DB.prepare('INSERT INTO claim_log (device_id, at) VALUES (?, ?)').bind(dev, now).run();

  const hash = await sha256b64u(b.purchaseToken);
  const existing = await env.DB.prepare('SELECT * FROM entitlements WHERE purchase_token_hash = ?').bind(hash).first<EntRow>();
  if (existing) {
    if (existing.device_id !== dev) return json({ error: 'claimed_by_other_device' }, 409, cors(env));
    return tokenResponse(env, dev);
  }
  const sa = serviceAccount(env);
  if (!sa) return json({ error: 'play_api_not_configured' }, 503, cors(env));

  let orderId: string | null = null, expiresAt: number | null = null;
  if (CONSUMABLE.includes(sku)) {
    const r = await getProduct(sa, env.PACKAGE_NAME, sku, b.purchaseToken);
    if (r.status === 404 || r.status === 400) return json({ error: 'not_purchased' }, 402, cors(env));
    if (!r.purchase) return json({ error: 'play_api_error', detail: r.error }, 502, cors(env));
    const j = judgeProduct(r.purchase);
    if (!j.ok) return json({ error: j.error }, 402, cors(env));
    orderId = r.purchase.orderId ?? null;
  } else {
    const r = await getSubscription(sa, env.PACKAGE_NAME, b.purchaseToken);
    if (r.status === 404 || r.status === 400) return json({ error: 'not_purchased' }, 402, cors(env));
    if (!r.sub) return json({ error: 'play_api_error', detail: r.error }, 502, cors(env));
    const j = judgeSubscription(r.sub, sku);
    if (!j.ok) return json({ error: j.error }, 402, cors(env));
    orderId = r.sub.latestOrderId ?? null; expiresAt = j.expiresAt;
  }
  await env.DB.prepare('INSERT OR IGNORE INTO entitlements (id, sku, source, device_id, purchase_token_hash, order_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), sku, 'play', dev, hash, orderId, expiresAt, now).run();
  // Acknowledge (Play refunds unacknowledged purchases after 3 days). Consume the report credit server-side so it can be bought again.
  try {
    if (CONSUMABLE.includes(sku)) { await acknowledgeProduct(sa, env.PACKAGE_NAME, sku, b.purchaseToken).catch(() => false); await consumeProduct(sa, env.PACKAGE_NAME, sku, b.purchaseToken); }
    else await acknowledgeSubscription(sa, env.PACKAGE_NAME, sku, b.purchaseToken);
  } catch { /* the token was issued; acknowledgement is retried by a later refresh if Play still reports it pending */ }
  return tokenResponse(env, dev, 200);
}

// ---------- POST /v1/entitlement/refresh ----------
/** body: { dev } -> 200 { token, entitlement } with a fresh iat; re-reads the family plan from Play when it is near/after expiry. */
async function refresh(req: Request, env: Env): Promise<Response> {
  const b: any = await req.json().catch(() => null);
  if (!b || !isUuid(b.dev)) return json({ error: 'bad_request' }, 400, cors(env));
  const dev = String(b.dev).toLowerCase(), now = nowS();
  const sa = serviceAccount(env);
  if (sa) {
    const fams = (await rowsFor(env, dev)).filter(r => r.sku === 'family_annual' && !r.revoked_at && (r.expires_at ?? 0) < now + 86400 * 3);
    for (const f of fams) {
      // A near-expiry subscription may have renewed: Play is the source of truth, but we only hold the token hash.
      // RTDN carries the token itself (see rtdn()), so renewals are normally applied there; here we only mark expiry.
      if ((f.expires_at ?? 0) < now) await env.DB.prepare('UPDATE entitlements SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').bind(now, f.id).run();
    }
  }
  return tokenResponse(env, dev);
}

// ---------- POST /v1/rtdn?token=RTDN_TOKEN (Google Pub/Sub push) ----------
async function rtdn(req: Request, env: Env, url: URL): Promise<Response> {
  if (!env.RTDN_TOKEN || url.searchParams.get('token') !== env.RTDN_TOKEN) return json({ error: 'forbidden' }, 403);
  const b: any = await req.json().catch(() => null);
  const msg = b?.message; if (!msg?.messageId || typeof msg.data !== 'string') return json({ error: 'bad_request' }, 400);
  let decoded: any = null; try { decoded = JSON.parse(atob(msg.data)); } catch { decoded = null; }
  const { purchaseToken, action, type } = rtdnAction(decoded);
  const tokenHash = purchaseToken ? await sha256b64u(purchaseToken) : null;
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO rtdn_events (received_at, message_id, notification_type, purchase_token_hash, raw) VALUES (?, ?, ?, ?, ?)')
    .bind(nowS(), String(msg.messageId), type, tokenHash, JSON.stringify(decoded ?? { undecodable: true })).run();
  if (!ins.meta?.changes) return json({ ok: true, duplicate: true }); // idempotent: already processed
  if (decoded?.testNotification) return json({ ok: true, test: true });
  if (!tokenHash || action.kind === 'none') return json({ ok: true });
  if (action.kind === 'revoke') {
    await env.DB.prepare('UPDATE entitlements SET revoked_at = ? WHERE purchase_token_hash = ? AND revoked_at IS NULL').bind(nowS(), tokenHash).run();
    return json({ ok: true, revoked: true });
  }
  // refetch: renewals, recoveries, restarts, holds. Only subscriptions carry an expiry.
  const sa = serviceAccount(env);
  if (sa && decoded?.subscriptionNotification && purchaseToken) {
    const r = await getSubscription(sa, env.PACKAGE_NAME, purchaseToken);
    if (r.sub) {
      const exp = subscriptionExpiry(r.sub);
      const live = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED'].includes(r.sub.subscriptionState);
      if (exp) await env.DB.prepare('UPDATE entitlements SET expires_at = ?, revoked_at = ? WHERE purchase_token_hash = ?').bind(exp, live ? null : nowS(), tokenHash).run();
      if (r.sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') await acknowledgeSubscription(sa, env.PACKAGE_NAME, 'family_annual', purchaseToken).catch(() => false);
    }
  }
  return json({ ok: true });
}

// ---------- push subscriptions ----------
async function subscribe(req: Request, env: Env): Promise<Response> {
  const b: any = await req.json().catch(() => null);
  const s = b?.subscription;
  if (!s || typeof s.endpoint !== 'string' || !/^https:\/\//.test(s.endpoint) || typeof s.keys?.p256dh !== 'string' || typeof s.keys?.auth !== 'string') return json({ error: 'bad_subscription' }, 400, cors(env));
  const lat = Number(b.lat), lon = Number(b.lon);
  if (!validTz(b.tz) || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return json({ error: 'bad_place' }, 400, cors(env));
  const lang = /^[a-z]{2,8}$/.test(String(b.lang)) ? String(b.lang) : 'en';
  const region = ['north', 'west', 'south', 'east', 'diaspora'].includes(b.region) ? b.region : 'north';
  const topics = (Array.isArray(b.topics) ? b.topics : ['festivals']).filter((t: unknown) => ['festivals', 'ekadashi', 'saved'].includes(String(t))).join(',') || 'festivals';
  const existing = await env.DB.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').bind(s.endpoint).first<{ id: string }>();
  const id = existing?.id ?? crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, tz, lat, lon, lang, region, topics, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, tz = excluded.tz, lat = excluded.lat, lon = excluded.lon, lang = excluded.lang, region = excluded.region, topics = excluded.topics`)
    .bind(id, s.endpoint, s.keys.p256dh, s.keys.auth, b.tz, Math.round(lat * 100) / 100, Math.round(lon * 100) / 100, lang, region, topics, nowS()).run();
  return json({ id }, 200, cors(env));
}
async function unsubscribe(req: Request, env: Env): Promise<Response> {
  const b: any = await req.json().catch(() => null);
  if (typeof b?.endpoint !== 'string') return json({ error: 'bad_request' }, 400, cors(env));
  const sub = await env.DB.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').bind(b.endpoint).first<{ id: string }>();
  if (sub) await env.DB.batch([env.DB.prepare('DELETE FROM reminders_sent WHERE sub_id = ?').bind(sub.id), env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(sub.id)]);
  return json({ ok: true }, 200, cors(env));
}

// ---------- reminders cron ----------
interface SubRow { id: string; endpoint: string; p256dh: string; auth: string; tz: string; lat: number; lon: number; lang: string; region: string; topics: string; }
interface PushPayload { title: string; body: string; url: string; tag: string; }
async function sendPush(env: Env, sub: SubRow, payload: PushPayload): Promise<'sent' | 'gone' | 'skipped'> {
  if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return 'skipped';
  try {
    const r = await sendWebPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload, { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: 'https://sakredstudio.github.io/subhdate/' });
    return r === 'failed' ? 'skipped' : r;
  } catch { return 'skipped'; }
}
const localDate = (d: Date, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
const addDays = (iso: string, n: number) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
export async function runReminders(env: Env): Promise<{ checked: number; due: number; sent: number }> {
  const subs = (await env.DB.prepare('SELECT * FROM push_subscriptions').all<SubRow>()).results;
  let due = 0, sent = 0;
  for (const s of subs) {
    const today = localDate(new Date(), s.tz); const tomorrow = addDays(today, 1);
    const topics = new Set(s.topics.split(','));
    let list: ReturnType<typeof festivals> = [];
    try { list = festivals(today, tomorrow, { lat: s.lat, lon: s.lon, tz: s.tz }, { region: s.region as any }); } catch { continue; }
    for (const f of list) {
      if (f.date !== tomorrow) continue;
      if (f.id === 'ekadashi' ? !topics.has('ekadashi') : !topics.has('festivals')) continue;
      const key = `${f.id}|${f.date}`;
      const already = await env.DB.prepare('SELECT 1 FROM reminders_sent WHERE sub_id = ? AND key = ?').bind(s.id, key).first();
      if (already) continue;
      due++;
      const name = f.names[s.lang] ?? f.names.en;
      const r = await sendPush(env, s, { title: name, body: `Tomorrow (${f.date}) at your city.`, url: `/subhdate/#/festivals`, tag: key });
      if (r === 'sent') { sent++; await env.DB.prepare('INSERT OR IGNORE INTO reminders_sent (sub_id, key, sent_at) VALUES (?, ?, ?)').bind(s.id, key, nowS()).run(); }
      if (r === 'gone') { await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(s.id).run(); break; }
    }
  }
  return { checked: subs.length, due, sent };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    const p = url.pathname;
    if (p === '/' || p === '/health') return json({ ok: true, service: 'shubhdate-api', time: nowS(), play: !!env.PLAY_SERVICE_ACCOUNT, signing: !!env.ENTITLEMENT_PRIVATE_KEY_JWK, push: !!env.VAPID_PRIVATE_KEY });
    if (p === '/v1/entitlement/claim' && req.method === 'POST') return claim(req, env);
    if (p === '/v1/entitlement/refresh' && req.method === 'POST') return refresh(req, env);
    if (p === '/v1/rtdn' && req.method === 'POST') return rtdn(req, env, url);
    if (p === '/v1/push/subscribe' && req.method === 'POST') return subscribe(req, env);
    if (p === '/v1/push/subscribe' && req.method === 'DELETE') return unsubscribe(req, env);
    return json({ error: 'not_found' }, 404);
  },
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runReminders(env).then(r => console.log('reminders', JSON.stringify(r))));
  },
};
