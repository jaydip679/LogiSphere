const prisma = require('../database/prisma');

class EventRepository {
  async isEventProcessed(eventId) {
    const record = await prisma.processedEvent.findUnique({
      where: { eventId },
    });
    return !!record;
  }

  async markEventProcessed(eventId, eventType, tx = prisma) {
    return tx.processedEvent.create({
      data: {
        eventId,
        eventType,
      },
    });
  }
}

module.exports = new EventRepository();
