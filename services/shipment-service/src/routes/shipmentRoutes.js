const express = require('express');
const shipmentController = require('../controllers/shipmentController');
const { validate } = require('@logisphere/common-utils');
const {
  priceEstimateSchema,
  createShipmentSchema,
  quoteSubmissionSchema,
  assignDispatchSchema,
  milestoneTransitionSchema,
  failureDispositionSchema,
} = require('../validators/shipmentValidators');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');
const idempotency = require('../middlewares/idempotencyMiddleware');

const router = express.Router();

// Public / Pre-auth estimate calculation
router.post('/estimate-price', validate(priceEstimateSchema), shipmentController.estimatePrice);

// Protected routes
router.use(authenticate);

// Customer endpoints
router.post(
  '/',
  requireRole('CUSTOMER'),
  idempotency('CREATE_SHIPMENT'),
  validate(createShipmentSchema),
  shipmentController.createShipment
);
router.get('/', requireRole('CUSTOMER'), shipmentController.getMyShipments);
router.post('/:id/cancel', shipmentController.cancelShipment);
router.post('/:id/retry-matching', requireRole('CUSTOMER'), shipmentController.retryMatching);
router.post(
  '/:id/quotes/:quoteId/respond',
  requireRole('CUSTOMER'),
  shipmentController.respondToQuote
);

// Logistics Company Endpoints (Owner, Manager, Dispatcher)
router.get(
  '/offers/inbox',
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  shipmentController.getOffersInbox
);
router.post(
  '/offers/:offerId/accept',
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  shipmentController.acceptOffer
);
router.post(
  '/offers/:offerId/reject',
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  shipmentController.rejectOffer
);
router.post(
  '/offers/:offerId/quote',
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER'),
  validate(quoteSubmissionSchema),
  shipmentController.submitQuote
);
router.post(
  '/:id/assign',
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  validate(assignDispatchSchema),
  shipmentController.assignDispatch
);
router.post(
  '/:id/failure-disposition',
  requireRole('COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'),
  validate(failureDispositionSchema),
  shipmentController.handleFailureDisposition
);

// Driver Endpoints
router.get('/driver/assigned', requireRole('DRIVER'), shipmentController.getDriverAssignments);
router.post(
  '/:id/milestones',
  requireRole('DRIVER'),
  validate(milestoneTransitionSchema),
  shipmentController.updateMilestone
);

// Generic detail query
router.get('/:id', shipmentController.getShipmentDetails);

module.exports = router;
