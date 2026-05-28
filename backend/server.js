import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Models for Seeding
import User from './models/User.js';
import Product from './models/Product.js';
import Customer from './models/Customer.js';
import Settings from './models/Settings.js';
import Sale from './models/Sale.js';
import Shop from './models/Shop.js';
import Subscription from './models/Subscription.js';

// Routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import salesRoutes from './routes/sales.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import platformRoutes from './routes/platform.js';
import billingRoutes from './routes/billing.js';
import paymentRoutes from './routes/payments.js';
import purchaseRoutes from './routes/purchases.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/platform', platformRoutes);   // platform owner (super-admin) only
app.use('/api/billing', billingRoutes);      // shop subscription / Razorpay
app.use('/api/payments', paymentRoutes);     // customer credit (udhaar) payments
app.use('/api/purchases', purchaseRoutes);   // purchase / stock-in entries

// Base route for status checks
app.get('/', (req, res) => {
  res.json({ message: 'SmartBill POS API Server is running smoothly!' });
});

// Health endpoint — reports which database the server is connected to.
// Exposes host only (no username/password), so it is safe to call publicly.
app.get('/api/health', (req, res) => {
  const conn = mongoose.connection;
  const host = conn?.host || '';
  let dbType = 'unknown';
  if (/mongodb\.net/i.test(host)) dbType = 'atlas (persistent ✅)';
  else if (host && conn?.client?.s?.options?.srvHost) dbType = 'remote (persistent ✅)';
  else if (process.env.MONGO_URI && !/127\.0\.0\.1|localhost/.test(process.env.MONGO_URI)) dbType = 'remote (persistent ✅)';
  else if (host) dbType = 'in-memory / local (NOT persistent ⚠️)';

  res.json({
    status: 'ok',
    db: {
      connected: conn?.readyState === 1,
      host: host || 'n/a',
      name: conn?.name || 'n/a',
      type: dbType,
      mongoUriConfigured: !!process.env.MONGO_URI,
    },
    integrations: {
      razorpayConfigured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      superAdminConfigured: !!(process.env.SUPERADMIN_USERNAME && process.env.SUPERADMIN_PASSWORD),
    },
  });
});

// Database Connection Logic with Persistent MongoMemoryServer Fallback
async function connectDB() {
  let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartbill';
  const isLocalDefault = mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost');

  if (isLocalDefault) {
    console.log('📡 Checking local MongoDB service status...');
    try {
      // Short timeout to check if a local Mongo instance is running
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      console.log('✅ Connected to existing local MongoDB service');
    } catch (err) {
      console.log('ℹ️ Local MongoDB service not detected on default port. Initializing self-contained offline MongoDB...');
      
      const dbPath = path.join(__dirname, 'data', 'db');
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }
      
      try {
        const mongod = await MongoMemoryServer.create({
          instance: {
            dbPath: dbPath,
            storageEngine: 'wiredTiger',
            dbName: 'smartbill'
          }
        });
        
        mongoUri = mongod.getUri();
        console.log(`🚀 Self-contained MongoDB server started. Connection URI: ${mongoUri}`);
        
        // Connect mongoose to self-contained server URI
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to self-contained database successfully');
      } catch (memoryServerErr) {
        console.error('❌ Failed to start self-contained MongoDB server: ', memoryServerErr.message);
        throw memoryServerErr;
      }
    }
  } else {
    // Connect to remote Atlas/Custom URI
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to remote MongoDB database successfully');
    } catch (remoteErr) {
      console.error('❌ Failed to connect to remote MongoDB: ', remoteErr.message);
      throw remoteErr;
    }
  }
}

connectDB()
  .then(async () => {
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Critical database initialization error: ', err.message);
    process.exit(1);
  });

// Database Seeding Helper
async function seedDatabase() {
  try {
    // ── 1. Ensure admin exists with password 8220 ──────────────────────────
    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const pwd  = await bcrypt.hash('8220', salt);
      await new User({ username: 'admin', password: pwd, role: 'admin' }).save();
      console.log('✅ Admin account created (admin / 8220)');
    } else {
      // Migrate old default password admin123 → 8220
      const isOldPwd = await bcrypt.compare('admin123', adminUser.password);
      if (isOldPwd) {
        const salt = await bcrypt.genSalt(10);
        adminUser.password = await bcrypt.hash('8220', salt);
        adminUser.role = 'admin';
        await adminUser.save();
        console.log('✅ Admin password migrated → 8220');
      }
    }

    // ── 2. Migrate legacy 'staff' role → 'employee' ────────────────────────
    const migrated = await User.updateMany({ role: 'staff' }, { $set: { role: 'employee' } });
    if (migrated.modifiedCount > 0) {
      console.log(`✅ ${migrated.modifiedCount} legacy staff account(s) migrated → employee`);
    }

    // ── 2b. Seed the PLATFORM OWNER (super-admin) from env vars ─────────────
    // Set SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD on Render to enable the
    // platform owner console. No hardcoded backdoor is created.
    const saUser = (process.env.SUPERADMIN_USERNAME || '').trim().toLowerCase();
    const saPass = process.env.SUPERADMIN_PASSWORD || '';
    if (saUser && saPass) {
      let sa = await User.findOne({ username: saUser });
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(saPass, salt);
      if (!sa) {
        await new User({ username: saUser, password: hash, role: 'superadmin', shopId: null }).save();
        console.log(`✅ Platform super-admin created (${saUser})`);
      } else if (sa.role !== 'superadmin') {
        sa.role = 'superadmin'; sa.shopId = null; sa.password = hash; await sa.save();
        console.log(`✅ Existing user "${saUser}" promoted to super-admin`);
      }
    } else {
      console.log('ℹ️ SUPERADMIN_USERNAME / SUPERADMIN_PASSWORD not set — platform console disabled until configured.');
    }

    // 3. Seed Settings
    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      console.log('🌱 Seeding default shop settings...');
      const settings = new Settings({
        shopName: 'SmartBill Store',
        address: '123 Main Street, City',
        phone: '9876543210',
        gstin: '33AAAAA1111A1Z1',
        gstEnabled: true,
        gstRate: 18,
        currency: '₹'
      });
      await settings.save();
      console.log('✅ Settings seeded');
    }

    // ── Stage 2: multi-tenancy migration ──────────────────────────────────
    // Ensure a Default Shop exists and move all legacy (shopId-less) data into
    // it, so the existing single-shop install keeps working as one tenant and
    // nothing is lost.
    let defaultShop = await Shop.findOne({ name: 'Default Shop' });
    if (!defaultShop) {
      defaultShop = await new Shop({ name: 'Default Shop' }).save();
      console.log('✅ Default Shop created for legacy data');
    }
    const dsId = defaultShop._id;

    const userFix = await User.updateMany(
      { role: { $ne: 'superadmin' }, $or: [{ shopId: null }, { shopId: { $exists: false } }] },
      { $set: { shopId: dsId } }
    );
    if (userFix.modifiedCount) console.log(`✅ ${userFix.modifiedCount} user(s) linked to Default Shop`);

    if (!defaultShop.ownerUserId) {
      const adminAcc = await User.findOne({ shopId: dsId, role: 'admin' });
      if (adminAcc) { defaultShop.ownerUserId = adminAcc._id; await defaultShop.save(); }
    }

    for (const [Model, label] of [[Product, 'products'], [Customer, 'customers'], [Sale, 'sales'], [Settings, 'settings']]) {
      const r = await Model.updateMany(
        { $or: [{ shopId: null }, { shopId: { $exists: false } }] },
        { $set: { shopId: dsId } }
      );
      if (r.modifiedCount) console.log(`✅ ${r.modifiedCount} ${label} linked to Default Shop`);
    }

    const dsSub = await Subscription.findOne({ shopId: dsId });
    if (!dsSub) {
      const far = new Date(); far.setFullYear(far.getFullYear() + 5);
      await new Subscription({ shopId: dsId, plan: 'enterprise', status: 'active', currentPeriodEnd: far, provider: 'manual' }).save();
      console.log('✅ Default Shop subscription created (enterprise/active)');
    }

    // Replace legacy GLOBAL unique indexes with the new PER-SHOP compound ones
    const dropIdx = async (Model, name) => {
      try { await Model.collection.dropIndex(name); console.log(`✅ Dropped legacy index ${name}`); }
      catch { /* index didn't exist — fine */ }
    };
    await dropIdx(Product, 'barcode_1');
    await dropIdx(Customer, 'phone_1');
    await dropIdx(Sale, 'invoiceNo_1');
    await Promise.all([Product.syncIndexes(), Customer.syncIndexes(), Sale.syncIndexes()])
      .catch(e => console.warn('Index sync warning:', e.message));

    // NOTE: Products and Customers are intentionally NOT seeded.
    // Every new business starts with an empty inventory and customer list
    // so shop owners add their own real products from day one.
  } catch (err) {
    console.error('❌ Error seeding database: ', err.message);
  }
}
