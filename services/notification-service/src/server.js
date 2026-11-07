const app = require('./app');
const config = require('./config');
const prisma = require('./database/prisma');
const notificationEventConsumer = require('./workers/notificationEventConsumer');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('notification-service');

const host = config.host || '127.0.0.1';

const server = app.listen(config.port, host, () => {
  logger.info(`Notification Service listening on ${host}:${config.port} [env: ${config.env}]`);

  // Start background SQS consumer
  notificationEventConsumer.start(5000);
});

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down notification service gracefully...`);

  notificationEventConsumer.stop();

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
