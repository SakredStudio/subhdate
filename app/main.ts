// ShubhDate app shell: hash router, settings, screens. Vanilla ES modules; engine runs in a Web Worker.
import UI from '../i18n/ui.json' with { type: 'json' };
import { CITIES, searchCities, nearestCity, type City } from './cities.ts';
import { call, dayCached, abandonPending } from './engine-client.ts';
import { db, type SavedItem } from './db.ts';
import { aboutHtml, privacyHtml } from './screens/about.ts';
import { WAITLIST_URL, IS_PLACEHOLDER } from './config.ts';
import { renderReport } from './screens/report.ts';
import { renderNaam } from './screens/naam.ts';
import { humanSource } from './format.ts';
import { isEntitled, useStore, consumeReport } from './entitlement.ts';
import { refreshIfStale, restorePurchases, isPlayBillingAvailable, forgetDevice, openManageSubscriptions } from './billing.ts';
import { loadEntitlement } from './entitlement.ts';
import { pushAvailable, enableReminders, disableReminders, remindersOn } from './push.ts';
import './report.css';
const ENGINE_VERSION = '0.1.0';
const BASE = import.meta.env.BASE_URL;

type Lang = 'en' | 'hi' | 'hinglish' | 'gu' | 'mr' | 'ta' | 'te' | 'bn' | 'kn';
interface Birth { date: string; time: string | null; city: City; }
interface Settings { lang: Lang; region: 'north' | 'west' | 'south' | 'east' | 'diaspora'; monthSystem: 'amanta' | 'purnimanta'; sunrise: 'limb' | 'center'; abhijitWed: boolean; city: City; birth: Birth | null; sankalpaScript: 'deva' | 'iast'; onboarded: boolean; theme: 'paper' | 'night'; }

const DEFAULT_CITY = CITIES[0];
function loadSettings(): Settings {
  try { const s = JSON.parse(localStorage.getItem('shubhdate.settings') || 'null'); if (s && s.city) return { ...defaults(), ...s }; } catch { /* ignore */ }
  return defaults();
}
function defaults(): Settings {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const guess = CITIES.find(c => c.tz === tz) ?? DEFAULT_CITY;
  const lang = (navigator.language || 'en').startsWith('hi') ? 'hi' : (navigator.language || '').startsWith('gu') ? 'gu' : 'en';
  return { lang: lang as Lang, region: tz === 'Asia/Kolkata' ? 'north' : 'diaspora', monthSystem: tz === 'Asia/Kolkata' ? 'purnimanta' : 'purnimanta', sunrise: 'limb', abhijitWed: false, city: guess, birth: null, sankalpaScript: 'deva', onboarded: false, theme: 'paper' };
}
let S = loadSettings();
function saveSettings() { localStorage.setItem('shubhdate.settings', JSON.stringify(S)); }
function applyTheme() {
  const night = S.theme === 'night';
  if (night) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
  const meta = document.getElementById('theme-color') as HTMLMetaElement | null; if (meta) meta.content = night ? '#0B1020' : '#F7F0E3';
}
applyTheme();

const U = UI as any;
export function t(key: string, params?: Record<string, string | number>): string {
  let s = U[S.lang]?.[key] ?? U.en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  return s;
}
const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const tz = () => S.city.tz;
const fmtTime = (iso: string | null | undefined, zone = tz()) => iso ? new Intl.DateTimeFormat(S.lang === 'en' ? 'en-GB' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone }).format(new Date(iso)) : '—';
const fmtTimeD = (iso: string | null | undefined, ref: string, zone = tz()) => { if (!iso) return '—'; const d = new Date(iso); const day = new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(d); const diff = Math.round((Date.parse(day) - Date.parse(ref)) / 86400000); return fmtTime(iso, zone) + (diff > 0 ? ' (+' + diff + ')' : diff < 0 ? ' (' + diff + ')' : ''); };
const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Intl.DateTimeFormat(S.lang === 'hi' || S.lang === 'mr' ? 'hi-IN' : S.lang === 'gu' ? 'gu-IN' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(Date.UTC(y, m - 1, d, 12))); };
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: tz() }).format(new Date());
const addIso = (iso: string, days: number) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10); };
const place = () => ({ name: S.city.name, lat: S.city.lat, lon: S.city.lon, tz: S.city.tz });
const engineOpts = () => ({ sunrise: S.sunrise, region: S.region, monthSystem: S.monthSystem });
const birthReq = () => S.birth ? { date: S.birth.date, time: S.birth.time, place: { name: S.birth.city.name, lat: S.birth.city.lat, lon: S.birth.city.lon, tz: S.birth.city.tz } } : null;

const view = document.getElementById('view')!;
function toast(msg: string) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), 1800); }
function sheet(html: string, onMount?: (root: HTMLElement) => void) {
  const root = document.getElementById('sheet-root')!;
  root.innerHTML = `<div class="sheet-scrim" data-close></div><div class="sheet" role="dialog"><div class="handle"></div>${html}</div>`;
  root.querySelector('[data-close]')!.addEventListener('click', closeSheet);
  onMount?.(root.querySelector('.sheet') as HTMLElement);
}
function closeSheet() { document.getElementById('sheet-root')!.innerHTML = ''; }
function scoreRing(score: number) { const r = 24, c = 2 * Math.PI * r; return `<svg class="score" viewBox="0 0 56 56"><circle class="track" cx="28" cy="28" r="${r}" fill="none" stroke-width="3"/><circle class="fill" cx="28" cy="28" r="${r}" fill="none" stroke-width="3" stroke-dasharray="${(score / 100 * c).toFixed(1)} ${c.toFixed(1)}"/><text x="28" y="33" text-anchor="middle">${score}</text></svg>`; }
const heroArt = `<picture><source srcset="${BASE}hero.webp" type="image/webp"><img class="hero-art" src="${BASE}hero.png" width="180" height="180" alt="" aria-hidden="true"></picture>`;
const mandala = `<svg class="mandala" viewBox="0 0 120 120" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1"><circle cx="60" cy="60" r="56" opacity=".5"/><circle cx="60" cy="60" r="46" opacity=".6"/><circle cx="60" cy="60" r="34" opacity=".5"/><circle cx="60" cy="60" r="22" opacity=".6"/><circle cx="60" cy="60" r="10" opacity=".5"/>${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<line x1="${60 + 22 * Math.cos(a)}" y1="${60 + 22 * Math.sin(a)}" x2="${60 + 56 * Math.cos(a)}" y2="${60 + 56 * Math.sin(a)}" opacity=".5"/><circle cx="${60 + 56 * Math.cos(a)}" cy="${60 + 56 * Math.sin(a)}" r="2" fill="currentColor" stroke="none"/>`; }).join('')}${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4 + Math.PI / 8; const x = 60 + 28 * Math.cos(a), y = 60 + 28 * Math.sin(a); return `<path d="M${x} ${y - 7} L${x + 5} ${y} L${x} ${y + 7} L${x - 5} ${y} Z" opacity=".7"/>`; }).join('')}</g><circle cx="60" cy="60" r="3.5" fill="currentColor" opacity=".8"/></svg>`;

// ---------- City picker ----------
function cityPicker(onPick: (c: City) => void) {
  sheet(`<h3>${t('city.search')}</h3><p class="small muted">${t('city.hint')}</p><div class="field"><input id="city-q" type="search" autocomplete="off" placeholder="${t('city.search')}"></div><button class="btn btn-outline btn-small" id="city-locate">📍 ${t('settings.locate')}</button><div id="city-list" class="mt"></div>`, root => {
    const q = root.querySelector('#city-q') as HTMLInputElement; const list = root.querySelector('#city-list')!;
    const render = () => { list.innerHTML = searchCities(q.value).map((c, i) => `<div class="list-item" data-i="${i}"><div class="body"><div class="title">${esc(c.name)}</div><div class="sub">${esc(c.region)} · ${esc(c.tz)}</div></div><span class="chev">›</span></div>`).join(''); list.querySelectorAll('.list-item').forEach(el => el.addEventListener('click', () => { onPick(searchCities(q.value)[Number((el as HTMLElement).dataset.i)]); closeSheet(); })); };
    q.addEventListener('input', render); render(); q.focus();
    root.querySelector('#city-locate')!.addEventListener('click', () => {
      if (!navigator.geolocation) return toast('No geolocation');
      navigator.geolocation.getCurrentPosition(pos => { const near = nearestCity(pos.coords.latitude, pos.coords.longitude); const c: City = { ...near, name: near.name, lat: pos.coords.latitude, lon: pos.coords.longitude, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || near.tz }; onPick(c); closeSheet(); }, () => toast('Location unavailable'));
    });
  });
}
function setCity(c: City) { S.city = c; if (c.tz !== 'Asia/Kolkata' && S.region !== 'diaspora') { /* keep tradition, place changes */ } saveSettings(); updateChrome(); route(); }

// ---------- Today ----------
let todayDate = todayIso();
let festCache: { key: string; list: any[] } | null = null;
async function festivalsFor(from: string, to: string) {
  const key = `${from}|${to}|${S.city.lat}|${S.city.lon}|${S.region}|${S.lang}`;
  if (festCache?.key === key) return festCache.list;
  const list = await call('festivals', { from, to, place: place(), opts: { region: S.region }, lang: S.lang });
  festCache = { key, list }; return list;
}
async function renderToday() {
  const seq = navSeq;
  const date = todayDate;
  view.innerHTML = `<div class="hero">${heroArt}<h1>${esc(fmtDate(date))}</h1><p class="muted small">${esc(S.city.name)}</p></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`;
  let d: any;
  try { d = await dayCached(date, place(), engineOpts(), S.lang, birthReq()); } catch (e: any) { if (isStale(seq)) return; view.innerHTML = `<div class="card">Error: ${esc(e.message)}</div>`; return; }
  if (isStale(seq)) return;
  const fests = await festivalsFor(addIso(date, -1), addIso(date, 1)).catch(() => []);
  if (isStale(seq)) return;
  const todayFests = fests.filter((f: any) => f.date === date);
  const now = Date.now();
  const inWin = (w: any) => w && now >= new Date(w.start).getTime() && now < new Date(w.end).getTime();
  const span = (list: any[], labelKey: string) => list.map((x, i) => `${i ? `<span class="dim">${t('today.then')}</span> ` : ''}<b>${esc(x.label)}</b> <span class="muted">${t('today.till')} ${fmtTimeD(x.end, date)}${x.kshaya ? ' ·' + ' kshaya' : ''}</span>`).join('<br>');
  const masa = S.monthSystem === 'amanta' ? d.masa.amanta : d.masa.purnimanta;
  const other = S.monthSystem === 'amanta' ? d.masa.purnimanta : d.masa.amanta;
  const chog = (list: any[]) => `<div class="strip">${list.map(c => `<div class="chog ${c.quality} ${inWin(c) ? 'now' : ''}"><div class="n">${esc(c.label)}${inWin(c) ? ` · ${t('today.now')}` : ''}</div><div class="t">${fmtTime(c.start)}–${fmtTime(c.end)}</div></div>`).join('')}</div>`;
  const win = (w: any) => w ? `${fmtTime(w.start)}–${fmtTime(w.end)}` : '—';
  const flagsHtml = d.flags.filter((f: any) => f.id !== 'rahu_kaal' && f.id !== 'yamaganda' && f.id !== 'gulika' && f.id !== 'durmuhurta' && f.id !== 'varjyam' && f.id !== 'amrit_kaal' && f.id !== 'abhijit' && f.id !== 'brahma_muhurta' && f.id !== 'pradosha').map((f: any) => `<div class="row"><span class="k"><span class="pill ${f.kind === 'auspicious' ? 'good' : f.kind === 'inauspicious' ? 'avoid' : 'info'}">${esc(f.id.replace(/_/g, ' '))}</span></span><span class="v small">${esc(f.text)}${f.window ? `<br><span class="muted">${fmtTimeD(f.window.start, date)}–${fmtTimeD(f.window.end, date)}</span>` : ''}</span></div>`).join('') || `<p class="muted small">—</p>`;
  const isDiaspora = S.city.tz !== 'Asia/Kolkata';
  const sank = d.sankalpa;
  const bala = d.personal ? `<div class="card"><div class="label">${t('today.yourBala')}</div>${d.personal.atSunrise.map((a: any, i: number) => `<div class="row"><span class="k">${esc(d.personal.candidates[i].nakshatra)} · ${esc(d.personal.candidates[i].rashi)}</span><span class="v"><span class="pill ${a.tara.good ? 'good' : 'avoid'}">${t('today.tara')} ${a.tara.tara} ${esc(a.tara.name)}</span><span class="pill ${a.chandra.quality === 'good' ? 'good' : a.chandra.quality === 'avoid' ? 'avoid' : 'info'}">${t('today.chandra')} ${a.chandra.house} · ${t('today.' + (a.chandra.quality === 'weak' ? 'weak' : a.chandra.quality === 'good' ? 'good' : 'bad'))}${a.chandra.chandrashtama ? ' · Chandrashtama' : ''}</span></span></div>`).join('')}${d.personal.ambiguous ? `<p class="small muted">${esc(U.en['settings.timeUnknown'])}: ${d.personal.candidates.length} candidates.</p>` : ''}</div>` : '';
  view.innerHTML = `
  <div class="hero">${heroArt}<h1>${esc(fmtDate(date))}</h1><p class="muted small">${esc(d.vara.label)} · ${esc(S.city.name)}</p>
    <div class="row" style="justify-content:center;gap:8px;border:0"><button class="btn btn-outline btn-small" id="prev">‹ ${t('today.prev')}</button><button class="btn btn-outline btn-small" id="tod">${t('today.todayBtn')}</button><button class="btn btn-outline btn-small" id="next">${t('today.next')} ›</button></div></div>
  ${isDiaspora ? `<div class="banner">🌏 ${t('today.diaspora')}</div>` : ''}
  ${todayFests.length ? `<div class="card gold"><div class="label">${t('today.festival')}</div>${todayFests.map((f: any) => `<h2>${esc(f.name)}</h2><p class="small muted">${esc(f.tithiLabel ?? '')}${f.window ? ` · ${t('fest.window')} ${fmtTime(f.window.start)}–${fmtTime(f.window.end)}` : ''}${f.moonrise ? ` · ${t('fest.moonrise')} ${fmtTime(f.moonrise)}` : ''}${f.diaspora?.differs ? `<br>${t('fest.differs', { date: fmtDate(f.diaspora.delhiDate) })}` : ''}${f.noteText ? `<br>${esc(f.noteText)}` : ''}</p>`).join('')}</div>` : ''}
  <div class="card">
    <div class="row"><span class="k">${t('today.sunrise')}</span><span class="v"><b>${fmtTime(d.sunrise)}</b></span></div>
    <div class="row"><span class="k">${t('today.sunset')}</span><span class="v"><b>${fmtTime(d.sunset)}</b></span></div>
    <div class="row"><span class="k">${t('today.moonrise')}</span><span class="v">${d.moonrise ? fmtTimeD(d.moonrise, date) : t('today.none')}</span></div>
    <div class="row"><span class="k">${t('today.moonset')}</span><span class="v">${d.moonset ? fmtTimeD(d.moonset, date) : t('today.none')}</span></div>
  </div>
  <div class="card">
    <div class="row"><span class="k">${t('today.tithi')}</span><span class="v">${span(d.tithi, 'tithi')}</span></div>
    <div class="row"><span class="k">${t('today.nakshatra')}</span><span class="v">${span(d.nakshatra, 'nakshatra')}</span></div>
    <div class="row"><span class="k">${t('today.yoga')}</span><span class="v">${span(d.yoga, 'yoga')}</span></div>
    <div class="row"><span class="k">${t('today.karana')}</span><span class="v">${span(d.karana, 'karana')}</span></div>
    <div class="row"><span class="k">${t('today.masa')}</span><span class="v"><b>${esc(masa.label)}</b> <span class="muted small">(${t('today.' + S.monthSystem)})</span><br><span class="muted small">${esc(other.label)} (${t('today.' + (S.monthSystem === 'amanta' ? 'purnimanta' : 'amanta'))})</span></span></div>
    <div class="row"><span class="k">${t('today.paksha')}</span><span class="v">${esc(d.pakshaLabel)}</span></div>
    <div class="row"><span class="k">${t('today.samvat')}</span><span class="v small">${t('today.vikram')} ${d.samvatsara.vikram} ${esc(d.samvatsara.nameNorth)}<br>${t('today.shaka')} ${d.samvatsara.shaka} ${esc(d.samvatsara.nameSouth)}<br>${t('today.gujarati')} ${d.samvatsara.vikramGujarati} ${esc(d.samvatsara.nameGujarati)}</span></div>
    <div class="row"><span class="k">${t('today.ritu')} · ${t('today.ayana')}</span><span class="v">${esc(d.rituLabel)} · ${esc(d.ayanaLabel)}</span></div>
    <div class="row"><span class="k">${t('today.moonSign')} · ${t('today.sunSign')}</span><span class="v">${esc(d.moonRashi.label)} · ${esc(d.sunRashi.label)}</span></div>
    <div class="row"><span class="k">${t('today.ayanamsa')}</span><span class="v small">${d.ayanamsa.toFixed(4)}°</span></div>
  </div>
  <div class="card"><div class="label">${t('today.kala')}</div>
    <div class="row"><span class="k">${t('today.rahu')}</span><span class="v"><span class="pill avoid">${win(d.kala.rahuKaal)}</span></span></div>
    <div class="row"><span class="k">${t('today.yama')}</span><span class="v">${win(d.kala.yamaganda)}</span></div>
    <div class="row"><span class="k">${t('today.gulika')}</span><span class="v">${win(d.kala.gulika)}</span></div>
    <div class="row"><span class="k">${t('today.abhijit')}</span><span class="v">${d.kala.abhijit ? `<span class="pill good">${win(d.kala.abhijit)}</span>` : `<span class="muted small">${t('today.abhijitWed')}</span>`}</span></div>
    <div class="row"><span class="k">${t('today.brahma')}</span><span class="v">${fmtTimeD(d.kala.brahmaMuhurta.start, date)}–${fmtTimeD(d.kala.brahmaMuhurta.end, date)}</span></div>
    <div class="row"><span class="k">${t('today.durmuhurta')}</span><span class="v">${d.kala.durmuhurta.map(win).join('<br>')}</span></div>
    <div class="row"><span class="k">${t('today.varjyam')}</span><span class="v">${d.kala.varjyam.length ? d.kala.varjyam.map((w: any) => `${fmtTimeD(w.start, date)}–${fmtTimeD(w.end, date)}`).join('<br>') : '—'}</span></div>
    <div class="row"><span class="k">${t('today.amrit')}</span><span class="v">${d.kala.amritKaal.length ? d.kala.amritKaal.map((w: any) => `${fmtTimeD(w.start, date)}–${fmtTimeD(w.end, date)}`).join('<br>') : '—'}</span></div>
    <div class="row"><span class="k">${t('today.pradosha')}</span><span class="v">${win(d.kala.pradosha)}</span></div>
  </div>
  <div class="card"><div class="label">${t('today.choghadiya')} · ${t('today.day')}</div>${chog(d.kala.choghadiya.day)}<div class="label">${t('today.choghadiya')} · ${t('today.night')}</div>${chog(d.kala.choghadiya.night)}</div>
  <div class="card"><div class="label">${t('today.hora')}</div><div class="strip">${[...d.kala.hora.day, ...d.kala.hora.night].map((h: any) => `<div class="chog ${h.quality} ${inWin(h) ? 'now' : ''}"><div class="n">${esc(h.label)}</div><div class="t">${fmtTime(h.start)}</div></div>`).join('')}</div></div>
  ${bala}
  <div class="card"><div class="label">${t('today.flags')}</div>${flagsHtml}</div>
  <div class="card"><div class="label">${t('today.sankalpa')}</div>
    <div class="row" style="border:0"><button class="btn btn-outline btn-small" id="sk-deva">${t('today.deva')}</button><button class="btn btn-outline btn-small" id="sk-iast">${t('today.iast')}</button><button class="btn btn-outline btn-small" id="sk-copy">${t('common.copy')}</button></div>
    <div class="sankalpa ${S.sankalpaScript === 'deva' ? 'deva' : ''}" id="sk-text">${esc(S.sankalpaScript === 'deva' ? sank.devanagari : sank.iast)}</div>
    <p class="small muted">${t('today.sankalpaHint')}</p>
  </div>
  <p class="small dim center">Lahiri ayanamsa · ${S.sunrise === 'limb' ? 'upper-limb sunrise' : 'disc-centre sunrise'} · astronomy-engine · <a href="#/about">${t('settings.about')}</a></p>`;
  view.querySelector('#prev')!.addEventListener('click', () => { todayDate = addIso(todayDate, -1); renderToday(); });
  view.querySelector('#next')!.addEventListener('click', () => { todayDate = addIso(todayDate, 1); renderToday(); });
  view.querySelector('#tod')!.addEventListener('click', () => { todayDate = todayIso(); renderToday(); });
  view.querySelector('#sk-deva')!.addEventListener('click', () => { S.sankalpaScript = 'deva'; saveSettings(); renderToday(); });
  view.querySelector('#sk-iast')!.addEventListener('click', () => { S.sankalpaScript = 'iast'; saveSettings(); renderToday(); });
  view.querySelector('#sk-copy')!.addEventListener('click', () => { navigator.clipboard?.writeText((view.querySelector('#sk-text') as HTMLElement).textContent || '').then(() => toast(t('common.copied'))); });
}

// ---------- Muhurta ----------
let lastResult: any = null; let lastReq: any = null;
const EVENT_ICONS: Record<string, string> = { vivaha: '💍', griha_pravesh: '🏠', sagai: '💐', vahana: '🚗', vyapara: '🏪', namakarana: '👶', annaprashana: '🍚', mundan: '✂️', yatra: '✈️', new_job: '💼', exam_interview: '🎓', bhoomi_puja: '🪔' };
async function renderMuhurta() {
  const seq = navSeq;
  const packs = await call('packs', { lang: S.lang });
  if (isStale(seq)) return;
  const from = lastReq?.from ?? todayIso(); const to = lastReq?.to ?? addIso(from, 60);
  view.innerHTML = `<h1>${t('muhurta.title')}</h1><p class="muted small">${t('muhurta.sub')}</p>
  <a class="card naam-cta" href="#/naam">👶 ${t('naam.cta')} ›</a>
  <div class="card">
    <div class="field"><label>${t('muhurta.event')}</label><select id="ev">${packs.map((p: any) => `<option value="${p.id}" ${lastReq?.event === p.id ? 'selected' : ''}>${EVENT_ICONS[p.id] ?? ''} ${esc(p.name)}</option>`).join('')}</select></div>
    <div class="grid2"><div class="field"><label>${t('muhurta.from')}</label><input id="from" type="date" value="${from}"></div><div class="field"><label>${t('muhurta.to')}</label><input id="to" type="date" value="${to}"></div></div>
    <div class="field"><label>${t('muhurta.city')}</label><button class="btn btn-outline" id="pick-city" type="button">${esc(S.city.name)} · ${esc(S.city.region)}</button></div>
    <div class="field"><label>${t('muhurta.strictness')}</label><select id="strict"><option value="family">${t('muhurta.family')}</option><option value="standard" selected>${t('muhurta.standard')}</option><option value="relaxed">${t('muhurta.relaxed')}</option></select></div>
    ${S.birth ? `<div class="toggle"><span>${t('muhurta.useBirth')}</span><div class="switch on" id="use-birth"></div></div>` : `<p class="small muted">${t('settings.birth')}: <a href="#/settings">${t('nav.settings')}</a></p>`}
    <button class="btn btn-gold" id="find">✨ ${t('muhurta.find')}</button>
  </div>
  <div id="results">${lastResult ? '' : ''}</div>`;
  view.querySelector('#pick-city')!.addEventListener('click', () => cityPicker(c => { setCity(c); }));
  const useBirth = view.querySelector('#use-birth'); useBirth?.addEventListener('click', () => useBirth.classList.toggle('on'));
  const results = view.querySelector('#results')!;
  const run = async () => {
    const req = { event: (view.querySelector('#ev') as HTMLSelectElement).value, from: (view.querySelector('#from') as HTMLInputElement).value, to: (view.querySelector('#to') as HTMLInputElement).value, place: place(), region: S.region, strictness: (view.querySelector('#strict') as HTMLSelectElement).value, sunrise: S.sunrise, birth: S.birth && useBirth?.classList.contains('on') ? birthReq() : null, maxDays: 12, windowsPerDay: 3 };
    if (!req.from || !req.to || req.to < req.from) return toast('Check dates');
    if ((new Date(req.to).getTime() - new Date(req.from).getTime()) / 86400000 > 400) return toast('Max 400 days');
    results.innerHTML = `<div class="card"><p class="muted">${t('muhurta.finding')}</p><div class="skeleton"></div><div class="skeleton"></div></div>`;
    try { lastResult = await call('muhurta', { req, lang: S.lang }); lastReq = req; } catch (e: any) { results.innerHTML = `<div class="card">Error: ${esc(e.message)}</div>`; return; }
    renderResults(results);
  };
  view.querySelector('#find')!.addEventListener('click', run);
  if (lastResult) renderResults(results);
}
function renderResults(root: Element) {
  const r = lastResult;
  root.innerHTML = `<div class="row" style="border:0;align-items:center"><h2 class="mt">${t('muhurta.results')}</h2>${r.days.length ? `<a class="btn btn-outline btn-small" href="#/report">📄 ${t('report.open')}</a>` : ''}</div><p class="small muted">${r.evaluatedDays} ${t('muhurta.evaluated')} · ${t('muhurta.confidence')}: ${r.confidence}${r.fallback ? ' · EN' : ''}</p>
  ${r.invocation ? `<div class="card"><div class="label">${t('muhurta.invocation')} · ${esc(r.invocation.deity)}</div><p class="sankalpa">${esc(r.invocation.line)}</p></div>` : ''}
  ${r.days.length ? r.days.map((d: any, i: number) => `<div class="card list-item" data-i="${i}" style="align-items:center">${scoreRing(d.score)}<div class="body"><div class="title">${esc(fmtDate(d.date))}</div><div class="sub">${esc(d.headline)}</div><div class="sub">${t('muhurta.topWindow')}: ${d.windows.map((w: any) => fmtTime(w.start) + '–' + fmtTime(w.end)).join(', ')}</div></div><span class="chev">›</span></div>`).join('') : `<div class="card"><p>${t('muhurta.none')}</p></div>`}
  ${r.rejected.length ? `<details class="card"><summary class="label">${t('muhurta.rejectedHdr')}</summary>${r.rejected.map((x: any) => `<div class="row"><span class="k">${esc(fmtDate(x.date))}</span><span class="v small">${x.sentences.map(esc).join('<br>')}</span></div>`).join('')}</details>` : ''}
  <div class="card"><div class="label">${t('result.caveats')}</div><ul class="reasons">${r.caveats.map((c: string) => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
  root.querySelectorAll('[data-i]').forEach(el => el.addEventListener('click', () => { location.hash = `#/result/${(el as HTMLElement).dataset.i}`; }));
}
async function renderResult(idx: number) {
  const seq = navSeq;
  if (!lastResult) { location.hash = '#/muhurta'; return; }
  const r = lastResult; const d = r.days[idx]; if (!d) { location.hash = '#/muhurta'; return; }
  const saved = await db.listSaved();
  if (isStale(seq)) return;
  const idOf = (w: any) => `${lastReq.event}|${d.date}|${w.start}`;
  view.innerHTML = `<div class="row" style="border:0"><a href="#/muhurta" class="small">‹ ${t('result.back')}</a><a class="btn btn-outline btn-small" href="#/report">📄 ${t('report.open')}</a></div>
  <div class="hero"><div class="label">${EVENT_ICONS[lastReq.event] ?? ''} ${esc(r.packName)}</div><h1>${esc(fmtDate(d.date))}</h1><p class="muted small">${esc(d.headline)}</p>${scoreRing(d.score)}</div>
  ${d.summary ? `<div class="card"><p class="small">${esc(d.summary)}</p></div>` : ''}
  <h2>${t('result.windows')}</h2>
  ${d.windows.map((w: any, j: number) => `<div class="card"><div class="window"><div class="time">${fmtTime(w.start)} – ${fmtTime(w.end)} <span class="small muted">· ${t('muhurta.score')} ${w.score}</span></div><div class="small muted">${esc(w.nakshatra)} · ${esc(w.tithi)}${w.choghadiya ? ` · ${esc(w.choghadiya)}` : ''}${w.hora ? ` · ${esc(w.hora)} hora` : ''}</div></div>
    ${w.keep.length ? `<div class="label">${t('result.keep')}</div><ul class="reasons">${w.keep.map((s: string) => `<li class="keep">${esc(s)}</li>`).join('')}</ul>` : ''}
    ${w.avoid.length ? `<div class="label">${t('result.avoid')}</div><ul class="reasons">${w.avoid.map((s: string) => `<li class="avoid">${esc(s)}</li>`).join('')}</ul>` : ''}
    <div class="row" style="border:0;justify-content:flex-start;gap:8px"><button class="btn btn-gold btn-small" data-save="${j}">${saved.some(s => s.id === idOf(w)) ? t('result.saved') : '❀ ' + t('result.save')}</button><button class="btn btn-outline btn-small" data-share="${j}">${t('result.share')}</button><button class="btn btn-outline btn-small" data-ics="${j}">${t('result.ics')}</button></div></div>`).join('')}
  <div class="card"><div class="label">${t('result.caveats')}</div><ul class="reasons">${r.caveats.map((c: string) => `<li>${esc(c)}</li>`).join('')}</ul></div>
  <div class="card"><div class="label">${t('result.sources')}</div><ul class="reasons">${r.sources.map((s: string) => `<li>${esc(humanSource(s))}</li>`).join('')}</ul><p class="small dim">ShubhDate engine ${r.engineVersion} · MIT</p></div>`;
  const shareText = (w: any) => t('result.shareText', { event: r.packName, date: fmtDate(d.date), start: fmtTime(w.start), end: fmtTime(w.end), city: S.city.name, score: w.score, headline: d.headline }) + '\n' + location.origin + BASE;
  view.querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', async () => { const w = d.windows[Number((b as HTMLElement).dataset.save)]; const item: SavedItem = { id: idOf(w), event: lastReq.event, eventName: r.packName, date: d.date, start: w.start, end: w.end, score: w.score, place: place(), reasons: w.keep, createdAt: new Date().toISOString(), lang: S.lang }; await db.save(item); (b as HTMLElement).textContent = t('result.saved'); toast(t('result.saved')); }));
  view.querySelectorAll('[data-share]').forEach(b => b.addEventListener('click', async () => { const w = d.windows[Number((b as HTMLElement).dataset.share)]; const text = shareText(w); if (navigator.share) { try { await navigator.share({ title: 'ShubhDate', text }); } catch { /* cancelled */ } } else { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); } }));
  view.querySelectorAll('[data-ics]').forEach(b => b.addEventListener('click', () => { const w = d.windows[Number((b as HTMLElement).dataset.ics)]; downloadIcs(r.packName, w, d); }));
}
function downloadIcs(name: string, w: any, d: any) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ShubhDate//EN', 'BEGIN:VEVENT', `UID:${f(w.start)}-shubhdate`, `DTSTAMP:${f(new Date().toISOString())}`, `DTSTART:${f(w.start)}`, `DTEND:${f(w.end)}`, `SUMMARY:${name} muhurta (ShubhDate)`, `LOCATION:${S.city.name}`, `DESCRIPTION:${(d.headline + '. ' + (w.keep || []).join(' ')).replace(/[,;]/g, ' ').slice(0, 900)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = `shubhdate-${d.date}.ics`; a.click();
}

// ---------- Festivals ----------
async function renderFestivals() {
  const seq = navSeq;
  view.innerHTML = `<h1>${t('fest.title')}</h1><p class="muted small">${t('fest.sub')} · ${esc(S.city.name)}</p><div class="skeleton"></div><div class="skeleton"></div>`;
  const from = addIso(todayIso(), -3); const to = addIso(from, 200);
  let list: any[]; try { list = await festivalsFor(from, to); if (isStale(seq)) return; } catch (e: any) { if (isStale(seq)) return; view.innerHTML += `<div class="card">Error ${esc(e.message)}</div>`; return; }
  const main = list.filter(f => f.id !== 'ekadashi'); const ek = list.filter(f => f.id === 'ekadashi');
  view.innerHTML = `<h1>${t('fest.title')}</h1><p class="muted small">${t('fest.sub')} · ${esc(S.city.name)}</p>
  ${main.map(f => `<div class="card"><div class="row" style="border:0"><span class="k"><b style="color:var(--gold-light)">${esc(fmtDate(f.date))}</b></span><span class="v small muted">${esc(f.deity ?? '')}</span></div><h2>${esc(f.name)}</h2><p class="small muted">${esc(f.tithiLabel ?? '')}${f.instant ? ' · ' + fmtTimeD(f.instant, f.date) : ''}</p>
    ${f.window ? `<div class="row"><span class="k">${t('fest.window')} (${esc(f.window.label)})</span><span class="v">${fmtTimeD(f.window.start, f.date)}–${fmtTimeD(f.window.end, f.date)}</span></div>` : ''}
    ${f.moonrise ? `<div class="row"><span class="k">${t('fest.moonrise')}</span><span class="v"><b>${fmtTime(f.moonrise)}</b></span></div>` : ''}
    ${f.bhadraNote ? `<p class="small">${t('fest.bhadra', { time: fmtTimeD(f.bhadraNote.until, f.date) })}</p>` : ''}
    ${f.diaspora ? `<p class="small ${f.diaspora.differs ? '' : 'muted'}">${f.diaspora.differs ? '🌏 ' + t('fest.differs', { date: fmtDate(f.diaspora.delhiDate) }) : t('fest.same')}</p>` : ''}
    ${f.noteText ? `<p class="small muted">${esc(f.noteText)}</p>` : ''}
    <p class="small dim">${esc(humanSource(f.source))}</p></div>`).join('')}
  <details class="card"><summary class="label">Ekadashi (Smarta) · ${ek.length}</summary>${ek.map(f => `<div class="row"><span class="k">${esc(fmtDate(f.date))}</span><span class="v small">${esc(f.tithiLabel)}</span></div>`).join('')}</details>`;
}

// ---------- Saved ----------
async function renderSaved() {
  const seq = navSeq;
  const list = await db.listSaved();
  if (isStale(seq)) return;
  view.innerHTML = `<h1>${t('saved.title')}</h1>${list.length ? list.map(s => `<div class="card list-item" style="align-items:center">${scoreRing(s.score)}<div class="body"><div class="title">${EVENT_ICONS[s.event] ?? ''} ${esc(s.eventName)} · ${esc(fmtDate(s.date))}</div><div class="sub">${fmtTime(s.start, s.place.tz)}–${fmtTime(s.end, s.place.tz)} · ${esc(s.place.name)}</div><div class="sub">${s.reasons.slice(0, 2).map(esc).join(' ')}</div></div><button class="btn btn-outline btn-small" data-rm="${esc(s.id)}">${t('saved.remove')}</button></div>`).join('') : `<div class="card center"><p style="font-size:32px">🪷</p><p class="muted">${t('saved.empty')}</p><a class="btn btn-gold" href="#/muhurta">${t('muhurta.title')}</a></div>`}`;
  view.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', async () => { await db.remove((b as HTMLElement).dataset.rm!); renderSaved(); }));
}

// ---------- Settings ----------
async function renderSettings() {
  const seq = navSeq;
  const langs = U.languages as { code: Lang; native: string; en: string; beta?: boolean }[];
  const janma = S.birth ? await call('janma', { birth: birthReq(), lang: S.lang }).catch(() => null) : null;
  const ent = await loadEntitlement().catch(() => null); const playOk = await isPlayBillingAvailable().catch(() => false);
  if (isStale(seq)) return;
  const entLine = ent ? (ent.entitlement.sku === 'family_annual' ? t('settings.famActive', { date: new Date(ent.entitlement.exp * 1000).toLocaleDateString() }) : t('settings.creditsLeft', { n: (ent.entitlement.credits ?? 0) + (ent.entitlement.naam ?? 0) })) : t('settings.noPurchases');
  view.innerHTML = `<h1>${t('settings.title')}</h1>
  <div class="card"><div class="label">${t('settings.language')}</div><div class="lang-grid">${langs.map(l => `<div class="lang-cell ${S.lang === l.code ? 'selected' : ''}" data-lang="${l.code}"><div class="native">${esc(l.native)}</div><div class="en">${esc(l.en)} ${l.beta ? `<span class="beta">${t('settings.beta')}</span>` : ''}</div></div>`).join('')}</div></div>
  <div class="card"><div class="label">${t('settings.city')}</div><button class="btn btn-outline" id="city">${esc(S.city.name)} · ${esc(S.city.region)} · ${esc(S.city.tz)}</button></div>
  <div class="card"><div class="field"><label>${t('settings.region')}</label><select id="region">${(['north', 'west', 'south', 'east', 'diaspora'] as const).map(r => `<option value="${r}" ${S.region === r ? 'selected' : ''}>${t('settings.' + r)}</option>`).join('')}</select></div>
    <div class="field"><label>${t('settings.month')}</label><select id="month"><option value="purnimanta" ${S.monthSystem === 'purnimanta' ? 'selected' : ''}>${t('today.purnimanta')}</option><option value="amanta" ${S.monthSystem === 'amanta' ? 'selected' : ''}>${t('today.amanta')}</option></select></div>
    <div class="field"><label>${t('settings.sunrise')}</label><select id="sunrise"><option value="limb" ${S.sunrise === 'limb' ? 'selected' : ''}>${t('settings.limb')}</option><option value="center" ${S.sunrise === 'center' ? 'selected' : ''}>${t('settings.center')}</option></select></div>
    <div class="toggle"><span>${t('settings.abhijitWed')}</span><div class="switch ${S.abhijitWed ? 'on' : ''}" id="abhijit"></div></div></div>
  ${pushAvailable() ? `<div class="card"><div class="toggle"><span>${t('settings.reminders')}</span><div class="switch ${remindersOn() ? 'on' : ''}" id="reminders"></div></div><p class="small muted">${t('settings.remindersNote')}</p></div>` : ''}
  <div class="card"><div class="field"><label>${t('settings.theme')}</label><select id="theme"><option value="paper" ${S.theme !== 'night' ? 'selected' : ''}>${t('theme.paper')}</option><option value="night" ${S.theme === 'night' ? 'selected' : ''}>${t('theme.night')}</option></select></div></div>
  <div class="card"><div class="label">${t('settings.birth')}</div><p class="small muted">🔒 ${t('settings.birthNote')}</p>
    <div class="field"><label>${t('settings.birthDate')}</label><input id="bdate" type="date" value="${S.birth?.date ?? ''}"></div>
    <div class="field"><label>${t('settings.birthTime')}</label><input id="btime" type="time" value="${S.birth?.time ?? ''}" ${S.birth && S.birth.time === null ? 'disabled' : ''}></div>
    <div class="toggle"><span>${t('settings.timeUnknown')}</span><div class="switch ${S.birth && S.birth.time === null ? 'on' : ''}" id="tunk"></div></div>
    <div class="field"><label>${t('settings.birthCity')}</label><button class="btn btn-outline" id="bcity" type="button">${esc((S.birth?.city ?? S.city).name)}</button></div>
    ${janma ? `<p class="small">${t('settings.janma')}: ${janma.candidates.map((c: any) => `<b>${esc(c.nakshatraLabel)}</b> (${esc(c.rashiLabel)}, pada ${c.pada})`).join(' / ')}${janma.ambiguous ? ` · ${t('settings.timeUnknown')}` : ''}</p>` : ''}
    <div class="row" style="border:0;gap:8px"><button class="btn btn-gold" id="bsave">${t('settings.saveBirth')}</button><button class="btn btn-outline btn-small" id="bclear">${t('settings.clearBirth')}</button></div></div>
  ${IS_PLACEHOLDER(WAITLIST_URL) ? '' : `<div class="card"><a class="btn btn-outline" href="${WAITLIST_URL}" target="_blank" rel="noopener">💌 ${t('settings.waitlist')}</a></div>`}
  <div class="card"><div class="label">${t('settings.purchases')}</div><p class="small">${esc(entLine)}</p>
    <div class="row" style="border:0;gap:8px;flex-wrap:wrap;justify-content:flex-start">${playOk ? `<button class="btn btn-outline btn-small" id="restore">${t('report.restore')}</button>` : ''}<button class="btn btn-outline btn-small" id="manage-sub">${t('settings.manageSub')}</button></div>
    <p class="small muted">${t('settings.purchasesNote')}</p></div>
  <div class="card"><div class="label">${t('settings.yourData')}</div><p class="small">${t('settings.yourDataNote')}</p><button class="btn btn-outline btn-small" id="wipe">${t('settings.deleteData')}</button></div>
  <div class="card"><div class="list-item" id="about"><span class="ico">📖</span><div class="body"><div class="title">${t('settings.about')}</div></div><span class="chev">›</span></div><div class="list-item" id="privacy"><span class="ico">🔒</span><div class="body"><div class="title">${t('settings.privacy')}</div></div><span class="chev">›</span></div></div>
  <p class="small dim center">${t('settings.version')} ${ENGINE_VERSION} · <a href="https://github.com/SakredStudio/subhdate" target="_blank" rel="noopener">github.com/SakredStudio/subhdate</a></p>`;
  view.querySelectorAll('[data-lang]').forEach(el => el.addEventListener('click', () => { S.lang = (el as HTMLElement).dataset.lang as Lang; saveSettings(); festCache = null; updateChrome(); renderSettings(); }));
  view.querySelector('#city')!.addEventListener('click', () => cityPicker(c => { setCity(c); }));
  view.querySelector('#region')!.addEventListener('change', e => { S.region = (e.target as HTMLSelectElement).value as any; S.monthSystem = S.region === 'north' ? 'purnimanta' : S.region === 'diaspora' ? S.monthSystem : 'amanta'; saveSettings(); festCache = null; renderSettings(); });
  view.querySelector('#month')!.addEventListener('change', e => { S.monthSystem = (e.target as HTMLSelectElement).value as any; saveSettings(); });
  view.querySelector('#sunrise')!.addEventListener('change', e => { S.sunrise = (e.target as HTMLSelectElement).value as any; saveSettings(); festCache = null; });
  view.querySelector('#abhijit')!.addEventListener('click', e => { S.abhijitWed = !S.abhijitWed; (e.target as HTMLElement).classList.toggle('on', S.abhijitWed); saveSettings(); });
  view.querySelector('#reminders')?.addEventListener('click', async e => {
    const el = e.target as HTMLElement;
    if (el.classList.contains('on')) { await disableReminders(); el.classList.remove('on'); toast(t('settings.remindersOff')); return; }
    const ok = await enableReminders({ lat: S.city.lat, lon: S.city.lon, tz: S.city.tz }, S.lang, S.region, ['festivals', 'ekadashi', 'saved']).catch(() => false);
    if (ok) { el.classList.add('on'); toast(t('settings.remindersOn')); } else toast(Notification.permission === 'denied' ? t('settings.remindersDenied') : t('settings.remindersOff'));
  });
  view.querySelector('#theme')!.addEventListener('change', e => { S.theme = (e.target as HTMLSelectElement).value as any; saveSettings(); applyTheme(); });
  let bcity: City = S.birth?.city ?? S.city;
  view.querySelector('#bcity')!.addEventListener('click', () => cityPicker(c => { bcity = c; (view.querySelector('#bcity') as HTMLElement).textContent = c.name; }));
  const tunk = view.querySelector('#tunk')!; tunk.addEventListener('click', () => { tunk.classList.toggle('on'); (view.querySelector('#btime') as HTMLInputElement).disabled = tunk.classList.contains('on'); });
  view.querySelector('#bsave')!.addEventListener('click', () => { const date = (view.querySelector('#bdate') as HTMLInputElement).value; if (!date) return toast('Date?'); const unk = tunk.classList.contains('on'); const time = unk ? null : ((view.querySelector('#btime') as HTMLInputElement).value || null); S.birth = { date, time, city: bcity }; saveSettings(); toast('✓'); renderSettings(); });
  view.querySelector('#bclear')!.addEventListener('click', () => { S.birth = null; saveSettings(); renderSettings(); });
  view.querySelector('#manage-sub')?.addEventListener('click', openManageSubscriptions);
  view.querySelector('#restore')?.addEventListener('click', async () => { const n = await restorePurchases(); toast(t('report.restored', { n: String(n) })); if (n) renderSettings(); });
  view.querySelector('#wipe')!.addEventListener('click', () => {
    sheet(`<h3>${t('settings.deleteData')}</h3><p class="small">${t('settings.deleteConfirm')}</p><div class="row" style="border:0;gap:8px"><button class="btn btn-gold" id="wipe-yes">${t('settings.deleteYes')}</button><button class="btn btn-outline" id="wipe-no">${t('common.cancel')}</button></div>`, root => {
      root.querySelector('#wipe-no')!.addEventListener('click', closeSheet);
      root.querySelector('#wipe-yes')!.addEventListener('click', async () => {
        try { if (remindersOn()) await disableReminders(); } catch { /* offline */ }
        await forgetDevice();
        try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ }
        try { indexedDB.deleteDatabase('shubhdate'); } catch { /* ignore */ }
        try { for (const k of await caches.keys()) await caches.delete(k); } catch { /* ignore */ }
        try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch { /* ignore */ }
        location.replace(location.pathname);
      });
    });
  });
  view.querySelector('#about')!.addEventListener('click', () => { location.hash = '#/about'; });
  view.querySelector('#privacy')!.addEventListener('click', () => { location.hash = '#/privacy'; });
}

// ---------- Onboarding (first run: language + city) ----------
function renderWelcome() {
  const langs = U.languages as { code: Lang; native: string; en: string; beta?: boolean }[];
  view.innerHTML = `<div class="hero">${heroArt}<h1 style="font-weight:300;font-size:32px">ShubhDate</h1><p class="muted small">${t('settings.language')}</p></div>
  <div class="lang-grid">${langs.map(l => `<div class="lang-cell ${S.lang === l.code ? 'selected' : ''}" data-lang="${l.code}"><div class="native">${esc(l.native)}</div><div class="en">${esc(l.en)}${l.beta ? ` <span class="beta">beta</span>` : ''}</div></div>`).join('')}</div>
  <div class="card mt"><div class="label">${t('settings.city')}</div><button class="btn btn-outline" id="w-city">${esc(S.city.name)} · ${esc(S.city.region)}</button></div>
  <div class="card"><div class="field"><label>${t('settings.region')}</label><select id="w-region">${(['north', 'west', 'south', 'east', 'diaspora'] as const).map(r => `<option value="${r}" ${S.region === r ? 'selected' : ''}>${t('settings.' + r)}</option>`).join('')}</select></div></div>
  <button class="btn btn-gold" id="w-go">✨ ${t('nav.today')}</button>
  <p class="small dim center mt">No ads · no account · birth data stays on this phone</p>`;
  view.querySelectorAll('[data-lang]').forEach(el => el.addEventListener('click', () => { S.lang = (el as HTMLElement).dataset.lang as Lang; saveSettings(); updateChrome(); renderWelcome(); }));
  view.querySelector('#w-city')!.addEventListener('click', () => cityPicker(c => { S.city = c; saveSettings(); updateChrome(); renderWelcome(); }));
  view.querySelector('#w-region')!.addEventListener('change', e => { S.region = (e.target as HTMLSelectElement).value as any; S.monthSystem = S.region === 'north' || S.region === 'diaspora' ? 'purnimanta' : 'amanta'; saveSettings(); });
  view.querySelector('#w-go')!.addEventListener('click', () => { S.onboarded = true; saveSettings(); location.hash = '#/today'; });
}

// ---------- Report gate ----------
// Full report: Play entitlement (app/entitlement.ts, step 6) or the dev/QA flag. The flag is never shown in the UI.
useStore({ get: k => db.cacheGet(k), set: (k, v) => db.cacheSet(k, v) });
async function isReportUnlocked(): Promise<boolean> {
  if (localStorage.getItem('shubhdate.devReport') === '1') return true;
  return isEntitled(['report_single', 'family_annual']);
}
async function isNaamUnlocked(): Promise<boolean> {
  if (localStorage.getItem('shubhdate.devReport') === '1') return true;
  return isEntitled(['naam_report', 'family_annual']);
}
const reportKey = () => lastReq ? `${lastReq.event}|${lastReq.from}|${lastReq.to}|${lastReq.place.lat.toFixed(2)},${lastReq.place.lon.toFixed(2)}` : '';

// ---------- Router ----------
function updateChrome() {
  document.documentElement.lang = S.lang === 'hinglish' ? 'en' : S.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t((el as HTMLElement).dataset.i18n!); });
  const chip = document.getElementById('city-chip')!; chip.textContent = `📍 ${S.city.name}`;
}
// Each navigation gets a number; an async screen that finishes after the user moved on must not paint.
let navSeq = 0;
const isStale = (seq: number) => seq !== navSeq;
function route() {
  navSeq++;
  abandonPending();
  const hash = location.hash || '#/today';
  const [, path, arg] = hash.split('/');
  document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('active', (a as HTMLElement).dataset.tab === path));
  document.getElementById('tabbar')!.style.display = S.onboarded ? '' : 'none';
  document.body.dataset.route = path || 'today';
  closeSheet();
  if (!S.onboarded && path !== 'about' && path !== 'privacy') return renderWelcome();
  window.scrollTo(0, 0);
  switch (path) {
    case 'muhurta': return renderMuhurta();
    case 'result': return renderResult(Number(arg));
    case 'naam': return renderNaam(view, { isCurrent: ((q) => () => !isStale(q))(navSeq), t, lang: S.lang, region: S.region, base: BASE, city: S.city, esc, fmtTime, fmtDate, scoreRing, toast, call, pickCity: cityPicker, isUnlocked: isNaamUnlocked, onFirstFullRender: (key) => { consumeReport(key).catch(() => null); } });
    case 'report': return renderReport(view, { isCurrent: ((q) => () => !isStale(q))(navSeq), t, lang: S.lang, tz: tz(), cityName: S.city.name, region: S.region, base: BASE, esc, fmtTime, fmtTimeD, fmtDate, scoreRing, toast, call, lastReq, isUnlocked: isReportUnlocked, onFirstFullRender: () => { consumeReport(reportKey()).catch(() => null); } });
    case 'festivals': return renderFestivals();
    case 'saved': return renderSaved();
    case 'settings': return renderSettings();
    case 'about': view.innerHTML = aboutHtml(t); return;
    case 'privacy': view.innerHTML = privacyHtml(t); return;
    default: return renderToday();
  }
}
window.addEventListener('hashchange', route);
document.getElementById('city-chip')!.addEventListener('click', () => cityPicker(setCity));
updateChrome();
route();
// A cached entitlement older than the offline grace period is refreshed from the Worker (no-op on the web / offline).
refreshIfStale().then(() => { if (location.hash.startsWith('#/report')) route(); }).catch(() => null);
if ('serviceWorker' in navigator) {
  // When a new service worker takes over (new deploy), reload once so the page and its assets match the new build.
  const hadController = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${BASE}sw.js`, { updateViaCache: 'none' }).then(reg => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => null); });
    }).catch(() => null);
  });
}
if ('storage' in navigator && 'persist' in navigator.storage) navigator.storage.persist().catch(() => null);
