const { AppError, sendError, HttpStatus } = require('@logisphere/common-utils');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('api-gateway');

const errorHandler = (err, req, res, _next) => {
  const correlationId = req.headers['x-correlation-id'] || null;

  if (err instanceof AppError) {
    logger.warn(`Gateway operational error: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
      correlationId,
      path: req.originalUrl,
    });
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // Handle downstream connection failures as 502 Bad Gateway
  if (
    err.code === 'ECONNREFUSED' ||
    err.code === 'ENOTFOUND' ||
    err.code === 'ECONNRESET' ||
    err.code === 'ETIMEDOUT'
  ) {
    logger.warn(`Downstream service unreachable: ${err.message}`, { correlationId });
    return sendError(
      res,
      'Downstream microservice is temporarily unavailable',
      HttpStatus.BAD_GATEWAY,
      'SERVICE_UNAVAILABLE'
    );
  }

  logger.error(`Gateway unhandled error: ${err.message}`, {
    stack: err.stack,
    correlationId,
    path: req.originalUrl,
  });

  return sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'An unexpected gateway error occurred' : err.message,
    HttpStatus.INTERNAL_SERVER_ERROR,
    'GATEWAY_ERROR'
  );
};

module.exports = errorHandler;
