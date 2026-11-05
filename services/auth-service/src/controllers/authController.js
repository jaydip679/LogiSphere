const authService = require('../services/authService');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

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
      return sendSuccess(res, result.message, null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await authService.resetPassword(email, otp, newPassword);
      return sendSuccess(res, result.message, null, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return sendSuccess(res, 'Login successful', result, HttpStatus.OK);
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
      const userId = req.user ? req.user.id : null;
      await authService.logout(refreshToken, userId);
      return sendSuccess(res, 'Logged out successfully', null, HttpStatus.OK);
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
      return sendSuccess(res, 'Profile retrieved', { user: req.user }, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
