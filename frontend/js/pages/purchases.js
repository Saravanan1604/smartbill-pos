// ===== Purchases / Stock-In =====
import DB from '../db.js';
import toast from '../components/toast.js';
import { createModal, closeModal } from '../components/modal.js';
import { formatCurrency, formatDate } from '../utils/format.js';

let _rows = 1;

export async function renderPurchases() {
  const purchases = await DB.getPurchases().catch(() => []);
  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>📥 Purchases / Stock-In</h1>
          <p>Record supplier bills — stock increases automatically</p>
        </div>
        <button class="btn btn-primary" id="new-purchase-btn">+ New Purchase</button>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        <div id="purchase-list">${renderList(purchases)}</div>
      </div>
    </div>`;
}

function renderList(purchases) {
  if (!purchases.length) {
    return `<div style="padding:48px;text-align:center;color:var(--text-muted);">
      <div style="font-size:2.5rem;margin-bottom:8px;">📦</div>
      <h3 style="margin-bottom:6px;">No purchases yet</h3>
      <p style="font-size:.85rem;">Click "New Purchase" to record a supplier bill and add stock.</p>
    </div>`;
  }
  return `
    <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
      <thead><tr style="text-align:left;color:var(--text-muted);font-size:.72rem;text-transform:uppercase;">
        <th style="padding:12px 16px;">Supplier</th><th style="padding:12px 16px;">Invoice</th>
        <th style="padding:12px 16px;">Date</th><th style="padding:12px 16px;">Items</th><th style="padding:12px 16px;text-align:right;">Total</th>
      </tr></thead>
      <tbody>${purchases.map(p => `
        <tr style="border-top:1px solid var(--glass-border);">
          <td style="padding:11px 16px;font-weight:600;">${p.supplierName || '—'}</td>
          <td style="padding:11px 16px;color:var(--text-muted);">${p.invoiceNo || '—'}</td>
          <td style="padding:11px 16px;color:var(--text-muted);">${p.date ? formatDate(p.date) : ''}</td>
          <td style="padding:11px 16px;">${p.items.length}</td>
          <td style="padding:11px 16px;text-align:right;font-family:'JetBrains Mono',monospace;">${formatCurrency(p.total)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function itemRow(i) {
  return `
    <tr data-row="${i}">
      <td><input class="form-input pi-name" list="pi-products" placeholder="Product name" style="min-width:140px;"></td>
      <td><input class="form-input pi-qty" type="number" min="0" value="1" style="width:64px;"></td>
      <td><input class="form-input pi-cost" type="number" min="0" step="0.01" placeholder="Cost" style="width:80px;"></td>
      <td><input class="form-input pi-mrp" type="number" min="0" step="0.01" placeholder="MRP" style="width:80px;"></td>
      <td><input class="form-input pi-gst" type="number" min="0" step="0.01" placeholder="GST%" style="width:64px;"></td>
      <td><input class="form-input pi-batch" placeholder="Batch" style="width:80px;"></td>
      <td><input class="form-input pi-expiry" type="month" style="width:120px;"></td>
      <td><button class="btn btn-ghost btn-icon-sm pi-del" title="Remove">✕</button></td>
    </tr>`;
}

export async function initPurchases() {
  const products = await DB.getProducts().catch(() => []);

  async function refresh() {
    const list = document.getElementById('purchase-list');
    if (list) list.innerHTML = renderList(await DB.getPurchases().catch(() => []));
  }

  document.getElementById('new-purchase-btn')?.addEventListener('click', () => {
    _rows = 1;
    createModal({
      id: 'new-purchase',
      title: '📥 New Purchase',
      size: 'lg',
      body: `
        <datalist id="pi-products">${products.map(p => `<option value="${(p.name||'').replace(/"/g,'&quot;')}">`).join('')}</datalist>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Supplier Name</label><input class="form-input" id="pu-supplier" placeholder="e.g. Shanmugam Pharma"></div>
          <div class="form-group"><label class="form-label">Invoice No</label><input class="form-input" id="pu-invoice" placeholder="e.g. 1593"></div>
          <div class="form-group"><label class="form-label">Date</label><input class="form-input" id="pu-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div style="overflow-x:auto;margin-top:8px;">
          <table style="width:100%;border-collapse:collapse;font-size:.8rem;">
            <thead><tr style="color:var(--text-muted);font-size:.7rem;text-align:left;">
              <th style="padding:4px;">Item</th><th style="padding:4px;">Qty</th><th style="padding:4px;">Cost</th><th style="padding:4px;">MRP</th><th style="padding:4px;">GST%</th><th style="padding:4px;">Batch</th><th style="padding:4px;">Expiry</th><th></th>
            </tr></thead>
            <tbody id="pi-body">${itemRow(0)}</tbody>
          </table>
        </div>
        <button class="btn btn-secondary btn-sm" id="pi-add" style="margin-top:8px;">+ Add Item</button>`,
      footer: `<button class="btn btn-secondary" onclick="window._closeModal('new-purchase')">Cancel</button>
               <button class="btn btn-primary" id="pu-save">Save &amp; Add Stock</button>`
    });

    setTimeout(() => {
      const body = document.getElementById('pi-body');
      document.getElementById('pi-add')?.addEventListener('click', () => { body.insertAdjacentHTML('beforeend', itemRow(_rows++)); });
      body.addEventListener('click', (e) => { if (e.target.classList.contains('pi-del')) { if (body.rows.length > 1) e.target.closest('tr').remove(); } });

      document.getElementById('pu-save')?.addEventListener('click', async () => {
        const items = [...body.querySelectorAll('tr')].map(tr => ({
          name: tr.querySelector('.pi-name')?.value?.trim(),
          qty: parseInt(tr.querySelector('.pi-qty')?.value) || 0,
          costPrice: parseFloat(tr.querySelector('.pi-cost')?.value) || 0,
          mrp: parseFloat(tr.querySelector('.pi-mrp')?.value) || 0,
          gst: parseFloat(tr.querySelector('.pi-gst')?.value) || 0,
          batch: tr.querySelector('.pi-batch')?.value || '',
          expiry: tr.querySelector('.pi-expiry')?.value || '',
        })).filter(i => i.name && i.qty > 0);
        if (!items.length) { toast.warning('Add at least one item with a name and quantity'); return; }
        try {
          await DB.addPurchase({
            supplierName: document.getElementById('pu-supplier')?.value || '',
            invoiceNo: document.getElementById('pu-invoice')?.value || '',
            date: document.getElementById('pu-date')?.value,
            items,
          });
          toast.success(`Purchase saved — ${items.length} item(s) stocked in`);
          closeModal('new-purchase');
          refresh();
        } catch (err) { toast.error(err.message); }
      });
    }, 100);
  });
}
