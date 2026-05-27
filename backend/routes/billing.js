import express from 'express';
import crypto from 'crypto';
import Subscription from '../models/Subscription.js';
import Shop from '../models/Shop.js';
import authMiddleware from '../middleware/auth.js';
import tenant from '../middleware/tenant.js';
import { PLANS } from '../config/plans.js';
import { effectiveStatus } from '../middleware/plan.js';
import { getUsage } from '../utils/usage.js';

const router = express.Router();
router.use(authMiddleware, tenant);

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const paymentsEnabled = () => !!(KEY_ID && KEY_SECRET);

// ─── Current subscription + usage + plan catalogue (for the Upgrade page) ────
router.get('/status', async (req, res) => {
  try {
    const sub = await Subscription.findOne({ shopId: req.shopId });
    const usage = await getUsage(req.shopId);
    res.json({
      plans: PLANS,
      subscription: sub,
      status: effectiveStatus(sub),
      usage: { billsCreated: usage.billsCreated || 0 },
      paymentsEnabled: paymentsEnabled(),
      keyId: KEY_ID || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Create a Razorpay order for an upgrade ──────────────────────────────────
router.post('/create-order', async (req, res) => {
  try {
    if (!paymentsEnabled()) {
      return res.status(503).json({ error: 'Online payments are not configured yet. Please contact support.' });
    }
    const { plan, cycle = 'monthly' } = req.body;
    const p = PLANS[plan];
    if (!p || plan === 'free') return res.status(400).json({ error: 'Invalid plan selected.' });

    const amount = (cycle === 'yearly' ? p.priceYearly : p.priceMonthly) * 100; // paise
    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
    const resp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount, currency: 'INR',
        receipt: `shop_${req.shopId}_${Date.now()}`,
        notes: { shopId: String(req.shopId), plan, cycle },
      }),
    });
    const order = await resp.json();
    if (!resp.ok) return res.status(502).json({ error: order?.error?.description || 'Order creation failed.' });

    res.json({ orderId: order.id, amount, currency: 'INR', keyId: KEY_ID, plan, cycle });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Verify payment signature and activate the subscription ──────────────────
router.post('/verify', async (req, res) => {
  try {
    if (!KEY_SECRET) return res.status(503).json({ error: 'Payments not configured.' });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, cycle = 'monthly' } = req.body;

    const expected = crypto.createHmac('sha256', KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed.' });
    }

    const p = PLANS[plan];
    if (!p) return res.status(400).json({ error: 'Invalid plan.' });

    let sub = await Subscription.findOne({ shopId: req.shopId }) || new Subscription({ shopId: req.shopId });
    sub.plan = plan;
    sub.status = 'active';
    sub.billingCycle = cycle;
    sub.provider = 'razorpay';
    sub.amount = cycle === 'yearly' ? p.priceYearly : p.priceMonthly;
    const end = new Date();
    end.setDate(end.getDate() + (cycle === 'yearly' ? 365 : 30));
    sub.currentPeriodEnd = end;
    sub.lastPaymentAt = new Date();
    sub.razorpay = { ...(sub.razorpay || {}), lastPaymentId: razorpay_payment_id };
    await sub.save();
    await Shop.findByIdAndUpdate(req.shopId, { active: true });

    res.json({ message: 'Subscription activated', subscription: sub });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
