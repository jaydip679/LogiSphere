const shipmentService = require('../services/shipmentService');
const shipmentRepository = require('../repositories/shipmentRepository');
const offerRepository = require('../repositories/offerRepository');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

class ShipmentController {
  async estimatePrice(req, res, next) {
    try {
      const result = await shipmentService.estimatePrice(req.body);
      return sendSuccess(res, 'Price estimate calculated', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async createShipment(req, res, next) {
    try {
      const result = await shipmentService.createShipment(req.user.id, req.body);
      return sendSuccess(res, 'Shipment created successfully', result, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async getMyShipments(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const status = req.query.status || null;
      const skip = (page - 1) * limit;

      const result = await shipmentRepository.findByCustomer(req.user.id, {
        skip,
        take: limit,
        status,
      });

      return sendSuccess(res, 'Customer shipments retrieved', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async getShipmentDetails(req, res, next) {
    try {
      const result = await shipmentService.getShipmentDetails(req.params.id, req.user);
      return sendSuccess(res, 'Shipment retrieved', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async cancelShipment(req, res, next) {
    try {
      const result = await shipmentService.cancelShipment(req.user, req.params.id, req.body.reason);
      return sendSuccess(res, 'Shipment cancelled successfully', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async retryMatching(req, res, next) {
    try {
      const result = await shipmentService.retryMatching(req.user.id, req.params.id);
      return sendSuccess(res, 'Marketplace matching re-triggered', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async getOffersInbox(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const offers = await offerRepository.findPendingOffersForOrg(orgId);
      return sendSuccess(res, 'Pending marketplace offers retrieved', offers, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async acceptOffer(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const result = await shipmentService.acceptOffer(orgId, req.params.offerId);
      return sendSuccess(res, 'Marketplace offer accepted', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async rejectOffer(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const result = await shipmentService.rejectOffer(orgId, req.params.offerId, req.body.reason);
      return sendSuccess(res, 'Marketplace offer declined', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async submitQuote(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const result = await shipmentService.submitQuote(orgId, req.params.offerId, req.body);
      return sendSuccess(res, 'Revised quote submitted to customer', result, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async respondToQuote(req, res, next) {
    try {
      const { quoteId } = req.params;
      const { action } = req.body; // ACCEPT or REJECT
      const result = await shipmentService.respondToQuote(
        req.user.id,
        req.params.id,
        quoteId,
        action
      );
      return sendSuccess(
        res,
        `Quote ${action.toLowerCase()}ed successfully`,
        result,
        HttpStatus.OK
      );
    } catch (error) {
      next(error);
    }
  }

  async assignDispatch(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const result = await shipmentService.assignDispatch(orgId, req.params.id, req.body);
      return sendSuccess(res, 'Shipment assigned to driver and vehicle', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async updateMilestone(req, res, next) {
    try {
      const driverId = req.user.id;
      const result = await shipmentService.updateMilestone(driverId, req.params.id, req.body);
      return sendSuccess(res, 'Delivery milestone updated', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async handleFailureDisposition(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const result = await shipmentService.handleFailureDisposition(orgId, req.params.id, req.body);
      return sendSuccess(res, result.message, result.shipment, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async getDriverAssignments(req, res, next) {
    try {
      const driverId = req.user.id;
      const shipments = await shipmentRepository.findByDriver(driverId, [
        'ASSIGNED',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELAYED',
      ]);
      return sendSuccess(res, 'Active driver assignments retrieved', shipments, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ShipmentController();
