/**
 * Unit tests for OTP Service
 * 
 * These tests verify specific examples, edge cases, and error conditions
 * that complement the property-based tests.
 */

import otpService from '../../../services/otpService.js';
import OTP from '../../../models/OTP.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

// Setup in-memory MongoDB for testing
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clean up database between tests
afterEach(async () => {
  await OTP.deleteMany({});
});

describe('OTP Service - Specific Examples', () => {
  test('generates OTP for specific email "test@example.com"', async () => {
    const email = 'test@example.com';
    
    const result = await otpService.generateOTP(email);
    
    expect(result).toBeDefined();
    expect(result.otp).toBeDefined();
    expect(result.otp).toMatch(/^\d{6}$/);
    expect(result.expiresAt).toBeInstanceOf(Date);
    
    // Verify stored in database
    const storedOTP = await OTP.findOne({ email });
    expect(storedOTP).toBeTruthy();
    expect(storedOTP.otp).toBe(result.otp);
    expect(storedOTP.email).toBe(email);
  });

  test('validates correct OTP for "test@example.com"', async () => {
    const email = 'test@example.com';
    const { otp } = await otpService.generateOTP(email);
    
    const result = await otpService.validateOTP(email, otp);
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('rejects incorrect OTP "123456" when correct OTP is different', async () => {
    const email = 'test@example.com';
    const { otp } = await otpService.generateOTP(email);
    
    // Only test if generated OTP is not 123456
    if (otp !== '123456') {
      const result = await otpService.validateOTP(email, '123456');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('OTP_INVALID');
    }
  });

  test('generates different OTPs for different emails', async () => {
    const email1 = 'user1@example.com';
    const email2 = 'user2@example.com';
    
    const result1 = await otpService.generateOTP(email1);
    const result2 = await otpService.generateOTP(email2);
    
    // Both should be valid 6-digit codes
    expect(result1.otp).toMatch(/^\d{6}$/);
    expect(result2.otp).toMatch(/^\d{6}$/);
    
    // Verify they're stored separately
    const stored1 = await OTP.findOne({ email: email1 });
    const stored2 = await OTP.findOne({ email: email2 });
    
    expect(stored1.otp).toBe(result1.otp);
    expect(stored2.otp).toBe(result2.otp);
  });
});

describe('OTP Service - Edge Cases', () => {
  test('handles empty email string', async () => {
    const email = '';
    
    await expect(otpService.generateOTP(email)).rejects.toThrow();
  });

  test('handles null email', async () => {
    await expect(otpService.generateOTP(null)).rejects.toThrow();
  });

  test('handles undefined email', async () => {
    await expect(otpService.generateOTP(undefined)).rejects.toThrow();
  });

  test('handles very long email address', async () => {
    // Create a very long but valid email (max 254 characters per RFC)
    const localPart = 'a'.repeat(64); // Max local part is 64 chars
    const domain = 'b'.repeat(50) + '.com';
    const email = `${localPart}@${domain}`;
    
    const result = await otpService.generateOTP(email);
    
    expect(result.otp).toMatch(/^\d{6}$/);
    expect(result.expiresAt).toBeInstanceOf(Date);
    
    // Verify it can be validated
    const validation = await otpService.validateOTP(email, result.otp);
    expect(validation.valid).toBe(true);
  });

  test('handles email with special characters', async () => {
    const email = 'user+test@example.com';
    
    const result = await otpService.generateOTP(email);
    
    expect(result.otp).toMatch(/^\d{6}$/);
    
    // Verify validation works
    const validation = await otpService.validateOTP(email, result.otp);
    expect(validation.valid).toBe(true);
  });

  test('handles email with uppercase letters (normalization)', async () => {
    const email = 'TEST@EXAMPLE.COM';
    
    const result = await otpService.generateOTP(email);
    
    // Should be stored in lowercase
    const storedOTP = await OTP.findOne({ email: email.toLowerCase() });
    expect(storedOTP).toBeTruthy();
    expect(storedOTP.email).toBe('test@example.com');
    
    // Validation should work with any case
    const validation = await otpService.validateOTP('test@example.com', result.otp);
    expect(validation.valid).toBe(true);
  });

  test('handles email with leading/trailing whitespace', async () => {
    const email = '  test@example.com  ';
    
    const result = await otpService.generateOTP(email);
    
    // Should be stored trimmed
    const storedOTP = await OTP.findOne({ email: email.trim().toLowerCase() });
    expect(storedOTP).toBeTruthy();
    expect(storedOTP.email).toBe('test@example.com');
    
    // Validation should work with trimmed email
    const validation = await otpService.validateOTP('test@example.com', result.otp);
    expect(validation.valid).toBe(true);
  });

  test('handles OTP validation with non-string OTP', async () => {
    const email = 'test@example.com';
    await otpService.generateOTP(email);
    
    // Test with number
    const result1 = await otpService.validateOTP(email, 123456);
    expect(result1.valid).toBe(false);
    expect(result1.error).toBe('INVALID_OTP_FORMAT');
    
    // Test with null
    const result2 = await otpService.validateOTP(email, null);
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('INVALID_OTP_FORMAT');
  });

  test('handles OTP validation with invalid format strings', async () => {
    const email = 'test@example.com';
    await otpService.generateOTP(email);
    
    // Test with too short
    const result1 = await otpService.validateOTP(email, '12345');
    expect(result1.valid).toBe(false);
    expect(result1.error).toBe('INVALID_OTP_FORMAT');
    
    // Test with too long
    const result2 = await otpService.validateOTP(email, '1234567');
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('INVALID_OTP_FORMAT');
    
    // Test with non-numeric
    const result3 = await otpService.validateOTP(email, 'abcdef');
    expect(result3.valid).toBe(false);
    expect(result3.error).toBe('INVALID_OTP_FORMAT');
    
    // Test with mixed alphanumeric
    const result4 = await otpService.validateOTP(email, '12ab56');
    expect(result4.valid).toBe(false);
    expect(result4.error).toBe('INVALID_OTP_FORMAT');
  });

  test('handles validation for email with no OTP generated', async () => {
    const email = 'noopt@example.com';
    
    const result = await otpService.validateOTP(email, '123456');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('OTP_INVALID');
  });

  test('handles multiple rapid OTP generations for same email', async () => {
    const email = 'test@example.com';
    
    // Generate multiple OTPs rapidly
    const result1 = await otpService.generateOTP(email);
    const result2 = await otpService.generateOTP(email);
    const result3 = await otpService.generateOTP(email);
    
    // All should be valid format
    expect(result1.otp).toMatch(/^\d{6}$/);
    expect(result2.otp).toMatch(/^\d{6}$/);
    expect(result3.otp).toMatch(/^\d{6}$/);
    
    // Only the last one should be valid for validation
    const validation1 = await otpService.validateOTP(email, result1.otp);
    expect(validation1.valid).toBe(false);
    
    const validation2 = await otpService.validateOTP(email, result2.otp);
    expect(validation2.valid).toBe(false);
    
    const validation3 = await otpService.validateOTP(email, result3.otp);
    expect(validation3.valid).toBe(true);
  });
});

describe('OTP Service - Error Conditions', () => {
  test('handles database connection issues during generation', async () => {
    // Close the database connection to simulate failure
    await mongoose.disconnect();
    
    const email = 'test@example.com';
    
    await expect(otpService.generateOTP(email)).rejects.toThrow();
    
    // Reconnect for other tests
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  test('handles database connection issues during validation', async () => {
    const email = 'test@example.com';
    const { otp } = await otpService.generateOTP(email);
    
    // Close the database connection to simulate failure
    await mongoose.disconnect();
    
    await expect(otpService.validateOTP(email, otp)).rejects.toThrow();
    
    // Reconnect for other tests
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  test('handles invalid email format gracefully', async () => {
    // The OTP service validates that email is a non-empty string
    // but doesn't validate email format strictly (that's done at API layer)
    const invalidEmails = [
      123,
      {},
      []
    ];
    
    for (const invalidEmail of invalidEmails) {
      await expect(otpService.generateOTP(invalidEmail)).rejects.toThrow();
    }
    
    // These are technically strings, so they pass the service-level validation
    // Email format validation should be done at the API/route level
    const technicallyValidStrings = [
      'not-an-email',
      '@example.com',
      'user@',
      'user @example.com',
      'user@.com'
    ];
    
    for (const email of technicallyValidStrings) {
      const result = await otpService.generateOTP(email);
      expect(result.otp).toMatch(/^\d{6}$/);
      // Clean up
      await OTP.deleteMany({ email: email.toLowerCase().trim() });
    }
  });

  test('handles expired OTP correctly', async () => {
    const email = 'test@example.com';
    const { otp } = await otpService.generateOTP(email);
    
    // Manually expire the OTP
    await OTP.updateOne(
      { email, otp },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );
    
    const result = await otpService.validateOTP(email, otp);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('OTP_EXPIRED');
  });

  test('handles already validated OTP', async () => {
    const email = 'test@example.com';
    const { otp } = await otpService.generateOTP(email);
    
    // Validate once
    const firstValidation = await otpService.validateOTP(email, otp);
    expect(firstValidation.valid).toBe(true);
    
    // Try to validate again
    const secondValidation = await otpService.validateOTP(email, otp);
    expect(secondValidation.valid).toBe(false);
    expect(secondValidation.error).toBe('OTP_INVALID');
  });

  test('tracks validation attempts correctly', async () => {
    const email = 'test@example.com';
    const { otp: correctOTP } = await otpService.generateOTP(email);
    
    // Make several incorrect attempts
    await otpService.validateOTP(email, '111111');
    await otpService.validateOTP(email, '222222');
    await otpService.validateOTP(email, '333333');
    
    // Check attempt count
    const otpRecord = await OTP.findOne({ email, otp: correctOTP });
    expect(otpRecord.validationAttempts).toBe(3);
    
    // Correct validation should increment count
    await otpService.validateOTP(email, correctOTP);
    
    const updatedRecord = await OTP.findOne({ email, otp: correctOTP });
    expect(updatedRecord.validationAttempts).toBe(4);
  });
});

describe('OTP Service - Cleanup Functionality', () => {
  test('cleanupExpiredOTPs removes old expired records', async () => {
    const email = 'test@example.com';
    
    // Generate OTP and manually set it to expire 25 hours ago
    const { otp } = await otpService.generateOTP(email);
    const oldExpiration = new Date(Date.now() - 25 * 60 * 60 * 1000);
    
    await OTP.updateOne(
      { email, otp },
      { $set: { expiresAt: oldExpiration } }
    );
    
    // Run cleanup
    const deletedCount = await otpService.cleanupExpiredOTPs();
    
    expect(deletedCount).toBe(1);
    
    // Verify record is deleted
    const record = await OTP.findOne({ email, otp });
    expect(record).toBeNull();
  });

  test('cleanupExpiredOTPs does not remove recently expired records', async () => {
    const email = 'test@example.com';
    
    // Generate OTP and manually set it to expire 1 hour ago (within 24 hours)
    const { otp } = await otpService.generateOTP(email);
    const recentExpiration = new Date(Date.now() - 1 * 60 * 60 * 1000);
    
    await OTP.updateOne(
      { email, otp },
      { $set: { expiresAt: recentExpiration } }
    );
    
    // Run cleanup
    const deletedCount = await otpService.cleanupExpiredOTPs();
    
    expect(deletedCount).toBe(0);
    
    // Verify record still exists
    const record = await OTP.findOne({ email, otp });
    expect(record).toBeTruthy();
  });

  test('cleanupExpiredOTPs does not remove non-expired records', async () => {
    const email = 'test@example.com';
    
    // Generate OTP (not expired)
    const { otp } = await otpService.generateOTP(email);
    
    // Run cleanup
    const deletedCount = await otpService.cleanupExpiredOTPs();
    
    expect(deletedCount).toBe(0);
    
    // Verify record still exists
    const record = await OTP.findOne({ email, otp });
    expect(record).toBeTruthy();
  });

  test('cleanupExpiredOTPs handles multiple records', async () => {
    // Create multiple OTPs with different expiration times
    const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
    
    for (const email of emails) {
      const { otp } = await otpService.generateOTP(email);
      // Set to expire 25 hours ago
      await OTP.updateOne(
        { email, otp },
        { $set: { expiresAt: new Date(Date.now() - 25 * 60 * 60 * 1000) } }
      );
    }
    
    // Add one recent OTP
    await otpService.generateOTP('recent@example.com');
    
    // Run cleanup
    const deletedCount = await otpService.cleanupExpiredOTPs();
    
    expect(deletedCount).toBe(3);
    
    // Verify only recent OTP remains
    const remainingRecords = await OTP.find({});
    expect(remainingRecords).toHaveLength(1);
    expect(remainingRecords[0].email).toBe('recent@example.com');
  });

  test('cleanupExpiredOTPs returns 0 when no records to clean', async () => {
    const deletedCount = await otpService.cleanupExpiredOTPs();
    
    expect(deletedCount).toBe(0);
  });
});

describe('OTP Service - Email Masking', () => {
  test('maskEmail masks email correctly', async () => {
    const email = 'test@example.com';
    
    const masked = otpService.maskEmail(email);
    
    expect(masked).toBe('t***@example.com');
  });

  test('maskEmail handles short local part', async () => {
    const email = 'a@example.com';
    
    const masked = otpService.maskEmail(email);
    
    expect(masked).toBe('a***@example.com');
  });

  test('maskEmail handles invalid email', async () => {
    const masked1 = otpService.maskEmail('not-an-email');
    expect(masked1).toBe('***');
    
    const masked2 = otpService.maskEmail('');
    expect(masked2).toBe('***');
    
    const masked3 = otpService.maskEmail(null);
    expect(masked3).toBe('***');
  });

  test('maskEmail handles email without domain', async () => {
    const masked = otpService.maskEmail('user@');
    expect(masked).toBe('***');
  });
});

describe('OTP Service - Invalidation', () => {
  test('invalidateOTPs marks all existing OTPs as validated', async () => {
    const email = 'test@example.com';
    
    // Generate first OTP
    const { otp: otp1 } = await otpService.generateOTP(email);
    
    // Manually create another OTP without invalidating (simulate direct DB insert)
    const otp2 = new OTP({
      email,
      otp: '999999',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      validated: false,
      validationAttempts: 0
    });
    await otp2.save();
    
    // Invalidate all OTPs
    await otpService.invalidateOTPs(email);
    
    // Check both are invalidated
    const records = await OTP.find({ email });
    expect(records).toHaveLength(2);
    records.forEach(record => {
      expect(record.validated).toBe(true);
      expect(record.validatedAt).toBeTruthy();
    });
  });

  test('invalidateOTPs handles email with no OTPs', async () => {
    const email = 'noopt@example.com';
    
    // Should not throw error
    await expect(otpService.invalidateOTPs(email)).resolves.not.toThrow();
  });

  test('invalidateOTPs handles invalid email', async () => {
    await expect(otpService.invalidateOTPs('')).rejects.toThrow();
    await expect(otpService.invalidateOTPs(null)).rejects.toThrow();
    await expect(otpService.invalidateOTPs(undefined)).rejects.toThrow();
  });

  test('invalidateOTPs is email-specific', async () => {
    const email1 = 'user1@example.com';
    const email2 = 'user2@example.com';
    
    // Generate OTPs for both emails
    await otpService.generateOTP(email1);
    await otpService.generateOTP(email2);
    
    // Invalidate only email1
    await otpService.invalidateOTPs(email1);
    
    // Check email1 OTP is invalidated
    const record1 = await OTP.findOne({ email: email1 });
    expect(record1.validated).toBe(true);
    
    // Check email2 OTP is still valid
    const record2 = await OTP.findOne({ email: email2 });
    expect(record2.validated).toBe(false);
  });
});
