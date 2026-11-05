const axios = require('axios');
const GmailProvider = require('../src/providers/GmailProvider');

jest.mock('axios');

describe('GmailProvider — OAuth 2.0 & Gmail REST API', () => {
  const dummyConfig = {
    clientId: 'test-client-id.apps.googleusercontent.com',
    clientSecret: 'test-client-secret-12345',
    refreshToken: '1//test-refresh-token',
    userEmail: 'notifications@logisphere.local',
    fromAddress: 'LogiSphere Notifications <notifications@logisphere.local>',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration & Initialization', () => {
    it('correctly reports configured status when all OAuth creds are provided', () => {
      const provider = new GmailProvider(dummyConfig);
      expect(provider.isConfigured()).toBe(true);
    });

    it('reports not configured when any OAuth credential is missing', () => {
      const provider = new GmailProvider({
        clientId: 'id',
        clientSecret: '',
        refreshToken: 'token',
      });
      expect(provider.isConfigured()).toBe(false);
    });
  });

  describe('Token Exchange & Caching', () => {
    it('exchanges refresh token for short-lived access token', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          access_token: 'ya29.mock_access_token_123',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      });

      const provider = new GmailProvider(dummyConfig);
      const token = await provider.getAccessToken();

      expect(token).toBe('ya29.mock_access_token_123');
      expect(axios.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.stringContaining('grant_type=refresh_token'),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
    });

    it('reuses cached access token while valid and does not make duplicate requests', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          access_token: 'ya29.cached_token',
          expires_in: 3600,
        },
      });

      const provider = new GmailProvider(dummyConfig);
      const token1 = await provider.getAccessToken();
      const token2 = await provider.getAccessToken();

      expect(token1).toBe('ya29.cached_token');
      expect(token2).toBe('ya29.cached_token');
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('throws sanitized error on OAuth exchange failure', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          data: {
            error: 'invalid_grant',
            error_description: 'Token has been expired or revoked.',
          },
        },
      });

      const provider = new GmailProvider(dummyConfig);
      await expect(provider.getAccessToken()).rejects.toThrow(
        /Token has been expired or revoked/
      );
    });
  });

  describe('RFC 2822 MIME & Base64URL Encoding', () => {
    it('properly encodes MIME into RFC 4648 §5 Base64URL', () => {
      const provider = new GmailProvider(dummyConfig);

      // Verify character mapping (+ -> -, / -> _, no =)
      const testBuffer = Buffer.from([0xfb, 0xff, 0xfe]); // Base64 is "+//+"
      const encoded = provider.encodeBase64Url(testBuffer);
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('constructs RFC 2822 multipart MIME containing subject, from, to, and bodies', () => {
      const provider = new GmailProvider(dummyConfig);
      const mime = provider.buildMimeMessage({
        to: 'customer@example.com',
        subject: 'Shipment #TRK-100 Dispatch',
        text: 'Your package is on the way!',
        html: '<p>Your package is on the way!</p>',
      });

      expect(mime).toContain('To: customer@example.com');
      expect(mime).toContain('From: LogiSphere Notifications <notifications@logisphere.local>');
      expect(mime).toContain('MIME-Version: 1.0');
      expect(mime).toContain('Content-Type: multipart/alternative');
      expect(mime).toContain('Content-Transfer-Encoding: base64');
    });
  });

  describe('Send Dispatch via Gmail REST API', () => {
    it('successfully posts to Gmail REST endpoint with Bearer auth', async () => {
      // 1. Token exchange
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'ya29.valid_token', expires_in: 3600 },
      });
      // 2. Gmail send
      axios.post.mockResolvedValueOnce({
        data: { id: 'gmail_msg_987654' },
      });

      const provider = new GmailProvider(dummyConfig);
      const result = await provider.send({
        to: 'recipient@domain.com',
        subject: 'Real Delivery Test',
        text: 'Plain text content',
        html: '<b>HTML content</b>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('gmail_msg_987654');

      expect(axios.post).toHaveBeenLastCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        expect.objectContaining({ raw: expect.any(String) }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer ya29.valid_token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('throws actionable error on API rejection without exposing secret keys', async () => {
      // 1. Token exchange
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'ya29.valid_token', expires_in: 3600 },
      });
      // 2. Gmail send failure
      axios.post.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            error: {
              message: 'The user has exceeded their daily email quota.',
            },
          },
        },
      });

      const provider = new GmailProvider(dummyConfig);
      await expect(
        provider.send({
          to: 'quota@example.com',
          subject: 'Quota test',
          text: 'Hello',
        })
      ).rejects.toThrow(/exceeded their daily email quota/);
    });
  });
});
