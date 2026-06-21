import mongoose from 'mongoose';

/**
 * OTP Schema for Email Verification
 * 
 * This schema stores One-Time Password codes for email verification with the following features:
 * - Automatic expiration after 10 minutes
 * - TTL index for automatic cleanup after 24 hours
 * - Validation attempt tracking
 * - Single-use enforcement through validated flag
 * 
 * Requirements: 7.1, 7.2, 7.4, 7.5
 */
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
    trim: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  validated: {
    type: Boolean,
    default: false
  },
  validationAttempts: {
    type: Number,
    default: 0
  },
  validatedAt: {
    type: Date,
    default: null
  }
});

// TTL index for automatic cleanup - removes documents 24 hours after expiration
// This ensures expired OTP records don't accumulate in the database
// Requirement 7.2, 7.5
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

const OTP = mongoose.model('OTP', otpSchema, 'otps');

export default OTP;
