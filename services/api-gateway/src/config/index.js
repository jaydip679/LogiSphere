const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH
  ? path.resolve(__dirname, '../../', process.env.JWT_PUBLIC_KEY_PATH)
  : path.resolve(__dirname, '../../../../shared/keys/jwt-public.key');

let publicKey = null;
try {
  if (fs.existsSync(publicKeyPath)) {
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  }
} catch (err) {
  console.warn(`[CONFIG WARNING] Could not load RSA public key: ${err.message}`);
}

const parseOrigins = (raw) => {
  if (!raw) return ['http://localhost:3000', 'http://localhost:5173'];
  return raw.split(',').map((o) => o.trim());
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  jwt: {
    publicKey,
    algorithm: 'RS256',
  },
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
    shipment: process.env.SHIPMENT_SERVICE_URL || 'http://localhost:5002',
    fleet: process.env.FLEET_SERVICE_URL || 'http://localhost:5003',
    tracking: process.env.TRACKING_SERVICE_URL || 'http://localhost:5004',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005',
  },
};

module.exports = config;
