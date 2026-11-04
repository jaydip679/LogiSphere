const {
  createDriverSchema,
  updateDriverStatusSchema,
  createVehicleSchema,
  updateVehicleStatusSchema,
  assignDispatchSchema,
  reassignDispatchSchema,
  reserveAssignmentSchema,
} = require('../src/validators/fleetValidators');

describe('Fleet & Dispatch Validators', () => {
  describe('Driver Validators', () => {
    it('accepts valid driver details with Indian phone', () => {
      const data = {
        name: 'Rajesh Kumar',
        phone: '+919876543210',
        licenseNumber: 'DL-0420110012345',
      };
      const result = createDriverSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects invalid phone number', () => {
      const data = {
        name: 'Rajesh Kumar',
        phone: '12345',
        licenseNumber: 'DL-0420110012345',
      };
      const result = createDriverSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('Indian phone number');
    });

    it('rejects short license number', () => {
      const data = {
        name: 'Rajesh Kumar',
        phone: '9876543210',
        licenseNumber: 'DL',
      };
      const result = createDriverSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('at least 5 characters');
    });

    it('validates driver status enum', () => {
      expect(updateDriverStatusSchema.safeParse({ status: 'AVAILABLE' }).success).toBe(true);
      expect(updateDriverStatusSchema.safeParse({ status: 'ON_DUTY' }).success).toBe(true);
      expect(updateDriverStatusSchema.safeParse({ status: 'INACTIVE' }).success).toBe(true);
      expect(updateDriverStatusSchema.safeParse({ status: 'RETIRED' }).success).toBe(false);
    });
  });

  describe('Vehicle Validators', () => {
    it('accepts valid Indian vehicle registration and normalizes spaces/hyphens', () => {
      const data = {
        registrationNumber: 'MH 01 AB 1234',
        vehicleType: 'TRUCK_SMALL',
        capacityKg: 1500,
      };
      const result = createVehicleSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.registrationNumber).toBe('MH01AB1234');
    });

    it('rejects zero or negative capacity payload', () => {
      const data = {
        registrationNumber: 'MH01AB1234',
        vehicleType: 'FOUR_WHEELER',
        capacityKg: 0,
      };
      const result = createVehicleSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('greater than 0');
    });

    it('rejects invalid registration format', () => {
      const data = {
        registrationNumber: 'INVALID_CAR',
        vehicleType: 'FOUR_WHEELER',
        capacityKg: 500,
      };
      const result = createVehicleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('validates vehicle status enum', () => {
      expect(updateVehicleStatusSchema.safeParse({ status: 'AVAILABLE' }).success).toBe(true);
      expect(updateVehicleStatusSchema.safeParse({ status: 'IN_USE' }).success).toBe(true);
      expect(updateVehicleStatusSchema.safeParse({ status: 'MAINTENANCE' }).success).toBe(true);
      expect(updateVehicleStatusSchema.safeParse({ status: 'INACTIVE' }).success).toBe(true);
      expect(updateVehicleStatusSchema.safeParse({ status: 'CRASHED' }).success).toBe(false);
    });
  });

  describe('Dispatch & Reassignment Validators', () => {
    it('validates assignDispatch schema', () => {
      const valid = {
        shipmentId: 'shp_101',
        driverId: '00000000-0000-0000-0000-000000000001',
        vehicleId: '00000000-0000-0000-0000-000000000002',
        shipmentWeightKg: 25.5,
      };
      expect(assignDispatchSchema.safeParse(valid).success).toBe(true);
    });

    it('enforces mandatory reassignment reason of at least 5 characters', () => {
      const invalid = {
        shipmentId: 'shp_101',
        newDriverId: '00000000-0000-0000-0000-000000000001',
        newVehicleId: '00000000-0000-0000-0000-000000000002',
        reassignmentReason: 'Sick', // Only 4 characters
      };
      const result = reassignDispatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('at least 5 characters');
    });

    it('accepts valid reassignment payload', () => {
      const valid = {
        shipmentId: 'shp_101',
        newDriverId: '00000000-0000-0000-0000-000000000001',
        newVehicleId: '00000000-0000-0000-0000-000000000002',
        reassignmentReason: 'Driver reported acute vehicle breakdown en-route to pickup',
      };
      expect(reassignDispatchSchema.safeParse(valid).success).toBe(true);
    });

    it('validates reserveAssignment schema', () => {
      const valid = {
        shipmentId: 'shp_101',
        organizationId: '00000000-0000-0000-0000-000000000001',
      };
      expect(reserveAssignmentSchema.safeParse(valid).success).toBe(true);
    });
  });
});
