const offerRepository = require('../repositories/offerRepository');
const quoteRepository = require('../repositories/quoteRepository');
const outboxRepository = require('../repositories/outboxRepository');
const matchingEngine = require('../matching/matchingEngine');
const {
  ShipmentEventTypes,
  createDomainEvent,
  getQueuesForEvent,
} = require('@logisphere/event-contracts');
const { createLogger } = require('@logisphere/logger');
const prisma = require('../database/prisma');

const logger = createLogger('shipment-service:offerPollingWorker');

class OfferPollingWorker {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start(intervalMs = 30000) {
    if (this.intervalId) return;
    logger.info(`Starting marketplace offer polling worker (interval: ${intervalMs}ms)...`);

    this.intervalId = setInterval(async () => {
      if (this.isRunning) return;
      this.isRunning = true;
      try {
        await this.pollExpiredOffers();
        await this.pollExpiredQuotes();
      } catch (err) {
        logger.error(`Error in offer polling worker: ${err.message}`, { stack: err.stack });
      } finally {
        this.isRunning = false;
      }
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Marketplace offer polling worker stopped.');
    }
  }

  async pollExpiredOffers() {
    const now = new Date();
    const expiredOffers = await prisma.$transaction(async (tx) => {
      return offerRepository.findExpiredPendingOffers(now, tx);
    });

    if (expiredOffers.length === 0) return;

    logger.info(`Found ${expiredOffers.length} expired marketplace offers to cascade.`);

    for (const offer of expiredOffers) {
      try {
        await prisma.$transaction(async (tx) => {
          await offerRepository.updateOfferStatus(offer.id, 'EXPIRED', tx);

          const event = createDomainEvent({
            eventType: ShipmentEventTypes.SHIPMENT_OFFER_REJECTED,
            aggregateId: offer.shipmentId,
            payload: {
              shipmentId: offer.shipmentId,
              offerId: offer.id,
              organizationId: offer.organizationId,
              reason: 'OFFER_EXPIRED',
            },
          });

          await outboxRepository.createEvent(
            {
              ...event,
              targetQueues: getQueuesForEvent(event.eventType),
            },
            tx
          );
        });

        // Cascade to next eligible company
        await matchingEngine.matchAndOfferShipment(offer.shipmentId);
      } catch (err) {
        logger.error(
          `Failed to process expired offer ${offer.id} for shipment ${offer.shipmentId}: ${err.message}`
        );
      }
    }
  }

  async pollExpiredQuotes() {
    const now = new Date();
    const expiredQuotes = await prisma.$transaction(async (tx) => {
      return quoteRepository.findExpiredPendingQuotes(now, tx);
    });

    if (expiredQuotes.length === 0) return;

    logger.info(`Found ${expiredQuotes.length} expired customer quotes to cascade.`);

    for (const quote of expiredQuotes) {
      try {
        await prisma.$transaction(async (tx) => {
          await quoteRepository.updateQuoteStatus(quote.id, 'EXPIRED', tx);
          await offerRepository.updateOfferStatus(quote.offerId, 'EXPIRED', tx);

          const event = createDomainEvent({
            eventType: ShipmentEventTypes.SHIPMENT_OFFER_REJECTED,
            aggregateId: quote.shipmentId,
            payload: {
              shipmentId: quote.shipmentId,
              quoteId: quote.id,
              organizationId: quote.organizationId,
              reason: 'CUSTOMER_QUOTE_WINDOW_EXPIRED',
            },
          });

          await outboxRepository.createEvent(
            {
              ...event,
              targetQueues: getQueuesForEvent(event.eventType),
            },
            tx
          );
        });

        // Cascade to next eligible carrier
        await matchingEngine.matchAndOfferShipment(quote.shipmentId);
      } catch (err) {
        logger.error(`Failed to cascade expired quote ${quote.id}: ${err.message}`);
      }
    }
  }
}

module.exports = new OfferPollingWorker();
