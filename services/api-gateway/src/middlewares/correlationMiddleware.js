const correlationMiddleware = (req, res, next) => {
  const correlationId =
    req.headers['x-correlation-id'] ||
    `corr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  next();
};

module.exports = correlationMiddleware;
