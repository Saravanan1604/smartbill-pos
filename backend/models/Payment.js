import mongoose from 'mongoose';

// A payment received from a customer against their credit (udhaar) balance.
const paymentSchema = new mongoose.Schema({
  shopId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  amount:     { type: Number, required: true, min: 0 },
  method:     { type: String, enum: ['Cash', 'UPI', 'Card'], default: 'Cash' },
  note:       { type: String, default: '' },
  date:       { type: String },   // YYYY-MM-DD
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
