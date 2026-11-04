const prisma = require('../database/prisma');

class NotificationLogRepository {
  async createLog(data, tx = prisma) {
    return tx.notificationLog.create({
      data: {
        eventId: data.eventId || null,
        channel: data.channel,
        recipient: data.recipient,
        status: data.status,
        subject: data.subject || null,
        error: data.error || null,
      },
    });
  }

  async findByEventId(eventId) {
    return prisma.notificationLog.findMany({
      where: { eventId },
      orderBy: { sentAt: 'desc' },
    });
  }
}

module.exports = new NotificationLogRepository();
