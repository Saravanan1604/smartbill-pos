import express from 'express';
import Product from '../models/Product.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all product routes
router.use(authMiddleware);

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Add a new product
router.post('/', async (req, res) => {
  try {
    const { name, barcode, price, costPrice, stock, category, tax, alertThreshold } = req.body;
    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Name, price, and stock are required fields.' });
    }

    // Check barcode uniqueness if provided
    if (barcode) {
      const existingProduct = await Product.findOne({ barcode: barcode.trim() });
      if (existingProduct) {
        return res.status(400).json({ error: `A product with barcode '${barcode}' already exists.` });
      }
    }

    const newProduct = new Product({
      name,
      barcode: barcode ? barcode.trim() : undefined,
      price: parseFloat(price),
      costPrice: parseFloat(costPrice) || 0,
      stock: parseInt(stock),
      category: category || 'Uncategorized',
      tax: parseFloat(tax) || 0,
      alertThreshold: parseInt(alertThreshold) || 10
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Update a product
router.put('/:id', async (req, res) => {
  try {
    const { name, barcode, price, costPrice, stock, category, tax, alertThreshold } = req.body;
    
    // Check barcode uniqueness if changed
    if (barcode) {
      const existingProduct = await Product.findOne({ 
        barcode: barcode.trim(), 
        _id: { $ne: req.params.id } 
      });
      if (existingProduct) {
        return res.status(400).json({ error: `A product with barcode '${barcode}' already exists.` });
      }
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (barcode !== undefined) updates.barcode = barcode ? barcode.trim() : undefined;
    if (price !== undefined) updates.price = parseFloat(price);
    if (costPrice !== undefined) updates.costPrice = parseFloat(costPrice);
    if (stock !== undefined) updates.stock = parseInt(stock);
    if (category !== undefined) updates.category = category;
    if (tax !== undefined) updates.tax = parseFloat(tax);
    if (alertThreshold !== undefined) updates.alertThreshold = parseInt(alertThreshold);

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Delete a product
router.delete('/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
