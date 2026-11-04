const dispatchService = require('../services/dispatchService');
const { assignDispatchSchema, reassignDispatchSchema } = require('../validators/fleetValidators');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

class DispatchController {
  async getAvailableFleet(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const fleet = await dispatchService.getAvailableFleet(organizationId);
      return sendSuccess(res, 'Available fleet retrieved', fleet, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async assignDispatch(req, res, next) {
    try {
      const validated = assignDispatchSchema.parse(req.body);
      const organizationId = req.user.organizationId;
      const assignedByUserId = req.user.id;

      const assignment = await dispatchService.assignDispatch({
        organizationId,
        shipmentId: validated.shipmentId,
        driverId: validated.driverId,
        vehicleId: validated.vehicleId,
        assignedByUserId,
        shipmentWeightKg: validated.shipmentWeightKg,
      });

      return sendSuccess(res, 'Dispatch assigned successfully', assignment, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async reassignDispatch(req, res, next) {
    try {
      const validated = reassignDispatchSchema.parse(req.body);
      const organizationId = req.user.organizationId;
      const assignedByUserId = req.user.id;

      const assignment = await dispatchService.reassignDispatch({
        organizationId,
        shipmentId: validated.shipmentId,
        newDriverId: validated.newDriverId,
        newVehicleId: validated.newVehicleId,
        reassignmentReason: validated.reassignmentReason,
        assignedByUserId,
        shipmentWeightKg: validated.shipmentWeightKg,
      });

      return sendSuccess(res, 'Dispatch reassigned successfully', assignment, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async getShipmentHistory(req, res, next) {
    try {
      const { shipmentId } = req.params;
      const organizationId = req.user.role === 'PLATFORM_ADMIN' ? null : req.user.organizationId;
      const history = await dispatchService.getShipmentHistory(organizationId, shipmentId);
      return sendSuccess(res, 'Shipment assignment history retrieved', history, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DispatchController();
