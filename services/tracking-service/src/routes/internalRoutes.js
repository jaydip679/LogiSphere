const express = require('express');
const internalTrackingController = require('../controllers/internalTrackingController');
const { requireInternalServiceKey } = require('../middlewares/internalAuthMiddleware');

const router = express.Router();

router.use(requireInternalServiceKey);

router.post('/tracking/events', internalTrackingController.recordMilestone);
router.get('/tracking/:trackingNumber', internalTrackingController.getTimeline);

module.exports = router;
