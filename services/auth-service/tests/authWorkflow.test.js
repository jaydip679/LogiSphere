const request = require('supertest');

// Mock prisma before requiring app
jest.mock('../src/database/prisma', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    membership: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    $disconnect: jest.fn(),
  };
  return mockPrisma;
});

const app = require('../src/app');
const prisma = require('../src/database/prisma');
const { hashPassword } = require('../src/utils/passwordUtils');
const { generateAccessToken } = require('../src/utils/tokenUtils');

describe('Auth Service — API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('returns service health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.service).toBe('auth-service');
    });
  });

  describe('POST /api/v1/auth/register/customer', () => {
    it('successfully registers an individual customer', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'usr_new_1',
        email: 'customer@logisphere.local',
        fullName: 'Rahul Sharma',
        role: 'CUSTOMER',
        accountType: 'INDIVIDUAL',
      });
      prisma.refreshToken.create.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const res = await request(app).post('/api/v1/auth/register/customer').send({
        email: 'customer@logisphere.local',
        password: 'Password123!',
        fullName: 'Rahul Sharma',
        phone: '+919876543210',
        accountType: 'INDIVIDUAL',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('customer@logisphere.local');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('rejects registration if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing_usr' });

      const res = await request(app).post('/api/v1/auth/register/customer').send({
        email: 'duplicate@logisphere.local',
        password: 'Password123!',
        fullName: 'Duplicate User',
        phone: '+919876543210',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('authenticates valid credentials and returns tokens', async () => {
      const hashedPassword = await hashPassword('ValidPass123!');
      prisma.user.findByEmail = jest.fn();
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        email: 'user@logisphere.local',
        passwordHash: hashedPassword,
        fullName: 'Valid User',
        role: 'CUSTOMER',
        isActive: true,
        mustChangePassword: false,
        memberships: [],
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'user@logisphere.local',
        password: 'ValidPass123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('rejects invalid password with 401', async () => {
      const hashedPassword = await hashPassword('ValidPass123!');
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        email: 'user@logisphere.local',
        passwordHash: hashedPassword,
        isActive: true,
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'user@logisphere.local',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/organizations/register/company', () => {
    it('registers organization into PENDING_REVIEW and owner into COMPANY_OWNER', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue({
        id: 'org_1',
        name: 'Apex Logistics',
        status: 'PENDING_REVIEW',
        serviceAreas: ['Mumbai', 'Pune'],
      });
      prisma.user.create.mockResolvedValue({
        id: 'usr_owner_1',
        email: 'owner@apex.local',
        fullName: 'Amit Patel',
        role: 'COMPANY_OWNER',
      });
      prisma.membership.create.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/organizations/register/company')
        .send({
          name: 'Apex Logistics',
          contactEmail: 'contact@apex.local',
          contactPhone: '+919876543210',
          serviceAreas: ['Mumbai', 'Pune'],
          ownerFullName: 'Amit Patel',
          ownerEmail: 'owner@apex.local',
          ownerPassword: 'Password123!',
          ownerPhone: '+919876543210',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.status).toBe('PENDING_REVIEW');
      expect(res.body.data.owner.role).toBe('COMPANY_OWNER');
    });
  });

  describe('Platform Admin Approval Workflow', () => {
    it('allows PLATFORM_ADMIN to approve pending company', async () => {
      const adminToken = generateAccessToken({
        sub: 'admin_1',
        email: 'admin@logisphere.local',
        role: 'PLATFORM_ADMIN',
      });

      prisma.organization.findUnique.mockResolvedValue({
        id: 'org_1',
        name: 'Apex Logistics',
        status: 'PENDING_REVIEW',
      });
      prisma.organization.update.mockResolvedValue({
        id: 'org_1',
        name: 'Apex Logistics',
        status: 'APPROVED',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/admin/organizations/org_1/review')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
    });

    it('rejects access from non-admin role with 403', async () => {
      const customerToken = generateAccessToken({
        sub: 'cust_1',
        email: 'cust@logisphere.local',
        role: 'CUSTOMER',
      });

      const res = await request(app)
        .post('/api/v1/admin/organizations/org_1/review')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ROLE_UNAUTHORIZED');
    });
  });

  describe('Internal Inter-Service Authentication', () => {
    it('allows internal requests with valid X-Internal-Service-Key', async () => {
      prisma.organization.findMany.mockResolvedValue([
        {
          id: 'org_1',
          name: 'Apex Logistics',
          serviceAreas: ['Mumbai'],
          supportedCategories: ['PARCEL'],
        },
      ]);

      const res = await request(app)
        .get('/internal/organizations/coverage?hub=Mumbai')
        .set('X-Internal-Service-Key', 'dev_internal_secret_key');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('rejects internal requests without valid service key with 401', async () => {
      const res = await request(app).get('/internal/organizations/coverage?hub=Mumbai');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INTERNAL_AUTH_FAILED');
    });
  });
});
