const prisma = require('../database/prisma');

class DriverRepository {
  async createDriver(data) {
    return prisma.driver.create({
      data,
    });
  }

  async findById(id) {
    return prisma.driver.findUnique({
      where: { id },
    });
  }

  async findByLicenseNumber(licenseNumber) {
    return prisma.driver.findUnique({
      where: { licenseNumber },
    });
  }

  async listByOrganization(organizationId, { status } = {}) {
    const where = { organizationId };
    if (status) {
      where.status = status;
    }
    return prisma.driver.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id, status, tx = prisma) {
    return tx.driver.update({
      where: { id },
      data: { status },
    });
  }

  async countAvailable(organizationId) {
    return prisma.driver.count({
      where: {
        organizationId,
        status: 'AVAILABLE',
      },
    });
  }
}

module.exports = new DriverRepository();
