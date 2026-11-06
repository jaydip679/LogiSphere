const { ShipmentEventTypes, createDomainEvent, QUEUES, getQueuesForEvent } = require('../src');

describe('Event Contracts', () => {
  it('creates a standard versioned event envelope', () => {
    const event = createDomainEvent({
      eventType: ShipmentEventTypes.SHIPMENT_CREATED,
      aggregateId: 'shp_123',
      correlationId: 'corr_456',
      payload: { origin: 'Mumbai', destination: 'Delhi' },
    });

    expect(event.eventId).toMatch(/^evt_/);
    expect(event.eventType).toBe('ShipmentCreated');
    expect(event.aggregateId).toBe('shp_123');
    expect(event.producer).toBe('shipment-service');
    expect(event.version).toBe('1.0');
    expect(event.correlationId).toBe('corr_456');
    expect(event.payload.origin).toBe('Mumbai');
    expect(event.timestamp).toBeDefined();
  });

  it('correctly maps events to destination queues', () => {
    // Tracking + Notification
    expect(getQueuesForEvent(ShipmentEventTypes.SHIPMENT_CREATED)).toEqual([
      QUEUES.NOTIFICATION,
      QUEUES.TRACKING,
    ]);
    expect(getQueuesForEvent(ShipmentEventTypes.DRIVER_ASSIGNED)).toEqual([
      QUEUES.NOTIFICATION,
      QUEUES.TRACKING,
    ]);
    expect(getQueuesForEvent(ShipmentEventTypes.SHIPMENT_OFFER_ACCEPTED)).toEqual([
      QUEUES.NOTIFICATION,
      QUEUES.TRACKING,
    ]);

    expect(getQueuesForEvent(ShipmentEventTypes.SHIPMENT_PICKED_UP)).toEqual([
      QUEUES.NOTIFICATION,
      QUEUES.TRACKING,
    ]);

    // Notification + Tracking + Fleet
    expect(getQueuesForEvent(ShipmentEventTypes.SHIPMENT_DELIVERED)).toEqual([
      QUEUES.NOTIFICATION,
      QUEUES.TRACKING,
      QUEUES.FLEET,
    ]);
  });
});
