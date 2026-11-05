const express = require('express');
const internalController = require('../controllers/internalController');
const { requireInternalServiceKey } = require('../middlewares/internalAuthMiddleware');

const router = express.Router();

router.use(requireInternalServiceKey);

router.get('/organizations/coverage', internalController.getCoverage);
router.get('/organizations/:id', internalController.getOrganization);
router.post('/users/verify-email', internalController.verifyUserEmail);

module.exports = router;
