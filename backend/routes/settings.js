import express from 'express';
import Settings from '../models/Settings.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Customer from '../models/Customer.js';
import authMiddleware from '../middleware/auth.js';
import tenant from '../middleware/tenant.js';
import mongoose from 'mongoose';

const router = express.Router();

// Scope all settings routes to the logged-in user's shop
router.use(authMiddleware, tenant);

// Get current settings (returns defaults if none exist)
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({ shopId: req.shopId });
    if (!settings) {
      // Create default settings document for this shop
      settings = new Settings({ shopId: req.shopId });
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Update settings
router.post('/', async (req, res) => {
  try {
    const { shopName, address, phone, gstin, gstEnabled, gstRate, currency,
            logoUrl, signatureUrl, invoiceTerms, invoiceNotes, enableRoundOff } = req.body;

    let settings = await Settings.findOne({ shopId: req.shopId });
    if (!settings) {
      settings = new Settings({ shopId: req.shopId });
    }

    if (shopName !== undefined) settings.shopName = shopName;
    if (address !== undefined) settings.address = address;
    if (phone !== undefined) settings.phone = phone;
    if (gstin !== undefined) settings.gstin = gstin;
    if (gstEnabled !== undefined) settings.gstEnabled = gstEnabled;
    if (gstRate !== undefined) settings.gstRate = parseInt(gstRate);
    if (currency !== undefined) settings.currency = currency;
    if (logoUrl !== undefined) settings.logoUrl = logoUrl;
    if (signatureUrl !== undefined) settings.signatureUrl = signatureUrl;
    if (invoiceTerms !== undefined) settings.invoiceTerms = invoiceTerms;
    if (invoiceNotes !== undefined) settings.invoiceNotes = invoiceNotes;
    if (enableRoundOff !== undefined) settings.enableRoundOff = enableRoundOff;

    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Clear all data (Admin-only or all logged in users, we'll allow all auth users here)
router.post('/clear-data', async (req, res) => {
  try {
    // Only clear THIS shop's data — never other tenants'.
    await Product.deleteMany({ shopId: req.shopId });
    await Sale.deleteMany({ shopId: req.shopId });
    await Customer.deleteMany({ shopId: req.shopId });
    await Settings.deleteMany({ shopId: req.shopId });

    // Recreate default settings for this shop
    const settings = new Settings({ shopId: req.shopId });
    await settings.save();

    res.json({ message: 'All database records cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Import and merge backup data
router.post('/import-data', async (req, res) => {
  try {
    const { products, sales, customers, settings } = req.body;

    // 1. Import Settings
    if (settings) {
      let existingSettings = await Settings.findOne({ shopId: req.shopId });
      if (!existingSettings) {
        existingSettings = new Settings({ shopId: req.shopId });
      }
      if (settings.shopName !== undefined) existingSettings.shopName = settings.shopName;
      if (settings.address !== undefined) existingSettings.address = settings.address;
      if (settings.phone !== undefined) existingSettings.phone = settings.phone;
      if (settings.gstin !== undefined) existingSettings.gstin = settings.gstin;
      if (settings.gstEnabled !== undefined) existingSettings.gstEnabled = settings.gstEnabled;
      if (settings.gstRate !== undefined) existingSettings.gstRate = parseInt(settings.gstRate);
      if (settings.currency !== undefined) existingSettings.currency = settings.currency;
      await existingSettings.save();
    }

    // Maps to link old local storage IDs to new MongoDB ObjectIds
    const productMap = {};
    const customerMap = {};

    // 2. Import Products
    if (products && Array.isArray(products)) {
      for (const prod of products) {
        let savedProd;
        if (prod.barcode) {
          savedProd = await Product.findOne({ shopId: req.shopId, barcode: prod.barcode.toString().trim() });
        }

        if (savedProd) {
          // Merge details
          savedProd.name = prod.name || savedProd.name;
          savedProd.price = prod.price !== undefined ? parseFloat(prod.price) : savedProd.price;
          savedProd.costPrice = prod.costPrice !== undefined ? parseFloat(prod.costPrice) : savedProd.costPrice;
          savedProd.stock = prod.stock !== undefined ? parseInt(prod.stock) : savedProd.stock;
          savedProd.category = prod.category || savedProd.category;
          savedProd.tax = prod.tax !== undefined ? parseFloat(prod.tax) : savedProd.tax;
          savedProd.alertThreshold = prod.alertThreshold !== undefined ? parseInt(prod.alertThreshold) : savedProd.alertThreshold;
          await savedProd.save();
        } else {
          // Insert new product
          savedProd = new Product({
            shopId: req.shopId,
            name: prod.name,
            barcode: prod.barcode ? prod.barcode.toString().trim() : undefined,
            price: parseFloat(prod.price) || 0,
            costPrice: parseFloat(prod.costPrice) || 0,
            stock: parseInt(prod.stock) || 0,
            category: prod.category || 'Uncategorized',
            tax: parseFloat(prod.tax) || 0,
            alertThreshold: parseInt(prod.alertThreshold) || 10
          });
          await savedProd.save();
        }
        
        // Map both old string ID and barcode to this new ObjectId
        if (prod.id) productMap[prod.id] = savedProd._id;
        if (prod.barcode) productMap[prod.barcode] = savedProd._id;
      }
    }

    // 3. Import Customers
    if (customers && Array.isArray(customers)) {
      for (const cust of customers) {
        let savedCust;
        if (cust.phone) {
          savedCust = await Customer.findOne({ shopId: req.shopId, phone: cust.phone.toString().trim() });
        }

        if (savedCust) {
          // Merge details
          savedCust.name = cust.name || savedCust.name;
          savedCust.email = cust.email || savedCust.email;
          savedCust.totalSpent = cust.totalSpent !== undefined ? parseFloat(cust.totalSpent) : savedCust.totalSpent;
          savedCust.visitCount = cust.visitCount !== undefined ? parseInt(cust.visitCount) : savedCust.visitCount;
          savedCust.lastVisit = cust.lastVisit || savedCust.lastVisit;
          await savedCust.save();
        } else {
          // Insert new customer
          savedCust = new Customer({
            shopId: req.shopId,
            name: cust.name,
            phone: cust.phone ? cust.phone.toString().trim() : undefined,
            email: cust.email || '',
            totalSpent: parseFloat(cust.totalSpent) || 0,
            visitCount: parseInt(cust.visitCount) || 0,
            lastVisit: cust.lastVisit || null
          });
          await savedCust.save();
        }

        if (cust.id) customerMap[cust.id] = savedCust._id;
        if (cust.phone) customerMap[cust.phone] = savedCust._id;
      }
    }

    // 4. Import Sales
    if (sales && Array.isArray(sales)) {
      for (const sale of sales) {
        // Resolve customer reference if possible
        let customerId = null;
        if (sale.customerId && customerMap[sale.customerId]) {
          customerId = customerMap[sale.customerId];
        } else if (sale.customerPhone && customerMap[sale.customerPhone]) {
          customerId = customerMap[sale.customerPhone];
        }

        // Map items array
        const mappedItems = (sale.items || []).map(item => {
          // Resolve product reference
          let productId = null;
          if (item.id && productMap[item.id]) {
            productId = productMap[item.id];
          } else if (item.barcode && productMap[item.barcode]) {
            productId = productMap[item.barcode];
          } else {
            // Fallback: create random valid ObjectId if not found
            productId = new mongoose.Types.ObjectId();
          }

          return {
            id: productId,
            name: item.name,
            price: parseFloat(item.price) || 0,
            qty: parseInt(item.qty) || 1,
            taxAmt: parseFloat(item.taxAmt) || 0,
            total: parseFloat(item.total) || 0
          };
        });

        // Skip if sale already exists (by invoiceNo within this shop)
        const existingSale = await Sale.findOne({ shopId: req.shopId, invoiceNo: sale.invoiceNo });
        if (!existingSale) {
          const newSale = new Sale({
            shopId: req.shopId,
            invoiceNo: sale.invoiceNo,
            items: mappedItems,
            subtotal: parseFloat(sale.subtotal) || 0,
            tax: parseFloat(sale.tax) || 0,
            discount: parseFloat(sale.discount) || 0,
            total: parseFloat(sale.total) || 0,
            profit: parseFloat(sale.profit) || 0,
            paymentMethod: ['Cash', 'UPI', 'Card'].includes(sale.paymentMethod) ? sale.paymentMethod : 'Cash',
            customerId,
            date: sale.date || new Date().toISOString().split('T')[0]
          });
          await newSale.save();
        }
      }
    }

    res.json({ message: 'Backup data imported and merged successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
