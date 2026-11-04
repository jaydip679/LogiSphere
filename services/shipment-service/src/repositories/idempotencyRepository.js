const prisma = require('../database/prisma');

class IdempotencyRepository {
  async findRecord(actorScopeId, operation, key) {
    return prisma.idempotencyRecord.findUnique({
      where: {
        actorScopeId_operation_key: {
          actorScopeId,
          operation,
          key,
        },
      },
    });
  }

  async saveRecord({
    actorScopeId,
    operation,
    key,
    requestHash,
    responseStatus,
    responseBody,
    ttlHours = 24,
  }) {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    return prisma.idempotencyRecord.create({
      data: {
        actorScopeId,
        operation,
        key,
        requestHash,
        responseStatus,
        responseBody,
        expiresAt,
      },
    });
  }
}

module.exports = new IdempotencyRepository();
