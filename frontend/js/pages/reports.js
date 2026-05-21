// ===== Reports Page =====
import DB from '../db.js';
import { formatCurrency, formatDate, formatDateTime, getDateRange } from '../utils/format.js';
import { createLineChart, createBarChart } from '../utils/charts.js';
import toast from '../components/toast.js';

let activePeriod = 'today';

export async function renderReports() {
  const contentHtml = await renderReportContent('today');
  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Reports & Analytics</h1>
          <p>Track sales, revenue, and business performance</p>
        </div>
        <button class="btn btn-secondary" id="export-report-btn">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Export Report
        </button>
      </div>

      <!-- Period Tabs -->
      <div class="tabs mb-6" id="period-tabs">
        <button class="tab active" data-period="today">Today</button>
        <button class="tab" data-period="week">This Week</button>
        <button class="tab" data-period="month">This Month</button>
        <button class="tab" data-period="year">This Year</button>
      </div>

      <!-- Dynamic Content -->
      <div id="reports-content">
        ${contentHtml}
      </div>
    </div>
  `;
}

async function renderReportContent(period) {
  const { start, end } = getDateRange(period);
  const allSales = await DB.getSales();
  const sales = allSales.filter(s => {
    const sDate = s.date || (s.createdAt ? s.createdAt.split('T')[0] : '');
    return sDate >= start && sDate <= end;
  });
  const revenue = sales.reduce((s, x) => s + x.total, 0);
  const profit = sales.reduce((s, x) => s + (x.profit || 0), 0);
  const totalItems = sales.reduce((s, x) => s + x.items.reduce((a, b) => a + b.qty, 0), 0);
  const avgOrder = sales.length ? revenue / sales.length : 0;
  const payBreak = { Cash: 0, UPI: 0, Card: 0 };
  sales.forEach(s => { payBreak[s.paymentMethod] = (payBreak[s.paymentMethod] || 0) + s.total; });

  // Product breakdown
  const productMap = {};
  sales.forEach(s => s.items.forEach(item => {
    productMap[item.name] = (productMap[item.name] || { qty: 0, revenue: 0 });
    productMap[item.name].qty += item.qty;
    productMap[item.name].revenue += item.price * item.qty;
  }));
  const topProducts = Object.entries(productMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10);

  return `
    <!-- Summary Stats -->
    <div class="report-period-summary mb-6">
      <div class="report-stat">
        <div class="report-stat-value" style="background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${formatCurrency(revenue)}</div>
        <div class="report-stat-label">Total Revenue</div>
      </div>
      <div class="report-stat">
        <div class="report-stat-value" style="color:var(--success);">${formatCurrency(profit)}</div>
        <div class="report-stat-label">Net Profit</div>
      </div>
      <div class="report-stat">
        <div class="report-stat-value">${sales.length}</div>
        <div class="report-stat-label">Transactions</div>
      </div>
    </div>

    <div class="grid-3 mb-6">
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon-violet">🛒</div>
        <div class="kpi-value">${totalItems}</div>
        <div class="kpi-label">Items Sold</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon-cyan">💳</div>
        <div class="kpi-value">${formatCurrency(avgOrder)}</div>
        <div class="kpi-label">Avg Order Value</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon-green">📊</div>
        <div class="kpi-value">${revenue > 0 ? Math.round((profit / revenue) * 100) : 0}%</div>
        <div class="kpi-label">Profit Margin</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid-2 mb-6">
      <div class="chart-card">
        <div class="chart-card-header">
          <span class="chart-card-title">📈 Revenue Trend</span>
        </div>
        <div class="chart-body" style="height:250px;">
          <canvas id="report-trend-chart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <span class="chart-card-title">💳 Payment Breakdown</span>
        </div>
        <div class="chart-body" style="height:250px;">
          <canvas id="report-pay-chart"></canvas>
        </div>
      </div>
    </div>

    <!-- Top Products Table -->
    <div class="card mb-6">
      <div class="card-header">
        <span class="card-title">🏆 Top Selling Products</span>
        <span class="badge badge-violet">${period}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Product</th><th>Qty Sold</th><th>Revenue</th><th>Share</th></tr></thead>
          <tbody>
            ${topProducts.length === 0 ? `<tr><td colspan="5"><div class="empty-state"><p>No sales data for this period</p></div></td></tr>` :
              topProducts.map(([name, data], i) => `
                <tr>
                  <td style="color:${i < 3 ? 'var(--accent-amber)' : 'var(--text-muted)'};font-weight:700;">#${i + 1}</td>
                  <td class="td-primary">${name}</td>
                  <td class="td-mono">${data.qty}</td>
                  <td class="td-mono" style="color:var(--success);">${formatCurrency(data.revenue)}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div class="progress-bar" style="width:80px;">
                        <div class="progress-fill progress-violet" style="width:${revenue ? Math.round((data.revenue/revenue)*100) : 0}%"></div>
                      </div>
                      <span style="font-size:.75rem;color:var(--text-muted);">${revenue ? Math.round((data.revenue/revenue)*100) : 0}%</span>
                    </div>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">🧾 Transaction History</span>
        <span class="badge badge-muted">${sales.length} records</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Invoice</th><th>Date</th><th>Items</th><th>Payment</th><th>Total</th><th>Profit</th></tr></thead>
          <tbody>
            ${sales.length === 0 ? `<tr><td colspan="6"><div class="empty-state"><p>No transactions in this period</p></div></td></tr>` :
              [...sales].reverse().slice(0, 50).map(s => `
                <tr>
                  <td class="td-mono" style="color:var(--accent-violet-light);">${s.invoiceNo}</td>
                  <td style="font-size:.8rem;color:var(--text-muted);">${formatDateTime(s.createdAt)}</td>
                  <td>${s.items.length} items</td>
                  <td><span class="badge ${s.paymentMethod==='Cash'?'badge-green':s.paymentMethod==='UPI'?'badge-cyan':'badge-violet'}">${s.paymentMethod}</span></td>
                  <td class="td-mono" style="color:var(--text-primary);font-weight:700;">${formatCurrency(s.total)}</td>
                  <td class="td-mono" style="color:var(--success);">${formatCurrency(s.profit || 0)}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>

    <div id="chart-data" 
      data-period="${period}"
      data-start="${start}"
      data-end="${end}"
      data-cash="${payBreak.Cash || 0}"
      data-upi="${payBreak.UPI || 0}"
      data-card="${payBreak.Card || 0}"
      style="display:none;">
    </div>
  `;
}

export async function initReports() {
  document.getElementById('period-tabs')?.addEventListener('click', async e => {
    const tab = e.target.closest('[data-period]');
    if (!tab) return;
    activePeriod = tab.dataset.period;
    document.querySelectorAll('#period-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('reports-content').innerHTML = await renderReportContent(activePeriod);
    await initReportCharts();
  });

  document.getElementById('export-report-btn')?.addEventListener('click', async () => {
    const { start, end } = getDateRange(activePeriod);
    const allSales = await DB.getSales();
    const sales = allSales.filter(s => {
      const sDate = s.date || (s.createdAt ? s.createdAt.split('T')[0] : '');
      return sDate >= start && sDate <= end;
    });
    if (!sales.length) { toast.warning('No data to export'); return; }
    const csv = ['Invoice,Date,Items,Subtotal,Discount,Tax,Total,Profit,Payment',
      ...sales.map(s => `${s.invoiceNo},${formatDateTime(s.createdAt)},${s.items.length},${s.subtotal},${s.discount||0},${s.tax||0},${s.total},${s.profit||0},${s.paymentMethod}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `smartbill-report-${activePeriod}-${start}.csv`;
    a.click();
    toast.success('Report exported');
  });

  await initReportCharts();
}

async function initReportCharts() {
  const d = document.getElementById('chart-data');
  if (!d) return;
  const period = d.dataset.period;
  const { start, end } = getDateRange(period);

  // Build trend data
  const trendDays = [];
  const allSales = await DB.getSales();
  const sales = allSales.filter(s => {
    const sDate = s.date || (s.createdAt ? s.createdAt.split('T')[0] : '');
    return sDate >= start && sDate <= end;
  });

  if (period === 'today') {
    for (let h = 8; h <= 20; h++) {
      const label = h + ':00';
      const rev = sales.filter(s => new Date(s.createdAt).getHours() === h).reduce((a, b) => a + b.total, 0);
      trendDays.push({ label, revenue: rev });
    }
  } else {
    const days = [];
    const startD = new Date(start);
    const endD = new Date(end);
    for (let d2 = new Date(startD); d2 <= endD; d2.setDate(d2.getDate() + 1)) {
      const dateStr = d2.toISOString().split('T')[0];
      const label = d2.toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
      const rev = allSales.filter(s => (s.date || (s.createdAt ? s.createdAt.split('T')[0] : '')) === dateStr).reduce((a, b) => a + b.total, 0);
      days.push({ label, revenue: rev });
    }
    // If too many, group by week for year view
    if (days.length > 60) {
      const weeks = [];
      for (let i = 0; i < days.length; i += 7) {
        const chunk = days.slice(i, i + 7);
        weeks.push({ label: chunk[0].label, revenue: chunk.reduce((a, b) => a + b.revenue, 0) });
      }
      trendDays.push(...weeks);
    } else {
      trendDays.push(...days);
    }
  }

  createLineChart('report-trend-chart',
    trendDays.map(d => d.label),
    [{ label: 'Revenue', data: trendDays.map(d => d.revenue) }],
    { currency: true }
  );

  // Payment breakdown doughnut → bar
  const cash = parseFloat(d.dataset.cash) || 0;
  const upi = parseFloat(d.dataset.upi) || 0;
  const card = parseFloat(d.dataset.card) || 0;
  if (cash + upi + card > 0) {
    createBarChart('report-pay-chart',
      ['Cash', 'UPI', 'Card'],
      [{ label: 'Revenue', data: [cash, upi, card] }],
      { currency: true }
    );
  }
}
