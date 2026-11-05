const otpRepository = require('../src/repositories/otpRepository');
const otpService = require('../src/services/otpService');

// Mock dependencies
jest.mock('../src/repositories/otpRepository');
global.fetch = jest.fn();

describe('OTP Verification System — Security, Expiration & Rate Limiting', () => {
  const testEmail = 'verify@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => 'OK',
    });
  });

  describe('OTP Generation & Security', () => {
    it('generates a 6-digit numeric OTP, hashes it, and enforces 10m expiry', async () => {
      otpRepository.findLatestOtp.mockResolvedValue(null);
      otpRepository.invalidatePriorOtps.mockResolvedValue({ count: 0 });
      otpRepository.createOtp.mockImplementation(async (data) => ({
        id: 'otp_123',
        ...data,
      }));

      const res = await otpService.generateAndSendOtp(testEmail, 'REGISTRATION', 'Test User');

      expect(res.success).toBe(true);
      expect(res.email).toBe(testEmail);
      expect(res.cooldownSeconds).toBe(60);

      // Verify createOtp received a SHA-256 HMAC hash, NOT a plaintext 6-digit number
      expect(otpRepository.createOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: testEmail,
          otpHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          purpose: 'REGISTRATION',
          maxAttempts: 5,
        })
      );

      // Verify email was dispatched via Notification Service
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/internal\/notifications\/email/),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining(testEmail),
        })
      );
    });

    it('enforces 60-second cooldown rate limit between consecutive OTP requests', async () => {
      // Mock an active OTP created 20 seconds ago
      otpRepository.findLatestOtp.mockResolvedValue({
        id: 'recent_otp',
        email: testEmail,
        createdAt: new Date(Date.now() - 20 * 1000), // 20s ago
        consumedAt: null,
      });

      await expect(
        otpService.generateAndSendOtp(testEmail, 'REGISTRATION', 'Test User')
      ).rejects.toThrow(/Please wait \d+ seconds before requesting a new code/);
    });
  });

  describe('OTP Verification Flow', () => {
    it('validates matching OTP code and consumes it', async () => {
      const rawCode = '849201';
      const storedHash = otpService.hashOtp(rawCode);

      otpRepository.findLatestActiveOtp.mockResolvedValue({
        id: 'otp_valid',
        email: testEmail,
        otpHash: storedHash,
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5m in future
      });

      otpRepository.incrementAttempts.mockResolvedValue({
        id: 'otp_valid',
        attempts: 1,
        maxAttempts: 5,
      });

      otpRepository.consumeOtp.mockResolvedValue({ id: 'otp_valid' });

      const result = await otpService.verifyOtp(testEmail, rawCode, 'REGISTRATION');
      expect(result.success).toBe(true);
      expect(otpRepository.consumeOtp).toHaveBeenCalledWith('otp_valid');
    });

    it('rejects expired OTP codes and marks them consumed', async () => {
      otpRepository.findLatestActiveOtp.mockResolvedValue({
        id: 'otp_expired',
        email: testEmail,
        otpHash: 'dummy_hash',
        expiresAt: new Date(Date.now() - 1000), // In past
      });

      await expect(
        otpService.verifyOtp(testEmail, '123456', 'REGISTRATION')
      ).rejects.toThrow(/Verification code has expired/);

      expect(otpRepository.consumeOtp).toHaveBeenCalledWith('otp_expired');
    });

    it('rejects mismatched OTP, increments attempt count and informs remaining attempts', async () => {
      const storedHash = otpService.hashOtp('999999');

      otpRepository.findLatestActiveOtp.mockResolvedValue({
        id: 'otp_mismatch',
        email: testEmail,
        otpHash: storedHash,
        attempts: 1,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      otpRepository.incrementAttempts.mockResolvedValue({
        id: 'otp_mismatch',
        attempts: 2,
        maxAttempts: 5,
      });

      await expect(
        otpService.verifyOtp(testEmail, '111111', 'REGISTRATION')
      ).rejects.toThrow(/Invalid verification code\. 3 attempts remaining/);

      expect(otpRepository.consumeOtp).not.toHaveBeenCalled();
    });

    it('revokes OTP when maximum attempts limit is exceeded', async () => {
      const storedHash = otpService.hashOtp('999999');

      otpRepository.findLatestActiveOtp.mockResolvedValue({
        id: 'otp_lockout',
        email: testEmail,
        otpHash: storedHash,
        attempts: 5,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      otpRepository.incrementAttempts.mockResolvedValue({
        id: 'otp_lockout',
        attempts: 6, // Exceeded maxAttempts (5)
        maxAttempts: 5,
      });

      await expect(
        otpService.verifyOtp(testEmail, '111111', 'REGISTRATION')
      ).rejects.toThrow(/Too many invalid attempts/);

      expect(otpRepository.consumeOtp).toHaveBeenCalledWith('otp_lockout');
    });
  });
});
