import express from 'express';
import Product from '../models/Product.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// ─── Get all products ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Add product ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, barcode, price, costPrice, stock, category, tax, alertThreshold,
            unit, expiryDate, supplier, description, minOrderQty } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Name, price, and stock are required.' });
    }
    if (barcode) {
      const exists = await Product.findOne({ barcode: barcode.trim() });
      if (exists) return res.status(400).json({ error: `Barcode '${barcode}' already exists.` });
    }

    const newProduct = new Product({
      name, price: parseFloat(price), costPrice: parseFloat(costPrice) || 0,
      stock: parseInt(stock), category: category || 'Uncategorized',
      tax: parseFloat(tax) || 0, alertThreshold: parseInt(alertThreshold) || 10,
      barcode: barcode ? barcode.trim() : undefined,
      unit: unit || 'pcs', expiryDate: expiryDate || null,
      supplier: supplier || '', description: description || '',
      minOrderQty: parseInt(minOrderQty) || 1
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Update product ───────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, barcode, price, costPrice, stock, category, tax, alertThreshold,
            unit, expiryDate, supplier, description, minOrderQty } = req.body;

    if (barcode) {
      const exists = await Product.findOne({ barcode: barcode.trim(), _id: { $ne: req.params.id } });
      if (exists) return res.status(400).json({ error: `Barcode '${barcode}' already exists.` });
    }

    const updates = {};
    if (name       !== undefined) updates.name            = name;
    if (barcode    !== undefined) updates.barcode         = barcode ? barcode.trim() : undefined;
    if (price      !== undefined) updates.price           = parseFloat(price);
    if (costPrice  !== undefined) updates.costPrice       = parseFloat(costPrice);
    if (stock      !== undefined) updates.stock           = parseInt(stock);
    if (category   !== undefined) updates.category        = category;
    if (tax        !== undefined) updates.tax             = parseFloat(tax);
    if (alertThreshold !== undefined) updates.alertThreshold = parseInt(alertThreshold);
    if (unit       !== undefined) updates.unit            = unit;
    if (expiryDate !== undefined) updates.expiryDate      = expiryDate || null;
    if (supplier   !== undefined) updates.supplier        = supplier;
    if (description!== undefined) updates.description     = description;
    if (minOrderQty!== undefined) updates.minOrderQty     = parseInt(minOrderQty) || 1;

    const updated = await Product.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Quick stock adjustment (+/-) ─────────────────────────────────────────────
router.post('/:id/adjust-stock', async (req, res) => {
  try {
    const { delta, setTo } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (setTo !== undefined && setTo !== null && setTo !== '') {
      product.stock = Math.max(0, parseInt(setTo));
    } else {
      product.stock = Math.max(0, product.stock + (parseInt(delta) || 0));
    }
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Delete product ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
