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
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  // ── PRODUCTS ──────────────────────────────────────────────────────────────
  getProducts()         { return this.request('/api/products'); },
  addProduct(p)         { return this.request('/api/products', { method:'POST', body:JSON.stringify(p) }); },
  updateProduct(id, u)  { return this.request(`/api/products/${id}`, { method:'PUT', body:JSON.stringify(u) }); },
  deleteProduct(id)     { return this.request(`/api/products/${id}`, { method:'DELETE' }); },
  adjustStock(id, opts) { return this.request(`/api/products/${id}/adjust-stock`, { method:'POST', body:JSON.stringify(opts) }); },

  async getProductByBarcode(barcode) {
    const products = await this.getProducts();
    return products.find(p => p.barcode === barcode.toString());
  },

  // ── SALES ─────────────────────────────────────────────────────────────────
  getSales()            { return this.request('/api/sales'); },
  addSale(sale)         { return this.request('/api/sales', { method:'POST', body:JSON.stringify(sale) }); },

  async getTodaySales() {
    const today = new Date().toISOString().split('T')[0];
    return (await this.getSales()).filter(s => s.date === today);
  },

  // ── CUSTOMERS ─────────────────────────────────────────────────────────────
  getCustomers()           { return this.request('/api/customers'); },
  addCustomer(c)           { return this.request('/api/customers', { method:'POST', body:JSON.stringify(c) }); },
  updateCustomer(id, u)    { return this.request(`/api/customers/${id}`, { method:'PUT', body:JSON.stringify(u) }); },
  deleteCustomer(id)       { return this.request(`/api/customers/${id}`, { method:'DELETE' }); },

  // ── SETTINGS ──────────────────────────────────────────────────────────────
  getSettings()            { return this.request('/api/settings'); },
  saveSettings(s)          { return this.request('/api/settings', { method:'POST', body:JSON.stringify(s) }); },

  // ── USERS (admin only) ────────────────────────────────────────────────────
  getUsers()             { return this.request('/api/auth/users'); },
  deleteUser(id)         { return this.request(`/api/auth/users/${id}`, { method:'DELETE' }); },

  // ── ANALYTICS ─────────────────────────────────────────────────────────────
  getDashboardStats()      { return this.request('/api/analytics/dashboard'); },
  getLast7DaysSales()      { return this.request('/api/analytics/sales-trend'); },
  getTopProducts(n = 5)    { return this.request(`/api/analytics/top-products?limit=${n}`); },

  isSeeded() { return true; },
  seed()     { return Promise.resolve(true); }
};

export default DB;
