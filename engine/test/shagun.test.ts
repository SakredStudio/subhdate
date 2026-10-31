import { describe, it, expect } from 'vitest';
import { exportJson, parseImport, mergeImport, reciprocate, familyHistories, netTotals, totalsByCurrency, fmtTotals, searchGifts, registerRows, thankYouText, waLink, withinFree, familyKey, ImportError, FREE_EVENTS, FREE_GIFTS, type ShagunEvent, type ShagunGift } from '../shagun.ts';

const ev = (o: Partial<ShagunEvent>): ShagunEvent => ({ id: 'e1', type: 'wedding', title: "Riya's wedding", date: '2024-11-20', currency: 'CAD', direction: 'received', createdAt: '2024-11-01T00:00:00Z', ...o });
const gift = (o: Partial<ShagunGift>): ShagunGift => ({ id: 'g1', eventId: 'e1', giver: 'Ramesh Sharma', family: 'Sharma family', amount: 101, currency: 'CAD', kind: 'cash', createdAt: '2024-11-20T10:00:00Z', ...o });

const events = [ev({}), ev({ id: 'e2', type: 'griha_pravesh', title: 'New house', date: '2025-03-01', currency: 'INR' }), ev({ id: 'e3', type: 'wedding', title: "Patel's son's wedding", date: '2025-06-10', direction: 'given' }), ev({ id: 'e4', type: 'engagement', title: "Aman's engagement", date: '2026-12-05' })];
const gifts = [
  gift({}),
  gift({ id: 'g2', giver: 'Sunita Sharma', family: ' sharma FAMILY', amount: 5100, currency: 'INR', eventId: 'e2', createdAt: '2025-03-01T10:00:00Z' }),
  gift({ id: 'g3', giver: 'Patel uncle', family: 'Patel family', amount: 251, currency: 'CAD', createdAt: '2024-11-20T11:00:00Z' }),
  gift({ id: 'g4', giver: 'Patel family', family: 'Patel family', amount: 201, currency: 'CAD', eventId: 'e3', createdAt: '2025-06-10T10:00:00Z' }),
  gift({ id: 'g5', giver: 'Mehta ben', family: '', amount: 0, currency: 'CAD', kind: 'item', note: 'silver thali', createdAt: '2024-11-20T12:00:00Z' }),
  gift({ id: 'g6', giver: 'Kapoor family', family: 'Kapoor family', amount: 51, currency: 'CAD', eventId: 'e3', createdAt: '2025-06-10T11:00:00Z' }),
];

describe('totals', () => {
  it('sums per currency with 2-decimal rounding and skips zero/non-cash when asked', () => {
    expect(totalsByCurrency(gifts)).toEqual({ CAD: 604, INR: 5100 });
    expect(totalsByCurrency([gift({ amount: 10.10 }), gift({ id: 'x', amount: 20.20 })])).toEqual({ CAD: 30.3 });
    expect(totalsByCurrency([gift({ kind: 'gold', amount: 500 }), gift({ id: 'x', amount: 5 })], ['cash'])).toEqual({ CAD: 5 });
    expect(fmtTotals({ CAD: 604, INR: 5100 })).toBe('CA$604 + ₹5,100');
  });
  it('register rows carry running numbers and totals', () => {
    const r = registerRows(gifts.filter(g => g.eventId === 'e1'));
    expect(r.rows.map(x => [x.n, x.giver])).toEqual([[1, 'Ramesh Sharma'], [2, 'Patel uncle'], [3, 'Mehta ben']]);
    expect(r.totals).toEqual({ CAD: 352 }); expect(r.count).toBe(3);
  });
});

describe('family grouping + reciprocation', () => {
  it('familyKey ignores case, spacing and punctuation', () => {
    expect(familyKey(' sharma FAMILY')).toBe(familyKey('Sharma family')); expect(familyKey("D'Souza (Toronto)")).toBe('d souza toronto');
  });
  it('groups gifts by family across events, received vs given', () => {
    const h = familyHistories(events, gifts);
    const sharma = h.find(x => x.key === 'sharma family')!;
    expect(sharma.received.length).toBe(2); expect(sharma.receivedTotals).toEqual({ CAD: 101, INR: 5100 }); expect(sharma.lastReceived).toBe('2025-03-01');
    const patel = h.find(x => x.key === 'patel family')!;
    expect(patel.receivedTotals).toEqual({ CAD: 251 }); expect(patel.givenTotals).toEqual({ CAD: 201 }); expect(netTotals(patel)).toEqual({ CAD: 50 });
    expect(h.find(x => x.key === 'mehta ben')!.name).toBe('Mehta ben'); // no family tag -> giver name
  });
  it('to-reciprocate for an upcoming event: families who gave first (most recent first), only-given families last, the event itself excluded', () => {
    const r = reciprocate(events, [...gifts, gift({ id: 'g7', eventId: 'e4', giver: 'Early bird', amount: 1 })], 'e4');
    expect(r.map(x => x.name)).toEqual(['Sharma family', 'Mehta ben', 'Patel family', 'Kapoor family']); // Mehta and Patel tie on date, so by name
    expect(r.find(x => x.name === 'Early bird')).toBeUndefined();
    expect(r[3].received.length).toBe(0); expect(r[3].givenTotals).toEqual({ CAD: 51 });
  });
});

describe('search + limits + messages', () => {
  it('search matches giver, family, note and amount, case-insensitive', () => {
    expect(searchGifts(gifts, 'SHARMA').map(g => g.id)).toEqual(['g1', 'g2']);
    expect(searchGifts(gifts, 'thali').map(g => g.id)).toEqual(['g5']);
    expect(searchGifts(gifts, '5100').map(g => g.id)).toEqual(['g2']);
    expect(searchGifts(gifts, '  ').length).toBe(6);
  });
  it('free tier: 2 events, 50 gifts', () => {
    expect(FREE_EVENTS).toBe(2); expect(FREE_GIFTS).toBe(50);
    expect(withinFree([ev({})], [])).toEqual({ events: true, gifts: true });
    expect(withinFree([ev({}), ev({ id: 'b' })], Array.from({ length: 50 }, (_, i) => gift({ id: `g${i}` })))).toEqual({ events: false, gifts: false });
  });
  it('thank-you text names the giver, amount and event and carries "via ShubhDate" in every language', () => {
    for (const lang of ['en', 'hi', 'gu', 'hinglish']) {
      const s = thankYouText(gifts[0], events[0], lang, 'Sharma family');
      expect(s).toContain('Ramesh Sharma'); expect(s).toContain('CA$101'); expect(s).toContain("Riya's wedding"); expect(s).toContain('via ShubhDate');
    }
    expect(thankYouText(gift({ kind: 'gold', amount: 0 }), events[0], 'en')).toContain('the gold gift');
    expect(waLink('hi there', '+1 (416) 555-0199')).toBe('https://wa.me/14165550199?text=hi%20there');
    expect(waLink('x')).toBe('https://wa.me/?text=x');
  });
});

describe('export / import round trip (family share)', () => {
  it('export -> parse -> same rows; unknown fields dropped; events sorted newest first', () => {
    const out = exportJson(events, gifts, new Date('2026-10-30T00:00:00Z'));
    expect(out).toMatchObject({ app: 'shubhdate', feature: 'shagun', version: 1, exportedAt: '2026-10-30T00:00:00.000Z' });
    expect(out.events.map(e => e.id)).toEqual(['e4', 'e3', 'e2', 'e1']);
    const text = JSON.stringify({ ...out, events: out.events.map(e => ({ ...e, junk: 1 })) });
    const back = parseImport(text);
    expect(back.events.map(e => ({ ...e }))).toEqual(out.events); expect(back.gifts).toEqual(out.gifts);
    expect((back.events[0] as any).junk).toBeUndefined();
  });
  it('rejects foreign or broken files with a code', () => {
    expect(() => parseImport('not json')).toThrow(ImportError);
    expect(() => parseImport({ app: 'other' })).toThrowError('not_shagun');
    expect(() => parseImport({ app: 'shubhdate', feature: 'shagun', version: 99, events: [], gifts: [] })).toThrowError('bad_version');
    expect(() => parseImport({ app: 'shubhdate', feature: 'shagun', version: 1, events: [{ id: 'x', title: 'y', date: 'bad' }], gifts: [] })).toThrowError('bad_event');
    expect(() => parseImport({ app: 'shubhdate', feature: 'shagun', version: 1, events: [], gifts: [{ id: 'g', eventId: 'missing', giver: 'a', amount: 1 }] })).toThrowError('bad_gift');
  });
  it('merge adds unknown ids, keeps existing rows unless overwrite', () => {
    const mine = { events: [events[0]], gifts: [gifts[0]] };
    const theirs = { events: [ev({ title: 'Edited' }), events[1]], gifts: [gift({ amount: 999 }), gifts[1]] };
    const m = mergeImport(mine, theirs);
    expect(m.added).toBe(2); expect(m.updated).toBe(0); expect(m.events.find(e => e.id === 'e1')!.title).toBe("Riya's wedding"); expect(m.gifts.length).toBe(2);
    const o = mergeImport(mine, theirs, true);
    expect(o.updated).toBe(2); expect(o.gifts.find(g => g.id === 'g1')!.amount).toBe(999);
  });
});
