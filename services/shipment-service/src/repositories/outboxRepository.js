const prisma = require('../database/prisma');

class OutboxRepository {
  async createEvent(eventData, tx = prisma) {
    return tx.outboxEvent.create({
      data: {
        eventId: eventData.eventId,
        eventType: eventData.eventType,
        aggregateId: eventData.aggregateId,
        payload: eventData.payload,
        targetQueues: eventData.targetQueues,
        isPublished: false,
      },
    });
  }

  async fetchPendingBatch(limit = 20, tx = prisma) {
    return tx.outboxEvent.findMany({
      where: {
        isPublished: false,
        retryCount: { lt: 5 },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
  }

  async markPublished(id, tx = prisma) {
    return tx.outboxEvent.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }

  async recordFailure(id, errorMsg, tx = prisma) {
    return tx.outboxEvent.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        lastError: String(errorMsg).substring(0, 500),
      },
    });
  }
}

module.exports = new OutboxRepository();
