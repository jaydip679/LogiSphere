const trackingRepository = require('../repositories/trackingRepository');
const simulatorRepository = require('../repositories/simulatorRepository');
const { RouteSimulator } = require('../simulator/routeSimulator');
const { NotFoundError, ValidationError } = require('@logisphere/common-utils');
const { createLogger } = require('@logisphere/logger');
const config = require('../config');

const logger = createLogger('tracking-service:trackingService');

class TrackingService {
  async recordMilestoneEvent(data) {
    if (!data.trackingNumber) {
      throw new ValidationError('Tracking number is required', null, 'PARAM_REQUIRED');
    }
    if (!data.status) {
      throw new ValidationError('Status is required', null, 'PARAM_REQUIRED');
    }

    const event = await trackingRepository.createEvent(data);
    logger.info(
      `Recorded tracking event for ${data.trackingNumber}: status=${data.status}, source=${data.source || 'SYSTEM'}`
    );
    return event;
  }

  async fetchShipmentFallback(trackingNumber) {
    const candidateUrls = [
      `${config.shipmentServiceUrl}/internal/shipments/by-tracking/${encodeURIComponent(trackingNumber)}`,
      `${config.shipmentServiceUrl}/api/v1/internal/shipments/by-tracking/${encodeURIComponent(trackingNumber)}`,
    ];

    for (const url of candidateUrls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-internal-service-key': config.internalServiceKey,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          const json = await response.json();
          return json.data || null;
        }
      } catch {
        // Continue to next candidate URL
      }
    }
    return null;
  }

  async getTrackingTimeline(trackingNumber) {
    if (!trackingNumber) {
      throw new ValidationError('Tracking number is required', null, 'PARAM_REQUIRED');
    }

    let [events, simulatedPoints] = await Promise.all([
      trackingRepository.findByTrackingNumber(trackingNumber),
      simulatorRepository.findByTrackingNumber(trackingNumber),
    ]);

    if (events.length === 0 && simulatedPoints.length === 0) {
      // Fallback: Check if shipment exists in shipment-service
      const shipment = await this.fetchShipmentFallback(trackingNumber);
      if (shipment) {
        try {
          const initialEvent = await trackingRepository.createEvent({
            trackingNumber: shipment.trackingNumber,
            shipmentId: shipment.id,
            status: shipment.status || 'CREATED',
            source: 'CUSTOMER',
            location: shipment.pickupHub || `${shipment.pickupCity || ''} Hub`.trim() || null,
            notes: 'Consignment registered and offer broadcasted to carrier marketplace',
            metadata: {
              pickupHub: shipment.pickupHub,
              deliveryHub: shipment.deliveryHub,
              pickupCity: shipment.pickupCity,
              deliveryCity: shipment.deliveryCity,
            },
          });
          events = [initialEvent];
        } catch (dbErr) {
          logger.warn(`Failed to auto-seed initial tracking milestone: ${dbErr.message}`);
          events = [
            {
              id: `evt_init_${shipment.id}`,
              trackingNumber: shipment.trackingNumber,
              shipmentId: shipment.id,
              status: shipment.status || 'CREATED',
              source: 'CUSTOMER',
              location: shipment.pickupHub || null,
              notes: 'Consignment registered and offer broadcasted to carrier marketplace',
              timestamp: shipment.createdAt || new Date().toISOString(),
            },
          ];
        }
      } else {
        throw new NotFoundError(
          `No tracking history found for tracking number ${trackingNumber}`,
          'TRACKING_NOT_FOUND'
        );
      }
    }

    // Determine current status & latest milestone
    const latestMilestone = events.length > 0 ? events[events.length - 1] : null;
    const currentStatus = latestMilestone ? latestMilestone.status : 'IN_TRANSIT';

    // Determine latest simulated location if available
    const latestSimPoint =
      simulatedPoints.length > 0 ? simulatedPoints[simulatedPoints.length - 1] : null;

    // Combine chronological timeline
    const timeline = [];

    events.forEach((evt) => {
      timeline.push({
        id: evt.id,
        type: 'MILESTONE',
        status: evt.status,
        source: evt.source,
        location: evt.location,
        latitude: evt.latitude,
        longitude: evt.longitude,
        notes: evt.notes,
        actorId: evt.actorId,
        metadata: evt.metadata,
        timestamp: evt.timestamp,
      });
    });

    simulatedPoints.forEach((pt) => {
      timeline.push({
        id: pt.id,
        type: 'SIMULATED_LOCATION',
        status: 'IN_TRANSIT',
        source: 'SIMULATOR',
        latitude: pt.latitude,
        longitude: pt.longitude,
        sequenceOrder: pt.sequenceOrder,
        remainingKm: pt.remainingKm,
        estimatedEta: pt.estimatedEta,
        timestamp: pt.timestamp,
      });
    });

    // Sort by timestamp ascending
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return {
      trackingNumber,
      shipmentId: latestMilestone
        ? latestMilestone.shipmentId
        : latestSimPoint
          ? latestSimPoint.shipmentId
          : null,
      currentStatus,
      latestMilestone: latestMilestone
        ? {
            status: latestMilestone.status,
            source: latestMilestone.source,
            location: latestMilestone.location,
            timestamp: latestMilestone.timestamp,
          }
        : null,
      simulation: latestSimPoint
        ? {
            active: true,
            totalWaypoints: simulatedPoints.length,
            remainingKm: latestSimPoint.remainingKm,
            estimatedEta: latestSimPoint.estimatedEta,
          }
        : {
            active: false,
          },
      timeline,
    };
  }

  async generateSimulation({
    trackingNumber,
    shipmentId,
    originHubName,
    destinationHubName,
    waypointsCount,
  }) {
    if (!trackingNumber || !shipmentId) {
      throw new ValidationError(
        'trackingNumber and shipmentId are required',
        null,
        'PARAM_REQUIRED'
      );
    }

    // 1. Clear previous simulation points for this tracking number
    await simulatorRepository.clearByTrackingNumber(trackingNumber);

    // 2. Generate new route points
    const { totalDistanceKm, origin, destination, points } = RouteSimulator.generateRoutePoints({
      trackingNumber,
      shipmentId,
      originHubName,
      destinationHubName,
      waypointsCount,
    });

    // 3. Persist route points
    await simulatorRepository.createRoutePoints(points);

    logger.info(
      `Generated ${points.length} simulated GPS route points for tracking number ${trackingNumber} (${origin} -> ${destination}, ${totalDistanceKm} km)`
    );

    return {
      trackingNumber,
      shipmentId,
      origin,
      destination,
      totalDistanceKm,
      waypointsGenerated: points.length,
      firstWaypoint: points[0],
      finalWaypoint: points[points.length - 1],
    };
  }
}

module.exports = new TrackingService();
