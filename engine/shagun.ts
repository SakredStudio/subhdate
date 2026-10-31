// Shagun Register: the private wedding/function gift ledger (lena-dena · vyavhar · chandlo). Pure logic, no DOM, no
// storage: events + gifts in, totals / search / reciprocation / import-export out. Money is never moved; this is a
// family notebook. Storage is app/db.ts (IndexedDB), the screen is app/screens/shagun.ts.

export type ShagunEventType = 'wedding' | 'engagement' | 'baby_shower' | 'griha_pravesh' | 'other';
export type ShagunDirection = 'received' | 'given';
export type Currency = 'CAD' | 'USD' | 'INR' | 'GBP';
export type GiftKind = 'cash' | 'gold' | 'item';
export const EVENT_TYPES: ShagunEventType[] = ['wedding', 'engagement', 'baby_shower', 'griha_pravesh', 'other'];
export const CURRENCIES: Currency[] = ['CAD', 'USD', 'INR', 'GBP'];
export const GIFT_KINDS: GiftKind[] = ['cash', 'gold', 'item'];
export const FREE_EVENTS = 2;
export const FREE_GIFTS = 50;
export const EXPORT_VERSION = 1;

export interface ShagunEvent {
  id: string;
  type: ShagunEventType;
  /** "Riya's wedding" — free text; the host side of the function */
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** default currency for new gifts of this event */
  currency: Currency;
  /** 'received' = our function, gifts came to us (default). 'given' = their function, we gave. */
  direction: ShagunDirection;
  note?: string;
  createdAt: string;
}
export interface ShagunGift {
  id: string;
  eventId: string;
  /** who gave (or, for a 'given' event, who we gave to) */
  giver: string;
  /** family / relation tag: "Mama ji", "Sharma family (Brampton)" */
  family: string;
  amount: number;
  currency: Currency;
  kind: GiftKind;
  note?: string;
  /** optional phone for the thank-you message (digits, with country code); never exported without consent? It is exported: the file is the family's own. */
  phone?: string;
  createdAt: string;
}

export const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

/** Family key: case/space/punctuation-insensitive so "Sharma Family" and "sharma family " match. */
export function familyKey(s: string): string {
  return (s || '').normalize('NFKC').toLowerCase().replace(/[\s\-_.,'’"()]+/g, ' ').trim();
}
/** The family a gift belongs to for reciprocation: the family tag, else the giver name. */
export const giftFamily = (g: ShagunGift) => (g.family && g.family.trim()) || g.giver;

export type Totals = Partial<Record<Currency, number>>;
export function addTotals(a: Totals, b: Totals): Totals {
  const out: Totals = { ...a };
  for (const [c, v] of Object.entries(b)) out[c as Currency] = Math.round(((out[c as Currency] ?? 0) + (v ?? 0)) * 100) / 100;
  return out;
}
/** Sum of cash amounts per currency (gold/items carry an estimated amount too when the user typed one). */
export function totalsByCurrency(gifts: ShagunGift[], kinds: GiftKind[] = GIFT_KINDS): Totals {
  let t: Totals = {};
  for (const g of gifts) if (kinds.includes(g.kind) && Number.isFinite(g.amount) && g.amount > 0) t = addTotals(t, { [g.currency]: g.amount });
  return t;
}
export const CURRENCY_SYMBOL: Record<Currency, string> = { CAD: 'CA$', USD: 'US$', INR: '₹', GBP: '£' };
export function fmtAmount(amount: number, currency: Currency, locale = 'en-IN'): string {
  try { return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : locale, { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount); }
  catch { return `${CURRENCY_SYMBOL[currency]}${amount}`; }
}
export function fmtTotals(t: Totals, locale = 'en-IN'): string {
  const parts = (Object.keys(t) as Currency[]).filter(c => (t[c] ?? 0) > 0).sort().map(c => fmtAmount(t[c]!, c, locale));
  return parts.join(' + ');
}

/** Case-insensitive search over giver, family, note, amount. */
export function searchGifts(gifts: ShagunGift[], q: string): ShagunGift[] {
  const k = familyKey(q); if (!k) return gifts;
  return gifts.filter(g => familyKey(`${g.giver} ${g.family} ${g.note ?? ''} ${g.amount}`).includes(k));
}
export const sortGifts = (gifts: ShagunGift[]) => [...gifts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
export const sortEvents = (events: ShagunEvent[]) => [...events].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

export interface FamilyHistoryLine { gift: ShagunGift; event: ShagunEvent; }
export interface FamilyHistory {
  key: string;
  /** display name: the most recent family tag / giver spelling */
  name: string;
  received: FamilyHistoryLine[];
  given: FamilyHistoryLine[];
  receivedTotals: Totals;
  givenTotals: Totals;
  /** last time they gave us something */
  lastReceived: string | null;
}
/** Group every gift by family across all events (excluding `excludeEventId`, the event being planned). */
export function familyHistories(events: ShagunEvent[], gifts: ShagunGift[], excludeEventId?: string): FamilyHistory[] {
  const byEvent = new Map(events.map(e => [e.id, e]));
  const map = new Map<string, FamilyHistory>();
  for (const g of sortGifts(gifts)) {
    if (g.eventId === excludeEventId) continue;
    const e = byEvent.get(g.eventId); if (!e) continue;
    const key = familyKey(giftFamily(g)); if (!key) continue;
    const h = map.get(key) ?? { key, name: giftFamily(g), received: [], given: [], receivedTotals: {}, givenTotals: {}, lastReceived: null };
    if (!map.has(key)) h.name = giftFamily(g).trim();
    if (e.direction === 'given') { h.given.push({ gift: g, event: e }); h.givenTotals = addTotals(h.givenTotals, totalsByCurrency([g])); }
    else { h.received.push({ gift: g, event: e }); h.receivedTotals = addTotals(h.receivedTotals, totalsByCurrency([g])); if (!h.lastReceived || e.date > h.lastReceived) h.lastReceived = e.date; }
    map.set(key, h);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
/** "To reciprocate" for an upcoming event we are attending or hosting: families who gave to us before, what and when,
 *  minus what we already gave them. Families that have only received from us are listed last (so nobody is forgotten). */
export function reciprocate(events: ShagunEvent[], gifts: ShagunGift[], forEventId: string): FamilyHistory[] {
  const all = familyHistories(events, gifts, forEventId);
  const gave = all.filter(h => h.received.length).sort((a, b) => (b.lastReceived ?? '').localeCompare(a.lastReceived ?? '') || a.name.localeCompare(b.name));
  const onlyGiven = all.filter(h => !h.received.length);
  return [...gave, ...onlyGiven];
}
/** Net per currency: received minus given (positive = we owe a return). */
export function netTotals(h: FamilyHistory): Totals {
  const out: Totals = { ...h.receivedTotals };
  for (const [c, v] of Object.entries(h.givenTotals)) out[c as Currency] = Math.round(((out[c as Currency] ?? 0) - (v ?? 0)) * 100) / 100;
  return out;
}

// ---- limits ----
export function withinFree(events: ShagunEvent[], gifts: ShagunGift[]): { events: boolean; gifts: boolean } {
  return { events: events.length < FREE_EVENTS, gifts: gifts.length < FREE_GIFTS };
}

// ---- export / import (family share) ----
export interface ShagunExport { app: 'shubhdate'; feature: 'shagun'; version: number; exportedAt: string; events: ShagunEvent[]; gifts: ShagunGift[]; }
export function exportJson(events: ShagunEvent[], gifts: ShagunGift[], now = new Date()): ShagunExport {
  return { app: 'shubhdate', feature: 'shagun', version: EXPORT_VERSION, exportedAt: now.toISOString(), events: sortEvents(events), gifts: sortGifts(gifts) };
}
const isStr = (v: unknown, max = 200) => typeof v === 'string' && v.length <= max;
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
export class ImportError extends Error { constructor(public code: 'not_json' | 'not_shagun' | 'bad_version' | 'bad_event' | 'bad_gift') { super(code); } }
/** Validate a pasted/opened JSON; returns clean rows (unknown fields dropped, defaults filled). Throws ImportError. */
export function parseImport(input: string | unknown): { events: ShagunEvent[]; gifts: ShagunGift[] } {
  let j: any = input;
  if (typeof input === 'string') { try { j = JSON.parse(input); } catch { throw new ImportError('not_json'); } }
  if (!j || j.app !== 'shubhdate' || j.feature !== 'shagun' || !Array.isArray(j.events) || !Array.isArray(j.gifts)) throw new ImportError('not_shagun');
  if (typeof j.version !== 'number' || j.version > EXPORT_VERSION) throw new ImportError('bad_version');
  const events: ShagunEvent[] = j.events.map((e: any) => {
    if (!e || !isStr(e.id, 64) || !isStr(e.title, 120) || !isDate(e.date)) throw new ImportError('bad_event');
    return { id: e.id, type: EVENT_TYPES.includes(e.type) ? e.type : 'other', title: e.title, date: e.date, currency: CURRENCIES.includes(e.currency) ? e.currency : 'INR', direction: e.direction === 'given' ? 'given' : 'received', ...(isStr(e.note, 500) && e.note ? { note: e.note } : {}), createdAt: isStr(e.createdAt, 40) ? e.createdAt : new Date().toISOString() } as ShagunEvent;
  });
  const ids = new Set(events.map(e => e.id));
  const gifts: ShagunGift[] = j.gifts.map((g: any) => {
    if (!g || !isStr(g.id, 64) || !isStr(g.eventId, 64) || !ids.has(g.eventId) || !isStr(g.giver, 120) || typeof g.amount !== 'number' || !Number.isFinite(g.amount) || g.amount < 0) throw new ImportError('bad_gift');
    return { id: g.id, eventId: g.eventId, giver: g.giver, family: isStr(g.family, 120) ? g.family : '', amount: g.amount, currency: CURRENCIES.includes(g.currency) ? g.currency : 'INR', kind: GIFT_KINDS.includes(g.kind) ? g.kind : 'cash', ...(isStr(g.note, 500) && g.note ? { note: g.note } : {}), ...(isStr(g.phone, 32) && g.phone ? { phone: g.phone } : {}), createdAt: isStr(g.createdAt, 40) ? g.createdAt : new Date().toISOString() } as ShagunGift;
  });
  return { events, gifts };
}
/** Merge an import into the existing register by id (the newer createdAt/last-write wins only for new ids; existing rows are kept). */
export function mergeImport(existing: { events: ShagunEvent[]; gifts: ShagunGift[] }, incoming: { events: ShagunEvent[]; gifts: ShagunGift[] }, overwrite = false): { events: ShagunEvent[]; gifts: ShagunGift[]; added: number; updated: number } {
  const ev = new Map(existing.events.map(e => [e.id, e])), gi = new Map(existing.gifts.map(g => [g.id, g]));
  let added = 0, updated = 0;
  for (const e of incoming.events) { if (!ev.has(e.id)) { ev.set(e.id, e); added++; } else if (overwrite) { ev.set(e.id, e); updated++; } }
  for (const g of incoming.gifts) { if (!gi.has(g.id)) { gi.set(g.id, g); added++; } else if (overwrite) { gi.set(g.id, g); updated++; } }
  return { events: [...ev.values()], gifts: [...gi.values()], added, updated };
}

// ---- thank-you message ----
export function thankYouText(gift: ShagunGift, event: ShagunEvent, lang: string, host = ''): string {
  const amt = gift.kind === 'cash' ? fmtAmount(gift.amount, gift.currency) : gift.kind === 'gold' ? (lang === 'hi' ? 'सोने का उपहार' : lang === 'gu' ? 'સોનાની ભેટ' : 'the gold gift') : (lang === 'hi' ? 'आपका उपहार' : lang === 'gu' ? 'તમારી ભેટ' : 'your gift');
  const who = gift.giver.trim(), ev = event.title.trim(), from = host ? ` — ${host}` : '';
  const lines: Record<string, string> = {
    en: `Dear ${who}, thank you so much for ${amt} and your blessings at ${ev}. Your presence and love meant a lot to our family. 🙏${from}\n\n— sent via ShubhDate`,
    hinglish: `${who} ji, ${ev} par ${amt} aur aapke aashirwad ke liye dil se dhanyavaad. Aapka aana hamare liye bahut maayne rakhta hai. 🙏${from}\n\n— sent via ShubhDate`,
    hi: `${who} जी, ${ev} पर ${amt} और आपके आशीर्वाद के लिए हृदय से धन्यवाद। आपका आना हमारे परिवार के लिए बहुत मायने रखता है। 🙏${from}\n\n— via ShubhDate`,
    gu: `${who}, ${ev} માં ${amt} અને તમારા આશીર્વાદ માટે હૃદયપૂર્વક આભાર. તમારી હાજરી અમારા પરિવાર માટે ઘણી મહત્ત્વની હતી. 🙏${from}\n\n— via ShubhDate`,
  };
  return lines[lang] ?? lines.en;
}
export const waLink = (text: string, phone?: string) => `https://wa.me/${phone ? phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(text)}`;

// ---- register rows for PDF / print: running numbers + per-currency totals per event ----
export interface RegisterRow { n: number; giver: string; family: string; kind: GiftKind; amount: number; currency: Currency; note: string; }
export function registerRows(gifts: ShagunGift[]): { rows: RegisterRow[]; totals: Totals; cash: Totals; count: number } {
  const rows = sortGifts(gifts).map((g, i) => ({ n: i + 1, giver: g.giver, family: g.family, kind: g.kind, amount: g.amount, currency: g.currency, note: g.note ?? '' }));
  return { rows, totals: totalsByCurrency(gifts), cash: totalsByCurrency(gifts, ['cash']), count: gifts.length };
}
