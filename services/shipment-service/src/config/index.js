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

let publicKey = null;
try {
  if (fs.existsSync(publicKeyPath)) {
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  }
} catch (err) {
  console.warn(`[CONFIG WARNING] Could not load RSA public key: ${err.message}`);
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5002,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/logisphere?schema=shipment',
  jwt: {
    publicKey,
    algorithm: 'RS256',
  },
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
  fleetServiceUrl: process.env.FLEET_SERVICE_URL || 'http://localhost:5003',
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
