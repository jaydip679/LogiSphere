const express = require('express');
const driverController = require('../controllers/driverController');
const vehicleController = require('../controllers/vehicleController');
const dispatchController = require('../controllers/dispatchController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');
const { idempotency } = require('../middlewares/idempotencyMiddleware');

const router = express.Router();

// Driver Management
router.post(
  '/drivers',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER'),
  driverController.createDriver
);

router.get(
  '/drivers',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  driverController.listDrivers
);

router.get(
  '/drivers/:id',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  driverController.getDriver
);

router.patch(
  '/drivers/:id/status',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER'),
  driverController.updateDriverStatus
);

// Vehicle Management
router.post(
  '/vehicles',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER'),
  vehicleController.createVehicle
);

router.get(
  '/vehicles',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  vehicleController.listVehicles
);

router.get(
  '/vehicles/:id',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  vehicleController.getVehicle
);

router.patch(
  '/vehicles/:id/status',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER'),
  vehicleController.updateVehicleStatus
);

// Dispatch Management
router.get(
  '/dispatch/available',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  dispatchController.getAvailableFleet
);

router.post(
  '/dispatch/assign',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  idempotency('dispatch_assign'),
  dispatchController.assignDispatch
);

router.post(
  '/dispatch/reassign',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  idempotency('dispatch_reassign'),
  dispatchController.reassignDispatch
);

router.get(
  '/dispatch/history/:shipmentId',
  authenticate,
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER', 'PLATFORM_ADMIN'),
  dispatchController.getShipmentHistory
);

module.exports = router;
