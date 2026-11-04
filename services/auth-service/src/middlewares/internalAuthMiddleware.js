const crypto = require('crypto');
const config = require('../config');
const { UnauthorizedError } = require('@logisphere/common-utils');

const requireInternalServiceKey = (req, res, next) => {
  const serviceKey = req.headers['x-internal-service-key'];

  if (!serviceKey) {
    return next(new UnauthorizedError('Missing internal service key', 'INTERNAL_AUTH_FAILED'));
  }

  const keyBuffer = Buffer.from(serviceKey);
  const targetBuffer = Buffer.from(config.internalServiceKey);

  if (
    keyBuffer.length !== targetBuffer.length ||
    !crypto.timingSafeEqual(keyBuffer, targetBuffer)
  ) {
    return next(new UnauthorizedError('Invalid internal service key', 'INTERNAL_AUTH_FAILED'));
  }

  next();
};

module.exports = {
  requireInternalServiceKey,
};
