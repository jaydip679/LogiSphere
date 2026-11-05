const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  SendMessageCommand,
} = require('@aws-sdk/client-sqs');
const config = require('../config');
const prisma = require('../database/prisma');
const eventRepository = require('../repositories/eventRepository');
const notificationRepository = require('../repositories/notificationRepository');
const emailService = require('../services/emailService');
const { ShipmentEventTypes } = require('@logisphere/event-contracts');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('notification-service:notificationEventConsumer');

class NotificationEventConsumer {
  constructor() {
    this.sqsClient = null;
    this.isRunning = false;
    this.timeoutId = null;

    if (config.sqs && config.sqs.notificationQueueUrl) {
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

  buildNotificationTemplates(event) {
    const { type, payload } = event;
    const trackingNumber = payload.trackingNumber || `TRK-${payload.shipmentId || 'UNKNOWN'}`;
    const notifications = [];

    switch (type) {
      case ShipmentEventTypes.SHIPMENT_CREATED:
        if (payload.customerId) {
          notifications.push({
            recipientId: payload.customerId,
            title: 'Shipment Request Created',
            message: `Shipment ${trackingNumber} has been registered and is matching with logistics partners.`,
            category: 'SHIPMENT',
          });
        }
        break;

      case ShipmentEventTypes.SHIPMENT_OFFER_CREATED:
        if (payload.organizationId) {
          notifications.push({
            recipientId: payload.organizationId,
            organizationId: payload.organizationId,
            title: 'New Shipment Request Available',
            message: `A new shipment offer for route ${payload.pickupHub || 'Hub'} -> ${payload.deliveryHub || 'Hub'} is waiting for review.`,
            category: 'OFFER',
          });
        }
        break;

      case ShipmentEventTypes.SHIPMENT_OFFER_ACCEPTED:
        if (payload.customerId) {
          notifications.push({
            recipientId: payload.customerId,
            title: 'Shipment Offer Accepted',
            message: `Your shipment ${trackingNumber} has been accepted by a logistics partner.`,
            category: 'OFFER',
          });
        }
        break;

      case ShipmentEventTypes.QUOTE_SUBMITTED:
        if (payload.customerId) {
          const priceText = payload.quotedPricePaise
            ? `₹${(payload.quotedPricePaise / 100).toFixed(2)}`
            : 'revised rate';
          notifications.push({
            recipientId: payload.customerId,
            title: 'Revised Quote Received',
            message: `A quote of ${priceText} was submitted for shipment ${trackingNumber}. Please review and respond.`,
            category: 'QUOTE',
          });
        }
        break;

      case ShipmentEventTypes.QUOTE_ACCEPTED:
        if (payload.organizationId) {
          notifications.push({
            recipientId: payload.organizationId,
            organizationId: payload.organizationId,
            title: 'Quote Accepted by Customer',
            message: `The customer accepted your revised quote for shipment ${trackingNumber}.`,
            category: 'QUOTE',
          });
        }
        break;

      case ShipmentEventTypes.DRIVER_ASSIGNED:
        if (payload.customerId) {
          notifications.push({
            recipientId: payload.customerId,
            title: 'Driver Assigned',
            message: `Driver and vehicle have been assigned to shipment ${trackingNumber}.`,
            category: 'DISPATCH',
          });
        }
        if (payload.driverId) {
          notifications.push({
            recipientId: payload.driverId,
            title: 'New Dispatch Assignment',
            message: `You have been assigned to pickup shipment ${trackingNumber}.`,
            category: 'DISPATCH',
          });
        }
        break;

      case ShipmentEventTypes.SHIPMENT_PICKED_UP:
        if (payload.customerId) {
          notifications.push({
            recipientId: payload.customerId,
            title: 'Package Picked Up',
            message: `Your package for shipment ${trackingNumber} has been picked up.`,
            category: 'MILESTONE',
          });
        }
        break;

      case ShipmentEventTypes.SHIPMENT_IN_TRANSIT:
        if (payload.customerId) {
          notifications.push({
            recipientId: payload.customerId,
            title: 'Shipment In Transit',
            message: `Shipment ${trackingNumber} is moving toward its destination.`,
            category: 'MILESTONE',
          });
        }
        break;

      case ShipmentEventTypes.SHIPMENT_DELAYED:
        if (payload.customerId) {
          notifications.push({
            recipientId: payload.customerId,
            title: 'Shipment Delayed',
            message: `Shipment ${trackingNumber} has encountered a delay: ${payload.reason || 'Operational delay'}.`,
            category: 'MILESTONE',
          });
        }
        break;

      case ShipmentEventTypes.SHIPMENT_OUT_FOR_DELIVERY:
        if (payload.customerId) {
          notifications.push({
            recipientId: payload.customerId,
            title: 'Out for Delivery',
            message: `Shipment ${trackingNumber} is out for delivery today.`,
            category: 'MILESTONE',
          });
        }
        break;

      case ShipmentEventTypes.SHIPMENT_DELIVERED:
        if (payload.customerId) {
          notifications.push({
            recipientId: payload.customerId,
            title: 'Shipment Delivered',
            message: `Your shipment ${trackingNumber} has been successfully delivered.`,
            category: 'MILESTONE',
          });
        }
        break;

      case ShipmentEventTypes.DELIVERY_FAILED:
        if (payload.customerId) {
          notifications.push({
            recipientId: payload.customerId,
            title: 'Delivery Attempt Failed',
            message: `Delivery attempt for shipment ${trackingNumber} failed: ${payload.reason || 'Recipient unavailable'}.`,
            category: 'MILESTONE',
          });
        }
        break;

      case ShipmentEventTypes.SHIPMENT_CANCELLED:
        if (payload.customerId) {
          notifications.push({
            recipientId: payload.customerId,
            title: 'Shipment Cancelled',
            message: `Shipment ${trackingNumber} was cancelled.`,
            category: 'SHIPMENT',
          });
        }
        break;

      default:
        logger.info(`No in-app notification template defined for event type ${type}`);
    }

    return notifications;
  }

  async handleDomainEvent(event) {
    const eventId = event.id || event.eventId;
    const type = event.type || event.eventType;
    const payload = event.payload;
    if (!eventId || !type || !payload) {
      logger.warn('Skipping malformed domain event in notification consumer', { event });
      return false;
    }

    // Idempotency check: deduplicate using eventId
    const alreadyProcessed = await eventRepository.isEventProcessed(eventId);
    if (alreadyProcessed) {
      logger.info(`Event ${eventId} (${type}) already processed. Skipping duplicate.`);
      return true;
    }

    const templates = this.buildNotificationTemplates(event);

    return prisma.$transaction(async (tx) => {
      // 1. Create In-App Notifications
      for (const tpl of templates) {
        await notificationRepository.createNotification(
          {
            recipientId: tpl.recipientId,
            organizationId: tpl.organizationId || null,
            title: tpl.title,
            message: tpl.message,
            category: tpl.category,
            metadata: {
              eventId,
              eventType: type,
              shipmentId: payload.shipmentId || null,
              trackingNumber: payload.trackingNumber || null,
            },
          },
          tx
        );
      }

      // 2. Mark Event Processed
      await eventRepository.markEventProcessed(eventId, type, tx);

      // 3. Optional Email Dispatch for Critical Milestones
      if (payload.customerEmail && templates.length > 0) {
        // Asynchronous non-blocking email dispatch
        emailService
          .sendEmail({
            to: payload.customerEmail,
            subject: templates[0].title,
            text: templates[0].message,
            eventId,
          })
          .catch((err) => {
            logger.warn(`Background email dispatch failed: ${err.message}`);
          });
      }

      logger.info(
        `Processed notification event ${eventId} (${type}), created ${templates.length} notifications`
      );

      return true;
    });
  }

  async forwardToDeadLetterQueue(messageBody, errorMessage) {
    if (!this.sqsClient || !config.sqs.notificationDlqUrl) return;

    try {
      const command = new SendMessageCommand({
        QueueUrl: config.sqs.notificationDlqUrl,
        MessageBody: JSON.stringify({
          originalMessage: messageBody,
          error: errorMessage,
          failedAt: new Date().toISOString(),
        }),
      });
      await this.sqsClient.send(command);
      logger.warn(`Forwarded poison message to DLQ: ${config.sqs.notificationDlqUrl}`);
    } catch (dlqErr) {
      logger.error(`Failed to forward message to DLQ: ${dlqErr.message}`);
    }
  }

  start(pollingIntervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`NotificationEventConsumer started for queue: ${config.sqs.notificationQueueUrl}`);

    const poll = async () => {
      if (!this.isRunning) return;
      try {
        await this.pollMessages();
      } catch (err) {
        logger.error(`Error polling notification queue: ${err.message}`);
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
    logger.info('NotificationEventConsumer stopped');
  }

  async pollMessages() {
    if (!this.sqsClient || !config.sqs.notificationQueueUrl) return;

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: config.sqs.notificationQueueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 2,
        AttributeNames: ['ApproximateReceiveCount'],
      });

      const response = await this.sqsClient.send(command);
      if (!response.Messages || response.Messages.length === 0) {
        return;
      }

      for (const message of response.Messages) {
        let body;
        try {
          body = JSON.parse(message.Body);
          await this.handleDomainEvent(body);

          // Acknowledge / delete message from queue
          const deleteCmd = new DeleteMessageCommand({
            QueueUrl: config.sqs.notificationQueueUrl,
            ReceiptHandle: message.ReceiptHandle,
          });
          await this.sqsClient.send(deleteCmd);
        } catch (msgError) {
          const receiveCount = parseInt(message.Attributes?.ApproximateReceiveCount || '1', 10);
          logger.error(
            `Failed to process notification message ${message.MessageId} (attempt ${receiveCount}): ${msgError.message}`
          );

          // Route to DLQ if max retries exceeded (3 retries)
          if (receiveCount >= 3) {
            await this.forwardToDeadLetterQueue(message.Body, msgError.message);
            // Delete from main queue after routing to DLQ
            const deleteCmd = new DeleteMessageCommand({
              QueueUrl: config.sqs.notificationQueueUrl,
              ReceiptHandle: message.ReceiptHandle,
            });
            await this.sqsClient.send(deleteCmd);
          }
        }
      }
    } catch (err) {
      logger.warn(`SQS poll warning in notification consumer: ${err.message}`);
    }
  }
}

module.exports = new NotificationEventConsumer();
