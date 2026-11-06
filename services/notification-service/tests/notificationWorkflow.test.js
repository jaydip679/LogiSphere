const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Mock Prisma
const mockPrisma = {
  inAppNotification: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  notificationLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  processedEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
  $disconnect: jest.fn(),
};

jest.mock('../src/database/prisma', () => mockPrisma);

// Mock SQS client
const mockSqsSend = jest.fn().mockResolvedValue({});
jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn().mockImplementation(() => ({
    send: mockSqsSend,
  })),
  ReceiveMessageCommand: jest.fn(),
  DeleteMessageCommand: jest.fn(),
  SendMessageCommand: jest.fn().mockImplementation((args) => args),
}));

const config = require('../src/config');
const app = require('../src/app');
const notificationEventConsumer = require('../src/workers/notificationEventConsumer');

describe('Notification Service — SQS Ingestion, APIs & Reliability', () => {
  let privateKey;
  let customerToken;
  const customerId = 'usr_cust_101';
  const otherCustomerId = 'usr_cust_999';
  const internalKey = config.internalServiceKey || 'dev_internal_secret_key';

  beforeAll(() => {
    const privateKeyPath = path.resolve(__dirname, '../../auth-service/secrets/jwt-private.key');
    if (fs.existsSync(privateKeyPath)) {
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');

      customerToken = jwt.sign(
        { sub: customerId, email: 'cust@logisphere.local', role: 'CUSTOMER' },
        privateKey,
        { algorithm: 'RS256', issuer: 'logisphere-auth-service' }
      );
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SQS Event Ingestion & Template Formatting', () => {
    it('creates in-app notification upon receiving ShipmentCreated event', async () => {
      const event = {
        id: 'evt_created_1',
        type: 'ShipmentCreated',
        payload: {
          shipmentId: 'shp_101',
          trackingNumber: 'TRK-101',
          customerId,
        },
      };

      mockPrisma.processedEvent.findUnique.mockResolvedValue(null);
      mockPrisma.inAppNotification.create.mockResolvedValue({ id: 'notif_1' });
      mockPrisma.processedEvent.create.mockResolvedValue({ id: 'pe_1' });

      const handled = await notificationEventConsumer.handleDomainEvent(event);
      expect(handled).toBe(true);

      expect(mockPrisma.inAppNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: customerId,
            title: 'Shipment Request Created',
            category: 'SHIPMENT',
            status: 'UNREAD',
          }),
        })
      );
      expect(mockPrisma.processedEvent.create).toHaveBeenCalledWith({
        data: { eventId: 'evt_created_1', eventType: 'ShipmentCreated' },
      });
    });

    it('creates offer notification for logistics organization', async () => {
      const event = {
        id: 'evt_offer_1',
        type: 'ShipmentOfferCreated',
        payload: {
          shipmentId: 'shp_102',
          organizationId: 'org_apex_1',
          pickupHub: 'Mumbai',
          deliveryHub: 'Delhi NCR',
        },
      };

      mockPrisma.processedEvent.findUnique.mockResolvedValue(null);
      mockPrisma.inAppNotification.create.mockResolvedValue({ id: 'notif_2' });

      const handled = await notificationEventConsumer.handleDomainEvent(event);
      expect(handled).toBe(true);

      expect(mockPrisma.inAppNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: 'org_apex_1',
            organizationId: 'org_apex_1',
            title: 'New Shipment Request Available',
            category: 'OFFER',
          }),
        })
      );
    });

    it('creates delay alert notification for customer', async () => {
      const event = {
        id: 'evt_delay_1',
        type: 'ShipmentDelayed',
        payload: {
          shipmentId: 'shp_103',
          trackingNumber: 'TRK-103',
          customerId,
          reason: 'Severe cyclone warning near coastal corridor',
        },
      };

      mockPrisma.processedEvent.findUnique.mockResolvedValue(null);
      mockPrisma.inAppNotification.create.mockResolvedValue({ id: 'notif_3' });

      const handled = await notificationEventConsumer.handleDomainEvent(event);
      expect(handled).toBe(true);

      expect(mockPrisma.inAppNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: customerId,
            title: 'Shipment Delayed',
            message: expect.stringContaining('Severe cyclone warning'),
            category: 'MILESTONE',
          }),
        })
      );
    });

    it('strictly skips duplicate event delivery idempotently', async () => {
      const event = {
        id: 'evt_created_1',
        type: 'ShipmentCreated',
        payload: { customerId, trackingNumber: 'TRK-101' },
      };

      mockPrisma.processedEvent.findUnique.mockResolvedValue({
        id: 'pe_existing',
        eventId: 'evt_created_1',
      });

      const handled = await notificationEventConsumer.handleDomainEvent(event);
      expect(handled).toBe(true);
      expect(mockPrisma.inAppNotification.create).not.toHaveBeenCalled();
    });
  });

  describe('In-App Notification REST APIs', () => {
    it('returns paginated notifications for current authenticated user', async () => {
      mockPrisma.inAppNotification.findMany.mockResolvedValue([
        {
          id: 'notif_1',
          recipientId: customerId,
          title: 'Shipment Created',
          message: 'Your shipment was created',
          status: 'UNREAD',
          createdAt: new Date(),
        },
      ]);
      mockPrisma.inAppNotification.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notifications).toHaveLength(1);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('returns unread notification count badge for navbar', async () => {
      mockPrisma.inAppNotification.count.mockResolvedValue(4);

      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unreadCount).toBe(4);
    });

    it('marks a single notification as read', async () => {
      mockPrisma.inAppNotification.findUnique.mockResolvedValue({
        id: 'notif_1',
        recipientId: customerId,
        status: 'UNREAD',
      });
      mockPrisma.inAppNotification.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .patch('/api/v1/notifications/notif_1/read')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('READ');
    });

    it('prevents user from marking another users notification as read', async () => {
      mockPrisma.inAppNotification.findUnique.mockResolvedValue({
        id: 'notif_other_1',
        recipientId: otherCustomerId,
      });

      const res = await request(app)
        .patch('/api/v1/notifications/notif_other_1/read')
        .set('Authorization', `Bearer ${customerToken}`); // customerId != otherCustomerId

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });

    it('marks all unread notifications as read', async () => {
      mockPrisma.inAppNotification.updateMany.mockResolvedValue({ count: 5 });

      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.markedCount).toBe(5);
    });
  });

  describe('Dead-Letter Queue Redrive Routing', () => {
    it('forwards poison message to DLQ', async () => {
      await notificationEventConsumer.forwardToDeadLetterQueue(
        JSON.stringify({ bad: 'message' }),
        'Corrupted JSON structure'
      );

      expect(mockSqsSend).toHaveBeenCalled();
    });
  });

  describe('Internal Inter-Service API', () => {
    it('creates programmatic in-app notification with valid internal key', async () => {
      mockPrisma.inAppNotification.create.mockResolvedValue({
        id: 'notif_internal_1',
        recipientId: customerId,
        title: 'System Alert',
        message: 'Platform scheduled maintenance',
      });

      const res = await request(app)
        .post('/internal/notifications/in-app')
        .set('x-internal-service-key', internalKey)
        .send({
          recipientId: customerId,
          title: 'System Alert',
          message: 'Platform scheduled maintenance',
          category: 'SYSTEM',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('notif_internal_1');
    });

    it('rejects internal requests with missing service key', async () => {
      const res = await request(app)
        .post('/internal/notifications/in-app')
        .send({ recipientId: customerId, title: 'Alert', message: 'Text' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INTERNAL_AUTH_FAILED');
    });
  });
});
