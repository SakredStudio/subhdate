// Website purchases, app side: the return link from Stripe, and tokens issued for a website purchase.
import { describe, it, expect } from 'vitest';
import { takePaidSession } from '../../app/webpay.ts';
import { signToken, verifyToken, type Entitlement } from '../../app/entitlement.ts';

const page = (search: string, hash = '#/report') => {
  const calls: string[] = [];
  return { loc: { search, hash, pathname: '/' } as Location, hist: { replaceState: (_s: unknown, _t: string, url: string) => { calls.push(url); } } as unknown as History, calls };
};

describe("Stripe's return link", () => {
  it('takes the session id and cleans the address bar, keeping the screen', () => {
    const p = page('?paid=cs_test_a1B2c3D4e5F6');
    expect(takePaidSession(p.loc, p.hist)).toBe('cs_test_a1B2c3D4e5F6');
    expect(p.calls).toEqual(['/#/report']);
  });
  it('keeps other parameters', () => {
    const p = page('?utm_source=x&paid=cs_live_a1B2c3D4e5F6', '#/naam');
    expect(takePaidSession(p.loc, p.hist)).toBe('cs_live_a1B2c3D4e5F6');
    expect(p.calls).toEqual(['/?utm_source=x#/naam']);
  });
  it('a normal visit is left alone', () => { const p = page(''); expect(takePaidSession(p.loc, p.hist)).toBeNull(); expect(p.calls).toEqual([]); });
  it('something that is not a session id is dropped, and still cleaned from the address bar', () => {
    const p = page('?paid=%3Cscript%3E');
    expect(takePaidSession(p.loc, p.hist)).toBeNull();
    expect(p.calls).toEqual(['/#/report']);
  });
});

describe('tokens for website purchases', () => {
  it('a Stripe-sourced token verifies; an unknown source does not', async () => {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
    const pub = await crypto.subtle.exportKey('jwk', pair.publicKey), priv = await crypto.subtle.exportKey('jwk', pair.privateKey);
    const base: Entitlement = { sku: 'report_single', source: 'stripe', exp: 4102444800, iat: 1_760_000_000, dev: 'd', credits: 1 };
    expect(await verifyToken(await signToken(base, priv), pub)).toMatchObject({ source: 'stripe', credits: 1 });
    expect(await verifyToken(await signToken({ ...base, source: 'play' }, priv), pub)).toMatchObject({ source: 'play' });
    expect(await verifyToken(await signToken({ ...base, source: 'gift' as any }, priv), pub)).toBeNull();
  });
});
