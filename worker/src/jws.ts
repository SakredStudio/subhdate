// Small JOSE helpers for the Worker: base64url, ES256 (entitlement tokens, VAPID) and RS256 (Google service-account JWT).
export const b64u = {
  encode(bytes: ArrayBuffer | Uint8Array): string {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let s = ''; for (const x of b) s += String.fromCharCode(x);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decode(s: string): Uint8Array<ArrayBuffer> {
    const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : '';
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
  json(obj: unknown): string { return b64u.encode(new TextEncoder().encode(JSON.stringify(obj))); },
};

/** Compact JWS with ES256 (P-256 / SHA-256). `privateJwk` is a JWK with d, x, y. */
export async function signES256(payload: object, privateJwk: JsonWebKey, header: Record<string, unknown> = {}): Promise<string> {
  const h = b64u.json({ alg: 'ES256', typ: 'JWT', ...header });
  const p = b64u.json(payload);
  const key = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64u.encode(sig)}`;
}

/** Compact JWS with RS256 from a PKCS#8 PEM private key (Google service-account `private_key`). */
export async function signRS256(payload: object, pkcs8Pem: string, header: Record<string, unknown> = {}): Promise<string> {
  const der = b64u.decode(pkcs8Pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, '').replace(/\+/g, '-').replace(/\//g, '_'));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const h = b64u.json({ alg: 'RS256', typ: 'JWT', ...header });
  const p = b64u.json(payload);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64u.encode(sig)}`;
}

export async function sha256b64u(s: string): Promise<string> {
  return b64u.encode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}
