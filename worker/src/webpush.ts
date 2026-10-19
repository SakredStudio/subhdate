// Web Push from a Worker with WebCrypto only: RFC 8291 (aes128gcm message encryption) + RFC 8292 (VAPID).
import { b64u, signES256 } from './jws.ts';

export interface PushSub { endpoint: string; p256dh: string; auth: string; }
export interface VapidKeys { publicKey: string; privateKey: string; subject: string; }

const te = new TextEncoder();
const concat = (...parts: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> => { const n = parts.reduce((a, p) => a + p.length, 0); const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

/** VAPID JWT for the push service origin. The private key is the base64url `d` of the P-256 key; the public key is the 65-byte raw point. */
export async function vapidHeaders(endpoint: string, keys: VapidKeys): Promise<Record<string, string>> {
  const pub = b64u.decode(keys.publicKey);
  const jwk: JsonWebKey = { kty: 'EC', crv: 'P-256', d: keys.privateKey, x: b64u.encode(pub.slice(1, 33)), y: b64u.encode(pub.slice(33, 65)) };
  const aud = new URL(endpoint).origin;
  const jwt = await signES256({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: keys.subject }, jwk);
  return { authorization: `vapid t=${jwt}, k=${keys.publicKey}` };
}

/** Encrypt `plaintext` for the subscription per RFC 8291 (aes128gcm). Returns the body to POST. */
export async function encrypt(sub: PushSub, plaintext: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const uaPub = b64u.decode(sub.p256dh);           // 65 bytes
  const authSecret = b64u.decode(sub.auth);        // 16 bytes
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const asKey = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', asKey.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKey.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, concat(te.encode('WebPush: info\0'), uaPub, asPub), 32);
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const padded = concat(plaintext, new Uint8Array([2]));   // 0x02 = last record delimiter, no padding
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, padded));
  const rs = 4096;
  const header = concat(salt, new Uint8Array([(rs >>> 24) & 255, (rs >>> 16) & 255, (rs >>> 8) & 255, rs & 255]), new Uint8Array([asPub.length]), asPub);
  return concat(header, cipher);
}

/** POST one push message. 'gone' when the push service says the subscription no longer exists (404/410). */
export async function sendWebPush(sub: PushSub, payload: object, keys: VapidKeys, ttlSeconds = 86400): Promise<'sent' | 'gone' | 'failed'> {
  const body = await encrypt(sub, te.encode(JSON.stringify(payload)));
  const headers = { ...(await vapidHeaders(sub.endpoint, keys)), 'content-type': 'application/octet-stream', 'content-encoding': 'aes128gcm', ttl: String(ttlSeconds), urgency: 'normal' };
  const res = await fetch(sub.endpoint, { method: 'POST', headers, body });
  if (res.status === 201 || res.status === 200) return 'sent';
  if (res.status === 404 || res.status === 410) return 'gone';
  return 'failed';
}
