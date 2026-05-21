// ===== Auth Module =====

const Auth = {
  SESSION_KEY: 'smartbill_session',

  async login(username, password) {
    try {
      const response = await fetch(`${window.API_BASE_URL || 'http://localhost:5000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      
      if (!response.ok) {
        return { ok: false, error: data.error || 'Invalid credentials' };
      }

      const session = { 
        username: data.user.username, 
        role: data.user.role, 
        token: data.token,
        loginAt: new Date().toISOString() 
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      return { ok: true, session };
    } catch (err) {
      return { ok: false, error: 'Cannot connect to server. Ensure server is running.' };
    }
  },

  async updateAccount(username, password) {
    try {
      const response = await fetch(`${window.API_BASE_URL || 'http://localhost:5000'}/api/auth/update`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      
      if (!response.ok) {
        return { ok: false, error: data.error || 'Failed to update credentials' };
      }

      const session = this.getSession();
      if (session) {
        session.username = data.user.username;
        session.token = data.token;
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      }
      return { ok: true, message: data.message };
    } catch (err) {
      return { ok: false, error: 'Cannot connect to server. Ensure server is running.' };
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

  getHeaders() {
    const session = this.getSession();
    const headers = { 'Content-Type': 'application/json' };
    if (session && session.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }
    return headers;
  }
};

export default Auth;
