const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { blockInternalRoutes } = require('./middlewares/blockInternalMiddleware');
const correlationMiddleware = require('./middlewares/correlationMiddleware');
const { validateJwtIfExists } = require('./middlewares/jwtValidationMiddleware');
const { generalLimiter } = require('./middlewares/rateLimiterMiddleware');
const healthController = require('./controllers/healthController');
const proxyRouter = require('./proxy/proxyRouter');
const errorHandler = require('./middlewares/errorMiddleware');

const app = express();

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')) {
    return true;
  }
  if (config.corsPreviewPattern && config.corsPreviewPattern.test(origin)) {
    return true;
  }
  return false;
};

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// 1. Strict blocking of internal endpoints
app.use(blockInternalRoutes);

// 2. Correlation ID tracking
app.use(correlationMiddleware);

// 3. General rate limiter
app.use(generalLimiter);

// 4. JWT pre-validation & identity context injection
app.use(validateJwtIfExists);

// 5. Aggregated health check
app.get('/health', (req, res) => healthController.getHealth(req, res));

// 6. Reverse Proxy Routes
app.use(proxyRouter);

// 7. Centralized Error Handling
app.use(errorHandler);

module.exports = app;
