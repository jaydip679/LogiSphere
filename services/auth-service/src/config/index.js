const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let privateKey = process.env.JWT_PRIVATE_KEY
  ? process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null;
let publicKey = process.env.JWT_PUBLIC_KEY
  ? process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n')
  : null;

const resolveKeyPath = (envPath, defaultRelPath) => {
  if (!envPath) return path.resolve(__dirname, defaultRelPath);
  if (path.isAbsolute(envPath)) return envPath;
  if (fs.existsSync(path.resolve(process.cwd(), envPath))) {
    return path.resolve(process.cwd(), envPath);
  }
  return path.resolve(__dirname, '../../', envPath);
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

const getDatabaseUrl = (schema, fallback) => {
  const isCloudOrForced =
    process.env.TARGET_DB === 'neon' ||
    process.env.USE_NEON === 'true' ||
    process.env.FORCE_BASE_DB_URL === 'true' ||
    (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech'));

  if (!isCloudOrForced) {
    const specific =
      process.env[`DATABASE_URL_${schema.toUpperCase()}`] ||
      (schema === 'app_auth' ? process.env.DATABASE_URL_AUTH : null);
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
  port: parseInt(process.env.PORT_AUTH, 10) || 5001,
  host: process.env.HOST_AUTH || '127.0.0.1',
  databaseUrl: getDatabaseUrl(
    'app_auth',
    'postgresql://postgres:postgres@localhost:5432/logisphere?schema=app_auth'
  ),
  jwt: {
    privateKey,
    publicKey,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiryDays: parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS, 10) || 7,
    algorithm: 'RS256',
  },
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || 'dev_internal_secret_key',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:5005',
  adminBootstrap: {
    email: process.env.ADMIN_EMAIL || 'admin@logisphere.local',
    password: process.env.ADMIN_INITIAL_PASSWORD || 'AdminSecurePassword123!',
    fullName: process.env.ADMIN_FULL_NAME || 'Platform Administrator',
  },
};

module.exports = config;
