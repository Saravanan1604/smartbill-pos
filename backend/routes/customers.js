import express from 'express';
import Customer from '../models/Customer.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// ─── Get all customers ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Add customer ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, notes, birthday, tags } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required.' });

    if (phone) {
      const exists = await Customer.findOne({ phone: phone.trim() });
      if (exists) return res.status(400).json({ error: `Phone '${phone}' already exists.` });
    }

    const newCustomer = new Customer({
      name, phone: phone ? phone.trim() : undefined,
      email: email ? email.trim() : undefined,
      notes: notes || '', birthday: birthday || '',
      tags: Array.isArray(tags) ? tags : [],
      loyaltyPoints: 0, creditBalance: 0,
      totalSpent: 0, visitCount: 0
    });

    await newCustomer.save();
    res.status(201).json(newCustomer);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Update customer ──────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, totalSpent, visitCount, lastVisit,
            loyaltyPoints, creditBalance, notes, birthday, tags } = req.body;

    if (phone) {
      const exists = await Customer.findOne({ phone: phone.trim(), _id: { $ne: req.params.id } });
      if (exists) return res.status(400).json({ error: `Phone '${phone}' already exists.` });
    }

    const updates = {};
    if (name          !== undefined) updates.name          = name;
    if (phone         !== undefined) updates.phone         = phone ? phone.trim() : undefined;
    if (email         !== undefined) updates.email         = email ? email.trim() : undefined;
    if (totalSpent    !== undefined) updates.totalSpent    = parseFloat(totalSpent);
    if (visitCount    !== undefined) updates.visitCount    = parseInt(visitCount);
    if (lastVisit     !== undefined) updates.lastVisit     = lastVisit;
    if (loyaltyPoints !== undefined) updates.loyaltyPoints = Math.max(0, parseInt(loyaltyPoints) || 0);
    if (creditBalance !== undefined) updates.creditBalance = parseFloat(creditBalance) || 0;
    if (notes         !== undefined) updates.notes         = notes;
    if (birthday      !== undefined) updates.birthday      = birthday;
    if (tags          !== undefined) updates.tags          = Array.isArray(tags) ? tags : [];

    const updated = await Customer.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Customer not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Delete customer ──────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
