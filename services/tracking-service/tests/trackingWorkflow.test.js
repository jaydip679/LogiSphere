const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Mock Prisma
const mockPrisma = {
  trackingEvent: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  simulatedRoutePoint: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
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
jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  ReceiveMessageCommand: jest.fn(),
  DeleteMessageCommand: jest.fn(),
}));

const app = require('../src/app');
const trackingRepository = require('../src/repositories/trackingRepository');
const trackingEventConsumer = require('../src/workers/trackingEventConsumer');

describe('Tracking Service — Workflows, Timeline & Contracts', () => {
  let privateKey;
  let adminToken;
  let customerToken;
  const internalKey = 'dev_internal_secret_key';

  beforeAll(() => {
    const privateKeyPath = path.resolve(__dirname, '../../auth-service/secrets/jwt-private.key');
    if (fs.existsSync(privateKeyPath)) {
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');

      adminToken = jwt.sign(
        { sub: 'usr_admin_1', email: 'admin@logisphere.local', role: 'PLATFORM_ADMIN' },
        privateKey,
        { algorithm: 'RS256', issuer: 'logisphere-auth-service' }
      );
      customerToken = jwt.sign(
        { sub: 'usr_cust_1', email: 'cust@logisphere.local', role: 'CUSTOMER' },
        privateKey,
        { algorithm: 'RS256', issuer: 'logisphere-auth-service' }
      );
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Append-Only Invariant Enforcement', () => {
    it('strictly prohibits update operations on tracking events', async () => {
      await expect(trackingRepository.updateEvent()).rejects.toThrow(
        'TrackingEvent is strictly append-only'
      );
    });

    it('strictly prohibits delete operations on tracking events', async () => {
      await expect(trackingRepository.deleteEvent()).rejects.toThrow(
        'TrackingEvent is strictly append-only'
      );
    });
  });

  describe('Public Tracking Timeline API', () => {
    it('returns 404 when tracking number has no events or simulation', async () => {
      mockPrisma.trackingEvent.findMany.mockResolvedValue([]);
      mockPrisma.simulatedRoutePoint.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/v1/tracking/TRK-NONEXISTENT');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TRACKING_NOT_FOUND');
    });

    it('returns combined chronological timeline with milestone and simulated points', async () => {
      const trackingNumber = 'TRK-MUM-DEL-101';
      const eventTime = new Date('2026-11-04T10:00:00Z');
      const simTime = new Date('2026-11-04T10:30:00Z');

      mockPrisma.trackingEvent.findMany.mockResolvedValue([
        {
          id: 'evt_1',
          trackingNumber,
          shipmentId: 'shp_101',
          status: 'PICKED_UP',
          source: 'DRIVER',
          location: 'Mumbai Hub',
          latitude: 19.076,
          longitude: 72.8777,
          timestamp: eventTime,
        },
      ]);

      mockPrisma.simulatedRoutePoint.findMany.mockResolvedValue([
        {
          id: 'sim_1',
          trackingNumber,
          shipmentId: 'shp_101',
          source: 'SIMULATOR',
          latitude: 20.5,
          longitude: 73.5,
          sequenceOrder: 1,
          remainingKm: 850.5,
          estimatedEta: new Date('2026-11-04T18:00:00Z'),
          timestamp: simTime,
        },
      ]);

      const res = await request(app).get(`/api/v1/tracking/${trackingNumber}`);
      expect(res.status).toBe(200);
      expect(res.body.data.trackingNumber).toBe(trackingNumber);
      expect(res.body.data.currentStatus).toBe('PICKED_UP');
      expect(res.body.data.timeline).toHaveLength(2);
      expect(res.body.data.timeline[0].source).toBe('DRIVER');
      expect(res.body.data.timeline[1].source).toBe('SIMULATOR');
    });
  });

  describe('Route Simulation Generation', () => {
    it('allows admin to trigger simulation between origin and destination hubs', async () => {
      const trackingNumber = 'TRK-MUM-BLR-202';
      mockPrisma.simulatedRoutePoint.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.simulatedRoutePoint.createMany.mockResolvedValue({ count: 11 });

      const res = await request(app)
        .post(`/api/v1/tracking/${trackingNumber}/simulate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shipmentId: 'shp_202',
          originHubName: 'Mumbai',
          destinationHubName: 'Bengaluru',
          waypointsCount: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.trackingNumber).toBe(trackingNumber);
      expect(res.body.data.origin).toBe('Mumbai');
      expect(res.body.data.destination).toBe('Bengaluru');
      expect(res.body.data.totalDistanceKm).toBeGreaterThan(800);
      expect(mockPrisma.simulatedRoutePoint.createMany).toHaveBeenCalled();
    });

    it('denies customer from triggering route simulation', async () => {
      const res = await request(app)
        .post('/api/v1/tracking/TRK-101/simulate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ shipmentId: 'shp_101' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ROLE_UNAUTHORIZED');
    });
  });

  describe('SQS Tracking Event Consumer & Deduplication', () => {
    it('appends milestone to timeline upon receiving ShipmentPickedUp event', async () => {
      const event = {
        id: 'evt_sqs_1',
        type: 'ShipmentPickedUp',
        payload: {
          shipmentId: 'shp_301',
          trackingNumber: 'TRK-301',
          location: 'Andheri West, Mumbai',
          actorId: 'drv_301',
        },
      };

      mockPrisma.processedEvent.findUnique.mockResolvedValue(null);
      mockPrisma.trackingEvent.create.mockResolvedValue({ id: 'te_1' });
      mockPrisma.processedEvent.create.mockResolvedValue({ id: 'pe_1' });

      const handled = await trackingEventConsumer.handleDomainEvent(event);
      expect(handled).toBe(true);

      expect(mockPrisma.trackingEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trackingNumber: 'TRK-301',
            status: 'PICKED_UP',
            source: 'DRIVER',
            location: 'Andheri West, Mumbai',
          }),
        })
      );
      expect(mockPrisma.processedEvent.create).toHaveBeenCalledWith({
        data: { eventId: 'evt_sqs_1', eventType: 'ShipmentPickedUp' },
      });
    });

    it('records delay notes upon receiving ShipmentDelayed event', async () => {
      const event = {
        id: 'evt_sqs_2',
        type: 'ShipmentDelayed',
        payload: {
          shipmentId: 'shp_301',
          trackingNumber: 'TRK-301',
          reason: 'Severe waterlogging on Western Express Highway',
        },
      };

      mockPrisma.processedEvent.findUnique.mockResolvedValue(null);
      mockPrisma.trackingEvent.create.mockResolvedValue({ id: 'te_2' });

      const handled = await trackingEventConsumer.handleDomainEvent(event);
      expect(handled).toBe(true);

      expect(mockPrisma.trackingEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DELAYED',
            notes: 'Severe waterlogging on Western Express Highway',
          }),
        })
      );
    });

    it('skips duplicate event delivery idempotently', async () => {
      const event = {
        id: 'evt_sqs_1',
        type: 'ShipmentPickedUp',
        payload: { trackingNumber: 'TRK-301', shipmentId: 'shp_301' },
      };

      mockPrisma.processedEvent.findUnique.mockResolvedValue({
        id: 'pe_existing',
        eventId: 'evt_sqs_1',
      });

      const handled = await trackingEventConsumer.handleDomainEvent(event);
      expect(handled).toBe(true);
      expect(mockPrisma.trackingEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('Internal Inter-Service API', () => {
    it('records milestone via internal endpoint with X-Internal-Service-Key', async () => {
      mockPrisma.trackingEvent.create.mockResolvedValue({
        id: 'te_internal_1',
        trackingNumber: 'TRK-401',
        status: 'OUT_FOR_DELIVERY',
      });

      const res = await request(app)
        .post('/internal/tracking/events')
        .set('x-internal-service-key', internalKey)
        .send({
          trackingNumber: 'TRK-401',
          shipmentId: 'shp_401',
          status: 'OUT_FOR_DELIVERY',
          location: 'Pune Station Hub',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('OUT_FOR_DELIVERY');
    });

    it('rejects internal requests without valid service key', async () => {
      const res = await request(app)
        .post('/internal/tracking/events')
        .send({ trackingNumber: 'TRK-401', shipmentId: 'shp_401', status: 'OUT_FOR_DELIVERY' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INTERNAL_AUTH_FAILED');
    });
  });
});
