import crypto from 'crypto';
import OTP from '../models/OTP.js';

/**
 * OTP Service - Handles OTP lifecycle management
 * 
 * This service provides core functionality for:
 * - Generating cryptographically random 6-digit OTP codes
 * - Validating OTP codes with expiration checks
 * - Invalidating previous OTP codes
 * - Cleaning up expired OTP records
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 7.3
 */
class OTPService {
  /**
   * Generate a new OTP code for the given email
   * 
   * - Generates a cryptographically random 6-digit code using crypto.randomInt()
   * - Sets expiration time to 10 minutes from generation
   * - Invalidates any previously generated unexpired OTP codes for the user
   * 
   * @param {string} email - User's email address
   * @returns {Promise<{otp: string, expiresAt: Date}>} Generated OTP and expiration time
   * @throws {Error} If generation or database operation fails
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   */
  async generateOTP(email) {
    try {
      // Validate email input
      if (!email || typeof email !== 'string') {
        throw new Error('Valid email address is required');
      }

      // Invalidate any existing OTPs for this email
      await this.invalidateOTPs(email);

      // Generate cryptographically random 6-digit OTP using crypto.randomInt()
      // Range: 100000 to 999999 (inclusive)
      const otpCode = crypto.randomInt(100000, 1000000).toString();

      // Set expiration time to 10 minutes from now
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      const otpRecord = new OTP({
        email: email.toLowerCase().trim(),
        otp: otpCode,
        createdAt,
        expiresAt,
        validated: false,
        validationAttempts: 0
      });

      await otpRecord.save();

      return {
        otp: otpCode,
        expiresAt
      };
    } catch (error) {
      console.error('OTP generation failed:', {
        email: this.maskEmail(email),
        error: error.message
      });
      throw new Error(`Failed to generate OTP: ${error.message}`);
    }
  }

  /**
   * Validate an OTP code
   * 
   * Checks:
   * - OTP exists for the given email
   * - OTP has not expired
   * - OTP has not been previously validated
   * - OTP code matches the stored value
   * 
   * @param {string} email - User's email address
   * @param {string} otp - OTP code to validate
   * @returns {Promise<{valid: boolean, error?: string}>} Validation result
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async validateOTP(email, otp) {
    try {
      // Validate inputs
      if (!email || typeof email !== 'string') {
        return { valid: false, error: 'INVALID_EMAIL' };
      }

      if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
        return { valid: false, error: 'INVALID_OTP_FORMAT' };
      }

      // Find the most recent OTP for this email
      const otpRecord = await OTP.findOne({
        email: email.toLowerCase().trim(),
        validated: false
      }).sort({ createdAt: -1 });

      // Check if OTP exists
      if (!otpRecord) {
        return { valid: false, error: 'OTP_INVALID' };
      }

      // Increment validation attempts
      otpRecord.validationAttempts += 1;
      await otpRecord.save();

      // Check if OTP has expired (Requirement 3.2)
      const now = new Date();
      if (now > otpRecord.expiresAt) {
        return { valid: false, error: 'OTP_EXPIRED' };
      }

      // Check if OTP code matches (Requirement 3.3)
      if (otpRecord.otp !== otp) {
        return { valid: false, error: 'OTP_INVALID' };
      }

      // Mark OTP as validated (Requirement 3.4, 3.5)
      otpRecord.validated = true;
      otpRecord.validatedAt = now;
      await otpRecord.save();

      return { valid: true };
    } catch (error) {
      console.error('OTP validation failed:', {
        email: this.maskEmail(email),
        error: error.message
      });
      throw new Error(`Failed to validate OTP: ${error.message}`);
    }
  }

  /**
   * Invalidate all existing OTPs for an email
   * 
   * Marks all unexpired, unvalidated OTPs for the given email as validated
   * to prevent their use. This is called when generating a new OTP.
   * 
   * @param {string} email - User's email address
   * @returns {Promise<void>}
   * 
   * Requirement: 1.5
   */
  async invalidateOTPs(email) {
    try {
      if (!email || typeof email !== 'string') {
        throw new Error('Valid email address is required');
      }

      // Mark all existing unvalidated OTPs as validated
      await OTP.updateMany(
        {
          email: email.toLowerCase().trim(),
          validated: false
        },
        {
          $set: {
            validated: true,
            validatedAt: new Date()
          }
        }
      );
    } catch (error) {
      console.error('OTP invalidation failed:', {
        email: this.maskEmail(email),
        error: error.message
      });
      throw new Error(`Failed to invalidate OTPs: ${error.message}`);
    }
  }

  /**
   * Clean up expired OTP records
   * 
   * Removes OTP records that have been expired for more than 24 hours.
   * This helps maintain database efficiency by removing old records.
   * 
   * Note: MongoDB TTL index also handles automatic cleanup, but this method
   * provides manual cleanup capability for maintenance tasks.
   * 
   * @returns {Promise<number>} Number of records deleted
   * 
   * Requirement: 7.3
   */
  async cleanupExpiredOTPs() {
    try {
      // Calculate cutoff time (24 hours ago)
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Delete OTPs that expired more than 24 hours ago
      const result = await OTP.deleteMany({
        expiresAt: { $lt: cutoffTime }
      });

      console.log(`Cleaned up ${result.deletedCount} expired OTP records`);
      return result.deletedCount;
    } catch (error) {
      console.error('OTP cleanup failed:', {
        error: error.message
      });
      throw new Error(`Failed to cleanup expired OTPs: ${error.message}`);
    }
  }

  /**
   * Mask email address for privacy in logs
   * 
   * @param {string} email - Email address to mask
   * @returns {string} Masked email (e.g., "t***@example.com")
   * @private
   */
  maskEmail(email) {
    if (!email || typeof email !== 'string') {
      return '***';
    }

    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
      return '***';
    }

    const maskedLocal = localPart.charAt(0) + '***';
    return `${maskedLocal}@${domain}`;
  }
}

// Export singleton instance
export default new OTPService();
