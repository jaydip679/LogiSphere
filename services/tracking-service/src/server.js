const app = require('./app');
const config = require('./config');
const prisma = require('./database/prisma');
const trackingEventConsumer = require('./workers/trackingEventConsumer');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('tracking-service');

const host = process.env.HOST || '127.0.0.1';

const server = app.listen(config.port, host, () => {
  logger.info(`Tracking Service listening on ${host}:${config.port} [env: ${config.env}]`);

  // Start background SQS consumer
  trackingEventConsumer.start(5000);
});

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down tracking service gracefully...`);

  trackingEventConsumer.stop();

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
