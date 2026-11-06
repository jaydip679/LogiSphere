const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const shipmentRoutes = require('./routes/shipmentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const internalShipmentRoutes = require('./routes/internalShipmentRoutes');
const errorHandler = require('./middlewares/errorMiddleware');
const { sendSuccess } = require('@logisphere/common-utils');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Correlation ID tracking
app.use((req, res, next) => {
  req.correlationId =
    req.headers['x-correlation-id'] ||
    `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  return sendSuccess(res, 'Shipment service is healthy', {
    service: 'shipment-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use('/api/v1/shipments', shipmentRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/internal/shipments', internalShipmentRoutes);
app.use('/api/v1/internal/shipments', internalShipmentRoutes);

// Centralized error handling
app.use(errorHandler);

module.exports = app;
