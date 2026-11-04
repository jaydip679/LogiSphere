const prisma = require('../database/prisma');
const config = require('../config');
const driverRepository = require('../repositories/driverRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const reservationRepository = require('../repositories/reservationRepository');
const assignmentRepository = require('../repositories/assignmentRepository');
const { ValidationError, NotFoundError, ConflictError } = require('@logisphere/common-utils');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('fleet-dispatch-service:reservationService');

class ReservationService {
  async getCapacity(organizationId) {
    const [availableDrivers, availableVehicles] = await Promise.all([
      driverRepository.countAvailable(organizationId),
      vehicleRepository.countAvailable(organizationId),
    ]);

    return {
      availableDrivers,
      availableVehicles,
    };
  }

  async reserveAssignment({ shipmentId, organizationId, driverId, vehicleId }) {
    const expiresAt = new Date(Date.now() + config.reservation.ttlMinutes * 60 * 1000);

    return prisma.$transaction(async (tx) => {
      // Check existing active reservation for shipment
      const existingRes = await reservationRepository.findActiveByShipment(shipmentId, tx);
      if (existingRes) {
        throw new ConflictError(
          'An active reservation already exists for this shipment',
          'RESERVATION_CONFLICT'
        );
      }

      if (driverId) {
        const driver = await driverRepository.findById(driverId);
        if (!driver || driver.status !== 'AVAILABLE' || driver.organizationId !== organizationId) {
          throw new ValidationError(
            'Driver is not eligible or available for reservation',
            null,
            'DRIVER_NOT_AVAILABLE'
          );
        }
        const activeDriverRes = await reservationRepository.findActiveByDriver(driverId, tx);
        if (activeDriverRes) {
          throw new ConflictError(
            'Driver is already reserved for another shipment',
            'DRIVER_ALREADY_RESERVED'
          );
        }
      }

      if (vehicleId) {
        const vehicle = await vehicleRepository.findById(vehicleId);
        if (
          !vehicle ||
          vehicle.status !== 'AVAILABLE' ||
          vehicle.organizationId !== organizationId
        ) {
          throw new ValidationError(
            'Vehicle is not eligible or available for reservation',
            null,
            'VEHICLE_NOT_AVAILABLE'
          );
        }
        const activeVehicleRes = await reservationRepository.findActiveByVehicle(vehicleId, tx);
        if (activeVehicleRes) {
          throw new ConflictError(
            'Vehicle is already reserved for another shipment',
            'VEHICLE_ALREADY_RESERVED'
          );
        }
      }

      const reservation = await reservationRepository.createReservation(
        {
          shipmentId,
          organizationId,
          driverId: driverId || null,
          vehicleId: vehicleId || null,
          status: 'PENDING',
          expiresAt,
        },
        tx
      );

      logger.info(
        `Created pending reservation ${reservation.id} for shipment ${shipmentId} (expires at ${expiresAt.toISOString()})`
      );

      return {
        reservationId: reservation.id,
        status: reservation.status,
        expiresAt: reservation.expiresAt.toISOString(),
      };
    });
  }

  async confirmAssignment(reservationId) {
    return prisma.$transaction(async (tx) => {
      const reservation = await reservationRepository.findById(reservationId, tx);
      if (!reservation) {
        throw new NotFoundError('Reservation not found', 'RESERVATION_NOT_FOUND');
      }

      if (reservation.status !== 'PENDING') {
        throw new ValidationError(
          `Reservation cannot be confirmed from status ${reservation.status}`,
          null,
          'INVALID_RESERVATION_STATUS'
        );
      }

      if (new Date() > new Date(reservation.expiresAt)) {
        await reservationRepository.updateStatus(reservationId, 'EXPIRED', tx);
        throw new ValidationError('Reservation has expired', null, 'RESERVATION_EXPIRED');
      }

      // Mark reservation confirmed
      await reservationRepository.updateStatus(reservationId, 'CONFIRMED', tx);

      // If driver and vehicle are bound, promote to active dispatch assignment
      if (reservation.driverId && reservation.vehicleId) {
        await assignmentRepository.createAssignment(
          {
            organizationId: reservation.organizationId,
            shipmentId: reservation.shipmentId,
            driverId: reservation.driverId,
            vehicleId: reservation.vehicleId,
            assignedByUserId: 'SYSTEM_RESERVATION',
            status: 'ACTIVE',
          },
          tx
        );

        await driverRepository.updateStatus(reservation.driverId, 'ON_DUTY', tx);
        await vehicleRepository.updateStatus(reservation.vehicleId, 'IN_USE', tx);
      }

      logger.info(`Confirmed reservation ${reservationId} for shipment ${reservation.shipmentId}`);
      return { success: true };
    });
  }

  async cancelAssignment(reservationId) {
    const reservation = await reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new NotFoundError('Reservation not found', 'RESERVATION_NOT_FOUND');
    }

    await reservationRepository.updateStatus(reservationId, 'RELEASED');
    logger.info(`Released reservation ${reservationId}`);
    return { success: true };
  }

  async releaseByShipment(shipmentId) {
    return prisma.$transaction(async (tx) => {
      // Find active assignment
      const activeAssignment = await assignmentRepository.findActiveByShipment(shipmentId, tx);
      if (activeAssignment) {
        await assignmentRepository.updateStatus(activeAssignment.id, 'CANCELLED', tx);
        await driverRepository.updateStatus(activeAssignment.driverId, 'AVAILABLE', tx);
        await vehicleRepository.updateStatus(activeAssignment.vehicleId, 'AVAILABLE', tx);
        logger.info(
          `Released assignment ${activeAssignment.id} for cancelled shipment ${shipmentId}`
        );
      }

      // Release any pending reservation
      const pendingReservation = await reservationRepository.findActiveByShipment(shipmentId, tx);
      if (pendingReservation) {
        await reservationRepository.updateStatus(pendingReservation.id, 'RELEASED', tx);
        logger.info(
          `Released pending reservation ${pendingReservation.id} for cancelled shipment ${shipmentId}`
        );
      }

      return { success: true };
    });
  }
}

module.exports = new ReservationService();
