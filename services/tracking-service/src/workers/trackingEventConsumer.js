const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const config = require('../config');
const prisma = require('../database/prisma');
const eventRepository = require('../repositories/eventRepository');
const trackingRepository = require('../repositories/trackingRepository');
const { ShipmentEventTypes } = require('@logisphere/event-contracts');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('tracking-service:trackingEventConsumer');

const EVENT_STATUS_MAP = Object.freeze({
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
    this.sqsClient = null;
    this.isRunning = false;
    this.timeoutId = null;

    if (config.sqs && config.sqs.trackingQueueUrl) {
      this.sqsClient = new SQSClient({
        region: config.sqs.region,
        endpoint: config.sqs.endpoint,
        credentials: {
          accessKeyId: config.sqs.accessKeyId,
          secretAccessKey: config.sqs.secretAccessKey,
        },
      });
    }
  }

  async handleDomainEvent(event) {
    const { id: eventId, type, payload } = event;
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

    const {
      shipmentId,
      trackingNumber,
      location,
      latitude,
      longitude,
      actorId,
      reason,
      notes,
      metadata,
    } = payload;

    if (!trackingNumber && !shipmentId) {
      logger.warn(`Event ${eventId} (${type}) missing trackingNumber/shipmentId. Skipping.`);
      await eventRepository.markEventProcessed(eventId, type);
      return true;
    }

    const resolvedTrackingNumber = trackingNumber || `TRK-${shipmentId}`;

    return prisma.$transaction(async (tx) => {
      await trackingRepository.createEvent(
        {
          trackingNumber: resolvedTrackingNumber,
          shipmentId: shipmentId || 'UNKNOWN',
          status: mapping.status,
          source: mapping.source,
          location: location || null,
          latitude: latitude || null,
          longitude: longitude || null,
          actorId: actorId || null,
          notes: reason || notes || null,
          metadata: metadata || null,
        },
        tx
      );

      await eventRepository.markEventProcessed(eventId, type, tx);

      logger.info(
        `Appended milestone ${mapping.status} for ${resolvedTrackingNumber} on event ${type}`
      );
      return true;
    });
  }

  start(pollingIntervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`TrackingEventConsumer polling started for queue: ${config.sqs.trackingQueueUrl}`);

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
    if (!this.sqsClient || !config.sqs.trackingQueueUrl) return;

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: config.sqs.trackingQueueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 2,
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
            QueueUrl: config.sqs.trackingQueueUrl,
            ReceiptHandle: message.ReceiptHandle,
          });
          await this.sqsClient.send(deleteCmd);
        } catch (msgError) {
          logger.error(`Failed to process message ${message.MessageId}: ${msgError.message}`);
        }
      }
    } catch (err) {
      logger.warn(`SQS poll warning: ${err.message}`);
    }
  }
}

module.exports = new TrackingEventConsumer();
