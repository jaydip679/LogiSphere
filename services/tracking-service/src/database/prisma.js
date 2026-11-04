const { PrismaClient } = require('@prisma/client');
const config = require('../config');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
  log: config.env === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
