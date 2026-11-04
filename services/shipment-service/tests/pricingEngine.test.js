const { resolveHubByPinCode } = require('../src/pricing/hubs');
const {
  calculateHaversineDistance,
  calculateDistanceBetweenHubs,
} = require('../src/pricing/distanceCalculator');
const { calculateEstimatedPrice } = require('../src/pricing/pricingEngine');

describe('Shipment Service — Geocoding & Pricing Engine', () => {
  describe('Hub Resolution', () => {
    it('correctly maps Indian PIN codes to regional hubs', () => {
      expect(resolveHubByPinCode('400001').name).toBe('Mumbai');
      expect(resolveHubByPinCode('110001').name).toBe('Delhi NCR');
      expect(resolveHubByPinCode('560001').name).toBe('Bengaluru');
      expect(resolveHubByPinCode('500001').name).toBe('Hyderabad');
      expect(resolveHubByPinCode('600001').name).toBe('Chennai');
    });

    it('falls back to safe default for invalid or unknown PIN codes', () => {
      expect(resolveHubByPinCode('').name).toBe('Mumbai');
      expect(resolveHubByPinCode('999999').name).toBe('Mumbai');
    });
  });

  describe('Haversine Distance Calculation', () => {
    it('calculates great-circle distance between Mumbai and Delhi NCR (~1150 km)', () => {
      // Mumbai: 19.076, 72.8777; Delhi: 28.6139, 77.2090
      const distance = calculateHaversineDistance(19.076, 72.8777, 28.6139, 77.209);
      expect(distance).toBeGreaterThan(1100);
      expect(distance).toBeLessThan(1250);
    });

    it('applies minimum 15.0 km for intra-hub deliveries', () => {
      const mumbaiHub = resolveHubByPinCode('400001');
      const distance = calculateDistanceBetweenHubs(mumbaiHub, mumbaiHub);
      expect(distance).toBe(15.0);
    });
  });

  describe('Pricing Engine', () => {
    it('calculates estimated rate with base, distance, weight, and category charges in paise', () => {
      const estimate = calculateEstimatedPrice({
        pickupPinCode: '400001', // Mumbai
        deliveryPinCode: '400050', // Mumbai (intra-hub: 15 km)
        weightKg: 2.5, // 1.5 kg billable above 1 kg
        category: 'PARCEL', // 3000 paise surcharge
      });

      expect(estimate.pickupHub).toBe('Mumbai');
      expect(estimate.deliveryHub).toBe('Mumbai');
      expect(estimate.estimatedDistanceKm).toBe(15.0);

      // Base: 5000
      // Distance: 15 * 800 = 12000
      // Weight: 1.5 * 2000 = 3000
      // Category: 3000
      // Total: 23000 paise (₹230.00)
      expect(estimate.estimatedPricePaise).toBe(23000);
      expect(estimate.estimatedPriceInr).toBe('230.00');
      expect(estimate.currency).toBe('INR');
    });
  });
});
