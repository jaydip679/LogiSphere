const { verifyAccessToken } = require('../utils/tokenUtils');
const prisma = require('../database/prisma');
const { UnauthorizedError, ForbiddenError } = require('@logisphere/common-utils');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError(
        'Missing or malformed Authorization header',
        'AUTH_HEADER_MISSING'
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId || null,
      accountType: decoded.accountType || null,
    };

    next();
  } catch (error) {
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

const requireActiveOrganization = async (req, res, next) => {
  if (!req.user || !req.user.organizationId) {
    return next(
      new ForbiddenError('User does not belong to any organization', 'ORGANIZATION_REQUIRED')
    );
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { id: true, status: true },
    });

    if (!org) {
      return next(new ForbiddenError('Organization not found', 'ORGANIZATION_NOT_FOUND'));
    }

    if (org.status === 'PENDING_REVIEW') {
      return next(
        new ForbiddenError(
          'Your organization registration is currently under review by platform administrators',
          'ORGANIZATION_PENDING_REVIEW'
        )
      );
    }

    if (org.status === 'REJECTED') {
      return next(
        new ForbiddenError(
          'Your organization application has been rejected',
          'ORGANIZATION_REJECTED'
        )
      );
    }

    if (org.status === 'SUSPENDED') {
      return next(
        new ForbiddenError('Your organization account has been suspended', 'ORGANIZATION_SUSPENDED')
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

const requireTenantScope = (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Unauthenticated request', 'UNAUTHENTICATED'));
  }

  // Platform admin can bypass individual tenant scope for oversight
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
  requireActiveOrganization,
  requireTenantScope,
};
