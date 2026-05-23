// ===== Customers Page =====
import DB from '../db.js';
import { formatCurrency, formatDate, initials } from '../utils/format.js';
import { createModal, closeModal, confirmDialog } from '../components/modal.js';
import toast from '../components/toast.js';

const TAGS = ['VIP','Regular','Wholesale','Walk-in','Online'];

// ── Avatar gradient pool ──────────────────────────────────────────────────────
const GRADIENTS = [
  'linear-gradient(135deg,#7c3aed,#06b6d4)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#f97316,#eab308)',
  'linear-gradient(135deg,#6366f1,#ec4899)',
];
function avatarGrad(name) {
  const h = name.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  return GRADIENTS[h % GRADIENTS.length];
}

function loyaltyTier(pts) {
  if (pts >= 1000) return { name:'Gold',   icon:'🥇', color:'#eab308', bg:'rgba(234,179,8,.15)' };
  if (pts >= 500)  return { name:'Silver', icon:'🥈', color:'#94a3b8', bg:'rgba(148,163,184,.15)' };
  if (pts >= 100)  return { name:'Bronze', icon:'🥉', color:'#f97316', bg:'rgba(249,115,22,.15)' };
  return               { name:'New',    icon:'✨', color:'#7c3aed', bg:'rgba(124,58,237,.15)' };
}

export async function renderCustomers() {
  const customers = await DB.getCustomers();
  const [allSales] = await Promise.all([DB.getSales()]);
  const cardsHtml = renderCustomerCards(customers, allSales, '');

  const totalSpent   = customers.reduce((s,c) => s + (c.totalSpent||0), 0);
  const totalPoints  = customers.reduce((s,c) => s + (c.loyaltyPoints||0), 0);
  const vipCount     = customers.filter(c => (c.tags||[]).includes('VIP')).length;

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

      <!-- KPI Row -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:20px;">
        <div class="cust-kpi" style="--ck:var(--accent-violet);">
          <div class="cust-kpi-icon">👥</div>
          <div class="cust-kpi-val">${customers.length}</div>
          <div class="cust-kpi-lbl">Total Customers</div>
        </div>
        <div class="cust-kpi" style="--ck:var(--success);">
          <div class="cust-kpi-icon">💰</div>
          <div class="cust-kpi-val">${formatCurrency(totalSpent)}</div>
          <div class="cust-kpi-lbl">Total Revenue</div>
        </div>
        <div class="cust-kpi" style="--ck:var(--accent-amber);">
          <div class="cust-kpi-icon">⭐</div>
          <div class="cust-kpi-val">${totalPoints.toLocaleString('en-IN')}</div>
          <div class="cust-kpi-lbl">Loyalty Points</div>
        </div>
        <div class="cust-kpi" style="--ck:#eab308;">
          <div class="cust-kpi-icon">🥇</div>
          <div class="cust-kpi-val">${vipCount}</div>
          <div class="cust-kpi-lbl">VIP Customers</div>
        </div>
      </div>

      <!-- Search & Filter -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;">
        <div class="search-bar" style="flex:1;min-width:200px;">
          <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" class="form-input" id="cust-search" placeholder="Search name, phone, email…" style="padding-left:38px;">
        </div>
        <select class="form-select" id="cust-sort" style="width:180px;">
          <option value="name">Sort: Name</option>
          <option value="spent">Sort: Total Spent</option>
          <option value="visits">Sort: Visits</option>
          <option value="points">Sort: Loyalty Points</option>
          <option value="recent">Sort: Last Visit</option>
        </select>
        <select class="form-select" id="cust-tag-filter" style="width:150px;">
          <option value="">All Tags</option>
          ${TAGS.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>

      <!-- Customer Grid -->
      <div class="grid-auto" id="customers-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}

function renderCustomerCards(customers, allSales, query, sortKey = 'name', tagFilter = '') {
  let filtered = customers.filter(c =>
    (!query || c.name.toLowerCase().includes(query.toLowerCase()) ||
              (c.phone && c.phone.includes(query)) ||
              (c.email && c.email.toLowerCase().includes(query.toLowerCase()))) &&
    (!tagFilter || (c.tags||[]).includes(tagFilter))
  );

  if (sortKey === 'spent')  filtered.sort((a,b) => (b.totalSpent||0) - (a.totalSpent||0));
  else if (sortKey === 'visits') filtered.sort((a,b) => (b.visitCount||0) - (a.visitCount||0));
  else if (sortKey === 'points') filtered.sort((a,b) => (b.loyaltyPoints||0) - (a.loyaltyPoints||0));
  else if (sortKey === 'recent') filtered.sort((a,b) => new Date(b.lastVisit||0) - new Date(a.lastVisit||0));
  else filtered.sort((a,b) => a.name.localeCompare(b.name));

  if (!filtered.length) return `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">👥</div><h3>No customers found</h3><p>Add your first customer</p></div>`;

  return filtered.map(c => {
    const tier  = loyaltyTier(c.loyaltyPoints || 0);
    const spent = c.totalSpent || allSales.filter(s => s.customerId === c.id).reduce((a,b) => a + b.total, 0);
    const grad  = avatarGrad(c.name);
    const isBday = c.birthday && isBirthdayMonth(c.birthday);

    return `
      <div class="cust-card" onclick="window.viewCustomer('${c.id}')">
        ${isBday ? `<div class="cust-bday-banner">🎂 Birthday this month!</div>` : ''}
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div class="cust-avatar-lg" style="background:${grad};">${initials(c.name)}</div>
          <div style="flex:1;min-width:0;">
            <div class="cust-name">${c.name}</div>
            ${c.phone ? `<div class="cust-info-line">📞 ${c.phone}</div>` : ''}
            ${c.email ? `<div class="cust-info-line">✉️ ${c.email}</div>` : ''}
          </div>
          <div class="cust-tier-badge" style="background:${tier.bg};color:${tier.color};">
            ${tier.icon} ${tier.name}
          </div>
        </div>

        <!-- Tags -->
        ${(c.tags||[]).length ? `
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;">
            ${(c.tags||[]).map(t => `<span class="cust-tag">${t}</span>`).join('')}
          </div>` : ''}

        <!-- Stats -->
        <div class="cust-stats">
          <div>
            <div class="cust-stat-val">${formatCurrency(spent)}</div>
            <div class="cust-stat-lbl">Total Spent</div>
          </div>
          <div>
            <div class="cust-stat-val">${c.visitCount || 0}</div>
            <div class="cust-stat-lbl">Visits</div>
          </div>
          <div>
            <div class="cust-stat-val" style="color:var(--accent-amber);">${(c.loyaltyPoints||0).toLocaleString('en-IN')}</div>
            <div class="cust-stat-lbl">Points</div>
          </div>
        </div>

        ${c.creditBalance > 0 ? `<div class="cust-credit-bar">💳 Credit Due: <strong>${formatCurrency(c.creditBalance)}</strong></div>` : ''}
        ${c.lastVisit ? `<div class="cust-last-visit">Last visit: ${formatDate(c.lastVisit)}</div>` : ''}

        <!-- Actions -->
        <div style="display:flex;gap:6px;margin-top:10px;" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="window.editCustomer('${c.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="window.deleteCustomer('${c.id}')">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

function isBirthdayMonth(bd) {
  if (!bd) return false;
  const month = parseInt(bd.split('-')[0]);
  return month === new Date().getMonth() + 1;
}

export async function initCustomers() {
  let query = '', sortKey = 'name', tagFilter = '';
  const allSales = await DB.getSales();

  async function refresh() {
    const customers = await DB.getCustomers();
    const el = document.getElementById('customers-grid');
    if (el) el.innerHTML = renderCustomerCards(customers, allSales, query, sortKey, tagFilter);
  }

  document.getElementById('cust-search')?.addEventListener('input', e => { query = e.target.value; refresh(); });
  document.getElementById('cust-sort')?.addEventListener('change', e => { sortKey = e.target.value; refresh(); });
  document.getElementById('cust-tag-filter')?.addEventListener('change', e => { tagFilter = e.target.value; refresh(); });

  document.getElementById('add-customer-btn')?.addEventListener('click', () => showCustomerModal(null, refresh));

  window.viewCustomer = async (id) => {
    const customers = await DB.getCustomers();
    const c = customers.find(x => x.id === id);
    if (!c) return;
    const sales = allSales.filter(s => s.customerId === id);
    const spent = sales.reduce((a,b) => a + b.total, 0);
    const tier  = loyaltyTier(c.loyaltyPoints || 0);
    const grad  = avatarGrad(c.name);

    createModal({
      id: 'view-customer',
      title: '👤 Customer Profile',
      size: 'lg',
      body: `
        <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;">
          <div class="cust-avatar-lg" style="width:64px;height:64px;font-size:1.4rem;margin:0;background:${grad};">${initials(c.name)}</div>
          <div style="flex:1;min-width:200px;">
            <div style="font-size:1.2rem;font-weight:800;color:var(--text-primary);">${c.name}</div>
            <div style="color:var(--text-muted);font-size:.85rem;margin-top:4px;">
              ${c.phone ? `📞 ${c.phone}` : ''} ${c.email ? `· ✉️ ${c.email}` : ''}
            </div>
            ${c.birthday ? `<div style="font-size:.8rem;color:var(--text-muted);margin-top:2px;">🎂 Birthday: ${c.birthday}</div>` : ''}
            ${c.notes ? `<div style="font-size:.8rem;color:var(--text-secondary);margin-top:6px;font-style:italic;">"${c.notes}"</div>` : ''}
          </div>
          <div class="cust-tier-badge" style="background:${tier.bg};color:${tier.color};font-size:.85rem;padding:6px 14px;">
            ${tier.icon} ${tier.name} Tier
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
          <div class="report-stat"><div class="report-stat-value" style="color:var(--success);">${formatCurrency(spent)}</div><div class="report-stat-label">Total Spent</div></div>
          <div class="report-stat"><div class="report-stat-value">${sales.length}</div><div class="report-stat-label">Visits</div></div>
          <div class="report-stat"><div class="report-stat-value" style="color:var(--accent-amber);">${(c.loyaltyPoints||0).toLocaleString('en-IN')}</div><div class="report-stat-label">Points</div></div>
          <div class="report-stat"><div class="report-stat-value">${formatCurrency(sales.length ? spent/sales.length : 0)}</div><div class="report-stat-label">Avg Order</div></div>
        </div>

        ${c.creditBalance > 0 ? `
          <div class="cust-credit-bar" style="margin-bottom:16px;">
            💳 Outstanding Credit: <strong style="color:var(--danger);">${formatCurrency(c.creditBalance)}</strong>
          </div>` : ''}

        <h4 style="margin-bottom:12px;">Purchase History</h4>
        <div class="table-wrap" style="max-height:260px;overflow-y:auto;">
          <table>
            <thead><tr><th>Invoice</th><th>Date</th><th>Items</th><th>Payment</th><th>Total</th></tr></thead>
            <tbody>
              ${!sales.length ? `<tr><td colspan="5"><div class="empty-state"><p>No purchases yet</p></div></td></tr>` :
                [...sales].reverse().map(s => `
                  <tr>
                    <td class="td-mono" style="color:var(--accent-violet-light);">${s.invoiceNo}</td>
                    <td style="font-size:.8rem;">${formatDate(s.createdAt)}</td>
                    <td>${s.items.length} items</td>
                    <td><span class="badge ${s.paymentMethod==='Cash'?'badge-green':s.paymentMethod==='UPI'?'badge-cyan':'badge-violet'}">${s.paymentMethod}</span></td>
                    <td class="td-mono" style="color:var(--text-primary);font-weight:700;">${formatCurrency(s.total)}</td>
                  </tr>`).join('')
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
    if (c) showCustomerModal(c, refresh);
  };

  window.deleteCustomer = async (id) => {
    const ok = await confirmDialog('Delete this customer? Purchase history will be preserved.', 'Delete Customer');
    if (ok) {
      await DB.deleteCustomer(id);
      toast.success('Customer deleted');
      refresh();
    }
  };
}

function showCustomerModal(customer, onSave) {
  const isEdit = !!customer;
  const tagHtml = TAGS.map(t => {
    const sel = isEdit && (customer.tags||[]).includes(t);
    return `<label class="tag-toggle ${sel?'active':''}" data-tag="${t}"><input type="checkbox" style="display:none;" ${sel?'checked':''}>${t}</label>`;
  }).join('');

  createModal({
    id: 'customer-form',
    title: isEdit ? '✏️ Edit Customer' : '➕ Add Customer',
    size: 'lg',
    body: `
      <div class="form-grid">
        <div class="form-group full-width">
          <label class="form-label">Full Name *</label>
          <input type="text" class="form-input" id="cf-name" value="${isEdit ? escHtml(customer.name) : ''}" placeholder="Customer name">
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" class="form-input" id="cf-phone" value="${isEdit ? customer.phone||'' : ''}" placeholder="10-digit mobile">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="cf-email" value="${isEdit ? customer.email||'' : ''}" placeholder="email@example.com">
        </div>
        <div class="form-group">
          <label class="form-label">Birthday (MM-DD)</label>
          <input type="text" class="form-input" id="cf-bday" value="${isEdit ? customer.birthday||'' : ''}" placeholder="e.g. 03-15">
        </div>
        <div class="form-group">
          <label class="form-label">Credit Balance (₹)</label>
          <input type="number" class="form-input" id="cf-credit" value="${isEdit ? customer.creditBalance||0 : 0}" min="0" step="0.01" placeholder="0.00">
        </div>
        <div class="form-group full-width">
          <label class="form-label">Loyalty Points</label>
          <input type="number" class="form-input" id="cf-points" value="${isEdit ? customer.loyaltyPoints||0 : 0}" min="0" placeholder="0">
        </div>
        <div class="form-group full-width">
          <label class="form-label">Tags</label>
          <div id="tag-wrap" style="display:flex;gap:8px;flex-wrap:wrap;">${tagHtml}</div>
        </div>
        <div class="form-group full-width">
          <label class="form-label">Notes</label>
          <textarea class="form-input form-textarea" id="cf-notes" placeholder="Any notes about this customer…" rows="2">${isEdit ? escHtml(customer.notes||'') : ''}</textarea>
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" onclick="window._closeModal('customer-form')">Cancel</button>
      <button class="btn btn-primary" id="save-customer-btn">${isEdit ? 'Update' : 'Add Customer'}</button>
    `
  });

  setTimeout(() => {
    // Tag toggle
    document.querySelectorAll('.tag-toggle').forEach(lbl => {
      lbl.addEventListener('click', () => {
        lbl.classList.toggle('active');
        lbl.querySelector('input').checked = lbl.classList.contains('active');
      });
    });

    document.getElementById('save-customer-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('cf-name')?.value?.trim();
      if (!name) return toast.warning('Name is required');

      const tags = Array.from(document.querySelectorAll('.tag-toggle.active')).map(l => l.dataset.tag);

      const data = {
        name,
        phone:         document.getElementById('cf-phone')?.value?.trim()  || '',
        email:         document.getElementById('cf-email')?.value?.trim()  || '',
        birthday:      document.getElementById('cf-bday')?.value?.trim()   || '',
        creditBalance: parseFloat(document.getElementById('cf-credit')?.value || 0) || 0,
        loyaltyPoints: parseInt(document.getElementById('cf-points')?.value || 0)   || 0,
        notes:         document.getElementById('cf-notes')?.value?.trim()  || '',
        tags
      };

      try {
        if (isEdit) { await DB.updateCustomer(customer.id, data); toast.success('Customer updated!'); }
        else        { await DB.addCustomer(data); toast.success('Customer added!'); }
        closeModal('customer-form');
        onSave?.();
      } catch (err) { toast.error(err.message); }
    });
  }, 100);
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
