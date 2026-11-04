const prisma = require('../database/prisma');

class TrackingRepository {
  /**
   * Append-only event creation.
   * Modifying or deleting tracking events is strictly prohibited by architectural mandate.
   */
  async createEvent(data, tx = prisma) {
    return tx.trackingEvent.create({
      data: {
        trackingNumber: data.trackingNumber,
        shipmentId: data.shipmentId,
        status: data.status,
        source: data.source || 'SYSTEM',
        location: data.location || null,
        latitude: data.latitude !== undefined ? data.latitude : null,
        longitude: data.longitude !== undefined ? data.longitude : null,
        actorId: data.actorId || null,
        notes: data.notes || null,
        metadata: data.metadata || null,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    });
  }

  async findByTrackingNumber(trackingNumber) {
    return prisma.trackingEvent.findMany({
      where: { trackingNumber },
      orderBy: { timestamp: 'asc' },
    });
  }

  async findLatestByTrackingNumber(trackingNumber) {
    return prisma.trackingEvent.findFirst({
      where: { trackingNumber },
      orderBy: { timestamp: 'desc' },
    });
  }

  // Explicit append-only enforcement: mutations and deletions are blocked
  async updateEvent() {
    throw new Error(
      'ARCHITECTURAL_VIOLATION: TrackingEvent is strictly append-only. Updates are prohibited.'
    );
  }

  async deleteEvent() {
    throw new Error(
      'ARCHITECTURAL_VIOLATION: TrackingEvent is strictly append-only. Deletions are prohibited.'
    );
  }
}

module.exports = new TrackingRepository();
