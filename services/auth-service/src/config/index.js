const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH
  ? path.resolve(__dirname, '../../', process.env.JWT_PRIVATE_KEY_PATH)
  : path.resolve(__dirname, '../../secrets/jwt-private.key');

const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH
  ? path.resolve(__dirname, '../../', process.env.JWT_PUBLIC_KEY_PATH)
  : path.resolve(__dirname, '../../../../shared/keys/jwt-public.key');

let privateKey = null;
let publicKey = null;

try {
  if (fs.existsSync(privateKeyPath)) {
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  }
  if (fs.existsSync(publicKeyPath)) {
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
  adminBootstrap: {
    email: process.env.ADMIN_EMAIL || 'admin@logisphere.local',
    password: process.env.ADMIN_INITIAL_PASSWORD || 'AdminSecurePassword123!',
    fullName: process.env.ADMIN_FULL_NAME || 'Platform Administrator',
  },
};

module.exports = config;
