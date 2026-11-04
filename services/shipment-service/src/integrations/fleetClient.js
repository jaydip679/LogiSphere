const axios = require('axios');
const config = require('../config');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('shipment-service:fleetClient');

class FleetClient {
  async getCapacity(organizationId) {
    try {
      const url = `${config.fleetServiceUrl}/internal/fleet/capacity?organizationId=${encodeURIComponent(organizationId)}`;
      const res = await axios.get(url, {
        headers: {
          'x-internal-service-key': config.internalServiceKey,
        },
        timeout: 3000,
      });

      if (res.data && res.data.success) {
        return res.data.data;
      }
      return { availableDrivers: 1, availableVehicles: 1 };
    } catch (error) {
      // Contract-first mock fallback for Phase 2 prior to Phase 3 deployment
      logger.info(
        `Fleet service not reachable (${error.message}). Using contract-aligned fallback capacity for org ${organizationId}`
      );
      return { availableDrivers: 2, availableVehicles: 2 };
    }
  }

  async reserveAssignment({ shipmentId, organizationId, driverId, vehicleId }) {
    try {
      const url = `${config.fleetServiceUrl}/internal/assignments/reserve`;
      const res = await axios.post(
        url,
        { shipmentId, organizationId, driverId, vehicleId },
        {
          headers: {
            'x-internal-service-key': config.internalServiceKey,
          },
          timeout: 3000,
        }
      );

      if (res.data && res.data.success) {
        return res.data.data;
      }
      throw new Error(res.data?.message || 'Reservation failed');
    } catch (error) {
      logger.info(
        `Fleet service reservation fallback applied for shipment ${shipmentId}: ${error.message}`
      );
      return {
        reservationId: `res_${Date.now()}_mock`,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      };
    }
  }

  async confirmAssignment(reservationId) {
    try {
      const url = `${config.fleetServiceUrl}/internal/assignments/confirm`;
      await axios.post(
        url,
        { reservationId },
        {
          headers: {
            'x-internal-service-key': config.internalServiceKey,
          },
          timeout: 3000,
        }
      );
      return true;
    } catch (error) {
      logger.info(`Fleet service confirmation fallback applied: ${error.message}`);
      return true;
    }
  }

  async cancelAssignment(reservationId) {
    try {
      const url = `${config.fleetServiceUrl}/internal/assignments/cancel`;
      await axios.post(
        url,
        { reservationId },
        {
          headers: {
            'x-internal-service-key': config.internalServiceKey,
          },
          timeout: 3000,
        }
      );
      return true;
    } catch (error) {
      logger.info(`Fleet service cancellation fallback applied: ${error.message}`);
      return true;
    }
  }

  async releaseAssignmentByShipment(shipmentId) {
    try {
      const url = `${config.fleetServiceUrl}/internal/assignments/release-by-shipment/${encodeURIComponent(shipmentId)}`;
      const res = await axios.post(
        url,
        {},
        {
          headers: {
            'x-internal-service-key': config.internalServiceKey,
          },
          timeout: 3000,
        }
      );
      return res.data?.success || true;
    } catch (error) {
      logger.info(`Fleet service release fallback applied for ${shipmentId}: ${error.message}`);
      return true;
    }
  }
}

module.exports = new FleetClient();
