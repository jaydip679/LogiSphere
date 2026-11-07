const app = require('./app');
const config = require('./config');
const prisma = require('./database/prisma');
const offerPollingWorker = require('./workers/offerPollingWorker');
const outboxPublisherWorker = require('./workers/outboxPublisherWorker');
const reportService = require('./reports/reportService');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('shipment-service');

const host = process.env.HOST || '127.0.0.1';

const server = app.listen(config.port, host, () => {
  logger.info(`Shipment Service listening on ${host}:${config.port} [env: ${config.env}]`);

  // Start background workers
  offerPollingWorker.start(30000); // Poll expired offers every 30s
  outboxPublisherWorker.start(2000); // Poll outbox events every 2s
  reportService.startCleanupWorker(60000); // Clean up expired reports every 60s
});

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down shipment service gracefully...`);

  offerPollingWorker.stop();
  outboxPublisherWorker.stop();
  reportService.stopCleanupWorker();

  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Prisma disconnected.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
