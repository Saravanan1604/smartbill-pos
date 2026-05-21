import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  visitCount: {
    type: Number,
    default: 0
  },
  lastVisit: {
    type: Date
  }
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
