// ===== AI Insights Page (Pro+ feature) =====
import DB from '../db.js';
import { formatCurrency } from '../utils/format.js';

export async function renderInsights() {
  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>🧠 AI Insights</h1>
          <p>Smart predictions for your shop</p>
        </div>
      </div>
      <div id="insights-content">
        <div style="display:flex;justify-content:center;padding:48px;"><div class="loading-spinner"></div></div>
      </div>
    </div>`;
}

export async function initInsights() {
  const wrap = document.getElementById('insights-content');
  let data;
  try { data = await DB.getInsights(); }
  catch (err) { wrap.innerHTML = `<div class="card" style="padding:24px;color:var(--danger);">Failed to load: ${err.message}</div>`; return; }

  if (data.locked) {
    wrap.innerHTML = `
      <div class="card" style="padding:40px;text-align:center;">
        <div style="font-size:3rem;margin-bottom:12px;">🔒</div>
        <h2 style="margin-bottom:8px;">AI Insights is a Pro feature</h2>
        <p style="color:var(--text-secondary);margin-bottom:20px;">Upgrade to unlock sales forecasts, dead-stock alerts, smart reorder, peak hours and your business health score.</p>
        <button class="btn btn-primary" onclick="window.location.hash='#subscription'">View Plans →</button>
      </div>`;
    return;
  }

  const cur = (v) => formatCurrency(v);
  const scoreColor = data.healthScore >= 75 ? 'var(--success)' : data.healthScore >= 50 ? 'var(--warning)' : 'var(--danger)';
  const maxHour = Math.max(1, ...data.hours);
  const maxFc = Math.max(1, ...data.forecast);

  wrap.innerHTML = `
    <!-- Health score + forecast -->
    <div class="grid-auto" style="margin-bottom:20px;">
      <div class="card" style="padding:22px;text-align:center;">
        <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px;">Business Health</div>
        <div style="font-size:3rem;font-weight:900;color:${scoreColor};font-family:'JetBrains Mono',monospace;">${data.healthScore}</div>
        <div style="font-size:.75rem;color:var(--text-muted);">out of 100 · ${data.margin}% margin</div>
      </div>
      <div class="card" style="padding:22px;">
        <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:6px;">Next 7 Days Forecast ${data.trend==='up'?'📈':data.trend==='down'?'📉':'➡️'}</div>
        <div style="font-size:1.8rem;font-weight:800;font-family:'JetBrains Mono',monospace;">${cur(data.forecastTotal)}</div>
        <div style="display:flex;align-items:flex-end;gap:4px;height:50px;margin-top:10px;">
          ${data.forecast.map(v=>`<div title="${cur(v)}" style="flex:1;background:var(--gradient-brand);border-radius:3px 3px 0 0;height:${Math.round(v/maxFc*100)}%;min-height:3px;"></div>`).join('')}
        </div>
        <div style="font-size:.7rem;color:var(--text-muted);margin-top:4px;">~${cur(data.avgDailyRevenue)}/day average</div>
      </div>
      <div class="card" style="padding:22px;">
        <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:6px;">🕐 Peak Sales Hour</div>
        <div style="font-size:1.8rem;font-weight:800;">${data.peakHour}:00 – ${data.peakHour+1}:00</div>
        <div style="display:flex;align-items:flex-end;gap:1px;height:40px;margin-top:10px;">
          ${data.hours.map((c,h)=>`<div title="${h}:00 — ${c} bills" style="flex:1;background:${h===data.peakHour?'var(--accent-violet)':'var(--glass-border)'};height:${Math.round(c/maxHour*100)}%;min-height:2px;border-radius:2px;"></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="grid-auto">
      <!-- Reorder -->
      <div class="card" style="padding:20px;">
        <h3 style="margin-bottom:12px;">🔔 Smart Reorder</h3>
        ${data.reorder.length ? data.reorder.map(r=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--glass-border);">
            <div><div style="font-weight:600;font-size:.9rem;">${r.name}</div>
              <div style="font-size:.72rem;color:var(--text-muted);">${r.stock} left${r.daysLeft!=null?` · ~${r.daysLeft}d`:''}</div></div>
            <span class="badge badge-amber">Order ${r.suggested}</span>
          </div>`).join('') : '<p style="color:var(--text-muted);font-size:.85rem;">✅ Nothing needs reordering.</p>'}
      </div>
      <!-- Dead stock -->
      <div class="card" style="padding:20px;">
        <h3 style="margin-bottom:12px;">🪦 Dead Stock <span style="font-size:.7rem;color:var(--text-muted);">(no sale 30d)</span></h3>
        ${data.deadStock.length ? data.deadStock.map(d=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--glass-border);">
            <div><div style="font-weight:600;font-size:.9rem;">${d.name}</div>
              <div style="font-size:.72rem;color:var(--text-muted);">${d.stock} units idle</div></div>
            <span style="font-size:.85rem;font-family:'JetBrains Mono',monospace;color:var(--danger);">${cur(d.value)}</span>
          </div>`).join('') : '<p style="color:var(--text-muted);font-size:.85rem;">✅ No dead stock — everything is moving.</p>'}
      </div>
    </div>`;
}
