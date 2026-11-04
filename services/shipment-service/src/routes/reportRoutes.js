const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.post(
  '/export',
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'PLATFORM_ADMIN'),
  reportController.exportReport
);

router.get('/:id/download', reportController.downloadReport);

module.exports = router;
