import mongoose from 'mongoose';

// One subscription per shop. Status drives access; super-admin or Razorpay
// webhooks change it.
const subscriptionSchema = new mongoose.Schema({
  shopId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, unique: true },
  plan:         { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  status:       { type: String, enum: ['trial', 'active', 'past_due', 'expired', 'suspended'], default: 'trial' },
  trialEndsAt:      { type: Date },
  currentPeriodEnd: { type: Date },
  amount:       { type: Number, default: 0 },        // billed amount for the cycle
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  provider:     { type: String, enum: ['manual', 'razorpay'], default: 'manual' },
  razorpay: {
    customerId:     { type: String, default: '' },
    subscriptionId: { type: String, default: '' },
    lastPaymentId:  { type: String, default: '' },
  },
  lastPaymentAt: { type: Date },
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);
