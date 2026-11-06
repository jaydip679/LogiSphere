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
const assignmentRepository = require('../repositories/assignmentRepository');
const driverRepository = require('../repositories/driverRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('fleet-dispatch-service:fleetEventConsumer');

class FleetEventConsumer {
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
        config.sqs.fleetQueueName || 'fleet-queue',
        { explicitUrl: config.sqs.fleetQueueUrl }
      );
      this.dlqUrl = await resolveQueueUrl(this.sqsClient, config.sqs.fleetDlqName || 'fleet-dlq', {
        explicitUrl: config.sqs.fleetDlqUrl,
      });
      logger.info(
        `FleetEventConsumer initialized queue URL: ${this.queueUrl} (DLQ: ${this.dlqUrl})`
      );
    } catch (err) {
      logger.warn(`Could not resolve fleet queue URL on initialization: ${err.message}`);
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

    const { shipmentId } = payload;
    if (!shipmentId) {
      logger.warn(`Event ${eventId} (${type}) does not contain shipmentId`);
      await eventRepository.markEventProcessed(eventId, type);
      return false;
    }

    // Only process terminal events that release driver & vehicle
    const terminalTypes = [
      ShipmentEventTypes.SHIPMENT_DELIVERED,
      ShipmentEventTypes.DELIVERY_FAILED,
      ShipmentEventTypes.SHIPMENT_CANCELLED,
    ];

    if (!terminalTypes.includes(type)) {
      await eventRepository.markEventProcessed(eventId, type);
      return true;
    }

    return prisma.$transaction(async (tx) => {
      const assignment = await assignmentRepository.findActiveByShipment(shipmentId, tx);
      if (!assignment) {
        logger.info(
          `No active dispatch assignment for shipment ${shipmentId}. Marking event processed.`
        );
        await eventRepository.markEventProcessed(eventId, type, tx);
        return true;
      }

      // 1. Release Vehicle
      if (assignment.vehicleId) {
        await vehicleRepository.updateStatus(assignment.vehicleId, 'AVAILABLE', tx);
      }

      // 2. Release Driver
      if (assignment.driverId) {
        await driverRepository.updateStatus(assignment.driverId, 'AVAILABLE', tx);
      }

      // 3. Mark Assignment Completed or Cancelled
      const targetStatus =
        type === ShipmentEventTypes.SHIPMENT_CANCELLED ? 'CANCELLED' : 'COMPLETED';
      await assignmentRepository.updateStatus(assignment.id, targetStatus, tx);

      // 4. Mark Event Processed for idempotency
      await eventRepository.markEventProcessed(eventId, type, tx);

      logger.info(`Released resources for shipment ${shipmentId} upon event ${type}`);
      return true;
    });
  }

  start(pollingIntervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('FleetEventConsumer polling started...');

    const poll = async () => {
      if (!this.isRunning) return;
      try {
        await this.pollMessages();
      } catch (err) {
        logger.error(`Error polling fleet queue: ${err.message}`);
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
    logger.info('FleetEventConsumer stopped');
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
            `Failed to process fleet message ${message.MessageId} (attempt ${receiveCount}): ${msgError.message}`
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
      logger.warn(`SQS poll warning in fleet consumer: ${err.message}`);
    }
  }
}

module.exports = new FleetEventConsumer();
