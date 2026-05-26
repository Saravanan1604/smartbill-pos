import express from 'express';
import Shop from '../models/Shop.js';
import Subscription from '../models/Subscription.js';
import Usage from '../models/Usage.js';
import authMiddleware from '../middleware/auth.js';
import requireSuperAdmin from '../middleware/superadmin.js';
import { PLANS, TRIAL_DAYS, monthlyValue } from '../config/plans.js';

const router = express.Router();

// All platform routes require a logged-in super admin.
router.use(authMiddleware, requireSuperAdmin);

const period = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// ─── Platform stats (top of the owner dashboard) ────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [shops, subs] = await Promise.all([
      Shop.find().lean(),
      Subscription.find().lean(),
    ]);
    const byStatus = subs.reduce((m, s) => { m[s.status] = (m[s.status] || 0) + 1; return m; }, {});
    const mrr = subs.reduce((sum, s) => sum + monthlyValue(s), 0);

    // Trials ending within 3 days
    const soon = Date.now() + 3 * 864e5;
    const trialsEndingSoon = subs.filter(s => s.status === 'trial' && s.trialEndsAt && new Date(s.trialEndsAt).getTime() <= soon).length;

    // Signups in the last 30 days
    const since = Date.now() - 30 * 864e5;
    const newShops30d = shops.filter(s => new Date(s.createdAt).getTime() >= since).length;

    res.json({
      totalShops: shops.length,
      activeSubscriptions: byStatus.active || 0,
      trials: byStatus.trial || 0,
      pastDue: byStatus.past_due || 0,
      suspended: byStatus.suspended || 0,
      mrr,
      trialsEndingSoon,
      newShops30d,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── List all shops with subscription + this-month usage ────────────────────
router.get('/shops', async (req, res) => {
  try {
    const { search = '', status = '', plan = '' } = req.query;
    const shops = await Shop.find().sort({ createdAt: -1 }).lean();
    const subs = await Subscription.find().lean();
    const usages = await Usage.find({ period: period() }).lean();

    const subByShop = new Map(subs.map(s => [String(s.shopId), s]));
    const useByShop = new Map(usages.map(u => [String(u.shopId), u]));

    let rows = shops.map(shop => {
      const sub = subByShop.get(String(shop._id)) || {};
      const use = useByShop.get(String(shop._id)) || {};
      return {
        id: String(shop._id),
        name: shop.name,
        active: shop.active,
        createdAt: shop.createdAt,
        plan: sub.plan || 'free',
        status: sub.status || 'trial',
        trialEndsAt: sub.trialEndsAt || null,
        currentPeriodEnd: sub.currentPeriodEnd || null,
        billsThisMonth: use.billsCreated || 0,
        lastActiveAt: use.lastActiveAt || null,
      };
    });

    if (search) rows = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    if (status) rows = rows.filter(r => r.status === status);
    if (plan)   rows = rows.filter(r => r.plan === plan);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── One shop detail + last 6 months usage ──────────────────────────────────
router.get('/shops/:id', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).lean();
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    const sub = await Subscription.findOne({ shopId: shop._id }).lean();
    const usage = await Usage.find({ shopId: shop._id }).sort({ period: -1 }).limit(6).lean();
    res.json({ shop, subscription: sub, usage });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Manually manage a shop's subscription (activate / extend / suspend) ─────
// body: { plan?, status?, extendDays?, billingCycle? }
router.post('/shops/:id/subscription', async (req, res) => {
  try {
    const { plan, status, extendDays, billingCycle } = req.body;
    let sub = await Subscription.findOne({ shopId: req.params.id });
    if (!sub) sub = new Subscription({ shopId: req.params.id });

    if (plan && PLANS[plan]) sub.plan = plan;
    if (billingCycle) sub.billingCycle = billingCycle;
    if (status) sub.status = status;

    if (extendDays) {
      const base = sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date() ? new Date(sub.currentPeriodEnd) : new Date();
      base.setDate(base.getDate() + Number(extendDays));
      sub.currentPeriodEnd = base;
      if (sub.status === 'expired' || sub.status === 'trial') sub.status = 'active';
    }

    // keep amount in sync with the chosen plan
    const p = PLANS[sub.plan];
    if (p) sub.amount = sub.billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly;
    sub.provider = sub.provider || 'manual';

    await sub.save();

    // suspending the subscription also disables the shop
    if (status === 'suspended') await Shop.findByIdAndUpdate(req.params.id, { active: false });
    if (status === 'active')    await Shop.findByIdAndUpdate(req.params.id, { active: true });

    res.json({ message: 'Subscription updated', subscription: sub });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Expose plan catalogue (for the dashboard dropdowns)
router.get('/plans', (req, res) => res.json({ plans: PLANS, trialDays: TRIAL_DAYS }));

export default router;
