const express = require('express');
const organizationController = require('../controllers/organizationController');
const { validate } = require('@logisphere/common-utils');
const { companyRegistrationSchema, createStaffSchema } = require('../validators/authValidators');
const {
  authenticate,
  requireRole,
  requireActiveOrganization,
} = require('../middlewares/authMiddleware');

const router = express.Router();

// Public self-service registration
router.post(
  '/register/company',
  validate(companyRegistrationSchema),
  organizationController.registerCompany
);

// Protected organization management
router.get(
  '/me',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER', 'DRIVER'),
  organizationController.getMyOrganization
);

// Staff provisioning: restricted to approved organizations and Owner/Manager roles
router.post(
  '/staff',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER'),
  requireActiveOrganization,
  validate(createStaffSchema),
  organizationController.addStaffMember
);

module.exports = router;
