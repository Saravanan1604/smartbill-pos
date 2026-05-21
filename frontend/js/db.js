// ===== SmartBill Database Service Client =====
// Asynchronous database calls linked to Express Node.js Backend API
import Auth from './auth.js';

const DB = {
  get apiBase() {
    return window.API_BASE_URL || 'http://localhost:5000';
  },

  async request(endpoint, options = {}) {
    const url = `${this.apiBase}${endpoint}`;
    const headers = Auth.getHeaders();
    
    const config = {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred');
      }
      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err.message);
      throw err;
    }
  },

  // ---- PRODUCTS ----
  async getProducts() {
    return this.request('/api/products');
  },

  async addProduct(product) {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(product)
    });
  },

  async updateProduct(id, updates) {
    return this.request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteProduct(id) {
    return this.request(`/api/products/${id}`, {
      method: 'DELETE'
    });
  },

  async getProductByBarcode(barcode) {
    const products = await this.getProducts();
    return products.find(p => p.barcode === barcode.toString());
  },

  // ---- SALES ----
  async getSales() {
    return this.request('/api/sales');
  },

  async addSale(sale) {
    return this.request('/api/sales', {
      method: 'POST',
      body: JSON.stringify(sale)
    });
  },

  async getTodaySales() {
    const sales = await this.getSales();
    const today = new Date().toISOString().split('T')[0];
    return sales.filter(s => s.date === today);
  },

  // ---- CUSTOMERS ----
  async getCustomers() {
    return this.request('/api/customers');
  },

  async addCustomer(customer) {
    return this.request('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customer)
    });
  },

  async updateCustomer(id, updates) {
    return this.request(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteCustomer(id) {
    return this.request(`/api/customers/${id}`, {
      method: 'DELETE'
    });
  },

  // ---- SETTINGS ----
  async getSettings() {
    return this.request('/api/settings');
  },

  async saveSettings(settings) {
    return this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  },

  // ---- ANALYTICS & DASHBOARD ----
  async getDashboardStats() {
    return this.request('/api/analytics/dashboard');
  },

  async getLast7DaysSales() {
    return this.request('/api/analytics/sales-trend');
  },

  async getTopProducts(limit = 5) {
    return this.request(`/api/analytics/top-products?limit=${limit}`);
  },

  // Legacy local seeding is handled server-side now.
  isSeeded() { return true; },
  seed() { return Promise.resolve(true); }
};

export default DB;
