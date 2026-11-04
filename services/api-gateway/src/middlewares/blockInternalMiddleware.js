const { NotFoundError } = require('@logisphere/common-utils');

const blockInternalRoutes = (req, res, next) => {
  const normalizedPath = req.originalUrl.toLowerCase();

  // Shield all internal endpoints from external gateway access
  if (
    normalizedPath.startsWith('/internal') ||
    normalizedPath.includes('/internal/') ||
    normalizedPath.includes('/api/v1/internal')
  ) {
    return next(new NotFoundError('The requested endpoint was not found', 'ROUTE_NOT_FOUND'));
  }

  next();
};

module.exports = {
  blockInternalRoutes,
};
