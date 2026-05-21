// ===== Inventory Page =====
import DB from '../db.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { createModal, closeModal } from '../components/modal.js';
import toast from '../components/toast.js';

export async function renderInventory() {
  const products = await DB.getProducts();
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.alertThreshold || 10));
  const outOfStock = products.filter(p => p.stock === 0);
  const totalValue = products.reduce((s, p) => s + (p.price * p.stock), 0);
  const totalCostValue = products.reduce((s, p) => s + ((p.costPrice || p.price * 0.75) * p.stock), 0);

  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Inventory</h1>
          <p>Monitor stock levels and manage replenishment</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary" id="update-stock-btn">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Update Stock
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid-4 mb-6">
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-violet">📦</div>
          <div class="kpi-value">${products.length}</div>
          <div class="kpi-label">Total Products</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-cyan">💰</div>
          <div class="kpi-value">${formatCurrency(totalValue)}</div>
          <div class="kpi-label">Stock Value (MRP)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-amber">⚠️</div>
          <div class="kpi-value">${lowStock.length}</div>
          <div class="kpi-label">Low Stock Items</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-red">❌</div>
          <div class="kpi-value">${outOfStock.length}</div>
          <div class="kpi-label">Out of Stock</div>
        </div>
      </div>

      <!-- Alert Cards -->
      ${(lowStock.length + outOfStock.length) > 0 ? `
        <div class="card mb-6">
          <div class="card-header">
            <span class="card-title">⚠️ Stock Alerts (${lowStock.length + outOfStock.length})</span>
          </div>
          <div class="card-body" style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">
            ${[...outOfStock.map(p => ({...p, _s:'out'})), ...lowStock.map(p => ({...p, _s:'low'}))].map(p => `
              <div class="stock-alert-card" style="${p._s === 'out' ? 'background:rgba(239,68,68,.06);border-color:rgba(239,68,68,.2)' : ''}">
                <div style="font-size:1.5rem;">${p._s === 'out' ? '🔴' : '🟡'}</div>
                <div style="flex:1;">
                  <div style="font-size:.875rem;font-weight:600;color:var(--text-primary);">${p.name}</div>
                  <div style="font-size:.75rem;color:var(--text-muted);">Stock: <strong style="color:${p._s === 'out' ? 'var(--danger)' : 'var(--warning)'};">${p.stock}</strong> / Alert: ${p.alertThreshold || 10}</div>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="window.quickRestock('${p.id}')">Restock</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="card mb-6 card-p" style="text-align:center;color:var(--success);padding:20px;">
          ✅ All stock levels are healthy!
        </div>
      `}

      <!-- Full Inventory Table -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">📊 All Products</span>
          <div style="display:flex;gap:8px;align-items:center;">
            <div class="search-bar">
              <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input type="text" class="form-input" id="inv-search" placeholder="Search..." style="padding-left:38px;width:200px;">
            </div>
            <select class="form-select" id="inv-status-filter" style="width:140px;">
              <option value="">All Status</option>
              <option value="ok">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table id="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Barcode</th>
                <th>Price</th>
                <th>Stock Level</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="inventory-tbody">
              ${renderInventoryRows(products, '', '')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderInventoryRows(products, query, status) {
  let filtered = products.filter(p => {
    const q = !query || p.name.toLowerCase().includes(query.toLowerCase());
    const s = !status ||
      (status === 'out' && p.stock === 0) ||
      (status === 'low' && p.stock > 0 && p.stock <= (p.alertThreshold || 10)) ||
      (status === 'ok' && p.stock > (p.alertThreshold || 10));
    return q && s;
  });

  if (!filtered.length) return `<tr><td colspan="7"><div class="empty-state"><p>No products match</p></div></td></tr>`;

  return filtered.map(p => {
    const maxStock = p.maxStock || p.stock * 2 || 100;
    const pct = Math.min(100, Math.round((p.stock / maxStock) * 100));
    const st = p.stock === 0 ? 'out' : p.stock <= (p.alertThreshold || 10) ? 'low' : 'ok';
    const barClass = { ok: 'stock-bar-ok', low: 'stock-bar-low', out: 'stock-bar-out' }[st];
    return `
      <tr>
        <td class="td-primary">${p.name}</td>
        <td><span class="badge badge-muted">${p.category || '-'}</span></td>
        <td class="td-mono">${p.barcode || '-'}</td>
        <td class="td-mono" style="color:var(--text-primary);">${formatCurrency(p.price)}</td>
        <td>
          <div class="stock-level-bar">
            <span class="td-mono" style="font-size:.8rem;min-width:30px;text-align:right;color:${st === 'out' ? 'var(--danger)' : st === 'low' ? 'var(--warning)' : 'var(--success)'};">${p.stock}</span>
            <div class="stock-bar-track">
              <div class="stock-bar-fill ${barClass}" style="width:${pct}%"></div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${st === 'ok' ? 'badge-green' : st === 'low' ? 'badge-amber' : 'badge-red'}">
            <span class="status-dot ${st}"></span>
            ${st === 'ok' ? 'OK' : st === 'low' ? 'Low' : 'Out'}
          </span>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="window.quickRestock('${p.id}')">+ Stock</button>
        </td>
      </tr>
    `;
  }).join('');
}

export async function initInventory() {
  let query = '', status = '';

  async function refreshTable() {
    const products = await DB.getProducts();
    const tbody = document.getElementById('inventory-tbody');
    if (tbody) tbody.innerHTML = renderInventoryRows(products, query, status);
  }

  document.getElementById('inv-search')?.addEventListener('input', async e => {
    query = e.target.value;
    await refreshTable();
  });

  document.getElementById('inv-status-filter')?.addEventListener('change', async e => {
    status = e.target.value;
    await refreshTable();
  });

  document.getElementById('update-stock-btn')?.addEventListener('click', () => {
    showBulkStockModal(refreshTable);
  });

  window.quickRestock = async (id) => {
    const products = await DB.getProducts();
    const p = products.find(x => x.id === id);
    if (!p) return;
    createModal({
      id: 'restock',
      title: `📦 Restock: ${p.name}`,
      body: `
        <div class="form-group" style="margin-bottom:16px;">
          <label class="form-label">Current Stock: <strong style="color:${p.stock === 0 ? 'var(--danger)' : 'var(--text-primary)'};">${p.stock} units</strong></label>
        </div>
        <div class="form-group">
          <label class="form-label">Add Quantity</label>
          <input type="number" class="form-input" id="restock-qty" value="10" min="1" placeholder="Quantity to add">
        </div>
        <div class="form-group">
          <label class="form-label">Or Set New Total Stock</label>
          <input type="number" class="form-input" id="restock-set" placeholder="Set total stock to..." min="0">
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="window._closeModal('restock')">Cancel</button>
        <button class="btn btn-primary" id="restock-confirm-btn">Update Stock</button>
      `
    });

    setTimeout(() => {
      document.getElementById('restock-confirm-btn')?.addEventListener('click', async () => {
        const addQty = parseInt(document.getElementById('restock-qty')?.value || 0);
        const setQty = document.getElementById('restock-set')?.value;
        let newStock = setQty !== '' && setQty !== null && setQty !== undefined
          ? parseInt(setQty)
          : p.stock + addQty;
        if (isNaN(newStock) || newStock < 0) { toast.warning('Invalid quantity'); return; }
        await DB.updateProduct(id, { stock: newStock });
        toast.success(`Stock updated to ${newStock} units`);
        closeModal('restock');
        await refreshTable();
      });
    }, 100);
  };
}

async function showBulkStockModal(onSave) {
  const products = await DB.getProducts();
  createModal({
    id: 'bulk-stock',
    title: '📋 Bulk Stock Update',
    size: 'lg',
    body: `
      <div style="max-height:400px;overflow-y:auto;">
        <table style="width:100%;">
          <thead><tr><th>Product</th><th>Current Stock</th><th>New Stock</th></tr></thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td class="td-primary" style="padding:8px 12px;">${p.name}</td>
                <td style="padding:8px 12px;font-family:'JetBrains Mono',monospace;">${p.stock}</td>
                <td style="padding:8px 12px;">
                  <input type="number" class="form-input bulk-stock-input" data-id="${p.id}" value="${p.stock}" min="0" style="width:100px;padding:6px 10px;font-size:.8rem;">
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" onclick="window._closeModal('bulk-stock')">Cancel</button>
      <button class="btn btn-primary" id="bulk-save-btn">Save All</button>
    `
  });

  setTimeout(() => {
    document.getElementById('bulk-save-btn')?.addEventListener('click', async () => {
      const inputs = document.querySelectorAll('.bulk-stock-input');
      const promises = Array.from(inputs).map(async inp => {
        const id = inp.dataset.id;
        const val = parseInt(inp.value);
        if (!isNaN(val)) return DB.updateProduct(id, { stock: val });
      });
      await Promise.all(promises);
      toast.success('All stock levels updated!');
      closeModal('bulk-stock');
      onSave?.();
    });
  }, 100);
}
