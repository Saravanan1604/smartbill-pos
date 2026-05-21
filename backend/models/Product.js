import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple products to have no barcode
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  costPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  category: {
    type: String,
    trim: true,
    default: 'Uncategorized'
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  alertThreshold: {
    type: Number,
    default: 10,
    min: 0
  }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export default Product;
