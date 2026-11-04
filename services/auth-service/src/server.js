const app = require('./app');
const config = require('./config');
const prisma = require('./database/prisma');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('auth-service');

const server = app.listen(config.port, () => {
  logger.info(`Auth & Organization Service listening on port ${config.port} [env: ${config.env}]`);
});

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
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
