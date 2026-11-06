const authClient = require('../integrations/authClient');
const fleetClient = require('../integrations/fleetClient');
const offerRepository = require('../repositories/offerRepository');
const shipmentRepository = require('../repositories/shipmentRepository');
const outboxRepository = require('../repositories/outboxRepository');
const {
  ShipmentEventTypes,
  createDomainEvent,
  getQueuesForEvent,
} = require('@logisphere/event-contracts');
const { createLogger } = require('@logisphere/logger');
const prisma = require('../database/prisma');

const logger = createLogger('shipment-service:matchingEngine');

class MatchingEngine {
  /**
   * Deterministically matches an eligible logistics company for a shipment
   */
  async matchAndOfferShipment(shipmentId) {
    return prisma.$transaction(async (tx) => {
      const shipment = await shipmentRepository.findById(shipmentId, tx);
      if (!shipment) {
        throw new Error(`Shipment ${shipmentId} not found`);
      }

      // Check concurrency: ensure no active PENDING offer already exists
      const activeOffer = await offerRepository.findActiveOfferForShipment(shipmentId, tx);
      if (activeOffer) {
        logger.warn(`Active pending offer already exists for shipment ${shipmentId}`);
        return { success: false, reason: 'ACTIVE_OFFER_EXISTS', offer: activeOffer };
      }

      // 1. Query approved coverage from Auth Service for pickup and delivery hubs
      const [pickupCoverage, deliveryCoverage] = await Promise.all([
        authClient.getOrganizationsCoverage(shipment.pickupHub),
        authClient.getOrganizationsCoverage(shipment.deliveryHub),
      ]);

      const deliveryOrgIds = new Set(deliveryCoverage.map((o) => o.id));
      // Intersection: org must cover both pickup and delivery hubs
      let eligibleCoverageOrgs = pickupCoverage.filter((org) => deliveryOrgIds.has(org.id));

      // Fallback 1: If no org covers both hubs, fallback to orgs covering pickup hub (origin network)
      if (eligibleCoverageOrgs.length === 0 && pickupCoverage.length > 0) {
        logger.info(
          `No carrier covers both ${shipment.pickupHub} and ${shipment.deliveryHub}. Falling back to carriers covering pickup hub ${shipment.pickupHub}`
        );
        eligibleCoverageOrgs = pickupCoverage;
      }

      // Fallback 2: If still none, fallback to all approved active carriers across network
      if (eligibleCoverageOrgs.length === 0) {
        logger.info(
          `No specific hub coverage found for ${shipment.pickupHub} -> ${shipment.deliveryHub}. Falling back to all approved network carriers.`
        );
        eligibleCoverageOrgs = await authClient.getOrganizationsCoverage(null);
      }

      // 2. Exclude organizations that have already received an offer for this shipment
      const previouslyOfferedOrgIds = await offerRepository.getPreviousOfferOrgIds(shipmentId, tx);
      const candidates = eligibleCoverageOrgs.filter(
        (org) => !previouslyOfferedOrgIds.includes(org.id)
      );

      if (candidates.length === 0) {
        logger.info(`No eligible candidate organizations remaining for shipment ${shipmentId}`);
        await shipmentRepository.updateShipment(shipmentId, { status: 'UNMATCHED' }, tx);

        // Record outbox notification event
        const unmatchedEvent = createDomainEvent({
          eventType: 'ShipmentUnmatched',
          aggregateId: shipmentId,
          payload: {
            shipmentId,
            trackingNumber: shipment.trackingNumber,
            customerId: shipment.customerId,
            reason: 'NO_ELIGIBLE_CARRIERS',
          },
        });

        await outboxRepository.createEvent(
          {
            ...unmatchedEvent,
            targetQueues: getQueuesForEvent(unmatchedEvent.eventType),
          },
          tx
        );

        return { success: false, status: 'UNMATCHED' };
      }

      // 3. Deterministic scoring
      const scoredCandidates = await Promise.all(
        candidates.map(async (org) => {
          const capacity = await fleetClient.getCapacity(org.id);
          const hasDrivers = (capacity.availableDrivers || 0) > 0;
          const hasVehicles = (capacity.availableVehicles || 0) > 0;

          const coverageScore = 40;
          const availabilityScore = hasDrivers && hasVehicles ? 30 : 10;
          const historicalScore = 20; // Default baseline in MVP
          const tierScore = 10;

          const totalScore = coverageScore + availabilityScore + historicalScore + tierScore;

          return {
            org,
            score: totalScore,
          };
        })
      );

      // 4. Sort descending by score. Tie-breaker: most recently registered carrier first (createdAt desc)
      scoredCandidates.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        const timeA = a.org.createdAt ? new Date(a.org.createdAt).getTime() : 0;
        const timeB = b.org.createdAt ? new Date(b.org.createdAt).getTime() : 0;
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        return a.org.id.localeCompare(b.org.id);
      });

      const selected = scoredCandidates[0];
      const offerExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15-minute response window

      // 5. Create MarketplaceOffer
      const newOffer = await offerRepository.createOffer(
        {
          shipmentId,
          organizationId: selected.org.id,
          rankingScore: selected.score,
          status: 'PENDING',
          expiresAt: offerExpiry,
        },
        tx
      );

      // 6. Transactional Outbox: Record ShipmentOfferCreated event
      const offerEvent = createDomainEvent({
        eventType: ShipmentEventTypes.SHIPMENT_OFFER_CREATED,
        aggregateId: shipmentId,
        payload: {
          shipmentId,
          trackingNumber: shipment.trackingNumber,
          offerId: newOffer.id,
          organizationId: selected.org.id,
          expiresAt: offerExpiry.toISOString(),
          estimatedPricePaise: shipment.estimatedPricePaise,
        },
      });

      await outboxRepository.createEvent(
        {
          ...offerEvent,
          targetQueues: getQueuesForEvent(offerEvent.eventType),
        },
        tx
      );

      logger.info(
        `Created sequential offer ${newOffer.id} for shipment ${shipmentId} to organization ${selected.org.id}`
      );

      return {
        success: true,
        offer: newOffer,
        selectedOrg: selected.org,
      };
    });
  }
}

module.exports = new MatchingEngine();
