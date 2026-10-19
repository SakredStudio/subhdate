// Deployment configuration. Every value here is either real or a placeholder that the UI hides.
// Soul fills these in after the Cloudflare Worker, VAPID keys and Play listing exist (see CHECKPOINT.md §"Steps only Soul can do").

/** Google Form link for the "notify me" waitlist. Placeholder hides the button. */
export const WAITLIST_URL = 'https://forms.gle/REPLACE_WITH_SOUL_FORM';
/** Cloudflare Worker base URL (entitlements, push subscriptions). Placeholder disables every network feature. */
export const WORKER_URL = 'https://shubhdate-api.mihir86-mp.workers.dev';
/** ES256 public key (JWK) that verifies entitlement tokens signed by the Worker. null until the key pair exists. */
export const ENTITLEMENT_PUBLIC_KEY_JWK: JsonWebKey | null = {"kty":"EC","crv":"P-256","x":"n_OigbjYV-Y1l1OoZZjrK_8zpQAChAHX-Pcln182Luk","y":"awVK58sDQAmqkfd8aPb0H6YA7Wr2ew4r06wdfXw8x_U"};
/** VAPID public key (base64url) for Web Push. null until `wrangler secret put VAPID_PUBLIC_KEY` has a pair. */
export const VAPID_PUBLIC_KEY: string | null = 'BKQQVoYuzGqaFTJJiVUVnOaLybeYTRJoGVp48zd6o48TQ7OSNTy4OPewp6Y3JDH1LySrAapxRwAaoryPghjr4bU';
/** Play Store listing URL. Placeholder until the app is published; the web never links to a paywall anyway. */
export const PLAY_LISTING_URL = 'https://play.google.com/store/apps/details?id=com.sakredstudio.shubhdate';

/** True when a config value is still a placeholder (null, empty, or contains REPLACE / <pending> / PENDING). */
export function IS_PLACEHOLDER(x: string | null | undefined | object): boolean {
  if (x == null) return true;
  if (typeof x !== 'string') return false;
  return x.trim() === '' || /REPLACE|<pending>|PENDING/i.test(x);
}
