const winston = require('winston');

const sanitizeSensitiveFields = winston.format((info) => {
  const SENSITIVE_KEYS = [
    'password',
    'token',
    'authorization',
    'secret',
    'refreshToken',
    'accessToken',
    'key',
  ];

  const maskObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const copy = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key of Object.keys(copy)) {
      if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        copy[key] = '***MASKED***';
      } else if (typeof copy[key] === 'object') {
        copy[key] = maskObject(copy[key]);
      }
    }
    return copy;
  };

  return maskObject(info);
});

const createLogger = (serviceName = 'service') => {
  const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

  return winston.createLogger({
    level,
    defaultMeta: { service: serviceName },
    format: winston.format.combine(
      sanitizeSensitiveFields(),
      winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
      winston.format.errors({ stack: true }),
      process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, service, correlationId, stack, ...meta }) => {
                const corr = correlationId ? ` [${correlationId}]` : '';
                const logMeta = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} [${service}]${corr} ${level}: ${stack || message}${logMeta}`;
              }
            )
          )
    ),
    transports: [new winston.transports.Console()],
  });
};

module.exports = {
  createLogger,
};
