// ===== Customers Page =====
import DB from '../db.js';
import { formatCurrency, formatDate, initials } from '../utils/format.js';
import { createModal, closeModal, confirmDialog } from '../components/modal.js';
import toast from '../components/toast.js';

export async function renderCustomers() {
  const customers = await DB.getCustomers();
  const cardsHtml = await renderCustomerCards(customers, '');
  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Customers</h1>
          <p>${customers.length} registered customers</p>
        </div>
        <button class="btn btn-primary" id="add-customer-btn">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
          Add Customer
        </button>
      </div>

      <!-- Search -->
      <div class="search-bar mb-6" style="max-width:400px;">
        <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" class="form-input" id="cust-search" placeholder="Search customers..." style="padding-left:38px;">
      </div>

      <!-- Customer Grid -->
      <div class="grid-auto" id="customers-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}

async function renderCustomerCards(customers, query) {
  const filtered = customers.filter(c =>
    !query || c.name.toLowerCase().includes(query.toLowerCase()) || (c.phone && c.phone.includes(query))
  );

  if (!filtered.length) return `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">👥</div><h3>No customers found</h3><p>Add your first customer</p></div>`;

  const allSales = await DB.getSales();
  return filtered.map(c => {
    // Get their sales
    const sales = allSales.filter(s => s.customerId === c.id);
    const totalSpent = sales.reduce((a, b) => a + b.total, 0);
    return `
      <div class="customer-card" onclick="window.viewCustomer('${c.id}')">
        <div class="customer-avatar-lg">${initials(c.name)}</div>
        <div class="customer-name">${c.name}</div>
        <div class="customer-phone">📞 ${c.phone || '-'}</div>
        ${c.email ? `<div style="font-size:.75rem;color:var(--text-muted);margin-top:2px;">✉️ ${c.email}</div>` : ''}
        <div class="customer-stats">
          <div>
            <div class="customer-stat-val">${formatCurrency(totalSpent)}</div>
            <div class="customer-stat-label">Total Spent</div>
          </div>
          <div>
            <div class="customer-stat-val">${sales.length}</div>
            <div class="customer-stat-label">Visits</div>
          </div>
        </div>
        ${c.lastVisit ? `<div style="font-size:.7rem;color:var(--text-muted);margin-top:8px;">Last visit: ${formatDate(c.lastVisit)}</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:12px;">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();window.editCustomer('${c.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();window.deleteCustomer('${c.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

export function initCustomers() {
  document.getElementById('cust-search')?.addEventListener('input', async e => {
    const customers = await DB.getCustomers();
    document.getElementById('customers-grid').innerHTML = await renderCustomerCards(customers, e.target.value);
  });

  document.getElementById('add-customer-btn')?.addEventListener('click', () => {
    showCustomerModal(null, async () => {
      const customers = await DB.getCustomers();
      document.getElementById('customers-grid').innerHTML = await renderCustomerCards(customers, '');
    });
  });

  window.viewCustomer = async (id) => {
    const customers = await DB.getCustomers();
    const c = customers.find(x => x.id === id);
    if (!c) return;
    const allSales = await DB.getSales();
    const sales = allSales.filter(s => s.customerId === id);
    const totalSpent = sales.reduce((a, b) => a + b.total, 0);

    createModal({
      id: 'view-customer',
      title: '👤 Customer Details',
      size: 'lg',
      body: `
        <div style="display:flex;gap:20px;margin-bottom:20px;align-items:center;">
          <div class="customer-avatar-lg" style="width:64px;height:64px;font-size:1.4rem;margin:0;">${initials(c.name)}</div>
          <div>
            <div style="font-size:1.2rem;font-weight:800;color:var(--text-primary);">${c.name}</div>
            <div style="color:var(--text-muted);font-size:.875rem;">📞 ${c.phone || '-'} ${c.email ? '· ✉️ ' + c.email : ''}</div>
          </div>
        </div>
        <div class="grid-3 mb-6">
          <div class="report-stat"><div class="report-stat-value" style="color:var(--success);">${formatCurrency(totalSpent)}</div><div class="report-stat-label">Total Spent</div></div>
          <div class="report-stat"><div class="report-stat-value">${sales.length}</div><div class="report-stat-label">Total Visits</div></div>
          <div class="report-stat"><div class="report-stat-value">${formatCurrency(sales.length ? totalSpent / sales.length : 0)}</div><div class="report-stat-label">Avg Order</div></div>
        </div>
        <h4 style="margin-bottom:12px;color:var(--text-primary);">Purchase History</h4>
        <div class="table-wrap" style="max-height:300px;overflow-y:auto;">
          <table>
            <thead><tr><th>Invoice</th><th>Date</th><th>Items</th><th>Total</th></tr></thead>
            <tbody>
              ${sales.length === 0 ? `<tr><td colspan="4"><div class="empty-state"><p>No purchases yet</p></div></td></tr>` :
                [...sales].reverse().map(s => `
                  <tr>
                    <td class="td-mono" style="color:var(--accent-violet-light);">${s.invoiceNo}</td>
                    <td style="font-size:.8rem;">${formatDate(s.createdAt)}</td>
                    <td>${s.items.length} items</td>
                    <td class="td-mono" style="color:var(--text-primary);font-weight:700;">${formatCurrency(s.total)}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      `
    });
  };

  window.editCustomer = async (id) => {
    const customers = await DB.getCustomers();
    const c = customers.find(x => x.id === id);
    if (c) showCustomerModal(c, async () => {
      const updatedCustomers = await DB.getCustomers();
      document.getElementById('customers-grid').innerHTML = await renderCustomerCards(updatedCustomers, '');
    });
  };

  window.deleteCustomer = async (id) => {
    const ok = await confirmDialog('Delete this customer? Their purchase history will be preserved.', 'Delete Customer');
    if (ok) {
      await DB.deleteCustomer(id);
      toast.success('Customer deleted');
      const updatedCustomers = await DB.getCustomers();
      document.getElementById('customers-grid').innerHTML = await renderCustomerCards(updatedCustomers, '');
    }
  };
}

function showCustomerModal(customer, onSave) {
  const isEdit = !!customer;
  createModal({
    id: 'customer-form',
    title: isEdit ? '✏️ Edit Customer' : '➕ Add Customer',
    body: `
      <div class="form-group" style="margin-bottom:16px;">
        <label class="form-label">Full Name *</label>
        <input type="text" class="form-input" id="cf-name" value="${isEdit ? customer.name : ''}" placeholder="Customer name">
      </div>
      <div class="form-group" style="margin-bottom:16px;">
        <label class="form-label">Phone Number</label>
        <input type="tel" class="form-input" id="cf-phone" value="${isEdit ? customer.phone || '' : ''}" placeholder="10-digit mobile number">
      </div>
      <div class="form-group">
        <label class="form-label">Email (Optional)</label>
        <input type="email" class="form-input" id="cf-email" value="${isEdit ? customer.email || '' : ''}" placeholder="email@example.com">
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" onclick="window._closeModal('customer-form')">Cancel</button>
      <button class="btn btn-primary" id="save-customer-btn">${isEdit ? 'Update' : 'Add Customer'}</button>
    `
  });

  setTimeout(() => {
    document.getElementById('save-customer-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('cf-name')?.value?.trim();
      if (!name) return toast.warning('Name is required');
      const data = {
        name,
        phone: document.getElementById('cf-phone')?.value?.trim() || '',
        email: document.getElementById('cf-email')?.value?.trim() || '',
      };
      if (isEdit) { await DB.updateCustomer(customer.id, data); toast.success('Customer updated!'); }
      else { await DB.addCustomer(data); toast.success('Customer added!'); }
      closeModal('customer-form');
      onSave?.();
    });
  }, 100);
}
