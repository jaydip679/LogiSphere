const axios = require('axios');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('notification-service:gmailProvider');

class GmailProvider {
  /**
   * @param {Object} options
   * @param {string} options.clientId - Google OAuth 2.0 Client ID
   * @param {string} options.clientSecret - Google OAuth 2.0 Client Secret
   * @param {string} options.refreshToken - Google OAuth 2.0 Refresh Token
   * @param {string} [options.userEmail] - Authenticated Gmail address (optional, defaults to 'me')
   * @param {string} [options.fromAddress] - Friendly From header (e.g., 'LogiSphere <notifications@example.com>')
   */
  constructor({ clientId, clientSecret, refreshToken, userEmail, fromAddress } = {}) {
    this.clientId = clientId || '';
    this.clientSecret = clientSecret || '';
    this.refreshToken = refreshToken || '';
    this.userEmail = userEmail || '';
    this.fromAddress =
      fromAddress ||
      (this.userEmail ? `LogiSphere Notifications <${this.userEmail}>` : 'LogiSphere Notifications');

    this.cachedAccessToken = null;
    this.tokenExpiresAt = 0;
  }

  /**
   * Check if required Google OAuth credentials are present
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(this.clientId && this.clientSecret && this.refreshToken);
  }

  /**
   * Exchange Google OAuth 2.0 refresh token for a short-lived access token
   * POST https://oauth2.googleapis.com/token
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    if (!this.isConfigured()) {
      throw new Error(
        'Gmail OAuth 2.0 is not configured: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN is missing.'
      );
    }

    const now = Date.now();
    // Reuse cached token if valid for at least another 60 seconds
    if (this.cachedAccessToken && this.tokenExpiresAt > now + 60000) {
      return this.cachedAccessToken;
    }

    try {
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }).toString();

      const response = await axios.post('https://oauth2.googleapis.com/token', body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      });

      const { access_token, expires_in } = response.data;
      if (!access_token) {
        throw new Error('Google OAuth token endpoint did not return an access_token.');
      }

      this.cachedAccessToken = access_token;
      // expires_in is in seconds (default 3600s / 1 hour)
      const ttlMs = (typeof expires_in === 'number' ? expires_in : 3600) * 1000;
      this.tokenExpiresAt = now + ttlMs;

      logger.info('Successfully refreshed short-lived Google OAuth 2.0 access token');
      return this.cachedAccessToken;
    } catch (error) {
      const errorDetail =
        error.response?.data?.error_description ||
        error.response?.data?.error ||
        error.message;
      logger.error(`Google OAuth 2.0 token exchange failed: ${errorDetail}`);
      throw new Error(`Gmail OAuth token exchange failed: ${errorDetail}`);
    }
  }

  /**
   * Encode header values with RFC 2047 Base64 UTF-8 for international characters
   * @param {string} text
   * @returns {string}
   */
  encodeSubject(text) {
    if (!text) return '';
    return `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;
  }

  /**
   * Construct an RFC 2822 compliant MIME email string
   * Supports multipart/alternative with UTF-8 text and HTML fallback.
   *
   * @param {Object} params
   * @param {string} params.to
   * @param {string} params.subject
   * @param {string} [params.text]
   * @param {string} [params.html]
   * @param {string} [params.from]
   * @returns {string} Raw RFC 2822 MIME message
   */
  buildMimeMessage({ to, subject, text, html, from }) {
    const sender = from || this.fromAddress;
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const encodedSubject = this.encodeSubject(subject);

    // Fallbacks if one body format is missing
    const plainText = text || (html ? html.replace(/<[^>]*>?/gm, '').trim() : '');
    const htmlBody =
      html ||
      `<div style="font-family: sans-serif; font-size: 14px; color: #333; line-height: 1.6;">${(text || '').replace(/\n/g, '<br>')}</div>`;

    const headers = [
      `From: ${sender}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ];

    const textPart = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(plainText, 'utf8').toString('base64'),
    ];

    const htmlPart = [
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(htmlBody, 'utf8').toString('base64'),
    ];

    const footer = [`--${boundary}--`, ''];

    return [...headers, '', ...textPart, ...htmlPart, ...footer].join('\r\n');
  }

  /**
   * Encodes a string or buffer into Base64URL string (RFC 4648 §5)
   * Replaces '+' with '-', '/' with '_', and strips padding '='.
   *
   * @param {string|Buffer} input
   * @returns {string} Base64URL encoded string
   */
  encodeBase64Url(input) {
    const base64 = Buffer.isBuffer(input)
      ? input.toString('base64')
      : Buffer.from(input, 'utf8').toString('base64');

    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Dispatches email via Gmail REST API
   * POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
   *
   * @param {Object} params
   * @param {string} params.to
   * @param {string} params.subject
   * @param {string} [params.text]
   * @param {string} [params.html]
   * @param {string} [params.from]
   * @returns {Promise<{ success: boolean, messageId: string }>}
   */
  async send({ to, subject, text, html, from }) {
    if (!to || !subject) {
      throw new Error('Recipient (to) and subject are required for email dispatch.');
    }

    const accessToken = await this.getAccessToken();
    const rawMime = this.buildMimeMessage({ to, subject, text, html, from });
    const encodedRaw = this.encodeBase64Url(rawMime);

    try {
      const response = await axios.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        { raw: encodedRaw },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const messageId = response.data?.id;
      logger.info(
        `Email successfully dispatched via Gmail REST API to ${to} (Message ID: ${messageId || 'unknown'})`
      );
      return { success: true, messageId };
    } catch (error) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.error_description ||
        error.message;
      const statusCode = error.response?.status;
      logger.error(`Gmail REST API send failed [status ${statusCode || 'unknown'}]: ${errorMsg}`);
      throw new Error(`Gmail API send failed: ${errorMsg}`);
    }
  }
}

module.exports = GmailProvider;
