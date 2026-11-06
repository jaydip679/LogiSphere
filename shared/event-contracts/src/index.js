const { ShipmentEventTypes, createDomainEvent } = require('./events/shipmentEvents');
const {
  QUEUE_BASE_NAMES,
  QUEUES,
  EVENT_QUEUE_ROUTING,
  getQueuesForEvent,
  getEnvironmentPrefix,
  resolveQueueName,
} = require('./routing');
const { createSqsClient, resolveQueueUrl, forwardToDlq, queueUrlCache } = require('./sqsHelper');

module.exports = {
  ShipmentEventTypes,
  createDomainEvent,
  QUEUE_BASE_NAMES,
  QUEUES,
  EVENT_QUEUE_ROUTING,
  getQueuesForEvent,
  getEnvironmentPrefix,
  resolveQueueName,
  createSqsClient,
  resolveQueueUrl,
  forwardToDlq,
  queueUrlCache,
};
