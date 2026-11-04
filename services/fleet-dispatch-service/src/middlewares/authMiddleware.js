const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError, ForbiddenError } = require('@logisphere/common-utils');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError(
        'Missing or malformed Authorization header',
        'AUTH_HEADER_MISSING'
      );
    }

    const token = authHeader.split(' ')[1];

    if (!config.jwt.publicKey) {
      throw new Error('JWT RSA public key is not loaded in fleet-dispatch-service');
    }

    const decoded = jwt.verify(token, config.jwt.publicKey, {
      algorithms: [config.jwt.algorithm],
      issuer: 'logisphere-auth-service',
    });

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId || null,
      accountType: decoded.accountType || null,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid access token', 'TOKEN_INVALID'));
    }
    next(error);
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Unauthenticated request', 'UNAUTHENTICATED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: required role ${allowedRoles.join(' or ')}`,
          'ROLE_UNAUTHORIZED'
        )
      );
    }

    next();
  };
};

const requireTenantScope = (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Unauthenticated request', 'UNAUTHENTICATED'));
  }

  if (req.user.role === 'PLATFORM_ADMIN') {
    return next();
  }

  const requestedOrgId =
    req.params.orgId ||
    req.params.organizationId ||
    req.body.organizationId ||
    req.query.organizationId;

  if (requestedOrgId && requestedOrgId !== req.user.organizationId) {
    return next(
      new ForbiddenError(
        'Cross-tenant resource access is strictly forbidden',
        'CROSS_TENANT_ACCESS_DENIED'
      )
    );
  }

  next();
};

module.exports = {
  authenticate,
  requireRole,
  requireTenantScope,
};
