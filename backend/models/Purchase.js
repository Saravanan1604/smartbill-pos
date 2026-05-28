import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  name:      { type: String, required: true },
  hsn:       { type: String, default: '' },
  batch:     { type: String, default: '' },
  expiry:    { type: String, default: '' },   // YYYY-MM-DD or MM/YY
  qty:       { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0 },
  mrp:       { type: Number, default: 0 },
  gst:       { type: Number, default: 0 },
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  shopId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  supplierName: { type: String, default: '' },
  invoiceNo:    { type: String, default: '' },
  date:         { type: String },   // YYYY-MM-DD
  items:        [purchaseItemSchema],
  total:        { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Purchase', purchaseSchema);
