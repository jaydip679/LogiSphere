const rateLimit = require('express-rate-limit');
const { sendError, HttpStatus } = require('@logisphere/common-utils');

const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return sendError(res, message, HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED');
    },
  });
};

// Strict rate limit for authentication (login, registration)
const authLimiter = createLimiter(
  15 * 60 * 1000,
  30, // 30 requests per 15 minutes
  'Too many authentication requests from this IP. Please try again after 15 minutes.'
);

// High-frequency rate limit for public tracking queries
const trackingLimiter = createLimiter(
  60 * 1000,
  60, // 60 requests per minute
  'Too many tracking requests. Please slow down.'
);

// General rate limit for all API routes
const generalLimiter = createLimiter(
  60 * 1000,
  120, // 120 requests per minute
  'Too many requests to the API. Please try again shortly.'
);

module.exports = {
  authLimiter,
  trackingLimiter,
  generalLimiter,
};
