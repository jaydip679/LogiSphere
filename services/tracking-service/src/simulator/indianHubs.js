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

const resolveHub = (hubIdentifier) => {
  if (!hubIdentifier) return HUBS.MUMBAI;
  const upper = hubIdentifier.toUpperCase().replace(/\s+/g, '_');
  if (HUBS[upper]) return HUBS[upper];

  for (const hub of Object.values(HUBS)) {
    if (hub.name.toLowerCase() === hubIdentifier.toLowerCase()) return hub;
    if (hub.pinPrefixes.some((p) => hubIdentifier.startsWith(p))) return hub;
  }
  return HUBS.MUMBAI;
};

module.exports = {
  HUBS,
  resolveHub,
};
