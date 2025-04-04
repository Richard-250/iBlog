import mongoose from 'mongoose';
// import { generateAuthToken, generateResetPasswordToken, generateVerificationToken } from '../utils/genToken.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import crypto from "crypto"

// Base User Schema
const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  phoneNumber: {
    type: String,
    trim: true,
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'parent', 'admin'],
    required: true,
    default: 'teacher'
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  twoFactorTempToken: String,
  twoFactorTempExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  googleId: String,
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    theme: {
      type: String,
      default: 'light',
    }
  },
}, {
  timestamps: true,
  discriminatorKey: 'userType',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await hashPassword(this.password);
    next();
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
    return comparePassword(candidatePassword, this.password);
};

// Generate verification token
UserSchema.methods.createEmailVerificationToken = function() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
      
    // Token expires in 24 hours
    this.emailVerificationExpires = Date.now() + 2 * 60 * 60 *1000;
    
    return verificationToken;
  };

// Generate password reset token
UserSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
      
    // Token expires in 10 minutes
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    
    return resetToken;
  };

// Create two-factor temporary token
UserSchema.methods.createTwoFactorTempToken = function() {
    const tempToken = crypto.randomBytes(32).toString('hex');
    
    this.twoFactorTempToken = crypto
      .createHash('sha256')
      .update(tempToken)
      .digest('hex');
      
    // Token expires in 10 minutes
    this.twoFactorTempExpires = Date.now() + 10 * 60 * 1000;
    
    return tempToken;
  };

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.index({ phoneNumber: 1 }); // Optimizes searches by phone number
UserSchema.index({ isActive: 1 }); // Helps filter active users faster


const User = mongoose.model('User', UserSchema);

export default User;