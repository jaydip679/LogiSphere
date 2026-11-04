const vehicleRepository = require('../repositories/vehicleRepository');
const assignmentRepository = require('../repositories/assignmentRepository');
const {
  ConflictError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} = require('@logisphere/common-utils');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('fleet-dispatch-service:vehicleService');

class VehicleService {
  async createVehicle(organizationId, data) {
    const existing = await vehicleRepository.findByRegistrationNumber(data.registrationNumber);
    if (existing) {
      throw new ConflictError(
        'A vehicle with this registration number already exists',
        'DUPLICATE_REGISTRATION_NUMBER'
      );
    }

    if (!data.capacityKg || data.capacityKg <= 0) {
      throw new ValidationError(
        'Vehicle payload capacity must be strictly positive (> 0 kg)',
        null,
        'INVALID_CAPACITY'
      );
    }

    const vehicle = await vehicleRepository.createVehicle({
      organizationId,
      registrationNumber: data.registrationNumber,
      vehicleType: data.vehicleType,
      capacityKg: data.capacityKg,
      status: 'AVAILABLE',
    });

    logger.info(
      `Registered vehicle ${vehicle.id} (${vehicle.registrationNumber}) for org ${organizationId}`
    );
    return vehicle;
  }

  async getVehicle(organizationId, id) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found', 'VEHICLE_NOT_FOUND');
    }

    if (vehicle.organizationId !== organizationId) {
      throw new ForbiddenError(
        'Access to vehicle belonging to another organization is denied',
        'TENANT_MISMATCH'
      );
    }

    return vehicle;
  }

  async listVehicles(organizationId, filter = {}) {
    return vehicleRepository.listByOrganization(organizationId, filter);
  }

  async updateVehicleStatus(organizationId, id, status) {
    await this.getVehicle(organizationId, id);

    if (status === 'INACTIVE' || status === 'MAINTENANCE') {
      const activeAssignment = await assignmentRepository.findActiveByVehicle(id);
      if (activeAssignment) {
        throw new ValidationError(
          `Cannot change vehicle status to ${status} while it has an active dispatch assignment`,
          null,
          'VEHICLE_ASSIGNMENT_ACTIVE'
        );
      }
    }

    const updated = await vehicleRepository.updateStatus(id, status);
    logger.info(`Updated vehicle ${id} status to ${status}`);
    return updated;
  }
}

module.exports = new VehicleService();
