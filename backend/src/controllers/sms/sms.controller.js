const smsService = require('../../services/sms/sms.service');
const { successResponse, paginatedResponse } = require('../../utils/response');
const logger = require('../../utils/logger');
const xlsx = require('xlsx');

class SmsController {
  /**
   * Sync SMS from mobile device
   * POST /api/sms/sync
   */
  async sync(req, res, next) {
    try {
      const { simNumber, messages } = req.body;
      const deviceId = req.headers['x-device-id'] || req.body.deviceId || 'mobile';

      if (!simNumber) {
        return res.status(400).json({
          success: false,
          message: 'SIM number is required',
        });
      }

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Messages array is required',
        });
      }

      const result = await smsService.syncSms(
        { simNumber, messages },
        req.user,
        deviceId
      );

      logger.info('[SMS SYNC] Successfully synced SMS', {
        userId: req.user._id,
        simNumber,
        synced: result.synced,
        inserted: result.inserted,
      });

      return successResponse(res, result, 'SMS synced successfully');
    } catch (error) {
      logger.error('[SMS SYNC] Error syncing SMS', {
        error: error.message,
        userId: req.user?._id,
      });
      next(error);
    }
  }

  /**
   * Get SMS logs with filters
   * GET /api/sms
   */
  async getAll(req, res, next) {
    try {
      const result = await smsService.getSmsLogs(req.query, req.user);
      return paginatedResponse(
        res,
        result.data,
        result.total,
        result.page,
        result.limit
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SMS by ID
   * GET /api/sms/:id
   */
  async getById(req, res, next) {
    try {
      const sms = await smsService.getSmsById(req.params.id, req.user);
      return successResponse(res, sms);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SMS statistics
   * GET /api/sms/stats
   */
  async getStats(req, res, next) {
    try {
      const companyId =
        req.user.role === 'super_admin'
          ? req.query.companyId || req.user.companyId
          : req.user.companyId;
      const { startDate, endDate } = req.query;
      const stats = await smsService.getSmsStats(companyId, startDate, endDate);
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export SMS logs to Excel
   * GET /api/sms/export
   */
  async export(req, res, next) {
    try {
      const smsLogs = await smsService.exportSmsLogs(req.query, req.user);

      const workbook = xlsx.utils.book_new();
      const data = smsLogs.map((sms) => ({
        'SIM Number': sms.simNumber || sms.simId?.mobileNumber || 'N/A',
        'User Name': sms.userId?.name || 'N/A',
        'Sender': sms.sender,
        'Message': sms.message?.substring(0, 500) || '',
        'Type': sms.type,
        'Date & Time': sms.timestamp?.toISOString() || '',
      }));

      const sheet = xlsx.utils.json_to_sheet(data);
      xlsx.utils.book_append_sheet(workbook, sheet, 'SMS Logs');

      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader(
        'Content-Disposition',
        'attachment; filename=sms-logs-export.xlsx'
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unique senders
   * GET /api/sms/senders
   */
  async getSenders(req, res, next) {
    try {
      const companyId =
        req.user.role === 'super_admin'
          ? req.query.companyId || req.user.companyId
          : req.user.companyId;
      const senders = await smsService.getUniqueSenders(companyId);
      return successResponse(res, senders);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SMS count by SIM
   * GET /api/sms/sim/:simId/stats
   */
  async getSimStats(req, res, next) {
    try {
      const { simId } = req.params;
      const { startDate, endDate } = req.query;
      const stats = await smsService.getSmsCountBySim(simId, startDate, endDate);
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SmsController();