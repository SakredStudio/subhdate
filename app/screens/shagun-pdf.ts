// Shagun Register PDF (pdf-lib, vendored from Almsy's layout pattern): A4 pages, running numbers, totals per currency.
// Loaded on demand (dynamic import) so the 500 KB library never enters the app shell.
// Limitation: Helvetica only covers Latin-1; names in Devanagari/Gujarati are replaced by '?' and a note is printed
// (next step: fontkit + Noto fonts). The in-app register keeps the original spelling.
import { registerRows, fmtAmount, fmtTotals, type ShagunEvent, type ShagunGift, type Currency } from '../../engine/shagun.ts';

const A4: [number, number] = [595.28, 841.89];
const M = 40; // margin
type C3 = readonly [number, number, number];
const INK: C3 = [0.145, 0.11, 0.188], MAROON: C3 = [0.494, 0.176, 0.239], GOLD: C3 = [0.737, 0.545, 0.173], LINE: C3 = [0.86, 0.81, 0.71], MUTED: C3 = [0.42, 0.38, 0.33];

let stripped = false;
function latin(s: string): string {
  const out = s.replace(/[^\u0000-ÿ–—‘’“”•€]/g, ch => { if (!/[​-‍]/.test(ch)) stripped = true; return /[​-‍]/.test(ch) ? '' : '?'; });
  return out.replace(/\?{2,}/g, '?');
}
const money = (amount: number, c: Currency) => latin(fmtAmount(amount, c).replace('₹', 'Rs '));

export interface PdfLabels { title: string; event: string; date: string; dirReceived: string; dirGiven: string; giver: string; family: string; kind: string; amount: string; note: string; total: string; cash: string; count: string; page: string; madeWith: string; scriptNote: string; kinds: Record<string, string>; types: Record<string, string>; }

export async function buildRegisterPdf(events: ShagunEvent[], gifts: ShagunGift[], L: PdfLabels, fmtDate: (iso: string) => string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('../vendor/pdf-lib.esm.js');
  stripped = false;
  const doc = await PDFDocument.create();
  doc.setTitle(latin(L.title)); doc.setProducer('ShubhDate'); doc.setCreator('ShubhDate · shubhdate.sakredstudio.ca');
  const font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold), serif = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const color = (c: C3) => rgb(c[0], c[1], c[2]);
  let page = doc.addPage(A4), y = A4[1] - M, pageNo = 1;
  const W = A4[0] - 2 * M;
  const text = (s: string, x: number, size = 10, f = font, c: C3 = INK, maxW?: number) => {
    let t = latin(s);
    if (maxW) while (t.length > 1 && f.widthOfTextAtSize(t, size) > maxW) t = t.slice(0, -2) + '…';
    page.drawText(t, { x, y, size, font: f, color: color(c) }); return f.widthOfTextAtSize(t, size);
  };
  const right = (s: string, xRight: number, size = 10, f = font, c: C3 = INK) => { const t = latin(s); page.drawText(t, { x: xRight - f.widthOfTextAtSize(t, size), y, size, font: f, color: color(c) }); };
  const line = (c: C3 = LINE, w = 0.6) => { page.drawLine({ start: { x: M, y: y - 3 }, end: { x: M + W, y: y - 3 }, thickness: w, color: color(c) }); };
  const footer = () => {
    const yy = y; y = M - 12;
    text(`${L.madeWith} · shubhdate.sakredstudio.ca`, M, 8, font, MUTED); right(`${L.page} ${pageNo}`, M + W, 8, font, MUTED); y = yy;
  };
  const newPage = () => { footer(); page = doc.addPage(A4); pageNo++; y = A4[1] - M; };
  const ensure = (h: number) => { if (y - h < M + 20) newPage(); };
  // cover line
  text('ShubhDate', M, 9, bold, GOLD); y -= 20;
  text(L.title, M, 22, bold, MAROON); y -= 14;
  text(new Date().toISOString().slice(0, 10), M, 9, font, MUTED); y -= 18;
  const cols = { n: M, giver: M + 28, family: M + 190, kind: M + 330, amount: M + 470, note: M + 190 };
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
  for (const ev of sorted) {
    const r = registerRows(gifts.filter(g => g.eventId === ev.id));
    ensure(70);
    y -= 8; text(`${L.types[ev.type] ?? ev.type} · ${ev.direction === 'given' ? L.dirGiven : L.dirReceived}`, M, 8, font, GOLD); y -= 14;
    text(ev.title, M, 14, bold, INK, W - 120); right(fmtDate(ev.date), M + W, 10, font, MUTED); y -= 16;
    // header
    text('#', cols.n, 8, bold, MUTED); text(L.giver, cols.giver, 8, bold, MUTED); text(L.family, cols.family, 8, bold, MUTED); text(L.kind, cols.kind, 8, bold, MUTED); right(L.amount, M + W, 8, bold, MUTED); y -= 4; line(); y -= 12;
    for (const row of r.rows) {
      ensure(row.note ? 26 : 15);
      text(String(row.n), cols.n, 9, font, MUTED); text(row.giver, cols.giver, 9.5, font, INK, 156); text(row.family, cols.family, 9, font, MUTED, 134); text(L.kinds[row.kind] ?? row.kind, cols.kind, 9, font, MUTED);
      if (row.amount > 0) right(money(row.amount, row.currency), M + W, 9.5, bold, INK);
      y -= 12;
      if (row.note) { text(row.note, cols.note, 8, serif, MUTED, W - 190); y -= 11; }
      line(LINE, 0.3); y -= 3;
    }
    if (!r.rows.length) { text('—', cols.giver, 9, font, MUTED); y -= 14; }
    ensure(30); y -= 4;
    text(`${L.count}: ${r.count}`, cols.giver, 9, font, MUTED);
    right(`${L.total}: ${latin(fmtTotals(r.totals).replace(/₹/g, 'Rs '))}`, M + W, 10, bold, MAROON); y -= 12;
    if (JSON.stringify(r.cash) !== JSON.stringify(r.totals)) { right(`${L.cash}: ${latin(fmtTotals(r.cash).replace(/₹/g, 'Rs '))}`, M + W, 8.5, font, MUTED); y -= 12; }
    y -= 10;
  }
  if (stripped) { ensure(24); y -= 6; text(L.scriptNote, M, 8, serif, MUTED, W); y -= 12; }
  footer();
  return doc.save();
}
