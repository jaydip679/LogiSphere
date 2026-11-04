const driverRepository = require('../repositories/driverRepository');
const assignmentRepository = require('../repositories/assignmentRepository');
const {
  ConflictError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} = require('@logisphere/common-utils');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('fleet-dispatch-service:driverService');

class DriverService {
  async createDriver(organizationId, data) {
    const existing = await driverRepository.findByLicenseNumber(data.licenseNumber);
    if (existing) {
      throw new ConflictError(
        'A driver with this driving license number already exists',
        'DUPLICATE_LICENSE_NUMBER'
      );
    }

    const driver = await driverRepository.createDriver({
      organizationId,
      name: data.name,
      phone: data.phone,
      licenseNumber: data.licenseNumber,
      userId: data.userId || null,
      status: 'AVAILABLE',
    });

    logger.info(`Registered driver ${driver.id} for organization ${organizationId}`);
    return driver;
  }

  async getDriver(organizationId, id) {
    const driver = await driverRepository.findById(id);
    if (!driver) {
      throw new NotFoundError('Driver not found', 'DRIVER_NOT_FOUND');
    }

    if (driver.organizationId !== organizationId) {
      throw new ForbiddenError(
        'Access to driver belonging to another organization is denied',
        'TENANT_MISMATCH'
      );
    }

    return driver;
  }

  async listDrivers(organizationId, filter = {}) {
    return driverRepository.listByOrganization(organizationId, filter);
  }

  async updateDriverStatus(organizationId, id, status) {
    await this.getDriver(organizationId, id);

    if (status === 'INACTIVE' || status === 'AVAILABLE') {
      const activeAssignment = await assignmentRepository.findActiveByDriver(id);
      if (activeAssignment && status === 'INACTIVE') {
        throw new ValidationError(
          'Cannot deactivate a driver who currently has an active dispatch assignment',
          null,
          'DRIVER_ASSIGNMENT_ACTIVE'
        );
      }
    }

    const updated = await driverRepository.updateStatus(id, status);
    logger.info(`Updated driver ${id} status to ${status}`);
    return updated;
  }
}

module.exports = new DriverService();
