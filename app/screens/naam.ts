// Namakarana screen (#/naam): birth date/time/city -> janma nakshatra + pada, naming syllables, curated names,
// shareable "Welcome, {name}" card, naming-ceremony dates, and a printable report gated by the naam_report credit
// (Play Billing inside the TWA; the web shows the preview and explains). Birth details stay on this device.
import { humanSource } from '../format.ts';
import { isPlayBillingAvailable, listProducts, purchase, restorePurchases, formatPrice, PurchaseError } from '../billing.ts';
import { loadReportFonts } from './report.ts';

export interface NaamCity { name: string; lat: number; lon: number; tz: string; region?: string }
export interface NaamCtx {
  t: (k: string, p?: Record<string, string | number>) => string;
  lang: string; region: string; base: string; city: NaamCity;
  esc: (s: any) => string; fmtTime: (iso: string | null | undefined, zone?: string) => string; fmtDate: (iso: string) => string;
  scoreRing: (n: number) => string; toast: (m: string) => void;
  call: (op: string, args: any) => Promise<any>;
  pickCity: (onPick: (c: NaamCity) => void) => void;
  isUnlocked: () => Promise<boolean>; onFirstFullRender?: (key: string) => void;
}
interface Form { date: string; time: string | null; city: NaamCity; gender: 'boy' | 'girl' | 'any'; }
const FORM_KEY = 'shubhdate.naam';
function loadForm(): Form | null { try { return JSON.parse(localStorage.getItem(FORM_KEY) || 'null'); } catch { return null; } }
function saveForm(f: Form) { localStorage.setItem(FORM_KEY, JSON.stringify(f)); }
export const naamKey = (f: Form) => `naam|${f.date}|${f.time ?? 'x'}|${f.city.lat.toFixed(2)},${f.city.lon.toFixed(2)}`;

let last: { form: Form; r: any } | null = null;
export function lastNaamForm(): Form | null { return last?.form ?? loadForm(); }

export async function renderNaam(view: HTMLElement, c: NaamCtx) {
  const { t, esc } = c;
  const f: Form = loadForm() ?? { date: '', time: '', city: c.city, gender: 'any' };
  let city = f.city;
  view.innerHTML = `<h1>${t('naam.title')}</h1><p class="muted small">${t('naam.intro')}</p>
  <div class="card">
    <div class="grid2"><div class="field"><label>${t('naam.dob')}</label><input id="n-date" type="date" value="${esc(f.date)}"></div><div class="field"><label>${t('naam.tob')}</label><input id="n-time" type="time" value="${esc(f.time ?? '')}" ${f.time === null ? 'disabled' : ''}></div></div>
    <div class="toggle"><span>${t('naam.timeUnknown')}</span><div class="switch ${f.time === null ? 'on' : ''}" id="n-unk"></div></div>
    <div class="field"><label>${t('naam.city')}</label><button class="btn btn-outline" id="n-city" type="button">${esc(city.name)}${city.region ? ` · ${esc(city.region)}` : ''}</button></div>
    <div class="field"><label>${t('naam.gender')}</label><select id="n-gender">${(['any', 'boy', 'girl'] as const).map(g => `<option value="${g}" ${f.gender === g ? 'selected' : ''}>${t('naam.' + g)}</option>`).join('')}</select></div>
    <p class="small muted">🔒 ${t('naam.privacy')}</p>
    <button class="btn btn-gold" id="n-go">✦ ${t('naam.go')}</button>
  </div>
  <div id="n-out">${last && last.form.date === f.date ? '' : ''}</div>`;
  const unk = view.querySelector('#n-unk') as HTMLElement, timeEl = view.querySelector('#n-time') as HTMLInputElement;
  unk.addEventListener('click', () => { unk.classList.toggle('on'); timeEl.disabled = unk.classList.contains('on'); });
  view.querySelector('#n-city')!.addEventListener('click', () => c.pickCity(ci => { city = ci; (view.querySelector('#n-city') as HTMLElement).textContent = `${ci.name}${ci.region ? ` · ${ci.region}` : ''}`; }));
  const run = async () => {
    const date = (view.querySelector('#n-date') as HTMLInputElement).value; if (!date) return c.toast(t('naam.noBirth'));
    const form: Form = { date, time: unk.classList.contains('on') ? null : (timeEl.value || null), city, gender: (view.querySelector('#n-gender') as HTMLSelectElement).value as Form['gender'] };
    saveForm(form);
    const out = view.querySelector('#n-out')!; out.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    try {
      const r = await c.call('naam', { req: { birth: { date: form.date, time: form.time, place: { name: form.city.name, lat: form.city.lat, lon: form.city.lon, tz: form.city.tz } }, gender: form.gender, region: c.region === 'west' || c.region === 'south' ? c.region : 'north' }, lang: c.lang });
      last = { form, r }; renderResult(out as HTMLElement, form, r, c);
    } catch (e: any) { out.innerHTML = `<div class="card">Error: ${esc(e.message)}</div>`; }
  };
  view.querySelector('#n-go')!.addEventListener('click', run);
  if (last) { renderResult(view.querySelector('#n-out') as HTMLElement, last.form, last.r, c); }
  else if (f.date) run();
}

function sylHtml(s: any, lang: string, big = false) {
  const script = lang === 'gu' ? s.gu : s.deva;
  return `<span class="naam-syl ${big ? 'big' : ''}"><b>${script}</b><span>${s.latin}</span>${s.alt ? `<span class="muted">/ ${lang === 'gu' ? s.alt.gu : s.alt.deva} ${s.alt.latin}</span>` : ''}</span>`;
}

async function renderResult(out: HTMLElement, form: Form, r: any, c: NaamCtx) {
  const { t, esc } = c;
  const nameOf = (n: any) => c.lang === 'gu' ? n.gu : c.lang === 'hi' ? n.hi : n.en;
  const nameList = (list: any[], gender: string) => list.length ? `<div class="naam-names">${list.map((n, i) => `<button class="naam-name" data-g="${gender}" data-i="${i}"><b>${esc(nameOf(n))}</b><span class="small">${esc(c.lang === 'en' || c.lang === 'hinglish' ? n.hi : n.en)}</span><span class="small muted">${esc(n.m)}</span></button>`).join('')}</div>` : '';
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
    <div class="naam-sylrow">${x.syllables.map((s: any, i: number) => `<span class="${i + 1 === x.pada ? 'cur' : ''}">${sylHtml(s, c.lang)}</span>`).join('')}</div>
    <div class="label mt">${t('naam.names', { s: `${c.lang === 'gu' ? x.syllable.gu : x.syllable.deva} ${x.syllable.latin}` })}</div>
    ${x.names.boys.length || x.names.girls.length ? `<p class="small muted">${t('naam.pick')}</p>${x.names.boys.length ? `<div class="label small">${t('naam.boys')}</div>${nameList(x.names.boys, 'boys')}` : ''}${x.names.girls.length ? `<div class="label small">${t('naam.girls')}</div>${nameList(x.names.girls, 'girls')}` : ''}` : `<p class="small muted">${t('naam.noNames')}</p>`}
  </div>`;
  const days = `<div class="card"><div class="label">${t('naam.muhurta')}</div><p class="small muted">${t('naam.muhurtaNote')}</p>
    ${r.days.slice(0, 5).map((d: any) => `<div class="list-item"><div class="body"><div class="title"><b>${esc(c.fmtDate(d.date))}</b> <span class="small muted">· ${esc(d.headline)}</span></div><div class="sub">${d.windows.slice(0, 2).map((w: any) => `${c.fmtTime(w.start, form.city.tz)}–${c.fmtTime(w.end, form.city.tz)}${w.choghadiya ? ` · ${esc(w.choghadiya)}` : ''}`).join(' · ')}</div></div>${c.scoreRing(d.score)}</div>`).join('')}
    ${r.days.length ? '' : `<p class="small muted">—</p>`}</div>`;
  const unlocked = await c.isUnlocked();
  let products: any[] = [];
  if (!unlocked) { try { if (await isPlayBillingAvailable()) products = await listProducts(); } catch { products = []; } }
  const prod = products.find(p => p.itemId === 'naam_report');
  const reportCard = `<div class="card ${unlocked ? '' : 'gold'}"><div class="label">${t('naam.report')}</div><p class="small">${t('naam.reportIntro')}</p>
    ${unlocked ? `<button class="btn btn-gold" id="n-report">📄 ${t('naam.openReport')}</button>` : prod ? `<div class="row" style="border:0;gap:8px;flex-wrap:wrap;justify-content:flex-start"><button class="btn btn-gold btn-small" id="n-buy">${t('naam.buy', { price: formatPrice(prod) })}</button><button class="btn btn-outline btn-small" id="n-restore">${t('report.restore')}</button></div><p class="small muted">${t('report.playNote')}</p>` : `<p class="small muted">${t('naam.locked')}</p>`}</div>`;
  out.innerHTML = `${r.janma.ambiguous ? `<div class="banner">${t('naam.ambiguous')}</div>` : ''}${r.candidates.map(cand).join('')}<div id="n-card"></div>${days}${reportCard}<p class="small dim">${r.sources.map((s: string) => esc(humanSource(s))).join(' · ')}</p>`;

  out.querySelectorAll<HTMLButtonElement>('.naam-name').forEach(btn => btn.addEventListener('click', () => {
    const card = btn.closest('.card')!; const idx = [...out.querySelectorAll('.card')].indexOf(card); const x = r.candidates[Math.max(0, idx)] ?? r.candidates[0];
    const n = x.names[btn.dataset.g!][Number(btn.dataset.i)];
    renderCard(out.querySelector('#n-card') as HTMLElement, form, x, n, c);
    (out.querySelector('#n-card') as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  out.querySelector('#n-report')?.addEventListener('click', () => { c.onFirstFullRender?.(naamKey(form)); renderReport(form, r, c); });
  out.querySelector('#n-buy')?.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement; b.disabled = true;
    try { await purchase('naam_report'); c.toast(t('report.unlocked')); renderResult(out, form, r, c); }
    catch (err: any) { b.disabled = false; if (!(err instanceof PurchaseError && err.code === 'cancelled')) c.toast(t('report.buyFailed', { err: String(err?.code ?? err?.message ?? 'error') })); }
  });
  out.querySelector('#n-restore')?.addEventListener('click', async () => { const n = await restorePurchases(); c.toast(t('report.restored', { n: String(n) })); if (n) renderResult(out, form, r, c); });
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
    g.fillText(t('naam.cardLine', { nakshatra: x.nakshatraLabel, pada: x.pada, rashi: x.rashiLabel }), W / 2, 980);
    g.fillStyle = '#6C604E'; g.font = '30px "DM Sans", sans-serif'; g.fillText(t('naam.born', { date: c.fmtDate(form.date), city: form.city.name }), W / 2, 1040);
    g.fillStyle = '#946916'; g.font = '500 24px "DM Sans", sans-serif'; g.fillText('ShubhDate · sakredstudio.github.io/subhdate', W / 2, 1250);
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

// ---- Printable report (A4 pages, reuses report.css) ----
function renderReport(form: Form, r: any, c: NaamCtx) {
  const { t, esc } = c;
  loadReportFonts();
  const view = document.getElementById('view')!;
  const page = (cls: string, body: string) => `<section class="rp-page ${cls}"><div class="rp-head">ShubhDate · ${esc(t('naam.reportTitle'))}</div>${body}<div class="rp-foot">ShubhDate engine v${esc(r.engineVersion)} · MIT · ${esc(form.city.name)}</div></section>`;
  const row = (k: string, v: string) => `<div class="rp-row"><span class="rp-k">${k}</span><span class="rp-v">${v}</span></div>`;
  const nameRows = (list: any[]) => list.map((n: any) => `<tr><td><b>${esc(n.en)}</b></td><td class="rp-deva">${esc(n.hi)}</td><td>${esc(n.gu)}</td><td class="small">${esc(n.m)}</td></tr>`).join('');
  const cands = r.candidates.map((x: any) => page('rp-naam', `<h2>${esc(x.nakshatraLabel)} · ${t('naam.pada')} ${x.pada}</h2>
    ${row(t('naam.rashi'), esc(x.rashiLabel))}${row(t('naam.lord'), esc(x.lord))}${row(t('naam.deity'), esc(x.deity))}${row(t('naam.moonAt'), `${x.moonLongitude.toFixed(4)}° (Lahiri)`)}
    ${x.gandMool ? `<p class="small">⚠ ${t('naam.gandMool')}</p>` : ''}
    <h3>${t('naam.syllables')}</h3><div class="naam-sylrow">${x.syllables.map((s: any, i: number) => `<span class="${i + 1 === x.pada ? 'cur' : ''}">${sylHtml(s, c.lang)}</span>`).join('')}</div>
    ${x.names.boys.length ? `<h3>${t('naam.boys')}</h3><table class="rp-table"><tbody>${nameRows(x.names.boys)}</tbody></table>` : ''}
    ${x.names.girls.length ? `<h3>${t('naam.girls')}</h3><table class="rp-table"><tbody>${nameRows(x.names.girls)}</tbody></table>` : ''}`)).join('');
  const days = page('rp-naam-days', `<h2>${t('naam.muhurta')}</h2><p class="small muted">${t('naam.muhurtaNote')}</p>
    ${r.days.map((d: any) => `<div class="rp-window"><div class="rp-wtime">${esc(c.fmtDate(d.date))} <span class="small muted">· ${t('naam.score')} ${d.score}</span></div><div class="small muted">${esc(d.headline)}</div>
      ${d.windows.map((w: any) => `<div class="small"><b>${c.fmtTime(w.start, form.city.tz)}–${c.fmtTime(w.end, form.city.tz)}</b>${w.choghadiya ? ` · ${esc(w.choghadiya)}` : ''}${w.keep?.length ? `<ul class="reasons">${w.keep.map((k: string) => `<li class="keep">${esc(k)}</li>`).join('')}</ul>` : ''}</div>`).join('')}
      ${d.summary ? `<p class="small">${esc(d.summary)}</p>` : ''}</div>`).join('')}`);
  const sources = page('rp-sources', `<h2>${t('naam.sourcesPage')}</h2><ul class="reasons">${r.sources.map((s: string) => `<li>${esc(humanSource(s))}</li>`).join('')}</ul><ul class="reasons">${(r.caveats ?? []).map((s: string) => `<li>${esc(s)}</li>`).join('')}</ul>`);
  const cover = page('rp-cover', `<div class="rp-kicker">ShubhDate · ${esc(t('naam.reportTitle'))}</div><h1 class="rp-title">${esc(t('naam.title'))}</h1><p class="rp-sub">${esc(t('naam.born', { date: c.fmtDate(form.date), city: form.city.name }))}${form.time ? ` · ${esc(form.time)}` : ''}</p><p class="rp-ondevice">${t('naam.privacy')}</p>`);
  view.innerHTML = `<div class="rp-toolbar"><a href="#/naam" class="small">‹ ${t('report.back')}</a><h1>${t('naam.reportTitle')}</h1>
    <div class="row" style="border:0;gap:8px;justify-content:flex-start"><button class="btn btn-gold btn-small" id="rp-print">⬇ ${t('report.download')}</button></div></div>
    <div class="report" lang="${c.lang === 'hinglish' ? 'en' : c.lang}">${cover}${cands}${days}${sources}</div>`;
  view.querySelector('#rp-print')!.addEventListener('click', async () => { await (document as any).fonts?.ready; window.print(); });
  window.scrollTo(0, 0);
}
