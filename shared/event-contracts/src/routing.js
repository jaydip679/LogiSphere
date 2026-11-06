const { ShipmentEventTypes } = require('./events/shipmentEvents');
const { QUEUE_BASE_NAMES, getEnvironmentPrefix, resolveQueueName } = require('./sqsHelper');

const QUEUES = Object.freeze({
  NOTIFICATION: resolveQueueName(QUEUE_BASE_NAMES.NOTIFICATION),
  NOTIFICATION_DLQ: resolveQueueName(QUEUE_BASE_NAMES.NOTIFICATION_DLQ),
  TRACKING: resolveQueueName(QUEUE_BASE_NAMES.TRACKING),
  TRACKING_DLQ: resolveQueueName(QUEUE_BASE_NAMES.TRACKING_DLQ),
  FLEET: resolveQueueName(QUEUE_BASE_NAMES.FLEET),
  FLEET_DLQ: resolveQueueName(QUEUE_BASE_NAMES.FLEET_DLQ),
});

/**
 * Event routing table determining which base SQS queues receive which event types
 */
const EVENT_QUEUE_ROUTING = Object.freeze({
  [ShipmentEventTypes.SHIPMENT_CREATED]: [QUEUE_BASE_NAMES.NOTIFICATION, QUEUE_BASE_NAMES.TRACKING],
  [ShipmentEventTypes.SHIPMENT_OFFER_CREATED]: [QUEUE_BASE_NAMES.NOTIFICATION],
  [ShipmentEventTypes.SHIPMENT_OFFER_ACCEPTED]: [
    QUEUE_BASE_NAMES.NOTIFICATION,
    QUEUE_BASE_NAMES.TRACKING,
  ],
  [ShipmentEventTypes.SHIPMENT_OFFER_REJECTED]: [QUEUE_BASE_NAMES.NOTIFICATION],
  [ShipmentEventTypes.QUOTE_SUBMITTED]: [QUEUE_BASE_NAMES.NOTIFICATION],
  [ShipmentEventTypes.QUOTE_ACCEPTED]: [QUEUE_BASE_NAMES.NOTIFICATION],
  [ShipmentEventTypes.DRIVER_ASSIGNED]: [QUEUE_BASE_NAMES.NOTIFICATION, QUEUE_BASE_NAMES.TRACKING],
  [ShipmentEventTypes.SHIPMENT_PICKED_UP]: [
    QUEUE_BASE_NAMES.NOTIFICATION,
    QUEUE_BASE_NAMES.TRACKING,
  ],
  [ShipmentEventTypes.SHIPMENT_IN_TRANSIT]: [
    QUEUE_BASE_NAMES.NOTIFICATION,
    QUEUE_BASE_NAMES.TRACKING,
  ],
  [ShipmentEventTypes.SHIPMENT_DELAYED]: [QUEUE_BASE_NAMES.NOTIFICATION, QUEUE_BASE_NAMES.TRACKING],
  [ShipmentEventTypes.SHIPMENT_OUT_FOR_DELIVERY]: [
    QUEUE_BASE_NAMES.NOTIFICATION,
    QUEUE_BASE_NAMES.TRACKING,
  ],
  [ShipmentEventTypes.SHIPMENT_DELIVERED]: [
    QUEUE_BASE_NAMES.NOTIFICATION,
    QUEUE_BASE_NAMES.TRACKING,
    QUEUE_BASE_NAMES.FLEET,
  ],
  [ShipmentEventTypes.DELIVERY_FAILED]: [
    QUEUE_BASE_NAMES.NOTIFICATION,
    QUEUE_BASE_NAMES.TRACKING,
    QUEUE_BASE_NAMES.FLEET,
  ],
  [ShipmentEventTypes.SHIPMENT_CANCELLED]: [
    QUEUE_BASE_NAMES.NOTIFICATION,
    QUEUE_BASE_NAMES.TRACKING,
    QUEUE_BASE_NAMES.FLEET,
  ],
});

const getQueuesForEvent = (eventType, prefix) => {
  const baseQueues = EVENT_QUEUE_ROUTING[eventType] || [QUEUE_BASE_NAMES.NOTIFICATION];
  return baseQueues.map((base) => resolveQueueName(base, prefix));
};

module.exports = {
  QUEUE_BASE_NAMES,
  QUEUES,
  EVENT_QUEUE_ROUTING,
  getQueuesForEvent,
  getEnvironmentPrefix,
  resolveQueueName,
};
