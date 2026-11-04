const trackingService = require('../services/trackingService');
const { simulateRouteSchema } = require('../validators/trackingValidators');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

class TrackingController {
  async getTimeline(req, res, next) {
    try {
      const { trackingNumber } = req.params;
      const timeline = await trackingService.getTrackingTimeline(trackingNumber);
      return sendSuccess(res, 'Tracking timeline retrieved successfully', timeline, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async startSimulation(req, res, next) {
    try {
      const { trackingNumber } = req.params;
      const validated = simulateRouteSchema.parse(req.body);

      const result = await trackingService.generateSimulation({
        trackingNumber,
        shipmentId: validated.shipmentId,
        originHubName: validated.originHubName,
        destinationHubName: validated.destinationHubName,
        waypointsCount: validated.waypointsCount,
      });

      return sendSuccess(
        res,
        'Route simulation generated successfully',
        result,
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TrackingController();
