import Subscription from '../models/Subscription.js';
import { PLANS } from '../config/plans.js';

// Computes the real status, treating an elapsed trial/period as expired/past_due.
export function effectiveStatus(sub) {
  if (!sub) return 'expired';
  const now = Date.now();
  if (sub.status === 'trial' && sub.trialEndsAt && new Date(sub.trialEndsAt).getTime() < now) return 'expired';
  if (sub.status === 'active' && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd).getTime() < now) return 'past_due';
  return sub.status;
}

// Gate for write operations. Must run AFTER tenant (needs req.shopId).
// Loads the subscription, blocks expired/suspended shops, and exposes
// req.planLimits for per-plan quota checks.
export async function requireActivePlan(req, res, next) {
  try {
    const sub = await Subscription.findOne({ shopId: req.shopId });
    const status = effectiveStatus(sub);
    req.subscription = sub;
    // During an active trial, grant Pro-level limits so new shops aren't
    // restricted. After the trial they fall back to their actual plan.
    const planKey = status === 'trial' ? 'pro' : (sub?.plan || 'free');
    req.planLimits = (PLANS[planKey] || PLANS.free).limits;

    if (status === 'expired' || status === 'suspended') {
      return res.status(402).json({
        error: status === 'suspended'
          ? 'This shop has been suspended. Please contact support.'
          : 'Your free trial / subscription has ended. Please upgrade to continue.',
        code: 'SUBSCRIPTION_' + status.toUpperCase(),
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Plan check failed: ' + err.message });
  }
}
