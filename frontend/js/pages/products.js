// ===== Products Page =====
import DB from '../db.js';
import { formatCurrency } from '../utils/format.js';
import { createModal, closeModal, confirmDialog } from '../components/modal.js';
import toast from '../components/toast.js';
import { openScanner } from '../components/scanner.js';

const CATEGORIES = ['Grocery','Dairy','Bakery','Beverages','Snacks','Personal Care','Household','Stationery','Electronics','Clothing','Other'];
const UNITS      = ['pcs','kg','g','L','mL','box','dozen','pack','m','roll'];
const TAX_RATES  = [0, 5, 12, 18, 28];

const CAT_COLOR = {
  'Grocery':      { color:'#10b981', bg:'rgba(16,185,129,.12)', icon:'🌾' },
  'Dairy':        { color:'#06b6d4', bg:'rgba(6,182,212,.12)',  icon:'🥛' },
  'Bakery':       { color:'#f59e0b', bg:'rgba(245,158,11,.12)', icon:'🍞' },
  'Beverages':    { color:'#3b82f6', bg:'rgba(59,130,246,.12)', icon:'🧃' },
  'Snacks':       { color:'#f97316', bg:'rgba(249,115,22,.12)', icon:'🍿' },
  'Personal Care':{ color:'#ec4899', bg:'rgba(236,72,153,.12)', icon:'🧴' },
  'Household':    { color:'#7c3aed', bg:'rgba(124,58,237,.12)', icon:'🏠' },
  'Stationery':   { color:'#6366f1', bg:'rgba(99,102,241,.12)', icon:'📝' },
  'Electronics':  { color:'#eab308', bg:'rgba(234,179,8,.12)',  icon:'⚡' },
  'Clothing':     { color:'#f43f5e', bg:'rgba(244,63,94,.12)',  icon:'👕' },
  'Other':        { color:'#64748b', bg:'rgba(100,116,139,.12)',icon:'📦' },
};

// Palette used to give user-created (custom) categories a consistent colour.
const CUSTOM_PALETTE = [
  { color:'#10b981', bg:'rgba(16,185,129,.12)' },
  { color:'#06b6d4', bg:'rgba(6,182,212,.12)' },
  { color:'#f59e0b', bg:'rgba(245,158,11,.12)' },
  { color:'#3b82f6', bg:'rgba(59,130,246,.12)' },
  { color:'#ec4899', bg:'rgba(236,72,153,.12)' },
  { color:'#8b5cf6', bg:'rgba(139,92,246,.12)' },
  { color:'#f43f5e', bg:'rgba(244,63,94,.12)' },
  { color:'#14b8a6', bg:'rgba(20,184,166,.12)' },
];

function catOf(name) {
  if (CAT_COLOR[name]) return CAT_COLOR[name];
  // Deterministic colour for any custom category (same name → same colour)
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const p = CUSTOM_PALETTE[hash % CUSTOM_PALETTE.length];
  return { color: p.color, bg: p.bg, icon: '🏷️' };
}

// Merge the built-in suggestions with whatever categories the shop has actually
// created on their products, so each shop builds its own category list.
function allCategories(products = []) {
  const set = new Set(CATEGORIES);
  products.forEach(p => { if (p.category) set.add(p.category); });
  return [...set].sort((a, b) => a.localeCompare(b));
}

// Latest known categories (built-ins + the shop's own), kept fresh on each load
// so the Add/Edit form can suggest them.
let _catCache = CATEGORIES.slice();

export async function renderProducts() {
  const products = await DB.getProducts();
  _catCache = allCategories(products);
  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Products</h1>
          <p>${products.length} products in inventory</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-success" id="scan-deduct-btn" title="Show products to the camera to auto-deduct stock">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Scan to Deduct
          </button>
          <button class="btn btn-secondary" id="import-products-btn" title="Import products from a CSV file">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Import CSV
          </button>
          <input type="file" id="import-file-input" accept=".csv,text/csv" style="display:none;">
          <button class="btn btn-secondary" id="export-products-btn">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export CSV
          </button>
          <button class="btn btn-primary" id="add-product-btn">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Add Product
          </button>
        </div>
      </div>

      <!-- Toolbar -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;">
        <div class="search-bar" style="flex:1;min-width:200px;">
          <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" class="form-input" id="product-search" placeholder="Search by name or barcode…" style="padding-left:38px;">
        </div>
        <select class="form-select" id="cat-filter" style="width:160px;">
          <option value="">All Categories</option>
          ${allCategories(products).map(c => `<option value="${c}">${catOf(c).icon} ${c}</option>`).join('')}
        </select>
        <select class="form-select" id="sort-filter" style="width:160px;">
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Price</option>
          <option value="stock">Sort: Stock</option>
          <option value="margin">Sort: Margin%</option>
          <option value="recent">Recently Added</option>
        </select>
      </div>

      <!-- Product Grid -->
      <div class="grid-auto" id="products-grid">
        ${renderProductCards(products,'','','name')}
      </div>
    </div>
  `;
}

function renderProductCards(products, query, category, sort) {
  let filtered = products.filter(p => {
    const q = !query    || p.name.toLowerCase().includes(query.toLowerCase()) || (p.barcode && p.barcode.includes(query));
    const c = !category || p.category === category;
    return q && c;
  });

  if (sort === 'price')   filtered.sort((a,b) => a.price - b.price);
  else if (sort === 'stock')  filtered.sort((a,b) => a.stock - b.stock);
  else if (sort === 'margin') filtered.sort((a,b) => {
    const ma = a.costPrice > 0 ? ((a.price - a.costPrice) / a.price) * 100 : 0;
    const mb = b.costPrice > 0 ? ((b.price - b.costPrice) / b.price) * 100 : 0;
    return mb - ma;
  });
  else if (sort === 'recent') filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  else filtered.sort((a,b) => a.name.localeCompare(b.name));

  if (!filtered.length) return `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">📦</div><h3>No products found</h3><p>Add your first product to get started</p></div>`;

  return filtered.map(p => {
    const stockSt  = p.stock === 0 ? 'out' : p.stock <= (p.alertThreshold || 10) ? 'low' : 'ok';
    const stockClr = { ok:'var(--success)', low:'var(--warning)', out:'var(--danger)' }[stockSt];
    const ci       = catOf(p.category || 'Other');
    const margin   = p.costPrice > 0 ? Math.round(((p.price - p.costPrice) / p.price) * 100) : null;
    return `
      <div class="prod-card" style="--cat-color:${ci.color};--cat-bg:${ci.bg};">
        <div class="prod-card-top">
          <div class="prod-cat-chip">${ci.icon} ${p.category || 'Other'}</div>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-icon-sm" onclick="window.duplicateProduct('${p.id}')" title="Duplicate">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon-sm" onclick="window.editProduct('${p.id}')" title="Edit">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button class="btn btn-danger btn-icon-sm" onclick="window.deleteProduct('${p.id}')" title="Delete">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
        <div class="prod-card-name">${p.name}</div>
        ${p.barcode ? `<div class="prod-barcode">📊 ${p.barcode}</div>` : ''}
        ${p.supplier ? `<div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">🏭 ${p.supplier}</div>` : ''}
        <div class="prod-price-row">
          <span class="prod-price">${formatCurrency(p.price)}</span>
          ${p.unit && p.unit !== 'pcs' ? `<span style="font-size:.72rem;color:var(--text-muted);">/ ${p.unit}</span>` : ''}
        </div>
        ${p.costPrice ? `
          <div class="prod-cost-row">
            <span>Cost: ${formatCurrency(p.costPrice)}</span>
            ${margin !== null ? `<span class="prod-margin" style="background:${margin > 20 ? 'var(--success-glow)' : 'var(--accent-amber-glow)'};color:${margin > 20 ? 'var(--success)' : 'var(--accent-amber)'};">${margin}%</span>` : ''}
          </div>` : ''}
        <div class="prod-stock-row">
          <span style="color:${stockClr};font-weight:700;font-size:.85rem;font-family:'JetBrains Mono',monospace;">
            <span class="status-dot ${stockSt}" style="margin-right:4px;"></span>${p.stock} ${p.unit||'pcs'}
          </span>
          <span class="badge ${stockSt==='ok'?'badge-green':stockSt==='low'?'badge-amber':'badge-red'}">
            ${stockSt==='ok'?'In Stock':stockSt==='low'?'Low Stock':'Out of Stock'}
          </span>
        </div>
        ${p.tax ? `<div style="margin-top:6px;"><span class="badge badge-muted">GST ${p.tax}%</span></div>` : ''}
      </div>
    `;
  }).join('');
}

export function initProducts() {
  let query = '', category = '', sort = 'name';

  // Check if coming from inventory edit redirect
  const editId = sessionStorage.getItem('editProductId');
  if (editId) {
    sessionStorage.removeItem('editProductId');
    setTimeout(async () => {
      const products = await DB.getProducts();
      const p = products.find(x => x.id === editId);
      if (p) showProductModal(p, refreshGrid);
    }, 200);
  }

  document.getElementById('product-search')?.addEventListener('input', e => { query = e.target.value; refreshGrid(); });
  document.getElementById('cat-filter')?.addEventListener('change', e => { category = e.target.value; refreshGrid(); });
  document.getElementById('sort-filter')?.addEventListener('change', e => { sort = e.target.value; refreshGrid(); });

  async function refreshGrid() {
    const products = await DB.getProducts();
    _catCache = allCategories(products);
    const el = document.getElementById('products-grid');
    if (el) el.innerHTML = renderProductCards(products, query, category, sort);
  }

  document.getElementById('add-product-btn')?.addEventListener('click', () => showProductModal(null, refreshGrid));

  document.getElementById('export-products-btn')?.addEventListener('click', async () => {
    const products = await DB.getProducts();
    const csv = ['Name,Barcode,Category,Unit,Supplier,Price,Cost Price,Margin%,Stock,Alert Threshold,Tax%,Expiry',
      ...products.map(p => {
        const m = p.costPrice > 0 ? Math.round(((p.price - p.costPrice) / p.price) * 100) : '';
        return `"${p.name}",${p.barcode||''},${p.category||''},${p.unit||'pcs'},"${p.supplier||''}",${p.price},${p.costPrice||''},${m},${p.stock},${p.alertThreshold||10},${p.tax||0},${p.expiryDate?new Date(p.expiryDate).toLocaleDateString('en-IN'):''}`;
      })
    ].join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type:'text/csv' })),
      download: 'smartbill-products.csv'
    });
    a.click(); toast.success('Products exported!');
  });

  // ── Import CSV ──────────────────────────────────────────────────────────────
  document.getElementById('import-products-btn')?.addEventListener('click', () => {
    document.getElementById('import-file-input')?.click();
  });

  document.getElementById('import-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-selecting the same file later
    const text = await file.text();
    await importProductsFromCSV(text, refreshGrid);
  });

  // ── Scan to Deduct (camera) ───────────────────────────────────────────────
  document.getElementById('scan-deduct-btn')?.addEventListener('click', () => {
    openScanner(async (barcode) => {
      await deductByBarcode(barcode, refreshGrid);
    }, { continuous: true, title: '📷 Scan to Deduct Stock' });
  });

  window.editProduct = async (id) => {
    const products = await DB.getProducts();
    const p = products.find(x => x.id === id);
    if (p) showProductModal(p, refreshGrid);
  };

  window.duplicateProduct = async (id) => {
    const products = await DB.getProducts();
    const p = products.find(x => x.id === id);
    if (!p) return;
    const copy = {
      name: p.name + ' (Copy)', barcode: '', category: p.category,
      price: p.price, costPrice: p.costPrice, stock: 0,
      alertThreshold: p.alertThreshold, tax: p.tax,
      unit: p.unit, supplier: p.supplier, description: p.description
    };
    await DB.addProduct(copy);
    toast.success(`"${p.name}" duplicated!`);
    refreshGrid();
  };

  window.deleteProduct = async (id) => {
    const ok = await confirmDialog('Delete this product permanently? This cannot be undone.', 'Delete Product');
    if (ok) {
      await DB.deleteProduct(id);
      toast.success('Product deleted');
      refreshGrid();
    }
  };
}

function showProductModal(product, onSave) {
  const isEdit  = !!product;
  const qOpts   = TAX_RATES.map(t => `<option value="${t}" ${isEdit && product.tax===t ? 'selected' : ''}>${t}%</option>`).join('');
  const catList = allCategories().concat(_catCache);
  const catOpts = [...new Set(catList)].sort((a,b)=>a.localeCompare(b)).map(c => `<option value="${escHtml(c)}">${catOf(c).icon} ${c}</option>`).join('');
  const unitOpts= UNITS.map(u => `<option value="${u}" ${isEdit && product.unit===u ? 'selected' : ''}>${u}</option>`).join('');

  const expiryVal = isEdit && product.expiryDate
    ? new Date(product.expiryDate).toISOString().split('T')[0] : '';

  createModal({
    id: 'product-form',
    title: isEdit ? '✏️ Edit Product' : '➕ Add New Product',
    size: 'lg',
    body: `
      <div class="form-grid">
        <div class="form-group full-width">
          <label class="form-label">Product Name *</label>
          <input type="text" class="form-input" id="pf-name" value="${isEdit ? escHtml(product.name) : ''}" placeholder="e.g. Full Cream Milk 1L">
        </div>
        <div class="form-group">
          <label class="form-label">Barcode / QR Code</label>
          <div class="input-group">
            <input type="text" class="form-input" id="pf-barcode" value="${isEdit ? product.barcode||'' : ''}" placeholder="Scan or enter manually">
            <button class="btn btn-secondary" id="pf-scan-btn" type="button" style="padding:10px 14px;">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6z"/></svg>
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Category <span style="color:var(--text-muted);font-size:.72rem;">(type your own)</span></label>
          <input type="text" class="form-input" id="pf-category" list="pf-category-list" autocomplete="off"
            value="${isEdit ? escHtml(product.category || '') : ''}" placeholder="e.g. Vegetables, Medicines, Toys…">
          <datalist id="pf-category-list">${catOpts}</datalist>
        </div>
        <div class="form-group">
          <label class="form-label">Selling Price (₹) *</label>
          <input type="number" class="form-input" id="pf-price" value="${isEdit ? product.price : ''}" placeholder="0.00" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">Cost Price (₹)</label>
          <input type="number" class="form-input" id="pf-cost" value="${isEdit ? product.costPrice||'' : ''}" placeholder="0.00" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">Stock Quantity *</label>
          <input type="number" class="form-input" id="pf-stock" value="${isEdit ? product.stock : ''}" placeholder="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Unit</label>
          <select class="form-select" id="pf-unit">${unitOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Low Stock Alert At</label>
          <input type="number" class="form-input" id="pf-alert" value="${isEdit ? product.alertThreshold||10 : 10}" placeholder="10" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">GST Tax Rate</label>
          <select class="form-select" id="pf-tax">${qOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Expiry Date</label>
          <input type="date" class="form-input" id="pf-expiry" value="${expiryVal}">
        </div>
        <div class="form-group full-width">
          <label class="form-label">Supplier / Vendor</label>
          <input type="text" class="form-input" id="pf-supplier" value="${isEdit ? escHtml(product.supplier||'') : ''}" placeholder="Supplier name">
        </div>
        <div class="form-group full-width">
          <label class="form-label">Description (optional)</label>
          <textarea class="form-input form-textarea" id="pf-desc" placeholder="Product notes…" rows="2">${isEdit ? escHtml(product.description||'') : ''}</textarea>
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" onclick="window._closeModal('product-form')">Cancel</button>
      <button class="btn btn-primary" id="save-product-btn">${isEdit ? 'Update Product' : 'Add Product'}</button>
    `
  });

  setTimeout(() => {
    document.getElementById('pf-scan-btn')?.addEventListener('click', () => {
      openScanner(code => {
        const inp = document.getElementById('pf-barcode');
        if (inp) { inp.value = code; toast.success(`Barcode scanned: ${code}`); }
      });
    });

    // Live margin preview
    const updateMargin = () => {
      const price = parseFloat(document.getElementById('pf-price')?.value || 0);
      const cost  = parseFloat(document.getElementById('pf-cost')?.value  || 0);
      const btn   = document.getElementById('save-product-btn');
      if (price > 0 && cost > 0 && btn) {
        const m = Math.round(((price - cost) / price) * 100);
        btn.title = `Margin: ${m}%`;
      }
    };
    document.getElementById('pf-price')?.addEventListener('input', updateMargin);
    document.getElementById('pf-cost')?.addEventListener('input', updateMargin);

    document.getElementById('save-product-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('pf-name')?.value?.trim();
      if (!name) return toast.warning('Product name is required');
      const price = parseFloat(document.getElementById('pf-price')?.value || 0);
      if (!price || price <= 0) return toast.warning('Please enter a valid price');

      const data = {
        name,
        barcode:        document.getElementById('pf-barcode')?.value?.trim() || '',
        category:       document.getElementById('pf-category')?.value?.trim() || 'Other',
        price,
        costPrice:      parseFloat(document.getElementById('pf-cost')?.value || 0) || 0,
        stock:          parseInt(document.getElementById('pf-stock')?.value || 0),
        unit:           document.getElementById('pf-unit')?.value || 'pcs',
        alertThreshold: parseInt(document.getElementById('pf-alert')?.value || 10),
        tax:            parseInt(document.getElementById('pf-tax')?.value || 0),
        expiryDate:     document.getElementById('pf-expiry')?.value || null,
        supplier:       document.getElementById('pf-supplier')?.value?.trim() || '',
        description:    document.getElementById('pf-desc')?.value?.trim() || '',
      };

      try {
        if (isEdit) { await DB.updateProduct(product.id, data); toast.success('Product updated!'); }
        else        { await DB.addProduct(data); toast.success('Product added!'); }
        closeModal('product-form');
        onSave?.();
      } catch (err) { toast.error(err.message); }
    });
  }, 100);
}

// ─── Deduct one unit of a product by its scanned barcode ─────────────────────
async function deductByBarcode(barcode, onDone) {
  const code = String(barcode).trim();
  const products = await DB.getProducts();
  const p = products.find(x => x.barcode && String(x.barcode) === code);

  const log = document.getElementById('scanner-log');
  const addLog = (html) => { if (log) log.insertAdjacentHTML('afterbegin', html); };

  if (!p) {
    toast.warning(`No product with barcode ${code}`);
    addLog(`<div style="color:var(--danger);">❌ ${code} — not found</div>`);
    return;
  }
  if (p.stock <= 0) {
    toast.warning(`${p.name} is already out of stock`);
    addLog(`<div style="color:var(--warning);">⚠️ ${p.name} — out of stock</div>`);
    return;
  }
  try {
    const updated = await DB.adjustStock(p.id, { delta: -1 });
    toast.success(`${p.name} − 1 → ${updated.stock} left`);
    addLog(`<div style="color:var(--success);">✓ ${p.name} → ${updated.stock} left</div>`);
    onDone?.();
  } catch (err) {
    toast.error(err.message || 'Failed to update stock');
  }
}

// ─── Parse a single CSV line (handles quoted fields with commas) ─────────────
function parseCSVLine(line) {
  const out = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

// ─── Import products from CSV text ────────────────────────────────────────────
// Recognised columns (case-insensitive, any order):
//   Name, Barcode, Category, Unit, Supplier, Price, Cost Price, Stock,
//   Alert Threshold, Tax%, Expiry. Existing items (matched by barcode, else
//   name) are updated; new items are added.
async function importProductsFromCSV(text, onDone) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) { toast.error('CSV is empty or has no data rows'); return; }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/%/g, '').trim());
  const col = (row, ...names) => {
    for (const n of names) {
      const idx = headers.indexOf(n);
      if (idx !== -1 && row[idx] !== undefined && row[idx] !== '') return row[idx];
    }
    return '';
  };

  const existing = await DB.getProducts();
  const byBarcode = new Map(existing.filter(p => p.barcode).map(p => [String(p.barcode), p]));
  const byName    = new Map(existing.map(p => [p.name.toLowerCase(), p]));

  let added = 0, updated = 0, failed = 0;
  toast.info('Importing… please wait');

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const name = col(row, 'name');
    if (!name) { failed++; continue; }

    const barcode = col(row, 'barcode');
    const data = {
      name,
      barcode: barcode || '',
      category:       col(row, 'category') || 'Other',
      unit:           col(row, 'unit') || 'pcs',
      supplier:       col(row, 'supplier'),
      price:          parseFloat(col(row, 'price')) || 0,
      costPrice:      parseFloat(col(row, 'cost price', 'cost')) || 0,
      stock:          parseInt(col(row, 'stock')) || 0,
      alertThreshold: parseInt(col(row, 'alert threshold', 'alert')) || 10,
      tax:            parseFloat(col(row, 'tax', 'gst')) || 0,
    };
    const expiry = col(row, 'expiry', 'expiry date');
    if (expiry) { const d = new Date(expiry); if (!isNaN(d)) data.expiryDate = d.toISOString(); }

    const match = (barcode && byBarcode.get(String(barcode))) || byName.get(name.toLowerCase());
    try {
      if (match) { await DB.updateProduct(match.id, data); updated++; }
      else       { await DB.addProduct(data); added++; }
    } catch (err) {
      console.warn('Import row failed:', name, err.message);
      failed++;
    }
  }

  toast.success(`Import done — ${added} added, ${updated} updated${failed ? `, ${failed} skipped` : ''}`);
  onDone?.();
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
