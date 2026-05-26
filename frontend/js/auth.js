// ===== Auth Module =====

const Auth = {
  SESSION_KEY: 'smartbill_session',

  _base() {
    return window.API_BASE_URL || 'http://localhost:5000';
  },

  // ─── Fetch with timeout helper ─────────────────────────────────────────────
  async _fetch(url, options = {}, timeoutMs = 35000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('TIMEOUT');
      throw err;
    }
  },

  // ─── Login ─────────────────────────────────────────────────────────────────
  async login(username, password) {
    try {
      const response = await this._fetch(`${this._base()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok) return { ok: false, error: data.error || 'Invalid credentials' };

      const session = {
        username: data.user.username,
        role: data.user.role,
        token: data.token,
        loginAt: new Date().toISOString()
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      return { ok: true, session };
    } catch (err) {
      if (err.message === 'TIMEOUT') {
        return { ok: false, error: 'TIMEOUT' };
      }
      return { ok: false, error: 'Cannot connect to server. Please try again.' };
    }
  },

  // ─── Check if first-time setup is needed (no users yet) ───────────────────
  async checkSetupStatus() {
    try {
      const response = await fetch(`${this._base()}/api/auth/setup-status`);
      const data = await response.json();
      return { ok: true, setupRequired: data.setupRequired };
    } catch {
      return { ok: false, setupRequired: false };
    }
  },

  // ─── Register (first user auto-admin; subsequent require admin token) ──────
  async register({ username, password, role, securityQuestion, securityAnswer, shopName }) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      const session = this.getSession();
      if (session && session.token) headers['Authorization'] = `Bearer ${session.token}`;

      const response = await fetch(`${this._base()}/api/auth/register`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ username, password, role: role || 'employee', securityQuestion, securityAnswer, shopName })
      });
      const data = await response.json();
      if (!response.ok) return { ok: false, error: data.error || 'Registration failed' };
      return { ok: true, message: data.message, token: data.token, user: data.user };
    } catch {
      return { ok: false, error: 'Cannot connect to server. Please try again.' };
    }
  },

  // ─── Get security question for a username (no auth needed) ────────────────
  async getSecurityQuestion(username) {
    try {
      const response = await fetch(`${this._base()}/api/auth/get-security-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await response.json();
      if (!response.ok) return { ok: false, error: data.error || 'User not found' };
      return { ok: true, securityQuestion: data.securityQuestion };
    } catch {
      return { ok: false, error: 'Cannot connect to server. Please try again.' };
    }
  },

  // ─── Reset password via security answer ───────────────────────────────────
  async resetPassword({ username, securityAnswer, newPassword }) {
    try {
      const response = await fetch(`${this._base()}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, securityAnswer, newPassword })
      });
      const data = await response.json();
      if (!response.ok) return { ok: false, error: data.error || 'Reset failed' };
      return { ok: true, message: data.message };
    } catch {
      return { ok: false, error: 'Cannot connect to server. Please try again.' };
    }
  },

  // ─── Update current user credentials ──────────────────────────────────────
  async updateAccount(username, password) {
    try {
      const response = await fetch(`${this._base()}/api/auth/update`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok) return { ok: false, error: data.error || 'Failed to update credentials' };

      const session = this.getSession();
      if (session) {
        session.username = data.user.username;
        session.token = data.token;
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      }
      return { ok: true, message: data.message };
    } catch {
      return { ok: false, error: 'Cannot connect to server. Please try again.' };
    }
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    window.location.hash = '#login';
    window.location.reload();
  },

  getSession() {
    try { return JSON.parse(sessionStorage.getItem(this.SESSION_KEY)); }
    catch { return null; }
  },

  isLoggedIn() { return !!this.getSession(); },

  guard() {
    if (!this.isLoggedIn()) {
      window.location.hash = '#login';
      return false;
    }
    return true;
  },

  isAdmin() {
    const s = this.getSession();
    return s && s.role === 'admin';
  },

  isOwnerOrAbove() {
    const s = this.getSession();
    return s && (s.role === 'admin' || s.role === 'owner' || s.role === 'staff');
  },

  getRole() {
    return this.getSession()?.role || 'employee';
  },

  getHeaders() {
    const session = this.getSession();
    const headers = { 'Content-Type': 'application/json' };
    if (session && session.token) headers['Authorization'] = `Bearer ${session.token}`;
    return headers;
  }
};

export default Auth;
