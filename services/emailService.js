import nodemailer from 'nodemailer';

/**
 * Email Service - Handles sending OTP codes via Gmail SMTP
 * 
 * This service provides functionality for:
 * - Configuring nodemailer with Gmail SMTP
 * - Sending OTP emails with proper formatting
 * - Verifying SMTP configuration on startup
 * - Handling email delivery failures gracefully
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.emailUser = process.env.EMAIL_USER;
    this.emailPass = process.env.EMAIL_PASS;
    this.isConfigured = false;

    // Initialize transporter if credentials are available
    if (this.emailUser && this.emailPass) {
      this.initializeTransporter();
    } else {
      console.warn('Email service not configured: EMAIL_USER and EMAIL_PASS environment variables are required');
    }
  }

  /**
   * Initialize nodemailer transporter with Gmail SMTP configuration
   * 
   * Uses TLS encryption for secure connection
   * 
   * @private
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.emailUser,
          pass: this.emailPass
        },
        secure: true, // Use TLS
        tls: {
          rejectUnauthorized: true
        }
      });

      this.isConfigured = true;
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error.message);
      throw new Error('SMTP_CONFIG_ERROR');
    }
  }

  /**
   * Verify SMTP configuration on application startup
   * 
   * Tests the connection to Gmail SMTP server to ensure
   * credentials are valid and the service is ready to send emails.
   * 
   * @returns {Promise<boolean>} True if configuration is valid
   * @throws {Error} If SMTP configuration is invalid
   * 
   * Requirement: 6.3
   */
  async verifyConfiguration() {
    if (!this.isConfigured || !this.transporter) {
      throw new Error('SMTP_NOT_CONFIGURED');
    }

    try {
      await this.transporter.verify();
      console.log('SMTP configuration verified successfully');
      return true;
    } catch (error) {
      console.error('SMTP configuration verification failed:', error.message);
      throw new Error('INVALID_SMTP_CREDENTIALS');
    }
  }

  /**
   * Send OTP email to user
   * 
   * Formats and sends an email containing:
   * - Subject: "Document Verification OTP"
   * - OTP code
   * - Expiration time in user-friendly format
   * - Security warning about not sharing OTP
   * 
   * @param {string} email - Recipient email address
   * @param {string} otp - 6-digit OTP code
   * @param {Date} expiresAt - Expiration timestamp
   * @returns {Promise<{success: boolean, messageId?: string}>}
   * @throws {Error} If email delivery fails
   * 
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.5
   */
  async sendOTPEmail(email, otp, expiresAt) {
    if (!this.isConfigured || !this.transporter) {
      throw new Error('EMAIL_DELIVERY_FAILED: Email service is not configured');
    }

    // Validate inputs
    if (!email || typeof email !== 'string') {
      throw new Error('INVALID_EMAIL');
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      throw new Error('INVALID_OTP_FORMAT');
    }

    if (!expiresAt || !(expiresAt instanceof Date)) {
      throw new Error('Invalid expiration time');
    }

    try {
      // Format expiration time in user-friendly way
      const expirationMinutes = Math.ceil((expiresAt - new Date()) / (60 * 1000));
      const expirationTime = this.formatExpirationTime(expiresAt);

      // Compose email
      const mailOptions = {
        from: `"Document Verification" <${this.emailUser}>`,
        to: email,
        subject: 'Document Verification OTP',
        html: this.generateEmailHTML(otp, expirationTime, expirationMinutes),
        text: this.generateEmailText(otp, expirationTime)
      };

      // Send email (Requirement 2.1 - within 5 seconds)
      const info = await this.transporter.sendMail(mailOptions);

      console.log('OTP email sent successfully:', {
        email: this.maskEmail(email),
        messageId: info.messageId
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Email delivery failed:', {
        email: this.maskEmail(email),
        error: error.message
      });
      throw new Error('EMAIL_DELIVERY_FAILED');
    }
  }

  /**
   * Generate HTML email body
   * 
   * @param {string} otp - OTP code
   * @param {string} expirationTime - Formatted expiration time
   * @param {number} expirationMinutes - Minutes until expiration
   * @returns {string} HTML email content
   * @private
   */
  generateEmailHTML(otp, expirationTime, expirationMinutes) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .otp-code {
            background-color: #007bff;
            color: white;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            padding: 20px;
            text-align: center;
            border-radius: 8px;
            margin: 20px 0;
          }
          .info {
            background-color: #fff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Document Verification OTP</h1>
          </div>
          
          <p>Hello,</p>
          
          <p>You have requested to verify your identity for document verification. Please use the following One-Time Password (OTP) to complete the verification process:</p>
          
          <div class="otp-code">
            ${otp}
          </div>
          
          <div class="info">
            <p><strong>⏰ Expiration Time:</strong> ${expirationTime}</p>
            <p><strong>⏳ Valid for:</strong> ${expirationMinutes} minutes</p>
          </div>
          
          <div class="warning">
            <p><strong>⚠️ Security Warning:</strong></p>
            <ul>
              <li>Never share this OTP with anyone</li>
              <li>Our team will never ask for your OTP</li>
              <li>This code is valid for ${expirationMinutes} minutes only</li>
              <li>If you didn't request this OTP, please ignore this email</li>
            </ul>
          </div>
          
          <p>If you have any questions or concerns, please contact our support team.</p>
          
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Document Verification Portal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email body
   * 
   * @param {string} otp - OTP code
   * @param {string} expirationTime - Formatted expiration time
   * @returns {string} Plain text email content
   * @private
   */
  generateEmailText(otp, expirationTime) {
    return `
Document Verification OTP

Hello,

You have requested to verify your identity for document verification. Please use the following One-Time Password (OTP) to complete the verification process:

OTP CODE: ${otp}

Expiration Time: ${expirationTime}

SECURITY WARNING:
- Never share this OTP with anyone
- Our team will never ask for your OTP
- This code is valid for 10 minutes only
- If you didn't request this OTP, please ignore this email

If you have any questions or concerns, please contact our support team.

This is an automated message, please do not reply to this email.

© ${new Date().getFullYear()} Document Verification Portal. All rights reserved.
    `.trim();
  }

  /**
   * Format expiration time in user-friendly way
   * 
   * @param {Date} expiresAt - Expiration timestamp
   * @returns {string} Formatted time string
   * @private
   */
  formatExpirationTime(expiresAt) {
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    };

    return expiresAt.toLocaleString('en-US', options);
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
export default new EmailService();
