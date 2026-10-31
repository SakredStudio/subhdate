// IndexedDB (no dependency). Stores: saved muhurta windows, cached engine results. Birth details and
// settings live in localStorage. Nothing here ever leaves the device.
const DB_NAME = 'shubhdate', DB_VER = 2; // v2: shagun_events + shagun_gifts (Shagun Register)
let dbp: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('saved')) db.createObjectStore('saved', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('shagun_events')) db.createObjectStore('shagun_events', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('shagun_gifts')) db.createObjectStore('shagun_gifts', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}
function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | IDBRequest): Promise<T> {
  return open().then(db => new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode); const r = fn(t.objectStore(store));
    r.onsuccess = () => resolve(r.result as T); r.onerror = () => reject(r.error);
  }));
}
export interface SavedItem {
  id: string; event: string; eventName: string; date: string; start: string; end: string; score: number;
  place: { name: string; lat: number; lon: number; tz: string }; reasons: string[]; createdAt: string; lang: string;
}
import type { ShagunEvent, ShagunGift } from '../engine/shagun.ts';
export const db = {
  async listSaved(): Promise<SavedItem[]> { try { const all = await tx<SavedItem[]>('saved', 'readonly', s => s.getAll()); return all.sort((a, b) => a.date.localeCompare(b.date)); } catch { return []; } },
  async save(item: SavedItem) { return tx('saved', 'readwrite', s => s.put(item)); },
  async remove(id: string) { return tx('saved', 'readwrite', s => s.delete(id)); },
  async cacheGet<T>(key: string): Promise<T | undefined> { try { const r = await tx<{ key: string; value: T; at: number } | undefined>('cache', 'readonly', s => s.get(key)); return r?.value; } catch { return undefined; } },
  async cacheSet<T>(key: string, value: T) { try { await tx('cache', 'readwrite', s => s.put({ key, value, at: Date.now() })); } catch { /* ignore */ } },
  // ---- Shagun Register (private gift ledger; never leaves the device except by the user's own export) ----
  async shagunEvents(): Promise<ShagunEvent[]> { try { return await tx<ShagunEvent[]>('shagun_events', 'readonly', s => s.getAll()); } catch { return []; } },
  async shagunGifts(): Promise<ShagunGift[]> { try { return await tx<ShagunGift[]>('shagun_gifts', 'readonly', s => s.getAll()); } catch { return []; } },
  async shagunPutEvent(e: ShagunEvent) { return tx('shagun_events', 'readwrite', s => s.put(e)); },
  async shagunPutGift(g: ShagunGift) { return tx('shagun_gifts', 'readwrite', s => s.put(g)); },
  async shagunRemoveGift(id: string) { return tx('shagun_gifts', 'readwrite', s => s.delete(id)); },
  /** Removes the event and every gift recorded under it. */
  async shagunRemoveEvent(id: string) { const gifts = await this.shagunGifts(); for (const g of gifts) if (g.eventId === id) await this.shagunRemoveGift(g.id); return tx('shagun_events', 'readwrite', s => s.delete(id)); },
  async shagunReplaceAll(events: ShagunEvent[], gifts: ShagunGift[]) { await tx('shagun_events', 'readwrite', s => s.clear()); await tx('shagun_gifts', 'readwrite', s => s.clear()); for (const e of events) await this.shagunPutEvent(e); for (const g of gifts) await this.shagunPutGift(g); },
};
