// Web Push reminders (festivals, ekadashi, saved muhurta). Server-sent because the Notification Triggers API never
// shipped. Active only when VAPID_PUBLIC_KEY and WORKER_URL are real (both placeholders hide the Settings toggle).
// What leaves the device when the user turns it on: the push endpoint + keys, home-city coordinates and tz, language,
// region and topics. Never birth data. Turning it off deletes the subscription on the server.
import { VAPID_PUBLIC_KEY, WORKER_URL, IS_PLACEHOLDER } from './config.ts';

export type Topic = 'festivals' | 'ekadashi' | 'saved';
export interface PushPlace { lat: number; lon: number; tz: string; }
export const pushAvailable = () => !IS_PLACEHOLDER(VAPID_PUBLIC_KEY) && !IS_PLACEHOLDER(WORKER_URL) && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function b64uToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (s.length % 4)) % 4); const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
}
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushAvailable()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}
/** Must be called from a user gesture (Android 13+ and iOS require it). Returns false when permission is denied. */
export async function enableReminders(place: PushPlace, lang: string, region: string, topics: Topic[]): Promise<boolean> {
  if (!pushAvailable()) return false;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(VAPID_PUBLIC_KEY!) }));
  const res = await fetch(`${WORKER_URL}/v1/push/subscribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), tz: place.tz, lat: place.lat, lon: place.lon, lang, region, topics }) });
  if (!res.ok) { await sub.unsubscribe().catch(() => null); return false; }
  localStorage.setItem('shubhdate.reminders', '1');
  return true;
}
export async function disableReminders(): Promise<void> {
  localStorage.removeItem('shubhdate.reminders');
  const sub = await currentSubscription().catch(() => null);
  if (!sub) return;
  await fetch(`${WORKER_URL}/v1/push/subscribe`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => null);
  await sub.unsubscribe().catch(() => null);
}
export const remindersOn = () => localStorage.getItem('shubhdate.reminders') === '1';
