const vehicleService = require('../services/vehicleService');
const { createVehicleSchema, updateVehicleStatusSchema } = require('../validators/fleetValidators');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

class VehicleController {
  async createVehicle(req, res, next) {
    try {
      const validated = createVehicleSchema.parse(req.body);
      const organizationId = req.user.organizationId;
      const vehicle = await vehicleService.createVehicle(organizationId, validated);
      return sendSuccess(res, 'Vehicle registered successfully', vehicle, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async getVehicle(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organizationId;
      const vehicle = await vehicleService.getVehicle(organizationId, id);
      return sendSuccess(res, 'Vehicle details retrieved', vehicle, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async listVehicles(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const { status } = req.query;
      const vehicles = await vehicleService.listVehicles(organizationId, { status });
      return sendSuccess(res, 'Vehicles retrieved', vehicles, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async updateVehicleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const validated = updateVehicleStatusSchema.parse(req.body);
      const organizationId = req.user.organizationId;
      const updated = await vehicleService.updateVehicleStatus(
        organizationId,
        id,
        validated.status
      );
      return sendSuccess(res, 'Vehicle status updated', updated, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VehicleController();
