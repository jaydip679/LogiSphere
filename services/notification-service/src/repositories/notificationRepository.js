const prisma = require('../database/prisma');

class NotificationRepository {
  async createNotification(data, tx = prisma) {
    return tx.inAppNotification.create({
      data: {
        recipientId: data.recipientId,
        organizationId: data.organizationId || null,
        title: data.title,
        message: data.message,
        category: data.category || 'SHIPMENT',
        status: 'UNREAD',
        metadata: data.metadata || null,
      },
    });
  }

  async findById(id) {
    return prisma.inAppNotification.findUnique({
      where: { id },
    });
  }

  async findManyByRecipient(recipientId, { status, skip = 0, take = 20 } = {}) {
    const where = { recipientId };
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.inAppNotification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inAppNotification.count({ where }),
    ]);

    return { items, total };
  }

  async countUnread(recipientId) {
    return prisma.inAppNotification.count({
      where: {
        recipientId,
        status: 'UNREAD',
      },
    });
  }

  async markAsRead(id, recipientId) {
    return prisma.inAppNotification.updateMany({
      where: {
        id,
        recipientId,
        status: 'UNREAD',
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(recipientId) {
    return prisma.inAppNotification.updateMany({
      where: {
        recipientId,
        status: 'UNREAD',
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
  }
}

module.exports = new NotificationRepository();
