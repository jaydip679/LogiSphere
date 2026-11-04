const { z } = require('zod');

const indianPhoneRegex = /^(\+91[-\s]?)?[6789]\d{9}$/;

const loginSchema = z.object({
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

const customerRegistrationSchema = z.object({
  email: z.string().email('Valid email is required').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Full name is required').trim(),
  phone: z.string().regex(indianPhoneRegex, 'Valid 10-digit Indian phone number is required'),
  accountType: z.enum(['INDIVIDUAL', 'BUSINESS']).default('INDIVIDUAL'),
  businessName: z.string().optional(),
  taxIdentifier: z.string().optional(),
});

const companyRegistrationSchema = z.object({
  name: z.string().min(2, 'Company name is required').trim(),
  registrationNumber: z.string().optional(),
  contactEmail: z.string().email('Valid contact email is required').toLowerCase().trim(),
  contactPhone: z.string().regex(indianPhoneRegex, 'Valid Indian phone number is required'),
  serviceAreas: z.array(z.string()).min(1, 'At least one service area hub is required'),
  supportedCategories: z.array(z.string()).default(['PARCEL', 'DOCUMENT', 'CORPORATE']),
  ownerFullName: z.string().min(2, 'Owner full name is required').trim(),
  ownerEmail: z.string().email('Valid owner email is required').toLowerCase().trim(),
  ownerPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  ownerPhone: z.string().regex(indianPhoneRegex, 'Valid Indian phone number is required'),
});

const createStaffSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').trim(),
  email: z.string().email('Valid email is required').toLowerCase().trim(),
  phone: z.string().regex(indianPhoneRegex, 'Valid Indian phone number is required'),
  role: z.enum(['LOGISTICS_MANAGER', 'DISPATCHER', 'DRIVER']),
  licenseNumber: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const reviewCompanySchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    rejectionReason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (
        data.status === 'REJECTED' &&
        (!data.rejectionReason || data.rejectionReason.trim().length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Rejection reason is required when rejecting a company registration',
      path: ['rejectionReason'],
    }
  );

module.exports = {
  loginSchema,
  customerRegistrationSchema,
  companyRegistrationSchema,
  createStaffSchema,
  changePasswordSchema,
  reviewCompanySchema,
};
