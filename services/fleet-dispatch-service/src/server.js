const app = require('./app');
const config = require('./config');
const prisma = require('./database/prisma');
const reservationTimeoutWorker = require('./workers/reservationTimeoutWorker');
const fleetEventConsumer = require('./workers/fleetEventConsumer');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('fleet-dispatch-service');

const host = config.host || '127.0.0.1';

const server = app.listen(config.port, host, () => {
  logger.info(`Fleet & Dispatch Service listening on ${host}:${config.port} [env: ${config.env}]`);

  // Start background workers
  reservationTimeoutWorker.start(30000); // Check expired reservations every 30s
  fleetEventConsumer.start(5000); // Poll SQS fleet queue every 5s
});

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down fleet & dispatch service gracefully...`);

  reservationTimeoutWorker.stop();
  fleetEventConsumer.stop();

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
