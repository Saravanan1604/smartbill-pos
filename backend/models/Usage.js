import mongoose from 'mongoose';

// Per-shop, per-month usage counters. Incremented with cheap $inc on events
// (a sale, an AI call, a WhatsApp send, a login). Used for plan-limit
// enforcement and the platform owner's monitoring dashboard.
const usageSchema = new mongoose.Schema({
  shopId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  period:       { type: String, required: true },     // 'YYYY-MM'
  billsCreated: { type: Number, default: 0 },
  productsCount:{ type: Number, default: 0 },          // snapshot, refreshed periodically
  aiCalls:      { type: Number, default: 0 },
  whatsappSent: { type: Number, default: 0 },
  lastActiveAt: { type: Date },
}, { timestamps: true });

usageSchema.index({ shopId: 1, period: 1 }, { unique: true });

export default mongoose.model('Usage', usageSchema);
