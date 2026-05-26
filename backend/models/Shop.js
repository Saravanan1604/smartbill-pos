import mongoose from 'mongoose';

// A Shop is a tenant. Every business that signs up gets one Shop, and all of
// its products/sales/customers/users are scoped to it via shopId.
const shopSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  phone:       { type: String, default: '' },
  email:       { type: String, default: '' },
  active:      { type: Boolean, default: true },   // super-admin can suspend
}, { timestamps: true });

export default mongoose.model('Shop', shopSchema);
