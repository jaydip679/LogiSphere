const prisma = require('../database/prisma');

class SimulatorRepository {
  async createRoutePoints(points) {
    return prisma.simulatedRoutePoint.createMany({
      data: points,
    });
  }

  async findByTrackingNumber(trackingNumber) {
    return prisma.simulatedRoutePoint.findMany({
      where: { trackingNumber },
      orderBy: { sequenceOrder: 'asc' },
    });
  }

  async clearByTrackingNumber(trackingNumber) {
    return prisma.simulatedRoutePoint.deleteMany({
      where: { trackingNumber },
    });
  }
}

module.exports = new SimulatorRepository();
