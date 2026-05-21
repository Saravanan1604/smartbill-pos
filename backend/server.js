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

// Routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import salesRoutes from './routes/sales.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';

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

// Base route for status checks
app.get('/', (req, res) => {
  res.json({ message: 'SmartBill POS API Server is running smoothly!' });
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
    // 1. Seed Users (Admin & Staff)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Seeding default user accounts...');
      
      const adminSalt = await bcrypt.genSalt(10);
      const adminPassword = await bcrypt.hash('admin123', adminSalt);
      const adminUser = new User({
        username: 'admin',
        password: adminPassword,
        role: 'admin'
      });
      await adminUser.save();

      const staffSalt = await bcrypt.genSalt(10);
      const staffPassword = await bcrypt.hash('staff123', staffSalt);
      const staffUser = new User({
        username: 'staff',
        password: staffPassword,
        role: 'staff'
      });
      await staffUser.save();
      console.log('✅ User accounts seeded (admin / admin123, staff / staff123)');
    }

    // 2. Seed Settings
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

    // 3. Seed Products
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('🌱 Seeding sample products...');
      const sampleProducts = [
        { name: 'Full Cream Milk 1L', barcode: '10001', price: 65, costPrice: 50, stock: 45, category: 'Dairy', tax: 0, alertThreshold: 10 },
        { name: 'Amul Butter 500g', barcode: '10002', price: 275, costPrice: 220, stock: 20, category: 'Dairy', tax: 5, alertThreshold: 5 },
        { name: 'Britannia Bread', barcode: '10003', price: 40, costPrice: 30, stock: 18, category: 'Bakery', tax: 0, alertThreshold: 5 },
        { name: 'Tata Salt 1kg', barcode: '10004', price: 22, costPrice: 15, stock: 60, category: 'Grocery', tax: 0, alertThreshold: 15 },
        { name: 'Sunflower Oil 1L', barcode: '10005', price: 145, costPrice: 115, stock: 30, category: 'Grocery', tax: 5, alertThreshold: 8 },
        { name: 'Basmati Rice 5kg', barcode: '10006', price: 380, costPrice: 300, stock: 25, category: 'Grocery', tax: 0, alertThreshold: 5 },
        { name: 'Lays Chips 26g', barcode: '10007', price: 20, costPrice: 14, stock: 80, category: 'Snacks', tax: 18, alertThreshold: 20 },
        { name: 'Coca-Cola 500ml', barcode: '10008', price: 45, costPrice: 32, stock: 50, category: 'Beverages', tax: 28, alertThreshold: 15 },
        { name: 'Dettol Soap 75g', barcode: '10009', price: 38, costPrice: 28, stock: 35, category: 'Personal Care', tax: 18, alertThreshold: 10 },
        { name: 'Colgate Toothpaste', barcode: '10010', price: 85, costPrice: 65, stock: 28, category: 'Personal Care', tax: 18, alertThreshold: 8 },
        { name: 'Rin Detergent 1kg', barcode: '10011', price: 110, costPrice: 85, stock: 22, category: 'Household', tax: 18, alertThreshold: 5 },
        { name: 'Maggi Noodles 70g', barcode: '10012', price: 14, costPrice: 10, stock: 100, category: 'Snacks', tax: 18, alertThreshold: 30 },
        { name: 'Parle-G Biscuits', barcode: '10013', price: 10, costPrice: 7, stock: 150, category: 'Snacks', tax: 18, alertThreshold: 30 }
      ];
      await Product.insertMany(sampleProducts);
      console.log('✅ Sample products seeded');
    }

    // 4. Seed Customers
    const customerCount = await Customer.countDocuments();
    if (customerCount === 0) {
      console.log('🌱 Seeding sample customers...');
      const sampleCustomers = [
        { name: 'Ramesh Kumar', phone: '9876543210', email: 'ramesh@example.com', totalSpent: 260, visitCount: 2, lastVisit: new Date() },
        { name: 'Priya Sharma', phone: '9123456789', email: 'priya@example.com', totalSpent: 475, visitCount: 3, lastVisit: new Date() },
        { name: 'Anbu Selvam', phone: '9994561234', email: 'anbu@example.com', totalSpent: 120, visitCount: 1, lastVisit: new Date() }
      ];
      await Customer.insertMany(sampleCustomers);
      console.log('✅ Sample customers seeded');
    }
  } catch (err) {
    console.error('❌ Error seeding database: ', err.message);
  }
}
