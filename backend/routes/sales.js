import express from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all sales routes
router.use(authMiddleware);

// Get all sales (newest first)
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Create a new sale transaction (Checkout)
router.post('/', async (req, res) => {
  try {
    const { items, subtotal, tax, discount, total, paymentMethod, customerId } = req.body;

    if (!items || items.length === 0 || total === undefined || !paymentMethod) {
      return res.status(400).json({ error: 'Invalid sale data. Items, total, and payment method are required.' });
    }

    // 1. Calculate sequential invoice number
    const salesCount = await Sale.countDocuments();
    let invoiceNo = 'INV' + String(salesCount + 1).padStart(4, '0');
    
    // Ensure invoice number is unique (safety fallback)
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const existingSale = await Sale.findOne({ invoiceNo });
      if (existingSale) {
        invoiceNo = 'INV' + String(salesCount + 1 + (++attempts)).padStart(4, '0');
      } else {
        isUnique = true;
      }
    }

    // 2. Calculate profit
    let costTotal = 0;
    for (const item of items) {
      const prod = await Product.findById(item.id);
      if (prod) {
        costTotal += (prod.costPrice || 0) * item.qty;
        // Deduct inventory stock
        const newStock = Math.max(0, (prod.stock || 0) - item.qty);
        await Product.findByIdAndUpdate(item.id, { $set: { stock: newStock } });
      } else {
        // Fallback cost price (80% of selling price) if product is not found
        costTotal += item.price * 0.8 * item.qty;
      }
    }
    const profit = parseFloat((total - costTotal).toFixed(2));

    // 3. Create the sale document
    const newSale = new Sale({
      invoiceNo,
      items,
      subtotal: parseFloat(subtotal),
      tax: parseFloat(tax) || 0,
      discount: parseFloat(discount) || 0,
      total: parseFloat(total),
      profit,
      paymentMethod,
      customerId: customerId || null,
      date: new Date().toISOString().split('T')[0]
    });

    await newSale.save();

    // 4. Update Customer statistics if linked
    if (customerId) {
      const todayStr = new Date().toISOString();
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { totalSpent: parseFloat(total), visitCount: 1 },
        $set: { lastVisit: todayStr }
      });
    }

    res.status(201).json(newSale);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
