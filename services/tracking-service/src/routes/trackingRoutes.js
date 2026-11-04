const express = require('express');
const trackingController = require('../controllers/trackingController');
const {
  authenticate,
  optionalAuthenticate,
  requireRole,
} = require('../middlewares/authMiddleware');

const router = express.Router();

// Public / Customer Tracking Timeline Query
router.get('/:trackingNumber', optionalAuthenticate, trackingController.getTimeline);

// Route Simulator Generation (Protected by Admin/Manager/Dispatcher)
router.post(
  '/:trackingNumber/simulate',
  authenticate,
  requireRole('PLATFORM_ADMIN', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  trackingController.startSimulation
);

module.exports = router;
