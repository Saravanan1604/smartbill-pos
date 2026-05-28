import express from 'express';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Sale from '../models/Sale.js';
import authMiddleware from '../middleware/auth.js';
import tenant from '../middleware/tenant.js';

const router = express.Router();
router.use(authMiddleware, tenant);

// Record a payment received from a customer (reduces their credit/udhaar balance)
router.post('/', async (req, res) => {
  try {
    const { customerId, amount, method = 'Cash', note = '' } = req.body;
    const amt = parseFloat(amount);
    if (!customerId || !amt || amt <= 0) return res.status(400).json({ error: 'Customer and a valid amount are required.' });
    const cust = await Customer.findOne({ _id: customerId, shopId: req.shopId });
    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    const payment = await new Payment({
      shopId: req.shopId, customerId, amount: amt,
      method: ['Cash', 'UPI', 'Card'].includes(method) ? method : 'Cash',
      note, date: new Date().toISOString().split('T')[0],
    }).save();

    cust.creditBalance = (cust.creditBalance || 0) - amt;   // negative = advance paid
    await cust.save();
    res.status(201).json({ payment, creditBalance: cust.creditBalance });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Customer ledger — credit sales (they owe) + payments (they paid), running balance
router.get('/ledger/:customerId', async (req, res) => {
  try {
    const cid = req.params.customerId;
    const [sales, payments, cust] = await Promise.all([
      Sale.find({ shopId: req.shopId, customerId: cid, paymentMethod: 'Credit', deletedAt: null }),
      Payment.find({ shopId: req.shopId, customerId: cid }),
      Customer.findOne({ _id: cid, shopId: req.shopId }),
    ]);
    const entries = [
      ...sales.map(s => ({ type: 'sale', label: `Invoice ${s.invoiceNo}`, debit: s.total, credit: 0, date: s.createdAt })),
      ...payments.map(p => ({ type: 'payment', label: `Payment (${p.method})${p.note ? ' · ' + p.note : ''}`, debit: 0, credit: p.amount, date: p.createdAt })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    let bal = 0;
    entries.forEach(e => { bal += e.debit - e.credit; e.balance = bal; });
    res.json({
      customer: cust ? { name: cust.name, phone: cust.phone, creditBalance: cust.creditBalance } : null,
      entries,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
