const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const { sendSuccess, HttpStatus, NotFoundError } = require('@logisphere/common-utils');

class AuthController {
  async registerCustomer(req, res, next) {
    try {
      const result = await authService.registerCustomer(req.body);
      return sendSuccess(res, 'Customer registration initiated. Please verify your email.', result, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req, res, next) {
    try {
      const { email, otp, purpose } = req.body;
      const result = await authService.verifyOtp(email, otp, purpose || 'REGISTRATION');
      return sendSuccess(res, result.message, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async resendOtp(req, res, next) {
    try {
      const { email, purpose } = req.body;
      const result = await authService.resendOtp(email, purpose || 'REGISTRATION');
      return sendSuccess(res, result.message, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);
      return sendSuccess(res, result.message, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    return this.requestPasswordReset(req, res, next);
  }

  async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await authService.resetPassword(email, otp, newPassword);
      return sendSuccess(res, result.message, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async activateStaff(req, res, next) {
    try {
      const { email, otp, password } = req.body;
      const result = await authService.activateStaff(email, otp, password);
      return sendSuccess(res, result.message, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return sendSuccess(res, 'Authentication successful', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshTokens(refreshToken);
      return sendSuccess(res, 'Tokens refreshed successfully', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.logout(refreshToken);
      return sendSuccess(res, result.message, null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
      return sendSuccess(res, result.message, null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await userRepository.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User not found', 'USER_NOT_FOUND');
      }
      const activeMembership =
        user.memberships && user.memberships.length > 0 ? user.memberships[0] : null;

      const profile = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        accountType: user.accountType,
        organizationId: activeMembership ? activeMembership.organizationId : req.user.organizationId || null,
        organizationStatus: activeMembership?.organization?.status || null,
        mustChangePassword: user.mustChangePassword,
        isEmailVerified: user.isEmailVerified,
      };

      return sendSuccess(res, 'Profile retrieved', { user: profile }, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
