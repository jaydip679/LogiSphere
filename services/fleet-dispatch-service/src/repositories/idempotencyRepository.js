const prisma = require('../database/prisma');

class IdempotencyRepository {
  async findRecord(actorScopeId, operation, key) {
    const record = await prisma.idempotencyRecord.findUnique({
      where: {
        actorScopeId_operation_key: {
          actorScopeId,
          operation,
          key,
        },
      },
    });

    if (!record) return null;
    if (new Date() > new Date(record.expiresAt)) {
      return null;
    }
    return record;
  }

  async saveRecord({ actorScopeId, operation, key, requestHash, responseStatus, responseBody }) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hr TTL
    const storedBody = {
      ...responseBody,
      __hash: requestHash,
    };

    return prisma.idempotencyRecord.upsert({
      where: {
        actorScopeId_operation_key: {
          actorScopeId,
          operation,
          key,
        },
      },
      update: {
        responseStatus,
        responseBody: storedBody,
        expiresAt,
      },
      create: {
        actorScopeId,
        operation,
        key,
        responseStatus,
        responseBody: storedBody,
        expiresAt,
      },
    });
  }
}

module.exports = new IdempotencyRepository();
