const { z } = require('zod');

const createInAppNotificationSchema = z.object({
  recipientId: z.string().min(1, 'recipientId is required'),
  organizationId: z.string().optional().nullable(),
  title: z.string().min(2).max(120),
  message: z.string().min(2).max(1000),
  category: z.string().default('GENERAL'),
  metadata: z.record(z.any()).optional().nullable(),
});

const sendEmailSchema = z.object({
  to: z.string().email('Invalid email address format'),
  subject: z.string().min(2).max(200),
  text: z.string().optional(),
  html: z.string().optional(),
});

module.exports = {
  createInAppNotificationSchema,
  sendEmailSchema,
};
