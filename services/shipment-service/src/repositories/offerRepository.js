const prisma = require('../database/prisma');

class OfferRepository {
  async createOffer(data, tx = prisma) {
    return tx.marketplaceOffer.create({
      data,
    });
  }

  async findById(id, tx = prisma) {
    return tx.marketplaceOffer.findUnique({
      where: { id },
      include: { shipment: true },
    });
  }

  async findActiveOfferForShipment(shipmentId, tx = prisma) {
    return tx.marketplaceOffer.findFirst({
      where: {
        shipmentId,
        status: 'PENDING',
      },
      include: { shipment: true },
    });
  }

  async findPendingOffersForOrg(organizationId) {
    return prisma.marketplaceOffer.findMany({
      where: {
        organizationId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        shipment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findExpiredPendingOffers(now = new Date(), tx = prisma) {
    return tx.marketplaceOffer.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      include: {
        shipment: {
          include: {
            offers: true,
          },
        },
      },
    });
  }

  async updateOfferStatus(id, status, tx = prisma) {
    return tx.marketplaceOffer.update({
      where: { id },
      data: { status },
    });
  }

  async getPreviousOfferOrgIds(shipmentId, tx = prisma) {
    const offers = await tx.marketplaceOffer.findMany({
      where: { shipmentId },
      select: { organizationId: true },
    });
    return offers.map((o) => o.organizationId);
  }
}

module.exports = new OfferRepository();
