const shipmentRepository = require('../repositories/shipmentRepository');
const offerRepository = require('../repositories/offerRepository');
const quoteRepository = require('../repositories/quoteRepository');
const outboxRepository = require('../repositories/outboxRepository');
const fleetClient = require('../integrations/fleetClient');
const matchingEngine = require('../matching/matchingEngine');
const { calculateEstimatedPrice } = require('../pricing/pricingEngine');
const {
  ShipmentEventTypes,
  createDomainEvent,
  getQueuesForEvent,
} = require('@logisphere/event-contracts');
const {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} = require('@logisphere/common-utils');
const { createLogger } = require('@logisphere/logger');
const prisma = require('../database/prisma');

const logger = createLogger('shipment-service:shipmentService');

class ShipmentService {
  async estimatePrice(data) {
    return calculateEstimatedPrice({
      pickupPinCode: data.pickupPinCode,
      deliveryPinCode: data.deliveryPinCode,
      weightKg: data.weightKg,
      category: data.category,
    });
  }

  async createShipment(customerId, data) {
    const pricing = calculateEstimatedPrice({
      pickupPinCode: data.pickupPinCode,
      deliveryPinCode: data.deliveryPinCode,
      weightKg: data.weightKg,
      category: data.category,
    });

    const trackingNumber = `LSP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const shipment = await prisma.$transaction(async (tx) => {
      const created = await shipmentRepository.createShipment(
        {
          trackingNumber,
          customerId,
          status: 'CREATED',
          senderName: data.senderName,
          senderPhone: data.senderPhone,
          pickupAddress: data.pickupAddress,
          pickupCity: data.pickupCity,
          pickupState: data.pickupState,
          pickupPinCode: data.pickupPinCode,
          pickupHub: pricing.pickupHub,

          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone,
          deliveryAddress: data.deliveryAddress,
          deliveryCity: data.deliveryCity,
          deliveryState: data.deliveryState,
          deliveryPinCode: data.deliveryPinCode,
          deliveryHub: pricing.deliveryHub,

          category: data.category,
          packageDescription: data.packageDescription,
          weightKg: data.weightKg,
          lengthCm: data.lengthCm || null,
          widthCm: data.widthCm || null,
          heightCm: data.heightCm || null,
          estimatedDistanceKm: pricing.estimatedDistanceKm,
          estimatedPricePaise: pricing.estimatedPricePaise,
          currency: 'INR',
        },
        tx
      );

      const createdEvent = createDomainEvent({
        eventType: ShipmentEventTypes.SHIPMENT_CREATED,
        aggregateId: created.id,
        payload: {
          shipmentId: created.id,
          trackingNumber: created.trackingNumber,
          customerId: created.customerId,
          pickupHub: created.pickupHub,
          deliveryHub: created.deliveryHub,
          estimatedPricePaise: created.estimatedPricePaise,
        },
      });

      await outboxRepository.createEvent(
        {
          ...createdEvent,
          targetQueues: getQueuesForEvent(createdEvent.eventType),
        },
        tx
      );

      return created;
    });

    // Trigger initial marketplace matching asynchronously
    matchingEngine.matchAndOfferShipment(shipment.id).catch((err) => {
      logger.error(`Initial matching trigger failed for shipment ${shipment.id}: ${err.message}`);
    });

    return shipment;
  }

  async cancelShipment(requestingUser, shipmentId, reason) {
    const shipment = await shipmentRepository.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    // Authorization: customer must own shipment, or company staff assigned, or platform admin
    if (requestingUser.role === 'CUSTOMER' && shipment.customerId !== requestingUser.id) {
      throw new ForbiddenError('You do not have permission to cancel this shipment');
    }

    if (
      ['COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'].includes(requestingUser.role) &&
      shipment.assignedOrgId !== requestingUser.organizationId
    ) {
      throw new ForbiddenError(
        'You do not have permission to cancel another organization shipment'
      );
    }

    // Validation: cannot cancel post-pickup
    if (['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(shipment.status)) {
      throw new ValidationError(
        'Shipment cannot be cancelled after package pickup. Return workflow must be initiated.'
      );
    }

    if (['CANCELLED', 'RETURNED'].includes(shipment.status)) {
      throw new ValidationError(`Shipment is already ${shipment.status.toLowerCase()}`);
    }

    // If ASSIGNED, synchronous verification of driver/vehicle release is required before completing cancellation!
    if (shipment.status === 'ASSIGNED') {
      logger.info(`Releasing fleet assignment before cancelling assigned shipment ${shipmentId}`);
      await fleetClient.releaseAssignmentByShipment(shipmentId);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await shipmentRepository.updateShipment(
        shipmentId,
        {
          status: 'CANCELLED',
          failureReason: reason || 'Cancelled by user',
          assignedDriverId: null,
          assignedVehicleId: null,
        },
        tx
      );

      const cancelEvent = createDomainEvent({
        eventType: ShipmentEventTypes.SHIPMENT_CANCELLED,
        aggregateId: shipmentId,
        payload: {
          shipmentId,
          trackingNumber: shipment.trackingNumber,
          cancelledBy: requestingUser.id,
          reason: reason || 'Cancelled by user',
          previousStatus: shipment.status,
        },
      });

      await outboxRepository.createEvent(
        {
          ...cancelEvent,
          targetQueues: getQueuesForEvent(cancelEvent.eventType),
        },
        tx
      );

      return res;
    });

    return updated;
  }

  async retryMatching(customerId, shipmentId) {
    const shipment = await shipmentRepository.findById(shipmentId);
    if (!shipment) throw new NotFoundError('Shipment not found');

    if (shipment.customerId !== customerId) {
      throw new ForbiddenError('You do not own this shipment');
    }

    if (shipment.status !== 'UNMATCHED') {
      throw new ValidationError('Only unmatched shipments can re-trigger marketplace matching');
    }

    await shipmentRepository.updateShipment(shipmentId, { status: 'CREATED' });
    return matchingEngine.matchAndOfferShipment(shipmentId);
  }

  async acceptOffer(organizationId, offerId) {
    return prisma.$transaction(async (tx) => {
      const offer = await offerRepository.findById(offerId, tx);
      if (!offer) throw new NotFoundError('Offer not found');

      if (offer.organizationId !== organizationId) {
        throw new ForbiddenError('This offer was not issued to your organization');
      }

      if (offer.status !== 'PENDING') {
        throw new ConflictError(`Offer is no longer pending (current: ${offer.status})`);
      }

      if (new Date() > new Date(offer.expiresAt)) {
        await offerRepository.updateOfferStatus(offerId, 'EXPIRED', tx);
        throw new ConflictError('Offer has expired');
      }

      const shipment = await shipmentRepository.findById(offer.shipmentId, tx);
      if (shipment.status !== 'CREATED' && shipment.status !== 'UNMATCHED') {
        throw new ConflictError(
          `Shipment is not in an offerable state (current: ${shipment.status})`
        );
      }

      await offerRepository.updateOfferStatus(offerId, 'ACCEPTED', tx);

      const updatedShipment = await shipmentRepository.updateShipment(
        offer.shipmentId,
        {
          status: 'CONFIRMED',
          assignedOrgId: organizationId,
          finalPricePaise: shipment.estimatedPricePaise,
        },
        tx
      );

      const event = createDomainEvent({
        eventType: ShipmentEventTypes.SHIPMENT_OFFER_ACCEPTED,
        aggregateId: shipment.id,
        payload: {
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          offerId,
          organizationId,
          finalPricePaise: shipment.estimatedPricePaise,
        },
      });

      await outboxRepository.createEvent(
        {
          ...event,
          targetQueues: getQueuesForEvent(event.eventType),
        },
        tx
      );

      return { shipment: updatedShipment, offer };
    });
  }

  async rejectOffer(organizationId, offerId, reason = 'Declined by carrier') {
    const shipmentId = await prisma.$transaction(async (tx) => {
      const offer = await offerRepository.findById(offerId, tx);
      if (!offer) throw new NotFoundError('Offer not found');

      if (offer.organizationId !== organizationId) {
        throw new ForbiddenError('This offer was not issued to your organization');
      }

      if (offer.status !== 'PENDING') {
        throw new ConflictError(`Offer is already ${offer.status}`);
      }

      await offerRepository.updateOfferStatus(offerId, 'REJECTED', tx);

      const event = createDomainEvent({
        eventType: ShipmentEventTypes.SHIPMENT_OFFER_REJECTED,
        aggregateId: offer.shipmentId,
        payload: {
          shipmentId: offer.shipmentId,
          offerId,
          organizationId,
          reason,
        },
      });

      await outboxRepository.createEvent(
        {
          ...event,
          targetQueues: getQueuesForEvent(event.eventType),
        },
        tx
      );

      return offer.shipmentId;
    });

    // Cascade to next candidate
    matchingEngine.matchAndOfferShipment(shipmentId).catch((err) => {
      logger.error(
        `Cascading after offer rejection failed for shipment ${shipmentId}: ${err.message}`
      );
    });

    return { message: 'Offer rejected successfully' };
  }

  async submitQuote(organizationId, offerId, { amountPaise, notes }) {
    return prisma.$transaction(async (tx) => {
      const offer = await offerRepository.findById(offerId, tx);
      if (!offer) throw new NotFoundError('Offer not found');

      if (offer.organizationId !== organizationId) {
        throw new ForbiddenError('This offer was not issued to your organization');
      }

      if (offer.status !== 'PENDING') {
        throw new ConflictError(`Cannot quote on non-pending offer (${offer.status})`);
      }

      const quoteExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hr customer decision window

      const quote = await quoteRepository.createQuote(
        {
          shipmentId: offer.shipmentId,
          offerId,
          organizationId,
          amountPaise,
          notes: notes || null,
          status: 'PENDING',
          expiresAt: quoteExpiry,
        },
        tx
      );

      const event = createDomainEvent({
        eventType: ShipmentEventTypes.QUOTE_SUBMITTED,
        aggregateId: offer.shipmentId,
        payload: {
          shipmentId: offer.shipmentId,
          quoteId: quote.id,
          organizationId,
          amountPaise,
          expiresAt: quoteExpiry.toISOString(),
        },
      });

      await outboxRepository.createEvent(
        {
          ...event,
          targetQueues: getQueuesForEvent(event.eventType),
        },
        tx
      );

      return quote;
    });
  }

  async respondToQuote(customerId, shipmentId, quoteId, action) {
    const cascadeShipmentId = await prisma.$transaction(async (tx) => {
      const quote = await quoteRepository.findById(quoteId, tx);
      if (!quote || quote.shipmentId !== shipmentId) {
        throw new NotFoundError('Quote not found for this shipment');
      }

      const shipment = await shipmentRepository.findById(shipmentId, tx);
      if (shipment.customerId !== customerId) {
        throw new ForbiddenError('You do not own this shipment');
      }

      if (quote.status !== 'PENDING') {
        throw new ConflictError(`Quote is already ${quote.status}`);
      }

      if (new Date() > new Date(quote.expiresAt)) {
        await quoteRepository.updateQuoteStatus(quoteId, 'EXPIRED', tx);
        throw new ConflictError('Quote decision window (24 hours) has expired');
      }

      if (action === 'ACCEPT') {
        await quoteRepository.updateQuoteStatus(quoteId, 'ACCEPTED', tx);
        await offerRepository.updateOfferStatus(quote.offerId, 'ACCEPTED', tx);

        await shipmentRepository.updateShipment(
          shipmentId,
          {
            status: 'CONFIRMED',
            assignedOrgId: quote.organizationId,
            finalPricePaise: quote.amountPaise,
          },
          tx
        );

        const acceptEvent = createDomainEvent({
          eventType: ShipmentEventTypes.QUOTE_ACCEPTED,
          aggregateId: shipmentId,
          payload: {
            shipmentId,
            quoteId,
            organizationId: quote.organizationId,
            finalPricePaise: quote.amountPaise,
          },
        });

        await outboxRepository.createEvent(
          {
            ...acceptEvent,
            targetQueues: getQueuesForEvent(acceptEvent.eventType),
          },
          tx
        );

        return null;
      } else {
        // REJECT quote
        await quoteRepository.updateQuoteStatus(quoteId, 'REJECTED', tx);
        await offerRepository.updateOfferStatus(quote.offerId, 'REJECTED', tx);

        const rejectEvent = createDomainEvent({
          eventType: ShipmentEventTypes.SHIPMENT_OFFER_REJECTED,
          aggregateId: shipmentId,
          payload: {
            shipmentId,
            quoteId,
            organizationId: quote.organizationId,
            reason: 'CUSTOMER_REJECTED_REVISED_QUOTE',
          },
        });

        await outboxRepository.createEvent(
          {
            ...rejectEvent,
            targetQueues: getQueuesForEvent(rejectEvent.eventType),
          },
          tx
        );

        return shipmentId;
      }
    });

    if (cascadeShipmentId) {
      matchingEngine.matchAndOfferShipment(cascadeShipmentId).catch((err) => {
        logger.error(
          `Cascading after quote rejection failed for shipment ${cascadeShipmentId}: ${err.message}`
        );
      });
    }

    return { success: true, action };
  }

  async assignDispatch(organizationId, shipmentId, { driverId, vehicleId }) {
    const shipment = await shipmentRepository.findById(shipmentId);
    if (!shipment) throw new NotFoundError('Shipment not found');

    if (shipment.assignedOrgId !== organizationId) {
      throw new ForbiddenError('Shipment is not assigned to your organization');
    }

    if (shipment.status !== 'CONFIRMED') {
      throw new ConflictError(`Shipment cannot be assigned in state: ${shipment.status}`);
    }

    // Step 1: Two-phase reservation in Fleet Service
    const reservation = await fleetClient.reserveAssignment({
      shipmentId,
      organizationId,
      driverId,
      vehicleId,
    });

    try {
      // Step 2: Commit assignment in Shipment Service
      const updated = await prisma.$transaction(async (tx) => {
        const assignedShipment = await shipmentRepository.updateShipment(
          shipmentId,
          {
            status: 'ASSIGNED',
            assignedDriverId: driverId,
            assignedVehicleId: vehicleId,
          },
          tx
        );

        const assignEvent = createDomainEvent({
          eventType: ShipmentEventTypes.DRIVER_ASSIGNED,
          aggregateId: shipmentId,
          payload: {
            shipmentId,
            trackingNumber: shipment.trackingNumber,
            organizationId,
            driverId,
            vehicleId,
          },
        });

        await outboxRepository.createEvent(
          {
            ...assignEvent,
            targetQueues: getQueuesForEvent(assignEvent.eventType),
          },
          tx
        );

        return assignedShipment;
      });

      // Step 3: Confirm reservation in Fleet Service
      await fleetClient.confirmAssignment(reservation.reservationId);

      return updated;
    } catch (dbError) {
      // Compensation rollback in Fleet Service
      logger.error(
        `Shipment assignment commit failed, rolling back fleet reservation: ${dbError.message}`
      );
      await fleetClient.cancelAssignment(reservation.reservationId);
      throw dbError;
    }
  }

  async updateMilestone(driverId, shipmentId, { status, failureReason, delayReason }) {
    const shipment = await shipmentRepository.findById(shipmentId);
    if (!shipment) throw new NotFoundError('Shipment not found');

    if (shipment.assignedDriverId !== driverId) {
      throw new ForbiddenError('You are not the driver assigned to this shipment');
    }

    const current = shipment.status;

    // Strict State Machine Rules
    if (status === 'PICKED_UP' && current !== 'ASSIGNED') {
      throw new ValidationError(`Cannot transition to PICKED_UP from ${current}`);
    }
    if (status === 'IN_TRANSIT' && current !== 'PICKED_UP') {
      throw new ValidationError(`Cannot transition to IN_TRANSIT from ${current}`);
    }
    if (status === 'OUT_FOR_DELIVERY' && current !== 'IN_TRANSIT') {
      throw new ValidationError(`Cannot transition to OUT_FOR_DELIVERY from ${current}`);
    }
    if (status === 'DELIVERED') {
      if (current !== 'OUT_FOR_DELIVERY') {
        throw new ValidationError(
          `Cannot mark DELIVERED from ${current}. Must be OUT_FOR_DELIVERY.`
        );
      }
    }
    if (status === 'DELAYED') {
      if (!['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(current)) {
        throw new ValidationError(`Cannot mark DELAYED from ${current}`);
      }
    }
    if (status === 'RESUME_FROM_DELAY') {
      if (current !== 'DELAYED' || !shipment.previousStatus) {
        throw new ValidationError(
          'Shipment is not currently DELAYED or has no previous state to restore'
        );
      }
    }
    if (status === 'DELIVERY_FAILED') {
      if (!['OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(current)) {
        throw new ValidationError(`Cannot record DELIVERY_FAILED from ${current}`);
      }
    }

    let targetStatus = status;
    let previousStatus = shipment.previousStatus;
    let attemptsCount = shipment.deliveryAttemptsCount;

    if (status === 'DELAYED') {
      previousStatus = current;
    } else if (status === 'RESUME_FROM_DELAY') {
      targetStatus = shipment.previousStatus; // Restore previous stage
      previousStatus = null;
    } else if (status === 'DELIVERY_FAILED') {
      attemptsCount += 1;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatePayload = {
        status: targetStatus,
        previousStatus,
        deliveryAttemptsCount: attemptsCount,
      };

      if (failureReason) updatePayload.failureReason = failureReason;

      const res = await shipmentRepository.updateShipment(shipmentId, updatePayload, tx);

      // Determine matching event type
      let eventType = null;
      if (targetStatus === 'PICKED_UP') eventType = ShipmentEventTypes.SHIPMENT_PICKED_UP;
      if (targetStatus === 'IN_TRANSIT') eventType = ShipmentEventTypes.SHIPMENT_IN_TRANSIT;
      if (targetStatus === 'DELAYED') eventType = ShipmentEventTypes.SHIPMENT_DELAYED;
      if (targetStatus === 'OUT_FOR_DELIVERY')
        eventType = ShipmentEventTypes.SHIPMENT_OUT_FOR_DELIVERY;
      if (targetStatus === 'DELIVERED') eventType = ShipmentEventTypes.SHIPMENT_DELIVERED;
      if (targetStatus === 'DELIVERY_FAILED') eventType = ShipmentEventTypes.DELIVERY_FAILED;

      if (eventType) {
        const event = createDomainEvent({
          eventType,
          aggregateId: shipmentId,
          payload: {
            shipmentId,
            trackingNumber: shipment.trackingNumber,
            driverId,
            status: targetStatus,
            deliveryAttemptsCount: attemptsCount,
            failureReason: failureReason || null,
            delayReason: delayReason || null,
          },
        });

        await outboxRepository.createEvent(
          {
            ...event,
            targetQueues: getQueuesForEvent(eventType),
          },
          tx
        );
      }

      return res;
    });

    // If delivery completed or failed, synchronously notify fleet to release availability
    if (targetStatus === 'DELIVERED' || targetStatus === 'DELIVERY_FAILED') {
      await fleetClient.releaseAssignmentByShipment(shipmentId);
    }

    return updated;
  }

  async handleFailureDisposition(organizationId, shipmentId, { action, notes }) {
    const shipment = await shipmentRepository.findById(shipmentId);
    if (!shipment) throw new NotFoundError('Shipment not found');

    if (shipment.assignedOrgId !== organizationId) {
      throw new ForbiddenError('Shipment does not belong to your organization');
    }

    if (shipment.status !== 'DELIVERY_FAILED') {
      throw new ValidationError(
        'Can only perform disposition on shipments in DELIVERY_FAILED status'
      );
    }

    // Clarification 2: Maximum 3 attempts total. After 3rd failed attempt, retry must no longer be allowed!
    if (action === 'RE_ATTEMPT') {
      if (shipment.deliveryAttemptsCount >= 3) {
        throw new ValidationError(
          'Maximum delivery attempts (3) reached. Re-attempt is no longer permitted; shipment must be returned.'
        );
      }

      const updated = await shipmentRepository.updateShipment(shipmentId, {
        status: 'CONFIRMED', // Ready for re-dispatch
        failureReason: notes ? `Re-attempt scheduled: ${notes}` : shipment.failureReason,
        assignedDriverId: null,
        assignedVehicleId: null,
      });

      return {
        shipment: updated,
        message: `Re-attempt approved (Attempt ${shipment.deliveryAttemptsCount + 1} of 3 allowed)`,
      };
    } else {
      // INITIATE_RETURN
      const updated = await prisma.$transaction(async (tx) => {
        const res = await shipmentRepository.updateShipment(
          shipmentId,
          {
            status: 'RETURNED',
            failureReason: notes ? `Returned to origin: ${notes}` : shipment.failureReason,
          },
          tx
        );

        const returnEvent = createDomainEvent({
          eventType: 'ShipmentReturned',
          aggregateId: shipmentId,
          payload: {
            shipmentId,
            trackingNumber: shipment.trackingNumber,
            reason: notes || 'Returned to sender after delivery failure',
          },
        });

        await outboxRepository.createEvent(
          {
            ...returnEvent,
            targetQueues: getQueuesForEvent(returnEvent.eventType),
          },
          tx
        );

        return res;
      });

      return { shipment: updated, message: 'Shipment marked for return to sender' };
    }
  }

  async getShipmentDetails(shipmentId, requestingUser) {
    const shipment = await shipmentRepository.findById(shipmentId);
    if (!shipment) throw new NotFoundError('Shipment not found');

    if (requestingUser.role === 'CUSTOMER' && shipment.customerId !== requestingUser.id) {
      throw new ForbiddenError('You do not own this shipment');
    }

    if (
      ['COMPANY_OWNER', 'LOGISTICS_MANAGER', 'DISPATCHER'].includes(requestingUser.role) &&
      shipment.assignedOrgId !== requestingUser.organizationId
    ) {
      throw new ForbiddenError('You do not have access to this organization shipment');
    }

    if (requestingUser.role === 'DRIVER' && shipment.assignedDriverId !== requestingUser.id) {
      throw new ForbiddenError('You are not assigned to this shipment');
    }

    return shipment;
  }
}

module.exports = new ShipmentService();
