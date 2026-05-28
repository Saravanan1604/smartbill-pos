import express from 'express';
import mongoose from 'mongoose';
import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import authMiddleware from '../middleware/auth.js';
import tenant from '../middleware/tenant.js';

const router = express.Router();
router.use(authMiddleware, tenant);

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// ─── AI: extract line items from a purchase bill photo (Google Gemini) ──────
// body: { image: "data:image/jpeg;base64,...." }
router.post('/scan', async (req, res) => {
  try {
    if (!GEMINI_KEY) {
      return res.status(503).json({ error: 'AI bill scanning is not configured. Add GEMINI_API_KEY on the server.' });
    }
    const image = req.body.image || '';
    const m = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) return res.status(400).json({ error: 'Send a base64 image data URL.' });
    const mimeType = m[1], base64 = m[2];

    const prompt = `You are reading a shop's PURCHASE / supplier invoice photo (may be a pharmacy or grocery bill).
Extract every product line item. Return ONLY a JSON object: {"items":[ ... ]}.
Each item: {"name": string, "hsn": string, "batch": string, "expiry": string (as printed, e.g. "04/28"), "qty": number, "costPrice": number (purchase rate per unit), "mrp": number, "gst": number (GST percent)}.
Use "" for missing text and 0 for missing numbers. Do not invent items. JSON only, no markdown.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(502).json({ error: data?.error?.message || 'AI request failed' });
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { items: [] }; }
    const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

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
