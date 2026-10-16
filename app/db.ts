// IndexedDB (no dependency). Stores: saved muhurta windows, cached engine results. Birth details and
// settings live in localStorage. Nothing here ever leaves the device.
const DB_NAME = 'shubhdate', DB_VER = 1;
let dbp: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('saved')) db.createObjectStore('saved', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'key' });
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
export const db = {
  async listSaved(): Promise<SavedItem[]> { try { const all = await tx<SavedItem[]>('saved', 'readonly', s => s.getAll()); return all.sort((a, b) => a.date.localeCompare(b.date)); } catch { return []; } },
  async save(item: SavedItem) { return tx('saved', 'readwrite', s => s.put(item)); },
  async remove(id: string) { return tx('saved', 'readwrite', s => s.delete(id)); },
  async cacheGet<T>(key: string): Promise<T | undefined> { try { const r = await tx<{ key: string; value: T; at: number } | undefined>('cache', 'readonly', s => s.get(key)); return r?.value; } catch { return undefined; } },
  async cacheSet<T>(key: string, value: T) { try { await tx('cache', 'readwrite', s => s.put({ key, value, at: Date.now() })); } catch { /* ignore */ } },
};
