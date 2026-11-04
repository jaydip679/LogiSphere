const ShipmentEventTypes = Object.freeze({
  SHIPMENT_CREATED: 'ShipmentCreated',
  SHIPMENT_OFFER_CREATED: 'ShipmentOfferCreated',
  SHIPMENT_OFFER_ACCEPTED: 'ShipmentOfferAccepted',
  SHIPMENT_OFFER_REJECTED: 'ShipmentOfferRejected',
  QUOTE_SUBMITTED: 'QuoteSubmitted',
  QUOTE_ACCEPTED: 'QuoteAccepted',
  DRIVER_ASSIGNED: 'DriverAssigned',
  SHIPMENT_PICKED_UP: 'ShipmentPickedUp',
  SHIPMENT_IN_TRANSIT: 'ShipmentInTransit',
  SHIPMENT_DELAYED: 'ShipmentDelayed',
  SHIPMENT_OUT_FOR_DELIVERY: 'ShipmentOutForDelivery',
  SHIPMENT_DELIVERED: 'ShipmentDelivered',
  DELIVERY_FAILED: 'DeliveryFailed',
  SHIPMENT_CANCELLED: 'ShipmentCancelled',
});

/**
 * Creates a standardized versioned domain event envelope
 */
const createDomainEvent = ({
  eventType,
  aggregateId,
  producer = 'shipment-service',
  version = '1.0',
  correlationId = null,
  payload = {},
}) => {
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    eventType,
    aggregateId,
    producer,
    version,
    timestamp: new Date().toISOString(),
    correlationId,
    payload,
  };
};

module.exports = {
  ShipmentEventTypes,
  createDomainEvent,
};
