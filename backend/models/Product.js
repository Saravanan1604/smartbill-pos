import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  shopId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', index: true },
  name:           { type: String, required: true, trim: true },
  // Barcode is unique PER SHOP (compound index below), not globally.
  barcode:        { type: String, sparse: true, trim: true },
  price:          { type: Number, required: true, min: 0 },
  costPrice:      { type: Number, default: 0, min: 0 },
  stock:          { type: Number, required: true, default: 0 },
  category:       { type: String, trim: true, default: 'Uncategorized' },
  tax:            { type: Number, default: 0, min: 0 },
  alertThreshold: { type: Number, default: 10, min: 0 },
  // ── New fields ──────────────────────────────────────────────────────────────
  unit:           { type: String, default: 'pcs', trim: true },   // pcs / kg / L / ml / g / box
  expiryDate:     { type: Date, default: null },
  supplier:       { type: String, default: '', trim: true },
  description:    { type: String, default: '', trim: true },
  minOrderQty:    { type: Number, default: 1, min: 1 },           // reorder point
}, { timestamps: true });

// Barcode unique within a shop only (allows different shops to reuse codes)
productSchema.index({ shopId: 1, barcode: 1 }, { unique: true, sparse: true });

const Product = mongoose.model('Product', productSchema);
export default Product;
