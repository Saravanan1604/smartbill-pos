// Central plan definitions. Prices are in the shop's currency (₹ by default).
// Edit these to change tiers — limits are enforced by middleware (Stage 3).
export const PLANS = {
  free: {
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    limits: { maxProducts: 50, maxBillsPerMonth: 100, maxUsers: 1, maxBranches: 1, aiInsights: false, whatsapp: false, voice: false },
  },
  pro: {
    name: 'Pro',
    priceMonthly: 299,
    priceYearly: 2990,
    limits: { maxProducts: Infinity, maxBillsPerMonth: Infinity, maxUsers: 5, maxBranches: 1, aiInsights: true, whatsapp: true, voice: true },
  },
  enterprise: {
    name: 'Enterprise',
    priceMonthly: 999,
    priceYearly: 9990,
    limits: { maxProducts: Infinity, maxBillsPerMonth: Infinity, maxUsers: Infinity, maxBranches: Infinity, aiInsights: true, whatsapp: true, voice: true },
  },
};

export const TRIAL_DAYS = 14;

// Monthly-normalised price (used to compute MRR in the platform dashboard)
export function monthlyValue(sub) {
  if (!sub || sub.status !== 'active') return 0;
  const p = PLANS[sub.plan];
  if (!p) return 0;
  return sub.billingCycle === 'yearly' ? Math.round(p.priceYearly / 12) : p.priceMonthly;
}
