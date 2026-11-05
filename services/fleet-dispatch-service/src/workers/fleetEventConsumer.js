const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const config = require('../config');
const prisma = require('../database/prisma');
const eventRepository = require('../repositories/eventRepository');
const assignmentRepository = require('../repositories/assignmentRepository');
const driverRepository = require('../repositories/driverRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const { ShipmentEventTypes } = require('@logisphere/event-contracts');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('fleet-dispatch-service:fleetEventConsumer');

class FleetEventConsumer {
  constructor() {
    this.sqsClient = null;
    this.isRunning = false;
    this.timeoutId = null;

    if (config.sqs && config.sqs.fleetQueueUrl) {
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
      return true;
    }

    // Determine target assignment status based on event type
    let targetAssignmentStatus = null;
    if (type === ShipmentEventTypes.SHIPMENT_DELIVERED) {
      targetAssignmentStatus = 'COMPLETED';
    } else if (
      type === ShipmentEventTypes.SHIPMENT_CANCELLED ||
      type === ShipmentEventTypes.DELIVERY_FAILED
    ) {
      targetAssignmentStatus = 'CANCELLED';
    }

    if (!targetAssignmentStatus) {
      logger.info(`Event ${type} is not a fleet release trigger. Ignoring.`);
      await eventRepository.markEventProcessed(eventId, type);
      return true;
    }

    return prisma.$transaction(async (tx) => {
      // Find active assignment for this shipment
      const activeAssignment = await assignmentRepository.findActiveByShipment(shipmentId, tx);

      if (activeAssignment) {
        // Release driver and vehicle
        await driverRepository.updateStatus(activeAssignment.driverId, 'AVAILABLE', tx);
        await vehicleRepository.updateStatus(activeAssignment.vehicleId, 'AVAILABLE', tx);
        await assignmentRepository.updateStatus(activeAssignment.id, targetAssignmentStatus, tx);

        logger.info(
          `Released fleet assignment ${activeAssignment.id} (driver ${activeAssignment.driverId}, vehicle ${activeAssignment.vehicleId}) on event ${type}`
        );
      } else {
        logger.info(`No active dispatch assignment found for shipment ${shipmentId} upon ${type}`);
      }

      // Record event as processed
      await eventRepository.markEventProcessed(eventId, type, tx);
      return true;
    });
  }

  start(pollingIntervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`FleetEventConsumer polling started for queue: ${config.sqs.fleetQueueUrl}`);

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
    if (!this.sqsClient || !config.sqs.fleetQueueUrl) return;

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: config.sqs.fleetQueueUrl,
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

          // Acknowledge / delete message from queue
          const deleteCmd = new DeleteMessageCommand({
            QueueUrl: config.sqs.fleetQueueUrl,
            ReceiptHandle: message.ReceiptHandle,
          });
          await this.sqsClient.send(deleteCmd);
        } catch (msgError) {
          logger.error(`Failed to process message ${message.MessageId}: ${msgError.message}`);
        }
      }
    } catch (err) {
      // Quietly log connection failures in local dev/testing
      logger.warn(`SQS poll warning: ${err.message}`);
    }
  }
}

module.exports = new FleetEventConsumer();
