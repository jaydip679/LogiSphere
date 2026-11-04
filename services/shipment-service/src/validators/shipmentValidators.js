const { z } = require('zod');

const indianPhoneRegex = /^(\+91[-\s]?)?[6789]\d{9}$/;
const pinCodeRegex = /^[1-9][0-9]{5}$/;

const priceEstimateSchema = z.object({
  pickupPinCode: z.string().regex(pinCodeRegex, 'Valid 6-digit Indian PIN code is required'),
  deliveryPinCode: z.string().regex(pinCodeRegex, 'Valid 6-digit Indian PIN code is required'),
  weightKg: z.number().positive('Weight must be greater than 0'),
  category: z.enum(['DOCUMENT', 'PARCEL', 'CORPORATE', 'BULK']).default('PARCEL'),
});

const createShipmentSchema = z.object({
  senderName: z.string().min(2, 'Sender name is required').trim(),
  senderPhone: z.string().regex(indianPhoneRegex, 'Valid Indian phone number is required'),
  pickupAddress: z.string().min(5, 'Pickup address is required').trim(),
  pickupCity: z.string().min(2, 'Pickup city is required').trim(),
  pickupState: z.string().min(2, 'Pickup state is required').trim(),
  pickupPinCode: z.string().regex(pinCodeRegex, 'Valid 6-digit Indian PIN code is required'),

  recipientName: z.string().min(2, 'Recipient name is required').trim(),
  recipientPhone: z.string().regex(indianPhoneRegex, 'Valid Indian phone number is required'),
  deliveryAddress: z.string().min(5, 'Delivery address is required').trim(),
  deliveryCity: z.string().min(2, 'Delivery city is required').trim(),
  deliveryState: z.string().min(2, 'Delivery state is required').trim(),
  deliveryPinCode: z.string().regex(pinCodeRegex, 'Valid 6-digit Indian PIN code is required'),

  category: z.enum(['DOCUMENT', 'PARCEL', 'CORPORATE', 'BULK']).default('PARCEL'),
  packageDescription: z.string().min(3, 'Package description is required').trim(),
  weightKg: z.number().positive('Weight must be positive'),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
});

const quoteSubmissionSchema = z.object({
  amountPaise: z.number().int().positive('Quote amount must be a positive integer in paise'),
  notes: z.string().optional(),
});

const assignDispatchSchema = z.object({
  driverId: z.string().uuid('Valid driver UUID is required'),
  vehicleId: z.string().uuid('Valid vehicle UUID is required'),
});

const milestoneTransitionSchema = z
  .object({
    status: z.enum([
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'DELIVERY_FAILED',
      'DELAYED',
      'RESUME_FROM_DELAY',
    ]),
    failureReason: z.string().optional(),
    delayReason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (
        data.status === 'DELIVERY_FAILED' &&
        (!data.failureReason || data.failureReason.trim().length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Failure reason is required when status is DELIVERY_FAILED',
      path: ['failureReason'],
    }
  )
  .refine(
    (data) => {
      if (
        data.status === 'DELAYED' &&
        (!data.delayReason || data.delayReason.trim().length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Delay reason is required when status is DELAYED',
      path: ['delayReason'],
    }
  );

const failureDispositionSchema = z.object({
  action: z.enum(['RE_ATTEMPT', 'INITIATE_RETURN']),
  notes: z.string().optional(),
});

module.exports = {
  priceEstimateSchema,
  createShipmentSchema,
  quoteSubmissionSchema,
  assignDispatchSchema,
  milestoneTransitionSchema,
  failureDispositionSchema,
};
