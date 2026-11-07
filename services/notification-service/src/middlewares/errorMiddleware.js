const { AppError, sendError, HttpStatus } = require('@logisphere/common-utils');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('notification-service');

const errorHandler = (err, req, res, _next) => {
  const correlationId = req.headers['x-correlation-id'] || null;

  if (err instanceof AppError) {
    logger.warn(`Operational error: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
      correlationId,
      path: req.originalUrl,
    });
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  if (err.code === 'P2002') {
    const fields = err.meta && err.meta.target ? err.meta.target.join(', ') : 'field';
    logger.warn(`Database unique constraint violation on: ${fields}`, { correlationId });
    return sendError(
      res,
      `A record with this ${fields} already exists`,
      HttpStatus.CONFLICT,
      'DUPLICATE_RESOURCE'
    );
  }

  logger.error(`Unhandled internal error: ${err.message}`, {
    stack: err.stack,
    correlationId,
    path: req.originalUrl,
  });

  return sendError(
    res,
    err.message,
    HttpStatus.INTERNAL_SERVER_ERROR,
    'INTERNAL_SERVER_ERROR'
  );
};

module.exports = errorHandler;
