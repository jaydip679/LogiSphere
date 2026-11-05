const prisma = require('../database/prisma');

class ShipmentRepository {
  async findById(id, tx = prisma) {
    return tx.shipment.findUnique({
      where: { id },
      include: {
        offers: { orderBy: { createdAt: 'desc' } },
        quotes: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async findByTrackingNumber(trackingNumber, tx = prisma) {
    return tx.shipment.findUnique({
      where: { trackingNumber },
      include: {
        offers: { orderBy: { createdAt: 'desc' } },
        quotes: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async createShipment(data, tx = prisma) {
    return tx.shipment.create({
      data,
    });
  }

  async updateShipment(id, data, tx = prisma) {
    return tx.shipment.update({
      where: { id },
      data,
    });
  }

  async findByCustomer(customerId, { skip = 0, take = 20, status = null } = {}) {
    const where = { customerId };
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.shipment.count({ where }),
      prisma.shipment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          quotes: { where: { status: 'PENDING' } },
        },
      }),
    ]);

    return { total, items };
  }

  async findByAssignedOrg(assignedOrgId, { skip = 0, take = 20, status = null } = {}) {
    const where = { assignedOrgId };
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.shipment.count({ where }),
      prisma.shipment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, items };
  }

  async findAll({ skip = 0, take = 20, status = null } = {}) {
    const where = {};
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.shipment.count({ where }),
      prisma.shipment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, items };
  }

  async findByDriver(assignedDriverId, statusList = []) {
    const where = { assignedDriverId };
    if (statusList.length > 0) {
      where.status = { in: statusList };
    }

    return prisma.shipment.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }
}

module.exports = new ShipmentRepository();
