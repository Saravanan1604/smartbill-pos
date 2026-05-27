// ===== Subscription / Upgrade Page (shop owner) =====
import DB from '../db.js';
import toast from '../components/toast.js';
import { formatCurrency } from '../utils/format.js';

const PLAN_FEATURES = {
  free:       ['50 products', '100 bills / month', '1 user', 'Basic reports'],
  pro:        ['Unlimited products', 'Unlimited bills', '5 users', 'AI insights', 'WhatsApp invoices', 'Voice billing'],
  enterprise: ['Everything in Pro', 'Unlimited users', 'Multi-branch', 'Priority support'],
};

let _state = null;

export async function renderSubscription() {
  return `
    <div class="page-container animate-fade">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Billing &amp; Plan</h1>
          <p>Manage your SmartBill subscription</p>
        </div>
      </div>
      <div id="sub-content">
        <div style="display:flex;justify-content:center;padding:48px;"><div class="loading-spinner"></div></div>
      </div>
    </div>
  `;
}

export async function initSubscription() {
  await loadStatus();
}

async function loadStatus() {
  const wrap = document.getElementById('sub-content');
  try {
    _state = await DB.getBillingStatus();
  } catch (err) {
    wrap.innerHTML = `<div class="card" style="padding:24px;color:var(--danger);">Failed to load: ${err.message}</div>`;
    return;
  }

  const { plans, subscription, status, usage, paymentsEnabled } = _state;
  const curPlan = subscription?.plan || 'free';

  const statusBadge = {
    trial: 'badge-violet', active: 'badge-green', past_due: 'badge-amber',
    expired: 'badge-red', suspended: 'badge-red',
  }[status] || 'badge-muted';

  let trialNote = '';
  if (status === 'trial' && subscription?.trialEndsAt) {
    const days = Math.max(0, Math.ceil((new Date(subscription.trialEndsAt) - Date.now()) / 864e5));
    trialNote = `<span style="color:var(--text-muted);font-size:.85rem;">Trial ends in ${days} day${days !== 1 ? 's' : ''}</span>`;
  }

  wrap.innerHTML = `
    <div class="card" style="padding:20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:.8rem;color:var(--text-muted);">Current plan</div>
        <div style="font-size:1.3rem;font-weight:800;text-transform:capitalize;">${curPlan}
          <span class="badge ${statusBadge}" style="margin-left:8px;vertical-align:middle;">${status}</span>
        </div>
        ${trialNote}
      </div>
      <div style="text-align:right;font-size:.85rem;color:var(--text-muted);">
        Bills this month: <b style="color:var(--text-primary);">${usage.billsCreated}</b>
      </div>
    </div>

    ${!paymentsEnabled ? `
      <div class="login-notice login-notice-info" style="margin-bottom:16px;">
        <div>Online payments aren't enabled yet. Plans shown for reference — contact the provider to upgrade.</div>
      </div>` : ''}

    <div class="grid-auto">
      ${['free', 'pro', 'enterprise'].map(key => {
        const p = plans[key];
        const isCurrent = curPlan === key && (status === 'active' || (key === 'free' && status !== 'trial'));
        return `
          <div class="card" style="padding:22px;${key === 'pro' ? 'border:1px solid var(--accent-violet);' : ''}">
            ${key === 'pro' ? `<div class="badge badge-violet" style="margin-bottom:8px;">Most popular</div>` : ''}
            <div style="font-size:1.1rem;font-weight:800;">${p.name}</div>
            <div style="font-size:1.8rem;font-weight:900;font-family:'JetBrains Mono',monospace;margin:6px 0;">
              ${p.priceMonthly === 0 ? 'Free' : formatCurrency(p.priceMonthly)}<span style="font-size:.8rem;color:var(--text-muted);font-weight:400;">${p.priceMonthly === 0 ? '' : '/mo'}</span>
            </div>
            <ul style="list-style:none;padding:0;margin:12px 0;display:flex;flex-direction:column;gap:6px;font-size:.85rem;color:var(--text-secondary);">
              ${PLAN_FEATURES[key].map(f => `<li>✓ ${f}</li>`).join('')}
            </ul>
            ${isCurrent
              ? `<button class="btn btn-secondary" style="width:100%;" disabled>Current plan</button>`
              : key === 'free'
                ? `<button class="btn btn-ghost" style="width:100%;" disabled>—</button>`
                : `<button class="btn btn-primary" style="width:100%;" data-upgrade="${key}" ${!paymentsEnabled ? 'disabled' : ''}>Upgrade to ${p.name}</button>`}
          </div>`;
      }).join('')}
    </div>
  `;

  wrap.querySelectorAll('[data-upgrade]').forEach(btn => {
    btn.addEventListener('click', () => startUpgrade(btn.dataset.upgrade));
  });
}

// Loads the Razorpay checkout script once
function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load payment gateway'));
    document.body.appendChild(s);
  });
}

async function startUpgrade(plan, cycle = 'monthly') {
  try {
    toast.info('Starting checkout…');
    const order = await DB.createBillingOrder({ plan, cycle });
    await loadRazorpay();

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'SmartBill',
      description: `${plan} plan (${cycle})`,
      order_id: order.orderId,
      theme: { color: '#7c3aed' },
      handler: async (response) => {
        try {
          await DB.verifyBillingPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            plan, cycle,
          });
          toast.success('🎉 Subscription activated!');
          setTimeout(loadStatus, 800);
        } catch (err) {
          toast.error('Activation failed: ' + err.message);
        }
      },
    });
    rzp.on('payment.failed', () => toast.error('Payment failed or cancelled'));
    rzp.open();
  } catch (err) {
    toast.error(err.message);
  }
}
