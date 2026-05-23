import express from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const POINTS_PER_RUPEE = 0.1; // 1 point per ₹10 spent

// ─── Get all sales ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Create sale ──────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { items, subtotal, tax, discount, total, paymentMethod, customerId,
            pointsRedeemed = 0 } = req.body;

    if (!items?.length || total === undefined || !paymentMethod) {
      return res.status(400).json({ error: 'Items, total, and payment method are required.' });
    }

    // 1. Invoice number (sequential, unique)
    const salesCount = await Sale.countDocuments();
    let invoiceNo = 'INV' + String(salesCount + 1).padStart(4, '0');
    let isUnique = false, attempts = 0;
    while (!isUnique && attempts < 10) {
      const existing = await Sale.findOne({ invoiceNo });
      if (existing) invoiceNo = 'INV' + String(salesCount + 1 + (++attempts)).padStart(4, '0');
      else isUnique = true;
    }

    // 2. Compute cost + decrement stock
    let costTotal = 0;
    for (const item of items) {
      const prod = await Product.findById(item.id);
      if (prod) {
        costTotal += (prod.costPrice || 0) * item.qty;
        await Product.findByIdAndUpdate(item.id, {
          $set: { stock: Math.max(0, (prod.stock || 0) - item.qty) }
        });
      } else {
        costTotal += item.price * 0.8 * item.qty;
      }
    }
    const profit = parseFloat((total - costTotal).toFixed(2));

    // 3. Save sale
    const newSale = new Sale({
      invoiceNo, items,
      subtotal: parseFloat(subtotal), tax: parseFloat(tax) || 0,
      discount: parseFloat(discount) || 0, total: parseFloat(total),
      profit, paymentMethod,
      customerId: customerId || null,
      date: new Date().toISOString().split('T')[0]
    });
    await newSale.save();

    // 4. Update customer — totalSpent, visitCount, loyalty points
    if (customerId) {
      const pointsEarned = Math.floor(parseFloat(total) * POINTS_PER_RUPEE);
      const redeem = Math.max(0, parseInt(pointsRedeemed) || 0);
      await Customer.findByIdAndUpdate(customerId, {
        $inc: {
          totalSpent:    parseFloat(total),
          visitCount:    1,
          loyaltyPoints: pointsEarned - redeem   // earn new, deduct redeemed
        },
        $set: { lastVisit: new Date().toISOString() }
      });
    }

    res.status(201).json(newSale);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
