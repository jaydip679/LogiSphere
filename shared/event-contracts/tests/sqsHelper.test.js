const {
  getEnvironmentPrefix,
  resolveQueueName,
  resolveQueueUrl,
  forwardToDlq,
  queueUrlCache,
} = require('../src');

describe('SQS Helper & Dynamic Queue Resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    queueUrlCache.clear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Environment Queue Prefixing', () => {
    it('defaults to logisphere-local- in local development', () => {
      delete process.env.QUEUE_PREFIX;
      delete process.env.APP_ENV;
      delete process.env.RENDER;
      delete process.env.KUBERNETES_SERVICE_HOST;
      expect(getEnvironmentPrefix()).toBe('logisphere-local-');
    });

    it('resolves logisphere-demo- on Render / Demo environment', () => {
      process.env.RENDER = 'true';
      expect(getEnvironmentPrefix()).toBe('logisphere-demo-');

      delete process.env.RENDER;
      process.env.APP_ENV = 'demo';
      expect(getEnvironmentPrefix()).toBe('logisphere-demo-');
    });

    it('resolves logisphere-eks- on EKS / Kubernetes environment', () => {
      delete process.env.RENDER;
      delete process.env.APP_ENV;
      process.env.KUBERNETES_SERVICE_HOST = '10.100.0.1';
      expect(getEnvironmentPrefix()).toBe('logisphere-eks-');

      delete process.env.KUBERNETES_SERVICE_HOST;
      process.env.APP_ENV = 'eks';
      expect(getEnvironmentPrefix()).toBe('logisphere-eks-');
    });

    it('honors explicit custom QUEUE_PREFIX', () => {
      process.env.QUEUE_PREFIX = 'logisphere-staging-';
      expect(getEnvironmentPrefix()).toBe('logisphere-staging-');

      // Ensures trailing dash is added if omitted
      process.env.QUEUE_PREFIX = 'logisphere-qa';
      expect(getEnvironmentPrefix()).toBe('logisphere-qa-');
    });
  });

  describe('Queue Name Resolution', () => {
    it('prefixes base queue names with active environment prefix', () => {
      process.env.QUEUE_PREFIX = 'logisphere-demo-';
      expect(resolveQueueName('notification-queue')).toBe('logisphere-demo-notification-queue');
      expect(resolveQueueName('notification-dlq')).toBe('logisphere-demo-notification-dlq');
      expect(resolveQueueName('tracking-queue')).toBe('logisphere-demo-tracking-queue');
      expect(resolveQueueName('fleet-queue')).toBe('logisphere-demo-fleet-queue');
    });

    it('does not double-prefix names that already have a prefix', () => {
      expect(resolveQueueName('logisphere-demo-notification-queue')).toBe(
        'logisphere-demo-notification-queue'
      );
      expect(resolveQueueName('logisphere-local-tracking-queue')).toBe(
        'logisphere-local-tracking-queue'
      );
      expect(resolveQueueName('logisphere-notification-queue')).toBe(
        'logisphere-notification-queue'
      );
    });
  });

  describe('Dynamic Queue URL Resolution', () => {
    it('returns direct URL immediately if input is already an HTTP URL', async () => {
      const url = 'https://sqs.ap-south-1.amazonaws.com/123456789012/test-queue';
      const resolved = await resolveQueueUrl(null, url);
      expect(resolved).toBe(url);
    });

    it('resolves queue URL dynamically via GetQueueUrlCommand and caches it', async () => {
      const mockSqsClient = {
        send: jest.fn().mockResolvedValue({
          QueueUrl:
            'https://sqs.ap-south-1.amazonaws.com/123456789012/logisphere-local-notification-queue',
        }),
      };

      const url1 = await resolveQueueUrl(mockSqsClient, 'notification-queue');
      expect(url1).toBe(
        'https://sqs.ap-south-1.amazonaws.com/123456789012/logisphere-local-notification-queue'
      );
      expect(mockSqsClient.send).toHaveBeenCalledTimes(1);

      // Second call should return from in-memory cache without hitting SQS again
      const url2 = await resolveQueueUrl(mockSqsClient, 'notification-queue');
      expect(url2).toBe(url1);
      expect(mockSqsClient.send).toHaveBeenCalledTimes(1);
    });

    it('returns explicit URL if provided in options and caches it', async () => {
      const explicit = 'http://localstack:4566/000000000000/logisphere-local-tracking-queue';
      const resolved = await resolveQueueUrl(null, 'tracking-queue', {
        explicitUrl: explicit,
      });
      expect(resolved).toBe(explicit);
    });

    it('falls back to local endpoint URL if GetQueueUrlCommand fails in local mode', async () => {
      process.env.SQS_ENDPOINT = 'http://localhost:4566';
      const mockSqsClient = {
        send: jest.fn().mockRejectedValue(new Error('QueueDoesNotExist')),
      };

      const resolved = await resolveQueueUrl(mockSqsClient, 'fleet-queue');
      expect(resolved).toBe('http://localhost:4566/000000000000/logisphere-local-fleet-queue');
    });
  });

  describe('Dead-Letter Queue Forwarding', () => {
    it('forwards message to DLQ using SendMessageCommand', async () => {
      const mockSqsClient = {
        send: jest.fn().mockResolvedValue({ MessageId: 'msg-dlq-123' }),
      };

      const dlqUrl = 'http://localhost:4566/000000000000/logisphere-local-notification-dlq';
      const success = await forwardToDlq(
        mockSqsClient,
        dlqUrl,
        { eventId: 'evt_1', type: 'ShipmentCreated' },
        'Database write failed'
      );

      expect(success).toBe(true);
      expect(mockSqsClient.send).toHaveBeenCalledTimes(1);
    });
  });
});
