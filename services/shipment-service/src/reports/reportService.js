const fs = require('fs');
const path = require('path');
const config = require('../config');
const shipmentRepository = require('../repositories/shipmentRepository');
const { NotFoundError, ForbiddenError } = require('@logisphere/common-utils');
const { createLogger } = require('@logisphere/logger');

const logger = createLogger('shipment-service:reportService');

class ReportService {
  constructor() {
    this.reportRegistry = new Map();
    this.cleanupInterval = null;
    this.ensureStorageDir();
  }

  ensureStorageDir() {
    if (!fs.existsSync(config.reports.dir)) {
      fs.mkdirSync(config.reports.dir, { recursive: true });
    }
  }

  startCleanupWorker(intervalMs = 60000) {
    if (this.cleanupInterval) return;
    logger.info(`Starting temporary reports auto-cleanup worker (interval: ${intervalMs}ms)...`);

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredReports();
    }, intervalMs);
  }

  stopCleanupWorker() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async generateShipmentReport(organizationId, generatedByUserId) {
    this.ensureStorageDir();

    const { items: shipments } = await shipmentRepository.findByAssignedOrg(organizationId, {
      take: 1000,
    });

    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const filename = `${reportId}.csv`;
    const filePath = path.join(config.reports.dir, filename);

    // CSV header & rows
    const headers = [
      'Tracking Number',
      'Status',
      'Sender Name',
      'Pickup Hub',
      'Recipient Name',
      'Delivery Hub',
      'Category',
      'Weight (kg)',
      'Estimated Price (INR)',
      'Created At',
    ].join(',');

    const rows = shipments.map((s) =>
      [
        s.trackingNumber,
        s.status,
        `"${s.senderName.replace(/"/g, '""')}"`,
        s.pickupHub,
        `"${s.recipientName.replace(/"/g, '""')}"`,
        s.deliveryHub,
        s.category,
        s.weightKg,
        (s.estimatedPricePaise / 100).toFixed(2),
        s.createdAt.toISOString(),
      ].join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    fs.writeFileSync(filePath, csvContent, 'utf8');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.reports.ttlMinutes * 60 * 1000);

    const metadata = {
      reportId,
      filename,
      filePath,
      organizationId,
      generatedByUserId,
      recordCount: shipments.length,
      createdAt: now,
      expiresAt,
    };

    this.reportRegistry.set(reportId, metadata);
    logger.info(`Generated temporary report ${reportId} (expires at ${expiresAt.toISOString()})`);

    return {
      reportId,
      recordCount: shipments.length,
      expiresAt: expiresAt.toISOString(),
      ttlMinutes: config.reports.ttlMinutes,
    };
  }

  getReportFileForDownload(reportId, requestingUser) {
    const metadata = this.reportRegistry.get(reportId);

    if (!metadata) {
      throw new NotFoundError('Report not found', 'REPORT_NOT_FOUND');
    }

    // Strict 5-minute TTL check
    if (new Date() > new Date(metadata.expiresAt)) {
      this.deleteReportFile(reportId);
      throw new NotFoundError(
        'Report has expired. Please generate a new report.',
        'REPORT_EXPIRED'
      );
    }

    if (!fs.existsSync(metadata.filePath)) {
      throw new NotFoundError('Report file missing or expired', 'REPORT_NOT_FOUND');
    }

    // Ownership verification
    if (
      requestingUser.role !== 'PLATFORM_ADMIN' &&
      requestingUser.organizationId !== metadata.organizationId
    ) {
      throw new ForbiddenError(
        'You do not have permission to access this organization report',
        'TENANT_MISMATCH'
      );
    }

    return {
      filePath: metadata.filePath,
      filename: `logisphere_shipments_${metadata.organizationId}_${reportId}.csv`,
    };
  }

  cleanupExpiredReports() {
    const now = new Date();
    for (const [reportId, metadata] of this.reportRegistry.entries()) {
      if (now > new Date(metadata.expiresAt)) {
        this.deleteReportFile(reportId);
      }
    }
  }

  deleteReportFile(reportId) {
    const metadata = this.reportRegistry.get(reportId);
    if (metadata) {
      try {
        if (fs.existsSync(metadata.filePath)) {
          fs.unlinkSync(metadata.filePath);
          logger.info(`Unlinked expired report file: ${metadata.filePath}`);
        }
      } catch (err) {
        logger.warn(`Failed to unlink report file ${metadata.filePath}: ${err.message}`);
      }
      this.reportRegistry.delete(reportId);
    }
  }
}

module.exports = new ReportService();
