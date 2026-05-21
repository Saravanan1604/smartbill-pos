import express from 'express';
import Customer from '../models/Customer.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all customer routes
router.use(authMiddleware);

// Get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Add a new customer
router.post('/', async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    // Check phone uniqueness if provided
    if (phone) {
      const existingCust = await Customer.findOne({ phone: phone.trim() });
      if (existingCust) {
        return res.status(400).json({ error: `A customer with phone number '${phone}' already exists.` });
      }
    }

    const newCustomer = new Customer({
      name,
      phone: phone ? phone.trim() : undefined,
      email: email ? email.trim() : undefined,
      totalSpent: 0,
      visitCount: 0
    });

    await newCustomer.save();
    res.status(201).json(newCustomer);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Update a customer
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, totalSpent, visitCount, lastVisit } = req.body;

    if (phone) {
      const existingCust = await Customer.findOne({ 
        phone: phone.trim(), 
        _id: { $ne: req.params.id } 
      });
      if (existingCust) {
        return res.status(400).json({ error: `A customer with phone number '${phone}' already exists.` });
      }
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone ? phone.trim() : undefined;
    if (email !== undefined) updates.email = email ? email.trim() : undefined;
    if (totalSpent !== undefined) updates.totalSpent = parseFloat(totalSpent);
    if (visitCount !== undefined) updates.visitCount = parseInt(visitCount);
    if (lastVisit !== undefined) updates.lastVisit = lastVisit;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(updatedCustomer);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Delete a customer
router.delete('/:id', async (req, res) => {
  try {
    const deletedCustomer = await Customer.findByIdAndDelete(req.params.id);
    if (!deletedCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
