const { RouteSimulator, calculateDistanceKm } = require('../src/simulator/routeSimulator');
const { HUBS, resolveHub } = require('../src/simulator/indianHubs');

describe('GPS Route Simulator & Indian Hub Geocoding', () => {
  describe('Hub Geocoding', () => {
    it('resolves known Indian hubs by key, name, or PIN prefix', () => {
      expect(resolveHub('MUMBAI').name).toBe('Mumbai');
      expect(resolveHub('Delhi NCR').name).toBe('Delhi NCR');
      expect(resolveHub('560001').name).toBe('Bengaluru'); // PIN prefix 560
      expect(resolveHub('unknown').name).toBe('Mumbai'); // Fallback default
    });
  });

  describe('Haversine Distance Calculator', () => {
    it('calculates plausible distances between major Indian metropolitan hubs', () => {
      // Mumbai to Delhi NCR is ~1148 km straight line
      const mumbaiDelhi = calculateDistanceKm(
        HUBS.MUMBAI.lat,
        HUBS.MUMBAI.lon,
        HUBS.DELHI_NCR.lat,
        HUBS.DELHI_NCR.lon
      );
      expect(mumbaiDelhi).toBeGreaterThan(1100);
      expect(mumbaiDelhi).toBeLessThan(1200);

      // Mumbai to Bengaluru is ~840 km straight line
      const mumbaiBengaluru = calculateDistanceKm(
        HUBS.MUMBAI.lat,
        HUBS.MUMBAI.lon,
        HUBS.BENGALURU.lat,
        HUBS.BENGALURU.lon
      );
      expect(mumbaiBengaluru).toBeGreaterThan(800);
      expect(mumbaiBengaluru).toBeLessThan(900);
    });
  });

  describe('Route Waypoint Generation', () => {
    it('generates intermediate simulated coordinates with monotonic remaining distance', () => {
      const result = RouteSimulator.generateRoutePoints({
        trackingNumber: 'TRK-MUM-DEL-001',
        shipmentId: 'shp_test_101',
        originHubName: 'Mumbai',
        destinationHubName: 'Delhi NCR',
        waypointsCount: 5,
        speedKmh: 60,
      });

      expect(result.points).toHaveLength(6); // 0 to 5 inclusive
      expect(result.origin).toBe('Mumbai');
      expect(result.destination).toBe('Delhi NCR');

      // Verify first point is at origin
      const first = result.points[0];
      expect(first.sequenceOrder).toBe(0);
      expect(first.source).toBe('SIMULATOR');
      expect(first.latitude).toBeCloseTo(HUBS.MUMBAI.lat, 2);
      expect(first.longitude).toBeCloseTo(HUBS.MUMBAI.lon, 2);
      expect(first.remainingKm).toBeCloseTo(result.totalDistanceKm, 1);

      // Verify final point is at destination
      const last = result.points[result.points.length - 1];
      expect(last.sequenceOrder).toBe(5);
      expect(last.source).toBe('SIMULATOR');
      expect(last.latitude).toBeCloseTo(HUBS.DELHI_NCR.lat, 2);
      expect(last.longitude).toBeCloseTo(HUBS.DELHI_NCR.lon, 2);
      expect(last.remainingKm).toBe(0);

      // Verify remaining distance decreases monotonically
      for (let i = 1; i < result.points.length; i++) {
        expect(result.points[i].remainingKm).toBeLessThan(result.points[i - 1].remainingKm);
      }
    });

    it('clamps waypoints count within safe boundaries (3 to 50)', () => {
      const small = RouteSimulator.generateRoutePoints({
        trackingNumber: 'TRK-1',
        shipmentId: 'shp_1',
        originHubName: 'Mumbai',
        destinationHubName: 'Chennai',
        waypointsCount: 1, // Below minimum
      });
      expect(small.points).toHaveLength(4); // Clamped to 3 + 1 = 4
    });
  });
});
