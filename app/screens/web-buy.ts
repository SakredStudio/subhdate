// The website's buy block for a paid report: the same buttons, note and restore-code box on every report screen.
// Only rendered when main.ts hands the screen a WebShop, which it never does inside the Play app (Play Billing only there).
import type { WebShop } from '../webpay.ts';
import type { Sku } from '../entitlement.ts';

type T = (k: string, p?: Record<string, string | number>) => string;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Buttons for one report product plus the Family plan. '' when the website sells neither right now. */
export function webBuyHtml(shop: WebShop, single: Sku, singleLabelKey: string, t: T): string {
  const s = shop.prices[single], f = shop.prices.family_annual;
  if (!s && !f) return '';
  return `<div class="row" style="border:0;gap:8px;flex-wrap:wrap;justify-content:flex-start;margin-top:8px">
      ${s ? `<button class="btn btn-gold btn-small" data-webbuy="${single}">${t(singleLabelKey, { price: esc(s) })}</button>` : ''}
      ${f ? `<button class="btn btn-outline btn-small" data-webbuy="family_annual">${t('report.buyFamilyWeb', { price: esc(f) })}</button>` : ''}
    </div>
    <p class="small muted">${t('report.webNote')}${f ? ` ${t('report.webFamilyNote')}` : ''}</p>
    <details><summary class="small">${t('report.webRestore')}</summary>
      <div class="row" style="border:0;gap:8px;justify-content:flex-start;margin-top:6px">
        <input id="web-code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" placeholder="XXXX-XXXX-XXXX" aria-label="${esc(t('report.webRestore'))}" style="max-width:190px">
        <button class="btn btn-outline btn-small" id="web-code-go" type="button">${t('report.webRestoreGo')}</button>
      </div></details>`;
}

/** Wire the block made by webBuyHtml. `onUnlocked` re-renders the screen after a restore. */
export function wireWebBuy(root: ParentNode, shop: WebShop, back: 'report' | 'naam', o: { t: T; toast: (m: string) => void; onUnlocked: () => void }) {
  for (const btn of Array.from(root.querySelectorAll<HTMLButtonElement>('[data-webbuy]'))) btn.addEventListener('click', async () => {
    btn.disabled = true; o.toast(o.t('report.webStarting'));
    try { await shop.buy(btn.dataset.webbuy as Sku, back); }
    catch (e: any) { btn.disabled = false; o.toast(o.t('report.webFailed', { err: String(e?.code ?? e?.message ?? 'error') })); }
  });
  const go = root.querySelector<HTMLButtonElement>('#web-code-go'), input = root.querySelector<HTMLInputElement>('#web-code');
  go?.addEventListener('click', async () => {
    const code = input?.value.trim() ?? ''; if (!code) return;
    go.disabled = true;
    try { await shop.restore(code); o.toast(o.t('report.unlocked')); o.onUnlocked(); }
    catch (e: any) { go.disabled = false; o.toast(['not_found', 'bad_request'].includes(e?.code) ? o.t('report.webRestoreBad') : o.t('report.webFailed', { err: String(e?.code ?? e?.message ?? 'error') })); }
  });
}
