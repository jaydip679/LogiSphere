const reservationRepository = require('../repositories/reservationRepository');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('fleet-dispatch-service:reservationTimeoutWorker');

class ReservationTimeoutWorker {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start(intervalMs = 30000) {
    if (this.intervalId) return;
    this.isRunning = true;
    logger.info(`Starting reservation timeout worker (interval: ${intervalMs}ms)`);

    this.intervalId = setInterval(async () => {
      await this.processExpiredReservations();
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Stopped reservation timeout worker');
  }

  async processExpiredReservations() {
    try {
      const expired = await reservationRepository.findExpiredPending(new Date());
      for (const res of expired) {
        await reservationRepository.updateStatus(res.id, 'EXPIRED');
        logger.info(
          `Expired orphaned pending reservation ${res.id} for shipment ${res.shipmentId}`
        );
      }
    } catch (error) {
      logger.error(`Error processing expired reservations: ${error.message}`);
    }
  }
}

module.exports = new ReservationTimeoutWorker();
