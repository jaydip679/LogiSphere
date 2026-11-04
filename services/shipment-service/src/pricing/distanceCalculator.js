const toRad = (value) => (value * Math.PI) / 180;

const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const EARTH_RADIUS_KM = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
};

const calculateDistanceBetweenHubs = (originHub, destinationHub) => {
  if (originHub.name === destinationHub.name) {
    // Intra-hub / local metro transit default estimate
    return 15.0;
  }

  const distance = calculateHaversineDistance(
    originHub.lat,
    originHub.lon,
    destinationHub.lat,
    destinationHub.lon
  );

  return Math.max(distance, 15.0);
};

module.exports = {
  calculateHaversineDistance,
  calculateDistanceBetweenHubs,
};
