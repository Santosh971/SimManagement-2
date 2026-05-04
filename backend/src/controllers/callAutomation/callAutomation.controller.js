/**
 * Call Automation Controller
 *
 * Handles HTTP requests for call automation configuration.
 */

const callAutomationService = require('../../services/callAutomation/callAutomation.service');
const auditLogService = require('../../services/auditLog/auditLog.service');
const { successResponse } = require('../../utils/response');
const logger = require('../../utils/logger');

class CallAutomationController {
  /**
   * Save or update call automation configuration
   * POST /api/call-automation/config
   */
  async saveConfig(req, res, next) {
    try {
      logger.info('[CALL AUTOMATION CONTROLLER] saveConfig request body:', {
        body: req.body,
      });

      const config = await callAutomationService.saveConfig(req.body, req.user);

      // Audit log
      await auditLogService.logAction({
        action: 'CALL_AUTOMATION_CONFIG_SAVE',
        module: 'CALL_AUTOMATION',
        description: `Saved call automation configuration`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: config.companyId,
        entityId: config._id,
        entityType: 'CallAutomationConfig',
        metadata: {
          callerCount: config.callerSimIds.length,
          targetCount: config.targetSimIds.length,
          callDuration: config.callDuration,
          frequency: config.frequency,
          scheduledTime: config.scheduledTime,
          scheduledDay: config.scheduledDay,
          isActive: config.isActive
        },
        req,
      });

      return successResponse(res, config, 'Call automation configuration saved successfully');
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Save config error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get call automation configuration
   * GET /api/call-automation/config
   */
  async getConfig(req, res, next) {
    try {
      const { companyId } = req.query;
      const config = await callAutomationService.getConfig(req.user, companyId);

      return successResponse(res, config);
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Get config error', { error: error.message });
      next(error);
    }
  }

  /**
   * Toggle automation active status
   * PUT /api/call-automation/toggle
   */
  async toggleActive(req, res, next) {
    try {
      const { isActive } = req.body;
      const config = await callAutomationService.toggleActive(req.user, isActive);

      // Audit log
      await auditLogService.logAction({
        action: 'CALL_AUTOMATION_TOGGLE',
        module: 'CALL_AUTOMATION',
        description: `Call automation ${isActive ? 'enabled' : 'disabled'}`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: config.companyId,
        entityId: config._id,
        entityType: 'CallAutomationConfig',
        metadata: { isActive },
        req,
      });

      return successResponse(res, config, `Call automation ${isActive ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Toggle error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get eligible SIMs for selection
   * GET /api/call-automation/eligible-sims
   */
  async getEligibleSims(req, res, next) {
    try {
      const sims = await callAutomationService.getEligibleSims(req.user);
      return successResponse(res, sims);
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Get eligible SIMs error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get device configuration for mobile app
   * GET /api/device/call-config
   * Public endpoint - no JWT required (uses SIM number for auth)
   */
  async getDeviceConfig(req, res, next) {
    try {
      const { simNumber } = req.query;

      if (!simNumber) {
        return successResponse(res, {
          role: 'NONE',
          targets: [],
          callDuration: 10,
          frequency: 'daily',
          isActive: false,
        });
      }

      const config = await callAutomationService.getDeviceConfig(simNumber);

      return successResponse(res, config);
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Get device config error', { error: error.message });
      next(error);
    }
  }

  /**
   * Update last run timestamp (called by mobile app)
   * POST /api/device/call-complete
   */
  async updateLastRun(req, res, next) {
    try {
      const { configId, simNumber, successCount, failCount } = req.body;

      logger.info('[CALL AUTOMATION CONTROLLER] Call complete notification received', {
        configId,
        simNumber,
        successCount,
        failCount
      });

      if (!configId) {
        return successResponse(res, { success: false, message: 'configId is required' });
      }

      const result = await callAutomationService.updateLastRun(configId, {
        simNumber,
        successCount: successCount || 0,
        failCount: failCount || 0
      });

      return successResponse(res, {
        success: true,
        data: {
          lastRunAt: result.lastRunAt,
          nextRunAt: result.nextRunAt
        }
      });
    } catch (error) {
      logger.error('[CALL AUTOMATION CONTROLLER] Update last run error', { error: error.message });
      next(error);
    }
  }
}

module.exports = new CallAutomationController();