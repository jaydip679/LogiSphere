const organizationService = require('../services/organizationService');
const userRepository = require('../repositories/userRepository');
const { sendSuccess, HttpStatus, NotFoundError } = require('@logisphere/common-utils');

class InternalController {
  async getCoverage(req, res, next) {
    try {
      const { hub } = req.query;
      const coverage = await organizationService.getApprovedCoverage(hub);
      return sendSuccess(res, 'Coverage retrieved', coverage, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async getOrganization(req, res, next) {
    try {
      const { id } = req.params;
      const details = await organizationService.getOrganizationDetails(id);
      return sendSuccess(res, 'Organization retrieved', details.organization, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async verifyUserEmail(req, res, next) {
    try {
      const { email } = req.body;
      const user = await userRepository.findByEmail(email);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      await userRepository.updateUser(user.id, { isEmailVerified: true });
      return sendSuccess(res, 'User email verified successfully', { email: user.email, isEmailVerified: true }, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InternalController();
