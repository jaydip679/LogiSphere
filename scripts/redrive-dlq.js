#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * LogiSphere — SQS Dead-Letter Queue (DLQ) Redrive Utility
 *
 * Reads failed poison messages from a specified DLQ and replays them back
 * into the primary queue for reprocessing.
 *
 * Usage:
 *   node scripts/redrive-dlq.js --queue=notification
 *   node scripts/redrive-dlq.js --queue=tracking
 *   node scripts/redrive-dlq.js --queue=fleet
 *   node scripts/redrive-dlq.js --dlq=logisphere-local-notification-dlq --target=logisphere-local-notification-queue
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const {
  ReceiveMessageCommand,
  SendMessageCommand,
  DeleteMessageCommand,
} = require('@aws-sdk/client-sqs');
const {
  createSqsClient,
  resolveQueueUrl,
  resolveQueueName,
  QUEUE_BASE_NAMES,
} = require('../shared/event-contracts');

async function redrive() {
  const args = process.argv.slice(2);
  const queueArg = args.find((a) => a.startsWith('--queue='))?.split('=')[1];
  const customDlq = args.find((a) => a.startsWith('--dlq='))?.split('=')[1];
  const customTarget = args.find((a) => a.startsWith('--target='))?.split('=')[1];

  let primaryQueueName;
  let dlqName;

  if (queueArg) {
    const key = queueArg.toUpperCase();
    if (QUEUE_BASE_NAMES[key]) {
      primaryQueueName = QUEUE_BASE_NAMES[key];
      dlqName = QUEUE_BASE_NAMES[`${key}_DLQ`];
    } else {
      console.error(`Unknown queue key: ${queueArg}. Expected: notification, tracking, or fleet`);
      process.exit(1);
    }
  } else if (customDlq && customTarget) {
    dlqName = customDlq;
    primaryQueueName = customTarget;
  } else {
    console.log(`
Usage:
  node scripts/redrive-dlq.js --queue=<notification|tracking|fleet>
  node scripts/redrive-dlq.js --dlq=<dlq-name> --target=<primary-queue-name>
    `);
    process.exit(1);
  }

  const sqsClient = createSqsClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    endpoint: process.env.SQS_ENDPOINT,
  });

  const dlqUrl = await resolveQueueUrl(sqsClient, dlqName);
  const primaryUrl = await resolveQueueUrl(sqsClient, primaryQueueName);

  console.log(`Starting DLQ Redrive:`);
  console.log(`  Source DLQ:    ${resolveQueueName(dlqName)} (${dlqUrl})`);
  console.log(`  Target Queue:  ${resolveQueueName(primaryQueueName)} (${primaryUrl})\n`);

  let movedCount = 0;
  let hasMore = true;

  while (hasMore) {
    const receiveRes = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: dlqUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 2,
        VisibilityTimeout: 10,
      })
    );

    const messages = receiveRes.Messages || [];
    if (messages.length === 0) {
      hasMore = false;
      break;
    }

    for (const msg of messages) {
      let bodyToForward = msg.Body;
      try {
        const parsed = JSON.parse(msg.Body);
        if (parsed.originalMessage) {
          bodyToForward =
            typeof parsed.originalMessage === 'string'
              ? parsed.originalMessage
              : JSON.stringify(parsed.originalMessage);
        }
      } catch {
        // Keep raw body if not standard DLQ envelope
      }

      // Re-send to primary queue
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: primaryUrl,
          MessageBody: bodyToForward,
        })
      );

      // Delete from DLQ
      await sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: dlqUrl,
          ReceiptHandle: msg.ReceiptHandle,
        })
      );

      movedCount++;
      console.log(`  ✓ Replayed message ${msg.MessageId} -> ${resolveQueueName(primaryQueueName)}`);
    }
  }

  console.log(`\nRedrive completed: successfully replayed ${movedCount} messages.`);
}

if (require.main === module) {
  redrive().catch((err) => {
    console.error('✗ Redrive failed:', err.message);
    process.exit(1);
  });
}

module.exports = { redrive };
