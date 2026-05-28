// ===== GST Rate Finder =====
// Offline searchable list of common HSN codes and their GST rates.
// (Reference rates — always confirm against the latest CBIC notification.)
const GST_DATA = [
  { hsn: '1006', name: 'Rice (branded/packed)', gst: 5 },
  { hsn: '1006', name: 'Rice (unbranded, loose)', gst: 0 },
  { hsn: '1101', name: 'Wheat flour / Atta (packed)', gst: 5 },
  { hsn: '0713', name: 'Pulses / Dal (packed)', gst: 5 },
  { hsn: '1701', name: 'Sugar', gst: 5 },
  { hsn: '0401', name: 'Milk (fresh, unprocessed)', gst: 0 },
  { hsn: '0405', name: 'Butter / Ghee', gst: 12 },
  { hsn: '0406', name: 'Cheese / Paneer (packed)', gst: 5 },
  { hsn: '1905', name: 'Bread', gst: 0 },
  { hsn: '1905', name: 'Biscuits', gst: 18 },
  { hsn: '1905', name: 'Rusk / Toast', gst: 5 },
  { hsn: '2106', name: 'Namkeen / Bhujia / Mixture', gst: 12 },
  { hsn: '2105', name: 'Ice Cream', gst: 18 },
  { hsn: '1704', name: 'Sugar confectionery / Toffee', gst: 18 },
  { hsn: '1806', name: 'Chocolate', gst: 18 },
  { hsn: '2009', name: 'Fruit juice (packed)', gst: 12 },
  { hsn: '2202', name: 'Aerated / soft drinks (cola)', gst: 28 },
  { hsn: '2201', name: 'Packaged drinking water (20L)', gst: 0 },
  { hsn: '2202', name: 'Mineral water (bottle)', gst: 18 },
  { hsn: '0902', name: 'Tea (packed)', gst: 5 },
  { hsn: '0901', name: 'Coffee (packed)', gst: 5 },
  { hsn: '1507', name: 'Edible oil (sunflower/groundnut)', gst: 5 },
  { hsn: '0910', name: 'Spices / Masala (packed)', gst: 5 },
  { hsn: '2501', name: 'Salt', gst: 0 },
  { hsn: '0701', name: 'Fresh vegetables', gst: 0 },
  { hsn: '0803', name: 'Fresh fruits', gst: 0 },
  { hsn: '3401', name: 'Soap (bathing/toilet)', gst: 18 },
  { hsn: '3305', name: 'Shampoo / Hair oil', gst: 18 },
  { hsn: '3306', name: 'Toothpaste', gst: 18 },
  { hsn: '4818', name: 'Toilet paper / Tissues', gst: 18 },
  { hsn: '9619', name: 'Sanitary napkins', gst: 0 },
  { hsn: '3402', name: 'Detergent / Washing powder', gst: 18 },
  { hsn: '3923', name: 'Plastic containers / bags', gst: 18 },
  { hsn: '3304', name: 'Cosmetics / Makeup', gst: 18 },
  { hsn: '3923', name: 'Baby diapers', gst: 12 },
  { hsn: '1901', name: 'Baby food / Cereal', gst: 18 },
  { hsn: '3004', name: 'Medicines (general)', gst: 12 },
  { hsn: '3004', name: 'Life-saving drugs (notified)', gst: 5 },
  { hsn: '9018', name: 'Medical devices (general)', gst: 12 },
  { hsn: '4820', name: 'Notebooks / Exercise books', gst: 12 },
  { hsn: '9608', name: 'Pens / Ball point pens', gst: 18 },
  { hsn: '6403', name: 'Footwear (above ₹1000)', gst: 18 },
  { hsn: '6403', name: 'Footwear (up to ₹1000)', gst: 12 },
  { hsn: '6109', name: 'Readymade garments (above ₹1000)', gst: 12 },
  { hsn: '6109', name: 'Readymade garments (up to ₹1000)', gst: 5 },
  { hsn: '9503', name: 'Toys (non-electronic)', gst: 12 },
  { hsn: '8517', name: 'Mobile phones', gst: 18 },
  { hsn: '8506', name: 'Batteries (dry cell)', gst: 18 },
  { hsn: '8544', name: 'Mobile charger / cables', gst: 18 },
  { hsn: '7323', name: 'Steel kitchen utensils', gst: 12 },
  { hsn: '2403', name: 'Tobacco / Pan masala', gst: 28 },
  { hsn: '3808', name: 'Mosquito repellent / Insecticide', gst: 18 },
  { hsn: '9405', name: 'LED bulbs / lights', gst: 12 },
];

const rateColor = (g) => g === 0 ? 'badge-green' : g <= 5 ? 'badge-green' : g <= 12 ? 'badge-amber' : 'badge-red';

export async function renderGstFinder() {
  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>🔍 GST Rate Finder</h1>
          <p>Find the GST rate &amp; HSN code for any product</p>
        </div>
      </div>
      <div class="search-bar" style="margin-bottom:16px;max-width:480px;">
        <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" class="form-input" id="gst-search" placeholder="Search product or HSN (e.g. rice, soap, 1006)…" style="padding-left:38px;">
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        <div id="gst-list"></div>
      </div>
      <p style="font-size:.72rem;color:var(--text-muted);margin-top:10px;">⚠️ Reference rates only — confirm against the latest CBIC/GST notification before billing.</p>
    </div>`;
}

export async function initGstFinder() {
  const list = document.getElementById('gst-list');
  const render = (rows) => {
    if (!rows.length) { list.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-muted);">No match found.</div>`; return; }
    list.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
        <thead><tr style="text-align:left;color:var(--text-muted);font-size:.72rem;text-transform:uppercase;">
          <th style="padding:12px 16px;">Product</th><th style="padding:12px 16px;">HSN</th><th style="padding:12px 16px;text-align:right;">GST</th>
        </tr></thead>
        <tbody>${rows.map(r => `
          <tr style="border-top:1px solid var(--glass-border);">
            <td style="padding:11px 16px;font-weight:600;">${r.name}</td>
            <td style="padding:11px 16px;font-family:'JetBrains Mono',monospace;color:var(--text-muted);">${r.hsn}</td>
            <td style="padding:11px 16px;text-align:right;"><span class="badge ${rateColor(r.gst)}">${r.gst}%</span></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  };
  render(GST_DATA);
  document.getElementById('gst-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    render(!q ? GST_DATA : GST_DATA.filter(r => r.name.toLowerCase().includes(q) || r.hsn.includes(q) || String(r.gst).includes(q)));
  });
}
