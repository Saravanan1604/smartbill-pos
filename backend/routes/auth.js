import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Subscription from '../models/Subscription.js';
import { TRIAL_DAYS, PLANS } from '../config/plans.js';
import { effectiveStatus } from '../middleware/plan.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'smartbill_super_secret_jwt_key_2026';

const generateToken = (user) =>
  jwt.sign({ id: user._id, username: user.username, role: user.role, shopId: user.shopId || null }, JWT_SECRET, { expiresIn: '30d' });

// ─── Setup status (is this a fresh install with no users?) ──────────────────
router.get('/setup-status', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ setupRequired: count === 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Register ──────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, securityQuestion, securityAnswer } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Determine context: authenticated admin adds staff to THEIR shop;
    // otherwise this is a brand-new business signup (creates its own shop).
    let finalRole;
    let shopId = null;
    let isNewShop = false;

    const authHeader = req.headers.authorization;
    let decoded = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try { decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET); } catch { decoded = null; }
    }

    if (decoded && decoded.role === 'admin' && decoded.shopId) {
      // Admin creating a staff/owner account inside their own shop
      finalRole = ['owner', 'employee'].includes(role) ? role : 'employee';
      shopId = decoded.shopId;

      // ── Enforce the plan's user limit (Free 1 / Pro 5 / Enterprise ∞) ──
      const sub = await Subscription.findOne({ shopId });
      const status = effectiveStatus(sub);
      const planKey = status === 'trial' ? 'pro' : (sub?.plan || 'free');
      const maxUsers = (PLANS[planKey] || PLANS.free).limits.maxUsers;
      if (Number.isFinite(maxUsers)) {
        const userCount = await User.countDocuments({ shopId });
        if (userCount >= maxUsers) {
          return res.status(402).json({
            error: `Your plan allows up to ${maxUsers} user${maxUsers > 1 ? 's' : ''}. Upgrade to add more staff.`,
            code: 'LIMIT_USERS',
          });
        }
      }
    } else {
      // New business signup → create a fresh shop, this user becomes its admin
      finalRole = 'admin';
      isNewShop = true;
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let hashedAnswer = '';
    if (securityAnswer && securityAnswer.trim()) {
      hashedAnswer = await bcrypt.hash(securityAnswer.trim().toLowerCase(), salt);
    }

    // Create the shop first for new signups
    let shop = null;
    if (isNewShop) {
      shop = new Shop({ name: (req.body.shopName || `${username}'s Shop`).trim() });
      await shop.save();
      shopId = shop._id;
    }

    const newUser = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
      role: finalRole,
      shopId,
      securityQuestion: securityQuestion || '',
      securityAnswer: hashedAnswer
    });
    await newUser.save();

    // For a new shop: link owner + start a 14-day trial subscription
    if (isNewShop) {
      shop.ownerUserId = newUser._id;
      await shop.save();
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);
      await new Subscription({
        shopId, plan: 'free', status: 'trial',
        trialEndsAt: trialEnds, currentPeriodEnd: trialEnds,
        provider: 'manual',
      }).save();
    }

    const token = generateToken(newUser);
    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: { id: newUser._id, username: newUser.username, role: newUser.role, shopId: newUser.shopId }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Login ─────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, role: user.role, shopId: user.shopId || null }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Get security question for a username (no auth needed) ─────────────────
router.post('/get-security-question', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'No account found with that username' });
    if (!user.securityQuestion) {
      return res.status(400).json({ error: 'No security question set for this account. Contact your admin.' });
    }

    res.json({ securityQuestion: user.securityQuestion });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Forgot / Reset password ───────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { username, securityAnswer, newPassword } = req.body;
    if (!username || !securityAnswer || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'No account found with that username' });
    if (!user.securityAnswer) {
      return res.status(400).json({ error: 'No security question set. Contact your admin to reset your password.' });
    }

    const answerMatch = await bcrypt.compare(securityAnswer.trim().toLowerCase(), user.securityAnswer);
    if (!answerMatch) {
      return res.status(400).json({ error: 'Security answer is incorrect' });
    }

    // Reset password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password reset successfully! You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Update current user credentials ──────────────────────────────────────
router.put('/update', authMiddleware, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (username) {
      const lower = username.toLowerCase();
      if (lower !== user.username) {
        const existing = await User.findOne({ username: lower });
        if (existing) return res.status(400).json({ error: 'Username is already taken' });
        user.username = lower;
      }
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    const token = generateToken(user);

    res.json({
      message: 'Account updated successfully!',
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── List all users (admin only) ──────────────────────────────────────────
router.get('/users', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const shopId = req.user.shopId || (await User.findById(req.user.id).select('shopId'))?.shopId;
    const users = await User.find({ shopId, role: { $ne: 'superadmin' } }, 'username role createdAt').sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Delete a user (admin only, cannot delete self or other admins) ────────
router.delete('/users/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
    const shopId = req.user.shopId || (await User.findById(req.user.id).select('shopId'))?.shopId;
    const user = await User.findOne({ _id: req.params.id, shopId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete another admin account' });
    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Verify session ────────────────────────────────────────────────────────
router.get('/check', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
