const { ShipmentEventTypes, createDomainEvent } = require('./events/shipmentEvents');
const { QUEUES, EVENT_QUEUE_ROUTING, getQueuesForEvent } = require('./routing');

module.exports = {
  ShipmentEventTypes,
  createDomainEvent,
  QUEUES,
  EVENT_QUEUE_ROUTING,
  getQueuesForEvent,
};
