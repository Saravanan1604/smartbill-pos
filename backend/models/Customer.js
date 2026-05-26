import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  shopId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', index: true },
  name:         { type: String, required: true, trim: true },
  // Phone is unique PER SHOP (compound index below), not globally.
  phone:        { type: String, sparse: true, trim: true },
  email:        { type: String, trim: true },
  totalSpent:   { type: Number, default: 0 },
  visitCount:   { type: Number, default: 0 },
  lastVisit:    { type: Date },
  // ── New fields ──────────────────────────────────────────────────────────────
  loyaltyPoints: { type: Number, default: 0, min: 0 },   // 1 point per ₹10 spent
  creditBalance: { type: Number, default: 0 },            // positive = customer owes us
  notes:         { type: String, default: '', trim: true },
  birthday:      { type: String, default: '' },           // MM-DD format
  tags:          { type: [String], default: [] },         // VIP, Regular, Wholesale…
}, { timestamps: true });

customerSchema.index({ shopId: 1, phone: 1 }, { unique: true, sparse: true });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
