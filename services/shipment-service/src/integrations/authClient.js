const axios = require('axios');
const config = require('../config');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('shipment-service:authClient');

class AuthClient {
  async getOrganizationsCoverage(hub) {
    try {
      const hubParam = hub ? `?hub=${encodeURIComponent(hub)}` : '';
      const url = `${config.authServiceUrl}/internal/organizations/coverage${hubParam}`;
      const res = await axios.get(url, {
        headers: {
          'x-internal-service-key': config.internalServiceKey,
        },
        timeout: 5000,
      });

      if (res.data && res.data.success) {
        return res.data.data;
      }
      return [];
    } catch (error) {
      logger.warn(`Failed to fetch coverage from auth-service (${error.message}) for hub: ${hub}`);
      return [];
    }
  }
}

module.exports = new AuthClient();
