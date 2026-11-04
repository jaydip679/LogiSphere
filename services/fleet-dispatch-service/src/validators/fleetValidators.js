const { z } = require('zod');

const indianPhoneRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
const registrationNumberRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/i;

const createDriverSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z
    .string()
    .regex(
      indianPhoneRegex,
      'Invalid Indian phone number format (+91 or 10 digits starting with 6-9)'
    ),
  licenseNumber: z
    .string()
    .min(5, 'Driving license number must be at least 5 characters')
    .max(30)
    .trim(),
  userId: z.string().uuid().optional().nullable(),
});

const updateDriverStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'ON_DUTY', 'INACTIVE']),
});

const createVehicleSchema = z.object({
  registrationNumber: z
    .string()
    .min(5, 'Registration number must be at least 5 characters')
    .max(20)
    .transform((val) => val.toUpperCase().replace(/[\s-]/g, ''))
    .refine((val) => registrationNumberRegex.test(val), {
      message: 'Invalid Indian vehicle registration format (e.g. MH01AB1234, DL1C1234)',
    }),
  vehicleType: z.enum([
    'TWO_WHEELER',
    'THREE_WHEELER',
    'FOUR_WHEELER',
    'TRUCK_SMALL',
    'TRUCK_LARGE',
  ]),
  capacityKg: z
    .number()
    .int('Capacity must be an integer')
    .positive('Vehicle payload capacity must be strictly greater than 0 kg'),
});

const updateVehicleStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE']),
});

const assignDispatchSchema = z.object({
  shipmentId: z.string().min(1, 'Shipment ID is required'),
  driverId: z.string().uuid('Invalid driver ID'),
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  shipmentWeightKg: z.number().positive().optional(),
});

const reassignDispatchSchema = z.object({
  shipmentId: z.string().min(1, 'Shipment ID is required'),
  newDriverId: z.string().uuid('Invalid new driver ID'),
  newVehicleId: z.string().uuid('Invalid new vehicle ID'),
  reassignmentReason: z
    .string()
    .min(5, 'Reassignment reason must be at least 5 characters')
    .max(500),
  shipmentWeightKg: z.number().positive().optional(),
});

const reserveAssignmentSchema = z.object({
  shipmentId: z.string().min(1, 'Shipment ID is required'),
  organizationId: z.string().uuid('Invalid organization ID'),
  driverId: z.string().uuid().optional().nullable(),
  vehicleId: z.string().uuid().optional().nullable(),
});

module.exports = {
  createDriverSchema,
  updateDriverStatusSchema,
  createVehicleSchema,
  updateVehicleStatusSchema,
  assignDispatchSchema,
  reassignDispatchSchema,
  reserveAssignmentSchema,
};
