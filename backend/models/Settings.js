import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', index: true },
  shopName: {
    type: String,
    default: 'SmartBill Store'
  },
  address: {
    type: String,
    default: '123 Main Street, City'
  },
  phone: {
    type: String,
    default: '9876543210'
  },
  gstin: {
    type: String,
    default: ''
  },
  gstEnabled: {
    type: Boolean,
    default: false
  },
  gstRate: {
    type: Number,
    default: 18
  },
  currency: {
    type: String,
    default: '₹'
  }
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
