const config = require('../config');
const { UnauthorizedError } = require('@logisphere/common-utils');

const requireInternalServiceKey = (req, res, next) => {
  const serviceKey = req.headers['x-internal-service-key'];

  if (!serviceKey || serviceKey !== config.internalServiceKey) {
    return next(
      new UnauthorizedError('Invalid or missing internal service key', 'INTERNAL_AUTH_FAILED')
    );
  }

  next();
};

module.exports = {
  requireInternalServiceKey,
};
