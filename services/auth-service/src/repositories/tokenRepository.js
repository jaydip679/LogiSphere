const prisma = require('../database/prisma');

class TokenRepository {
  async saveRefreshToken(userId, tokenHash, expiresAt, tx = prisma) {
    return tx.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findTokenByHash(tokenHash) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async revokeToken(tokenHash, replacedByTokenHash = null, tx = prisma) {
    return tx.refreshToken.update({
      where: { tokenHash },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        replacedByTokenHash,
      },
    });
  }

  async revokeAllUserTokens(userId, tx = prisma) {
    return tx.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }
}

module.exports = new TokenRepository();
