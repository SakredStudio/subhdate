// Namakarana screen (#/naam): birth date/time/city -> janma nakshatra + pada, naming syllables, curated names,
// shareable "Welcome, {name}" card, naming-ceremony dates, and a printable report gated by the naam_report credit
// (Play Billing inside the TWA; the web shows the preview and explains). Birth details stay on this device.
import { humanSource } from '../format.ts';
import { isPlayBillingAvailable, listProducts, purchase, restorePurchases, formatPrice, PurchaseError, openManageSubscriptions } from '../billing.ts';
import { loadEntitlement } from '../entitlement.ts';
import { loadReportFonts, reportDeck, reportToolbar, mountReport, closeReport, slideTitle, label, heading, kv, list, chunk } from './report-shell.ts';

export interface NaamCity { name: string; lat: number; lon: number; tz: string; region?: string }
export interface NaamCtx {
  /** false once the user has navigated away; async work must not paint then */
  isCurrent?: () => boolean;
  t: (k: string, p?: Record<string, string | number>) => string;
  lang: string; region: string; base: string; city: NaamCity;
  esc: (s: any) => string; fmtTime: (iso: string | null | undefined, zone?: string) => string; fmtDate: (iso: string) => string;
  scoreRing: (n: number) => string; toast: (m: string) => void;
  call: (op: string, args: any) => Promise<any>;
  pickCity: (onPick: (c: NaamCity) => void) => void;
  isUnlocked: () => Promise<boolean>; onFirstFullRender?: (key: string) => void;
}
interface Form { date: string; time: string | null; unk?: boolean; city: NaamCity; gender: 'boy' | 'girl' | 'any'; }
const FORM_KEY = 'shubhdate.naam';
function loadForm(): Form | null { try { return JSON.parse(localStorage.getItem(FORM_KEY) || 'null'); } catch { return null; } }
function saveForm(f: Form) { localStorage.setItem(FORM_KEY, JSON.stringify(f)); }
export const naamKey = (f: Form) => `naam|${f.date}|${f.time || 'x'}|${f.city.lat.toFixed(2)},${f.city.lon.toFixed(2)}`;

let last: { form: Form; r: any } | null = null;
export function lastNaamForm(): Form | null { return last?.form ?? loadForm(); }

export async function renderNaam(view: HTMLElement, c: NaamCtx) {
  const { t, esc } = c;
  const f: Form = loadForm() ?? { date: '', time: '', unk: false, city: c.city, gender: 'any' };
  const isUnk = !!f.unk;
  let city = f.city;
  let runSeq = 0;
  view.innerHTML = `<h1>${t('naam.title')}</h1><p class="muted small">${t('naam.intro')}</p>
  <div class="card">
    <div class="grid2"><div class="field"><label>${t('naam.dob')}</label><input id="n-date" type="date" min="1900-01-01" max="2100-12-31" value="${esc(f.date)}"></div><div class="field" id="n-time-field"><label>${t('naam.tob')}</label><input id="n-time" type="time" value="${esc(f.time ?? '')}" ${isUnk ? 'disabled' : ''}></div></div>
    <div class="toggle" id="n-unk-row"><span>${t('naam.timeUnknown')}</span><div class="switch ${isUnk ? 'on' : ''}" id="n-unk" role="switch" aria-checked="${isUnk}"></div></div>
    <div class="field"><label>${t('naam.city')}</label><button class="btn btn-outline" id="n-city" type="button">${esc(city.name)}${city.region ? ` · ${esc(city.region)}` : ''}</button></div>
    <div class="field"><label>${t('naam.gender')}</label><select id="n-gender">${(['any', 'boy', 'girl'] as const).map(g => `<option value="${g}" ${f.gender === g ? 'selected' : ''}>${t('naam.' + g)}</option>`).join('')}</select></div>
    <p class="small muted">🔒 ${t('naam.privacy')}</p>
    <div class="row" style="border:0;gap:8px"><button class="btn btn-gold" id="n-go" type="button">✦ ${t('naam.go')}</button><button class="btn btn-outline btn-small" id="n-clear" type="button">${t('settings.clearBirth')}</button></div>
  </div>
  <div id="n-out"></div>`;
  const dateEl = view.querySelector('#n-date') as HTMLInputElement;
  const unk = view.querySelector('#n-unk') as HTMLElement, timeEl = view.querySelector('#n-time') as HTMLInputElement;
  const goBtn = view.querySelector('#n-go') as HTMLButtonElement;
  const setUnk = (on: boolean) => { unk.classList.toggle('on', on); unk.setAttribute('aria-checked', String(on)); timeEl.disabled = on; };
  const run = async (scroll = false) => {
    const date = dateEl.value; if (!date) return c.toast(t('naam.noBirth'));
    const mySeq = ++runSeq;
    const unkOn = unk.classList.contains('on');
    const form: Form = { date, time: unkOn ? null : (timeEl.value || ''), unk: unkOn, city, gender: (view.querySelector('#n-gender') as HTMLSelectElement).value as Form['gender'] };
    saveForm(form);
    const out = view.querySelector('#n-out') as HTMLElement;
    out.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    if (scroll) out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    goBtn.disabled = true;
    try {
      const r = await c.call('naam', { req: { birth: { date: form.date, time: form.time || null, place: { name: form.city.name, lat: form.city.lat, lon: form.city.lon, tz: form.city.tz } }, gender: form.gender, region: c.region === 'west' || c.region === 'south' ? c.region : 'north' }, lang: c.lang });
      if (mySeq !== runSeq || c.isCurrent?.() === false) return;
      last = { form, r };
      renderResult(out, form, r, c);
      if (scroll) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e: any) {
      if (mySeq === runSeq) out.innerHTML = `<div class="card">Error: ${esc(e.message)}</div>`;
    } finally {
      if (mySeq === runSeq) goBtn.disabled = false;
    }
  };
  view.querySelector('#n-unk-row')!.addEventListener('click', () => { setUnk(!unk.classList.contains('on')); if (last && dateEl.value) run(false); });
  view.querySelector('#n-time-field')!.addEventListener('click', () => {
    if (unk.classList.contains('on')) { setUnk(false); timeEl.focus(); (timeEl as any).showPicker?.(); }
  });
  view.querySelector('#n-city')!.addEventListener('click', () => c.pickCity(ci => { city = ci; (view.querySelector('#n-city') as HTMLElement).textContent = `${ci.name}${ci.region ? ` · ${ci.region}` : ''}`; if (last && dateEl.value) run(false); }));
  dateEl.addEventListener('change', () => { if (last && dateEl.value) run(false); });
  timeEl.addEventListener('change', () => { if (last && dateEl.value) run(false); });
  view.querySelector('#n-gender')!.addEventListener('change', () => { if (last && dateEl.value) run(false); });
  goBtn.addEventListener('click', () => run(true));
  view.querySelector('#n-clear')!.addEventListener('click', () => {
    runSeq++; localStorage.removeItem(FORM_KEY); last = null; goBtn.disabled = false;
    dateEl.value = ''; timeEl.value = ''; setUnk(false);
    city = c.city; (view.querySelector('#n-city') as HTMLElement).textContent = `${city.name}${city.region ? ` · ${city.region}` : ''}`;
    (view.querySelector('#n-gender') as HTMLSelectElement).value = 'any';
    view.querySelector('#n-out')!.innerHTML = '';
  });
  if (last && last.form.date === f.date && (last.form.time || '') === (f.time || '') && last.form.gender === f.gender && last.form.city.name === f.city.name) {
    renderResult(view.querySelector('#n-out') as HTMLElement, last.form, last.r, c);
  } else if (f.date) run(false);
}

function sylHtml(s: any, lang: string, big = false) {
  const script = lang === 'gu' ? s.gu : s.deva;
  return `<span class="naam-syl ${big ? 'big' : ''}"><b>${script}</b><span>${s.latin}</span>${s.alt ? `<span class="muted">/ ${lang === 'gu' ? s.alt.gu : s.alt.deva} ${s.alt.latin}</span>` : ''}</span>`;
}

async function renderResult(out: HTMLElement, form: Form, r: any, c: NaamCtx) {
  const { t, esc } = c;
  const selectedPada: number[] = r.candidates.map((x: any) => x.pada);
  const nameOf = (n: any) => c.lang === 'gu' ? n.gu : c.lang === 'hi' ? n.hi : n.en;
  const nameList = (list: any[], gender: string) => list.length ? `<div class="naam-names">${list.map((n, i) => `<button class="naam-name" data-g="${gender}" data-i="${i}"><b>${esc(nameOf(n))}</b><span class="small">${esc(c.lang === 'en' || c.lang === 'hinglish' ? n.hi : n.en)}</span><span class="small muted">${esc(n.m)}</span></button>`).join('')}</div>` : '';
  const padaSectionHtml = (x: any, selPada: number) => {
    const syl = x.syllables[selPada - 1] ?? x.syllable;
    const names = x.padaNames?.[selPada - 1] ?? x.names;
    return `<div class="naam-sylrow">${x.syllables.map((s: any, i: number) => {
      const p = i + 1; const isBirth = p === x.pada; const isCur = p === selPada;
      return `<button type="button" class="naam-pada ${isCur ? 'cur' : ''} ${isBirth ? 'janma' : ''}" data-pada="${p}" aria-pressed="${isCur}">${sylHtml(s, c.lang)}<span class="naam-pada-sub">${isBirth ? '● ' : ''}${t('naam.pada')} ${p}</span></button>`;
    }).join('')}</div>
    <div class="label mt">${t('naam.names', { s: `${c.lang === 'gu' ? syl.gu : syl.deva} ${syl.latin}` })}</div>
    ${names.boys.length || names.girls.length ? `<p class="small muted">${t('naam.pick')}</p>${names.boys.length ? `<div class="label small">${t('naam.boys')}</div>${nameList(names.boys, 'boys')}` : ''}${names.girls.length ? `<div class="label small">${t('naam.girls')}</div>${nameList(names.girls, 'girls')}` : ''}` : ''}${names.boys.length + names.girls.length < 3 ? `<p class="small muted">${t('naam.noNames')}</p>` : ''}
    ${selPada !== x.pada ? `<p class="small muted naam-other-pada">${t('naam.otherPada', { pada: x.pada })}</p>` : ''}`;
  };
  const cand = (x: any, idx: number) => `<div class="card ${idx === 0 ? 'gold' : ''}">
    <div class="label">${t('naam.janma')}${r.candidates.length > 1 ? ` · ${idx + 1}/${r.candidates.length}` : ''}</div>
    <h2 style="margin:4px 0">${esc(x.nakshatraLabel)} <span class="muted" style="font-weight:400">· ${t('naam.pada')} ${x.pada}</span></h2>
    <div class="row"><span class="k">${t('naam.rashi')}</span><span class="v"><b>${esc(x.rashiLabel)}</b></span></div>
    <div class="row"><span class="k">${t('naam.lord')}</span><span class="v">${esc(x.lord)}</span></div>
    <div class="row"><span class="k">${t('naam.deity')}</span><span class="v">${esc(x.deity)}</span></div>
    ${x.gandMool ? `<div class="banner">⚠ ${t('naam.gandMool')}</div>` : ''}
    <div class="label mt">${t('naam.syllable')}</div>
    <div class="naam-sylrow">${sylHtml(x.syllable, c.lang, true)}</div>
    <div class="label mt">${t('naam.syllables')}</div>
    <div class="naam-pada-box" data-cand="${idx}">${padaSectionHtml(x, selectedPada[idx])}</div>
  </div>`;
  const days = `<div class="card"><div class="label">${t('naam.muhurta')}</div><p class="small muted">${t('naam.muhurtaNote')}</p>
    ${r.days.slice(0, 5).map((d: any) => `<div class="list-item"><div class="body"><div class="title"><b>${esc(c.fmtDate(d.date))}</b> <span class="small muted">· ${esc(d.headline)}</span></div><div class="sub">${d.windows.slice(0, 2).map((w: any) => `${c.fmtTime(w.start, form.city.tz)}–${c.fmtTime(w.end, form.city.tz)}${w.choghadiya ? ` · ${esc(w.choghadiya)}` : ''}`).join(' · ')}</div></div>${c.scoreRing(d.score)}</div>`).join('')}
    ${r.days.length ? '' : `<p class="small muted">—</p>`}</div>`;
  const defaultReportCard = `<div class="card gold"><div class="label">${t('naam.report')}</div><p class="small">${t('naam.reportIntro')}</p><p class="small muted">${t('naam.locked')}</p></div>`;
  out.innerHTML = `${r.janma.ambiguous ? `<div class="banner">${t('naam.ambiguous')}</div>` : ''}${r.candidates.map(cand).join('')}<div id="n-card"></div>${days}<div id="n-report-slot">${defaultReportCard}</div><p class="small dim">${r.sources.map((s: string) => esc(humanSource(s))).join(' · ')}</p>`;

  const bindBox = (box: HTMLElement) => {
    const idx = Number(box.dataset.cand ?? 0);
    const x = r.candidates[idx] ?? r.candidates[0];
    box.querySelectorAll<HTMLButtonElement>('.naam-pada').forEach(btn => btn.addEventListener('click', () => {
      const p = Number(btn.dataset.pada);
      if (!p || p === selectedPada[idx]) return;
      selectedPada[idx] = p;
      box.innerHTML = padaSectionHtml(x, p);
      bindBox(box);
    }));
    box.querySelectorAll<HTMLButtonElement>('.naam-name').forEach(btn => btn.addEventListener('click', () => {
      const p = selectedPada[idx];
      const syl = x.syllables[p - 1] ?? x.syllable;
      const names = x.padaNames?.[p - 1] ?? x.names;
      const n = names[btn.dataset.g!][Number(btn.dataset.i)];
      renderCard(out.querySelector('#n-card') as HTMLElement, form, { ...x, pada: p, syllable: syl }, n, c);
      (out.querySelector('#n-card') as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  };
  out.querySelectorAll<HTMLElement>('.naam-pada-box').forEach(bindBox);

  const unlocked = await c.isUnlocked().catch(() => false);
  let products: any[] = [];
  if (!unlocked) { try { if (await isPlayBillingAvailable()) products = await listProducts(); } catch { products = []; } }
  const prod = products.find(p => p.itemId === 'naam_report'), fam = products.find(p => p.itemId === 'family_annual');
  const ent = unlocked ? await loadEntitlement().catch(() => null) : null;
  if (c.isCurrent?.() === false) return;
  const slot = out.querySelector('#n-report-slot');
  if (!slot) return;
  slot.innerHTML = `<div class="card ${unlocked ? '' : 'gold'}"><div class="label">${t('naam.report')}</div><p class="small">${t('naam.reportIntro')}</p>
    ${unlocked ? `<button class="btn btn-gold" id="n-report">📄 ${t('naam.openReport')}</button>${ent?.entitlement.sku === 'family_annual' ? `<p class="small muted"><a href="#" id="n-manage">${t('settings.manageSub')}</a></p>` : ''}` : prod ? `<div class="row" style="border:0;gap:8px;flex-wrap:wrap;justify-content:flex-start"><button class="btn btn-gold btn-small" id="n-buy">${t('naam.buy', { price: formatPrice(prod) })}</button>${fam ? `<button class="btn btn-outline btn-small" id="n-buy-fam">${t('report.buyFamily', { price: formatPrice(fam) })}</button>` : ''}<button class="btn btn-outline btn-small" id="n-restore">${t('report.restore')}</button></div><p class="small muted">${t('report.playNote')}</p>` : `<p class="small muted">${t('naam.locked')}</p>`}</div>`;
  slot.querySelector('#n-report')?.addEventListener('click', () => { c.onFirstFullRender?.(naamKey(form)); renderReport(form, r, c); });
  slot.querySelector('#n-buy')?.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement; b.disabled = true;
    try { await purchase('naam_report'); c.toast(t('report.unlocked')); renderResult(out, form, r, c); }
    catch (err: any) { b.disabled = false; if (!(err instanceof PurchaseError && err.code === 'cancelled')) c.toast(t('report.buyFailed', { err: String(err?.code ?? err?.message ?? 'error') })); }
  });
  slot.querySelector('#n-manage')?.addEventListener('click', e => { e.preventDefault(); openManageSubscriptions(); });
  slot.querySelector('#n-buy-fam')?.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement; b.disabled = true;
    try { await purchase('family_annual'); c.toast(t('report.unlocked')); renderResult(out, form, r, c); }
    catch (err: any) { b.disabled = false; if (!(err instanceof PurchaseError && err.code === 'cancelled')) c.toast(t('report.buyFailed', { err: String(err?.code ?? err?.message ?? 'error') })); }
  });
  slot.querySelector('#n-restore')?.addEventListener('click', async () => { const n = await restorePurchases(); c.toast(t('report.restored', { n: String(n) })); if (n) renderResult(out, form, r, c); });
}

// ---- Welcome card: 1080x1350 PNG drawn on a canvas, shared with navigator.share or downloaded ----
function renderCard(host: HTMLElement, form: Form, x: any, n: any, c: NaamCtx) {
  const { t, esc } = c;
  const script = c.lang === 'gu' ? n.gu : n.hi;
  host.innerHTML = `<div class="card"><div class="label">${t('naam.card')}</div><canvas id="n-canvas" width="1080" height="1350" style="width:100%;height:auto;border-radius:12px;display:block"></canvas>
    <div class="row" style="border:0;gap:8px;justify-content:flex-start;margin-top:10px"><button class="btn btn-gold btn-small" id="n-share">${t('naam.share')}</button><button class="btn btn-outline btn-small" id="n-dl">${t('naam.download')}</button></div></div>`;
  const cv = host.querySelector('#n-canvas') as HTMLCanvasElement; const g = cv.getContext('2d')!;
  const draw = (img: HTMLImageElement | null) => {
    const W = 1080, H = 1350;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#FFFDF8'); bg.addColorStop(1, '#F3E7CF'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#BC8B2C'; g.lineWidth = 3; g.strokeRect(40, 40, W - 80, H - 80); g.lineWidth = 1; g.strokeRect(56, 56, W - 112, H - 112);
    if (img) { g.save(); g.beginPath(); g.arc(W / 2, 300, 150, 0, Math.PI * 2); g.clip(); g.drawImage(img, W / 2 - 150, 150, 300, 300); g.restore(); }
    g.textAlign = 'center'; g.fillStyle = '#946916'; g.font = '500 30px "DM Sans", sans-serif'; g.fillText(t('naam.welcome', { name: '' }).replace(/[,，]\s*$/, '').toUpperCase(), W / 2, 540);
    g.fillStyle = '#251C30'; g.font = '600 120px "Cormorant Garamond", "Noto Serif Devanagari", serif'; g.fillText(n.en, W / 2, 690);
    g.font = '500 72px "Noto Serif Devanagari", "Noto Sans Gujarati", serif'; g.fillStyle = '#7E2D3D'; g.fillText(script, W / 2, 800);
    g.fillStyle = '#6C604E'; g.font = 'italic 36px "Cormorant Garamond", serif'; g.fillText(n.m, W / 2, 870);
    g.fillStyle = '#251C30'; g.font = '34px "DM Sans", sans-serif';
    const syl = x.syllable; const sylStr = syl ? ` · ${c.lang === 'gu' ? syl.gu : syl.deva} (${syl.latin})` : '';
    g.fillText(t('naam.cardLine', { nakshatra: x.nakshatraLabel, pada: x.pada, rashi: x.rashiLabel }) + sylStr, W / 2, 980);
    g.fillStyle = '#6C604E'; g.font = '30px "DM Sans", sans-serif'; g.fillText(t('naam.born', { date: c.fmtDate(form.date), city: form.city.name }), W / 2, 1040);
    g.fillStyle = '#946916'; g.font = '500 24px "DM Sans", sans-serif'; g.fillText('ShubhDate · shubhdate.sakredstudio.ca', W / 2, 1250);
  };
  const img = new Image(); img.src = `${c.base}icons/icon-512.png`;
  img.onload = () => draw(img); img.onerror = () => draw(null);
  (document as any).fonts?.ready.then(() => draw(img.complete && img.naturalWidth ? img : null));
  const blob = () => new Promise<Blob>((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('canvas')), 'image/png'));
  const fileName = `welcome-${n.en.toLowerCase()}.png`;
  host.querySelector('#n-share')!.addEventListener('click', async () => {
    try {
      const b = await blob(); const file = new File([b], fileName, { type: 'image/png' });
      const nav: any = navigator;
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) await nav.share({ files: [file], title: t('naam.welcome', { name: n.en }) });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fileName; a.click(); c.toast(t('naam.shared')); }
    } catch { /* cancelled */ }
  });
  host.querySelector('#n-dl')!.addEventListener('click', async () => { const b = await blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fileName; a.click(); c.toast(t('naam.shared')); });
  void esc;
}

// ---- The paid report: the same slide deck as every other paid report (report-shell.ts) ----
function renderReport(form: Form, r: any, c: NaamCtx) {
  const { t, esc } = c;
  loadReportFonts();
  const view = document.getElementById('view')!;
  const deck = reportDeck({ base: c.base, brand: `ShubhDate · ${esc(t('naam.reportTitle'))}`, subject: esc(form.city.name), note: esc(t('naam.privacy')) });
  const genAt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: form.city.tz }).format(new Date());
  const cover = deck.cover({
    kicker: esc(t('naam.reportTitle')), title: esc(t('naam.title')),
    facts: [
      [t('report.cover.city'), esc(form.city.name)],
      [t('naam.dob'), esc(c.fmtDate(form.date))],
      [t('naam.tob'), esc(form.time || t('naam.timeUnknown'))],
      [t('naam.janma'), r.candidates.map((x: any) => `${esc(x.nakshatraLabel)} · ${t('naam.pada')} ${x.pada}`).join(' / ')],
    ],
    fine: `${t('report.cover.generated')} ${esc(genAt)} · ShubhDate v${esc(r.engineVersion)}`,
    note: t('report.cover.onDevice'),
  });
  // One slide per janma candidate: the reading on the left, the names on the right.
  const nameTable = (title: string, rows: any[]) => rows.length ? `<div class="rp-block">${heading(title)}<table class="rp-table"><tbody>${rows.map((n: any) => `<tr><td><b>${esc(n.en)}</b></td><td class="rp-deva">${esc(n.hi)}</td><td>${esc(n.gu)}</td><td class="rp-muted">${esc(n.m)}</td></tr>`).join('')}</tbody></table></div>` : '';
  const cands = r.candidates.map((x: any) => deck.slide('rp-s-naam', `<div class="rp-cols">
      <div class="rp-col top">
        ${slideTitle(`${esc(x.nakshatraLabel)} · ${t('naam.pada')} ${x.pada}`)}
        <div>${kv(t('naam.rashi'), esc(x.rashiLabel))}${kv(t('naam.lord'), esc(x.lord))}${kv(t('naam.deity'), esc(x.deity))}${kv(t('naam.moonAt'), `${x.moonLongitude.toFixed(4)}° (Lahiri)`)}</div>
        ${x.gandMool ? `<p class="rp-small">⚠ ${t('naam.gandMool')}</p>` : ''}
        <div class="rp-block">${label(t('naam.syllables'))}<div class="naam-sylrow">${x.syllables.map((s: any, i: number) => `<span class="${i + 1 === x.pada ? 'cur' : ''}">${sylHtml(s, c.lang)}</span>`).join('')}</div></div>
      </div>
      <div class="rp-col top w125">${nameTable(t('naam.boys'), x.names.boys)}${nameTable(t('naam.girls'), x.names.girls)}${x.names.boys.length + x.names.girls.length ? '' : `<p class="rp-small rp-muted">${t('naam.noNames')}</p>`}</div>
    </div>`, t('naam.janma'))).join('');
  // Ceremony dates, two to a slide (each keeps the reasons for its best window).
  const dayHtml = (d: any) => `<div class="rp-day"><div class="rp-dc-rank"><span class="rp-dc-time">${esc(c.fmtDate(d.date))}</span><span class="rp-small rp-muted">${t('naam.score')} ${d.score}</span></div>
      <div class="rp-small rp-muted">${esc(d.headline)}</div>
      ${d.windows.map((w: any, i: number) => `<div><b>${c.fmtTime(w.start, form.city.tz)}–${c.fmtTime(w.end, form.city.tz)}</b>${w.choghadiya ? ` · ${esc(w.choghadiya)}` : ''}</div>${i === 0 && w.keep?.length ? list(w.keep.map(esc), 'keep') : ''}`).join('')}</div>`;
  const dayGroups = chunk(r.days as any[], 2);
  const days = dayGroups.map((g, i) => deck.slide('rp-s-naamdays', `${slideTitle(t('naam.muhurta'), i === 0 ? t('naam.muhurtaNote') : undefined)}<div class="rp-daygrid">${g.map(dayHtml).join('')}</div>`, dayGroups.length > 1 ? `${esc(form.city.name)} · ${i + 1} / ${dayGroups.length}` : undefined)).join('');
  const sources = deck.slide('rp-s-sources', `${slideTitle(t('naam.sourcesPage'))}${list(r.sources.map((s: string) => esc(humanSource(s))))}${list((r.caveats ?? []).map(esc))}`);
  mountReport(view, reportToolbar({ backHref: '#/naam', back: t('report.back'), title: t('naam.reportTitle'), download: t('report.download') }), c.lang, `${cover}${cands}${days}${sources}`);
  // The report replaces the Naam screen in place, so "back" has no route change to ride on: rebuild the screen.
  view.querySelector('#rp-back')?.addEventListener('click', (e) => { e.preventDefault(); closeReport(); renderNaam(view, c); window.scrollTo(0, 0); });
  window.scrollTo(0, 0);
}
