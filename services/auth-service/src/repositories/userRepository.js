const prisma = require('../database/prisma');

class UserRepository {
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: true },
        },
      },
    });
  }

  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: true },
        },
      },
    });
  }

  async createUser(userData, tx = prisma) {
    return tx.user.create({
      data: {
        ...userData,
        email: userData.email.toLowerCase(),
      },
    });
  }

  async updateUser(id, updateData, tx = prisma) {
    return tx.user.update({
      where: { id },
      data: updateData,
    });
  }

  async addMembership(userId, organizationId, role, tx = prisma) {
    return tx.membership.create({
      data: {
        userId,
        organizationId,
        role,
      },
    });
  }

  async getOrganizationMembers(organizationId) {
    return prisma.membership.findMany({
      where: { organizationId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });
  }
}

module.exports = new UserRepository();
