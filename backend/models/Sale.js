import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
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
  invoiceNo: {
    type: String,
    required: true,
    unique: true
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
  }
}, { timestamps: true });

const Sale = mongoose.model('Sale', saleSchema);
export default Sale;
