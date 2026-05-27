import Usage from '../models/Usage.js';

export function currentPeriod(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Atomically bump a usage counter for a shop's current month + touch lastActive.
export async function incrUsage(shopId, field, n = 1) {
  try {
    await Usage.findOneAndUpdate(
      { shopId, period: currentPeriod() },
      { $inc: { [field]: n }, $set: { lastActiveAt: new Date() } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('usage increment failed:', err.message);
  }
}

export async function getUsage(shopId) {
  return (await Usage.findOne({ shopId, period: currentPeriod() })) || {};
}
