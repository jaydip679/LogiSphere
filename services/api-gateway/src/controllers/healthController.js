const axios = require('axios');
const config = require('../config');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

class HealthController {
  async getHealth(req, res) {
    const probeService = async (name, url) => {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 1500 });
        return { name, status: response.status === 200 ? 'UP' : 'DEGRADED' };
      } catch (err) {
        return { name, status: 'DOWN', error: err.message };
      }
    };

    const checks = await Promise.all([
      probeService('auth', config.services.auth),
      probeService('shipment', config.services.shipment),
      probeService('fleet', config.services.fleet),
      probeService('tracking', config.services.tracking),
      probeService('notification', config.services.notification),
    ]);

    const serviceStatuses = {};
    let allUp = true;

    checks.forEach((chk) => {
      serviceStatuses[chk.name] = chk.status;
      if (chk.status !== 'UP') allUp = false;
    });

    const statusCode = allUp ? HttpStatus.OK : HttpStatus.OK; // In gateway, return status report

    return sendSuccess(
      res,
      allUp
        ? 'API Gateway and all microservices are operational'
        : 'API Gateway active with some downstream services unavailable',
      {
        gateway: 'UP',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        downstream: serviceStatuses,
      },
      statusCode
    );
  }
}

module.exports = new HealthController();
