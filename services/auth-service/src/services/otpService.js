const crypto = require('crypto');
const config = require('../config');
const otpRepository = require('../repositories/otpRepository');
const { ValidationError, UnauthorizedError } = require('@logisphere/common-utils');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('auth-service:otpService');

class OtpService {
  /**
   * Generates a deterministic SHA-256 HMAC for the OTP
   */
  hashOtp(otp) {
    return crypto
      .createHmac('sha256', config.internalServiceKey)
      .update(String(otp).trim())
      .digest('hex');
  }

  /**
   * Secure timing-safe string comparison
   */
  safeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Sends an OTP via the Notification Service
   */
  async sendOtpEmail({ to, otp, fullName, purpose }) {
    const isPasswordReset = purpose === 'PASSWORD_RESET';
    const isStaffInvite = purpose === 'STAFF_INVITATION';

    let actionLabel = 'Account Verification';
    let heading = 'Account Verification';
    let subject = `LogiSphere Verification Code: ${otp}`;
    let introText = `Please use the 6-digit verification code below to complete your verification.`;

    if (isPasswordReset) {
      actionLabel = 'Password Reset';
      heading = 'Password Reset';
      subject = `LogiSphere Password Reset Code: ${otp}`;
      introText = `Please use the 6-digit code below to reset your password.`;
    } else if (isStaffInvite) {
      actionLabel = 'Driver Account Activation';
      heading = 'Welcome to LogiSphere Fleet!';
      subject = `LogiSphere Driver Activation Code: ${otp}`;
      introText = `You have been registered as a fleet driver on LogiSphere. Please use the 6-digit activation code below to activate your account and set your private password.`;
    }

    const text = `Hello ${fullName || ''},\n\n${introText}\n\nYour 6-digit code is: ${otp}\n\nThis code expires in 10 minutes.\n\nActivate online: http://localhost:3000/activate?email=${encodeURIComponent(to)}\n\nIf you were not expecting this invitation, please ignore this email.`;

    const html = `
      <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1e3a8a; font-size: 24px; margin: 0; font-weight: 700;">LogiSphere</h1>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Intelligent B2B2C Logistics Platform</p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
          <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 12px; font-weight: 600;">${heading}</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
            Hello${fullName ? ` <strong>${fullName}</strong>` : ''},<br>
            ${introText}
          </p>
          <div style="text-align: center; margin: 28px 0; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 20px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a; font-family: monospace;">
              ${otp}
            </span>
            <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0;">Valid for 10 minutes</p>
          </div>
          ${
            isStaffInvite
              ? `
          <div style="text-align: center; margin: 20px 0;">
            <a href="http://localhost:3000/activate?email=${encodeURIComponent(to)}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
              Activate Driver Account & Set Password &rarr;
            </a>
          </div>
          `
              : ''
          }
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 16px;">
            For your security, never share this code with anyone. If you did not request this verification, please safely disregard this email.
          </p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; margin-top: 24px; padding-top: 16px; text-align: center;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; 2026 LogiSphere Platform. All rights reserved.</p>
        </div>
      </div>
    `;

    // Try both /internal/notifications/email and /api/v1/internal/notifications/email
    const candidateUrls = [
      `${config.notificationServiceUrl}/internal/notifications/email`,
      `${config.notificationServiceUrl}/api/v1/internal/notifications/email`,
    ];

    let lastError = null;
    let dispatched = false;

    for (const url of candidateUrls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-service-key': config.internalServiceKey,
          },
          body: JSON.stringify({
            to,
            subject,
            text,
            html,
          }),
        });

        if (response.ok) {
          logger.info(`Verification code email successfully triggered for ${to} via ${url}`);
          dispatched = true;
          break;
        } else if (response.status !== 404) {
          const errorText = await response.text();
          lastError = new Error(`Notification Service error [${response.status}]: ${errorText}`);
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!dispatched) {
      if (config.env === 'test' || process.env.NODE_ENV === 'test') {
        logger.info(`[TEST MODE] Notification service dispatch bypassed for ${to}`);
        return;
      }
      logger.error(`Failed to reach Notification Service for OTP dispatch: ${lastError ? lastError.message : 'Unknown'}`);
      throw new Error(`Email verification dispatch failed: ${lastError ? lastError.message : 'Service unreachable'}`);
    }
  }

  /**
   * Generates, stores, and emails a new secure 6-digit OTP
   */
  async generateAndSendOtp(email, purpose = 'REGISTRATION', fullName = '') {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Enforce 60-second cooldown rate limiting between resends
    const latest = await otpRepository.findLatestOtp(normalizedEmail, purpose);
    if (latest && !latest.consumedAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const remaining = 60 - elapsedSeconds;
        throw new ValidationError(
          `Please wait ${remaining} second${remaining === 1 ? '' : 's'} before requesting a new code.`,
          'OTP_COOLDOWN'
        );
      }
    }

    // 2. Invalidate any existing active OTPs for this email/purpose
    await otpRepository.invalidatePriorOtps(normalizedEmail, purpose);

    // 3. Generate 6-digit cryptographically secure numeric OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = this.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 4. Save hashed OTP record in database
    await otpRepository.createOtp({
      email: normalizedEmail,
      otpHash,
      purpose,
      expiresAt,
      maxAttempts: 5,
    });

    // 5. Dispatch the email via Notification Service
    await this.sendOtpEmail({
      to: normalizedEmail,
      otp: rawOtp,
      fullName,
      purpose,
    });

    logger.info(`Generated and dispatched secure OTP for ${normalizedEmail} [purpose: ${purpose}]`);

    return {
      success: true,
      email: normalizedEmail,
      expiresAt,
      cooldownSeconds: 60,
    };
  }

  /**
   * Verifies an OTP against stored hash, enforcing expiration and attempt limits
   */
  async verifyOtp(email, otp, purpose = 'REGISTRATION') {
    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp || '').trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new ValidationError('Please enter a valid 6-digit verification code.', 'INVALID_OTP_FORMAT');
    }

    // 1. Locate active unconsumed OTP
    const record = await otpRepository.findLatestActiveOtp(normalizedEmail, purpose);
    if (!record) {
      throw new ValidationError(
        'No active verification code found for this email, or the code has expired. Please request a new one.',
        'OTP_EXPIRED_OR_NOT_FOUND'
      );
    }

    // 2. Check expiration
    if (new Date() > new Date(record.expiresAt)) {
      await otpRepository.consumeOtp(record.id);
      throw new ValidationError(
        'Verification code has expired. Please request a new one.',
        'OTP_EXPIRED'
      );
    }

    // 3. Increment and verify attempt limit
    const updatedRecord = await otpRepository.incrementAttempts(record.id);
    if (updatedRecord.attempts > updatedRecord.maxAttempts) {
      await otpRepository.consumeOtp(record.id);
      throw new ValidationError(
        'Too many invalid attempts. For your security, this code has been revoked. Please request a new one.',
        'OTP_MAX_ATTEMPTS_EXCEEDED'
      );
    }

    // 4. Constant-time timing-safe hash comparison
    const incomingHash = this.hashOtp(cleanOtp);
    const isMatch = this.safeCompare(incomingHash, record.otpHash);

    if (!isMatch) {
      const remainingAttempts = Math.max(0, updatedRecord.maxAttempts - updatedRecord.attempts);
      throw new ValidationError(
        `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
        'OTP_MISMATCH'
      );
    }

    // 5. Success: Consume OTP immediately
    await otpRepository.consumeOtp(record.id);
    logger.info(`Successfully verified OTP for ${normalizedEmail} [purpose: ${purpose}]`);

    return { success: true };
  }
}

module.exports = new OtpService();
