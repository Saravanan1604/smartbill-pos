// ===== Chart.js Wrappers =====
const CHART_DEFAULTS = {
  color: {
    violet: '#7c3aed',
    cyan: '#06b6d4',
    green: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
  },
  gradient: (ctx, color1, color2) => {
    const g = ctx.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, color1);
    g.addColorStop(1, color2);
    return g;
  }
};

const chartInstances = {};

export function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

export function createLineChart(canvasId, labels, datasets, opts = {}) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const styledDatasets = datasets.map((ds, i) => {
    const colors = ['rgba(124,58,237', 'rgba(6,182,212', 'rgba(16,185,129'];
    const c = colors[i % colors.length];
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, `${c},.3)`);
    gradient.addColorStop(1, `${c},0)`);
    return {
      ...ds,
      borderColor: `${c},1)`,
      backgroundColor: gradient,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: `${c},1)`,
      pointBorderColor: '#080810',
      pointBorderWidth: 2,
    };
  });

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: styledDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: datasets.length > 1, labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } },
        tooltip: {
          backgroundColor: '#16162a',
          borderColor: 'rgba(255,255,255,.08)',
          borderWidth: 1,
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          padding: 12,
          callbacks: {
            label: ctx => opts.currency ? '₹' + ctx.parsed.y.toLocaleString('en-IN') : ctx.parsed.y
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: { color: '#475569', font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: {
            color: '#475569', font: { family: 'Inter', size: 11 },
            callback: v => opts.currency ? '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) : v
          }
        }
      },
      ...opts.chartOpts
    }
  });
}

export function createBarChart(canvasId, labels, datasets, opts = {}) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const styledDatasets = datasets.map((ds, i) => {
    const gradients = [
      ['rgba(124,58,237,.8)', 'rgba(6,182,212,.6)'],
      ['rgba(16,185,129,.8)', 'rgba(6,182,212,.6)'],
      ['rgba(245,158,11,.8)', 'rgba(239,68,68,.6)']
    ];
    const [c1, c2] = gradients[i % gradients.length];
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(1, c2);
    return { ...ds, backgroundColor: gradient, borderRadius: 6, borderSkipped: false };
  });

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: styledDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#16162a',
          borderColor: 'rgba(255,255,255,.08)',
          borderWidth: 1,
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          padding: 12,
          callbacks: {
            label: ctx => opts.currency ? '₹' + ctx.parsed.y.toLocaleString('en-IN') : ctx.parsed.y + (opts.suffix || '')
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#475569', font: { family: 'Inter', size: 11 } } },
        y: {
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: { color: '#475569', font: { family: 'Inter', size: 11 },
            callback: v => opts.currency ? '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) : v
          }
        }
      },
      ...opts.chartOpts
    }
  });
}

export function createDoughnutChart(canvasId, labels, data, opts = {}) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const colors = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#0891b2','#059669'];

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.slice(0, data.length), borderColor: '#080810', borderWidth: 3, hoverOffset: 8 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 16, usePointStyle: true }
        },
        tooltip: {
          backgroundColor: '#16162a', borderColor: 'rgba(255,255,255,.08)', borderWidth: 1,
          titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 12,
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}${opts.suffix || ''}` }
        }
      }
    }
  });
}
