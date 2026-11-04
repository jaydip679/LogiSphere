const fs = require('fs');
const reportService = require('../reports/reportService');
const { sendSuccess, HttpStatus } = require('@logisphere/common-utils');

class ReportController {
  async exportReport(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const result = await reportService.generateShipmentReport(orgId, req.user.id);
      return sendSuccess(res, 'Report generated successfully', result, HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  downloadReport(req, res, next) {
    try {
      const { id: reportId } = req.params;
      const { filePath, filename } = reportService.getReportFileForDownload(reportId, req.user);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
