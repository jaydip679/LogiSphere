const { ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const {
  createSqsClient,
  resolveQueueUrl,
  forwardToDlq,
  ShipmentEventTypes,
} = require('@logisphere/event-contracts');
const config = require('../config');
const prisma = require('../database/prisma');
const eventRepository = require('../repositories/eventRepository');
const trackingRepository = require('../repositories/trackingRepository');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('tracking-service:trackingEventConsumer');

const EVENT_STATUS_MAP = Object.freeze({
  [ShipmentEventTypes.SHIPMENT_CREATED]: { status: 'CREATED', source: 'CUSTOMER' },
  [ShipmentEventTypes.SHIPMENT_OFFER_ACCEPTED]: { status: 'CONFIRMED', source: 'CARRIER' },
  [ShipmentEventTypes.DRIVER_ASSIGNED]: { status: 'ASSIGNED', source: 'DISPATCHER' },
  [ShipmentEventTypes.SHIPMENT_PICKED_UP]: { status: 'PICKED_UP', source: 'DRIVER' },
  [ShipmentEventTypes.SHIPMENT_IN_TRANSIT]: { status: 'IN_TRANSIT', source: 'SYSTEM' },
  [ShipmentEventTypes.SHIPMENT_DELAYED]: { status: 'DELAYED', source: 'DRIVER' },
  [ShipmentEventTypes.SHIPMENT_OUT_FOR_DELIVERY]: { status: 'OUT_FOR_DELIVERY', source: 'DRIVER' },
  [ShipmentEventTypes.SHIPMENT_DELIVERED]: { status: 'DELIVERED', source: 'DRIVER' },
  [ShipmentEventTypes.DELIVERY_FAILED]: { status: 'DELIVERY_FAILED', source: 'DRIVER' },
  [ShipmentEventTypes.SHIPMENT_CANCELLED]: { status: 'CANCELLED', source: 'SYSTEM' },
});

class TrackingEventConsumer {
  constructor() {
    this.sqsClient = createSqsClient(config.sqs);
    this.isRunning = false;
    this.timeoutId = null;
    this.queueUrl = null;
    this.dlqUrl = null;
  }

  async initializeQueueUrls() {
    if (this.queueUrl) return this.queueUrl;
    try {
      this.queueUrl = await resolveQueueUrl(
        this.sqsClient,
        config.sqs.trackingQueueName || 'tracking-queue',
        { explicitUrl: config.sqs.trackingQueueUrl }
      );
      this.dlqUrl = await resolveQueueUrl(
        this.sqsClient,
        config.sqs.trackingDlqName || 'tracking-dlq',
        { explicitUrl: config.sqs.trackingDlqUrl }
      );
      logger.info(
        `TrackingEventConsumer initialized queue URL: ${this.queueUrl} (DLQ: ${this.dlqUrl})`
      );
    } catch (err) {
      logger.warn(`Could not resolve tracking queue URL on initialization: ${err.message}`);
    }
    return this.queueUrl;
  }

  async handleDomainEvent(event) {
    const eventId = event.id || event.eventId;
    const type = event.type || event.eventType;
    const payload = event.payload;
    if (!eventId || !type || !payload) {
      logger.warn('Skipping malformed domain event', { event });
      return false;
    }

    // Idempotent event check
    const alreadyProcessed = await eventRepository.isEventProcessed(eventId);
    if (alreadyProcessed) {
      logger.info(`Event ${eventId} (${type}) already processed. Skipping.`);
      return true;
    }

    const mapping = EVENT_STATUS_MAP[type];
    if (!mapping) {
      logger.info(`Event ${type} is not tracked on timeline. Ignoring.`);
      await eventRepository.markEventProcessed(eventId, type);
      return true;
    }

    const trackingNumber =
      payload.trackingNumber || (payload.shipmentId ? `TRK-${payload.shipmentId}` : null);

    if (!trackingNumber) {
      logger.warn(`No trackingNumber found in event payload for ${eventId}`);
      await eventRepository.markEventProcessed(eventId, type);
      return false;
    }

    return prisma.$transaction(async (tx) => {
      // 1. Append Tracking Milestone Event
      await trackingRepository.createEvent(
        {
          trackingNumber,
          shipmentId: payload.shipmentId || null,
          status: mapping.status,
          notes:
            payload.notes ||
            payload.reason ||
            payload.delayReason ||
            `Shipment transitioned to ${mapping.status}`,
          location: payload.location || payload.currentHub || null,
          source: mapping.source,
          metadata: {
            eventId,
            eventType: type,
            driverId: payload.driverId || null,
            vehicleId: payload.vehicleId || null,
            failureReason: payload.failureReason || null,
          },
        },
        tx
      );

      // 2. Mark event as processed (Idempotency guarantee)
      await eventRepository.markEventProcessed(eventId, type, tx);

      logger.info(`Appended milestone ${mapping.status} for ${trackingNumber} on event ${type}`);
      return true;
    });
  }

  start(pollingIntervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('TrackingEventConsumer polling started...');

    const poll = async () => {
      if (!this.isRunning) return;
      try {
        await this.pollMessages();
      } catch (err) {
        logger.error(`Error polling tracking queue: ${err.message}`);
      }
      if (this.isRunning) {
        this.timeoutId = setTimeout(poll, pollingIntervalMs);
      }
    };

    poll();
  }

  stop() {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    logger.info('TrackingEventConsumer stopped');
  }

  async pollMessages() {
    if (!this.sqsClient) return;
    const queueUrl = await this.initializeQueueUrls();
    if (!queueUrl) return;

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 2,
        AttributeNames: ['ApproximateReceiveCount'],
      });

      const response = await this.sqsClient.send(command);
      if (!response.Messages || response.Messages.length === 0) {
        return;
      }

      for (const message of response.Messages) {
        try {
          const body = JSON.parse(message.Body);
          await this.handleDomainEvent(body);

          const deleteCmd = new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          });
          await this.sqsClient.send(deleteCmd);
        } catch (msgError) {
          const receiveCount = parseInt(message.Attributes?.ApproximateReceiveCount || '1', 10);
          logger.error(
            `Failed to process tracking message ${message.MessageId} (attempt ${receiveCount}): ${msgError.message}`
          );

          if (receiveCount >= 5 && this.dlqUrl) {
            await forwardToDlq(this.sqsClient, this.dlqUrl, message.Body, msgError.message, {
              queueUrl,
              messageId: message.MessageId,
            });
            const deleteCmd = new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: message.ReceiptHandle,
            });
            await this.sqsClient.send(deleteCmd);
          }
        }
      }
    } catch (err) {
      logger.warn(`SQS poll warning in tracking consumer: ${err.message}`);
    }
  }
}

module.exports = new TrackingEventConsumer();
