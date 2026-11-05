const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const organizationRepository = require('../repositories/organizationRepository');
const tokenRepository = require('../repositories/tokenRepository');
const auditRepository = require('../repositories/auditRepository');
const otpService = require('./otpService');
const { hashPassword } = require('../utils/passwordUtils');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');
const { ConflictError, NotFoundError, ValidationError } = require('@logisphere/common-utils');
const prisma = require('../database/prisma');

class OrganizationService {
  async registerCompany(data) {
    const existingUser = await userRepository.findByEmail(data.ownerEmail);
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        throw new ConflictError(
          'An account with the owner email already exists',
          'OWNER_EMAIL_ALREADY_EXISTS'
        );
      }
    }

    const passwordHash = await hashPassword(data.ownerPassword);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization in PENDING_REVIEW
      const org = await organizationRepository.createOrganization(
        {
          name: data.name,
          registrationNumber: data.registrationNumber || null,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone || '',
          serviceAreas: data.serviceAreas,
          supportedCategories: data.supportedCategories,
          status: 'PENDING_REVIEW',
        },
        tx
      );

      // 2. Create Owner User (isEmailVerified starts as false)
      const owner = await userRepository.createUser(
        {
          email: data.ownerEmail,
          passwordHash,
          fullName: data.ownerFullName,
          phone: data.ownerPhone || null,
          role: 'COMPANY_OWNER',
          isEmailVerified: false,
          isActive: true,
        },
        tx
      );

      // 3. Link via Membership
      await userRepository.addMembership(owner.id, org.id, 'COMPANY_OWNER', tx);

      // 4. Audit Log
      await auditRepository.recordAction(
        {
          actorId: owner.id,
          action: 'ORGANIZATION_REGISTERED',
          targetType: 'Organization',
          targetId: org.id,
          organizationId: org.id,
          metadata: { name: org.name, serviceAreas: org.serviceAreas },
        },
        tx
      );

      return { org, owner };
    });

    // 5. Generate and dispatch secure 6-digit OTP to owner
    await otpService.generateAndSendOtp(result.owner.email, 'REGISTRATION', result.owner.fullName);

    return {
      organization: {
        id: result.org.id,
        name: result.org.name,
        status: result.org.status,
        serviceAreas: result.org.serviceAreas,
      },
      owner: {
        id: result.owner.id,
        email: result.owner.email,
        fullName: result.owner.fullName,
        role: result.owner.role,
        isEmailVerified: false,
      },
      requiresVerification: true,
      message:
        'Company registration initiated. A 6-digit verification code has been sent to your email to verify account ownership.',
    };
  }

  async reviewOrganization(adminId, organizationId, status, rejectionReason = null) {
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    if (org.status !== 'PENDING_REVIEW') {
      throw new ValidationError(`Organization status is already ${org.status}`);
    }

    const updatedOrg = await prisma.$transaction(async (tx) => {
      const updated = await organizationRepository.updateStatus(
        organizationId,
        status,
        {
          rejectionReason,
          approvedBy: adminId,
        },
        tx
      );

      await auditRepository.recordAction(
        {
          actorId: adminId,
          action: status === 'APPROVED' ? 'ORGANIZATION_APPROVED' : 'ORGANIZATION_REJECTED',
          targetType: 'Organization',
          targetId: organizationId,
          organizationId,
          metadata: { reason: rejectionReason },
        },
        tx
      );

      return updated;
    });

    return updatedOrg;
  }

  async addStaffMember(adminOrManagerId, organizationId, staffData) {
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    if (org.status !== 'APPROVED') {
      throw new ValidationError('Cannot add staff to an organization that is not approved');
    }

    const existingUser = await userRepository.findByEmail(staffData.email);
    if (existingUser) {
      throw new ConflictError(
        'A user with this email already exists',
        'STAFF_EMAIL_ALREADY_EXISTS'
      );
    }

    // Generate secure temporary password
    const temporaryPassword = `Tmp_${crypto.randomBytes(6).toString('hex')}!1`;
    const passwordHash = await hashPassword(temporaryPassword);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await userRepository.createUser(
        {
          email: staffData.email,
          passwordHash,
          fullName: staffData.fullName,
          phone: staffData.phone || null,
          role: staffData.role,
          mustChangePassword: true,
          isEmailVerified: true, // Company provisioned staff are pre-verified
          isActive: true,
        },
        tx
      );

      await userRepository.addMembership(newUser.id, organizationId, staffData.role, tx);

      await auditRepository.recordAction(
        {
          actorId: adminOrManagerId,
          action: 'STAFF_MEMBER_CREATED',
          targetType: 'User',
          targetId: newUser.id,
          organizationId,
          metadata: { role: staffData.role, licenseNumber: staffData.licenseNumber || null },
        },
        tx
      );

      return newUser;
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      temporaryCredentials: {
        email: user.email,
        temporaryPassword,
        note: 'User must change this temporary password upon initial login.',
      },
    };
  }

  async getPendingOrganizations(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return organizationRepository.findPending(skip, limit);
  }

  async getAllOrganizations(page = 1, limit = 50, status = null) {
    const skip = (page - 1) * limit;
    return organizationRepository.findAll(skip, limit, status);
  }

  async getOrganizationDetails(orgId) {
    const org = await organizationRepository.findById(orgId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    const members = await userRepository.getOrganizationMembers(orgId);
    return { organization: org, members };
  }

  async getApprovedCoverage(hub) {
    return organizationRepository.findApprovedCoverage(hub);
  }
}

module.exports = new OrganizationService();
