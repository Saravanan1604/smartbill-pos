// ===== Inventory Page — Full Overhaul =====
import DB from '../db.js';
import { formatCurrency } from '../utils/format.js';
import { createModal, closeModal, confirmDialog } from '../components/modal.js';
import toast from '../components/toast.js';

// ── Category color + icon map ────────────────────────────────────────────────
const CAT = {
  'Grocery':      { color:'#10b981', bg:'rgba(16,185,129,.12)',  border:'rgba(16,185,129,.25)',  icon:'🌾' },
  'Dairy':        { color:'#06b6d4', bg:'rgba(6,182,212,.12)',   border:'rgba(6,182,212,.25)',   icon:'🥛' },
  'Bakery':       { color:'#f59e0b', bg:'rgba(245,158,11,.12)',  border:'rgba(245,158,11,.25)',  icon:'🍞' },
  'Beverages':    { color:'#3b82f6', bg:'rgba(59,130,246,.12)',  border:'rgba(59,130,246,.25)',  icon:'🧃' },
  'Snacks':       { color:'#f97316', bg:'rgba(249,115,22,.12)',  border:'rgba(249,115,22,.25)',  icon:'🍿' },
  'Personal Care':{ color:'#ec4899', bg:'rgba(236,72,153,.12)',  border:'rgba(236,72,153,.25)',  icon:'🧴' },
  'Household':    { color:'#7c3aed', bg:'rgba(124,58,237,.12)',  border:'rgba(124,58,237,.25)',  icon:'🏠' },
  'Stationery':   { color:'#6366f1', bg:'rgba(99,102,241,.12)',  border:'rgba(99,102,241,.25)',  icon:'📝' },
  'Electronics':  { color:'#eab308', bg:'rgba(234,179,8,.12)',   border:'rgba(234,179,8,.25)',   icon:'⚡' },
  'Clothing':     { color:'#f43f5e', bg:'rgba(244,63,94,.12)',   border:'rgba(244,63,94,.25)',   icon:'👕' },
  'Other':        { color:'#64748b', bg:'rgba(100,116,139,.12)', border:'rgba(100,116,139,.25)', icon:'📦' },
  'Uncategorized':{ color:'#64748b', bg:'rgba(100,116,139,.12)', border:'rgba(100,116,139,.25)', icon:'📦' },
};

function catOf(name) {
  return CAT[name] || { color:'#7c3aed', bg:'rgba(124,58,237,.12)', border:'rgba(124,58,237,.25)', icon:'📦' };
}

function stockStatus(p) {
  if (p.stock === 0) return 'out';
  if (p.stock <= (p.alertThreshold || 10)) return 'low';
  return 'ok';
}

function expiryStatus(p) {
  if (!p.expiryDate) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const exp = new Date(p.expiryDate); exp.setHours(0,0,0,0);
  const days = Math.round((exp - now) / 86400000);
  if (days < 0)  return { label:'Expired',   cls:'badge-red',   days };
  if (days <= 30) return { label:`${days}d`,  cls:'badge-amber', days };
  return { label:'OK', cls:'badge-green', days };
}

// ── Render ───────────────────────────────────────────────────────────────────
export async function renderInventory() {
  const products = await DB.getProducts();
  const low      = products.filter(p => p.stock > 0 && p.stock <= (p.alertThreshold || 10));
  const out      = products.filter(p => p.stock === 0);
  const ok       = products.filter(p => p.stock  > (p.alertThreshold || 10));

  const totalMRP  = products.reduce((s, p) => s + p.price    * p.stock, 0);
  const totalCost = products.reduce((s, p) => s + (p.costPrice || p.price * 0.75) * p.stock, 0);
  const potential = totalMRP - totalCost;

  const expiring  = products.filter(p => {
    const ex = expiryStatus(p);
    return ex && ex.days >= 0 && ex.days <= 30;
  });
  const expired   = products.filter(p => {
    const ex = expiryStatus(p);
    return ex && ex.days < 0;
  });

  const categories = [...new Set(products.map(p => p.category || 'Uncategorized').filter(Boolean))].sort();

  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Stock Management</h1>
          <p>Real-time inventory tracking · ${products.length} products</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary" id="export-stock-btn">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export CSV
          </button>
          <button class="btn btn-secondary" id="bulk-update-btn">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Bulk Update
          </button>
          <button class="btn btn-primary" onclick="window.location.hash='#products'">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Add Product
          </button>
        </div>
      </div>

      <!-- ── KPI Row ── -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:20px;">
        ${kpiBox('📦', 'Total Products',  products.length, '#7c3aed', 'rgba(124,58,237,.15)')}
        ${kpiBox('✅', 'In Stock',         ok.length,       '#10b981', 'rgba(16,185,129,.15)')}
        ${kpiBox('⚠️', 'Low Stock',        low.length,      '#f59e0b', 'rgba(245,158,11,.15)')}
        ${kpiBox('❌', 'Out of Stock',     out.length,      '#ef4444', 'rgba(239,68,68,.15)')}
        ${kpiBox('💰', 'Stock Value (MRP)',formatCurrency(totalMRP),   '#06b6d4', 'rgba(6,182,212,.15)')}
        ${kpiBox('📈', 'Potential Profit', formatCurrency(potential),  '#10b981', 'rgba(16,185,129,.15)')}
        ${expired.length  ? kpiBox('🗓', 'Expired',    expired.length,  '#ef4444', 'rgba(239,68,68,.15)') : ''}
        ${expiring.length ? kpiBox('⏰', 'Exp. Soon',  expiring.length, '#f59e0b', 'rgba(245,158,11,.15)') : ''}
      </div>

      <!-- ── Alert Banner ── -->
      ${(low.length + out.length) > 0 ? `
        <div class="inv-alert-banner">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="font-weight:700;color:var(--warning);">⚠ ${low.length + out.length} Stock Alert${low.length + out.length !== 1 ? 's' : ''}</span>
            ${out.map(p => `<span class="inv-alert-pill out" onclick="window.quickRestock('${p.id}')">${p.name}</span>`).join('')}
            ${low.map(p => `<span class="inv-alert-pill low" onclick="window.quickRestock('${p.id}')">${p.name} (${p.stock})</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <!-- ── Category Quick-Tabs ── -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;" id="cat-tabs">
        <button class="inv-cat-tab active" data-cat="">All</button>
        ${categories.map(c => {
          const ci = catOf(c);
          const cnt = products.filter(p => (p.category||'Uncategorized') === c).length;
          return `<button class="inv-cat-tab" data-cat="${c}" style="--cat-color:${ci.color};">${ci.icon} ${c} <span class="inv-cat-count">${cnt}</span></button>`;
        }).join('')}
      </div>

      <!-- ── Main Table Card ── -->
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap;gap:10px;">
          <span class="card-title">📋 Inventory</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-left:auto;">
            <div class="search-bar" style="min-width:200px;">
              <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input type="text" class="form-input" id="inv-search" placeholder="Search name / barcode…" style="padding-left:38px;width:200px;">
            </div>
            <select class="form-select" id="inv-status" style="width:130px;">
              <option value="">All Status</option>
              <option value="ok">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <select class="form-select" id="inv-sort" style="width:140px;">
              <option value="name">Sort: Name</option>
              <option value="stock-asc">Stock ↑</option>
              <option value="stock-desc">Stock ↓</option>
              <option value="expiry">Expiry Date</option>
              <option value="value">Stock Value</option>
            </select>
          </div>
        </div>
        <div class="table-wrap" style="overflow-x:auto;">
          <table id="inv-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Barcode</th>
                <th>Price</th>
                <th>Cost</th>
                <th style="min-width:180px;">Stock</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="inv-tbody">
              ${renderRows(products, '', '', 'name')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ── KPI box helper ────────────────────────────────────────────────────────────
function kpiBox(icon, label, value, color, bg) {
  return `
    <div class="inv-kpi" style="--kpi-color:${color};--kpi-bg:${bg};">
      <div class="inv-kpi-icon">${icon}</div>
      <div class="inv-kpi-value">${value}</div>
      <div class="inv-kpi-label">${label}</div>
    </div>
  `;
}

// ── Table rows renderer ───────────────────────────────────────────────────────
function renderRows(products, query, statusFilter, sort, catFilter = '') {
  let list = products.filter(p => {
    const q  = !query || p.name.toLowerCase().includes(query.toLowerCase()) ||
               (p.barcode && p.barcode.includes(query));
    const s  = !statusFilter || stockStatus(p) === statusFilter;
    const c  = !catFilter    || (p.category || 'Uncategorized') === catFilter;
    return q && s && c;
  });

  if (sort === 'stock-asc')  list.sort((a, b) => a.stock - b.stock);
  else if (sort === 'stock-desc') list.sort((a, b) => b.stock - a.stock);
  else if (sort === 'expiry') list.sort((a, b) => {
    const ea = a.expiryDate ? new Date(a.expiryDate) : new Date('9999');
    const eb = b.expiryDate ? new Date(b.expiryDate) : new Date('9999');
    return ea - eb;
  });
  else if (sort === 'value') list.sort((a, b) => (b.price * b.stock) - (a.price * a.stock));
  else list.sort((a, b) => a.name.localeCompare(b.name));

  if (!list.length) return `<tr><td colspan="9"><div class="empty-state"><p>No products match filters</p></div></td></tr>`;

  return list.map(p => {
    const st   = stockStatus(p);
    const ci   = catOf(p.category || 'Uncategorized');
    const ex   = expiryStatus(p);
    const pct  = Math.min(100, p.stock ? Math.round((p.stock / Math.max(p.stock, (p.alertThreshold || 10) * 2)) * 100) : 0);
    const barColor = { ok:'var(--success)', low:'var(--warning)', out:'var(--danger)' }[st];
    const margin = p.costPrice > 0 ? Math.round(((p.price - p.costPrice) / p.price) * 100) : null;

    return `
      <tr class="inv-row ${st === 'out' ? 'inv-row-out' : st === 'low' ? 'inv-row-low' : ''}">
        <td>
          <div style="font-weight:600;color:var(--text-primary);font-size:.875rem;">${p.name}</div>
          ${p.supplier ? `<div style="font-size:.7rem;color:var(--text-muted);">📦 ${p.supplier}</div>` : ''}
          ${p.unit && p.unit !== 'pcs' ? `<div style="font-size:.7rem;color:var(--text-muted);">Unit: ${p.unit}</div>` : ''}
        </td>
        <td>
          <span class="inv-cat-badge" style="--cat-color:${ci.color};--cat-bg:${ci.bg};">
            ${ci.icon} ${p.category || 'Uncategorized'}
          </span>
        </td>
        <td><span style="font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--text-muted);">${p.barcode || '—'}</span></td>
        <td><span style="font-family:'JetBrains Mono',monospace;font-size:.85rem;color:var(--text-primary);font-weight:600;">${formatCurrency(p.price)}</span></td>
        <td>
          <span style="font-family:'JetBrains Mono',monospace;font-size:.8rem;color:var(--text-secondary);">${p.costPrice ? formatCurrency(p.costPrice) : '—'}</span>
          ${margin !== null ? `<div style="font-size:.68rem;color:${margin > 20 ? 'var(--success)' : margin > 0 ? 'var(--warning)' : 'var(--danger)'};">${margin}% margin</div>` : ''}
        </td>
        <td>
          <div class="inv-stock-cell">
            <div class="inv-quick-adj">
              <button class="inv-adj-btn inv-adj-minus" onclick="window.invAdj('${p.id}', -1)" title="Remove 1">−</button>
              <span class="inv-stock-num" style="color:${barColor};">${p.stock}</span>
              <button class="inv-adj-btn inv-adj-plus" onclick="window.invAdj('${p.id}', 1)" title="Add 1">+</button>
            </div>
            <div class="inv-stock-bar-track">
              <div class="inv-stock-bar-fill" style="width:${pct}%;background:${barColor};"></div>
            </div>
            <span style="font-size:.68rem;color:var(--text-muted);">alert@${p.alertThreshold || 10}</span>
          </div>
        </td>
        <td>
          ${ex
            ? `<span class="badge ${ex.cls}" style="font-size:.68rem;">${ex.label}</span>`
            : `<span style="color:var(--text-muted);font-size:.75rem;">—</span>`
          }
        </td>
        <td>
          <span class="badge ${st === 'ok' ? 'badge-green' : st === 'low' ? 'badge-amber' : 'badge-red'}">
            <span class="status-dot ${st}"></span>
            ${st === 'ok' ? 'OK' : st === 'low' ? 'Low' : 'Out'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm btn-primary" onclick="window.quickRestock('${p.id}')" title="Restock">+Stock</button>
            <button class="btn btn-sm btn-ghost" onclick="window.editProduct('${p.id}')" title="Edit product">✏️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Init ──────────────────────────────────────────────────────────────────────
export async function initInventory() {
  let query = '', statusFilter = '', sort = 'name', catFilter = '';
  let products = await DB.getProducts();

  async function refresh() {
    products = await DB.getProducts();
    document.getElementById('inv-tbody').innerHTML = renderRows(products, query, statusFilter, sort, catFilter);
  }

  // Search
  document.getElementById('inv-search')?.addEventListener('input', e => {
    query = e.target.value;
    document.getElementById('inv-tbody').innerHTML = renderRows(products, query, statusFilter, sort, catFilter);
  });

  // Status filter
  document.getElementById('inv-status')?.addEventListener('change', e => {
    statusFilter = e.target.value;
    document.getElementById('inv-tbody').innerHTML = renderRows(products, query, statusFilter, sort, catFilter);
  });

  // Sort
  document.getElementById('inv-sort')?.addEventListener('change', e => {
    sort = e.target.value;
    document.getElementById('inv-tbody').innerHTML = renderRows(products, query, statusFilter, sort, catFilter);
  });

  // Category tabs
  document.getElementById('cat-tabs')?.addEventListener('click', e => {
    const tab = e.target.closest('[data-cat]');
    if (!tab) return;
    catFilter = tab.dataset.cat;
    document.querySelectorAll('.inv-cat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('inv-tbody').innerHTML = renderRows(products, query, statusFilter, sort, catFilter);
  });

  // Bulk update
  document.getElementById('bulk-update-btn')?.addEventListener('click', () => showBulkModal(refresh));

  // Export CSV
  document.getElementById('export-stock-btn')?.addEventListener('click', () => {
    const rows = ['Product,Barcode,Category,Supplier,Unit,Price,Cost,Stock,Alert,Expiry,Status'];
    products.forEach(p => {
      const st = stockStatus(p);
      rows.push([
        `"${p.name}"`, p.barcode||'', p.category||'', p.supplier||'', p.unit||'pcs',
        p.price, p.costPrice||0, p.stock, p.alertThreshold||10,
        p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : '',
        st
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type:'text/csv' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `stock-report-${new Date().toISOString().split('T')[0]}.csv`
    });
    a.click(); URL.revokeObjectURL(a.href);
    toast.success('Stock report exported!');
  });

  // Quick +/- adjust (inline)
  window.invAdj = async (id, delta) => {
    try {
      await DB.adjustStock(id, { delta });
      products = await DB.getProducts();
      document.getElementById('inv-tbody').innerHTML = renderRows(products, query, statusFilter, sort, catFilter);
      const p = products.find(x => x.id === id);
      if (p) toast.success(`${p.name}: stock = ${p.stock}`, 1200);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Quick restock modal
  window.quickRestock = async (id) => {
    const p = products.find(x => x.id === id) || (await DB.getProducts()).find(x => x.id === id);
    if (!p) return;
    const ci = catOf(p.category || 'Uncategorized');
    const st = stockStatus(p);

    createModal({
      id: 'restock',
      title: `${ci.icon} Restock: ${p.name}`,
      body: `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
          <div class="report-stat"><div class="report-stat-value" style="color:${st==='out'?'var(--danger)':st==='low'?'var(--warning)':'var(--success)'};">${p.stock}</div><div class="report-stat-label">Current</div></div>
          <div class="report-stat"><div class="report-stat-value">${p.alertThreshold||10}</div><div class="report-stat-label">Alert At</div></div>
          <div class="report-stat"><div class="report-stat-value">${formatCurrency(p.costPrice||0)}</div><div class="report-stat-label">Cost/Unit</div></div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Add Quantity</label>
            <input type="number" class="form-input" id="rs-add" value="10" min="1" placeholder="Units to add">
          </div>
          <div class="form-group">
            <label class="form-label">Set Total Stock To</label>
            <input type="number" class="form-input" id="rs-set" placeholder="Exact total…" min="0">
          </div>
        </div>
        <div class="form-group" style="margin-top:12px;">
          <label class="form-label">Supplier / Note (optional)</label>
          <input type="text" class="form-input" id="rs-note" placeholder="Supplier name, batch no…" value="${p.supplier||''}">
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="window._closeModal('restock')">Cancel</button>
        <button class="btn btn-primary" id="rs-confirm">Update Stock</button>
      `
    });

    setTimeout(() => {
      document.getElementById('rs-confirm')?.addEventListener('click', async () => {
        const addVal = document.getElementById('rs-add')?.value;
        const setVal = document.getElementById('rs-set')?.value;
        const note   = document.getElementById('rs-note')?.value?.trim();
        let opts = {};
        if (setVal !== '') opts.setTo = parseInt(setVal);
        else               opts.delta = parseInt(addVal) || 0;

        try {
          await DB.adjustStock(id, opts);
          if (note && note !== p.supplier) await DB.updateProduct(id, { supplier: note });
          toast.success('Stock updated!');
          closeModal('restock');
          await refresh();
        } catch (err) { toast.error(err.message); }
      });
    }, 100);
  };

  // Edit product — jump to products page
  window.editProduct = (id) => {
    sessionStorage.setItem('editProductId', id);
    window.location.hash = '#products';
  };
}

// ── Bulk stock update modal ───────────────────────────────────────────────────
async function showBulkModal(onSave) {
  const products = await DB.getProducts();
  createModal({
    id: 'bulk-stock',
    title: '📋 Bulk Stock Update',
    size: 'lg',
    body: `
      <div style="margin-bottom:12px;">
        <input type="text" class="form-input" id="bulk-search" placeholder="Search…">
      </div>
      <div style="max-height:420px;overflow-y:auto;" id="bulk-list">
        ${bulkRows(products)}
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" onclick="window._closeModal('bulk-stock')">Cancel</button>
      <button class="btn btn-primary" id="bulk-save-btn">Save All Changes</button>
    `
  });

  setTimeout(() => {
    document.getElementById('bulk-search')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      document.getElementById('bulk-list').innerHTML = bulkRows(
        products.filter(p => p.name.toLowerCase().includes(q))
      );
    });

    document.getElementById('bulk-save-btn')?.addEventListener('click', async () => {
      const inputs = document.querySelectorAll('.bulk-inp');
      const tasks  = Array.from(inputs).map(async inp => {
        const val = parseInt(inp.value);
        if (!isNaN(val)) return DB.updateProduct(inp.dataset.id, { stock: val });
      });
      await Promise.all(tasks);
      toast.success('All stock levels saved!');
      closeModal('bulk-stock');
      onSave?.();
    });
  }, 100);
}

function bulkRows(products) {
  return `<table style="width:100%;border-collapse:collapse;">
    <thead><tr style="border-bottom:1px solid var(--glass-border);">
      <th style="padding:8px 12px;text-align:left;font-size:.75rem;color:var(--text-muted);">Product</th>
      <th style="padding:8px 12px;text-align:left;font-size:.75rem;color:var(--text-muted);">Category</th>
      <th style="padding:8px 12px;text-align:center;font-size:.75rem;color:var(--text-muted);">Current</th>
      <th style="padding:8px 12px;text-align:center;font-size:.75rem;color:var(--text-muted);">New Stock</th>
    </tr></thead>
    <tbody>
      ${products.map(p => {
        const st = stockStatus(p);
        const ci = catOf(p.category || 'Uncategorized');
        return `
          <tr style="border-bottom:1px solid rgba(255,255,255,.04);">
            <td style="padding:8px 12px;font-size:.85rem;font-weight:600;color:var(--text-primary);">${p.name}</td>
            <td style="padding:8px 12px;">
              <span style="font-size:.7rem;padding:2px 8px;border-radius:99px;background:${ci.bg};color:${ci.color};">${ci.icon} ${p.category||'Uncategorized'}</span>
            </td>
            <td style="padding:8px 12px;text-align:center;font-family:'JetBrains Mono',monospace;color:${st==='out'?'var(--danger)':st==='low'?'var(--warning)':'var(--success)'};">${p.stock}</td>
            <td style="padding:8px 12px;text-align:center;">
              <input type="number" class="form-input bulk-inp" data-id="${p.id}" value="${p.stock}" min="0"
                style="width:90px;padding:5px 8px;font-size:.8rem;text-align:center;">
            </td>
          </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}
