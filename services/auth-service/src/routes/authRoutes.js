const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { validate, HttpStatus } = require('@logisphere/common-utils');
const {
  loginSchema,
  customerRegistrationSchema,
  changePasswordSchema,
} = require('../validators/authValidators');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Rate limiters for abuse-sensitive endpoints (disabled in test environment)
const isTestEnv = process.env.NODE_ENV === 'test';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 1000 : 20, // 20 attempts per 15 minutes in production
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTestEnv ? 1000 : 10, // 10 registrations per hour
  message: {
    success: false,
    message: 'Too many accounts registered from this IP. Please try again later.',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
});

router.post(
  '/register/customer',
  registrationLimiter,
  validate(customerRegistrationSchema),
  authController.registerCustomer
);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authController.logout);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

module.exports = router;
