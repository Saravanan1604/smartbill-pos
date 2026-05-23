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
    enum: ['admin', 'staff'],
    default: 'staff'
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
