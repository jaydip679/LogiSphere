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

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5005,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/logisphere?schema=notification',
  jwt: {
    publicKey,
    algorithm: 'RS256',
  },
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || 'dev_internal_secret_key',
  sqs: {
    region: process.env.AWS_REGION || 'ap-south-1',
    endpoint: process.env.SQS_ENDPOINT || 'http://localhost:4566',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    notificationQueueUrl:
      process.env.NOTIFICATION_QUEUE_URL ||
      'http://localhost:4566/000000000000/logisphere-notification-queue',
    notificationDlqUrl:
      process.env.NOTIFICATION_DLQ_URL ||
      'http://localhost:4566/000000000000/logisphere-notification-dlq',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'LogiSphere Notifications <notifications@logisphere.local>',
  },
};

module.exports = config;
