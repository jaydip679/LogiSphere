const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const resolveKeyPath = (envPath, defaultRelPath) => {
  if (!envPath) {
    const cwdDefault = path.resolve(process.cwd(), 'shared/keys/jwt-public.key');
    if (fs.existsSync(cwdDefault)) return cwdDefault;
    return path.resolve(__dirname, defaultRelPath);
  }
  if (path.isAbsolute(envPath)) return envPath;
  if (fs.existsSync(path.resolve(process.cwd(), envPath))) {
    return path.resolve(process.cwd(), envPath);
  }
  const fromRelative = path.resolve(__dirname, '../../../', envPath);
  if (fs.existsSync(fromRelative)) return fromRelative;
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

const parseOrigins = (raw) => {
  if (!raw) return ['http://localhost:3000', 'http://localhost:5173'];
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
};

// Trusted Vercel preview domain pattern for this project (matches logisphere*.vercel.app, e.g. logisphereapp.vercel.app)
const previewPattern = process.env.VERCEL_PROJECT_PREVIEW_PATTERN
  ? new RegExp(process.env.VERCEL_PROJECT_PREVIEW_PATTERN)
  : /^https:\/\/logisphere[a-zA-Z0-9_-]*\.vercel\.app$/;

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  corsPreviewPattern: previewPattern,
  jwt: {
    publicKey,
    algorithm: 'RS256',
  },
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:5001',
    shipment: process.env.SHIPMENT_SERVICE_URL || 'http://127.0.0.1:5002',
    fleet: process.env.FLEET_SERVICE_URL || 'http://127.0.0.1:5003',
    tracking: process.env.TRACKING_SERVICE_URL || 'http://127.0.0.1:5004',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:5005',
  },
};

module.exports = config;
