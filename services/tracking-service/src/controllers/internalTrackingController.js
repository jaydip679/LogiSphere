const trackingService = require('../services/trackingService');
const { createMilestoneEventSchema } = require('../validators/trackingValidators');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

class InternalTrackingController {
  async recordMilestone(req, res, next) {
    try {
      const validated = createMilestoneEventSchema.parse(req.body);
      const event = await trackingService.recordMilestoneEvent(validated);
      return sendSuccess(res, 'Milestone recorded successfully', event, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async getTimeline(req, res, next) {
    try {
      const { trackingNumber } = req.params;
      const timeline = await trackingService.getTrackingTimeline(trackingNumber);
      return sendSuccess(res, 'Internal tracking timeline retrieved', timeline, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InternalTrackingController();
