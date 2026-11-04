const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Mock Prisma
const mockPrisma = {
  driver: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  vehicle: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  dispatchAssignment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  assignmentReservation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  processedEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  idempotencyRecord: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
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
const fleetEventConsumer = require('../src/workers/fleetEventConsumer');
const reservationTimeoutWorker = require('../src/workers/reservationTimeoutWorker');

describe('Fleet & Dispatch Service — End-to-End Workflow & Contracts', () => {
  let privateKey;
  let managerToken;
  let dispatcherToken;
  let customerToken;
  let otherOrgToken;

  const orgId = '11111111-1111-1111-1111-111111111111';
  const otherOrgId = '22222222-2222-2222-2222-222222222222';
  const internalKey = 'dev_internal_secret_key';

  beforeAll(() => {
    const privateKeyPath = path.resolve(__dirname, '../../auth-service/secrets/jwt-private.key');
    if (fs.existsSync(privateKeyPath)) {
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');

      managerToken = jwt.sign(
        {
          sub: 'usr_mgr_1',
          email: 'mgr@fleet.local',
          role: 'LOGISTICS_MANAGER',
          organizationId: orgId,
        },
        privateKey,
        { algorithm: 'RS256', issuer: 'logisphere-auth-service' }
      );
      dispatcherToken = jwt.sign(
        { sub: 'usr_disp_1', email: 'disp@fleet.local', role: 'DISPATCHER', organizationId: orgId },
        privateKey,
        { algorithm: 'RS256', issuer: 'logisphere-auth-service' }
      );
      customerToken = jwt.sign(
        { sub: 'usr_cust_1', email: 'cust@fleet.local', role: 'CUSTOMER' },
        privateKey,
        { algorithm: 'RS256', issuer: 'logisphere-auth-service' }
      );
      otherOrgToken = jwt.sign(
        {
          sub: 'usr_other_1',
          email: 'other@competitor.local',
          role: 'LOGISTICS_MANAGER',
          organizationId: otherOrgId,
        },
        privateKey,
        { algorithm: 'RS256', issuer: 'logisphere-auth-service' }
      );
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Internal Inter-Service API & Contracts', () => {
    it('rejects internal requests without valid X-Internal-Service-Key', async () => {
      const res = await request(app).get(`/internal/fleet/capacity?organizationId=${orgId}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INTERNAL_AUTH_FAILED');
    });

    it('returns capacity for shipment-service matching engine', async () => {
      mockPrisma.driver.count.mockResolvedValue(5);
      mockPrisma.vehicle.count.mockResolvedValue(3);

      const res = await request(app)
        .get(`/internal/fleet/capacity?organizationId=${orgId}`)
        .set('x-internal-service-key', internalKey);

      expect(res.status).toBe(200);
      expect(res.body.data.availableDrivers).toBe(5);
      expect(res.body.data.availableVehicles).toBe(3);
    });

    it('executes two-phase reservation protocol: reserve -> confirm', async () => {
      const reservationId = '33333333-3333-3333-3333-333333333333';
      mockPrisma.assignmentReservation.findFirst.mockResolvedValue(null);
      mockPrisma.assignmentReservation.create.mockResolvedValue({
        id: reservationId,
        shipmentId: 'shp_101',
        organizationId: orgId,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 120000),
      });

      // 1. Reserve
      const reserveRes = await request(app)
        .post('/internal/assignments/reserve')
        .set('x-internal-service-key', internalKey)
        .send({
          shipmentId: 'shp_101',
          organizationId: orgId,
        });

      expect(reserveRes.status).toBe(201);
      expect(reserveRes.body.data.reservationId).toBe(reservationId);
      expect(reserveRes.body.data.status).toBe('PENDING');

      // 2. Confirm
      mockPrisma.assignmentReservation.findUnique.mockResolvedValue({
        id: reservationId,
        shipmentId: 'shp_101',
        organizationId: orgId,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60000),
      });
      mockPrisma.assignmentReservation.update.mockResolvedValue({
        id: reservationId,
        status: 'CONFIRMED',
      });

      const confirmRes = await request(app)
        .post('/internal/assignments/confirm')
        .set('x-internal-service-key', internalKey)
        .send({ reservationId });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.success).toBe(true);
    });

    it('releases assignment when shipment is cancelled synchronously', async () => {
      const activeAssignment = {
        id: 'asg_101',
        shipmentId: 'shp_101',
        driverId: 'drv_101',
        vehicleId: 'veh_101',
        status: 'ACTIVE',
      };
      mockPrisma.dispatchAssignment.findFirst.mockResolvedValue(activeAssignment);
      mockPrisma.dispatchAssignment.update.mockResolvedValue({
        ...activeAssignment,
        status: 'CANCELLED',
      });
      mockPrisma.assignmentReservation.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/internal/assignments/release-by-shipment/shp_101')
        .set('x-internal-service-key', internalKey);

      expect(res.status).toBe(200);
      expect(mockPrisma.driver.update).toHaveBeenCalledWith({
        where: { id: 'drv_101' },
        data: { status: 'AVAILABLE' },
      });
      expect(mockPrisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'veh_101' },
        data: { status: 'AVAILABLE' },
      });
    });
  });

  describe('Driver & Vehicle Roster Management', () => {
    it('creates a driver profile for organization', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue(null);
      mockPrisma.driver.create.mockResolvedValue({
        id: 'drv_new_1',
        organizationId: orgId,
        name: 'Vikas Sharma',
        phone: '+919876543210',
        licenseNumber: 'MH02-2020-0012345',
        status: 'AVAILABLE',
      });

      const res = await request(app)
        .post('/api/v1/fleet/drivers')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Vikas Sharma',
          phone: '+919876543210',
          licenseNumber: 'MH02-2020-0012345',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Vikas Sharma');
      expect(res.body.data.status).toBe('AVAILABLE');
    });

    it('rejects duplicate driver license number', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue({
        id: 'drv_existing',
        licenseNumber: 'MH02-2020-0012345',
      });

      const res = await request(app)
        .post('/api/v1/fleet/drivers')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Another Driver',
          phone: '+919876543211',
          licenseNumber: 'MH02-2020-0012345',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_LICENSE_NUMBER');
    });

    it('registers a vehicle with positive payload capacity', async () => {
      mockPrisma.vehicle.findUnique.mockResolvedValue(null);
      mockPrisma.vehicle.create.mockResolvedValue({
        id: 'veh_new_1',
        organizationId: orgId,
        registrationNumber: 'MH01AB1234',
        vehicleType: 'TRUCK_SMALL',
        capacityKg: 2000,
        status: 'AVAILABLE',
      });

      const res = await request(app)
        .post('/api/v1/fleet/vehicles')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          registrationNumber: 'MH-01-AB-1234',
          vehicleType: 'TRUCK_SMALL',
          capacityKg: 2000,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.registrationNumber).toBe('MH01AB1234');
      expect(res.body.data.capacityKg).toBe(2000);
    });

    it('prevents deactivating driver who has an active dispatch assignment', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue({
        id: 'drv_1',
        organizationId: orgId,
        status: 'ON_DUTY',
      });
      mockPrisma.dispatchAssignment.findFirst.mockResolvedValue({
        id: 'asg_active',
        driverId: 'drv_1',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .patch('/api/v1/fleet/drivers/drv_1/status')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DRIVER_ASSIGNMENT_ACTIVE');
    });
  });

  describe('Dispatch Assignment, Capacity & Reassignment Audit Workflow', () => {
    const driverId = '11111111-1111-1111-1111-000000000001';
    const vehicleId = '11111111-1111-1111-1111-000000000002';
    const newDriverId = '11111111-1111-1111-1111-000000000003';
    const newVehicleId = '11111111-1111-1111-1111-000000000004';

    it('assigns driver and vehicle to shipment with capacity check', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue({
        id: driverId,
        organizationId: orgId,
        status: 'AVAILABLE',
      });
      mockPrisma.vehicle.findUnique.mockResolvedValue({
        id: vehicleId,
        organizationId: orgId,
        capacityKg: 1000,
        status: 'AVAILABLE',
      });
      mockPrisma.dispatchAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.dispatchAssignment.create.mockResolvedValue({
        id: 'asg_new_1',
        organizationId: orgId,
        shipmentId: 'shp_500',
        driverId,
        vehicleId,
        assignedByUserId: 'usr_disp_1',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/v1/fleet/dispatch/assign')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          shipmentId: 'shp_500',
          driverId,
          vehicleId,
          shipmentWeightKg: 450,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('asg_new_1');
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('rejects assignment when vehicle capacity is insufficient', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue({
        id: driverId,
        organizationId: orgId,
        status: 'AVAILABLE',
      });
      mockPrisma.vehicle.findUnique.mockResolvedValue({
        id: vehicleId,
        organizationId: orgId,
        capacityKg: 50, // Only 50kg capacity
        status: 'AVAILABLE',
      });

      const res = await request(app)
        .post('/api/v1/fleet/dispatch/assign')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          shipmentId: 'shp_500',
          driverId,
          vehicleId,
          shipmentWeightKg: 200, // 200kg shipment weight
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_VEHICLE_CAPACITY');
    });

    it('reassigns shipment with mandatory reason and preserves history', async () => {
      // 1. Mock new driver & new vehicle
      mockPrisma.driver.findUnique.mockResolvedValue({
        id: newDriverId,
        organizationId: orgId,
        status: 'AVAILABLE',
      });
      mockPrisma.vehicle.findUnique.mockResolvedValue({
        id: newVehicleId,
        organizationId: orgId,
        capacityKg: 1500,
        status: 'AVAILABLE',
      });

      // 2. Mock current active assignment
      mockPrisma.dispatchAssignment.findFirst.mockResolvedValue({
        id: 'asg_old_1',
        organizationId: orgId,
        shipmentId: 'shp_500',
        driverId,
        vehicleId,
        status: 'ACTIVE',
      });

      mockPrisma.dispatchAssignment.create.mockResolvedValue({
        id: 'asg_reassigned_2',
        organizationId: orgId,
        shipmentId: 'shp_500',
        driverId: newDriverId,
        vehicleId: newVehicleId,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/v1/fleet/dispatch/reassign')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          shipmentId: 'shp_500',
          newDriverId,
          newVehicleId,
          reassignmentReason: 'Primary vehicle had flat tyre on Highway 48',
          shipmentWeightKg: 200,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('asg_reassigned_2');
      expect(mockPrisma.dispatchAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'asg_old_1' },
          data: expect.objectContaining({
            status: 'REASSIGNED',
            reassignmentReason: 'Primary vehicle had flat tyre on Highway 48',
            reassignedToId: 'asg_reassigned_2',
          }),
        })
      );
    });

    it('returns chronological assignment audit trail', async () => {
      mockPrisma.dispatchAssignment.findMany.mockResolvedValue([
        {
          id: 'asg_old_1',
          organizationId: orgId,
          shipmentId: 'shp_500',
          status: 'REASSIGNED',
          reassignmentReason: 'Primary vehicle had flat tyre on Highway 48',
          reassignedToId: 'asg_reassigned_2',
          createdAt: new Date('2026-11-04T10:00:00Z'),
        },
        {
          id: 'asg_reassigned_2',
          organizationId: orgId,
          shipmentId: 'shp_500',
          status: 'ACTIVE',
          createdAt: new Date('2026-11-04T10:30:00Z'),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/fleet/dispatch/history/shp_500')
        .set('Authorization', `Bearer ${dispatcherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].status).toBe('REASSIGNED');
      expect(res.body.data[1].status).toBe('ACTIVE');
    });
  });

  describe('Multi-Tenant Isolation & Role-Based Access Control', () => {
    it('denies customer role from accessing dispatch endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/fleet/dispatch/available')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ROLE_UNAUTHORIZED');
    });

    it('denies competitor organization access to driver profile', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue({
        id: 'drv_apex_1',
        organizationId: orgId, // Belongs to orgId, not otherOrgId
      });

      const res = await request(app)
        .get('/api/v1/fleet/drivers/drv_apex_1')
        .set('Authorization', `Bearer ${otherOrgToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_MISMATCH');
    });
  });

  describe('SQS Fleet Event Consumer & Idempotency', () => {
    it('releases driver and vehicle upon ShipmentDelivered domain event', async () => {
      const event = {
        id: 'evt_deliv_101',
        type: 'ShipmentDelivered',
        payload: {
          shipmentId: 'shp_700',
        },
      };

      mockPrisma.processedEvent.findUnique.mockResolvedValue(null);
      mockPrisma.dispatchAssignment.findFirst.mockResolvedValue({
        id: 'asg_700',
        shipmentId: 'shp_700',
        driverId: 'drv_700',
        vehicleId: 'veh_700',
        status: 'ACTIVE',
      });

      const processed = await fleetEventConsumer.handleDomainEvent(event);
      expect(processed).toBe(true);

      expect(mockPrisma.driver.update).toHaveBeenCalledWith({
        where: { id: 'drv_700' },
        data: { status: 'AVAILABLE' },
      });
      expect(mockPrisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'veh_700' },
        data: { status: 'AVAILABLE' },
      });
      expect(mockPrisma.dispatchAssignment.update).toHaveBeenCalledWith({
        where: { id: 'asg_700' },
        data: { status: 'COMPLETED' },
      });
    });

    it('ignores duplicate domain event if already processed', async () => {
      const event = {
        id: 'evt_deliv_101',
        type: 'ShipmentDelivered',
        payload: { shipmentId: 'shp_700' },
      };

      mockPrisma.processedEvent.findUnique.mockResolvedValue({
        id: 'pe_1',
        eventId: 'evt_deliv_101',
      });

      const processed = await fleetEventConsumer.handleDomainEvent(event);
      expect(processed).toBe(true);
      expect(mockPrisma.driver.update).not.toHaveBeenCalled();
    });

    it('expires orphaned reservations in reservationTimeoutWorker', async () => {
      mockPrisma.assignmentReservation.findMany.mockResolvedValue([
        { id: 'res_orphaned_1', shipmentId: 'shp_999' },
      ]);

      await reservationTimeoutWorker.processExpiredReservations();

      expect(mockPrisma.assignmentReservation.update).toHaveBeenCalledWith({
        where: { id: 'res_orphaned_1' },
        data: { status: 'EXPIRED' },
      });
    });
  });
});
