// ===== Platform Owner Console (super-admin only) =====
// A full-screen dashboard, separate from the shop app, for the platform owner
// to monitor every shop's usage and subscription. Routed at #platform and
// guarded by role === 'superadmin' in app.js.
import DB from '../db.js';
import Auth from '../auth.js';
import toast from '../components/toast.js';
import { createModal, closeModal } from '../components/modal.js';
import { formatCurrency } from '../utils/format.js';

const STATUS_BADGE = {
  active:   'badge-green',
  trial:    'badge-violet',
  past_due: 'badge-amber',
  expired:  'badge-red',
  suspended:'badge-red',
};

export async function renderPlatform() {
  const session = Auth.getSession();
  return `
    <div style="min-height:100vh;background:var(--bg-base);">
      <!-- Top bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid var(--glass-border);background:var(--bg-elevated);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:38px;height:38px;border-radius:10px;background:var(--gradient-brand);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;">SB</div>
          <div>
            <div style="font-weight:800;font-size:1.05rem;">Platform Console</div>
            <div style="font-size:.72rem;color:var(--text-muted);">🔒 Super Admin · ${session?.username || ''}</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" id="plat-logout">Sign Out</button>
      </div>

      <div style="padding:24px 28px;max-width:1200px;margin:0 auto;" class="animate-fade">
        <!-- Stat cards -->
        <div class="grid-auto" id="plat-stats" style="margin-bottom:24px;">
          ${[1,2,3,4].map(() => `
            <div class="card" style="padding:18px;">
              <div class="skeleton" style="height:14px;width:60%;margin-bottom:10px;"></div>
              <div class="skeleton" style="height:26px;width:40%;"></div>
            </div>`).join('')}
        </div>

        <!-- Shops table -->
        <div class="card" style="padding:0;overflow:hidden;">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:16px;border-bottom:1px solid var(--glass-border);">
            <h3 style="margin:0;flex:1;min-width:120px;">All Shops</h3>
            <input type="text" class="form-input" id="plat-search" placeholder="Search shop…" style="max-width:200px;">
            <select class="form-select" id="plat-status" style="max-width:150px;">
              <option value="">All statuses</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="past_due">Past due</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div id="plat-shops" style="overflow-x:auto;">
            <div style="padding:40px;text-align:center;color:var(--text-muted);">
              <div class="loading-spinner" style="margin:0 auto 12px;"></div>Loading shops…
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initPlatform() {
  document.getElementById('plat-logout')?.addEventListener('click', () => Auth.logout());

  await loadStats();
  await loadShops();

  document.getElementById('plat-search')?.addEventListener('input', debounce(loadShops, 300));
  document.getElementById('plat-status')?.addEventListener('change', loadShops);

  window._managePlatformShop = manageShop;
}

async function loadStats() {
  const el = document.getElementById('plat-stats');
  try {
    const s = await DB.getPlatformStats();
    const cards = [
      { label: 'Total Shops', value: s.totalShops, sub: `+${s.newShops30d} in 30 days` },
      { label: 'Active Subscriptions', value: s.activeSubscriptions, sub: `${s.trials} on trial` },
      { label: 'MRR', value: formatCurrency(s.mrr), sub: 'Monthly recurring revenue' },
      { label: 'Trials Ending Soon', value: s.trialsEndingSoon, sub: 'next 3 days' },
    ];
    el.innerHTML = cards.map(c => `
      <div class="card" style="padding:18px;">
        <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:6px;">${c.label}</div>
        <div style="font-size:1.7rem;font-weight:800;font-family:'JetBrains Mono',monospace;">${c.value}</div>
        <div style="font-size:.72rem;color:var(--text-muted);margin-top:4px;">${c.sub}</div>
      </div>`).join('');
  } catch (err) {
    el.innerHTML = `<div class="card" style="padding:18px;color:var(--danger);">Failed to load stats: ${err.message}</div>`;
  }
}

async function loadShops() {
  const wrap = document.getElementById('plat-shops');
  if (!wrap) return;
  const search = document.getElementById('plat-search')?.value || '';
  const status = document.getElementById('plat-status')?.value || '';
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  try {
    const shops = await DB.getPlatformShops(params.toString());
    if (!shops.length) {
      wrap.innerHTML = `
        <div style="padding:48px;text-align:center;color:var(--text-muted);">
          <div style="font-size:2.5rem;margin-bottom:8px;">🏪</div>
          <h3 style="margin-bottom:6px;">No shops yet</h3>
          <p style="font-size:.85rem;">Shops appear here once multi-shop registration (Stage 2) is live, or once businesses sign up.</p>
        </div>`;
      return;
    }
    wrap.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
        <thead>
          <tr style="text-align:left;color:var(--text-muted);font-size:.75rem;text-transform:uppercase;">
            <th style="padding:12px 16px;">Shop</th>
            <th style="padding:12px 16px;">Plan</th>
            <th style="padding:12px 16px;">Status</th>
            <th style="padding:12px 16px;">Bills/mo</th>
            <th style="padding:12px 16px;">Last active</th>
            <th style="padding:12px 16px;"></th>
          </tr>
        </thead>
        <tbody>
          ${shops.map(s => `
            <tr style="border-top:1px solid var(--glass-border);">
              <td style="padding:12px 16px;font-weight:600;">${esc(s.name)}</td>
              <td style="padding:12px 16px;text-transform:capitalize;">${s.plan}</td>
              <td style="padding:12px 16px;"><span class="badge ${STATUS_BADGE[s.status] || 'badge-muted'}">${s.status}</span></td>
              <td style="padding:12px 16px;font-family:'JetBrains Mono',monospace;">${s.billsThisMonth}</td>
              <td style="padding:12px 16px;color:var(--text-muted);">${s.lastActiveAt ? timeAgo(s.lastActiveAt) : '—'}</td>
              <td style="padding:12px 16px;text-align:right;">
                <button class="btn btn-secondary btn-sm" onclick="window._managePlatformShop('${s.id}','${esc(s.name)}')">⚙ Manage</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    wrap.innerHTML = `<div style="padding:32px;text-align:center;color:var(--danger);">Failed to load shops: ${err.message}</div>`;
  }
}

async function manageShop(id, name) {
  let detail = {};
  try { detail = await DB.getPlatformShop(id); } catch { /* ignore */ }
  const sub = detail.subscription || {};

  createModal({
    id: 'manage-shop',
    title: `⚙ ${name}`,
    body: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="form-group" style="margin:0;">
          <label class="form-label">Plan</label>
          <select class="form-select" id="ms-plan">
            ${['free','pro','enterprise'].map(p => `<option value="${p}" ${sub.plan===p?'selected':''}>${p[0].toUpperCase()+p.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">Status</label>
          <select class="form-select" id="ms-status">
            ${['trial','active','past_due','expired','suspended'].map(s => `<option value="${s}" ${sub.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">Extend by (days)</label>
          <input type="number" class="form-input" id="ms-extend" placeholder="e.g. 30" min="0">
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" onclick="window._closeModal('manage-shop')">Cancel</button>
      <button class="btn btn-primary" id="ms-save">Save</button>
    `
  });

  setTimeout(() => {
    document.getElementById('ms-save')?.addEventListener('click', async () => {
      const body = {
        plan: document.getElementById('ms-plan')?.value,
        status: document.getElementById('ms-status')?.value,
      };
      const ext = parseInt(document.getElementById('ms-extend')?.value);
      if (ext > 0) body.extendDays = ext;
      try {
        await DB.updateShopSubscription(id, body);
        toast.success('Subscription updated');
        closeModal('manage-shop');
        await loadStats();
        await loadShops();
      } catch (err) { toast.error(err.message); }
    });
  }, 100);
}

// ── helpers ──
function esc(s) { return String(s).replace(/'/g, "\\'").replace(/</g, '&lt;'); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
