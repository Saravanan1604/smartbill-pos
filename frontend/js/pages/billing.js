// ===== Billing / POS Page =====
import DB from '../db.js';
import { formatCurrency } from '../utils/format.js';
import { openScanner } from '../components/scanner.js';
import { createModal, closeModal } from '../components/modal.js';
import toast from '../components/toast.js';
import { generateInvoicePDF, printInvoice, shareWhatsApp } from '../utils/pdf.js';

let cart = [];
let discount = 0;
let paymentMethod = 'Cash';
let searchQuery = '';
let selectedCategory = 'All';
let selectedCustomerId = null;
let selectedCustomerName = null;

// Page-scoped caches — avoids hammering the API on every cart action.
// Invalidated on checkout and on page init.
let _productsCache = null;
let _settingsCache = null;

async function cachedProducts() {
  if (!_productsCache) _productsCache = await DB.getProducts();
  return _productsCache;
}

async function cachedSettings() {
  if (!_settingsCache) _settingsCache = await DB.getSettings();
  return _settingsCache;
}

export async function renderBilling() {
  const products = await DB.getProducts();
  _productsCache = products; // seed cache from this fresh fetch
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  const heldBill = JSON.parse(localStorage.getItem('smartbill_held_bill') || 'null');

  return `
    <div class="page-container" style="padding-bottom:0;">
      <div class="page-header">
        <div class="page-header-left">
          <h1>${window.t('billing_title')}</h1>
          <p>${window.t('billing_sub')}</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${heldBill ? `<button class="btn btn-amber btn-sm" id="resume-btn" title="Resume held bill (${heldBill.cart?.length || 0} items from ${heldBill.savedAt || 'earlier'})">▶ Resume${heldBill.cart?.length ? ` (${heldBill.cart.length})` : ''}</button>` : ''}
          <button class="btn btn-secondary btn-sm" id="hold-btn" title="Hold current bill (save for later)">${window.t('hold_bill')}</button>
          <button class="btn btn-secondary btn-sm" id="clear-cart-btn">${window.t('clear_cart')}</button>
        </div>
      </div>
    </div>
    <div style="padding:0 32px 24px;" class="animate-fade">
      <div class="billing-layout">

        <!-- LEFT: Product Selection -->
        <div class="billing-left">
          <!-- Search & Scanner Row -->
          <div class="billing-search-bar">
            <div class="search-bar" style="flex:1;">
              <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input type="text" class="form-input" id="product-search" placeholder="${window.t('search_products')}" style="padding-left:38px;">
            </div>
            <button class="scanner-trigger" id="scan-btn">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 5h2v2H5zm12 0h2v2h-2zM5 17h2v2H5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 15h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zm-2-2h2v2h-2z"/></svg>
              ${window.t('scan_qr')}
            </button>
          </div>

          <!-- Category Filter -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;" id="category-filters">
            ${categories.map(cat => `
              <button class="btn btn-sm ${cat === selectedCategory ? 'btn-primary' : 'btn-secondary'}" data-cat="${cat}">${cat}</button>
            `).join('')}
          </div>

          <!-- Product Grid -->
          <div class="product-grid" id="product-grid">
            ${renderProductGrid(products, '', 'All')}
          </div>
        </div>

        <!-- RIGHT: Cart -->
        <div class="billing-right">
          <div class="cart-header">
            <div>
              <div class="cart-title">${window.t('shopping_cart')}</div>
              <div class="cart-count" id="cart-count">0 ${window.t('items')}</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-ghost btn-icon-sm" id="add-customer-btn" data-tooltip="Add Customer">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
              </button>
            </div>
          </div>
          <div id="customer-bar" style="display:none;padding:8px 16px;background:var(--accent-violet-glow);border-bottom:1px solid rgba(124,58,237,.2);">
            <span style="font-size:.8rem;color:var(--accent-violet-light);" id="customer-label">No customer selected</span>
            <button class="btn btn-ghost btn-icon-sm" style="float:right;" id="remove-customer-btn">✕</button>
          </div>
          <div class="cart-items" id="cart-items">
            <div class="empty-state" id="cart-empty">
              <div class="empty-state-icon">🛒</div>
              <h3>${window.t('cart_empty')}</h3>
              <p>${window.t('cart_empty_sub')}</p>
            </div>
          </div>
          <div class="cart-footer">
            <!-- Summary -->
            <div class="cart-summary-row">
              <span class="cart-summary-label">${window.t('subtotal')}</span>
              <span class="cart-summary-value" id="subtotal-val">₹0.00</span>
            </div>
            <!-- Discount -->
            <div class="discount-row">
              <span class="cart-summary-label" style="flex-shrink:0;">${window.t('discount')}</span>
              <input type="number" class="form-input" id="discount-input" min="0" placeholder="0" style="max-width:80px;padding:6px 10px;font-size:.8rem;">
              <select class="form-select" id="discount-type" style="max-width:70px;padding:6px 10px;font-size:.8rem;">
                <option value="flat">₹</option>
                <option value="pct">%</option>
              </select>
              <button class="btn btn-ghost btn-icon-sm" id="clear-discount-btn" title="Remove discount" style="flex-shrink:0;">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <!-- GST (toggle on/off + editable rate) -->
            <div class="cart-summary-row" id="tax-row">
              <span class="cart-summary-label" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;">
                  <input type="checkbox" id="gst-toggle" style="width:16px;height:16px;cursor:pointer;accent-color:var(--accent-violet);">
                  <span>GST</span>
                </label>
                <input type="number" class="form-input" id="gst-rate-input" min="0" max="100" placeholder="auto"
                  title="Leave blank to use each product's GST rate, or set one rate for the whole bill"
                  style="max-width:62px;padding:5px 8px;font-size:.78rem;">
                <span style="font-size:.75rem;color:var(--text-muted);">%</span>
              </span>
              <span class="cart-summary-value" id="tax-val">₹0.00</span>
            </div>
            <div class="cart-total-row">
              <span class="cart-total-label">${window.t('total')}</span>
              <span class="cart-total-value" id="total-val">₹0.00</span>
            </div>
            <!-- Payment Method -->
            <div style="margin-top:4px;">
              <div class="cart-summary-label" style="margin-bottom:6px;">${window.t('payment_method')}</div>
              <div class="payment-methods">
                <button class="payment-method-btn active" data-pay="Cash">💵<span>${window.t('cash')}</span></button>
                <button class="payment-method-btn" data-pay="UPI">📱<span>${window.t('upi')}</span></button>
                <button class="payment-method-btn" data-pay="Card">💳<span>${window.t('card')}</span></button>
              </div>
            </div>
            <!-- Actions -->
            <div class="cart-actions" style="margin-top:8px;">
              <button class="btn btn-success btn-lg" id="checkout-btn" disabled style="width:100%;" title="Checkout (F9)">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                ${window.t('checkout_btn')}
                <span style="opacity:.6;font-size:.7rem;font-weight:400;font-family:'JetBrains Mono',monospace;">[F9]</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProductGrid(products, query, category) {
  let filtered = products.filter(p => {
    const matchCat = category === 'All' || p.category === category;
    const matchQuery = !query || p.name.toLowerCase().includes(query.toLowerCase()) || (p.barcode && p.barcode.includes(query));
    return matchCat && matchQuery;
  });

  if (filtered.length === 0) {
    return `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">📦</div><h3>No products found</h3><p>Try a different search or category</p></div>`;
  }

  return filtered.map(p => {
    const cartItem = cart.find(i => i.id === p.id);
    return `
    <div class="product-tile ${p.stock === 0 ? 'out-of-stock' : ''} ${cartItem ? 'in-cart' : ''}" data-id="${p.id}" onclick="${p.stock === 0 ? '' : `window.addToCart('${p.id}')`}">
      <span class="product-tile-cat">${p.category || ''}</span>
      ${cartItem ? `<span class="product-cart-badge">×${cartItem.qty}</span>` : ''}
      <div class="product-tile-name">${p.name}</div>
      <div class="product-tile-price">${formatCurrency(p.price)}</div>
      <div class="product-tile-stock" style="color:${p.stock === 0 ? 'var(--danger)' : p.stock <= (p.alertThreshold || 10) ? 'var(--warning)' : 'var(--text-muted)'};">
        ${p.stock === 0 ? '❌ Out of stock' : `📦 ${p.stock} left`}
      </div>
    </div>`;
  }).join('');
}

function renderCartItems() {
  const cartEl = document.getElementById('cart-items');
  if (!cartEl) return;

  if (cart.length === 0) {
    cartEl.innerHTML = `
      <div class="empty-state" id="cart-empty">
        <div class="empty-state-icon">🛒</div>
        <h3>${window.t('cart_empty')}</h3>
        <p>${window.t('cart_empty_sub')}</p>
      </div>`;
    return;
  }

  cartEl.innerHTML = cart.map((item, idx) => `
    <div class="cart-item animate-fade">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatCurrency(item.price)} each</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" onclick="window.cartQty('${idx}', -1)">−</button>
        <input class="qty-input" type="number" value="${item.qty}" min="1" onchange="window.cartSetQty('${idx}', this.value)">
        <button class="qty-btn" onclick="window.cartQty('${idx}', 1)">+</button>
      </div>
      <div class="cart-item-total">${formatCurrency(item.price * item.qty)}</div>
      <button class="cart-remove" onclick="window.removeFromCart('${idx}')">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  `).join('');
}

// ─── GST calculation (reads the toggle + editable rate from the DOM) ─────────
// • Toggle off            → tax = 0
// • Toggle on, rate blank → use each product's own GST rate (per-product)
// • Toggle on, rate set   → apply that single rate to the whole subtotal
function computeTax(subtotal, products) {
  const enabled = document.getElementById('gst-toggle')?.checked;
  if (!enabled) return 0;

  const rateRaw = document.getElementById('gst-rate-input')?.value ?? '';
  const rate = parseFloat(rateRaw);
  if (rateRaw !== '' && !isNaN(rate) && rate >= 0) {
    return subtotal * rate / 100;
  }
  // Fall back to per-product GST rates
  return cart.reduce((s, i) => {
    const p = products.find(x => x.id === i.id);
    return s + (p?.tax ? (i.price * i.qty * p.tax) / 100 : 0);
  }, 0);
}

async function updateTotals() {
  const products = await cachedProducts();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discType = document.getElementById('discount-type')?.value || 'flat';
  const discVal = parseFloat(document.getElementById('discount-input')?.value || 0) || 0;
  discount = discType === 'pct' ? subtotal * discVal / 100 : discVal;

  const gstEnabled = document.getElementById('gst-toggle')?.checked;
  const tax = computeTax(subtotal, products);

  const total = subtotal - discount + tax;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('subtotal-val', formatCurrency(subtotal));
  set('total-val', formatCurrency(Math.max(0, total)));
  set('tax-val', formatCurrency(tax));

  const cartCount = document.getElementById('cart-count');
  if (cartCount) cartCount.textContent = `${cart.reduce((s, i) => s + i.qty, 0)} ${window.t('items')}`;

  // Grey-out the rate input when GST is disabled
  const rateInput = document.getElementById('gst-rate-input');
  if (rateInput) {
    rateInput.disabled = !gstEnabled;
    rateInput.style.opacity = gstEnabled ? '1' : '.4';
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
}

function renderBNFList(products) {
  if (!products.length) return `<p style="color:var(--text-muted);text-align:center;padding:16px;font-size:.85rem;">No products match</p>`;
  return products.slice(0, 8).map(p => `
    <div class="cart-item" style="cursor:pointer;" onclick="window._bnfAddToCart('${p.id}')">
      <div style="flex:1;">
        <div class="cart-item-name">${p.name}</div>
        <div class="cart-item-price">${formatCurrency(p.price)} · ${p.stock > 0 ? `${p.stock} in stock` : '❌ Out of stock'}</div>
      </div>
      <span class="badge badge-violet" style="cursor:pointer;">+ Add</span>
    </div>
  `).join('');
}

async function showBarcodeNotFoundModal(barcode) {
  const products = await cachedProducts();

  createModal({
    id: 'barcode-not-found',
    title: '🔍 Barcode Not Recognized',
    body: `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="background:var(--danger-glow);border:1px solid rgba(239,68,68,.15);border-radius:var(--radius-md);padding:10px 14px;">
          <p style="font-size:.8rem;color:var(--danger);">No product matched barcode: <strong style="font-family:'JetBrains Mono',monospace;">${barcode}</strong></p>
        </div>

        <div class="form-group" style="margin:0;">
          <label class="form-label">Search product to add to cart</label>
          <div class="search-bar">
            <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" class="form-input" id="bnf-search" placeholder="Type product name…" style="padding-left:38px;" autofocus>
          </div>
        </div>
        <div id="bnf-results" style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;">
          ${renderBNFList(products)}
        </div>

        <div class="divider" style="margin:4px 0;"></div>

        <div>
          <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px;">💡 Assign this barcode to a product so it works next time:</p>
          <div style="display:flex;gap:8px;">
            <select class="form-select" id="bnf-assign-select" style="flex:1;">
              <option value="">— select product —</option>
              ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
            <button class="btn btn-primary btn-sm" id="bnf-assign-btn">Assign</button>
          </div>
        </div>
      </div>
    `
  });

  setTimeout(() => {
    document.getElementById('bnf-search')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))
      );
      document.getElementById('bnf-results').innerHTML = renderBNFList(filtered);
    });

    document.getElementById('bnf-assign-btn')?.addEventListener('click', async () => {
      const id = document.getElementById('bnf-assign-select')?.value;
      if (!id) { toast.warning('Select a product first'); return; }
      const product = products.find(p => p.id === id);
      await DB.updateProduct(id, { barcode });
      _productsCache = null; // product changed, bust cache
      toast.success(`Barcode assigned to "${product?.name}" — scan will work next time!`);
      closeModal('barcode-not-found');
    });

    window._bnfAddToCart = async (productId) => {
      closeModal('barcode-not-found');
      await addToCart(productId);
    };
  }, 100);
}

async function resumeHeldBill() {
  const heldBill = JSON.parse(localStorage.getItem('smartbill_held_bill') || 'null');
  if (!heldBill) return;
  cart = heldBill.cart || [];
  paymentMethod = heldBill.paymentMethod || 'Cash';
  selectedCustomerId = heldBill.selectedCustomerId || null;
  selectedCustomerName = heldBill.selectedCustomerName || null;
  localStorage.removeItem('smartbill_held_bill');

  const discInput = document.getElementById('discount-input');
  const discType = document.getElementById('discount-type');
  if (discInput) discInput.value = heldBill.discountVal || '';
  if (discType) discType.value = heldBill.discountType || 'flat';

  document.querySelectorAll('.payment-method-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.pay === paymentMethod);
  });

  if (selectedCustomerName) {
    const bar = document.getElementById('customer-bar');
    const label = document.getElementById('customer-label');
    if (bar) bar.style.display = '';
    if (label) label.textContent = '👤 ' + selectedCustomerName;
  }

  renderCartItems();
  await updateTotals();
  const products = await cachedProducts();
  document.getElementById('product-grid').innerHTML = renderProductGrid(products, searchQuery, selectedCategory);
  toast.success(`Held bill restored — ${cart.length} item${cart.length !== 1 ? 's' : ''} back in cart`);

  const resumeBtn = document.getElementById('resume-btn');
  if (resumeBtn) resumeBtn.remove();
}

export async function initBilling() {
  // Reset state and caches on page init
  cart = [];
  discount = 0;
  paymentMethod = 'Cash';
  selectedCustomerId = null;
  selectedCustomerName = null;
  _settingsCache = null;
  // _productsCache seeded in renderBilling(); keep it to avoid refetch

  // Product search
  document.getElementById('product-search')?.addEventListener('input', async e => {
    searchQuery = e.target.value;
    const products = await cachedProducts();
    document.getElementById('product-grid').innerHTML = renderProductGrid(products, searchQuery, selectedCategory);
  });

  // Category filter
  document.getElementById('category-filters')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    selectedCategory = btn.dataset.cat;
    document.querySelectorAll('#category-filters [data-cat]').forEach(b => {
      b.className = `btn btn-sm ${b.dataset.cat === selectedCategory ? 'btn-primary' : 'btn-secondary'}`;
    });
    const products = await cachedProducts();
    document.getElementById('product-grid').innerHTML = renderProductGrid(products, searchQuery, selectedCategory);
  });

  // Scanner
  document.getElementById('scan-btn')?.addEventListener('click', () => {
    openScanner(async barcode => {
      const p = await DB.getProductByBarcode(barcode);
      if (p) {
        await addToCart(p.id);
        toast.success(`✅ ${p.name} added to cart`);
      } else {
        await showBarcodeNotFoundModal(barcode);
      }
    });
  });

  // Payment method
  document.querySelectorAll('.payment-method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      paymentMethod = btn.dataset.pay;
      document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Discount
  document.getElementById('discount-input')?.addEventListener('input', updateTotals);
  document.getElementById('discount-type')?.addEventListener('change', updateTotals);

  // GST — initialise toggle from shop settings, then recalc on any change
  const gstToggle = document.getElementById('gst-toggle');
  if (gstToggle) {
    const settings = await cachedSettings();
    gstToggle.checked = settings.gstEnabled !== false; // default ON unless explicitly disabled
    gstToggle.addEventListener('change', updateTotals);
  }
  document.getElementById('gst-rate-input')?.addEventListener('input', updateTotals);
  await updateTotals(); // reflect initial GST state immediately

  // Clear Discount
  document.getElementById('clear-discount-btn')?.addEventListener('click', async () => {
    const discInput = document.getElementById('discount-input');
    if (discInput) discInput.value = '';
    await updateTotals();
  });

  // Clear Cart
  document.getElementById('clear-cart-btn')?.addEventListener('click', async () => {
    if (cart.length === 0) return;
    cart = [];
    renderCartItems();
    await updateTotals();
    const products = await cachedProducts();
    document.getElementById('product-grid').innerHTML = renderProductGrid(products, searchQuery, selectedCategory);
  });

  // Hold Bill
  document.getElementById('hold-btn')?.addEventListener('click', async () => {
    if (cart.length === 0) { toast.warning('Cart is empty — nothing to hold'); return; }
    const heldData = {
      cart: [...cart],
      discountVal: document.getElementById('discount-input')?.value || '',
      discountType: document.getElementById('discount-type')?.value || 'flat',
      paymentMethod,
      selectedCustomerId,
      selectedCustomerName,
      savedAt: new Date().toLocaleTimeString()
    };
    localStorage.setItem('smartbill_held_bill', JSON.stringify(heldData));
    cart = [];
    selectedCustomerId = null;
    selectedCustomerName = null;
    const custBar = document.getElementById('customer-bar');
    const discInp = document.getElementById('discount-input');
    if (custBar) custBar.style.display = 'none';
    if (discInp) discInp.value = '';
    renderCartItems();
    await updateTotals();
    const products = await cachedProducts();
    document.getElementById('product-grid').innerHTML = renderProductGrid(products, searchQuery, selectedCategory);
    toast.success(`Bill held! ${heldData.cart.length} item${heldData.cart.length !== 1 ? 's' : ''} saved — click Resume to restore.`);

    const holdBtn = document.getElementById('hold-btn');
    if (holdBtn && !document.getElementById('resume-btn')) {
      const resumeBtn = document.createElement('button');
      resumeBtn.className = 'btn btn-amber btn-sm';
      resumeBtn.id = 'resume-btn';
      resumeBtn.title = `Resume held bill (${heldData.cart.length} items from ${heldData.savedAt})`;
      resumeBtn.textContent = `▶ Resume (${heldData.cart.length})`;
      holdBtn.parentNode.insertBefore(resumeBtn, holdBtn);
      resumeBtn.addEventListener('click', resumeHeldBill);
    }
  });

  // Resume Held Bill
  document.getElementById('resume-btn')?.addEventListener('click', resumeHeldBill);

  // Add Customer
  document.getElementById('add-customer-btn')?.addEventListener('click', async () => {
    const customers = await DB.getCustomers();

    const renderCustomerList = (list) => list.map(c => `
      <div class="cart-item" style="cursor:pointer;" onclick="window.selectCustomer('${c.id}', '${c.name.replace(/'/g, "\\'")}')">
        <div class="sidebar-avatar" style="width:36px;height:36px;font-size:.8rem;">${c.name.slice(0, 2).toUpperCase()}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${c.name}</div>
          <div class="cart-item-price">${c.phone || 'No phone'}</div>
        </div>
      </div>
    `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px;">No customers found</p>';

    createModal({
      id: 'pick-customer',
      title: 'Select Customer',
      body: `
        <div class="form-group mb-4">
          <div class="search-bar">
            <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" class="form-input" id="cust-modal-search" placeholder="Search customers…" style="padding-left:38px;" autofocus>
          </div>
        </div>
        <div id="cust-list" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;">
          ${renderCustomerList(customers)}
        </div>
      `
    });

    // Live customer search inside modal
    setTimeout(() => {
      document.getElementById('cust-modal-search')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        const filtered = customers.filter(c =>
          c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
        );
        document.getElementById('cust-list').innerHTML = renderCustomerList(filtered);
      });
    }, 100);
  });

  window.selectCustomer = (id, name) => {
    selectedCustomerId = id;
    selectedCustomerName = name;
    const bar = document.getElementById('customer-bar');
    const label = document.getElementById('customer-label');
    if (bar) bar.style.display = '';
    if (label) label.textContent = '👤 ' + name;
    closeModal('pick-customer');
    toast.success('Customer added: ' + name);
  };

  document.getElementById('remove-customer-btn')?.addEventListener('click', () => {
    selectedCustomerId = null;
    selectedCustomerName = null;
    const bar = document.getElementById('customer-bar');
    if (bar) bar.style.display = 'none';
  });

  // Checkout
  document.getElementById('checkout-btn')?.addEventListener('click', () => {
    if (cart.length === 0) return toast.warning('Cart is empty');
    showCheckoutModal();
  });

  // Keyboard shortcuts
  const billingKeyHandler = (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.key === '/' || e.key === 'F3') {
      e.preventDefault();
      document.getElementById('product-search')?.focus();
    } else if (e.key === 'F9') {
      e.preventDefault();
      if (cart.length > 0) document.getElementById('checkout-btn')?.click();
    } else if (e.key === 'Escape') {
      const discInput = document.getElementById('discount-input');
      if (discInput && discInput.value) { discInput.value = ''; updateTotals(); }
    }
  };
  document.addEventListener('keydown', billingKeyHandler);
  window._billingKeyHandler = billingKeyHandler;

  // Register cart globals
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.cartQty = cartQty;
  window.cartSetQty = cartSetQty;
}

async function addToCart(productId) {
  const products = await cachedProducts();
  const p = products.find(x => x.id === productId);
  if (!p) return;
  if (p.stock === 0) { toast.warning(`${p.name} is out of stock`); return; }
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    if (existing.qty >= p.stock) { toast.warning(`Only ${p.stock} units available`); return; }
    existing.qty++;
  } else {
    cart.push({ id: p.id, name: p.name, price: p.price, qty: 1, tax: p.tax || 0 });
  }
  renderCartItems();
  await updateTotals();
  document.getElementById('product-grid').innerHTML = renderProductGrid(products, searchQuery, selectedCategory);
  toast.success(`${p.name} added ✓`, 1500);
}

async function removeFromCart(idx) {
  cart.splice(idx, 1);
  renderCartItems();
  await updateTotals();
  const products = await cachedProducts();
  document.getElementById('product-grid').innerHTML = renderProductGrid(products, searchQuery, selectedCategory);
}

async function cartQty(idx, delta) {
  const item = cart[idx];
  if (!item) return;
  const products = await cachedProducts();
  const p = products.find(x => x.id === item.id);
  item.qty = Math.max(1, item.qty + delta);
  if (p && item.qty > p.stock) { item.qty = p.stock; toast.warning(`Max stock: ${p.stock}`); }
  renderCartItems();
  await updateTotals();
  document.getElementById('product-grid').innerHTML = renderProductGrid(products, searchQuery, selectedCategory);
}

async function cartSetQty(idx, val) {
  const item = cart[idx];
  if (!item) return;
  const products = await cachedProducts();
  const p = products.find(x => x.id === item.id);
  const maxQty = p ? p.stock : 9999;
  item.qty = Math.max(1, Math.min(parseInt(val) || 1, maxQty));
  if (p && parseInt(val) > p.stock) toast.warning(`Max stock: ${p.stock}`);
  renderCartItems();
  await updateTotals();
  document.getElementById('product-grid').innerHTML = renderProductGrid(products, searchQuery, selectedCategory);
}

async function getCartTotals() {
  const settings = await cachedSettings();
  const products = await cachedProducts();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discType = document.getElementById('discount-type')?.value || 'flat';
  const discVal = parseFloat(document.getElementById('discount-input')?.value || 0) || 0;
  const disc = discType === 'pct' ? subtotal * discVal / 100 : discVal;
  const tax = computeTax(subtotal, products);
  const total = subtotal - disc + tax;
  return { subtotal, discount: disc, tax, total: Math.max(0, total), products, settings };
}

async function showCheckoutModal() {
  const { subtotal, discount: disc, tax, total } = await getCartTotals();
  createModal({
    id: 'checkout',
    title: '🧾 Confirm & Generate Bill',
    body: `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card-p" style="background:var(--bg-elevated);border-radius:var(--radius-md);">
          ${cart.map(i => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--glass-border);">
              <span style="font-size:.85rem;color:var(--text-secondary);">${i.name} ×${i.qty}</span>
              <span style="font-size:.85rem;font-weight:600;font-family:'JetBrains Mono',monospace;">${formatCurrency(i.price * i.qty)}</span>
            </div>
          `).join('')}
          <div style="display:flex;justify-content:space-between;padding:8px 0 4px;border-top:1px solid var(--glass-border);margin-top:4px;">
            <span style="font-size:.8rem;color:var(--text-muted);">Subtotal</span>
            <span style="font-size:.8rem;">${formatCurrency(subtotal)}</span>
          </div>
          ${disc > 0 ? `<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="font-size:.8rem;color:var(--success);">Discount</span><span style="font-size:.8rem;color:var(--success);">-${formatCurrency(disc)}</span></div>` : ''}
          ${tax > 0 ? `<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="font-size:.8rem;color:var(--text-muted);">GST</span><span style="font-size:.8rem;">${formatCurrency(tax)}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;padding:8px 0 0;border-top:1px solid var(--glass-border);margin-top:4px;">
            <span style="font-weight:800;font-size:1rem;">TOTAL</span>
            <span style="font-weight:900;font-size:1.3rem;background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-family:'JetBrains Mono',monospace;">${formatCurrency(total)}</span>
          </div>
        </div>
        <div style="font-size:.85rem;color:var(--text-muted);">Payment: <strong style="color:var(--text-primary);">${paymentMethod}</strong></div>
        ${selectedCustomerName ? `<div style="font-size:.85rem;color:var(--text-muted);">Customer: <strong style="color:var(--text-primary);">${selectedCustomerName}</strong></div>` : ''}
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" onclick="window._closeModal('checkout')">Cancel</button>
      <button class="btn btn-primary" id="confirm-checkout-btn">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Confirm &amp; Bill
      </button>
    `
  });

  setTimeout(() => {
    document.getElementById('confirm-checkout-btn')?.addEventListener('click', async () => {
      await completeSale(subtotal, disc, tax, total);
    });
  }, 100);
}

async function completeSale(subtotal, disc, tax, total) {
  const settings = await cachedSettings();
  // Compute fresh totals at confirm time (in case discount changed)
  const { subtotal: s, discount: d, tax: t, total: tot } = await getCartTotals();

  // Bust products cache before fetching for cost calc — stock will update on backend
  _productsCache = null;
  const products = await cachedProducts();

  const costTotal = cart.reduce((sum, item) => {
    const p = products.find(x => x.id === item.id);
    return sum + (p ? (p.costPrice || p.price * 0.75) * item.qty : 0);
  }, 0);

  // Per-item tax honours the billing GST controls (toggle + optional rate override)
  const gstOn = document.getElementById('gst-toggle')?.checked;
  const rateRaw = document.getElementById('gst-rate-input')?.value ?? '';
  const overrideRate = rateRaw !== '' && !isNaN(parseFloat(rateRaw)) ? parseFloat(rateRaw) : null;

  const saleData = {
    items: cart.map(i => {
      const p = products.find(x => x.id === i.id);
      const lineBase = i.price * i.qty;
      let taxAmt = 0;
      if (gstOn) {
        const rate = overrideRate !== null ? overrideRate : (p?.tax || 0);
        taxAmt = lineBase * rate / 100;
      }
      return { ...i, taxAmt, total: lineBase + taxAmt };
    }),
    subtotal: s, discount: d, tax: t, total: tot,
    profit: tot - costTotal,
    paymentMethod,
    customerId: selectedCustomerId,
    customerName: selectedCustomerName,
  };

  const sale = await DB.addSale(saleData);
  closeModal('checkout');
  toast.success(`✅ Bill ${sale.invoiceNo} created!`);

  // Show invoice options before resetting cart
  await showInvoiceOptions(sale);

  // Reset state
  cart = [];
  selectedCustomerId = null;
  selectedCustomerName = null;
  const custBar = document.getElementById('customer-bar');
  const discInp = document.getElementById('discount-input');
  if (custBar) custBar.style.display = 'none';
  if (discInp) discInp.value = '';
  renderCartItems();

  // Fetch fresh product data (stock was decremented on server)
  _productsCache = null;
  const updatedProducts = await cachedProducts();
  await updateTotals();
  document.getElementById('product-grid').innerHTML = renderProductGrid(updatedProducts, searchQuery, selectedCategory);
}

async function showInvoiceOptions(sale) {
  createModal({
    id: 'invoice-opts',
    title: '✅ Bill Generated!',
    body: `
      <div style="text-align:center;padding:16px 0;">
        <div style="font-size:3rem;margin-bottom:12px;">🎉</div>
        <div style="font-size:1.3rem;font-weight:800;background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${sale.invoiceNo}</div>
        <div style="font-size:2rem;font-weight:900;color:var(--success);margin:8px 0;font-family:'JetBrains Mono',monospace;">₹${sale.total.toFixed(2)}</div>
        <div style="color:var(--text-muted);font-size:.85rem;">Payment: ${sale.paymentMethod}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;">
        <button class="btn btn-primary" id="download-pdf-btn">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Download PDF
        </button>
        <button class="btn btn-secondary" id="print-bill-btn">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          Print Receipt
        </button>
        <button class="btn btn-success" id="whatsapp-btn" style="grid-column:1/-1;">
          📲 Share on WhatsApp
        </button>
        <button class="btn btn-ghost" onclick="window._closeModal('invoice-opts')" style="grid-column:1/-1;">Close</button>
      </div>
    `
  });

  setTimeout(() => {
    document.getElementById('download-pdf-btn')?.addEventListener('click', () => generateInvoicePDF(sale));
    document.getElementById('print-bill-btn')?.addEventListener('click', () => printInvoice(sale));
    document.getElementById('whatsapp-btn')?.addEventListener('click', async () => {
      const customers = await DB.getCustomers();
      const phone = sale.customerId ? customers.find(c => c.id === sale.customerId)?.phone : '';
      shareWhatsApp(sale, phone);
    });
  }, 100);
}
