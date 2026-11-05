const nodemailer = require('nodemailer');
const config = require('../config');
const GmailProvider = require('../providers/GmailProvider');
const notificationLogRepository = require('../repositories/notificationLogRepository');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('notification-service:emailService');

class EmailService {
  constructor() {
    this.gmailProvider = null;
    this.smtpTransporter = null;
    this.providerType = 'MOCK'; // 'GMAIL' | 'SMTP' | 'MOCK'

    this.initializeProvider();
  }

  initializeProvider() {
    const requestedProvider = config.email.provider;
    const hasGmailCreds = Boolean(
      config.gmail.clientId && config.gmail.clientSecret && config.gmail.refreshToken
    );
    const hasSmtpCreds = Boolean(config.smtp.host);

    if (
      requestedProvider === 'gmail' ||
      (requestedProvider === 'auto' && hasGmailCreds)
    ) {
      if (!hasGmailCreds) {
        logger.warn(
          'Email provider set to Gmail, but Google OAuth credentials are incomplete. Falling back to development mock mode.'
        );
        this.providerType = 'MOCK';
        return;
      }

      this.gmailProvider = new GmailProvider({
        clientId: config.gmail.clientId,
        clientSecret: config.gmail.clientSecret,
        refreshToken: config.gmail.refreshToken,
        userEmail: config.gmail.userEmail,
        fromAddress: config.email.from,
      });
      this.providerType = 'GMAIL';
      logger.info('EmailService initialized with Gmail REST API provider (OAuth 2.0)');
    } else if (
      requestedProvider === 'smtp' ||
      (requestedProvider === 'auto' && hasSmtpCreds)
    ) {
      if (!hasSmtpCreds) {
        logger.warn(
          'Email provider set to SMTP, but SMTP host is missing. Falling back to development mock mode.'
        );
        this.providerType = 'MOCK';
        return;
      }

      this.smtpTransporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
      this.providerType = 'SMTP';
      logger.info(`EmailService initialized with SMTP host: ${config.smtp.host}`);
    } else {
      this.providerType = 'MOCK';
      logger.info(
        'EmailService initialized in development mock mode (no Gmail or SMTP configured)'
      );
    }
  }

  get isMock() {
    return this.providerType === 'MOCK';
  }

  async sendEmail({ to, subject, text, html, eventId = null }) {
    if (!to || !subject) {
      logger.warn('Skipping email delivery: Missing recipient or subject');
      return { success: false, reason: 'MISSING_FIELDS' };
    }

    try {
      let dispatchDetails = null;

      if (this.providerType === 'GMAIL') {
        const result = await this.gmailProvider.send({
          to,
          subject,
          text,
          html,
          from: config.email.from,
        });
        dispatchDetails = { messageId: result.messageId, provider: 'GMAIL' };
        logger.info(`Dispatched email via Gmail to ${to} for subject "${subject}"`);
      } else if (this.providerType === 'SMTP') {
        await this.smtpTransporter.sendMail({
          from: config.email.from || config.smtp.from,
          to,
          subject,
          text,
          html,
        });
        dispatchDetails = { provider: 'SMTP' };
        logger.info(`Dispatched email via SMTP to ${to} for subject "${subject}"`);
      } else {
        logger.info(
          `[DEV EMAIL MOCK] To: ${to} | Subject: "${subject}" | Content: ${text || html}`
        );
        dispatchDetails = { provider: 'MOCK' };
      }

      // Record successful dispatch in logs
      await notificationLogRepository.createLog({
        eventId,
        channel: 'EMAIL',
        recipient: to,
        status: 'SENT',
        subject,
      });

      return { success: true, ...dispatchDetails };
    } catch (error) {
      // Failsafe: Never throw unhandled exceptions from email dispatch
      logger.error(`Failed to send email to ${to}: ${error.message}`);

      await notificationLogRepository.createLog({
        eventId,
        channel: 'EMAIL',
        recipient: to,
        status: 'FAILED',
        subject,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
