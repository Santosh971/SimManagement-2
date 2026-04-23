const telegramService = require('../../services/telegram/telegram.service');
const Sim = require('../../models/sim/sim.model');
const { AppError } = require('../../utils/errors');
const logger = require('../../utils/logger');

class TelegramController {
  /**
   * Handle Telegram webhook
   * POST /api/telegram/webhook
   * Public endpoint - no authentication required
   */
  async handleWebhook(req, res, next) {
    try {
      const update = req.body;

      // Always respond 200 to Telegram
      res.status(200).json({ ok: true });

      // Process the update asynchronously
      const result = await telegramService.handleWebhook(update);

      logger.info('[Telegram Controller] Webhook processed', { result });
    } catch (error) {
      logger.error('[Telegram Controller] Webhook error', { error: error.message });
      // Always respond 200 even on error
      res.status(200).json({ ok: true });
    }
  }

  /**
   * Send bulk Telegram messages
   * POST /api/telegram/send-bulk
   * Requires admin role
   */
  async sendBulk(req, res, next) {
    try {
      const { simIds, message } = req.body;
      const user = req.user;

      if (!simIds || !Array.isArray(simIds) || simIds.length === 0) {
        throw new AppError('SIM IDs are required', 400);
      }

      if (!message || message.trim().length === 0) {
        throw new AppError('Message is required', 400);
      }

      const result = await telegramService.sendToSIMs({ simIds, message }, user);

      res.status(200).json({
        success: true,
        message: `Sent ${result.sent} messages, ${result.failed} failed, ${result.skipped} skipped`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Telegram messages for company
   * GET /api/telegram/messages
   */
  async getMessages(req, res, next) {
    try {
      const result = await telegramService.getMessages(req.query, req.user);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get message statistics
   * GET /api/telegram/stats
   */
  async getStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const stats = await telegramService.getStats(req.user, startDate, endDate);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get eligible SIMs (with telegramChatId)
   * GET /api/telegram/sims
   */
  async getEligibleSIMs(req, res, next) {
    try {
      const sims = await telegramService.getEligibleSIMs(req.user);

      res.status(200).json({
        success: true,
        count: sims.length,
        data: sims,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate deep link for SIM
   * GET /api/telegram/link/:simId
   */
  async generateLink(req, res, next) {
    try {
      const { simId } = req.params;
      const user = req.user;

      // Verify SIM exists and belongs to user's company
      const sim = await Sim.findOne({
        _id: simId,
        companyId: user.companyId,
        isActive: true,
      });

      if (!sim) {
        throw new AppError('SIM not found', 404);
      }

      const link = telegramService.generateDeepLink(simId);

      res.status(200).json({
        success: true,
        data: {
          simId: sim._id,
          mobileNumber: sim.mobileNumber,
          telegramChatId: sim.telegramChatId,
          telegramEnabled: sim.telegramEnabled,
          deepLink: link,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unlink Telegram from SIM
   * DELETE /api/telegram/unlink/:simId
   */
  async unlinkSIM(req, res, next) {
    try {
      const { simId } = req.params;
      const user = req.user;

      // Verify SIM exists and belongs to user's company
      const sim = await Sim.findOne({
        _id: simId,
        companyId: user.companyId,
      });

      if (!sim) {
        throw new AppError('SIM not found', 404);
      }

      // Unlink Telegram
      sim.telegramChatId = null;
      sim.telegramEnabled = false;
      await sim.save();

      res.status(200).json({
        success: true,
        message: 'Telegram unlinked from SIM',
        data: {
          simId: sim._id,
          mobileNumber: sim.mobileNumber,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually process inactive messages
   * POST /api/telegram/process-inactive
   */
  async processInactive(req, res, next) {
    try {
      const result = await telegramService.processInactiveMessages();

      res.status(200).json({
        success: true,
        message: `Processed ${result.processed} messages, ${result.simsUpdated} SIMs marked inactive`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set webhook URL
   * POST /api/telegram/set-webhook
   * Super admin only
   */
  async setWebhook(req, res, next) {
    try {
      const { webhookUrl } = req.body;

      if (!webhookUrl) {
        throw new AppError('Webhook URL is required', 400);
      }

      const result = await telegramService.setWebhook(webhookUrl);

      res.status(200).json({
        success: true,
        message: 'Webhook set successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get webhook info
   * GET /api/telegram/webhook-info
   * Admin only
   */
  async getWebhookInfo(req, res, next) {
    try {
      const info = await telegramService.getWebhookInfo();

      res.status(200).json({
        success: true,
        data: info,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test webhook endpoint
   * GET /api/telegram/webhook-test
   */
  async testWebhook(req, res) {
    res.json({
      success: true,
      message: 'Telegram webhook endpoint is accessible',
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new TelegramController();