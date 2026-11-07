const app = require('./app');
const config = require('./config');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('api-gateway');

const host = process.env.HOST || '0.0.0.0';

const server = app.listen(config.port, host, () => {
  logger.info(`LogiSphere API Gateway listening on ${host}:${config.port} [env: ${config.env}]`);
  logger.info(`Routing targets:`);
  Object.entries(config.services).forEach(([name, url]) => {
    logger.info(`  • ${name.padEnd(12)} -> ${url}`);
  });
});

const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down API Gateway gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
