const prisma = require('../database/prisma');
const driverRepository = require('../repositories/driverRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const assignmentRepository = require('../repositories/assignmentRepository');
const {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('@logisphere/common-utils');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('fleet-dispatch-service:dispatchService');

class DispatchService {
  async getAvailableFleet(organizationId) {
    const drivers = await driverRepository.listByOrganization(organizationId, {
      status: 'AVAILABLE',
    });
    const vehicles = await vehicleRepository.listByOrganization(organizationId, {
      status: 'AVAILABLE',
    });

    return {
      availableDrivers: drivers,
      availableVehicles: vehicles,
    };
  }

  async assignDispatch({
    organizationId,
    shipmentId,
    driverId,
    vehicleId,
    assignedByUserId,
    shipmentWeightKg,
  }) {
    // 1. Validate Driver
    const driver = await driverRepository.findById(driverId);
    if (!driver) {
      throw new NotFoundError('Driver not found', 'DRIVER_NOT_FOUND');
    }
    if (driver.organizationId !== organizationId) {
      throw new ForbiddenError('Driver belongs to another organization', 'TENANT_MISMATCH');
    }
    if (driver.status !== 'AVAILABLE') {
      throw new ValidationError(
        `Driver is currently ${driver.status} and cannot be assigned`,
        null,
        'DRIVER_NOT_AVAILABLE'
      );
    }

    // 2. Validate Vehicle
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found', 'VEHICLE_NOT_FOUND');
    }
    if (vehicle.organizationId !== organizationId) {
      throw new ForbiddenError('Vehicle belongs to another organization', 'TENANT_MISMATCH');
    }
    if (vehicle.status !== 'AVAILABLE') {
      throw new ValidationError(
        `Vehicle is currently ${vehicle.status} and cannot be assigned`,
        null,
        'VEHICLE_NOT_AVAILABLE'
      );
    }

    // 3. Validate Vehicle Capacity
    if (shipmentWeightKg && vehicle.capacityKg < shipmentWeightKg) {
      throw new ValidationError(
        `Vehicle capacity (${vehicle.capacityKg} kg) is insufficient for shipment weight (${shipmentWeightKg} kg)`,
        null,
        'INSUFFICIENT_VEHICLE_CAPACITY'
      );
    }

    // 4. Strict 1-to-1 active assignment validation in atomic transaction
    return prisma.$transaction(async (tx) => {
      // Check active assignment for shipment
      const existingShipmentAssignment = await assignmentRepository.findActiveByShipment(
        shipmentId,
        tx
      );
      if (existingShipmentAssignment) {
        throw new ConflictError(
          'Shipment already has an active dispatch assignment',
          'SHIPMENT_ALREADY_ASSIGNED'
        );
      }

      // Check active assignment for driver
      const existingDriverAssignment = await assignmentRepository.findActiveByDriver(driverId, tx);
      if (existingDriverAssignment) {
        throw new ConflictError(
          'Driver already has an active dispatch assignment',
          'DRIVER_ALREADY_ASSIGNED'
        );
      }

      // Check active assignment for vehicle
      const existingVehicleAssignment = await assignmentRepository.findActiveByVehicle(
        vehicleId,
        tx
      );
      if (existingVehicleAssignment) {
        throw new ConflictError(
          'Vehicle already has an active dispatch assignment',
          'VEHICLE_ALREADY_ASSIGNED'
        );
      }

      // Create DispatchAssignment
      const assignment = await assignmentRepository.createAssignment(
        {
          organizationId,
          shipmentId,
          driverId,
          vehicleId,
          assignedByUserId,
          status: 'ACTIVE',
        },
        tx
      );

      // Update Driver status to ON_DUTY
      await driverRepository.updateStatus(driverId, 'ON_DUTY', tx);

      // Update Vehicle status to IN_USE
      await vehicleRepository.updateStatus(vehicleId, 'IN_USE', tx);

      logger.info(
        `Assigned shipment ${shipmentId} to driver ${driverId} and vehicle ${vehicleId} by user ${assignedByUserId}`
      );

      return assignment;
    });
  }

  async reassignDispatch({
    organizationId,
    shipmentId,
    newDriverId,
    newVehicleId,
    reassignmentReason,
    assignedByUserId,
    shipmentWeightKg,
  }) {
    if (!reassignmentReason || reassignmentReason.trim().length < 5) {
      throw new ValidationError(
        'A mandatory operational reassignment reason of at least 5 characters is required',
        null,
        'REASSIGNMENT_REASON_REQUIRED'
      );
    }

    // Validate New Driver
    const newDriver = await driverRepository.findById(newDriverId);
    if (!newDriver) {
      throw new NotFoundError('New driver not found', 'DRIVER_NOT_FOUND');
    }
    if (newDriver.organizationId !== organizationId) {
      throw new ForbiddenError('New driver belongs to another organization', 'TENANT_MISMATCH');
    }
    if (newDriver.status !== 'AVAILABLE') {
      throw new ValidationError(
        `New driver is currently ${newDriver.status} and cannot be assigned`,
        null,
        'DRIVER_NOT_AVAILABLE'
      );
    }

    // Validate New Vehicle
    const newVehicle = await vehicleRepository.findById(newVehicleId);
    if (!newVehicle) {
      throw new NotFoundError('New vehicle not found', 'VEHICLE_NOT_FOUND');
    }
    if (newVehicle.organizationId !== organizationId) {
      throw new ForbiddenError('New vehicle belongs to another organization', 'TENANT_MISMATCH');
    }
    if (newVehicle.status !== 'AVAILABLE') {
      throw new ValidationError(
        `New vehicle is currently ${newVehicle.status} and cannot be assigned`,
        null,
        'VEHICLE_NOT_AVAILABLE'
      );
    }

    if (shipmentWeightKg && newVehicle.capacityKg < shipmentWeightKg) {
      throw new ValidationError(
        `New vehicle capacity (${newVehicle.capacityKg} kg) is insufficient for shipment weight (${shipmentWeightKg} kg)`,
        null,
        'INSUFFICIENT_VEHICLE_CAPACITY'
      );
    }

    return prisma.$transaction(async (tx) => {
      // Find active assignment for this shipment
      const currentAssignment = await assignmentRepository.findActiveByShipment(shipmentId, tx);
      if (!currentAssignment) {
        throw new NotFoundError(
          'No active assignment found for this shipment to reassign',
          'ACTIVE_ASSIGNMENT_NOT_FOUND'
        );
      }
      if (currentAssignment.organizationId !== organizationId) {
        throw new ForbiddenError(
          'Shipment assignment belongs to another organization',
          'TENANT_MISMATCH'
        );
      }

      // Release old driver & vehicle
      await driverRepository.updateStatus(currentAssignment.driverId, 'AVAILABLE', tx);
      await vehicleRepository.updateStatus(currentAssignment.vehicleId, 'AVAILABLE', tx);

      // Create new active assignment
      const newAssignment = await assignmentRepository.createAssignment(
        {
          organizationId,
          shipmentId,
          driverId: newDriverId,
          vehicleId: newVehicleId,
          assignedByUserId,
          status: 'ACTIVE',
        },
        tx
      );

      // Mark old assignment REASSIGNED with reason and link to new assignment
      await tx.dispatchAssignment.update({
        where: { id: currentAssignment.id },
        data: {
          status: 'REASSIGNED',
          reassignmentReason,
          reassignedToId: newAssignment.id,
        },
      });

      // Update new driver & vehicle
      await driverRepository.updateStatus(newDriverId, 'ON_DUTY', tx);
      await vehicleRepository.updateStatus(newVehicleId, 'IN_USE', tx);

      logger.info(
        `Reassigned shipment ${shipmentId} from assignment ${currentAssignment.id} to new assignment ${newAssignment.id}. Reason: ${reassignmentReason}`
      );

      return newAssignment;
    });
  }

  async getShipmentHistory(organizationId, shipmentId) {
    const history = await assignmentRepository.findByShipmentHistory(shipmentId);

    // Filter by tenant scope unless PLATFORM_ADMIN
    if (organizationId && history.length > 0 && history[0].organizationId !== organizationId) {
      throw new ForbiddenError(
        'Assignment history belongs to another organization',
        'TENANT_MISMATCH'
      );
    }

    return history;
  }
}

module.exports = new DispatchService();
