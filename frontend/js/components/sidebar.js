// ===== Sidebar Component =====
import Auth from '../auth.js';
import DB from '../db.js';

// ── Role access map ──────────────────────────────────────────────────────────
// Defines which page IDs each role can see in the sidebar
const ROLE_ACCESS = {
  admin:    new Set(['dashboard','billing','products','inventory','reports','customers','insights','gst','recover','settings','subscription']),
  owner:    new Set(['dashboard','billing','products','inventory','reports','customers','insights','gst','subscription']),
  employee: new Set(['dashboard','billing','customers']),
  staff:    new Set(['dashboard','billing','products','inventory','reports','customers']), // legacy
};

// ── Role display info ─────────────────────────────────────────────────────────
const ROLE_META = {
  admin:    { label:'👑 Admin',    color:'#a78bfa' },
  owner:    { label:'🏪 Owner',    color:'#fbbf24' },
  employee: { label:'👤 Employee', color:'#34d399' },
  staff:    { label:'👤 Staff',    color:'#60a5fa' },
};

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', hash: '#dashboard', icon: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>` },
  { id: 'billing',   label: 'Billing / POS', hash: '#billing', icon: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`, highlight: true },
  { divider: 'Inventory' },
  { id: 'products',  label: 'Products', hash: '#products', icon: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>` },
  { id: 'inventory', label: 'Inventory', hash: '#inventory', icon: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>`, badgeKey: 'lowStock' },
  { divider: 'Business' },
  { id: 'reports',   label: 'Reports', hash: '#reports', icon: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>` },
  { id: 'insights', label: 'AI Insights', hash: '#insights', icon: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>` },
  { id: 'customers', label: 'Customers', hash: '#customers', icon: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>` },
  { id: 'gst', label: 'GST Rate Finder', hash: '#gst', icon: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m-6 4h6m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>` },
  { id: 'subscription', label: 'Billing & Plan', hash: '#subscription', icon: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>` },
  { divider: 'System' },
  { id: 'recover', label: 'Recover Invoices', hash: '#recover', icon: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14.9-2M4 16a8 8 0 0014.9 2"/></svg>` },
  { id: 'settings',  label: 'Settings', hash: '#settings', icon: `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>` },
];

export function renderSidebar(activeId) {
  const session  = Auth.getSession();
  const settings = window.shopSettings || { shopName: 'SmartBill Store', currency: '₹' };
  const stats    = window.dashboardStats || { lowStock: [], outOfStock: [] };
  const lowStockCount = (stats.lowStock?.length || 0) + (stats.outOfStock?.length || 0);

  const role    = session?.role || 'employee';
  const access  = ROLE_ACCESS[role] || ROLE_ACCESS.employee;
  const roleMeta = ROLE_META[role] || ROLE_META.employee;

  let lastDividerWasShown = false;
  let pendingDivider = null;

  const navHTML = NAV_ITEMS.map(item => {
    if (item.divider) {
      pendingDivider = item.divider;
      return '';  // render lazily, only if a visible item follows
    }
    // Check access
    if (!access.has(item.id)) return '';

    // Render any pending divider first
    let out = '';
    if (pendingDivider) {
      const sectionLabel = window.t(`nav_section_${pendingDivider.toLowerCase()}`) || pendingDivider;
      out += `<div class="sidebar-section-label">${sectionLabel}</div>`;
      pendingDivider = null;
    }

    const badge = item.badgeKey === 'lowStock' && lowStockCount > 0
      ? `<span class="nav-badge">${lowStockCount}</span>` : '';
    const active = item.id === activeId ? 'active' : '';
    const label  = window.t(`nav_${item.id}`) || item.label;

    out += `
      <div class="nav-item ${active}" data-hash="${item.hash}" onclick="window.location.hash='${item.hash}'">
        <span class="nav-icon">${item.icon}</span>
        <span>${label}</span>
        ${badge}
      </div>
    `;
    return out;
  }).join('');

  const initials = (session?.username || 'A').slice(0, 2).toUpperCase();

  return `
    <aside class="sidebar" id="main-sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">SB</div>
        <div class="sidebar-logo-text">
          <span class="sidebar-logo-name">SmartBill</span>
          <span class="sidebar-logo-tag">${settings.shopName || 'SmartBill Store'}</span>
        </div>
      </div>
      <div class="sidebar-section">${navHTML}</div>
      <div class="sidebar-footer">
        <div class="sidebar-user" onclick="${role === 'admin' ? "window.location.hash='#settings'" : 'void(0)'}">
          <div class="sidebar-avatar">${initials}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${session?.username || 'Admin'}</div>
            <div class="sidebar-user-role" style="color:${roleMeta.color};font-weight:600;">${roleMeta.label}</div>
          </div>
          ${role === 'admin' ? `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color:var(--text-muted)"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>` : ''}
        </div>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
  `;
}

export function initSidebarMobile() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    document.getElementById('main-sidebar')?.classList.add('open');
    document.getElementById('sidebar-overlay')?.classList.add('show');
  });
}

window.closeSidebar = () => {
  document.getElementById('main-sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
};

// Export access check for use by router
export { ROLE_ACCESS };
