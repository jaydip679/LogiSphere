const prisma = require('../database/prisma');

class AuditRepository {
  async recordAction(
    { actorId, action, targetType, targetId, organizationId = null, metadata = null },
    tx = prisma
  ) {
    return tx.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        organizationId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }
}

module.exports = new AuditRepository();
