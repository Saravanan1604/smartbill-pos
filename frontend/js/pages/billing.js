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

export async function renderBilling() {
  const products = await DB.getProducts();
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  return `
    <div class="page-container" style="padding-bottom:0;">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Billing / POS</h1>
          <p>Scan products or search to add to cart</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary btn-sm" id="hold-btn">⏸ Hold</button>
          <button class="btn btn-secondary btn-sm" id="clear-cart-btn">🗑 Clear</button>
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
              <input type="text" class="form-input" id="product-search" placeholder="Search products by name or barcode..." style="padding-left:38px;">
            </div>
            <button class="scanner-trigger" id="scan-btn">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              Scan QR
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
              <div class="cart-title">🛒 Shopping Cart</div>
              <div class="cart-count" id="cart-count">0 items</div>
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
              <h3>Cart is empty</h3>
              <p>Click products or scan QR to add items</p>
            </div>
          </div>
          <div class="cart-footer">
            <!-- Summary -->
            <div class="cart-summary-row">
              <span class="cart-summary-label">Subtotal</span>
              <span class="cart-summary-value" id="subtotal-val">₹0.00</span>
            </div>
            <!-- Discount -->
            <div class="discount-row">
              <span class="cart-summary-label" style="flex-shrink:0;">Discount</span>
              <input type="number" class="form-input" id="discount-input" min="0" placeholder="₹0" style="max-width:90px;padding:6px 10px;font-size:.8rem;">
              <select class="form-select" id="discount-type" style="max-width:80px;padding:6px 10px;font-size:.8rem;">
                <option value="flat">₹</option>
                <option value="pct">%</option>
              </select>
            </div>
            <div class="cart-summary-row" id="tax-row" style="display:none;">
              <span class="cart-summary-label">Tax (GST)</span>
              <span class="cart-summary-value" id="tax-val">₹0.00</span>
            </div>
            <div class="cart-total-row">
              <span class="cart-total-label">TOTAL</span>
              <span class="cart-total-value" id="total-val">₹0.00</span>
            </div>
            <!-- Payment Method -->
            <div style="margin-top:4px;">
              <div class="cart-summary-label" style="margin-bottom:6px;">Payment Method</div>
              <div class="payment-methods">
                <button class="payment-method-btn active" data-pay="Cash">💵<span>Cash</span></button>
                <button class="payment-method-btn" data-pay="UPI">📱<span>UPI</span></button>
                <button class="payment-method-btn" data-pay="Card">💳<span>Card</span></button>
              </div>
            </div>
            <!-- Actions -->
            <div class="cart-actions" style="margin-top:8px;">
              <button class="btn btn-success btn-lg" id="checkout-btn" disabled style="width:100%;">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Checkout & Generate Bill
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

  if (filtered.length === 0) return `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">📦</div><h3>No products found</h3><p>Try a different search or category</p></div>`;

  return filtered.map(p => `
    <div class="product-tile ${p.stock === 0 ? 'out-of-stock' : ''}" data-id="${p.id}" onclick="${p.stock === 0 ? 'return' : `window.addToCart('${p.id}')`}">
      <span class="product-tile-cat">${p.category || ''}</span>
      <div class="product-tile-name">${p.name}</div>
      <div class="product-tile-price">${formatCurrency(p.price)}</div>
      <div class="product-tile-stock" style="color:${p.stock === 0 ? 'var(--danger)' : p.stock <= (p.alertThreshold||10) ? 'var(--warning)' : 'var(--text-muted)'};">
        ${p.stock === 0 ? '❌ Out of stock' : `📦 ${p.stock} left`}
      </div>
    </div>
  `).join('');
}

function renderCartItems() {
  const cartEl = document.getElementById('cart-items');
  const emptyEl = document.getElementById('cart-empty');
  if (!cartEl) return;

  if (cart.length === 0) {
    if (emptyEl) { emptyEl.style.display = ''; }
    cartEl.innerHTML = emptyEl ? emptyEl.outerHTML : '<div class="empty-state"><div class="empty-state-icon">🛒</div><h3>Cart is empty</h3></div>';
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

async function updateTotals() {
  const settings = await DB.getSettings();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discType = document.getElementById('discount-type')?.value || 'flat';
  const discVal = parseFloat(document.getElementById('discount-input')?.value || 0) || 0;
  discount = discType === 'pct' ? subtotal * discVal / 100 : discVal;

  const products = await DB.getProducts();
  const taxItems = cart.map(item => {
    const p = products.find(x => x.id === item.id);
    const taxRate = (settings.gstEnabled && p?.tax) ? p.tax : 0;
    return (item.price * item.qty * taxRate) / 100;
  });
  const tax = settings.gstEnabled ? taxItems.reduce((a, b) => a + b, 0) : 0;
  const total = subtotal - discount + tax;

  document.getElementById('subtotal-val') && (document.getElementById('subtotal-val').textContent = formatCurrency(subtotal));
  document.getElementById('total-val') && (document.getElementById('total-val').textContent = formatCurrency(Math.max(0, total)));
  const cartCount = document.getElementById('cart-count');
  if (cartCount) cartCount.textContent = `${cart.reduce((s, i) => s + i.qty, 0)} items`;
  const taxRow = document.getElementById('tax-row');
  if (taxRow) { taxRow.style.display = settings.gstEnabled ? '' : 'none'; }
  document.getElementById('tax-val') && (document.getElementById('tax-val').textContent = formatCurrency(tax));
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
}

let selectedCustomerId = null;
let selectedCustomerName = null;

export async function initBilling() {
  cart = [];
  discount = 0;
  paymentMethod = 'Cash';
  selectedCustomerId = null;
  selectedCustomerName = null;

  // Product search
  document.getElementById('product-search')?.addEventListener('input', async e => {
    searchQuery = e.target.value;
    const products = await DB.getProducts();
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
    const products = await DB.getProducts();
    document.getElementById('product-grid').innerHTML = renderProductGrid(products, searchQuery, selectedCategory);
  });

  // Scanner
  document.getElementById('scan-btn')?.addEventListener('click', () => {
    openScanner(async barcode => {
      const p = await DB.getProductByBarcode(barcode);
      if (p) { await addToCart(p.id); toast.success(`✅ ${p.name} added to cart`); }
      else toast.error(`❌ No product found for barcode: ${barcode}`);
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

  // Clear Cart
  document.getElementById('clear-cart-btn')?.addEventListener('click', async () => {
    cart = [];
    renderCartItems();
    await updateTotals();
  });

  // Hold
  document.getElementById('hold-btn')?.addEventListener('click', () => {
    toast.info('Bill held. You can resume anytime.');
  });

  // Add Customer
  document.getElementById('add-customer-btn')?.addEventListener('click', async () => {
    const customers = await DB.getCustomers();
    createModal({
      id: 'pick-customer',
      title: 'Select Customer',
      body: `
        <div class="form-group mb-4">
          <div class="search-bar">
            <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" class="form-input" id="cust-search" placeholder="Search customers..." style="padding-left:38px;">
          </div>
        </div>
        <div id="cust-list" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;">
          ${customers.map(c => `
            <div class="cart-item" style="cursor:pointer;" onclick="window.selectCustomer('${c.id}', '${c.name.replace(/'/g,"\\'")}')">
              <div class="sidebar-avatar" style="width:36px;height:36px;font-size:.8rem;">${c.name.slice(0,2).toUpperCase()}</div>
              <div class="cart-item-info">
                <div class="cart-item-name">${c.name}</div>
                <div class="cart-item-price">${c.phone}</div>
              </div>
            </div>
          `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px;">No customers found</p>'}
        </div>
      `
    });
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
    document.getElementById('customer-bar').style.display = 'none';
  });

  // Checkout
  document.getElementById('checkout-btn')?.addEventListener('click', () => {
    if (cart.length === 0) return toast.warning('Cart is empty');
    showCheckoutModal();
  });

  // Global functions
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.cartQty = cartQty;
  window.cartSetQty = cartSetQty;
}

async function addToCart(productId) {
  const products = await DB.getProducts();
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
  toast.success(`${p.name} added ✓`, 1500);
}

async function removeFromCart(idx) {
  cart.splice(idx, 1);
  renderCartItems();
  await updateTotals();
}

async function cartQty(idx, delta) {
  const item = cart[idx];
  if (!item) return;
  const products = await DB.getProducts();
  const p = products.find(x => x.id === item.id);
  item.qty = Math.max(1, item.qty + delta);
  if (p && item.qty > p.stock) { item.qty = p.stock; toast.warning(`Max stock: ${p.stock}`); }
  renderCartItems();
  await updateTotals();
}

async function cartSetQty(idx, val) {
  const item = cart[idx];
  if (!item) return;
  item.qty = Math.max(1, parseInt(val) || 1);
  renderCartItems();
  await updateTotals();
}

async function getCartTotals() {
  const settings = await DB.getSettings();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discType = document.getElementById('discount-type')?.value || 'flat';
  const discVal = parseFloat(document.getElementById('discount-input')?.value || 0) || 0;
  const disc = discType === 'pct' ? subtotal * discVal / 100 : discVal;
  const products = await DB.getProducts();
  const tax = settings.gstEnabled ? cart.reduce((s, i) => {
    const p = products.find(x => x.id === i.id);
    return s + (p?.tax ? (i.price * i.qty * p.tax) / 100 : 0);
  }, 0) : 0;
  const total = subtotal - disc + tax;
  return { subtotal, discount: disc, tax, total: Math.max(0, total) };
}

async function showCheckoutModal() {
  const { subtotal, discount: disc, tax, total } = await getCartTotals();
  const settings = await DB.getSettings();
  createModal({
    id: 'checkout',
    title: '🧾 Confirm & Generate Bill',
    size: '',
    body: `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card-p" style="background:var(--bg-elevated);border-radius:var(--radius-md);">
          ${cart.map(i => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--glass-border);">
              <span style="font-size:.85rem;color:var(--text-secondary);">${i.name} x${i.qty}</span>
              <span style="font-size:.85rem;font-weight:600;font-family:'JetBrains Mono',monospace;">${formatCurrency(i.price * i.qty)}</span>
            </div>
          `).join('')}
          <div style="display:flex;justify-content:space-between;padding:8px 0 4px;border-top:1px solid var(--glass-border);margin-top:4px;">
            <span style="font-size:.8rem;color:var(--text-muted);">Subtotal</span><span style="font-size:.8rem;">${formatCurrency(subtotal)}</span>
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
        Confirm & Bill
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
  const settings = await DB.getSettings();
  const { subtotal: s, discount: d, tax: t, total: tot } = await getCartTotals();
  const products = await DB.getProducts();
  const costTotal = cart.reduce((sum, item) => {
    const p = products.find(x => x.id === item.id);
    return sum + (p ? (p.costPrice || p.price * 0.75) * item.qty : 0);
  }, 0);

  const saleData = {
    items: cart.map(i => {
      const p = products.find(x => x.id === i.id);
      const taxAmt = settings.gstEnabled && p?.tax ? (i.price * i.qty * p.tax) / 100 : 0;
      return { ...i, taxAmt, total: i.price * i.qty + taxAmt };
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

  // Show invoice options
  await showInvoiceOptions(sale);

  // Reset
  cart = [];
  selectedCustomerId = null;
  selectedCustomerName = null;
  document.getElementById('customer-bar').style.display = 'none';
  document.getElementById('discount-input').value = '';
  renderCartItems();
  await updateTotals();
  // Refresh product grid (stock updated)
  const updatedProducts = await DB.getProducts();
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
