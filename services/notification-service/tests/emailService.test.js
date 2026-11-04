// Mock Prisma
const mockPrisma = {
  notificationLog: {
    create: jest.fn().mockResolvedValue({ id: 'log_1' }),
  },
};

jest.mock('../src/database/prisma', () => mockPrisma);

const emailService = require('../src/services/emailService');

describe('Email Service — Failsafe Transport & Delivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delivers email in development mock mode and logs outcome', async () => {
    const outcome = await emailService.sendEmail({
      to: 'customer@logisphere.local',
      subject: 'Shipment Created',
      text: 'Your shipment TRK-001 has been registered.',
    });

    expect(outcome.success).toBe(true);
    expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: 'EMAIL',
          recipient: 'customer@logisphere.local',
          status: 'SENT',
          subject: 'Shipment Created',
        }),
      })
    );
  });

  it('rejects email dispatch when recipient is missing', async () => {
    const outcome = await emailService.sendEmail({
      to: '',
      subject: 'Missing Recipient',
    });

    expect(outcome.success).toBe(false);
    expect(outcome.reason).toBe('MISSING_FIELDS');
  });

  it('fails safely without throwing when transport errors occur', async () => {
    mockPrisma.notificationLog.create.mockRejectedValueOnce(new Error('Simulated database error'));

    const outcome = await emailService.sendEmail({
      to: 'error@logisphere.local',
      subject: 'Error Trigger',
      text: 'Sample content',
    });

    // Must never crash the caller
    expect(outcome.success).toBe(false);
  });
});
