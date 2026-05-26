// Guards platform-owner-only routes. Must be used AFTER authMiddleware.
// Only a user whose JWT role is 'superadmin' may pass. A shop admin gets 403.
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Platform owner access only.' });
  }
  next();
};

export default requireSuperAdmin;
