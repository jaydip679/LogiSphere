const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.getUserNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markNotificationRead);

module.exports = router;
