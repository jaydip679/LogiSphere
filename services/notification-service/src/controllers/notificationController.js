const notificationService = require('../services/notificationService');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

class NotificationController {
  async getUserNotifications(req, res, next) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const status = req.query.status || null;

      const result = await notificationService.getUserNotifications(userId, {
        status,
        page,
        limit,
      });

      return sendSuccess(res, 'User notifications retrieved successfully', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await notificationService.getUnreadCount(userId);
      return sendSuccess(res, 'Unread notification count retrieved', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async markNotificationRead(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await notificationService.markNotificationRead(id, userId);
      return sendSuccess(res, 'Notification marked as read', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await notificationService.markAllRead(userId);
      return sendSuccess(res, 'All notifications marked as read', result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
