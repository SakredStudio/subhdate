// Shagun Register screen (#/shagun, #/shagun/ev/:id, #/shagun/recip/:id): the private wedding/function gift ledger.
// All data lives in IndexedDB (app/db.ts) on this device; nothing is sent anywhere. Free: 2 events + 50 gifts; the
// shagun_pro one-time unlock (Play Billing inside the TWA) lifts both limits. The web shows the "coming in an update"
// line, never a paywall. Thank-you messages open WhatsApp with a text that carries "via ShubhDate".
import { db } from '../db.ts';
import { isPlayBillingAvailable, listProducts, purchase, restorePurchases, formatPrice, PurchaseError } from '../billing.ts';
import { EVENT_TYPES, CURRENCIES, GIFT_KINDS, FREE_EVENTS, FREE_GIFTS, newId, sortEvents, sortGifts, searchGifts, totalsByCurrency, fmtTotals, fmtAmount, reciprocate, netTotals, withinFree, exportJson, parseImport, mergeImport, thankYouText, waLink, ImportError, type ShagunEvent, type ShagunGift, type Currency, type GiftKind, type ShagunEventType } from '../../engine/shagun.ts';

export interface ShagunCtx {
  isCurrent?: () => boolean;
  t: (k: string, p?: Record<string, string | number>) => string;
  lang: string; base: string;
  esc: (s: any) => string; fmtDate: (iso: string) => string; toast: (m: string) => void;
  sheet: (html: string, onMount?: (root: HTMLElement) => void) => void; closeSheet: () => void;
  isUnlocked: () => Promise<boolean>;
  /** 'ev/<id>' | 'recip/<id>' | undefined */
  sub?: string;
}
const EV_ICON: Record<ShagunEventType, string> = { wedding: '💍', engagement: '💐', baby_shower: '👶', griha_pravesh: '🏠', other: '🎁' };
const KIND_ICON: Record<GiftKind, string> = { cash: '💵', gold: '✨', item: '🎁' };
const todayIso = () => new Date().toISOString().slice(0, 10);
const HOST_KEY = 'shubhdate.shagun.host';

async function load() { const [events, gifts] = await Promise.all([db.shagunEvents(), db.shagunGifts()]); return { events: sortEvents(events), gifts: sortGifts(gifts) }; }

export async function renderShagun(view: HTMLElement, c: ShagunCtx) {
  const [kind, id] = (c.sub ?? '').split('/');
  const data = await load();
  if (c.isCurrent?.() === false) return;
  if (kind === 'ev' && id) { const ev = data.events.find(e => e.id === id); if (ev) return renderEvent(view, c, data, ev); }
  if (kind === 'recip') return renderReciprocate(view, c, data, id || '');
  return renderHome(view, c, data);
}

// ---------- gate ----------
async function gateCard(c: ShagunCtx, data: { events: ShagunEvent[]; gifts: ShagunGift[] }, need: 'events' | 'gifts'): Promise<string | null> {
  const { t } = c;
  if (await c.isUnlocked()) return null;
  const ok = withinFree(data.events, data.gifts);
  if (ok[need]) return null;
  let prod: any = null;
  try { if (await isPlayBillingAvailable()) prod = (await listProducts()).find(p => p.itemId === 'shagun_pro') ?? null; } catch { prod = null; }
  const limit = t('shagun.limit', { e: FREE_EVENTS, g: FREE_GIFTS });
  return `<div class="card gold"><div class="label">${t('shagun.pro')}</div><p class="small">${limit}</p><p class="small">${t('shagun.proIntro')}</p>
    ${prod ? `<div class="row" style="border:0;gap:8px;flex-wrap:wrap;justify-content:flex-start"><button class="btn btn-gold btn-small" id="sg-buy">${t('shagun.buy', { price: formatPrice(prod) })}</button><button class="btn btn-outline btn-small" id="sg-restore">${t('report.restore')}</button></div><p class="small muted">${t('shagun.playNote')}</p>` : `<p class="small muted">${t('shagun.locked')}</p>`}</div>`;
}
function bindGate(view: HTMLElement, c: ShagunCtx, rerender: () => void) {
  const { t } = c;
  view.querySelector('#sg-buy')?.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement; b.disabled = true;
    try { await purchase('shagun_pro'); c.toast(t('report.unlocked')); rerender(); }
    catch (err: any) { b.disabled = false; if (!(err instanceof PurchaseError && err.code === 'cancelled')) c.toast(t('report.buyFailed', { err: String(err?.code ?? err?.message ?? 'error') })); }
  });
  view.querySelector('#sg-restore')?.addEventListener('click', async () => { const n = await restorePurchases(); c.toast(t('report.restored', { n: String(n) })); if (n) rerender(); });
}

// ---------- home: events ----------
async function renderHome(view: HTMLElement, c: ShagunCtx, data: { events: ShagunEvent[]; gifts: ShagunGift[] }) {
  const { t, esc } = c;
  const gate = await gateCard(c, data, 'events');
  if (c.isCurrent?.() === false) return;
  const upcoming = data.events.filter(e => e.date >= todayIso()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const q = (view.querySelector('#sg-q') as HTMLInputElement | null)?.value ?? '';
  const hits = q ? searchGifts(data.gifts, q) : [];
  const evById = new Map(data.events.map(e => [e.id, e]));
  view.innerHTML = `<h1>${t('shagun.title')}</h1><p class="muted small">${t('shagun.intro')}</p>
  <div class="card"><input id="sg-q" type="search" placeholder="${esc(t('shagun.search'))}" value="${esc(q)}" autocomplete="off">
    ${q ? `<div id="sg-hits">${hits.length ? hits.slice(0, 30).map(g => giftRow(c, g, evById.get(g.eventId))).join('') : `<p class="small muted">${t('shagun.noHits')}</p>`}</div>` : ''}</div>
  ${gate ?? `<button class="btn btn-gold" id="sg-add-ev">＋ ${t('shagun.addEvent')}</button>`}
  ${upcoming ? `<a class="card naam-cta" href="#/shagun/recip/${esc(upcoming.id)}">🔁 ${t('shagun.recipCta', { title: upcoming.title })} ›</a>` : data.events.length ? `<a class="card naam-cta" href="#/shagun/recip/">🔁 ${t('shagun.recip')} ›</a>` : ''}
  <div class="card"><div class="label">${t('shagun.events')}</div>
    ${data.events.length ? data.events.map(e => { const gs = data.gifts.filter(g => g.eventId === e.id); return `<a class="list-item" href="#/shagun/ev/${esc(e.id)}" style="text-decoration:none;color:inherit"><span class="ico">${EV_ICON[e.type]}</span><div class="body"><div class="title">${esc(e.title)}</div><div class="sub">${esc(c.fmtDate(e.date))} · ${t('shagun.type.' + e.type)}${e.direction === 'given' ? ` · ${t('shagun.dirGiven')}` : ''}</div><div class="sub">${gs.length} ${t('shagun.giftsN')}${gs.length ? ` · ${esc(fmtTotals(totalsByCurrency(gs)))}` : ''}</div></div><span class="chev">›</span></a>`; }).join('') : `<p class="small muted">${t('shagun.noEvents')}</p>`}</div>
  <div class="card"><div class="label">${t('shagun.share')}</div><p class="small muted">${t('shagun.shareNote')}</p>
    <div class="row" style="border:0;gap:8px;flex-wrap:wrap;justify-content:flex-start"><button class="btn btn-outline btn-small" id="sg-export" ${data.events.length ? '' : 'disabled'}>${t('shagun.export')}</button><button class="btn btn-outline btn-small" id="sg-import">${t('shagun.import')}</button><button class="btn btn-outline btn-small" id="sg-pdf" ${data.gifts.length ? '' : 'disabled'}>📄 ${t('shagun.pdf')}</button></div>
    <input id="sg-file" type="file" accept="application/json,.json" style="display:none"></div>
  <p class="small dim">🔒 ${t('shagun.privacy')}</p>`;
  const rerender = () => renderShagun(view, c);
  bindGate(view, c, rerender);
  let timer: any; const qEl = view.querySelector('#sg-q') as HTMLInputElement;
  qEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(async () => { const d = await load(); const hits = searchGifts(d.gifts, qEl.value); const map = new Map(d.events.map(e => [e.id, e])); let box = view.querySelector('#sg-hits'); if (!qEl.value) { box?.remove(); return; } if (!box) { box = document.createElement('div'); box.id = 'sg-hits'; qEl.after(box); } box.innerHTML = hits.length ? hits.slice(0, 30).map(g => giftRow(c, g, map.get(g.eventId))).join('') : `<p class="small muted">${t('shagun.noHits')}</p>`; bindGiftRows(view, c, d, rerender); }, 150); });
  bindGiftRows(view, c, data, rerender);
  view.querySelector('#sg-add-ev')?.addEventListener('click', () => eventForm(c, null, rerender));
  view.querySelector('#sg-export')?.addEventListener('click', () => exportFile(c, data));
  view.querySelector('#sg-import')?.addEventListener('click', () => (view.querySelector('#sg-file') as HTMLInputElement).click());
  view.querySelector('#sg-file')?.addEventListener('change', async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) await importFile(c, await f.text(), data, rerender); });
  view.querySelector('#sg-pdf')?.addEventListener('click', () => makePdf(c, data.events, data.gifts, view.querySelector('#sg-pdf') as HTMLButtonElement));
}

// ---------- event detail: gifts ----------
async function renderEvent(view: HTMLElement, c: ShagunCtx, data: { events: ShagunEvent[]; gifts: ShagunGift[] }, ev: ShagunEvent) {
  const { t, esc } = c;
  const gifts = data.gifts.filter(g => g.eventId === ev.id);
  const gate = await gateCard(c, data, 'gifts');
  if (c.isCurrent?.() === false) return;
  const totals = totalsByCurrency(gifts), cash = totalsByCurrency(gifts, ['cash']);
  view.innerHTML = `<div class="row" style="border:0"><a href="#/shagun" class="small">‹ ${t('shagun.title')}</a><button class="btn btn-outline btn-small" id="sg-edit-ev">${t('shagun.edit')}</button></div>
  <h1>${EV_ICON[ev.type]} ${esc(ev.title)}</h1><p class="muted small">${esc(c.fmtDate(ev.date))} · ${t('shagun.type.' + ev.type)} · ${t(ev.direction === 'given' ? 'shagun.dirGiven' : 'shagun.dirReceived')}${ev.note ? ` · ${esc(ev.note)}` : ''}</p>
  <div class="card gold"><div class="row"><span class="k">${t('shagun.total')}</span><span class="v"><b>${esc(fmtTotals(totals) || '—')}</b></span></div>
    ${JSON.stringify(cash) !== JSON.stringify(totals) ? `<div class="row"><span class="k">${t('shagun.cashOnly')}</span><span class="v">${esc(fmtTotals(cash) || '—')}</span></div>` : ''}
    <div class="row"><span class="k">${t('shagun.giftsN')}</span><span class="v">${gifts.length}</span></div></div>
  ${gate ?? `<button class="btn btn-gold" id="sg-add">＋ ${t('shagun.addGift')}</button>`}
  <div class="card"><input id="sg-q" type="search" placeholder="${esc(t('shagun.search'))}" autocomplete="off"><div id="sg-list">${gifts.length ? gifts.map(g => giftRow(c, g)).join('') : `<p class="small muted">${t('shagun.noGifts')}</p>`}</div></div>
  <div class="row" style="border:0;gap:8px;flex-wrap:wrap;justify-content:flex-start"><button class="btn btn-outline btn-small" id="sg-pdf" ${gifts.length ? '' : 'disabled'}>📄 ${t('shagun.pdf')}</button><a class="btn btn-outline btn-small" href="#/shagun/recip/${esc(ev.id)}">🔁 ${t('shagun.recip')}</a><button class="btn btn-outline btn-small" id="sg-del-ev">${t('shagun.deleteEvent')}</button></div>`;
  const rerender = () => renderShagun(view, c);
  bindGate(view, c, rerender);
  bindGiftRows(view, c, data, rerender);
  (view.querySelector('#sg-q') as HTMLInputElement).addEventListener('input', (e) => { const hits = searchGifts(gifts, (e.target as HTMLInputElement).value); view.querySelector('#sg-list')!.innerHTML = hits.length ? hits.map(g => giftRow(c, g)).join('') : `<p class="small muted">${t('shagun.noHits')}</p>`; bindGiftRows(view, c, data, rerender); });
  view.querySelector('#sg-add')?.addEventListener('click', () => giftForm(c, ev, null, rerender));
  view.querySelector('#sg-edit-ev')!.addEventListener('click', () => eventForm(c, ev, rerender));
  view.querySelector('#sg-pdf')?.addEventListener('click', () => makePdf(c, [ev], gifts, view.querySelector('#sg-pdf') as HTMLButtonElement));
  view.querySelector('#sg-del-ev')!.addEventListener('click', () => confirmSheet(c, t('shagun.deleteEventConfirm', { n: gifts.length }), async () => { await db.shagunRemoveEvent(ev.id); c.closeSheet(); location.hash = '#/shagun'; }));
}
function giftRow(c: ShagunCtx, g: ShagunGift, ev?: ShagunEvent): string {
  const { t, esc } = c;
  return `<div class="list-item" data-gift="${esc(g.id)}"><span class="ico">${KIND_ICON[g.kind]}</span><div class="body"><div class="title">${esc(g.giver)}${g.family ? ` <span class="small muted">· ${esc(g.family)}</span>` : ''}</div><div class="sub">${g.amount > 0 ? `<b>${esc(fmtAmount(g.amount, g.currency))}</b> · ` : ''}${t('shagun.kind.' + g.kind)}${g.note ? ` · ${esc(g.note)}` : ''}${ev ? ` · ${esc(ev.title)}` : ''}</div></div><span class="chev">›</span></div>`;
}
function bindGiftRows(view: HTMLElement, c: ShagunCtx, data: { events: ShagunEvent[]; gifts: ShagunGift[] }, rerender: () => void) {
  view.querySelectorAll<HTMLElement>('[data-gift]').forEach(el => el.addEventListener('click', () => { const g = data.gifts.find(x => x.id === el.dataset.gift); const ev = g && data.events.find(e => e.id === g.eventId); if (g && ev) giftActions(c, ev, g, rerender); }));
}

// ---------- reciprocate ----------
async function renderReciprocate(view: HTMLElement, c: ShagunCtx, data: { events: ShagunEvent[]; gifts: ShagunGift[] }, forId: string) {
  const { t, esc } = c;
  const ev = data.events.find(e => e.id === forId) ?? null;
  const list = reciprocate(data.events, data.gifts, forId);
  const sel = `<select id="sg-for"><option value="" ${!ev ? 'selected' : ''}>${t('shagun.recipAny')}</option>${data.events.map(e => `<option value="${esc(e.id)}" ${e.id === forId ? 'selected' : ''}>${EV_ICON[e.type]} ${esc(e.title)} · ${esc(c.fmtDate(e.date))}</option>`).join('')}</select>`;
  view.innerHTML = `<div class="row" style="border:0"><a href="#/shagun" class="small">‹ ${t('shagun.title')}</a></div><h1>🔁 ${t('shagun.recip')}</h1><p class="muted small">${t('shagun.recipIntro')}</p>
  <div class="card"><div class="field"><label>${t('shagun.recipFor')}</label>${sel}</div></div>
  ${list.length ? list.map(h => { const net = netTotals(h); const owe = fmtTotals(net); return `<div class="card ${h.received.length ? '' : ''}"><div class="row" style="border:0"><b>${esc(h.name)}</b>${h.received.length ? `<span class="pill good">${esc(fmtTotals(h.receivedTotals))}</span>` : `<span class="pill info">${t('shagun.onlyGiven')}</span>`}</div>
    ${h.received.map(l => `<div class="row"><span class="k">${esc(c.fmtDate(l.event.date))} · ${esc(l.event.title)}${l.gift.giver !== h.name ? ` · ${esc(l.gift.giver)}` : ''}</span><span class="v">${l.gift.amount > 0 ? esc(fmtAmount(l.gift.amount, l.gift.currency)) : t('shagun.kind.' + l.gift.kind)}</span></div>`).join('')}
    ${h.given.map(l => `<div class="row"><span class="k">↗ ${esc(c.fmtDate(l.event.date))} · ${esc(l.event.title)}</span><span class="v muted">− ${l.gift.amount > 0 ? esc(fmtAmount(l.gift.amount, l.gift.currency)) : t('shagun.kind.' + l.gift.kind)}</span></div>`).join('')}
    ${h.given.length && h.received.length ? `<div class="row"><span class="k">${t('shagun.net')}</span><span class="v"><b>${esc(owe || '0')}</b></span></div>` : ''}
    </div>`; }).join('') : `<div class="card center"><p style="font-size:32px">🎁</p><p class="muted">${t('shagun.recipEmpty')}</p></div>`}`;
  view.querySelector('#sg-for')!.addEventListener('change', (e) => { location.hash = `#/shagun/recip/${(e.target as HTMLSelectElement).value}`; });
}

// ---------- forms ----------
function eventForm(c: ShagunCtx, ev: ShagunEvent | null, done: () => void) {
  const { t, esc } = c;
  c.sheet(`<h2>${ev ? t('shagun.editEvent') : t('shagun.addEvent')}</h2>
    <div class="field"><label>${t('shagun.evTitle')}</label><input id="f-title" placeholder="${esc(t('shagun.evTitlePh'))}" value="${esc(ev?.title ?? '')}" maxlength="120"></div>
    <div class="grid2"><div class="field"><label>${t('shagun.evType')}</label><select id="f-type">${EVENT_TYPES.map(x => `<option value="${x}" ${(ev?.type ?? 'wedding') === x ? 'selected' : ''}>${EV_ICON[x]} ${t('shagun.type.' + x)}</option>`).join('')}</select></div>
    <div class="field"><label>${t('shagun.evDate')}</label><input id="f-date" type="date" value="${esc(ev?.date ?? todayIso())}"></div></div>
    <div class="grid2"><div class="field"><label>${t('shagun.currency')}</label><select id="f-cur">${CURRENCIES.map(x => `<option value="${x}" ${(ev?.currency ?? (c.lang === 'hi' || c.lang === 'gu' || c.lang === 'hinglish' ? 'INR' : 'CAD')) === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label>${t('shagun.direction')}</label><select id="f-dir"><option value="received" ${(ev?.direction ?? 'received') === 'received' ? 'selected' : ''}>${t('shagun.dirReceived')}</option><option value="given" ${ev?.direction === 'given' ? 'selected' : ''}>${t('shagun.dirGiven')}</option></select></div></div>
    <div class="field"><label>${t('shagun.note')}</label><input id="f-note" value="${esc(ev?.note ?? '')}" maxlength="500"></div>
    <button class="btn btn-gold" id="f-save">${t('shagun.save')}</button>`, root => {
    root.querySelector('#f-save')!.addEventListener('click', async () => {
      const title = (root.querySelector('#f-title') as HTMLInputElement).value.trim(); const date = (root.querySelector('#f-date') as HTMLInputElement).value;
      if (!title) return c.toast(t('shagun.needTitle')); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.toast(t('shagun.needDate'));
      const row: ShagunEvent = { id: ev?.id ?? newId(), type: (root.querySelector('#f-type') as HTMLSelectElement).value as ShagunEventType, title, date, currency: (root.querySelector('#f-cur') as HTMLSelectElement).value as Currency, direction: (root.querySelector('#f-dir') as HTMLSelectElement).value as any, createdAt: ev?.createdAt ?? new Date().toISOString() };
      const note = (root.querySelector('#f-note') as HTMLInputElement).value.trim(); if (note) row.note = note;
      await db.shagunPutEvent(row); c.closeSheet(); c.toast(t('shagun.saved')); if (!ev) location.hash = `#/shagun/ev/${row.id}`; else done();
    });
  });
}
function giftForm(c: ShagunCtx, ev: ShagunEvent, g: ShagunGift | null, done: () => void) {
  const { t, esc } = c;
  c.sheet(`<h2>${g ? t('shagun.editGift') : t('shagun.addGift')}</h2><p class="small muted">${esc(ev.title)}</p>
    <div class="field"><label>${t(ev.direction === 'given' ? 'shagun.giverTo' : 'shagun.giver')}</label><input id="g-giver" placeholder="${esc(t('shagun.giverPh'))}" value="${esc(g?.giver ?? '')}" maxlength="120" autocomplete="off"></div>
    <div class="field"><label>${t('shagun.family')}</label><input id="g-family" placeholder="${esc(t('shagun.familyPh'))}" value="${esc(g?.family ?? '')}" maxlength="120" autocomplete="off"></div>
    <div class="grid2"><div class="field"><label>${t('shagun.amount')}</label><input id="g-amount" type="number" inputmode="decimal" min="0" step="0.01" value="${g?.amount ?? ''}"></div>
    <div class="field"><label>${t('shagun.currency')}</label><select id="g-cur">${CURRENCIES.map(x => `<option value="${x}" ${(g?.currency ?? ev.currency) === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
    <div class="grid2"><div class="field"><label>${t('shagun.kindLabel')}</label><select id="g-kind">${GIFT_KINDS.map(x => `<option value="${x}" ${(g?.kind ?? 'cash') === x ? 'selected' : ''}>${KIND_ICON[x]} ${t('shagun.kind.' + x)}</option>`).join('')}</select></div>
    <div class="field"><label>${t('shagun.phone')}</label><input id="g-phone" type="tel" inputmode="tel" placeholder="+1 416…" value="${esc(g?.phone ?? '')}" maxlength="32"></div></div>
    <div class="field"><label>${t('shagun.note')}</label><input id="g-note" placeholder="${esc(t('shagun.notePh'))}" value="${esc(g?.note ?? '')}" maxlength="500"></div>
    <button class="btn btn-gold" id="g-save">${t('shagun.save')}</button>${g ? '' : `<p class="small muted center" style="margin-top:8px">${t('shagun.addMore')}</p>`}`, root => {
    const giverEl = root.querySelector('#g-giver') as HTMLInputElement; giverEl.focus();
    root.querySelector('#g-save')!.addEventListener('click', async () => {
      const giver = giverEl.value.trim(); if (!giver) return c.toast(t('shagun.needGiver'));
      const amount = Number((root.querySelector('#g-amount') as HTMLInputElement).value || 0); if (!Number.isFinite(amount) || amount < 0) return c.toast(t('shagun.needAmount'));
      const row: ShagunGift = { id: g?.id ?? newId(), eventId: ev.id, giver, family: (root.querySelector('#g-family') as HTMLInputElement).value.trim(), amount: Math.round(amount * 100) / 100, currency: (root.querySelector('#g-cur') as HTMLSelectElement).value as Currency, kind: (root.querySelector('#g-kind') as HTMLSelectElement).value as GiftKind, createdAt: g?.createdAt ?? new Date().toISOString() };
      const note = (root.querySelector('#g-note') as HTMLInputElement).value.trim(); if (note) row.note = note;
      const phone = (root.querySelector('#g-phone') as HTMLInputElement).value.trim(); if (phone) row.phone = phone;
      await db.shagunPutGift(row); c.closeSheet(); c.toast(t('shagun.saved')); done();
    });
  });
}
function giftActions(c: ShagunCtx, ev: ShagunEvent, g: ShagunGift, done: () => void) {
  const { t, esc } = c;
  const host = localStorage.getItem(HOST_KEY) ?? '';
  const text = thankYouText(g, ev, c.lang, host);
  c.sheet(`<h2>${esc(g.giver)}</h2><p class="small muted">${g.family ? esc(g.family) + ' · ' : ''}${g.amount > 0 ? esc(fmtAmount(g.amount, g.currency)) + ' · ' : ''}${t('shagun.kind.' + g.kind)} · ${esc(ev.title)}</p>
    ${ev.direction === 'received' ? `<div class="field"><label>${t('shagun.thanksFrom')}</label><input id="a-host" value="${esc(host)}" placeholder="${esc(t('shagun.thanksFromPh'))}" maxlength="80"></div>
    <textarea id="a-text" rows="5" style="font-size:13px">${esc(text)}</textarea>
    <a class="btn btn-gold" id="a-wa" href="${esc(waLink(text, g.phone))}" target="_blank" rel="noopener" style="margin-top:8px">💬 ${t('shagun.thankWa')}</a>` : ''}
    <div class="row" style="border:0;gap:8px;flex-wrap:wrap;justify-content:flex-start;margin-top:10px"><button class="btn btn-outline btn-small" id="a-edit">${t('shagun.edit')}</button><button class="btn btn-outline btn-small" id="a-del">${t('shagun.delete')}</button></div>`, root => {
    const hostEl = root.querySelector('#a-host') as HTMLInputElement | null, ta = root.querySelector('#a-text') as HTMLTextAreaElement | null, wa = root.querySelector('#a-wa') as HTMLAnchorElement | null;
    hostEl?.addEventListener('input', () => { localStorage.setItem(HOST_KEY, hostEl.value.trim()); const tx = thankYouText(g, ev, c.lang, hostEl.value.trim()); if (ta) ta.value = tx; if (wa) wa.href = waLink(tx, g.phone); });
    ta?.addEventListener('input', () => { if (wa) wa.href = waLink(ta.value, g.phone); });
    root.querySelector('#a-edit')!.addEventListener('click', () => giftForm(c, ev, g, done));
    root.querySelector('#a-del')!.addEventListener('click', () => confirmSheet(c, t('shagun.deleteGiftConfirm', { name: g.giver }), async () => { await db.shagunRemoveGift(g.id); c.closeSheet(); c.toast(t('shagun.deleted')); done(); }));
  });
}
function confirmSheet(c: ShagunCtx, msg: string, yes: () => Promise<void>) {
  const { t } = c;
  c.sheet(`<h2>${t('shagun.confirm')}</h2><p>${c.esc(msg)}</p><div class="row" style="border:0;gap:8px"><button class="btn btn-outline" id="cf-no">${t('shagun.cancel')}</button><button class="btn btn-gold" id="cf-yes">${t('shagun.delete')}</button></div>`, root => {
    root.querySelector('#cf-no')!.addEventListener('click', c.closeSheet);
    root.querySelector('#cf-yes')!.addEventListener('click', () => yes());
  });
}

// ---------- export / import / pdf ----------
async function shareOrDownload(c: ShagunCtx, blob: Blob, fileName: string, title: string) {
  const nav: any = navigator; const file = new File([blob], fileName, { type: blob.type });
  try { if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) { await nav.share({ files: [file], title }); return; } } catch (e: any) { if (e?.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  c.toast(c.t('shagun.downloaded'));
}
function exportFile(c: ShagunCtx, data: { events: ShagunEvent[]; gifts: ShagunGift[] }) {
  const json = JSON.stringify(exportJson(data.events, data.gifts), null, 1);
  shareOrDownload(c, new Blob([json], { type: 'application/json' }), `shagun-register-${todayIso()}.json`, c.t('shagun.title'));
}
async function importFile(c: ShagunCtx, text: string, data: { events: ShagunEvent[]; gifts: ShagunGift[] }, done: () => void) {
  const { t } = c;
  let parsed; try { parsed = parseImport(text); } catch (e: any) { return c.toast(t(e instanceof ImportError ? `shagun.import.${e.code}` : 'shagun.import.not_json')); }
  const merged = mergeImport(data, parsed);
  if (!merged.added && !merged.updated) return c.toast(t('shagun.importNothing'));
  if (!(await c.isUnlocked())) { const free = withinFree([], []); void free; if (merged.events.length > FREE_EVENTS || merged.gifts.length > FREE_GIFTS) return c.toast(t('shagun.importLimit', { e: FREE_EVENTS, g: FREE_GIFTS })); }
  for (const e of parsed.events) if (!data.events.some(x => x.id === e.id)) await db.shagunPutEvent(e);
  for (const g of parsed.gifts) if (!data.gifts.some(x => x.id === g.id)) await db.shagunPutGift(g);
  c.toast(t('shagun.imported', { n: merged.added })); done();
}
async function makePdf(c: ShagunCtx, events: ShagunEvent[], gifts: ShagunGift[], btn: HTMLButtonElement) {
  const { t } = c; btn.disabled = true;
  try {
    const { buildRegisterPdf } = await import('./shagun-pdf.ts');
    const kinds = Object.fromEntries(GIFT_KINDS.map(k => [k, t('shagun.kind.' + k)])), types = Object.fromEntries(EVENT_TYPES.map(k => [k, t('shagun.type.' + k)]));
    const bytes = await buildRegisterPdf(events, gifts, { title: t('shagun.pdfTitle'), event: t('shagun.events'), date: t('shagun.evDate'), dirReceived: t('shagun.dirReceived'), dirGiven: t('shagun.dirGiven'), giver: t('shagun.giver'), family: t('shagun.family'), kind: t('shagun.kindLabel'), amount: t('shagun.amount'), note: t('shagun.note'), total: t('shagun.total'), cash: t('shagun.cashOnly'), count: t('shagun.giftsN'), page: t('shagun.page'), madeWith: t('shagun.madeWith'), scriptNote: t('shagun.pdfScriptNote'), kinds, types }, c.fmtDate);
    await shareOrDownload(c, new Blob([bytes as BlobPart], { type: 'application/pdf' }), `shagun-register-${todayIso()}.pdf`, t('shagun.pdfTitle'));
  } catch (e: any) { c.toast(`PDF: ${e?.message ?? e}`); }
  btn.disabled = false;
}
