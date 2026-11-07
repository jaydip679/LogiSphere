const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const resolveKeyPath = (envPath, defaultRelPath) => {
  if (!envPath) return path.resolve(__dirname, defaultRelPath);
  if (path.isAbsolute(envPath)) return envPath;
  if (fs.existsSync(path.resolve(process.cwd(), envPath))) {
    return path.resolve(process.cwd(), envPath);
  }
  return path.resolve(__dirname, '../../', envPath);
};

const publicKeyPath = resolveKeyPath(
  process.env.JWT_PUBLIC_KEY_PATH,
  '../../../../shared/keys/jwt-public.key'
);

let publicKey = process.env.JWT_PUBLIC_KEY
  ? process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n')
  : null;

if (!publicKey) {
  try {
    if (fs.existsSync(publicKeyPath)) {
      publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    }
  } catch (err) {
    console.warn(`[CONFIG WARNING] Could not load RSA public key: ${err.message}`);
  }
}

const getDatabaseUrl = (schema, fallback) => {
  const isCloudOrForced =
    process.env.TARGET_DB === 'neon' ||
    process.env.USE_NEON === 'true' ||
    process.env.FORCE_BASE_DB_URL === 'true' ||
    (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech'));

  if (!isCloudOrForced) {
    const specific = process.env[`DATABASE_URL_${schema.toUpperCase()}`];
    if (specific) return specific;
  }

  const base = process.env.DATABASE_URL;
  if (!base) return fallback;
  let url = base;
  if (url.includes('schema=')) {
    url = url.replace(/schema=[^&]+/, `schema=${schema}`);
  } else if (url.includes('?')) {
    url = `${url}&schema=${schema}`;
  } else {
    url = `${url}?schema=${schema}`;
  }
  if (!url.includes('connection_limit=')) {
    url += '&connection_limit=2';
  }
  return url;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT_SHIPMENT || process.env.PORT, 10) || 5002,
  host: process.env.HOST_SHIPMENT || process.env.HOST || '127.0.0.1',
  databaseUrl: getDatabaseUrl(
    'shipment',
    'postgresql://postgres:postgres@localhost:5432/logisphere?schema=shipment'
  ),
  jwt: {
    publicKey,
    algorithm: 'RS256',
  },
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:5001',
  fleetServiceUrl: process.env.FLEET_SERVICE_URL || 'http://127.0.0.1:5003',
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || 'dev_internal_secret_key',
  sqs: {
    region: process.env.AWS_REGION || 'ap-south-1',
    endpoint:
      process.env.SQS_ENDPOINT ||
      (process.env.NODE_ENV === 'production' && !process.env.SQS_ENDPOINT
        ? undefined
        : 'http://localhost:4566'),
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || undefined,
    queuePrefix: process.env.QUEUE_PREFIX || undefined,
  },
  reports: {
    dir: path.resolve(__dirname, '../../', process.env.REPORTS_DIR || 'storage/reports'),
    ttlMinutes: parseInt(process.env.REPORT_TTL_MINUTES, 10) || 5,
  },
  pricing: {
    baseRatePaise: 5000, // ₹50.00 base charge
    perKmRatePaise: 800, // ₹8.00 per km
    perKgAboveOneRatePaise: 2000, // ₹20.00 per kg above 1 kg
    categorySurchargesPaise: {
      DOCUMENT: 0,
      PARCEL: 3000, // ₹30.00
      CORPORATE: 10000, // ₹100.00
      BULK: 25000, // ₹250.00
    },
  },
};

module.exports = config;
