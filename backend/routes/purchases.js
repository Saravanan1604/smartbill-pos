import express from 'express';
import mongoose from 'mongoose';
import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import authMiddleware from '../middleware/auth.js';
import tenant from '../middleware/tenant.js';

const router = express.Router();
router.use(authMiddleware, tenant);

// List purchases (newest first)
router.get('/', async (req, res) => {
  try {
    const purchases = await Purchase.find({ shopId: req.shopId }).sort({ createdAt: -1 }).limit(200);
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Create a purchase → increase stock, update/create matching products
router.post('/', async (req, res) => {
  try {
    const { supplierName = '', invoiceNo = '', date, items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Add at least one item.' });
    }

    let total = 0;
    const savedItems = [];

    for (const it of items) {
      const name = (it.name || '').trim();
      if (!name) continue;
      const qty = parseInt(it.qty) || 0;
      const costPrice = parseFloat(it.costPrice) || 0;
      const mrp = parseFloat(it.mrp) || 0;
      const gst = parseFloat(it.gst) || 0;
      total += qty * costPrice;

      // Find the product: by id, else by exact name within the shop
      let prod = null;
      if (it.productId && mongoose.Types.ObjectId.isValid(it.productId)) {
        prod = await Product.findOne({ _id: it.productId, shopId: req.shopId });
      }
      if (!prod) {
        prod = await Product.findOne({ shopId: req.shopId, name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      }

      if (prod) {
        prod.stock = (prod.stock || 0) + qty;
        if (costPrice) prod.costPrice = costPrice;
        if (mrp) prod.price = mrp;
        if (gst) prod.tax = gst;
        if (it.expiry) { const d = new Date(it.expiry); if (!isNaN(d)) prod.expiryDate = d; }
        if (supplierName) prod.supplier = supplierName;
        await prod.save();
      } else {
        const data = {
          shopId: req.shopId, name, stock: qty,
          costPrice, price: mrp || costPrice, tax: gst,
          category: it.category || 'Other', supplier: supplierName,
          barcode: it.barcode ? String(it.barcode).trim() : undefined,
        };
        if (it.expiry) { const d = new Date(it.expiry); if (!isNaN(d)) data.expiryDate = d; }
        prod = await new Product(data).save();
      }

      savedItems.push({ productId: prod._id, name, hsn: it.hsn || '', batch: it.batch || '', expiry: it.expiry || '', qty, costPrice, mrp, gst });
    }

    const purchase = await new Purchase({
      shopId: req.shopId, supplierName, invoiceNo,
      date: date || new Date().toISOString().split('T')[0],
      items: savedItems, total: parseFloat(total.toFixed(2)),
    }).save();

    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
