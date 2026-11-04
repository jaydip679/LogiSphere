const organizationService = require('../services/organizationService');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

class OrganizationController {
  async registerCompany(req, res, next) {
    try {
      const result = await organizationService.registerCompany(req.body);
      return sendSuccess(
        res,
        'Logistics company submitted for registration. Pending platform review.',
        result,
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  }

  async addStaffMember(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const result = await organizationService.addStaffMember(req.user.id, orgId, req.body);
      return sendSuccess(res, 'Staff member added successfully', result, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async getMyOrganization(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const result = await organizationService.getOrganizationDetails(orgId);
      return sendSuccess(res, 'Organization details retrieved', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrganizationController();
