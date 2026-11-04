const userRepository = require('../repositories/userRepository');
const tokenRepository = require('../repositories/tokenRepository');
const auditRepository = require('../repositories/auditRepository');
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
      throw new ConflictError(
        'An account with this email already exists',
        'EMAIL_ALREADY_REGISTERED'
      );
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

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
    });

    const { rawToken, tokenHash, expiresAt } = generateRefreshToken();
    await tokenRepository.saveRefreshToken(user.id, tokenHash, expiresAt);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        accountType: user.accountType,
      },
      tokens: {
        accessToken,
        refreshToken: rawToken,
      },
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
