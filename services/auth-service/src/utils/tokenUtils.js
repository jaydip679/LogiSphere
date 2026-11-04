const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('@logisphere/common-utils');

const generateAccessToken = (payload) => {
  if (!config.jwt.privateKey) {
    throw new Error('JWT RSA private key is not configured');
  }

  return jwt.sign(payload, config.jwt.privateKey, {
    algorithm: config.jwt.algorithm,
    expiresIn: config.jwt.accessExpiry,
    issuer: 'logisphere-auth-service',
  });
};

const verifyAccessToken = (token) => {
  if (!config.jwt.publicKey) {
    throw new Error('JWT RSA public key is not configured');
  }

  try {
    return jwt.verify(token, config.jwt.publicKey, {
      algorithms: [config.jwt.algorithm],
      issuer: 'logisphere-auth-service',
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Invalid access token', 'TOKEN_INVALID');
  }
};

const generateRefreshToken = () => {
  const tokenString = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(tokenString);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshExpiryDays);

  return {
    rawToken: tokenString,
    tokenHash,
    expiresAt,
  };
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
};
