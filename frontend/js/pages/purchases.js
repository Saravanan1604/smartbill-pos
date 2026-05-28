// ===== Purchases / Stock-In =====
import DB from '../db.js';
import toast from '../components/toast.js';
import { createModal, closeModal } from '../components/modal.js';
import { formatCurrency, formatDate } from '../utils/format.js';

let _rows = 1;

export async function renderPurchases() {
  const purchases = await DB.getPurchases().catch(() => []);
  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>📥 Purchases / Stock-In</h1>
          <p>Record supplier bills — stock increases automatically</p>
        </div>
        <button class="btn btn-primary" id="new-purchase-btn">+ New Purchase</button>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        <div id="purchase-list">${renderList(purchases)}</div>
      </div>
    </div>`;
}

function renderList(purchases) {
  if (!purchases.length) {
    return `<div style="padding:48px;text-align:center;color:var(--text-muted);">
      <div style="font-size:2.5rem;margin-bottom:8px;">📦</div>
      <h3 style="margin-bottom:6px;">No purchases yet</h3>
      <p style="font-size:.85rem;">Click "New Purchase" to record a supplier bill and add stock.</p>
    </div>`;
  }
  return `
    <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
      <thead><tr style="text-align:left;color:var(--text-muted);font-size:.72rem;text-transform:uppercase;">
        <th style="padding:12px 16px;">Supplier</th><th style="padding:12px 16px;">Invoice</th>
        <th style="padding:12px 16px;">Date</th><th style="padding:12px 16px;">Items</th><th style="padding:12px 16px;text-align:right;">Total</th>
      </tr></thead>
      <tbody>${purchases.map(p => `
        <tr style="border-top:1px solid var(--glass-border);">
          <td style="padding:11px 16px;font-weight:600;">${p.supplierName || '—'}</td>
          <td style="padding:11px 16px;color:var(--text-muted);">${p.invoiceNo || '—'}</td>
          <td style="padding:11px 16px;color:var(--text-muted);">${p.date ? formatDate(p.date) : ''}</td>
          <td style="padding:11px 16px;">${p.items.length}</td>
          <td style="padding:11px 16px;text-align:right;font-family:'JetBrains Mono',monospace;">${formatCurrency(p.total)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

const esc = (s) => String(s ?? '').replace(/"/g, '&quot;');
function itemRow(it = {}) {
  return `
    <tr>
      <td><input class="form-input pi-name" list="pi-products" placeholder="Product name" value="${esc(it.name)}" style="min-width:140px;"></td>
      <td><input class="form-input pi-qty" type="number" min="0" value="${it.qty ?? 1}" style="width:64px;"></td>
      <td><input class="form-input pi-cost" type="number" min="0" step="0.01" placeholder="Cost" value="${it.costPrice || ''}" style="width:80px;"></td>
      <td><input class="form-input pi-mrp" type="number" min="0" step="0.01" placeholder="MRP" value="${it.mrp || ''}" style="width:80px;"></td>
      <td><input class="form-input pi-gst" type="number" min="0" step="0.01" placeholder="GST%" value="${it.gst || ''}" style="width:64px;"></td>
      <td><input class="form-input pi-batch" placeholder="Batch" value="${esc(it.batch)}" style="width:80px;"></td>
      <td><input class="form-input pi-expiry" placeholder="MM/YY" value="${esc(it.expiry)}" style="width:80px;"></td>
      <td><button class="btn btn-ghost btn-icon-sm pi-del" title="Remove">✕</button></td>
    </tr>`;
}

// Parse text pasted from Gemini — accepts JSON array or CSV lines
// (name,qty,cost,mrp,gst,batch,expiry)
function parsePastedText(text) {
  text = (text || '').trim();
  if (!text) return [];
  const norm = (o) => ({
    name: (o.name || o.item || o.product || '').toString().trim(),
    qty: parseInt(o.qty ?? o.quantity) || 0,
    costPrice: parseFloat(o.costPrice ?? o.cost ?? o.rate) || 0,
    mrp: parseFloat(o.mrp ?? o.price) || 0,
    gst: parseFloat(o.gst ?? o.tax) || 0,
    batch: (o.batch || '').toString().trim(),
    expiry: (o.expiry || o.exp || '').toString().trim(),
  });
  // Try JSON first
  try {
    const j = JSON.parse(text);
    const arr = Array.isArray(j) ? j : (j.items || []);
    const out = arr.map(norm).filter(i => i.name);
    if (out.length) return out;
  } catch { /* not JSON */ }
  // CSV / line-based
  const items = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const p = t.split(/\s*[,\t|]\s*/);
    if (/^name$/i.test(p[0]) || (/name/i.test(p[0]) && /qty|quan/i.test(t))) continue; // header
    if (!p[0]) continue;
    items.push(norm({ name: p[0], qty: p[1], costPrice: p[2], mrp: p[3], gst: p[4], batch: p[5], expiry: p[6] }));
  }
  return items.filter(i => i.name);
}

// Resize + base64 an image file for upload
function readImage(file, maxW = 1600) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });
}

export async function initPurchases() {
  const products = await DB.getProducts().catch(() => []);

  async function refresh() {
    const list = document.getElementById('purchase-list');
    if (list) list.innerHTML = renderList(await DB.getPurchases().catch(() => []));
  }

  document.getElementById('new-purchase-btn')?.addEventListener('click', () => {
    _rows = 1;
    createModal({
      id: 'new-purchase',
      title: '📥 New Purchase',
      size: 'lg',
      body: `
        <datalist id="pi-products">${products.map(p => `<option value="${(p.name||'').replace(/"/g,'&quot;')}">`).join('')}</datalist>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Supplier Name</label><input class="form-input" id="pu-supplier" placeholder="e.g. Shanmugam Pharma"></div>
          <div class="form-group"><label class="form-label">Invoice No</label><input class="form-input" id="pu-invoice" placeholder="e.g. 1593"></div>
          <div class="form-group"><label class="form-label">Date</label><input class="form-input" id="pu-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div style="margin:10px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <input type="file" id="pu-photo" accept="image/*" capture="environment" style="display:none;">
          <button class="btn btn-success btn-sm" id="pu-scan">📷 Scan Bill with AI</button>
          <button class="btn btn-secondary btn-sm" id="pu-paste-toggle">📋 Paste from Gemini (free)</button>
          <span id="pu-scan-status" style="font-size:.78rem;color:var(--text-muted);"></span>
        </div>
        <div id="pu-paste-panel" style="display:none;background:var(--bg-elevated);border:1px solid var(--glass-border);border-radius:10px;padding:12px;margin-bottom:10px;">
          <p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:8px;">
            1️⃣ Open <a href="https://gemini.google.com" target="_blank" rel="noopener" style="color:var(--accent-violet-light);">gemini.google.com</a> → upload the bill photo →
            2️⃣ paste the prompt below → 3️⃣ copy Gemini's answer → 4️⃣ paste it here → <b>Fill Items</b>.
          </p>
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input class="form-input" id="pu-prompt" readonly value="Read this bill image. Output ONLY CSV, one product per line, columns: name,qty,cost,mrp,gst,batch,expiry. No header, no extra text." style="flex:1;font-size:.75rem;">
            <button class="btn btn-secondary btn-sm" id="pu-copy-prompt" type="button">Copy</button>
          </div>
          <textarea class="form-input form-textarea" id="pu-paste" rows="5" placeholder="Paste Gemini's CSV result here…"></textarea>
          <button class="btn btn-primary btn-sm" id="pu-parse" style="margin-top:8px;">Fill Items from Text</button>
        </div>
        <div style="overflow-x:auto;margin-top:4px;">
          <table style="width:100%;border-collapse:collapse;font-size:.8rem;">
            <thead><tr style="color:var(--text-muted);font-size:.7rem;text-align:left;">
              <th style="padding:4px;">Item</th><th style="padding:4px;">Qty</th><th style="padding:4px;">Cost</th><th style="padding:4px;">MRP</th><th style="padding:4px;">GST%</th><th style="padding:4px;">Batch</th><th style="padding:4px;">Expiry</th><th></th>
            </tr></thead>
            <tbody id="pi-body">${itemRow()}</tbody>
          </table>
        </div>
        <button class="btn btn-secondary btn-sm" id="pi-add" style="margin-top:8px;">+ Add Item</button>`,
      footer: `<button class="btn btn-secondary" onclick="window._closeModal('new-purchase')">Cancel</button>
               <button class="btn btn-primary" id="pu-save">Save &amp; Add Stock</button>`
    });

    setTimeout(() => {
      const body = document.getElementById('pi-body');
      document.getElementById('pi-add')?.addEventListener('click', () => { body.insertAdjacentHTML('beforeend', itemRow()); });
      body.addEventListener('click', (e) => { if (e.target.classList.contains('pi-del')) { if (body.rows.length > 1) e.target.closest('tr').remove(); } });

      // Paste-from-Gemini (no API key): user pastes CSV/JSON → fill rows
      document.getElementById('pu-paste-toggle')?.addEventListener('click', () => {
        const p = document.getElementById('pu-paste-panel');
        p.style.display = p.style.display === 'none' ? 'block' : 'none';
      });
      document.getElementById('pu-copy-prompt')?.addEventListener('click', () => {
        const inp = document.getElementById('pu-prompt'); inp.select(); navigator.clipboard?.writeText(inp.value); toast.success('Prompt copied');
      });
      document.getElementById('pu-parse')?.addEventListener('click', () => {
        const items = parsePastedText(document.getElementById('pu-paste')?.value || '');
        if (!items.length) { toast.warning('Could not read any items from the pasted text'); return; }
        body.innerHTML = items.map(it => itemRow(it)).join('');
        document.getElementById('pu-paste-panel').style.display = 'none';
        toast.success(`${items.length} item(s) filled — review before saving`);
      });

      // AI scan: photo → Gemini → fill item rows
      document.getElementById('pu-scan')?.addEventListener('click', () => document.getElementById('pu-photo').click());
      document.getElementById('pu-photo')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const status = document.getElementById('pu-scan-status');
        status.textContent = '⏳ Reading bill… (10–20s)';
        try {
          const image = await readImage(file);
          const { items } = await DB.scanPurchaseBill(image);
          if (!items || !items.length) { status.textContent = '⚠️ No items detected — enter manually.'; return; }
          body.innerHTML = items.map(it => itemRow(it)).join('');
          status.textContent = `✅ ${items.length} item(s) detected — please review before saving.`;
        } catch (err) {
          status.textContent = '';
          toast.error(err.message || 'Scan failed');
        }
        e.target.value = '';
      });

      document.getElementById('pu-save')?.addEventListener('click', async () => {
        const items = [...body.querySelectorAll('tr')].map(tr => ({
          name: tr.querySelector('.pi-name')?.value?.trim(),
          qty: parseInt(tr.querySelector('.pi-qty')?.value) || 0,
          costPrice: parseFloat(tr.querySelector('.pi-cost')?.value) || 0,
          mrp: parseFloat(tr.querySelector('.pi-mrp')?.value) || 0,
          gst: parseFloat(tr.querySelector('.pi-gst')?.value) || 0,
          batch: tr.querySelector('.pi-batch')?.value || '',
          expiry: tr.querySelector('.pi-expiry')?.value || '',
        })).filter(i => i.name && i.qty > 0);
        if (!items.length) { toast.warning('Add at least one item with a name and quantity'); return; }
        try {
          await DB.addPurchase({
            supplierName: document.getElementById('pu-supplier')?.value || '',
            invoiceNo: document.getElementById('pu-invoice')?.value || '',
            date: document.getElementById('pu-date')?.value,
            items,
          });
          toast.success(`Purchase saved — ${items.length} item(s) stocked in`);
          closeModal('new-purchase');
          refresh();
        } catch (err) { toast.error(err.message); }
      });
    }, 100);
  });
}
