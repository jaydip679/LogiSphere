const express = require('express');
const internalAssignmentController = require('../controllers/internalAssignmentController');
const { requireInternalServiceKey } = require('../middlewares/internalAuthMiddleware');

const router = express.Router();

router.use(requireInternalServiceKey);

router.get('/fleet/capacity', internalAssignmentController.getCapacity);
router.post('/assignments/reserve', internalAssignmentController.reserveAssignment);
router.post('/assignments/confirm', internalAssignmentController.confirmAssignment);
router.post('/assignments/cancel', internalAssignmentController.cancelAssignment);
router.post(
  '/assignments/release-by-shipment/:shipmentId',
  internalAssignmentController.releaseByShipment
);

module.exports = router;
