// Prints a fresh ES256 key pair (entitlement signing) and a VAPID key pair (Web Push). Run once on Soul's PC:
//   node tools/dev/gen-keys.mjs
// Private halves -> `wrangler secret put` (docs/WORKER.md); public halves -> app/config.ts. Nothing is written to disk.
import { webcrypto } from 'node:crypto';
const { subtle } = webcrypto;
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const es = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const esPriv = await subtle.exportKey('jwk', es.privateKey), esPub = await subtle.exportKey('jwk', es.publicKey);
const vapid = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const vPriv = await subtle.exportKey('jwk', vapid.privateKey);
const vPubRaw = await subtle.exportKey('raw', vapid.publicKey);
console.log('=== ENTITLEMENT_PRIVATE_KEY_JWK (wrangler secret put ENTITLEMENT_PRIVATE_KEY_JWK) ===');
console.log(JSON.stringify(esPriv));
console.log('=== ENTITLEMENT_PUBLIC_KEY_JWK (paste into app/config.ts) ===');
console.log(JSON.stringify({ kty: esPub.kty, crv: esPub.crv, x: esPub.x, y: esPub.y }));
console.log('=== VAPID_PRIVATE_KEY (wrangler secret put VAPID_PRIVATE_KEY) ===');
console.log(vPriv.d);
console.log('=== VAPID_PUBLIC_KEY (wrangler secret put VAPID_PUBLIC_KEY AND app/config.ts) ===');
console.log(b64u(vPubRaw));
