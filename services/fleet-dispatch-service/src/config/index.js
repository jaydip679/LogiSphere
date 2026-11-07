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
  port: parseInt(process.env.PORT_FLEET || process.env.PORT, 10) || 5003,
  host: process.env.HOST_FLEET || process.env.HOST || '127.0.0.1',
  databaseUrl: getDatabaseUrl(
    'fleet',
    'postgresql://postgres:postgres@localhost:5432/logisphere?schema=fleet'
  ),
  jwt: {
    publicKey,
    algorithm: 'RS256',
  },
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
    fleetQueueName: process.env.FLEET_QUEUE_NAME || 'fleet-queue',
    fleetQueueUrl: process.env.FLEET_QUEUE_URL || undefined,
    fleetDlqName: process.env.FLEET_DLQ_NAME || 'fleet-dlq',
    fleetDlqUrl: process.env.FLEET_DLQ_URL || undefined,
  },
  reservation: {
    ttlMinutes: 2, // 2-minute pending reservation timeout
  },
};

module.exports = config;
