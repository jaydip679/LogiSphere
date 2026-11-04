const organizationService = require('../services/organizationService');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

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
}

module.exports = new InternalController();
