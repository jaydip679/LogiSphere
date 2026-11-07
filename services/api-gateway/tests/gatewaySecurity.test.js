const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');

describe('API Gateway — Security & Shielding Tests', () => {
  let privateKey;
  let expiredToken;

  beforeAll(() => {
    const privateKeyPath = path.resolve(__dirname, '../../auth-service/secrets/jwt-private.key');
    if (fs.existsSync(privateKeyPath)) {
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');

      expiredToken = jwt.sign(
        { sub: 'usr_sec_102', email: 'exp@logisphere.local', role: 'CUSTOMER' },
        privateKey,
        { algorithm: 'RS256', issuer: 'logisphere-auth-service', expiresIn: '-10s' }
      );
    }
  });

  describe('Internal Endpoint Shielding', () => {
    it('strictly blocks direct external access to /internal routes with 404', async () => {
      const res = await request(app).get('/internal/fleet/capacity?organizationId=org_1');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });

    it('strictly blocks nested /api/v1/internal routes with 404', async () => {
      const res = await request(app).post('/api/v1/internal/assignments/reserve');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });

  describe('Correlation ID Tracking', () => {
    it('generates and returns X-Correlation-ID when not provided by client', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(res.headers['x-correlation-id']).toMatch(/^corr_/);
    });

    it('preserves client-provided X-Correlation-ID', async () => {
      const customId = 'client_trace_987654';
      const res = await request(app).get('/health').set('x-correlation-id', customId);
      expect(res.headers['x-correlation-id']).toBe(customId);
    });
  });

  describe('JWT Pre-Validation', () => {
    it('rejects expired Bearer token with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/shipments')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('rejects tampered or malformed Bearer token with 401', async () => {
      const res = await request(app)
        .get('/api/v1/shipments')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_INVALID');
    });
  });

  describe('CORS Origin Restriction', () => {
    it('allows requests from configured origin', async () => {
      const res = await request(app).get('/health').set('Origin', 'http://localhost:3000');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('allows requests from trusted LogiSphere Vercel preview domain', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://logisphere-preview-branch.vercel.app');

      expect(res.headers['access-control-allow-origin']).toBe(
        'https://logisphere-preview-branch.vercel.app'
      );
    });

    it('rejects requests from untrusted third-party origins', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://malicious-phishing-site.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
