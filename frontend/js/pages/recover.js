// ===== Recover Deleted Invoices =====
import DB from '../db.js';
import toast from '../components/toast.js';
import { formatCurrency } from '../utils/format.js';
import { formatDateTime } from '../utils/format.js';
import { confirmDialog } from '../components/modal.js';

export async function renderRecover() {
  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>♻️ Recover Deleted Invoices</h1>
          <p>Restore bills you deleted — stock is re-applied on recovery</p>
        </div>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        <div id="recover-list">
          <div style="display:flex;justify-content:center;padding:40px;"><div class="loading-spinner"></div></div>
        </div>
      </div>
    </div>`;
}

export async function initRecover() {
  await load();
  window._recoverSale = recover;
}

async function load() {
  const wrap = document.getElementById('recover-list');
  let sales;
  try { sales = await DB.getDeletedSales(); }
  catch (err) { wrap.innerHTML = `<div style="padding:24px;color:var(--danger);">Failed to load: ${err.message}</div>`; return; }

  if (!sales.length) {
    wrap.innerHTML = `
      <div style="padding:48px;text-align:center;color:var(--text-muted);">
        <div style="font-size:2.5rem;margin-bottom:8px;">🗑️</div>
        <h3 style="margin-bottom:6px;">Recycle bin is empty</h3>
        <p style="font-size:.85rem;">Deleted invoices appear here so you can restore them.</p>
      </div>`;
    return;
  }
  wrap.innerHTML = sales.map(s => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--glass-border);">
      <div>
        <div style="font-weight:700;">${s.invoiceNo} · ${formatCurrency(s.total)}</div>
        <div style="font-size:.75rem;color:var(--text-muted);">${s.items.length} items · ${formatDateTime(s.createdAt)}${s.customerName ? ' · ' + s.customerName : ''}</div>
        <div style="font-size:.7rem;color:var(--danger);">Deleted ${s.deletedAt ? formatDateTime(s.deletedAt) : ''}</div>
      </div>
      <button class="btn btn-success btn-sm" onclick="window._recoverSale('${s.id}')">↩ Recover</button>
    </div>`).join('');
}

async function recover(id) {
  const ok = await confirmDialog('Recover this invoice? Its items will be deducted from stock again.', 'Recover Invoice');
  if (!ok) return;
  try {
    await DB.recoverSale(id);
    toast.success('Invoice recovered');
    await load();
  } catch (err) { toast.error(err.message); }
}
