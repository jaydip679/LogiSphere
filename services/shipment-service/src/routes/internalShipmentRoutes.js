const express = require('express');
const shipmentRepository = require('../repositories/shipmentRepository');
const { requireInternalServiceKey } = require('../middlewares/internalAuthMiddleware');
const { sendSuccess, sendError, HttpStatus } = require('@logisphere/common-utils');

const router = express.Router();

router.use(requireInternalServiceKey);

router.get('/by-tracking/:trackingNumber', async (req, res, next) => {
  try {
    const { trackingNumber } = req.params;
    const shipment = await shipmentRepository.findByTrackingNumber(trackingNumber);
    if (!shipment) {
      return sendError(res, 'Shipment not found', HttpStatus.NOT_FOUND, 'SHIPMENT_NOT_FOUND');
    }
    return sendSuccess(res, 'Shipment found', shipment, HttpStatus.OK);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
