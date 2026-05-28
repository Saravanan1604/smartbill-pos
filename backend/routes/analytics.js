import express from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Subscription from '../models/Subscription.js';
import { PLANS } from '../config/plans.js';
import { effectiveStatus } from '../middleware/plan.js';
import authMiddleware from '../middleware/auth.js';
import tenant from '../middleware/tenant.js';

const router = express.Router();

// Scope all analytics to the logged-in user's shop
router.use(authMiddleware, tenant);

// ─── AI INSIGHTS (Pro+ feature) ─────────────────────────────────────────────
// Pure-math intelligence (no paid API): sales forecast, dead stock, smart
// reorder, peak hours, and a business health score.
router.get('/insights', async (req, res) => {
  try {
    const sub = await Subscription.findOne({ shopId: req.shopId });
    const status = effectiveStatus(sub);
    const planKey = status === 'trial' ? 'pro' : (sub?.plan || 'free');
    if (!(PLANS[planKey] || PLANS.free).limits.aiInsights) {
      return res.json({ locked: true, message: 'AI Insights is a Pro feature. Upgrade to unlock.' });
    }

    const [sales, products] = await Promise.all([
      Sale.find({ shopId: req.shopId, deletedAt: null }),
      Product.find({ shopId: req.shopId }),
    ]);
    const pid = (p) => String(p.id || p._id);

    // 1) Forecast next 7 days (14-day average + least-squares trend)
    const dayRev = {};
    sales.forEach(s => { dayRev[s.date] = (dayRev[s.date] || 0) + s.total; });
    const last14 = [];
    for (let i = 13; i >= 0; i--) last14.push(dayRev[new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)] || 0);
    const avg = last14.reduce((a, b) => a + b, 0) / 14;
    const xMean = 6.5;
    let num = 0, den = 0;
    last14.forEach((y, x) => { num += (x - xMean) * (y - avg); den += (x - xMean) ** 2; });
    const slope = den ? num / den : 0;
    const forecast = [];
    for (let k = 1; k <= 7; k++) forecast.push(Math.max(0, Math.round(avg + slope * (13 + k - xMean))));
    const forecastTotal = forecast.reduce((a, b) => a + b, 0);

    // 2) Units sold in last 30 days, per product
    const since = Date.now() - 30 * 864e5;
    const soldQty = {};
    sales.filter(s => new Date(s.createdAt).getTime() >= since)
      .forEach(s => s.items.forEach(it => { soldQty[it.id] = (soldQty[it.id] || 0) + it.qty; }));

    // 3) Dead stock — in stock, no sale in 30d, added >14d ago
    const deadStock = products
      .filter(p => p.stock > 0 && !soldQty[pid(p)] && (Date.now() - new Date(p.createdAt).getTime()) > 14 * 864e5)
      .map(p => ({ name: p.name, stock: p.stock, value: Math.round((p.costPrice || p.price) * p.stock) }))
      .sort((a, b) => b.value - a.value).slice(0, 10);

    // 4) Smart reorder — low stock, suggest 2 weeks of supply
    const reorder = products
      .filter(p => p.stock <= (p.alertThreshold || 10))
      .map(p => {
        const daily = (soldQty[pid(p)] || 0) / 30;
        return {
          name: p.name, stock: p.stock,
          daysLeft: daily > 0 ? Math.round(p.stock / daily) : null,
          suggested: Math.max((p.alertThreshold || 10) * 2 - p.stock, Math.ceil(daily * 14), 1),
        };
      })
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999)).slice(0, 10);

    // 5) Peak hours
    const hours = Array(24).fill(0);
    sales.forEach(s => { hours[new Date(s.createdAt).getHours()]++; });
    const peakHour = hours.indexOf(Math.max(...hours));

    // 6) Business health score (0-100)
    const totalRev = sales.reduce((a, s) => a + s.total, 0);
    const totalProfit = sales.reduce((a, s) => a + (s.profit || 0), 0);
    const margin = totalRev ? totalProfit / totalRev : 0;
    const recent = sales.filter(s => new Date(s.createdAt).getTime() >= Date.now() - 7 * 864e5).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const deadRatio = products.length ? deadStock.length / products.length : 0;
    let score = 50;
    if (recent > 0) score += 15;
    score += margin > 0.15 ? 15 : margin > 0 ? 8 : 0;
    score += outOfStock === 0 ? 10 : -Math.min(15, outOfStock * 2);
    score -= Math.round(deadRatio * 20);
    score = Math.max(0, Math.min(100, score));

    // 7) Profit leaders + pricing alerts
    const prodById = {}; products.forEach(p => { prodById[pid(p)] = p; });
    const nameById = {};
    const profitByProd = {};
    sales.forEach(s => s.items.forEach(it => {
      nameById[it.id] = it.name;
      const cost = prodById[it.id]?.costPrice || 0;
      profitByProd[it.id] = (profitByProd[it.id] || 0) + (it.price - cost) * it.qty;
    }));
    const topEarners = Object.entries(profitByProd)
      .map(([id, pr]) => ({ name: prodById[id]?.name || nameById[id] || '?', profit: Math.round(pr) }))
      .sort((a, b) => b.profit - a.profit).slice(0, 8);
    const lowMargin = products
      .filter(p => p.costPrice > 0 && p.price > 0)
      .map(p => ({ name: p.name, price: p.price, cost: p.costPrice, margin: Math.round((p.price - p.costPrice) / p.price * 100) }))
      .filter(x => x.margin < 10)
      .sort((a, b) => a.margin - b.margin).slice(0, 8);
    const belowCost = products
      .filter(p => p.costPrice > 0 && p.price < p.costPrice)
      .map(p => ({ name: p.name, price: p.price, cost: p.costPrice }));

    // 8) Frequently bought together (market-basket pairs)
    const pairCount = {};
    sales.forEach(s => {
      const ids = [...new Set(s.items.map(i => i.id))];
      for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
        pairCount[[ids[a], ids[b]].sort().join('|')] = (pairCount[[ids[a], ids[b]].sort().join('|')] || 0) + 1;
      }
    });
    const basket = Object.entries(pairCount)
      .map(([k, c]) => { const [x, y] = k.split('|'); return { a: prodById[x]?.name || nameById[x] || '?', b: prodById[y]?.name || nameById[y] || '?', count: c }; })
      .filter(p => p.count > 1)
      .sort((a, b) => b.count - a.count).slice(0, 8);

    // 9) Win-back: customers inactive 30+ days
    const customers = await Customer.find({ shopId: req.shopId });
    const winback = customers
      .filter(c => c.lastVisit && (Date.now() - new Date(c.lastVisit).getTime()) > 30 * 864e5)
      .map(c => ({ name: c.name, phone: c.phone || '', days: Math.round((Date.now() - new Date(c.lastVisit).getTime()) / 864e5), spent: Math.round(c.totalSpent || 0) }))
      .sort((a, b) => b.spent - a.spent).slice(0, 15);

    // 10) Anomalies: bills with unusually large discounts
    const anomalies = sales
      .filter(s => s.subtotal > 0 && s.discount / s.subtotal > 0.3)
      .map(s => ({ invoice: s.invoiceNo, date: s.date, detail: `${Math.round(s.discount / s.subtotal * 100)}% discount (₹${Math.round(s.discount)})` }))
      .slice(0, 10);

    res.json({
      locked: false,
      forecast, forecastTotal,
      avgDailyRevenue: Math.round(avg),
      trend: slope > 1 ? 'up' : slope < -1 ? 'down' : 'flat',
      deadStock, reorder, hours, peakHour,
      healthScore: score, margin: Math.round(margin * 100),
      topEarners, lowMargin, belowCost, basket, winback, anomalies,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── Upsell map for billing: productId → top co-bought product names ─────────
router.get('/upsell', async (req, res) => {
  try {
    const sub = await Subscription.findOne({ shopId: req.shopId });
    const status = effectiveStatus(sub);
    const planKey = status === 'trial' ? 'pro' : (sub?.plan || 'free');
    if (!(PLANS[planKey] || PLANS.free).limits.aiInsights) return res.json({ enabled: false, map: {} });

    const sales = await Sale.find({ shopId: req.shopId, deletedAt: null });
    const co = {}; const nameById = {};
    sales.forEach(s => {
      const ids = [...new Set(s.items.map(i => i.id))];
      s.items.forEach(i => { nameById[i.id] = i.name; });
      for (const a of ids) for (const b of ids) {
        if (a === b) continue;
        (co[a] = co[a] || {})[b] = (co[a][b] || 0) + 1;
      }
    });
    const map = {};
    for (const id in co) {
      map[id] = Object.entries(co[id]).sort((x, y) => y[1] - x[1]).slice(0, 3)
        .map(([bid]) => nameById[bid]).filter(Boolean);
    }
    res.json({ enabled: true, map });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get main dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Today's Sales
    const todaySales = await Sale.find({ shopId: req.shopId, date: todayStr, deletedAt: null });
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const todayTxns = todaySales.length;

    // Yesterday's Sales
    const yesterdaySales = await Sale.find({ shopId: req.shopId, date: yesterdayStr, deletedAt: null });
    const yesterdayRevenue = yesterdaySales.reduce((sum, sale) => sum + sale.total, 0);
    const yesterdayTxns = yesterdaySales.length;
    const yesterdayProfit = yesterdaySales.reduce((sum, sale) => sum + (sale.profit || 0), 0);

    // Today's and All-time Profit
    const todayProfit = todaySales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    const allSales = await Sale.find({ shopId: req.shopId, deletedAt: null }, 'profit');
    const totalProfit = allSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);

    // Products Stats (Low stock and out of stock)
    const products = await Product.find({ shopId: req.shopId });
    const lowStock = products.filter(p => p.stock <= (p.alertThreshold || 10) && p.stock > 0);
    const outOfStock = products.filter(p => p.stock === 0);

    res.json({
      todayRevenue: parseFloat(todayRevenue.toFixed(2)),
      yesterdayRevenue: parseFloat(yesterdayRevenue.toFixed(2)),
      todayTxns,
      yesterdayTxns,
      todayProfit: parseFloat(todayProfit.toFixed(2)),
      yesterdayProfit: parseFloat(yesterdayProfit.toFixed(2)),
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
      
      const sales = await Sale.find({ shopId: req.shopId, date: dateStr, deletedAt: null }, 'total');
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
      { $match: { shopId: req.shopId, deletedAt: null } },
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
