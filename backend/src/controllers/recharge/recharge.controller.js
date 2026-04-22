const rechargeService = require('../../services/recharge/recharge.service');
const auditLogService = require('../../services/auditLog/auditLog.service');
const { successResponse, paginatedResponse } = require('../../utils/response');

class RechargeController {
  /**
   * Auto-create recharge from SMS
   * POST /api/recharges/auto-create
   * This endpoint is for external SMS processing systems
   */
  async createAuto(req, res, next) {
    try {
      const recharge = await rechargeService.createAutoRecharge(req.body);

      // Audit log: RECHARGE_ADD (auto)
      await auditLogService.logAction({
        action: 'RECHARGE_ADD',
        module: 'RECHARGE',
        description: `Auto-recharge created from SMS: ₹${recharge.amount} for ${recharge.simId?.mobileNumber || 'unknown'}`,
        performedBy: recharge.createdBy || null,
        role: recharge.createdBy ? 'user' : 'anonymous',
        companyId: recharge.companyId,
        entityId: recharge._id,
        entityType: 'RECHARGE',
        metadata: {
          amount: recharge.amount,
          simId: recharge.simId?._id,
          mobileNumber: recharge.simId?.mobileNumber,
          source: 'AUTO_SMS',
          smsText: req.body.smsText,
        },
        req,
      });

      return successResponse(res, recharge, 'Auto-recharge created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const recharge = await rechargeService.createRecharge(req.body, req.user);

      // Audit log: RECHARGE_ADD
      await auditLogService.logAction({
        action: 'RECHARGE_ADD',
        module: 'RECHARGE',
        description: `Added recharge of ₹${recharge.amount} for SIM`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: recharge.companyId,
        entityId: recharge._id,
        entityType: 'RECHARGE',
        metadata: { amount: recharge.amount, simId: recharge.simId },
        req,
      });

      return successResponse(res, recharge, 'Recharge recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const result = await rechargeService.getAllRecharges(req.query, req.user);
      return paginatedResponse(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const recharge = await rechargeService.getRechargeById(req.params.id, req.user);
      return successResponse(res, recharge);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const recharge = await rechargeService.updateRecharge(req.params.id, req.body, req.user);

      // Audit log: RECHARGE_UPDATE
      await auditLogService.logAction({
        action: 'RECHARGE_UPDATE',
        module: 'RECHARGE',
        description: `Updated recharge of ₹${recharge.amount}`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: recharge.companyId,
        entityId: recharge._id,
        entityType: 'RECHARGE',
        metadata: { amount: recharge.amount, changes: req.body },
        req,
      });

      return successResponse(res, recharge, 'Recharge updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const recharge = await rechargeService.deleteRecharge(req.params.id, req.user);

      // Audit log: RECHARGE_DELETE
      await auditLogService.logAction({
        action: 'RECHARGE_DELETE',
        module: 'RECHARGE',
        description: `Deleted recharge of ₹${recharge.amount}`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: recharge.companyId,
        entityId: recharge._id,
        entityType: 'RECHARGE',
        metadata: { amount: recharge.amount },
        req,
      });

      return successResponse(res, null, 'Recharge deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUpcoming(req, res, next) {
    try {
      const companyId = req.user.role === 'super_admin' ? req.query.companyId : req.user.companyId;
      const { days } = req.query;
      const recharges = await rechargeService.getUpcomingRecharges(companyId, parseInt(days) || 7);
      return successResponse(res, recharges);
    } catch (error) {
      next(error);
    }
  }

  async getOverdue(req, res, next) {
    try {
      const companyId = req.user.role === 'super_admin' ? req.query.companyId : req.user.companyId;
      const recharges = await rechargeService.getOverdueRecharges(companyId);
      return successResponse(res, recharges);
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const { simId } = req.params;
      const { limit } = req.query;
      const history = await rechargeService.getSimRechargeHistory(simId, parseInt(limit) || 10);
      return successResponse(res, history);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const companyId = req.user.role === 'super_admin' ? req.query.companyId : req.user.companyId;
      const { startDate, endDate } = req.query;
      const stats = await rechargeService.getRechargeStats(companyId, startDate, endDate);
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async processReminders(req, res, next) {
    try {
      const result = await rechargeService.processReminders();

      // Audit log: RECHARGE_REMINDER_SENT
      if (result.remindersSent > 0) {
        await auditLogService.logAction({
          action: 'RECHARGE_REMINDER_SENT',
          module: 'RECHARGE',
          description: `Processed ${result.remindersSent} recharge reminders`,
          performedBy: req.user._id,
          role: req.user.role,
          companyId: req.user.companyId,
          metadata: { remindersSent: result.remindersSent },
          req,
        });
      }

      return successResponse(res, result, 'Reminders processed');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RechargeController();