const express = require('express');
const adminController = require('../controllers/adminController');
const { validate } = require('@logisphere/common-utils');
const { reviewCompanySchema } = require('../validators/authValidators');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('PLATFORM_ADMIN'));

router.get('/organizations/pending', adminController.getPendingOrganizations);
router.get('/organizations', adminController.getAllOrganizations);
router.get('/organizations/:id', adminController.getOrganizationDetails);
router.post(
  '/organizations/:id/review',
  validate(reviewCompanySchema),
  adminController.reviewOrganization
);

module.exports = router;
