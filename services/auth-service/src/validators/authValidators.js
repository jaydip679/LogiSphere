const { z } = require('zod');

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
  phone: z.string().optional().default(''),
  accountType: z.enum(['INDIVIDUAL', 'BUSINESS']).default('INDIVIDUAL'),
  businessName: z.string().optional(),
  taxIdentifier: z.string().optional(),
});

const companyRegistrationSchema = z.object({
  name: z.string().min(2, 'Company name is required').trim(),
  registrationNumber: z.string().optional(),
  contactEmail: z.string().email('Valid contact email is required').toLowerCase().trim(),
  contactPhone: z.string().optional().default(''),
  serviceAreas: z.array(z.string()).min(1, 'At least one service area hub is required'),
  supportedCategories: z.array(z.string()).default(['PARCEL', 'DOCUMENT', 'CORPORATE']),
  ownerFullName: z.string().min(2, 'Owner full name is required').trim(),
  ownerEmail: z.string().email('Valid owner email is required').toLowerCase().trim(),
  ownerPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  ownerPhone: z.string().optional().default(''),
});

const createStaffSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').trim(),
  email: z.string().email('Valid email is required').toLowerCase().trim(),
  phone: z.string().optional().default(''),
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

const verifyOtpSchema = z.object({
  email: z.string().email('Valid email is required').toLowerCase().trim(),
  otp: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits').trim(),
  purpose: z.enum(['REGISTRATION', 'PASSWORD_RESET', 'STAFF_INVITATION']).default('REGISTRATION'),
});

const resendOtpSchema = z.object({
  email: z.string().email('Valid email is required').toLowerCase().trim(),
  purpose: z.enum(['REGISTRATION', 'PASSWORD_RESET', 'STAFF_INVITATION']).default('REGISTRATION'),
});

const activateStaffSchema = z.object({
  email: z.string().email('Valid email is required').toLowerCase().trim(),
  otp: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits').trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email('Valid email is required').toLowerCase().trim(),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Valid email is required').toLowerCase().trim(),
  otp: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits').trim(),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

module.exports = {
  loginSchema,
  customerRegistrationSchema,
  companyRegistrationSchema,
  createStaffSchema,
  changePasswordSchema,
  reviewCompanySchema,
  verifyOtpSchema,
  resendOtpSchema,
  activateStaffSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
};
