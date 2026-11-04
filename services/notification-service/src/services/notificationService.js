const notificationRepository = require('../repositories/notificationRepository');
const { ValidationError, NotFoundError } = require('@logisphere/common-utils');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('notification-service:notificationService');

class NotificationService {
  async getUserNotifications(userId, { status, page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const { items, total } = await notificationRepository.findManyByRecipient(userId, {
      status,
      skip,
      take: limit,
    });

    return {
      notifications: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId) {
    const count = await notificationRepository.countUnread(userId);
    return { unreadCount: count };
  }

  async markNotificationRead(id, userId) {
    const notification = await notificationRepository.findById(id);
    if (!notification) {
      throw new NotFoundError('Notification not found', 'NOTIFICATION_NOT_FOUND');
    }

    if (notification.recipientId !== userId) {
      throw new NotFoundError('Notification not found', 'NOTIFICATION_NOT_FOUND');
    }

    await notificationRepository.markAsRead(id, userId);
    logger.info(`Marked notification ${id} as read for user ${userId}`);
    return { id, status: 'READ' };
  }

  async markAllRead(userId) {
    const result = await notificationRepository.markAllAsRead(userId);
    logger.info(`Marked ${result.count} notifications as read for user ${userId}`);
    return { markedCount: result.count };
  }

  async createInAppNotification(data) {
    if (!data.recipientId || !data.title || !data.message) {
      throw new ValidationError(
        'recipientId, title, and message are required',
        null,
        'PARAM_REQUIRED'
      );
    }

    const notification = await notificationRepository.createNotification(data);
    logger.info(`Created in-app notification ${notification.id} for user ${data.recipientId}`);
    return notification;
  }
}

module.exports = new NotificationService();
