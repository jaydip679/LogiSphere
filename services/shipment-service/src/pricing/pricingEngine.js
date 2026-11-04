const config = require('../config');
const { resolveHubByPinCode } = require('./hubs');
const { calculateDistanceBetweenHubs } = require('./distanceCalculator');

const calculateEstimatedPrice = ({
  pickupPinCode,
  deliveryPinCode,
  weightKg,
  category = 'PARCEL',
}) => {
  const pickupHub = resolveHubByPinCode(pickupPinCode);
  const deliveryHub = resolveHubByPinCode(deliveryPinCode);

  const estimatedDistanceKm = calculateDistanceBetweenHubs(pickupHub, deliveryHub);

  const baseCharge = config.pricing.baseRatePaise;
  const distanceCharge = Math.round(estimatedDistanceKm * config.pricing.perKmRatePaise);

  const billableWeight = Math.max(0, Number(weightKg) - 1.0);
  const weightCharge = Math.round(billableWeight * config.pricing.perKgAboveOneRatePaise);

  const categorySurcharge =
    config.pricing.categorySurchargesPaise[category.toUpperCase()] ||
    config.pricing.categorySurchargesPaise.PARCEL;

  const totalPaise = baseCharge + distanceCharge + weightCharge + categorySurcharge;

  return {
    pickupHub: pickupHub.name,
    deliveryHub: deliveryHub.name,
    estimatedDistanceKm,
    pricingBreakdown: {
      baseChargePaise: baseCharge,
      distanceChargePaise: distanceCharge,
      weightChargePaise: weightCharge,
      categorySurchargePaise: categorySurcharge,
      totalPaise,
    },
    estimatedPricePaise: totalPaise,
    estimatedPriceInr: (totalPaise / 100).toFixed(2),
    currency: 'INR',
  };
};

module.exports = {
  calculateEstimatedPrice,
};
