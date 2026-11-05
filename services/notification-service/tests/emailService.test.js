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
    emailService.providerType = 'MOCK';
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

  describe('Gmail Provider Integration', () => {
    it('dispatches through GmailProvider when in GMAIL mode', async () => {
      const mockSend = jest.fn().mockResolvedValue({ success: true, messageId: 'msg_abc123' });
      const origProvider = emailService.gmailProvider;
      const origType = emailService.providerType;

      emailService.providerType = 'GMAIL';
      emailService.gmailProvider = { send: mockSend };

      try {
        const outcome = await emailService.sendEmail({
          to: 'customer@realworld.com',
          subject: 'Shipment Assigned',
          text: 'Driver is on the way',
        });

        expect(outcome.success).toBe(true);
        expect(outcome.messageId).toBe('msg_abc123');
        expect(outcome.provider).toBe('GMAIL');
        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'customer@realworld.com',
            subject: 'Shipment Assigned',
          })
        );
        expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'SENT',
              recipient: 'customer@realworld.com',
            }),
          })
        );
      } finally {
        emailService.providerType = origType;
        emailService.gmailProvider = origProvider;
      }
    });

    it('catches Gmail dispatch error and records failure in log without crashing', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('Gmail quota limit exceeded'));
      const origProvider = emailService.gmailProvider;
      const origType = emailService.providerType;

      emailService.providerType = 'GMAIL';
      emailService.gmailProvider = { send: mockSend };

      try {
        const outcome = await emailService.sendEmail({
          to: 'failed@realworld.com',
          subject: 'Shipment Assigned',
          text: 'Driver is on the way',
        });

        expect(outcome.success).toBe(false);
        expect(outcome.error).toBe('Gmail quota limit exceeded');
        expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'FAILED',
              recipient: 'failed@realworld.com',
              error: 'Gmail quota limit exceeded',
            }),
          })
        );
      } finally {
        emailService.providerType = origType;
        emailService.gmailProvider = origProvider;
      }
    });
  });
});
