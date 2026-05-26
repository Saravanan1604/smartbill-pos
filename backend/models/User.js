import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    // 'superadmin' = platform owner (you), belongs to no shop.
    enum: ['superadmin', 'admin', 'owner', 'employee', 'staff'],  // staff kept for backward compat
    default: 'employee'
  },
  // Tenant this user belongs to (null for the platform super-admin).
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    default: null
  },
  // Security question/answer for self-service password reset
  securityQuestion: {
    type: String,
    default: ''
  },
  securityAnswer: {
    type: String,  // stored as bcrypt hash
    default: ''
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
