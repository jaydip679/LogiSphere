const organizationService = require('../services/organizationService');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

class AdminController {
  async getPendingOrganizations(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const result = await organizationService.getPendingOrganizations(page, limit);
      return sendSuccess(res, 'Pending organizations retrieved', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async reviewOrganization(req, res, next) {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const result = await organizationService.reviewOrganization(
        req.user.id,
        id,
        status,
        rejectionReason
      );
      return sendSuccess(
        res,
        `Organization has been ${status.toLowerCase()} successfully`,
        result,
        HttpStatus.OK
      );
    } catch (error) {
      next(error);
    }
  }

  async getOrganizationDetails(req, res, next) {
    try {
      const { id } = req.params;
      const result = await organizationService.getOrganizationDetails(id);
      return sendSuccess(res, 'Organization details retrieved', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
