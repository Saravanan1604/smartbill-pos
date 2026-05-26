import mongoose from 'mongoose';
import User from '../models/User.js';
import Shop from '../models/Shop.js';

// Resolves the tenant (shopId) for a request. MUST run after authMiddleware.
// Sets req.shopId, which every shop route uses to scope its queries.
// Falls back to a DB lookup when the JWT predates multi-tenancy (stale token),
// and finally to the Default Shop so legacy data is never orphaned.
const tenant = async (req, res, next) => {
  try {
    // The platform owner is not a shop tenant and must not touch shop data.
    if (req.user?.role === 'superadmin') {
      return res.status(403).json({ error: 'Super-admin cannot access shop data.' });
    }

    let shopId = req.user?.shopId || null;

    if (!shopId && req.user?.id) {
      const u = await User.findById(req.user.id).select('shopId');
      shopId = u?.shopId || null;
    }
    if (!shopId) {
      const def = await Shop.findOne({ name: 'Default Shop' }).select('_id');
      shopId = def?._id || null;
    }
    if (!shopId) {
      return res.status(400).json({ error: 'No shop context for this account.' });
    }

    // Always an ObjectId so aggregation $match works too.
    req.shopId = new mongoose.Types.ObjectId(shopId);
    next();
  } catch (err) {
    res.status(500).json({ error: 'Tenant resolution failed: ' + err.message });
  }
};

export default tenant;
