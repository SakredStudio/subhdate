// One layout for every paid report (Muhurta, Namakarana, and whatever is sold next): a deck of slides.
// The shell owns the cover, the slide frame (brand head, foot, slide number), the toolbar, the building blocks
// (title, score ring, facts, lists) and the fit-to-slide pass. A report screen supplies only its own slide bodies.
// Every string handed in here is already-escaped HTML; styling lives in report.css.
//
// Layout: report.css reads the deck's own width. 900px or more (a desktop window, and the landscape PDF page) gives
// true 297x210 slides that scale with the width; narrower (a phone) reflows the same slides into stacked cards.

const FONTS_ID = 'report-fonts';
export function loadReportFonts() {
  if (document.getElementById(FONTS_ID)) return;
  const l = document.createElement('link'); l.id = FONTS_ID; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;500;600&family=Noto+Sans+Gujarati:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap';
  document.head.appendChild(l);
}

export interface DeckOpts {
  /** app base path, for the logo and cover art */
  base: string;
  /** left of every slide head, e.g. "ShubhDate · Muhurta Report" */
  brand: string;
  /** right of every slide head unless a slide gives its own, e.g. "Wedding · Toronto" */
  subject: string;
  /** the one-line note at the foot of every slide */
  note: string;
}
export interface CoverOpts {
  kicker: string; title: string;
  sub?: string; forLine?: string; invocation?: string;
  /** up to four label/value facts along the bottom */
  facts: [string, string][];
  /** small print under the facts (generated at, engine) */
  fine?: string;
  /** the privacy line at the foot of the cover */
  note: string;
}
export interface Deck { slide: (cls: string, body: string, ctx?: string) => string; cover: (o: CoverOpts) => string; }

export function reportDeck(d: DeckOpts): Deck {
  const mark = `<img src="${d.base}icons/mark-84.png" width="28" height="28" alt="">`;
  const slide = (cls: string, body: string, ctx?: string) => `<section class="rp-slide ${cls}"><div class="rp-frame">
    <header class="rp-shead"><span class="rp-brand">${mark}<span>${d.brand}</span></span><span>${ctx ?? d.subject}</span></header>
    <div class="rp-sbody">${body}</div>
    <footer class="rp-sfoot"><span>${d.note}</span><span class="rp-num"></span></footer></div></section>`;
  // The cover every paid report opens with: logo, title block, lotus, facts, privacy line.
  const cover = (o: CoverOpts) => `<section class="rp-slide rp-s-cover"><div class="rp-frame">
    <div class="rp-cbrand">${mark}<span>ShubhDate</span></div>
    <div class="rp-sbody rp-cmain">
      <div class="rp-ctext">
        <div class="rp-label">${o.kicker}</div>
        <h1 class="rp-display${o.title.replace(/<[^>]+>/g, '').length > 12 ? ' long' : ''}">${o.title}</h1>
        ${o.sub ? `<p class="rp-sub">${o.sub}</p>` : ''}
        ${o.forLine ? `<p class="rp-cfor">${o.forLine}</p>` : ''}
        ${o.invocation ? `<p class="rp-cinv">${o.invocation}</p>` : ''}
      </div>
      <img class="rp-lotus" src="${d.base}report-lotus.webp" width="400" height="400" alt="">
    </div>
    <div class="rp-cfacts" style="--n:${Math.max(1, o.facts.length)}">${o.facts.map(([k, v]) => fact(k, v)).join('')}</div>
    ${o.fine ? `<div class="rp-fine">${o.fine}</div>` : ''}
    <footer class="rp-sfoot"><span>🔒 ${o.note}</span><span class="rp-num"></span></footer></div></section>`;
  return { slide, cover };
}

// ---- building blocks shared by all reports ----
export const slideTitle = (title: string, sub?: string) => `<div class="rp-title"><h1 class="rp-h1">${title}</h1>${sub ? `<p class="rp-sub">${sub}</p>` : ''}</div>`;
export const label = (text: string) => `<div class="rp-label">${text}</div>`;
export const heading = (text: string) => `<h2 class="rp-h2">${text}</h2>`;
export const fact = (k: string, v: string, sub?: string) => `<div class="rp-fact"><div class="rp-label">${k}</div><div class="rp-fact-v">${v}</div>${sub ? `<div class="rp-fact-s">${sub}</div>` : ''}</div>`;
export const kv = (k: string, v: string) => `<div class="rp-kv"><span class="rp-k">${k}</span><span class="rp-v">${v}</span></div>`;
export const list = (items: string[], kind: 'keep' | 'avoid' | 'plain' = 'plain') => items.length ? `<ul class="rp-list ${kind}">${items.map(s => `<li><span>${s}</span></li>`).join('')}</ul>` : '';
export function scoreRing(score: number): string {
  const c = 2 * Math.PI * 34;
  return `<svg class="rp-ring" viewBox="0 0 80 80" role="img" aria-label="${score} / 100"><circle class="track" cx="40" cy="40" r="34" fill="none" stroke-width="3"/><circle class="arc" cx="40" cy="40" r="34" fill="none" stroke-width="3" stroke-dasharray="${(score / 100 * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 40 40)"/><text x="40" y="49" text-anchor="middle">${score}</text></svg>`;
}
/** "11 Feb" and "Thursday, 2027" in the report language, for the large date on a slide. */
export function dateParts(iso: string, lang: string): { dayMonth: string; weekdayYear: string } {
  const [y, m, d] = iso.split('-').map(Number); const at = new Date(Date.UTC(y, m - 1, d, 12));
  const loc = lang === 'hi' || lang === 'mr' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-GB';
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc, { ...o, timeZone: 'UTC' }).format(at);
  return { dayMonth: f({ day: 'numeric', month: 'short' }), weekdayYear: `${f({ weekday: 'long' })}, ${y}` };
}
/** Split a long list into slide-sized groups. */
export function chunk<T>(items: T[], size: number): T[][] { const out: T[][] = []; for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size)); return out; }

// ---- toolbar and mounting ----
export interface ToolbarOpts { backHref: string; back: string; title: string; badge?: string; download: string; buttons?: string; extra?: string; }
/** Back link, title, Download PDF (always first), then any report-specific buttons and controls. */
export function reportToolbar(o: ToolbarOpts): string {
  return `<div class="rp-toolbar"><a href="${o.backHref}" class="small" id="rp-back">‹ ${o.back}</a><h1>${o.title}</h1>${o.badge ?? ''}
    <div class="row" style="border:0;gap:8px;justify-content:flex-start"><button class="btn btn-gold btn-small" id="rp-print">⬇ ${o.download}</button>${o.buttons ?? ''}</div>
    ${o.extra ?? ''}</div>`;
}
/** Put a report on screen: toolbar, then the deck. */
export function mountReport(view: HTMLElement, toolbar: string, lang: string, slides: string) {
  view.innerHTML = `${toolbar}<div class="report" lang="${lang === 'hinglish' ? 'en' : lang}">${slides}</div>`;
  document.body.dataset.report = '1'; // widens the view on a desktop and hides the app chrome in print; main.ts clears it on every route
  const refit = fitSlides(view);
  view.querySelector('#rp-print')?.addEventListener('click', async () => { await (document as any).fonts?.ready; refit(); window.print(); });
}
/** Leave report mode (the router calls this on every navigation). */
export function closeReport() { delete document.body.dataset.report; }

/** Fit-to-slide, like a presentation app's autofit: lay the deck out once at the PDF's width off screen, and wherever a
 *  slide's content is taller than the slide, step its type down until it fits. Slides scale with their width, so a
 *  factor found here holds for every wide layout and for the printed page. Phones (stacked cards) never clip. */
export function fitSlides(view: HTMLElement): () => void {
  const report = view.querySelector<HTMLElement>('.report'); if (!report) return () => {};
  const run = () => {
    if (!report.isConnected) return;
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-99999px;top:0;width:1123px;visibility:hidden;pointer-events:none';
    const ghost = report.cloneNode(true) as HTMLElement;
    ghost.querySelectorAll('.rp-blur').forEach(b => b.classList.remove('rp-blur'));
    ghost.querySelectorAll('.rp-lockcard').forEach(b => b.remove());
    host.appendChild(ghost); document.body.appendChild(host);
    const live = report.querySelectorAll<HTMLElement>('.rp-slide');
    ghost.querySelectorAll<HTMLElement>('.rp-slide').forEach((s, i) => {
      const body = s.querySelector<HTMLElement>('.rp-sbody'); if (!body) return;
      s.style.removeProperty('--fit'); // the clone carries the last pass's factor; always measure from full size
      let fit = 1;
      while (fit > 0.6 && body.scrollHeight > body.clientHeight + 1) { fit -= 0.04; s.style.setProperty('--fit', fit.toFixed(2)); }
      if (fit < 1) live[i]?.style.setProperty('--fit', fit.toFixed(2)); else live[i]?.style.removeProperty('--fit');
    });
    host.remove();
  };
  // Web fonts arrive after the first layout and change every line length, so measure again whenever a batch lands.
  const fonts = (document as any).fonts;
  const again = () => { if (report.isConnected) run(); else fonts?.removeEventListener?.('loadingdone', again); };
  run(); fonts?.ready?.then(run); fonts?.addEventListener?.('loadingdone', again);
  return run;
}
