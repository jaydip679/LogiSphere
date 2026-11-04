const nodemailer = require('nodemailer');
const config = require('../config');
const notificationLogRepository = require('../repositories/notificationLogRepository');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('notification-service:emailService');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isMock = !config.smtp.host;

    if (!this.isMock) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
      logger.info(`EmailService initialized with SMTP host: ${config.smtp.host}`);
    } else {
      logger.info('EmailService initialized in development mock mode (no SMTP configured)');
    }
  }

  async sendEmail({ to, subject, text, html, eventId = null }) {
    if (!to || !subject) {
      logger.warn('Skipping email delivery: Missing recipient or subject');
      return { success: false, reason: 'MISSING_FIELDS' };
    }

    try {
      if (this.isMock) {
        logger.info(
          `[DEV EMAIL MOCK] To: ${to} | Subject: "${subject}" | Content: ${text || html}`
        );
      } else {
        await this.transporter.sendMail({
          from: config.smtp.from,
          to,
          subject,
          text,
          html,
        });
        logger.info(`Dispatched email to ${to} for subject "${subject}"`);
      }

      // Record successful dispatch in logs
      await notificationLogRepository.createLog({
        eventId,
        channel: 'EMAIL',
        recipient: to,
        status: 'SENT',
        subject,
      });

      return { success: true };
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
