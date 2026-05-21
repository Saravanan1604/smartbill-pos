// ===== Login Page =====
import Auth from '../auth.js';
import DB from '../db.js';
import toast from '../components/toast.js';

export async function renderLogin() {
  let settings;
  try {
    settings = await DB.getSettings();
  } catch (err) {
    settings = { shopName: 'SmartBill Store' };
  }
  return `
    <div class="login-page">
      <div class="login-bg-orb1"></div>
      <div class="login-bg-orb2"></div>
      <div class="login-container animate-scale">
        <div class="login-left">
          <div class="login-logo">
            <div class="login-logo-icon">SB</div>
            <span class="login-logo-name">SmartBill</span>
          </div>
          <h1 class="login-title">Welcome back 👋</h1>
          <p class="login-sub">Sign in to your POS dashboard</p>
          <form class="login-form" id="login-form" onsubmit="return false;">
            <div class="form-group">
              <label class="form-label">Username</label>
              <div class="input-icon-wrap">
                <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                <input id="login-user" type="text" class="form-input" placeholder="Enter username" value="admin" autocomplete="username">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <div class="input-icon-wrap">
                <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                <input id="login-pass" type="password" class="form-input" placeholder="Enter password" value="admin123" autocomplete="current-password">
              </div>
            </div>
            <div class="login-form-actions">
              <button type="submit" class="btn btn-primary btn-lg" id="login-btn" style="width:100%;">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                Sign In
              </button>
            </div>
          </form>
          <div class="login-demo" style="margin-top:20px;">
            <strong style="color:var(--text-secondary);">Demo Credentials</strong><br>
            Admin: <span>admin</span> / <span>admin123</span><br>
            Staff: <span>staff</span> / <span>staff123</span>
          </div>
        </div>
        <div class="login-right">
          <div style="text-align:center;margin-bottom:8px;">
            <div style="font-size:3rem;animation:float 3s ease-in-out infinite;">🏪</div>
          </div>
          <div class="login-right-title">${settings.shopName}</div>
          <div class="login-right-sub">Smart POS & Inventory Management</div>
          <div style="display:flex;flex-direction:column;gap:8px;width:100%;margin-top:16px;">
            ${[
              ['📷','QR & Barcode Scanning'],
              ['🧾','Auto Invoice PDF'],
              ['📊','Sales Analytics'],
              ['📦','Inventory Tracking'],
              ['💳','GST & Tax Support'],
            ].map(([emoji, text]) => `
              <div class="login-feature">
                <div class="login-feature-icon">${emoji}</div>
                <span class="login-feature-text">${text}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initLogin() {
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('login-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
}

async function handleLogin() {
  const user = document.getElementById('login-user')?.value?.trim();
  const pass = document.getElementById('login-pass')?.value;
  if (!user || !pass) { toast.warning('Please enter username and password'); return; }
  const btn = document.getElementById('login-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
  
  const result = await Auth.login(user, pass);
  if (result.ok) {
    toast.success('Welcome back, ' + user + '!');
    setTimeout(() => window.location.hash = '#dashboard', 400);
  } else {
    toast.error(result.error);
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg> Sign In`; }
  }
}
