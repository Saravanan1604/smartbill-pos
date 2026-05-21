// ===== Dashboard Page =====
import DB from '../db.js';
import { formatCurrency, formatDate, formatDateTime, calcPercChange } from '../utils/format.js';
import { createLineChart, createBarChart } from '../utils/charts.js';

export async function renderDashboard() {
  const stats = await DB.getDashboardStats();
  const settings = await DB.getSettings();
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const change = calcPercChange(stats.todayRevenue, stats.yesterdayRevenue);
  const txnChange = calcPercChange(stats.todayTxns, stats.yesterdayTxns ?? 0);
  const profitChange = calcPercChange(stats.todayProfit, stats.yesterdayProfit ?? 0);

  const fmtChange = (c, currentVal, prevVal) => {
    if (!currentVal && !prevVal) return `<span style="color:var(--text-muted);font-size:.75rem;">— No data yet</span>`;
    if (!prevVal && currentVal) return `<span style="color:var(--success);font-size:.75rem;">✦ New today</span>`;
    return `${c.dir === 'up' ? '↑' : '↓'} ${c.val}% vs yesterday`;
  };

  const sales = await DB.getSales();
  const recentSales = sales.slice(-6).reverse();

  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <div class="dashboard-greeting">${greeting}, ${settings.shopName} 👋</div>
          <div class="dashboard-date">${now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
        </div>
        <div style="display:flex;gap:12px;align-items:center;">
          <button class="btn btn-primary" onclick="window.location.hash='#billing'">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            New Sale
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid-4 mb-6">
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-violet">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div class="kpi-value">${formatCurrency(stats.todayRevenue)}</div>
          <div class="kpi-label">Today's Revenue</div>
          <div class="kpi-change ${change.dir}">${fmtChange(change, stats.todayRevenue, stats.yesterdayRevenue)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-cyan">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <div class="kpi-value">${stats.todayTxns}</div>
          <div class="kpi-label">Today's Transactions</div>
          <div class="kpi-change ${txnChange.dir}">${fmtChange(txnChange, stats.todayTxns, stats.yesterdayTxns ?? 0)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-green">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
          </div>
          <div class="kpi-value">${formatCurrency(stats.todayProfit ?? stats.totalProfit)}</div>
          <div class="kpi-label">Today's Profit</div>
          <div class="kpi-change ${profitChange.dir}">${fmtChange(profitChange, stats.todayProfit, stats.yesterdayProfit ?? 0)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-amber">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div class="kpi-value">${stats.lowStock.length + stats.outOfStock.length}</div>
          <div class="kpi-label">Stock Alerts</div>
          <div class="kpi-change down">⚠ ${stats.outOfStock.length} out of stock</div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid-2 mb-6">
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">📈 Revenue (Last 7 Days)</span>
            <span class="badge badge-violet">Weekly</span>
          </div>
          <div class="chart-body" style="height:260px;">
            <canvas id="revenue-chart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">🏆 Top Products</span>
            <span class="badge badge-cyan">By Qty Sold</span>
          </div>
          <div class="chart-body" style="height:260px;">
            <canvas id="top-products-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Bottom Row -->
      <div class="grid-2">
        <!-- Recent Transactions -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">🧾 Recent Transactions</span>
            <button class="btn btn-ghost btn-sm" onclick="window.location.hash='#reports'">View All</button>
          </div>
          <div class="recent-list">
            ${recentSales.length === 0 ? `<div class="empty-state"><p>No transactions yet</p></div>` :
              recentSales.map(s => `
                <div class="recent-item">
                  <div class="recent-item-icon" style="background:${s.paymentMethod==='Cash'?'var(--success-glow)':s.paymentMethod==='UPI'?'var(--accent-cyan-glow)':'var(--accent-violet-glow)'};">
                    ${s.paymentMethod==='Cash'?'💵':s.paymentMethod==='UPI'?'📱':'💳'}
                  </div>
                  <div class="recent-item-info">
                    <div class="recent-item-name">${s.invoiceNo}</div>
                    <div class="recent-item-sub">${s.items.length} items · ${formatDateTime(s.createdAt)}</div>
                  </div>
                  <div class="recent-item-amount">${formatCurrency(s.total)}</div>
                </div>
              `).join('')
            }
          </div>
        </div>

        <!-- Low Stock Alerts -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">⚠️ Stock Alerts</span>
            <button class="btn btn-ghost btn-sm" onclick="window.location.hash='#inventory'">Manage</button>
          </div>
          <div class="recent-list">
            ${[...stats.outOfStock, ...stats.lowStock].length === 0
              ? `<div class="empty-state"><p style="color:var(--success)">✅ All stock levels OK!</p></div>`
              : [...stats.outOfStock.map(p => ({...p, _status:'out'})), ...stats.lowStock.map(p => ({...p, _status:'low'}))].slice(0,8).map(p => `
                <div class="alert-item">
                  <div class="alert-item-icon" style="background:${p._status==='out'?'var(--danger-glow)':'var(--accent-amber-glow)'};">
                    ${p._status==='out'?'🔴':'🟡'}
                  </div>
                  <div style="flex:1;">
                    <div style="font-size:.875rem;font-weight:600;color:var(--text-primary);">${p.name}</div>
                    <div style="font-size:.75rem;color:var(--text-muted);">Stock: ${p.stock} ${p._status==='out'?'— OUT OF STOCK':'— LOW STOCK'}</div>
                  </div>
                  <span class="badge ${p._status==='out'?'badge-red':'badge-amber'}">${p._status==='out'?'Out':'Low'}</span>
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initDashboard() {
  const days = await DB.getLast7DaysSales();
  createLineChart('revenue-chart', days.map(d => d.label), [{ label: 'Revenue', data: days.map(d => d.revenue) }], { currency: true });

  const top = await DB.getTopProducts(6);
  createBarChart('top-products-chart', top.map(t => t.name.split(' ').slice(0,2).join(' ')), [{ label: 'Qty Sold', data: top.map(t => t.qty) }], { suffix: ' units' });
}
