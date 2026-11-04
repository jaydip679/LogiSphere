const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Mock Prisma
jest.mock('../src/database/prisma', () => {
  const mockPrisma = {
    shipment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    marketplaceOffer: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    quote: {
      create: jest.fn(),
      findById: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    idempotencyRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    $disconnect: jest.fn(),
  };
  return mockPrisma;
});

// Mock SQS client
jest.mock('@aws-sdk/client-sqs', () => {
  return {
    SQSClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({ MessageId: 'msg_123' }),
    })),
    SendMessageCommand: jest.fn(),
  };
});

// Mock Auth and Fleet Clients
jest.mock('../src/integrations/authClient', () => ({
  getOrganizationsCoverage: jest.fn().mockResolvedValue([
    {
      id: 'org_apex_1',
      name: 'Apex Logistics',
      serviceAreas: ['Mumbai', 'Delhi NCR'],
      supportedCategories: ['PARCEL', 'DOCUMENT'],
    },
  ]),
}));

jest.mock('../src/integrations/fleetClient', () => ({
  getCapacity: jest.fn().mockResolvedValue({ availableDrivers: 2, availableVehicles: 2 }),
  reserveAssignment: jest.fn().mockResolvedValue({
    reservationId: 'res_123',
    status: 'PENDING',
  }),
  confirmAssignment: jest.fn().mockResolvedValue(true),
  cancelAssignment: jest.fn().mockResolvedValue(true),
  releaseAssignmentByShipment: jest.fn().mockResolvedValue(true),
}));

const app = require('../src/app');
const prisma = require('../src/database/prisma');
const fleetClient = require('../src/integrations/fleetClient');
const reportService = require('../src/reports/reportService');

describe('Shipment Service — API Endpoints & Workflows', () => {
  let privateKey;
  let customerToken;
  let companyStaffToken;
  let driverToken;

  beforeAll(() => {
    const privateKeyPath = path.resolve(__dirname, '../../auth-service/secrets/jwt-private.key');

    if (fs.existsSync(privateKeyPath)) {
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      customerToken = jwt.sign(
        { sub: 'cust_101', email: 'cust@logisphere.local', role: 'CUSTOMER' },
        privateKey,
        { algorithm: 'RS256', issuer: 'logisphere-auth-service' }
      );
      companyStaffToken = jwt.sign(
        {
          sub: 'mgr_201',
          email: 'mgr@apex.local',
          role: 'LOGISTICS_MANAGER',
          organizationId: 'org_apex_1',
        },
        privateKey,
        { algorithm: 'RS256', issuer: 'logisphere-auth-service' }
      );
      driverToken = jwt.sign(
        {
          sub: 'drv_301',
          email: 'driver@apex.local',
          role: 'DRIVER',
          organizationId: 'org_apex_1',
        },
        privateKey,
        { algorithm: 'RS256', issuer: 'logisphere-auth-service' }
      );
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/shipments/estimate-price', () => {
    it('returns calculated distance and price estimate without authentication', async () => {
      const res = await request(app).post('/api/v1/shipments/estimate-price').send({
        pickupPinCode: '400001',
        deliveryPinCode: '110001',
        weightKg: 5,
        category: 'PARCEL',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pickupHub).toBe('Mumbai');
      expect(res.body.data.deliveryHub).toBe('Delhi NCR');
      expect(res.body.data.estimatedDistanceKm).toBeGreaterThan(1000);
      expect(res.body.data.estimatedPricePaise).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/shipments (Creation with Idempotency)', () => {
    const validShipmentPayload = {
      senderName: 'Rohit Verma',
      senderPhone: '+919876543210',
      pickupAddress: 'B-12 Industrial Estate, Andheri East',
      pickupCity: 'Mumbai',
      pickupState: 'Maharashtra',
      pickupPinCode: '400069',
      recipientName: 'Deepak Rao',
      recipientPhone: '+919876543211',
      deliveryAddress: 'Plot 44 Connaught Place',
      deliveryCity: 'New Delhi',
      deliveryState: 'Delhi',
      deliveryPinCode: '110001',
      category: 'PARCEL',
      packageDescription: 'Spare auto parts',
      weightKg: 3.5,
    };

    it('creates a new shipment and initiates marketplace matching', async () => {
      prisma.shipment.create.mockResolvedValue({
        id: 'shp_1',
        trackingNumber: 'LSP-20261104-ABCDEF',
        customerId: 'cust_101',
        status: 'CREATED',
        pickupHub: 'Mumbai',
        deliveryHub: 'Delhi NCR',
        estimatedPricePaise: 95000,
        ...validShipmentPayload,
      });
      prisma.outboxEvent.create.mockResolvedValue({});
      prisma.idempotencyRecord.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('Idempotency-Key', 'idemp_key_1001')
        .send(validShipmentPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trackingNumber).toBeDefined();
      expect(res.body.data.status).toBe('CREATED');
      expect(prisma.outboxEvent.create).toHaveBeenCalled();
    });

    it('returns cached response when Idempotency-Key is reused with same payload', async () => {
      prisma.idempotencyRecord.findUnique.mockResolvedValue({
        requestHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        responseStatus: 201,
        responseBody: {
          success: true,
          message: 'Shipment created successfully',
          data: { id: 'shp_cached_1' },
        },
      });

      // Need to send matching hash
      const crypto = require('crypto');
      const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(validShipmentPayload))
        .digest('hex');

      prisma.idempotencyRecord.findUnique.mockResolvedValue({
        requestHash: hash,
        responseStatus: 201,
        responseBody: {
          success: true,
          data: { id: 'shp_cached_1' },
        },
      });

      const res = await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('Idempotency-Key', 'idemp_key_1001')
        .send(validShipmentPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('shp_cached_1');
    });

    it('returns 409 conflict when Idempotency-Key is reused with a different payload', async () => {
      prisma.idempotencyRecord.findUnique.mockResolvedValue({
        requestHash: 'different_hash_value',
        responseStatus: 201,
        responseBody: {},
      });

      const res = await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('Idempotency-Key', 'idemp_key_1001')
        .send(validShipmentPayload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
    });
  });

  describe('Marketplace Offer & Quote Negotiation Flow', () => {
    it('allows logistics company to accept an active marketplace offer', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'ofr_1',
        shipmentId: 'shp_1',
        organizationId: 'org_apex_1',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // active
      });

      prisma.shipment.findUnique.mockResolvedValue({
        id: 'shp_1',
        status: 'CREATED',
        estimatedPricePaise: 50000,
      });

      prisma.marketplaceOffer.update.mockResolvedValue({});
      prisma.shipment.update.mockResolvedValue({
        id: 'shp_1',
        status: 'CONFIRMED',
        assignedOrgId: 'org_apex_1',
        finalPricePaise: 50000,
      });
      prisma.outboxEvent.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/shipments/offers/ofr_1/accept')
        .set('Authorization', `Bearer ${companyStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shipment.status).toBe('CONFIRMED');
      expect(prisma.outboxEvent.create).toHaveBeenCalled();
    });

    it('allows company to submit a revised quote with 24-hr window', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'ofr_1',
        shipmentId: 'shp_1',
        organizationId: 'org_apex_1',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      prisma.quote.create.mockResolvedValue({
        id: 'qte_1',
        shipmentId: 'shp_1',
        amountPaise: 55000,
        status: 'PENDING',
      });
      prisma.outboxEvent.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/shipments/offers/ofr_1/quote')
        .set('Authorization', `Bearer ${companyStaffToken}`)
        .send({
          amountPaise: 55000,
          notes: 'Special handling packaging required',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amountPaise).toBe(55000);
    });
  });

  describe('Dispatch Assignment Orchestration', () => {
    it('orchestrates two-phase assignment with Fleet Service', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 'shp_1',
        status: 'CONFIRMED',
        assignedOrgId: 'org_apex_1',
      });

      prisma.shipment.update.mockResolvedValue({
        id: 'shp_1',
        status: 'ASSIGNED',
        assignedDriverId: '11111111-1111-1111-1111-111111111111',
        assignedVehicleId: '22222222-2222-2222-2222-222222222222',
      });
      prisma.outboxEvent.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/shipments/shp_1/assign')
        .set('Authorization', `Bearer ${companyStaffToken}`)
        .send({
          driverId: '11111111-1111-1111-1111-111111111111',
          vehicleId: '22222222-2222-2222-2222-222222222222',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(fleetClient.reserveAssignment).toHaveBeenCalled();
      expect(fleetClient.confirmAssignment).toHaveBeenCalled();
    });
  });

  describe('Driver Milestone Transitions & Lifecycle Rules', () => {
    it('allows driver to mark PICKED_UP from ASSIGNED', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 'shp_1',
        status: 'ASSIGNED',
        assignedDriverId: 'drv_301',
      });

      prisma.shipment.update.mockResolvedValue({
        id: 'shp_1',
        status: 'PICKED_UP',
      });
      prisma.outboxEvent.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/shipments/shp_1/milestones')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'PICKED_UP' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PICKED_UP');
    });

    it('rejects illegal transition directly to DELIVERED without OUT_FOR_DELIVERY', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 'shp_1',
        status: 'ASSIGNED',
        assignedDriverId: 'drv_301',
      });

      const res = await request(app)
        .post('/api/v1/shipments/shp_1/milestones')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(400);
    });

    it('handles DELAYED by preserving previous status, and restores upon RESUME_FROM_DELAY', async () => {
      // 1. Mark DELAYED while IN_TRANSIT
      prisma.shipment.findUnique.mockResolvedValueOnce({
        id: 'shp_1',
        status: 'IN_TRANSIT',
        previousStatus: null,
        assignedDriverId: 'drv_301',
        deliveryAttemptsCount: 0,
      });
      prisma.shipment.update.mockResolvedValueOnce({
        id: 'shp_1',
        status: 'DELAYED',
        previousStatus: 'IN_TRANSIT',
      });
      prisma.outboxEvent.create.mockResolvedValue({});

      const delayRes = await request(app)
        .post('/api/v1/shipments/shp_1/milestones')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'DELAYED', delayReason: 'Monsoon flooding on highway' });

      expect(delayRes.status).toBe(200);

      // 2. Resume from delay
      prisma.shipment.findUnique.mockResolvedValueOnce({
        id: 'shp_1',
        status: 'DELAYED',
        previousStatus: 'IN_TRANSIT',
        assignedDriverId: 'drv_301',
        deliveryAttemptsCount: 0,
      });
      prisma.shipment.update.mockResolvedValueOnce({
        id: 'shp_1',
        status: 'IN_TRANSIT',
        previousStatus: null,
      });

      const resumeRes = await request(app)
        .post('/api/v1/shipments/shp_1/milestones')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'RESUME_FROM_DELAY' });

      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.data.status).toBe('IN_TRANSIT');
    });

    it('enforces maximum 3 delivery attempts policy', async () => {
      // Shipment has already failed 3 times
      prisma.shipment.findUnique.mockResolvedValue({
        id: 'shp_1',
        status: 'DELIVERY_FAILED',
        assignedOrgId: 'org_apex_1',
        deliveryAttemptsCount: 3, // Clarification 2: 3 total attempts reached
      });

      const res = await request(app)
        .post('/api/v1/shipments/shp_1/failure-disposition')
        .set('Authorization', `Bearer ${companyStaffToken}`)
        .send({
          action: 'RE_ATTEMPT',
        });

      // Must be rejected!
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Maximum delivery attempts/);
    });
  });

  describe('Shipment Cancellation Rules', () => {
    it('synchronously verifies fleet release when cancelling an ASSIGNED shipment', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 'shp_1',
        customerId: 'cust_101',
        status: 'ASSIGNED',
        assignedOrgId: 'org_apex_1',
        trackingNumber: 'LSP-123',
      });

      prisma.shipment.update.mockResolvedValue({
        id: 'shp_1',
        status: 'CANCELLED',
      });
      prisma.outboxEvent.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/shipments/shp_1/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Customer changed plans' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(fleetClient.releaseAssignmentByShipment).toHaveBeenCalledWith('shp_1');
    });

    it('rejects cancellation after shipment has been picked up', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 'shp_1',
        customerId: 'cust_101',
        status: 'PICKED_UP',
      });

      const res = await request(app)
        .post('/api/v1/shipments/shp_1/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Try to cancel' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot be cancelled after package pickup/);
    });
  });

  describe('Temporary Reports & 5-minute Auto-Cleanup', () => {
    it('generates a CSV report with 5-minute TTL metadata', async () => {
      prisma.shipment.count.mockResolvedValue(1);
      prisma.shipment.findMany.mockResolvedValue([
        {
          trackingNumber: 'LSP-001',
          status: 'DELIVERED',
          senderName: 'Sender A',
          pickupHub: 'Mumbai',
          recipientName: 'Recipient B',
          deliveryHub: 'Delhi NCR',
          category: 'PARCEL',
          weightKg: '2.50',
          estimatedPricePaise: 45000,
          createdAt: new Date(),
        },
      ]);

      const res = await request(app)
        .post('/api/v1/reports/export')
        .set('Authorization', `Bearer ${companyStaffToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data.reportId).toBeDefined();
      expect(res.body.data.ttlMinutes).toBe(5);
    });

    it('refuses download if report has expired beyond 5 minutes', async () => {
      // Mock an expired report in the registry
      const expiredId = 'rep_expired_999';
      reportService.reportRegistry.set(expiredId, {
        reportId: expiredId,
        filePath: '/tmp/expired.csv',
        organizationId: 'org_apex_1',
        expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 min ago
      });

      const res = await request(app)
        .get(`/api/v1/reports/${expiredId}/download`)
        .set('Authorization', `Bearer ${companyStaffToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('REPORT_EXPIRED');
    });
  });
});
