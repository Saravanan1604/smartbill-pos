import express from 'express';
import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import authMiddleware from '../middleware/auth.js';
import tenant from '../middleware/tenant.js';
import { requireActivePlan } from '../middleware/plan.js';
import { incrUsage, currentPeriod } from '../utils/usage.js';
import Usage from '../models/Usage.js';

const router = express.Router();
router.use(authMiddleware, tenant);

const POINTS_PER_RUPEE = 0.1; // 1 point per ₹10 spent

// ─── Get all sales (excludes soft-deleted) ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find({ shopId: req.shopId, deletedAt: null }).sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── List deleted invoices (recycle bin) ────────────────────────────────────────
router.get('/deleted', async (req, res) => {
  try {
    const sales = await Sale.find({ shopId: req.shopId, deletedAt: { $ne: null } }).sort({ deletedAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Soft-delete an invoice (and add its stock back) ────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, shopId: req.shopId, deletedAt: null });
    if (!sale) return res.status(404).json({ error: 'Invoice not found' });
    // return stock for catalogue items
    for (const item of sale.items) {
      if (mongoose.Types.ObjectId.isValid(item.id)) {
        const p = await Product.findOne({ _id: item.id, shopId: req.shopId });
        if (p) { p.stock = (p.stock || 0) + item.qty; await p.save(); }
      }
    }
    sale.deletedAt = new Date();
    await sale.save();
    res.json({ message: 'Invoice moved to recycle bin', id: sale._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Recover a deleted invoice (and re-deduct stock) ────────────────────────────
router.post('/:id/recover', async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, shopId: req.shopId, deletedAt: { $ne: null } });
    if (!sale) return res.status(404).json({ error: 'Deleted invoice not found' });
    for (const item of sale.items) {
      if (mongoose.Types.ObjectId.isValid(item.id)) {
        const p = await Product.findOne({ _id: item.id, shopId: req.shopId });
        if (p) { p.stock = Math.max(0, (p.stock || 0) - item.qty); await p.save(); }
      }
    }
    sale.deletedAt = null;
    await sale.save();
    res.json({ message: 'Invoice recovered', id: sale._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Create sale ──────────────────────────────────────────────────────────────
router.post('/', requireActivePlan, async (req, res) => {
  try {
    const { items, subtotal, tax, discount, total, paymentMethod, customerId,
            pointsRedeemed = 0 } = req.body;

    if (!items?.length || total === undefined || !paymentMethod) {
      return res.status(400).json({ error: 'Items, total, and payment method are required.' });
    }

    // Plan limit: max bills per month
    const maxBills = req.planLimits?.maxBillsPerMonth ?? Infinity;
    if (Number.isFinite(maxBills)) {
      const used = (await Usage.findOne({ shopId: req.shopId, period: currentPeriod() }))?.billsCreated || 0;
      if (used >= maxBills) {
        return res.status(402).json({
          error: `Your plan allows ${maxBills} bills per month. Upgrade for unlimited billing.`,
          code: 'LIMIT_BILLS',
        });
      }
    }

    // 1. Invoice number (sequential, unique PER SHOP)
    const salesCount = await Sale.countDocuments({ shopId: req.shopId });
    let invoiceNo = 'INV' + String(salesCount + 1).padStart(4, '0');
    let isUnique = false, attempts = 0;
    while (!isUnique && attempts < 10) {
      const existing = await Sale.findOne({ shopId: req.shopId, invoiceNo });
      if (existing) invoiceNo = 'INV' + String(salesCount + 1 + (++attempts)).padStart(4, '0');
      else isUnique = true;
    }

    // 2. Compute cost + decrement stock (skip 'quick-' / non-product items)
    let costTotal = 0;
    for (const item of items) {
      const isRealProduct = mongoose.Types.ObjectId.isValid(item.id);
      const prod = isRealProduct ? await Product.findOne({ _id: item.id, shopId: req.shopId }) : null;
      if (prod) {
        costTotal += (prod.costPrice || 0) * item.qty;
        prod.stock = Math.max(0, (prod.stock || 0) - item.qty);
        await prod.save();
      } else {
        costTotal += item.price * 0.8 * item.qty;
      }
    }
    const profit = parseFloat((total - costTotal).toFixed(2));

    // 3. Save sale
    const newSale = new Sale({
      shopId: req.shopId,
      invoiceNo, items,
      subtotal: parseFloat(subtotal), tax: parseFloat(tax) || 0,
      discount: parseFloat(discount) || 0, total: parseFloat(total),
      profit, paymentMethod,
      customerId: customerId || null,
      date: new Date().toISOString().split('T')[0]
    });
    await newSale.save();

    // 4. Update customer — totalSpent, visitCount, loyalty points (scoped)
    if (customerId) {
      const pointsEarned = Math.floor(parseFloat(total) * POINTS_PER_RUPEE);
      const redeem = Math.max(0, parseInt(pointsRedeemed) || 0);
      const inc = {
        totalSpent:    parseFloat(total),
        visitCount:    1,
        loyaltyPoints: pointsEarned - redeem   // earn new, deduct redeemed
      };
      // Credit (udhaar) sale → the customer owes this amount
      if (paymentMethod === 'Credit') inc.creditBalance = parseFloat(total);
      await Customer.findOneAndUpdate({ _id: customerId, shopId: req.shopId }, {
        $inc: inc,
        $set: { lastVisit: new Date().toISOString() }
      });
    }

    // 5. Track usage for billing limits + platform monitoring
    await incrUsage(req.shopId, 'billsCreated', 1);

    res.status(201).json(newSale);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
