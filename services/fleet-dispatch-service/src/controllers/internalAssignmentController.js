const reservationService = require('../services/reservationService');
const { reserveAssignmentSchema } = require('../validators/fleetValidators');
const { sendSuccess, HttpStatus, ValidationError } = require('@logisphere/common-utils');

class InternalAssignmentController {
  async getCapacity(req, res, next) {
    try {
      const organizationId = req.query.organizationId;
      if (!organizationId) {
        throw new ValidationError(
          'organizationId query parameter is required',
          null,
          'PARAM_REQUIRED'
        );
      }

      const capacity = await reservationService.getCapacity(organizationId);
      return sendSuccess(res, 'Fleet capacity retrieved', capacity, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async reserveAssignment(req, res, next) {
    try {
      const validated = reserveAssignmentSchema.parse(req.body);
      const result = await reservationService.reserveAssignment(validated);
      return sendSuccess(res, 'Reservation created', result, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async confirmAssignment(req, res, next) {
    try {
      const { reservationId } = req.body;
      if (!reservationId) {
        throw new ValidationError('reservationId is required', null, 'PARAM_REQUIRED');
      }
      const result = await reservationService.confirmAssignment(reservationId);
      return sendSuccess(res, 'Reservation confirmed', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async cancelAssignment(req, res, next) {
    try {
      const { reservationId } = req.body;
      if (!reservationId) {
        throw new ValidationError('reservationId is required', null, 'PARAM_REQUIRED');
      }
      const result = await reservationService.cancelAssignment(reservationId);
      return sendSuccess(res, 'Reservation cancelled', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async releaseByShipment(req, res, next) {
    try {
      const { shipmentId } = req.params;
      if (!shipmentId) {
        throw new ValidationError('shipmentId is required', null, 'PARAM_REQUIRED');
      }
      const result = await reservationService.releaseByShipment(shipmentId);
      return sendSuccess(res, 'Assignment released', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InternalAssignmentController();
