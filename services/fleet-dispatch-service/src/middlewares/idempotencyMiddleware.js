const crypto = require('crypto');
const idempotencyRepository = require('../repositories/idempotencyRepository');
const { ConflictError } = require('@logisphere/common-utils');

const idempotency = (operationName) => {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) {
      return next();
    }

    const actorScopeId = req.user ? req.user.organizationId || req.user.id : 'anonymous';
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body || {}))
      .digest('hex');

    try {
      const existing = await idempotencyRepository.findRecord(actorScopeId, operationName, key);

      if (existing) {
        if (existing.responseBody && existing.responseBody.__hash !== requestHash) {
          throw new ConflictError(
            'Idempotency key has already been used with a different request payload',
            'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'
          );
        }

        const cleanBody = { ...existing.responseBody };
        delete cleanBody.__hash;
        return res.status(existing.responseStatus).json(cleanBody);
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          idempotencyRepository
            .saveRecord({
              actorScopeId,
              operation: operationName,
              key,
              requestHash,
              responseStatus: res.statusCode,
              responseBody: body,
            })
            .catch((err) => {
              console.warn(
                `[IDEMPOTENCY WARNING] Failed to persist idempotency record: ${err.message}`
              );
            });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { idempotency };
