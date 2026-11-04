const express = require('express');
const authController = require('../controllers/authController');
const { validate } = require('@logisphere/common-utils');
const {
  loginSchema,
  customerRegistrationSchema,
  changePasswordSchema,
} = require('../validators/authValidators');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post(
  '/register/customer',
  validate(customerRegistrationSchema),
  authController.registerCustomer
);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
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
