// ===== Settings Page =====
import DB from '../db.js';
import Auth from '../auth.js';
import { confirmDialog } from '../components/modal.js';
import toast from '../components/toast.js';
import { setLang } from '../utils/i18n.js';

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
