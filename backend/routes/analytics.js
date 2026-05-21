import express from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all analytics routes
router.use(authMiddleware);

// Get main dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Today's Sales
    const todaySales = await Sale.find({ date: todayStr });
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const todayTxns = todaySales.length;

    // Yesterday's Sales
    const yesterdaySales = await Sale.find({ date: yesterdayStr });
    const yesterdayRevenue = yesterdaySales.reduce((sum, sale) => sum + sale.total, 0);

    // Total Profit (All time)
    const allSales = await Sale.find({}, 'profit');
    const totalProfit = allSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);

    // Products Stats (Low stock and out of stock)
    const products = await Product.find();
    const lowStock = products.filter(p => p.stock <= (p.alertThreshold || 10) && p.stock > 0);
    const outOfStock = products.filter(p => p.stock === 0);

    res.json({
      todayRevenue: parseFloat(todayRevenue.toFixed(2)),
      yesterdayRevenue: parseFloat(yesterdayRevenue.toFixed(2)),
      todayTxns,
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      lowStock,
      outOfStock,
      totalProducts: products.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get sales revenue trend for last 7 days
router.get('/sales-trend', async (req, res) => {
  try {
    const days = [];
    // We get last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
      
      const sales = await Sale.find({ date: dateStr }, 'total');
      const revenue = sales.reduce((sum, s) => sum + s.total, 0);
      
      days.push({
        date: dateStr,
        label,
        revenue: parseFloat(revenue.toFixed(2)),
        count: sales.length
      });
    }
    res.json(days);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get top-selling products
router.get('/top-products', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    // Use MongoDB aggregation to sum quantities of items sold
    const topProducts = await Sale.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          qty: { $sum: '$items.qty' }
        }
      },
      { $sort: { qty: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          name: '$_id',
          qty: 1
        }
      }
    ]);

    res.json(topProducts);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
