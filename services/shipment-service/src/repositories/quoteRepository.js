const prisma = require('../database/prisma');

class QuoteRepository {
  async createQuote(data, tx = prisma) {
    return tx.quote.create({
      data,
    });
  }

  async findById(id, tx = prisma) {
    return tx.quote.findUnique({
      where: { id },
      include: { shipment: true },
    });
  }

  async findPendingByShipment(shipmentId, tx = prisma) {
    return tx.quote.findFirst({
      where: {
        shipmentId,
        status: 'PENDING',
      },
    });
  }

  async updateQuoteStatus(id, status, tx = prisma) {
    return tx.quote.update({
      where: { id },
      data: { status },
    });
  }

  async findExpiredPendingQuotes(now = new Date(), tx = prisma) {
    return tx.quote.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      include: { shipment: true },
    });
  }
}

module.exports = new QuoteRepository();
