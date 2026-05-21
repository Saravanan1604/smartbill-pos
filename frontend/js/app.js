// ===== SmartBill App Router =====
import DB from './db.js';
import Auth from './auth.js';
import toast from './components/toast.js';
import './utils/i18n.js';
import { renderSidebar, initSidebarMobile } from './components/sidebar.js';

import { renderLogin,    initLogin    } from './pages/login.js';
import { renderDashboard, initDashboard } from './pages/dashboard.js';
import { renderBilling,  initBilling  } from './pages/billing.js';
import { renderProducts, initProducts } from './pages/products.js';
import { renderInventory, initInventory } from './pages/inventory.js';
import { renderReports,  initReports  } from './pages/reports.js';
import { renderCustomers, initCustomers } from './pages/customers.js';
import { renderSettings, initSettings } from './pages/settings.js';

// Base API configuration - change this URL for production deploy
window.API_BASE_URL = 'http://localhost:5000';

const ROUTES = {
  '#login':     { render: renderLogin,     init: initLogin,     title: 'Login',     public: true },
  '#dashboard': { render: renderDashboard,  init: initDashboard,  title: 'Dashboard' },
  '#billing':   { render: renderBilling,    init: initBilling,    title: 'Billing'   },
  '#products':  { render: renderProducts,   init: initProducts,   title: 'Products'  },
  '#inventory': { render: renderInventory,  init: initInventory,  title: 'Inventory' },
  '#reports':   { render: renderReports,    init: initReports,    title: 'Reports'   },
  '#customers': { render: renderCustomers,  init: initCustomers,  title: 'Customers' },
  '#settings':  { render: renderSettings,   init: initSettings,   title: 'Settings'  },
};

const PAGE_ID_MAP = {
  '#dashboard': 'dashboard',
  '#billing':   'billing',
  '#products':  'products',
  '#inventory': 'inventory',
  '#reports':   'reports',
  '#customers': 'customers',
  '#settings':  'settings',
};

async function navigate(hash) {
  const route = ROUTES[hash] || ROUTES['#dashboard'];
  const app = document.getElementById('app');
  if (!app) return;

  // Auth guard
  if (!route.public && !Auth.isLoggedIn()) {
    window.location.hash = '#login';
    return;
  }

  // Redirect logged-in users away from login
  if (hash === '#login' && Auth.isLoggedIn()) {
    window.location.hash = '#dashboard';
    return;
  }

  // Set translated page title in tab
  const pageId = PAGE_ID_MAP[hash] || 'dashboard';
  const pageTitle = window.t(`nav_${pageId}`) || route.title;
  document.title = `${pageTitle} — SmartBill POS`;

  if (route.public) {
    app.innerHTML = await route.render();
    await route.init?.();
    return;
  }

  const session = Auth.getSession();

  // Load settings and dashboard stats globally so formatters and subviews have synchronous access
  try {
    window.shopSettings = await DB.getSettings();
    window.dashboardStats = await DB.getDashboardStats();
  } catch (err) {
    window.shopSettings = window.shopSettings || { shopName: 'SmartBill Store', currency: '₹' };
    window.dashboardStats = window.dashboardStats || { lowStock: [], outOfStock: [] };
  }

  const currentLang = localStorage.getItem('smartbill_lang') || 'en';

  // Draw main shell layout with loading state in content area
  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar(pageId)}
      <div class="main-content">
        <div class="topbar">
          <div class="topbar-left">
            <button class="mobile-menu-btn" id="mobile-menu-btn">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div>
              <div class="topbar-title">${pageTitle}</div>
              <div class="topbar-subtitle">${new Date().toLocaleDateString(currentLang === 'ta' ? 'ta-IN' : 'en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
            </div>
          </div>
          <div class="topbar-right">
            <!-- Theme Toggle -->
            <button class="btn btn-ghost btn-icon" id="theme-toggle-btn" style="margin-right:4px;" data-tooltip="Theme / தீம்">
              <svg id="theme-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"></svg>
            </button>
            
            <!-- Language Switcher -->
            <button class="btn btn-ghost" id="lang-toggle-btn" style="padding:0 8px;font-size:0.8rem;font-weight:600;margin-right:4px;" data-tooltip="Language / மொழி">
              ${currentLang === 'en' ? 'தமிழ் 🇮🇳' : 'English 🇬🇧'}
            </button>

            <!-- Quick Billing -->
            <button class="btn btn-ghost btn-icon" style="margin-right:4px;" data-tooltip="${window.t('nav_billing')}" onclick="window.location.hash='#billing'">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </button>
            <div class="sidebar-avatar" style="cursor:pointer;width:34px;height:34px;font-size:.8rem;" onclick="window.location.hash='#settings'">
              ${(session?.username || 'A').slice(0,2).toUpperCase()}
            </div>
          </div>
        </div>
        <div id="page-content" class="animate-fade">
          <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:250px;gap:12px;">
            <div class="loading-spinner"></div>
            <p style="color:var(--text-muted);font-size:.875rem;">${window.t('loading') || 'Loading data from server...'}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  initSidebarMobile();

  // Attach Topbar Event Listeners
  const themeToggle = document.getElementById('theme-toggle-btn');
  if (themeToggle) {
    const themeIcon = document.getElementById('theme-icon');
    const curTheme = localStorage.getItem('smartbill_theme') || 'dark';
    if (themeIcon) {
      themeIcon.innerHTML = curTheme === 'dark' 
        ? `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>` // Sun
        : `<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>`; // Moon
    }

    themeToggle.addEventListener('click', () => {
      const current = localStorage.getItem('smartbill_theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('smartbill_theme', next);
      document.documentElement.setAttribute('theme', next);
      
      if (themeIcon) {
        themeIcon.innerHTML = next === 'dark' 
          ? `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>` // Sun
          : `<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>`; // Moon
      }
      toast.success(next === 'dark' ? 'Dark theme enabled' : 'Light theme enabled');
    });
  }

  const langToggle = document.getElementById('lang-toggle-btn');
  if (langToggle) {
    langToggle.addEventListener('click', async () => {
      const { getLang, setLang } = await import('./utils/i18n.js');
      const current = getLang();
      const next = current === 'en' ? 'ta' : 'en';
      setLang(next);
      toast.success(next === 'ta' ? 'தமிழ் மொழி மாற்றப்பட்டது!' : 'Language switched to English!');
      setTimeout(() => window.location.reload(), 800);
    });
  }

  try {
    // Render view and trigger lifecycle hooks asynchronously
    const viewHtml = await route.render();
    const contentArea = document.getElementById('page-content');
    if (contentArea) {
      contentArea.innerHTML = viewHtml;
    }
    await route.init?.();
  } catch (err) {
    console.error('Failed to load page content:', err);
    const contentArea = document.getElementById('page-content');
    if (contentArea) {
      contentArea.innerHTML = `
        <div class="card" style="margin:24px;border:1px solid var(--danger-glow);background:rgba(239,68,68,0.03);text-align:center;padding:40px;">
          <div style="font-size:2.5rem;margin-bottom:12px;">🔌</div>
          <h3 style="color:var(--danger);margin-bottom:8px;">Connection Failed</h3>
          <p style="color:var(--text-secondary);margin-bottom:16px;">Cannot connect to the SmartBill API Server at ${window.API_BASE_URL}.</p>
          <button class="btn btn-primary" onclick="window.location.reload()">Retry Connection</button>
        </div>
      `;
    }
  }
}

async function init() {
  // Remove static loading screen
  document.getElementById('loading-screen')?.remove();

  // Initial theme check
  const curTheme = localStorage.getItem('smartbill_theme') || 'dark';
  document.documentElement.setAttribute('theme', curTheme);

  // Initial route
  const hash = window.location.hash || (Auth.isLoggedIn() ? '#dashboard' : '#login');
  window.location.hash = hash;
  await navigate(hash);

  // Hash change listener
  window.addEventListener('hashchange', async () => await navigate(window.location.hash));
}

export { init };
