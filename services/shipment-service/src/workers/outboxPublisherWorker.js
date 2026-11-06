const { SendMessageCommand } = require('@aws-sdk/client-sqs');
const { createSqsClient, resolveQueueUrl } = require('@logisphere/event-contracts');
const outboxRepository = require('../repositories/outboxRepository');
const config = require('../config');
const { createLogger } = require('@logisphere/logger');
const prisma = require('../database/prisma');

const logger = createLogger('shipment-service:outboxPublisher');

class OutboxPublisherWorker {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.sqsClient = createSqsClient(config.sqs);
  }

  start(intervalMs = 2000) {
    if (this.intervalId) return;
    logger.info(`Starting transactional outbox publisher worker (interval: ${intervalMs}ms)...`);

    this.intervalId = setInterval(async () => {
      if (this.isRunning) return;
      this.isRunning = true;
      try {
        await this.publishPendingEvents();
      } catch (err) {
        logger.error(`Error in outbox publisher: ${err.message}`);
      } finally {
        this.isRunning = false;
      }
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Transactional outbox publisher stopped.');
    }
  }

  async publishPendingEvents() {
    const events = await prisma.$transaction(async (tx) => {
      return outboxRepository.fetchPendingBatch(20, tx);
    });

    if (events.length === 0) return;

    logger.info(`Publishing batch of ${events.length} outbox events to SQS queues...`);

    for (const evt of events) {
      const targetQueues = Array.isArray(evt.targetQueues) ? evt.targetQueues : [];

      try {
        // Publish to all target queues
        for (const queueName of targetQueues) {
          const queueUrl = await resolveQueueUrl(this.sqsClient, queueName);
          if (!queueUrl) {
            throw new Error(`Could not resolve queue URL for target queue: ${queueName}`);
          }

          const messageBody = JSON.stringify({
            id: evt.eventId,
            eventId: evt.eventId,
            type: evt.eventType,
            eventType: evt.eventType,
            aggregateId: evt.aggregateId,
            timestamp: evt.createdAt,
            payload: evt.payload,
          });

          await this.sqsClient.send(
            new SendMessageCommand({
              QueueUrl: queueUrl,
              MessageBody: messageBody,
              MessageAttributes: {
                eventType: {
                  DataType: 'String',
                  StringValue: evt.eventType,
                },
                eventId: {
                  DataType: 'String',
                  StringValue: evt.eventId,
                },
              },
            })
          );
        }

        await outboxRepository.markPublished(evt.id);
        logger.info(`✓ Outbox event ${evt.eventId} published successfully`);
      } catch (err) {
        logger.warn(`Failed to publish outbox event ${evt.eventId}: ${err.message}`);
        await outboxRepository.recordFailure(evt.id, err.message);
      }
    }
  }
}

module.exports = new OutboxPublisherWorker();
