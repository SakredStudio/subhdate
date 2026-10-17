import { describe, it, expect, beforeAll } from 'vitest';
import { webcrypto } from 'node:crypto';
import { signToken, verifyToken, cacheEntitlement, loadEntitlement, isEntitled, consumeReport, clearEntitlement, OFFLINE_GRACE_SECONDS, type Entitlement } from '../../app/entitlement.ts';

const subtle = webcrypto.subtle as unknown as SubtleCrypto;
let pub: JsonWebKey, priv: JsonWebKey, otherPub: JsonWebKey;
const now = 1_800_000_000_000; // 2027-01-15
const nowS = Math.floor(now / 1000);
const mk = (over: Partial<Entitlement> = {}): Entitlement => ({ sku: 'family_annual', source: 'play', exp: nowS + 365 * 86400, iat: nowS - 60, dev: 'dev-1', ...over });

beforeAll(async () => {
  const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  pub = await subtle.exportKey('jwk', kp.publicKey); priv = await subtle.exportKey('jwk', kp.privateKey);
  const kp2 = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  otherPub = await subtle.exportKey('jwk', kp2.publicKey);
  (globalThis as any).crypto ??= webcrypto;
  (globalThis as any).localStorage ??= { _m: new Map<string, string>(), getItem(k: string) { return this._m.get(k) ?? null; }, setItem(k: string, v: string) { this._m.set(k, String(v)); } };
});

describe('entitlement tokens (ES256)', () => {
  it('signs and verifies; rejects a wrong key, a tampered payload and a malformed token', async () => {
    const e = mk();
    const jws = await signToken(e, priv, subtle);
    expect(jws.split('.').length).toBe(3);
    expect(await verifyToken(jws, pub, subtle)).toEqual(e);
    expect(await verifyToken(jws, otherPub, subtle)).toBeNull();
    const [h, p, s] = jws.split('.');
    const tampered = Buffer.from(JSON.stringify({ ...e, sku: 'report_single', credits: 99 })).toString('base64url');
    expect(await verifyToken(`${h}.${tampered}.${s}`, pub, subtle)).toBeNull();
    expect(await verifyToken('nope', pub, subtle)).toBeNull();
    expect(await verifyToken(jws, null, subtle)).toBeNull();
  });
  it('cache honours a token for 7 days past iat offline, flags it stale after, and drops it when expired', async () => {
    const e = mk(); const jws = await signToken(e, priv, subtle);
    await cacheEntitlement(jws, e);
    const fresh = await loadEntitlement(now, pub); expect(fresh?.stale).toBe(false);
    const later = await loadEntitlement(now + (OFFLINE_GRACE_SECONDS + 3600) * 1000, pub); expect(later?.stale).toBe(true);
    expect(await isEntitled('report_single', now, pub)).toBe(true); // family plan covers reports
    expect(await isEntitled('family_annual', now, pub)).toBe(true);
    expect(await loadEntitlement(e.exp * 1000 + 1000, pub)).toBeNull();
    await clearEntitlement(); expect(await isEntitled('family_annual', now, pub)).toBe(false);
  });
  it('single report: one credit, consumed on first full render, same report stays unlocked', async () => {
    const e = mk({ sku: 'report_single', credits: 1 }); const jws = await signToken(e, priv, subtle);
    await cacheEntitlement(jws, e);
    expect(await isEntitled('report_single', now, pub)).toBe(true);
    expect(await isEntitled('family_annual', now, pub)).toBe(false);
    expect(await consumeReport('vivaha|delhi|2026-11-21', now, pub)).toBe(true);
    expect(await consumeReport('vivaha|delhi|2026-11-21', now, pub)).toBe(true);
    expect(await consumeReport('griha|mumbai|2027-01-01', now, pub)).toBe(false);
    expect(await isEntitled('report_single', now, pub)).toBe(false);
    await clearEntitlement();
  });
});
