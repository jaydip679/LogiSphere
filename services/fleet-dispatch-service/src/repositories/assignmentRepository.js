const prisma = require('../database/prisma');

class AssignmentRepository {
  async createAssignment(data, tx = prisma) {
    return tx.dispatchAssignment.create({
      data,
      include: {
        driver: true,
        vehicle: true,
      },
    });
  }

  async findById(id) {
    return prisma.dispatchAssignment.findUnique({
      where: { id },
      include: {
        driver: true,
        vehicle: true,
      },
    });
  }

  async findActiveByShipment(shipmentId, tx = prisma) {
    return tx.dispatchAssignment.findFirst({
      where: {
        shipmentId,
        status: 'ACTIVE',
      },
      include: {
        driver: true,
        vehicle: true,
      },
    });
  }

  async findActiveByDriver(driverId, tx = prisma) {
    return tx.dispatchAssignment.findFirst({
      where: {
        driverId,
        status: 'ACTIVE',
      },
    });
  }

  async findActiveByVehicle(vehicleId, tx = prisma) {
    return tx.dispatchAssignment.findFirst({
      where: {
        vehicleId,
        status: 'ACTIVE',
      },
    });
  }

  async findByShipmentHistory(shipmentId) {
    return prisma.dispatchAssignment.findMany({
      where: { shipmentId },
      orderBy: { createdAt: 'asc' },
      include: {
        driver: true,
        vehicle: true,
      },
    });
  }

  async updateStatus(id, status, tx = prisma) {
    return tx.dispatchAssignment.update({
      where: { id },
      data: { status },
    });
  }
}

module.exports = new AssignmentRepository();
