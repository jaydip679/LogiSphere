const { SQSClient, GetQueueUrlCommand, SendMessageCommand } = require('@aws-sdk/client-sqs');

const QUEUE_BASE_NAMES = Object.freeze({
  NOTIFICATION: 'notification-queue',
  NOTIFICATION_DLQ: 'notification-dlq',
  TRACKING: 'tracking-queue',
  TRACKING_DLQ: 'tracking-dlq',
  FLEET: 'fleet-queue',
  FLEET_DLQ: 'fleet-dlq',
});

/**
 * Determines environment queue prefix.
 * Priority:
 *   1. Explicit process.env.QUEUE_PREFIX
 *   2. Demo / Render environment -> 'logisphere-demo-'
 *   3. EKS environment -> 'logisphere-eks-'
 *   4. Default (Local / LocalStack) -> 'logisphere-local-'
 */
const getEnvironmentPrefix = () => {
  if (process.env.QUEUE_PREFIX) {
    let prefix = process.env.QUEUE_PREFIX.trim();
    if (!prefix.endsWith('-')) prefix += '-';
    return prefix;
  }
  const appEnv = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  if (appEnv === 'demo' || appEnv === 'render' || process.env.RENDER) {
    return 'logisphere-demo-';
  }
  if (appEnv === 'eks' || process.env.KUBERNETES_SERVICE_HOST) {
    return 'logisphere-eks-';
  }
  return 'logisphere-local-';
};

/**
 * Resolves a queue name by applying the active environment prefix.
 * If the queue name already contains 'logisphere-', it is preserved as-is.
 */
const resolveQueueName = (baseName, customPrefix) => {
  if (!baseName) return '';
  if (baseName.startsWith('logisphere-')) {
    return baseName;
  }
  const prefix = customPrefix !== undefined ? customPrefix : getEnvironmentPrefix();
  return `${prefix}${baseName}`;
};

/**
 * Factory for creating an AWS SDK SQSClient.
 * Supports LocalStack endpoints, explicit IAM credentials, and IAM roles (IRSA on EKS).
 */
const createSqsClient = (options = {}) => {
  const clientConfig = {
    region: options.region || process.env.AWS_REGION || 'ap-south-1',
  };

  const endpoint = options.endpoint || process.env.SQS_ENDPOINT;
  if (endpoint && endpoint.trim()) {
    clientConfig.endpoint = endpoint.trim();
  }

  const accessKeyId = options.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = options.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
  if (accessKeyId && secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId,
      secretAccessKey,
    };
  }

  return new SQSClient(clientConfig);
};

// In-memory cache for resolved SQS queue URLs to eliminate repeated GetQueueUrl network calls
const queueUrlCache = new Map();

/**
 * Dynamically resolves an SQS Queue URL with in-memory caching.
 * Falls back to explicit URL if provided or LocalStack pattern in development.
 */
const resolveQueueUrl = async (sqsClient, queueNameOrUrl, options = {}) => {
  if (!queueNameOrUrl) {
    return options.explicitUrl || null;
  }

  // Already a full HTTP/HTTPS URL
  if (queueNameOrUrl.startsWith('http://') || queueNameOrUrl.startsWith('https://')) {
    return queueNameOrUrl;
  }

  const resolvedQueueName = resolveQueueName(queueNameOrUrl, options.prefix);

  if (queueUrlCache.has(resolvedQueueName)) {
    return queueUrlCache.get(resolvedQueueName);
  }

  if (options.explicitUrl) {
    queueUrlCache.set(resolvedQueueName, options.explicitUrl);
    return options.explicitUrl;
  }

  if (!sqsClient) {
    return null;
  }

  try {
    const command = new GetQueueUrlCommand({ QueueName: resolvedQueueName });
    const response = await sqsClient.send(command);
    if (response && response.QueueUrl) {
      queueUrlCache.set(resolvedQueueName, response.QueueUrl);
      return response.QueueUrl;
    }
  } catch (err) {
    // Graceful fallback for LocalStack or local testing
    const endpoint = options.endpoint || process.env.SQS_ENDPOINT;
    if (endpoint) {
      const sanitizedEndpoint = endpoint.replace(/\/+$/, '');
      const fallbackUrl = `${sanitizedEndpoint}/000000000000/${resolvedQueueName}`;
      queueUrlCache.set(resolvedQueueName, fallbackUrl);
      return fallbackUrl;
    }
    throw err;
  }

  return null;
};

/**
 * Forwards a poison / failed message to the designated Dead-Letter Queue (DLQ).
 */
const forwardToDlq = async (sqsClient, dlqUrl, messageBody, errorMessage, metadata = {}) => {
  if (!sqsClient || !dlqUrl) return false;
  try {
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: dlqUrl,
        MessageBody: typeof messageBody === 'string' ? messageBody : JSON.stringify(messageBody),
        MessageAttributes: {
          failureReason: {
            DataType: 'String',
            StringValue: String(errorMessage || 'Processing failed').substring(0, 255),
          },
          failedAt: {
            DataType: 'String',
            StringValue: new Date().toISOString(),
          },
          ...metadata,
        },
      })
    );
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  QUEUE_BASE_NAMES,
  getEnvironmentPrefix,
  resolveQueueName,
  createSqsClient,
  resolveQueueUrl,
  forwardToDlq,
  queueUrlCache,
};
