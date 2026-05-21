// ===== Utility: Formatters =====
import DB from '../db.js';

export function formatCurrency(amount) {
  const s = window.shopSettings || { currency: '₹' };
  return s.currency + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(dateStr) {
  return formatDate(dateStr) + ' ' + formatTime(dateStr);
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function getDateRange(period) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (period === 'today') {
    return { start: today, end: today };
  }
  if (period === 'week') {
    const start = new Date(now - 6 * 86400000).toISOString().split('T')[0];
    return { start, end: today };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    return { start, end: today };
  }
  if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    return { start, end: today };
  }
  return { start: today, end: today };
}

export function calcPercChange(now, prev) {
  if (!prev) return { val: 0, dir: 'up' };
  const diff = ((now - prev) / prev) * 100;
  return { val: Math.abs(diff).toFixed(1), dir: diff >= 0 ? 'up' : 'down' };
}

export function truncate(str, n = 20) {
  return str && str.length > n ? str.slice(0, n) + '...' : str;
}

export function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
