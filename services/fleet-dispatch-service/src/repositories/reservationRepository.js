const prisma = require('../database/prisma');

class ReservationRepository {
  async createReservation(data, tx = prisma) {
    return tx.assignmentReservation.create({
      data,
    });
  }

  async findById(id, tx = prisma) {
    return tx.assignmentReservation.findUnique({
      where: { id },
      include: {
        driver: true,
        vehicle: true,
      },
    });
  }

  async findActiveByShipment(shipmentId, tx = prisma) {
    return tx.assignmentReservation.findFirst({
      where: {
        shipmentId,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  async findActiveByDriver(driverId, tx = prisma) {
    if (!driverId) return null;
    return tx.assignmentReservation.findFirst({
      where: {
        driverId,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  async findActiveByVehicle(vehicleId, tx = prisma) {
    if (!vehicleId) return null;
    return tx.assignmentReservation.findFirst({
      where: {
        vehicleId,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  async updateStatus(id, status, tx = prisma) {
    return tx.assignmentReservation.update({
      where: { id },
      data: { status },
    });
  }

  async findExpiredPending(now = new Date()) {
    return prisma.assignmentReservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lte: now,
        },
      },
    });
  }
}

module.exports = new ReservationRepository();
