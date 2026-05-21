import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Helper to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'smartbill_super_secret_jwt_key_2026',
    { expiresIn: '30d' }
  );
};

// Register Route (First user registration or Admin-only registrations)
router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const userCount = await User.countDocuments();
    let finalRole = role || 'staff';

    // If it is the first user, force it to be admin
    if (userCount === 0) {
      finalRole = 'admin';
    } else {
      // If not the first user, require authentication and admin role to create new users
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Only admins can register other accounts.' });
      }
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartbill_super_secret_jwt_key_2026');
        if (decoded.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied. Only admin users can create accounts.' });
        }
      } catch (err) {
        return res.status(401).json({ error: 'Unauthorized user registration.' });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
      role: finalRole
    });

    await newUser.save();
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: { id: newUser._id, username: newUser.username, role: newUser.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Update current user credentials
router.put('/update', authMiddleware, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username) {
      const lowerUsername = username.toLowerCase();
      // Check if username is taken by another user
      if (lowerUsername !== user.username) {
        const existing = await User.findOne({ username: lowerUsername });
        if (existing) {
          return res.status(400).json({ error: 'Username is already taken' });
        }
        user.username = lowerUsername;
      }
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    // Generate new token with updated username/role
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

// Verify current session token
router.get('/check', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
