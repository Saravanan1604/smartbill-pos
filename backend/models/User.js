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
    enum: ['admin', 'owner', 'employee', 'staff'],  // staff kept for backward compat
    default: 'employee'
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
