// ===== SmartBill Help Assistant =====
// A free, offline, chat-style guide for new shop owners. No API key, no cost.
// It answers common "how do I…" questions with curated, keyword-matched replies
// and shows a getting-started checklist. Mounted once on the <body> so it
// persists across page navigations.

// ── Knowledge base ────────────────────────────────────────────────────────────
// Each entry: keywords to match + a short, friendly answer (HTML allowed).
const KB = [
  {
    k: ['add product', 'new product', 'create product', 'add item', 'add stock item'],
    a: `<b>Add a product:</b><br>Go to <b>Products</b> → click <b>+ Add Product</b>. Enter the name, price, stock quantity and (optionally) a barcode, cost price and GST rate, then <b>Save</b>. The product is instantly ready to sell in Billing.`
  },
  {
    k: ['bill', 'billing', 'sell', 'sale', 'pos', 'checkout', 'make a bill', 'create bill'],
    a: `<b>Make a bill:</b><br>Open <b>Billing / POS</b>. Click a product (or scan its barcode) to add it to the cart, adjust quantities with − / +, choose a payment method, then click <b>Checkout & Generate Bill</b>. You can download a PDF, print it, or share on WhatsApp.`
  },
  {
    k: ['gst', 'tax', 'vat'],
    a: `<b>GST / Tax:</b><br>In the Billing cart there's a <b>GST</b> checkbox — turn it on/off per bill. Leave the % field blank to use each product's own GST rate, or type one rate (e.g. 18) to apply it to the whole bill. You can also set a default in <b>Settings</b>.`
  },
  {
    k: ['barcode', 'scan', 'qr', 'scanner', 'camera'],
    a: `<b>Barcodes & scanning:</b><br>Add a barcode to a product when editing it (type it or use the 📷 scan button). In Billing, click <b>Scan QR</b> to add items by camera. In <b>Products → Scan to Deduct</b>, show items to the camera to reduce stock automatically.`
  },
  {
    k: ['import', 'csv', 'upload products', 'bulk'],
    a: `<b>Import products (CSV):</b><br>Go to <b>Products → Import CSV</b> and pick a CSV file. Easiest way: click <b>Export CSV</b> first to get the exact column format, fill it in Excel, then import. Existing items (matched by barcode or name) are updated; new ones are added.`
  },
  {
    k: ['deduct', 'reduce stock', 'scan to deduct', 'auto deduct', 'stock out'],
    a: `<b>Scan to Deduct:</b><br>In <b>Products</b>, click <b>Scan to Deduct</b>. The camera stays open — show each product's barcode and 1 unit is removed from its stock automatically. Great for quick stock-outs. Click <b>Done</b> when finished.`
  },
  {
    k: ['customer', 'loyalty', 'points', 'phone'],
    a: `<b>Customers & loyalty:</b><br>Add customers in the <b>Customers</b> page, or attach one during billing with the 👤 button. Customers earn loyalty points automatically (1 point per ₹10 spent) and you can see their spend and visits.`
  },
  {
    k: ['report', 'reports', 'analytics', 'profit', 'sales report'],
    a: `<b>Reports:</b><br>The <b>Reports</b> page shows your sales, profit, top products and trends. Use it to see how the shop is doing day by day.`
  },
  {
    k: ['inventory', 'low stock', 'out of stock', 'reorder', 'alert'],
    a: `<b>Inventory:</b><br>The <b>Inventory</b> page lists stock levels and flags <b>Low Stock</b> / <b>Out of Stock</b> items (based on each product's alert threshold). The sidebar shows a badge with how many items need attention.`
  },
  {
    k: ['user', 'staff', 'employee', 'owner', 'role', 'permission', 'add user', 'manage staff'],
    a: `<b>Users & roles:</b><br>Only an <b>Admin</b> can manage users (in <b>Settings</b>). Roles:<br>• <b>Admin</b> — full access incl. Settings<br>• <b>Owner</b> — stock, money & reports<br>• <b>Employee</b> — billing & customers only.`
  },
  {
    k: ['password', 'forgot', 'reset', 'login', 'sign in', 'cant login'],
    a: `<b>Login & password:</b><br>On the login page use <b>Forgot Password</b> — answer your security question to set a new one. Admins can also reset accounts from Settings. The very first account created becomes the Admin.`
  },
  {
    k: ['setting', 'settings', 'shop name', 'currency', 'configure'],
    a: `<b>Settings:</b><br>In <b>Settings</b> you can set your shop name, currency, GST defaults and manage users. Your shop name appears on bills and the login screen.`
  },
  {
    k: ['slow', 'loading', 'wait', 'cold start', 'taking time'],
    a: `<b>First load is slow?</b><br>The server "sleeps" when unused and takes a few seconds to wake up on the first visit. After that it's fast. It's normal — just give it a moment on the first open of the day.`
  },
  {
    k: ['print', 'pdf', 'invoice', 'receipt', 'whatsapp', 'share'],
    a: `<b>Invoices:</b><br>After checkout you can <b>Download PDF</b>, <b>Print Receipt</b>, or <b>Share on WhatsApp</b> (it uses the customer's phone if one is attached to the bill).`
  },
];

const SUGGESTIONS = [
  'How do I add a product?',
  'How do I make a bill?',
  'How does GST work?',
  'How do I import products?',
  'How do I add staff?',
];

const CHECKLIST = [
  'Set your shop name in Settings',
  'Add your first few products (or Import CSV)',
  'Make a test bill in Billing / POS',
  'Add a customer and try loyalty points',
  'Create staff/owner accounts in Settings',
];

// ── Answer engine: simple keyword scoring ─────────────────────────────────────
function findAnswer(text) {
  const q = (text || '').toLowerCase();
  let best = null, bestScore = 0;
  for (const entry of KB) {
    let score = 0;
    for (const kw of entry.k) {
      if (q.includes(kw)) score += kw.split(' ').length * 2; // multi-word match weighs more
    }
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  if (best && bestScore > 0) return best.a;

  // Fallback
  return `I'm not sure about that one yet 🤔. Try one of the quick questions below, or ask about: <b>products, billing, GST, barcodes, import, customers, reports, inventory, users</b> or <b>settings</b>.`;
}

// ── Mounting ──────────────────────────────────────────────────────────────────
export function initAssistant() {
  if (document.getElementById('sb-assistant-fab')) {
    document.getElementById('sb-assistant-fab').style.display = '';
    return;
  }

  const html = `
    <button id="sb-assistant-fab" title="Help Assistant" style="
      position:fixed;right:20px;bottom:20px;z-index:9000;
      width:56px;height:56px;border:none;border-radius:50%;cursor:pointer;
      background:var(--gradient-brand,linear-gradient(135deg,#7c3aed,#06b6d4));
      box-shadow:0 8px 24px rgba(124,58,237,.45);color:#fff;font-size:1.5rem;
      display:flex;align-items:center;justify-content:center;transition:transform .15s;">
      🤖
    </button>

    <div id="sb-assistant-panel" style="
      position:fixed;right:20px;bottom:88px;z-index:9001;display:none;
      width:340px;max-width:calc(100vw - 40px);height:480px;max-height:calc(100vh - 120px);
      background:var(--bg-elevated,#14141f);border:1px solid var(--glass-border,rgba(255,255,255,.08));
      border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);
      flex-direction:column;overflow:hidden;">

      <div style="padding:14px 16px;background:var(--gradient-brand,linear-gradient(135deg,#7c3aed,#06b6d4));color:#fff;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:1.2rem;">🤖</span>
          <div>
            <div style="font-weight:700;font-size:.95rem;">SmartBill Helper</div>
            <div style="font-size:.7rem;opacity:.85;">Ask me how to use the app</div>
          </div>
        </div>
        <button id="sb-assistant-close" style="background:transparent;border:none;color:#fff;font-size:1.2rem;cursor:pointer;line-height:1;">✕</button>
      </div>

      <div id="sb-assistant-msgs" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;font-size:.85rem;color:var(--text-primary,#e5e7eb);"></div>

      <div id="sb-assistant-chips" style="padding:6px 12px;display:flex;flex-wrap:wrap;gap:6px;border-top:1px solid var(--glass-border,rgba(255,255,255,.08));"></div>

      <div style="padding:10px 12px;border-top:1px solid var(--glass-border,rgba(255,255,255,.08));display:flex;gap:8px;">
        <input id="sb-assistant-input" type="text" placeholder="Type your question…" style="
          flex:1;padding:9px 12px;border-radius:10px;font-size:.85rem;
          background:var(--bg-base,#0b0b12);color:var(--text-primary,#e5e7eb);
          border:1px solid var(--glass-border,rgba(255,255,255,.12));outline:none;">
        <button id="sb-assistant-send" style="
          padding:9px 14px;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:.85rem;
          background:var(--accent-violet,#7c3aed);color:#fff;">Send</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  const fab    = document.getElementById('sb-assistant-fab');
  const panel  = document.getElementById('sb-assistant-panel');
  const msgs   = document.getElementById('sb-assistant-msgs');
  const chips  = document.getElementById('sb-assistant-chips');
  const input  = document.getElementById('sb-assistant-input');
  const sendBtn = document.getElementById('sb-assistant-send');

  const bubble = (text, who) => {
    const isBot = who === 'bot';
    const div = document.createElement('div');
    div.style.cssText = `max-width:85%;padding:9px 12px;border-radius:12px;line-height:1.45;${
      isBot
        ? 'align-self:flex-start;background:var(--bg-base,#0b0b12);border:1px solid var(--glass-border,rgba(255,255,255,.08));'
        : 'align-self:flex-end;background:var(--accent-violet,#7c3aed);color:#fff;'
    }`;
    div.innerHTML = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  };

  const ask = (text) => {
    if (!text || !text.trim()) return;
    bubble(text, 'user');
    setTimeout(() => bubble(findAnswer(text), 'bot'), 200);
  };

  // Welcome message + checklist (only first time the panel opens)
  let greeted = false;
  const greet = () => {
    if (greeted) return;
    greeted = true;
    bubble(`👋 Welcome to <b>SmartBill</b>! I'm here to help you set up your shop.<br><br><b>Getting started:</b><br>${
      CHECKLIST.map(c => `✅ ${c}`).join('<br>')
    }<br><br>Tap a question below or type your own.`, 'bot');
  };

  // Suggestion chips
  SUGGESTIONS.forEach(s => {
    const chip = document.createElement('button');
    chip.textContent = s;
    chip.style.cssText = `padding:5px 10px;border-radius:999px;cursor:pointer;font-size:.74rem;
      background:var(--accent-violet-glow,rgba(124,58,237,.12));color:var(--accent-violet-light,#a78bfa);
      border:1px solid var(--accent-violet-glow,rgba(124,58,237,.25));`;
    chip.addEventListener('click', () => ask(s));
    chips.appendChild(chip);
  });

  const togglePanel = (show) => {
    const open = show ?? (panel.style.display === 'none' || !panel.style.display);
    panel.style.display = open ? 'flex' : 'none';
    if (open) { greet(); input.focus(); }
  };

  fab.addEventListener('click', () => togglePanel());
  document.getElementById('sb-assistant-close').addEventListener('click', () => togglePanel(false));
  sendBtn.addEventListener('click', () => { ask(input.value); input.value = ''; });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { ask(input.value); input.value = ''; } });
}

export function hideAssistant() {
  const fab = document.getElementById('sb-assistant-fab');
  const panel = document.getElementById('sb-assistant-panel');
  if (fab) fab.style.display = 'none';
  if (panel) panel.style.display = 'none';
}
