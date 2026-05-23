// ===== Login Page =====
import Auth from '../auth.js';
import DB from '../db.js';
import toast from '../components/toast.js';

const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'What city were you born in?',
  'What is your mother\'s maiden name?',
  'What was the name of your elementary school?',
  'What is the name of the street you grew up on?',
  'What was your childhood nickname?',
  'What is the name of your favourite childhood friend?',
];

// ─── Render ────────────────────────────────────────────────────────────────
export async function renderLogin() {
  let shopName = 'SmartBill Store';
  try {
    const s = await DB.getSettings();
    if (s && s.shopName) shopName = s.shopName;
  } catch { /* offline – use default */ }

  const qOpts = SECURITY_QUESTIONS.map(q =>
    `<option value="${q}">${q}</option>`
  ).join('');

  return `
    <div class="login-page">
      <div class="login-bg-orb1"></div>
      <div class="login-bg-orb2"></div>

      <div class="login-container animate-scale">

        <!-- ═══ LEFT PANEL ═══ -->
        <div class="login-left">

          <!-- Logo -->
          <div class="login-logo">
            <div class="login-logo-icon">SB</div>
            <span class="login-logo-name">SmartBill</span>
          </div>

          <!-- Tabs -->
          <div class="login-tabs" role="tablist">
            <button class="login-tab active" data-tab="signin"   role="tab" aria-selected="true">Sign In</button>
            <button class="login-tab"        data-tab="register" role="tab">Create Account</button>
            <button class="login-tab"        data-tab="forgot"   role="tab">Forgot Password</button>
          </div>

          <!-- ── Sign In View ── -->
          <div class="login-view active" id="view-signin">
            <h2 class="login-view-title">Welcome back 👋</h2>
            <p  class="login-view-sub">Sign in to your POS dashboard</p>
            <form id="signin-form" class="login-form" onsubmit="return false;">
              <div class="form-group">
                <label class="form-label">Username</label>
                <div class="input-icon-wrap">
                  <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  <input id="signin-user" type="text" class="form-input" placeholder="Enter username" autocomplete="username">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <div class="input-icon-wrap">
                  <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  <input id="signin-pass" type="password" class="form-input" placeholder="Enter password" autocomplete="current-password">
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-lg" id="signin-btn" style="width:100%;margin-top:4px;">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                Sign In
              </button>
            </form>
            <div id="server-status" style="text-align:center;font-size:.78rem;margin-top:12px;min-height:20px;"></div>
          </div>

          <!-- ── Create Account View ── -->
          <div class="login-view" id="view-register">
            <h2 class="login-view-title">Create Account ✨</h2>
            <p  class="login-view-sub" id="register-sub">Loading…</p>
            <div id="register-form-wrap">
              <!-- injected by initLogin() based on setup status -->
            </div>
          </div>

          <!-- ── Forgot Password View ── -->
          <div class="login-view" id="view-forgot">
            <h2 class="login-view-title">Reset Password 🔑</h2>
            <p  class="login-view-sub">Answer your security question to reset your password</p>

            <!-- Step 1: enter username -->
            <div id="forgot-step1">
              <div class="form-group">
                <label class="form-label">Username</label>
                <div class="input-icon-wrap">
                  <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  <input id="forgot-user" type="text" class="form-input" placeholder="Enter your username" autocomplete="username">
                </div>
              </div>
              <button class="btn btn-primary btn-lg" id="forgot-find-btn" style="width:100%;margin-top:4px;">
                Find My Account
              </button>
            </div>

            <!-- Step 2: answer + new password (hidden until step 1 succeeds) -->
            <div id="forgot-step2" style="display:none;">
              <div class="login-security-question-box" id="forgot-question-box">
                <!-- question text injected here -->
              </div>
              <div class="form-group">
                <label class="form-label">Security Answer</label>
                <div class="input-icon-wrap">
                  <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  <input id="forgot-answer" type="text" class="form-input" placeholder="Your answer (case-insensitive)" autocomplete="off">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">New Password</label>
                <div class="input-icon-wrap">
                  <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  <input id="forgot-newpass" type="password" class="form-input" placeholder="Min. 6 characters" autocomplete="new-password">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Confirm New Password</label>
                <div class="input-icon-wrap">
                  <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  <input id="forgot-confirmpass" type="password" class="form-input" placeholder="Repeat new password" autocomplete="new-password">
                </div>
              </div>
              <div style="display:flex;gap:10px;margin-top:4px;">
                <button class="btn btn-ghost" id="forgot-back-btn" style="flex:0 0 auto;">← Back</button>
                <button class="btn btn-primary btn-lg" id="forgot-reset-btn" style="flex:1;">Reset Password</button>
              </div>
            </div>
          </div>

        </div><!-- end login-left -->

        <!-- ═══ RIGHT PANEL ═══ -->
        <div class="login-right">
          <div style="text-align:center;margin-bottom:8px;">
            <div style="font-size:3rem;animation:float 3s ease-in-out infinite;">🏪</div>
          </div>
          <div class="login-right-title">${shopName}</div>
          <div class="login-right-sub">Smart POS &amp; Inventory Management</div>
          <div style="display:flex;flex-direction:column;gap:8px;width:100%;margin-top:16px;">
            ${[
              ['📷', 'QR &amp; Barcode Scanning'],
              ['🧾', 'Auto Invoice PDF'],
              ['📊', 'Sales Analytics'],
              ['📦', 'Inventory Tracking'],
              ['💳', 'GST &amp; Tax Support'],
            ].map(([emoji, text]) => `
              <div class="login-feature">
                <div class="login-feature-icon">${emoji}</div>
                <span class="login-feature-text">${text}</span>
              </div>
            `).join('')}
          </div>
        </div>

      </div><!-- end login-container -->
    </div>
  `;
}

// ─── Init ──────────────────────────────────────────────────────────────────
export async function initLogin() {
  // ── Ping backend + show connection status ─────────────────────────────────
  pingAndShowStatus();

  // ── Tab switching ──
  document.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // ── Sign In ──
  document.getElementById('signin-form')?.addEventListener('submit', handleSignIn);
  document.getElementById('signin-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSignIn();
  });

  // ── Create Account ── (load setup status, then build form)
  loadRegisterView();

  // ── Forgot – step 1 ──
  document.getElementById('forgot-find-btn')?.addEventListener('click', handleForgotStep1);
  document.getElementById('forgot-user')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleForgotStep1();
  });

  // ── Forgot – step 2 ──
  document.getElementById('forgot-back-btn')?.addEventListener('click', () => {
    document.getElementById('forgot-step1').style.display = '';
    document.getElementById('forgot-step2').style.display = 'none';
  });
  document.getElementById('forgot-reset-btn')?.addEventListener('click', handleForgotReset);
  document.getElementById('forgot-confirmpass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleForgotReset();
  });
}

// ─── Tab switching ─────────────────────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.login-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
    t.setAttribute('aria-selected', t.dataset.tab === tabId ? 'true' : 'false');
  });
  document.querySelectorAll('.login-view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${tabId}`);
  });
}

// ─── Connection status (shown below sign-in form) ─────────────────────────
async function pingAndShowStatus() {
  const base = window.API_BASE_URL || 'http://localhost:5000';
  const el = document.getElementById('server-status');
  if (!el) return;

  el.innerHTML = `<span style="color:var(--text-muted);">⏳ Connecting to server…</span>`;
  try {
    const t0 = Date.now();
    await Promise.race([
      fetch(`${base}/`, { method: 'GET', cache: 'no-store' }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 60000))
    ]);
    const ms = Date.now() - t0;
    el.innerHTML = `<span style="color:#10b981;">✅ Server online (${ms}ms)</span>`;
  } catch {
    el.innerHTML = `<span style="color:#f59e0b;">⏳ Server is starting up — please wait…</span>`;
    // retry every 10 s until connected
    setTimeout(pingAndShowStatus, 10000);
  }
}

// ─── Sign In ───────────────────────────────────────────────────────────────
async function handleSignIn() {
  const user = document.getElementById('signin-user')?.value?.trim();
  const pass = document.getElementById('signin-pass')?.value;
  if (!user || !pass) { toast.warning('Please enter username and password'); return; }

  const btn = document.getElementById('signin-btn');
  setLoading(btn, true, 'Signing in…');

  // Show wake-up hint after 5s
  const hintId = 'signin-wakeup-hint';
  document.getElementById(hintId)?.remove();
  const wakeTimer = setTimeout(() => {
    const hint = document.createElement('div');
    hint.id = hintId;
    hint.style.cssText = 'margin-top:10px;padding:10px 14px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:8px;font-size:.8rem;color:#fbbf24;text-align:center;line-height:1.5;';
    hint.innerHTML = '⏳ Server is waking up — this may take up to 60 seconds on first use. Please wait…';
    btn.insertAdjacentElement('afterend', hint);
  }, 5000);

  let result = await Auth.login(user, pass);

  // ── Auto-retry once on timeout ──
  if (result.error === 'TIMEOUT') {
    document.getElementById(hintId) && (document.getElementById(hintId).innerHTML =
      '⏳ Server is starting up — retrying automatically…');
    result = await Auth.login(user, pass);  // second attempt
  }

  clearTimeout(wakeTimer);
  document.getElementById(hintId)?.remove();

  if (result.ok) {
    toast.success(`Welcome back, ${user}! 🎉`);
    setTimeout(() => window.location.hash = '#dashboard', 400);
  } else if (result.error === 'TIMEOUT') {
    toast.warning('Server is still starting up. Please wait 10 more seconds and try again.');
    setLoading(btn, false, `🔄 Try Again`);
    pingAndShowStatus();  // update status indicator
  } else {
    toast.error(result.error);
    setLoading(btn, false, `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg> Sign In`);
  }
}

// ─── Load register view based on setup status ─────────────────────────────
async function loadRegisterView() {
  const sub  = document.getElementById('register-sub');
  const wrap = document.getElementById('register-form-wrap');
  if (!sub || !wrap) return;

  const { ok, setupRequired } = await Auth.checkSetupStatus();

  if (!ok) {
    sub.textContent = 'Could not connect to server.';
    wrap.innerHTML = `<p class="login-notice login-notice-error">Unable to reach the server. Please try again later.</p>`;
    return;
  }

  if (setupRequired) {
    // First-ever user — show full form
    sub.textContent = 'Set up your admin account to get started';
    wrap.innerHTML = buildRegisterForm(true);
    attachRegisterListeners();
  } else {
    // Users already exist — only admins can create accounts via the admin panel
    sub.textContent = '';
    wrap.innerHTML = `
      <div class="login-notice login-notice-info">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <div>
          <strong>Account creation is admin-only.</strong><br>
          Please ask your administrator to create an account for you from the Settings page.
        </div>
      </div>
    `;
  }
}

function buildRegisterForm(isFirstSetup) {
  const qOpts = SECURITY_QUESTIONS.map(q => `<option value="${q}">${q}</option>`).join('');
  return `
    <form id="register-form" class="login-form" onsubmit="return false;">
      <div class="form-group">
        <label class="form-label">Username</label>
        <div class="input-icon-wrap">
          <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          <input id="reg-user" type="text" class="form-input" placeholder="Choose a username" autocomplete="username">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <div class="input-icon-wrap">
          <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <input id="reg-pass" type="password" class="form-input" placeholder="Min. 6 characters" autocomplete="new-password">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Confirm Password</label>
        <div class="input-icon-wrap">
          <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <input id="reg-confirm" type="password" class="form-input" placeholder="Repeat password" autocomplete="new-password">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Security Question <span style="color:var(--text-muted);font-size:.75rem;">(for password recovery)</span></label>
        <select id="reg-sq" class="form-input form-select">
          ${qOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Security Answer</label>
        <div class="input-icon-wrap">
          <svg class="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          <input id="reg-sa" type="text" class="form-input" placeholder="Your answer (case-insensitive)" autocomplete="off">
        </div>
      </div>
      ${isFirstSetup ? `<p style="font-size:.75rem;color:var(--text-muted);margin:-4px 0 4px;">This will be your <strong style="color:var(--accent-violet-light);">admin</strong> account.</p>` : ''}
      <button type="submit" class="btn btn-primary btn-lg" id="reg-btn" style="width:100%;margin-top:4px;">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
        Create Admin Account
      </button>
    </form>
  `;
}

function attachRegisterListeners() {
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);
  document.getElementById('reg-sa')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
  });
}

// ─── Register handler ──────────────────────────────────────────────────────
async function handleRegister() {
  const username         = document.getElementById('reg-user')?.value?.trim();
  const password         = document.getElementById('reg-pass')?.value;
  const confirm          = document.getElementById('reg-confirm')?.value;
  const securityQuestion = document.getElementById('reg-sq')?.value;
  const securityAnswer   = document.getElementById('reg-sa')?.value?.trim();

  if (!username || !password || !confirm) {
    toast.warning('Please fill in all required fields'); return;
  }
  if (password.length < 6) {
    toast.warning('Password must be at least 6 characters'); return;
  }
  if (password !== confirm) {
    toast.error('Passwords do not match'); return;
  }
  if (!securityAnswer) {
    toast.warning('Please provide a security answer for account recovery'); return;
  }

  const btn = document.getElementById('reg-btn');
  setLoading(btn, true, 'Creating account…');

  const result = await Auth.register({ username, password, securityQuestion, securityAnswer });

  if (result.ok) {
    toast.success('Account created! Signing you in…');
    // Auto-login: store session and redirect
    const session = {
      username: result.user.username,
      role: result.user.role,
      token: result.token,
      loginAt: new Date().toISOString()
    };
    sessionStorage.setItem(Auth.SESSION_KEY, JSON.stringify(session));
    setTimeout(() => window.location.hash = '#dashboard', 600);
  } else {
    toast.error(result.error);
    setLoading(btn, false, `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg> Create Admin Account`);
  }
}

// ─── Forgot – Step 1 (find account) ───────────────────────────────────────
async function handleForgotStep1() {
  const username = document.getElementById('forgot-user')?.value?.trim();
  if (!username) { toast.warning('Please enter your username'); return; }

  const btn = document.getElementById('forgot-find-btn');
  setLoading(btn, true, 'Looking up account…');

  const result = await Auth.getSecurityQuestion(username);

  if (result.ok) {
    // Show step 2
    document.getElementById('forgot-question-box').innerHTML = `
      <div class="login-sq-label">Security Question</div>
      <div class="login-sq-text">${escHtml(result.securityQuestion)}</div>
    `;
    document.getElementById('forgot-step1').style.display = 'none';
    document.getElementById('forgot-step2').style.display = '';
    document.getElementById('forgot-answer')?.focus();
  } else {
    toast.error(result.error);
    setLoading(btn, false, 'Find My Account');
  }
}

// ─── Forgot – Step 2 (reset) ───────────────────────────────────────────────
async function handleForgotReset() {
  const username      = document.getElementById('forgot-user')?.value?.trim();
  const securityAnswer = document.getElementById('forgot-answer')?.value?.trim();
  const newPassword    = document.getElementById('forgot-newpass')?.value;
  const confirmPass    = document.getElementById('forgot-confirmpass')?.value;

  if (!securityAnswer) { toast.warning('Please enter your security answer'); return; }
  if (!newPassword || newPassword.length < 6) { toast.warning('New password must be at least 6 characters'); return; }
  if (newPassword !== confirmPass) { toast.error('Passwords do not match'); return; }

  const btn = document.getElementById('forgot-reset-btn');
  setLoading(btn, true, 'Resetting…');

  const result = await Auth.resetPassword({ username, securityAnswer, newPassword });

  if (result.ok) {
    toast.success('Password reset! Please sign in with your new password.');
    // Clear and go back to sign-in
    document.getElementById('forgot-user').value = '';
    document.getElementById('forgot-answer').value = '';
    document.getElementById('forgot-newpass').value = '';
    document.getElementById('forgot-confirmpass').value = '';
    document.getElementById('forgot-step1').style.display = '';
    document.getElementById('forgot-step2').style.display = 'none';
    setTimeout(() => switchTab('signin'), 800);
  } else {
    toast.error(result.error);
    setLoading(btn, false, 'Reset Password');
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function setLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled = loading;
  if (!loading) btn.innerHTML = label;
  else {
    btn.innerHTML = `<span class="btn-spinner"></span> ${label}`;
  }
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
