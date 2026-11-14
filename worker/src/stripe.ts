// Minimal Stripe client for the Worker (the same approach as Sakred Graha's): Checkout Sessions via fetch
// (form-encoded), webhook signature check via WebCrypto. No SDK, so tests can stub `fetch` and sign their own
// payloads with `signPayload`. The secret key needs only "Checkout Sessions: write" (a restricted key is enough).

export interface StripeEnv { STRIPE_SECRET_KEY?: string; STRIPE_WEBHOOK_SECRET?: string; }

function form(obj: Record<string, any>, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => out.push(...(typeof x === 'object' ? form(x, `${key}[${i}]`) : [`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(x))}`])));
    else if (typeof v === 'object') out.push(...form(v, key));
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}
export const toForm = (obj: Record<string, any>) => form(obj).join('&');

export interface CheckoutInput {
  priceId: string; clientRef: string; successUrl: string; cancelUrl: string;
  metadata: Record<string, string>; description: string; idempotencyKey: string;
}
/** Create a one-time-payment Checkout Session. No customer details are sent: Stripe collects what it needs itself. */
export async function createCheckoutSession(env: StripeEnv, inp: CheckoutInput, fetchFn: typeof fetch = fetch): Promise<{ id: string; url: string }> {
  if (!env.STRIPE_SECRET_KEY) throw new Error('stripe_not_configured');
  const body = toForm({
    mode: 'payment',
    line_items: [{ price: inp.priceId, quantity: 1 }],
    success_url: inp.successUrl, cancel_url: inp.cancelUrl,
    client_reference_id: inp.clientRef,
    metadata: inp.metadata,
    payment_intent_data: { description: inp.description, metadata: inp.metadata },
    allow_promotion_codes: 'true',
  });
  const r = await fetchFn('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST', body,
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded', 'idempotency-key': inp.idempotencyKey },
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) throw new Error(`stripe_error: ${j?.error?.message ?? r.status}`);
  return { id: j.id, url: j.url };
}
/** Read a Checkout Session back. null when Stripe does not know the id; throws when Stripe cannot be reached. */
export async function getCheckoutSession(env: StripeEnv, id: string, fetchFn: typeof fetch = fetch): Promise<any | null> {
  if (!env.STRIPE_SECRET_KEY) throw new Error('stripe_not_configured');
  const r = await fetchFn(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  if (r.status === 404) return null;
  const j: any = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error(`stripe_error: ${j?.error?.message ?? r.status}`);
  return j;
}

const enc = new TextEncoder();
async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
/** Build a Stripe-Signature header (tests). */
export async function signPayload(secret: string, payload: string, t = Math.floor(Date.now() / 1000)): Promise<string> {
  return `t=${t},v1=${await hmacHex(secret, `${t}.${payload}`)}`;
}
/** Verify a Stripe webhook signature (v1 scheme, 5-minute tolerance). Returns the parsed event or null. */
export async function verifyWebhook(secret: string, payload: string, header: string | null, now = Math.floor(Date.now() / 1000)): Promise<any | null> {
  if (!header) return null;
  const parts = Object.fromEntries(header.split(',').map(p => p.trim().split('=')).filter(x => x.length === 2));
  const t = Number(parts.t); const v1s = header.split(',').map(p => p.trim()).filter(p => p.startsWith('v1=')).map(p => p.slice(3));
  if (!Number.isFinite(t) || !v1s.length || Math.abs(now - t) > 300) return null;
  const expected = await hmacHex(secret, `${t}.${payload}`);
  const ok = v1s.some(v => v.length === expected.length && timingSafeEq(v, expected));
  if (!ok) return null;
  try { return JSON.parse(payload); } catch { return null; }
}
function timingSafeEq(a: string, b: string): boolean { let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
