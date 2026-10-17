// ShubhDate API (Cloudflare Worker + D1). Skeleton: the route shapes, validation and storage are real; the Play
// Developer API verification, RTDN processing and VAPID push signing are deliberately not implemented until Soul
// confirms the Play Console app and products exist (CHECKPOINT.md). Nothing here stores a name, email or phone.
import { festivals } from '../../engine/festivals.ts';

export interface Env {
  DB: D1Database;
  PACKAGE_NAME: string;
  ALLOWED_ORIGIN: string;
  ENTITLEMENT_PRIVATE_KEY_JWK?: string; // secret: ES256 private JWK (JSON)
  VAPID_PRIVATE_KEY?: string;           // secret
  VAPID_PUBLIC_KEY?: string;            // secret
  PLAY_SERVICE_ACCOUNT?: string;        // secret: service-account JSON
  RTDN_TOKEN?: string;                  // secret: ?token= on the Pub/Sub push URL
}
type Sku = 'report_single' | 'family_annual';
const SKUS: Sku[] = ['report_single', 'family_annual'];

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });
const cors = (env: Env) => ({ 'access-control-allow-origin': env.ALLOWED_ORIGIN, 'access-control-allow-methods': 'POST, DELETE, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' });
const nowS = () => Math.floor(Date.now() / 1000);
async function sha256b64u(s: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  let b = ''; for (const x of d) b += String.fromCharCode(x);
  return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const isUuid = (s: unknown) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const validTz = (tz: unknown) => { try { new Intl.DateTimeFormat('en', { timeZone: String(tz) }); return typeof tz === 'string'; } catch { return false; } };

// ---------- entitlements (501 until the Play Console app exists) ----------
/**
 * POST /v1/entitlement/claim
 * body:  { purchaseToken: string, sku: Sku, dev: uuid, packageName: string }
 * 200:   { token: <ES256 JWS, payload = Entitlement {sku, source:'play', exp, iat, dev, credits?}>, entitlement }
 * 402:   { error: 'not_purchased' | 'pending' }      409: { error: 'claimed_by_other_device' }
 * Implementation plan: verify with Play Developer API purchases.products.get (report_single) /
 * purchases.subscriptionsv2.get (family_annual) using PLAY_SERVICE_ACCOUNT; insert into `entitlements` with
 * purchase_token_hash = sha256(purchaseToken); acknowledge (and consume report_single via the app's DGA consume()
 * after the token is issued); sign with ENTITLEMENT_PRIVATE_KEY_JWK (see app/entitlement.ts signToken for the exact format).
 */
async function claim(req: Request, env: Env): Promise<Response> {
  const b: any = await req.json().catch(() => null);
  if (!b || typeof b.purchaseToken !== 'string' || !SKUS.includes(b.sku) || !isUuid(b.dev) || b.packageName !== env.PACKAGE_NAME) return json({ error: 'bad_request' }, 400, cors(env));
  return json({ error: 'not_implemented', hint: 'claim waits for the Play Console app and products (CHECKPOINT.md)' }, 501, cors(env));
}
/**
 * POST /v1/entitlement/refresh   body: { dev: uuid, token?: string }
 * 200: { token, entitlement } with a fresh iat (and current credits / subscription expiry); 404 when nothing is active.
 * Called by the PWA when a cached token is older than 7 days and the device is online.
 */
async function refresh(req: Request, env: Env): Promise<Response> {
  const b: any = await req.json().catch(() => null);
  if (!b || !isUuid(b.dev)) return json({ error: 'bad_request' }, 400, cors(env));
  return json({ error: 'not_implemented' }, 501, cors(env));
}
/**
 * POST /v1/rtdn?token=RTDN_TOKEN  (Google Pub/Sub push). Stores the envelope for idempotent processing later;
 * processing (revoke on refund/cancel, extend on renewal) is not implemented yet. Always 200 so Pub/Sub does not retry forever,
 * except for a bad token (403) and a malformed body (400).
 */
async function rtdn(req: Request, env: Env, url: URL): Promise<Response> {
  if (!env.RTDN_TOKEN || url.searchParams.get('token') !== env.RTDN_TOKEN) return json({ error: 'forbidden' }, 403);
  const b: any = await req.json().catch(() => null);
  const msg = b?.message; if (!msg?.messageId || typeof msg.data !== 'string') return json({ error: 'bad_request' }, 400);
  let decoded: any = null; try { decoded = JSON.parse(atob(msg.data)); } catch { decoded = null; }
  const n = decoded?.subscriptionNotification ?? decoded?.oneTimeProductNotification ?? decoded?.voidedPurchaseNotification ?? null;
  const tokenHash = n?.purchaseToken ? await sha256b64u(n.purchaseToken) : null;
  await env.DB.prepare('INSERT OR IGNORE INTO rtdn_events (received_at, message_id, notification_type, purchase_token_hash, raw) VALUES (?, ?, ?, ?, ?)')
    .bind(nowS(), String(msg.messageId), n?.notificationType ?? null, tokenHash, JSON.stringify(decoded ?? { undecodable: true })).run();
  return json({ ok: true });
}

// ---------- push subscriptions (implemented) ----------
/**
 * POST /v1/push/subscribe   body: { subscription: PushSubscriptionJSON, tz, lat, lon, lang, region, topics: string[] }
 * 200: { id }   (upsert by endpoint)
 * DELETE /v1/push/subscribe   body: { endpoint }   200: { ok: true }
 */
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
/**
 * Send one Web Push message (RFC 8291 aes128gcm + RFC 8292 VAPID). NOT IMPLEMENTED: the plan is pure WebCrypto in the
 * Worker (ECDH P-256 + HKDF + AES-GCM for the payload, ES256 JWT for VAPID), e.g. the `@block65/webcrypto-web-push`
 * package or ~120 lines of our own, chosen when VAPID keys exist. Must handle 404/410 by deleting the subscription.
 */
async function sendPush(_env: Env, _sub: SubRow, _payload: PushPayload): Promise<'sent' | 'gone' | 'skipped'> {
  return 'skipped';
}
const localDate = (d: Date, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
const addDays = (iso: string, n: number) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
/** Every 6 hours: for each subscription, festivals due tomorrow (local date) that were not yet sent. */
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
    if (p === '/' || p === '/health') return json({ ok: true, service: 'shubhdate-api', time: nowS() });
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
