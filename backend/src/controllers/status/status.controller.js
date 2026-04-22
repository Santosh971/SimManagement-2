const statusService = require('../../services/status/status.service');
const { successResponse } = require('../../utils/response');

class StatusController {
  async getStatus(req, res, next) {
    try {
      const status = await statusService.getStatus(req.params.simId, req.user);
      return successResponse(res, status);
    } catch (error) {
      next(error);
    }
  }

  async updateWhatsApp(req, res, next) {
    try {
      const { enabled } = req.body;
      const status = await statusService.updateWhatsAppStatus(req.params.simId, enabled, req.user);
      return successResponse(res, status, 'WhatsApp status updated');
    } catch (error) {
      next(error);
    }
  }

  async updateTelegram(req, res, next) {
    try {
      const { enabled } = req.body;
      const status = await statusService.updateTelegramStatus(req.params.simId, enabled, req.user);
      return successResponse(res, status, 'Telegram status updated');
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const history = await statusService.getStatusHistory(req.params.simId, req.user);
      return successResponse(res, history);
    } catch (error) {
      next(error);
    }
  }

  async bulkUpdate(req, res, next) {
    try {
      const { simIds, platform, enabled } = req.body;
      const result = await statusService.bulkUpdateStatus(simIds, platform, enabled, req.user);
      return successResponse(res, result, 'Bulk status updated');
    } catch (error) {
      next(error);
    }
  }

  async getOverview(req, res, next) {
    try {
      const companyId = req.user.role === 'super_admin' ? req.query.companyId : req.user.companyId;
      const overview = await statusService.getAllStatusOverview(companyId);
      return successResponse(res, overview);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StatusController();