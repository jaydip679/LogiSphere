const { z } = require('zod');

const simulateRouteSchema = z.object({
  shipmentId: z.string().min(1, 'shipmentId is required'),
  originHubName: z.string().optional(),
  destinationHubName: z.string().optional(),
  waypointsCount: z.number().int().min(3).max(50).optional(),
});

const createMilestoneEventSchema = z.object({
  trackingNumber: z.string().min(3, 'trackingNumber is required'),
  shipmentId: z.string().min(1, 'shipmentId is required'),
  status: z.string().min(2, 'status is required'),
  source: z.enum(['DRIVER', 'SYSTEM', 'SIMULATOR']).optional(),
  location: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  actorId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

module.exports = {
  simulateRouteSchema,
  createMilestoneEventSchema,
};
