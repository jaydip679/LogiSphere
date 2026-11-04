const request = require('supertest');
const axios = require('axios');

jest.mock('axios');

const app = require('../src/app');

describe('API Gateway — Health & Routing Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Aggregated Health Check', () => {
    it('returns health summary of gateway and probes all downstream services', async () => {
      axios.get.mockImplementation(() => {
        return Promise.resolve({ status: 200, data: { status: 'healthy' } });
      });

      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.data.gateway).toBe('UP');
      expect(res.body.data.downstream.auth).toBe('UP');
      expect(res.body.data.downstream.shipment).toBe('UP');
      expect(res.body.data.downstream.fleet).toBe('UP');
      expect(res.body.data.downstream.tracking).toBe('UP');
      expect(res.body.data.downstream.notification).toBe('UP');
    });

    it('reports downstream service as DOWN when probe encounters connection error', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes(':5001')) {
          return Promise.reject(new Error('Connection refused'));
        }
        return Promise.resolve({ status: 200, data: { status: 'healthy' } });
      });

      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.data.downstream.auth).toBe('DOWN');
      expect(res.body.data.downstream.shipment).toBe('UP');
    });
  });

  describe('Proxy Route Registration', () => {
    it('returns gateway/proxy error when target downstream service is offline', async () => {
      // Direct request to unstarted downstream service port
      const res = await request(app).get('/api/v1/tracking/TRK-TEST-999');
      // Downstream is offline in test harness, proxy returns 502 or 500
      expect([500, 502]).toContain(res.status);
    });
  });
});
