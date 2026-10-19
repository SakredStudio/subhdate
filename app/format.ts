// Display helpers for strings that come from engine data files.
// Source citations are written for developers ("research/02 §3.3 [S]"); users see a readable form.
// Evidence-grade tags ([S], [P-digest], [M] …) are internal; flagged rows are already marked with ⚠ in the UI.
export function humanSource(s: string): string {
  return s
    .replace(/research\/0?2\s*/g, 'Vedic sources, ')
    .replace(/research\/0?3\s*/g, 'Technical sources, ')
    .replace(/research\/0?\d\s*/g, 'Sources, ')
    .replace(/§\s*/g, 'section ')
    .replace(/\[[A-Za-z0-9-]+\](\/\[[A-Za-z0-9-]+\])*/g, '')
    .replace(/\/(?=UNVERIFIED)/g, ' ')
    .replace(/\s*,\s*section/g, ', section')
    .replace(/\s+([;:,.)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s{2,}/g, ' ')
    .replace(/[;:,]\s*$/, '')
    .trim();
}
