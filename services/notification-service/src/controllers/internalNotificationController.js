const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const {
  createInAppNotificationSchema,
  sendEmailSchema,
} = require('../validators/notificationValidators');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

class InternalNotificationController {
  async createInApp(req, res, next) {
    try {
      const validated = createInAppNotificationSchema.parse(req.body);
      const notification = await notificationService.createInAppNotification(validated);
      return sendSuccess(res, 'In-app notification created', notification, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async sendEmail(req, res, next) {
    try {
      const validated = sendEmailSchema.parse(req.body);
      const outcome = await emailService.sendEmail(validated);
      return sendSuccess(res, 'Email dispatched successfully', outcome, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InternalNotificationController();
