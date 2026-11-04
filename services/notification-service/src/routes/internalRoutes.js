const express = require('express');
const internalNotificationController = require('../controllers/internalNotificationController');
const { requireInternalServiceKey } = require('../middlewares/internalAuthMiddleware');

const router = express.Router();

router.use(requireInternalServiceKey);

router.post('/notifications/in-app', internalNotificationController.createInApp);
router.post('/notifications/email', internalNotificationController.sendEmail);

module.exports = router;
