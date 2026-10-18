// Muhurta Report screen (#/report): renders engine/report.ts's model as A4 pages; print = PDF.
// Free preview: cover + best window + its sankalpa; the rest is blurred until the device is entitled
// (Play Billing, see entitlement.ts) or the dev/QA flag localStorage['shubhdate.devReport']==='1' is set.
import { humanSource } from '../format.ts';
import type { ReportModel, ReportDay, ReportWindow } from '../../engine/report.ts';

export interface ReportCtx {
  t: (k: string, p?: Record<string, string | number>) => string;
  lang: string; tz: string; cityName: string; region: string; base: string;
  esc: (s: any) => string; fmtTime: (iso: string | null | undefined, zone?: string) => string; fmtTimeD: (iso: string | null | undefined, ref: string, zone?: string) => string; fmtDate: (iso: string) => string;
  scoreRing: (n: number) => string; toast: (m: string) => void;
  call: (op: string, args: any) => Promise<any>;
  lastReq: any; isUnlocked: () => Promise<boolean>; onFirstFullRender?: () => void;
}

const FONTS_ID = 'report-fonts';
export function loadReportFonts() {
  if (document.getElementById(FONTS_ID)) return;
  const l = document.createElement('link'); l.id = FONTS_ID; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;500;600&family=Noto+Sans+Gujarati:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap';
  document.head.appendChild(l);
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
  catch (e: any) { view.innerHTML = `<div class="card">Error: ${esc(e.message)}</div>`; return; }
  const unlocked = await c.isUnlocked();
  if (unlocked) c.onFirstFullRender?.();
  const tz = m.cover.place.tz;
  const T = (iso: string | null | undefined) => c.fmtTime(iso, tz);
  const TD = (iso: string | null | undefined, ref: string) => c.fmtTimeD(iso, ref, tz);
  const D = c.fmtDate;
  const W = (w: { start: string; end: string } | null) => w ? `${T(w.start)}–${T(w.end)}` : '—';
  const WD = (w: { start: string; end: string } | null, ref: string) => w ? `${TD(w.start, ref)}–${TD(w.end, ref)}` : '—';
  const lock = (html: string) => unlocked ? html : `<div class="rp-blur" aria-hidden="true">${html}</div>`;
  const hdr = `${t('report.kicker')} · ${esc(m.cover.event.local)} · ${esc(m.cover.city)}`;
  const yearLabel = m.sankalpa[0]?.yearSystem === 'gujarati' ? t('report.gujaratiYear') : m.sankalpa[0]?.yearSystem === 'shaka' ? t('report.shakaYear') : t('report.vikramYear');
  const strictness = t('muhurta.' + m.cover.strictness);
  const tradition = `${t('settings.' + m.cover.region)} · ${t('today.' + m.cover.monthSystem)}`;
  const genAt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(new Date(m.generatedAt));
  const page = (cls: string, body: string) => `<section class="rp-page ${cls}"><div class="rp-head">${hdr}</div>${body}<div class="rp-foot">${esc(m.footer.line)} · ShubhDate engine v${esc(m.engineVersion)} · MIT</div></section>`;
  const row = (k: string, v: string) => `<div class="rp-row"><span class="rp-k">${k}</span><span class="rp-v">${v}</span></div>`;
  const spans = (list: { label: string; end: string }[], ref: string) => list.map((x, i) => `${i ? '<span class="dim">→</span> ' : ''}<b>${esc(x.label)}</b> <span class="muted">${t('today.till')} ${TD(x.end, ref)}</span>`).join(' ');

  // 1. Cover
  const who = m.cover.names.person1 || m.cover.names.person2 ? `<p class="rp-for">${t('report.preparedFor')} <b>${esc([m.cover.names.person1, m.cover.names.person2].filter(Boolean).join(' · '))}</b></p>` : '';
  const cover = page('rp-cover', `
    <img class="rp-mark" src="${c.base}icons/icon-192.png" width="96" height="96" alt="">
    <div class="rp-kicker">${t('report.kicker')}</div>
    <h1 class="rp-title">${esc(m.cover.event.local)}</h1>
    ${m.cover.event.local !== m.cover.event.en ? `<p class="rp-sub">${esc(m.cover.event.en)}</p>` : ''}
    ${who}
    ${m.cover.invocation ? `<p class="rp-invocation">${esc(m.cover.invocation.line)}</p>` : ''}
    <div class="rp-coverrows">
      ${row(t('report.cover.city'), esc(m.cover.city))}
      ${row(t('report.cover.dates'), `${esc(D(m.cover.from))} – ${esc(D(m.cover.to))}`)}
      ${row(t('report.cover.strictness'), esc(strictness))}
      ${row(t('report.cover.tradition'), esc(tradition))}
      ${row(t('report.cover.generated'), esc(genAt))}
      ${row(t('report.cover.engine'), `ShubhDate v${esc(m.engineVersion)} · ${esc(m.cover.evaluatedDays)} ${t('muhurta.evaluated')} · ${t('muhurta.confidence')}: ${esc(m.cover.confidence)}`)}
    </div>
    <p class="rp-ondevice">🔒 ${t('report.cover.onDevice')}</p>`);

  // 2. Summary
  const summary = page('rp-summary', `<h2>${t('report.summary')}</h2>
    <table class="rp-table"><thead><tr><th>${t('report.col.date')}</th><th>${t('report.col.window')}</th><th>${t('report.col.score')}</th><th>${t('report.col.nakshatra')}</th><th>${t('report.col.tithi')}</th><th>${t('report.col.choghadiya')}</th></tr></thead><tbody>
    ${m.summary.map(s => `<tr><td><b>${esc(D(s.date))}</b></td><td>${T(s.start)}–${T(s.end)}</td><td>${c.scoreRing(s.score)}</td><td>${esc(s.nakshatra)}</td><td>${esc(s.tithi)}</td><td>${esc(s.choghadiya ?? '—')}</td></tr>`).join('')}
    </tbody></table>
    ${m.summary.map(s => `<p class="small muted">${esc(D(s.date))}: ${esc(s.headline)}</p>`).join('')}`);

  // 3. Day pages
  const windowHtml = (w: ReportWindow) => `<div class="rp-window"><div class="rp-wtime">${T(w.start)} – ${T(w.end)} <span class="small muted">· ${t('muhurta.score')} ${w.score}</span></div>
    <div class="small muted">${esc(w.nakshatra)} · ${esc(w.tithi)}${w.choghadiya ? ` · ${esc(w.choghadiya)}` : ''}${w.hora ? ` · ${esc(w.hora)} hora` : ''}</div>
    ${w.keep.length ? `<div class="label">${t('result.keep')}</div><ul class="reasons">${w.keep.map(s => `<li class="keep">${esc(s)}</li>`).join('')}</ul>` : ''}
    ${w.avoid.length ? `<div class="label">${t('result.avoid')}</div><ul class="reasons">${w.avoid.map(s => `<li class="avoid">${esc(s)}</li>`).join('')}</ul>` : ''}</div>`;
  const chog = (list: ReportDay['choghadiya']['day']) => `<div class="rp-chog">${list.map(x => `<div class="rp-c ${x.quality}"><div>${esc(x.label)}</div><div class="small muted">${T(x.start)}</div></div>`).join('')}</div>`;
  const dayPage = (d: ReportDay, i: number, onlyBest: boolean) => {
    const best = d.windows.reduce((a, b) => (b.score > a.score ? b : a), d.windows[0]);
    const wins = onlyBest ? [best] : d.windows;
    return page('rp-day', `<div class="rp-dayhead"><div><div class="label">${t('report.dayN', { n: i + 1 })}</div><h2>${esc(D(d.date))}</h2><p class="muted small">${esc(d.headline)}</p></div>${c.scoreRing(d.score)}</div>
      ${d.summary ? `<p class="small">${esc(d.summary)}</p>` : ''}
      <div class="rp-grid2">
        <div><h3>${t('report.sunMoon')}</h3>${row(t('today.sunrise'), T(d.sunrise))}${row(t('today.sunset'), T(d.sunset))}${row(t('today.moonrise'), d.moonrise ? TD(d.moonrise, d.date) : t('today.none'))}${row(t('today.moonset'), d.moonset ? TD(d.moonset, d.date) : t('today.none'))}${row(t('report.nextSunrise'), TD(d.nextSunrise, d.date))}
          ${row(t('today.masa'), `${esc(m.cover.monthSystem === 'amanta' ? d.masa.amanta : d.masa.purnimanta)} <span class="muted small">(${t('today.' + m.cover.monthSystem)})</span>`)}${row(t('today.samvat'), `${t('today.vikram')} ${d.samvat.vikram} · ${t('today.shaka')} ${d.samvat.shaka} · ${t('today.gujarati')} ${d.samvat.vikramGujarati}`)}${row(t('today.ritu') + ' · ' + t('today.ayana'), `${esc(d.ritu)} · ${esc(d.ayana)}`)}${row(t('today.moonSign') + ' · ' + t('today.sunSign'), `${esc(d.moonRashi)} · ${esc(d.sunRashi)}`)}</div>
        <div><h3>${t('report.limbs')}</h3>${row(t('today.vara'), esc(d.vara))}${row(t('today.tithi'), spans(d.tithi, d.date))}${row(t('today.nakshatra'), spans(d.nakshatra, d.date))}${row(t('today.yoga'), spans(d.yoga, d.date))}${row(t('today.karana'), spans(d.karana, d.date))}${row(t('today.paksha'), esc(d.paksha))}${row(t('today.ayanamsa'), d.ayanamsa.toFixed(4) + '°')}</div>
      </div>
      <h3>${t('report.kala')}</h3>
      <div class="rp-grid2">
        <div>${row(t('today.rahu'), `<span class="pill avoid">${W(d.kala.rahuKaal)}</span>`)}${row(t('today.yama'), W(d.kala.yamaganda))}${row(t('today.gulika'), W(d.kala.gulika))}${row(t('today.abhijit'), d.kala.abhijit ? `<span class="pill good">${W(d.kala.abhijit)}</span>` : t('today.abhijitWed'))}${row(t('today.brahma'), WD(d.kala.brahmaMuhurta, d.date))}</div>
        <div>${row(t('today.durmuhurta'), d.kala.durmuhurta.map(W).join('<br>'))}${row(t('today.varjyam'), d.kala.varjyam.length ? d.kala.varjyam.map(w => WD(w, d.date)).join('<br>') : '—')}${row(t('today.amrit'), d.kala.amritKaal.length ? d.kala.amritKaal.map(w => WD(w, d.date)).join('<br>') : '—')}${row(t('today.pradosha'), W(d.kala.pradosha))}</div>
      </div>
      <h3>${t('today.choghadiya')} · ${t('today.day')}</h3>${chog(d.choghadiya.day)}<h3>${t('today.choghadiya')} · ${t('today.night')}</h3>${chog(d.choghadiya.night)}
      <h3>${onlyBest ? t('report.windowOf') : t('report.windows')}</h3>${wins.map(windowHtml).join('')}
      ${d.flags.length ? `<h3>${t('report.flags')}</h3><div class="rp-flags">${d.flags.map(f => `<span class="pill ${f.kind === 'auspicious' ? 'good' : f.kind === 'inauspicious' ? 'avoid' : 'info'}" >${esc(f.text)}${f.window ? ` · ${WD(f.window, d.date)}` : ''}</span>`).join('')}</div>` : ''}`);
  };

  // 4. Sankalpa
  const sankBlock = (s: ReportModel['sankalpa'][0]) => `<div class="rp-sank"><div class="label">${esc(D(s.date))}</div><div class="rp-deva">${esc(s.devanagari)}</div><div class="rp-iast">${esc(s.iast)}</div></div>`;
  const sankPage = (list: ReportModel['sankalpa']) => page('rp-sankalpa', `<h2>${t('report.sankalpaPage')}</h2><p class="small muted">${t('report.sankalpaNote', { system: yearLabel })}</p>${list.map(sankBlock).join('')}`);

  // 5. Pandit page
  const pandit = page('rp-pandit', `<h2>${t('report.pandit')}</h2><p class="small">${t('report.panditIntro')}</p>
    ${m.pandit.moments.map(mo => `<h3>${t('report.moment')}: ${esc(D(mo.date))} ${T(mo.start)}–${T(mo.end)}</h3>
      <table class="rp-table rp-limbs"><thead><tr><th>${t('report.limb')}</th><th>${t('report.deva')}</th><th>${t('report.iast')}</th><th></th></tr></thead><tbody>${mo.limbs.map(l => `<tr><td class="muted">${t(LIMB_KEY[l.kind] ?? l.kind)}</td><td class="rp-deva">${esc(l.deva)}</td><td class="rp-iast">${esc(l.iast)}</td><td class="small">${esc(l.en)}</td></tr>`).join('')}</tbody></table>`).join('')}
    <h3>${t('report.rules')}</h3>
    <table class="rp-table rp-rules"><thead><tr><th>${t('report.col.date')}</th><th>${t('report.rule')}</th><th>${t('report.weight')}</th><th>${t('report.source')}</th></tr></thead><tbody>
    ${m.pandit.rules.map(r => `<tr class="${r.flagged ? 'flag' : ''}"><td>${esc(D(r.date))}</td><td>${r.flagged ? '⚠ ' : ''}<code>${esc(r.code)}</code><br><span class="small">${esc(r.sentence)}</span></td><td class="${r.weight > 0 ? 'good' : 'avoid'}">${r.weight > 0 ? '+' : ''}${r.weight}</td><td class="small">${esc(humanSource(r.source))}</td></tr>`).join('')}
    </tbody></table>
    <p class="small muted">${m.pandit.unverified.length ? t('report.unverified') : t('report.noUnverified')}</p>
    <h3>${t('report.conventions')}</h3>
    ${row(t('report.conv.ayanamsa'), `${esc(m.pandit.conventions.ayanamsa)}<br><span class="small muted">${m.pandit.conventions.ayanamsaByDay.map(a => `${esc(D(a.date))}: ${a.degrees.toFixed(4)}°`).join(' · ')}</span>`)}
    ${row(t('report.conv.sunrise'), esc(m.pandit.conventions.sunrise))}${row(t('report.conv.day'), esc(m.pandit.conventions.dayDefinition))}${row(t('report.conv.month'), esc(m.pandit.conventions.monthSystem))}${row(t('report.conv.year'), esc(m.pandit.conventions.yearSystem))}${row(t('report.conv.ephemeris'), esc(m.pandit.conventions.ephemeris))}
    <h3>${t('report.caveats')}</h3><ul class="reasons">${m.pandit.caveats.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);

  // 6. Sources
  const sources = page('rp-sources', `<h2>${t('report.sourcesPage')}</h2><h3>${t('report.classical')}</h3><ul class="reasons">${m.pandit.classicalSources.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    <p class="small">${esc(t('report.engineNote', { v: m.engineVersion, url: m.footer.engineUrl }))}</p>
    <p class="small"><a href="${esc(m.pandit.reviewDoc)}">docs/PANDIT-REVIEW.md</a></p>
    <p class="rp-final">${esc(m.footer.line)}</p>`);

  const lockedCard = unlocked ? '' : `<div class="card gold rp-lockcard"><div class="label">${t('report.lockedTitle')}</div><p class="small">${t('report.previewNote')}</p><p class="small"><b>${t('report.fullContains')}:</b> ${t('report.fullList')}</p><p class="small muted">${t('report.playOnly')}</p></div>`;
  const toolbar = `<div class="rp-toolbar"><a href="#/muhurta" class="small">‹ ${t('report.back')}</a><h1>${t('report.title')}</h1>${unlocked ? '' : `<span class="pill info">${t('report.preview')}</span>`}
    <div class="row" style="border:0;gap:8px;justify-content:flex-start"><button class="btn btn-gold btn-small" id="rp-print">⬇ ${t('report.download')}</button><button class="btn btn-outline btn-small" id="rp-share">${t('report.share')}</button></div>
    <details class="card"><summary class="label">${t('report.namesLabel')}</summary><div class="grid2"><div class="field"><label>${t('report.name1')}</label><input id="rp-n1" value="${esc(names.person1 ?? '')}"></div><div class="field"><label>${t('report.name2')}</label><input id="rp-n2" value="${esc(names.person2 ?? '')}"></div></div></details></div>`;

  const first = m.days[0];
  const body = unlocked
    ? [cover, summary, ...m.days.map((d, i) => dayPage(d, i, false)), sankPage(m.sankalpa), pandit, sources].join('')
    : [cover, first ? dayPage(first, 0, true) : '', sankPage(m.sankalpa.slice(0, 1)), lockedCard, lock([summary, ...m.days.slice(1).map((d, i) => dayPage(d, i + 1, false)), sankPage(m.sankalpa.slice(1)), pandit, sources].join(''))].join('');
  view.innerHTML = `${toolbar}<div class="report" lang="${c.lang === 'hinglish' ? 'en' : c.lang}">${body}</div>`;

  // running head for the printed pages (Chrome ≥ 131 page-margin boxes; older Chrome prints the in-page head only)
  let st = document.getElementById('rp-page-style') as HTMLStyleElement | null;
  if (!st) { st = document.createElement('style'); st.id = 'rp-page-style'; document.head.appendChild(st); }
  st.textContent = `@page { @top-center { content: "${hdr.replace(/<[^>]+>/g, '').replace(/["\\]/g, '')}"; font: 9pt 'DM Sans', sans-serif; color: #946916; } @bottom-center { content: "ShubhDate engine v${m.engineVersion} · MIT · " counter(page); font: 8pt 'DM Sans', sans-serif; color: #6C604E; } }`;

  view.querySelector('#rp-print')!.addEventListener('click', async () => { await (document as any).fonts?.ready; window.print(); });
  view.querySelector('#rp-share')!.addEventListener('click', async () => {
    const text = [t('report.shareText', { event: m.cover.event.local, city: m.cover.city, from: D(m.cover.from), to: D(m.cover.to) }), ...m.summary.map(s => `• ${D(s.date)} ${T(s.start)}–${T(s.end)} (${s.score}/100): ${s.headline}`), m.footer.line, location.origin + c.base].join('\n');
    if (navigator.share) { try { await navigator.share({ title: 'ShubhDate', text }); } catch { /* cancelled */ } }
    else { try { await navigator.clipboard?.writeText(text); c.toast(t('common.copied')); } catch { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); } }
  });
  const saveNames = () => { const n1 = (view.querySelector('#rp-n1') as HTMLInputElement).value.trim(), n2 = (view.querySelector('#rp-n2') as HTMLInputElement).value.trim(); localStorage.setItem(NAMES_KEY, JSON.stringify({ person1: n1 || undefined, person2: n2 || undefined })); };
  for (const id of ['#rp-n1', '#rp-n2']) view.querySelector(id)!.addEventListener('change', () => { saveNames(); renderReport(view, c); });
}
