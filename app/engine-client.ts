// Promise RPC to the engine worker, with an in-memory + IndexedDB cache for day payloads.
import { db } from './db.ts';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();
function w(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => { const { id, ok, result, error } = e.data; const p = pending.get(id); if (!p) return; pending.delete(id); ok ? p.resolve(result) : p.reject(new Error(error)); };
  worker.onerror = (e) => { for (const p of pending.values()) p.reject(e); pending.clear(); };
  return worker;
}
export function call<T = any>(op: string, args: any): Promise<T> {
  const id = ++seq;
  return new Promise<T>((resolve, reject) => { pending.set(id, { resolve, reject }); w().postMessage({ id, op, args }); });
}
const mem = new Map<string, any>();
export async function dayCached(date: string, place: any, opts: any, lang: string, birth?: any) {
  const key = `day|${date}|${place.lat.toFixed(3)}|${place.lon.toFixed(3)}|${place.tz}|${opts.sunrise}|${opts.region}|${lang}|${birth ? birth.date + (birth.time ?? '') : ''}|v1`;
  if (mem.has(key)) return mem.get(key);
  const hit = await db.cacheGet(key);
  if (hit) { mem.set(key, hit); return hit; }
  const r = await call('day', { date, place, opts, lang, birth });
  mem.set(key, r); db.cacheSet(key, r);
  return r;
}

/** Called on every navigation: if the previous screen still has calculations queued (festivals, muhurta, report…),
 *  stop the worker so the new screen does not wait behind them. Their promises reject with name 'Abandoned'. */
export function abandonPending(): void {
  if (!worker || pending.size === 0) return;
  worker.terminate(); worker = null;
  const err = Object.assign(new Error('abandoned'), { name: 'Abandoned' });
  for (const p of pending.values()) p.reject(err);
  pending.clear();
}
