const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');
const { authLimiter, trackingLimiter } = require('../middlewares/rateLimiterMiddleware');
const { sendError, HttpStatus } = require('@logisphere/common-utils');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('api-gateway:proxy');

const createServiceProxy = (targetUrl) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        if (req.correlationId) {
          proxyReq.setHeader('x-correlation-id', req.correlationId);
        }
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        }
        if (req.headers['x-user-role']) {
          proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
        }
        if (req.headers['x-user-org-id']) {
          proxyReq.setHeader('x-user-org-id', req.headers['x-user-org-id']);
        }
      },
      error: (err, req, res) => {
        logger.error(`Proxy forwarding error to ${targetUrl}: ${err.message}`);
        if (res && !res.headersSent) {
          if (typeof res.status === 'function') {
            sendError(
              res,
              'Downstream microservice is temporarily unavailable',
              HttpStatus.BAD_GATEWAY,
              'SERVICE_UNAVAILABLE'
            );
          } else {
            res.writeHead(HttpStatus.BAD_GATEWAY, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: false,
                message: 'Downstream microservice is temporarily unavailable',
                error: { code: 'SERVICE_UNAVAILABLE' },
              })
            );
          }
        }
      },
    },
  });
};

const router = express.Router();

// 1. Auth Service Routes (rate-limited for auth endpoints)
router.use('/api/v1/auth', authLimiter, createServiceProxy(config.services.auth));
router.use('/api/v1/organizations', createServiceProxy(config.services.auth));
router.use('/api/v1/admin', createServiceProxy(config.services.auth));

// 2. Shipment Service Routes
router.use('/api/v1/shipments', createServiceProxy(config.services.shipment));
router.use('/api/v1/reports', createServiceProxy(config.services.shipment));

// 3. Fleet & Dispatch Service Routes
router.use('/api/v1/fleet', createServiceProxy(config.services.fleet));

// 4. Tracking Service Routes (with public tracking rate limit)
router.use('/api/v1/tracking', trackingLimiter, createServiceProxy(config.services.tracking));

// 5. Notification Service Routes
router.use('/api/v1/notifications', createServiceProxy(config.services.notification));

module.exports = router;
