// ===== SmartBill Database Service =====
import Auth from './auth.js';

const DB = {
  get apiBase() { return window.API_BASE_URL || 'http://localhost:5000'; },

  async request(endpoint, options = {}) {
    const url = `${this.apiBase}${endpoint}`;
    const config = { ...options, headers: { ...Auth.getHeaders(), ...(options.headers || {}) } };
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Server error');
      return this._normalize(data);
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  // Map MongoDB `_id` → `id` recursively so the whole frontend can use `.id`.
  // Backend returns Mongoose docs (which serialize `_id` but not `id`).
  _normalize(data) {
    if (Array.isArray(data)) return data.map(d => this._normalize(d));
    if (data && typeof data === 'object') {
      if (data._id != null && data.id == null) data.id = String(data._id);
      for (const key of Object.keys(data)) {
        const val = data[key];
        if (val && typeof val === 'object') data[key] = this._normalize(val);
      }
    }
    return data;
  },

  // ── PRODUCTS ──────────────────────────────────────────────────────────────
  getProducts()         { return this.request('/api/products'); },
  addProduct(p)         { return this.request('/api/products', { method:'POST', body:JSON.stringify(p) }); },
  updateProduct(id, u)  { return this.request(`/api/products/${id}`, { method:'PUT', body:JSON.stringify(u) }); },
  deleteProduct(id)     { return this.request(`/api/products/${id}`, { method:'DELETE' }); },
  adjustStock(id, opts) { return this.request(`/api/products/${id}/adjust-stock`, { method:'POST', body:JSON.stringify(opts) }); },

  // ── PURCHASES (stock-in) ────────────────────────────────────────────────────
  getPurchases()        { return this.request('/api/purchases'); },
  getSuppliers()        { return this.request('/api/purchases/suppliers'); },
  addPurchase(p)        { return this.request('/api/purchases', { method:'POST', body:JSON.stringify(p) }); },
  scanPurchaseBill(image){ return this.request('/api/purchases/scan', { method:'POST', body:JSON.stringify({ image }) }); },

  async getProductByBarcode(barcode) {
    const products = await this.getProducts();
    return products.find(p => p.barcode === barcode.toString());
  },

  // ── SALES ─────────────────────────────────────────────────────────────────
  getSales()            { return this.request('/api/sales'); },
  addSale(sale)         { return this.request('/api/sales', { method:'POST', body:JSON.stringify(sale) }); },
  getDeletedSales()     { return this.request('/api/sales/deleted'); },
  deleteSale(id)        { return this.request(`/api/sales/${id}`, { method:'DELETE' }); },
  recoverSale(id)       { return this.request(`/api/sales/${id}/recover`, { method:'POST' }); },

  async getTodaySales() {
    const today = new Date().toISOString().split('T')[0];
    return (await this.getSales()).filter(s => s.date === today);
  },

  // ── CUSTOMERS ─────────────────────────────────────────────────────────────
  getCustomers()           { return this.request('/api/customers'); },
  addPayment(body)         { return this.request('/api/payments', { method:'POST', body:JSON.stringify(body) }); },
  getCustomerLedger(id)    { return this.request(`/api/payments/ledger/${id}`); },
  addCustomer(c)           { return this.request('/api/customers', { method:'POST', body:JSON.stringify(c) }); },
  updateCustomer(id, u)    { return this.request(`/api/customers/${id}`, { method:'PUT', body:JSON.stringify(u) }); },
  deleteCustomer(id)       { return this.request(`/api/customers/${id}`, { method:'DELETE' }); },

  // ── SETTINGS ──────────────────────────────────────────────────────────────
  getSettings()            { return this.request('/api/settings'); },
  saveSettings(s)          { return this.request('/api/settings', { method:'POST', body:JSON.stringify(s) }); },

  // ── USERS (admin only) ────────────────────────────────────────────────────
  getUsers()             { return this.request('/api/auth/users'); },
  deleteUser(id)         { return this.request(`/api/auth/users/${id}`, { method:'DELETE' }); },

  // ── PLATFORM (super-admin only) ───────────────────────────────────────────
  getPlatformStats()             { return this.request('/api/platform/stats'); },
  getPlatformShops(query = '')   { return this.request('/api/platform/shops' + (query ? `?${query}` : '')); },
  getPlatformShop(id)            { return this.request(`/api/platform/shops/${id}`); },
  getPlatformPlans()             { return this.request('/api/platform/plans'); },
  updateShopSubscription(id, body) {
    return this.request(`/api/platform/shops/${id}/subscription`, { method: 'POST', body: JSON.stringify(body) });
  },

  // ── BILLING / SUBSCRIPTION (shop owner) ────────────────────────────────────
  getBillingStatus()       { return this.request('/api/billing/status'); },
  createBillingOrder(body) { return this.request('/api/billing/create-order', { method: 'POST', body: JSON.stringify(body) }); },
  verifyBillingPayment(body){ return this.request('/api/billing/verify', { method: 'POST', body: JSON.stringify(body) }); },

  // ── ANALYTICS ─────────────────────────────────────────────────────────────
  getDashboardStats()      { return this.request('/api/analytics/dashboard'); },
  getInsights()            { return this.request('/api/analytics/insights'); },
  getUpsellMap()           { return this.request('/api/analytics/upsell'); },
  getLast7DaysSales()      { return this.request('/api/analytics/sales-trend'); },
  getTopProducts(n = 5)    { return this.request(`/api/analytics/top-products?limit=${n}`); },

  isSeeded() { return true; },
  seed()     { return Promise.resolve(true); }
};

export default DB;
