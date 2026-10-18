// Display helpers for strings that come from engine data files.
// Source citations are written for developers ("research/02 §3.3 [S]"); users see a readable form.
export function humanSource(s: string): string {
  return s
    .replace(/research\/0?2\s*/g, 'Vedic sources, ')
    .replace(/research\/0?3\s*/g, 'Technical sources, ')
    .replace(/§\s*/g, 'section ')
    .replace(/\s*,\s*section/g, ', section')
    .trim();
}
