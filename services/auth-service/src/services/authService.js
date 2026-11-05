const userRepository = require('../repositories/userRepository');
const tokenRepository = require('../repositories/tokenRepository');
const auditRepository = require('../repositories/auditRepository');
const otpService = require('./otpService');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { generateAccessToken, generateRefreshToken, hashToken } = require('../utils/tokenUtils');
const {
  ConflictError,
  UnauthorizedError,
  ValidationError,
  NotFoundError,
} = require('@logisphere/common-utils');
const prisma = require('../database/prisma');

class AuthService {
  async registerCustomer(data) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      if (existing.isEmailVerified) {
        throw new ConflictError(
          'An account with this email already exists',
          'EMAIL_ALREADY_REGISTERED'
        );
      }

      // Existing unverified account: update details, password, and resend OTP
      const passwordHash = await hashPassword(data.password);
      await userRepository.updateUser(existing.id, {
        passwordHash,
        fullName: data.fullName,
        phone: data.phone || null,
        accountType: data.accountType || 'INDIVIDUAL',
        businessName: data.accountType === 'BUSINESS' ? data.businessName : null,
        taxIdentifier: data.accountType === 'BUSINESS' ? data.taxIdentifier : null,
      });

      await otpService.generateAndSendOtp(existing.email, 'REGISTRATION', data.fullName);

      return {
        user: {
          id: existing.id,
          email: existing.email,
          fullName: data.fullName,
          role: existing.role,
          accountType: existing.accountType,
          isEmailVerified: false,
        },
        requiresVerification: true,
        message: 'Account exists but unverified. A new 6-digit verification code has been sent to your email.',
      };
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await userRepository.createUser(
        {
          email: data.email,
          passwordHash,
          fullName: data.fullName,
          phone: data.phone,
          role: 'CUSTOMER',
          accountType: data.accountType || 'INDIVIDUAL',
          businessName: data.accountType === 'BUSINESS' ? data.businessName : null,
          taxIdentifier: data.accountType === 'BUSINESS' ? data.taxIdentifier : null,
          isEmailVerified: false,
          isActive: true,
        },
        tx
      );

      await auditRepository.recordAction(
        {
          actorId: newUser.id,
          action: 'CUSTOMER_REGISTERED',
          targetType: 'User',
          targetId: newUser.id,
          metadata: { accountType: newUser.accountType },
        },
        tx
      );

      return newUser;
    });

    // Generate and dispatch real email OTP
    await otpService.generateAndSendOtp(user.email, 'REGISTRATION', user.fullName);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        accountType: user.accountType,
        isEmailVerified: false,
      },
      requiresVerification: true,
      message: 'Registration initiated. A 6-digit verification code has been sent to your email.',
    };
  }

  async verifyOtp(email, otp, purpose = 'REGISTRATION') {
    await otpService.verifyOtp(email, otp, purpose);

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User account not found', 'USER_NOT_FOUND');
    }

    if (purpose === 'REGISTRATION') {
      await userRepository.updateUser(user.id, {
        isEmailVerified: true,
        isActive: true,
      });

      await auditRepository.recordAction({
        actorId: user.id,
        action: 'EMAIL_VERIFIED',
        targetType: 'User',
        targetId: user.id,
      });

      const activeMembership =
        user.memberships && user.memberships.length > 0 ? user.memberships[0] : null;

      const tokenPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        accountType: user.accountType,
        organizationId: activeMembership ? activeMembership.organizationId : null,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const { rawToken, tokenHash, expiresAt } = generateRefreshToken();
      await tokenRepository.saveRefreshToken(user.id, tokenHash, expiresAt);

      return {
        success: true,
        message: 'Email verified successfully. Welcome to LogiSphere!',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          accountType: user.accountType,
          isEmailVerified: true,
        },
        tokens: {
          accessToken,
          refreshToken: rawToken,
        },
      };
    }

    return { success: true, message: 'Verification code confirmed.' };
  }

  async resendOtp(email, purpose = 'REGISTRATION') {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError('No account found with this email', 'USER_NOT_FOUND');
    }

    if (purpose === 'REGISTRATION' && user.isEmailVerified) {
      throw new ValidationError(
        'This email is already verified. You can log in directly.',
        'ALREADY_VERIFIED'
      );
    }

    const result = await otpService.generateAndSendOtp(user.email, purpose, user.fullName);
    return {
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
      ...result,
    };
  }

  async requestPasswordReset(email) {
    const user = await userRepository.findByEmail(email);
    if (user) {
      await otpService.generateAndSendOtp(user.email, 'PASSWORD_RESET', user.fullName);
    }
    // Generic response to avoid email enumeration
    return {
      success: true,
      message: 'If an account exists with this email, a 6-digit password reset code has been sent.',
    };
  }

  async resetPassword(email, otp, newPassword) {
    await otpService.verifyOtp(email, otp, 'PASSWORD_RESET');

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User account not found', 'USER_NOT_FOUND');
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updateUser(user.id, {
      passwordHash,
      mustChangePassword: false,
    });

    await tokenRepository.revokeAllUserTokens(user.id);

    await auditRepository.recordAction({
      actorId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      targetType: 'User',
      targetId: user.id,
    });

    return {
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    };
  }

  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account has been deactivated', 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Enforce email verification for all self-registered users (Platform admin bootstrap & staff bypass)
    if (
      !user.isEmailVerified &&
      user.role !== 'PLATFORM_ADMIN' &&
      !user.mustChangePassword
    ) {
      throw new UnauthorizedError(
        'Your email address has not been verified yet. Please enter the verification code sent to your email.',
        'EMAIL_NOT_VERIFIED'
      );
    }

    const activeMembership =
      user.memberships && user.memberships.length > 0 ? user.memberships[0] : null;

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      organizationId: activeMembership ? activeMembership.organizationId : null,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const { rawToken, tokenHash, expiresAt } = generateRefreshToken();
    await tokenRepository.saveRefreshToken(user.id, tokenHash, expiresAt);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        accountType: user.accountType,
        organizationId: activeMembership ? activeMembership.organizationId : null,
        organizationStatus: activeMembership ? activeMembership.organization.status : null,
        mustChangePassword: user.mustChangePassword,
        isEmailVerified: user.isEmailVerified,
      },
      tokens: {
        accessToken,
        refreshToken: rawToken,
      },
    };
  }

  async refreshTokens(rawRefreshToken) {
    if (!rawRefreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const existingToken = await tokenRepository.findTokenByHash(tokenHash);

    if (!existingToken) {
      throw new UnauthorizedError('Invalid refresh token', 'TOKEN_INVALID');
    }

    // Reuse detection: If token was already revoked, someone is reusing it!
    if (existingToken.isRevoked) {
      await tokenRepository.revokeAllUserTokens(existingToken.userId);
      throw new UnauthorizedError(
        'Token reuse detected. All user sessions have been terminated for security.',
        'TOKEN_REUSE_DETECTED'
      );
    }

    if (new Date() > new Date(existingToken.expiresAt)) {
      throw new UnauthorizedError(
        'Refresh token has expired. Please log in again.',
        'TOKEN_EXPIRED'
      );
    }

    const user = await userRepository.findById(existingToken.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account not found or deactivated', 'ACCOUNT_INACTIVE');
    }

    const activeMembership =
      user.memberships && user.memberships.length > 0 ? user.memberships[0] : null;

    // Issue new token pair
    const {
      rawToken: newRawToken,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
    } = generateRefreshToken();

    await prisma.$transaction(async (tx) => {
      // Mark old token revoked and record replacement
      await tokenRepository.revokeToken(tokenHash, newTokenHash, tx);
      // Save new token
      await tokenRepository.saveRefreshToken(user.id, newTokenHash, newExpiresAt, tx);
    });

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      organizationId: activeMembership ? activeMembership.organizationId : null,
    });

    return {
      accessToken,
      refreshToken: newRawToken,
    };
  }

  async logout(rawRefreshToken, userId) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await tokenRepository.revokeToken(tokenHash);
    } else if (userId) {
      await tokenRepository.revokeAllUserTokens(userId);
    }
    return { success: true };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }

    const newPasswordHash = await hashPassword(newPassword);
    await userRepository.updateUser(userId, {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    });

    // Revoke previous tokens upon password change
    await tokenRepository.revokeAllUserTokens(userId);

    return { message: 'Password updated successfully. Please log in with your new password.' };
  }
}

module.exports = new AuthService();
