// Muhurta Report screen (#/report): renders engine/report.ts's model as a deck of slides (see report-shell.ts,
// shared with every paid report); print = PDF, one slide per landscape page.
// Order: cover, the five best windows, then three slides per date (the date, its day hour by hour, its sankalpa),
// then the appendix for the pandit (one slide per chosen moment, conventions, sources).
// Free preview: cover + the best date's three slides; the rest is blurred until the device is entitled
// (Play Billing, see entitlement.ts) or the dev/QA flag localStorage['shubhdate.devReport']==='1' is set.
import { humanSource } from '../format.ts';
import { isPlayBillingAvailable, listProducts, purchase, restorePurchases, formatPrice, PurchaseError, type ProductDetails } from '../billing.ts';
import type { Sku } from '../entitlement.ts';
import type { ReportModel, ReportDay, RWin } from '../../engine/report.ts';
import { loadReportFonts, reportDeck, reportToolbar, mountReport, slideTitle, label, heading, fact, kv, list, scoreRing, dateParts } from './report-shell.ts';

export interface ReportCtx {
  /** false once the user has navigated away; async work must not paint then */
  isCurrent?: () => boolean;
  t: (k: string, p?: Record<string, string | number>) => string;
  lang: string; tz: string; cityName: string; region: string; base: string;
  esc: (s: any) => string; fmtTime: (iso: string | null | undefined, zone?: string) => string; fmtTimeD: (iso: string | null | undefined, ref: string, zone?: string) => string; fmtDate: (iso: string) => string;
  scoreRing: (n: number) => string; toast: (m: string) => void;
  call: (op: string, args: any) => Promise<any>;
  lastReq: any; isUnlocked: () => Promise<boolean>; onFirstFullRender?: () => void;
}

const NAMES_KEY = 'shubhdate.reportNames';
const LIMB_KEY: Record<string, string> = { vara: 'today.vara', tithi: 'today.tithi', nakshatra: 'today.nakshatra', yoga: 'today.yoga', karana: 'today.karana', masa: 'today.masa', moonRashi: 'today.moonSign', sunRashi: 'today.sunSign', ritu: 'today.ritu', ayana: 'today.ayana', samvatsara: 'today.samvat' };
function loadNames(): { person1?: string; person2?: string } { try { return JSON.parse(localStorage.getItem(NAMES_KEY) || '{}'); } catch { return {}; } }

export async function renderReport(view: HTMLElement, c: ReportCtx) {
  const { t, esc } = c;
  if (!c.lastReq) { view.innerHTML = `<div class="card center"><p class="muted">${t('report.noResult')}</p><a class="btn btn-gold" href="#/muhurta">${t('muhurta.title')}</a></div>`; return; }
  loadReportFonts();
  view.innerHTML = `<a href="#/muhurta" class="small">‹ ${t('report.back')}</a><h1>${t('report.title')}</h1><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`;
  const family = c.region === 'west' ? 'west' : c.region === 'south' ? 'south' : 'north';
  const names = loadNames();
  let m: ReportModel;
  try { m = await c.call('report', { req: c.lastReq, lang: c.lang, family, names }); }
  catch (e: any) { if (c.isCurrent?.() === false) return; view.innerHTML = `<div class="card">Error: ${esc(e.message)}</div>`; return; }
  if (c.isCurrent?.() === false) return;
  const unlocked = await c.isUnlocked();
  if (unlocked) c.onFirstFullRender?.();
  const tz = m.cover.place.tz;
  const T = (iso: string | null | undefined) => c.fmtTime(iso, tz);
  const TD = (iso: string | null | undefined, ref: string) => c.fmtTimeD(iso, ref, tz);
  const D = c.fmtDate;
  const W = (w: RWin | null) => w ? `${T(w.start)}–${T(w.end)}` : '—';
  const WD = (w: RWin | null, ref: string) => w ? `${TD(w.start, ref)}–${TD(w.end, ref)}` : '—';
  const lock = (html: string) => unlocked ? html : `<div class="rp-blur" aria-hidden="true">${html}</div>`;
  const yearLabel = m.sankalpa[0]?.yearSystem === 'gujarati' ? t('report.gujaratiYear') : m.sankalpa[0]?.yearSystem === 'shaka' ? t('report.shakaYear') : t('report.vikramYear');
  const strictness = t('muhurta.' + m.cover.strictness);
  const tradition = `${t('settings.' + m.cover.region)} · ${t('today.' + m.cover.monthSystem)}`;
  const genAt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(new Date(m.generatedAt));
  const deck = reportDeck({ base: c.base, brand: t('report.kicker'), subject: `${esc(m.cover.event.local)} · ${esc(m.cover.city)}`, note: esc(m.footer.line) });
  const best = (d: ReportDay) => d.windows.reduce((a, b) => (b.score > a.score ? b : a), d.windows[0]);
  const dayCtx = (date: string, i: number) => `${t('report.dayN', { n: i + 1 })} · ${esc(D(date))}`;

  // 1. Cover
  const who = m.cover.names.person1 || m.cover.names.person2 ? `${t('report.preparedFor')} <b>${esc([m.cover.names.person1, m.cover.names.person2].filter(Boolean).join(' · '))}</b>` : undefined;
  const cover = deck.cover({
    kicker: t('report.title'), title: esc(m.cover.event.local),
    sub: m.cover.event.local !== m.cover.event.en ? esc(m.cover.event.en) : undefined,
    forLine: who, invocation: m.cover.invocation ? esc(m.cover.invocation.line) : undefined,
    facts: [
      [t('report.cover.city'), esc(m.cover.city)],
      [t('report.cover.dates'), `${esc(D(m.cover.from))} – ${esc(D(m.cover.to))}`],
      [t('report.cover.strictness'), esc(strictness)],
      [t('report.cover.tradition'), esc(tradition)],
    ],
    fine: `${t('report.cover.generated')} ${esc(genAt)} · ShubhDate v${esc(m.engineVersion)} · ${esc(m.cover.evaluatedDays)} ${t('muhurta.evaluated')} · ${t('muhurta.confidence')}: ${esc(m.cover.confidence)}`,
    note: t('report.cover.onDevice'),
  });

  // 2. The five best windows, one column each
  const summary = deck.slide('rp-s-dates', `${slideTitle(t('report.summary'), `${esc(D(m.cover.from))} – ${esc(D(m.cover.to))} · ${esc(m.cover.evaluatedDays)} ${t('muhurta.evaluated')}`)}
    <div class="rp-dates" style="--n:${Math.max(1, m.summary.length)}">${m.summary.map((s, i) => { const p = dateParts(s.date, c.lang); return `<div class="rp-datecol ${i === 0 ? 'best' : ''}">
      <div class="rp-dc-rank rp-label"><span>${String(i + 1).padStart(2, '0')}</span>${i === 0 ? `<span>${t('report.windowOf')}</span>` : ''}</div>
      <div><div class="rp-dc-day">${esc(p.dayMonth)}</div><div class="rp-small rp-muted">${esc(p.weekdayYear)}</div></div>
      <div class="rp-dc-win">${label(t('report.col.window'))}<div class="rp-dc-time">${T(s.start)} – ${T(s.end)}</div></div>
      ${scoreRing(s.score)}
      <dl class="rp-dc-meta"><div><dt>${t('report.col.nakshatra')}</dt><dd>${esc(s.nakshatra)}</dd></div><div><dt>${t('report.col.tithi')}</dt><dd>${esc(s.tithi)}</dd></div><div><dt>${t('report.col.choghadiya')}</dt><dd>${esc(s.choghadiya ?? '—')}</dd></div></dl>
    </div>`; }).join('')}</div>`);

  // 3a. A date: the window in large type, why it works, and the five limbs
  const spanFact = (k: string, spans: { label: string; end: string }[], ref: string) => fact(k, esc(spans[0]?.label ?? '—'), spans.length ? `${t('today.till')} ${TD(spans[0].end, ref)}${spans[1] ? ` → ${esc(spans[1].label)}` : ''}` : undefined);
  const dateSlide = (d: ReportDay, i: number, onlyBest: boolean) => {
    const w = best(d); const others = onlyBest ? [] : d.windows.filter(x => x !== w);
    return deck.slide('rp-s-date', `<div class="rp-cols">
      <div class="rp-col w125">
        ${slideTitle(esc(D(d.date)), esc(d.headline))}
        <div class="rp-block">${label(t('report.windowOf'))}<div class="rp-window">${T(w.start)} <i>–</i> ${T(w.end)}</div>
          <div>${esc(w.nakshatra)} · ${esc(w.tithi)}${w.choghadiya ? ` · ${esc(w.choghadiya)}` : ''}${w.hora ? ` · ${esc(w.hora)} hora` : ''}</div></div>
        ${others.length ? `<div class="rp-block ruled">${label(t('report.windows'))}<div class="rp-others">${others.map(o => `<span><b>${T(o.start)} – ${T(o.end)}</b> <span class="rp-muted">${t('muhurta.score')} ${o.score}${o.choghadiya ? ` · ${esc(o.choghadiya)}` : ''}</span></span>`).join('')}</div></div>` : ''}
      </div>
      <div class="rp-col">
        <div class="rp-scorebox">${scoreRing(w.score)}<div>${label(t('muhurta.score'))}<div class="rp-muted">${w.score} / 100</div></div></div>
        ${w.keep.length ? `<div class="rp-block">${heading(t('result.keep'))}${list(w.keep.map(esc), 'keep')}</div>` : ''}
        ${w.avoid.length ? `<div class="rp-block">${heading(t('result.avoid'))}${list(w.avoid.map(esc), 'avoid')}</div>` : ''}
      </div></div>
      <div class="rp-strip" style="--n:5">${fact(t('today.vara'), esc(d.vara))}${spanFact(t('today.tithi'), d.tithi, d.date)}${spanFact(t('today.nakshatra'), d.nakshatra, d.date)}${spanFact(t('today.yoga'), d.yoga, d.date)}${spanFact(t('today.karana'), d.karana, d.date)}</div>`, dayCtx(d.date, i));
  };

  // 3b. The same day, sunrise to sunset, as a timeline (one grid column per minute of daylight)
  const hoursSlide = (d: ReportDay, i: number) => {
    const t0 = Date.parse(d.sunrise), N = Math.max(60, Math.round((Date.parse(d.sunset) - t0) / 60000));
    const grid = `style="grid-template-columns:repeat(${N},minmax(0,1fr))"`;
    const pos = (w: RWin) => { const s = Math.max(0, Math.round((Date.parse(w.start) - t0) / 60000)), e = Math.min(N, Math.round((Date.parse(w.end) - t0) / 60000)); return e - s >= 4 ? { s, len: e - s } : null; };
    type Mk = { name: string; w: RWin; good: boolean };
    const mk = (name: string, w: RWin | null, good: boolean): Mk[] => w ? [{ name, w, good }] : [];
    const fav: Mk[] = [...mk(t('today.abhijit'), d.kala.abhijit, true), ...d.kala.amritKaal.flatMap(w => mk(t('today.amrit'), w, true))];
    const avoid: Mk[] = [...mk(t('today.rahu'), d.kala.rahuKaal, false), ...mk(t('today.yama'), d.kala.yamaganda, false), ...mk(t('today.gulika'), d.kala.gulika, false), ...d.kala.durmuhurta.flatMap(w => mk(t('today.durmuhurta'), w, false)), ...d.kala.varjyam.flatMap(w => mk(t('today.varjyam'), w, false))];
    // Marks that touch daylight go on the timeline, packed into as few rows as keep their labels apart; the rest are listed underneath.
    const afterDark: Mk[] = [];
    const rows = (items: Mk[]) => {
      const out: { end: number; html: string[] }[] = [];
      const placed = items.map(x => ({ x, p: pos(x.w) })).filter(o => { if (!o.p) afterDark.push(o.x); return !!o.p; }).sort((a, b) => a.p!.s - b.p!.s);
      for (const { x, p } of placed) {
        const mid = p!.s + p!.len / 2, half = Math.max(p!.len / 2, N * 0.055); // a two-line label needs about 11% of the width
        let row = out.find(r => r.end <= mid - half); if (!row) { row = { end: -Infinity, html: [] }; out.push(row); }
        row.end = mid + half;
        row.html.push(`<div class="rp-mk ${x.good ? 'good' : ''}" style="grid-column:${p!.s + 1} / span ${p!.len}"><div class="bar"></div><span class="nm">${esc(x.name)}</span><span>${WD(x.w, d.date)}</span></div>`);
      }
      return out.map(r => `<div class="rp-track" ${grid}>${r.html.join('')}</div>`).join('');
    };
    const lane = (name: string, tracks: string) => tracks ? `<div class="rp-lane">${label(name)}<div class="rp-tracks">${tracks}</div></div>` : '';
    const w = best(d), wp = pos(w);
    const winLane = wp
      ? `<div class="rp-lane end">${label(t('report.windowOf'))}<div class="rp-tracks"><div class="rp-track" ${grid}><div class="rp-mk win" style="grid-column:${wp.s + 1} / span ${wp.len}"><div class="bar"></div><span class="nm">${T(w.start)} – ${T(w.end)}</span></div></div></div></div>`
      : `<div class="rp-lane">${label(t('report.windowOf'))}<div class="rp-mk win"><span class="nm">${TD(w.start, d.date)} – ${TD(w.end, d.date)}</span></div></div>`;
    const chog = (segs: ReportDay['choghadiya']['day'], cls = '') => `<div class="rp-chog ${cls}">${segs.map(x => `<div class="rp-c ${x.quality}"><b>${esc(x.label)}</b><span>${T(x.start)}</span></div>`).join('')}</div>`;
    const [h0, m0] = T(d.sunrise).split(':').map(Number); const ticks: string[] = [];
    for (let off = (60 - m0) % 60, h = m0 ? h0 + 1 : h0; off <= N - 12; off += 60, h++) if (off >= 12) ticks.push(`<span style="grid-column:${off + 1} / span 1">${String(h % 24).padStart(2, '0')}:00</span>`);
    const favLane = lane(t('result.keep'), rows(fav)), avoidLane = lane(t('result.avoid'), rows(avoid));
    const sunMoon = [
      fact(t('today.sunrise'), T(d.sunrise)), fact(t('today.sunset'), T(d.sunset)),
      fact(t('today.moonrise'), d.moonrise ? TD(d.moonrise, d.date) : t('today.none')), fact(t('today.moonset'), d.moonset ? TD(d.moonset, d.date) : t('today.none')),
      fact(t('report.nextSunrise'), TD(d.nextSunrise, d.date)), fact(t('today.brahma'), WD(d.kala.brahmaMuhurta, d.date)), fact(t('today.pradosha'), W(d.kala.pradosha)),
      ...afterDark.map(x => fact(esc(x.name), WD(x.w, d.date))),
    ];
    const seen = new Set<string>();
    const flags = d.flags.filter(f => { const k = `${f.text}|${f.window?.start ?? ''}`; if (seen.has(k)) return false; seen.add(k); return true; });
    return deck.slide('rp-s-hours', `${slideTitle(t('report.kala'), `${esc(D(d.date))} · ${t('today.sunrise')} ${T(d.sunrise)} · ${t('today.sunset')} ${T(d.sunset)}`)}
      <div class="rp-lanes">${winLane}
        <div class="rp-lane mid">${label(`${t('today.choghadiya')} · ${t('today.day')}`)}${chog(d.choghadiya.day)}</div>
        <div class="rp-lane axis"><div class="rp-label"></div><div class="rp-axis" ${grid}>${ticks.join('')}</div></div>
        ${favLane}${avoidLane}</div>
      <div class="rp-foot2">
        <div class="rp-block grow2">${label(t('report.sunMoon'))}<div class="rp-minigrid">${sunMoon.join('')}</div>
          ${flags.length ? `${label(t('report.flags'))}<div class="rp-pills">${flags.map(f => `<span class="rp-pill ${f.kind === 'auspicious' ? 'good' : f.kind === 'inauspicious' ? 'avoid' : ''}">${esc(f.text)}${f.window ? ` · ${WD(f.window, d.date)}` : ''}</span>`).join('')}</div>` : ''}</div>
        <div class="rp-block">${label(`${t('today.choghadiya')} · ${t('today.night')}`)}${chog(d.choghadiya.night, 'night')}</div>
      </div>`, dayCtx(d.date, i));
  };

  // 3c. Its sankalpa
  const sankSlide = (s: ReportModel['sankalpa'][0], i: number) => deck.slide('rp-s-sank', `${slideTitle(t('report.sankalpaPage'), t('report.sankalpaNote', { system: yearLabel }))}
    <div class="rp-cols rp-sank"><div class="rp-col top w115">${label(t('report.deva'))}<div class="rp-deva" lang="sa">${esc(s.devanagari)}</div></div>
    <div class="rp-col top">${label(t('report.iast'))}<div class="rp-iast" lang="sa-Latn">${esc(s.iast)}</div></div></div>`, dayCtx(s.date, i));

  // 4. Appendix for the pandit: one slide per chosen moment (every limb, every rule with its weight and source)
  const panditSlide = (mo: ReportModel['pandit']['moments'][0], i: number) => {
    const rules = m.pandit.rules.filter(r => r.date === mo.date);
    return deck.slide('rp-s-pandit', `${slideTitle(t('report.pandit'), i === 0 ? t('report.panditIntro') : `${t('report.moment')}: ${esc(D(mo.date))} ${T(mo.start)}–${T(mo.end)}`)}
      <div class="rp-cols">
        <div class="rp-col top w115">${heading(`${t('report.moment')} · ${T(mo.start)}–${T(mo.end)}`)}
          <table class="rp-table rp-limbs"><thead><tr><th>${t('report.limb')}</th><th>${t('report.deva')}</th><th>${t('report.iast')}</th><th></th></tr></thead><tbody>${mo.limbs.map(l => `<tr><td class="rp-muted">${t(LIMB_KEY[l.kind] ?? l.kind)}</td><td class="rp-deva">${esc(l.deva)}</td><td class="rp-iast">${esc(l.iast)}</td><td>${esc(l.en)}</td></tr>`).join('')}</tbody></table></div>
        <div class="rp-col top">${heading(t('report.rules'))}
          <table class="rp-table"><thead><tr><th>${t('report.rule')}</th><th class="num">${t('report.weight')}</th></tr></thead><tbody>${rules.map(r => `<tr class="${r.flagged ? 'flag' : ''}"><td>${r.flagged ? '⚠ ' : ''}${esc(r.sentence)}<span class="rp-src">${esc(humanSource(r.source))}</span></td><td class="num ${r.weight < 0 ? 'neg' : ''}">${r.weight > 0 ? '+' : ''}${r.weight}</td></tr>`).join('')}</tbody></table></div>
      </div>`, dayCtx(mo.date, i));
  };
  const cv = m.pandit.conventions;
  const notes = deck.slide('rp-s-notes', `${slideTitle(t('report.conventions'))}
    <div class="rp-cols">
      <div class="rp-col top w115"><div>
        ${kv(t('report.conv.ayanamsa'), `${esc(cv.ayanamsa)}<br><span class="rp-small rp-muted">${cv.ayanamsaByDay.map(a => `${esc(D(a.date))}: ${a.degrees.toFixed(4)}°`).join(' · ')}</span>`)}
        ${kv(t('report.conv.sunrise'), esc(cv.sunrise))}${kv(t('report.conv.day'), esc(cv.dayDefinition))}${kv(t('report.conv.month'), esc(cv.monthSystem))}${kv(t('report.conv.year'), esc(cv.yearSystem))}${kv(t('report.conv.ephemeris'), esc(cv.ephemeris))}</div></div>
      <div class="rp-col top">${heading(t('report.caveats'))}${list(m.pandit.caveats.map(esc))}
        <p class="rp-small rp-muted">${m.pandit.unverified.length ? t('report.unverified') : t('report.noUnverified')}</p></div>
    </div>`);
  const sources = deck.slide('rp-s-sources', `${slideTitle(t('report.sourcesPage'), t('report.classical'))}
    ${list(m.pandit.classicalSources.map(s => esc(humanSource(s))))}
    <p class="rp-small">${esc(t('report.engineNote', { v: m.engineVersion, url: m.footer.engineUrl }))}</p>
    <p class="rp-small"><a href="${esc(m.pandit.reviewDoc)}">docs/PANDIT-REVIEW.md</a></p>
    <p class="rp-final">${esc(m.footer.line)}</p>`);

  // Inside the Play app the lock card sells the two products through Play Billing; on the web it only explains.
  let products: ProductDetails[] = [];
  if (!unlocked) { try { if (await isPlayBillingAvailable()) products = await listProducts(); } catch { products = []; } }
  if (c.isCurrent?.() === false) return;
  const skuSingle = products.find(p => p.itemId === 'report_single'), skuFamily = products.find(p => p.itemId === 'family_annual');
  const buyButtons = products.length
    ? `<div class="row" style="border:0;gap:8px;flex-wrap:wrap;justify-content:flex-start;margin-top:8px">${skuSingle ? `<button class="btn btn-gold btn-small" data-buy="report_single">${t('report.buyReport', { price: formatPrice(skuSingle) })}</button>` : ''}${skuFamily ? `<button class="btn btn-outline btn-small" data-buy="family_annual">${t('report.buyFamily', { price: formatPrice(skuFamily) })}</button>` : ''}<button class="btn btn-outline btn-small" id="rp-restore">${t('report.restore')}</button></div><p class="small muted">${t('report.playNote')}</p>`
    : `<p class="small muted">${t('report.playOnly')}</p>`;
  const lockedCard = unlocked ? '' : `<div class="card gold rp-lockcard"><div class="label">${t('report.lockedTitle')}</div><p class="small">${t('report.previewNote')}</p><p class="small"><b>${t('report.fullContains')}:</b> ${t('report.fullList')}</p>${buyButtons}</div>`;
  const toolbar = reportToolbar({
    backHref: '#/muhurta', back: t('report.back'), title: t('report.title'), badge: unlocked ? '' : `<span class="pill info">${t('report.preview')}</span>`, download: t('report.download'),
    buttons: `<button class="btn btn-outline btn-small" id="rp-share">${t('report.share')}</button>`,
    extra: `<details class="card"><summary class="label">${t('report.namesLabel')}</summary><div class="grid2"><div class="field"><label>${t('report.name1')}</label><input id="rp-n1" value="${esc(names.person1 ?? '')}"></div><div class="field"><label>${t('report.name2')}</label><input id="rp-n2" value="${esc(names.person2 ?? '')}"></div></div></details>`,
  });

  const dayDeck = (d: ReportDay, i: number, onlyBest: boolean) => `${dateSlide(d, i, onlyBest)}${hoursSlide(d, i)}${m.sankalpa[i] ? sankSlide(m.sankalpa[i], i) : ''}`;
  const appendix = `${m.pandit.moments.map(panditSlide).join('')}${notes}${sources}`;
  const first = m.days[0];
  const slides = unlocked
    ? `${cover}${summary}${m.days.map((d, i) => dayDeck(d, i, false)).join('')}${appendix}`
    : `${cover}${first ? dayDeck(first, 0, true) : ''}${lockedCard}${lock(`${summary}${m.days.slice(1).map((d, i) => dayDeck(d, i + 1, false)).join('')}${appendix}`)}`;
  mountReport(view, toolbar, c.lang, slides);

  view.querySelector('#rp-share')!.addEventListener('click', async () => {
    const text = [t('report.shareText', { event: m.cover.event.local, city: m.cover.city, from: D(m.cover.from), to: D(m.cover.to) }), ...m.summary.map(s => `• ${D(s.date)} ${T(s.start)}–${T(s.end)} (${s.score}/100): ${s.headline}`), m.footer.line, location.origin + c.base].join('\n');
    if (navigator.share) { try { await navigator.share({ title: 'ShubhDate', text }); } catch { /* cancelled */ } }
    else { try { await navigator.clipboard?.writeText(text); c.toast(t('common.copied')); } catch { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); } }
  });
  // Play Billing (only rendered inside the Play app): buy -> Worker claim -> cached token -> re-render unlocked.
  for (const btn of Array.from(view.querySelectorAll<HTMLButtonElement>('[data-buy]'))) btn.addEventListener('click', async () => {
    const sku = btn.dataset.buy as Sku; btn.disabled = true;
    try { await purchase(sku); c.toast(t('report.unlocked')); renderReport(view, c); }
    catch (e: any) {
      btn.disabled = false;
      if (!(e instanceof PurchaseError && e.code === 'cancelled')) c.toast(t('report.buyFailed', { err: String(e?.code ?? e?.message ?? 'error') }));
    }
  });
  view.querySelector('#rp-restore')?.addEventListener('click', async () => {
    const n = await restorePurchases(); c.toast(t('report.restored', { n: String(n) })); if (n) renderReport(view, c);
  });
  const saveNames = () => { const n1 = (view.querySelector('#rp-n1') as HTMLInputElement).value.trim(), n2 = (view.querySelector('#rp-n2') as HTMLInputElement).value.trim(); localStorage.setItem(NAMES_KEY, JSON.stringify({ person1: n1 || undefined, person2: n2 || undefined })); };
  for (const id of ['#rp-n1', '#rp-n2']) view.querySelector(id)!.addEventListener('change', () => { saveNames(); renderReport(view, c); });
}
