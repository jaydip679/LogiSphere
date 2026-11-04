const HUBS = Object.freeze({
  MUMBAI: {
    name: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.076,
    lon: 72.8777,
    pinPrefixes: ['400', '401', '410', '411'],
  },
  DELHI_NCR: {
    name: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.6139,
    lon: 77.209,
    pinPrefixes: ['110', '121', '122', '201'],
  },
  BENGALURU: {
    name: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9716,
    lon: 77.5946,
    pinPrefixes: ['560', '561', '562'],
  },
  HYDERABAD: {
    name: 'Hyderabad',
    state: 'Telangana',
    lat: 17.385,
    lon: 78.4867,
    pinPrefixes: ['500', '501', '502'],
  },
  CHENNAI: {
    name: 'Chennai',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lon: 80.2707,
    pinPrefixes: ['600', '601', '602', '603'],
  },
});

const resolveHubByPinCode = (pinCode) => {
  if (!pinCode || typeof pinCode !== 'string' || pinCode.length < 3) {
    return HUBS.MUMBAI; // Safe default fallback
  }

  const prefix3 = pinCode.substring(0, 3);

  for (const hub of Object.values(HUBS)) {
    if (hub.pinPrefixes.includes(prefix3)) {
      return hub;
    }
  }

  // Tier 2 / Regional fallback based on first 2 digits
  const prefix2 = pinCode.substring(0, 2);
  if (['40', '41', '42', '43', '44'].includes(prefix2)) return HUBS.MUMBAI;
  if (['11', '12', '13', '20', '24'].includes(prefix2)) return HUBS.DELHI_NCR;
  if (['56', '57', '58'].includes(prefix2)) return HUBS.BENGALURU;
  if (['50', '51', '52', '53'].includes(prefix2)) return HUBS.HYDERABAD;
  if (['60', '61', '62', '63', '64'].includes(prefix2)) return HUBS.CHENNAI;

  return HUBS.MUMBAI;
};

module.exports = {
  HUBS,
  resolveHubByPinCode,
};
