const prisma = require('../database/prisma');

class OtpRepository {
  async createOtp({ email, otpHash, purpose = 'REGISTRATION', expiresAt, maxAttempts = 5 }, tx = prisma) {
    return tx.emailOtp.create({
      data: {
        email: email.toLowerCase().trim(),
        otpHash,
        purpose,
        expiresAt,
        maxAttempts,
      },
    });
  }

  async findLatestActiveOtp(email, purpose = 'REGISTRATION', tx = prisma) {
    const normalizedEmail = email.toLowerCase().trim();
    return tx.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLatestOtp(email, purpose = 'REGISTRATION', tx = prisma) {
    const normalizedEmail = email.toLowerCase().trim();
    return tx.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async incrementAttempts(id, tx = prisma) {
    return tx.emailOtp.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async consumeOtp(id, tx = prisma) {
    return tx.emailOtp.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  async invalidatePriorOtps(email, purpose = 'REGISTRATION', tx = prisma) {
    const normalizedEmail = email.toLowerCase().trim();
    return tx.emailOtp.updateMany({
      where: {
        email: normalizedEmail,
        purpose,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });
  }
}

module.exports = new OtpRepository();
