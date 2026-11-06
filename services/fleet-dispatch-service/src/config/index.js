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
  port: parseInt(process.env.PORT, 10) || 5003,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/logisphere?schema=fleet',
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
