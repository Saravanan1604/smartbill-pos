// ===== Settings Page =====
import DB from '../db.js';
import Auth from '../auth.js';
import { confirmDialog } from '../components/modal.js';
import toast from '../components/toast.js';
import { setLang } from '../utils/i18n.js';

// Platform support contact — change this to your real support WhatsApp number
// (international format, no +). This is the help line YOU give to shops.
const SUPPORT_WHATSAPP = '919999999999';

// Per-plan support level shown to the shop owner
function renderSupportSection() {
  const plan = window.planInfo?.plan || 'free';
  const tiers = {
    free:       { label: 'Standard', sla: 'Email support · within 48 hours', color: 'var(--text-muted)' },
    pro:        { label: 'Priority',  sla: 'WhatsApp + email · within 12 hours', color: 'var(--accent-cyan-light)' },
    enterprise: { label: 'Dedicated', sla: 'Priority WhatsApp & phone · within 2 hours', color: 'var(--accent-violet-light)' },
  };
  const t = tiers[plan] || tiers.free;
  const canChat = plan === 'pro' || plan === 'enterprise';
  const msg = encodeURIComponent(`Hi, I need support with SmartBill (${plan} plan).`);
  return `
    <div class="settings-section">
      <div class="settings-section-header">
        <div class="settings-section-icon" style="background:var(--success-glow);color:var(--success);">🎧</div>
        <div>
          <div class="settings-section-title">Support</div>
          <div class="settings-section-sub">Your plan: <b style="color:${t.color};text-transform:capitalize;">${plan}</b> · ${t.label} support</div>
        </div>
      </div>
      <div style="padding:4px 2px;">
        <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:12px;">⏱ ${t.sla}</p>
        ${canChat
          ? `<a class="btn btn-success" href="https://wa.me/${SUPPORT_WHATSAPP}?text=${msg}" target="_blank" rel="noopener">💬 Chat with Priority Support</a>`
          : `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
               <a class="btn btn-secondary" href="mailto:support@smartbill.app?subject=${msg}">✉️ Email Support</a>
               <button class="btn btn-primary" onclick="window.location.hash='#subscription'">⚡ Upgrade for Priority Support</button>
             </div>`}
      </div>
    </div>`;
}

export async function renderSettings() {
  const settings = await DB.getSettings();
  const products = await DB.getProducts();
  const sales = await DB.getSales();
  const customers = await DB.getCustomers();
  
  const currentLang = localStorage.getItem('smartbill_lang') || 'en';
  const currentTheme = localStorage.getItem('smartbill_theme') || 'dark';
  const session = Auth.getSession();
  const username = session ? session.username : 'admin';

  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>${window.t('settings_title')}</h1>
          <p>${window.t('settings_sub')}</p>
        </div>
      </div>

      <!-- Support (plan-based) -->
      ${renderSupportSection()}

      <!-- Shop Details -->
      <div class="settings-section">
        <div class="settings-section-header">
          <div class="settings-section-icon" style="background:var(--accent-violet-glow);color:var(--accent-violet-light);">🏪</div>
          <div>
            <div class="settings-section-title">${window.t('shop_info')}</div>
            <div class="settings-section-sub">${window.t('shop_info_sub')}</div>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">${window.t('shop_name')}</label>
              <input type="text" class="form-input" id="s-shopName" value="${settings.shopName || ''}" placeholder="Your Shop Name">
            </div>
            <div class="form-group">
              <label class="form-label">${window.t('shop_phone')}</label>
              <input type="tel" class="form-input" id="s-phone" value="${settings.phone || ''}" placeholder="9876543210">
            </div>
            <div class="form-group full-width">
              <label class="form-label">${window.t('shop_address')}</label>
              <input type="text" class="form-input" id="s-address" value="${settings.address || ''}" placeholder="Shop address">
            </div>
            <div class="form-group">
              <label class="form-label">${window.t('gstin')}</label>
              <input type="text" class="form-input" id="s-gstin" value="${settings.gstin || ''}" placeholder="GST Identification Number">
            </div>
            <div class="form-group">
              <label class="form-label">${window.t('currency')}</label>
              <select class="form-select" id="s-currency">
                <option value="₹" ${settings.currency === '₹' ? 'selected' : ''}>₹ Indian Rupee (INR)</option>
                <option value="$" ${settings.currency === '$' ? 'selected' : ''}>$ US Dollar (USD)</option>
                <option value="€" ${settings.currency === '€' ? 'selected' : ''}>€ Euro (EUR)</option>
                <option value="£" ${settings.currency === '£' ? 'selected' : ''}>£ British Pound (GBP)</option>
              </select>
            </div>
          </div>
          <div style="margin-top:16px;">
            <button class="btn btn-primary" id="save-shop-btn">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              ${window.t('save_shop')}
            </button>
          </div>
        </div>
      </div>

      <!-- GST Settings -->
      <div class="settings-section">
        <div class="settings-section-header">
          <div class="settings-section-icon" style="background:var(--accent-cyan-glow);color:var(--accent-cyan-light);">🧾</div>
          <div>
            <div class="settings-section-title">${window.t('tax_settings')}</div>
            <div class="settings-section-sub">${window.t('tax_sub')}</div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">${window.t('enable_gst')}</div>
            <div class="settings-row-sub">${window.t('enable_gst_sub')}</div>
          </div>
          <label class="toggle-wrap">
            <label class="toggle">
              <input type="checkbox" id="s-gstEnabled" ${settings.gstEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </label>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">${window.t('default_gst')}</div>
            <div class="settings-row-sub">${window.t('default_gst_sub')}</div>
          </div>
          <select class="form-select" id="s-gstRate" style="width:120px;">
            ${[0, 5, 12, 18, 28].map(r => `<option value="${r}" ${settings.gstRate === r ? 'selected' : ''}>${r}%</option>`).join('')}
          </select>
        </div>
        <div class="card-body">
          <button class="btn btn-primary" id="save-tax-btn">${window.t('save_tax')}</button>
        </div>
      </div>

      <!-- Invoice Customization -->
      <div class="settings-section">
        <div class="settings-section-header">
          <div class="settings-section-icon" style="background:var(--accent-amber-glow);color:var(--accent-amber);">🧾</div>
          <div>
            <div class="settings-section-title">Invoice Customization</div>
            <div class="settings-section-sub">Logo, signature, terms &amp; round-off shown on your bills</div>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Shop Logo</label>
              <div style="display:flex;align-items:center;gap:12px;">
                <img id="s-logo-preview" src="${settings.logoUrl || ''}" style="width:56px;height:56px;border-radius:8px;object-fit:contain;background:var(--bg-base);border:1px solid var(--glass-border);${settings.logoUrl ? '' : 'display:none;'}">
                <input type="file" id="s-logo-input" accept="image/*" style="display:none;">
                <button type="button" class="btn btn-secondary btn-sm" id="s-logo-btn">Upload Logo</button>
                ${settings.logoUrl ? `<button type="button" class="btn btn-ghost btn-sm" id="s-logo-remove">Remove</button>` : ''}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Signature</label>
              <div style="display:flex;align-items:center;gap:12px;">
                <img id="s-sign-preview" src="${settings.signatureUrl || ''}" style="height:48px;border-radius:6px;object-fit:contain;background:var(--bg-base);border:1px solid var(--glass-border);${settings.signatureUrl ? '' : 'display:none;'}">
                <input type="file" id="s-sign-input" accept="image/*" style="display:none;">
                <button type="button" class="btn btn-secondary btn-sm" id="s-sign-btn">Upload Signature</button>
                ${settings.signatureUrl ? `<button type="button" class="btn btn-ghost btn-sm" id="s-sign-remove">Remove</button>` : ''}
              </div>
            </div>
            <div class="form-group full-width">
              <label class="form-label">Terms &amp; Conditions</label>
              <textarea class="form-input form-textarea" id="s-terms" rows="2" placeholder="e.g. Goods once sold will not be taken back.">${settings.invoiceTerms || ''}</textarea>
            </div>
            <div class="form-group full-width">
              <label class="form-label">Invoice Notes</label>
              <textarea class="form-input form-textarea" id="s-notes" rows="2" placeholder="e.g. Thank you for your business!">${settings.invoiceNotes || ''}</textarea>
            </div>
          </div>
          <div class="settings-row" style="padding-left:0;padding-right:0;">
            <div class="settings-row-info">
              <div class="settings-row-label">Round off total</div>
              <div class="settings-row-sub">Round the grand total to the nearest rupee</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="s-roundoff" ${settings.enableRoundOff ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <button class="btn btn-primary" id="save-invoice-btn" style="margin-top:8px;">Save Invoice Settings</button>
        </div>
      </div>

      <!-- Account Settings -->
      <div class="settings-section">
        <div class="settings-section-header">
          <div class="settings-section-icon" style="background:var(--success-glow);color:var(--success);">🔐</div>
          <div>
            <div class="settings-section-title">${window.t('account_sec')}</div>
            <div class="settings-section-sub">${window.t('account_sub')}</div>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">${window.t('admin_user')}</label>
              <input type="text" class="form-input" id="s-adminUser" value="${username}" placeholder="admin">
            </div>
            <div class="form-group">
              <label class="form-label">${window.t('new_pass')}</label>
              <input type="password" class="form-input" id="s-adminPass" placeholder="${window.t('pass_placeholder')}">
            </div>
          </div>
          <div style="margin-top:16px;">
            <button class="btn btn-primary" id="save-account-btn">${window.t('update_account')}</button>
          </div>
        </div>
      </div>

      <!-- Manage Staff Accounts (admin only) -->
      ${session && session.role === 'admin' ? `
      <div class="settings-section" id="staff-accounts-section">
        <div class="settings-section-header">
          <div class="settings-section-icon" style="background:rgba(6,182,212,.15);color:var(--info);">👥</div>
          <div>
            <div class="settings-section-title">Manage User Accounts</div>
            <div class="settings-section-sub">Create Owner (Level 2) and Employee (Level 3) accounts</div>
          </div>
        </div>

        <!-- Existing Users List -->
        <div id="users-list-wrap" style="padding:0 24px 16px;">
          <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Current Accounts</div>
          <div id="users-list"><div style="color:var(--text-muted);font-size:.85rem;padding:8px 0;">Loading users…</div></div>
        </div>
        <div class="divider" style="margin:0;"></div>

        <!-- Create New Account Form -->
        <div class="card-body">
          <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px;">Create New Account</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" class="form-input" id="staff-username" placeholder="Enter username" autocomplete="off">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" class="form-input" id="staff-password" placeholder="Min. 4 characters" autocomplete="new-password">
            </div>
            <div class="form-group">
              <label class="form-label">Access Level</label>
              <select class="form-select" id="staff-role">
                <option value="owner">🏪 Level 2 — Owner (Stock + Reports + Billing)</option>
                <option value="employee">👤 Level 3 — Employee (Billing + Customers only)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Security Question</label>
              <select class="form-select" id="staff-sq">
                <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                <option value="What city were you born in?">What city were you born in?</option>
                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                <option value="What was the name of your elementary school?">What was the name of your elementary school?</option>
                <option value="What is the name of the street you grew up on?">What is the name of the street you grew up on?</option>
                <option value="What was your childhood nickname?">What was your childhood nickname?</option>
                <option value="What is the name of your favourite childhood friend?">What is the name of your favourite childhood friend?</option>
              </select>
            </div>
            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">Security Answer <span style="color:var(--text-muted);font-size:.75rem;">(for password self-reset)</span></label>
              <input type="text" class="form-input" id="staff-sa" placeholder="e.g. Tommy, Chennai, Flower Street…" autocomplete="off">
            </div>
          </div>
          <div style="margin-top:16px;">
            <button class="btn btn-primary" id="create-staff-btn">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
              Create Account
            </button>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Theme & Language Preferences -->
      <div class="settings-section">
        <div class="settings-section-header">
          <div class="settings-section-icon" style="background:var(--accent-amber-glow);color:var(--accent-amber);">⚙️</div>
          <div>
            <div class="settings-section-title">Preferences / விருப்பங்கள்</div>
            <div class="settings-section-sub">Customize app language and visual appearance theme</div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">App Language / மொழி</div>
            <div class="settings-row-sub">Change language for the application interface</div>
          </div>
          <select class="form-select" id="pref-lang" style="width:150px;">
            <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English 🇬🇧</option>
            <option value="ta" ${currentLang === 'ta' ? 'selected' : ''}>தமிழ் 🇮🇳</option>
          </select>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Visual Theme / தீம்</div>
            <div class="settings-row-sub">Select light or dark mode theme colors</div>
          </div>
          <select class="form-select" id="pref-theme" style="width:150px;">
            <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark Theme 🌙</option>
            <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light Theme ☀️</option>
          </select>
        </div>
        <div class="card-body">
          <button class="btn btn-primary" id="save-pref-btn">${window.t('save')} Preferences</button>
        </div>
      </div>

      <!-- Data Management -->
      <div class="settings-section">
        <div class="settings-section-header">
          <div class="settings-section-icon" style="background:var(--accent-amber-glow);color:var(--accent-amber);">💾</div>
          <div>
            <div class="settings-section-title">${window.t('data_mgmt')}</div>
            <div class="settings-section-sub">${window.t('data_sub')}</div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">${window.t('export_data')}</div>
            <div class="settings-row-sub">${window.t('export_data_sub')}</div>
          </div>
          <button class="btn btn-secondary" id="export-data-btn">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            ${window.t('export')}
          </button>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">${window.t('import_data')}</div>
            <div class="settings-row-sub">${window.t('import_data_sub')}</div>
          </div>
          <label class="btn btn-secondary" style="cursor:pointer;">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12"/></svg>
            ${window.t('import')}
            <input type="file" id="import-file" accept=".json" style="display:none;">
          </label>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label" style="color:var(--danger);">${window.t('clear_data')}</div>
            <div class="settings-row-sub">${window.t('clear_data_sub')}</div>
          </div>
          <button class="btn btn-danger" id="clear-data-btn">${window.t('delete')}</button>
        </div>
      </div>

      <!-- App Info -->
      <div class="settings-section">
        <div class="settings-section-header">
          <div class="settings-section-icon" style="background:var(--glass-bg);">ℹ️</div>
          <div>
            <div class="settings-section-title">${window.t('about')}</div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">${window.t('version')}</div>
          </div>
          <span class="badge badge-violet">v1.0.0</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">${window.t('total_products_stat')}</div>
          </div>
          <span class="badge badge-muted">${products.length}</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">${window.t('total_sales')}</div>
          </div>
          <span class="badge badge-muted">${sales.length}</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">${window.t('total_cust')}</div>
          </div>
          <span class="badge badge-muted">${customers.length}</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label" style="color:var(--danger);">${window.t('sign_out')}</div>
            <div class="settings-row-sub">${window.t('sign_out_sub')}</div>
          </div>
          <button class="btn btn-danger" id="logout-btn">${window.t('sign_out')}</button>
        </div>
      </div>
    </div>
  `;
}

export function initSettings() {
  // Save Shop Details
  document.getElementById('save-shop-btn')?.addEventListener('click', async () => {
    const shopName = document.getElementById('s-shopName')?.value?.trim();
    if (!shopName) return toast.warning(window.t('shop_name_required'));
    
    try {
      await DB.saveSettings({
        shopName,
        phone: document.getElementById('s-phone')?.value?.trim() || '',
        address: document.getElementById('s-address')?.value?.trim() || '',
        gstin: document.getElementById('s-gstin')?.value?.trim() || '',
        currency: document.getElementById('s-currency')?.value || '₹',
      });
      window.shopSettings = await DB.getSettings();
      toast.success(window.t('shop_saved'));
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      toast.error('Error saving shop details: ' + err.message);
    }
  });

  // Save Tax
  document.getElementById('save-tax-btn')?.addEventListener('click', async () => {
    try {
      await DB.saveSettings({
        gstEnabled: document.getElementById('s-gstEnabled')?.checked || false,
        gstRate: parseInt(document.getElementById('s-gstRate')?.value || 18),
      });
      window.shopSettings = await DB.getSettings();
      toast.success(window.t('tax_saved'));
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      toast.error('Error saving tax settings: ' + err.message);
    }
  });

  // ── Invoice customization ──────────────────────────────────────────────────
  let _logoData = null, _signData = null;   // null = unchanged
  const readImage = (file, maxW) => new Promise((res) => {
    const r = new FileReader();
    r.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/png'));
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });

  document.getElementById('s-logo-btn')?.addEventListener('click', () => document.getElementById('s-logo-input').click());
  document.getElementById('s-logo-input')?.addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    _logoData = await readImage(e.target.files[0], 200);
    const pv = document.getElementById('s-logo-preview'); pv.src = _logoData; pv.style.display = '';
  });
  document.getElementById('s-logo-remove')?.addEventListener('click', () => { _logoData = ''; const pv = document.getElementById('s-logo-preview'); pv.src = ''; pv.style.display = 'none'; });

  document.getElementById('s-sign-btn')?.addEventListener('click', () => document.getElementById('s-sign-input').click());
  document.getElementById('s-sign-input')?.addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    _signData = await readImage(e.target.files[0], 400);
    const pv = document.getElementById('s-sign-preview'); pv.src = _signData; pv.style.display = '';
  });
  document.getElementById('s-sign-remove')?.addEventListener('click', () => { _signData = ''; const pv = document.getElementById('s-sign-preview'); pv.src = ''; pv.style.display = 'none'; });

  document.getElementById('save-invoice-btn')?.addEventListener('click', async () => {
    try {
      const payload = {
        invoiceTerms: document.getElementById('s-terms')?.value || '',
        invoiceNotes: document.getElementById('s-notes')?.value || '',
        enableRoundOff: document.getElementById('s-roundoff')?.checked || false,
      };
      if (_logoData !== null) payload.logoUrl = _logoData;
      if (_signData !== null) payload.signatureUrl = _signData;
      await DB.saveSettings(payload);
      window.shopSettings = await DB.getSettings();
      toast.success('Invoice settings saved!');
    } catch (err) {
      toast.error('Error saving invoice settings: ' + err.message);
    }
  });

  // Save Account
  document.getElementById('save-account-btn')?.addEventListener('click', async () => {
    const user = document.getElementById('s-adminUser')?.value?.trim();
    const pass = document.getElementById('s-adminPass')?.value;
    if (!user) return toast.warning(window.t('username_empty'));
    
    const btn = document.getElementById('save-account-btn');
    if (btn) btn.disabled = true;
    
    try {
      const result = await Auth.updateAccount(user, pass);
      if (result.ok) {
        toast.success(window.t('account_updated'));
        document.getElementById('s-adminPass').value = '';
        setTimeout(() => window.location.reload(), 500);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('Error updating account: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Load user list (admin only)
  const ROLE_META = {
    admin:    { label:'👑 Admin',    color:'#a78bfa', bg:'rgba(167,139,250,.12)' },
    owner:    { label:'🏪 Owner',    color:'#fbbf24', bg:'rgba(251,191,36,.12)'  },
    employee: { label:'👤 Employee', color:'#34d399', bg:'rgba(52,211,153,.12)'  },
    staff:    { label:'👤 Staff',    color:'#60a5fa', bg:'rgba(96,165,250,.12)'  },
  };

  async function loadUsersList() {
    const wrap = document.getElementById('users-list');
    if (!wrap) return;
    try {
      const users = await DB.getUsers();
      wrap.innerHTML = users.map(u => {
        const meta = ROLE_META[u.role] || ROLE_META.employee;
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);">
            <div style="width:34px;height:34px;border-radius:50%;background:${meta.bg};display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:800;color:${meta.color};flex-shrink:0;">
              ${u.username.slice(0,2).toUpperCase()}
            </div>
            <div style="flex:1;">
              <div style="font-size:.875rem;font-weight:600;color:var(--text-primary);">${u.username}</div>
              <div style="font-size:.72rem;color:${meta.color};font-weight:600;">${meta.label}</div>
            </div>
            ${u.role !== 'admin' ? `
              <button onclick="deleteUser('${u._id || u.id}','${u.username}')"
                style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:var(--danger);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:.75rem;font-weight:600;">
                Delete
              </button>
            ` : '<span style="font-size:.72rem;color:var(--text-muted);">Protected</span>'}
          </div>`;
      }).join('') || '<div style="color:var(--text-muted);font-size:.85rem;padding:8px 0;">No accounts found.</div>';
    } catch {
      wrap.innerHTML = '<div style="color:var(--text-muted);font-size:.85rem;">Could not load users.</div>';
    }
  }

  loadUsersList();

  window.deleteUser = async (id, uname) => {
    const ok = await confirmDialog(`Delete account "${uname}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await DB.deleteUser(id);
      toast.success(`Account "${uname}" deleted`);
      loadUsersList();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Create Account (admin only)
  document.getElementById('create-staff-btn')?.addEventListener('click', async () => {
    const username         = document.getElementById('staff-username')?.value?.trim();
    const password         = document.getElementById('staff-password')?.value;
    const role             = document.getElementById('staff-role')?.value || 'employee';
    const securityQuestion = document.getElementById('staff-sq')?.value;
    const securityAnswer   = document.getElementById('staff-sa')?.value?.trim();

    if (!username || !password) return toast.warning('Please fill in username and password');
    if (password.length < 4)    return toast.warning('Password must be at least 4 characters');
    if (!securityAnswer)        return toast.warning('Please provide a security answer for account recovery');

    const btn = document.getElementById('create-staff-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

    const result = await Auth.register({ username, password, role, securityQuestion, securityAnswer });

    if (result.ok) {
      const roleLabel = role === 'owner' ? '🏪 Owner' : '👤 Employee';
      toast.success(`${roleLabel} account "${username}" created!`);
      document.getElementById('staff-username').value = '';
      document.getElementById('staff-password').value = '';
      document.getElementById('staff-sa').value = '';
      loadUsersList();  // Refresh the list
    } else {
      toast.error(result.error);
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg> Create Account`;
    }
  });

  // Save Preferences
  document.getElementById('save-pref-btn')?.addEventListener('click', () => {
    const lang = document.getElementById('pref-lang')?.value || 'en';
    const theme = document.getElementById('pref-theme')?.value || 'dark';

    localStorage.setItem('smartbill_theme', theme);
    document.documentElement.setAttribute('theme', theme);
    setLang(lang);

    toast.success('Preferences saved!');
    setTimeout(() => window.location.reload(), 500);
  });

  // Export Data
  document.getElementById('export-data-btn')?.addEventListener('click', async () => {
    try {
      const [products, sales, customers, settings] = await Promise.all([
        DB.getProducts(),
        DB.getSales(),
        DB.getCustomers(),
        DB.getSettings()
      ]);
      const data = {
        products,
        sales,
        customers,
        settings,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `smartbill-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success(window.t('data_exported'));
    } catch (err) {
      toast.error('Failed to export data: ' + err.message);
    }
  });

  // Import Data
  document.getElementById('import-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.products && !data.sales) throw new Error('Invalid backup file');
      
      const ok = await confirmDialog(window.t('merge_confirm'), window.t('import_title'));
      if (!ok) return;

      toast.info('Uploading backup and merging...');

      const response = await fetch(`${window.API_BASE_URL || 'http://localhost:5000'}/api/settings/import-data`, {
        method: 'POST',
        headers: Auth.getHeaders(),
        body: JSON.stringify(data)
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to import data');
      }

      toast.success(window.t('data_imported'));
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error((window.t('invalid_backup') || 'Invalid backup file: ') + err.message);
    }
    e.target.value = '';
  });

  // Clear Data
  document.getElementById('clear-data-btn')?.addEventListener('click', async () => {
    const ok = await confirmDialog(window.t('sign_out_confirm'), window.t('clear_data'));
    if (!ok) return;
    const ok2 = await confirmDialog(window.t('final_confirm'), window.t('final_title'));
    if (!ok2) return;
    
    try {
      const response = await fetch(`${window.API_BASE_URL || 'http://localhost:5000'}/api/settings/clear-data`, {
        method: 'POST',
        headers: Auth.getHeaders()
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to clear data');
      }

      toast.success(window.t('data_cleared'));
      setTimeout(() => {
        Auth.logout();
      }, 1500);
    } catch (err) {
      toast.error('Failed to clear database records: ' + err.message);
    }
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    Auth.logout();
  });
}
