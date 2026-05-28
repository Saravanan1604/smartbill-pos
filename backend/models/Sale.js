import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  // Stored as a string: a product's id, OR a 'quick-...' id for one-off items
  // that aren't catalogue products.
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  qty: {
    type: Number,
    required: true,
    min: 1
  },
  taxAmt: {
    type: Number,
    required: true,
    default: 0
  },
  total: {
    type: Number,
    required: true
  }
});

const saleSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', index: true },
  // Unique PER SHOP (compound index below), so each shop has its own INV0001…
  invoiceNo: {
    type: String,
    required: true
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    required: true,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  profit: {
    type: Number,
    required: true,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Card'],
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  date: {
    type: String,
    required: true // Format YYYY-MM-DD
  },
  // Soft-delete: when set, the invoice is in the "recycle bin" and excluded
  // from sales/reports until recovered.
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

saleSchema.index({ shopId: 1, invoiceNo: 1 }, { unique: true });
saleSchema.index({ shopId: 1, date: 1 });

const Sale = mongoose.model('Sale', saleSchema);
export default Sale;
