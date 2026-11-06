const { ShipmentEventTypes } = require('./events/shipmentEvents');

const QUEUES = Object.freeze({
  NOTIFICATION: 'logisphere-notification-queue',
  TRACKING: 'logisphere-tracking-queue',
  FLEET: 'logisphere-fleet-queue',
});

/**
 * Event routing table determining which SQS queues receive which event types
 */
const EVENT_QUEUE_ROUTING = Object.freeze({
  [ShipmentEventTypes.SHIPMENT_CREATED]: [QUEUES.NOTIFICATION, QUEUES.TRACKING],
  [ShipmentEventTypes.SHIPMENT_OFFER_CREATED]: [QUEUES.NOTIFICATION],
  [ShipmentEventTypes.SHIPMENT_OFFER_ACCEPTED]: [QUEUES.NOTIFICATION, QUEUES.TRACKING],
  [ShipmentEventTypes.SHIPMENT_OFFER_REJECTED]: [QUEUES.NOTIFICATION],
  [ShipmentEventTypes.QUOTE_SUBMITTED]: [QUEUES.NOTIFICATION],
  [ShipmentEventTypes.QUOTE_ACCEPTED]: [QUEUES.NOTIFICATION],
  [ShipmentEventTypes.DRIVER_ASSIGNED]: [QUEUES.NOTIFICATION, QUEUES.TRACKING],
  [ShipmentEventTypes.SHIPMENT_PICKED_UP]: [QUEUES.NOTIFICATION, QUEUES.TRACKING],
  [ShipmentEventTypes.SHIPMENT_IN_TRANSIT]: [QUEUES.NOTIFICATION, QUEUES.TRACKING],
  [ShipmentEventTypes.SHIPMENT_DELAYED]: [QUEUES.NOTIFICATION, QUEUES.TRACKING],
  [ShipmentEventTypes.SHIPMENT_OUT_FOR_DELIVERY]: [QUEUES.NOTIFICATION, QUEUES.TRACKING],
  [ShipmentEventTypes.SHIPMENT_DELIVERED]: [QUEUES.NOTIFICATION, QUEUES.TRACKING, QUEUES.FLEET],
  [ShipmentEventTypes.DELIVERY_FAILED]: [QUEUES.NOTIFICATION, QUEUES.TRACKING, QUEUES.FLEET],
  [ShipmentEventTypes.SHIPMENT_CANCELLED]: [QUEUES.NOTIFICATION, QUEUES.TRACKING, QUEUES.FLEET],
});

const getQueuesForEvent = (eventType) => {
  return EVENT_QUEUE_ROUTING[eventType] || [QUEUES.NOTIFICATION];
};

module.exports = {
  QUEUES,
  EVENT_QUEUE_ROUTING,
  getQueuesForEvent,
};
