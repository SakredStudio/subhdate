// Entitlements: a signed token (ES256 JWS, compact form) issued by the Cloudflare Worker after a Play purchase is
// verified. The PWA verifies it locally with the Worker's public key, caches it in IndexedDB, honours it offline for
// 7 days past `iat`, then re-fetches when online. Nothing here talks to Google; the purchase flow is in billing.ts.
// Privacy: the device id is a random UUID that is sent only with a purchase claim; never a name or email.
import { ENTITLEMENT_PUBLIC_KEY_JWK, IS_PLACEHOLDER } from './config.ts';

export type Sku = 'report_single' | 'family_annual' | 'naam_report';
export const CONSUMABLE_SKUS: Sku[] = ['report_single', 'naam_report'];
export interface Entitlement {
  sku: Sku;
  source: 'play';
  /** unix seconds; family_annual = subscription expiry, report_single = far future (consumed via credits) */
  exp: number;
  /** unix seconds the Worker signed it */
  iat: number;
  /** device id the token was issued to */
  dev: string;
  /** remaining muhurta-report credits (report_single) */
  credits?: number;
  /** remaining Namakarana-report credits (naam_report) */
  naam?: number;
}
export const OFFLINE_GRACE_SECONDS = 7 * 86400;

const DEV_KEY = 'shubhdate.deviceId';
/** Anonymous device id, created on first use. Leaves the device only inside a purchase claim. */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEV_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEV_KEY, id); }
  return id;
}

// ---- base64url + JWS (ES256) ----
const b64u = {
  decode(s: string): Uint8Array<ArrayBuffer> { const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : ''; const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; },
  encode(b: Uint8Array): string { let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
};
const utf8 = new TextEncoder();
export function decodePayload(jws: string): Entitlement | null {
  try { const [, p] = jws.split('.'); return JSON.parse(new TextDecoder().decode(b64u.decode(p))); } catch { return null; }
}
/** Verify a compact ES256 JWS against a public JWK. Returns the payload, or null when invalid/unsigned/mismatched. */
export async function verifyToken(jws: string, jwk: JsonWebKey | null = ENTITLEMENT_PUBLIC_KEY_JWK, subtle: SubtleCrypto = crypto.subtle): Promise<Entitlement | null> {
  if (!jwk || typeof jws !== 'string') return null;
  const parts = jws.split('.'); if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64u.decode(parts[0])));
    if (header.alg !== 'ES256') return null;
    const key = await subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64u.decode(parts[2]), utf8.encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    const p = decodePayload(jws);
    if (!p || !['report_single', 'family_annual', 'naam_report'].includes(p.sku) || p.source !== 'play' || typeof p.exp !== 'number' || typeof p.iat !== 'number' || typeof p.dev !== 'string') return null;
    return p;
  } catch { return null; }
}
/** Sign a payload (test helper and the Worker's reference implementation; the PWA never has a private key). */
export async function signToken(payload: Entitlement, privateJwk: JsonWebKey, subtle: SubtleCrypto = crypto.subtle): Promise<string> {
  const h = b64u.encode(utf8.encode(JSON.stringify({ alg: 'ES256', typ: 'JWT' })));
  const p = b64u.encode(utf8.encode(JSON.stringify(payload)));
  const key = await subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8.encode(`${h}.${p}`)));
  return `${h}.${p}.${b64u.encode(sig)}`;
}

// ---- cache (IndexedDB via app/db.ts in the browser; an in-memory store in tests/Node) ----
export interface EntitlementStore { get(key: string): Promise<any>; set(key: string, value: any): Promise<void>; }
let store: EntitlementStore | null = null;
const mem = new Map<string, any>();
export function useStore(s: EntitlementStore | null) { store = s; }
const S = (): EntitlementStore => store ?? { async get(k) { return mem.get(k); }, async set(k, v) { mem.set(k, v); } };
const CACHE_KEY = 'entitlement|v1';
const CONSUMED_KEY = 'entitlement|consumed|v1';
export interface CachedEntitlement { jws: string; payload: Entitlement; cachedAt: number; }
export async function cacheEntitlement(jws: string, payload: Entitlement): Promise<void> { await S().set(CACHE_KEY, { jws, payload, cachedAt: Date.now() } as CachedEntitlement); }
export async function clearEntitlement(): Promise<void> { await S().set(CACHE_KEY, null); await S().set(CONSUMED_KEY, null); }
/** The cached entitlement if it is still honoured: signature valid, not expired, and within 7 days of `iat` (or online for a refresh). */
export async function loadEntitlement(now = Date.now(), jwk: JsonWebKey | null = ENTITLEMENT_PUBLIC_KEY_JWK): Promise<{ entitlement: Entitlement; stale: boolean } | null> {
  const c = (await S().get(CACHE_KEY)) as CachedEntitlement | null | undefined;
  if (!c?.jws) return null;
  const p = await verifyToken(c.jws, jwk);
  if (!p) return null;
  const nowS = Math.floor(now / 1000);
  if (p.exp <= nowS) return null;
  const stale = nowS - p.iat > OFFLINE_GRACE_SECONDS;
  return { entitlement: p, stale };
}
/** True when the device may render the full report of the given kind. A stale token still counts (offline grace); the caller refreshes when online.
 *  The family plan unlocks every report; consumable credits are counted per kind minus the reports already consumed locally. */
export async function isEntitled(sku: Sku | Sku[], now = Date.now(), jwk: JsonWebKey | null = ENTITLEMENT_PUBLIC_KEY_JWK): Promise<boolean> {
  if (IS_PLACEHOLDER(jwk as any) && jwk == null) return false;
  const r = await loadEntitlement(now, jwk);
  if (!r) return false;
  const want = Array.isArray(sku) ? sku : [sku];
  const e = r.entitlement;
  if (e.sku === 'family_annual') return true;
  const consumed: string[] = (await S().get(CONSUMED_KEY)) ?? [];
  for (const w of want) if (w !== 'family_annual' && creditsLeft(e, w, consumed) > 0) return true;
  return false;
}
function creditsLeft(e: Entitlement, kind: Sku, consumed: string[]): number {
  const total = kind === 'naam_report' ? (e.naam ?? 0) : kind === 'report_single' ? (e.credits ?? 0) : 0;
  const used = consumed.filter(k => (kind === 'naam_report') === k.startsWith('naam|')).length;
  return total - used;
}
/** Consume one credit of the given kind when its full report is first rendered. Family plan is unlimited (no-op).
 *  Local bookkeeping only; the Worker's refresh endpoint is the source of truth. Namakarana keys start with 'naam|'. */
export async function consumeReport(reportKey: string, now = Date.now(), jwk: JsonWebKey | null = ENTITLEMENT_PUBLIC_KEY_JWK): Promise<boolean> {
  const r = await loadEntitlement(now, jwk); if (!r) return false;
  if (r.entitlement.sku === 'family_annual') return true;
  const consumed: string[] = (await S().get(CONSUMED_KEY)) ?? [];
  if (consumed.includes(reportKey)) return true; // already paid for this exact report
  const kind: Sku = reportKey.startsWith('naam|') ? 'naam_report' : 'report_single';
  if (creditsLeft(r.entitlement, kind, consumed) <= 0) return false;
  await S().set(CONSUMED_KEY, [...consumed, reportKey]);
  return true;
}
