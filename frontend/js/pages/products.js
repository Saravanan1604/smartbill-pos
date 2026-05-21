// ===== Products Page =====
import DB from '../db.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { createModal, closeModal, confirmDialog } from '../components/modal.js';
import toast from '../components/toast.js';
import { openScanner } from '../components/scanner.js';

const CATEGORIES = ['Grocery','Dairy','Bakery','Beverages','Snacks','Personal Care','Household','Stationery','Electronics','Clothing','Other'];
const TAX_RATES = [0, 5, 12, 18, 28];

export async function renderProducts() {
  const products = await DB.getProducts();
  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Products</h1>
          <p>${products.length} products in inventory</p>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-secondary" id="export-products-btn">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export
          </button>
          <button class="btn btn-primary" id="add-product-btn">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Add Product
          </button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="products-toolbar mb-6">
        <div class="search-bar" style="flex:1;max-width:360px;">
          <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" class="form-input" id="product-search" placeholder="Search by name or barcode..." style="padding-left:38px;">
        </div>
        <select class="form-select" id="cat-filter" style="width:160px;">
          <option value="">All Categories</option>
          ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <select class="form-select" id="sort-filter" style="width:160px;">
          <option value="name">Sort by Name</option>
          <option value="price">Sort by Price</option>
          <option value="stock">Sort by Stock</option>
          <option value="recent">Recently Added</option>
        </select>
      </div>

      <!-- Product Grid -->
      <div class="grid-auto" id="products-grid">
        ${renderProductCards(products, '', '', 'name')}
      </div>
    </div>
  `;
}

function renderProductCards(products, query, category, sort) {
  let filtered = products.filter(p => {
    const q = !query || p.name.toLowerCase().includes(query.toLowerCase()) || (p.barcode && p.barcode.includes(query));
    const c = !category || p.category === category;
    return q && c;
  });

  if (sort === 'price') filtered.sort((a, b) => a.price - b.price);
  else if (sort === 'stock') filtered.sort((a, b) => a.stock - b.stock);
  else if (sort === 'recent') filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else filtered.sort((a, b) => a.name.localeCompare(b.name));

  if (!filtered.length) return `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">📦</div><h3>No products found</h3><p>Add your first product to get started</p></div>`;

  return filtered.map(p => {
    const stockStatus = p.stock === 0 ? 'out' : p.stock <= (p.alertThreshold || 10) ? 'low' : 'ok';
    const stockClass = { ok: 'stock-ok', low: 'stock-low', out: 'stock-out' }[stockStatus];
    return `
      <div class="product-card">
        <div class="product-card-header">
          <div>
            <div class="product-card-name">${p.name}</div>
            <div class="product-card-cat">${p.category || 'Uncategorized'}</div>
          </div>
          <div class="product-card-actions">
            <button class="btn btn-ghost btn-icon-sm" onclick="window.editProduct('${p.id}')" data-tooltip="Edit">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button class="btn btn-danger btn-icon-sm" onclick="window.deleteProduct('${p.id}')" data-tooltip="Delete">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
        <div class="product-card-barcode">📊 ${p.barcode || 'N/A'}</div>
        <div class="product-card-price">${formatCurrency(p.price)}</div>
        ${p.costPrice ? `<div style="font-size:.75rem;color:var(--text-muted);margin-top:4px;">Cost: ${formatCurrency(p.costPrice)} · Margin: ${Math.round(((p.price - p.costPrice) / p.price) * 100)}%</div>` : ''}
        <div class="product-card-stock">
          <span class="product-card-stock-val ${stockClass}">
            <span class="status-dot ${stockStatus}" style="margin-right:4px;"></span>
            ${p.stock} units
          </span>
          <span class="badge ${stockStatus === 'ok' ? 'badge-green' : stockStatus === 'low' ? 'badge-amber' : 'badge-red'}">
            ${stockStatus === 'ok' ? 'In Stock' : stockStatus === 'low' ? 'Low' : 'Out'}
          </span>
        </div>
        ${p.tax ? `<div style="margin-top:8px;"><span class="badge badge-muted">GST ${p.tax}%</span></div>` : ''}
      </div>
    `;
  }).join('');
}

export function initProducts() {
  let query = '', category = '', sort = 'name';

  document.getElementById('product-search')?.addEventListener('input', e => {
    query = e.target.value;
    refreshGrid();
  });
  document.getElementById('cat-filter')?.addEventListener('change', e => {
    category = e.target.value;
    refreshGrid();
  });
  document.getElementById('sort-filter')?.addEventListener('change', e => {
    sort = e.target.value;
    refreshGrid();
  });

  async function refreshGrid() {
    const products = await DB.getProducts();
    document.getElementById('products-grid').innerHTML = renderProductCards(products, query, category, sort);
  }

  document.getElementById('add-product-btn')?.addEventListener('click', () => showProductModal(null, refreshGrid));

  document.getElementById('export-products-btn')?.addEventListener('click', async () => {
    const products = await DB.getProducts();
    const csv = ['Name,Barcode,Price,Cost Price,Stock,Category,Tax%,Alert Threshold',
      ...products.map(p => `${p.name},${p.barcode},${p.price},${p.costPrice||''},${p.stock},${p.category},${p.tax||0},${p.alertThreshold||10}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'smartbill-products.csv';
    a.click();
    toast.success('Products exported as CSV');
  });

  window.editProduct = async (id) => {
    const products = await DB.getProducts();
    const p = products.find(x => x.id === id);
    if (p) showProductModal(p, refreshGrid);
  };

  window.deleteProduct = async (id) => {
    const ok = await confirmDialog('Delete this product permanently? This cannot be undone.', 'Delete Product');
    if (ok) {
      await DB.deleteProduct(id);
      toast.success('Product deleted');
      await refreshGrid();
    }
  };
}

function showProductModal(product, onSave) {
  const isEdit = !!product;
  createModal({
    id: 'product-form',
    title: isEdit ? '✏️ Edit Product' : '➕ Add New Product',
    size: 'lg',
    body: `
      <div class="form-grid">
        <div class="form-group full-width">
          <label class="form-label">Product Name *</label>
          <input type="text" class="form-input" id="pf-name" value="${isEdit ? product.name : ''}" placeholder="e.g. Full Cream Milk 1L">
        </div>
        <div class="form-group">
          <label class="form-label">Barcode / QR Code</label>
          <div class="input-group">
            <input type="text" class="form-input" id="pf-barcode" value="${isEdit ? product.barcode || '' : ''}" placeholder="e.g. 8901063045149 — or scan below">
            <button class="btn btn-secondary" id="pf-scan-barcode-btn" type="button" title="Scan physical barcode to fill this field" style="padding:10px 14px;gap:6px;">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 5h2v2H5zm12 0h2v2h-2zM5 17h2v2H5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 15h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zm-2-2h2v2h-2z"/></svg>
              Scan
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" id="pf-category">
            ${CATEGORIES.map(c => `<option value="${c}" ${isEdit && product.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Selling Price (₹) *</label>
          <input type="number" class="form-input" id="pf-price" value="${isEdit ? product.price : ''}" placeholder="0.00" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">Cost Price (₹)</label>
          <input type="number" class="form-input" id="pf-cost" value="${isEdit ? product.costPrice || '' : ''}" placeholder="0.00" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">Stock Quantity *</label>
          <input type="number" class="form-input" id="pf-stock" value="${isEdit ? product.stock : ''}" placeholder="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Low Stock Alert Threshold</label>
          <input type="number" class="form-input" id="pf-alert" value="${isEdit ? product.alertThreshold || 10 : 10}" placeholder="10" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">GST Tax Rate</label>
          <select class="form-select" id="pf-tax">
            ${TAX_RATES.map(t => `<option value="${t}" ${isEdit && product.tax === t ? 'selected' : ''}>${t}%</option>`).join('')}
          </select>
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" onclick="window._closeModal('product-form')">Cancel</button>
      <button class="btn btn-primary" id="save-product-btn">${isEdit ? 'Update Product' : 'Add Product'}</button>
    `
  });

  setTimeout(() => {
    // Scan-to-fill barcode field
    document.getElementById('pf-scan-barcode-btn')?.addEventListener('click', () => {
      openScanner(code => {
        const input = document.getElementById('pf-barcode');
        if (input) {
          input.value = code;
          input.focus();
          toast.success(`Barcode scanned: ${code}`);
        }
      });
    });

    document.getElementById('save-product-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('pf-name')?.value?.trim();
      const price = parseFloat(document.getElementById('pf-price')?.value || 0);
      const stock = parseInt(document.getElementById('pf-stock')?.value || 0);
      if (!name) return toast.warning('Product name is required');
      if (!price || price <= 0) return toast.warning('Please enter a valid price');

      const data = {
        name,
        barcode: document.getElementById('pf-barcode')?.value?.trim() || '',
        category: document.getElementById('pf-category')?.value,
        price,
        costPrice: parseFloat(document.getElementById('pf-cost')?.value || 0) || 0,
        stock,
        alertThreshold: parseInt(document.getElementById('pf-alert')?.value || 10),
        tax: parseInt(document.getElementById('pf-tax')?.value || 0),
      };

      if (isEdit) {
        await DB.updateProduct(product.id, data);
        toast.success('Product updated!');
      } else {
        await DB.addProduct(data);
        toast.success('Product added!');
      }

      closeModal('product-form');
      onSave?.();
    });
  }, 100);
}
