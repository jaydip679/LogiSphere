const config = require('../config');
const { resolveHub } = require('./indianHubs');

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 10) / 10;
};

class RouteSimulator {
  generateRoutePoints({
    trackingNumber,
    shipmentId,
    originHubName,
    destinationHubName,
    waypointsCount = config.simulation.defaultWaypointsCount,
    speedKmh = config.simulation.speedKmh,
    startTime = new Date(),
  }) {
    const origin = resolveHub(originHubName);
    const destination = resolveHub(destinationHubName);

    const totalDistanceKm = calculateDistanceKm(
      origin.lat,
      origin.lon,
      destination.lat,
      destination.lon
    );

    const points = [];
    const count = Math.max(3, Math.min(50, waypointsCount));

    for (let i = 0; i <= count; i++) {
      const fraction = i / count;
      const lat = Number((origin.lat + fraction * (destination.lat - origin.lat)).toFixed(6));
      const lon = Number((origin.lon + fraction * (destination.lon - origin.lon)).toFixed(6));

      const remainingKm = Number((totalDistanceKm * (1 - fraction)).toFixed(1));
      const remainingHours = remainingKm / speedKmh;
      const estimatedEta = new Date(startTime.getTime() + remainingHours * 60 * 60 * 1000);

      points.push({
        trackingNumber,
        shipmentId,
        source: 'SIMULATOR',
        latitude: lat,
        longitude: lon,
        sequenceOrder: i,
        remainingKm,
        estimatedEta,
        timestamp: new Date(startTime.getTime() + i * 15 * 60 * 1000), // 15 min progression
      });
    }

    return {
      totalDistanceKm,
      origin: origin.name,
      destination: destination.name,
      points,
    };
  }
}

module.exports = {
  RouteSimulator: new RouteSimulator(),
  calculateDistanceKm,
};
