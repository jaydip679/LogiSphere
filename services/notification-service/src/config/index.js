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
  port: parseInt(process.env.PORT_NOTIFICATION || process.env.PORT, 10) || 5005,
  host: process.env.HOST_NOTIFICATION || process.env.HOST || '127.0.0.1',
  databaseUrl: getDatabaseUrl(
    'notification',
    'postgresql://postgres:postgres@localhost:5432/logisphere?schema=notification'
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
    notificationQueueName: process.env.NOTIFICATION_QUEUE_NAME || 'notification-queue',
    notificationQueueUrl: process.env.NOTIFICATION_QUEUE_URL || undefined,
    notificationDlqName: process.env.NOTIFICATION_DLQ_NAME || 'notification-dlq',
    notificationDlqUrl: process.env.NOTIFICATION_DLQ_URL || undefined,
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'LogiSphere Notifications <notifications@logisphere.local>',
  },
  gmail: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
    userEmail: process.env.GMAIL_USER_EMAIL || '',
  },
  email: {
    provider: (process.env.EMAIL_PROVIDER || 'auto').toLowerCase(),
    from:
      process.env.EMAIL_FROM ||
      process.env.SMTP_FROM ||
      (process.env.GMAIL_USER_EMAIL
        ? `LogiSphere Notifications <${process.env.GMAIL_USER_EMAIL}>`
        : 'LogiSphere Notifications <notifications@logisphere.local>'),
  },
};

module.exports = config;
