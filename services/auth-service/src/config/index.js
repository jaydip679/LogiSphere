const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let privateKey = process.env.JWT_PRIVATE_KEY || null;
let publicKey = process.env.JWT_PUBLIC_KEY || null;

const resolveKeyPath = (envPath, defaultRelPath) => {
  if (!envPath) return path.resolve(__dirname, defaultRelPath);
  return path.isAbsolute(envPath) ? envPath : path.resolve(__dirname, '../../', envPath);
};

const privateKeyPath = resolveKeyPath(
  process.env.JWT_PRIVATE_KEY_PATH,
  '../../secrets/jwt-private.key'
);
const publicKeyPath = resolveKeyPath(
  process.env.JWT_PUBLIC_KEY_PATH,
  '../../../../shared/keys/jwt-public.key'
);

try {
  if (!privateKey && fs.existsSync(privateKeyPath)) {
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  }
  if (!publicKey && fs.existsSync(publicKeyPath)) {
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  }
} catch (err) {
  console.warn(`[CONFIG WARNING] Could not load RSA keys from disk: ${err.message}`);
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5001,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/logisphere?schema=auth',
  jwt: {
    privateKey,
    publicKey,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiryDays: parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS, 10) || 7,
    algorithm: 'RS256',
  },
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || 'dev_internal_secret_key',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005',
  adminBootstrap: {
    email: process.env.ADMIN_EMAIL || 'admin@logisphere.local',
    password: process.env.ADMIN_INITIAL_PASSWORD || 'AdminSecurePassword123!',
    fullName: process.env.ADMIN_FULL_NAME || 'Platform Administrator',
  },
};

module.exports = config;
