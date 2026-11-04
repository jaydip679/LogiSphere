const prisma = require('../database/prisma');

class VehicleRepository {
  async createVehicle(data) {
    return prisma.vehicle.create({
      data,
    });
  }

  async findById(id) {
    return prisma.vehicle.findUnique({
      where: { id },
    });
  }

  async findByRegistrationNumber(registrationNumber) {
    return prisma.vehicle.findUnique({
      where: { registrationNumber },
    });
  }

  async listByOrganization(organizationId, { status } = {}) {
    const where = { organizationId };
    if (status) {
      where.status = status;
    }
    return prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id, status, tx = prisma) {
    return tx.vehicle.update({
      where: { id },
      data: { status },
    });
  }

  async countAvailable(organizationId) {
    return prisma.vehicle.count({
      where: {
        organizationId,
        status: 'AVAILABLE',
      },
    });
  }
}

module.exports = new VehicleRepository();
