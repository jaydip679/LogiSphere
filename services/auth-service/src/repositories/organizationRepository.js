const prisma = require('../database/prisma');

class OrganizationRepository {
  async findById(id) {
    return prisma.organization.findUnique({
      where: { id },
    });
  }

  async createOrganization(orgData, tx = prisma) {
    return tx.organization.create({
      data: orgData,
    });
  }

  async updateStatus(id, status, details = {}, tx = prisma) {
    return tx.organization.update({
      where: { id },
      data: {
        status,
        rejectionReason: details.rejectionReason || null,
        approvedBy: details.approvedBy || null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
      },
    });
  }

  async findPending(skip = 0, take = 20) {
    const [total, items] = await Promise.all([
      prisma.organization.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.organization.findMany({
        where: { status: 'PENDING_REVIEW' },
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: {
          memberships: {
            where: { role: 'COMPANY_OWNER' },
            include: {
              user: {
                select: { id: true, email: true, fullName: true, phone: true },
              },
            },
          },
        },
      }),
    ]);

    return { total, items };
  }

  async findApprovedCoverage(hub) {
    // Returns approved organizations that include the specified hub in serviceAreas
    const approvedOrgs = await prisma.organization.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        name: true,
        serviceAreas: true,
        supportedCategories: true,
      },
    });

    if (!hub) return approvedOrgs;

    return approvedOrgs.filter((org) => {
      const areas = Array.isArray(org.serviceAreas) ? org.serviceAreas : [];
      return areas.some((a) => a.toLowerCase() === hub.toLowerCase());
    });
  }
}

module.exports = new OrganizationRepository();
