const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('@logisphere/common-utils');

const validateJwtIfExists = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  if (!config.jwt.publicKey) {
    return next(new Error('JWT RSA public key is not loaded in API Gateway'));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.publicKey, {
      algorithms: [config.jwt.algorithm],
      issuer: 'logisphere-auth-service',
    });

    // Inject verified identity headers downstream
    req.headers['x-user-id'] = decoded.sub;
    req.headers['x-user-role'] = decoded.role;
    if (decoded.organizationId) {
      req.headers['x-user-org-id'] = decoded.organizationId;
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED'));
    }
    return next(new UnauthorizedError('Invalid access token', 'TOKEN_INVALID'));
  }
};

module.exports = {
  validateJwtIfExists,
};
