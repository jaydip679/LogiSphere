const driverService = require('../services/driverService');
const { createDriverSchema, updateDriverStatusSchema } = require('../validators/fleetValidators');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

class DriverController {
  async createDriver(req, res, next) {
    try {
      const validated = createDriverSchema.parse(req.body);
      const organizationId = req.user.organizationId;
      const driver = await driverService.createDriver(organizationId, validated);
      return sendSuccess(res, 'Driver registered successfully', driver, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async getDriver(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organizationId;
      const driver = await driverService.getDriver(organizationId, id);
      return sendSuccess(res, 'Driver details retrieved', driver, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async listDrivers(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const { status } = req.query;
      const drivers = await driverService.listDrivers(organizationId, { status });
      return sendSuccess(res, 'Drivers retrieved', drivers, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async updateDriverStatus(req, res, next) {
    try {
      const { id } = req.params;
      const validated = updateDriverStatusSchema.parse(req.body);
      const organizationId = req.user.organizationId;
      const updated = await driverService.updateDriverStatus(organizationId, id, validated.status);
      return sendSuccess(res, 'Driver status updated', updated, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DriverController();
